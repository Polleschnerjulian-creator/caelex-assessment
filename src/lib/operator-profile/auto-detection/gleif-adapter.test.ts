/**
 * GLEIF Adapter — unit tests.
 *
 * Coverage:
 *
 *   1. canDetect — gating on legalName length
 *   2. isActiveRecord helper — ACTIVE+ISSUED required
 *   3. elfLabel helper — known + unknown ELF codes
 *   4. detect happy path — single ACTIVE record yields establishment
 *   5. detect happy path — multiple records, jurisdictions agree
 *   6. detect happy path — multiple records, jurisdictions disagree
 *   7. detect — entity-supplied (lower confidence) vs fully-corroborated
 *   8. detect — INACTIVE record yields no fields with warning
 *   9. detect — empty result with warning
 *  10. detect — full set of error paths
 */

import { describe, it, expect, vi } from "vitest";
import { gleifAdapter, __test } from "./gleif-adapter.server";

vi.mock("server-only", () => ({}));

const ORG_ID = "org_test_gleif";

// ─── canDetect ─────────────────────────────────────────────────────────────

describe("gleifAdapter.canDetect", () => {
  it("returns false when legalName is missing", () => {
    expect(gleifAdapter.canDetect({ organizationId: ORG_ID })).toBe(false);
  });

  it("returns false when legalName is too short", () => {
    expect(
      gleifAdapter.canDetect({ organizationId: ORG_ID, legalName: "AB" }),
    ).toBe(false);
  });

  it("returns true for legalName ≥ 4 chars", () => {
    expect(
      gleifAdapter.canDetect({ organizationId: ORG_ID, legalName: "Acme" }),
    ).toBe(true);
  });
});

// ─── helpers ───────────────────────────────────────────────────────────────

describe("isActiveRecord", () => {
  it("returns true when entity ACTIVE and registration ISSUED", () => {
    expect(
      __test.isActiveRecord({
        attributes: {
          entity: { status: "ACTIVE" },
          registration: { status: "ISSUED" },
        },
      }),
    ).toBe(true);
  });
  it("returns false when entity INACTIVE", () => {
    expect(
      __test.isActiveRecord({
        attributes: {
          entity: { status: "INACTIVE" },
          registration: { status: "ISSUED" },
        },
      }),
    ).toBe(false);
  });
  it("returns false when registration LAPSED", () => {
    expect(
      __test.isActiveRecord({
        attributes: {
          entity: { status: "ACTIVE" },
          registration: { status: "LAPSED" },
        },
      }),
    ).toBe(false);
  });
});

describe("elfLabel", () => {
  it("maps known ELF codes", () => {
    expect(__test.elfLabel("QJUD")).toContain("GmbH");
    expect(__test.elfLabel("AXSB")).toContain("AG");
    expect(__test.elfLabel("V8VL")).toContain("Anonyme");
  });
  it("returns the code unchanged for unknown values", () => {
    expect(__test.elfLabel("ZZZZ")).toBe("ZZZZ");
  });
});

// ─── detect — happy path ───────────────────────────────────────────────────

describe("gleifAdapter.detect — happy path", () => {
  it("yields establishment from a single active DE record (FULLY_CORROBORATED)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      makeJsonResponse(200, {
        data: [
          {
            type: "lei-records",
            id: "5299009N55YRQC69CN08",
            attributes: {
              lei: "5299009N55YRQC69CN08",
              entity: {
                legalName: { name: "ACME GMBH", language: "de" },
                legalForm: { id: "QJUD" },
                status: "ACTIVE",
                jurisdiction: "DE",
              },
              registration: {
                status: "ISSUED",
                managingLou: "lou-de",
                validatedAs: "FULLY_CORROBORATED",
              },
            },
          },
        ],
      }),
    );
    const outcome = await gleifAdapter.detect({
      organizationId: ORG_ID,
      legalName: "Acme GmbH",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const fields = new Map(outcome.result.fields.map((f) => [f.fieldName, f]));
    expect(fields.get("establishment")?.value).toBe("DE");
    expect(fields.get("establishment")?.confidence).toBe(0.95);
    expect(outcome.result.warnings).toContainEqual(
      expect.stringContaining("GmbH"),
    );
    expect(outcome.result.warnings).toContainEqual(
      expect.stringContaining("LEI"),
    );
  });

  it("uses lower confidence for ENTITY_SUPPLIED_ONLY validation", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      makeJsonResponse(200, {
        data: [
          {
            attributes: {
              lei: "X",
              entity: {
                legalName: { name: "X", language: "de" },
                status: "ACTIVE",
                jurisdiction: "DE",
              },
              registration: {
                status: "ISSUED",
                validatedAs: "ENTITY_SUPPLIED_ONLY",
              },
            },
          },
        ],
      }),
    );
    const outcome = await gleifAdapter.detect({
      organizationId: ORG_ID,
      legalName: "Acme",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const f = outcome.result.fields[0];
    expect(f.value).toBe("DE");
    expect(f.confidence).toBe(0.85);
  });

  it("yields establishment when multiple matches all agree on jurisdiction", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      makeJsonResponse(200, {
        data: [
          activeRecord({ jurisdiction: "DE" }),
          activeRecord({ jurisdiction: "DE" }),
        ],
      }),
    );
    const outcome = await gleifAdapter.detect({
      organizationId: ORG_ID,
      legalName: "Acme",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.fields[0].value).toBe("DE");
    // Multi-match warning still appears
    expect(outcome.result.warnings).toContainEqual(
      expect.stringContaining("2 records"),
    );
  });

  it("does NOT promote establishment when matches span multiple jurisdictions", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      makeJsonResponse(200, {
        data: [
          activeRecord({ jurisdiction: "DE" }),
          activeRecord({ jurisdiction: "AT" }),
        ],
      }),
    );
    const outcome = await gleifAdapter.detect({
      organizationId: ORG_ID,
      legalName: "Acme",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const establishment = outcome.result.fields.find(
      (f) => f.fieldName === "establishment",
    );
    expect(establishment).toBeUndefined();
    expect(outcome.result.warnings).toContainEqual(
      expect.stringContaining("multiple jurisdictions"),
    );
  });

  it("warns and yields no fields when only inactive records match", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      makeJsonResponse(200, {
        data: [
          {
            attributes: {
              lei: "X",
              entity: { status: "INACTIVE", jurisdiction: "DE" },
              registration: { status: "LAPSED" },
            },
          },
        ],
      }),
    );
    const outcome = await gleifAdapter.detect({
      organizationId: ORG_ID,
      legalName: "Acme",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.fields).toEqual([]);
    expect(outcome.result.warnings).toContainEqual(
      expect.stringContaining("none are ACTIVE"),
    );
  });

  it("warns when GLEIF returns zero matches", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(makeJsonResponse(200, { data: [] }));
    const outcome = await gleifAdapter.detect({
      organizationId: ORG_ID,
      legalName: "Acme",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.fields).toEqual([]);
    expect(outcome.result.warnings).toContainEqual(
      expect.stringContaining("no LEI record"),
    );
  });

  it("uppercases the name in the URL", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(makeJsonResponse(200, { data: [] }));
    await gleifAdapter.detect({
      organizationId: ORG_ID,
      legalName: "Acme GmbH",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const [url] = fetchImpl.mock.calls[0] as [string];
    expect(url).toContain("ACME%20GMBH");
  });

  it("hits the JSON:API endpoint with the right Accept header", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(makeJsonResponse(200, { data: [] }));
    await gleifAdapter.detect({
      organizationId: ORG_ID,
      legalName: "Acme",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.accept).toBe("application/vnd.api+json");
  });
});

// ─── detect — error paths ──────────────────────────────────────────────────

describe("gleifAdapter.detect — error paths", () => {
  it("returns missing-input when legalName absent", async () => {
    const outcome = await gleifAdapter.detect({ organizationId: ORG_ID });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errorKind).toBe("missing-input");
  });

  it("returns rate-limited on HTTP 429", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("rate limited", {
        status: 429,
        headers: { "retry-after": "30" },
      }),
    );
    const outcome = await gleifAdapter.detect({
      organizationId: ORG_ID,
      legalName: "Acme",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errorKind).toBe("rate-limited");
    expect(outcome.retryAfterMs).toBe(30_000);
  });

  it("returns remote-error on HTTP 500", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("oops", { status: 500 }));
    const outcome = await gleifAdapter.detect({
      organizationId: ORG_ID,
      legalName: "Acme",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errorKind).toBe("remote-error");
  });

  it("returns parse-error on non-JSON body", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("<html>down</html>", { status: 200 }));
    const outcome = await gleifAdapter.detect({
      organizationId: ORG_ID,
      legalName: "Acme",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errorKind).toBe("parse-error");
  });

  it("returns network on fetch rejection", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("ECONNRESET"));
    const outcome = await gleifAdapter.detect({
      organizationId: ORG_ID,
      legalName: "Acme",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errorKind).toBe("network");
  });

  it("returns timeout on AbortError", async () => {
    const fetchImpl = vi.fn().mockImplementation(() => {
      const e = new Error("aborted");
      e.name = "AbortError";
      return Promise.reject(e);
    });
    const outcome = await gleifAdapter.detect({
      organizationId: ORG_ID,
      legalName: "Acme",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 1,
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errorKind).toBe("timeout");
  });
});

// ─── helpers ───────────────────────────────────────────────────────────────

function activeRecord(overrides: { jurisdiction?: string }) {
  return {
    attributes: {
      lei: "X",
      entity: {
        legalName: { name: "ACME GMBH", language: "de" },
        legalForm: { id: "QJUD" },
        status: "ACTIVE",
        jurisdiction: overrides.jurisdiction ?? "DE",
      },
      registration: {
        status: "ISSUED",
        validatedAs: "FULLY_CORROBORATED",
      },
    },
  };
}

function makeJsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/vnd.api+json" },
  });
}
