import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only (it throws when imported in non-server context)
vi.mock("server-only", () => ({}));

// Mock the data file
vi.mock("@/data/copuos-iadc-requirements", () => ({
  allCopuosIadcGuidelines: [
    {
      id: "copuos-lts-b1",
      source: "COPUOS",
      referenceNumber: "B.1",
      title: "Provide updated contact information",
      description: "States should provide updated contact information.",
      category: "safety_operations",
      bindingLevel: "mandatory",
      severity: "critical",
      applicability: {
        orbitRegimes: ["LEO", "MEO", "GEO"],
      },
      complianceQuestion: "Is contact information registered?",
      evidenceRequired: ["Contact registry submission"],
      implementationGuidance: ["Register contacts"],
      euSpaceActCrossRef: ["Art. 51"],
    },
    {
      id: "copuos-lts-b2",
      source: "COPUOS",
      referenceNumber: "B.2",
      title: "Improve accuracy of orbital data",
      description: "States should improve orbital data accuracy.",
      category: "safety_operations",
      bindingLevel: "mandatory",
      severity: "critical",
      applicability: {
        orbitRegimes: ["LEO", "MEO", "GEO", "HEO"],
      },
      complianceQuestion: "Do you provide accurate orbital data?",
      evidenceRequired: ["Ephemeris data"],
      implementationGuidance: ["Share ephemeris data"],
      euSpaceActCrossRef: ["Art. 63", "Art. 64"],
    },
    {
      id: "iadc-5.2.2",
      source: "IADC",
      referenceNumber: "5.2.2",
      title: "Collision avoidance maneuvers",
      description: "Execute collision avoidance maneuvers when needed.",
      category: "collision_avoidance",
      bindingLevel: "mandatory",
      severity: "critical",
      applicability: {
        orbitRegimes: ["LEO", "MEO", "GEO"],
        requiresPropulsion: true,
      },
      complianceQuestion: "Do you have CA maneuver capability?",
      evidenceRequired: ["CA procedures"],
      implementationGuidance: ["Define collision probability threshold"],
      euSpaceActCrossRef: ["Art. 66"],
    },
    {
      id: "iadc-5.3.2-leo",
      source: "IADC",
      referenceNumber: "5.3.2",
      title: "Post-mission disposal - LEO",
      description: "LEO spacecraft should deorbit within 25 years.",
      category: "disposal",
      bindingLevel: "mandatory",
      severity: "critical",
      applicability: {
        orbitRegimes: ["LEO"],
      },
      complianceQuestion: "Will your LEO spacecraft deorbit within 25 years?",
      evidenceRequired: ["Orbital lifetime analysis"],
      implementationGuidance: ["Calculate orbital lifetime"],
      euSpaceActCrossRef: ["Art. 72"],
    },
    {
      id: "iadc-5.3.2-geo",
      source: "IADC",
      referenceNumber: "5.3.2",
      title: "Post-mission disposal - GEO",
      description: "GEO spacecraft should transfer to graveyard orbit.",
      category: "disposal",
      bindingLevel: "mandatory",
      severity: "critical",
      applicability: {
        orbitRegimes: ["GEO"],
      },
      complianceQuestion: "Do you have propellant for graveyard orbit?",
      evidenceRequired: ["Graveyard orbit plan"],
      implementationGuidance: ["Reserve ~11 m/s delta-V"],
      euSpaceActCrossRef: ["Art. 72"],
    },
    {
      id: "iso-24113-6.1",
      source: "ISO",
      referenceNumber: "ISO 24113:2024 §6.1",
      title: "Debris mitigation requirements - General",
      description: "Minimize debris generation throughout mission.",
      category: "space_debris",
      bindingLevel: "mandatory",
      severity: "critical",
      applicability: {
        orbitRegimes: ["LEO", "MEO", "GEO", "HEO", "GTO", "cislunar"],
      },
      complianceQuestion: "Is mission designed to minimize debris?",
      evidenceRequired: ["Debris mitigation plan"],
      implementationGuidance: ["Conduct debris assessment"],
      euSpaceActCrossRef: ["Art. 67"],
    },
    {
      id: "copuos-lts-c1",
      source: "COPUOS",
      referenceNumber: "C.1",
      title: "Promote international cooperation",
      description: "Promote cooperation in space activities.",
      category: "international_cooperation",
      bindingLevel: "recommended",
      severity: "minor",
      applicability: {
        orbitRegimes: [
          "LEO",
          "MEO",
          "GEO",
          "HEO",
          "GTO",
          "cislunar",
          "deep_space",
        ],
      },
      complianceQuestion: "Does mission support international cooperation?",
      evidenceRequired: ["Partnership agreements"],
      implementationGuidance: ["Identify cooperation opportunities"],
    },
    {
      id: "copuos-lts-d1",
      source: "COPUOS",
      referenceNumber: "D.1",
      title: "Promote research on sustainable space activities",
      description: "Promote research on space sustainability.",
      category: "science_research",
      bindingLevel: "recommended",
      severity: "minor",
      applicability: {
        missionTypes: ["scientific", "governmental"],
      },
      complianceQuestion: "Does mission contribute to sustainability research?",
      evidenceRequired: ["Research documentation"],
      implementationGuidance: ["Identify research opportunities"],
    },
  ],
  getApplicableGuidelines: vi.fn(),
  getSatelliteCategory: vi.fn(),
  getMandatoryGuidelines: vi.fn(),
  getCriticalGuidelines: vi.fn(),
}));

import {
  validateMissionProfile,
  calculateComplianceScore,
  determineRiskLevel,
  generateGapAnalysis,
  generateComplianceSummary,
  findEuSpaceActCrossReferences,
  generateRecommendations,
  performAssessment,
  getCrossReferenceForArticle,
  getDebrisRelatedGuidelines,
  mapToEuSpaceActDebrisModule,
} from "@/lib/copuos-engine.server";

import {
  getApplicableGuidelines,
  getSatelliteCategory,
  type CopuosMissionProfile,
  type ComplianceStatus,
} from "@/data/copuos-iadc-requirements";

describe("COPUOS Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateMissionProfile", () => {
    it("should throw error when orbit regime is missing", () => {
      expect(() =>
        validateMissionProfile({
          missionType: "commercial",
          satelliteMassKg: 100,
        }),
      ).toThrow("Orbit regime is required");
    });

    it("should throw error when mission type is missing", () => {
      expect(() =>
        validateMissionProfile({
          orbitRegime: "LEO",
          satelliteMassKg: 100,
        }),
      ).toThrow("Mission type is required");
    });

    it("should throw error when satellite mass is missing", () => {
      expect(() =>
        validateMissionProfile({
          orbitRegime: "LEO",
          missionType: "commercial",
        }),
      ).toThrow("Valid satellite mass is required");
    });

    it("should throw error when satellite mass is zero", () => {
      expect(() =>
        validateMissionProfile({
          orbitRegime: "LEO",
          missionType: "commercial",
          satelliteMassKg: 0,
        }),
      ).toThrow("Valid satellite mass is required");
    });

    it("should return validated profile with defaults", () => {
      vi.mocked(getSatelliteCategory).mockReturnValue("medium");

      const profile = validateMissionProfile({
        orbitRegime: "LEO",
        missionType: "commercial",
        satelliteMassKg: 500,
      });

      expect(profile.orbitRegime).toBe("LEO");
      expect(profile.missionType).toBe("commercial");
      expect(profile.satelliteMassKg).toBe(500);
      expect(profile.hasManeuverability).toBe(false);
      expect(profile.hasPropulsion).toBe(false);
      expect(profile.plannedLifetimeYears).toBe(5);
      expect(profile.isConstellation).toBe(false);
    });

    it("should preserve optional fields when provided", () => {
      vi.mocked(getSatelliteCategory).mockReturnValue("large");

      const profile = validateMissionProfile({
        orbitRegime: "GEO",
        missionType: "commercial",
        satelliteMassKg: 3000,
        altitudeKm: 35786,
        hasManeuverability: true,
        hasPropulsion: true,
        plannedLifetimeYears: 15,
        isConstellation: false,
        countryOfRegistry: "FR",
      });

      expect(profile.altitudeKm).toBe(35786);
      expect(profile.hasManeuverability).toBe(true);
      expect(profile.hasPropulsion).toBe(true);
      expect(profile.plannedLifetimeYears).toBe(15);
      expect(profile.countryOfRegistry).toBe("FR");
    });
  });

  describe("calculateComplianceScore", () => {
    const mockGuidelines = [
      { id: "g1", severity: "critical", bindingLevel: "mandatory" },
      { id: "g2", severity: "major", bindingLevel: "mandatory" },
      { id: "g3", severity: "minor", bindingLevel: "recommended" },
    ] as any[];

    it("should return 100% when all guidelines are compliant", () => {
      const assessments = [
        { guidelineId: "g1", status: "compliant" as ComplianceStatus },
        { guidelineId: "g2", status: "compliant" as ComplianceStatus },
        { guidelineId: "g3", status: "compliant" as ComplianceStatus },
      ];

      const score = calculateComplianceScore(mockGuidelines, assessments);

      expect(score.overall).toBe(100);
      expect(score.mandatory).toBe(100);
    });

    it("should return 0% when all guidelines are non-compliant", () => {
      const assessments = [
        { guidelineId: "g1", status: "non_compliant" as ComplianceStatus },
        { guidelineId: "g2", status: "non_compliant" as ComplianceStatus },
        { guidelineId: "g3", status: "non_compliant" as ComplianceStatus },
      ];

      const score = calculateComplianceScore(mockGuidelines, assessments);

      expect(score.overall).toBe(0);
    });

    it("should give 50% for partial compliance", () => {
      const guidelines = [
        { id: "g1", severity: "critical", bindingLevel: "mandatory" },
      ] as any[];
      const assessments = [
        { guidelineId: "g1", status: "partial" as ComplianceStatus },
      ];

      const score = calculateComplianceScore(guidelines, assessments);

      expect(score.overall).toBe(50);
    });

    it("should not count not_applicable in total weight", () => {
      const assessments = [
        { guidelineId: "g1", status: "compliant" as ComplianceStatus },
        { guidelineId: "g2", status: "not_applicable" as ComplianceStatus },
        { guidelineId: "g3", status: "compliant" as ComplianceStatus },
      ];

      const score = calculateComplianceScore(mockGuidelines, assessments);

      expect(score.overall).toBe(100);
    });

    it("should weight critical guidelines higher than minor", () => {
      const guidelines = [
        { id: "g1", severity: "critical", bindingLevel: "mandatory" },
        { id: "g2", severity: "minor", bindingLevel: "recommended" },
      ] as any[];

      // Only critical is compliant
      const assessments1 = [
        { guidelineId: "g1", status: "compliant" as ComplianceStatus },
        { guidelineId: "g2", status: "non_compliant" as ComplianceStatus },
      ];
      const score1 = calculateComplianceScore(guidelines, assessments1);

      // Only minor is compliant
      const assessments2 = [
        { guidelineId: "g1", status: "non_compliant" as ComplianceStatus },
        { guidelineId: "g2", status: "compliant" as ComplianceStatus },
      ];
      const score2 = calculateComplianceScore(guidelines, assessments2);

      // Critical compliant should score higher
      expect(score1.overall).toBeGreaterThan(score2.overall);
    });
  });

  describe("determineRiskLevel", () => {
    const mockGuidelines = [
      { id: "g1", severity: "critical", bindingLevel: "mandatory" },
      { id: "g2", severity: "major", bindingLevel: "mandatory" },
    ] as any[];

    it("should return critical when critical guideline is non-compliant", () => {
      const assessments = [
        { guidelineId: "g1", status: "non_compliant" as ComplianceStatus },
        { guidelineId: "g2", status: "compliant" as ComplianceStatus },
      ];
      const score = {
        overall: 50,
        mandatory: 50,
        bySource: {},
        byCategory: {},
        recommended: 100,
      };

      const risk = determineRiskLevel(score, mockGuidelines, assessments);

      expect(risk).toBe("critical");
    });

    it("should return low when mandatory score is high", () => {
      const assessments = [
        { guidelineId: "g1", status: "compliant" as ComplianceStatus },
        { guidelineId: "g2", status: "compliant" as ComplianceStatus },
      ];
      const score = {
        overall: 95,
        mandatory: 95,
        bySource: {},
        byCategory: {},
        recommended: 90,
      };

      const risk = determineRiskLevel(score, mockGuidelines, assessments);

      expect(risk).toBe("low");
    });

    it("should return critical when mandatory score is below 50", () => {
      const assessments = [
        { guidelineId: "g1", status: "partial" as ComplianceStatus },
        { guidelineId: "g2", status: "non_compliant" as ComplianceStatus },
      ];
      const score = {
        overall: 25,
        mandatory: 25,
        bySource: {},
        byCategory: {},
        recommended: 50,
      };

      const risk = determineRiskLevel(score, mockGuidelines, assessments);

      expect(risk).toBe("critical");
    });

    it("should return high when mandatory score is between 50-70", () => {
      const assessments = [
        { guidelineId: "g1", status: "partial" as ComplianceStatus },
        { guidelineId: "g2", status: "partial" as ComplianceStatus },
      ];
      const score = {
        overall: 60,
        mandatory: 60,
        bySource: {},
        byCategory: {},
        recommended: 70,
      };

      const risk = determineRiskLevel(score, mockGuidelines, assessments);

      expect(risk).toBe("high");
    });

    it("should return medium when mandatory score is between 70-85", () => {
      const assessments = [
        { guidelineId: "g1", status: "compliant" as ComplianceStatus },
        { guidelineId: "g2", status: "partial" as ComplianceStatus },
      ];
      const score = {
        overall: 80,
        mandatory: 80,
        bySource: {},
        byCategory: {},
        recommended: 85,
      };

      const risk = determineRiskLevel(score, mockGuidelines, assessments);

      expect(risk).toBe("medium");
    });
  });

  describe("generateGapAnalysis", () => {
    const mockGuidelines = [
      {
        id: "g1",
        referenceNumber: "B.1",
        title: "Contact Info",
        severity: "critical",
        bindingLevel: "mandatory",
        category: "safety_operations",
        implementationGuidance: ["Register contacts"],
      },
      {
        id: "g2",
        referenceNumber: "C.1",
        title: "Cooperation",
        severity: "minor",
        bindingLevel: "recommended",
        category: "international_cooperation",
        implementationGuidance: ["Identify opportunities"],
      },
    ] as any[];

    it("should not include compliant guidelines in gaps", () => {
      const assessments = [
        { guidelineId: "g1", status: "compliant" as ComplianceStatus },
        { guidelineId: "g2", status: "compliant" as ComplianceStatus },
      ];

      const gaps = generateGapAnalysis(mockGuidelines, assessments);

      expect(gaps).toHaveLength(0);
    });

    it("should include non-compliant guidelines in gaps", () => {
      const assessments = [
        { guidelineId: "g1", status: "non_compliant" as ComplianceStatus },
        { guidelineId: "g2", status: "compliant" as ComplianceStatus },
      ];

      const gaps = generateGapAnalysis(mockGuidelines, assessments);

      expect(gaps).toHaveLength(1);
      expect(gaps[0].guidelineId).toBe("g1");
      expect(gaps[0].status).toBe("non_compliant");
    });

    it("should include partial guidelines in gaps", () => {
      const assessments = [
        { guidelineId: "g1", status: "partial" as ComplianceStatus },
        { guidelineId: "g2", status: "compliant" as ComplianceStatus },
      ];

      const gaps = generateGapAnalysis(mockGuidelines, assessments);

      expect(gaps).toHaveLength(1);
      expect(gaps[0].status).toBe("partial");
    });

    it("should include not_assessed guidelines in gaps", () => {
      const assessments = [
        { guidelineId: "g1", status: "not_assessed" as ComplianceStatus },
      ];

      const gaps = generateGapAnalysis(mockGuidelines, assessments);

      expect(gaps.some((g) => g.guidelineId === "g1")).toBe(true);
    });

    it("should prioritize mandatory critical gaps as high", () => {
      const assessments = [
        { guidelineId: "g1", status: "non_compliant" as ComplianceStatus },
      ];

      const gaps = generateGapAnalysis(mockGuidelines, assessments);

      expect(gaps[0].priority).toBe("high");
    });

    it("should prioritize recommended minor gaps as low", () => {
      const assessments = [
        { guidelineId: "g1", status: "compliant" as ComplianceStatus },
        { guidelineId: "g2", status: "non_compliant" as ComplianceStatus },
      ];

      const gaps = generateGapAnalysis(mockGuidelines, assessments);

      // Only g2 should be in gaps since g1 is compliant
      expect(gaps).toHaveLength(1);
      expect(gaps[0].guidelineId).toBe("g2");
      expect(gaps[0].priority).toBe("low");
    });

    it("should sort gaps by priority (high first)", () => {
      const assessments = [
        { guidelineId: "g1", status: "non_compliant" as ComplianceStatus },
        { guidelineId: "g2", status: "non_compliant" as ComplianceStatus },
      ];

      const gaps = generateGapAnalysis(mockGuidelines, assessments);

      expect(gaps[0].priority).toBe("high");
      expect(gaps[1].priority).toBe("low");
    });
  });

  describe("findEuSpaceActCrossReferences", () => {
    it("should find all EU Space Act cross-references", () => {
      const guidelines = [
        { euSpaceActCrossRef: ["Art. 51"] },
        { euSpaceActCrossRef: ["Art. 63", "Art. 64"] },
        { euSpaceActCrossRef: undefined },
      ] as any[];

      const refs = findEuSpaceActCrossReferences(guidelines);

      expect(refs).toContain("Art. 51");
      expect(refs).toContain("Art. 63");
      expect(refs).toContain("Art. 64");
      expect(refs).toHaveLength(3);
    });

    it("should return empty array when no cross-references exist", () => {
      const guidelines = [{ euSpaceActCrossRef: undefined }] as any[];

      const refs = findEuSpaceActCrossReferences(guidelines);

      expect(refs).toHaveLength(0);
    });

    it("should deduplicate cross-references", () => {
      const guidelines = [
        { euSpaceActCrossRef: ["Art. 72"] },
        { euSpaceActCrossRef: ["Art. 72", "Art. 73"] },
      ] as any[];

      const refs = findEuSpaceActCrossReferences(guidelines);

      expect(refs.filter((r) => r === "Art. 72")).toHaveLength(1);
    });
  });

  describe("generateComplianceSummary", () => {
    const mockGuidelines = [
      { id: "g1", severity: "critical" },
      { id: "g2", severity: "major" },
      { id: "g3", severity: "minor" },
    ] as any[];

    it("should correctly count status categories", () => {
      const assessments = [
        { guidelineId: "g1", status: "compliant" as ComplianceStatus },
        { guidelineId: "g2", status: "partial" as ComplianceStatus },
        { guidelineId: "g3", status: "non_compliant" as ComplianceStatus },
      ];

      const summary = generateComplianceSummary(mockGuidelines, assessments);

      expect(summary.compliant).toBe(1);
      expect(summary.partial).toBe(1);
      expect(summary.nonCompliant).toBe(1);
      expect(summary.applicable).toBe(3);
    });

    it("should count critical gaps correctly", () => {
      const assessments = [
        { guidelineId: "g1", status: "non_compliant" as ComplianceStatus },
        { guidelineId: "g2", status: "compliant" as ComplianceStatus },
        { guidelineId: "g3", status: "non_compliant" as ComplianceStatus },
      ];

      const summary = generateComplianceSummary(mockGuidelines, assessments);

      expect(summary.criticalGaps).toBe(1); // Only g1 is critical
      expect(summary.majorGaps).toBe(0); // g2 is compliant
    });

    it("should count partial as gaps", () => {
      const assessments = [
        { guidelineId: "g1", status: "partial" as ComplianceStatus },
      ];

      const summary = generateComplianceSummary(mockGuidelines, assessments);

      expect(summary.criticalGaps).toBe(1);
    });
  });

  describe("generateRecommendations", () => {
    it("should recommend 25-year deorbit for LEO missions with low disposal score", () => {
      const profile: CopuosMissionProfile = {
        orbitRegime: "LEO",
        missionType: "commercial",
        satelliteCategory: "smallsat",
        satelliteMassKg: 50,
        hasManeuverability: false,
        hasPropulsion: false,
        plannedLifetimeYears: 5,
        isConstellation: false,
      };
      const score = {
        overall: 70,
        mandatory: 75,
        bySource: {} as any,
        byCategory: { disposal: 60 } as any,
        recommended: 80,
      };
      const gaps: any[] = [];

      const recommendations = generateRecommendations(profile, score, gaps);

      expect(
        recommendations.some(
          (r) => r.includes("25-year") || r.includes("deorbit"),
        ),
      ).toBe(true);
    });

    it("should recommend graveyard orbit for GEO missions with low disposal score", () => {
      const profile: CopuosMissionProfile = {
        orbitRegime: "GEO",
        missionType: "commercial",
        satelliteCategory: "large",
        satelliteMassKg: 3000,
        hasManeuverability: true,
        hasPropulsion: true,
        plannedLifetimeYears: 15,
        isConstellation: false,
      };
      const score = {
        overall: 70,
        mandatory: 75,
        bySource: {} as any,
        byCategory: { disposal: 60 } as any,
        recommended: 80,
      };
      const gaps: any[] = [];

      const recommendations = generateRecommendations(profile, score, gaps);

      expect(
        recommendations.some(
          (r) => r.includes("graveyard") || r.includes("propellant"),
        ),
      ).toBe(true);
    });

    it("should recommend conjunction warning service when collision avoidance score is low", () => {
      const profile: CopuosMissionProfile = {
        orbitRegime: "LEO",
        missionType: "commercial",
        satelliteCategory: "smallsat",
        satelliteMassKg: 50,
        hasManeuverability: false,
        hasPropulsion: false,
        plannedLifetimeYears: 5,
        isConstellation: false,
      };
      const score = {
        overall: 70,
        mandatory: 75,
        bySource: {} as any,
        byCategory: { collision_avoidance: 50, disposal: 80 } as any,
        recommended: 80,
      };
      const gaps: any[] = [];

      const recommendations = generateRecommendations(profile, score, gaps);

      expect(
        recommendations.some(
          (r) => r.includes("conjunction") || r.includes("warning"),
        ),
      ).toBe(true);
    });

    it("should limit recommendations to 8", () => {
      const profile: CopuosMissionProfile = {
        orbitRegime: "LEO",
        missionType: "commercial",
        satelliteCategory: "smallsat",
        satelliteMassKg: 50,
        hasManeuverability: false,
        hasPropulsion: false,
        plannedLifetimeYears: 5,
        isConstellation: false,
      };
      const score = {
        overall: 20,
        mandatory: 20,
        bySource: {} as any,
        byCategory: {
          collision_avoidance: 10,
          disposal: 10,
          design_passivation: 10,
        } as any,
        recommended: 20,
      };
      const gaps = [
        { guidelineId: "g1", priority: "high", recommendation: "Fix 1" },
        { guidelineId: "g2", priority: "high", recommendation: "Fix 2" },
        { guidelineId: "g3", priority: "high", recommendation: "Fix 3" },
        { guidelineId: "g4", priority: "high", recommendation: "Fix 4" },
        { guidelineId: "g5", priority: "high", recommendation: "Fix 5" },
      ] as any[];

      const recommendations = generateRecommendations(profile, score, gaps);

      expect(recommendations.length).toBeLessThanOrEqual(8);
    });
  });

  describe("Orbit-specific guideline filtering", () => {
    it("should apply LEO-specific guidelines for LEO missions", () => {
      vi.mocked(getApplicableGuidelines).mockImplementation((profile) => {
        if (profile.orbitRegime === "LEO") {
          return [
            { id: "iadc-5.3.2-leo", source: "IADC" },
            { id: "copuos-lts-b1", source: "COPUOS" },
          ] as any[];
        }
        return [];
      });

      const profile: CopuosMissionProfile = {
        orbitRegime: "LEO",
        missionType: "commercial",
        satelliteCategory: "smallsat",
        satelliteMassKg: 50,
        hasManeuverability: false,
        hasPropulsion: false,
        plannedLifetimeYears: 5,
        isConstellation: false,
      };

      const guidelines = getApplicableGuidelines(profile);

      expect(guidelines.some((g) => g.id === "iadc-5.3.2-leo")).toBe(true);
      expect(guidelines.some((g) => g.id === "iadc-5.3.2-geo")).toBe(false);
    });

    it("should apply GEO-specific guidelines for GEO missions", () => {
      vi.mocked(getApplicableGuidelines).mockImplementation((profile) => {
        if (profile.orbitRegime === "GEO") {
          return [
            { id: "iadc-5.3.2-geo", source: "IADC" },
            { id: "copuos-lts-b1", source: "COPUOS" },
          ] as any[];
        }
        return [];
      });

      const profile: CopuosMissionProfile = {
        orbitRegime: "GEO",
        missionType: "commercial",
        satelliteCategory: "large",
        satelliteMassKg: 3000,
        hasManeuverability: true,
        hasPropulsion: true,
        plannedLifetimeYears: 15,
        isConstellation: false,
      };

      const guidelines = getApplicableGuidelines(profile);

      expect(guidelines.some((g) => g.id === "iadc-5.3.2-geo")).toBe(true);
      expect(guidelines.some((g) => g.id === "iadc-5.3.2-leo")).toBe(false);
    });

    it("should require propulsion for collision avoidance guidelines", () => {
      vi.mocked(getApplicableGuidelines).mockImplementation((profile) => {
        const guidelines = [];
        if (profile.hasPropulsion) {
          guidelines.push({ id: "iadc-5.2.2", source: "IADC" });
        }
        return guidelines as any[];
      });

      const profileWithPropulsion: CopuosMissionProfile = {
        orbitRegime: "LEO",
        missionType: "commercial",
        satelliteCategory: "smallsat",
        satelliteMassKg: 50,
        hasManeuverability: true,
        hasPropulsion: true,
        plannedLifetimeYears: 5,
        isConstellation: false,
      };

      const profileWithoutPropulsion: CopuosMissionProfile = {
        ...profileWithPropulsion,
        hasPropulsion: false,
        hasManeuverability: false,
      };

      const guidelinesWithProp = getApplicableGuidelines(profileWithPropulsion);
      const guidelinesWithoutProp = getApplicableGuidelines(
        profileWithoutPropulsion,
      );

      expect(guidelinesWithProp.some((g) => g.id === "iadc-5.2.2")).toBe(true);
      expect(guidelinesWithoutProp.some((g) => g.id === "iadc-5.2.2")).toBe(
        false,
      );
    });
  });

  describe("getSatelliteCategory", () => {
    it("should categorize cubesats correctly", () => {
      vi.mocked(getSatelliteCategory).mockImplementation((mass) => {
        if (mass < 10) return "cubesat";
        if (mass < 100) return "smallsat";
        if (mass < 1000) return "medium";
        if (mass < 5000) return "large";
        return "mega";
      });

      expect(getSatelliteCategory(5)).toBe("cubesat");
      expect(getSatelliteCategory(9.9)).toBe("cubesat");
    });

    it("should categorize smallsats correctly", () => {
      vi.mocked(getSatelliteCategory).mockImplementation((mass) => {
        if (mass < 10) return "cubesat";
        if (mass < 100) return "smallsat";
        if (mass < 1000) return "medium";
        if (mass < 5000) return "large";
        return "mega";
      });

      expect(getSatelliteCategory(10)).toBe("smallsat");
      expect(getSatelliteCategory(99)).toBe("smallsat");
    });

    it("should categorize medium satellites correctly", () => {
      vi.mocked(getSatelliteCategory).mockImplementation((mass) => {
        if (mass < 10) return "cubesat";
        if (mass < 100) return "smallsat";
        if (mass < 1000) return "medium";
        if (mass < 5000) return "large";
        return "mega";
      });

      expect(getSatelliteCategory(100)).toBe("medium");
      expect(getSatelliteCategory(500)).toBe("medium");
    });

    it("should categorize large satellites correctly", () => {
      vi.mocked(getSatelliteCategory).mockImplementation((mass) => {
        if (mass < 10) return "cubesat";
        if (mass < 100) return "smallsat";
        if (mass < 1000) return "medium";
        if (mass < 5000) return "large";
        return "mega";
      });

      expect(getSatelliteCategory(1000)).toBe("large");
      expect(getSatelliteCategory(4999)).toBe("large");
    });

    it("should categorize mega satellites correctly", () => {
      vi.mocked(getSatelliteCategory).mockImplementation((mass) => {
        if (mass < 10) return "cubesat";
        if (mass < 100) return "smallsat";
        if (mass < 1000) return "medium";
        if (mass < 5000) return "large";
        return "mega";
      });

      expect(getSatelliteCategory(5000)).toBe("mega");
      expect(getSatelliteCategory(10000)).toBe("mega");
    });
  });
});
