import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    incident: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    deadline: {
      create: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

// Mock audit
vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn(),
}));

// Mock encryption
vi.mock("@/lib/encryption", () => ({
  encrypt: vi.fn((v: string) => Promise.resolve(v)),
  decrypt: vi.fn((v: string) => Promise.resolve(v)),
  isEncrypted: vi.fn(() => false),
}));

import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import {
  INCIDENT_CLASSIFICATION,
  NIS2_REPORTING_TIMELINE,
  isNIS2SignificantIncident,
  calculateSeverity,
  calculateNCADeadline,
  isNCANotificationOverdue,
  generateIncidentNumber,
  createIncident,
  updateIncidentStatus,
  recordNCANotification,
  getIncidentSummary,
  getPendingNCANotifications,
} from "@/lib/services/incident-response-service";
import type {
  IncidentCategory,
  IncidentSeverity,
} from "@/lib/services/incident-response-service";

describe("Incident Response Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // INCIDENT_CLASSIFICATION constant
  // ---------------------------------------------------------------------------
  describe("INCIDENT_CLASSIFICATION", () => {
    const allCategories: IncidentCategory[] = [
      "loss_of_contact",
      "debris_generation",
      "cyber_incident",
      "spacecraft_anomaly",
      "conjunction_event",
      "regulatory_breach",
      "nis2_significant_incident",
      "nis2_near_miss",
      "other",
    ];

    it("should contain exactly 9 categories", () => {
      expect(Object.keys(INCIDENT_CLASSIFICATION)).toHaveLength(9);
    });

    it("should have all expected category keys", () => {
      for (const category of allCategories) {
        expect(INCIDENT_CLASSIFICATION).toHaveProperty(category);
      }
    });

    it("should have required fields for every category", () => {
      for (const [category, config] of Object.entries(
        INCIDENT_CLASSIFICATION,
      )) {
        expect(config).toHaveProperty("defaultSeverity");
        expect(config).toHaveProperty("ncaDeadlineHours");
        expect(config).toHaveProperty("requiresNCANotification");
        expect(config).toHaveProperty("requiresEUSPANotification");
        expect(config).toHaveProperty("description");
        expect(config).toHaveProperty("articleRef");
        expect(typeof config.defaultSeverity).toBe("string");
        expect(typeof config.ncaDeadlineHours).toBe("number");
        expect(typeof config.requiresNCANotification).toBe("boolean");
        expect(typeof config.requiresEUSPANotification).toBe("boolean");
        expect(config.description.length).toBeGreaterThan(0);
        expect(config.articleRef.length).toBeGreaterThan(0);
      }
    });

    describe("critical categories (4h deadline)", () => {
      const criticalWith4h: IncidentCategory[] = [
        "loss_of_contact",
        "debris_generation",
        "cyber_incident",
      ];

      it.each(criticalWith4h)(
        "%s should have critical severity, 4h deadline, and require NCA + EUSPA",
        (category) => {
          const config = INCIDENT_CLASSIFICATION[category];
          expect(config.defaultSeverity).toBe("critical");
          expect(config.ncaDeadlineHours).toBe(4);
          expect(config.requiresNCANotification).toBe(true);
          expect(config.requiresEUSPANotification).toBe(true);
        },
      );
    });

    describe("spacecraft_anomaly", () => {
      it("should have high severity, 24h deadline, NCA but no EUSPA", () => {
        const config = INCIDENT_CLASSIFICATION.spacecraft_anomaly;
        expect(config.defaultSeverity).toBe("high");
        expect(config.ncaDeadlineHours).toBe(24);
        expect(config.requiresNCANotification).toBe(true);
        expect(config.requiresEUSPANotification).toBe(false);
      });
    });

    describe("conjunction_event", () => {
      it("should have high severity, 72h deadline, require NCA + EUSPA", () => {
        const config = INCIDENT_CLASSIFICATION.conjunction_event;
        expect(config.defaultSeverity).toBe("high");
        expect(config.ncaDeadlineHours).toBe(72);
        expect(config.requiresNCANotification).toBe(true);
        expect(config.requiresEUSPANotification).toBe(true);
      });
    });

    describe("regulatory_breach", () => {
      it("should have medium severity, 72h deadline, NCA but no EUSPA", () => {
        const config = INCIDENT_CLASSIFICATION.regulatory_breach;
        expect(config.defaultSeverity).toBe("medium");
        expect(config.ncaDeadlineHours).toBe(72);
        expect(config.requiresNCANotification).toBe(true);
        expect(config.requiresEUSPANotification).toBe(false);
      });
    });

    describe("nis2_significant_incident", () => {
      it("should have critical severity, 24h deadline, NCA only", () => {
        const config = INCIDENT_CLASSIFICATION.nis2_significant_incident;
        expect(config.defaultSeverity).toBe("critical");
        expect(config.ncaDeadlineHours).toBe(24);
        expect(config.requiresNCANotification).toBe(true);
        expect(config.requiresEUSPANotification).toBe(false);
        expect(config.articleRef).toBe("NIS2 Art. 23");
      });
    });

    describe("nis2_near_miss", () => {
      it("should have medium severity, 72h deadline, no NCA, no EUSPA", () => {
        const config = INCIDENT_CLASSIFICATION.nis2_near_miss;
        expect(config.defaultSeverity).toBe("medium");
        expect(config.ncaDeadlineHours).toBe(72);
        expect(config.requiresNCANotification).toBe(false);
        expect(config.requiresEUSPANotification).toBe(false);
        expect(config.articleRef).toBe("NIS2 Art. 30");
      });
    });

    describe("other", () => {
      it("should have low severity, 168h (7-day) deadline, no notifications", () => {
        const config = INCIDENT_CLASSIFICATION.other;
        expect(config.defaultSeverity).toBe("low");
        expect(config.ncaDeadlineHours).toBe(168);
        expect(config.requiresNCANotification).toBe(false);
        expect(config.requiresEUSPANotification).toBe(false);
      });
    });

    it("should have NCA notification required for 7 out of 9 categories", () => {
      const ncaRequiredCount = Object.values(INCIDENT_CLASSIFICATION).filter(
        (c) => c.requiresNCANotification,
      ).length;
      expect(ncaRequiredCount).toBe(7);
    });

    it("should have EUSPA notification required for 4 categories", () => {
      const euspaRequiredCount = Object.values(INCIDENT_CLASSIFICATION).filter(
        (c) => c.requiresEUSPANotification,
      ).length;
      expect(euspaRequiredCount).toBe(4);
    });
  });

  // ---------------------------------------------------------------------------
  // NIS2_REPORTING_TIMELINE
  // ---------------------------------------------------------------------------
  describe("NIS2_REPORTING_TIMELINE", () => {
    it("should have 24h early warning", () => {
      expect(NIS2_REPORTING_TIMELINE.earlyWarningHours).toBe(24);
    });

    it("should have 72h notification", () => {
      expect(NIS2_REPORTING_TIMELINE.notificationHours).toBe(72);
    });

    it("should have intermediate report upon request", () => {
      expect(NIS2_REPORTING_TIMELINE.intermediateReportDays).toBe(
        "upon_request",
      );
    });

    it("should have 30-day final report", () => {
      expect(NIS2_REPORTING_TIMELINE.finalReportDays).toBe(30);
    });

    it("should have 30-day progress report for ongoing incidents", () => {
      expect(NIS2_REPORTING_TIMELINE.progressReportDays).toBe(30);
    });

    it("should have 30-day final report after progress", () => {
      expect(NIS2_REPORTING_TIMELINE.finalAfterProgressDays).toBe(30);
    });
  });

  // ---------------------------------------------------------------------------
  // isNIS2SignificantIncident
  // ---------------------------------------------------------------------------
  describe("isNIS2SignificantIncident", () => {
    it("should return not significant when no factors are met", () => {
      const result = isNIS2SignificantIncident({
        causedOperationalDisruption: false,
        affectedOtherEntities: false,
        causedDataBreach: false,
        affectedServiceAvailability: false,
      });
      expect(result.isSignificant).toBe(false);
      expect(result.reasons).toHaveLength(0);
    });

    it("should flag operational disruption", () => {
      const result = isNIS2SignificantIncident({
        causedOperationalDisruption: true,
        affectedOtherEntities: false,
        causedDataBreach: false,
        affectedServiceAvailability: false,
      });
      expect(result.isSignificant).toBe(true);
      expect(result.reasons).toHaveLength(1);
      expect(result.reasons[0]).toContain("Art. 23(3)(a)");
    });

    it("should flag financial loss above 500K threshold", () => {
      const result = isNIS2SignificantIncident({
        causedOperationalDisruption: false,
        financialLossEuros: 600000,
        affectedOtherEntities: false,
        causedDataBreach: false,
        affectedServiceAvailability: false,
      });
      expect(result.isSignificant).toBe(true);
      expect(result.reasons).toHaveLength(1);
      expect(result.reasons[0]).toContain("€500K");
    });

    it("should NOT flag financial loss at exactly 500K", () => {
      const result = isNIS2SignificantIncident({
        causedOperationalDisruption: false,
        financialLossEuros: 500000,
        affectedOtherEntities: false,
        causedDataBreach: false,
        affectedServiceAvailability: false,
      });
      expect(result.isSignificant).toBe(false);
      expect(result.reasons).toHaveLength(0);
    });

    it("should NOT flag financial loss below 500K", () => {
      const result = isNIS2SignificantIncident({
        causedOperationalDisruption: false,
        financialLossEuros: 499999,
        affectedOtherEntities: false,
        causedDataBreach: false,
        affectedServiceAvailability: false,
      });
      expect(result.isSignificant).toBe(false);
    });

    it("should flag when other entities are affected", () => {
      const result = isNIS2SignificantIncident({
        causedOperationalDisruption: false,
        affectedOtherEntities: true,
        causedDataBreach: false,
        affectedServiceAvailability: false,
      });
      expect(result.isSignificant).toBe(true);
      expect(result.reasons[0]).toContain("Art. 23(3)(b)");
    });

    it("should flag affected persons", () => {
      const result = isNIS2SignificantIncident({
        causedOperationalDisruption: false,
        affectedOtherEntities: false,
        affectedPersonCount: 100,
        causedDataBreach: false,
        affectedServiceAvailability: false,
      });
      expect(result.isSignificant).toBe(true);
      expect(result.reasons[0]).toContain("100");
    });

    it("should NOT flag zero affected persons", () => {
      const result = isNIS2SignificantIncident({
        causedOperationalDisruption: false,
        affectedOtherEntities: false,
        affectedPersonCount: 0,
        causedDataBreach: false,
        affectedServiceAvailability: false,
      });
      expect(result.isSignificant).toBe(false);
    });

    it("should flag data breach", () => {
      const result = isNIS2SignificantIncident({
        causedOperationalDisruption: false,
        affectedOtherEntities: false,
        causedDataBreach: true,
        affectedServiceAvailability: false,
      });
      expect(result.isSignificant).toBe(true);
      expect(result.reasons[0]).toContain("GDPR");
    });

    it("should flag service unavailability over 4 hours", () => {
      const result = isNIS2SignificantIncident({
        causedOperationalDisruption: false,
        affectedOtherEntities: false,
        causedDataBreach: false,
        affectedServiceAvailability: true,
        serviceDowntimeHours: 5,
      });
      expect(result.isSignificant).toBe(true);
      expect(result.reasons[0]).toContain("5 hours");
    });

    it("should NOT flag service unavailability at exactly 4 hours", () => {
      const result = isNIS2SignificantIncident({
        causedOperationalDisruption: false,
        affectedOtherEntities: false,
        causedDataBreach: false,
        affectedServiceAvailability: true,
        serviceDowntimeHours: 4,
      });
      expect(result.isSignificant).toBe(false);
    });

    it("should NOT flag service downtime without availability flag", () => {
      const result = isNIS2SignificantIncident({
        causedOperationalDisruption: false,
        affectedOtherEntities: false,
        causedDataBreach: false,
        affectedServiceAvailability: false,
        serviceDowntimeHours: 100,
      });
      expect(result.isSignificant).toBe(false);
    });

    it("should accumulate multiple reasons", () => {
      const result = isNIS2SignificantIncident({
        causedOperationalDisruption: true,
        financialLossEuros: 1000000,
        affectedOtherEntities: true,
        affectedPersonCount: 500,
        causedDataBreach: true,
        affectedServiceAvailability: true,
        serviceDowntimeHours: 24,
      });
      expect(result.isSignificant).toBe(true);
      expect(result.reasons).toHaveLength(6);
    });
  });

  // ---------------------------------------------------------------------------
  // calculateSeverity
  // ---------------------------------------------------------------------------
  describe("calculateSeverity", () => {
    it("should return default severity when no factors provided", () => {
      expect(calculateSeverity("loss_of_contact")).toBe("critical");
      expect(calculateSeverity("spacecraft_anomaly")).toBe("high");
      expect(calculateSeverity("regulatory_breach")).toBe("medium");
      expect(calculateSeverity("other")).toBe("low");
    });

    it("should return default severity with empty factors", () => {
      expect(calculateSeverity("other", {})).toBe("low");
    });

    it("should escalate low to medium when debris is generated", () => {
      const severity = calculateSeverity("other", {
        hasDebrisGenerated: true,
      });
      expect(severity).toBe("medium");
    });

    it("should escalate low to medium when data breach occurs", () => {
      const severity = calculateSeverity("other", {
        hasDataBreach: true,
      });
      expect(severity).toBe("medium");
    });

    it("should escalate medium to high with debris generation", () => {
      const severity = calculateSeverity("regulatory_breach", {
        hasDebrisGenerated: true,
      });
      expect(severity).toBe("high");
    });

    it("should escalate high to critical with debris generation", () => {
      const severity = calculateSeverity("spacecraft_anomaly", {
        hasDebrisGenerated: true,
      });
      expect(severity).toBe("critical");
    });

    it("should cap severity at critical", () => {
      const severity = calculateSeverity("loss_of_contact", {
        hasDebrisGenerated: true,
        hasDataBreach: true,
        hasThirdPartyImpact: true,
        hasMediaAttention: true,
        isRecurring: true,
        affectedAssetCount: 10,
      });
      expect(severity).toBe("critical");
    });

    it("should add 0.5 for affectedAssetCount > 1", () => {
      // low base = 1, +0.5 for >1 assets = 1.5 -> "low"
      const severity = calculateSeverity("other", {
        affectedAssetCount: 2,
      });
      expect(severity).toBe("low");
    });

    it("should add additional 0.5 for affectedAssetCount > 5", () => {
      // low base = 1, +0.5 for >1, +0.5 for >5 = 2 -> "medium"
      const severity = calculateSeverity("other", {
        affectedAssetCount: 6,
      });
      expect(severity).toBe("medium");
    });

    it("should add 0.5 for third party impact", () => {
      // low = 1 + 0.5 = 1.5 -> "low"
      const severity = calculateSeverity("other", {
        hasThirdPartyImpact: true,
      });
      expect(severity).toBe("low");
    });

    it("should add 0.5 for media attention", () => {
      // low = 1 + 0.5 = 1.5 -> "low"
      const severity = calculateSeverity("other", {
        hasMediaAttention: true,
      });
      expect(severity).toBe("low");
    });

    it("should add 0.5 for recurring incident", () => {
      // low = 1 + 0.5 = 1.5 -> "low"
      const severity = calculateSeverity("other", {
        isRecurring: true,
      });
      expect(severity).toBe("low");
    });

    it("should combine multiple small factors to escalate", () => {
      // low = 1 + 0.5 (thirdParty) + 0.5 (media) = 2 -> "medium"
      const severity = calculateSeverity("other", {
        hasThirdPartyImpact: true,
        hasMediaAttention: true,
      });
      expect(severity).toBe("medium");
    });

    it("should handle unknown category gracefully with medium default", () => {
      const severity = calculateSeverity(
        "unknown_category" as IncidentCategory,
      );
      expect(severity).toBe("medium");
    });

    it("should escalate unknown category with factors", () => {
      // medium = 2 + 1 (debris) = 3 -> "high"
      const severity = calculateSeverity(
        "unknown_category" as IncidentCategory,
        { hasDebrisGenerated: true },
      );
      expect(severity).toBe("high");
    });
  });

  // ---------------------------------------------------------------------------
  // calculateNCADeadline
  // ---------------------------------------------------------------------------
  describe("calculateNCADeadline", () => {
    it("should add 4 hours for loss_of_contact", () => {
      const detected = new Date("2026-02-15T10:00:00Z");
      const deadline = calculateNCADeadline("loss_of_contact", detected);
      expect(deadline).toEqual(new Date("2026-02-15T14:00:00Z"));
    });

    it("should add 4 hours for debris_generation", () => {
      const detected = new Date("2026-02-15T10:00:00Z");
      const deadline = calculateNCADeadline("debris_generation", detected);
      expect(deadline).toEqual(new Date("2026-02-15T14:00:00Z"));
    });

    it("should add 4 hours for cyber_incident", () => {
      const detected = new Date("2026-02-15T10:00:00Z");
      const deadline = calculateNCADeadline("cyber_incident", detected);
      expect(deadline).toEqual(new Date("2026-02-15T14:00:00Z"));
    });

    it("should add 24 hours for spacecraft_anomaly", () => {
      const detected = new Date("2026-02-15T10:00:00Z");
      const deadline = calculateNCADeadline("spacecraft_anomaly", detected);
      expect(deadline).toEqual(new Date("2026-02-16T10:00:00Z"));
    });

    it("should add 72 hours for conjunction_event", () => {
      const detected = new Date("2026-02-15T10:00:00Z");
      const deadline = calculateNCADeadline("conjunction_event", detected);
      expect(deadline).toEqual(new Date("2026-02-18T10:00:00Z"));
    });

    it("should add 72 hours for regulatory_breach", () => {
      const detected = new Date("2026-02-15T10:00:00Z");
      const deadline = calculateNCADeadline("regulatory_breach", detected);
      expect(deadline).toEqual(new Date("2026-02-18T10:00:00Z"));
    });

    it("should add 24 hours for nis2_significant_incident", () => {
      const detected = new Date("2026-02-15T10:00:00Z");
      const deadline = calculateNCADeadline(
        "nis2_significant_incident",
        detected,
      );
      expect(deadline).toEqual(new Date("2026-02-16T10:00:00Z"));
    });

    it("should add 72 hours for nis2_near_miss", () => {
      const detected = new Date("2026-02-15T10:00:00Z");
      const deadline = calculateNCADeadline("nis2_near_miss", detected);
      expect(deadline).toEqual(new Date("2026-02-18T10:00:00Z"));
    });

    it("should add 168 hours (7 days) for other", () => {
      const detected = new Date("2026-02-15T10:00:00Z");
      const deadline = calculateNCADeadline("other", detected);
      expect(deadline).toEqual(new Date("2026-02-22T10:00:00Z"));
    });

    it("should default to 72 hours for unknown category", () => {
      const detected = new Date("2026-02-15T10:00:00Z");
      const deadline = calculateNCADeadline(
        "unknown" as IncidentCategory,
        detected,
      );
      expect(deadline).toEqual(new Date("2026-02-18T10:00:00Z"));
    });

    it("should not mutate the input date", () => {
      const detected = new Date("2026-02-15T10:00:00Z");
      const originalTime = detected.getTime();
      calculateNCADeadline("loss_of_contact", detected);
      expect(detected.getTime()).toBe(originalTime);
    });

    it("should handle midnight detection crossing day boundary", () => {
      const detected = new Date("2026-02-15T22:00:00Z");
      const deadline = calculateNCADeadline("loss_of_contact", detected);
      expect(deadline).toEqual(new Date("2026-02-16T02:00:00Z"));
    });
  });

  // ---------------------------------------------------------------------------
  // isNCANotificationOverdue
  // ---------------------------------------------------------------------------
  describe("isNCANotificationOverdue", () => {
    it("should return false if already reported to NCA", () => {
      const detected = new Date("2026-01-01T00:00:00Z"); // Very old
      const result = isNCANotificationOverdue(
        "loss_of_contact",
        detected,
        true,
      );
      expect(result).toBe(false);
    });

    it("should return true if not reported and deadline passed", () => {
      // Current time is 2026-02-15T12:00:00Z
      // Detected 10 hours ago -> deadline was 4 hours after detection = 6h ago
      const detected = new Date("2026-02-15T02:00:00Z");
      const result = isNCANotificationOverdue(
        "loss_of_contact",
        detected,
        false,
      );
      expect(result).toBe(true);
    });

    it("should return false if not reported but deadline not yet passed", () => {
      // Current time is 2026-02-15T12:00:00Z
      // Detected 1 hour ago -> deadline is 3 hours from now for 4h category
      const detected = new Date("2026-02-15T11:00:00Z");
      const result = isNCANotificationOverdue(
        "loss_of_contact",
        detected,
        false,
      );
      expect(result).toBe(false);
    });

    it("should use category-specific deadline hours", () => {
      // Current time is 2026-02-15T12:00:00Z
      // Detected 25 hours ago -> overdue for 24h category
      const detected = new Date("2026-02-14T11:00:00Z");
      const result = isNCANotificationOverdue(
        "spacecraft_anomaly",
        detected,
        false,
      );
      expect(result).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // generateIncidentNumber
  // ---------------------------------------------------------------------------
  describe("generateIncidentNumber", () => {
    it("should generate INC-YYYY-001 when no prior incidents", async () => {
      vi.mocked(prisma.incident.findFirst).mockResolvedValue(null);

      const number = await generateIncidentNumber();
      expect(number).toBe("INC-2026-001");
    });

    it("should increment from the last incident number", async () => {
      vi.mocked(prisma.incident.findFirst).mockResolvedValue({
        incidentNumber: "INC-2026-042",
      } as never);

      const number = await generateIncidentNumber();
      expect(number).toBe("INC-2026-043");
    });

    it("should pad numbers to 3 digits", async () => {
      vi.mocked(prisma.incident.findFirst).mockResolvedValue({
        incidentNumber: "INC-2026-005",
      } as never);

      const number = await generateIncidentNumber();
      expect(number).toBe("INC-2026-006");
    });

    it("should handle high incident counts (>999)", async () => {
      vi.mocked(prisma.incident.findFirst).mockResolvedValue({
        incidentNumber: "INC-2026-999",
      } as never);

      const number = await generateIncidentNumber();
      expect(number).toBe("INC-2026-1000");
    });

    it("should use current year", async () => {
      vi.mocked(prisma.incident.findFirst).mockResolvedValue(null);

      const number = await generateIncidentNumber();
      expect(number).toMatch(/^INC-2026-/);
    });

    it("should query prisma with the correct year prefix", async () => {
      vi.mocked(prisma.incident.findFirst).mockResolvedValue(null);

      await generateIncidentNumber();
      expect(prisma.incident.findFirst).toHaveBeenCalledWith({
        where: {
          incidentNumber: {
            startsWith: "INC-2026-",
          },
        },
        orderBy: {
          incidentNumber: "desc",
        },
        select: {
          incidentNumber: true,
        },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // createIncident
  // ---------------------------------------------------------------------------
  describe("createIncident", () => {
    const baseInput = {
      supervisionId: "sup-123",
      category: "loss_of_contact" as IncidentCategory,
      title: "Lost contact with SAT-1",
      description: "Spacecraft became unresponsive at 10:00 UTC",
      detectedBy: "Mission Control",
      detectionMethod: "automated" as const,
    };

    const mockCreatedIncident = {
      id: "inc-abc",
      incidentNumber: "INC-2026-001",
      category: "loss_of_contact",
      severity: "critical",
      status: "detected",
      title: "Lost contact with SAT-1",
      description: "Spacecraft became unresponsive at 10:00 UTC",
      detectedAt: new Date("2026-02-15T12:00:00Z"),
      detectedBy: "Mission Control",
      detectionMethod: "automated",
      affectedAssets: [],
    };

    beforeEach(() => {
      vi.mocked(prisma.incident.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.incident.create).mockResolvedValue(
        mockCreatedIncident as never,
      );
      vi.mocked(prisma.deadline.create).mockResolvedValue({} as never);
    });

    it("should create an incident successfully", async () => {
      const result = await createIncident(baseInput, "user-1");

      expect(result.success).toBe(true);
      expect(result.incidentId).toBe("inc-abc");
      expect(result.incidentNumber).toBe("INC-2026-001");
      expect(result.severity).toBe("critical");
      expect(result.requiresNCANotification).toBe(true);
    });

    it("should calculate correct severity for category", async () => {
      const result = await createIncident(baseInput, "user-1");
      expect(result.severity).toBe("critical");
    });

    it("should return NCA deadline", async () => {
      const result = await createIncident(baseInput, "user-1");
      expect(result.ncaDeadline).toBeDefined();
      expect(result.ncaDeadline).toBeInstanceOf(Date);
    });

    it("should use provided detectedAt time", async () => {
      const customTime = new Date("2026-02-15T08:00:00Z");
      const result = await createIncident(
        { ...baseInput, detectedAt: customTime },
        "user-1",
      );

      expect(result.success).toBe(true);
      // Verify the deadline is based on the provided time
      const expectedDeadline = new Date("2026-02-15T12:00:00Z"); // +4h
      expect(result.ncaDeadline).toEqual(expectedDeadline);
    });

    it("should default detectedAt to now if not provided", async () => {
      const result = await createIncident(baseInput, "user-1");
      expect(result.success).toBe(true);
      // The NCA deadline should be 4h from system time (2026-02-15T12:00:00Z)
      const expectedDeadline = new Date("2026-02-15T16:00:00Z");
      expect(result.ncaDeadline).toEqual(expectedDeadline);
    });

    it("should encrypt the description", async () => {
      const { encrypt } = await import("@/lib/encryption");
      await createIncident(baseInput, "user-1");

      expect(encrypt).toHaveBeenCalledWith(baseInput.description);
    });

    it("should create a deadline when NCA notification is required", async () => {
      await createIncident(baseInput, "user-1");

      expect(prisma.deadline.create).toHaveBeenCalledTimes(1);
      expect(prisma.deadline.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-1",
            title: expect.stringContaining("NCA Notification"),
            category: "REGULATORY",
            moduleSource: "SUPERVISION",
            relatedEntityId: "inc-abc",
          }),
        }),
      );
    });

    it("should NOT create a deadline when NCA notification is not required", async () => {
      await createIncident({ ...baseInput, category: "other" }, "user-1");

      expect(prisma.deadline.create).not.toHaveBeenCalled();
    });

    it("should log audit event on creation", async () => {
      await createIncident(baseInput, "user-1");

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          action: "incident_created",
          entityType: "incident",
          entityId: "inc-abc",
        }),
      );
    });

    it("should handle affected assets", async () => {
      const input = {
        ...baseInput,
        affectedAssets: [
          { assetName: "SAT-1", cosparId: "2026-001A", noradId: "56789" },
          { assetName: "SAT-2" },
        ],
      };

      await createIncident(input, "user-1");

      expect(prisma.incident.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            affectedAssets: {
              create: [
                {
                  assetName: "SAT-1",
                  cosparId: "2026-001A",
                  noradId: "56789",
                },
                {
                  assetName: "SAT-2",
                  cosparId: undefined,
                  noradId: undefined,
                },
              ],
            },
          }),
        }),
      );
    });

    it("should use asset count in severity calculation", async () => {
      const input = {
        ...baseInput,
        category: "other" as IncidentCategory,
        affectedAssets: [
          { assetName: "SAT-1" },
          { assetName: "SAT-2" },
          { assetName: "SAT-3" },
          { assetName: "SAT-4" },
          { assetName: "SAT-5" },
          { assetName: "SAT-6" },
        ],
      };

      const result = await createIncident(input, "user-1");
      // "other" base is low (1) + 0.5 (>1 asset) + 0.5 (>5 assets) = 2 -> medium
      expect(result.severity).toBe("medium");
    });

    it("should apply severity factors from input", async () => {
      const input = {
        ...baseInput,
        category: "other" as IncidentCategory,
        severityFactors: {
          hasDebrisGenerated: true,
          hasDataBreach: true,
        },
      };

      const result = await createIncident(input, "user-1");
      // "other" base is low (1) + 1 (debris) + 1 (data breach) = 3 -> high
      expect(result.severity).toBe("high");
    });

    it("should return error on prisma failure", async () => {
      vi.mocked(prisma.incident.create).mockRejectedValue(
        new Error("Database error"),
      );

      const result = await createIncident(baseInput, "user-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });

    it("should return generic error for non-Error throws", async () => {
      vi.mocked(prisma.incident.create).mockRejectedValue("unknown failure");

      const result = await createIncident(baseInput, "user-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to create incident");
    });
  });

  // ---------------------------------------------------------------------------
  // updateIncidentStatus
  // ---------------------------------------------------------------------------
  describe("updateIncidentStatus", () => {
    const mockIncident = {
      id: "inc-123",
      incidentNumber: "INC-2026-005",
      status: "detected",
      containedAt: null,
      resolvedAt: null,
    };

    beforeEach(() => {
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(
        mockIncident as never,
      );
      vi.mocked(prisma.incident.update).mockResolvedValue({} as never);
    });

    it("should update status successfully", async () => {
      const result = await updateIncidentStatus(
        "inc-123",
        "investigating",
        "user-1",
      );
      expect(result.success).toBe(true);
    });

    it("should return error when incident not found", async () => {
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(null);

      const result = await updateIncidentStatus(
        "inc-999",
        "investigating",
        "user-1",
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("Incident not found");
    });

    it("should set containedAt timestamp when status is contained", async () => {
      await updateIncidentStatus("inc-123", "contained", "user-1");

      expect(prisma.incident.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "contained",
            containedAt: expect.any(Date),
          }),
        }),
      );
    });

    it("should set resolvedAt timestamp when status is resolved", async () => {
      await updateIncidentStatus("inc-123", "resolved", "user-1");

      expect(prisma.incident.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "resolved",
            resolvedAt: expect.any(Date),
          }),
        }),
      );
    });

    it("should NOT overwrite containedAt if already set", async () => {
      const incidentWithContained = {
        ...mockIncident,
        containedAt: new Date("2026-02-14T00:00:00Z"),
      };
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(
        incidentWithContained as never,
      );

      await updateIncidentStatus("inc-123", "contained", "user-1");

      const updateCall = vi.mocked(prisma.incident.update).mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty("containedAt");
    });

    it("should NOT overwrite resolvedAt if already set", async () => {
      const incidentWithResolved = {
        ...mockIncident,
        resolvedAt: new Date("2026-02-14T00:00:00Z"),
      };
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(
        incidentWithResolved as never,
      );

      await updateIncidentStatus("inc-123", "resolved", "user-1");

      const updateCall = vi.mocked(prisma.incident.update).mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty("resolvedAt");
    });

    it("should encrypt rootCause when provided", async () => {
      const { encrypt } = await import("@/lib/encryption");

      await updateIncidentStatus("inc-123", "resolved", "user-1", {
        rootCause: "Software bug in AOCS module",
      });

      expect(encrypt).toHaveBeenCalledWith("Software bug in AOCS module");
    });

    it("should encrypt impactAssessment when provided", async () => {
      const { encrypt } = await import("@/lib/encryption");

      await updateIncidentStatus("inc-123", "resolved", "user-1", {
        impactAssessment: "Minimal impact on operations",
      });

      expect(encrypt).toHaveBeenCalledWith("Minimal impact on operations");
    });

    it("should encrypt lessonsLearned when provided", async () => {
      const { encrypt } = await import("@/lib/encryption");

      await updateIncidentStatus("inc-123", "resolved", "user-1", {
        lessonsLearned: "Need better monitoring",
      });

      expect(encrypt).toHaveBeenCalledWith("Need better monitoring");
    });

    it("should pass through non-encrypted additional data", async () => {
      await updateIncidentStatus("inc-123", "contained", "user-1", {
        immediateActions: ["Action 1", "Action 2"],
        containmentMeasures: ["Measure 1"],
      });

      expect(prisma.incident.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            immediateActions: ["Action 1", "Action 2"],
            containmentMeasures: ["Measure 1"],
          }),
        }),
      );
    });

    it("should log audit event with status transition", async () => {
      await updateIncidentStatus("inc-123", "investigating", "user-1");

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          action: "incident_status_updated",
          entityType: "incident",
          entityId: "inc-123",
          previousValue: { status: "detected" },
          newValue: { status: "investigating" },
        }),
      );
    });

    it("should include incident number in audit description", async () => {
      await updateIncidentStatus("inc-123", "investigating", "user-1");

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining("INC-2026-005"),
        }),
      );
    });

    it("should return error on prisma failure", async () => {
      vi.mocked(prisma.incident.update).mockRejectedValue(
        new Error("DB write failed"),
      );

      const result = await updateIncidentStatus(
        "inc-123",
        "resolved",
        "user-1",
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("DB write failed");
    });

    it("should return generic error for non-Error throws", async () => {
      vi.mocked(prisma.incident.update).mockRejectedValue("oops");

      const result = await updateIncidentStatus(
        "inc-123",
        "resolved",
        "user-1",
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to update status");
    });
  });

  // ---------------------------------------------------------------------------
  // recordNCANotification
  // ---------------------------------------------------------------------------
  describe("recordNCANotification", () => {
    const mockIncident = {
      id: "inc-123",
      incidentNumber: "INC-2026-010",
      status: "investigating",
    };

    beforeEach(() => {
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(
        mockIncident as never,
      );
      vi.mocked(prisma.incident.update).mockResolvedValue({} as never);
      vi.mocked(prisma.deadline.updateMany).mockResolvedValue({
        count: 1,
      } as never);
    });

    it("should record NCA notification successfully", async () => {
      const result = await recordNCANotification("inc-123", "user-1", {});
      expect(result.success).toBe(true);
    });

    it("should return error when incident not found", async () => {
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(null);

      const result = await recordNCANotification("inc-999", "user-1", {});
      expect(result.success).toBe(false);
      expect(result.error).toBe("Incident not found");
    });

    it("should set reportedToNCA to true", async () => {
      await recordNCANotification("inc-123", "user-1", {});

      expect(prisma.incident.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reportedToNCA: true,
            ncaReportDate: expect.any(Date),
            status: "reported",
          }),
        }),
      );
    });

    it("should include NCA reference number when provided", async () => {
      await recordNCANotification("inc-123", "user-1", {
        ncaReferenceNumber: "NCA-2026-REF-001",
      });

      expect(prisma.incident.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ncaReferenceNumber: "NCA-2026-REF-001",
          }),
        }),
      );
    });

    it("should set EUSPA notification when notifyEUSPA is true", async () => {
      await recordNCANotification("inc-123", "user-1", {
        notifyEUSPA: true,
      });

      expect(prisma.incident.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reportedToEUSPA: true,
            euspaReportDate: expect.any(Date),
          }),
        }),
      );
    });

    it("should NOT set EUSPA fields when notifyEUSPA is false/undefined", async () => {
      await recordNCANotification("inc-123", "user-1", {});

      const updateCall = vi.mocked(prisma.incident.update).mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty("reportedToEUSPA");
      expect(updateCall.data).not.toHaveProperty("euspaReportDate");
    });

    it("should update related deadline to completed", async () => {
      await recordNCANotification("inc-123", "user-1", {});

      expect(prisma.deadline.updateMany).toHaveBeenCalledWith({
        where: {
          moduleSource: "SUPERVISION",
          relatedEntityId: "inc-123",
          title: { contains: "NCA Notification" },
        },
        data: {
          status: "COMPLETED",
          completedAt: expect.any(Date),
          completedBy: "user-1",
        },
      });
    });

    it("should log audit event", async () => {
      await recordNCANotification("inc-123", "user-1", {
        ncaReferenceNumber: "NCA-REF-001",
        notifyEUSPA: true,
      });

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          action: "incident_reported_to_nca",
          entityType: "incident",
          entityId: "inc-123",
          newValue: expect.objectContaining({
            reportedToNCA: true,
            ncaReferenceNumber: "NCA-REF-001",
            reportedToEUSPA: true,
          }),
          description: expect.stringContaining("INC-2026-010"),
        }),
      );
    });

    it("should return error on prisma failure", async () => {
      vi.mocked(prisma.incident.update).mockRejectedValue(
        new Error("Update failed"),
      );

      const result = await recordNCANotification("inc-123", "user-1", {});
      expect(result.success).toBe(false);
      expect(result.error).toBe("Update failed");
    });

    it("should return generic error for non-Error throws", async () => {
      vi.mocked(prisma.incident.update).mockRejectedValue(42);

      const result = await recordNCANotification("inc-123", "user-1", {});
      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to record notification");
    });
  });

  // ---------------------------------------------------------------------------
  // getIncidentSummary
  // ---------------------------------------------------------------------------
  describe("getIncidentSummary", () => {
    it("should return null when incident not found", async () => {
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(null);

      const result = await getIncidentSummary("inc-999");
      expect(result).toBeNull();
    });

    it("should return full summary for an incident", async () => {
      const detectedAt = new Date("2026-02-15T08:00:00Z");
      vi.mocked(prisma.incident.findUnique).mockResolvedValue({
        id: "inc-123",
        incidentNumber: "INC-2026-003",
        category: "loss_of_contact",
        severity: "critical",
        status: "investigating",
        title: "Lost SAT-1",
        detectedAt,
        reportedToNCA: false,
        reportedToEUSPA: false,
        affectedAssets: [{ id: "a1" }, { id: "a2" }],
      } as never);

      const result = await getIncidentSummary("inc-123");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("inc-123");
      expect(result!.incidentNumber).toBe("INC-2026-003");
      expect(result!.category).toBe("loss_of_contact");
      expect(result!.severity).toBe("critical");
      expect(result!.status).toBe("investigating");
      expect(result!.title).toBe("Lost SAT-1");
      expect(result!.ncaDeadlineHours).toBe(4);
      expect(result!.requiresNCANotification).toBe(true);
      expect(result!.reportedToNCA).toBe(false);
      expect(result!.reportedToEUSPA).toBe(false);
      expect(result!.affectedAssetCount).toBe(2);
    });

    it("should calculate NCA deadline correctly", async () => {
      const detectedAt = new Date("2026-02-15T08:00:00Z");
      vi.mocked(prisma.incident.findUnique).mockResolvedValue({
        id: "inc-123",
        incidentNumber: "INC-2026-003",
        category: "loss_of_contact",
        severity: "critical",
        status: "detected",
        title: "Test",
        detectedAt,
        reportedToNCA: false,
        reportedToEUSPA: false,
        affectedAssets: [],
      } as never);

      const result = await getIncidentSummary("inc-123");

      // deadline = detectedAt + 4h
      expect(result!.ncaDeadline).toEqual(new Date("2026-02-15T12:00:00Z"));
    });

    it("should mark as overdue when past deadline and not reported", async () => {
      // System time: 2026-02-15T12:00:00Z
      // Detected 10 hours ago, 4h deadline -> overdue
      const detectedAt = new Date("2026-02-15T02:00:00Z");
      vi.mocked(prisma.incident.findUnique).mockResolvedValue({
        id: "inc-123",
        incidentNumber: "INC-2026-003",
        category: "loss_of_contact",
        severity: "critical",
        status: "detected",
        title: "Test",
        detectedAt,
        reportedToNCA: false,
        reportedToEUSPA: false,
        affectedAssets: [],
      } as never);

      const result = await getIncidentSummary("inc-123");
      expect(result!.isOverdue).toBe(true);
      expect(result!.hoursRemaining).toBe(0);
    });

    it("should NOT mark as overdue when reported to NCA", async () => {
      const detectedAt = new Date("2026-02-15T02:00:00Z");
      vi.mocked(prisma.incident.findUnique).mockResolvedValue({
        id: "inc-123",
        incidentNumber: "INC-2026-003",
        category: "loss_of_contact",
        severity: "critical",
        status: "reported",
        title: "Test",
        detectedAt,
        reportedToNCA: true,
        reportedToEUSPA: false,
        affectedAssets: [],
      } as never);

      const result = await getIncidentSummary("inc-123");
      expect(result!.isOverdue).toBe(false);
    });

    it("should calculate positive hoursRemaining when not overdue", async () => {
      // System time: 2026-02-15T12:00:00Z
      // Detected 1 hour ago, 4h deadline -> 3 hours remaining
      const detectedAt = new Date("2026-02-15T11:00:00Z");
      vi.mocked(prisma.incident.findUnique).mockResolvedValue({
        id: "inc-123",
        incidentNumber: "INC-2026-003",
        category: "loss_of_contact",
        severity: "critical",
        status: "detected",
        title: "Test",
        detectedAt,
        reportedToNCA: false,
        reportedToEUSPA: false,
        affectedAssets: [],
      } as never);

      const result = await getIncidentSummary("inc-123");
      expect(result!.hoursRemaining).toBe(3);
      expect(result!.isOverdue).toBe(false);
    });

    it("should include affected asset count", async () => {
      vi.mocked(prisma.incident.findUnique).mockResolvedValue({
        id: "inc-123",
        incidentNumber: "INC-2026-003",
        category: "other",
        severity: "low",
        status: "detected",
        title: "Test",
        detectedAt: new Date("2026-02-15T11:00:00Z"),
        reportedToNCA: false,
        reportedToEUSPA: false,
        affectedAssets: [{ id: "a1" }, { id: "a2" }, { id: "a3" }],
      } as never);

      const result = await getIncidentSummary("inc-123");
      expect(result!.affectedAssetCount).toBe(3);
    });

    it("should query prisma with correct params", async () => {
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(null);

      await getIncidentSummary("inc-123");

      expect(prisma.incident.findUnique).toHaveBeenCalledWith({
        where: { id: "inc-123" },
        include: { affectedAssets: true },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // getPendingNCANotifications
  // ---------------------------------------------------------------------------
  describe("getPendingNCANotifications", () => {
    it("should return empty array when no pending notifications", async () => {
      vi.mocked(prisma.incident.findMany).mockResolvedValue([]);

      const result = await getPendingNCANotifications("sup-123");
      expect(result).toEqual([]);
    });

    it("should filter for unreported incidents requiring NCA notification", async () => {
      vi.mocked(prisma.incident.findMany).mockResolvedValue([]);

      await getPendingNCANotifications("sup-123");

      expect(prisma.incident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            supervisionId: "sup-123",
            reportedToNCA: false,
            category: {
              in: expect.arrayContaining([
                "loss_of_contact",
                "debris_generation",
                "cyber_incident",
                "spacecraft_anomaly",
                "conjunction_event",
                "regulatory_breach",
                "nis2_significant_incident",
              ]),
            },
          }),
        }),
      );
    });

    it("should NOT include categories that do not require NCA notification", async () => {
      vi.mocked(prisma.incident.findMany).mockResolvedValue([]);

      await getPendingNCANotifications("sup-123");

      const call = vi.mocked(prisma.incident.findMany).mock.calls[0][0];
      const categoryFilter = call!.where!.category as { in: string[] };
      expect(categoryFilter.in).not.toContain("nis2_near_miss");
      expect(categoryFilter.in).not.toContain("other");
    });

    it("should order by detectedAt ascending", async () => {
      vi.mocked(prisma.incident.findMany).mockResolvedValue([]);

      await getPendingNCANotifications("sup-123");

      expect(prisma.incident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { detectedAt: "asc" },
        }),
      );
    });

    it("should map incidents to IncidentSummary objects", async () => {
      const detectedAt = new Date("2026-02-15T08:00:00Z");
      vi.mocked(prisma.incident.findMany).mockResolvedValue([
        {
          id: "inc-1",
          incidentNumber: "INC-2026-001",
          category: "loss_of_contact",
          severity: "critical",
          status: "detected",
          title: "Lost SAT-1",
          detectedAt,
          reportedToNCA: false,
          reportedToEUSPA: false,
          affectedAssets: [{ id: "a1" }],
        },
      ] as never);

      const result = await getPendingNCANotifications("sup-123");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("inc-1");
      expect(result[0].incidentNumber).toBe("INC-2026-001");
      expect(result[0].category).toBe("loss_of_contact");
      expect(result[0].severity).toBe("critical");
      expect(result[0].requiresNCANotification).toBe(true);
      expect(result[0].reportedToNCA).toBe(false);
      expect(result[0].affectedAssetCount).toBe(1);
    });

    it("should correctly identify overdue incidents", async () => {
      // System time: 2026-02-15T12:00:00Z
      // Detected 10 hours ago with 4h deadline -> overdue
      const detectedAt = new Date("2026-02-15T02:00:00Z");
      vi.mocked(prisma.incident.findMany).mockResolvedValue([
        {
          id: "inc-1",
          incidentNumber: "INC-2026-001",
          category: "loss_of_contact",
          severity: "critical",
          status: "detected",
          title: "Lost SAT-1",
          detectedAt,
          reportedToNCA: false,
          reportedToEUSPA: false,
          affectedAssets: [],
        },
      ] as never);

      const result = await getPendingNCANotifications("sup-123");
      expect(result[0].isOverdue).toBe(true);
      expect(result[0].hoursRemaining).toBe(0);
    });

    it("should correctly identify non-overdue incidents", async () => {
      // System time: 2026-02-15T12:00:00Z
      // Detected 1 hour ago with 4h deadline -> 3 hours remaining
      const detectedAt = new Date("2026-02-15T11:00:00Z");
      vi.mocked(prisma.incident.findMany).mockResolvedValue([
        {
          id: "inc-1",
          incidentNumber: "INC-2026-001",
          category: "loss_of_contact",
          severity: "critical",
          status: "detected",
          title: "Test",
          detectedAt,
          reportedToNCA: false,
          reportedToEUSPA: false,
          affectedAssets: [],
        },
      ] as never);

      const result = await getPendingNCANotifications("sup-123");
      expect(result[0].isOverdue).toBe(false);
      expect(result[0].hoursRemaining).toBe(3);
    });

    it("should handle multiple incidents with different categories", async () => {
      vi.mocked(prisma.incident.findMany).mockResolvedValue([
        {
          id: "inc-1",
          incidentNumber: "INC-2026-001",
          category: "loss_of_contact",
          severity: "critical",
          status: "detected",
          title: "Incident 1",
          detectedAt: new Date("2026-02-15T11:00:00Z"),
          reportedToNCA: false,
          reportedToEUSPA: false,
          affectedAssets: [],
        },
        {
          id: "inc-2",
          incidentNumber: "INC-2026-002",
          category: "conjunction_event",
          severity: "high",
          status: "investigating",
          title: "Incident 2",
          detectedAt: new Date("2026-02-15T10:00:00Z"),
          reportedToNCA: false,
          reportedToEUSPA: false,
          affectedAssets: [{ id: "a1" }, { id: "a2" }],
        },
      ] as never);

      const result = await getPendingNCANotifications("sup-123");

      expect(result).toHaveLength(2);
      expect(result[0].ncaDeadlineHours).toBe(4); // loss_of_contact
      expect(result[1].ncaDeadlineHours).toBe(72); // conjunction_event
      expect(result[1].affectedAssetCount).toBe(2);
    });
  });
});
