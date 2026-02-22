import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    dataRoom: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    dataRoomDocument: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
    dataRoomAccessLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Mock audit
vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn(),
}));

// Mock activity service
vi.mock("@/lib/services/activity-service", () => ({
  createActivity: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { createActivity } from "@/lib/services/activity-service";
import {
  createDataRoom,
  getDataRooms,
  getDataRoom,
  updateDataRoom,
  closeDataRoom,
  addDocument,
  removeDocument,
  getDocuments,
  logDataRoomAccess,
  getDataRoomAccessLogs,
  getDataRoomsForStakeholder,
  closeExpiredDataRooms,
} from "@/lib/services/data-room";

describe("Data Room Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════
  // createDataRoom
  // ═══════════════════════════════════════════════

  describe("createDataRoom", () => {
    it("should create a data room with default settings", async () => {
      const mockDataRoom = {
        id: "dr-1",
        organizationId: "org-1",
        engagementId: "eng-1",
        name: "Due Diligence",
        accessLevel: "VIEW_ONLY",
        watermark: true,
        downloadable: false,
        printable: false,
        engagement: { companyName: "Acme", type: "SUPPLIER" },
        _count: { documents: 0 },
      };

      vi.mocked(prisma.dataRoom.create).mockResolvedValue(mockDataRoom as any);

      const result = await createDataRoom(
        {
          organizationId: "org-1",
          engagementId: "eng-1",
          name: "Due Diligence",
        },
        "user-1",
      );

      expect(result.id).toBe("dr-1");
      expect(prisma.dataRoom.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: "org-1",
            engagementId: "eng-1",
            name: "Due Diligence",
            accessLevel: "VIEW_ONLY",
            watermark: true,
            downloadable: false,
            printable: false,
          }),
        }),
      );
    });

    it("should log audit event on creation", async () => {
      vi.mocked(prisma.dataRoom.create).mockResolvedValue({
        id: "dr-1",
        name: "Test Room",
        engagement: { companyName: "Acme", type: "SUPPLIER" },
        _count: { documents: 0 },
      } as any);

      await createDataRoom(
        {
          organizationId: "org-1",
          engagementId: "eng-1",
          name: "Test Room",
        },
        "user-1",
      );

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          action: "data_room_created",
          entityType: "data_room",
        }),
      );
    });

    it("should create activity entry", async () => {
      vi.mocked(prisma.dataRoom.create).mockResolvedValue({
        id: "dr-1",
        name: "Test Room",
        engagement: { companyName: "Acme", type: "SUPPLIER" },
        _count: { documents: 0 },
      } as any);

      await createDataRoom(
        {
          organizationId: "org-1",
          engagementId: "eng-1",
          name: "Test Room",
        },
        "user-1",
      );

      expect(createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          action: "created",
          entityType: "data_room",
          entityName: "Test Room",
        }),
      );
    });

    it("should apply custom settings", async () => {
      vi.mocked(prisma.dataRoom.create).mockResolvedValue({
        id: "dr-1",
        engagement: { companyName: "Acme", type: "SUPPLIER" },
        _count: { documents: 0 },
      } as any);

      await createDataRoom(
        {
          organizationId: "org-1",
          engagementId: "eng-1",
          name: "Audit Room",
          accessLevel: "DOWNLOAD" as any,
          watermark: false,
          downloadable: true,
          printable: true,
          expiresAt: new Date("2027-01-01"),
        },
        "user-1",
      );

      expect(prisma.dataRoom.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accessLevel: "DOWNLOAD",
            watermark: false,
            downloadable: true,
            printable: true,
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════
  // getDataRooms
  // ═══════════════════════════════════════════════

  describe("getDataRooms", () => {
    it("should return paginated data rooms", async () => {
      vi.mocked(prisma.dataRoom.findMany).mockResolvedValue([
        { id: "dr-1" },
        { id: "dr-2" },
      ] as any);
      vi.mocked(prisma.dataRoom.count).mockResolvedValue(2);

      const result = await getDataRooms("org-1");

      expect(result.dataRooms).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.totalPages).toBe(1);
    });

    it("should apply engagement filter", async () => {
      vi.mocked(prisma.dataRoom.findMany).mockResolvedValue([]);
      vi.mocked(prisma.dataRoom.count).mockResolvedValue(0);

      await getDataRooms("org-1", { engagementId: "eng-1" });

      expect(prisma.dataRoom.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org-1",
            engagementId: "eng-1",
          }),
        }),
      );
    });

    it("should apply active filter", async () => {
      vi.mocked(prisma.dataRoom.findMany).mockResolvedValue([]);
      vi.mocked(prisma.dataRoom.count).mockResolvedValue(0);

      await getDataRooms("org-1", { isActive: true });

      expect(prisma.dataRoom.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });

    it("should paginate correctly", async () => {
      vi.mocked(prisma.dataRoom.findMany).mockResolvedValue([]);
      vi.mocked(prisma.dataRoom.count).mockResolvedValue(100);

      const result = await getDataRooms("org-1", {}, { page: 3, limit: 10 });

      expect(result.page).toBe(3);
      expect(result.totalPages).toBe(10);
      expect(prisma.dataRoom.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════
  // getDataRoom
  // ═══════════════════════════════════════════════

  describe("getDataRoom", () => {
    it("should return data room by id and org", async () => {
      vi.mocked(prisma.dataRoom.findFirst).mockResolvedValue({
        id: "dr-1",
        name: "Test",
      } as any);

      const result = await getDataRoom("dr-1", "org-1");

      expect(result).toBeDefined();
      expect(prisma.dataRoom.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "dr-1", organizationId: "org-1" },
        }),
      );
    });

    it("should return null for nonexistent data room", async () => {
      vi.mocked(prisma.dataRoom.findFirst).mockResolvedValue(null);

      const result = await getDataRoom("nonexistent", "org-1");
      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════
  // updateDataRoom
  // ═══════════════════════════════════════════════

  describe("updateDataRoom", () => {
    it("should update data room fields and log audit event", async () => {
      vi.mocked(prisma.dataRoom.update).mockResolvedValue({
        id: "dr-1",
        name: "Updated Name",
        engagement: { companyName: "Acme" },
        _count: { documents: 0 },
      } as any);

      const result = await updateDataRoom(
        "dr-1",
        "org-1",
        { name: "Updated Name", downloadable: true },
        "user-1",
      );

      expect(result.name).toBe("Updated Name");
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "data_room_updated",
          entityId: "dr-1",
        }),
      );
    });

    it("should only include defined fields in update", async () => {
      vi.mocked(prisma.dataRoom.update).mockResolvedValue({
        id: "dr-1",
        name: "Test",
        engagement: { companyName: "Acme" },
        _count: { documents: 0 },
      } as any);

      await updateDataRoom("dr-1", "org-1", { name: "New Name" }, "user-1");

      const updateCall = vi.mocked(prisma.dataRoom.update).mock.calls[0][0];
      expect(updateCall.data).toHaveProperty("name");
      expect(updateCall.data).not.toHaveProperty("downloadable");
    });
  });

  // ═══════════════════════════════════════════════
  // closeDataRoom
  // ═══════════════════════════════════════════════

  describe("closeDataRoom", () => {
    it("should close a data room and log audit event", async () => {
      vi.mocked(prisma.dataRoom.update).mockResolvedValue({
        id: "dr-1",
        name: "Closed Room",
        isActive: false,
        closedBy: "user-1",
      } as any);

      const result = await closeDataRoom("dr-1", "org-1", "user-1");

      expect(result.isActive).toBe(false);
      expect(prisma.dataRoom.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "dr-1", organizationId: "org-1" },
          data: expect.objectContaining({
            isActive: false,
            closedBy: "user-1",
          }),
        }),
      );
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "data_room_closed",
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════
  // addDocument
  // ═══════════════════════════════════════════════

  describe("addDocument", () => {
    it("should add document to data room", async () => {
      vi.mocked(prisma.dataRoom.findUnique).mockResolvedValue({
        organizationId: "org-1",
        name: "Test Room",
      } as any);
      vi.mocked(prisma.dataRoomDocument.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.dataRoomDocument.create).mockResolvedValue({
        id: "drd-1",
        sortOrder: 1,
        document: { id: "doc-1", name: "Report.pdf" },
      } as any);

      const result = await addDocument("dr-1", "doc-1", "user-1");

      expect(result.sortOrder).toBe(1);
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "data_room_document_added",
          metadata: { documentId: "doc-1" },
        }),
      );
    });

    it("should throw when data room not found", async () => {
      vi.mocked(prisma.dataRoom.findUnique).mockResolvedValue(null);

      await expect(
        addDocument("nonexistent", "doc-1", "user-1"),
      ).rejects.toThrow("Data room not found");
    });

    it("should increment sort order based on last document", async () => {
      vi.mocked(prisma.dataRoom.findUnique).mockResolvedValue({
        organizationId: "org-1",
        name: "Test",
      } as any);
      vi.mocked(prisma.dataRoomDocument.findFirst).mockResolvedValue({
        sortOrder: 5,
      } as any);
      vi.mocked(prisma.dataRoomDocument.create).mockResolvedValue({
        id: "drd-2",
        sortOrder: 6,
      } as any);

      await addDocument("dr-1", "doc-2", "user-1");

      expect(prisma.dataRoomDocument.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sortOrder: 6,
          }),
        }),
      );
    });

    it("should add document with note", async () => {
      vi.mocked(prisma.dataRoom.findUnique).mockResolvedValue({
        organizationId: "org-1",
        name: "Test",
      } as any);
      vi.mocked(prisma.dataRoomDocument.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.dataRoomDocument.create).mockResolvedValue({
        id: "drd-3",
      } as any);

      await addDocument("dr-1", "doc-1", "user-1", "Important document");

      expect(prisma.dataRoomDocument.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            note: "Important document",
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════
  // removeDocument
  // ═══════════════════════════════════════════════

  describe("removeDocument", () => {
    it("should remove document and log audit event", async () => {
      vi.mocked(prisma.dataRoomDocument.delete).mockResolvedValue({} as any);

      await removeDocument("dr-1", "doc-1", "user-1");

      expect(prisma.dataRoomDocument.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            dataRoomId_documentId: {
              dataRoomId: "dr-1",
              documentId: "doc-1",
            },
          },
        }),
      );
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "data_room_document_removed",
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════
  // getDocuments
  // ═══════════════════════════════════════════════

  describe("getDocuments", () => {
    it("should return documents ordered by sortOrder", async () => {
      const mockDocs = [
        { id: "drd-1", sortOrder: 1 },
        { id: "drd-2", sortOrder: 2 },
      ];
      vi.mocked(prisma.dataRoomDocument.findMany).mockResolvedValue(
        mockDocs as any,
      );

      const result = await getDocuments("dr-1");

      expect(result).toHaveLength(2);
      expect(prisma.dataRoomDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { dataRoomId: "dr-1" },
          orderBy: { sortOrder: "asc" },
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════
  // logDataRoomAccess
  // ═══════════════════════════════════════════════

  describe("logDataRoomAccess", () => {
    it("should create access log entry", async () => {
      vi.mocked(prisma.dataRoomAccessLog.create).mockResolvedValue({
        id: "log-1",
      } as any);

      await logDataRoomAccess("dr-1", "view", "stakeholder", "eng-1", {
        ipAddress: "1.2.3.4",
        userAgent: "Mozilla/5.0",
      });

      expect(prisma.dataRoomAccessLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dataRoomId: "dr-1",
            action: "view",
            actorType: "stakeholder",
            actorId: "eng-1",
            ipAddress: "1.2.3.4",
          }),
        }),
      );
    });

    it("should handle access log without options", async () => {
      vi.mocked(prisma.dataRoomAccessLog.create).mockResolvedValue({
        id: "log-2",
      } as any);

      await logDataRoomAccess("dr-1", "view", "user", "user-1");

      expect(prisma.dataRoomAccessLog.create).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════
  // getDataRoomAccessLogs
  // ═══════════════════════════════════════════════

  describe("getDataRoomAccessLogs", () => {
    it("should return paginated access logs", async () => {
      vi.mocked(prisma.dataRoomAccessLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.dataRoomAccessLog.count).mockResolvedValue(0);

      const result = await getDataRoomAccessLogs("dr-1");

      expect(result.logs).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════
  // closeExpiredDataRooms
  // ═══════════════════════════════════════════════

  describe("closeExpiredDataRooms", () => {
    it("should close expired data rooms and return count", async () => {
      vi.mocked(prisma.dataRoom.updateMany).mockResolvedValue({
        count: 3,
      } as any);

      const result = await closeExpiredDataRooms();

      expect(result).toBe(3);
      expect(prisma.dataRoom.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
          data: expect.objectContaining({
            isActive: false,
            closedBy: "system",
          }),
        }),
      );
    });

    it("should return 0 when no expired data rooms", async () => {
      vi.mocked(prisma.dataRoom.updateMany).mockResolvedValue({
        count: 0,
      } as any);

      const result = await closeExpiredDataRooms();
      expect(result).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════
  // getDataRoomsForStakeholder
  // ═══════════════════════════════════════════════

  describe("getDataRoomsForStakeholder", () => {
    it("should return active data rooms for engagement", async () => {
      vi.mocked(prisma.dataRoom.findMany).mockResolvedValue([
        { id: "dr-1", isActive: true },
      ] as any);

      const result = await getDataRoomsForStakeholder("eng-1");

      expect(result).toHaveLength(1);
      expect(prisma.dataRoom.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            engagementId: "eng-1",
            isActive: true,
          }),
        }),
      );
    });
  });
});
