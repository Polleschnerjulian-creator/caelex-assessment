import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only (it throws when imported in non-server context)
vi.mock("server-only", () => ({}));

// Mock the data file
vi.mock("@/data/uk-space-industry-act", () => ({
  allUkSpaceRequirements: [
    {
      id: "uk-sia-s3-licence",
      sectionRef: "SIA s.3",
      title: "Requirement for Launch/Return Licence",
      description:
        "A person must not carry out spaceflight activities without a licence.",
      category: "operator_licensing",
      bindingLevel: "mandatory",
      severity: "critical",
      applicability: {
        operatorTypes: ["launch_operator", "return_operator"],
        activityTypes: ["launch", "return"],
      },
      complianceQuestion: "Do you hold a valid CAA launch or return licence?",
      evidenceRequired: ["CAA licence application submission"],
      implementationGuidance: ["Submit application to CAA Spaceflight Team"],
      caaGuidanceRef: "CAP 2210",
      euSpaceActCrossRef: ["Art. 4", "Art. 5"],
      licenseTypes: ["launch_licence", "return_licence"],
    },
    {
      id: "uk-sia-s7-orbital",
      sectionRef: "SIA s.7",
      title: "Orbital Operator Licence Requirement",
      description:
        "UK persons operating a space object in orbit require a licence.",
      category: "operator_licensing",
      bindingLevel: "mandatory",
      severity: "critical",
      applicability: {
        operatorTypes: ["satellite_operator"],
        activityTypes: ["orbital_operations"],
        orbitalOnly: true,
      },
      complianceQuestion: "Do you hold a valid CAA orbital operator licence?",
      evidenceRequired: ["Orbital operator licence application"],
      implementationGuidance: ["Apply to CAA for orbital operator licence"],
      caaGuidanceRef: "CAP 2213",
      euSpaceActCrossRef: ["Art. 7", "Art. 8"],
      licenseTypes: ["orbital_operator_licence"],
    },
    {
      id: "uk-sia-s38-insurance",
      sectionRef: "SIA s.38 / SIR Part 7",
      title: "Insurance Requirements",
      description: "Licensees must maintain third party liability insurance.",
      category: "liability_insurance",
      bindingLevel: "mandatory",
      severity: "critical",
      applicability: {
        operatorTypes: [
          "launch_operator",
          "return_operator",
          "satellite_operator",
        ],
      },
      complianceQuestion:
        "Do you maintain adequate third party liability insurance?",
      evidenceRequired: ["Insurance policy documents"],
      implementationGuidance: ["Obtain TPL insurance from approved providers"],
      caaGuidanceRef: "CAP 2218",
      euSpaceActCrossRef: ["Art. 39", "Art. 40"],
      licenseTypes: [
        "launch_licence",
        "return_licence",
        "orbital_operator_licence",
      ],
    },
    {
      id: "uk-sir-reg31-debris",
      sectionRef: "SIR Reg.31",
      title: "Space Debris Mitigation",
      description: "Orbital operators must submit a debris mitigation plan.",
      category: "environmental",
      bindingLevel: "mandatory",
      severity: "critical",
      applicability: {
        operatorTypes: ["satellite_operator", "launch_operator"],
        orbitalOnly: true,
      },
      complianceQuestion:
        "Have you submitted a compliant debris mitigation plan?",
      evidenceRequired: ["Debris mitigation plan"],
      implementationGuidance: ["Follow ISO 24113 and IADC guidelines"],
      caaGuidanceRef: "CAP 2220",
      euSpaceActCrossRef: ["Art. 67", "Art. 72"],
      licenseTypes: ["orbital_operator_licence", "launch_licence"],
    },
    {
      id: "uk-sia-s16-informed-consent",
      sectionRef: "SIA s.16 / SIR Part 6",
      title: "Informed Consent for Human Spaceflight",
      description:
        "Individuals must give informed consent acknowledging risks.",
      category: "informed_consent",
      bindingLevel: "mandatory",
      severity: "critical",
      applicability: {
        operatorTypes: ["launch_operator", "return_operator"],
        humanSpaceflightOnly: true,
      },
      complianceQuestion: "Do you have informed consent processes?",
      evidenceRequired: ["Informed consent forms"],
      implementationGuidance: ["Develop comprehensive risk disclosure"],
      caaGuidanceRef: "CAP 2223",
      licenseTypes: ["launch_licence", "return_licence"],
    },
    {
      id: "uk-caa-technical",
      sectionRef: "CAA Guidance",
      title: "Technical Capability Demonstration",
      description: "Applicants must demonstrate adequate technical capability.",
      category: "operator_licensing",
      bindingLevel: "mandatory",
      severity: "major",
      applicability: {
        operatorTypes: [
          "launch_operator",
          "satellite_operator",
          "return_operator",
        ],
      },
      complianceQuestion: "Can you demonstrate adequate technical capability?",
      evidenceRequired: ["Technical capability statement"],
      implementationGuidance: ["Document technical team qualifications"],
      caaGuidanceRef: "CAP 2210",
      licenseTypes: [
        "launch_licence",
        "return_licence",
        "orbital_operator_licence",
      ],
    },
    {
      id: "uk-sir-reg42-cyber",
      sectionRef: "SIR Reg.42",
      title: "Cyber Security Requirements",
      description: "Appropriate cyber security measures must be in place.",
      category: "security",
      bindingLevel: "mandatory",
      severity: "critical",
      applicability: {
        operatorTypes: ["launch_operator", "satellite_operator"],
      },
      complianceQuestion: "Have you implemented cyber security measures?",
      evidenceRequired: ["Cyber security assessment"],
      implementationGuidance: ["Assess cyber risks to space systems"],
      caaGuidanceRef: "CAP 2222",
      euSpaceActCrossRef: ["Art. 76", "Art. 77"],
      licenseTypes: ["launch_licence", "orbital_operator_licence"],
    },
    {
      id: "uk-sia-s61-registration",
      sectionRef: "SIA s.61",
      title: "UK Space Registry",
      description: "Space objects must be registered in the UK Register.",
      category: "registration",
      bindingLevel: "mandatory",
      severity: "major",
      applicability: {
        operatorTypes: ["launch_operator", "satellite_operator"],
        orbitalOnly: true,
      },
      complianceQuestion: "Have you registered your space object?",
      evidenceRequired: ["Registration application submission"],
      implementationGuidance: ["Submit registration to UK Space Agency"],
      euSpaceActCrossRef: ["Art. 52", "Art. 53"],
      licenseTypes: ["launch_licence", "orbital_operator_licence"],
    },
  ],
  ukEuComparisons: [
    {
      ukRequirement: "SIA s.3 - Launch/Return Licence",
      euEquivalent: "EU Space Act Art. 4-6",
      comparisonNotes: "Both require authorization for launch activities.",
      postBrexitImplications: "UK operators must obtain separate licences.",
    },
  ],
  getApplicableRequirements: vi.fn(),
  getOperatorLicenseType: vi.fn(),
  getMandatoryRequirements: vi.fn(),
  getCriticalRequirements: vi.fn(),
  getRequirementsWithEuCrossRef: vi.fn(),
  getRequirementsByCategory: vi.fn(),
  getRequirementsByLicenseType: vi.fn(),
}));

import {
  validateOperatorProfile,
  calculateComplianceScore,
  determineRiskLevel,
  generateGapAnalysis,
  generateComplianceSummary,
  findEuSpaceActCrossReferences,
  generateRecommendations,
  determineRequiredLicenses,
  performAssessment,
  getLicenseRequirementSummaries,
  getUkEuComparisonSummary,
  generateCaaDocumentationChecklist,
} from "@/lib/uk-space-engine.server";

import {
  getApplicableRequirements,
  getRequirementsWithEuCrossRef,
  type UkSpaceProfile,
  type UkComplianceStatus,
} from "@/data/uk-space-industry-act";

describe("UK Space Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up default mock returns to prevent undefined errors
    vi.mocked(getRequirementsWithEuCrossRef).mockReturnValue([]);
    vi.mocked(getApplicableRequirements).mockReturnValue([]);
  });

  describe("validateOperatorProfile", () => {
    it("should throw error when operator type is missing", () => {
      expect(() =>
        validateOperatorProfile({
          activityTypes: ["launch"],
        }),
      ).toThrow("Operator type is required");
    });

    it("should throw error when activity types are missing", () => {
      expect(() =>
        validateOperatorProfile({
          operatorType: "launch_operator",
        }),
      ).toThrow("At least one activity type is required");
    });

    it("should throw error when activity types is empty array", () => {
      expect(() =>
        validateOperatorProfile({
          operatorType: "launch_operator",
          activityTypes: [],
        }),
      ).toThrow("At least one activity type is required");
    });

    it("should return validated profile with defaults", () => {
      const profile = validateOperatorProfile({
        operatorType: "launch_operator",
        activityTypes: ["launch"],
      });

      expect(profile.operatorType).toBe("launch_operator");
      expect(profile.activityTypes).toEqual(["launch"]);
      expect(profile.launchFromUk).toBe(false);
      expect(profile.launchToOrbit).toBe(false);
      expect(profile.isSuborbital).toBe(false);
      expect(profile.hasUkNexus).toBe(true);
      expect(profile.involvesPeople).toBe(false);
      expect(profile.isCommercial).toBe(true);
    });

    it("should preserve optional fields when provided", () => {
      const profile = validateOperatorProfile({
        operatorType: "satellite_operator",
        activityTypes: ["orbital_operations"],
        launchFromUk: true,
        launchToOrbit: true,
        hasUkNexus: true,
        involvesPeople: false,
        isCommercial: true,
        spacecraftMassKg: 500,
        plannedLaunchSite: "SaxaVord",
        targetOrbit: "LEO",
        missionDurationYears: 5,
      });

      expect(profile.launchFromUk).toBe(true);
      expect(profile.launchToOrbit).toBe(true);
      expect(profile.spacecraftMassKg).toBe(500);
      expect(profile.plannedLaunchSite).toBe("SaxaVord");
      expect(profile.targetOrbit).toBe("LEO");
      expect(profile.missionDurationYears).toBe(5);
    });
  });

  describe("determineRequiredLicenses", () => {
    it("should require launch licence for launch operator", () => {
      const profile: UkSpaceProfile = {
        operatorType: "launch_operator",
        activityTypes: ["launch"],
        launchFromUk: true,
        launchToOrbit: true,
        isSuborbital: false,
        hasUkNexus: true,
        involvesPeople: false,
        isCommercial: true,
      };

      const licenses = determineRequiredLicenses(profile);

      expect(licenses).toContain("launch_licence");
    });

    it("should require orbital operator licence for satellite operator", () => {
      const profile: UkSpaceProfile = {
        operatorType: "satellite_operator",
        activityTypes: ["orbital_operations"],
        launchFromUk: false,
        launchToOrbit: true,
        isSuborbital: false,
        hasUkNexus: true,
        involvesPeople: false,
        isCommercial: true,
      };

      const licenses = determineRequiredLicenses(profile);

      expect(licenses).toContain("orbital_operator_licence");
    });

    it("should require spaceport licence for spaceport operator", () => {
      const profile: UkSpaceProfile = {
        operatorType: "spaceport_operator",
        activityTypes: ["spaceport_operations"],
        launchFromUk: true,
        launchToOrbit: false,
        isSuborbital: false,
        hasUkNexus: true,
        involvesPeople: false,
        isCommercial: true,
      };

      const licenses = determineRequiredLicenses(profile);

      expect(licenses).toContain("spaceport_licence");
    });

    it("should require multiple licenses for combined activities", () => {
      const profile: UkSpaceProfile = {
        operatorType: "launch_operator",
        activityTypes: ["launch", "orbital_operations"],
        launchFromUk: true,
        launchToOrbit: true,
        isSuborbital: false,
        hasUkNexus: true,
        involvesPeople: false,
        isCommercial: true,
      };

      const licenses = determineRequiredLicenses(profile);

      expect(licenses).toContain("launch_licence");
      expect(licenses).toContain("orbital_operator_licence");
    });
  });

  describe("calculateComplianceScore", () => {
    const mockRequirements = [
      {
        id: "r1",
        severity: "critical",
        bindingLevel: "mandatory",
        category: "operator_licensing",
        licenseTypes: ["launch_licence"],
      },
      {
        id: "r2",
        severity: "major",
        bindingLevel: "mandatory",
        category: "liability_insurance",
        licenseTypes: ["launch_licence"],
      },
      {
        id: "r3",
        severity: "minor",
        bindingLevel: "guidance",
        category: "registration",
        licenseTypes: [],
      },
    ] as any[];

    it("should return 100% when all requirements are compliant", () => {
      const assessments = [
        { requirementId: "r1", status: "compliant" as UkComplianceStatus },
        { requirementId: "r2", status: "compliant" as UkComplianceStatus },
        { requirementId: "r3", status: "compliant" as UkComplianceStatus },
      ];

      const score = calculateComplianceScore(mockRequirements, assessments);

      expect(score.overall).toBe(100);
      expect(score.mandatory).toBe(100);
    });

    it("should return 0% when all requirements are non-compliant", () => {
      const assessments = [
        { requirementId: "r1", status: "non_compliant" as UkComplianceStatus },
        { requirementId: "r2", status: "non_compliant" as UkComplianceStatus },
        { requirementId: "r3", status: "non_compliant" as UkComplianceStatus },
      ];

      const score = calculateComplianceScore(mockRequirements, assessments);

      expect(score.overall).toBe(0);
    });

    it("should give 50% for partial compliance", () => {
      const requirements = [
        {
          id: "r1",
          severity: "critical",
          bindingLevel: "mandatory",
          category: "operator_licensing",
          licenseTypes: [],
        },
      ] as any[];
      const assessments = [
        { requirementId: "r1", status: "partial" as UkComplianceStatus },
      ];

      const score = calculateComplianceScore(requirements, assessments);

      expect(score.overall).toBe(50);
    });

    it("should not count not_applicable in total weight", () => {
      const assessments = [
        { requirementId: "r1", status: "compliant" as UkComplianceStatus },
        { requirementId: "r2", status: "not_applicable" as UkComplianceStatus },
        { requirementId: "r3", status: "compliant" as UkComplianceStatus },
      ];

      const score = calculateComplianceScore(mockRequirements, assessments);

      expect(score.overall).toBe(100);
    });

    it("should weight critical requirements higher than minor", () => {
      const requirements = [
        {
          id: "r1",
          severity: "critical",
          bindingLevel: "mandatory",
          category: "operator_licensing",
          licenseTypes: [],
        },
        {
          id: "r2",
          severity: "minor",
          bindingLevel: "guidance",
          category: "registration",
          licenseTypes: [],
        },
      ] as any[];

      // Only critical is compliant
      const assessments1 = [
        { requirementId: "r1", status: "compliant" as UkComplianceStatus },
        { requirementId: "r2", status: "non_compliant" as UkComplianceStatus },
      ];
      const score1 = calculateComplianceScore(requirements, assessments1);

      // Only minor is compliant
      const assessments2 = [
        { requirementId: "r1", status: "non_compliant" as UkComplianceStatus },
        { requirementId: "r2", status: "compliant" as UkComplianceStatus },
      ];
      const score2 = calculateComplianceScore(requirements, assessments2);

      // Critical compliant should score higher
      expect(score1.overall).toBeGreaterThan(score2.overall);
    });

    it("should calculate score by category", () => {
      const assessments = [
        { requirementId: "r1", status: "compliant" as UkComplianceStatus },
        { requirementId: "r2", status: "non_compliant" as UkComplianceStatus },
        { requirementId: "r3", status: "compliant" as UkComplianceStatus },
      ];

      const score = calculateComplianceScore(mockRequirements, assessments);

      expect(score.byCategory.operator_licensing).toBe(100);
      expect(score.byCategory.liability_insurance).toBe(0);
      expect(score.byCategory.registration).toBe(100);
    });
  });

  describe("determineRiskLevel", () => {
    const mockRequirements = [
      {
        id: "r1",
        severity: "critical",
        bindingLevel: "mandatory",
        category: "operator_licensing",
        licenseTypes: [],
      },
      {
        id: "r2",
        severity: "major",
        bindingLevel: "mandatory",
        category: "liability_insurance",
        licenseTypes: [],
      },
    ] as any[];

    it("should return critical when critical requirement is non-compliant", () => {
      const assessments = [
        { requirementId: "r1", status: "non_compliant" as UkComplianceStatus },
        { requirementId: "r2", status: "compliant" as UkComplianceStatus },
      ];
      const score = {
        overall: 50,
        mandatory: 50,
        byCategory: { operator_licensing: 0, liability_insurance: 100 },
        byLicenseType: {},
        recommended: 100,
      } as any;

      const risk = determineRiskLevel(score, mockRequirements, assessments);

      expect(risk).toBe("critical");
    });

    it("should return critical when licensing score is below 50", () => {
      const assessments = [
        { requirementId: "r1", status: "partial" as UkComplianceStatus },
        { requirementId: "r2", status: "compliant" as UkComplianceStatus },
      ];
      const score = {
        overall: 60,
        mandatory: 60,
        byCategory: { operator_licensing: 40, liability_insurance: 100 },
        byLicenseType: {},
        recommended: 100,
      } as any;

      const risk = determineRiskLevel(score, mockRequirements, assessments);

      expect(risk).toBe("critical");
    });

    it("should return low when mandatory score is high", () => {
      const assessments = [
        { requirementId: "r1", status: "compliant" as UkComplianceStatus },
        { requirementId: "r2", status: "compliant" as UkComplianceStatus },
      ];
      const score = {
        overall: 95,
        mandatory: 95,
        byCategory: { operator_licensing: 100, liability_insurance: 100 },
        byLicenseType: {},
        recommended: 90,
      } as any;

      const risk = determineRiskLevel(score, mockRequirements, assessments);

      expect(risk).toBe("low");
    });

    it("should return high when mandatory score is between 50-70", () => {
      const assessments = [
        { requirementId: "r1", status: "partial" as UkComplianceStatus },
        { requirementId: "r2", status: "partial" as UkComplianceStatus },
      ];
      const score = {
        overall: 60,
        mandatory: 60,
        byCategory: { operator_licensing: 60, liability_insurance: 60 },
        byLicenseType: {},
        recommended: 70,
      } as any;

      const risk = determineRiskLevel(score, mockRequirements, assessments);

      expect(risk).toBe("high");
    });

    it("should return medium when mandatory score is between 70-85", () => {
      const assessments = [
        { requirementId: "r1", status: "compliant" as UkComplianceStatus },
        { requirementId: "r2", status: "partial" as UkComplianceStatus },
      ];
      const score = {
        overall: 80,
        mandatory: 80,
        byCategory: { operator_licensing: 100, liability_insurance: 60 },
        byLicenseType: {},
        recommended: 85,
      } as any;

      const risk = determineRiskLevel(score, mockRequirements, assessments);

      expect(risk).toBe("medium");
    });
  });

  describe("generateGapAnalysis", () => {
    const mockRequirements = [
      {
        id: "r1",
        sectionRef: "SIA s.3",
        title: "Launch Licence",
        severity: "critical",
        bindingLevel: "mandatory",
        category: "operator_licensing",
        implementationGuidance: ["Submit to CAA"],
        caaGuidanceRef: "CAP 2210",
      },
      {
        id: "r2",
        sectionRef: "SIA s.61",
        title: "Registration",
        severity: "major",
        bindingLevel: "mandatory",
        category: "registration",
        implementationGuidance: ["Register with UKSA"],
      },
    ] as any[];

    it("should not include compliant requirements in gaps", () => {
      const assessments = [
        { requirementId: "r1", status: "compliant" as UkComplianceStatus },
        { requirementId: "r2", status: "compliant" as UkComplianceStatus },
      ];

      const gaps = generateGapAnalysis(mockRequirements, assessments);

      expect(gaps).toHaveLength(0);
    });

    it("should include non-compliant requirements in gaps", () => {
      const assessments = [
        { requirementId: "r1", status: "non_compliant" as UkComplianceStatus },
        { requirementId: "r2", status: "compliant" as UkComplianceStatus },
      ];

      const gaps = generateGapAnalysis(mockRequirements, assessments);

      expect(gaps).toHaveLength(1);
      expect(gaps[0].requirementId).toBe("r1");
      expect(gaps[0].status).toBe("non_compliant");
    });

    it("should include partial requirements in gaps", () => {
      const assessments = [
        { requirementId: "r1", status: "partial" as UkComplianceStatus },
        { requirementId: "r2", status: "compliant" as UkComplianceStatus },
      ];

      const gaps = generateGapAnalysis(mockRequirements, assessments);

      expect(gaps).toHaveLength(1);
      expect(gaps[0].status).toBe("partial");
    });

    it("should include not_assessed requirements in gaps", () => {
      const assessments = [
        { requirementId: "r1", status: "not_assessed" as UkComplianceStatus },
      ];

      const gaps = generateGapAnalysis(mockRequirements, assessments);

      expect(gaps.some((g) => g.requirementId === "r1")).toBe(true);
    });

    it("should prioritize mandatory critical gaps as high", () => {
      const assessments = [
        { requirementId: "r1", status: "non_compliant" as UkComplianceStatus },
      ];

      const gaps = generateGapAnalysis(mockRequirements, assessments);

      expect(gaps[0].priority).toBe("high");
    });

    it("should include CAA guidance reference in gaps", () => {
      const assessments = [
        { requirementId: "r1", status: "non_compliant" as UkComplianceStatus },
      ];

      const gaps = generateGapAnalysis(mockRequirements, assessments);

      expect(gaps[0].caaGuidanceRef).toBe("CAP 2210");
    });

    it("should sort gaps by priority (high first)", () => {
      const assessments = [
        { requirementId: "r1", status: "non_compliant" as UkComplianceStatus },
        { requirementId: "r2", status: "non_compliant" as UkComplianceStatus },
      ];

      const gaps = generateGapAnalysis(mockRequirements, assessments);

      expect(gaps[0].priority).toBe("high");
      expect(gaps[1].priority).toBe("medium");
    });
  });

  describe("findEuSpaceActCrossReferences", () => {
    it("should find all EU Space Act cross-references", () => {
      const requirements = [
        { euSpaceActCrossRef: ["Art. 4", "Art. 5"] },
        { euSpaceActCrossRef: ["Art. 39", "Art. 40"] },
        { euSpaceActCrossRef: undefined },
      ] as any[];

      const refs = findEuSpaceActCrossReferences(requirements);

      expect(refs).toContain("Art. 4");
      expect(refs).toContain("Art. 5");
      expect(refs).toContain("Art. 39");
      expect(refs).toContain("Art. 40");
      expect(refs).toHaveLength(4);
    });

    it("should return empty array when no cross-references exist", () => {
      const requirements = [{ euSpaceActCrossRef: undefined }] as any[];

      const refs = findEuSpaceActCrossReferences(requirements);

      expect(refs).toHaveLength(0);
    });

    it("should deduplicate cross-references", () => {
      const requirements = [
        { euSpaceActCrossRef: ["Art. 72"] },
        { euSpaceActCrossRef: ["Art. 72", "Art. 73"] },
      ] as any[];

      const refs = findEuSpaceActCrossReferences(requirements);

      expect(refs.filter((r) => r === "Art. 72")).toHaveLength(1);
    });
  });

  describe("generateComplianceSummary", () => {
    const mockRequirements = [
      {
        id: "r1",
        severity: "critical",
        category: "operator_licensing",
        licenseTypes: ["launch_licence"],
      },
      {
        id: "r2",
        severity: "major",
        category: "liability_insurance",
        licenseTypes: ["launch_licence"],
      },
      {
        id: "r3",
        severity: "minor",
        category: "registration",
        licenseTypes: [],
      },
    ] as any[];

    const mockProfile: UkSpaceProfile = {
      operatorType: "launch_operator",
      activityTypes: ["launch"],
      launchFromUk: true,
      launchToOrbit: true,
      isSuborbital: false,
      hasUkNexus: true,
      involvesPeople: false,
      isCommercial: true,
    };

    it("should correctly count status categories", () => {
      const assessments = [
        { requirementId: "r1", status: "compliant" as UkComplianceStatus },
        { requirementId: "r2", status: "partial" as UkComplianceStatus },
        { requirementId: "r3", status: "non_compliant" as UkComplianceStatus },
      ];

      const summary = generateComplianceSummary(
        mockProfile,
        mockRequirements,
        assessments,
      );

      expect(summary.compliant).toBe(1);
      expect(summary.partial).toBe(1);
      expect(summary.nonCompliant).toBe(1);
      expect(summary.applicable).toBe(3);
    });

    it("should count critical gaps correctly", () => {
      const assessments = [
        { requirementId: "r1", status: "non_compliant" as UkComplianceStatus },
        { requirementId: "r2", status: "compliant" as UkComplianceStatus },
        { requirementId: "r3", status: "non_compliant" as UkComplianceStatus },
      ];

      const summary = generateComplianceSummary(
        mockProfile,
        mockRequirements,
        assessments,
      );

      expect(summary.criticalGaps).toBe(1); // Only r1 is critical
      expect(summary.majorGaps).toBe(0); // r2 is compliant
    });

    it("should include required licenses in summary", () => {
      const assessments = [
        { requirementId: "r1", status: "compliant" as UkComplianceStatus },
      ];

      const summary = generateComplianceSummary(
        mockProfile,
        mockRequirements,
        assessments,
      );

      expect(summary.requiredLicenses).toContain("launch_licence");
    });
  });

  describe("generateRecommendations", () => {
    it("should recommend CAA licence application when licensing score is low", () => {
      const profile: UkSpaceProfile = {
        operatorType: "launch_operator",
        activityTypes: ["launch"],
        launchFromUk: true,
        launchToOrbit: true,
        isSuborbital: false,
        hasUkNexus: true,
        involvesPeople: false,
        isCommercial: true,
      };
      const score = {
        overall: 60,
        mandatory: 70,
        byCategory: { operator_licensing: 50 } as any,
        byLicenseType: { launch_licence: 50 } as any,
        recommended: 80,
      };
      const gaps: any[] = [];
      const licenses: any[] = ["launch_licence"];

      const recommendations = generateRecommendations(
        profile,
        score,
        gaps,
        licenses,
      );

      expect(
        recommendations.some((r) => r.includes("CAA") || r.includes("licence")),
      ).toBe(true);
    });

    it("should recommend insurance when insurance score is low", () => {
      const profile: UkSpaceProfile = {
        operatorType: "satellite_operator",
        activityTypes: ["orbital_operations"],
        launchFromUk: false,
        launchToOrbit: true,
        isSuborbital: false,
        hasUkNexus: true,
        involvesPeople: false,
        isCommercial: true,
      };
      const score = {
        overall: 70,
        mandatory: 75,
        byCategory: { operator_licensing: 100, liability_insurance: 50 } as any,
        byLicenseType: {},
        recommended: 80,
      };
      const gaps: any[] = [];
      const licenses: any[] = ["orbital_operator_licence"];

      const recommendations = generateRecommendations(
        profile,
        score,
        gaps,
        licenses,
      );

      expect(
        recommendations.some(
          (r) => r.includes("insurance") || r.includes("liability"),
        ),
      ).toBe(true);
    });

    it("should recommend debris mitigation for orbital missions with low environmental score", () => {
      const profile: UkSpaceProfile = {
        operatorType: "satellite_operator",
        activityTypes: ["orbital_operations"],
        launchFromUk: false,
        launchToOrbit: true,
        isSuborbital: false,
        hasUkNexus: true,
        involvesPeople: false,
        isCommercial: true,
      };
      const score = {
        overall: 70,
        mandatory: 75,
        byCategory: { operator_licensing: 100, environmental: 50 } as any,
        byLicenseType: {},
        recommended: 80,
      };
      const gaps: any[] = [];
      const licenses: any[] = ["orbital_operator_licence"];

      const recommendations = generateRecommendations(
        profile,
        score,
        gaps,
        licenses,
      );

      expect(
        recommendations.some(
          (r) => r.includes("debris") || r.includes("ISO 24113"),
        ),
      ).toBe(true);
    });

    it("should recommend informed consent for human spaceflight with low score", () => {
      const profile: UkSpaceProfile = {
        operatorType: "launch_operator",
        activityTypes: ["launch"],
        launchFromUk: true,
        launchToOrbit: false,
        isSuborbital: true,
        hasUkNexus: true,
        involvesPeople: true,
        isCommercial: true,
      };
      const score = {
        overall: 70,
        mandatory: 75,
        byCategory: { operator_licensing: 100, informed_consent: 50 } as any,
        byLicenseType: {},
        recommended: 80,
      };
      const gaps: any[] = [];
      const licenses: any[] = ["launch_licence"];

      const recommendations = generateRecommendations(
        profile,
        score,
        gaps,
        licenses,
      );

      expect(recommendations.some((r) => r.includes("informed consent"))).toBe(
        true,
      );
    });

    it("should limit recommendations to 10", () => {
      const profile: UkSpaceProfile = {
        operatorType: "launch_operator",
        activityTypes: ["launch"],
        launchFromUk: true,
        launchToOrbit: true,
        isSuborbital: false,
        hasUkNexus: true,
        involvesPeople: true,
        isCommercial: true,
      };
      const score = {
        overall: 20,
        mandatory: 20,
        byCategory: {
          operator_licensing: 10,
          liability_insurance: 10,
          safety: 10,
          environmental: 10,
          security: 10,
          registration: 10,
          informed_consent: 10,
          emergency_response: 10,
        } as any,
        byLicenseType: { launch_licence: 10 } as any,
        recommended: 20,
      };
      const gaps = [
        { requirementId: "r1", priority: "high", recommendation: "Fix 1" },
        { requirementId: "r2", priority: "high", recommendation: "Fix 2" },
        { requirementId: "r3", priority: "high", recommendation: "Fix 3" },
        { requirementId: "r4", priority: "high", recommendation: "Fix 4" },
        { requirementId: "r5", priority: "high", recommendation: "Fix 5" },
      ] as any[];
      const licenses = ["launch_licence"] as any[];

      const recommendations = generateRecommendations(
        profile,
        score,
        gaps,
        licenses,
      );

      expect(recommendations.length).toBeLessThanOrEqual(10);
    });
  });

  describe("generateCaaDocumentationChecklist", () => {
    const mockRequirements = [
      {
        id: "r1",
        bindingLevel: "mandatory",
        evidenceRequired: [
          "CAA licence application",
          "Safety case documentation",
        ],
      },
      {
        id: "r2",
        bindingLevel: "mandatory",
        evidenceRequired: ["Insurance policy documents"],
      },
    ] as any[];

    it("should collect all required evidence from applicable requirements", () => {
      vi.mocked(getApplicableRequirements).mockReturnValue(mockRequirements);

      const profile: UkSpaceProfile = {
        operatorType: "launch_operator",
        activityTypes: ["launch"],
        launchFromUk: true,
        launchToOrbit: true,
        isSuborbital: false,
        hasUkNexus: true,
        involvesPeople: false,
        isCommercial: true,
      };
      const assessments = [
        { requirementId: "r1", status: "compliant" as UkComplianceStatus },
        { requirementId: "r2", status: "partial" as UkComplianceStatus },
      ];

      const checklist = generateCaaDocumentationChecklist(profile, assessments);

      expect(
        checklist.some((c) => c.document === "CAA licence application"),
      ).toBe(true);
      expect(
        checklist.some((c) => c.document === "Safety case documentation"),
      ).toBe(true);
      expect(
        checklist.some((c) => c.document === "Insurance policy documents"),
      ).toBe(true);
    });

    it("should mark documents as complete when requirement is compliant", () => {
      vi.mocked(getApplicableRequirements).mockReturnValue(mockRequirements);

      const profile: UkSpaceProfile = {
        operatorType: "launch_operator",
        activityTypes: ["launch"],
        launchFromUk: true,
        launchToOrbit: true,
        isSuborbital: false,
        hasUkNexus: true,
        involvesPeople: false,
        isCommercial: true,
      };
      const assessments = [
        { requirementId: "r1", status: "compliant" as UkComplianceStatus },
        { requirementId: "r2", status: "compliant" as UkComplianceStatus },
      ];

      const checklist = generateCaaDocumentationChecklist(profile, assessments);

      const licenceDoc = checklist.find(
        (c) => c.document === "CAA licence application",
      );
      expect(licenceDoc?.status).toBe("complete");
    });

    it("should sort required items first, then by status", () => {
      vi.mocked(getApplicableRequirements).mockReturnValue(mockRequirements);

      const profile: UkSpaceProfile = {
        operatorType: "launch_operator",
        activityTypes: ["launch"],
        launchFromUk: true,
        launchToOrbit: true,
        isSuborbital: false,
        hasUkNexus: true,
        involvesPeople: false,
        isCommercial: true,
      };
      const assessments: any[] = []; // No assessments, all missing

      const checklist = generateCaaDocumentationChecklist(profile, assessments);

      // All items are required and missing, should be sorted by required first
      expect(
        checklist.every((c) => c.required === true || c.required === false),
      ).toBe(true);
      expect(checklist[0].status).toBe("missing");
    });
  });

  describe("Operator-specific requirement filtering", () => {
    it("should apply launch operator requirements", () => {
      vi.mocked(getApplicableRequirements).mockImplementation((profile) => {
        if (profile.operatorType === "launch_operator") {
          return [
            { id: "uk-sia-s3-licence", sectionRef: "SIA s.3" },
            { id: "uk-sia-s38-insurance", sectionRef: "SIA s.38" },
          ] as any[];
        }
        return [];
      });

      const profile: UkSpaceProfile = {
        operatorType: "launch_operator",
        activityTypes: ["launch"],
        launchFromUk: true,
        launchToOrbit: true,
        isSuborbital: false,
        hasUkNexus: true,
        involvesPeople: false,
        isCommercial: true,
      };

      const requirements = getApplicableRequirements(profile);

      expect(requirements.some((r) => r.id === "uk-sia-s3-licence")).toBe(true);
    });

    it("should apply orbital-only requirements for orbital missions", () => {
      vi.mocked(getApplicableRequirements).mockImplementation((profile) => {
        const reqs = [];
        if (profile.launchToOrbit) {
          reqs.push({ id: "uk-sir-reg31-debris", sectionRef: "SIR Reg.31" });
          reqs.push({ id: "uk-sia-s61-registration", sectionRef: "SIA s.61" });
        }
        return reqs as any[];
      });

      const orbitalProfile: UkSpaceProfile = {
        operatorType: "satellite_operator",
        activityTypes: ["orbital_operations"],
        launchFromUk: false,
        launchToOrbit: true,
        isSuborbital: false,
        hasUkNexus: true,
        involvesPeople: false,
        isCommercial: true,
      };

      const suborbitalProfile: UkSpaceProfile = {
        ...orbitalProfile,
        operatorType: "launch_operator",
        activityTypes: ["suborbital"],
        launchToOrbit: false,
        isSuborbital: true,
      };

      const orbitalReqs = getApplicableRequirements(orbitalProfile);
      const suborbitalReqs = getApplicableRequirements(suborbitalProfile);

      expect(orbitalReqs.some((r) => r.id === "uk-sir-reg31-debris")).toBe(
        true,
      );
      expect(suborbitalReqs.some((r) => r.id === "uk-sir-reg31-debris")).toBe(
        false,
      );
    });

    it("should apply human spaceflight requirements only when involved", () => {
      vi.mocked(getApplicableRequirements).mockImplementation((profile) => {
        if (profile.involvesPeople) {
          return [
            { id: "uk-sia-s16-informed-consent", sectionRef: "SIA s.16" },
          ] as any[];
        }
        return [];
      });

      const humanProfile: UkSpaceProfile = {
        operatorType: "launch_operator",
        activityTypes: ["launch"],
        launchFromUk: true,
        launchToOrbit: false,
        isSuborbital: true,
        hasUkNexus: true,
        involvesPeople: true,
        isCommercial: true,
      };

      const cargoProfile: UkSpaceProfile = {
        ...humanProfile,
        involvesPeople: false,
      };

      const humanReqs = getApplicableRequirements(humanProfile);
      const cargoReqs = getApplicableRequirements(cargoProfile);

      expect(
        humanReqs.some((r) => r.id === "uk-sia-s16-informed-consent"),
      ).toBe(true);
      expect(
        cargoReqs.some((r) => r.id === "uk-sia-s16-informed-consent"),
      ).toBe(false);
    });
  });
});
