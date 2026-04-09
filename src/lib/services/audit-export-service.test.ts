/**
 * Audit Export Service Tests
 *
 * Tests: getAuditSummary, generateAuditReportData, exportAuditLogsEnhanced,
 * generateComplianceCertificateData, getAuditFilterOptions, searchAuditLogs
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: { findMany: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
    securityEvent: { groupBy: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    authorizationWorkflow: { findMany: vi.fn() },
    debrisAssessment: { findMany: vi.fn() },
    cybersecurityAssessment: { findMany: vi.fn() },
    insuranceAssessment: { findMany: vi.fn() },
    environmentalAssessment: { findMany: vi.fn() },
    organizationMember: { findFirst: vi.fn(), findMany: vi.fn() },
  },
}));

import {
  getAuditSummary,
  generateAuditReportData,
  exportAuditLogsEnhanced,
  generateComplianceCertificateData,
  getAuditFilterOptions,
  searchAuditLogs,
} from "./audit-export-service";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  auditLog: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    aggregate: ReturnType<typeof vi.fn>;
  };
  securityEvent: {
    groupBy: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  authorizationWorkflow: { findMany: ReturnType<typeof vi.fn> };
  debrisAssessment: { findMany: ReturnType<typeof vi.fn> };
  cybersecurityAssessment: { findMany: ReturnType<typeof vi.fn> };
  insuranceAssessment: { findMany: ReturnType<typeof vi.fn> };
  environmentalAssessment: { findMany: ReturnType<typeof vi.fn> };
  organizationMember: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe("Audit Export Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // resolveOrgMemberIds calls organizationMember.findFirst; returning null
    // makes it fall back to [userId], which is sufficient for most tests.
    mockPrisma.organizationMember.findFirst.mockResolvedValue(null);
  });

  // ─── getAuditSummary ──────────────────────────────────────────────────────

  describe("getAuditSummary", () => {
    it("returns basic summary with total events and aggregations", async () => {
      const logs = [
        {
          action: "CREATE",
          entityType: "Document",
          entityId: "doc-1",
          timestamp: new Date("2024-06-10T10:00:00Z"),
        },
        {
          action: "UPDATE",
          entityType: "Document",
          entityId: "doc-1",
          timestamp: new Date("2024-06-10T11:00:00Z"),
        },
        {
          action: "CREATE",
          entityType: "Assessment",
          entityId: "assess-1",
          timestamp: new Date("2024-06-11T09:00:00Z"),
        },
      ];

      mockPrisma.auditLog.findMany
        .mockResolvedValueOnce(logs) // main query
        .mockResolvedValueOnce(logs); // recentActivity
      mockPrisma.securityEvent.groupBy.mockResolvedValue([
        { severity: "HIGH", _count: 2 },
        { severity: "LOW", _count: 5 },
      ]);

      const result = await getAuditSummary("user-1");

      expect(result.totalEvents).toBe(3);
      expect(result.eventsByAction).toEqual({ CREATE: 2, UPDATE: 1 });
      expect(result.eventsByEntityType).toEqual({
        Document: 2,
        Assessment: 1,
      });
      expect(result.securityEvents.total).toBe(7);
      expect(result.securityEvents.bySeverity).toEqual({ HIGH: 2, LOW: 5 });
      // Unresolved count is always 0 to prevent cross-org data leakage
      expect(result.securityEvents.unresolved).toBe(0);
    });

    it("applies date filters when provided", async () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-06-30");

      mockPrisma.auditLog.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockPrisma.securityEvent.groupBy.mockResolvedValue([]);

      await getAuditSummary("user-1", { startDate, endDate });

      const call = mockPrisma.auditLog.findMany.mock.calls[0][0];
      expect(call.where.timestamp).toEqual({ gte: startDate, lte: endDate });
    });

    it("applies action filters when provided", async () => {
      mockPrisma.auditLog.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockPrisma.securityEvent.groupBy.mockResolvedValue([]);
      await getAuditSummary("user-1", { actions: ["CREATE", "DELETE"] });

      const call = mockPrisma.auditLog.findMany.mock.calls[0][0];
      expect(call.where.action).toEqual({ in: ["CREATE", "DELETE"] });
    });

    it("applies entityType filters when provided", async () => {
      mockPrisma.auditLog.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockPrisma.securityEvent.groupBy.mockResolvedValue([]);
      await getAuditSummary("user-1", { entityTypes: ["Document"] });

      const call = mockPrisma.auditLog.findMany.mock.calls[0][0];
      expect(call.where.entityType).toEqual({ in: ["Document"] });
    });

    it("aggregates events by day sorted chronologically", async () => {
      const logs = [
        {
          action: "CREATE",
          entityType: "Doc",
          entityId: "d1",
          timestamp: new Date("2024-06-12T10:00:00Z"),
        },
        {
          action: "CREATE",
          entityType: "Doc",
          entityId: "d2",
          timestamp: new Date("2024-06-10T10:00:00Z"),
        },
        {
          action: "UPDATE",
          entityType: "Doc",
          entityId: "d1",
          timestamp: new Date("2024-06-10T15:00:00Z"),
        },
      ];

      mockPrisma.auditLog.findMany
        .mockResolvedValueOnce(logs)
        .mockResolvedValueOnce([]);
      mockPrisma.securityEvent.groupBy.mockResolvedValue([]);
      const result = await getAuditSummary("user-1");

      expect(result.eventsByDay).toEqual([
        { date: "2024-06-10", count: 2 },
        { date: "2024-06-12", count: 1 },
      ]);
    });

    it("returns top entities sorted by count descending", async () => {
      const logs = [
        {
          action: "CREATE",
          entityType: "Doc",
          entityId: "d1",
          timestamp: new Date("2024-06-10T10:00:00Z"),
        },
        {
          action: "UPDATE",
          entityType: "Doc",
          entityId: "d1",
          timestamp: new Date("2024-06-10T11:00:00Z"),
        },
        {
          action: "UPDATE",
          entityType: "Doc",
          entityId: "d1",
          timestamp: new Date("2024-06-10T12:00:00Z"),
        },
        {
          action: "CREATE",
          entityType: "Assessment",
          entityId: "a1",
          timestamp: new Date("2024-06-11T09:00:00Z"),
        },
      ];

      mockPrisma.auditLog.findMany
        .mockResolvedValueOnce(logs)
        .mockResolvedValueOnce([]);
      mockPrisma.securityEvent.groupBy.mockResolvedValue([]);
      const result = await getAuditSummary("user-1");

      expect(result.topEntities[0]).toEqual({
        entityType: "Doc",
        entityId: "d1",
        count: 3,
      });
      expect(result.topEntities[1]).toEqual({
        entityType: "Assessment",
        entityId: "a1",
        count: 1,
      });
    });
  });

  // ─── generateAuditReportData ──────────────────────────────────────────────

  describe("generateAuditReportData", () => {
    const setupMocksForReport = () => {
      // For generateAuditReportData: prisma.auditLog.findMany (main logs)
      // For getAuditSummary (called internally): prisma.auditLog.findMany (2 calls), securityEvent.groupBy
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.securityEvent.groupBy.mockResolvedValue([]);
      mockPrisma.securityEvent.findMany.mockResolvedValue([]);
    };

    it("includes security events when includeSecurityEvents is true", async () => {
      setupMocksForReport();
      const secEvents = [
        {
          id: "se-1",
          type: "INTRUSION",
          severity: "HIGH",
          description: "Unauthorized access",
          createdAt: new Date("2024-06-10"),
          resolved: false,
          resolvedAt: null,
        },
      ];
      mockPrisma.securityEvent.findMany.mockResolvedValue(secEvents);

      const result = await generateAuditReportData(
        "user-1",
        {
          startDate: new Date("2024-01-01"),
          endDate: new Date("2024-12-31"),
          includeSecurityEvents: true,
        },
        "Test Org",
      );

      expect(result.securityEvents).toHaveLength(1);
      expect(result.securityEvents![0].type).toBe("INTRUSION");
      expect(result.organizationName).toBe("Test Org");
    });

    it("returns empty security events when includeSecurityEvents is false", async () => {
      setupMocksForReport();

      const result = await generateAuditReportData("user-1", {
        includeSecurityEvents: false,
      });

      expect(result.securityEvents).toEqual([]);
    });

    it("uses default date range when none provided", async () => {
      setupMocksForReport();

      const result = await generateAuditReportData("user-1", {});

      // Default endDate should be roughly now, startDate should be ~1 year ago
      const yearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
      expect(result.period.from.getTime()).toBeGreaterThanOrEqual(
        yearAgo - 5000,
      );
      expect(result.period.from.getTime()).toBeLessThanOrEqual(yearAgo + 5000);
      expect(result.period.to.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
    });

    it("applies custom filters to query", async () => {
      setupMocksForReport();

      await generateAuditReportData("user-1", {
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-06-30"),
        actions: ["CREATE"],
        entityTypes: ["Document"],
      });

      // First findMany call is for the main logs
      const mainCall = mockPrisma.auditLog.findMany.mock.calls[0][0];
      expect(mainCall.where.action).toEqual({ in: ["CREATE"] });
      expect(mainCall.where.entityType).toEqual({ in: ["Document"] });
    });

    it("includes userId and generatedAt in result", async () => {
      setupMocksForReport();

      const result = await generateAuditReportData("user-42", {});

      expect(result.userId).toBe("user-42");
      expect(result.generatedAt).toBeInstanceOf(Date);
    });
  });

  // ─── exportAuditLogsEnhanced ──────────────────────────────────────────────

  describe("exportAuditLogsEnhanced", () => {
    it("generates CSV format with correct headers and rows", async () => {
      const mockLogs = [
        {
          timestamp: new Date("2024-06-10T10:00:00Z"),
          user: { name: "Alice", email: "alice@example.com" },
          action: "CREATE",
          entityType: "Document",
          entityId: "doc-1",
          description: "Created document",
          previousValue: null,
          newValue: null,
          ipAddress: "192.168.1.1",
          userAgent: "Mozilla/5.0",
        },
      ];
      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await exportAuditLogsEnhanced(
        "user-1",
        { startDate: new Date("2024-01-01"), endDate: new Date("2024-12-31") },
        "csv",
      );

      expect(result.mimeType).toBe("text/csv");
      expect(result.filename).toMatch(/^audit-logs-\d{4}-\d{2}-\d{2}\.csv$/);

      const csvData = result.data as string;
      const lines = csvData.split("\n");

      // Check headers
      expect(lines[0]).toContain("Timestamp");
      expect(lines[0]).toContain("User");
      expect(lines[0]).toContain("Action");
      expect(lines[0]).toContain("Entity Type");

      // Check data row
      expect(lines[1]).toContain("Alice");
      expect(lines[1]).toContain("CREATE");
      expect(lines[1]).toContain("Document");
    });

    it("generates JSON format output", async () => {
      const mockLogs = [
        {
          timestamp: new Date("2024-06-10T10:00:00Z"),
          user: { name: "Bob", email: "bob@example.com" },
          action: "UPDATE",
          entityType: "Assessment",
          entityId: "assess-1",
          description: "Updated assessment",
          previousValue: null,
          newValue: null,
          ipAddress: "10.0.0.1",
          userAgent: null,
        },
      ];
      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await exportAuditLogsEnhanced(
        "user-1",
        { startDate: new Date("2024-01-01"), endDate: new Date("2024-12-31") },
        "json",
      );

      expect(result.mimeType).toBe("application/json");
      expect(result.filename).toMatch(/^audit-logs-\d{4}-\d{2}-\d{2}\.json$/);

      const jsonData = result.data as Record<string, unknown>;
      expect(jsonData.totalRecords).toBe(1);
      expect(jsonData.exportedAt).toBeDefined();
      expect(jsonData.period).toBeDefined();
      expect((jsonData.logs as unknown[]).length).toBe(1);
    });

    it("includes proper date string in filename", async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      const result = await exportAuditLogsEnhanced("user-1", {}, "csv");

      // Filename should contain today's date
      const today = new Date().toISOString().split("T")[0];
      expect(result.filename).toBe(`audit-logs-${today}.csv`);
    });
  });

  // ─── generateComplianceCertificateData ────────────────────────────────────

  describe("generateComplianceCertificateData", () => {
    it("reports all modules as compliant when scores are 100", async () => {
      mockPrisma.authorizationWorkflow.findMany.mockResolvedValue([
        { status: "APPROVED", updatedAt: new Date("2024-06-01") },
      ]);
      mockPrisma.debrisAssessment.findMany.mockResolvedValue([
        { complianceScore: 100, updatedAt: new Date("2024-06-02") },
      ]);
      mockPrisma.cybersecurityAssessment.findMany.mockResolvedValue([
        { maturityScore: 100, updatedAt: new Date("2024-06-03") },
      ]);
      mockPrisma.insuranceAssessment.findMany.mockResolvedValue([
        { complianceScore: 100, updatedAt: new Date("2024-06-04") },
      ]);
      mockPrisma.environmentalAssessment.findMany.mockResolvedValue([
        { complianceScore: 100, updatedAt: new Date("2024-06-05") },
      ]);

      const result = await generateComplianceCertificateData(
        "user-1",
        "Space Corp",
      );

      expect(result.organizationName).toBe("Space Corp");
      expect(result.complianceScore).toBe(100);
      expect(result.modules).toHaveLength(5);
      result.modules.forEach((m) => {
        expect(m.status).toBe("compliant");
        expect(m.score).toBeGreaterThanOrEqual(80);
      });

      // All attestations should be present
      expect(result.attestations).toContain(
        "Organization demonstrates comprehensive compliance with EU Space Act requirements",
      );
      expect(result.attestations).toContain(
        "Space activities are properly authorized under applicable national authority",
      );
      expect(result.attestations).toContain(
        "Debris mitigation plan meets regulatory standards",
      );
      expect(result.attestations).toContain(
        "Cybersecurity measures align with NIS2 requirements",
      );
      expect(result.attestations).toContain(
        "Third-party liability insurance coverage is adequate",
      );
      expect(result.attestations).toContain(
        "Environmental Footprint Declaration is complete",
      );
    });

    it("handles mixed compliance statuses", async () => {
      mockPrisma.authorizationWorkflow.findMany.mockResolvedValue([
        { status: "SUBMITTED", updatedAt: new Date("2024-06-01") },
      ]);
      mockPrisma.debrisAssessment.findMany.mockResolvedValue([
        { complianceScore: 60, updatedAt: new Date("2024-06-02") },
      ]);
      mockPrisma.cybersecurityAssessment.findMany.mockResolvedValue([
        { maturityScore: 90, updatedAt: new Date("2024-06-03") },
      ]);
      mockPrisma.insuranceAssessment.findMany.mockResolvedValue([
        { complianceScore: 30, updatedAt: new Date("2024-06-04") },
      ]);
      mockPrisma.environmentalAssessment.findMany.mockResolvedValue([
        { complianceScore: 85, updatedAt: new Date("2024-06-05") },
      ]);

      const result = await generateComplianceCertificateData(
        "user-1",
        "Mixed Corp",
      );

      const auth = result.modules.find(
        (m) => m.name === "Authorization & Registration",
      )!;
      expect(auth.status).toBe("partially_compliant");
      expect(auth.score).toBe(60);

      const debris = result.modules.find(
        (m) => m.name === "Debris Mitigation",
      )!;
      expect(debris.status).toBe("partially_compliant");

      const cyber = result.modules.find(
        (m) => m.name === "Cybersecurity & Resilience",
      )!;
      expect(cyber.status).toBe("compliant");

      const insurance = result.modules.find(
        (m) => m.name === "Insurance Coverage",
      )!;
      expect(insurance.status).toBe("non_compliant");

      const env = result.modules.find(
        (m) => m.name === "Environmental Footprint",
      )!;
      expect(env.status).toBe("compliant");
    });

    it("reports all modules as non_compliant when no data exists", async () => {
      mockPrisma.authorizationWorkflow.findMany.mockResolvedValue([]);
      mockPrisma.debrisAssessment.findMany.mockResolvedValue([]);
      mockPrisma.cybersecurityAssessment.findMany.mockResolvedValue([]);
      mockPrisma.insuranceAssessment.findMany.mockResolvedValue([]);
      mockPrisma.environmentalAssessment.findMany.mockResolvedValue([]);

      const result = await generateComplianceCertificateData(
        "user-1",
        "Empty Corp",
      );

      expect(result.complianceScore).toBe(0);
      result.modules.forEach((m) => {
        expect(m.status).toBe("non_compliant");
        expect(m.score).toBe(0);
      });

      // Even when all non-compliant, authorization status attestation is always included
      expect(result.attestations).toHaveLength(1);
      expect(result.attestations[0]).toContain("PENDING");
    });

    it("generates attestations based on compliance status", async () => {
      // Only cybersecurity and authorization are compliant
      mockPrisma.authorizationWorkflow.findMany.mockResolvedValue([
        { status: "APPROVED", updatedAt: new Date() },
      ]);
      mockPrisma.debrisAssessment.findMany.mockResolvedValue([
        { complianceScore: 40, updatedAt: new Date() },
      ]);
      mockPrisma.cybersecurityAssessment.findMany.mockResolvedValue([
        { maturityScore: 95, updatedAt: new Date() },
      ]);
      mockPrisma.insuranceAssessment.findMany.mockResolvedValue([
        { complianceScore: 30, updatedAt: new Date() },
      ]);
      mockPrisma.environmentalAssessment.findMany.mockResolvedValue([
        { complianceScore: 20, updatedAt: new Date() },
      ]);

      const result = await generateComplianceCertificateData(
        "user-1",
        "Partial Corp",
      );

      expect(result.attestations).toContain(
        "Space activities are properly authorized under applicable national authority",
      );
      expect(result.attestations).toContain(
        "Cybersecurity measures align with NIS2 requirements",
      );
      expect(result.attestations).not.toContain(
        "Debris mitigation plan meets regulatory standards",
      );
      expect(result.attestations).not.toContain(
        "Third-party liability insurance coverage is adequate",
      );

      expect(result.certificateNumber).toMatch(/^CAELEX-CERT-/);
      expect(result.issuedAt).toBeInstanceOf(Date);
      expect(result.validUntil).toBeInstanceOf(Date);
      expect(result.validUntil.getTime()).toBeGreaterThan(
        result.issuedAt.getTime(),
      );
    });
  });

  // ─── getAuditFilterOptions ────────────────────────────────────────────────

  describe("getAuditFilterOptions", () => {
    it("returns distinct actions, entityTypes, and date range", async () => {
      mockPrisma.auditLog.findMany
        .mockResolvedValueOnce([
          { action: "CREATE" },
          { action: "UPDATE" },
          { action: "DELETE" },
        ])
        .mockResolvedValueOnce([
          { entityType: "Document" },
          { entityType: "Assessment" },
        ]);
      mockPrisma.auditLog.aggregate.mockResolvedValue({
        _min: { timestamp: new Date("2024-01-01") },
        _max: { timestamp: new Date("2024-12-31") },
      });

      const result = await getAuditFilterOptions("user-1");

      expect(result.actions).toEqual(["CREATE", "UPDATE", "DELETE"]);
      expect(result.entityTypes).toEqual(["Document", "Assessment"]);
      expect(result.dateRange.earliest).toEqual(new Date("2024-01-01"));
      expect(result.dateRange.latest).toEqual(new Date("2024-12-31"));
    });
  });

  // ─── searchAuditLogs ──────────────────────────────────────────────────────

  describe("searchAuditLogs", () => {
    it("builds OR conditions from search terms", async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await searchAuditLogs("user-1", "create document");

      const call = mockPrisma.auditLog.findMany.mock.calls[0][0];
      expect(call.where.userId).toBe("user-1");
      expect(call.where.OR).toBeDefined();

      // Each search term generates 4 conditions (action, entityType, entityId, description)
      // "create" + "document" = 2 terms * 4 = 8 conditions
      expect(call.where.OR).toHaveLength(8);
    });

    it("applies pagination options", async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(100);

      const result = await searchAuditLogs("user-1", "test", {
        limit: 20,
        offset: 40,
      });

      const call = mockPrisma.auditLog.findMany.mock.calls[0][0];
      expect(call.take).toBe(20);
      expect(call.skip).toBe(40);
      expect(result.total).toBe(100);
    });

    it("uses default limit=50 and offset=0 when not provided", async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await searchAuditLogs("user-1", "test");

      const call = mockPrisma.auditLog.findMany.mock.calls[0][0];
      expect(call.take).toBe(50);
      expect(call.skip).toBe(0);
    });
  });
});
