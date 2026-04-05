/**
 * Data Room Service
 * Manages secure data rooms: CRUD, document linking, access tracking, auto-expiry
 */

import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { createActivity } from "@/lib/services/activity-service";
import type { DataRoomAccessLevel, Prisma } from "@prisma/client";

// ─── Types ───

export interface CreateDataRoomInput {
  organizationId: string;
  engagementId: string;
  name: string;
  description?: string;
  purpose?: string;
  accessLevel?: DataRoomAccessLevel;
  watermark?: boolean;
  downloadable?: boolean;
  printable?: boolean;
  expiresAt?: Date;
}

export interface UpdateDataRoomInput {
  name?: string;
  description?: string;
  purpose?: string;
  accessLevel?: DataRoomAccessLevel;
  watermark?: boolean;
  downloadable?: boolean;
  printable?: boolean;
  expiresAt?: Date;
}

export interface DataRoomFilters {
  engagementId?: string;
  isActive?: boolean;
  purpose?: string;
}

// ─── CRUD ───

export async function createDataRoom(
  input: CreateDataRoomInput,
  userId: string,
) {
  const dataRoom = await prisma.dataRoom.create({
    data: {
      organizationId: input.organizationId,
      engagementId: input.engagementId,
      name: input.name,
      description: input.description,
      purpose: input.purpose,
      accessLevel: input.accessLevel || "VIEW_ONLY",
      watermark: input.watermark ?? true,
      downloadable: input.downloadable ?? false,
      printable: input.printable ?? false,
      expiresAt: input.expiresAt,
    },
    include: {
      engagement: {
        select: { companyName: true, type: true },
      },
      _count: { select: { documents: true } },
    },
  });

  await logAuditEvent({
    userId,
    action: "data_room_created",
    entityType: "data_room",
    entityId: dataRoom.id,
    description: `Created data room "${input.name}" for ${dataRoom.engagement.companyName}`,
  });

  await createActivity({
    organizationId: input.organizationId,
    userId,
    action: "created",
    entityType: "data_room",
    entityId: dataRoom.id,
    entityName: input.name,
    description: `Created data room "${input.name}"`,
  });

  return dataRoom;
}

export async function getDataRooms(
  organizationId: string,
  filters: DataRoomFilters = {},
  options: { page?: number; limit?: number } = {},
) {
  const { page = 1, limit = 50 } = options;
  const skip = (page - 1) * limit;

  const where: Prisma.DataRoomWhereInput = {
    organizationId,
    ...(filters.engagementId && { engagementId: filters.engagementId }),
    ...(filters.isActive !== undefined && { isActive: filters.isActive }),
    ...(filters.purpose && { purpose: filters.purpose }),
  };

  const [dataRooms, total] = await Promise.all([
    prisma.dataRoom.findMany({
      where,
      include: {
        engagement: {
          select: {
            id: true,
            companyName: true,
            type: true,
            contactName: true,
          },
        },
        _count: { select: { documents: true, accessLogs: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.dataRoom.count({ where }),
  ]);

  return {
    dataRooms,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getDataRoom(id: string, organizationId: string) {
  return prisma.dataRoom.findFirst({
    where: { id, organizationId },
    include: {
      engagement: {
        select: {
          id: true,
          companyName: true,
          type: true,
          contactName: true,
          contactEmail: true,
        },
      },
      documents: {
        include: {
          document: {
            select: {
              id: true,
              name: true,
              fileName: true,
              fileSize: true,
              mimeType: true,
              category: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
      _count: { select: { documents: true, accessLogs: true } },
    },
  });
}

export async function updateDataRoom(
  id: string,
  organizationId: string,
  input: UpdateDataRoomInput,
  userId: string,
) {
  const dataRoom = await prisma.dataRoom.update({
    where: { id, organizationId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && {
        description: input.description,
      }),
      ...(input.purpose !== undefined && { purpose: input.purpose }),
      ...(input.accessLevel !== undefined && {
        accessLevel: input.accessLevel,
      }),
      ...(input.watermark !== undefined && { watermark: input.watermark }),
      ...(input.downloadable !== undefined && {
        downloadable: input.downloadable,
      }),
      ...(input.printable !== undefined && { printable: input.printable }),
      ...(input.expiresAt !== undefined && { expiresAt: input.expiresAt }),
    },
    include: {
      engagement: { select: { companyName: true } },
      _count: { select: { documents: true } },
    },
  });

  await logAuditEvent({
    userId,
    action: "data_room_updated",
    entityType: "data_room",
    entityId: id,
    description: `Updated data room "${dataRoom.name}"`,
  });

  return dataRoom;
}

export async function closeDataRoom(
  id: string,
  organizationId: string,
  userId: string,
) {
  const dataRoom = await prisma.dataRoom.update({
    where: { id, organizationId },
    data: {
      isActive: false,
      closedAt: new Date(),
      closedBy: userId,
    },
  });

  await logAuditEvent({
    userId,
    action: "data_room_closed",
    entityType: "data_room",
    entityId: id,
    description: `Closed data room "${dataRoom.name}"`,
  });

  return dataRoom;
}

// ─── Document Management ───

export async function addDocument(
  dataRoomId: string,
  documentId: string,
  userId: string,
  note?: string,
) {
  const dataRoom = await prisma.dataRoom.findUnique({
    where: { id: dataRoomId },
    select: { organizationId: true, name: true },
  });

  if (!dataRoom) {
    throw new Error("Data room not found");
  }

  // Get max sort order
  const lastDoc = await prisma.dataRoomDocument.findFirst({
    where: { dataRoomId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const doc = await prisma.dataRoomDocument.create({
    data: {
      dataRoomId,
      documentId,
      addedBy: userId,
      note,
      sortOrder: (lastDoc?.sortOrder || 0) + 1,
    },
    include: {
      document: {
        select: {
          id: true,
          name: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          category: true,
        },
      },
    },
  });

  await logAuditEvent({
    userId,
    action: "data_room_document_added",
    entityType: "data_room",
    entityId: dataRoomId,
    description: `Added document to data room "${dataRoom.name}"`,
    metadata: { documentId },
  });

  return doc;
}

export async function removeDocument(
  dataRoomId: string,
  documentId: string,
  userId: string,
) {
  await prisma.dataRoomDocument.delete({
    where: {
      dataRoomId_documentId: { dataRoomId, documentId },
    },
  });

  await logAuditEvent({
    userId,
    action: "data_room_document_removed",
    entityType: "data_room",
    entityId: dataRoomId,
    description: `Removed document from data room`,
    metadata: { documentId },
  });
}

export async function getDocuments(dataRoomId: string) {
  return prisma.dataRoomDocument.findMany({
    where: { dataRoomId },
    include: {
      document: {
        select: {
          id: true,
          name: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          category: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
}

// ─── Access Logging ───

export async function logDataRoomAccess(
  dataRoomId: string,
  action: string,
  actorType: string,
  actorId: string,
  options?: {
    documentId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  return prisma.dataRoomAccessLog.create({
    data: {
      dataRoomId,
      action,
      actorType,
      actorId,
      documentId: options?.documentId,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      metadata: options?.metadata || undefined,
    },
  });
}

export async function getDataRoomAccessLogs(
  dataRoomId: string,
  options: { page?: number; limit?: number } = {},
) {
  const { page = 1, limit = 50 } = options;
  const skip = (page - 1) * limit;

  const where = { dataRoomId };

  const [logs, total] = await Promise.all([
    prisma.dataRoomAccessLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.dataRoomAccessLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ─── Stakeholder Data Room Access ───

export async function getDataRoomsForStakeholder(engagementId: string) {
  return prisma.dataRoom.findMany({
    where: {
      engagementId,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: {
      documents: {
        include: {
          document: {
            select: {
              id: true,
              name: true,
              fileName: true,
              fileSize: true,
              mimeType: true,
              category: true,
              storagePath: true,
              createdAt: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
      _count: { select: { documents: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Auto-Expiry ───

export async function closeExpiredDataRooms() {
  const expired = await prisma.dataRoom.updateMany({
    where: {
      isActive: true,
      expiresAt: { lte: new Date() },
    },
    data: {
      isActive: false,
      closedAt: new Date(),
      closedBy: "system",
    },
  });

  return expired.count;
}
