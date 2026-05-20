import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/verity/utils/redaction", () => ({ safeLog: vi.fn() }));

import {
  lookupPrhByBusinessId,
  searchPrhByName,
  __resetPrhCaches,
} from "@/lib/profile-enrichment/country/fi-adapter";

const originalFetch = globalThis.fetch;

function samplePrhResponse(overrides: Record<string, unknown> = {}) {
  return {
    companies: [
      {
        businessId: { value: "1234567-8" },
        names: [
          {
            name: "Caelex Suomi Oy",
            type: 1,
            registrationDate: "2024-02-12",
            endDate: null,
          },
        ],
        addresses: [
          {
            street: "Mannerheimintie 1",
            postCode: "00100",
            postOffices: [{ city: "Helsinki" }],
            type: 1,
            endDate: null,
          },
        ],
        companyForms: [
          {
            type: "OY",
            descriptions: [
              { languageCode: "en", description: "Limited company" },
            ],
            endDate: null,
          },
        ],
        registrationDate: "2024-02-12",
        status: "Aktiivinen",
        ...overrides,
      },
    ],
    totalResults: 1,
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
  __resetPrhCaches();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("FI PRH adapter — direct lookup", () => {
  it("returns full enrichment for a valid Finnish business ID", async () => {
    mockFetchOnce(samplePrhResponse());

    const result = await lookupPrhByBusinessId("1234567-8");

    expect(result.source).toBe("country-fi");
    expect(result.error).toBeUndefined();
    expect(result.fields.registrationNumber?.value).toBe("1234567-8");
    expect(result.fields.countryCode?.value).toBe("FI");
    expect(result.fields.legalName?.value).toBe("Caelex Suomi Oy");
    expect(result.fields.headquartersAddress?.value).toContain(
      "Mannerheimintie",
    );
    expect(result.fields.legalForm?.value).toBe("Limited company");
    expect(result.fields.entityStatus?.value).toBe("ACTIVE");
    expect(result.fields.foundedYear?.value).toBe(2024);
  });

  it("rejects invalid business ID format", async () => {
    const result = await lookupPrhByBusinessId("BAD-ID");
    expect(result.fields).toEqual({});
    expect(result.error).toMatch(/Invalid Finnish business ID/);
  });

  it("maps Lakannut status to DISSOLVED", async () => {
    mockFetchOnce(samplePrhResponse({ status: "Lakannut" }));
    const result = await lookupPrhByBusinessId("1234567-8");
    expect(result.fields.entityStatus?.value).toBe("DISSOLVED");
  });

  it("returns soft-fail when companies array is empty", async () => {
    mockFetchOnce({ companies: [], totalResults: 0 });
    const result = await lookupPrhByBusinessId("9999999-9");
    expect(result.fields).toEqual({});
    expect(result.error).toMatch(/No PRH record/);
  });
});

describe("FI PRH adapter — name search", () => {
  it("uses lower confidence than direct lookup", async () => {
    mockFetchOnce(samplePrhResponse());
    const result = await searchPrhByName("Caelex");
    expect(result.fields.legalName?.confidence).toBeLessThan(0.9);
  });

  it("rejects too-short names", async () => {
    const result = await searchPrhByName("Ca");
    expect(result.fields).toEqual({});
    expect(result.error).toMatch(/at least 3/);
  });
});

describe("FI PRH adapter — caching", () => {
  it("does not refetch within TTL", async () => {
    const spy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => samplePrhResponse(),
    } as unknown as Response);
    globalThis.fetch = spy;

    await lookupPrhByBusinessId("1234567-8");
    await lookupPrhByBusinessId("1234567-8");
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
