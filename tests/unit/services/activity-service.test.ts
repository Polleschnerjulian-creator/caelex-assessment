import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    activity: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  createActivity,
  getActivities,
  getEntityActivities,
  getUserActivities,
  groupActivitiesByDate,
  getActivityStats,
} from "@/lib/services/activity-service";

describe("Activity Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════
  // createActivity
  // ═══════════════════════════════════════════════

  describe("createActivity", () => {
    it("should create an activity entry", async () => {
      const mockActivity = {
        id: "act-1",
        organizationId: "org-1",
        userId: "user-1",
        action: "created",
        entityType: "spacecraft",
        entityId: "sc-1",
        entityName: "Sentinel-1",
        description: "Created spacecraft Sentinel-1",
      };

      vi.mocked(prisma.activity.create).mockResolvedValue(mockActivity as any);

      const result = await createActivity({
        organizationId: "org-1",
        userId: "user-1",
        action: "created",
        entityType: "spacecraft",
        entityId: "sc-1",
        entityName: "Sentinel-1",
        description: "Created spacecraft Sentinel-1",
      });

      expect(result.id).toBe("act-1");
      expect(prisma.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: "org-1",
            userId: "user-1",
            action: "created",
            entityType: "spacecraft",
            entityId: "sc-1",
          }),
        }),
      );
    });

    it("should create activity without optional fields", async () => {
      vi.mocked(prisma.activity.create).mockResolvedValue({
        id: "act-2",
      } as any);

      await createActivity({
        organizationId: "org-1",
        action: "deleted",
        entityType: "document",
        entityId: "doc-1",
      });

      expect(prisma.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: "org-1",
            action: "deleted",
            entityType: "document",
            entityId: "doc-1",
            userId: undefined,
            entityName: undefined,
            description: undefined,
          }),
        }),
      );
    });

    it("should pass metadata when provided", async () => {
      vi.mocked(prisma.activity.create).mockResolvedValue({
        id: "act-3",
      } as any);

      await createActivity({
        organizationId: "org-1",
        action: "updated",
        entityType: "spacecraft",
        entityId: "sc-1",
        metadata: {
          field: "status",
          oldValue: "active",
          newValue: "decommissioned",
        },
      });

      expect(prisma.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: {
              field: "status",
              oldValue: "active",
              newValue: "decommissioned",
            },
          }),
        }),
      );
    });

    it("should pass changes when provided", async () => {
      vi.mocked(prisma.activity.create).mockResolvedValue({
        id: "act-4",
      } as any);

      await createActivity({
        organizationId: "org-1",
        action: "updated",
        entityType: "document",
        entityId: "doc-1",
        changes: { name: { old: "Old Name", new: "New Name" } },
      });

      expect(prisma.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            changes: { name: { old: "Old Name", new: "New Name" } },
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════
  // getActivities
  // ═══════════════════════════════════════════════

  describe("getActivities", () => {
    it("should return paginated activities for an organization", async () => {
      const mockActivities = [
        { id: "act-1", action: "created" },
        { id: "act-2", action: "updated" },
      ];
      vi.mocked(prisma.activity.findMany).mockResolvedValue(
        mockActivities as any,
      );
      vi.mocked(prisma.activity.count).mockResolvedValue(2);

      const result = await getActivities("org-1");

      expect(result.activities).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.totalPages).toBe(1);
    });

    it("should apply userId filter", async () => {
      vi.mocked(prisma.activity.findMany).mockResolvedValue([]);
      vi.mocked(prisma.activity.count).mockResolvedValue(0);

      await getActivities("org-1", { userId: "user-1" });

      expect(prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org-1",
            userId: "user-1",
          }),
        }),
      );
    });

    it("should apply entityType filter", async () => {
      vi.mocked(prisma.activity.findMany).mockResolvedValue([]);
      vi.mocked(prisma.activity.count).mockResolvedValue(0);

      await getActivities("org-1", { entityType: "spacecraft" });

      expect(prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: "spacecraft",
          }),
        }),
      );
    });

    it("should apply actions filter", async () => {
      vi.mocked(prisma.activity.findMany).mockResolvedValue([]);
      vi.mocked(prisma.activity.count).mockResolvedValue(0);

      await getActivities("org-1", { actions: ["created", "deleted"] });

      expect(prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: { in: ["created", "deleted"] },
          }),
        }),
      );
    });

    it("should apply date range filter", async () => {
      vi.mocked(prisma.activity.findMany).mockResolvedValue([]);
      vi.mocked(prisma.activity.count).mockResolvedValue(0);

      const fromDate = new Date("2025-01-01");
      await getActivities("org-1", { fromDate });

      expect(prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: fromDate },
          }),
        }),
      );
    });

    it("should paginate correctly", async () => {
      vi.mocked(prisma.activity.findMany).mockResolvedValue([]);
      vi.mocked(prisma.activity.count).mockResolvedValue(200);

      const result = await getActivities("org-1", {}, { page: 5, limit: 20 });

      expect(result.page).toBe(5);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(10);
      expect(prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 80,
          take: 20,
        }),
      );
    });

    it("should not apply empty actions filter", async () => {
      vi.mocked(prisma.activity.findMany).mockResolvedValue([]);
      vi.mocked(prisma.activity.count).mockResolvedValue(0);

      await getActivities("org-1", { actions: [] });

      const call = vi.mocked(prisma.activity.findMany).mock.calls[0][0];
      expect(call?.where).not.toHaveProperty("action");
    });
  });

  // ═══════════════════════════════════════════════
  // getEntityActivities
  // ═══════════════════════════════════════════════

  describe("getEntityActivities", () => {
    it("should return activities for a specific entity", async () => {
      vi.mocked(prisma.activity.findMany).mockResolvedValue([
        { id: "act-1" },
      ] as any);
      vi.mocked(prisma.activity.count).mockResolvedValue(1);

      const result = await getEntityActivities("spacecraft", "sc-1");

      expect(result.activities).toHaveLength(1);
      expect(prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { entityType: "spacecraft", entityId: "sc-1" },
        }),
      );
    });

    it("should paginate entity activities", async () => {
      vi.mocked(prisma.activity.findMany).mockResolvedValue([]);
      vi.mocked(prisma.activity.count).mockResolvedValue(50);

      const result = await getEntityActivities("document", "doc-1", {
        page: 2,
        limit: 10,
      });

      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(5);
    });
  });

  // ═══════════════════════════════════════════════
  // getUserActivities
  // ═══════════════════════════════════════════════

  describe("getUserActivities", () => {
    it("should return activities for a specific user", async () => {
      vi.mocked(prisma.activity.findMany).mockResolvedValue([
        { id: "act-1", action: "created" },
      ] as any);
      vi.mocked(prisma.activity.count).mockResolvedValue(1);

      const result = await getUserActivities("user-1");

      expect(result.activities).toHaveLength(1);
      expect(prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1" },
          orderBy: { createdAt: "desc" },
        }),
      );
    });

    it("should paginate user activities", async () => {
      vi.mocked(prisma.activity.findMany).mockResolvedValue([]);
      vi.mocked(prisma.activity.count).mockResolvedValue(30);

      const result = await getUserActivities("user-1", {
        page: 2,
        limit: 10,
      });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════
  // groupActivitiesByDate
  // ═══════════════════════════════════════════════

  describe("groupActivitiesByDate", () => {
    it("should group activities by date string", () => {
      const activities = [
        { id: "1", createdAt: new Date("2025-01-15T10:00:00Z") },
        { id: "2", createdAt: new Date("2025-01-15T14:00:00Z") },
        { id: "3", createdAt: new Date("2025-01-16T09:00:00Z") },
      ];

      const groups = groupActivitiesByDate(activities);

      expect(groups.size).toBe(2);
      expect(groups.get("2025-01-15")).toHaveLength(2);
      expect(groups.get("2025-01-16")).toHaveLength(1);
    });

    it("should return empty map for empty array", () => {
      const groups = groupActivitiesByDate([]);
      expect(groups.size).toBe(0);
    });

    it("should handle single activity", () => {
      const activities = [
        { id: "1", createdAt: new Date("2025-03-01T12:00:00Z") },
      ];

      const groups = groupActivitiesByDate(activities);

      expect(groups.size).toBe(1);
      expect(groups.get("2025-03-01")).toHaveLength(1);
    });

    it("should preserve all activity properties", () => {
      const activities = [
        {
          id: "1",
          createdAt: new Date("2025-01-15T10:00:00Z"),
          action: "created",
          entityType: "spacecraft",
        },
      ];

      const groups = groupActivitiesByDate(activities);
      const items = groups.get("2025-01-15")!;

      expect(items[0].action).toBe("created");
      expect(items[0].entityType).toBe("spacecraft");
    });
  });

  // ═══════════════════════════════════════════════
  // getActivityStats
  // ═══════════════════════════════════════════════

  describe("getActivityStats", () => {
    it("should return activity statistics for default 30 days", async () => {
      vi.mocked(prisma.activity.groupBy).mockResolvedValue([
        { action: "created", _count: 10 },
        { action: "updated", _count: 25 },
        { action: "deleted", _count: 3 },
      ] as any);
      vi.mocked(prisma.activity.count).mockResolvedValue(38);

      const result = await getActivityStats("org-1");

      expect(result.byAction).toEqual({
        created: 10,
        updated: 25,
        deleted: 3,
      });
      expect(result.total).toBe(38);
      expect(result.period).toBe("30 days");
    });

    it("should accept custom days parameter", async () => {
      vi.mocked(prisma.activity.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.activity.count).mockResolvedValue(0);

      const result = await getActivityStats("org-1", 7);

      expect(result.period).toBe("7 days");
    });

    it("should return empty stats when no activities", async () => {
      vi.mocked(prisma.activity.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.activity.count).mockResolvedValue(0);

      const result = await getActivityStats("org-1");

      expect(result.byAction).toEqual({});
      expect(result.total).toBe(0);
    });

    it("should filter by date range", async () => {
      vi.mocked(prisma.activity.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.activity.count).mockResolvedValue(0);

      await getActivityStats("org-1", 14);

      expect(prisma.activity.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org-1",
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });
});
