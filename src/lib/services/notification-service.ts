/**
 * Notification Service
 * Manages notifications and user preferences
 */

import { prisma } from "@/lib/prisma";
import type {
  Notification,
  NotificationPreference,
  NotificationType,
  NotificationSeverity,
  Prisma,
} from "@prisma/client";
import { logger } from "@/lib/logger";

// ─── Types ───

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  entityType?: string;
  entityId?: string;
  severity?: NotificationSeverity;
  organizationId?: string;
}

export interface NotificationFilters {
  read?: boolean;
  dismissed?: boolean;
  type?: NotificationType;
  severity?: NotificationSeverity;
  fromDate?: Date;
  toDate?: Date;
}

export interface NotificationPreferencesInput {
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  categories?: Record<string, { email?: boolean; push?: boolean }>;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursTimezone?: string;
  digestEnabled?: boolean;
  digestFrequency?: string;
}

// ─── Notification Type Config ───

export const NOTIFICATION_CONFIG: Record<
  NotificationType,
  {
    label: string;
    category: string;
    defaultSeverity: NotificationSeverity;
    emailSubjectPrefix?: string;
  }
> = {
  // Deadlines
  DEADLINE_REMINDER: {
    label: "Deadline Reminder",
    category: "deadlines",
    defaultSeverity: "WARNING",
    emailSubjectPrefix: "[Reminder]",
  },
  DEADLINE_APPROACHING: {
    label: "Deadline Approaching",
    category: "deadlines",
    defaultSeverity: "WARNING",
    emailSubjectPrefix: "[Deadline]",
  },
  DEADLINE_OVERDUE: {
    label: "Deadline Overdue",
    category: "deadlines",
    defaultSeverity: "URGENT",
    emailSubjectPrefix: "[Overdue]",
  },
  DOCUMENT_EXPIRY: {
    label: "Document Expiring",
    category: "deadlines",
    defaultSeverity: "WARNING",
    emailSubjectPrefix: "[Document]",
  },

  // Compliance
  COMPLIANCE_GAP: {
    label: "Compliance Gap",
    category: "compliance",
    defaultSeverity: "WARNING",
  },
  COMPLIANCE_SCORE_DROPPED: {
    label: "Compliance Score Dropped",
    category: "compliance",
    defaultSeverity: "WARNING",
  },
  COMPLIANCE_ACTION_REQUIRED: {
    label: "Compliance Action Required",
    category: "compliance",
    defaultSeverity: "URGENT",
    emailSubjectPrefix: "[Action Required]",
  },
  COMPLIANCE_UPDATED: {
    label: "Compliance Updated",
    category: "compliance",
    defaultSeverity: "INFO",
  },

  // Authorization
  AUTHORIZATION_UPDATE: {
    label: "Authorization Update",
    category: "authorization",
    defaultSeverity: "INFO",
  },
  WORKFLOW_STATUS_CHANGED: {
    label: "Workflow Status Changed",
    category: "authorization",
    defaultSeverity: "INFO",
  },
  DOCUMENT_REQUIRED: {
    label: "Document Required",
    category: "authorization",
    defaultSeverity: "WARNING",
  },
  AUTHORIZATION_APPROVED: {
    label: "Authorization Approved",
    category: "authorization",
    defaultSeverity: "INFO",
    emailSubjectPrefix: "[Approved]",
  },
  AUTHORIZATION_REJECTED: {
    label: "Authorization Rejected",
    category: "authorization",
    defaultSeverity: "URGENT",
    emailSubjectPrefix: "[Rejected]",
  },

  // Incidents
  INCIDENT_ALERT: {
    label: "Incident Alert",
    category: "incidents",
    defaultSeverity: "URGENT",
    emailSubjectPrefix: "[Incident]",
  },
  INCIDENT_CREATED: {
    label: "Incident Created",
    category: "incidents",
    defaultSeverity: "WARNING",
  },
  INCIDENT_ESCALATED: {
    label: "Incident Escalated",
    category: "incidents",
    defaultSeverity: "CRITICAL",
    emailSubjectPrefix: "[URGENT]",
  },
  INCIDENT_RESOLVED: {
    label: "Incident Resolved",
    category: "incidents",
    defaultSeverity: "INFO",
  },
  NCA_DEADLINE_APPROACHING: {
    label: "NCA Deadline Approaching",
    category: "incidents",
    defaultSeverity: "URGENT",
    emailSubjectPrefix: "[NCA Deadline]",
  },

  // Reports
  WEEKLY_DIGEST: {
    label: "Weekly Digest",
    category: "reports",
    defaultSeverity: "INFO",
  },
  REPORT_GENERATED: {
    label: "Report Generated",
    category: "reports",
    defaultSeverity: "INFO",
  },
  REPORT_SUBMITTED: {
    label: "Report Submitted",
    category: "reports",
    defaultSeverity: "INFO",
  },
  REPORT_FAILED: {
    label: "Report Failed",
    category: "reports",
    defaultSeverity: "WARNING",
  },
  NCA_ACKNOWLEDGED: {
    label: "NCA Acknowledged",
    category: "reports",
    defaultSeverity: "INFO",
  },

  // Team
  MEMBER_JOINED: {
    label: "Member Joined",
    category: "team",
    defaultSeverity: "INFO",
  },
  MEMBER_LEFT: {
    label: "Member Left",
    category: "team",
    defaultSeverity: "INFO",
  },
  MEMBER_ROLE_CHANGED: {
    label: "Member Role Changed",
    category: "team",
    defaultSeverity: "INFO",
  },
  INVITATION_RECEIVED: {
    label: "Invitation Received",
    category: "team",
    defaultSeverity: "INFO",
  },

  // Spacecraft
  SPACECRAFT_STATUS_CHANGED: {
    label: "Spacecraft Status Changed",
    category: "spacecraft",
    defaultSeverity: "INFO",
  },
  SPACECRAFT_ADDED: {
    label: "Spacecraft Added",
    category: "spacecraft",
    defaultSeverity: "INFO",
  },

  // System
  SYSTEM_UPDATE: {
    label: "System Update",
    category: "system",
    defaultSeverity: "INFO",
  },
  SYSTEM_MAINTENANCE: {
    label: "Scheduled Maintenance",
    category: "system",
    defaultSeverity: "WARNING",
  },

  // NIS2 Directive
  NIS2_DEADLINE_APPROACHING: {
    label: "NIS2 Deadline Approaching",
    category: "nis2",
    defaultSeverity: "WARNING",
    emailSubjectPrefix: "[NIS2]",
  },
  NIS2_ASSESSMENT_UPDATED: {
    label: "NIS2 Assessment Updated",
    category: "nis2",
    defaultSeverity: "INFO",
    emailSubjectPrefix: "[NIS2]",
  },
};

export const NOTIFICATION_CATEGORIES = [
  { id: "deadlines", label: "Deadlines & Reminders" },
  { id: "compliance", label: "Compliance Updates" },
  { id: "authorization", label: "Authorization Workflow" },
  { id: "incidents", label: "Incidents & Alerts" },
  { id: "reports", label: "Reports & Submissions" },
  { id: "team", label: "Team Activity" },
  { id: "spacecraft", label: "Spacecraft Updates" },
  { id: "system", label: "System Notifications" },
];

// ─── CRUD Operations ───

export async function createNotification(
  input: CreateNotificationInput,
): Promise<Notification> {
  const config = NOTIFICATION_CONFIG[input.type];

  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl,
      entityType: input.entityType,
      entityId: input.entityId,
      severity: input.severity || config.defaultSeverity,
      organizationId: input.organizationId,
    },
  });

  // Dispatch notification (email, push, etc.)
  await dispatchNotification(notification);

  return notification;
}

export async function createBulkNotifications(
  inputs: CreateNotificationInput[],
): Promise<number> {
  const data = inputs.map((input) => {
    const config = NOTIFICATION_CONFIG[input.type];
    return {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl,
      entityType: input.entityType,
      entityId: input.entityId,
      severity: input.severity || config.defaultSeverity,
      organizationId: input.organizationId,
    };
  });

  const result = await prisma.notification.createMany({ data });

  // Note: Bulk dispatch would need to be handled separately
  return result.count;
}

export async function getNotification(
  id: string,
  userId: string,
): Promise<Notification | null> {
  return prisma.notification.findFirst({
    where: { id, userId },
  });
}

export async function getUserNotifications(
  userId: string,
  filters?: NotificationFilters,
  options?: { limit?: number; offset?: number },
): Promise<{
  notifications: Notification[];
  total: number;
  unreadCount: number;
}> {
  const where: Prisma.NotificationWhereInput = {
    userId,
    dismissed: filters?.dismissed ?? false,
  };

  if (filters?.read !== undefined) {
    where.read = filters.read;
  }

  if (filters?.type) {
    where.type = filters.type;
  }

  if (filters?.severity) {
    where.severity = filters.severity;
  }

  if (filters?.fromDate || filters?.toDate) {
    where.createdAt = {};
    if (filters.fromDate) where.createdAt.gte = filters.fromDate;
    if (filters.toDate) where.createdAt.lte = filters.toDate;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options?.limit || 20,
      skip: options?.offset || 0,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { userId, read: false, dismissed: false },
    }),
  ]);

  return { notifications, total, unreadCount };
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, read: false, dismissed: false },
  });
}

export async function markAsRead(
  userId: string,
  notificationIds: string[],
): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      id: { in: notificationIds },
      userId,
    },
    data: {
      read: true,
      readAt: new Date(),
    },
  });

  return result.count;
}

export async function markAllAsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, read: false },
    data: {
      read: true,
      readAt: new Date(),
    },
  });

  return result.count;
}

export async function dismissNotification(
  userId: string,
  notificationId: string,
): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { dismissed: true },
  });
}

export async function dismissAllNotifications(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, dismissed: false },
    data: { dismissed: true },
  });

  return result.count;
}

export async function deleteOldNotifications(
  olderThanDays: number = 90,
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const result = await prisma.notification.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
      dismissed: true,
    },
  });

  return result.count;
}

// ─── Preferences ───

export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationPreference | null> {
  return prisma.notificationPreference.findUnique({
    where: { userId },
  });
}

export async function updateNotificationPreferences(
  userId: string,
  input: NotificationPreferencesInput,
): Promise<NotificationPreference> {
  const data: Prisma.NotificationPreferenceUpdateInput = {};

  if (input.emailEnabled !== undefined) data.emailEnabled = input.emailEnabled;
  if (input.pushEnabled !== undefined) data.pushEnabled = input.pushEnabled;
  if (input.categories !== undefined)
    data.categories = input.categories as Prisma.InputJsonValue;
  if (input.quietHoursEnabled !== undefined)
    data.quietHoursEnabled = input.quietHoursEnabled;
  if (input.quietHoursStart !== undefined)
    data.quietHoursStart = input.quietHoursStart;
  if (input.quietHoursEnd !== undefined)
    data.quietHoursEnd = input.quietHoursEnd;
  if (input.quietHoursTimezone !== undefined)
    data.quietHoursTimezone = input.quietHoursTimezone;
  if (input.digestEnabled !== undefined)
    data.digestEnabled = input.digestEnabled;
  if (input.digestFrequency !== undefined)
    data.digestFrequency = input.digestFrequency;

  return prisma.notificationPreference.upsert({
    where: { userId },
    update: data,
    create: {
      userId,
      emailEnabled: input.emailEnabled ?? true,
      pushEnabled: input.pushEnabled ?? true,
      categories: input.categories
        ? (input.categories as Prisma.InputJsonValue)
        : undefined,
      quietHoursEnabled: input.quietHoursEnabled ?? false,
      quietHoursStart: input.quietHoursStart,
      quietHoursEnd: input.quietHoursEnd,
      quietHoursTimezone: input.quietHoursTimezone || "Europe/Berlin",
      digestEnabled: input.digestEnabled ?? false,
      digestFrequency: input.digestFrequency,
    },
  });
}

// ─── Dispatch Logic ───

async function dispatchNotification(notification: Notification): Promise<void> {
  // Get user preferences
  const preferences = await getNotificationPreferences(notification.userId);

  // Check if in quiet hours
  if (preferences?.quietHoursEnabled && isInQuietHours(preferences)) {
    // Skip immediate notification, will be included in digest
    return;
  }

  const config = NOTIFICATION_CONFIG[notification.type];
  const categoryPrefs = preferences?.categories as Record<
    string,
    { email?: boolean; push?: boolean }
  > | null;
  const categoryPref = categoryPrefs?.[config.category];

  // Send email if enabled
  const shouldSendEmail =
    preferences?.emailEnabled !== false && categoryPref?.email !== false;

  if (shouldSendEmail) {
    await sendNotificationEmail(notification);
  }

  // Push notifications would be handled here
  // const shouldSendPush = preferences?.pushEnabled !== false && (categoryPref?.push !== false);
  // if (shouldSendPush) { await sendPushNotification(notification); }
}

function isInQuietHours(preferences: NotificationPreference): boolean {
  if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
    return false;
  }

  const now = new Date();
  const [startHour, startMin] = preferences.quietHoursStart
    .split(":")
    .map(Number);
  const [endHour, endMin] = preferences.quietHoursEnd.split(":").map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  // Handle overnight quiet hours (e.g., 22:00 - 08:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

async function sendNotificationEmail(
  notification: Notification,
): Promise<void> {
  // Get user email
  const user = await prisma.user.findUnique({
    where: { id: notification.userId },
    select: { email: true, name: true },
  });

  if (!user?.email) return;

  const config = NOTIFICATION_CONFIG[notification.type];
  const subject = config.emailSubjectPrefix
    ? `${config.emailSubjectPrefix} ${notification.title}`
    : notification.title;

  // TODO: Integrate with email service
  // await sendEmail({
  //   to: user.email,
  //   subject,
  //   template: 'notification',
  //   data: {
  //     name: user.name,
  //     title: notification.title,
  //     message: notification.message,
  //     actionUrl: notification.actionUrl,
  //     severity: notification.severity,
  //   },
  // });

  // Mark as email sent
  await prisma.notification.update({
    where: { id: notification.id },
    data: {
      emailSent: true,
      emailSentAt: new Date(),
    },
  });

  logger.info(`[Notification Email] Would send to ${user.email}: ${subject}`);
}

// ─── Convenience Functions ───

export async function notifyUser(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  options?: {
    actionUrl?: string;
    entityType?: string;
    entityId?: string;
    severity?: NotificationSeverity;
    organizationId?: string;
  },
): Promise<Notification> {
  return createNotification({
    userId,
    type,
    title,
    message,
    ...options,
  });
}

export async function notifyOrganization(
  organizationId: string,
  type: NotificationType,
  title: string,
  message: string,
  options?: {
    actionUrl?: string;
    entityType?: string;
    entityId?: string;
    severity?: NotificationSeverity;
    excludeUserIds?: string[];
  },
): Promise<number> {
  // Get all organization members
  const members = await prisma.organizationMember.findMany({
    where: { organizationId },
    select: { userId: true },
  });

  const userIds = members
    .map((m) => m.userId)
    .filter((id) => !options?.excludeUserIds?.includes(id));

  if (userIds.length === 0) return 0;

  const inputs: CreateNotificationInput[] = userIds.map((userId) => ({
    userId,
    type,
    title,
    message,
    organizationId,
    actionUrl: options?.actionUrl,
    entityType: options?.entityType,
    entityId: options?.entityId,
    severity: options?.severity,
  }));

  return createBulkNotifications(inputs);
}
