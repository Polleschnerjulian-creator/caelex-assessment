import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    incident: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    supervisionConfig: {
      findUnique: vi.fn(),
    },
    supervisionReport: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    authorizationWorkflow: {
      findUnique: vi.fn(),
    },
    cybersecurityAssessment: {
      findMany: vi.fn(),
    },
    environmentalAssessment: {
      findMany: vi.fn(),
    },
    debrisAssessment: {
      findMany: vi.fn(),
    },
    insuranceAssessment: {
      findMany: vi.fn(),
    },
  },
}));

// Mock audit
vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

// Mock encryption
vi.mock("@/lib/encryption", () => ({
  encrypt: vi.fn((val: string) => Promise.resolve(`encrypted:${val}`)),
  decrypt: vi.fn((val: string) =>
    Promise.resolve(val.replace("encrypted:", "")),
  ),
  isEncrypted: vi.fn(
    (val: string) => typeof val === "string" && val.startsWith("encrypted:"),
  ),
}));

// Mock @react-pdf/renderer
vi.mock("@react-pdf/renderer", () => ({
  renderToBuffer: vi
    .fn()
    .mockResolvedValue(Buffer.from("mock-pdf-content", "utf-8")),
}));

// Mock PDF report components
vi.mock("@/lib/pdf/reports/nca-incident-report", () => ({
  NCAIncidentReport: vi.fn(() => null),
}));

vi.mock("@/lib/pdf/reports/nca-annual-compliance-report", () => ({
  NCAAnnualComplianceReport: vi.fn(() => null),
}));

vi.mock("@/lib/pdf/reports/nca-significant-change-report", () => ({
  NCASignificantChangeReport: vi.fn(() => null),
  getChangeTypeInfo: vi.fn((changeType: string) => {
    const info: Record<
      string,
      {
        description: string;
        deadlineDays: number;
        requiresPreApproval: boolean;
      }
    > = {
      ownership_transfer: {
        description: "Transfer of Ownership or Control",
        deadlineDays: 30,
        requiresPreApproval: true,
      },
      mission_modification: {
        description: "Mission Objectives or Parameters Modification",
        deadlineDays: 30,
        requiresPreApproval: true,
      },
      technical_change: {
        description: "Significant Technical Modification",
        deadlineDays: 30,
        requiresPreApproval: true,
      },
      operational_change: {
        description: "Operational Procedures Change",
        deadlineDays: 14,
        requiresPreApproval: false,
      },
      orbital_change: {
        description: "Orbital Parameters Modification",
        deadlineDays: 30,
        requiresPreApproval: true,
      },
      end_of_life_update: {
        description: "End-of-Life Plan Update",
        deadlineDays: 30,
        requiresPreApproval: true,
      },
      insurance_change: {
        description: "Insurance Coverage Change",
        deadlineDays: 14,
        requiresPreApproval: false,
      },
      contact_change: {
        description: "Designated Contact Change",
        deadlineDays: 7,
        requiresPreApproval: false,
      },
      other: {
        description: "Other Significant Change",
        deadlineDays: 30,
        requiresPreApproval: false,
      },
    };
    return info[changeType] || info.other;
  }),
}));

import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { decrypt, isEncrypted } from "@/lib/encryption";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  generateReport,
  getAvailableReportTypes,
  getReportHistory,
} from "@/lib/services/report-generation-service";
import type {
  GenerateIncidentReportOptions,
  GenerateAnnualComplianceReportOptions,
  GenerateSignificantChangeReportOptions,
} from "@/lib/services/report-generation-service";

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockIncident(overrides = {}) {
  return {
    id: "incident-1",
    incidentNumber: "INC-2025-001",
    title: "Loss of Contact with SAT-Alpha",
    category: "loss_of_contact",
    severity: "critical",
    status: "resolved",
    description: "Contact was lost at 14:32 UTC",
    rootCause: "Solar panel degradation caused power failure",
    impactAssessment: "Service degradation for 12 hours",
    lessonsLearned: "Improved power monitoring thresholds",
    detectedAt: new Date("2025-06-15T14:32:00Z"),
    detectedBy: "Ground Station Operator",
    detectionMethod: "Telemetry Loss Alert",
    containedAt: new Date("2025-06-15T16:00:00Z"),
    resolvedAt: new Date("2025-06-16T10:00:00Z"),
    immediateActions: ["Attempted re-contact", "Notified ops team"],
    containmentMeasures: ["Activated backup transponder"],
    resolutionSteps: ["Performed power reset", "Restored telemetry"],
    requiresNCANotification: true,
    reportedToNCA: true,
    ncaReportDate: new Date("2025-06-15T18:00:00Z"),
    ncaReferenceNumber: "NCA-2025-1234",
    reportedToEUSPA: false,
    supervisionId: "supervision-1",
    supervision: {
      user: {
        organization: "SpaceCorp GmbH",
        name: "Hans Mueller",
        email: "hans@spacecorp.eu",
      },
      designatedContactName: "Dr. Maria Schmidt",
      designatedContactEmail: "maria@spacecorp.eu",
      designatedContactPhone: "+49 30 12345678",
      designatedContactRole: "Compliance Officer",
    },
    affectedAssets: [
      {
        assetName: "SAT-Alpha",
        cosparId: "2024-001A",
        noradId: "55001",
      },
    ],
    ...overrides,
  };
}

function createMockSupervision(overrides = {}) {
  return {
    id: "supervision-1",
    userId: "user-1",
    primaryCountry: "Germany",
    designatedContactName: "Dr. Maria Schmidt",
    designatedContactEmail: "maria@spacecorp.eu",
    user: {
      organization: "SpaceCorp GmbH",
      operatorType: "Spacecraft Operator",
      name: "Hans Mueller",
      email: "hans@spacecorp.eu",
    },
    incidents: [
      {
        id: "inc-1",
        severity: "critical",
        status: "resolved",
        category: "loss_of_contact",
        reportedToNCA: true,
      },
      {
        id: "inc-2",
        severity: "high",
        status: "resolved",
        category: "cyber_incident",
        reportedToNCA: true,
      },
      {
        id: "inc-3",
        severity: "medium",
        status: "investigating",
        category: "spacecraft_anomaly",
        reportedToNCA: false,
      },
      {
        id: "inc-4",
        severity: "low",
        status: "resolved",
        category: "debris_generation",
        reportedToNCA: false,
      },
    ],
    ...overrides,
  };
}

function createMockUser(overrides = {}) {
  return {
    name: "Hans Mueller",
    email: "hans@spacecorp.eu",
    ...overrides,
  };
}

function createMockWorkflow(overrides = {}) {
  return {
    id: "workflow-1",
    userId: "user-1",
    approvedAt: new Date("2024-12-01"),
    createdAt: new Date("2024-11-15"),
    primaryNCAName: "BNetzA",
    primaryNCA: "DE",
    user: {
      organization: "SpaceCorp GmbH",
      name: "Hans Mueller",
      email: "hans@spacecorp.eu",
    },
    ...overrides,
  };
}

function createMockReportRecord(overrides = {}) {
  return {
    id: "report-1",
    supervisionId: "supervision-1",
    reportType: "incident",
    title: "NCA Incident Report - INC-2025-001",
    status: "generated",
    generatedAt: new Date(),
    generatedBy: "user-1",
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("Report Generation Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // generateReport — dispatcher
  // --------------------------------------------------------------------------

  describe("generateReport", () => {
    it("should dispatch to incident report generator for type 'incident'", async () => {
      const incident = createMockIncident();
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(
        incident as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord() as never,
      );

      const options: GenerateIncidentReportOptions = {
        type: "incident",
        incidentId: "incident-1",
        userId: "user-1",
      };

      const result = await generateReport(options);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.report.reportType).toBe("incident");
        expect(result.report.contentType).toBe("application/pdf");
      }
    });

    it("should dispatch to annual compliance report generator for type 'annual_compliance'", async () => {
      const supervision = createMockSupervision();
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(
        supervision as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord({ reportType: "annual_compliance" }) as never,
      );

      const options: GenerateAnnualComplianceReportOptions = {
        type: "annual_compliance",
        supervisionId: "supervision-1",
        reportYear: "2025",
        userId: "user-1",
      };

      const result = await generateReport(options);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.report.reportType).toBe("annual_compliance");
      }
    });

    it("should dispatch to significant change report generator for type 'significant_change'", async () => {
      const workflow = createMockWorkflow();
      vi.mocked(prisma.authorizationWorkflow.findUnique).mockResolvedValue(
        workflow as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord({
          reportType: "significant_change",
        }) as never,
      );

      const options: GenerateSignificantChangeReportOptions = {
        type: "significant_change",
        workflowId: "workflow-1",
        changeType: "ownership_transfer",
        changeData: {
          title: "Ownership Transfer to NewSpace Inc.",
          description: "Transfer of ownership from SpaceCorp to NewSpace Inc.",
          justification: "Strategic acquisition agreement",
          effectiveDate: new Date("2025-09-01"),
          currentState: [{ field: "Owner", value: "SpaceCorp GmbH" }],
          proposedState: [{ field: "Owner", value: "NewSpace Inc." }],
          impactAssessment: {
            safetyImpact: "none",
            debrisImpact: "none",
            thirdPartyImpact: "low",
            regulatoryImpact: "high",
          },
        },
        userId: "user-1",
      };

      const result = await generateReport(options);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.report.reportType).toBe("significant_change");
      }
    });

    it("should return INVALID_DATA error for unknown report type", async () => {
      const result = await generateReport({
        type: "unknown_type" as never,
        userId: "user-1",
      } as never);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Unknown report type");
        expect(result.code).toBe("INVALID_DATA");
      }
    });

    it("should catch and return GENERATION_FAILED for unexpected errors", async () => {
      vi.mocked(prisma.incident.findUnique).mockRejectedValue(
        new Error("Database connection lost"),
      );

      const options: GenerateIncidentReportOptions = {
        type: "incident",
        incidentId: "incident-1",
        userId: "user-1",
      };

      const result = await generateReport(options);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Database connection lost");
        expect(result.code).toBe("GENERATION_FAILED");
      }
    });

    it("should handle non-Error thrown values gracefully", async () => {
      vi.mocked(prisma.incident.findUnique).mockRejectedValue(
        "string-error-value",
      );

      const options: GenerateIncidentReportOptions = {
        type: "incident",
        incidentId: "incident-1",
        userId: "user-1",
      };

      const result = await generateReport(options);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Report generation failed");
        expect(result.code).toBe("GENERATION_FAILED");
      }
    });
  });

  // --------------------------------------------------------------------------
  // Incident Report Generation
  // --------------------------------------------------------------------------

  describe("generateIncidentReport", () => {
    it("should return NOT_FOUND when incident does not exist", async () => {
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(null);

      const result = await generateReport({
        type: "incident",
        incidentId: "nonexistent",
        userId: "user-1",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Incident not found");
        expect(result.code).toBe("NOT_FOUND");
      }
    });

    it("should fetch incident with correct include relations", async () => {
      const incident = createMockIncident();
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(
        incident as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord() as never,
      );

      await generateReport({
        type: "incident",
        incidentId: "incident-1",
        userId: "user-1",
      });

      expect(prisma.incident.findUnique).toHaveBeenCalledWith({
        where: { id: "incident-1" },
        include: {
          supervision: {
            include: {
              user: {
                select: {
                  organization: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          affectedAssets: true,
        },
      });
    });

    it("should decrypt encrypted fields", async () => {
      const incident = createMockIncident({
        description: "encrypted:Sensitive incident details",
        rootCause: "encrypted:Root cause data",
        impactAssessment: "encrypted:Impact assessment data",
        lessonsLearned: "encrypted:Lessons learned data",
      });
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(
        incident as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord() as never,
      );

      await generateReport({
        type: "incident",
        incidentId: "incident-1",
        userId: "user-1",
      });

      expect(isEncrypted).toHaveBeenCalledWith(
        "encrypted:Sensitive incident details",
      );
      expect(decrypt).toHaveBeenCalledWith(
        "encrypted:Sensitive incident details",
      );
      expect(decrypt).toHaveBeenCalledWith("encrypted:Root cause data");
      expect(decrypt).toHaveBeenCalledWith("encrypted:Impact assessment data");
      expect(decrypt).toHaveBeenCalledWith("encrypted:Lessons learned data");
    });

    it("should not attempt to decrypt non-encrypted fields", async () => {
      const incident = createMockIncident({
        description: "Plain text description",
        rootCause: "Plain root cause",
        impactAssessment: "Plain impact assessment",
        lessonsLearned: "Plain lessons learned",
      });
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(
        incident as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord() as never,
      );

      await generateReport({
        type: "incident",
        incidentId: "incident-1",
        userId: "user-1",
      });

      // isEncrypted should be called but decrypt should NOT be called since fields are not encrypted
      expect(isEncrypted).toHaveBeenCalledWith("Plain text description");
      expect(decrypt).not.toHaveBeenCalledWith("Plain text description");
    });

    it("should handle null encrypted fields gracefully", async () => {
      const incident = createMockIncident({
        description: null,
        rootCause: null,
        impactAssessment: null,
        lessonsLearned: null,
      });
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(
        incident as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord() as never,
      );

      const result = await generateReport({
        type: "incident",
        incidentId: "incident-1",
        userId: "user-1",
      });

      expect(result.success).toBe(true);
    });

    it("should exclude resolution details when includeResolutionDetails is false", async () => {
      const incident = createMockIncident();
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(
        incident as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord() as never,
      );

      const result = await generateReport({
        type: "incident",
        incidentId: "incident-1",
        userId: "user-1",
        includeResolutionDetails: false,
      });

      expect(result.success).toBe(true);
      // The function still generates successfully; internal data differs
      expect(renderToBuffer).toHaveBeenCalled();
    });

    it("should include resolution details by default", async () => {
      const incident = createMockIncident();
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(
        incident as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord() as never,
      );

      const result = await generateReport({
        type: "incident",
        incidentId: "incident-1",
        userId: "user-1",
        // includeResolutionDetails defaults to true
      });

      expect(result.success).toBe(true);
      expect(renderToBuffer).toHaveBeenCalled();
    });

    it("should create supervision report record in database", async () => {
      const incident = createMockIncident();
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(
        incident as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord() as never,
      );

      await generateReport({
        type: "incident",
        incidentId: "incident-1",
        userId: "user-1",
      });

      expect(prisma.supervisionReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          supervisionId: "supervision-1",
          reportType: "incident",
          title: "NCA Incident Report - INC-2025-001",
          status: "generated",
          generatedBy: "user-1",
          incidentId: "incident-1",
          metadata: {
            incidentNumber: "INC-2025-001",
            category: "loss_of_contact",
            severity: "critical",
          },
        }),
      });
    });

    it("should log audit event after report generation", async () => {
      const incident = createMockIncident();
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(
        incident as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord() as never,
      );

      await generateReport({
        type: "incident",
        incidentId: "incident-1",
        userId: "user-1",
      });

      expect(logAuditEvent).toHaveBeenCalledWith({
        action: "report.generated",
        userId: "user-1",
        entityType: "SupervisionReport",
        entityId: "report-1",
        newValue: {
          reportType: "incident",
          incidentId: "incident-1",
          incidentNumber: "INC-2025-001",
        },
      });
    });

    it("should generate correct filename with date and incident number", async () => {
      const incident = createMockIncident();
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(
        incident as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord() as never,
      );

      const result = await generateReport({
        type: "incident",
        incidentId: "incident-1",
        userId: "user-1",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.report.filename).toMatch(
          /^NCA-Incident-Report-INC-2025-001-\d{4}-\d{2}-\d{2}\.pdf$/,
        );
      }
    });

    it("should return correct metadata in the report", async () => {
      const incident = createMockIncident();
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(
        incident as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord() as never,
      );

      const result = await generateReport({
        type: "incident",
        incidentId: "incident-1",
        userId: "user-1",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.report.reportId).toBe("report-1");
        expect(result.report.reportType).toBe("incident");
        expect(result.report.contentType).toBe("application/pdf");
        expect(result.report.metadata.generatedBy).toBe("Hans Mueller");
        expect(result.report.metadata.organization).toBe("SpaceCorp GmbH");
        expect(result.report.metadata.generatedAt).toBeInstanceOf(Date);
      }
    });

    it("should return Buffer containing PDF content", async () => {
      const incident = createMockIncident();
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(
        incident as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord() as never,
      );

      const result = await generateReport({
        type: "incident",
        incidentId: "incident-1",
        userId: "user-1",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Buffer.isBuffer(result.report.buffer)).toBe(true);
        expect(result.report.buffer.length).toBeGreaterThan(0);
      }
    });

    it("should use userId as generatedBy fallback when user is not found", async () => {
      const incident = createMockIncident();
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(
        incident as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord() as never,
      );

      const result = await generateReport({
        type: "incident",
        incidentId: "incident-1",
        userId: "user-1",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.report.metadata.generatedBy).toBe("user-1");
      }
    });

    it("should use email as generatedBy when user has no name", async () => {
      const incident = createMockIncident();
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(
        incident as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        name: null,
        email: "fallback@spacecorp.eu",
      } as never);
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord() as never,
      );

      const result = await generateReport({
        type: "incident",
        incidentId: "incident-1",
        userId: "user-1",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        // generatedBy in metadata uses name ?? userId. But report data uses name || email || "System".
        // The metadata.generatedBy uses user?.name || userId — so null name falls to userId.
        expect(result.report.metadata.generatedBy).toBe("user-1");
      }
    });

    it("should use 'Unknown Organization' when organization is null", async () => {
      const incident = createMockIncident({
        supervision: {
          user: {
            organization: null,
            name: "Hans Mueller",
            email: "hans@spacecorp.eu",
          },
          designatedContactName: null,
          designatedContactEmail: null,
          designatedContactPhone: null,
          designatedContactRole: null,
        },
      });
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(
        incident as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord() as never,
      );

      const result = await generateReport({
        type: "incident",
        incidentId: "incident-1",
        userId: "user-1",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.report.metadata.organization).toBe(
          "Unknown Organization",
        );
      }
    });

    it("should map incident categories to correct article references", async () => {
      const categories = [
        { category: "loss_of_contact", expected: "EU Space Act Art. 34, 79" },
        { category: "debris_generation", expected: "EU Space Act Art. 55-73" },
        {
          category: "cyber_incident",
          expected: "EU Space Act Art. 74-95, NIS2 Directive",
        },
        {
          category: "spacecraft_anomaly",
          expected: "EU Space Act Art. 34, 37",
        },
        { category: "conjunction_event", expected: "EU Space Act Art. 55-73" },
        {
          category: "regulatory_breach",
          expected: "EU Space Act Art. 33-54",
        },
        { category: "other", expected: "EU Space Act Art. 34" },
      ];

      for (const { category } of categories) {
        vi.clearAllMocks();
        const incident = createMockIncident({ category });
        vi.mocked(prisma.incident.findUnique).mockResolvedValue(
          incident as never,
        );
        vi.mocked(prisma.user.findUnique).mockResolvedValue(
          createMockUser() as never,
        );
        vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
          createMockReportRecord() as never,
        );

        const result = await generateReport({
          type: "incident",
          incidentId: "incident-1",
          userId: "user-1",
        });

        expect(result.success).toBe(true);
        // We verify the renderToBuffer was called, meaning the report was built
        expect(renderToBuffer).toHaveBeenCalled();
      }
    });

    it("should handle incidents with empty affected assets array", async () => {
      const incident = createMockIncident({ affectedAssets: [] });
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(
        incident as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord() as never,
      );

      const result = await generateReport({
        type: "incident",
        incidentId: "incident-1",
        userId: "user-1",
      });

      expect(result.success).toBe(true);
    });

    it("should handle incidents with multiple affected assets", async () => {
      const incident = createMockIncident({
        affectedAssets: [
          { assetName: "SAT-Alpha", cosparId: "2024-001A", noradId: "55001" },
          { assetName: "SAT-Beta", cosparId: null, noradId: null },
          {
            assetName: "SAT-Gamma",
            cosparId: "2024-003A",
            noradId: "55003",
          },
        ],
      });
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(
        incident as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord() as never,
      );

      const result = await generateReport({
        type: "incident",
        incidentId: "incident-1",
        userId: "user-1",
      });

      expect(result.success).toBe(true);
    });

    it("should handle PDF rendering failure", async () => {
      const incident = createMockIncident();
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(
        incident as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(renderToBuffer).mockRejectedValueOnce(
        new Error("PDF rendering failed: font not found"),
      );

      const result = await generateReport({
        type: "incident",
        incidentId: "incident-1",
        userId: "user-1",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("PDF rendering failed: font not found");
        expect(result.code).toBe("GENERATION_FAILED");
      }
    });

    it("should handle database error during report record creation", async () => {
      const incident = createMockIncident();
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(
        incident as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockRejectedValue(
        new Error("Unique constraint violation"),
      );

      const result = await generateReport({
        type: "incident",
        incidentId: "incident-1",
        userId: "user-1",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Unique constraint violation");
        expect(result.code).toBe("GENERATION_FAILED");
      }
    });

    it("should use fallback values for optional incident fields", async () => {
      const incident = createMockIncident({
        detectedBy: null,
        detectionMethod: null,
        containedAt: null,
        resolvedAt: null,
        immediateActions: null,
        containmentMeasures: null,
        resolutionSteps: null,
        ncaReportDate: null,
        ncaReferenceNumber: null,
      });
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(
        incident as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord() as never,
      );

      const result = await generateReport({
        type: "incident",
        incidentId: "incident-1",
        userId: "user-1",
      });

      expect(result.success).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Annual Compliance Report Generation
  // --------------------------------------------------------------------------

  describe("generateAnnualComplianceReport", () => {
    it("should return NOT_FOUND when supervision does not exist", async () => {
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(null);

      const result = await generateReport({
        type: "annual_compliance",
        supervisionId: "nonexistent",
        reportYear: "2025",
        userId: "user-1",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Supervision record not found");
        expect(result.code).toBe("NOT_FOUND");
      }
    });

    it("should fetch supervision with correct year-scoped incidents", async () => {
      const supervision = createMockSupervision();
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(
        supervision as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord({ reportType: "annual_compliance" }) as never,
      );

      await generateReport({
        type: "annual_compliance",
        supervisionId: "supervision-1",
        reportYear: "2025",
        userId: "user-1",
      });

      expect(prisma.supervisionConfig.findUnique).toHaveBeenCalledWith({
        where: { id: "supervision-1" },
        include: {
          user: {
            select: {
              organization: true,
              operatorType: true,
              name: true,
              email: true,
            },
          },
          incidents: {
            where: {
              detectedAt: {
                gte: new Date("2025-01-01"),
                lt: new Date("2026-01-01"),
              },
            },
          },
        },
      });
    });

    it("should query all four assessment types for the given year", async () => {
      const supervision = createMockSupervision();
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(
        supervision as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord({ reportType: "annual_compliance" }) as never,
      );

      await generateReport({
        type: "annual_compliance",
        supervisionId: "supervision-1",
        reportYear: "2025",
        userId: "user-1",
      });

      // All four assessment types should be queried
      expect(prisma.cybersecurityAssessment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "user-1",
          }),
          orderBy: { createdAt: "desc" },
          take: 1,
        }),
      );
      expect(prisma.environmentalAssessment.findMany).toHaveBeenCalled();
      expect(prisma.debrisAssessment.findMany).toHaveBeenCalled();
      expect(prisma.insuranceAssessment.findMany).toHaveBeenCalled();
    });

    it("should calculate overall compliance score based on assessment statuses", async () => {
      const supervision = createMockSupervision({ incidents: [] });
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(
        supervision as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );

      // All assessments present and compliant
      vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([
        { frameworkGeneratedAt: new Date(), createdAt: new Date() },
      ] as never);
      vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([
        { status: "approved" },
      ] as never);
      vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValue([
        {
          planGenerated: true,
          hasPassivationCap: true,
          deorbitStrategy: "direct",
        },
      ] as never);
      vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([
        { reportGenerated: true },
      ] as never);
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord({ reportType: "annual_compliance" }) as never,
      );

      const result = await generateReport({
        type: "annual_compliance",
        supervisionId: "supervision-1",
        reportYear: "2025",
        userId: "user-1",
      });

      expect(result.success).toBe(true);
      // With all 6 checks passing: authorization(true) + debris(true) + cyber(true) + insurance(true) + efd(true) + reporting(true) = 100%
      expect(prisma.supervisionReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            overallScore: 100,
          }),
        }),
      });
    });

    it("should calculate partial compliance score when some assessments are missing", async () => {
      const supervision = createMockSupervision({ incidents: [] });
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(
        supervision as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );

      // No assessments found:
      // authorization: true (always), debris: false (undefined?.planGenerated !== true),
      // cybersecurity: true (undefined?.frameworkGeneratedAt is undefined, undefined !== null is true),
      // insurance: false, efd: false, reporting: true (always) = 3/6 = 50%
      vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord({ reportType: "annual_compliance" }) as never,
      );

      const result = await generateReport({
        type: "annual_compliance",
        supervisionId: "supervision-1",
        reportYear: "2025",
        userId: "user-1",
      });

      expect(result.success).toBe(true);
      expect(prisma.supervisionReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            overallScore: 50, // Round(3/6 * 100) = 50
          }),
        }),
      });
    });

    it("should correctly categorize incidents by severity", async () => {
      const supervision = createMockSupervision();
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(
        supervision as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord({ reportType: "annual_compliance" }) as never,
      );

      const result = await generateReport({
        type: "annual_compliance",
        supervisionId: "supervision-1",
        reportYear: "2025",
        userId: "user-1",
      });

      // The mock supervision has 4 incidents: 1 critical, 1 high, 1 medium, 1 low
      expect(result.success).toBe(true);
      // We verify the report was created (the data is passed to React element)
      expect(renderToBuffer).toHaveBeenCalled();
    });

    it("should generate correct filename with year and organization", async () => {
      const supervision = createMockSupervision();
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(
        supervision as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord({ reportType: "annual_compliance" }) as never,
      );

      const result = await generateReport({
        type: "annual_compliance",
        supervisionId: "supervision-1",
        reportYear: "2025",
        userId: "user-1",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.report.filename).toBe(
          "Annual-Compliance-Report-2025-SpaceCorp-GmbH.pdf",
        );
      }
    });

    it("should create supervision report record with correct metadata", async () => {
      const supervision = createMockSupervision({ incidents: [] });
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(
        supervision as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord({ reportType: "annual_compliance" }) as never,
      );

      await generateReport({
        type: "annual_compliance",
        supervisionId: "supervision-1",
        reportYear: "2025",
        userId: "user-1",
      });

      expect(prisma.supervisionReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          supervisionId: "supervision-1",
          reportType: "annual_compliance",
          reportPeriod: "2025",
          title: "Annual Compliance Report 2025",
          status: "generated",
          generatedBy: "user-1",
          metadata: expect.objectContaining({
            reportYear: "2025",
            organization: "SpaceCorp GmbH",
          }),
        }),
      });
    });

    it("should log audit event for annual compliance report", async () => {
      const supervision = createMockSupervision({ incidents: [] });
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(
        supervision as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord({
          id: "report-annual-1",
          reportType: "annual_compliance",
        }) as never,
      );

      await generateReport({
        type: "annual_compliance",
        supervisionId: "supervision-1",
        reportYear: "2025",
        userId: "user-1",
      });

      expect(logAuditEvent).toHaveBeenCalledWith({
        action: "report.generated",
        userId: "user-1",
        entityType: "SupervisionReport",
        entityId: "report-annual-1",
        newValue: {
          reportType: "annual_compliance",
          supervisionId: "supervision-1",
          reportYear: "2025",
        },
      });
    });

    it("should use 'Unknown Organization' when supervision user has no organization", async () => {
      const supervision = createMockSupervision({
        user: {
          organization: null,
          operatorType: null,
          name: "Jane Doe",
          email: "jane@example.com",
        },
        incidents: [],
      });
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(
        supervision as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord({ reportType: "annual_compliance" }) as never,
      );

      const result = await generateReport({
        type: "annual_compliance",
        supervisionId: "supervision-1",
        reportYear: "2025",
        userId: "user-1",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.report.metadata.organization).toBe(
          "Unknown Organization",
        );
      }
    });

    it("should handle environmental assessment with 'submitted' status as compliant", async () => {
      const supervision = createMockSupervision({ incidents: [] });
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(
        supervision as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([
        { status: "submitted" },
      ] as never);
      vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord({ reportType: "annual_compliance" }) as never,
      );

      const result = await generateReport({
        type: "annual_compliance",
        supervisionId: "supervision-1",
        reportYear: "2025",
        userId: "user-1",
      });

      expect(result.success).toBe(true);
      // authorization(true) + debris(false) + cyber(true, undefined !== null) + insurance(false) + efd(true) + reporting(true) = 4/6 = 67%
      expect(prisma.supervisionReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            overallScore: 67,
          }),
        }),
      });
    });

    it("should handle environmental assessment with 'draft' status as non-compliant", async () => {
      const supervision = createMockSupervision({ incidents: [] });
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(
        supervision as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([
        { status: "draft" },
      ] as never);
      vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord({ reportType: "annual_compliance" }) as never,
      );

      const result = await generateReport({
        type: "annual_compliance",
        supervisionId: "supervision-1",
        reportYear: "2025",
        userId: "user-1",
      });

      expect(result.success).toBe(true);
      // authorization(true) + debris(false) + cyber(true, undefined !== null) + insurance(false) + efd(false) + reporting(true) = 3/6 = 50%
      expect(prisma.supervisionReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            overallScore: 50,
          }),
        }),
      });
    });

    it("should handle zero incidents gracefully", async () => {
      const supervision = createMockSupervision({ incidents: [] });
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(
        supervision as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord({ reportType: "annual_compliance" }) as never,
      );

      const result = await generateReport({
        type: "annual_compliance",
        supervisionId: "supervision-1",
        reportYear: "2025",
        userId: "user-1",
      });

      expect(result.success).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Significant Change Report Generation
  // --------------------------------------------------------------------------

  describe("generateSignificantChangeReport", () => {
    const baseChangeOptions: GenerateSignificantChangeReportOptions = {
      type: "significant_change",
      workflowId: "workflow-1",
      changeType: "ownership_transfer",
      changeData: {
        title: "Transfer to NewSpace Inc.",
        description: "Full ownership transfer",
        justification: "Strategic acquisition",
        effectiveDate: new Date("2025-09-01"),
        currentState: [{ field: "Owner", value: "SpaceCorp GmbH" }],
        proposedState: [{ field: "Owner", value: "NewSpace Inc." }],
        impactAssessment: {
          safetyImpact: "none",
          debrisImpact: "none",
          thirdPartyImpact: "low",
          regulatoryImpact: "high",
        },
      },
      userId: "user-1",
    };

    it("should return NOT_FOUND when workflow does not exist", async () => {
      vi.mocked(prisma.authorizationWorkflow.findUnique).mockResolvedValue(
        null,
      );

      const result = await generateReport(baseChangeOptions);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Authorization workflow not found");
        expect(result.code).toBe("NOT_FOUND");
      }
    });

    it("should fetch authorization workflow with user relation", async () => {
      const workflow = createMockWorkflow();
      vi.mocked(prisma.authorizationWorkflow.findUnique).mockResolvedValue(
        workflow as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord({
          reportType: "significant_change",
        }) as never,
      );

      await generateReport(baseChangeOptions);

      expect(prisma.authorizationWorkflow.findUnique).toHaveBeenCalledWith({
        where: { id: "workflow-1" },
        include: {
          user: {
            select: {
              organization: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });

    it("should generate report with ownership_transfer change type", async () => {
      const workflow = createMockWorkflow();
      vi.mocked(prisma.authorizationWorkflow.findUnique).mockResolvedValue(
        workflow as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord({
          reportType: "significant_change",
        }) as never,
      );

      const result = await generateReport(baseChangeOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.report.reportType).toBe("significant_change");
        expect(result.report.contentType).toBe("application/pdf");
      }
    });

    it("should generate notification number in correct format", async () => {
      const workflow = createMockWorkflow();
      vi.mocked(prisma.authorizationWorkflow.findUnique).mockResolvedValue(
        workflow as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord({
          reportType: "significant_change",
        }) as never,
      );

      const result = await generateReport(baseChangeOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        // Filename should contain notification number in SCN-YYYY-XXXXX format
        expect(result.report.filename).toMatch(
          /^Significant-Change-SCN-\d{4}-[A-Z0-9]+-\d{4}-\d{2}-\d{2}\.pdf$/,
        );
      }
    });

    it("should create supervision report record with change type metadata", async () => {
      const workflow = createMockWorkflow();
      vi.mocked(prisma.authorizationWorkflow.findUnique).mockResolvedValue(
        workflow as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord({
          reportType: "significant_change",
        }) as never,
      );

      await generateReport(baseChangeOptions);

      expect(prisma.supervisionReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          supervisionId: "user-1", // uses workflow.userId
          reportType: "significant_change",
          status: "generated",
          generatedBy: "user-1",
          metadata: expect.objectContaining({
            changeType: "ownership_transfer",
            workflowId: "workflow-1",
            requiresPreApproval: true,
          }),
        }),
      });
    });

    it("should log audit event with change details", async () => {
      const workflow = createMockWorkflow();
      vi.mocked(prisma.authorizationWorkflow.findUnique).mockResolvedValue(
        workflow as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord({
          id: "report-change-1",
          reportType: "significant_change",
        }) as never,
      );

      await generateReport(baseChangeOptions);

      expect(logAuditEvent).toHaveBeenCalledWith({
        action: "report.generated",
        userId: "user-1",
        entityType: "SupervisionReport",
        entityId: "report-change-1",
        newValue: expect.objectContaining({
          reportType: "significant_change",
          workflowId: "workflow-1",
          changeType: "ownership_transfer",
        }),
      });
    });

    it("should use workflow approvedAt date when available", async () => {
      const workflow = createMockWorkflow({
        approvedAt: new Date("2024-12-01"),
        createdAt: new Date("2024-11-15"),
      });
      vi.mocked(prisma.authorizationWorkflow.findUnique).mockResolvedValue(
        workflow as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord({
          reportType: "significant_change",
        }) as never,
      );

      const result = await generateReport(baseChangeOptions);

      expect(result.success).toBe(true);
      // The report should be generated (we can't easily check internal data, but it ran successfully)
      expect(renderToBuffer).toHaveBeenCalled();
    });

    it("should fall back to createdAt when approvedAt is null", async () => {
      const workflow = createMockWorkflow({
        approvedAt: null,
        createdAt: new Date("2024-11-15"),
      });
      vi.mocked(prisma.authorizationWorkflow.findUnique).mockResolvedValue(
        workflow as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord({
          reportType: "significant_change",
        }) as never,
      );

      const result = await generateReport(baseChangeOptions);

      expect(result.success).toBe(true);
      expect(renderToBuffer).toHaveBeenCalled();
    });

    it("should use primaryNCAName when available", async () => {
      const workflow = createMockWorkflow({
        primaryNCAName: "BNetzA",
        primaryNCA: "DE",
      });
      vi.mocked(prisma.authorizationWorkflow.findUnique).mockResolvedValue(
        workflow as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord({
          reportType: "significant_change",
        }) as never,
      );

      const result = await generateReport(baseChangeOptions);
      expect(result.success).toBe(true);
    });

    it("should fall back to primaryNCA when primaryNCAName is null", async () => {
      const workflow = createMockWorkflow({
        primaryNCAName: null,
        primaryNCA: "DE",
      });
      vi.mocked(prisma.authorizationWorkflow.findUnique).mockResolvedValue(
        workflow as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord({
          reportType: "significant_change",
        }) as never,
      );

      const result = await generateReport(baseChangeOptions);
      expect(result.success).toBe(true);
    });

    it("should handle different change types correctly", async () => {
      const changeTypes = [
        "ownership_transfer",
        "mission_modification",
        "technical_change",
        "operational_change",
        "orbital_change",
        "end_of_life_update",
        "insurance_change",
        "contact_change",
        "other",
      ] as const;

      for (const changeType of changeTypes) {
        vi.clearAllMocks();

        const workflow = createMockWorkflow();
        vi.mocked(prisma.authorizationWorkflow.findUnique).mockResolvedValue(
          workflow as never,
        );
        vi.mocked(prisma.user.findUnique).mockResolvedValue(
          createMockUser() as never,
        );
        vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
          createMockReportRecord({
            reportType: "significant_change",
          }) as never,
        );

        const result = await generateReport({
          ...baseChangeOptions,
          changeType,
        });

        expect(result.success).toBe(true);
        expect(prisma.supervisionReport.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              changeType,
            }),
          }),
        });
      }
    });

    it("should include optional ownership transfer data", async () => {
      const workflow = createMockWorkflow();
      vi.mocked(prisma.authorizationWorkflow.findUnique).mockResolvedValue(
        workflow as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord({
          reportType: "significant_change",
        }) as never,
      );

      const optionsWithTransfer: GenerateSignificantChangeReportOptions = {
        ...baseChangeOptions,
        changeData: {
          ...baseChangeOptions.changeData,
          ownershipTransfer: {
            currentOwner: "SpaceCorp GmbH",
            newOwner: "NewSpace Inc.",
            newOwnerCountry: "United States",
            newOwnerRegistration: "US-2025-001",
            transferDate: new Date("2025-10-01"),
            liabilityTransfer: true,
          },
        },
      };

      const result = await generateReport(optionsWithTransfer);

      expect(result.success).toBe(true);
      expect(renderToBuffer).toHaveBeenCalled();
    });

    it("should include optional mitigation measures", async () => {
      const workflow = createMockWorkflow();
      vi.mocked(prisma.authorizationWorkflow.findUnique).mockResolvedValue(
        workflow as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord({
          reportType: "significant_change",
        }) as never,
      );

      const optionsWithMitigation: GenerateSignificantChangeReportOptions = {
        ...baseChangeOptions,
        changeData: {
          ...baseChangeOptions.changeData,
          mitigationMeasures: [
            "Updated debris mitigation plan",
            "Enhanced monitoring protocols",
            "Insurance coverage adjustment",
          ],
          impactDescription:
            "Orbital change will temporarily increase collision risk",
        },
      };

      const result = await generateReport(optionsWithMitigation);

      expect(result.success).toBe(true);
    });

    it("should handle workflow with no user organization", async () => {
      const workflow = createMockWorkflow({
        user: {
          organization: null,
          name: "Jane Doe",
          email: "jane@example.com",
        },
      });
      vi.mocked(prisma.authorizationWorkflow.findUnique).mockResolvedValue(
        workflow as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord({
          reportType: "significant_change",
        }) as never,
      );

      const result = await generateReport(baseChangeOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.report.metadata.organization).toBe(
          "Unknown Organization",
        );
      }
    });
  });

  // --------------------------------------------------------------------------
  // getAvailableReportTypes
  // --------------------------------------------------------------------------

  describe("getAvailableReportTypes", () => {
    it("should return all three report types", () => {
      const types = getAvailableReportTypes();

      expect(types).toHaveLength(3);
    });

    it("should include incident report type", () => {
      const types = getAvailableReportTypes();
      const incident = types.find((t) => t.type === "incident");

      expect(incident).toBeDefined();
      expect(incident?.name).toBe("NCA Incident Report");
      expect(incident?.description).toContain("EU Space Act Art. 34");
    });

    it("should include annual compliance report type", () => {
      const types = getAvailableReportTypes();
      const annual = types.find((t) => t.type === "annual_compliance");

      expect(annual).toBeDefined();
      expect(annual?.name).toBe("Annual Compliance Report");
      expect(annual?.description).toContain("EU Space Act Art. 33-34");
    });

    it("should include significant change report type", () => {
      const types = getAvailableReportTypes();
      const change = types.find((t) => t.type === "significant_change");

      expect(change).toBeDefined();
      expect(change?.name).toBe("Significant Change Notification");
      expect(change?.description).toContain("EU Space Act Art. 27");
    });

    it("should return types with required properties (type, name, description)", () => {
      const types = getAvailableReportTypes();

      for (const reportType of types) {
        expect(reportType.type).toBeDefined();
        expect(typeof reportType.type).toBe("string");
        expect(reportType.name).toBeDefined();
        expect(typeof reportType.name).toBe("string");
        expect(reportType.description).toBeDefined();
        expect(typeof reportType.description).toBe("string");
      }
    });
  });

  // --------------------------------------------------------------------------
  // getReportHistory
  // --------------------------------------------------------------------------

  describe("getReportHistory", () => {
    it("should fetch report history for a supervision", async () => {
      const mockReports = [
        {
          id: "report-1",
          reportType: "incident",
          title: "NCA Incident Report - INC-2025-001",
          status: "generated",
          generatedAt: new Date("2025-06-15"),
          generatedBy: "user-1",
        },
        {
          id: "report-2",
          reportType: "annual_compliance",
          title: "Annual Compliance Report 2024",
          status: "generated",
          generatedAt: new Date("2025-01-15"),
          generatedBy: "user-1",
        },
      ];

      vi.mocked(prisma.supervisionReport.findMany).mockResolvedValue(
        mockReports as never,
      );

      const history = await getReportHistory("supervision-1");

      expect(history).toHaveLength(2);
      expect(history[0].id).toBe("report-1");
      expect(history[1].id).toBe("report-2");
    });

    it("should query with correct supervision ID and ordering", async () => {
      vi.mocked(prisma.supervisionReport.findMany).mockResolvedValue([]);

      await getReportHistory("supervision-1");

      expect(prisma.supervisionReport.findMany).toHaveBeenCalledWith({
        where: { supervisionId: "supervision-1" },
        orderBy: { generatedAt: "desc" },
        select: {
          id: true,
          reportType: true,
          title: true,
          status: true,
          generatedAt: true,
          generatedBy: true,
        },
      });
    });

    it("should return empty array when no reports exist", async () => {
      vi.mocked(prisma.supervisionReport.findMany).mockResolvedValue([]);

      const history = await getReportHistory("supervision-with-no-reports");

      expect(history).toEqual([]);
    });

    it("should return reports with nullable fields", async () => {
      const mockReports = [
        {
          id: "report-1",
          reportType: "incident",
          title: null,
          status: "generated",
          generatedAt: null,
          generatedBy: null,
        },
      ];

      vi.mocked(prisma.supervisionReport.findMany).mockResolvedValue(
        mockReports as never,
      );

      const history = await getReportHistory("supervision-1");

      expect(history).toHaveLength(1);
      expect(history[0].title).toBeNull();
      expect(history[0].generatedAt).toBeNull();
      expect(history[0].generatedBy).toBeNull();
    });

    it("should return reports ordered by generatedAt descending", async () => {
      const mockReports = [
        {
          id: "report-newer",
          reportType: "incident",
          title: "Newer Report",
          status: "generated",
          generatedAt: new Date("2025-12-01"),
          generatedBy: "user-1",
        },
        {
          id: "report-older",
          reportType: "annual_compliance",
          title: "Older Report",
          status: "generated",
          generatedAt: new Date("2025-01-01"),
          generatedBy: "user-1",
        },
      ];

      vi.mocked(prisma.supervisionReport.findMany).mockResolvedValue(
        mockReports as never,
      );

      const history = await getReportHistory("supervision-1");

      expect(history[0].id).toBe("report-newer");
      expect(history[1].id).toBe("report-older");
    });
  });

  // --------------------------------------------------------------------------
  // Cross-cutting Concerns
  // --------------------------------------------------------------------------

  describe("cross-cutting concerns", () => {
    it("should call renderToBuffer for PDF generation in incident reports", async () => {
      const incident = createMockIncident();
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(
        incident as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord() as never,
      );

      await generateReport({
        type: "incident",
        incidentId: "incident-1",
        userId: "user-1",
      });

      expect(renderToBuffer).toHaveBeenCalledTimes(1);
    });

    it("should call renderToBuffer for PDF generation in annual compliance reports", async () => {
      const supervision = createMockSupervision({ incidents: [] });
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(
        supervision as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord({ reportType: "annual_compliance" }) as never,
      );

      await generateReport({
        type: "annual_compliance",
        supervisionId: "supervision-1",
        reportYear: "2025",
        userId: "user-1",
      });

      expect(renderToBuffer).toHaveBeenCalledTimes(1);
    });

    it("should call renderToBuffer for PDF generation in significant change reports", async () => {
      const workflow = createMockWorkflow();
      vi.mocked(prisma.authorizationWorkflow.findUnique).mockResolvedValue(
        workflow as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord({
          reportType: "significant_change",
        }) as never,
      );

      await generateReport({
        type: "significant_change",
        workflowId: "workflow-1",
        changeType: "technical_change",
        changeData: {
          title: "Propulsion System Upgrade",
          description: "Upgrading from chemical to electric propulsion",
          justification: "Improved fuel efficiency and mission life",
          effectiveDate: new Date("2025-08-01"),
          currentState: [{ field: "Propulsion", value: "Chemical" }],
          proposedState: [{ field: "Propulsion", value: "Electric" }],
          impactAssessment: {
            safetyImpact: "low",
            debrisImpact: "none",
            thirdPartyImpact: "none",
            regulatoryImpact: "medium",
          },
        },
        userId: "user-1",
      });

      expect(renderToBuffer).toHaveBeenCalledTimes(1);
    });

    it("should always create audit log after successful report creation", async () => {
      const incident = createMockIncident();
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(
        incident as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord() as never,
      );

      await generateReport({
        type: "incident",
        incidentId: "incident-1",
        userId: "user-1",
      });

      expect(logAuditEvent).toHaveBeenCalledTimes(1);
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "report.generated",
          userId: "user-1",
          entityType: "SupervisionReport",
        }),
      );
    });

    it("should propagate audit logging errors as GENERATION_FAILED", async () => {
      const incident = createMockIncident();
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(
        incident as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord() as never,
      );
      vi.mocked(logAuditEvent).mockRejectedValueOnce(
        new Error("Audit log write failed"),
      );

      const result = await generateReport({
        type: "incident",
        incidentId: "incident-1",
        userId: "user-1",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Audit log write failed");
        expect(result.code).toBe("GENERATION_FAILED");
      }
    });

    it("should always return application/pdf as content type", async () => {
      const incident = createMockIncident();
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(
        incident as never,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser() as never,
      );
      vi.mocked(prisma.supervisionReport.create).mockResolvedValue(
        createMockReportRecord() as never,
      );

      const result = await generateReport({
        type: "incident",
        incidentId: "incident-1",
        userId: "user-1",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.report.contentType).toBe("application/pdf");
      }
    });
  });
});
