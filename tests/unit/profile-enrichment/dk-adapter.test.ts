import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/verity/utils/redaction", () => ({ safeLog: vi.fn() }));

import {
  lookupCvrByNumber,
  searchCvrByName,
  __resetCvrCaches,
} from "@/lib/profile-enrichment/country/dk-adapter";

const originalFetch = globalThis.fetch;

function sampleEsResponse(overrides: Record<string, unknown> = {}) {
  return {
    hits: {
      total: { value: 1 },
      hits: [
        {
          _source: {
            Vrvirksomhed: {
              cvrNummer: 12345678,
              virksomhedMetadata: {
                nyesteNavn: { navn: "CAELEX DENMARK A/S" },
                nyesteBeliggenhedsadresse: {
                  vejnavn: "Bredgade",
                  husnummerFra: 10,
                  postnummer: 1260,
                  postdistrikt: "København K",
                  kommune: { kommuneNavn: "København" },
                },
                nyesteVirksomhedsform: {
                  langBeskrivelse: "Aktieselskab",
                  kortBeskrivelse: "A/S",
                },
                nyesteStatus: { status: "AKTIV", statustekst: "Aktiv" },
                stiftelsesDato: "2023-04-15",
                ...overrides,
              },
            },
          },
        },
      ],
    },
  };
}

function mockFetchOnce(
  body: unknown,
  init: { ok?: boolean; status?: number } = {},
) {
  globalThis.fetch = vi.fn().mockResolvedValueOnce({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  } as unknown as Response);
}

beforeEach(() => {
  __resetCvrCaches();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("DK CVR adapter — direct lookup", () => {
  it("returns full enrichment for a valid CVR number", async () => {
    mockFetchOnce(sampleEsResponse());

    const result = await lookupCvrByNumber("12345678");

    expect(result.source).toBe("country-dk");
    expect(result.error).toBeUndefined();
    expect(result.fields.registrationNumber?.value).toBe("12345678");
    expect(result.fields.countryCode?.value).toBe("DK");
    expect(result.fields.legalName?.value).toBe("CAELEX DENMARK A/S");
    expect(result.fields.headquartersAddress?.value).toContain("Bredgade");
    expect(result.fields.headquartersAddress?.value).toContain("Denmark");
    expect(result.fields.legalForm?.value).toBe("Aktieselskab");
    expect(result.fields.entityStatus?.value).toBe("ACTIVE");
    expect(result.fields.foundedYear?.value).toBe(2023);
  });

  it("handles numeric input too", async () => {
    mockFetchOnce(sampleEsResponse());
    const result = await lookupCvrByNumber(12345678);
    expect(result.error).toBeUndefined();
    expect(result.fields.registrationNumber?.value).toBe("12345678");
  });

  it("maps OPHØRT status to DISSOLVED", async () => {
    mockFetchOnce(sampleEsResponse({ nyesteStatus: { status: "OPHØRT" } }));
    const result = await lookupCvrByNumber("12345678");
    expect(result.fields.entityStatus?.value).toBe("DISSOLVED");
  });

  it("rejects invalid CVR number format", async () => {
    const result = await lookupCvrByNumber("not-a-number");
    expect(result.fields).toEqual({});
    expect(result.error).toMatch(/Invalid CVR/);
  });

  it("returns soft-fail when no hits", async () => {
    mockFetchOnce({ hits: { total: { value: 0 }, hits: [] } });
    const result = await lookupCvrByNumber("99999999");
    expect(result.fields).toEqual({});
    expect(result.error).toMatch(/No CVR record/);
  });

  it("returns soft-fail on non-200", async () => {
    mockFetchOnce({}, { ok: false, status: 503 });
    const result = await lookupCvrByNumber("12345678");
    expect(result.fields).toEqual({});
    expect(result.error).toBeDefined();
  });
});

describe("DK CVR adapter — name search", () => {
  it("uses lower confidence than direct lookup", async () => {
    mockFetchOnce(sampleEsResponse());
    const result = await searchCvrByName("Caelex");
    expect(result.error).toBeUndefined();
    expect(result.fields.legalName?.confidence).toBeLessThan(0.9);
  });

  it("rejects too-short names", async () => {
    const result = await searchCvrByName("Ca");
    expect(result.fields).toEqual({});
    expect(result.error).toMatch(/at least 3/);
  });
});

describe("DK CVR adapter — caching", () => {
  it("does not refetch within TTL for the same CVR", async () => {
    const spy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleEsResponse(),
    } as unknown as Response);
    globalThis.fetch = spy;

    await lookupCvrByNumber("12345678");
    await lookupCvrByNumber("12345678");
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
