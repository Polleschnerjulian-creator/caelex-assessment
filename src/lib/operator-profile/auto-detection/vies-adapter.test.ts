/**
 * VIES Adapter — unit tests.
 *
 * `fetch` is provided per-call via `input.fetchImpl` so we don't need
 * vi.spyOn(global) tricks. The adapter promises NOT to throw and to
 * return structured outcomes — we assert that contract.
 *
 * Coverage:
 *
 *   1. canDetect: input gating (vatId required, must be EU country)
 *   2. parseVatId: format normalisation + rejection of garbage
 *   3. detect happy path — DE (name redacted), NL (name returned)
 *   4. detect VIES-says-invalid — successful outcome with no fields
 *   5. detect rate-limit (HTTP 429) — errorKind: rate-limited + retryAfterMs
 *   6. detect 5xx — errorKind: remote-error
 *   7. detect non-JSON body — errorKind: parse-error
 *   8. detect timeout — errorKind: timeout
 *   9. detect network error — errorKind: network
 *  10. detect missing-input — errorKind: missing-input
 */

import { describe, it, expect, vi } from "vitest";
import { viesAdapter, __test } from "./vies-adapter.server";

vi.mock("server-only", () => ({}));

const ORG_ID = "org_test_vies";

// ─── canDetect ─────────────────────────────────────────────────────────────

describe("viesAdapter.canDetect", () => {
  it("returns false when vatId is missing", () => {
    expect(viesAdapter.canDetect({ organizationId: ORG_ID })).toBe(false);
  });

  it("returns false when vatId is malformed", () => {
    expect(
      viesAdapter.canDetect({ organizationId: ORG_ID, vatId: "not-a-vat" }),
    ).toBe(false);
  });

  it("returns false when country is not in EU + XI", () => {
    expect(
      viesAdapter.canDetect({ organizationId: ORG_ID, vatId: "US123456789" }),
    ).toBe(false);
  });

  it("returns true for DE VAT-ID", () => {
    expect(
      viesAdapter.canDetect({ organizationId: ORG_ID, vatId: "DE123456789" }),
    ).toBe(true);
  });

  it("returns true for NL VAT-ID with whitespace + dots", () => {
    expect(
      viesAdapter.canDetect({
        organizationId: ORG_ID,
        vatId: "NL.123 456 789B01",
      }),
    ).toBe(true);
  });

  it("returns true for XI (Northern Ireland) VAT-ID", () => {
    expect(
      viesAdapter.canDetect({ organizationId: ORG_ID, vatId: "XI123456789" }),
    ).toBe(true);
  });
});

// ─── parseVatId ─────────────────────────────────────────────────────────────

describe("parseVatId", () => {
  it("parses a clean DE VAT-ID", () => {
    expect(__test.parseVatId("DE123456789")).toEqual({
      country: "DE",
      number: "123456789",
    });
  });

  it("strips spaces, dots, and dashes", () => {
    expect(__test.parseVatId("DE 123.456-789")).toEqual({
      country: "DE",
      number: "123456789",
    });
  });

  it("uppercases lowercase country codes", () => {
    expect(__test.parseVatId("de123456789")?.country).toBe("DE");
  });

  it("returns null on garbage input", () => {
    expect(__test.parseVatId("abc")).toBeNull();
    expect(__test.parseVatId("123456789")).toBeNull();
    expect(__test.parseVatId("")).toBeNull();
  });
});

// ─── detect — happy path ───────────────────────────────────────────────────

describe("viesAdapter.detect — happy path", () => {
  it("returns establishment for DE (name redacted)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      makeJsonResponse(200, {
        isValid: true,
        countryCode: "DE",
        vatNumber: "123456789",
        name: "---", // DE privacy redaction
        address: "---",
        requestDate: "2026-04-30T10:00:00.000Z",
      }),
    );

    const outcome = await viesAdapter.detect({
      organizationId: ORG_ID,
      vatId: "DE123456789",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return; // for type-narrowing

    expect(outcome.result.source).toBe("vies-eu-vat");
    expect(outcome.result.fields).toHaveLength(1);
    expect(outcome.result.fields[0].fieldName).toBe("establishment");
    expect(outcome.result.fields[0].value).toBe("DE");
    expect(outcome.result.fields[0].confidence).toBeGreaterThan(0.9);
    expect(outcome.result.warnings).toContainEqual(
      expect.stringContaining("DE VAT regulations"),
    );
  });

  it("returns establishment + warning for NL (name returned but not yet stored)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      makeJsonResponse(200, {
        isValid: true,
        countryCode: "NL",
        vatNumber: "123456789B01",
        name: "ACME B.V.",
        address: "Hoofdstraat 1, 1000 AA Amsterdam",
        requestDate: "2026-04-30T10:00:00.000Z",
      }),
    );

    const outcome = await viesAdapter.detect({
      organizationId: ORG_ID,
      vatId: "NL123456789B01",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.fields[0].value).toBe("NL");
    expect(outcome.result.warnings).toContainEqual(
      expect.stringContaining("ACME B.V."),
    );
  });

  it("emits POST with countryCode + vatNumber to VIES endpoint", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      makeJsonResponse(200, {
        isValid: true,
        countryCode: "DE",
        vatNumber: "123456789",
        name: "---",
        address: "---",
      }),
    );
    await viesAdapter.detect({
      organizationId: ORG_ID,
      vatId: "DE123456789",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(__test.VIES_ENDPOINT);
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.countryCode).toBe("DE");
    expect(body.vatNumber).toBe("123456789");
  });
});

// ─── detect — VIES says invalid ────────────────────────────────────────────

describe("viesAdapter.detect — VIES reports invalid VAT", () => {
  it("returns ok:true with no fields and a warning when isValid:false", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      makeJsonResponse(200, {
        isValid: false,
        countryCode: "DE",
        vatNumber: "999999999",
      }),
    );

    const outcome = await viesAdapter.detect({
      organizationId: ORG_ID,
      vatId: "DE999999999",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.fields).toHaveLength(0);
    expect(outcome.result.warnings).toContainEqual(
      expect.stringContaining("INVALID"),
    );
  });
});

// ─── detect — error paths ──────────────────────────────────────────────────

describe("viesAdapter.detect — error paths", () => {
  it("returns errorKind:missing-input when vatId is absent", async () => {
    const outcome = await viesAdapter.detect({
      organizationId: ORG_ID,
      // no vatId
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errorKind).toBe("missing-input");
  });

  it("returns errorKind:missing-input for non-EU country", async () => {
    const outcome = await viesAdapter.detect({
      organizationId: ORG_ID,
      vatId: "US123456789",
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errorKind).toBe("missing-input");
    expect(outcome.message).toContain("US");
  });

  it("returns errorKind:rate-limited on HTTP 429", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("rate limited", {
        status: 429,
        headers: { "retry-after": "60" },
      }),
    );
    const outcome = await viesAdapter.detect({
      organizationId: ORG_ID,
      vatId: "DE123456789",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errorKind).toBe("rate-limited");
    expect(outcome.retryAfterMs).toBe(60_000);
  });

  it("returns errorKind:remote-error on HTTP 500", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("oops", { status: 500 }));
    const outcome = await viesAdapter.detect({
      organizationId: ORG_ID,
      vatId: "DE123456789",
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
    const outcome = await viesAdapter.detect({
      organizationId: ORG_ID,
      vatId: "DE123456789",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errorKind).toBe("parse-error");
  });

  it("returns errorKind:network on fetch rejection", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("ECONNRESET"));
    const outcome = await viesAdapter.detect({
      organizationId: ORG_ID,
      vatId: "DE123456789",
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
    const outcome = await viesAdapter.detect({
      organizationId: ORG_ID,
      vatId: "DE123456789",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 1,
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errorKind).toBe("timeout");
  });

  it("returns errorKind:parse-error when JSON is missing isValid", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        makeJsonResponse(200, { countryCode: "DE", vatNumber: "123" }),
      );
    const outcome = await viesAdapter.detect({
      organizationId: ORG_ID,
      vatId: "DE123",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errorKind).toBe("parse-error");
  });
});

// ─── helpers ───────────────────────────────────────────────────────────────

function makeJsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
