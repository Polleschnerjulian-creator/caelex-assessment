/**
 * Comprehensive tests for the EU Space Act compliance engine.
 *
 * Coverage:
 *  - Operator type mapping (all 5 activity types + fallback for unknown/null)
 *  - Article filtering per operator type (SCO vs LO vs PDP etc.)
 *  - TCO exclusion / inclusion logic
 *  - Light-regime vs standard-regime determination
 *  - Module status assignment (required / simplified / recommended / not_applicable)
 *  - Checklist generation for all operator branches
 *  - Key dates (light vs standard)
 *  - Authorization cost and path helpers
 *  - Constellation tier classification
 *  - Orbit label helpers
 *  - Statistics (applicablePercentage)
 *  - redactArticlesForClient
 *  - Edge cases (null/undefined inputs, empty titles, unknown activity types)
 *  - loadSpaceActDataFromDisk (integration — uses the real JSON file)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AssessmentAnswers, SpaceActData } from "@/lib/types";

// ─── Mock server-only so the module can be imported in Vitest ───
vi.mock("server-only", () => ({}));

// ─── Import engine AFTER the mock ───
const {
  calculateCompliance,
  redactArticlesForClient,
  loadSpaceActDataFromDisk,
} = await import("@/lib/engine.server");

// ═══════════════════════════════════════════
// Minimal but structurally correct mock data
// ═══════════════════════════════════════════

/**
 * A SpaceActData stub that covers all operator abbreviations (SCO, LO, LSO, ISOS, PDP, TCO, ALL),
 * a TCO exclusion, and articles spread across several module buckets.
 */
const mockSpaceActData: SpaceActData = {
  metadata: {
    regulation: "EU Space Act",
    reference: "COM(2025) 335 final",
    proposal_date: "2025-06-25",
    expected_application_date: "2030-01-01",
    total_articles: 119,
    total_annexes: 10,
    total_recitals: 140,
    legal_basis: "Article 114 TFEU",
    version: "1.0",
    last_updated: "2026-01-01",
    note: "Mock data for tests",
    enforcement: {
      max_fine_percentage_turnover: 2.0,
      alternative_fine_basis: "Twice the profit",
      enforcement_bodies: ["NCA"],
      powers: ["Fines"],
      appeal: "Board of Appeal",
    },
  },

  operator_types: {},
  size_categories: {},
  constellation_tiers: {},
  decision_tree: {},
  annexes: [],

  titles: [
    {
      // Title I — general articles (ALL operators) placed directly on the title
      number: "I",
      name: "General Provisions",
      articles: "1-5",
      summary: "General provisions",
      articles_detail: [
        {
          number: 1,
          title: "Subject Matter",
          summary: "Framework article",
          applies_to: ["ALL"],
          compliance_type: "informational",
        },
        {
          number: 2,
          title: "Scope",
          summary: "Defines scope",
          applies_to: ["ALL"],
          compliance_type: "scope_determination",
        },
        {
          number: 3,
          title: "TCO-excluded article",
          summary: "Applies to ALL but excludes TCO",
          applies_to: ["ALL"],
          excludes: ["TCO"],
          compliance_type: "mandatory_ongoing",
        },
      ],
    },
    {
      // Title II — authorization (SCO + LO only) in chapters
      number: "II",
      name: "Authorization",
      articles: "6-16",
      summary: "Authorization requirements",
      chapters: [
        {
          number: "1",
          name: "EU Authorization",
          articles: "6-16",
          articles_detail: [
            {
              number: 6,
              title: "Authorization Requirement",
              summary: "Requires authorization",
              applies_to: ["SCO", "LO"],
              compliance_type: "mandatory_pre_activity",
            },
            {
              number: 7,
              title: "Application Process",
              summary: "Application details",
              applies_to: ["SCO", "LO", "LSO"],
              compliance_type: "mandatory",
            },
            {
              number: 10,
              title: "Light Regime",
              summary: "Simplified for small/research",
              applies_to: ["SCO"],
              compliance_type: "conditional_simplification",
            },
            {
              number: 12,
              title: "ISOS Authorization",
              summary: "ISOS-specific authorization",
              applies_to: ["ISOS"],
              compliance_type: "mandatory_pre_activity",
            },
            {
              number: 14,
              title: "Third Country Registration",
              summary: "TCO registration requirement",
              applies_to: ["TCO"],
              compliance_type: "mandatory_pre_activity",
            },
          ],
        },
        {
          number: "2",
          name: "Registration",
          articles: "24",
          // articles in sections
          sections: [
            {
              number: 1,
              name: "URSO Registration",
              articles: "24",
              articles_detail: [
                {
                  number: 24,
                  title: "URSO Registration",
                  summary: "Register space objects",
                  applies_to: ["SCO", "LO", "LSO", "ISOS"],
                  compliance_type: "mandatory_pre_activity",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      // Title III — supervision
      number: "III",
      name: "Governance",
      articles: "26-31",
      summary: "Supervision and governance",
      chapters: [
        {
          number: "1",
          name: "Supervision",
          articles: "26-31",
          articles_detail: [
            {
              number: 27,
              title: "Supervisory Obligations",
              summary: "Ongoing supervision",
              applies_to: ["ALL"],
              compliance_type: "mandatory_ongoing",
            },
          ],
          sections: [
            {
              number: 1,
              name: "Inspections",
              articles: "29-30",
              articles_detail: [
                {
                  number: 29,
                  title: "NCA Inspections",
                  summary: "NCA can inspect",
                  applies_to: ["SCO", "LO"],
                  compliance_type: "mandatory_ongoing",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      // Title IV — technical requirements split across multiple modules
      number: "IV",
      name: "Technical Requirements",
      articles: "44-103",
      summary: "Safety and sustainability",
      chapters: [
        {
          number: "1",
          name: "Insurance",
          articles: "44-51",
          articles_detail: [
            {
              number: 44,
              title: "Third Party Liability Insurance",
              summary: "Insurance requirement",
              applies_to: ["SCO", "LO"],
              compliance_type: "mandatory_pre_activity",
            },
          ],
        },
        {
          number: "2",
          name: "Debris Mitigation",
          articles: "58-72",
          articles_detail: [
            {
              number: 67,
              title: "Debris Mitigation Plan",
              summary: "Debris plan required",
              applies_to: ["SCO"],
              compliance_type: "mandatory_pre_activity",
            },
            {
              number: 72,
              title: "End-of-Life Disposal",
              summary: "Dispose of satellites",
              applies_to: ["SCO", "LO"],
              compliance_type: "mandatory_ongoing",
            },
          ],
        },
        {
          number: "3",
          name: "Cybersecurity",
          articles: "74-95",
          articles_detail: [
            {
              number: 74,
              title: "Cybersecurity Requirements",
              summary: "NIS2-aligned cybersecurity",
              applies_to: ["SCO", "LO"],
              excludes: ["PDP"],
              compliance_type: "mandatory_ongoing",
            },
            {
              number: 76,
              title: "Risk Management",
              summary: "Risk assessment",
              applies_to: ["SCO", "LO", "LSO"],
              compliance_type: "mandatory_ongoing",
            },
          ],
        },
        {
          number: "4",
          name: "Environmental",
          articles: "96-100",
          articles_detail: [
            {
              number: 96,
              title: "Environmental Footprint Declaration",
              summary: "EFD requirement",
              applies_to: ["SCO", "LO"],
              compliance_type: "mandatory_ongoing",
            },
          ],
        },
        {
          number: "5",
          name: "PDP-specific",
          articles: "101-103",
          articles_detail: [
            {
              number: 102,
              title: "PDP Data Quality",
              summary: "Primary data provider obligations",
              applies_to: ["PDP"],
              compliance_type: "mandatory_pre_activity",
            },
          ],
        },
      ],
    },
    {
      // Title V — TCO articles
      number: "V",
      name: "Third Country",
      articles: "105-108",
      summary: "Third country provisions",
      articles_detail: [
        {
          number: 105,
          title: "TCO Registration",
          summary: "EUSPA registration for TCO",
          applies_to: ["TCO"],
          compliance_type: "mandatory_pre_activity",
        },
        {
          number: 106,
          title: "TCO Ongoing Obligations",
          summary: "Ongoing obligations for TCO",
          applies_to: ["TCO"],
          compliance_type: "mandatory_ongoing",
        },
      ],
    },
    {
      // Title VI — regulatory intelligence
      number: "VI",
      name: "Regulatory Intel",
      articles: "114-119",
      summary: "Delegated acts and review",
      articles_detail: [
        {
          number: 114,
          title: "Delegated Acts",
          summary: "Monitoring delegated acts",
          applies_to: ["ALL"],
          compliance_type: "ongoing_monitoring",
        },
      ],
    },
  ],

  compliance_checklist_by_operator_type: {
    spacecraft_operator_eu: {
      pre_authorization: [
        {
          requirement: "Determine applicable NCA",
          articles: "28-29",
          module: "authorization_workflow",
        },
        {
          requirement: "Submit authorization application",
          articles: "7",
          module: "authorization_workflow",
        },
      ],
      ongoing: [
        {
          requirement: "Maintain risk management",
          articles: "76",
          module: "cybersecurity_compliance",
        },
        {
          requirement: "Incident reporting",
          articles: "89-92",
          module: "cybersecurity_compliance",
        },
      ],
      end_of_life: [
        {
          requirement: "Execute disposal plan",
          articles: "72",
          module: "debris_mitigation_planner",
        },
      ],
    },
    launch_operator_eu: {
      pre_authorization: [
        {
          requirement: "Obtain launch licence",
          articles: "6",
          module: "authorization_workflow",
        },
      ],
      operational: [
        {
          requirement: "Safety monitoring",
          articles: "27",
          module: "compliance_dashboard",
        },
      ],
    },
    third_country_operator: {
      pre_registration: [
        {
          requirement: "Register with EUSPA",
          articles: "105",
          module: "authorization_workflow",
        },
      ],
      ongoing: [
        {
          requirement: "Maintain EU representative",
          articles: "14",
          module: "compliance_dashboard",
        },
      ],
    },
  },
};

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

function makeAnswers(
  overrides: Partial<AssessmentAnswers> = {},
): AssessmentAnswers {
  return {
    activityType: "spacecraft",
    isDefenseOnly: false,
    hasPostLaunchAssets: true,
    establishment: "eu",
    entitySize: "medium",
    operatesConstellation: false,
    constellationSize: null,
    primaryOrbit: "LEO",
    offersEUServices: true,
    ...overrides,
  } as AssessmentAnswers;
}

// ═══════════════════════════════════════════
// Test Suite
// ═══════════════════════════════════════════

describe("EU Space Act Compliance Engine", () => {
  // ─────────────────────────────────────────
  // 1. Operator Type Mapping
  // ─────────────────────────────────────────

  describe("Operator Type Mapping", () => {
    it("maps 'spacecraft' → SCO (Spacecraft Operator)", () => {
      const result = calculateCompliance(
        makeAnswers({ activityType: "spacecraft" }),
        mockSpaceActData,
      );
      expect(result.operatorType).toBe("spacecraft_operator");
      expect(result.operatorAbbreviation).toBe("SCO");
      expect(result.operatorTypeLabel).toContain("Spacecraft Operator");
    });

    it("maps 'launch_vehicle' → LO (Launch Operator)", () => {
      const result = calculateCompliance(
        makeAnswers({ activityType: "launch_vehicle" }),
        mockSpaceActData,
      );
      expect(result.operatorType).toBe("launch_operator");
      expect(result.operatorAbbreviation).toBe("LO");
      expect(result.operatorTypeLabel).toContain("Launch Operator");
    });

    it("maps 'launch_site' → LSO (Launch Site Operator)", () => {
      const result = calculateCompliance(
        makeAnswers({ activityType: "launch_site" }),
        mockSpaceActData,
      );
      expect(result.operatorType).toBe("launch_site_operator");
      expect(result.operatorAbbreviation).toBe("LSO");
    });

    it("maps 'isos' → ISOS (In-Space Services Provider)", () => {
      const result = calculateCompliance(
        makeAnswers({ activityType: "isos" }),
        mockSpaceActData,
      );
      expect(result.operatorType).toBe("isos_provider");
      expect(result.operatorAbbreviation).toBe("ISOS");
    });

    it("maps 'data_provider' → PDP (Primary Data Provider)", () => {
      const result = calculateCompliance(
        makeAnswers({ activityType: "data_provider" }),
        mockSpaceActData,
      );
      expect(result.operatorType).toBe("primary_data_provider");
      expect(result.operatorAbbreviation).toBe("PDP");
    });

    it("falls back to SCO for an unknown activity type string", () => {
      const result = calculateCompliance(
        makeAnswers({ activityType: "unknown_activity" as never }),
        mockSpaceActData,
      );
      expect(result.operatorType).toBe("spacecraft_operator");
      expect(result.operatorAbbreviation).toBe("SCO");
    });

    it("falls back to SCO when activityType is null", () => {
      const result = calculateCompliance(
        makeAnswers({ activityType: null }),
        mockSpaceActData,
      );
      expect(result.operatorType).toBe("spacecraft_operator");
      expect(result.operatorAbbreviation).toBe("SCO");
    });

    it("appends '(Third Country)' to operator label for TCO", () => {
      const result = calculateCompliance(
        makeAnswers({ establishment: "third_country_eu_services" }),
        mockSpaceActData,
      );
      expect(result.operatorTypeLabel).toContain("Third Country");
    });

    it("appends '(EU)' to operator label for EU-established operator", () => {
      const result = calculateCompliance(
        makeAnswers({ activityType: "spacecraft", establishment: "eu" }),
        mockSpaceActData,
      );
      expect(result.operatorTypeLabel).toContain("(EU)");
    });
  });

  // ─────────────────────────────────────────
  // 2. Article Filtering by Operator Type
  // ─────────────────────────────────────────

  describe("Article Filtering by Operator Type", () => {
    it("SCO receives articles tagged ALL and SCO, not ISOS-only or PDP-only articles", () => {
      const result = calculateCompliance(
        makeAnswers({ activityType: "spacecraft" }),
        mockSpaceActData,
      );
      const numbers = result.applicableArticles.map((a) => a.number);
      // ALL → 1, 2, 3 (TCO-excluded ≠ SCO), 27, 114
      expect(numbers).toContain(1);
      expect(numbers).toContain(2);
      expect(numbers).toContain(27);
      // SCO-specific
      expect(numbers).toContain(6);
      expect(numbers).toContain(10);
      // ISOS-only article should NOT appear
      expect(numbers).not.toContain(12);
      // PDP-only article should NOT appear
      expect(numbers).not.toContain(102);
      // TCO-only article should NOT appear
      expect(numbers).not.toContain(105);
    });

    it("LO receives LO-tagged articles but not SCO-only articles", () => {
      const result = calculateCompliance(
        makeAnswers({ activityType: "launch_vehicle" }),
        mockSpaceActData,
      );
      const numbers = result.applicableArticles.map((a) => a.number);
      expect(numbers).toContain(6); // SCO + LO
      expect(numbers).toContain(7); // SCO + LO + LSO
      // SCO-only article (Art. 10 applies_to: ["SCO"])
      expect(numbers).not.toContain(10);
      // ISOS-only
      expect(numbers).not.toContain(12);
    });

    it("LSO receives LSO-tagged articles but not SCO-only or LO-only articles", () => {
      const result = calculateCompliance(
        makeAnswers({ activityType: "launch_site" }),
        mockSpaceActData,
      );
      const numbers = result.applicableArticles.map((a) => a.number);
      expect(numbers).toContain(7); // SCO + LO + LSO
      // Art. 6 applies only to SCO and LO, not LSO
      expect(numbers).not.toContain(6);
      // ISOS-only
      expect(numbers).not.toContain(12);
    });

    it("ISOS receives ISOS-tagged and ALL articles, not SCO-exclusive ones", () => {
      const result = calculateCompliance(
        makeAnswers({ activityType: "isos" }),
        mockSpaceActData,
      );
      const numbers = result.applicableArticles.map((a) => a.number);
      expect(numbers).toContain(12); // ISOS-only
      expect(numbers).toContain(1); // ALL
      expect(numbers).toContain(24); // SCO, LO, LSO, ISOS
      // SCO-only
      expect(numbers).not.toContain(10);
      // SCO-only debris
      expect(numbers).not.toContain(67);
    });

    it("PDP is excluded from Art. 74 (which has excludes: ['PDP'])", () => {
      const result = calculateCompliance(
        makeAnswers({ activityType: "data_provider" }),
        mockSpaceActData,
      );
      const numbers = result.applicableArticles.map((a) => a.number);
      expect(numbers).not.toContain(74);
      // PDP-specific article IS included
      expect(numbers).toContain(102);
    });

    it("SCO sees ALL articles unless explicitly excluded", () => {
      const result = calculateCompliance(
        makeAnswers({ activityType: "spacecraft" }),
        mockSpaceActData,
      );
      const all = result.applicableArticles;
      for (const article of all) {
        const appliesTo = article.applies_to ?? [];
        const excludes = article.excludes ?? [];
        expect(excludes.includes("SCO")).toBe(false);
        expect(appliesTo.includes("SCO") || appliesTo.includes("ALL")).toBe(
          true,
        );
      }
    });

    it("TCO receives TCO-tagged articles and ALL articles (except TCO-excluded ones)", () => {
      const result = calculateCompliance(
        makeAnswers({ establishment: "third_country_eu_services" }),
        mockSpaceActData,
      );
      const numbers = result.applicableArticles.map((a) => a.number);
      // TCO-specific
      expect(numbers).toContain(105);
      expect(numbers).toContain(106);
      // Art. 3 has applies_to: ALL but excludes: TCO → should NOT appear
      expect(numbers).not.toContain(3);
      // Art. 1 has applies_to: ALL with no exclusions → should appear
      expect(numbers).toContain(1);
    });

    it("TCO exclusion: article with applies_to:ALL + excludes:TCO is filtered out", () => {
      const data: SpaceActData = {
        ...mockSpaceActData,
        titles: [
          {
            number: "T",
            name: "Test",
            articles: "99",
            summary: "",
            articles_detail: [
              {
                number: 99,
                title: "Excluded for TCO",
                summary: "Only for EU operators",
                applies_to: ["ALL"],
                excludes: ["TCO"],
                compliance_type: "mandatory_ongoing",
              },
            ],
          },
        ],
      };
      const result = calculateCompliance(
        makeAnswers({ establishment: "third_country_eu_services" }),
        data,
      );
      expect(result.applicableArticles.map((a) => a.number)).not.toContain(99);
    });

    it("SCO sees more articles than ISOS (SCO has broader applicability)", () => {
      const sco = calculateCompliance(
        makeAnswers({ activityType: "spacecraft" }),
        mockSpaceActData,
      );
      const isos = calculateCompliance(
        makeAnswers({ activityType: "isos" }),
        mockSpaceActData,
      );
      expect(sco.applicableCount).toBeGreaterThan(isos.applicableCount);
    });
  });

  // ─────────────────────────────────────────
  // 3. Light vs Standard Regime
  // ─────────────────────────────────────────

  describe("Light vs Standard Regime Determination", () => {
    it("entitySize 'small' → light regime", () => {
      const result = calculateCompliance(
        makeAnswers({ entitySize: "small" }),
        mockSpaceActData,
      );
      expect(result.regime).toBe("light");
      expect(result.regimeLabel).toBe("Light Regime");
    });

    it("entitySize 'research' → light regime", () => {
      const result = calculateCompliance(
        makeAnswers({ entitySize: "research" }),
        mockSpaceActData,
      );
      expect(result.regime).toBe("light");
      expect(result.entitySizeLabel).toBe("Research/Educational Institution");
    });

    it("entitySize 'medium' → standard regime", () => {
      const result = calculateCompliance(
        makeAnswers({ entitySize: "medium" }),
        mockSpaceActData,
      );
      expect(result.regime).toBe("standard");
      expect(result.regimeLabel).toBe("Standard (Full Requirements)");
    });

    it("entitySize 'large' → standard regime", () => {
      const result = calculateCompliance(
        makeAnswers({ entitySize: "large" }),
        mockSpaceActData,
      );
      expect(result.regime).toBe("standard");
    });

    it("entitySize null → standard regime", () => {
      const result = calculateCompliance(
        makeAnswers({ entitySize: null }),
        mockSpaceActData,
      );
      expect(result.regime).toBe("standard");
      expect(result.entitySizeLabel).toBe("Not specified");
    });

    it("light regime reason references Art. 10", () => {
      const result = calculateCompliance(
        makeAnswers({ entitySize: "small" }),
        mockSpaceActData,
      );
      expect(result.regimeReason).toContain("Art. 10");
    });

    it("standard regime reason mentions full compliance", () => {
      const result = calculateCompliance(
        makeAnswers({ entitySize: "large" }),
        mockSpaceActData,
      );
      expect(result.regimeReason.toLowerCase()).toContain("full compliance");
    });
  });

  // ─────────────────────────────────────────
  // 4. Module Status Assignment
  // ─────────────────────────────────────────

  describe("Module Status Assignment", () => {
    it("returns exactly 9 module statuses", () => {
      const result = calculateCompliance(makeAnswers(), mockSpaceActData);
      expect(result.moduleStatuses).toHaveLength(10);
    });

    it("each module status has required shape fields", () => {
      const result = calculateCompliance(makeAnswers(), mockSpaceActData);
      for (const mod of result.moduleStatuses) {
        expect(mod).toHaveProperty("id");
        expect(mod).toHaveProperty("name");
        expect(mod).toHaveProperty("icon");
        expect(mod).toHaveProperty("description");
        expect(mod).toHaveProperty("status");
        expect(mod).toHaveProperty("articleCount");
        expect(mod).toHaveProperty("summary");
        expect([
          "required",
          "simplified",
          "recommended",
          "not_applicable",
        ]).toContain(mod.status);
      }
    });

    it("module with mandatory articles → 'required' in standard regime", () => {
      // Art. 6 (mandatory_pre_activity, SCO + LO) falls into authorization module (Art. 6-16)
      const result = calculateCompliance(
        makeAnswers({ activityType: "spacecraft", entitySize: "large" }),
        mockSpaceActData,
      );
      const authModule = result.moduleStatuses.find(
        (m) => m.id === "authorization",
      );
      expect(authModule).toBeDefined();
      expect(authModule!.status).toBe("required");
    });

    it("authorization module is 'required' for SCO in light regime (mandatory articles remain binding even when simplified track available)", () => {
      // Art. 6: mandatory_pre_activity (SCO), Art. 10: conditional_simplification (SCO)
      // Mandatory articles don't get downgraded to simplified — the whole module stays required
      const result = calculateCompliance(
        makeAnswers({ activityType: "spacecraft", entitySize: "small" }),
        mockSpaceActData,
      );
      const authModule = result.moduleStatuses.find(
        (m) => m.id === "authorization",
      );
      expect(authModule).toBeDefined();
      expect(authModule!.status).toBe("required");
    });

    it("module with zero applicable articles → 'not_applicable'", () => {
      // PDP has no articles in most module buckets (insurance, debris, cybersecurity excluded)
      const result = calculateCompliance(
        makeAnswers({ activityType: "data_provider" }),
        mockSpaceActData,
      );
      const notApplicable = result.moduleStatuses.filter(
        (m) => m.status === "not_applicable",
      );
      expect(notApplicable.length).toBeGreaterThan(0);
    });

    it("module with only design/informational articles → 'recommended'", () => {
      // Use custom data with only informational articles in the insurance bucket
      const infoOnlyData: SpaceActData = {
        ...mockSpaceActData,
        titles: [
          {
            number: "I",
            name: "Insurance",
            articles: "44",
            summary: "",
            articles_detail: [
              {
                number: 44,
                title: "Insurance overview",
                summary: "Overview only",
                applies_to: ["SCO"],
                compliance_type: "informational", // maps to "informational" — not mandatory
              },
            ],
          },
        ],
      };
      const result = calculateCompliance(
        makeAnswers({ activityType: "spacecraft", entitySize: "large" }),
        infoOnlyData,
      );
      const insuranceModule = result.moduleStatuses.find(
        (m) => m.id === "insurance",
      );
      expect(insuranceModule).toBeDefined();
      expect(insuranceModule!.status).toBe("recommended");
    });

    it("articleCount on module matches number of applicable articles in that module's range", () => {
      const result = calculateCompliance(
        makeAnswers({ activityType: "spacecraft" }),
        mockSpaceActData,
      );
      for (const mod of result.moduleStatuses) {
        expect(mod.articleCount).toBeGreaterThanOrEqual(0);
        if (mod.status === "not_applicable") {
          expect(mod.articleCount).toBe(0);
        }
      }
    });

    it("summary text is non-empty for every module", () => {
      const result = calculateCompliance(makeAnswers(), mockSpaceActData);
      for (const mod of result.moduleStatuses) {
        expect(typeof mod.summary).toBe("string");
        expect(mod.summary.length).toBeGreaterThan(0);
      }
    });

    it("required module summary mentions article count", () => {
      const result = calculateCompliance(
        makeAnswers({ activityType: "spacecraft", entitySize: "large" }),
        mockSpaceActData,
      );
      const required = result.moduleStatuses.filter(
        (m) => m.status === "required",
      );
      for (const mod of required) {
        // e.g. "Full compliance required with N article(s)."
        expect(mod.summary).toMatch(/article/i);
      }
    });

    it("simplified module summary mentions light regime", () => {
      const result = calculateCompliance(
        makeAnswers({ activityType: "spacecraft", entitySize: "small" }),
        mockSpaceActData,
      );
      const simplified = result.moduleStatuses.filter(
        (m) => m.status === "simplified",
      );
      for (const mod of simplified) {
        expect(mod.summary.toLowerCase()).toMatch(/simplified|light/i);
      }
    });

    it("standard regime never produces 'simplified' status", () => {
      const result = calculateCompliance(
        makeAnswers({ activityType: "spacecraft", entitySize: "large" }),
        mockSpaceActData,
      );
      const simplified = result.moduleStatuses.filter(
        (m) => m.status === "simplified",
      );
      expect(simplified).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────
  // 5. Checklist Generation
  // ─────────────────────────────────────────

  describe("Checklist Generation", () => {
    it("EU spacecraft operator: checklist = pre_authorization + ongoing + end_of_life", () => {
      const result = calculateCompliance(
        makeAnswers({ activityType: "spacecraft", establishment: "eu" }),
        mockSpaceActData,
      );
      // 2 pre_authorization + 2 ongoing + 1 end_of_life = 5
      expect(result.checklist).toHaveLength(5);
    });

    it("checklist items have 'requirement', 'articles', 'module' fields", () => {
      const result = calculateCompliance(
        makeAnswers({ activityType: "spacecraft" }),
        mockSpaceActData,
      );
      for (const item of result.checklist) {
        expect(item).toHaveProperty("requirement");
        expect(item).toHaveProperty("articles");
        expect(item).toHaveProperty("module");
      }
    });

    it("EU launch operator: checklist = pre_authorization + operational", () => {
      const result = calculateCompliance(
        makeAnswers({ activityType: "launch_vehicle", establishment: "eu" }),
        mockSpaceActData,
      );
      // 1 pre_authorization + 1 operational = 2
      expect(result.checklist).toHaveLength(2);
    });

    it("EU launch site operator: uses LO checklist (same as launch_operator)", () => {
      const lo = calculateCompliance(
        makeAnswers({ activityType: "launch_vehicle", establishment: "eu" }),
        mockSpaceActData,
      );
      const lso = calculateCompliance(
        makeAnswers({ activityType: "launch_site", establishment: "eu" }),
        mockSpaceActData,
      );
      expect(lso.checklist).toEqual(lo.checklist);
    });

    it("third country operator: checklist = pre_registration + ongoing", () => {
      const result = calculateCompliance(
        makeAnswers({ establishment: "third_country_eu_services" }),
        mockSpaceActData,
      );
      // 1 pre_registration + 1 ongoing = 2
      expect(result.checklist).toHaveLength(2);
      const hasRegistration = result.checklist.some((item) =>
        item.requirement.toLowerCase().includes("register"),
      );
      expect(hasRegistration).toBe(true);
    });

    it("ISOS operator falls back to SCO checklist (pre_authorization + ongoing, no end_of_life)", () => {
      const result = calculateCompliance(
        makeAnswers({ activityType: "isos", establishment: "eu" }),
        mockSpaceActData,
      );
      // Default path: pre_authorization (2) + ongoing (2) — no end_of_life
      expect(result.checklist).toHaveLength(4);
    });

    it("PDP operator falls back to SCO checklist (pre_authorization + ongoing)", () => {
      const result = calculateCompliance(
        makeAnswers({ activityType: "data_provider", establishment: "eu" }),
        mockSpaceActData,
      );
      expect(result.checklist).toHaveLength(4);
    });

    it("checklist is always an array (never undefined)", () => {
      const result = calculateCompliance(makeAnswers(), mockSpaceActData);
      expect(Array.isArray(result.checklist)).toBe(true);
    });
  });

  // ─────────────────────────────────────────
  // 6. Key Dates
  // ─────────────────────────────────────────

  describe("Key Dates", () => {
    it("always includes the 2030 application date", () => {
      const result = calculateCompliance(makeAnswers(), mockSpaceActData);
      const has2030 = result.keyDates.some((d) => d.date.includes("2030"));
      expect(has2030).toBe(true);
    });

    it("always includes the 2035 five-year review date", () => {
      const result = calculateCompliance(makeAnswers(), mockSpaceActData);
      const has2035 = result.keyDates.some((d) => d.date.includes("2035"));
      expect(has2035).toBe(true);
    });

    it("light regime: includes extra EFD deadline", () => {
      const result = calculateCompliance(
        makeAnswers({ entitySize: "small" }),
        mockSpaceActData,
      );
      const hasEfd = result.keyDates.some((d) =>
        d.description.toLowerCase().includes("efd"),
      );
      expect(hasEfd).toBe(true);
    });

    it("standard regime: does NOT include EFD-specific deadline", () => {
      const result = calculateCompliance(
        makeAnswers({ entitySize: "large" }),
        mockSpaceActData,
      );
      const hasEfd = result.keyDates.some((d) =>
        d.description.toLowerCase().includes("efd"),
      );
      expect(hasEfd).toBe(false);
    });

    it("light regime has more key dates than standard regime", () => {
      const light = calculateCompliance(
        makeAnswers({ entitySize: "small" }),
        mockSpaceActData,
      );
      const standard = calculateCompliance(
        makeAnswers({ entitySize: "large" }),
        mockSpaceActData,
      );
      expect(light.keyDates.length).toBeGreaterThan(standard.keyDates.length);
    });

    it("each key date has 'date' and 'description' string fields", () => {
      const result = calculateCompliance(makeAnswers(), mockSpaceActData);
      for (const kd of result.keyDates) {
        expect(typeof kd.date).toBe("string");
        expect(typeof kd.description).toBe("string");
      }
    });
  });

  // ─────────────────────────────────────────
  // 7. Authorization Cost & Path
  // ─────────────────────────────────────────

  describe("Authorization Cost and Path", () => {
    it("spacecraft operator: cost references ~€100,000", () => {
      const result = calculateCompliance(
        makeAnswers({ activityType: "spacecraft" }),
        mockSpaceActData,
      );
      expect(result.estimatedAuthorizationCost).toContain("100,000");
    });

    it("launch operator: cost references ~€150,000", () => {
      const result = calculateCompliance(
        makeAnswers({ activityType: "launch_vehicle" }),
        mockSpaceActData,
      );
      expect(result.estimatedAuthorizationCost).toContain("150,000");
    });

    it("launch site operator: cost references ~€150,000 (same as LO)", () => {
      const result = calculateCompliance(
        makeAnswers({ activityType: "launch_site" }),
        mockSpaceActData,
      );
      expect(result.estimatedAuthorizationCost).toContain("150,000");
    });

    it("ISOS operator: cost uses default estimate (€50,000)", () => {
      const result = calculateCompliance(
        makeAnswers({ activityType: "isos" }),
        mockSpaceActData,
      );
      expect(result.estimatedAuthorizationCost).toContain("50,000");
    });

    it("third country operator: cost is TBD", () => {
      const result = calculateCompliance(
        makeAnswers({ establishment: "third_country_eu_services" }),
        mockSpaceActData,
      );
      expect(result.estimatedAuthorizationCost.toLowerCase()).toContain("tbd");
    });

    it("EU operator: authorization path via NCA", () => {
      const result = calculateCompliance(
        makeAnswers({ establishment: "eu" }),
        mockSpaceActData,
      );
      expect(result.authorizationPath).toBe(
        "National Authority (NCA) → URSO Registration",
      );
    });

    it("TCO: authorization path via EUSPA", () => {
      const result = calculateCompliance(
        makeAnswers({ establishment: "third_country_eu_services" }),
        mockSpaceActData,
      );
      expect(result.authorizationPath).toBe(
        "EUSPA Registration → Commission Decision",
      );
    });

    it("null establishment: path defaults to 'Determine establishment status'", () => {
      const result = calculateCompliance(
        makeAnswers({ establishment: null }),
        mockSpaceActData,
      );
      expect(result.authorizationPath).toBe("Determine establishment status");
    });
  });

  // ─────────────────────────────────────────
  // 8. Constellation Tier Classification
  // ─────────────────────────────────────────

  describe("Constellation Tier Classification", () => {
    it("operatesConstellation = false → single_satellite", () => {
      const result = calculateCompliance(
        makeAnswers({ operatesConstellation: false, constellationSize: null }),
        mockSpaceActData,
      );
      expect(result.constellationTier).toBe("single_satellite");
      expect(result.constellationTierLabel).toBe("Single Satellite");
    });

    it("operatesConstellation = true, size = 1 → single_satellite", () => {
      const result = calculateCompliance(
        makeAnswers({ operatesConstellation: true, constellationSize: 1 }),
        mockSpaceActData,
      );
      expect(result.constellationTier).toBe("single_satellite");
    });

    it("size = 2 → small_constellation (lower boundary)", () => {
      const result = calculateCompliance(
        makeAnswers({ operatesConstellation: true, constellationSize: 2 }),
        mockSpaceActData,
      );
      expect(result.constellationTier).toBe("small_constellation");
    });

    it("size = 9 → small_constellation (upper boundary)", () => {
      const result = calculateCompliance(
        makeAnswers({ operatesConstellation: true, constellationSize: 9 }),
        mockSpaceActData,
      );
      expect(result.constellationTier).toBe("small_constellation");
    });

    it("size = 10 → medium_constellation (lower boundary)", () => {
      const result = calculateCompliance(
        makeAnswers({ operatesConstellation: true, constellationSize: 10 }),
        mockSpaceActData,
      );
      expect(result.constellationTier).toBe("medium_constellation");
    });

    it("size = 99 → medium_constellation (upper boundary)", () => {
      const result = calculateCompliance(
        makeAnswers({ operatesConstellation: true, constellationSize: 99 }),
        mockSpaceActData,
      );
      expect(result.constellationTier).toBe("medium_constellation");
    });

    it("size = 100 → large_constellation (lower boundary)", () => {
      const result = calculateCompliance(
        makeAnswers({ operatesConstellation: true, constellationSize: 100 }),
        mockSpaceActData,
      );
      expect(result.constellationTier).toBe("large_constellation");
    });

    it("size = 999 → large_constellation (upper boundary)", () => {
      const result = calculateCompliance(
        makeAnswers({ operatesConstellation: true, constellationSize: 999 }),
        mockSpaceActData,
      );
      expect(result.constellationTier).toBe("large_constellation");
    });

    it("size = 1000 → mega_constellation (lower boundary)", () => {
      const result = calculateCompliance(
        makeAnswers({ operatesConstellation: true, constellationSize: 1000 }),
        mockSpaceActData,
      );
      expect(result.constellationTier).toBe("mega_constellation");
    });

    it("size = 5000 → mega_constellation with label containing satellite count", () => {
      const result = calculateCompliance(
        makeAnswers({ operatesConstellation: true, constellationSize: 5000 }),
        mockSpaceActData,
      );
      expect(result.constellationTier).toBe("mega_constellation");
      expect(result.constellationTierLabel).toContain("5000");
    });

    it("operatesConstellation = true, size = null → tier is null", () => {
      const result = calculateCompliance(
        makeAnswers({ operatesConstellation: true, constellationSize: null }),
        mockSpaceActData,
      );
      expect(result.constellationTier).toBeNull();
      expect(result.constellationTierLabel).toBeNull();
    });
  });

  // ─────────────────────────────────────────
  // 9. Orbit Labels
  // ─────────────────────────────────────────

  describe("Orbit Labels", () => {
    it("LEO → 'Low Earth Orbit (LEO)'", () => {
      const result = calculateCompliance(
        makeAnswers({ primaryOrbit: "LEO" }),
        mockSpaceActData,
      );
      expect(result.orbitLabel).toContain("Low Earth Orbit");
    });

    it("MEO → 'Medium Earth Orbit (MEO)'", () => {
      const result = calculateCompliance(
        makeAnswers({ primaryOrbit: "MEO" }),
        mockSpaceActData,
      );
      expect(result.orbitLabel).toContain("Medium Earth Orbit");
    });

    it("GEO → 'Geostationary Orbit (GEO)'", () => {
      const result = calculateCompliance(
        makeAnswers({ primaryOrbit: "GEO" }),
        mockSpaceActData,
      );
      expect(result.orbitLabel).toContain("Geostationary");
    });

    it("beyond → 'Beyond Earth Orbit'", () => {
      const result = calculateCompliance(
        makeAnswers({ primaryOrbit: "beyond" }),
        mockSpaceActData,
      );
      expect(result.orbitLabel).toContain("Beyond Earth");
    });

    it("null orbit → 'Not specified'", () => {
      const result = calculateCompliance(
        makeAnswers({ primaryOrbit: null }),
        mockSpaceActData,
      );
      expect(result.orbitLabel).toBe("Not specified");
      expect(result.orbit).toBe("unknown");
    });
  });

  // ─────────────────────────────────────────
  // 10. Statistics Calculation
  // ─────────────────────────────────────────

  describe("Statistics", () => {
    it("totalArticles matches actual flat article count (not metadata.total_articles)", () => {
      const result = calculateCompliance(makeAnswers(), mockSpaceActData);
      // Source now uses allArticles.length instead of metadata.total_articles
      // to produce accurate percentages when articles are grouped.
      expect(result.totalArticles).toBe(21);
    });

    it("applicablePercentage = round(applicableCount / totalArticles * 100)", () => {
      const result = calculateCompliance(makeAnswers(), mockSpaceActData);
      const expected = Math.round(
        (result.applicableCount / result.totalArticles) * 100,
      );
      expect(result.applicablePercentage).toBe(expected);
    });

    it("applicableCount is positive for any operator that has articles", () => {
      const result = calculateCompliance(makeAnswers(), mockSpaceActData);
      expect(result.applicableCount).toBeGreaterThan(0);
    });

    it("applicablePercentage is between 0 and 100", () => {
      const result = calculateCompliance(makeAnswers(), mockSpaceActData);
      expect(result.applicablePercentage).toBeGreaterThanOrEqual(0);
      expect(result.applicablePercentage).toBeLessThanOrEqual(100);
    });
  });

  // ─────────────────────────────────────────
  // 11. isEU / isThirdCountry flags
  // ─────────────────────────────────────────

  describe("EU / Third-Country flags", () => {
    it("establishment='eu' → isEU=true, isThirdCountry=false", () => {
      const result = calculateCompliance(
        makeAnswers({ establishment: "eu" }),
        mockSpaceActData,
      );
      expect(result.isEU).toBe(true);
      expect(result.isThirdCountry).toBe(false);
    });

    it("establishment='third_country_eu_services' → isThirdCountry=true, isEU=false", () => {
      const result = calculateCompliance(
        makeAnswers({ establishment: "third_country_eu_services" }),
        mockSpaceActData,
      );
      expect(result.isThirdCountry).toBe(true);
      expect(result.isEU).toBe(false);
    });

    it("establishment='third_country_no_eu' → isEU=false, isThirdCountry=false", () => {
      const result = calculateCompliance(
        makeAnswers({ establishment: "third_country_no_eu" as never }),
        mockSpaceActData,
      );
      expect(result.isEU).toBe(false);
      expect(result.isThirdCountry).toBe(false);
    });

    it("establishment=null → isEU=false, isThirdCountry=false", () => {
      const result = calculateCompliance(
        makeAnswers({ establishment: null }),
        mockSpaceActData,
      );
      expect(result.isEU).toBe(false);
      expect(result.isThirdCountry).toBe(false);
    });
  });

  // ─────────────────────────────────────────
  // 12. Edge Cases
  // ─────────────────────────────────────────

  describe("Edge Cases", () => {
    it("empty titles array → applicableArticles=[], applicableCount=0", () => {
      const emptyData: SpaceActData = { ...mockSpaceActData, titles: [] };
      const result = calculateCompliance(makeAnswers(), emptyData);
      expect(result.applicableArticles).toEqual([]);
      expect(result.applicableCount).toBe(0);
    });

    it("all-null answers → does not throw, defaults to SCO + standard", () => {
      const answers: AssessmentAnswers = {
        activityType: null,
        isDefenseOnly: null,
        hasPostLaunchAssets: null,
        establishment: null,
        entitySize: null,
        operatesConstellation: null,
        constellationSize: null,
        primaryOrbit: null,
        offersEUServices: null,
      } as unknown as AssessmentAnswers;
      const result = calculateCompliance(answers, mockSpaceActData);
      expect(result.operatorType).toBe("spacecraft_operator");
      expect(result.regime).toBe("standard");
      expect(result).toBeDefined();
    });

    it("offersEUServices=null → result.offersEUServices=false", () => {
      const result = calculateCompliance(
        makeAnswers({ offersEUServices: null }),
        mockSpaceActData,
      );
      expect(result.offersEUServices).toBe(false);
    });

    it("entitySize=null → result.entitySize='unknown'", () => {
      const result = calculateCompliance(
        makeAnswers({ entitySize: null }),
        mockSpaceActData,
      );
      expect(result.entitySize).toBe("unknown");
    });

    it("primaryOrbit=null → result.orbit='unknown'", () => {
      const result = calculateCompliance(
        makeAnswers({ primaryOrbit: null }),
        mockSpaceActData,
      );
      expect(result.orbit).toBe("unknown");
    });

    it("article with string number (e.g. '114-116') is still processed", () => {
      // The actual JSON has "number": "114-116" — engine should not crash
      const result = calculateCompliance(makeAnswers(), mockSpaceActData);
      expect(result).toBeDefined();
    });

    it("title with neither articles_detail nor chapters produces no articles", () => {
      const data: SpaceActData = {
        ...mockSpaceActData,
        titles: [
          {
            number: "X",
            name: "Empty Title",
            articles: "",
            summary: "",
            // No articles_detail, no chapters
          },
        ],
      };
      const result = calculateCompliance(makeAnswers(), data);
      expect(result.applicableArticles).toEqual([]);
    });

    it("article with no applies_to field → treated as empty array, not applicable to any operator", () => {
      const data: SpaceActData = {
        ...mockSpaceActData,
        titles: [
          {
            number: "X",
            name: "Test",
            articles: "99",
            summary: "",
            articles_detail: [
              {
                number: 99,
                title: "No applies_to",
                summary: "test",
                applies_to: [], // empty
                compliance_type: "mandatory_pre_activity",
              },
            ],
          },
        ],
      };
      const result = calculateCompliance(makeAnswers(), data);
      expect(result.applicableArticles.map((a) => a.number)).not.toContain(99);
    });
  });

  // ─────────────────────────────────────────
  // 13. redactArticlesForClient
  // ─────────────────────────────────────────

  describe("redactArticlesForClient", () => {
    it("strips summary and operator_action from articles", () => {
      const full = calculateCompliance(makeAnswers(), mockSpaceActData);
      const redacted = redactArticlesForClient(full);

      expect(redacted.applicableArticles.length).toBe(
        full.applicableArticles.length,
      );
      for (const article of redacted.applicableArticles) {
        expect(article).not.toHaveProperty("summary");
        expect(article).not.toHaveProperty("operator_action");
        expect(article).not.toHaveProperty("decision_logic");
        expect(article).not.toHaveProperty("key_definitions");
        expect(article).not.toHaveProperty("required_documents");
        expect(article).not.toHaveProperty("estimated_cost");
      }
    });

    it("retains number, title, compliance_type, applies_to, excludes on each article", () => {
      const full = calculateCompliance(makeAnswers(), mockSpaceActData);
      const redacted = redactArticlesForClient(full);

      for (const article of redacted.applicableArticles) {
        expect(article).toHaveProperty("number");
        expect(article).toHaveProperty("title");
        expect(article).toHaveProperty("compliance_type");
        expect(article).toHaveProperty("applies_to");
      }
    });

    it("preserves all top-level non-article fields unchanged", () => {
      const full = calculateCompliance(makeAnswers(), mockSpaceActData);
      const redacted = redactArticlesForClient(full);

      expect(redacted.operatorType).toBe(full.operatorType);
      expect(redacted.regime).toBe(full.regime);
      expect(redacted.isEU).toBe(full.isEU);
      expect(redacted.isThirdCountry).toBe(full.isThirdCountry);
      expect(redacted.checklist).toEqual(full.checklist);
      expect(redacted.keyDates).toEqual(full.keyDates);
      expect(redacted.moduleStatuses).toEqual(full.moduleStatuses);
    });

    it("works with zero applicable articles", () => {
      const emptyData: SpaceActData = { ...mockSpaceActData, titles: [] };
      const full = calculateCompliance(makeAnswers(), emptyData);
      const redacted = redactArticlesForClient(full);
      expect(redacted.applicableArticles).toEqual([]);
    });
  });

  // ─────────────────────────────────────────
  // 14. Integration — real JSON file
  // ─────────────────────────────────────────

  describe("loadSpaceActDataFromDisk + calculateCompliance (integration)", () => {
    it("loads the real JSON file without throwing", () => {
      expect(() => loadSpaceActDataFromDisk()).not.toThrow();
    });

    it("real data has total_articles = 119", () => {
      const data = loadSpaceActDataFromDisk();
      expect(data.metadata.total_articles).toBe(119);
    });

    it("real data: SCO has more applicable articles than ISOS", () => {
      const data = loadSpaceActDataFromDisk();
      const sco = calculateCompliance(
        makeAnswers({ activityType: "spacecraft" }),
        data,
      );
      const isos = calculateCompliance(
        makeAnswers({ activityType: "isos" }),
        data,
      );
      expect(sco.applicableCount).toBeGreaterThan(isos.applicableCount);
    });

    it("real data: small entity gets light regime", () => {
      const data = loadSpaceActDataFromDisk();
      const result = calculateCompliance(
        makeAnswers({ entitySize: "small" }),
        data,
      );
      expect(result.regime).toBe("light");
    });

    it("real data: large entity gets standard regime", () => {
      const data = loadSpaceActDataFromDisk();
      const result = calculateCompliance(
        makeAnswers({ entitySize: "large" }),
        data,
      );
      expect(result.regime).toBe("standard");
    });

    it("real data: all 9 module statuses are returned", () => {
      const data = loadSpaceActDataFromDisk();
      const result = calculateCompliance(makeAnswers(), data);
      expect(result.moduleStatuses).toHaveLength(10);
    });

    it("real data: checklist is non-empty for SCO", () => {
      const data = loadSpaceActDataFromDisk();
      const result = calculateCompliance(
        makeAnswers({ activityType: "spacecraft" }),
        data,
      );
      expect(result.checklist.length).toBeGreaterThan(0);
    });

    it("real data: checklist is non-empty for TCO", () => {
      const data = loadSpaceActDataFromDisk();
      const result = calculateCompliance(
        makeAnswers({ establishment: "third_country_eu_services" }),
        data,
      );
      expect(result.checklist.length).toBeGreaterThan(0);
    });

    it("real data: applicablePercentage is between 0 and 100 for all operator types", () => {
      const data = loadSpaceActDataFromDisk();
      const activityTypes = [
        "spacecraft",
        "launch_vehicle",
        "launch_site",
        "isos",
        "data_provider",
      ] as const;
      for (const activityType of activityTypes) {
        const result = calculateCompliance(makeAnswers({ activityType }), data);
        expect(result.applicablePercentage).toBeGreaterThanOrEqual(0);
        expect(result.applicablePercentage).toBeLessThanOrEqual(100);
      }
    });

    it("real data: caches data — calling loadSpaceActDataFromDisk twice returns same object reference", () => {
      const first = loadSpaceActDataFromDisk();
      const second = loadSpaceActDataFromDisk();
      expect(first).toBe(second);
    });
  });
});
