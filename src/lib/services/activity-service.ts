import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type ActivityAction =
  | "created"
  | "updated"
  | "deleted"
  | "commented"
  | "mentioned"
  | "approved"
  | "rejected"
  | "submitted"
  | "uploaded"
  | "completed";

export interface CreateActivityInput {
  organizationId: string;
  userId?: string;
  action: ActivityAction;
  entityType: string;
  entityId: string;
  entityName?: string;
  description?: string;
  metadata?: Prisma.InputJsonValue;
  changes?: Prisma.InputJsonValue;
}

export interface ActivityFilters {
  userId?: string;
  entityType?: string;
  entityId?: string;
  actions?: ActivityAction[];
  fromDate?: Date;
  toDate?: Date;
}

// Create an activity entry
export async function createActivity(input: CreateActivityInput) {
  return prisma.activity.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      entityName: input.entityName,
      description: input.description,
      metadata: input.metadata || undefined,
      changes: input.changes || undefined,
    },
  });
}

// Get activities for an organization
export async function getActivities(
  organizationId: string,
  filters: ActivityFilters = {},
  options: { page?: number; limit?: number } = {},
) {
  const { page = 1, limit = 50 } = options;
  const skip = (page - 1) * limit;

  const where: any = {
    organizationId,
    ...(filters.userId && { userId: filters.userId }),
    ...(filters.entityType && { entityType: filters.entityType }),
    ...(filters.entityId && { entityId: filters.entityId }),
    ...(filters.actions?.length && { action: { in: filters.actions } }),
    ...(filters.fromDate && {
      createdAt: { gte: filters.fromDate },
    }),
    ...(filters.toDate && {
      createdAt: { lte: filters.toDate },
    }),
  };

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.activity.count({ where }),
  ]);

  return {
    activities,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// Get activities for a specific entity
export async function getEntityActivities(
  entityType: string,
  entityId: string,
  options: { page?: number; limit?: number } = {},
) {
  const { page = 1, limit = 50 } = options;
  const skip = (page - 1) * limit;

  const where = {
    entityType,
    entityId,
  };

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.activity.count({ where }),
  ]);

  return {
    activities,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// Get recent activities for a user
export async function getUserActivities(
  userId: string,
  options: { page?: number; limit?: number } = {},
) {
  const { page = 1, limit = 50 } = options;
  const skip = (page - 1) * limit;

  const where = { userId };

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.activity.count({ where }),
  ]);

  return {
    activities,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// Group activities by date
export function groupActivitiesByDate(
  activities: {
    id: string;
    createdAt: Date;
    [key: string]: unknown;
  }[],
): Map<string, typeof activities> {
  const groups = new Map<string, typeof activities>();

  for (const activity of activities) {
    const date = activity.createdAt.toISOString().split("T")[0];
    const existing = groups.get(date) || [];
    existing.push(activity);
    groups.set(date, existing);
  }

  return groups;
}

// Get activity statistics for an organization
export async function getActivityStats(
  organizationId: string,
  days: number = 30,
) {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  const activities = await prisma.activity.groupBy({
    by: ["action"],
    where: {
      organizationId,
      createdAt: { gte: fromDate },
    },
    _count: true,
  });

  const totalCount = await prisma.activity.count({
    where: {
      organizationId,
      createdAt: { gte: fromDate },
    },
  });

  return {
    byAction: activities.reduce(
      (acc, item) => {
        acc[item.action] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    ),
    total: totalCount,
    period: `${days} days`,
  };
}
