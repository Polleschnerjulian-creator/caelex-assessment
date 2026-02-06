import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next-auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    supervisionConfig: {
      findUnique: vi.fn(),
    },
    incident: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    supervisionCalendarEvent: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

// Mock incident-response-service
vi.mock("@/lib/services/incident-response-service", () => ({
  INCIDENT_CLASSIFICATION: {
    cyber_attack: {
      ncaDeadlineHours: 24,
      requiresNCANotification: true,
      articleRef: "Art. 85",
    },
    anomaly: {
      ncaDeadlineHours: 72,
      requiresNCANotification: true,
      articleRef: "Art. 86",
    },
    collision_risk: {
      ncaDeadlineHours: 24,
      requiresNCANotification: true,
      articleRef: "Art. 87",
    },
  },
  calculateSeverity: vi.fn(),
  calculateNCADeadline: vi.fn(),
  generateIncidentNumber: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  INCIDENT_CLASSIFICATION,
  calculateSeverity,
  calculateNCADeadline,
  generateIncidentNumber,
} from "@/lib/services/incident-response-service";
import { GET, POST } from "@/app/api/supervision/incidents/route";

const mockSession = {
  user: {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
  },
};

const mockConfig = {
  id: "config-1",
  userId: "test-user-id",
  ncaName: "BNetzA",
  ncaCountry: "DE",
};

const mockIncident = {
  id: "incident-1",
  supervisionId: "config-1",
  incidentNumber: "INC-2026-001",
  category: "cyber_attack",
  severity: "high",
  status: "detected",
  title: "Unauthorized access detected",
  description: "Anomalous login attempts on ground segment",
  detectedAt: new Date("2026-01-15T10:00:00Z"),
  detectedBy: "SOC Team",
  detectionMethod: "automated",
  immediateActions: [],
  impactAssessment: null,
  requiresNCANotification: true,
  reportedToNCA: false,
  affectedAssets: [
    {
      id: "asset-1",
      cosparId: "2025-001A",
      noradId: "55001",
      assetName: "SAT-1",
    },
  ],
  attachments: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockNcaDeadline = new Date("2026-01-16T10:00:00Z");

function makeGetRequest(queryString = ""): Request {
  return new Request(
    `http://localhost/api/supervision/incidents${queryString ? `?${queryString}` : ""}`,
  );
}

function makePostRequest(body: unknown): Request {
  return new Request("http://localhost/api/supervision/incidents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validIncidentPayload = {
  category: "cyber_attack",
  title: "Unauthorized access detected",
  description: "Anomalous login attempts on ground segment",
  detectedAt: "2026-01-15T10:00:00Z",
  detectedBy: "SOC Team",
  affectedAssets: [
    { cosparId: "2025-001A", noradId: "55001", assetName: "SAT-1" },
  ],
};

describe("Supervision Incidents API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(calculateNCADeadline).mockReturnValue(mockNcaDeadline);
    vi.mocked(generateIncidentNumber).mockResolvedValue("INC-2026-001");
    vi.mocked(calculateSeverity).mockReturnValue("high" as any);
  });

  // ─── GET /api/supervision/incidents ───

  describe("GET /api/supervision/incidents", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = makeGetRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return empty incidents when no supervision config", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(null);

      const request = makeGetRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.incidents).toEqual([]);
      expect(data.total).toBe(0);
    });

    it("should return incidents for authenticated user", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(
        mockConfig as any,
      );
      vi.mocked(prisma.incident.findMany).mockResolvedValue([
        mockIncident as any,
      ]);
      vi.mocked(prisma.incident.count).mockResolvedValue(1);

      const request = makeGetRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.incidents).toHaveLength(1);
      expect(data.total).toBe(1);
      expect(data.incidents[0].incidentNumber).toBe("INC-2026-001");
    });

    it("should filter by category query param", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(
        mockConfig as any,
      );
      vi.mocked(prisma.incident.findMany).mockResolvedValue([]);
      vi.mocked(prisma.incident.count).mockResolvedValue(0);

      const request = makeGetRequest("category=cyber_attack");
      await GET(request);

      expect(prisma.incident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            supervisionId: "config-1",
            category: "cyber_attack",
          }),
        }),
      );
    });

    it("should support pagination with limit and offset", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(
        mockConfig as any,
      );
      vi.mocked(prisma.incident.findMany).mockResolvedValue([]);
      vi.mocked(prisma.incident.count).mockResolvedValue(100);

      const request = makeGetRequest("limit=10&offset=20");
      await GET(request);

      expect(prisma.incident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      );
    });

    it("should add computed ncaDeadline and isOverdue fields", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(
        mockConfig as any,
      );
      vi.mocked(prisma.incident.findMany).mockResolvedValue([
        mockIncident as any,
      ]);
      vi.mocked(prisma.incident.count).mockResolvedValue(1);
      // Return a deadline in the past so isOverdue = true
      const pastDeadline = new Date("2025-01-01T00:00:00Z");
      vi.mocked(calculateNCADeadline).mockReturnValue(pastDeadline);

      const request = makeGetRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.incidents[0].ncaDeadline).toBeDefined();
      expect(data.incidents[0].isOverdue).toBe(true);
      expect(data.incidents[0].ncaDeadlineHours).toBe(24);
    });
  });

  // ─── POST /api/supervision/incidents ───

  describe("POST /api/supervision/incidents", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = makePostRequest(validIncidentPayload);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when supervision not configured", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(null);

      const request = makePostRequest(validIncidentPayload);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Supervision not configured");
    });

    it("should return 400 when required fields are missing", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(
        mockConfig as any,
      );

      const request = makePostRequest({
        category: "cyber_attack",
        title: "Incomplete incident",
        // Missing: description, detectedAt, detectedBy
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required fields");
    });

    it("should return 400 for invalid category", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(
        mockConfig as any,
      );

      const request = makePostRequest({
        ...validIncidentPayload,
        category: "invalid_category",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid category");
    });

    it("should create incident with valid data", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(
        mockConfig as any,
      );
      vi.mocked(prisma.incident.create).mockResolvedValue(mockIncident as any);
      vi.mocked(prisma.supervisionCalendarEvent.create).mockResolvedValue(
        {} as any,
      );
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

      const request = makePostRequest({
        ...validIncidentPayload,
        severity: "high",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.incident).toBeDefined();
      expect(data.incident.incidentNumber).toBe("INC-2026-001");
      expect(data.classification).toBeDefined();
      expect(data.classification.requiresNCANotification).toBe(true);

      expect(prisma.incident.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            supervisionId: "config-1",
            incidentNumber: "INC-2026-001",
            category: "cyber_attack",
            severity: "high",
            status: "detected",
            title: validIncidentPayload.title,
            description: validIncidentPayload.description,
            requiresNCANotification: true,
          }),
        }),
      );
    });

    it("should auto-calculate severity when not provided", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(
        mockConfig as any,
      );
      vi.mocked(calculateSeverity).mockReturnValue("critical" as any);
      vi.mocked(prisma.incident.create).mockResolvedValue({
        ...mockIncident,
        severity: "critical",
      } as any);
      vi.mocked(prisma.supervisionCalendarEvent.create).mockResolvedValue(
        {} as any,
      );
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

      const request = makePostRequest(validIncidentPayload); // no severity field
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(calculateSeverity).toHaveBeenCalled();
      expect(data.incident.autoClassified).toBe(true);

      expect(prisma.incident.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            severity: "critical",
          }),
        }),
      );
    });

    it("should create calendar event for NCA deadline when notification required", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(
        mockConfig as any,
      );
      vi.mocked(prisma.incident.create).mockResolvedValue(mockIncident as any);
      vi.mocked(prisma.supervisionCalendarEvent.create).mockResolvedValue(
        {} as any,
      );
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

      const request = makePostRequest({
        ...validIncidentPayload,
        severity: "high",
      });
      await POST(request);

      expect(prisma.supervisionCalendarEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          supervisionId: "config-1",
          eventType: "regulatory_deadline",
          title: expect.stringContaining("NCA Notification Deadline"),
          dueDate: mockNcaDeadline,
          status: "pending",
        }),
      });
    });

    it("should log audit event on creation", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(
        mockConfig as any,
      );
      vi.mocked(prisma.incident.create).mockResolvedValue(mockIncident as any);
      vi.mocked(prisma.supervisionCalendarEvent.create).mockResolvedValue(
        {} as any,
      );
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

      const request = makePostRequest({
        ...validIncidentPayload,
        severity: "high",
      });
      await POST(request);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "test-user-id",
          action: "incident_created",
          entityType: "incident",
          entityId: "incident-1",
          description: expect.stringContaining("INC-2026-001"),
        }),
      });
    });

    it("should return 500 on database error", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(
        mockConfig as any,
      );
      vi.mocked(prisma.incident.create).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = makePostRequest({
        ...validIncidentPayload,
        severity: "high",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to create incident");
    });
  });
});
