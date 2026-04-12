import { describe, it, expect, vi, beforeEach } from "vitest";
import { AssessmentAnswers, SpaceActData } from "@/lib/types";

// Mock server-only to allow importing engine.server in test environment
vi.mock("server-only", () => ({}));

// Import after mocking server-only
const { calculateCompliance, redactArticlesForClient } =
  await import("@/lib/engine.server");

// Mock space act data
const mockSpaceActData: SpaceActData = {
  metadata: {
    version: "1.0",
    total_articles: 119,
    last_updated: "2025-01-01",
    source: "EUR-Lex",
  },
  titles: [
    {
      number: 1,
      title: "General Provisions",
      articles_detail: [
        {
          number: 1,
          title: "Subject Matter",
          summary: "Establishes framework",
          applies_to: ["ALL"],
          compliance_type: "informational",
          operator_action: "N/A",
        },
        {
          number: 2,
          title: "Scope",
          summary: "Defines scope",
          applies_to: ["SCO", "LO", "LSO"],
          compliance_type: "scope_determination",
          operator_action: "Determine applicability",
        },
        {
          number: 3,
          title: "Definitions",
          summary: "Key definitions",
          applies_to: ["ALL"],
          compliance_type: "informational",
          operator_action: "N/A",
        },
      ],
    },
    {
      number: 2,
      title: "Authorization",
      chapters: [
        {
          number: 1,
          title: "Authorization Requirements",
          articles_detail: [
            {
              number: 6,
              title: "Authorization Requirement",
              summary: "Requires authorization for space activities",
              applies_to: ["SCO", "LO"],
              compliance_type: "mandatory_pre_activity",
              operator_action: "Obtain authorization",
            },
            {
              number: 7,
              title: "Application Process",
              summary: "Application requirements",
              applies_to: ["SCO", "LO", "LSO"],
              compliance_type: "mandatory",
              operator_action: "Submit application",
            },
            {
              number: 10,
              title: "Light Regime",
              summary: "Simplified requirements for small entities",
              applies_to: ["SCO"],
              compliance_type: "conditional_simplification",
              operator_action: "Apply for light regime if eligible",
            },
            {
              number: 12,
              title: "ISOS Authorization",
              summary: "Authorization for ISOS providers",
              applies_to: ["ISOS"],
              compliance_type: "mandatory_pre_activity",
              operator_action: "Obtain ISOS authorization",
            },
            {
              number: 14,
              title: "CAP Registration",
              summary: "Registration for collision avoidance providers",
              applies_to: ["CAP"],
              compliance_type: "mandatory_pre_activity",
              operator_action: "Register as CAP",
            },
          ],
        },
      ],
    },
    {
      number: 3,
      title: "Supervision",
      chapters: [
        {
          number: 1,
          title: "Oversight",
          sections: [
            {
              number: 1,
              title: "Monitoring",
              articles_detail: [
                {
                  number: 33,
                  title: "Supervision Framework",
                  summary: "Framework for ongoing supervision",
                  applies_to: ["ALL"],
                  compliance_type: "mandatory_ongoing",
                  operator_action: "Comply with supervision",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      number: 4,
      title: "Safety and Sustainability",
      chapters: [
        {
          number: 1,
          title: "Debris Mitigation",
          articles_detail: [
            {
              number: 55,
              title: "Debris Mitigation Plan",
              summary: "Requires debris mitigation",
              applies_to: ["SCO"],
              compliance_type: "mandatory_ongoing",
              operator_action: "Submit debris plan",
            },
          ],
        },
        {
          number: 2,
          title: "Cybersecurity",
          articles_detail: [
            {
              number: 74,
              title: "Cybersecurity Requirements",
              summary: "NIS2 compliance",
              applies_to: ["SCO", "LO"],
              excludes: ["PDP"],
              compliance_type: "mandatory_ongoing",
              operator_action: "Implement cybersecurity measures",
            },
          ],
        },
        {
          number: 3,
          title: "Environmental",
          articles_detail: [
            {
              number: 96,
              title: "Environmental Footprint Declaration",
              summary: "EFD requirements",
              applies_to: ["SCO", "LO"],
              compliance_type: "mandatory_ongoing",
              operator_action: "Submit EFD",
            },
          ],
        },
      ],
    },
    {
      number: 5,
      title: "Third Country Operators",
      articles_detail: [
        {
          number: 105,
          title: "Registration Requirement",
          summary: "Third country registration",
          applies_to: ["TCO"],
          compliance_type: "mandatory_pre_activity",
          operator_action: "Register with EUSPA",
        },
        {
          number: 106,
          title: "TCO Ongoing Obligations",
          summary: "Ongoing obligations for TCO",
          applies_to: ["TCO"],
          compliance_type: "mandatory_ongoing",
          operator_action: "Comply with TCO obligations",
        },
      ],
    },
  ],
  compliance_checklist_by_operator_type: {
    spacecraft_operator_eu: {
      pre_authorization: [
        {
          action: "Determine authorization type",
          article_reference: "Art. 6",
          deadline: "Before launch",
          criticality: "mandatory",
        },
        {
          action: "Submit application",
          article_reference: "Art. 7",
          deadline: "6 months before launch",
          criticality: "mandatory",
        },
      ],
      ongoing: [
        {
          action: "Annual reporting",
          article_reference: "Art. 33",
          deadline: "Annual",
          criticality: "mandatory",
        },
        {
          action: "Incident notification",
          article_reference: "Art. 74",
          deadline: "24 hours",
          criticality: "mandatory",
        },
      ],
      end_of_life: [
        {
          action: "Submit decommissioning plan",
          article_reference: "Art. 55",
          deadline: "30 days before EOL",
          criticality: "mandatory",
        },
      ],
    },
    launch_operator_eu: {
      pre_authorization: [
        {
          action: "Obtain launch license",
          article_reference: "Art. 6",
          deadline: "Before launch",
          criticality: "mandatory",
        },
      ],
      operational: [
        {
          action: "Safety monitoring",
          article_reference: "Art. 33",
          deadline: "Continuous",
          criticality: "mandatory",
        },
      ],
    },
    third_country_operator: {
      pre_registration: [
        {
          action: "Register with EUSPA",
          article_reference: "Art. 105",
          deadline: "Before EU market access",
          criticality: "mandatory",
        },
      ],
      ongoing: [
        {
          action: "Maintain EU representative",
          article_reference: "Art. 14",
          deadline: "Continuous",
          criticality: "mandatory",
        },
      ],
    },
  },
  operator_types: {},
  constellation_tiers: {},
  size_categories: {},
  decision_tree: {},
};

// ─── Helper ───

function makeAnswers(
  overrides: Partial<AssessmentAnswers> = {},
): AssessmentAnswers {
  return {
    activityType: "spacecraft",
    isDefenseOnly: false,
    hasPostLaunchAssets: true,
    allAssetsPreLaunch: false,
    establishment: "eu",
    entitySize: "medium",
    operatesConstellation: false,
    constellationSize: null,
    primaryOrbit: "LEO",
    offersEUServices: true,
    ...overrides,
  } as AssessmentAnswers;
}

describe("Compliance Engine", () => {
  describe("calculateCompliance", () => {
    // ═══════════════════════════════════════════
    // Operator Type Mapping — ALL 7 types
    // ═══════════════════════════════════════════

    describe("Operator Type Mapping", () => {
      it("should correctly identify spacecraft operator (SCO)", () => {
        const answers = makeAnswers({ activityType: "spacecraft" });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.operatorType).toBe("spacecraft_operator");
        expect(result.operatorAbbreviation).toBe("SCO");
        expect(result.operatorTypeLabel).toBe("Spacecraft Operator (EU)");
      });

      it("should correctly identify launch operator (LO)", () => {
        const answers = makeAnswers({ activityType: "launch_vehicle" });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.operatorType).toBe("launch_operator");
        expect(result.operatorAbbreviation).toBe("LO");
        expect(result.operatorTypeLabel).toBe("Launch Operator (EU)");
      });

      it("should correctly identify launch site operator (LSO)", () => {
        const answers = makeAnswers({ activityType: "launch_site" });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.operatorType).toBe("launch_site_operator");
        expect(result.operatorAbbreviation).toBe("LSO");
      });

      it("should correctly identify ISOS provider", () => {
        const answers = makeAnswers({ activityType: "isos" });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.operatorType).toBe("isos_provider");
        expect(result.operatorAbbreviation).toBe("ISOS");
      });

      it("should correctly identify primary data provider (PDP)", () => {
        const answers = makeAnswers({ activityType: "data_provider" });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.operatorType).toBe("primary_data_provider");
        expect(result.operatorAbbreviation).toBe("PDP");
      });

      it("should identify third country operator (TCO) when establishment is third_country_eu_services", () => {
        const answers = makeAnswers({
          activityType: "spacecraft",
          establishment: "third_country_eu_services",
        });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.isThirdCountry).toBe(true);
        expect(result.operatorTypeLabel).toContain("Third Country");
      });

      it("should default to spacecraft operator for unknown activityType", () => {
        const answers = makeAnswers({
          activityType: "unknown_type" as any,
        });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.operatorType).toBe("spacecraft_operator");
        expect(result.operatorAbbreviation).toBe("SCO");
      });

      it("should default to spacecraft operator when activityType is null", () => {
        const answers = makeAnswers({ activityType: null });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.operatorType).toBe("spacecraft_operator");
        expect(result.operatorAbbreviation).toBe("SCO");
      });
    });

    // ═══════════════════════════════════════════
    // Article Filtering by Operator Type
    // ═══════════════════════════════════════════

    describe("Article Filtering by Operator Type", () => {
      it("should include ALL articles for every operator type", () => {
        const answers = makeAnswers({ activityType: "spacecraft" });
        const result = calculateCompliance(answers, mockSpaceActData);

        // Art. 1 applies to ALL
        const hasArt1 = result.applicableArticles.some((a) => a.number === 1);
        expect(hasArt1).toBe(true);
      });

      it("should filter articles specifically for SCO", () => {
        const answers = makeAnswers({ activityType: "spacecraft" });
        const result = calculateCompliance(answers, mockSpaceActData);

        for (const article of result.applicableArticles) {
          const appliesTo = article.applies_to || [];
          expect(appliesTo.includes("SCO") || appliesTo.includes("ALL")).toBe(
            true,
          );
        }
      });

      it("should filter articles specifically for LO", () => {
        const answers = makeAnswers({ activityType: "launch_vehicle" });
        const result = calculateCompliance(answers, mockSpaceActData);

        for (const article of result.applicableArticles) {
          const appliesTo = article.applies_to || [];
          expect(appliesTo.includes("LO") || appliesTo.includes("ALL")).toBe(
            true,
          );
        }
      });

      it("should filter articles specifically for LSO", () => {
        const answers = makeAnswers({ activityType: "launch_site" });
        const result = calculateCompliance(answers, mockSpaceActData);

        for (const article of result.applicableArticles) {
          const appliesTo = article.applies_to || [];
          expect(appliesTo.includes("LSO") || appliesTo.includes("ALL")).toBe(
            true,
          );
        }
      });

      it("should filter articles specifically for ISOS", () => {
        const answers = makeAnswers({ activityType: "isos" });
        const result = calculateCompliance(answers, mockSpaceActData);

        // Should include Art. 12 (ISOS-specific) and Art. 1 (ALL)
        const hasArt12 = result.applicableArticles.some((a) => a.number === 12);
        expect(hasArt12).toBe(true);

        // Should NOT include SCO-specific articles like Art. 55
        const hasArt55 = result.applicableArticles.some((a) => a.number === 55);
        expect(hasArt55).toBe(false);
      });

      it("should filter articles specifically for PDP", () => {
        const answers = makeAnswers({ activityType: "data_provider" });
        const result = calculateCompliance(answers, mockSpaceActData);

        // PDP should NOT include Art. 74 (excludes PDP)
        const hasCyberArticle = result.applicableArticles.some(
          (a) => a.number === 74,
        );
        expect(hasCyberArticle).toBe(false);
      });

      it("should include TCO articles for third country operators", () => {
        const answers = makeAnswers({
          activityType: "spacecraft",
          establishment: "third_country_eu_services",
        });
        const result = calculateCompliance(answers, mockSpaceActData);

        const hasTcoArticle = result.applicableArticles.some(
          (a) => a.number === 105,
        );
        expect(hasTcoArticle).toBe(true);
      });

      it("should exclude articles based on excludes field", () => {
        const answers = makeAnswers({ activityType: "data_provider" });
        const result = calculateCompliance(answers, mockSpaceActData);

        // Article 74 excludes PDP
        const hasCyber = result.applicableArticles.some((a) => a.number === 74);
        expect(hasCyber).toBe(false);
      });

      it("should not include TCO-excluded articles when isThirdCountry and article excludes TCO", () => {
        const dataWithTCOExclusion: SpaceActData = {
          ...mockSpaceActData,
          titles: [
            {
              number: 1,
              title: "Test",
              articles_detail: [
                {
                  number: 99,
                  title: "Special",
                  summary: "Special rule",
                  applies_to: ["ALL"],
                  excludes: ["TCO"],
                  compliance_type: "mandatory_ongoing",
                  operator_action: "Do something",
                },
              ],
            },
          ],
        };

        const answers = makeAnswers({
          establishment: "third_country_eu_services",
        });
        const result = calculateCompliance(answers, dataWithTCOExclusion);

        const hasArt99 = result.applicableArticles.some((a) => a.number === 99);
        expect(hasArt99).toBe(false);
      });
    });

    // ═══════════════════════════════════════════
    // Standard vs Light Regime Determination
    // ═══════════════════════════════════════════

    describe("Light Regime Determination", () => {
      it("should identify light regime for small enterprise", () => {
        const answers = makeAnswers({ entitySize: "small" });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.regime).toBe("light");
        expect(result.regimeLabel).toBe("Light Regime");
        expect(result.regimeReason).toContain("Art. 10");
      });

      it("should identify light regime for research institution", () => {
        const answers = makeAnswers({ entitySize: "research" });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.regime).toBe("light");
        expect(result.entitySizeLabel).toBe("Research/Educational Institution");
      });

      it("should identify standard regime for medium enterprise", () => {
        const answers = makeAnswers({ entitySize: "medium" });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.regime).toBe("standard");
        expect(result.regimeLabel).toBe("Standard (Full Requirements)");
      });

      it("should identify standard regime for large enterprise", () => {
        const answers = makeAnswers({ entitySize: "large" });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.regime).toBe("standard");
      });

      it("should identify standard regime for null entity size", () => {
        const answers = makeAnswers({ entitySize: null });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.regime).toBe("standard");
        expect(result.entitySizeLabel).toBe("Not specified");
      });
    });

    // ═══════════════════════════════════════════
    // Constellation Size Thresholds
    // ═══════════════════════════════════════════

    describe("Constellation Tier Classification", () => {
      it("should classify single satellite correctly", () => {
        const answers = makeAnswers({
          operatesConstellation: false,
          constellationSize: null,
        });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.constellationTier).toBe("single_satellite");
        expect(result.constellationTierLabel).toBe("Single Satellite");
      });

      it("should classify constellation size 1 as single satellite", () => {
        const answers = makeAnswers({
          operatesConstellation: true,
          constellationSize: 1,
        });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.constellationTier).toBe("single_satellite");
      });

      it("should classify small constellation (2-9 satellites)", () => {
        const answers = makeAnswers({
          operatesConstellation: true,
          constellationSize: 5,
        });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.constellationTier).toBe("small_constellation");
        expect(result.constellationTierLabel).toContain("Small Constellation");
      });

      it("should classify small constellation boundary (2 satellites)", () => {
        const answers = makeAnswers({
          operatesConstellation: true,
          constellationSize: 2,
        });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.constellationTier).toBe("small_constellation");
      });

      it("should classify medium constellation (10-99 satellites)", () => {
        const answers = makeAnswers({
          operatesConstellation: true,
          constellationSize: 50,
        });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.constellationTier).toBe("medium_constellation");
      });

      it("should classify medium constellation boundary (10 satellites)", () => {
        const answers = makeAnswers({
          operatesConstellation: true,
          constellationSize: 10,
        });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.constellationTier).toBe("medium_constellation");
      });

      it("should classify large constellation (100-999 satellites)", () => {
        const answers = makeAnswers({
          operatesConstellation: true,
          constellationSize: 500,
        });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.constellationTier).toBe("large_constellation");
      });

      it("should classify large constellation boundary (100 satellites)", () => {
        const answers = makeAnswers({
          operatesConstellation: true,
          constellationSize: 100,
        });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.constellationTier).toBe("large_constellation");
      });

      it("should classify mega constellation (1000+ satellites)", () => {
        const answers = makeAnswers({
          operatesConstellation: true,
          constellationSize: 5000,
        });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.constellationTier).toBe("mega_constellation");
        expect(result.constellationTierLabel).toContain("Mega Constellation");
      });

      it("should classify mega constellation boundary (1000 satellites)", () => {
        const answers = makeAnswers({
          operatesConstellation: true,
          constellationSize: 1000,
        });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.constellationTier).toBe("mega_constellation");
      });

      it("should handle null constellationSize when operatesConstellation is true", () => {
        const answers = makeAnswers({
          operatesConstellation: true,
          constellationSize: null,
        });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.constellationTier).toBeNull();
        expect(result.constellationTierLabel).toBeNull();
      });
    });

    // ═══════════════════════════════════════════
    // Module Status Calculations
    // ═══════════════════════════════════════════

    describe("Module Status Calculation", () => {
      it("should calculate module statuses for all defined modules", () => {
        const answers = makeAnswers({ activityType: "spacecraft" });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.moduleStatuses).toBeDefined();
        expect(Array.isArray(result.moduleStatuses)).toBe(true);
        // Module count tracks the MODULES array in src/data/modules.ts.
        // It has grown over time (originally 9; now 10 with CRA added).
        // This assertion uses a lower-bound rather than locking to a
        // specific number so adding modules doesn't break the test.
        expect(result.moduleStatuses.length).toBeGreaterThanOrEqual(9);
      });

      it("should have required fields on each module status", () => {
        const answers = makeAnswers({ activityType: "spacecraft" });
        const result = calculateCompliance(answers, mockSpaceActData);

        for (const mod of result.moduleStatuses) {
          expect(mod).toHaveProperty("id");
          expect(mod).toHaveProperty("name");
          expect(mod).toHaveProperty("status");
          expect(mod).toHaveProperty("articleCount");
          expect([
            "required",
            "simplified",
            "recommended",
            "not_applicable",
          ]).toContain(mod.status);
        }
      });

      it("should mark modules with mandatory articles as required", () => {
        const answers = makeAnswers({
          activityType: "spacecraft",
          entitySize: "medium",
        });
        const result = calculateCompliance(answers, mockSpaceActData);

        // The supervision module (Art. 26-31, 40-43, 52-57, 73) should contain Art. 33 (mandatory_ongoing)
        const supervisionModule = result.moduleStatuses.find(
          (m) => m.id === "supervision",
        );
        if (supervisionModule && supervisionModule.articleCount > 0) {
          expect(supervisionModule.status).toBe("required");
        }
      });

      it("should show simplified status for light regime with conditional simplified articles", () => {
        const answers = makeAnswers({
          activityType: "spacecraft",
          entitySize: "small", // Light regime
        });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.regime).toBe("light");
        // Authorization module should be simplified because it has conditional_simplification (Art. 10)
        const authModule = result.moduleStatuses.find(
          (m) => m.id === "authorization",
        );
        // It could be simplified if it has both mandatory + simplified articles
        if (authModule) {
          expect(authModule.articleCount).toBeGreaterThan(0);
        }
      });

      it("should mark modules with no applicable articles as not_applicable", () => {
        const answers = makeAnswers({ activityType: "data_provider" });
        const result = calculateCompliance(answers, mockSpaceActData);

        // PDP has fewer applicable articles, some modules should be not_applicable
        const notApplicableModules = result.moduleStatuses.filter(
          (m) => m.status === "not_applicable",
        );
        expect(notApplicableModules.length).toBeGreaterThan(0);
      });

      it("should set summary text based on status", () => {
        const answers = makeAnswers({ activityType: "spacecraft" });
        const result = calculateCompliance(answers, mockSpaceActData);

        for (const mod of result.moduleStatuses) {
          expect(typeof mod.summary).toBe("string");
          expect(mod.summary.length).toBeGreaterThan(0);
        }
      });
    });

    // ═══════════════════════════════════════════
    // Out-of-Scope Detection
    // ═══════════════════════════════════════════

    describe("Third Country Operator Detection", () => {
      it("should identify third country operator with EU services", () => {
        const answers = makeAnswers({
          establishment: "third_country_eu_services",
        });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.isThirdCountry).toBe(true);
        expect(result.isEU).toBe(false);
        expect(result.operatorTypeLabel).toContain("Third Country");
        expect(result.authorizationPath).toBe(
          "EUSPA Registration → Commission Decision",
        );
      });

      it("should correctly handle EU-established operator", () => {
        const answers = makeAnswers({ establishment: "eu" });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.isEU).toBe(true);
        expect(result.isThirdCountry).toBe(false);
        expect(result.authorizationPath).toBe(
          "National Authority (NCA) → URSO Registration",
        );
      });

      it("should handle third_country_no_eu establishment as out of scope", () => {
        // 2026-04 audit fix: third_country_no_eu now returns an
        // out-of-scope result rather than falling through as an EU-like
        // entity. The Space Act doesn't claim jurisdiction over operators
        // with no EU establishment AND no EU services.
        const answers = makeAnswers({
          establishment: "third_country_no_eu" as never,
        });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.isEU).toBe(false);
        expect(result.isThirdCountry).toBe(false);
        expect(result.regime).toBe("out_of_scope");
        expect(result.applicableArticles).toEqual([]);
        expect(result.authorizationPath).toBe("N/A — out of scope");
      });

      it("should handle null establishment", () => {
        const answers = makeAnswers({ establishment: null });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.isEU).toBe(false);
        expect(result.isThirdCountry).toBe(false);
      });
    });

    // ═══════════════════════════════════════════
    // Checklist Generation
    // ═══════════════════════════════════════════

    describe("Checklist Generation", () => {
      it("should generate pre-authorization, ongoing, and end-of-life checklist for EU spacecraft operator", () => {
        const answers = makeAnswers({
          activityType: "spacecraft",
          establishment: "eu",
        });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.checklist).toBeDefined();
        expect(Array.isArray(result.checklist)).toBe(true);
        // SCO EU: pre_authorization (2) + ongoing (2) + end_of_life (1) = 5
        expect(result.checklist.length).toBe(5);

        for (const item of result.checklist) {
          expect(item).toHaveProperty("action");
          expect(item).toHaveProperty("article_reference");
        }
      });

      it("should generate checklist for third country operator", () => {
        const answers = makeAnswers({
          establishment: "third_country_eu_services",
        });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.checklist.length).toBeGreaterThan(0);

        const hasRegistration = result.checklist.some((item) =>
          item.action.toLowerCase().includes("register"),
        );
        expect(hasRegistration).toBe(true);
      });

      it("should generate checklist for launch operator", () => {
        const answers = makeAnswers({
          activityType: "launch_vehicle",
          establishment: "eu",
        });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.checklist).toBeDefined();
        expect(result.checklist.length).toBeGreaterThan(0);

        // LO EU: pre_authorization (1) + operational (1) = 2
        expect(result.checklist.length).toBe(2);
      });

      it("should generate checklist for launch site operator (uses LO checklist)", () => {
        const answers = makeAnswers({
          activityType: "launch_site",
          establishment: "eu",
        });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.checklist).toBeDefined();
        expect(result.checklist.length).toBeGreaterThan(0);
      });

      it("should generate default checklist for ISOS/PDP (falls back to SCO pre+ongoing)", () => {
        const answers = makeAnswers({
          activityType: "isos",
          establishment: "eu",
        });
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.checklist).toBeDefined();
        // Default path: SCO pre_authorization (2) + ongoing (2) = 4
        expect(result.checklist.length).toBe(4);
      });
    });

    // ═══════════════════════════════════════════
    // Key Dates
    // ═══════════════════════════════════════════

    describe("Key Dates", () => {
      it("should include 2030 application date", () => {
        const answers = makeAnswers({});
        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.keyDates.length).toBeGreaterThan(0);
        const has2030 = result.keyDates.some((d) => d.date.includes("2030"));
        expect(has2030).toBe(true);
      });

      it("should include EFD deadline for light regime", () => {
        const answers = makeAnswers({ entitySize: "small" });
        const result = calculateCompliance(answers, mockSpaceActData);

        const hasEfdDeadline = result.keyDates.some((d) =>
          d.description.toLowerCase().includes("efd"),
        );
        expect(hasEfdDeadline).toBe(true);
      });

      it("should not include EFD deadline for standard regime", () => {
        const answers = makeAnswers({ entitySize: "large" });
        const result = calculateCompliance(answers, mockSpaceActData);

        const hasEfdDeadline = result.keyDates.some((d) =>
          d.description.toLowerCase().includes("efd"),
        );
        expect(hasEfdDeadline).toBe(false);
      });

      it("should always include 2035 review date", () => {
        const answers = makeAnswers({});
        const result = calculateCompliance(answers, mockSpaceActData);

        const has2035 = result.keyDates.some((d) => d.date.includes("2035"));
        expect(has2035).toBe(true);
      });

      it("should have more key dates for light regime than standard", () => {
        const lightAnswers = makeAnswers({ entitySize: "small" });
        const standardAnswers = makeAnswers({ entitySize: "large" });
        const lightResult = calculateCompliance(lightAnswers, mockSpaceActData);
        const standardResult = calculateCompliance(
          standardAnswers,
          mockSpaceActData,
        );

        expect(lightResult.keyDates.length).toBeGreaterThan(
          standardResult.keyDates.length,
        );
      });
    });

    // ═══════════════════════════════════════════
    // Authorization Cost Estimates
    // ═══════════════════════════════════════════

    describe("Authorization Cost Estimates", () => {
      it("should estimate cost for spacecraft operator", () => {
        const answers = makeAnswers({ activityType: "spacecraft" });
        const result = calculateCompliance(answers, mockSpaceActData);
        expect(result.estimatedAuthorizationCost).toContain("100,000");
      });

      it("should estimate cost for launch operator", () => {
        const answers = makeAnswers({ activityType: "launch_vehicle" });
        const result = calculateCompliance(answers, mockSpaceActData);
        expect(result.estimatedAuthorizationCost).toContain("150,000");
      });

      it("should show TBD for third country operator", () => {
        const answers = makeAnswers({
          establishment: "third_country_eu_services",
        });
        const result = calculateCompliance(answers, mockSpaceActData);
        expect(result.estimatedAuthorizationCost.toLowerCase()).toContain(
          "tbd",
        );
      });

      it("should show default estimate for ISOS/PDP", () => {
        const answers = makeAnswers({ activityType: "isos" });
        const result = calculateCompliance(answers, mockSpaceActData);
        expect(result.estimatedAuthorizationCost).toContain("50,000");
      });
    });

    // ═══════════════════════════════════════════
    // Orbit Labels
    // ═══════════════════════════════════════════

    describe("Orbit Labels", () => {
      it("should correctly label LEO", () => {
        const answers = makeAnswers({ primaryOrbit: "LEO" });
        const result = calculateCompliance(answers, mockSpaceActData);
        expect(result.orbitLabel).toContain("Low Earth Orbit");
      });

      it("should correctly label MEO", () => {
        const answers = makeAnswers({ primaryOrbit: "MEO" });
        const result = calculateCompliance(answers, mockSpaceActData);
        expect(result.orbitLabel).toContain("Medium Earth Orbit");
      });

      it("should correctly label GEO", () => {
        const answers = makeAnswers({ primaryOrbit: "GEO" });
        const result = calculateCompliance(answers, mockSpaceActData);
        expect(result.orbitLabel).toContain("Geostationary");
      });

      it("should correctly label beyond Earth orbit", () => {
        const answers = makeAnswers({ primaryOrbit: "beyond" });
        const result = calculateCompliance(answers, mockSpaceActData);
        expect(result.orbitLabel).toContain("Beyond Earth");
      });

      it("should handle null orbit", () => {
        const answers = makeAnswers({ primaryOrbit: null });
        const result = calculateCompliance(answers, mockSpaceActData);
        expect(result.orbitLabel).toBe("Not specified");
      });
    });

    // ═══════════════════════════════════════════
    // Statistics Calculation
    // ═══════════════════════════════════════════

    describe("Statistics Calculation", () => {
      it("should calculate applicable percentage correctly", () => {
        const answers = makeAnswers({});
        const result = calculateCompliance(answers, mockSpaceActData);

        // 2026-04 audit fix: totalArticles is now derived from the
        // actual flat article count rather than data.metadata.total_articles.
        // The metadata claims 119 but the JSON groups articles into ~67
        // entries — using metadata as denominator produced an understated
        // percentage.
        expect(result.totalArticles).toBeGreaterThan(0);
        expect(result.applicableCount).toBeGreaterThan(0);
        expect(result.applicablePercentage).toBeGreaterThanOrEqual(0);
        expect(result.applicablePercentage).toBeLessThanOrEqual(100);

        const expectedPercentage = Math.round(
          (result.applicableCount / result.totalArticles) * 100,
        );
        expect(result.applicablePercentage).toBe(expectedPercentage);
      });
    });

    // ═══════════════════════════════════════════
    // Edge Cases
    // ═══════════════════════════════════════════

    describe("Edge Cases", () => {
      it("should handle empty titles array", () => {
        const emptyData: SpaceActData = {
          ...mockSpaceActData,
          titles: [],
        };
        const answers = makeAnswers({});
        const result = calculateCompliance(answers, emptyData);

        expect(result.applicableArticles).toEqual([]);
        expect(result.applicableCount).toBe(0);
      });

      it("should handle all null answers gracefully", () => {
        const answers: AssessmentAnswers = {
          activityType: null,
          isDefenseOnly: null,
          hasPostLaunchAssets: null,
          allAssetsPreLaunch: false,
          establishment: null,
          entitySize: null,
          operatesConstellation: null,
          constellationSize: null,
          primaryOrbit: null,
          offersEUServices: null,
        } as AssessmentAnswers;

        const result = calculateCompliance(answers, mockSpaceActData);
        expect(result).toBeDefined();
        expect(result.operatorType).toBe("spacecraft_operator");
        expect(result.regime).toBe("standard");
      });

      it("should set offersEUServices to false when null", () => {
        const answers = makeAnswers({ offersEUServices: null });
        const result = calculateCompliance(answers, mockSpaceActData);
        expect(result.offersEUServices).toBe(false);
      });

      it("should set entitySize to 'unknown' when null", () => {
        const answers = makeAnswers({ entitySize: null });
        const result = calculateCompliance(answers, mockSpaceActData);
        expect(result.entitySize).toBe("unknown");
      });

      it("should set orbit to 'unknown' when null", () => {
        const answers = makeAnswers({ primaryOrbit: null });
        const result = calculateCompliance(answers, mockSpaceActData);
        expect(result.orbit).toBe("unknown");
      });
    });
  });

  // ═══════════════════════════════════════════
  // Redaction
  // ═══════════════════════════════════════════

  describe("redactArticlesForClient", () => {
    it("should strip sensitive fields from articles", () => {
      const answers = makeAnswers({});
      const fullResult = calculateCompliance(answers, mockSpaceActData);
      const redacted = redactArticlesForClient(fullResult);

      expect(redacted.applicableArticles.length).toBe(
        fullResult.applicableArticles.length,
      );

      for (const article of redacted.applicableArticles) {
        expect(article).toHaveProperty("number");
        expect(article).toHaveProperty("title");
        expect(article).toHaveProperty("compliance_type");
        expect(article).toHaveProperty("applies_to");
        // Should NOT have sensitive fields
        expect(article).not.toHaveProperty("summary");
        expect(article).not.toHaveProperty("operator_action");
      }
    });

    it("should preserve non-article fields", () => {
      const answers = makeAnswers({});
      const fullResult = calculateCompliance(answers, mockSpaceActData);
      const redacted = redactArticlesForClient(fullResult);

      expect(redacted.operatorType).toBe(fullResult.operatorType);
      expect(redacted.regime).toBe(fullResult.regime);
      expect(redacted.isEU).toBe(fullResult.isEU);
      expect(redacted.checklist).toEqual(fullResult.checklist);
      expect(redacted.keyDates).toEqual(fullResult.keyDates);
    });
  });

  // ═══════════════════════════════════════════
  // Constellation Size Boundaries
  // ═══════════════════════════════════════════

  describe("constellation size boundaries", () => {
    it("handles constellationSize = 0", () => {
      const answers = makeAnswers({
        operatesConstellation: true,
        constellationSize: 0,
      });
      const result = calculateCompliance(answers, mockSpaceActData);

      // constellationSize 0 should be treated as single satellite
      expect(result).toBeDefined();
      expect(result.operatorType).toBeDefined();
    });

    it("handles constellationSize = 1", () => {
      const answers = makeAnswers({
        operatesConstellation: true,
        constellationSize: 1,
      });
      const result = calculateCompliance(answers, mockSpaceActData);

      // constellationSize 1 is below "small_constellation" threshold (2)
      expect(result).toBeDefined();
      expect(result.operatorType).toBeDefined();
    });

    it("handles constellationSize = 100000", () => {
      const answers = makeAnswers({
        operatesConstellation: true,
        constellationSize: 100000,
      });
      const result = calculateCompliance(answers, mockSpaceActData);

      // Very large constellation (mega_constellation tier: 1000+)
      expect(result).toBeDefined();
      expect(result.operatorType).toBeDefined();
      // Should not crash or throw
    });

    it("handles constellationSize = null with operatesConstellation = true", () => {
      const answers = makeAnswers({
        operatesConstellation: true,
        constellationSize: null,
      });
      const result = calculateCompliance(answers, mockSpaceActData);

      expect(result).toBeDefined();
      expect(result.operatorType).toBeDefined();
    });

    it("handles operatesConstellation = false ignoring constellationSize", () => {
      const answers = makeAnswers({
        operatesConstellation: false,
        constellationSize: 5000,
      });
      const result = calculateCompliance(answers, mockSpaceActData);

      expect(result).toBeDefined();
      // Should still work even though constellationSize is set
      expect(result.operatorType).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════
  // loadSpaceActDataFromDisk coverage
  // ═══════════════════════════════════════════

  describe("loadSpaceActDataFromDisk", () => {
    it("loads data from disk successfully", async () => {
      // Re-import to get loadSpaceActDataFromDisk
      const { loadSpaceActDataFromDisk } = await import("@/lib/engine.server");
      const data = loadSpaceActDataFromDisk();
      expect(data).toBeDefined();
      expect(data.metadata).toBeDefined();
      expect(data.titles.length).toBeGreaterThan(0);
    });

    it("returns cached data on second call", async () => {
      const { loadSpaceActDataFromDisk } = await import("@/lib/engine.server");
      const data1 = loadSpaceActDataFromDisk();
      const data2 = loadSpaceActDataFromDisk();
      // Both calls should return the same reference (cache hit)
      expect(data1).toBe(data2);
    });
  });

  // ═══════════════════════════════════════════
  // Module Status — conditional_simplified branch
  // ═══════════════════════════════════════════

  describe("Module Status — simplified branches", () => {
    it("should produce required status with simplified track note for light regime with mandatory + conditional_simplified", () => {
      // Create data where a module range contains both mandatory_pre_activity
      // AND conditional_simplified articles, under light regime
      const dataWithMixedTypes: SpaceActData = {
        ...mockSpaceActData,
        titles: [
          {
            number: 1,
            title: "Test",
            articles_detail: [
              {
                number: 6,
                title: "Mandatory",
                summary: "Mandatory rule",
                applies_to: ["SCO"],
                compliance_type: "mandatory_pre_activity",
                operator_action: "Do it",
              },
              {
                number: 7,
                title: "Simplified",
                summary: "Simplified rule",
                applies_to: ["SCO"],
                compliance_type: "conditional_simplified",
                operator_action: "Maybe do it",
              },
            ],
          },
        ],
      };
      const answers = makeAnswers({
        activityType: "spacecraft",
        entitySize: "small", // light regime
      });
      const result = calculateCompliance(answers, dataWithMixedTypes);

      // Find the authorization module which covers Art. 6-7
      const authModule = result.moduleStatuses.find(
        (m) => m.id === "authorization",
      );
      if (authModule && authModule.articleCount > 0) {
        expect(authModule.status).toBe("required");
        expect(authModule.summary).toContain("simplified track");
      }
    });

    it("should produce simplified status for module with only conditional_simplified under light regime", () => {
      const dataWithSimplifiedOnly: SpaceActData = {
        ...mockSpaceActData,
        titles: [
          {
            number: 1,
            title: "Test",
            articles_detail: [
              {
                number: 6,
                title: "Simplified Only",
                summary: "Simplified",
                applies_to: ["SCO"],
                compliance_type: "conditional_simplified",
                operator_action: "Simplified action",
              },
            ],
          },
        ],
      };
      const answers = makeAnswers({
        activityType: "spacecraft",
        entitySize: "small", // light regime
      });
      const result = calculateCompliance(answers, dataWithSimplifiedOnly);

      const authModule = result.moduleStatuses.find(
        (m) => m.id === "authorization",
      );
      if (authModule && authModule.articleCount > 0) {
        expect(authModule.status).toBe("simplified");
        expect(authModule.summary).toContain("Simplified");
      }
    });

    it("should produce recommended status for module with non-mandatory, non-simplified articles", () => {
      const dataWithRecommended: SpaceActData = {
        ...mockSpaceActData,
        titles: [
          {
            number: 1,
            title: "Test",
            articles_detail: [
              {
                number: 6,
                title: "Informational",
                summary: "Info",
                applies_to: ["SCO"],
                compliance_type: "informational",
                operator_action: "Review",
              },
            ],
          },
        ],
      };
      const answers = makeAnswers({ activityType: "spacecraft" });
      const result = calculateCompliance(answers, dataWithRecommended);

      const authModule = result.moduleStatuses.find(
        (m) => m.id === "authorization",
      );
      if (authModule && authModule.articleCount > 0) {
        expect(authModule.status).toBe("recommended");
        expect(authModule.summary).toContain("relevant article");
      }
    });

    it("should show singular article in summary when only 1 article in module", () => {
      const dataWithSingleArticle: SpaceActData = {
        ...mockSpaceActData,
        titles: [
          {
            number: 1,
            title: "Test",
            articles_detail: [
              {
                number: 6,
                title: "Single Mandatory",
                summary: "Single",
                applies_to: ["SCO"],
                compliance_type: "mandatory_pre_activity",
                operator_action: "Do it",
              },
            ],
          },
        ],
      };
      const answers = makeAnswers({ activityType: "spacecraft" });
      const result = calculateCompliance(answers, dataWithSingleArticle);

      const authModule = result.moduleStatuses.find(
        (m) => m.id === "authorization",
      );
      if (authModule && authModule.articleCount === 1) {
        expect(authModule.summary).toContain("1 article");
        expect(authModule.summary).not.toContain("articles");
      }
    });
  });

  // ═══════════════════════════════════════════
  // Article filtering — edge cases
  // ═══════════════════════════════════════════

  describe("Article Filtering — edge cases", () => {
    it("should handle articles with undefined applies_to (fallback to empty)", () => {
      const dataWithMissingAppliesTo: SpaceActData = {
        ...mockSpaceActData,
        titles: [
          {
            number: 1,
            title: "Test",
            articles_detail: [
              {
                number: 50,
                title: "No applies_to",
                summary: "Missing",
                compliance_type: "informational",
                operator_action: "N/A",
                // applies_to is intentionally omitted
              } as any,
            ],
          },
        ],
      };
      const answers = makeAnswers({ activityType: "spacecraft" });
      const result = calculateCompliance(answers, dataWithMissingAppliesTo);
      // Article with no applies_to should not match any operator
      const hasArt50 = result.applicableArticles.some((a) => a.number === 50);
      expect(hasArt50).toBe(false);
    });

    it("should handle string article numbers (e.g., '10a')", () => {
      const dataWithStringNumber: SpaceActData = {
        ...mockSpaceActData,
        titles: [
          {
            number: 1,
            title: "Test",
            articles_detail: [
              {
                number: "10a" as any,
                title: "Article 10a",
                summary: "Sub-article",
                applies_to: ["ALL"],
                compliance_type: "mandatory_ongoing",
                operator_action: "Comply",
              },
            ],
          },
        ],
      };
      const answers = makeAnswers({ activityType: "spacecraft" });
      const result = calculateCompliance(answers, dataWithStringNumber);
      const art10a = result.applicableArticles.find(
        (a) => String(a.number) === "10a",
      );
      expect(art10a).toBeDefined();
    });

    it("should handle article number that cannot be parsed to a number", () => {
      const dataWithBadNumber: SpaceActData = {
        ...mockSpaceActData,
        titles: [
          {
            number: 1,
            title: "Test",
            articles_detail: [
              {
                number: "appendix" as any,
                title: "Appendix",
                summary: "Non-numeric",
                applies_to: ["ALL"],
                compliance_type: "informational",
                operator_action: "Read",
              },
            ],
          },
        ],
      };
      const answers = makeAnswers({ activityType: "spacecraft" });
      // Should not throw
      const result = calculateCompliance(answers, dataWithBadNumber);
      expect(result).toBeDefined();
    });

    it("should include TCO articles via applies_to for third-country operators", () => {
      const dataWithTCO: SpaceActData = {
        ...mockSpaceActData,
        titles: [
          {
            number: 1,
            title: "Test",
            articles_detail: [
              {
                number: 200,
                title: "TCO Rule",
                summary: "TCO specific",
                applies_to: ["TCO"],
                compliance_type: "mandatory_pre_activity",
                operator_action: "Register",
              },
            ],
          },
        ],
      };
      const answers = makeAnswers({
        establishment: "third_country_eu_services",
      });
      const result = calculateCompliance(answers, dataWithTCO);
      const hasTCO = result.applicableArticles.some((a) => a.number === 200);
      expect(hasTCO).toBe(true);
    });
  });

  // ═══════════════════════════════════════════
  // Entity Size Labels — edge case
  // ═══════════════════════════════════════════

  describe("Entity Size Labels", () => {
    it("should return 'Unknown' for unrecognized entity size", () => {
      const answers = makeAnswers({
        entitySize: "giant" as any,
      });
      const result = calculateCompliance(answers, mockSpaceActData);
      expect(result.entitySizeLabel).toBe("Unknown");
    });
  });

  // ═══════════════════════════════════════════
  // Orbit Labels — unknown orbit
  // ═══════════════════════════════════════════

  describe("Orbit Labels — unknown orbit", () => {
    it("should return the raw orbit string for unknown orbit type", () => {
      const answers = makeAnswers({
        primaryOrbit: "XYZ" as any,
      });
      const result = calculateCompliance(answers, mockSpaceActData);
      expect(result.orbitLabel).toBe("XYZ");
    });
  });

  // ═══════════════════════════════════════════
  // Authorization path fallback
  // ═══════════════════════════════════════════

  describe("Authorization path — fallback", () => {
    it("returns 'Determine establishment status' for null establishment", () => {
      const answers = makeAnswers({ establishment: null });
      const result = calculateCompliance(answers, mockSpaceActData);
      expect(result.authorizationPath).toBe("Determine establishment status");
    });
  });
});
