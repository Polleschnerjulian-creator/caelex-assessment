import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/verity/utils/redaction", () => ({
  safeLog: vi.fn(),
}));

import {
  lookupGleifByLei,
  searchGleifByName,
  getGleifOwnershipChain,
  __resetGleifCaches,
} from "@/lib/profile-enrichment/gleif-adapter";

// ─── Fixtures ──────────────────────────────────────────────────────────────

const SAMPLE_LEI = "529900T8BM49AURSDO55"; // 20-char valid format

const sampleRecord = (lei: string = SAMPLE_LEI, status = "ACTIVE") => ({
  type: "lei-records",
  id: lei,
  attributes: {
    lei,
    entity: {
      legalName: { name: "Caelex GmbH", language: "de" },
      legalAddress: {
        addressLines: ["Berliner Allee 1"],
        city: "Berlin",
        country: "DE",
        postalCode: "10115",
      },
      headquartersAddress: {
        addressLines: ["Berliner Allee 1"],
        city: "Berlin",
        country: "DE",
        postalCode: "10115",
      },
      jurisdiction: "DE",
      legalForm: { id: "8Z6G", other: "GmbH" },
      status,
      creationDate: "2024-03-15",
    },
    registration: {
      initialRegistrationDate: "2024-03-15",
      lastUpdateDate: "2026-04-01",
      status: "ISSUED",
    },
  },
});

// ─── Mock helpers ──────────────────────────────────────────────────────────

const originalFetch = globalThis.fetch;

interface MockResp {
  ok?: boolean;
  status?: number;
  body: unknown;
}

function mockFetchSequence(...responses: MockResp[]): ReturnType<typeof vi.fn> {
  const spy = vi.fn();
  for (const r of responses) {
    spy.mockResolvedValueOnce({
      ok: r.ok ?? true,
      status: r.status ?? 200,
      json: async () => r.body,
    } as unknown as Response);
  }
  globalThis.fetch = spy;
  return spy;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  __resetGleifCaches();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("GLEIF — lookupGleifByLei", () => {
  it("returns full enrichment for a valid LEI with ownership", async () => {
    mockFetchSequence(
      // 1) /lei-records/{lei}
      { body: { data: sampleRecord() } },
      // 2) /lei-records/{lei}/direct-parent
      {
        body: {
          data: {
            type: "relationship-records",
            relationships: {
              "lei-record": { data: { id: "PARENTPARENTPARENT01" } },
            },
          },
        },
      },
      // 3) /lei-records/{lei}/ultimate-parent
      {
        body: {
          data: {
            type: "relationship-records",
            relationships: {
              "lei-record": { data: { id: "ULTIMATEULTIMATE0001" } },
            },
          },
        },
      },
    );

    const result = await lookupGleifByLei(SAMPLE_LEI);

    expect(result.source).toBe("gleif");
    expect(result.error).toBeUndefined();
    expect(result.fields.lei?.value).toBe(SAMPLE_LEI);
    expect(result.fields.legalName?.value).toBe("Caelex GmbH");
    expect(result.fields.countryCode?.value).toBe("DE");
    expect(result.fields.entityStatus?.value).toBe("ACTIVE");
    expect(result.fields.headquartersAddress?.value).toContain("Berlin");
    expect(result.fields.legalForm?.value).toBe("GmbH");
    expect(result.fields.foundedYear?.value).toBe(2024);
    expect(result.fields.parentLei?.value).toBe("PARENTPARENTPARENT01");
    expect(result.fields.ultimateParentLei?.value).toBe("ULTIMATEULTIMATE0001");
  });

  it("handles missing parent relationships gracefully (404)", async () => {
    mockFetchSequence(
      { body: { data: sampleRecord() } },
      { ok: false, status: 404, body: {} },
      { ok: false, status: 404, body: {} },
    );

    const result = await lookupGleifByLei(SAMPLE_LEI);
    expect(result.error).toBeUndefined();
    expect(result.fields.parentLei).toBeUndefined();
    expect(result.fields.ultimateParentLei).toBeUndefined();
  });

  it("rejects malformed LEI", async () => {
    const result = await lookupGleifByLei("ABC");
    expect(result.fields).toEqual({});
    expect(result.error).toMatch(/Invalid LEI/);
  });

  it("rejects LEI with bad characters", async () => {
    const result = await lookupGleifByLei("529900T8BM49AURS_O55");
    expect(result.fields).toEqual({});
    expect(result.error).toMatch(/Invalid LEI/);
  });

  it("returns soft-fail when LEI not found", async () => {
    mockFetchSequence({ ok: false, status: 404, body: {} });
    const result = await lookupGleifByLei("00000000000000000000");
    expect(result.fields).toEqual({});
    expect(result.error).toMatch(/not found/);
  });

  it("maps GLEIF status MERGED to EntityStatus MERGED", async () => {
    mockFetchSequence(
      { body: { data: sampleRecord(SAMPLE_LEI, "MERGED") } },
      { ok: false, status: 404, body: {} },
      { ok: false, status: 404, body: {} },
    );
    const result = await lookupGleifByLei(SAMPLE_LEI);
    expect(result.fields.entityStatus?.value).toBe("MERGED");
  });

  it("strips sub-jurisdiction (e.g. US-CA → US)", async () => {
    const record = sampleRecord();
    record.attributes.entity.jurisdiction = "US-CA";
    mockFetchSequence(
      { body: { data: record } },
      { ok: false, status: 404, body: {} },
      { ok: false, status: 404, body: {} },
    );
    const result = await lookupGleifByLei(SAMPLE_LEI);
    expect(result.fields.countryCode?.value).toBe("US");
  });
});

describe("GLEIF — searchGleifByName", () => {
  it("returns best ACTIVE+ISSUED match from multiple candidates", async () => {
    const records = [
      sampleRecord("INACTIVE000000000001", "INACTIVE"),
      sampleRecord("ACTIVEPICK0000000002", "ACTIVE"),
    ];
    mockFetchSequence(
      { body: { data: records } },
      // parent + ultimate for the chosen LEI
      { ok: false, status: 404, body: {} },
      { ok: false, status: 404, body: {} },
    );

    const result = await searchGleifByName("Caelex");
    expect(result.error).toBeUndefined();
    expect(result.fields.lei?.value).toBe("ACTIVEPICK0000000002");
    // Fuzzy confidence — lower than direct LEI lookup
    expect(result.fields.lei?.confidence).toBeLessThan(0.9);
  });

  it("returns soft-fail when name too short", async () => {
    const result = await searchGleifByName("Ca");
    expect(result.fields).toEqual({});
    expect(result.error).toMatch(/at least 3/);
  });

  it("returns soft-fail when no matches", async () => {
    mockFetchSequence({ body: { data: [] } });
    const result = await searchGleifByName("NonexistentCompanyXYZ");
    expect(result.fields).toEqual({});
    expect(result.error).toMatch(/No GLEIF match/);
  });

  it("bumps confidence slightly when only 1 candidate", async () => {
    mockFetchSequence(
      { body: { data: [sampleRecord()] } },
      { ok: false, status: 404, body: {} },
      { ok: false, status: 404, body: {} },
    );
    const result = await searchGleifByName("Caelex GmbH");
    expect(result.fields.lei).toBeDefined();
    // Single-candidate bump: 0.6 + 0.15 = 0.75
    expect(result.fields.lei!.confidence).toBeGreaterThan(0.7);
  });
});

describe("GLEIF — getGleifOwnershipChain", () => {
  it("returns both parent and ultimate parent when both exist", async () => {
    mockFetchSequence(
      {
        body: {
          data: {
            type: "relationship-records",
            relationships: {
              "lei-record": { data: { id: "PARENT00000000000001" } },
            },
          },
        },
      },
      {
        body: {
          data: {
            type: "relationship-records",
            relationships: {
              "lei-record": { data: { id: "ULTIMATE000000000002" } },
            },
          },
        },
      },
    );

    const chain = await getGleifOwnershipChain(SAMPLE_LEI);
    expect(chain.directParentLei).toBe("PARENT00000000000001");
    expect(chain.ultimateParentLei).toBe("ULTIMATE000000000002");
  });

  it("returns empty object when entity has no parent", async () => {
    mockFetchSequence(
      { ok: false, status: 404, body: {} },
      { ok: false, status: 404, body: {} },
    );
    const chain = await getGleifOwnershipChain(SAMPLE_LEI);
    expect(chain).toEqual({});
  });
});

describe("GLEIF — caching", () => {
  it("does not refetch within TTL for the same LEI", async () => {
    const spy = mockFetchSequence(
      { body: { data: sampleRecord() } },
      { ok: false, status: 404, body: {} },
      { ok: false, status: 404, body: {} },
    );

    await lookupGleifByLei(SAMPLE_LEI);
    await lookupGleifByLei(SAMPLE_LEI);

    // First call: 1 LEI fetch + 2 ownership fetches = 3
    // Second call: 0 (everything cached)
    expect(spy).toHaveBeenCalledTimes(3);
  });
});
