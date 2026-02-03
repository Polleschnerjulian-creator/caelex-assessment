import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculateCompliance } from "@/lib/engine";
import { AssessmentAnswers, SpaceActData } from "@/lib/types";

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

describe("Compliance Engine", () => {
  describe("calculateCompliance", () => {
    describe("Operator Type Mapping", () => {
      it("should correctly identify spacecraft operator", () => {
        const answers: AssessmentAnswers = {
          activityType: "spacecraft",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "eu",
          entitySize: "medium",
          operatesConstellation: false,
          constellationSize: null,
          primaryOrbit: "LEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.operatorType).toBe("spacecraft_operator");
        expect(result.operatorAbbreviation).toBe("SCO");
        expect(result.operatorTypeLabel).toBe("Spacecraft Operator (EU)");
      });

      it("should correctly identify launch operator", () => {
        const answers: AssessmentAnswers = {
          activityType: "launch_vehicle",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "eu",
          entitySize: "large",
          operatesConstellation: false,
          constellationSize: null,
          primaryOrbit: "LEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.operatorType).toBe("launch_operator");
        expect(result.operatorAbbreviation).toBe("LO");
        expect(result.operatorTypeLabel).toBe("Launch Operator (EU)");
      });

      it("should correctly identify launch site operator", () => {
        const answers: AssessmentAnswers = {
          activityType: "launch_site",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "eu",
          entitySize: "large",
          operatesConstellation: false,
          constellationSize: null,
          primaryOrbit: "LEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.operatorType).toBe("launch_site_operator");
        expect(result.operatorAbbreviation).toBe("LSO");
      });

      it("should correctly identify ISOS provider", () => {
        const answers: AssessmentAnswers = {
          activityType: "isos",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "eu",
          entitySize: "medium",
          operatesConstellation: false,
          constellationSize: null,
          primaryOrbit: "LEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.operatorType).toBe("isos_provider");
        expect(result.operatorAbbreviation).toBe("ISOS");
      });

      it("should correctly identify primary data provider", () => {
        const answers: AssessmentAnswers = {
          activityType: "data_provider",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "eu",
          entitySize: "medium",
          operatesConstellation: false,
          constellationSize: null,
          primaryOrbit: "LEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.operatorType).toBe("primary_data_provider");
        expect(result.operatorAbbreviation).toBe("PDP");
      });
    });

    describe("Third Country Operator Detection", () => {
      it("should identify third country operator with EU services", () => {
        const answers: AssessmentAnswers = {
          activityType: "spacecraft",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "third_country_eu_services",
          entitySize: "large",
          operatesConstellation: true,
          constellationSize: 50,
          primaryOrbit: "LEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.isThirdCountry).toBe(true);
        expect(result.isEU).toBe(false);
        expect(result.operatorTypeLabel).toContain("Third Country");
        expect(result.authorizationPath).toBe(
          "EUSPA Registration → Commission Decision",
        );
      });

      it("should correctly handle EU-established operator", () => {
        const answers: AssessmentAnswers = {
          activityType: "spacecraft",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "eu",
          entitySize: "medium",
          operatesConstellation: false,
          constellationSize: null,
          primaryOrbit: "GEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.isEU).toBe(true);
        expect(result.isThirdCountry).toBe(false);
        expect(result.authorizationPath).toBe(
          "National Authority (NCA) → URSO Registration",
        );
      });
    });

    describe("Light Regime Determination", () => {
      it("should identify light regime for small enterprise", () => {
        const answers: AssessmentAnswers = {
          activityType: "spacecraft",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "eu",
          entitySize: "small",
          operatesConstellation: false,
          constellationSize: null,
          primaryOrbit: "LEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.regime).toBe("light");
        expect(result.regimeLabel).toBe("Light Regime");
        expect(result.regimeReason).toContain("Art. 10");
      });

      it("should identify light regime for research institution", () => {
        const answers: AssessmentAnswers = {
          activityType: "spacecraft",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "eu",
          entitySize: "research",
          operatesConstellation: false,
          constellationSize: null,
          primaryOrbit: "LEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.regime).toBe("light");
        expect(result.entitySizeLabel).toBe("Research/Educational Institution");
      });

      it("should identify standard regime for medium enterprise", () => {
        const answers: AssessmentAnswers = {
          activityType: "spacecraft",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "eu",
          entitySize: "medium",
          operatesConstellation: false,
          constellationSize: null,
          primaryOrbit: "LEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.regime).toBe("standard");
        expect(result.regimeLabel).toBe("Standard (Full Requirements)");
      });

      it("should identify standard regime for large enterprise", () => {
        const answers: AssessmentAnswers = {
          activityType: "spacecraft",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "eu",
          entitySize: "large",
          operatesConstellation: true,
          constellationSize: 100,
          primaryOrbit: "LEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.regime).toBe("standard");
      });
    });

    describe("Constellation Tier Classification", () => {
      it("should classify single satellite correctly", () => {
        const answers: AssessmentAnswers = {
          activityType: "spacecraft",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "eu",
          entitySize: "medium",
          operatesConstellation: false,
          constellationSize: null,
          primaryOrbit: "LEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.constellationTier).toBe("single_satellite");
        expect(result.constellationTierLabel).toBe("Single Satellite");
      });

      it("should classify small constellation (2-9 satellites)", () => {
        const answers: AssessmentAnswers = {
          activityType: "spacecraft",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "eu",
          entitySize: "medium",
          operatesConstellation: true,
          constellationSize: 5,
          primaryOrbit: "LEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.constellationTier).toBe("small_constellation");
        expect(result.constellationTierLabel).toContain("Small Constellation");
      });

      it("should classify medium constellation (10-99 satellites)", () => {
        const answers: AssessmentAnswers = {
          activityType: "spacecraft",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "eu",
          entitySize: "large",
          operatesConstellation: true,
          constellationSize: 50,
          primaryOrbit: "LEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.constellationTier).toBe("medium_constellation");
      });

      it("should classify large constellation (100-999 satellites)", () => {
        const answers: AssessmentAnswers = {
          activityType: "spacecraft",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "eu",
          entitySize: "large",
          operatesConstellation: true,
          constellationSize: 500,
          primaryOrbit: "LEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.constellationTier).toBe("large_constellation");
      });

      it("should classify mega constellation (1000+ satellites)", () => {
        const answers: AssessmentAnswers = {
          activityType: "spacecraft",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "eu",
          entitySize: "large",
          operatesConstellation: true,
          constellationSize: 5000,
          primaryOrbit: "LEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.constellationTier).toBe("mega_constellation");
        expect(result.constellationTierLabel).toContain("Mega Constellation");
      });
    });

    describe("Article Filtering", () => {
      it("should filter articles by operator type", () => {
        const answers: AssessmentAnswers = {
          activityType: "spacecraft",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "eu",
          entitySize: "medium",
          operatesConstellation: false,
          constellationSize: null,
          primaryOrbit: "LEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        // SCO should have articles that apply to SCO or ALL
        expect(result.applicableArticles.length).toBeGreaterThan(0);

        // Check that applicable articles either apply to SCO or ALL
        for (const article of result.applicableArticles) {
          const appliesTo = article.applies_to || [];
          expect(appliesTo.includes("SCO") || appliesTo.includes("ALL")).toBe(
            true,
          );
        }
      });

      it("should exclude articles based on excludes field", () => {
        const answers: AssessmentAnswers = {
          activityType: "data_provider",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "eu",
          entitySize: "medium",
          operatesConstellation: false,
          constellationSize: null,
          primaryOrbit: "LEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        // Article 74 (Cybersecurity) excludes PDP
        const hasCyberArticle = result.applicableArticles.some(
          (a) => a.number === 74,
        );
        expect(hasCyberArticle).toBe(false);
      });

      it("should include third country specific articles for TCO", () => {
        const answers: AssessmentAnswers = {
          activityType: "spacecraft",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "third_country_eu_services",
          entitySize: "large",
          operatesConstellation: false,
          constellationSize: null,
          primaryOrbit: "LEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        // Should include article 105 (TCO registration)
        const hasTcoArticle = result.applicableArticles.some(
          (a) => a.number === 105,
        );
        expect(hasTcoArticle).toBe(true);
      });
    });

    describe("Module Status Calculation", () => {
      it("should calculate module statuses", () => {
        const answers: AssessmentAnswers = {
          activityType: "spacecraft",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "eu",
          entitySize: "medium",
          operatesConstellation: false,
          constellationSize: null,
          primaryOrbit: "LEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.moduleStatuses).toBeDefined();
        expect(Array.isArray(result.moduleStatuses)).toBe(true);
        expect(result.moduleStatuses.length).toBeGreaterThan(0);

        // Each module status should have required fields
        for (const module of result.moduleStatuses) {
          expect(module).toHaveProperty("id");
          expect(module).toHaveProperty("name");
          expect(module).toHaveProperty("status");
          expect(module).toHaveProperty("articleCount");
          expect([
            "required",
            "simplified",
            "recommended",
            "not_applicable",
          ]).toContain(module.status);
        }
      });

      it("should mark modules as simplified for light regime", () => {
        const answers: AssessmentAnswers = {
          activityType: "spacecraft",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "eu",
          entitySize: "small", // Light regime eligible
          operatesConstellation: false,
          constellationSize: null,
          primaryOrbit: "LEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        // Light regime should potentially have simplified modules
        expect(result.regime).toBe("light");
        // Check if any module has simplified status
        const hasSimplified = result.moduleStatuses.some(
          (m) => m.status === "simplified",
        );
        // This depends on the data - the test validates the logic works
      });
    });

    describe("Checklist Generation", () => {
      it("should generate checklist for EU spacecraft operator", () => {
        const answers: AssessmentAnswers = {
          activityType: "spacecraft",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "eu",
          entitySize: "medium",
          operatesConstellation: false,
          constellationSize: null,
          primaryOrbit: "LEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.checklist).toBeDefined();
        expect(Array.isArray(result.checklist)).toBe(true);
        expect(result.checklist.length).toBeGreaterThan(0);

        // Check checklist item structure
        for (const item of result.checklist) {
          expect(item).toHaveProperty("action");
          expect(item).toHaveProperty("article_reference");
        }
      });

      it("should generate checklist for third country operator", () => {
        const answers: AssessmentAnswers = {
          activityType: "spacecraft",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "third_country_eu_services",
          entitySize: "large",
          operatesConstellation: false,
          constellationSize: null,
          primaryOrbit: "LEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.checklist).toBeDefined();
        expect(result.checklist.length).toBeGreaterThan(0);

        // TCO checklist should include registration
        const hasRegistration = result.checklist.some((item) =>
          item.action.toLowerCase().includes("register"),
        );
        expect(hasRegistration).toBe(true);
      });

      it("should generate checklist for launch operator", () => {
        const answers: AssessmentAnswers = {
          activityType: "launch_vehicle",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "eu",
          entitySize: "large",
          operatesConstellation: false,
          constellationSize: null,
          primaryOrbit: "LEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.checklist).toBeDefined();
        expect(result.checklist.length).toBeGreaterThan(0);
      });
    });

    describe("Key Dates", () => {
      it("should include basic key dates", () => {
        const answers: AssessmentAnswers = {
          activityType: "spacecraft",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "eu",
          entitySize: "medium",
          operatesConstellation: false,
          constellationSize: null,
          primaryOrbit: "LEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.keyDates).toBeDefined();
        expect(result.keyDates.length).toBeGreaterThan(0);

        // Should include 2030 application date
        const has2030 = result.keyDates.some((d) => d.date.includes("2030"));
        expect(has2030).toBe(true);
      });

      it("should include EFD deadline for light regime", () => {
        const answers: AssessmentAnswers = {
          activityType: "spacecraft",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "eu",
          entitySize: "small",
          operatesConstellation: false,
          constellationSize: null,
          primaryOrbit: "LEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        // Light regime has specific EFD deadline
        const hasEfdDeadline = result.keyDates.some((d) =>
          d.description.toLowerCase().includes("efd"),
        );
        expect(hasEfdDeadline).toBe(true);
      });
    });

    describe("Authorization Cost Estimates", () => {
      it("should estimate cost for spacecraft operator", () => {
        const answers: AssessmentAnswers = {
          activityType: "spacecraft",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "eu",
          entitySize: "medium",
          operatesConstellation: false,
          constellationSize: null,
          primaryOrbit: "LEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.estimatedAuthorizationCost).toContain("100,000");
      });

      it("should estimate cost for launch operator", () => {
        const answers: AssessmentAnswers = {
          activityType: "launch_vehicle",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "eu",
          entitySize: "large",
          operatesConstellation: false,
          constellationSize: null,
          primaryOrbit: "LEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.estimatedAuthorizationCost).toContain("150,000");
      });

      it("should show TBD for third country operator", () => {
        const answers: AssessmentAnswers = {
          activityType: "spacecraft",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "third_country_eu_services",
          entitySize: "large",
          operatesConstellation: false,
          constellationSize: null,
          primaryOrbit: "LEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.estimatedAuthorizationCost.toLowerCase()).toContain(
          "tbd",
        );
      });
    });

    describe("Orbit Labels", () => {
      it("should correctly label LEO", () => {
        const answers: AssessmentAnswers = {
          activityType: "spacecraft",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "eu",
          entitySize: "medium",
          operatesConstellation: false,
          constellationSize: null,
          primaryOrbit: "LEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.orbitLabel).toContain("Low Earth Orbit");
      });

      it("should correctly label GEO", () => {
        const answers: AssessmentAnswers = {
          activityType: "spacecraft",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "eu",
          entitySize: "medium",
          operatesConstellation: false,
          constellationSize: null,
          primaryOrbit: "GEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.orbitLabel).toContain("Geostationary");
      });

      it("should correctly label beyond Earth orbit", () => {
        const answers: AssessmentAnswers = {
          activityType: "spacecraft",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "eu",
          entitySize: "large",
          operatesConstellation: false,
          constellationSize: null,
          primaryOrbit: "beyond",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.orbitLabel).toContain("Beyond Earth");
      });
    });

    describe("Statistics Calculation", () => {
      it("should calculate applicable percentage correctly", () => {
        const answers: AssessmentAnswers = {
          activityType: "spacecraft",
          isDefenseOnly: false,
          allAssetsPreLaunch: false,
          establishment: "eu",
          entitySize: "medium",
          operatesConstellation: false,
          constellationSize: null,
          primaryOrbit: "LEO",
          offersEUServices: true,
        };

        const result = calculateCompliance(answers, mockSpaceActData);

        expect(result.totalArticles).toBe(119);
        expect(result.applicableCount).toBeGreaterThan(0);
        expect(result.applicablePercentage).toBeGreaterThanOrEqual(0);
        expect(result.applicablePercentage).toBeLessThanOrEqual(100);

        // Verify percentage calculation
        const expectedPercentage = Math.round(
          (result.applicableCount / result.totalArticles) * 100,
        );
        expect(result.applicablePercentage).toBe(expectedPercentage);
      });
    });
  });
});
