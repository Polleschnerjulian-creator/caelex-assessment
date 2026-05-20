import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/verity/utils/redaction", () => ({ safeLog: vi.fn() }));

import {
  lookupBrisByCountry,
  hasCountryAdapter,
  listAdapterImplementationStatus,
  shouldDispatchBris,
} from "@/lib/profile-enrichment/bris-country-router";

const originalFetch = globalThis.fetch;

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

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("BRIS router — hasCountryAdapter", () => {
  it("returns true for implemented countries (DK, FI, NO, GB, EE, CZ)", () => {
    expect(hasCountryAdapter("DK")).toBe(true);
    expect(hasCountryAdapter("FI")).toBe(true);
    expect(hasCountryAdapter("NO")).toBe(true);
    expect(hasCountryAdapter("GB")).toBe(true);
    expect(hasCountryAdapter("EE")).toBe(true);
    expect(hasCountryAdapter("CZ")).toBe(true);
  });

  it("returns false for unimplemented countries", () => {
    expect(hasCountryAdapter("DE")).toBe(false);
    expect(hasCountryAdapter("FR")).toBe(false);
    expect(hasCountryAdapter("IT")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(hasCountryAdapter("dk")).toBe(true);
    expect(hasCountryAdapter("Fi")).toBe(true);
  });
});

describe("BRIS router — listAdapterImplementationStatus", () => {
  it("flags DK, FI, NO, GB, EE, CZ as implemented and the rest as stubs", () => {
    const list = listAdapterImplementationStatus();
    const implemented = list.filter((e) => e.implemented).map((e) => e.country);
    expect(implemented.sort()).toEqual(["CZ", "DK", "EE", "FI", "GB", "NO"]);
    // All 32 countries should be listed (EU-27 + EFTA + UK).
    expect(list.length).toBe(32);
  });
});

describe("BRIS router — dispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dispatches DK input to CVR by registration number", async () => {
    mockFetchOnce({
      hits: {
        hits: [
          {
            _source: {
              Vrvirksomhed: {
                cvrNummer: 12345678,
                virksomhedMetadata: {
                  nyesteNavn: { navn: "X A/S" },
                },
              },
            },
          },
        ],
      },
    });

    const result = await lookupBrisByCountry({
      countryCode: "DK",
      registrationNumber: "12345678",
    });

    expect(result.source).toBe("country-dk");
    expect(result.error).toBeUndefined();
    expect(result.fields.registrationNumber?.value).toBe("12345678");
  });

  it("dispatches NO input to BRREG by orgnr", async () => {
    mockFetchOnce({
      organisasjonsnummer: "987654321",
      navn: "X AS",
      organisasjonsform: { kode: "AS", beskrivelse: "Aksjeselskap" },
      konkurs: false,
      underAvvikling: false,
      underTvangsavviklingEllerTvangsopplosning: false,
      slettedato: null,
    });

    const result = await lookupBrisByCountry({
      countryCode: "NO",
      registrationNumber: "987654321",
    });

    expect(result.source).toBe("country-no");
    expect(result.fields.legalName?.value).toBe("X AS");
  });

  it("returns stub for unimplemented countries (e.g. DE)", async () => {
    const result = await lookupBrisByCountry({
      countryCode: "DE",
      legalName: "Caelex GmbH",
    });
    expect(result.fields).toEqual({});
    expect(result.error).toMatch(/not yet implemented/);
  });

  it("rejects unsupported country codes", async () => {
    const result = await lookupBrisByCountry({
      countryCode: "US",
      legalName: "X Corp",
    });
    expect(result.fields).toEqual({});
    expect(result.error).toMatch(/not in BRIS scope/);
  });

  it("returns soft-fail when dispatched country adapter has insufficient input", async () => {
    const result = await lookupBrisByCountry({
      countryCode: "DK",
      // No legalName, no registrationNumber → DK dispatcher cannot do anything
    });
    expect(result.fields).toEqual({});
    expect(result.error).toMatch(/Need legalName or registrationNumber/);
  });
});

describe("BRIS router — shouldDispatchBris", () => {
  it("returns true when countryCode + at least one identifier present", () => {
    expect(
      shouldDispatchBris({
        organizationId: "org-1",
        countryCode: "DE",
        legalName: "Caelex",
      }),
    ).toBe(true);
    expect(
      shouldDispatchBris({
        organizationId: "org-1",
        countryCode: "DE",
        vatId: "DE123",
      }),
    ).toBe(true);
    expect(
      shouldDispatchBris({
        organizationId: "org-1",
        countryCode: "DE",
        lei: "X",
      }),
    ).toBe(true);
  });

  it("returns false when no countryCode", () => {
    expect(
      shouldDispatchBris({
        organizationId: "org-1",
        legalName: "Caelex",
      }),
    ).toBe(false);
  });

  it("returns false when no identifier", () => {
    expect(
      shouldDispatchBris({
        organizationId: "org-1",
        countryCode: "DE",
      }),
    ).toBe(false);
  });

  it("returns false for unsupported country", () => {
    expect(
      shouldDispatchBris({
        organizationId: "org-1",
        countryCode: "US",
        legalName: "X",
      }),
    ).toBe(false);
  });
});
