import { describe, it, expect } from "vitest";
import {
  urgencyRank,
  deriveTriageQueue,
  triageReason,
  validateResolutionReason,
  summarizeBatch,
  type TriageInputRow,
} from "./screening-triage";

const NOW = new Date("2026-05-31T12:00:00.000Z");
const daysAgo = (n: number) =>
  new Date(NOW.getTime() - n * 86_400_000).toISOString();

function row(p: Partial<TriageInputRow>): TriageInputRow {
  return {
    id: "p1",
    legalName: "Acme",
    tradeName: null,
    countryCode: "DE",
    status: "ACTIVE",
    screeningStatus: "POTENTIAL_MATCH",
    isUSPerson: false,
    isHighRiskCountry: false,
    lastScreenedAt: daysAgo(1),
    screeningHits: null,
    ...p,
  };
}

describe("urgencyRank", () => {
  it("orders POTENTIAL_MATCH < STALE < NOT_SCREENED < CONFIRMED_HIT < CLEAR", () => {
    expect(urgencyRank("POTENTIAL_MATCH")).toBeLessThan(urgencyRank("STALE"));
    expect(urgencyRank("STALE")).toBeLessThan(urgencyRank("NOT_SCREENED"));
    expect(urgencyRank("NOT_SCREENED")).toBeLessThan(
      urgencyRank("CONFIRMED_HIT"),
    );
    expect(urgencyRank("CONFIRMED_HIT")).toBeLessThan(urgencyRank("CLEAR"));
  });
});

describe("deriveTriageQueue", () => {
  it("keeps POTENTIAL_MATCH / STALE / NOT_SCREENED and drops CLEAR + CONFIRMED_HIT by default", () => {
    const out = deriveTriageQueue(
      [
        row({ id: "a", screeningStatus: "POTENTIAL_MATCH" }),
        row({ id: "b", screeningStatus: "STALE", lastScreenedAt: daysAgo(40) }),
        row({ id: "c", screeningStatus: "NOT_SCREENED", lastScreenedAt: null }),
        row({ id: "d", screeningStatus: "CLEAR" }),
        row({ id: "e", screeningStatus: "CONFIRMED_HIT" }),
      ],
      NOW,
    );
    expect(out.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("can be widened to include a status (e.g. CONFIRMED_HIT) via includeStatuses", () => {
    const out = deriveTriageQueue(
      [
        row({ id: "a", screeningStatus: "POTENTIAL_MATCH" }),
        row({ id: "e", screeningStatus: "CONFIRMED_HIT" }),
        row({ id: "d", screeningStatus: "CLEAR" }),
      ],
      NOW,
      new Set(["CONFIRMED_HIT"]),
    );
    expect(out.map((r) => r.id)).toEqual(["e"]);
  });

  it("orders by urgency, then most-stale-first within a bucket, then name", () => {
    const out = deriveTriageQueue(
      [
        row({
          id: "stale-recent",
          screeningStatus: "STALE",
          lastScreenedAt: daysAgo(31),
        }),
        row({
          id: "stale-old",
          screeningStatus: "STALE",
          lastScreenedAt: daysAgo(90),
        }),
        row({
          id: "pm-z",
          legalName: "Zeta",
          screeningStatus: "POTENTIAL_MATCH",
        }),
        row({
          id: "pm-a",
          legalName: "Alpha",
          screeningStatus: "POTENTIAL_MATCH",
        }),
        row({
          id: "new",
          screeningStatus: "NOT_SCREENED",
          lastScreenedAt: null,
        }),
      ],
      NOW,
    );
    // POTENTIAL_MATCH first (Alpha before Zeta), then STALE (older first), then NOT_SCREENED.
    expect(out.map((r) => r.id)).toEqual([
      "pm-a",
      "pm-z",
      "stale-old",
      "stale-recent",
      "new",
    ]);
  });

  it("treats never-screened as most-stale within its bucket (lastScreenedMs = Infinity)", () => {
    const out = deriveTriageQueue(
      [
        row({
          id: "screened",
          screeningStatus: "NOT_SCREENED",
          lastScreenedAt: daysAgo(5),
        }),
        row({
          id: "never",
          screeningStatus: "NOT_SCREENED",
          lastScreenedAt: null,
        }),
      ],
      NOW,
    );
    expect(out[0].id).toBe("never");
    expect(out[0].lastScreenedMs).toBe(Infinity);
  });

  it("does not mutate the input array", () => {
    const input = [
      row({ id: "x", screeningStatus: "STALE", lastScreenedAt: daysAgo(2) }),
      row({ id: "y", screeningStatus: "POTENTIAL_MATCH" }),
    ];
    const snapshot = input.map((r) => r.id);
    deriveTriageQueue(input, NOW);
    expect(input.map((r) => r.id)).toEqual(snapshot);
  });

  it("is deterministic for an injected now (no Date.now())", () => {
    const r = row({ screeningStatus: "STALE", lastScreenedAt: daysAgo(10) });
    const a = deriveTriageQueue([r], NOW)[0].lastScreenedMs;
    const b = deriveTriageQueue([r], NOW)[0].lastScreenedMs;
    expect(a).toBe(b);
    expect(a).toBe(10 * 86_400_000);
  });
});

describe("triageReason", () => {
  it("describes a potential match with its top hit list + score", () => {
    const r = deriveTriageQueue(
      [
        row({
          screeningStatus: "POTENTIAL_MATCH",
          screeningHits: [
            {
              list: "OFAC_SDN",
              entryId: "1",
              score: 0.97,
              matchedFields: ["name"],
            },
          ],
        }),
      ],
      NOW,
    )[0];
    expect(triageReason(r)).toMatch(/potential match/i);
    expect(triageReason(r)).toMatch(/0\.97/);
    expect(triageReason(r)).toMatch(/OFAC_SDN/);
  });

  it("falls back to a generic potential-match reason when no hit summary is present", () => {
    const r = deriveTriageQueue(
      [row({ screeningStatus: "POTENTIAL_MATCH", screeningHits: null })],
      NOW,
    )[0];
    expect(triageReason(r)).toMatch(/potential match/i);
  });

  it("describes staleness with an age", () => {
    const r = deriveTriageQueue(
      [row({ screeningStatus: "STALE", lastScreenedAt: daysAgo(42) })],
      NOW,
    )[0];
    expect(triageReason(r)).toMatch(/stale/i);
    expect(triageReason(r)).toMatch(/42/);
  });

  it("describes never-screened", () => {
    const r = deriveTriageQueue(
      [row({ screeningStatus: "NOT_SCREENED", lastScreenedAt: null })],
      NOW,
    )[0];
    expect(triageReason(r)).toMatch(/never screened/i);
  });
});

describe("validateResolutionReason", () => {
  it("rejects empty / whitespace", () => {
    expect(validateResolutionReason("").ok).toBe(false);
    expect(validateResolutionReason("   ").ok).toBe(false);
  });
  it("rejects > 2000 chars", () => {
    expect(validateResolutionReason("x".repeat(2001)).ok).toBe(false);
  });
  it("accepts a real justification", () => {
    expect(
      validateResolutionReason(
        "Distinct entity — different country/registration.",
      ).ok,
    ).toBe(true);
  });
});

describe("summarizeBatch", () => {
  it("tallies ok / failed and counts new potential matches", () => {
    const s = summarizeBatch([
      { ok: true, decision: "CLEAR" },
      { ok: true, decision: "POTENTIAL_MATCH" },
      { ok: true, decision: "POTENTIAL_MATCH" },
      { ok: false },
    ]);
    expect(s).toEqual({
      total: 4,
      ok: 3,
      failed: 1,
      newPotentialMatches: 2,
    });
  });
  it("returns zeroes for an empty batch", () => {
    expect(summarizeBatch([])).toEqual({
      total: 0,
      ok: 0,
      failed: 0,
      newPotentialMatches: 0,
    });
  });
});
