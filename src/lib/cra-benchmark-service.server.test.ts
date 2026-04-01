/**
 * Unit tests for CRA Benchmark Service
 *
 * calculateCRABenchmark computes anonymized cross-org compliance stats.
 * Privacy rule: returns null when fewer than 5 orgs have assessments.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

const mockFindMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    cRAAssessment: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

// withCache: bypass the real cache — just call the function directly
vi.mock("@/lib/cache.server", () => ({
  withCache: vi.fn((_key: string, fn: () => Promise<unknown>) => fn()),
}));

// cra-requirements data — minimal fixture enough for category mapping
vi.mock("@/data/cra-requirements", () => ({
  CRA_REQUIREMENTS: [
    {
      id: "cra-vuln-01",
      title: "Vulnerability Disclosure",
      category: "vulnerability_handling",
    },
    {
      id: "cra-sec-01",
      title: "Secure by Design",
      category: "security_by_design",
    },
    {
      id: "cra-doc-01",
      title: "Technical Documentation",
      category: "documentation",
    },
  ],
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { calculateCRABenchmark } from "./cra-benchmark-service.server";

// ── Fixtures ──────────────────────────────────────────────────────────────────

/**
 * Build a mock assessment row as returned by prisma.cRAAssessment.findMany.
 */
function makeAssessment(
  orgId: string,
  opts: {
    maturityScore?: number | null;
    productClassification?: string;
    requirements?: Array<{ requirementId: string; status: string }>;
  } = {},
) {
  return {
    organizationId: orgId,
    maturityScore: opts.maturityScore ?? 70,
    productClassification: opts.productClassification ?? "default",
    requirements: opts.requirements ?? [
      { requirementId: "cra-vuln-01", status: "compliant" },
      { requirementId: "cra-sec-01", status: "non_compliant" },
    ],
  };
}

/**
 * Build a set of 5 distinct orgs with assessments to pass the privacy threshold.
 * All orgs get the same maturityScore unless overridden.
 */
function makeGlobalAssessments(
  overrides: Array<ReturnType<typeof makeAssessment>> = [],
): ReturnType<typeof makeAssessment>[] {
  const base = [
    makeAssessment("org-1", { maturityScore: 60 }),
    makeAssessment("org-2", { maturityScore: 70 }),
    makeAssessment("org-3", { maturityScore: 80 }),
    makeAssessment("org-4", { maturityScore: 50 }),
    makeAssessment("org-5", { maturityScore: 90 }),
  ];
  return [...base, ...overrides];
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("calculateCRABenchmark", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Privacy threshold ──────────────────────────────────────────────────────

  describe("privacy threshold", () => {
    it("returns null when zero orgs have assessments", async () => {
      mockFindMany.mockResolvedValue([]);
      const result = await calculateCRABenchmark("org-1");
      expect(result).toBeNull();
    });

    it("returns null when fewer than 5 orgs have in-scope assessments", async () => {
      // 4 distinct orgs — one below the threshold
      mockFindMany.mockResolvedValue([
        makeAssessment("org-1"),
        makeAssessment("org-2"),
        makeAssessment("org-3"),
        makeAssessment("org-4"),
      ]);
      const result = await calculateCRABenchmark("org-1");
      expect(result).toBeNull();
    });

    it("returns null with exactly 4 orgs (strictly less than 5)", async () => {
      const assessments = Array.from({ length: 4 }, (_, i) =>
        makeAssessment(`org-${i + 1}`),
      );
      // First call (global snapshot) — 4 orgs; second call (org data) doesn't matter
      mockFindMany.mockResolvedValue(assessments);
      const result = await calculateCRABenchmark("org-1");
      expect(result).toBeNull();
    });

    it("returns a result when exactly 5 orgs have assessments", async () => {
      const globalAssessments = makeGlobalAssessments();
      // First call: global snapshot (5 orgs); second call: per-org data
      mockFindMany
        .mockResolvedValueOnce(globalAssessments)
        .mockResolvedValueOnce([makeAssessment("org-1")]);
      const result = await calculateCRABenchmark("org-1");
      expect(result).not.toBeNull();
    });
  });

  // ── Returned shape ─────────────────────────────────────────────────────────

  describe("returned shape", () => {
    beforeEach(() => {
      mockFindMany
        .mockResolvedValueOnce(makeGlobalAssessments())
        .mockResolvedValueOnce([makeAssessment("org-1")]);
    });

    it("returns totalOrganizations = 5", async () => {
      const result = await calculateCRABenchmark("org-1");
      expect(result!.totalOrganizations).toBe(5);
    });

    it("returns a numeric averageMaturityScore", async () => {
      const result = await calculateCRABenchmark("org-1");
      expect(typeof result!.averageMaturityScore).toBe("number");
    });

    it("returns a numeric medianMaturityScore", async () => {
      const result = await calculateCRABenchmark("org-1");
      expect(typeof result!.medianMaturityScore).toBe("number");
    });

    it("returns a percentile between 0 and 100", async () => {
      const result = await calculateCRABenchmark("org-1");
      expect(result!.percentile).toBeGreaterThanOrEqual(0);
      expect(result!.percentile).toBeLessThanOrEqual(100);
    });

    it("returns byProductClass with class_II, class_I, and default keys", async () => {
      const result = await calculateCRABenchmark("org-1");
      expect(result!.byProductClass).toHaveProperty("class_II");
      expect(result!.byProductClass).toHaveProperty("class_I");
      expect(result!.byProductClass).toHaveProperty("default");
    });

    it("returns byCategory as an array", async () => {
      const result = await calculateCRABenchmark("org-1");
      expect(Array.isArray(result!.byCategory)).toBe(true);
    });

    it("returns topGaps as an array", async () => {
      const result = await calculateCRABenchmark("org-1");
      expect(Array.isArray(result!.topGaps)).toBe(true);
    });
  });

  // ── Percentile calculation ─────────────────────────────────────────────────

  describe("percentile calculation", () => {
    it("org above average scores a percentile above 50", async () => {
      // 5 orgs: scores 10, 20, 30, 40, 50 — requesting org has score 50
      const globalAssessments = [
        makeAssessment("org-1", { maturityScore: 10 }),
        makeAssessment("org-2", { maturityScore: 20 }),
        makeAssessment("org-3", { maturityScore: 30 }),
        makeAssessment("org-4", { maturityScore: 40 }),
        makeAssessment("org-5", { maturityScore: 50 }),
      ];
      mockFindMany
        .mockResolvedValueOnce(globalAssessments)
        .mockResolvedValueOnce([
          makeAssessment("org-5", { maturityScore: 50 }),
        ]);

      const result = await calculateCRABenchmark("org-5");
      // org-5 has score 50 — 4 orgs below → percentileRank = round(4/5*100) = 80
      expect(result!.percentile).toBeGreaterThan(50);
    });

    it("org below average scores a percentile below 50", async () => {
      const globalAssessments = [
        makeAssessment("org-1", { maturityScore: 10 }),
        makeAssessment("org-2", { maturityScore: 60 }),
        makeAssessment("org-3", { maturityScore: 70 }),
        makeAssessment("org-4", { maturityScore: 80 }),
        makeAssessment("org-5", { maturityScore: 90 }),
      ];
      mockFindMany
        .mockResolvedValueOnce(globalAssessments)
        .mockResolvedValueOnce([
          makeAssessment("org-1", { maturityScore: 10 }),
        ]);

      const result = await calculateCRABenchmark("org-1");
      // org-1 has score 10 — 0 orgs below → percentileRank = round(0/5*100) = 0
      expect(result!.percentile).toBeLessThan(50);
    });

    it("correctly computes percentile rank at median position", async () => {
      // Sorted: 10, 20, 30, 40, 50; org has score 30 → 2 below → 2/5*100 = 40
      const globalAssessments = [
        makeAssessment("org-1", { maturityScore: 10 }),
        makeAssessment("org-2", { maturityScore: 20 }),
        makeAssessment("org-3", { maturityScore: 30 }),
        makeAssessment("org-4", { maturityScore: 40 }),
        makeAssessment("org-5", { maturityScore: 50 }),
      ];
      mockFindMany
        .mockResolvedValueOnce(globalAssessments)
        .mockResolvedValueOnce([
          makeAssessment("org-3", { maturityScore: 30 }),
        ]);

      const result = await calculateCRABenchmark("org-3");
      expect(result!.percentile).toBe(40);
    });
  });

  // ── Aggregate maturity scores ──────────────────────────────────────────────

  describe("average and median maturity scores", () => {
    it("calculates correct average for known scores", async () => {
      // Scores: 10, 20, 30, 40, 50 → average = 30
      const globalAssessments = [
        makeAssessment("org-1", { maturityScore: 10 }),
        makeAssessment("org-2", { maturityScore: 20 }),
        makeAssessment("org-3", { maturityScore: 30 }),
        makeAssessment("org-4", { maturityScore: 40 }),
        makeAssessment("org-5", { maturityScore: 50 }),
      ];
      mockFindMany
        .mockResolvedValueOnce(globalAssessments)
        .mockResolvedValueOnce([makeAssessment("org-1")]);

      const result = await calculateCRABenchmark("org-1");
      expect(result!.averageMaturityScore).toBe(30);
    });

    it("calculates correct median for odd-length sorted array", async () => {
      // Sorted: 10, 20, 30, 40, 50 → median = 30
      const globalAssessments = [
        makeAssessment("org-1", { maturityScore: 50 }),
        makeAssessment("org-2", { maturityScore: 20 }),
        makeAssessment("org-3", { maturityScore: 30 }),
        makeAssessment("org-4", { maturityScore: 10 }),
        makeAssessment("org-5", { maturityScore: 40 }),
      ];
      mockFindMany
        .mockResolvedValueOnce(globalAssessments)
        .mockResolvedValueOnce([makeAssessment("org-1")]);

      const result = await calculateCRABenchmark("org-1");
      expect(result!.medianMaturityScore).toBe(30);
    });
  });

  // ── Product class grouping ─────────────────────────────────────────────────

  describe("byProductClass grouping", () => {
    it("correctly groups assessments into class_II bucket", async () => {
      const globalAssessments = [
        makeAssessment("org-1", {
          maturityScore: 80,
          productClassification: "class_II",
        }),
        makeAssessment("org-2", {
          maturityScore: 70,
          productClassification: "class_II",
        }),
        makeAssessment("org-3", { maturityScore: 60 }),
        makeAssessment("org-4", { maturityScore: 50 }),
        makeAssessment("org-5", { maturityScore: 40 }),
      ];
      mockFindMany
        .mockResolvedValueOnce(globalAssessments)
        .mockResolvedValueOnce([makeAssessment("org-1")]);

      const result = await calculateCRABenchmark("org-1");
      // org-1 and org-2 are class_II, each counted once per classification entry
      expect(result!.byProductClass.class_II.count).toBeGreaterThan(0);
      expect(result!.byProductClass.class_II.avgScore).toBeGreaterThan(0);
    });

    it("class_I count is 0 when no assessments use class_I classification", async () => {
      const globalAssessments = makeGlobalAssessments(); // all "default"
      mockFindMany
        .mockResolvedValueOnce(globalAssessments)
        .mockResolvedValueOnce([makeAssessment("org-1")]);

      const result = await calculateCRABenchmark("org-1");
      expect(result!.byProductClass.class_I.count).toBe(0);
      expect(result!.byProductClass.class_I.avgScore).toBe(0);
    });

    it("correctly groups assessments into default bucket", async () => {
      const globalAssessments = makeGlobalAssessments(); // all "default"
      mockFindMany
        .mockResolvedValueOnce(globalAssessments)
        .mockResolvedValueOnce([makeAssessment("org-1")]);

      const result = await calculateCRABenchmark("org-1");
      expect(result!.byProductClass.default.count).toBe(5);
    });
  });

  // ── Top gaps ──────────────────────────────────────────────────────────────

  describe("topGaps", () => {
    it("returns top gaps sorted by nonCompliantPercent descending", async () => {
      // All orgs have cra-sec-01 as non_compliant and cra-vuln-01 as compliant
      const globalAssessments = [
        makeAssessment("org-1", {
          maturityScore: 60,
          requirements: [
            { requirementId: "cra-vuln-01", status: "compliant" },
            { requirementId: "cra-sec-01", status: "non_compliant" },
          ],
        }),
        makeAssessment("org-2", {
          maturityScore: 70,
          requirements: [
            { requirementId: "cra-vuln-01", status: "compliant" },
            { requirementId: "cra-sec-01", status: "non_compliant" },
          ],
        }),
        makeAssessment("org-3", {
          maturityScore: 80,
          requirements: [
            { requirementId: "cra-vuln-01", status: "non_compliant" },
            { requirementId: "cra-sec-01", status: "non_compliant" },
          ],
        }),
        makeAssessment("org-4", { maturityScore: 50 }),
        makeAssessment("org-5", { maturityScore: 40 }),
      ];
      mockFindMany
        .mockResolvedValueOnce(globalAssessments)
        .mockResolvedValueOnce([makeAssessment("org-1")]);

      const result = await calculateCRABenchmark("org-1");
      const gaps = result!.topGaps;
      expect(gaps.length).toBeGreaterThan(0);

      // Verify descending sort
      for (let i = 0; i < gaps.length - 1; i++) {
        expect(gaps[i].nonCompliantPercent).toBeGreaterThanOrEqual(
          gaps[i + 1].nonCompliantPercent,
        );
      }
    });

    it("topGaps contains requirementId, title, and nonCompliantPercent", async () => {
      const globalAssessments = makeGlobalAssessments([
        makeAssessment("org-6", {
          requirements: [
            { requirementId: "cra-sec-01", status: "non_compliant" },
          ],
        }),
      ]);
      mockFindMany
        .mockResolvedValueOnce(globalAssessments)
        .mockResolvedValueOnce([makeAssessment("org-1")]);

      const result = await calculateCRABenchmark("org-1");
      const gaps = result!.topGaps;
      if (gaps.length > 0) {
        expect(gaps[0]).toHaveProperty("requirementId");
        expect(gaps[0]).toHaveProperty("title");
        expect(gaps[0]).toHaveProperty("nonCompliantPercent");
      }
    });

    it("topGaps returns at most 5 entries", async () => {
      // Create assessments that cover multiple requirements
      const makeMultiReqAssessment = (orgId: string, score: number) =>
        makeAssessment(orgId, {
          maturityScore: score,
          requirements: [
            { requirementId: "cra-vuln-01", status: "non_compliant" },
            { requirementId: "cra-sec-01", status: "non_compliant" },
            { requirementId: "cra-doc-01", status: "non_compliant" },
          ],
        });

      const globalAssessments = [
        makeMultiReqAssessment("org-1", 60),
        makeMultiReqAssessment("org-2", 70),
        makeMultiReqAssessment("org-3", 80),
        makeMultiReqAssessment("org-4", 50),
        makeMultiReqAssessment("org-5", 40),
      ];
      mockFindMany
        .mockResolvedValueOnce(globalAssessments)
        .mockResolvedValueOnce([makeMultiReqAssessment("org-1", 60)]);

      const result = await calculateCRABenchmark("org-1");
      expect(result!.topGaps.length).toBeLessThanOrEqual(5);
    });

    it("excludes requirements with 0% non-compliance from topGaps", async () => {
      // All orgs have cra-vuln-01 as compliant → should not appear in gaps
      const globalAssessments = [
        makeAssessment("org-1", {
          maturityScore: 60,
          requirements: [{ requirementId: "cra-vuln-01", status: "compliant" }],
        }),
        makeAssessment("org-2", {
          maturityScore: 70,
          requirements: [{ requirementId: "cra-vuln-01", status: "compliant" }],
        }),
        makeAssessment("org-3", {
          maturityScore: 80,
          requirements: [{ requirementId: "cra-vuln-01", status: "compliant" }],
        }),
        makeAssessment("org-4", {
          maturityScore: 50,
          requirements: [{ requirementId: "cra-vuln-01", status: "compliant" }],
        }),
        makeAssessment("org-5", {
          maturityScore: 40,
          requirements: [{ requirementId: "cra-vuln-01", status: "compliant" }],
        }),
      ];
      mockFindMany
        .mockResolvedValueOnce(globalAssessments)
        .mockResolvedValueOnce([makeAssessment("org-1")]);

      const result = await calculateCRABenchmark("org-1");
      const vulnGap = result!.topGaps.find(
        (g) => g.requirementId === "cra-vuln-01",
      );
      expect(vulnGap).toBeUndefined();
    });
  });

  // ── Per-org graceful handling ──────────────────────────────────────────────

  describe("org with no assessments", () => {
    it("returns a result with percentile 0 when org has no assessments", async () => {
      const globalAssessments = makeGlobalAssessments();
      // Second call (getOrgCRAData): org-unknown has no assessments
      mockFindMany
        .mockResolvedValueOnce(globalAssessments)
        .mockResolvedValueOnce([]);

      const result = await calculateCRABenchmark("org-unknown");
      expect(result).not.toBeNull();
      // avgMaturityScore for org = 0 → 0 scores below 0 in sorted [50,60,70,80,90]
      expect(result!.percentile).toBe(0);
    });

    it("returns byCategory with orgComplianceRate 0 for org with no assessments", async () => {
      const globalAssessments = makeGlobalAssessments();
      mockFindMany
        .mockResolvedValueOnce(globalAssessments)
        .mockResolvedValueOnce([]);

      const result = await calculateCRABenchmark("org-unknown");
      expect(result).not.toBeNull();
      for (const cat of result!.byCategory) {
        expect(cat.orgComplianceRate).toBe(0);
      }
    });
  });

  // ── byCategory ────────────────────────────────────────────────────────────

  describe("byCategory", () => {
    it("includes category from requirement metadata", async () => {
      const globalAssessments = [
        makeAssessment("org-1", {
          maturityScore: 60,
          requirements: [{ requirementId: "cra-vuln-01", status: "compliant" }],
        }),
        makeAssessment("org-2", { maturityScore: 70 }),
        makeAssessment("org-3", { maturityScore: 80 }),
        makeAssessment("org-4", { maturityScore: 50 }),
        makeAssessment("org-5", { maturityScore: 40 }),
      ];
      mockFindMany
        .mockResolvedValueOnce(globalAssessments)
        .mockResolvedValueOnce([makeAssessment("org-1")]);

      const result = await calculateCRABenchmark("org-1");
      const catNames = result!.byCategory.map((c) => c.category);
      // vulnerability_handling should appear since org-1 has cra-vuln-01
      expect(catNames).toContain("vulnerability_handling");
    });

    it("byCategory entries have required fields", async () => {
      const globalAssessments = makeGlobalAssessments();
      mockFindMany
        .mockResolvedValueOnce(globalAssessments)
        .mockResolvedValueOnce([makeAssessment("org-1")]);

      const result = await calculateCRABenchmark("org-1");
      for (const cat of result!.byCategory) {
        expect(cat).toHaveProperty("category");
        expect(cat).toHaveProperty("avgComplianceRate");
        expect(cat).toHaveProperty("orgComplianceRate");
      }
    });

    it("byCategory is sorted alphabetically by category", async () => {
      const globalAssessments = makeGlobalAssessments();
      mockFindMany
        .mockResolvedValueOnce(globalAssessments)
        .mockResolvedValueOnce([makeAssessment("org-1")]);

      const result = await calculateCRABenchmark("org-1");
      const cats = result!.byCategory.map((c) => c.category);
      const sorted = [...cats].sort((a, b) => a.localeCompare(b));
      expect(cats).toEqual(sorted);
    });
  });

  // ── Assessments with null maturity score ──────────────────────────────────

  describe("null maturity scores", () => {
    it("ignores null maturity scores when computing org average", async () => {
      const globalAssessments = [
        makeAssessment("org-1", { maturityScore: null }),
        makeAssessment("org-2", { maturityScore: 60 }),
        makeAssessment("org-3", { maturityScore: 70 }),
        makeAssessment("org-4", { maturityScore: 80 }),
        makeAssessment("org-5", { maturityScore: 90 }),
      ];
      mockFindMany
        .mockResolvedValueOnce(globalAssessments)
        .mockResolvedValueOnce([
          makeAssessment("org-1", { maturityScore: null }),
        ]);

      // Should not throw
      const result = await calculateCRABenchmark("org-1");
      expect(result).not.toBeNull();
    });
  });
});
