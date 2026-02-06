import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next-auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    deadline: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/timeline/deadlines/route";

const mockSession = {
  user: {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
  },
};

const mockDeadline = {
  id: "deadline-1",
  userId: "test-user-id",
  title: "Submit Authorization Application",
  description: "File authorization with national authority",
  dueDate: new Date("2030-01-01"),
  category: "AUTHORIZATION",
  priority: "HIGH",
  status: "UPCOMING",
  moduleSource: "AUTHORIZATION",
  relatedEntityId: null,
  reminderDays: [30, 14, 7, 3, 1],
  isRecurring: false,
  recurrenceRule: null,
  assignedTo: null,
  assignedTeam: null,
  regulatoryRef: "Art. 6",
  penaltyInfo: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Timeline Deadlines API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/timeline/deadlines", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new Request("http://localhost/api/timeline/deadlines");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return deadlines for authenticated user", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.deadline.findMany).mockResolvedValue([
        mockDeadline as any,
      ]);
      vi.mocked(prisma.deadline.count).mockResolvedValue(1);
      vi.mocked(prisma.deadline.updateMany).mockResolvedValue({ count: 0 });

      const request = new Request("http://localhost/api/timeline/deadlines");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.deadlines).toBeDefined();
      expect(data.total).toBe(1);
    });

    it("should filter by status=active (notIn COMPLETED, CANCELLED)", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.deadline.findMany).mockResolvedValue([]);
      vi.mocked(prisma.deadline.count).mockResolvedValue(0);

      const request = new Request(
        "http://localhost/api/timeline/deadlines?status=active",
      );
      await GET(request);

      expect(prisma.deadline.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { notIn: ["COMPLETED", "CANCELLED"] },
          }),
        }),
      );
    });

    it("should filter by category", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.deadline.findMany).mockResolvedValue([]);
      vi.mocked(prisma.deadline.count).mockResolvedValue(0);

      const request = new Request(
        "http://localhost/api/timeline/deadlines?category=AUTHORIZATION",
      );
      await GET(request);

      expect(prisma.deadline.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: "AUTHORIZATION",
          }),
        }),
      );
    });

    it("should filter by date range (from, to)", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.deadline.findMany).mockResolvedValue([]);
      vi.mocked(prisma.deadline.count).mockResolvedValue(0);

      const request = new Request(
        "http://localhost/api/timeline/deadlines?from=2029-01-01&to=2031-01-01",
      );
      await GET(request);

      expect(prisma.deadline.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        }),
      );
    });

    it("should support pagination", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.deadline.findMany).mockResolvedValue([]);
      vi.mocked(prisma.deadline.count).mockResolvedValue(100);

      const request = new Request(
        "http://localhost/api/timeline/deadlines?limit=10&offset=20",
      );
      await GET(request);

      expect(prisma.deadline.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      );
    });

    it("should update overdue deadlines automatically", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const overdueDeadline = {
        ...mockDeadline,
        id: "overdue-deadline",
        dueDate: pastDate,
        status: "UPCOMING",
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.deadline.findMany).mockResolvedValue([
        overdueDeadline as any,
      ]);
      vi.mocked(prisma.deadline.count).mockResolvedValue(1);
      vi.mocked(prisma.deadline.updateMany).mockResolvedValue({ count: 1 });

      const request = new Request("http://localhost/api/timeline/deadlines");
      await GET(request);

      expect(prisma.deadline.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["overdue-deadline"] } },
        data: { status: "OVERDUE" },
      });
    });

    it("should return 500 on database error", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.deadline.findMany).mockRejectedValue(
        new Error("Database error"),
      );

      const request = new Request("http://localhost/api/timeline/deadlines");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch deadlines");
    });
  });

  describe("POST /api/timeline/deadlines", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new Request("http://localhost/api/timeline/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Test Deadline",
          dueDate: "2030-01-01",
          category: "AUTHORIZATION",
          priority: "HIGH",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when required fields missing", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);

      const request = new Request("http://localhost/api/timeline/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Test Deadline",
          // Missing dueDate, category, priority
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required fields");
    });

    it("should create deadline with valid data", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.deadline.create).mockResolvedValue(mockDeadline as any);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

      const request = new Request("http://localhost/api/timeline/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Submit Authorization Application",
          description: "File authorization with national authority",
          dueDate: "2030-01-01",
          category: "AUTHORIZATION",
          priority: "HIGH",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deadline).toBeDefined();
    });

    it("should set status to OVERDUE for past dates", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.deadline.create).mockResolvedValue({
        ...mockDeadline,
        status: "OVERDUE",
      } as any);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);

      const request = new Request("http://localhost/api/timeline/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Past Deadline",
          dueDate: pastDate.toISOString(),
          category: "AUTHORIZATION",
          priority: "HIGH",
        }),
      });

      await POST(request);

      expect(prisma.deadline.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: "OVERDUE",
        }),
      });
    });

    it("should set status to DUE_SOON for dates within 7 days", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.deadline.create).mockResolvedValue({
        ...mockDeadline,
        status: "DUE_SOON",
      } as any);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 3);

      const request = new Request("http://localhost/api/timeline/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Soon Deadline",
          dueDate: soonDate.toISOString(),
          category: "AUTHORIZATION",
          priority: "MEDIUM",
        }),
      });

      await POST(request);

      expect(prisma.deadline.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: "DUE_SOON",
        }),
      });
    });

    it("should set status to UPCOMING for future dates", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.deadline.create).mockResolvedValue(mockDeadline as any);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 60);

      const request = new Request("http://localhost/api/timeline/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Future Deadline",
          dueDate: futureDate.toISOString(),
          category: "CYBERSECURITY",
          priority: "LOW",
        }),
      });

      await POST(request);

      expect(prisma.deadline.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: "UPCOMING",
        }),
      });
    });

    it("should use default reminderDays [30, 14, 7, 3, 1]", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.deadline.create).mockResolvedValue(mockDeadline as any);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

      const request = new Request("http://localhost/api/timeline/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Deadline Without Reminders",
          dueDate: "2030-06-01",
          category: "DEBRIS",
          priority: "HIGH",
          // No reminderDays provided
        }),
      });

      await POST(request);

      expect(prisma.deadline.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reminderDays: [30, 14, 7, 3, 1],
        }),
      });
    });

    it("should log audit event on creation", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.deadline.create).mockResolvedValue(mockDeadline as any);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

      const request = new Request("http://localhost/api/timeline/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Audit Test Deadline",
          dueDate: "2030-01-01",
          category: "AUTHORIZATION",
          priority: "HIGH",
        }),
      });

      await POST(request);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "test-user-id",
          action: "deadline_created",
          entityType: "deadline",
          entityId: mockDeadline.id,
          description: expect.stringContaining("Audit Test Deadline"),
        }),
      });
    });

    it("should return 500 on database error", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.deadline.create).mockRejectedValue(
        new Error("Database error"),
      );

      const request = new Request("http://localhost/api/timeline/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Error Deadline",
          dueDate: "2030-01-01",
          category: "AUTHORIZATION",
          priority: "HIGH",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to create deadline");
    });
  });
});
