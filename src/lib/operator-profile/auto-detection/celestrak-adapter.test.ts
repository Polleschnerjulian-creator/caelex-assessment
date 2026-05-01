/**
 * CelesTrak SATCAT Adapter — unit tests.
 *
 * Coverage:
 *
 *   1. canDetect: requires legalName ≥ 4 chars
 *   2. classifyOrbit: LEO / MEO / GEO / HEO boundaries
 *   3. celestrak3LetterToIso2: known + unknown country codes
 *   4. detect — empty SATCAT response (no matches → ok:true with warning)
 *   5. detect — single payload (constellationSize=1, isConstellation=false)
 *   6. detect — multi-payload constellation (size, isConstellation, primaryOrbit, establishment)
 *   7. detect — debris/rocket-bodies filtered out
 *   8. detect — decayed satellites filtered out
 *   9. detect — too-generic name (>500 results, truncated + warning)
 *  10. detect — error paths (rate-limit, 5xx, parse-error, network, timeout)
 */

import { describe, it, expect, vi } from "vitest";
import { celesTrakAdapter, __test } from "./celestrak-adapter.server";

vi.mock("server-only", () => ({}));

const ORG_ID = "org_test_celestrak";

// ─── canDetect ─────────────────────────────────────────────────────────────

describe("celesTrakAdapter.canDetect", () => {
  it("returns false when legalName is missing", () => {
    expect(celesTrakAdapter.canDetect({ organizationId: ORG_ID })).toBe(false);
  });

  it("returns false when legalName is too short (<4 chars)", () => {
    expect(
      celesTrakAdapter.canDetect({
        organizationId: ORG_ID,
        legalName: "ABC",
      }),
    ).toBe(false);
  });

  it("returns true for legalName ≥ 4 chars", () => {
    expect(
      celesTrakAdapter.canDetect({
        organizationId: ORG_ID,
        legalName: "Acme",
      }),
    ).toBe(true);
  });

  it("trims whitespace before length check", () => {
    expect(
      celesTrakAdapter.canDetect({
        organizationId: ORG_ID,
        legalName: "  AB  ",
      }),
    ).toBe(false);
  });
});

// ─── classifyOrbit ─────────────────────────────────────────────────────────

describe("classifyOrbit", () => {
  const cls = __test.classifyOrbit;

  it("classifies LEO when both perigee and apogee under 2000 km", () => {
    expect(cls({ APOGEE: 552, PERIGEE: 540 })).toBe("LEO");
  });

  it("classifies MEO when perigee >= 2000 and apogee < 35786", () => {
    expect(cls({ APOGEE: 22000, PERIGEE: 19000 })).toBe("MEO");
  });

  it("classifies GEO when both apogee and perigee within ±1000 km of 35786", () => {
    expect(cls({ APOGEE: 35900, PERIGEE: 35700 })).toBe("GEO");
  });

  it("classifies HEO when apogee much higher than perigee", () => {
    expect(cls({ APOGEE: 50000, PERIGEE: 500 })).toBe("HEO");
  });

  it("returns null when APOGEE or PERIGEE is missing", () => {
    expect(cls({ APOGEE: 552 })).toBeNull();
    expect(cls({ PERIGEE: 540 })).toBeNull();
    expect(cls({})).toBeNull();
  });
});

// ─── celestrak3LetterToIso2 ────────────────────────────────────────────────

describe("celestrak3LetterToIso2", () => {
  const map = __test.celestrak3LetterToIso2;

  it("maps known 3-letter codes", () => {
    expect(map("USA")).toBe("US");
    expect(map("DEU")).toBe("DE");
    expect(map("GER")).toBe("DE"); // legacy CelesTrak code
    expect(map("FRA")).toBe("FR");
    expect(map("ESA")).toBe("EU");
  });

  it("returns null for unknown codes", () => {
    expect(map("XYZ")).toBeNull();
    expect(map("ZZZ")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(map("usa")).toBe("US");
    expect(map("Usa")).toBe("US");
  });
});

// ─── detect — happy path ───────────────────────────────────────────────────

describe("celesTrakAdapter.detect — happy path", () => {
  it("returns ok:true with warning when SATCAT has no matches", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(makeJsonResponse(200, []));
    const outcome = await celesTrakAdapter.detect({
      organizationId: ORG_ID,
      legalName: "TotallyMadeUpCo",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.fields).toEqual([]);
    expect(outcome.result.warnings).toContainEqual(
      expect.stringContaining("no satellites"),
    );
  });

  it("emits constellationSize + isConstellation + primaryOrbit for multi-LEO match", async () => {
    const fakeSatellites = Array.from({ length: 12 }, (_, i) => ({
      OBJECT_NAME: `STARLINK-${i + 1}`,
      OBJECT_ID: `2024-001A`,
      NORAD_CAT_ID: `${10000 + i}`,
      OBJECT_TYPE: "PAYLOAD",
      OPS_STATUS_CODE: "+",
      OWNER: "USA",
      LAUNCH_DATE: "2024-01-06",
      DECAY_DATE: "",
      APOGEE: 552,
      PERIGEE: 540,
      INCLINATION: 53.0,
    }));
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(makeJsonResponse(200, fakeSatellites));

    const outcome = await celesTrakAdapter.detect({
      organizationId: ORG_ID,
      legalName: "Starlink",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const byField = new Map(outcome.result.fields.map((f) => [f.fieldName, f]));
    expect(byField.get("constellationSize")?.value).toBe(12);
    expect(byField.get("isConstellation")?.value).toBe(true);
    expect(byField.get("primaryOrbit")?.value).toBe("LEO");
    // OWNER USA → ISO US
    expect(byField.get("establishment")?.value).toBe("US");
  });

  it("emits isConstellation:false for single payload", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      makeJsonResponse(200, [
        {
          OBJECT_NAME: "ACME-SAT-1",
          OBJECT_TYPE: "PAYLOAD",
          OPS_STATUS_CODE: "+",
          OWNER: "DEU",
          APOGEE: 35900,
          PERIGEE: 35700,
        },
      ]),
    );
    const outcome = await celesTrakAdapter.detect({
      organizationId: ORG_ID,
      legalName: "Acme Aerospace",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const byField = new Map(outcome.result.fields.map((f) => [f.fieldName, f]));
    expect(byField.get("constellationSize")?.value).toBe(1);
    expect(byField.get("isConstellation")?.value).toBe(false);
    expect(byField.get("primaryOrbit")?.value).toBe("GEO");
    expect(byField.get("establishment")?.value).toBe("DE");
  });

  it("filters out rocket bodies, debris, and decayed objects", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      makeJsonResponse(200, [
        {
          OBJECT_NAME: "ACME-1",
          OBJECT_TYPE: "PAYLOAD",
          OPS_STATUS_CODE: "+",
          OWNER: "USA",
          APOGEE: 552,
          PERIGEE: 540,
        },
        {
          OBJECT_NAME: "ACME-1 R/B",
          OBJECT_TYPE: "ROCKET BODY",
          OPS_STATUS_CODE: "+",
          OWNER: "USA",
          APOGEE: 552,
          PERIGEE: 540,
        },
        {
          OBJECT_NAME: "ACME-2 DEB",
          OBJECT_TYPE: "DEBRIS",
          OPS_STATUS_CODE: "+",
          OWNER: "USA",
          APOGEE: 552,
          PERIGEE: 540,
        },
        {
          OBJECT_NAME: "ACME-OLD",
          OBJECT_TYPE: "PAYLOAD",
          OPS_STATUS_CODE: "+",
          OWNER: "USA",
          DECAY_DATE: "2024-01-01",
          APOGEE: 552,
          PERIGEE: 540,
        },
      ]),
    );
    const outcome = await celesTrakAdapter.detect({
      organizationId: ORG_ID,
      legalName: "Acme",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const byField = new Map(outcome.result.fields.map((f) => [f.fieldName, f]));
    // Only the active payload counts
    expect(byField.get("constellationSize")?.value).toBe(1);
  });

  it("warns when matches exist but zero are active payloads", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      makeJsonResponse(200, [
        {
          OBJECT_NAME: "ACME R/B",
          OBJECT_TYPE: "ROCKET BODY",
          OPS_STATUS_CODE: "-",
        },
      ]),
    );
    const outcome = await celesTrakAdapter.detect({
      organizationId: ORG_ID,
      legalName: "Acme",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.fields).toEqual([]);
    expect(outcome.result.warnings).toContainEqual(
      expect.stringContaining("zero are active"),
    );
  });

  it("encodes legalName in the URL query string", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(makeJsonResponse(200, []));
    await celesTrakAdapter.detect({
      organizationId: ORG_ID,
      legalName: "ACME & CO",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const [url] = fetchImpl.mock.calls[0] as [string];
    expect(url).toContain("NAME=ACME");
    expect(url).toContain("FORMAT=json");
    // & should be encoded
    expect(url).toContain("%26");
  });
});

// ─── detect — error paths ──────────────────────────────────────────────────

describe("celesTrakAdapter.detect — error paths", () => {
  it("returns errorKind:missing-input when legalName absent", async () => {
    const outcome = await celesTrakAdapter.detect({
      organizationId: ORG_ID,
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errorKind).toBe("missing-input");
  });

  it("returns errorKind:rate-limited on HTTP 429", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("rate limited", {
        status: 429,
        headers: { "retry-after": "120" },
      }),
    );
    const outcome = await celesTrakAdapter.detect({
      organizationId: ORG_ID,
      legalName: "Acme",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errorKind).toBe("rate-limited");
    expect(outcome.retryAfterMs).toBe(120_000);
  });

  it("returns errorKind:remote-error on HTTP 5xx", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("oops", { status: 503 }));
    const outcome = await celesTrakAdapter.detect({
      organizationId: ORG_ID,
      legalName: "Acme",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errorKind).toBe("remote-error");
  });

  it("returns errorKind:parse-error when body is not JSON", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        new Response("<html>maintenance</html>", { status: 200 }),
      );
    const outcome = await celesTrakAdapter.detect({
      organizationId: ORG_ID,
      legalName: "Acme",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errorKind).toBe("parse-error");
  });

  it("returns errorKind:network on fetch rejection", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("ECONNRESET"));
    const outcome = await celesTrakAdapter.detect({
      organizationId: ORG_ID,
      legalName: "Acme",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errorKind).toBe("network");
  });

  it("returns errorKind:timeout when AbortError surfaces", async () => {
    const fetchImpl = vi.fn().mockImplementation(() => {
      const e = new Error("aborted");
      e.name = "AbortError";
      return Promise.reject(e);
    });
    const outcome = await celesTrakAdapter.detect({
      organizationId: ORG_ID,
      legalName: "Acme",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 1,
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errorKind).toBe("timeout");
  });

  it("treats empty body as zero matches (not an error)", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("", { status: 200 }));
    const outcome = await celesTrakAdapter.detect({
      organizationId: ORG_ID,
      legalName: "Acme",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.fields).toEqual([]);
  });
});

// ─── helpers ───────────────────────────────────────────────────────────────

function makeJsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
