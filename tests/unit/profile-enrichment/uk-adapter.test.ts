import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/verity/utils/redaction", () => ({ safeLog: vi.fn() }));

import {
  lookupCompaniesHouseByNumber,
  searchCompaniesHouseByName,
  __resetCompaniesHouseCaches,
} from "@/lib/profile-enrichment/country/uk-adapter";

const originalFetch = globalThis.fetch;
const originalEnv = process.env.COMPANIES_HOUSE_API_KEY;

function sampleCompany(overrides: Record<string, unknown> = {}) {
  return {
    company_number: "12345678",
    company_name: "CAELEX UK LTD",
    company_status: "active",
    type: "ltd",
    registered_office_address: {
      address_line_1: "1 Buckingham Palace Road",
      locality: "London",
      country: "England",
      postal_code: "SW1W 0RB",
    },
    date_of_creation: "2024-05-12",
    jurisdiction: "england-wales",
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
  __resetCompaniesHouseCaches();
  process.env.COMPANIES_HOUSE_API_KEY = "test-key";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalEnv === undefined) {
    delete process.env.COMPANIES_HOUSE_API_KEY;
  } else {
    process.env.COMPANIES_HOUSE_API_KEY = originalEnv;
  }
  vi.restoreAllMocks();
});

describe("UK Companies House adapter — direct lookup", () => {
  it("returns enrichment for a valid 8-char number", async () => {
    mockFetchOnce(sampleCompany());
    const result = await lookupCompaniesHouseByNumber("12345678");
    expect(result.source).toBe("country-uk");
    expect(result.error).toBeUndefined();
    expect(result.fields.registrationNumber?.value).toBe("12345678");
    expect(result.fields.countryCode?.value).toBe("GB");
    expect(result.fields.legalName?.value).toBe("CAELEX UK LTD");
    expect(result.fields.headquartersAddress?.value).toContain("Buckingham");
    expect(result.fields.legalForm?.value).toBe("ltd");
    expect(result.fields.entityStatus?.value).toBe("ACTIVE");
    expect(result.fields.foundedYear?.value).toBe(2024);
  });

  it("accepts SC-prefixed Scotland numbers", async () => {
    mockFetchOnce(sampleCompany({ company_number: "SC123456" }));
    const result = await lookupCompaniesHouseByNumber("SC123456");
    expect(result.error).toBeUndefined();
  });

  it("rejects malformed company numbers", async () => {
    const result = await lookupCompaniesHouseByNumber("123");
    expect(result.fields).toEqual({});
    expect(result.error).toMatch(/Invalid UK company number/);
  });

  it("maps dissolved status correctly", async () => {
    mockFetchOnce(sampleCompany({ company_status: "dissolved" }));
    const result = await lookupCompaniesHouseByNumber("12345678");
    expect(result.fields.entityStatus?.value).toBe("DISSOLVED");
  });

  it("returns soft-fail when API key missing", async () => {
    delete process.env.COMPANIES_HOUSE_API_KEY;
    const result = await lookupCompaniesHouseByNumber("12345678");
    expect(result.fields).toEqual({});
    expect(result.error).toMatch(/COMPANIES_HOUSE_API_KEY/);
  });

  it("returns soft-fail on 404", async () => {
    mockFetchOnce({}, { ok: false, status: 404 });
    const result = await lookupCompaniesHouseByNumber("99999999");
    expect(result.fields).toEqual({});
    expect(result.error).toMatch(/No Companies House record/);
  });
});

describe("UK Companies House adapter — name search", () => {
  it("returns first match with lower confidence", async () => {
    globalThis.fetch = vi
      .fn()
      // Search call
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              company_number: "12345678",
              title: "Caelex UK Ltd",
              company_status: "active",
              date_of_creation: "2024-05-12",
            },
          ],
        }),
      } as unknown as Response)
      // Full record fetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => sampleCompany(),
      } as unknown as Response);

    const result = await searchCompaniesHouseByName("Caelex UK");
    expect(result.fields.legalName?.confidence).toBeLessThan(0.9);
    expect(result.fields.registrationNumber?.value).toBe("12345678");
  });

  it("returns soft-fail when no items found", async () => {
    mockFetchOnce({ items: [] });
    const result = await searchCompaniesHouseByName("NonexistentXYZ");
    expect(result.fields).toEqual({});
    expect(result.error).toMatch(/No Companies House match/);
  });

  it("rejects too-short names", async () => {
    const result = await searchCompaniesHouseByName("Ca");
    expect(result.fields).toEqual({});
    expect(result.error).toMatch(/at least 3/);
  });
});

describe("UK Companies House adapter — caching", () => {
  it("does not refetch within TTL for the same company number", async () => {
    const spy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleCompany(),
    } as unknown as Response);
    globalThis.fetch = spy;

    await lookupCompaniesHouseByNumber("12345678");
    await lookupCompaniesHouseByNumber("12345678");

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
