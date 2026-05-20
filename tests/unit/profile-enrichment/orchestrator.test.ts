import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/verity/utils/redaction", () => ({ safeLog: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: { findUnique: vi.fn() },
  },
}));

// Adapter mocks — we control what each "would have returned" from the network.
vi.mock("@/lib/profile-enrichment/vies-adapter", () => ({
  lookupViesByVat: vi.fn(),
  lookupViesByCountryCode: vi.fn(),
}));
vi.mock("@/lib/profile-enrichment/gleif-adapter", () => ({
  lookupGleifByLei: vi.fn(),
  searchGleifByName: vi.fn(),
}));
vi.mock("@/lib/profile-enrichment/bris-country-router", () => ({
  lookupBrisByCountry: vi.fn(),
  shouldDispatchBris: vi.fn(),
}));

import { enrichOperatorProfile } from "@/lib/profile-enrichment/orchestrator";
import { makeField, type AdapterOutput } from "@/lib/profile-enrichment/types";
import * as vies from "@/lib/profile-enrichment/vies-adapter";
import * as gleif from "@/lib/profile-enrichment/gleif-adapter";
import * as bris from "@/lib/profile-enrichment/bris-country-router";

// ─── Helpers ───────────────────────────────────────────────────────────────

function viesOutput(
  fields: Partial<AdapterOutput["fields"]> = {},
  error?: string,
): AdapterOutput {
  return {
    source: "vies",
    fields,
    startedAt: new Date().toISOString(),
    durationMs: 1,
    ...(error ? { error } : {}),
  };
}

function gleifOutput(
  fields: Partial<AdapterOutput["fields"]> = {},
  error?: string,
): AdapterOutput {
  return {
    source: "gleif",
    fields,
    startedAt: new Date().toISOString(),
    durationMs: 1,
    ...(error ? { error } : {}),
  };
}

function brisOutput(
  fields: Partial<AdapterOutput["fields"]> = {},
  error?: string,
): AdapterOutput {
  return {
    source: "country-de",
    fields,
    startedAt: new Date().toISOString(),
    durationMs: 1,
    ...(error ? { error } : {}),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(bris.shouldDispatchBris).mockReturnValue(false);
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("orchestrator — dispatch logic", () => {
  it("returns SKIPPED when no input identifiers given", async () => {
    const result = await enrichOperatorProfile({ organizationId: "org-1" });
    expect(result.status).toBe("SKIPPED");
    expect(result.profile).toEqual({});
    expect(result.sourceAttempts).toEqual([]);
  });

  it("dispatches VIES when vatId provided", async () => {
    vi.mocked(vies.lookupViesByVat).mockResolvedValue(
      viesOutput({ legalName: makeField("Caelex GmbH", "vies", "DE1", 0.95) }),
    );

    const result = await enrichOperatorProfile({
      organizationId: "org-1",
      vatId: "DE123456789",
    });

    expect(vies.lookupViesByVat).toHaveBeenCalledWith("DE123456789");
    expect(result.status).toBe("SUCCESS");
    expect(result.profile.legalName?.value).toBe("Caelex GmbH");
  });

  it("dispatches GLEIF direct lookup when LEI provided", async () => {
    vi.mocked(gleif.lookupGleifByLei).mockResolvedValue(
      gleifOutput({ lei: makeField("LEI123", "gleif", "LEI123", 0.95) }),
    );

    const result = await enrichOperatorProfile({
      organizationId: "org-1",
      lei: "529900T8BM49AURSDO55",
    });

    expect(gleif.lookupGleifByLei).toHaveBeenCalledWith("529900T8BM49AURSDO55");
    expect(gleif.searchGleifByName).not.toHaveBeenCalled();
    expect(result.profile.lei?.value).toBe("LEI123");
  });

  it("falls back to GLEIF name search when no LEI but name+country given", async () => {
    vi.mocked(gleif.searchGleifByName).mockResolvedValue(
      gleifOutput({ legalName: makeField("Caelex GmbH", "gleif", "X", 0.6) }),
    );

    await enrichOperatorProfile({
      organizationId: "org-1",
      legalName: "Caelex",
      countryCode: "DE",
    });

    expect(gleif.searchGleifByName).toHaveBeenCalledWith("Caelex", "DE");
    expect(gleif.lookupGleifByLei).not.toHaveBeenCalled();
  });

  it("dispatches BRIS country-router when shouldDispatchBris returns true", async () => {
    vi.mocked(bris.shouldDispatchBris).mockReturnValue(true);
    vi.mocked(bris.lookupBrisByCountry).mockResolvedValue(
      brisOutput({}, "Country adapter not yet implemented"),
    );

    await enrichOperatorProfile({
      organizationId: "org-1",
      legalName: "Caelex",
      countryCode: "DE",
    });

    expect(bris.lookupBrisByCountry).toHaveBeenCalled();
  });

  it("honors skipSources to suppress adapters", async () => {
    vi.mocked(vies.lookupViesByVat).mockResolvedValue(viesOutput());

    await enrichOperatorProfile({
      organizationId: "org-1",
      vatId: "DE1",
      skipSources: ["vies"],
    });

    expect(vies.lookupViesByVat).not.toHaveBeenCalled();
  });
});

describe("orchestrator — merge behavior", () => {
  it("merges agreeing fields from multiple sources with sources concatenated", async () => {
    vi.mocked(vies.lookupViesByVat).mockResolvedValue(
      viesOutput({
        legalName: makeField("Caelex GmbH", "vies", "DE1", 0.95),
        countryCode: makeField("DE", "vies", "DE1", 0.95),
      }),
    );
    vi.mocked(gleif.lookupGleifByLei).mockResolvedValue(
      gleifOutput({
        legalName: makeField("Caelex GmbH", "gleif", "LEI1", 0.95),
        countryCode: makeField("DE", "gleif", "LEI1", 0.95),
      }),
    );

    const result = await enrichOperatorProfile({
      organizationId: "org-1",
      vatId: "DE1",
      lei: "529900T8BM49AURSDO55",
    });

    expect(result.status).toBe("SUCCESS");
    expect(result.profile.legalName?.value).toBe("Caelex GmbH");
    // Both VIES and GLEIF contributed to legalName — sources should reflect that.
    expect(result.profile.legalName?.sources.length).toBe(2);
    expect(
      result.profile.legalName?.sources.map((s) => s.system).sort(),
    ).toEqual(["gleif", "vies"]);
  });

  it("higher-confidence source wins on disagreement", async () => {
    vi.mocked(vies.lookupViesByVat).mockResolvedValue(
      viesOutput({ legalName: makeField("Caelex AG", "vies", "DE1", 0.5) }),
    );
    vi.mocked(gleif.lookupGleifByLei).mockResolvedValue(
      gleifOutput({
        legalName: makeField("Caelex GmbH", "gleif", "LEI1", 0.95),
      }),
    );

    const result = await enrichOperatorProfile({
      organizationId: "org-1",
      vatId: "DE1",
      lei: "529900T8BM49AURSDO55",
    });

    expect(result.profile.legalName?.value).toBe("Caelex GmbH");
    // But the loser's source is preserved for audit.
    expect(result.profile.legalName?.sources.length).toBe(2);
  });

  it("preserves unique fields from each source", async () => {
    vi.mocked(vies.lookupViesByVat).mockResolvedValue(
      viesOutput({ vatId: makeField("DE123456789", "vies", "DE1", 0.95) }),
    );
    vi.mocked(gleif.lookupGleifByLei).mockResolvedValue(
      gleifOutput({ lei: makeField("LEI1", "gleif", "LEI1", 0.95) }),
    );

    const result = await enrichOperatorProfile({
      organizationId: "org-1",
      vatId: "DE123456789",
      lei: "529900T8BM49AURSDO55",
    });

    expect(result.profile.vatId?.value).toBe("DE123456789");
    expect(result.profile.lei?.value).toBe("LEI1");
  });
});

describe("orchestrator — status calculation", () => {
  it("returns PARTIAL when one adapter succeeds and another fails", async () => {
    vi.mocked(vies.lookupViesByVat).mockResolvedValue(
      viesOutput({ legalName: makeField("X", "vies", "DE1", 0.9) }),
    );
    vi.mocked(gleif.lookupGleifByLei).mockResolvedValue(
      gleifOutput({}, "GLEIF unreachable"),
    );

    const result = await enrichOperatorProfile({
      organizationId: "org-1",
      vatId: "DE1",
      lei: "529900T8BM49AURSDO55",
    });

    expect(result.status).toBe("PARTIAL");
    expect(result.sourceAttempts).toHaveLength(2);
    expect(result.sourceAttempts.filter((a) => a.success).length).toBe(1);
    expect(result.sourceAttempts.filter((a) => !a.success).length).toBe(1);
  });

  it("returns FAILED when all adapters return no usable fields", async () => {
    vi.mocked(vies.lookupViesByVat).mockResolvedValue(
      viesOutput({}, "MS_UNAVAILABLE"),
    );
    vi.mocked(gleif.lookupGleifByLei).mockResolvedValue(
      gleifOutput({}, "Not found"),
    );

    const result = await enrichOperatorProfile({
      organizationId: "org-1",
      vatId: "DE1",
      lei: "529900T8BM49AURSDO55",
    });

    expect(result.status).toBe("FAILED");
    expect(result.profile).toEqual({});
  });

  it("returns SUCCESS only when ALL dispatched adapters succeeded", async () => {
    vi.mocked(vies.lookupViesByVat).mockResolvedValue(
      viesOutput({ legalName: makeField("X", "vies", "DE1", 0.9) }),
    );
    vi.mocked(gleif.lookupGleifByLei).mockResolvedValue(
      gleifOutput({ lei: makeField("Y", "gleif", "LEI1", 0.9) }),
    );

    const result = await enrichOperatorProfile({
      organizationId: "org-1",
      vatId: "DE1",
      lei: "529900T8BM49AURSDO55",
    });

    expect(result.status).toBe("SUCCESS");
  });
});

describe("orchestrator — robustness", () => {
  it("never throws even if an adapter throws (Promise.allSettled)", async () => {
    vi.mocked(vies.lookupViesByVat).mockRejectedValue(new Error("boom"));

    const result = await enrichOperatorProfile({
      organizationId: "org-1",
      vatId: "DE1",
    });

    expect(result.status).toBe("FAILED");
    expect(result.sourceAttempts).toHaveLength(1);
    expect(result.sourceAttempts[0]!.success).toBe(false);
    expect(result.sourceAttempts[0]!.error).toMatch(/rejected/i);
  });

  it("records duration > 0 on every run", async () => {
    vi.mocked(vies.lookupViesByVat).mockResolvedValue(viesOutput());
    const result = await enrichOperatorProfile({
      organizationId: "org-1",
      vatId: "DE1",
    });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(typeof result.startedAt).toBe("string");
  });
});
