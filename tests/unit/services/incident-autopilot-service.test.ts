import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    incident: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    incidentNIS2Phase: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    deadline: {
      create: vi.fn(),
    },
    organizationMember: {
      findFirst: vi.fn(),
    },
  },
}));

// Mock audit
vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn(),
}));

// Mock encryption
vi.mock("@/lib/encryption", () => ({
  encrypt: vi.fn((text: string) => Promise.resolve(`encrypted:${text}`)),
}));

// Mock notification service
vi.mock("@/lib/services/notification-service", () => ({
  notifyUser: vi.fn(),
  notifyOrganization: vi.fn(),
}));

// Mock incident response service
vi.mock("@/lib/services/incident-response-service", () => ({
  calculateSeverity: vi.fn(
    (category: string, options?: { affectedAssetCount?: number }) => {
      if (category === "signal_loss" || category === "collision_risk")
        return "critical";
      if (category === "cyber_intrusion") return "high";
      if (options?.affectedAssetCount && options.affectedAssetCount > 5)
        return "high";
      return "medium";
    },
  ),
  calculateNCADeadline: vi.fn((_category: string, detectedAt: Date) => {
    const deadline = new Date(detectedAt);
    deadline.setHours(deadline.getHours() + 72);
    return deadline;
  }),
  generateIncidentNumber: vi.fn(() => Promise.resolve("INC-2025-0001")),
  INCIDENT_CLASSIFICATION: {
    signal_loss: {
      label: "Signal Loss",
      requiresNCANotification: true,
      ncaDeadlineHours: 24,
      articleRef: "Art. 80(1)",
    },
    collision_risk: {
      label: "Collision Risk",
      requiresNCANotification: true,
      ncaDeadlineHours: 24,
      articleRef: "Art. 80(1)",
    },
    cyber_intrusion: {
      label: "Cyber Intrusion",
      requiresNCANotification: true,
      ncaDeadlineHours: 72,
      articleRef: "Art. 80(2)",
    },
    debris_event: {
      label: "Debris Event",
      requiresNCANotification: true,
      ncaDeadlineHours: 48,
      articleRef: "Art. 80(3)",
    },
    data_breach: {
      label: "Data Breach",
      requiresNCANotification: false,
      ncaDeadlineHours: 72,
      articleRef: "Art. 23",
    },
  },
  NIS2_REPORTING_TIMELINE: {
    earlyWarningHours: 24,
    notificationHours: 72,
    finalReportDays: 30,
  },
}));

// Mock workflow engine
vi.mock("@/lib/workflow/engine", () => ({
  createWorkflowEngine: vi.fn(() => ({
    executeTransition: vi.fn(() => ({
      success: true,
      previousState: "reported",
      currentState: "investigating",
    })),
    getAvailableTransitions: vi.fn(() => [
      {
        event: "begin_mitigation",
        to: "mitigating",
        description: "Begin mitigation",
        auto: false,
      },
    ]),
    getState: vi.fn((state: string) => ({
      name: state,
      metadata: { color: "#EF4444", icon: "AlertTriangle" },
    })),
  })),
}));

// Mock workflow definitions
vi.mock("@/lib/workflow/definitions/incident", () => ({
  incidentWorkflowDefinition: {},
  INCIDENT_STATE_ORDER: [
    "reported",
    "investigating",
    "mitigating",
    "resolved",
    "closed",
  ],
}));

import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { encrypt } from "@/lib/encryption";
import { notifyOrganization } from "@/lib/services/notification-service";
import {
  createIncidentWithAutopilot,
  advanceIncidentWorkflow,
  getIncidentCommandData,
  listActiveIncidents,
  submitNIS2Phase,
  calculatePhaseDeadlines,
} from "@/lib/services/incident-autopilot";

describe("Incident Autopilot Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════
  // calculatePhaseDeadlines (pure function)
  // ═══════════════════════════════════════════════

  describe("calculatePhaseDeadlines", () => {
    it("should return empty deadlines when not NIS2 significant", () => {
      const detectedAt = new Date("2025-06-01T12:00:00Z");
      const result = calculatePhaseDeadlines(detectedAt, false);

      expect(Object.keys(result)).toHaveLength(0);
    });

    it("should calculate 24h early warning deadline", () => {
      const detectedAt = new Date("2025-06-01T12:00:00Z");
      const result = calculatePhaseDeadlines(detectedAt, true);

      expect(result.early_warning).toBeDefined();
      const expected = new Date("2025-06-02T12:00:00Z");
      expect(result.early_warning.getTime()).toBe(expected.getTime());
    });

    it("should calculate 72h notification deadline", () => {
      const detectedAt = new Date("2025-06-01T12:00:00Z");
      const result = calculatePhaseDeadlines(detectedAt, true);

      expect(result.notification).toBeDefined();
      const expected = new Date("2025-06-04T12:00:00Z");
      expect(result.notification.getTime()).toBe(expected.getTime());
    });

    it("should calculate 14-day intermediate report deadline", () => {
      const detectedAt = new Date("2025-06-01T12:00:00Z");
      const result = calculatePhaseDeadlines(detectedAt, true);

      expect(result.intermediate_report).toBeDefined();
      const expected = new Date("2025-06-15T12:00:00Z");
      expect(result.intermediate_report.getTime()).toBe(expected.getTime());
    });

    it("should calculate 30-day final report deadline from notification", () => {
      const detectedAt = new Date("2025-06-01T12:00:00Z");
      const result = calculatePhaseDeadlines(detectedAt, true);

      expect(result.final_report).toBeDefined();
      // Final report = 72h (notification) + 30 days from notification
      const notification = new Date("2025-06-04T12:00:00Z");
      const expected = new Date(notification);
      expected.setDate(expected.getDate() + 30);
      expect(result.final_report.getTime()).toBe(expected.getTime());
    });

    it("should include all 4 phases for NIS2 significant incidents", () => {
      const detectedAt = new Date("2025-06-01T12:00:00Z");
      const result = calculatePhaseDeadlines(detectedAt, true);

      expect(Object.keys(result)).toHaveLength(4);
      expect(result).toHaveProperty("early_warning");
      expect(result).toHaveProperty("notification");
      expect(result).toHaveProperty("intermediate_report");
      expect(result).toHaveProperty("final_report");
    });

    it("should handle midnight detection time", () => {
      const detectedAt = new Date("2025-06-01T00:00:00Z");
      const result = calculatePhaseDeadlines(detectedAt, true);

      expect(result.early_warning.getTime()).toBe(
        new Date("2025-06-02T00:00:00Z").getTime(),
      );
    });
  });

  // ═══════════════════════════════════════════════
  // createIncidentWithAutopilot
  // ═══════════════════════════════════════════════

  describe("createIncidentWithAutopilot", () => {
    const baseInput = {
      supervisionId: "sup-1",
      category: "cyber_intrusion" as any,
      title: "Unauthorized access detected",
      description: "Detected unauthorized SSH access to ground station",
      detectedBy: "SOC team",
    };

    it("should create incident successfully", async () => {
      vi.mocked(prisma.incident.create).mockResolvedValue({
        id: "inc-1",
        incidentNumber: "INC-2025-0001",
        category: "cyber_intrusion",
        severity: "high",
        affectedAssets: [],
      } as any);
      vi.mocked(prisma.incidentNIS2Phase.create).mockResolvedValue({} as any);
      vi.mocked(prisma.deadline.create).mockResolvedValue({} as any);
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
        organizationId: "org-1",
      } as any);

      const result = await createIncidentWithAutopilot(baseInput, "user-1");

      expect(result.success).toBe(true);
      expect(result.incidentId).toBe("inc-1");
      expect(result.incidentNumber).toBe("INC-2025-0001");
      expect(result.severity).toBe("high");
    });

    it("should encrypt the description", async () => {
      vi.mocked(prisma.incident.create).mockResolvedValue({
        id: "inc-1",
        affectedAssets: [],
      } as any);
      vi.mocked(prisma.incidentNIS2Phase.create).mockResolvedValue({} as any);
      vi.mocked(prisma.deadline.create).mockResolvedValue({} as any);
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(null);

      await createIncidentWithAutopilot(baseInput, "user-1");

      expect(encrypt).toHaveBeenCalledWith(baseInput.description);
      expect(prisma.incident.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: `encrypted:${baseInput.description}`,
          }),
        }),
      );
    });

    it("should create NIS2 phases for NCA-required incidents", async () => {
      vi.mocked(prisma.incident.create).mockResolvedValue({
        id: "inc-1",
        affectedAssets: [],
      } as any);
      vi.mocked(prisma.incidentNIS2Phase.create).mockResolvedValue({} as any);
      vi.mocked(prisma.deadline.create).mockResolvedValue({} as any);
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(null);

      const result = await createIncidentWithAutopilot(baseInput, "user-1");

      expect(result.nis2Phases!.length).toBe(4);
      expect(prisma.incidentNIS2Phase.create).toHaveBeenCalledTimes(4);
    });

    it("should not create NIS2 phases for non-NCA incidents", async () => {
      vi.mocked(prisma.incident.create).mockResolvedValue({
        id: "inc-1",
        affectedAssets: [],
      } as any);
      vi.mocked(prisma.incidentNIS2Phase.create).mockResolvedValue({} as any);
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(null);

      const result = await createIncidentWithAutopilot(
        { ...baseInput, category: "data_breach" as any },
        "user-1",
      );

      expect(result.nis2Phases!.length).toBe(0);
      expect(prisma.incidentNIS2Phase.create).not.toHaveBeenCalled();
    });

    it("should create NCA deadline for NCA-required incidents", async () => {
      vi.mocked(prisma.incident.create).mockResolvedValue({
        id: "inc-1",
        affectedAssets: [],
      } as any);
      vi.mocked(prisma.incidentNIS2Phase.create).mockResolvedValue({} as any);
      vi.mocked(prisma.deadline.create).mockResolvedValue({} as any);
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(null);

      await createIncidentWithAutopilot(baseInput, "user-1");

      expect(prisma.deadline.create).toHaveBeenCalledTimes(1);
      expect(prisma.deadline.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            category: "REGULATORY",
            moduleSource: "SUPERVISION",
          }),
        }),
      );
    });

    it("should log audit event on creation", async () => {
      vi.mocked(prisma.incident.create).mockResolvedValue({
        id: "inc-1",
        affectedAssets: [],
      } as any);
      vi.mocked(prisma.incidentNIS2Phase.create).mockResolvedValue({} as any);
      vi.mocked(prisma.deadline.create).mockResolvedValue({} as any);
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(null);

      await createIncidentWithAutopilot(baseInput, "user-1");

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "incident_created_autopilot",
          entityType: "incident",
          entityId: "inc-1",
        }),
      );
    });

    it("should notify organization when user has membership", async () => {
      vi.mocked(prisma.incident.create).mockResolvedValue({
        id: "inc-1",
        affectedAssets: [],
      } as any);
      vi.mocked(prisma.incidentNIS2Phase.create).mockResolvedValue({} as any);
      vi.mocked(prisma.deadline.create).mockResolvedValue({} as any);
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
        organizationId: "org-1",
      } as any);

      await createIncidentWithAutopilot(baseInput, "user-1");

      expect(notifyOrganization).toHaveBeenCalledWith(
        "org-1",
        "INCIDENT_CREATED",
        expect.stringContaining("INC-2025-0001"),
        expect.any(String),
        expect.objectContaining({
          entityType: "incident",
        }),
      );
    });

    it("should handle affected assets", async () => {
      const inputWithAssets = {
        ...baseInput,
        affectedAssets: [
          { assetName: "SAT-1", cosparId: "2024-001A", noradId: "55001" },
          { assetName: "SAT-2" },
        ],
      };

      vi.mocked(prisma.incident.create).mockResolvedValue({
        id: "inc-1",
        affectedAssets: [
          { assetName: "SAT-1", cosparId: "2024-001A", noradId: "55001" },
          { assetName: "SAT-2", cosparId: null, noradId: null },
        ],
      } as any);
      vi.mocked(prisma.incidentNIS2Phase.create).mockResolvedValue({} as any);
      vi.mocked(prisma.deadline.create).mockResolvedValue({} as any);
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(null);

      const result = await createIncidentWithAutopilot(
        inputWithAssets,
        "user-1",
      );

      expect(result.success).toBe(true);
      expect(prisma.incident.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            affectedAssets: {
              create: expect.arrayContaining([
                expect.objectContaining({ assetName: "SAT-1" }),
                expect.objectContaining({ assetName: "SAT-2" }),
              ]),
            },
          }),
        }),
      );
    });

    it("should return error on failure", async () => {
      vi.mocked(prisma.incident.create).mockRejectedValue(
        new Error("Database error"),
      );

      const result = await createIncidentWithAutopilot(baseInput, "user-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });

    it("should use current time when detectedAt not provided", async () => {
      vi.mocked(prisma.incident.create).mockResolvedValue({
        id: "inc-1",
        affectedAssets: [],
      } as any);
      vi.mocked(prisma.incidentNIS2Phase.create).mockResolvedValue({} as any);
      vi.mocked(prisma.deadline.create).mockResolvedValue({} as any);
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(null);

      const before = new Date();
      await createIncidentWithAutopilot(baseInput, "user-1");
      const after = new Date();

      const createCall = vi.mocked(prisma.incident.create).mock.calls[0][0];
      const detectedAt = createCall.data.detectedAt as Date;
      expect(detectedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(detectedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  // ═══════════════════════════════════════════════
  // advanceIncidentWorkflow
  // ═══════════════════════════════════════════════

  describe("advanceIncidentWorkflow", () => {
    it("should return error for nonexistent incident", async () => {
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(null);

      const result = await advanceIncidentWorkflow(
        "nonexistent",
        "begin_investigation",
        "user-1",
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Incident not found");
    });

    it("should advance workflow successfully", async () => {
      vi.mocked(prisma.incident.findUnique).mockResolvedValue({
        id: "inc-1",
        incidentNumber: "INC-2025-0001",
        workflowState: "reported",
        category: "cyber_intrusion",
        severity: "high",
        requiresNCANotification: true,
        detectedAt: new Date(),
        reportedToNCA: false,
      } as any);
      vi.mocked(prisma.incident.update).mockResolvedValue({} as any);
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
        organizationId: "org-1",
      } as any);

      const result = await advanceIncidentWorkflow(
        "inc-1",
        "begin_investigation",
        "user-1",
      );

      expect(result.success).toBe(true);
      expect(result.previousState).toBe("reported");
      expect(result.currentState).toBe("investigating");
    });

    it("should log audit event on workflow advance", async () => {
      vi.mocked(prisma.incident.findUnique).mockResolvedValue({
        id: "inc-1",
        incidentNumber: "INC-2025-0001",
        workflowState: "reported",
        category: "cyber_intrusion",
        severity: "high",
        requiresNCANotification: true,
        detectedAt: new Date(),
        reportedToNCA: false,
      } as any);
      vi.mocked(prisma.incident.update).mockResolvedValue({} as any);
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(null);

      await advanceIncidentWorkflow("inc-1", "begin_investigation", "user-1");

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "incident_workflow_advanced",
          entityType: "incident",
        }),
      );
    });

    it("should return available transitions for new state", async () => {
      vi.mocked(prisma.incident.findUnique).mockResolvedValue({
        id: "inc-1",
        incidentNumber: "INC-2025-0001",
        workflowState: "reported",
        category: "cyber_intrusion",
        severity: "high",
        requiresNCANotification: true,
        detectedAt: new Date(),
        reportedToNCA: false,
      } as any);
      vi.mocked(prisma.incident.update).mockResolvedValue({} as any);
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(null);

      const result = await advanceIncidentWorkflow(
        "inc-1",
        "begin_investigation",
        "user-1",
      );

      expect(result.availableTransitions).toBeDefined();
      expect(result.availableTransitions!.length).toBeGreaterThan(0);
      expect(result.availableTransitions![0]).toHaveProperty("event");
      expect(result.availableTransitions![0]).toHaveProperty("to");
    });

    it("should handle error gracefully", async () => {
      vi.mocked(prisma.incident.findUnique).mockRejectedValue(
        new Error("DB error"),
      );

      const result = await advanceIncidentWorkflow(
        "inc-1",
        "begin_investigation",
        "user-1",
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("DB error");
    });
  });

  // ═══════════════════════════════════════════════
  // getIncidentCommandData
  // ═══════════════════════════════════════════════

  describe("getIncidentCommandData", () => {
    it("should return null for nonexistent incident", async () => {
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(null);

      const result = await getIncidentCommandData("nonexistent");
      expect(result).toBeNull();
    });

    it("should return full command data for existing incident", async () => {
      const now = new Date();
      const futureDeadline = new Date(now.getTime() + 86400000); // +24h

      vi.mocked(prisma.incident.findUnique).mockResolvedValue({
        id: "inc-1",
        incidentNumber: "INC-2025-0001",
        category: "cyber_intrusion",
        severity: "high",
        status: "detected",
        workflowState: "reported",
        title: "Test Incident",
        description: "Test description",
        detectedAt: now,
        detectedBy: "SOC",
        resolvedAt: null,
        reportedToNCA: false,
        ncaReferenceNumber: null,
        requiresNCANotification: true,
        affectedAssets: [
          {
            id: "asset-1",
            assetName: "SAT-1",
            cosparId: "2024-001A",
            noradId: null,
          },
        ],
        nis2Phases: [
          {
            phase: "early_warning",
            deadline: futureDeadline,
            status: "pending",
            submittedAt: null,
            referenceNumber: null,
            createdAt: now,
          },
        ],
      } as any);

      const result = await getIncidentCommandData("inc-1");

      expect(result).not.toBeNull();
      expect(result!.incident.incidentNumber).toBe("INC-2025-0001");
      expect(result!.incident.severity).toBe("high");
      expect(result!.workflow.currentState).toBe("reported");
      expect(result!.workflow.progress).toBe(0); // First state
      expect(result!.nis2Phases).toHaveLength(1);
      expect(result!.nis2Phases[0].phaseName).toBe("Early Warning (24h)");
      expect(result!.nis2Phases[0].countdown.isOverdue).toBe(false);
      expect(result!.affectedAssets).toHaveLength(1);
      expect(result!.affectedAssets[0].assetName).toBe("SAT-1");
    });

    it("should mark overdue phases", async () => {
      const pastDeadline = new Date(Date.now() - 86400000); // -24h
      const now = new Date();

      vi.mocked(prisma.incident.findUnique).mockResolvedValue({
        id: "inc-1",
        incidentNumber: "INC-2025-0001",
        category: "cyber_intrusion",
        severity: "high",
        status: "detected",
        workflowState: "reported",
        title: "Test",
        description: "Test",
        detectedAt: now,
        detectedBy: "SOC",
        resolvedAt: null,
        reportedToNCA: false,
        ncaReferenceNumber: null,
        requiresNCANotification: true,
        affectedAssets: [],
        nis2Phases: [
          {
            phase: "early_warning",
            deadline: pastDeadline,
            status: "pending",
            submittedAt: null,
            referenceNumber: null,
            createdAt: new Date(pastDeadline.getTime() - 86400000),
          },
        ],
      } as any);

      const result = await getIncidentCommandData("inc-1");

      expect(result!.nis2Phases[0].status).toBe("overdue");
      expect(result!.nis2Phases[0].countdown.isOverdue).toBe(true);
      expect(result!.nis2Phases[0].countdown.remainingMs).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════
  // listActiveIncidents
  // ═══════════════════════════════════════════════

  describe("listActiveIncidents", () => {
    it("should return active incidents with NIS2 phase summaries", async () => {
      const futureDeadline = new Date(Date.now() + 86400000);

      vi.mocked(prisma.incident.findMany).mockResolvedValue([
        {
          id: "inc-1",
          incidentNumber: "INC-2025-0001",
          category: "cyber_intrusion",
          severity: "high",
          workflowState: "reported",
          title: "Test Incident",
          detectedAt: new Date(),
          nis2Phases: [
            {
              phase: "early_warning",
              deadline: futureDeadline,
              status: "submitted",
              submittedAt: new Date(),
            },
            {
              phase: "notification",
              deadline: futureDeadline,
              status: "pending",
            },
          ],
        },
      ] as any);

      const result = await listActiveIncidents("sup-1");

      expect(result).toHaveLength(1);
      expect(result[0].incidentNumber).toBe("INC-2025-0001");
      expect(result[0].nis2PhasesSummary.total).toBe(2);
      expect(result[0].nis2PhasesSummary.submitted).toBe(1);
      expect(result[0].nis2PhasesSummary.overdue).toBe(0);
    });

    it("should apply category filter", async () => {
      vi.mocked(prisma.incident.findMany).mockResolvedValue([]);

      await listActiveIncidents("sup-1", {
        category: "cyber_intrusion",
      });

      expect(prisma.incident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: "cyber_intrusion",
          }),
        }),
      );
    });

    it("should apply severity filter", async () => {
      vi.mocked(prisma.incident.findMany).mockResolvedValue([]);

      await listActiveIncidents("sup-1", { severity: "critical" });

      expect(prisma.incident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            severity: "critical",
          }),
        }),
      );
    });

    it("should exclude closed incidents", async () => {
      vi.mocked(prisma.incident.findMany).mockResolvedValue([]);

      await listActiveIncidents("sup-1");

      expect(prisma.incident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workflowState: { notIn: ["closed"] },
          }),
        }),
      );
    });

    it("should handle incidents with no NIS2 phases", async () => {
      vi.mocked(prisma.incident.findMany).mockResolvedValue([
        {
          id: "inc-1",
          incidentNumber: "INC-2025-0002",
          category: "data_breach",
          severity: "medium",
          workflowState: "reported",
          title: "Data Breach",
          detectedAt: new Date(),
          nis2Phases: [],
        },
      ] as any);

      const result = await listActiveIncidents("sup-1");

      expect(result[0].nis2PhasesSummary.total).toBe(0);
      expect(result[0].nis2PhasesSummary.submitted).toBe(0);
      expect(result[0].urgentDeadlineMs).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════
  // submitNIS2Phase
  // ═══════════════════════════════════════════════

  describe("submitNIS2Phase", () => {
    it("should return error for nonexistent phase", async () => {
      vi.mocked(prisma.incidentNIS2Phase.findUnique).mockResolvedValue(null);

      const result = await submitNIS2Phase("inc-1", "early_warning", "user-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Phase not found");
    });

    it("should return error for already submitted phase", async () => {
      vi.mocked(prisma.incidentNIS2Phase.findUnique).mockResolvedValue({
        id: "phase-1",
        status: "submitted",
      } as any);

      const result = await submitNIS2Phase("inc-1", "early_warning", "user-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Phase already submitted");
    });

    it("should submit phase successfully", async () => {
      vi.mocked(prisma.incidentNIS2Phase.findUnique).mockResolvedValue({
        id: "phase-1",
        status: "pending",
      } as any);
      vi.mocked(prisma.incidentNIS2Phase.update).mockResolvedValue({} as any);
      vi.mocked(prisma.incident.findUnique).mockResolvedValue({
        incidentNumber: "INC-2025-0001",
      } as any);

      const result = await submitNIS2Phase(
        "inc-1",
        "early_warning",
        "user-1",
        "NCA-REF-001",
      );

      expect(result.success).toBe(true);
      expect(prisma.incidentNIS2Phase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "submitted",
            referenceNumber: "NCA-REF-001",
          }),
        }),
      );
    });

    it("should log audit event on submission", async () => {
      vi.mocked(prisma.incidentNIS2Phase.findUnique).mockResolvedValue({
        id: "phase-1",
        status: "pending",
      } as any);
      vi.mocked(prisma.incidentNIS2Phase.update).mockResolvedValue({} as any);
      vi.mocked(prisma.incident.findUnique).mockResolvedValue({
        incidentNumber: "INC-2025-0001",
      } as any);

      await submitNIS2Phase("inc-1", "early_warning", "user-1");

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "incident_nis2_phase_submitted",
          entityType: "incident",
          entityId: "inc-1",
        }),
      );
    });

    it("should handle error gracefully", async () => {
      vi.mocked(prisma.incidentNIS2Phase.findUnique).mockRejectedValue(
        new Error("DB error"),
      );

      const result = await submitNIS2Phase("inc-1", "early_warning", "user-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("DB error");
    });
  });
});
