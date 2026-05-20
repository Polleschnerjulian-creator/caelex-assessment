import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/verity/utils/redaction", () => ({ safeLog: vi.fn() }));

import {
  lookupBrregByOrgNumber,
  searchBrregByName,
  __resetBrregCaches,
} from "@/lib/profile-enrichment/country/no-adapter";

const originalFetch = globalThis.fetch;

function sampleEntity(overrides: Record<string, unknown> = {}) {
  return {
    organisasjonsnummer: "987654321",
    navn: "CAELEX NORGE AS",
    organisasjonsform: { kode: "AS", beskrivelse: "Aksjeselskap" },
    registreringsdatoEnhetsregisteret: "2023-06-01",
    konkurs: false,
    underAvvikling: false,
    underTvangsavviklingEllerTvangsopplosning: false,
    slettedato: null,
    forretningsadresse: {
      adresse: ["Karl Johans gate 1"],
      postnummer: "0154",
      poststed: "Oslo",
      kommune: "Oslo",
      land: "Norge",
    },
    ...overrides,
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
  __resetBrregCaches();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("NO BRREG adapter — direct lookup", () => {
  it("returns full enrichment for a valid orgnr", async () => {
    mockFetchOnce(sampleEntity());

    const result = await lookupBrregByOrgNumber("987654321");

    expect(result.source).toBe("country-no");
    expect(result.error).toBeUndefined();
    expect(result.fields.registrationNumber?.value).toBe("987654321");
    expect(result.fields.countryCode?.value).toBe("NO");
    expect(result.fields.legalName?.value).toBe("CAELEX NORGE AS");
    expect(result.fields.headquartersAddress?.value).toContain("Karl Johans");
    expect(result.fields.headquartersAddress?.value).toContain("Norge");
    expect(result.fields.legalForm?.value).toBe("Aksjeselskap");
    expect(result.fields.entityStatus?.value).toBe("ACTIVE");
    expect(result.fields.foundedYear?.value).toBe(2023);
  });

  it("strips whitespace from input", async () => {
    mockFetchOnce(sampleEntity());
    const result = await lookupBrregByOrgNumber("987 654 321");
    expect(result.error).toBeUndefined();
    expect(result.fields.registrationNumber?.value).toBe("987654321");
  });

  it("rejects invalid orgnr (not 9 digits)", async () => {
    const result = await lookupBrregByOrgNumber("12345");
    expect(result.fields).toEqual({});
    expect(result.error).toMatch(/Invalid Norwegian/);
  });

  it("infers DISSOLVED when konkurs=true", async () => {
    mockFetchOnce(sampleEntity({ konkurs: true }));
    const result = await lookupBrregByOrgNumber("987654321");
    expect(result.fields.entityStatus?.value).toBe("DISSOLVED");
  });

  it("infers DISSOLVED when slettedato is set", async () => {
    mockFetchOnce(sampleEntity({ slettedato: "2024-01-15" }));
    const result = await lookupBrregByOrgNumber("987654321");
    expect(result.fields.entityStatus?.value).toBe("DISSOLVED");
  });

  it("infers INACTIVE when underAvvikling=true", async () => {
    mockFetchOnce(sampleEntity({ underAvvikling: true }));
    const result = await lookupBrregByOrgNumber("987654321");
    expect(result.fields.entityStatus?.value).toBe("INACTIVE");
  });

  it("returns soft-fail on 404", async () => {
    mockFetchOnce({}, { ok: false, status: 404 });
    const result = await lookupBrregByOrgNumber("999999999");
    expect(result.fields).toEqual({});
    expect(result.error).toMatch(/No BRREG record/);
  });
});

describe("NO BRREG adapter — name search", () => {
  it("returns first hit from _embedded.enheter", async () => {
    mockFetchOnce({ _embedded: { enheter: [sampleEntity()] } });
    const result = await searchBrregByName("Caelex");
    expect(result.error).toBeUndefined();
    expect(result.fields.legalName?.value).toBe("CAELEX NORGE AS");
    expect(result.fields.legalName?.confidence).toBeLessThan(0.9);
  });

  it("returns soft-fail when search yields no hits", async () => {
    mockFetchOnce({ _embedded: { enheter: [] } });
    const result = await searchBrregByName("NonexistentXYZ");
    expect(result.fields).toEqual({});
    expect(result.error).toMatch(/No BRREG record/);
  });

  it("rejects too-short names", async () => {
    const result = await searchBrregByName("Ca");
    expect(result.fields).toEqual({});
    expect(result.error).toMatch(/at least 3/);
  });
});

describe("NO BRREG adapter — caching", () => {
  it("does not refetch within TTL", async () => {
    const spy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleEntity(),
    } as unknown as Response);
    globalThis.fetch = spy;

    await lookupBrregByOrgNumber("987654321");
    await lookupBrregByOrgNumber("987654321");
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
