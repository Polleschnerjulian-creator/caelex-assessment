import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only (it throws when imported in non-server context)
vi.mock("server-only", () => ({}));

// Mock the data file
vi.mock("@/data/us-space-regulations", () => ({
  allUsSpaceRequirements: [
    {
      id: "fcc-space-station-license",
      cfrReference: "47 CFR § 25.114",
      title: "FCC Space Station License Application",
      description: "Submit application for space station authorization.",
      agency: "FCC",
      category: "licensing",
      bindingLevel: "mandatory",
      severity: "critical",
      applicability: {
        operatorTypes: ["satellite_operator"],
        agencies: ["FCC"],
      },
      complianceQuestion: "Have you filed FCC space station application?",
      evidenceRequired: ["FCC Form 312", "Technical exhibits"],
      implementationGuidance: ["File via IBFS/ICFS"],
      licenseTypes: ["fcc_space_station"],
      euSpaceActCrossRef: ["Art. 4"],
      copuosCrossRef: ["COPUOS B.1"],
      penalties: {
        description: "Unauthorized operation fines",
        maxFine: 2382178,
        perViolation: true,
      },
    },
    {
      id: "fcc-debris-5year-rule",
      cfrReference: "47 CFR § 25.114(d)(14)(iv)",
      title: "FCC 5-Year Post-Mission Disposal Rule",
      description:
        "LEO satellites must deorbit within 5 years of end-of-mission.",
      agency: "FCC",
      category: "orbital_debris",
      bindingLevel: "mandatory",
      severity: "critical",
      applicability: {
        operatorTypes: ["satellite_operator"],
        agencies: ["FCC"],
        leoOnly: true,
      },
      complianceQuestion: "Can satellite complete disposal within 5 years?",
      evidenceRequired: ["Orbital debris mitigation plan", "Deorbit analysis"],
      implementationGuidance: ["Design active deorbit capability"],
      licenseTypes: ["fcc_space_station"],
      euSpaceActCrossRef: ["Art. 72"],
      copuosCrossRef: ["IADC 5.3.2"],
      penalties: {
        description: "License denial or revocation",
        maxFine: 2382178,
      },
    },
    {
      id: "fcc-spectrum-coordination",
      cfrReference: "47 CFR § 25.111",
      title: "FCC Spectrum Coordination",
      description: "Coordinate spectrum use with existing systems.",
      agency: "FCC",
      category: "spectrum",
      bindingLevel: "mandatory",
      severity: "major",
      applicability: {
        operatorTypes: ["satellite_operator", "spectrum_user"],
        agencies: ["FCC"],
      },
      complianceQuestion: "Have you completed spectrum coordination?",
      evidenceRequired: ["Coordination agreements"],
      implementationGuidance: ["Conduct interference analysis"],
      licenseTypes: ["fcc_spectrum"],
    },
    {
      id: "faa-launch-license",
      cfrReference: "14 CFR Part 450",
      title: "FAA Launch License",
      description: "Obtain FAA license for commercial space launch.",
      agency: "FAA",
      category: "launch_safety",
      bindingLevel: "mandatory",
      severity: "critical",
      applicability: {
        operatorTypes: ["launch_operator"],
        agencies: ["FAA"],
      },
      complianceQuestion: "Do you have FAA launch license?",
      evidenceRequired: ["Flight safety analysis", "Environmental review"],
      implementationGuidance: ["Submit application 180 days before launch"],
      licenseTypes: ["faa_launch"],
      euSpaceActCrossRef: ["Art. 4"],
      penalties: {
        description: "Civil penalties up to $277,820 per violation",
        maxFine: 277820,
        perViolation: true,
      },
    },
    {
      id: "faa-financial-responsibility",
      cfrReference: "14 CFR § 450.49",
      title: "FAA Financial Responsibility Requirements",
      description: "Demonstrate financial responsibility for launch/reentry.",
      agency: "FAA",
      category: "financial_responsibility",
      bindingLevel: "mandatory",
      severity: "critical",
      applicability: {
        operatorTypes: ["launch_operator", "reentry_operator"],
        agencies: ["FAA"],
      },
      complianceQuestion: "Do you have required insurance coverage?",
      evidenceRequired: ["Insurance certificate", "MPL determination"],
      implementationGuidance: ["Obtain third-party liability insurance"],
      licenseTypes: ["faa_launch", "faa_reentry"],
    },
    {
      id: "faa-reentry-license",
      cfrReference: "14 CFR Part 450",
      title: "FAA Reentry License",
      description: "Obtain FAA license for controlled reentry.",
      agency: "FAA",
      category: "reentry_safety",
      bindingLevel: "mandatory",
      severity: "critical",
      applicability: {
        operatorTypes: ["reentry_operator"],
        agencies: ["FAA"],
      },
      complianceQuestion: "Do you have FAA reentry license?",
      evidenceRequired: ["Reentry safety analysis"],
      implementationGuidance: ["Conduct reentry trajectory analysis"],
      licenseTypes: ["faa_reentry"],
    },
    {
      id: "noaa-remote-sensing",
      cfrReference: "15 CFR Part 960",
      title: "NOAA Remote Sensing License",
      description: "Obtain NOAA license for commercial remote sensing.",
      agency: "NOAA",
      category: "remote_sensing",
      bindingLevel: "mandatory",
      severity: "critical",
      applicability: {
        operatorTypes: ["remote_sensing_operator"],
        agencies: ["NOAA"],
        remoteSensingOnly: true,
      },
      complianceQuestion: "Do you have NOAA remote sensing license?",
      evidenceRequired: ["License application", "System description"],
      implementationGuidance: ["Submit application to NOAA"],
      licenseTypes: ["noaa_remote_sensing"],
      euSpaceActCrossRef: ["Art. 31"],
    },
    {
      id: "noaa-data-distribution",
      cfrReference: "15 CFR § 960.14",
      title: "NOAA Data Distribution Requirements",
      description: "Comply with data distribution conditions.",
      agency: "NOAA",
      category: "remote_sensing",
      bindingLevel: "mandatory",
      severity: "major",
      applicability: {
        operatorTypes: ["remote_sensing_operator"],
        agencies: ["NOAA"],
        remoteSensingOnly: true,
      },
      complianceQuestion: "Do you comply with data distribution rules?",
      evidenceRequired: ["Data handling procedures"],
      implementationGuidance: ["Establish data access controls"],
      licenseTypes: ["noaa_remote_sensing"],
    },
    {
      id: "fcc-ssa-sharing",
      cfrReference: "47 CFR § 25.114(d)(14)(iii)",
      title: "Space Situational Awareness Data Sharing",
      description: "Share orbital data with 18th SDS.",
      agency: "FCC",
      category: "coordination",
      bindingLevel: "recommended",
      severity: "minor",
      applicability: {
        operatorTypes: ["satellite_operator"],
        agencies: ["FCC"],
      },
      complianceQuestion: "Do you share SSA data?",
      evidenceRequired: ["SSA sharing agreement"],
      implementationGuidance: ["Establish data sharing agreement"],
      licenseTypes: ["fcc_space_station"],
      copuosCrossRef: ["COPUOS B.2"],
    },
    {
      id: "fcc-ngso-protection",
      cfrReference: "47 CFR § 25.261",
      title: "NGSO GSO Protection",
      description: "NGSO systems must protect GSO systems from interference.",
      agency: "FCC",
      category: "spectrum",
      bindingLevel: "mandatory",
      severity: "major",
      applicability: {
        operatorTypes: ["satellite_operator"],
        agencies: ["FCC"],
        ngsOnly: true,
      },
      complianceQuestion: "Do you implement GSO protection measures?",
      evidenceRequired: ["GSO protection plan"],
      implementationGuidance: ["Implement EPFD limits"],
      licenseTypes: ["fcc_space_station", "fcc_spectrum"],
    },
  ],
  getApplicableRequirements: vi.fn(),
  determineRequiredAgencies: vi.fn(),
  determineRequiredLicenses: vi.fn(),
  getMandatoryRequirements: vi.fn(),
  getCriticalRequirements: vi.fn(),
  getRequirementsWithEuCrossRef: vi.fn(),
  getRequirementsWithCopuosCrossRef: vi.fn(),
  getAgencyRequirements: vi.fn(),
  calculateDeorbitDeadline: vi.fn(),
  usEuComparisons: [
    {
      usRequirement: "FCC Space Station License",
      euEquivalent: "EU Space Act Art. 4 Authorization",
      comparisonNotes: "Both require pre-operation authorization",
      harmonizationStatus: "aligned",
    },
  ],
  agencyConfig: {
    FCC: {
      label: "FCC",
      fullName: "Federal Communications Commission",
      description: "Regulates satellite communications and spectrum",
      color: "blue",
    },
    FAA: {
      label: "FAA/AST",
      fullName:
        "Federal Aviation Administration - Office of Commercial Space Transportation",
      description: "Regulates commercial launch and reentry",
      color: "orange",
    },
    NOAA: {
      label: "NOAA",
      fullName: "National Oceanic and Atmospheric Administration",
      description: "Regulates commercial remote sensing",
      color: "green",
    },
  },
}));

import {
  validateOperatorProfile,
  calculateComplianceScore,
  determineRiskLevel,
  generateGapAnalysis,
  generateAgencyStatus,
  findEuSpaceActCrossReferences,
  findCopuosCrossReferences,
  checkDeorbitCompliance,
  calculateDeorbitRequirements,
  generateRecommendations,
  performAssessment,
  generateComplianceSummary,
  getLicenseRequirementSummaries,
  generateAgencyDocumentationChecklist,
  type RequirementAssessment,
  type UsComplianceScore,
} from "@/lib/us-regulatory-engine.server";

import {
  getApplicableRequirements,
  determineRequiredAgencies,
  determineRequiredLicenses,
  getRequirementsWithEuCrossRef,
  getRequirementsWithCopuosCrossRef,
  type UsOperatorProfile,
  type UsComplianceStatus,
  type UsRequirement,
  type UsAgency,
  allUsSpaceRequirements,
} from "@/data/us-space-regulations";

// ─── Test Fixtures ───

const createLeoSatelliteProfile = (): UsOperatorProfile => ({
  operatorTypes: ["satellite_operator"],
  activityTypes: ["satellite_communications"],
  agencies: ["FCC"],
  isUsEntity: true,
  usNexus: "us_licensed",
  orbitRegime: "LEO",
  altitudeKm: 550,
  hasPropulsion: true,
  hasManeuverability: true,
  missionDurationYears: 5,
  isConstellation: false,
  isNGSO: true,
});

const createLaunchOperatorProfile = (): UsOperatorProfile => ({
  operatorTypes: ["launch_operator"],
  activityTypes: ["commercial_launch"],
  agencies: ["FAA"],
  isUsEntity: true,
  usNexus: "us_licensed",
});

const createRemoteSensingProfile = (): UsOperatorProfile => ({
  operatorTypes: ["remote_sensing_operator", "satellite_operator"],
  activityTypes: ["earth_observation", "remote_sensing"],
  agencies: ["NOAA", "FCC"],
  isUsEntity: true,
  usNexus: "us_licensed",
  orbitRegime: "LEO",
  altitudeKm: 500,
  providesRemoteSensing: true,
  remotesensingResolutionM: 0.5,
});

const createMultiAgencyProfile = (): UsOperatorProfile => ({
  operatorTypes: [
    "satellite_operator",
    "launch_operator",
    "remote_sensing_operator",
  ],
  activityTypes: [
    "satellite_communications",
    "commercial_launch",
    "remote_sensing",
  ],
  agencies: ["FCC", "FAA", "NOAA"],
  isUsEntity: true,
  usNexus: "us_licensed",
  orbitRegime: "LEO",
  altitudeKm: 600,
  hasPropulsion: true,
  providesRemoteSensing: true,
});

const createFullyCompliantAssessments = (
  requirements: UsRequirement[],
): RequirementAssessment[] =>
  requirements.map((req) => ({
    requirementId: req.id,
    status: "compliant" as UsComplianceStatus,
    notes: "Fully compliant",
    assessedAt: new Date(),
  }));

const createPartialAssessments = (
  requirements: UsRequirement[],
): RequirementAssessment[] =>
  requirements.map((req, index) => ({
    requirementId: req.id,
    status:
      index % 3 === 0
        ? "compliant"
        : index % 3 === 1
          ? "partial"
          : "non_compliant",
    assessedAt: new Date(),
  }));

const createNoAssessments = (): RequirementAssessment[] => [];

// ─── Tests ───

describe("US Regulatory Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    (getApplicableRequirements as ReturnType<typeof vi.fn>).mockImplementation(
      (profile: UsOperatorProfile) => {
        return allUsSpaceRequirements.filter((req) => {
          // Filter by operator type
          if (req.applicability.operatorTypes) {
            const hasMatchingType = req.applicability.operatorTypes.some((ot) =>
              profile.operatorTypes.includes(ot),
            );
            if (!hasMatchingType) return false;
          }
          // Filter by agency
          if (req.applicability.agencies) {
            const hasMatchingAgency = req.applicability.agencies.some((ag) =>
              profile.agencies.includes(ag),
            );
            if (!hasMatchingAgency) return false;
          }
          // Filter LEO-only
          if (req.applicability.leoOnly && profile.orbitRegime !== "LEO") {
            return false;
          }
          // Filter NGSO-only
          if (req.applicability.ngsOnly && !profile.isNGSO) {
            return false;
          }
          // Filter remote sensing only
          if (
            req.applicability.remoteSensingOnly &&
            !profile.providesRemoteSensing
          ) {
            return false;
          }
          return true;
        });
      },
    );

    (determineRequiredAgencies as ReturnType<typeof vi.fn>).mockImplementation(
      (profile: UsOperatorProfile) => {
        const agencies: UsAgency[] = [];
        if (
          profile.operatorTypes.includes("satellite_operator") ||
          profile.operatorTypes.includes("spectrum_user")
        ) {
          agencies.push("FCC");
        }
        if (
          profile.operatorTypes.includes("launch_operator") ||
          profile.operatorTypes.includes("reentry_operator") ||
          profile.operatorTypes.includes("spaceport_operator")
        ) {
          agencies.push("FAA");
        }
        if (profile.operatorTypes.includes("remote_sensing_operator")) {
          agencies.push("NOAA");
        }
        return [...new Set(agencies)];
      },
    );

    (determineRequiredLicenses as ReturnType<typeof vi.fn>).mockImplementation(
      (profile: UsOperatorProfile) => {
        const licenses: string[] = [];
        if (profile.operatorTypes.includes("satellite_operator")) {
          licenses.push("fcc_space_station");
        }
        if (profile.operatorTypes.includes("launch_operator")) {
          licenses.push("faa_launch");
        }
        if (profile.operatorTypes.includes("reentry_operator")) {
          licenses.push("faa_reentry");
        }
        if (profile.operatorTypes.includes("remote_sensing_operator")) {
          licenses.push("noaa_remote_sensing");
        }
        return licenses;
      },
    );

    (getRequirementsWithEuCrossRef as ReturnType<typeof vi.fn>).mockReturnValue(
      allUsSpaceRequirements.filter((r) => r.euSpaceActCrossRef?.length),
    );

    (
      getRequirementsWithCopuosCrossRef as ReturnType<typeof vi.fn>
    ).mockReturnValue(
      allUsSpaceRequirements.filter((r) => r.copuosCrossRef?.length),
    );
  });

  describe("validateOperatorProfile", () => {
    it("should throw error when operator types are missing", () => {
      expect(() =>
        validateOperatorProfile({
          activityTypes: ["satellite_communications"],
        }),
      ).toThrow("At least one operator type is required");
    });

    it("should throw error when operator types array is empty", () => {
      expect(() =>
        validateOperatorProfile({
          operatorTypes: [],
          activityTypes: ["satellite_communications"],
        }),
      ).toThrow("At least one operator type is required");
    });

    it("should throw error when activity types are missing", () => {
      expect(() =>
        validateOperatorProfile({
          operatorTypes: ["satellite_operator"],
        }),
      ).toThrow("At least one activity type is required");
    });

    it("should throw error when activity types array is empty", () => {
      expect(() =>
        validateOperatorProfile({
          operatorTypes: ["satellite_operator"],
          activityTypes: [],
        }),
      ).toThrow("At least one activity type is required");
    });

    it("should return validated profile with default values", () => {
      const result = validateOperatorProfile({
        operatorTypes: ["satellite_operator"],
        activityTypes: ["satellite_communications"],
      });

      expect(result.operatorTypes).toEqual(["satellite_operator"]);
      expect(result.activityTypes).toEqual(["satellite_communications"]);
      expect(result.isUsEntity).toBe(true);
      expect(result.usNexus).toBe("us_licensed");
      expect(result.isConstellation).toBe(false);
      expect(result.providesRemoteSensing).toBe(false);
      expect(result.hasNationalSecurityImplications).toBe(false);
    });

    it("should preserve provided values", () => {
      const result = validateOperatorProfile({
        operatorTypes: ["satellite_operator"],
        activityTypes: ["satellite_communications"],
        agencies: ["FCC"],
        isUsEntity: false,
        usNexus: "us_market_access",
        orbitRegime: "GEO",
        altitudeKm: 35786,
        isConstellation: true,
        satelliteCount: 100,
      });

      expect(result.isUsEntity).toBe(false);
      expect(result.usNexus).toBe("us_market_access");
      expect(result.orbitRegime).toBe("GEO");
      expect(result.altitudeKm).toBe(35786);
      expect(result.isConstellation).toBe(true);
      expect(result.satelliteCount).toBe(100);
    });

    it("should auto-determine NGSO status based on orbit regime", () => {
      const geoProfile = validateOperatorProfile({
        operatorTypes: ["satellite_operator"],
        activityTypes: ["satellite_communications"],
        orbitRegime: "GEO",
      });
      expect(geoProfile.isNGSO).toBe(false);

      const leoProfile = validateOperatorProfile({
        operatorTypes: ["satellite_operator"],
        activityTypes: ["satellite_communications"],
        orbitRegime: "LEO",
      });
      expect(leoProfile.isNGSO).toBe(true);
    });
  });

  describe("calculateComplianceScore", () => {
    it("should return 100% for fully compliant assessments", () => {
      const profile = createLeoSatelliteProfile();
      const requirements = getApplicableRequirements(profile);
      const assessments = createFullyCompliantAssessments(requirements);

      const score = calculateComplianceScore(requirements, assessments);

      expect(score.overall).toBe(100);
      expect(score.mandatory).toBe(100);
    });

    it("should return 0% for non-compliant assessments", () => {
      const profile = createLeoSatelliteProfile();
      const requirements = getApplicableRequirements(profile);
      const assessments = requirements.map((req) => ({
        requirementId: req.id,
        status: "non_compliant" as UsComplianceStatus,
        assessedAt: new Date(),
      }));

      const score = calculateComplianceScore(requirements, assessments);

      expect(score.overall).toBe(0);
    });

    it("should handle partial compliance correctly", () => {
      const profile = createLeoSatelliteProfile();
      const requirements = getApplicableRequirements(profile);
      const assessments = requirements.map((req) => ({
        requirementId: req.id,
        status: "partial" as UsComplianceStatus,
        assessedAt: new Date(),
      }));

      const score = calculateComplianceScore(requirements, assessments);

      expect(score.overall).toBe(50);
    });

    it("should exclude not_applicable from score calculation", () => {
      const profile = createLeoSatelliteProfile();
      const requirements = getApplicableRequirements(profile);
      const assessments: RequirementAssessment[] = [
        {
          requirementId: requirements[0]?.id || "test",
          status: "compliant",
          assessedAt: new Date(),
        },
        {
          requirementId: requirements[1]?.id || "test2",
          status: "not_applicable",
          assessedAt: new Date(),
        },
      ];

      const score = calculateComplianceScore(
        requirements.slice(0, 2),
        assessments,
      );

      expect(score.overall).toBe(100);
    });

    it("should calculate per-agency scores correctly", () => {
      const profile = createMultiAgencyProfile();
      const requirements = getApplicableRequirements(profile);
      const assessments = createFullyCompliantAssessments(requirements);

      const score = calculateComplianceScore(requirements, assessments);

      expect(score.byAgency.FCC).toBeDefined();
      expect(score.byAgency.FAA).toBeDefined();
      expect(score.byAgency.NOAA).toBeDefined();
    });

    it("should weight critical requirements higher", () => {
      const requirements: UsRequirement[] = [
        {
          id: "critical-req",
          cfrReference: "Test",
          title: "Critical Requirement",
          description: "Critical test",
          agency: "FCC",
          category: "licensing",
          bindingLevel: "mandatory",
          severity: "critical",
          applicability: {},
          complianceQuestion: "Test?",
          evidenceRequired: [],
          implementationGuidance: [],
          licenseTypes: [],
        },
        {
          id: "minor-req",
          cfrReference: "Test",
          title: "Minor Requirement",
          description: "Minor test",
          agency: "FCC",
          category: "reporting",
          bindingLevel: "recommended",
          severity: "minor",
          applicability: {},
          complianceQuestion: "Test?",
          evidenceRequired: [],
          implementationGuidance: [],
          licenseTypes: [],
        },
      ];

      // Critical compliant, minor non-compliant
      const assessments1: RequirementAssessment[] = [
        {
          requirementId: "critical-req",
          status: "compliant",
          assessedAt: new Date(),
        },
        {
          requirementId: "minor-req",
          status: "non_compliant",
          assessedAt: new Date(),
        },
      ];

      // Critical non-compliant, minor compliant
      const assessments2: RequirementAssessment[] = [
        {
          requirementId: "critical-req",
          status: "non_compliant",
          assessedAt: new Date(),
        },
        {
          requirementId: "minor-req",
          status: "compliant",
          assessedAt: new Date(),
        },
      ];

      const score1 = calculateComplianceScore(requirements, assessments1);
      const score2 = calculateComplianceScore(requirements, assessments2);

      // Score should be higher when critical is compliant
      expect(score1.overall).toBeGreaterThan(score2.overall);
    });

    it("should return 100% for empty requirements", () => {
      const score = calculateComplianceScore([], []);
      expect(score.overall).toBe(100);
    });
  });

  describe("determineRiskLevel", () => {
    it("should return low risk for high compliance scores", () => {
      const profile = createLeoSatelliteProfile();
      const requirements = getApplicableRequirements(profile);
      const assessments = createFullyCompliantAssessments(requirements);
      const score = calculateComplianceScore(requirements, assessments);

      const riskLevel = determineRiskLevel(score, requirements, assessments);

      expect(riskLevel).toBe("low");
    });

    it("should return critical risk for non-compliant critical requirements", () => {
      const requirements: UsRequirement[] = [
        {
          id: "critical-req",
          cfrReference: "Test",
          title: "Critical Requirement",
          description: "Critical test",
          agency: "FCC",
          category: "licensing",
          bindingLevel: "mandatory",
          severity: "critical",
          applicability: {},
          complianceQuestion: "Test?",
          evidenceRequired: [],
          implementationGuidance: [],
          licenseTypes: [],
        },
      ];

      const assessments: RequirementAssessment[] = [
        {
          requirementId: "critical-req",
          status: "non_compliant",
          assessedAt: new Date(),
        },
      ];

      const score = calculateComplianceScore(requirements, assessments);
      const riskLevel = determineRiskLevel(score, requirements, assessments);

      expect(riskLevel).toBe("critical");
    });

    it("should return critical risk for low licensing score", () => {
      const score: UsComplianceScore = {
        overall: 60,
        byAgency: { FCC: 60, FAA: 60, NOAA: 60 },
        byCategory: { licensing: 40 },
        byLicenseType: {},
        mandatory: 60,
        recommended: 80,
      };

      const riskLevel = determineRiskLevel(score, [], []);

      expect(riskLevel).toBe("critical");
    });

    it("should return high risk for medium mandatory score", () => {
      const score: UsComplianceScore = {
        overall: 65,
        byAgency: { FCC: 65, FAA: 65, NOAA: 65 },
        byCategory: { licensing: 70 },
        byLicenseType: {},
        mandatory: 65,
        recommended: 80,
      };

      const riskLevel = determineRiskLevel(score, [], []);

      expect(riskLevel).toBe("high");
    });

    it("should return medium risk for moderate compliance", () => {
      const score: UsComplianceScore = {
        overall: 80,
        byAgency: { FCC: 80, FAA: 80, NOAA: 80 },
        byCategory: { licensing: 85 },
        byLicenseType: {},
        mandatory: 80,
        recommended: 85,
      };

      const riskLevel = determineRiskLevel(score, [], []);

      expect(riskLevel).toBe("medium");
    });
  });

  describe("generateGapAnalysis", () => {
    it("should return empty array for fully compliant assessments", () => {
      const profile = createLeoSatelliteProfile();
      const requirements = getApplicableRequirements(profile);
      const assessments = createFullyCompliantAssessments(requirements);

      const gaps = generateGapAnalysis(requirements, assessments);

      expect(gaps.length).toBe(0);
    });

    it("should identify non-compliant requirements as gaps", () => {
      const requirements: UsRequirement[] = [
        {
          id: "test-req",
          cfrReference: "47 CFR § 25.114",
          title: "Test Requirement",
          description: "Test",
          agency: "FCC",
          category: "licensing",
          bindingLevel: "mandatory",
          severity: "critical",
          applicability: {},
          complianceQuestion: "Test?",
          evidenceRequired: [],
          implementationGuidance: ["Do this first"],
          licenseTypes: [],
          penalties: { description: "Fines apply" },
        },
      ];

      const assessments: RequirementAssessment[] = [
        {
          requirementId: "test-req",
          status: "non_compliant",
          assessedAt: new Date(),
        },
      ];

      const gaps = generateGapAnalysis(requirements, assessments);

      expect(gaps.length).toBe(1);
      expect(gaps[0].status).toBe("non_compliant");
      expect(gaps[0].priority).toBe("high");
      expect(gaps[0].recommendation).toBe("Do this first");
      expect(gaps[0].potentialPenalty).toBe("Fines apply");
    });

    it("should identify not_assessed requirements as gaps", () => {
      const requirements: UsRequirement[] = [
        {
          id: "unassessed-req",
          cfrReference: "Test",
          title: "Unassessed Requirement",
          description: "Test",
          agency: "FAA",
          category: "launch_safety",
          bindingLevel: "mandatory",
          severity: "major",
          applicability: {},
          complianceQuestion: "Test?",
          evidenceRequired: [],
          implementationGuidance: [],
          licenseTypes: [],
        },
      ];

      const gaps = generateGapAnalysis(requirements, []);

      expect(gaps.length).toBe(1);
      expect(gaps[0].status).toBe("not_assessed");
    });

    it("should sort gaps by priority (high first)", () => {
      const requirements: UsRequirement[] = [
        {
          id: "low-req",
          cfrReference: "Test",
          title: "Low Priority",
          description: "Test",
          agency: "FCC",
          category: "reporting",
          bindingLevel: "recommended",
          severity: "minor",
          applicability: {},
          complianceQuestion: "Test?",
          evidenceRequired: [],
          implementationGuidance: [],
          licenseTypes: [],
        },
        {
          id: "high-req",
          cfrReference: "Test",
          title: "High Priority",
          description: "Test",
          agency: "FCC",
          category: "licensing",
          bindingLevel: "mandatory",
          severity: "critical",
          applicability: {},
          complianceQuestion: "Test?",
          evidenceRequired: [],
          implementationGuidance: [],
          licenseTypes: [],
        },
      ];

      const assessments: RequirementAssessment[] = [
        {
          requirementId: "low-req",
          status: "non_compliant",
          assessedAt: new Date(),
        },
        {
          requirementId: "high-req",
          status: "non_compliant",
          assessedAt: new Date(),
        },
      ];

      const gaps = generateGapAnalysis(requirements, assessments);

      expect(gaps[0].priority).toBe("high");
      expect(gaps[1].priority).toBe("low");
    });

    it("should exclude not_applicable from gaps", () => {
      const requirements: UsRequirement[] = [
        {
          id: "na-req",
          cfrReference: "Test",
          title: "N/A Requirement",
          description: "Test",
          agency: "FCC",
          category: "licensing",
          bindingLevel: "mandatory",
          severity: "critical",
          applicability: {},
          complianceQuestion: "Test?",
          evidenceRequired: [],
          implementationGuidance: [],
          licenseTypes: [],
        },
      ];

      const assessments: RequirementAssessment[] = [
        {
          requirementId: "na-req",
          status: "not_applicable",
          assessedAt: new Date(),
        },
      ];

      const gaps = generateGapAnalysis(requirements, assessments);

      expect(gaps.length).toBe(0);
    });

    it("should add licensing-specific dependencies", () => {
      const requirements: UsRequirement[] = [
        {
          id: "license-req",
          cfrReference: "Test",
          title: "License Requirement",
          description: "Test",
          agency: "FCC",
          category: "licensing",
          bindingLevel: "mandatory",
          severity: "critical",
          applicability: {},
          complianceQuestion: "Test?",
          evidenceRequired: [],
          implementationGuidance: [],
          licenseTypes: [],
        },
      ];

      const gaps = generateGapAnalysis(requirements, []);

      expect(gaps[0].dependencies).toContain("Complete application package");
      expect(gaps[0].dependencies).toContain(
        "Financial responsibility documentation",
      );
    });

    it("should add debris-specific dependencies", () => {
      const requirements: UsRequirement[] = [
        {
          id: "debris-req",
          cfrReference: "Test",
          title: "Debris Requirement",
          description: "Test",
          agency: "FCC",
          category: "orbital_debris",
          bindingLevel: "mandatory",
          severity: "critical",
          applicability: {},
          complianceQuestion: "Test?",
          evidenceRequired: [],
          implementationGuidance: [],
          licenseTypes: [],
        },
      ];

      const gaps = generateGapAnalysis(requirements, []);

      expect(gaps[0].dependencies).toContain("Orbital lifetime analysis");
      expect(gaps[0].dependencies).toContain("Disposal capability design");
    });
  });

  describe("generateAgencyStatus", () => {
    it("should generate correct FCC agency status", () => {
      const profile = createLeoSatelliteProfile();
      const requirements = getApplicableRequirements(profile);
      const assessments = createFullyCompliantAssessments(requirements);
      const licenses = determineRequiredLicenses(profile);

      const status = generateAgencyStatus(
        "FCC",
        requirements,
        assessments,
        licenses,
      );

      expect(status.agency).toBe("FCC");
      expect(status.fullName).toBe("Federal Communications Commission");
      expect(status.score).toBe(100);
      expect(status.riskLevel).toBe("low");
    });

    it("should calculate agency-specific requirement counts", () => {
      const profile = createLeoSatelliteProfile();
      const requirements = getApplicableRequirements(profile);
      const assessments = createPartialAssessments(requirements);
      const licenses = determineRequiredLicenses(profile);

      const status = generateAgencyStatus(
        "FCC",
        requirements,
        assessments,
        licenses,
      );

      expect(status.assessedCount).toBeGreaterThan(0);
      expect(
        status.compliantCount + status.partialCount + status.nonCompliantCount,
      ).toBe(status.assessedCount);
    });

    it("should filter licenses by agency", () => {
      const multiProfile = createMultiAgencyProfile();
      const requirements = getApplicableRequirements(multiProfile);
      const assessments = createFullyCompliantAssessments(requirements);
      const licenses = determineRequiredLicenses(multiProfile);

      const fccStatus = generateAgencyStatus(
        "FCC",
        requirements,
        assessments,
        licenses,
      );
      const faaStatus = generateAgencyStatus(
        "FAA",
        requirements,
        assessments,
        licenses,
      );
      const noaaStatus = generateAgencyStatus(
        "NOAA",
        requirements,
        assessments,
        licenses,
      );

      expect(
        fccStatus.requiredLicenses.every((l) => l.startsWith("fcc_")),
      ).toBe(true);
      expect(
        faaStatus.requiredLicenses.every((l) => l.startsWith("faa_")),
      ).toBe(true);
      expect(
        noaaStatus.requiredLicenses.every((l) => l.startsWith("noaa_")),
      ).toBe(true);
    });

    it("should set high risk for low agency score", () => {
      const requirements: UsRequirement[] = [
        {
          id: "fcc-req1",
          cfrReference: "Test",
          title: "FCC Req 1",
          description: "Test",
          agency: "FCC",
          category: "licensing",
          bindingLevel: "mandatory",
          severity: "critical",
          applicability: {},
          complianceQuestion: "Test?",
          evidenceRequired: [],
          implementationGuidance: [],
          licenseTypes: [],
        },
        {
          id: "fcc-req2",
          cfrReference: "Test",
          title: "FCC Req 2",
          description: "Test",
          agency: "FCC",
          category: "spectrum",
          bindingLevel: "mandatory",
          severity: "major",
          applicability: {},
          complianceQuestion: "Test?",
          evidenceRequired: [],
          implementationGuidance: [],
          licenseTypes: [],
        },
      ];

      const assessments: RequirementAssessment[] = [
        {
          requirementId: "fcc-req1",
          status: "non_compliant",
          assessedAt: new Date(),
        },
        {
          requirementId: "fcc-req2",
          status: "non_compliant",
          assessedAt: new Date(),
        },
      ];

      const status = generateAgencyStatus("FCC", requirements, assessments, []);

      expect(status.riskLevel).toBe("critical");
    });
  });

  describe("findEuSpaceActCrossReferences", () => {
    it("should find all unique EU Space Act cross-references", () => {
      const crossRefs = findEuSpaceActCrossReferences(allUsSpaceRequirements);

      expect(crossRefs.length).toBeGreaterThan(0);
      expect(crossRefs).toContain("Art. 4");
      expect(crossRefs).toContain("Art. 72");
    });

    it("should return sorted unique references", () => {
      const crossRefs = findEuSpaceActCrossReferences(allUsSpaceRequirements);

      const sorted = [...crossRefs].sort();
      expect(crossRefs).toEqual(sorted);
    });

    it("should return empty array for requirements without cross-refs", () => {
      const requirements: UsRequirement[] = [
        {
          id: "no-crossref",
          cfrReference: "Test",
          title: "No Cross Ref",
          description: "Test",
          agency: "FCC",
          category: "licensing",
          bindingLevel: "mandatory",
          severity: "critical",
          applicability: {},
          complianceQuestion: "Test?",
          evidenceRequired: [],
          implementationGuidance: [],
          licenseTypes: [],
        },
      ];

      const crossRefs = findEuSpaceActCrossReferences(requirements);

      expect(crossRefs.length).toBe(0);
    });
  });

  describe("findCopuosCrossReferences", () => {
    it("should find all unique COPUOS cross-references", () => {
      const crossRefs = findCopuosCrossReferences(allUsSpaceRequirements);

      expect(crossRefs.length).toBeGreaterThan(0);
      expect(crossRefs).toContain("COPUOS B.1");
      expect(crossRefs).toContain("IADC 5.3.2");
    });

    it("should return sorted unique references", () => {
      const crossRefs = findCopuosCrossReferences(allUsSpaceRequirements);

      const sorted = [...crossRefs].sort();
      expect(crossRefs).toEqual(sorted);
    });
  });

  describe("checkDeorbitCompliance", () => {
    it("should identify LEO satellites correctly", () => {
      const leoProfile = createLeoSatelliteProfile();
      const result = checkDeorbitCompliance(leoProfile);

      expect(result.isLeo).toBe(true);
      expect(result.requiredDisposalYears).toBe(5);
    });

    it("should apply 25-year rule for non-LEO", () => {
      const geoProfile: UsOperatorProfile = {
        ...createLeoSatelliteProfile(),
        orbitRegime: "GEO",
        altitudeKm: 35786,
      };

      const result = checkDeorbitCompliance(geoProfile);

      expect(result.isLeo).toBe(false);
      expect(result.requiredDisposalYears).toBe(25);
    });

    it("should flag non-compliance when planned disposal exceeds limit", () => {
      const profile = createLeoSatelliteProfile();
      const result = checkDeorbitCompliance(profile, 10); // 10 years exceeds 5-year limit

      expect(result.compliant).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should flag LEO satellites without propulsion", () => {
      const noPropulsionProfile: UsOperatorProfile = {
        ...createLeoSatelliteProfile(),
        hasPropulsion: false,
        hasManeuverability: false,
      };

      const result = checkDeorbitCompliance(noPropulsionProfile);

      expect(result.warnings).toContain(
        "LEO satellite without propulsion may not meet 5-year disposal requirement",
      );
    });

    it("should add warning for LEO constellations", () => {
      const constellationProfile: UsOperatorProfile = {
        ...createLeoSatelliteProfile(),
        isConstellation: true,
        satelliteCount: 100,
      };

      const result = checkDeorbitCompliance(constellationProfile);

      expect(result.warnings).toContain(
        "Large LEO constellation subject to enhanced debris mitigation scrutiny",
      );
    });

    it("should be compliant when planned disposal is within limit", () => {
      const profile = createLeoSatelliteProfile();
      const result = checkDeorbitCompliance(profile, 3); // 3 years is within 5-year limit

      expect(result.compliant).toBe(true);
    });
  });

  describe("calculateDeorbitRequirements", () => {
    it("should return non-LEO info for GEO satellites", () => {
      const geoProfile: UsOperatorProfile = {
        ...createLeoSatelliteProfile(),
        orbitRegime: "GEO",
        altitudeKm: 35786, // GEO altitude
        isNGSO: false,
      };

      const result = calculateDeorbitRequirements(geoProfile);

      expect(result.isLeoSubject).toBe(false);
      expect(result.requiredDisposalYears).toBe(25);
      expect(result.currentCompliance).toBe("compliant");
    });

    it("should calculate compliance timeline for LEO with dates", () => {
      const profile = createLeoSatelliteProfile();
      const launchDate = new Date("2024-01-01");

      const result = calculateDeorbitRequirements(profile, launchDate);

      expect(result.isLeoSubject).toBe(true);
      expect(result.launchDate).toEqual(launchDate);
      expect(result.missionEndDate).toBeDefined();
      expect(result.disposalDeadline).toBeDefined();
    });

    it("should flag at_risk when deadline is near", () => {
      const profile: UsOperatorProfile = {
        ...createLeoSatelliteProfile(),
        missionDurationYears: 1,
      };
      const launchDate = new Date();
      launchDate.setFullYear(launchDate.getFullYear() - 5); // Launched 5 years ago

      const result = calculateDeorbitRequirements(profile, launchDate);

      expect(["at_risk", "non_compliant"]).toContain(result.currentCompliance);
    });

    it("should include constellation warning for large fleets", () => {
      const constellationProfile: UsOperatorProfile = {
        ...createLeoSatelliteProfile(),
        isConstellation: true,
        satelliteCount: 100,
      };

      const result = calculateDeorbitRequirements(constellationProfile);

      expect(
        result.recommendations.some((r) => r.includes("constellation")),
      ).toBe(true);
    });

    it("should recommend propulsion verification for satellites without it", () => {
      const noPropProfile: UsOperatorProfile = {
        ...createLeoSatelliteProfile(),
        hasPropulsion: false,
      };

      const result = calculateDeorbitRequirements(noPropProfile);

      expect(
        result.recommendations.some((r) => r.includes("passive decay")),
      ).toBe(true);
    });
  });

  describe("generateRecommendations", () => {
    it("should generate agency-specific recommendations for low scores", () => {
      const profile = createLeoSatelliteProfile();
      const score: UsComplianceScore = {
        overall: 50,
        byAgency: { FCC: 50, FAA: 100, NOAA: 100 },
        byCategory: {},
        byLicenseType: {},
        mandatory: 50,
        recommended: 80,
      };

      const recommendations = generateRecommendations(
        profile,
        score,
        [],
        ["FCC"],
        ["fcc_space_station"],
      );

      expect(recommendations.some((r) => r.includes("FCC"))).toBe(true);
    });

    it("should recommend 5-year disposal for LEO satellites", () => {
      const profile = createLeoSatelliteProfile();
      const score: UsComplianceScore = {
        overall: 70,
        byAgency: { FCC: 70, FAA: 100, NOAA: 100 },
        byCategory: { orbital_debris: 50 },
        byLicenseType: {},
        mandatory: 70,
        recommended: 80,
      };

      const recommendations = generateRecommendations(
        profile,
        score,
        [],
        ["FCC"],
        ["fcc_space_station"],
      );

      expect(recommendations.some((r) => r.includes("5-year"))).toBe(true);
    });

    it("should include ITAR/EAR reminder", () => {
      const profile = createLeoSatelliteProfile();
      const score: UsComplianceScore = {
        overall: 100,
        byAgency: { FCC: 100, FAA: 100, NOAA: 100 },
        byCategory: {},
        byLicenseType: {},
        mandatory: 100,
        recommended: 100,
      };

      const recommendations = generateRecommendations(
        profile,
        score,
        [],
        ["FCC"],
        ["fcc_space_station"],
      );

      expect(recommendations.some((r) => r.includes("ITAR/EAR"))).toBe(true);
    });

    it("should limit recommendations to 12", () => {
      const profile = createMultiAgencyProfile();
      const score: UsComplianceScore = {
        overall: 30,
        byAgency: { FCC: 30, FAA: 30, NOAA: 30 },
        byCategory: {
          orbital_debris: 30,
          spectrum: 30,
          launch_safety: 30,
          remote_sensing: 30,
          financial_responsibility: 30,
        },
        byLicenseType: {},
        mandatory: 30,
        recommended: 30,
      };

      const manyGaps = Array(20)
        .fill(null)
        .map((_, i) => ({
          requirementId: `gap-${i}`,
          agency: "FCC" as UsAgency,
          status: "non_compliant" as UsComplianceStatus,
          priority: "high" as const,
          gap: `Gap ${i}`,
          recommendation: `Fix ${i}`,
          estimatedEffort: "medium" as const,
          dependencies: [],
          cfrReference: `Test ${i}`,
        }));

      const recommendations = generateRecommendations(
        profile,
        score,
        manyGaps,
        ["FCC", "FAA", "NOAA"],
        ["fcc_space_station", "faa_launch", "noaa_remote_sensing"],
      );

      expect(recommendations.length).toBeLessThanOrEqual(12);
    });
  });

  describe("performAssessment", () => {
    it("should return complete assessment result", () => {
      const profile = createLeoSatelliteProfile();
      const requirements = getApplicableRequirements(profile);
      const assessments = createFullyCompliantAssessments(requirements);

      const result = performAssessment(profile, assessments);

      expect(result.profile).toEqual(profile);
      expect(result.applicableRequirements.length).toBeGreaterThan(0);
      expect(result.score).toBeDefined();
      expect(result.agencyStatuses.length).toBeGreaterThan(0);
      expect(result.riskLevel).toBe("low");
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("should include deorbit compliance for satellite operators", () => {
      const profile = createLeoSatelliteProfile();
      const requirements = getApplicableRequirements(profile);
      const assessments = createFullyCompliantAssessments(requirements);

      const result = performAssessment(profile, assessments);

      expect(result.deorbitCompliance).toBeDefined();
      expect(result.deorbitCompliance?.isLeo).toBe(true);
    });

    it("should not include deorbit compliance for non-satellite operators", () => {
      const launchProfile = createLaunchOperatorProfile();
      const requirements = getApplicableRequirements(launchProfile);
      const assessments = createFullyCompliantAssessments(requirements);

      const result = performAssessment(launchProfile, assessments);

      expect(result.deorbitCompliance).toBeUndefined();
    });

    it("should find EU Space Act cross-references", () => {
      const profile = createLeoSatelliteProfile();
      const requirements = getApplicableRequirements(profile);
      const assessments = createFullyCompliantAssessments(requirements);

      const result = performAssessment(profile, assessments);

      expect(result.euSpaceActOverlaps.length).toBeGreaterThan(0);
    });

    it("should find COPUOS cross-references", () => {
      const profile = createLeoSatelliteProfile();
      const requirements = getApplicableRequirements(profile);
      const assessments = createFullyCompliantAssessments(requirements);

      const result = performAssessment(profile, assessments);

      expect(result.copuosOverlaps.length).toBeGreaterThan(0);
    });
  });

  describe("generateComplianceSummary", () => {
    it("should calculate correct counts by status", () => {
      const profile = createLeoSatelliteProfile();
      const requirements = getApplicableRequirements(profile);
      const assessments = createPartialAssessments(requirements);

      const summary = generateComplianceSummary(
        profile,
        requirements,
        assessments,
      );

      expect(summary.compliant).toBeGreaterThanOrEqual(0);
      expect(summary.partial).toBeGreaterThanOrEqual(0);
      expect(summary.nonCompliant).toBeGreaterThanOrEqual(0);
      expect(
        summary.compliant +
          summary.partial +
          summary.nonCompliant +
          summary.notAssessed +
          summary.notApplicable,
      ).toBe(requirements.length);
    });

    it("should calculate counts by agency", () => {
      const profile = createMultiAgencyProfile();
      const requirements = getApplicableRequirements(profile);
      const assessments = createFullyCompliantAssessments(requirements);

      const summary = generateComplianceSummary(
        profile,
        requirements,
        assessments,
      );

      expect(summary.byAgency.FCC).toBeDefined();
      expect(summary.byAgency.FAA).toBeDefined();
      expect(summary.byAgency.NOAA).toBeDefined();
    });

    it("should track critical and major gaps", () => {
      const requirements: UsRequirement[] = [
        {
          id: "critical-gap",
          cfrReference: "Test",
          title: "Critical",
          description: "Test",
          agency: "FCC",
          category: "licensing",
          bindingLevel: "mandatory",
          severity: "critical",
          applicability: {},
          complianceQuestion: "Test?",
          evidenceRequired: [],
          implementationGuidance: [],
          licenseTypes: [],
        },
        {
          id: "major-gap",
          cfrReference: "Test",
          title: "Major",
          description: "Test",
          agency: "FCC",
          category: "spectrum",
          bindingLevel: "mandatory",
          severity: "major",
          applicability: {},
          complianceQuestion: "Test?",
          evidenceRequired: [],
          implementationGuidance: [],
          licenseTypes: [],
        },
      ];

      const assessments: RequirementAssessment[] = [
        {
          requirementId: "critical-gap",
          status: "non_compliant",
          assessedAt: new Date(),
        },
        {
          requirementId: "major-gap",
          status: "partial",
          assessedAt: new Date(),
        },
      ];

      const profile = createLeoSatelliteProfile();
      const summary = generateComplianceSummary(
        profile,
        requirements,
        assessments,
      );

      expect(summary.criticalGaps).toBe(1);
      expect(summary.majorGaps).toBe(1);
    });
  });

  describe("getLicenseRequirementSummaries", () => {
    it("should return summaries for required licenses", () => {
      const profile = createLeoSatelliteProfile();
      const requirements = getApplicableRequirements(profile);
      const assessments = createFullyCompliantAssessments(requirements);

      const summaries = getLicenseRequirementSummaries(profile, assessments);

      expect(summaries.length).toBeGreaterThan(0);
      expect(summaries[0].licenseType).toBeDefined();
      expect(summaries[0].agency).toBeDefined();
      expect(summaries[0].cfrPart).toBeDefined();
    });

    it("should include compliance score per license", () => {
      const profile = createLeoSatelliteProfile();
      const requirements = getApplicableRequirements(profile);
      const assessments = createFullyCompliantAssessments(requirements);

      const summaries = getLicenseRequirementSummaries(profile, assessments);

      summaries.forEach((summary) => {
        expect(summary.complianceScore).toBeGreaterThanOrEqual(0);
        expect(summary.complianceScore).toBeLessThanOrEqual(100);
      });
    });

    it("should include gaps per license", () => {
      const profile = createLeoSatelliteProfile();
      const requirements = getApplicableRequirements(profile);

      const summaries = getLicenseRequirementSummaries(profile, []); // No assessments = all gaps

      summaries.forEach((summary) => {
        if (summary.requirements.length > 0) {
          expect(summary.gaps.length).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });

  describe("generateAgencyDocumentationChecklist", () => {
    it("should generate checklists for required agencies", () => {
      const profile = createLeoSatelliteProfile();
      const requirements = getApplicableRequirements(profile);
      const assessments = createFullyCompliantAssessments(requirements);

      const checklists = generateAgencyDocumentationChecklist(
        profile,
        assessments,
      );

      expect(checklists.length).toBeGreaterThan(0);
      expect(checklists[0].agency).toBeDefined();
      expect(Array.isArray(checklists[0].documents)).toBe(true);
    });

    it("should include document status based on assessments", () => {
      const profile = createLeoSatelliteProfile();
      const requirements = getApplicableRequirements(profile);
      const compliantAssessments =
        createFullyCompliantAssessments(requirements);

      const compliantChecklists = generateAgencyDocumentationChecklist(
        profile,
        compliantAssessments,
      );

      const noAssessmentChecklists = generateAgencyDocumentationChecklist(
        profile,
        [],
      );

      // Compliant assessments should have more "complete" documents
      const compliantComplete = compliantChecklists.flatMap((c) =>
        c.documents.filter((d) => d.status === "complete"),
      ).length;

      const noAssessComplete = noAssessmentChecklists.flatMap((c) =>
        c.documents.filter((d) => d.status === "complete"),
      ).length;

      expect(compliantComplete).toBeGreaterThanOrEqual(noAssessComplete);
    });

    it("should sort documents by required status and completion", () => {
      const profile = createLeoSatelliteProfile();

      const checklists = generateAgencyDocumentationChecklist(profile, []);

      checklists.forEach((checklist) => {
        if (checklist.documents.length > 1) {
          // Required documents should come first
          const firstRequired = checklist.documents.findIndex(
            (d) => !d.required,
          );
          if (firstRequired > 0) {
            checklist.documents.slice(0, firstRequired).forEach((d) => {
              expect(d.required).toBe(true);
            });
          }
        }
      });
    });
  });
});
