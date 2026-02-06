import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next-auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    articleStatus: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

// Mock audit
vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn(),
  getRequestContext: vi.fn().mockReturnValue({
    ipAddress: "127.0.0.1",
    userAgent: "test-agent",
  }),
  generateAuditDescription: vi.fn().mockReturnValue("Test audit description"),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { GET, PUT } from "@/app/api/tracker/articles/route";

const mockSession = {
  user: {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
  },
};

const mockArticleStatus = {
  id: "status-1",
  userId: "test-user-id",
  articleId: "art-6",
  status: "in_progress",
  notes: "Working on authorization",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-15"),
};

describe("Tracker Articles API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── GET /api/tracker/articles ───────────────────────────────────────────────

  describe("GET /api/tracker/articles", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return article status map for authenticated user", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.articleStatus.findMany).mockResolvedValue([
        mockArticleStatus as any,
      ]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data["art-6"]).toBeDefined();
      expect(data["art-6"].status).toBe("in_progress");
      expect(data["art-6"].notes).toBe("Working on authorization");
      expect(data["art-6"].updatedAt).toBeDefined();
    });

    it("should return empty object when no statuses exist", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.articleStatus.findMany).mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({});
    });

    it("should transform array to status map correctly with multiple articles", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);

      const multipleStatuses = [
        {
          id: "status-1",
          userId: "test-user-id",
          articleId: "art-6",
          status: "completed",
          notes: "Done",
          createdAt: new Date("2025-01-01"),
          updatedAt: new Date("2025-01-10"),
        },
        {
          id: "status-2",
          userId: "test-user-id",
          articleId: "art-14",
          status: "in_progress",
          notes: null,
          createdAt: new Date("2025-01-05"),
          updatedAt: new Date("2025-01-12"),
        },
        {
          id: "status-3",
          userId: "test-user-id",
          articleId: "art-55",
          status: "not_started",
          notes: "Need to review debris requirements",
          createdAt: new Date("2025-01-08"),
          updatedAt: new Date("2025-01-08"),
        },
      ];

      vi.mocked(prisma.articleStatus.findMany).mockResolvedValue(
        multipleStatuses as any,
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Object.keys(data)).toHaveLength(3);

      expect(data["art-6"].status).toBe("completed");
      expect(data["art-6"].notes).toBe("Done");

      expect(data["art-14"].status).toBe("in_progress");
      expect(data["art-14"].notes).toBeNull();

      expect(data["art-55"].status).toBe("not_started");
      expect(data["art-55"].notes).toBe("Need to review debris requirements");

      // Verify query was scoped to the authenticated user
      expect(prisma.articleStatus.findMany).toHaveBeenCalledWith({
        where: { userId: "test-user-id" },
      });
    });
  });

  // ─── PUT /api/tracker/articles ───────────────────────────────────────────────

  describe("PUT /api/tracker/articles", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new Request("http://localhost/api/tracker/articles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: "art-6",
          status: "in_progress",
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when articleId is missing", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);

      const request = new Request("http://localhost/api/tracker/articles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing articleId or status");
    });

    it("should return 400 when status is missing", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);

      const request = new Request("http://localhost/api/tracker/articles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: "art-6" }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing articleId or status");
    });

    it("should create new article status (upsert create path)", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      // No previous record exists
      vi.mocked(prisma.articleStatus.findUnique).mockResolvedValue(null);

      const createdRecord = {
        id: "new-status-1",
        userId: "test-user-id",
        articleId: "art-10",
        status: "in_progress",
        notes: "Starting review",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(prisma.articleStatus.upsert).mockResolvedValue(
        createdRecord as any,
      );

      const request = new Request("http://localhost/api/tracker/articles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: "art-10",
          status: "in_progress",
          notes: "Starting review",
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.articleId).toBe("art-10");
      expect(data.status).toBe("in_progress");

      expect(prisma.articleStatus.upsert).toHaveBeenCalledWith({
        where: {
          userId_articleId: {
            userId: "test-user-id",
            articleId: "art-10",
          },
        },
        update: {
          status: "in_progress",
          notes: "Starting review",
        },
        create: {
          userId: "test-user-id",
          articleId: "art-10",
          status: "in_progress",
          notes: "Starting review",
        },
      });
    });

    it("should update existing article status (upsert update path)", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);

      const previousRecord = {
        id: "status-1",
        userId: "test-user-id",
        articleId: "art-6",
        status: "in_progress",
        notes: "Working on it",
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-10"),
      };
      vi.mocked(prisma.articleStatus.findUnique).mockResolvedValue(
        previousRecord as any,
      );

      const updatedRecord = {
        ...previousRecord,
        status: "completed",
        notes: "All done",
        updatedAt: new Date(),
      };
      vi.mocked(prisma.articleStatus.upsert).mockResolvedValue(
        updatedRecord as any,
      );

      const request = new Request("http://localhost/api/tracker/articles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: "art-6",
          status: "completed",
          notes: "All done",
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("completed");

      expect(prisma.articleStatus.upsert).toHaveBeenCalledWith({
        where: {
          userId_articleId: {
            userId: "test-user-id",
            articleId: "art-6",
          },
        },
        update: {
          status: "completed",
          notes: "All done",
        },
        create: {
          userId: "test-user-id",
          articleId: "art-6",
          status: "completed",
          notes: "All done",
        },
      });
    });

    it("should log audit event when status changes", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);

      const previousRecord = {
        id: "status-1",
        userId: "test-user-id",
        articleId: "art-6",
        status: "in_progress",
        notes: "Working on it",
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-10"),
      };
      vi.mocked(prisma.articleStatus.findUnique).mockResolvedValue(
        previousRecord as any,
      );

      vi.mocked(prisma.articleStatus.upsert).mockResolvedValue({
        ...previousRecord,
        status: "completed",
        updatedAt: new Date(),
      } as any);

      const request = new Request("http://localhost/api/tracker/articles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: "art-6",
          status: "completed",
          notes: "Done",
        }),
      });

      await PUT(request);

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "test-user-id",
          action: "article_status_changed",
          entityType: "article",
          entityId: "art-6",
          previousValue: { status: "in_progress", notes: "Working on it" },
          newValue: { status: "completed", notes: "Done" },
        }),
      );
    });

    it("should log audit event when creating new status (no previous record)", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.articleStatus.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.articleStatus.upsert).mockResolvedValue({
        id: "new-status",
        userId: "test-user-id",
        articleId: "art-20",
        status: "in_progress",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const request = new Request("http://localhost/api/tracker/articles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: "art-20",
          status: "in_progress",
        }),
      });

      await PUT(request);

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "test-user-id",
          action: "article_status_changed",
          entityType: "article",
          entityId: "art-20",
          previousValue: null,
          newValue: { status: "in_progress", notes: undefined },
        }),
      );
    });

    it("should not log audit event when status is unchanged", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);

      const previousRecord = {
        id: "status-1",
        userId: "test-user-id",
        articleId: "art-6",
        status: "in_progress",
        notes: "Working on it",
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-10"),
      };
      vi.mocked(prisma.articleStatus.findUnique).mockResolvedValue(
        previousRecord as any,
      );

      vi.mocked(prisma.articleStatus.upsert).mockResolvedValue({
        ...previousRecord,
        notes: "Updated notes only",
        updatedAt: new Date(),
      } as any);

      const request = new Request("http://localhost/api/tracker/articles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: "art-6",
          status: "in_progress",
          notes: "Updated notes only",
        }),
      });

      await PUT(request);

      expect(logAuditEvent).not.toHaveBeenCalled();
    });

    it("should handle notes field correctly", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.articleStatus.findUnique).mockResolvedValue(null);

      // When notes is provided
      const withNotesRecord = {
        id: "status-notes",
        userId: "test-user-id",
        articleId: "art-7",
        status: "in_progress",
        notes: "Important note",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(prisma.articleStatus.upsert).mockResolvedValue(
        withNotesRecord as any,
      );

      const requestWithNotes = new Request(
        "http://localhost/api/tracker/articles",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            articleId: "art-7",
            status: "in_progress",
            notes: "Important note",
          }),
        },
      );

      await PUT(requestWithNotes);

      expect(prisma.articleStatus.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            notes: "Important note",
          }),
          update: expect.objectContaining({
            notes: "Important note",
          }),
        }),
      );

      vi.clearAllMocks();
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.articleStatus.findUnique).mockResolvedValue(null);

      // When notes is not provided (undefined), update should use undefined (no change)
      const withoutNotesRecord = {
        id: "status-no-notes",
        userId: "test-user-id",
        articleId: "art-8",
        status: "completed",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(prisma.articleStatus.upsert).mockResolvedValue(
        withoutNotesRecord as any,
      );

      const requestWithoutNotes = new Request(
        "http://localhost/api/tracker/articles",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            articleId: "art-8",
            status: "completed",
          }),
        },
      );

      await PUT(requestWithoutNotes);

      // notes ?? undefined means when notes is undefined, update gets undefined (skipped by Prisma)
      expect(prisma.articleStatus.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            notes: undefined,
          }),
        }),
      );
    });

    it("should return 500 on database error", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.articleStatus.findUnique).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = new Request("http://localhost/api/tracker/articles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: "art-6",
          status: "completed",
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });
});
