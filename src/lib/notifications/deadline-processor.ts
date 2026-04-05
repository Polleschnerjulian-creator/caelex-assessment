import { prisma } from "@/lib/prisma";
import { sendDeadlineReminder } from "@/lib/email";
import { getDaysBetween, wasReminderSent, startOfDay } from "./index";
import { createNotification } from "@/lib/services/notification-service";
import type { Deadline, User, SupervisionConfig } from "@prisma/client";
import { logger } from "@/lib/logger";

export interface DeadlineProcessingResult {
  processed: number;
  sent: number;
  skipped: number;
  errors: string[];
  deadlinesSent: string[];
  startedAt: Date;
  completedAt: Date;
}

interface DeadlineWithUser extends Deadline {
  user: User & {
    supervisionConfig: SupervisionConfig | null;
  };
}

/**
 * Process deadline reminders for all users
 * Should be called by the cron job daily
 */
export async function processDeadlineReminders(): Promise<DeadlineProcessingResult> {
  const startedAt = new Date();
  const result: DeadlineProcessingResult = {
    processed: 0,
    sent: 0,
    skipped: 0,
    errors: [],
    deadlinesSent: [],
    startedAt,
    completedAt: new Date(),
  };

  try {
    // Find all deadlines that:
    // 1. Are not completed or cancelled
    // 2. Have users with notification enabled
    // 3. Due date is in the future or recently passed (for overdue notifications)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // Include up to 30 days overdue

    // D-3: Cursor-based batching to avoid unbounded query
    const BATCH_SIZE = 100;
    let cursor: string | undefined;

    while (true) {
      const deadlines = await prisma.deadline.findMany({
        where: {
          status: {
            in: ["UPCOMING", "DUE_SOON", "OVERDUE"],
          },
          dueDate: {
            gte: cutoffDate,
          },
        },
        include: {
          user: {
            include: {
              supervisionConfig: true,
            },
          },
        },
        take: BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { id: "asc" },
      });

      if (deadlines.length === 0) break;

      logger.info(
        `Processing batch of ${deadlines.length} deadlines (total so far: ${result.processed})`,
      );

      for (const deadline of deadlines) {
        result.processed++;

        try {
          const shouldSend = await processDeadline(deadline, result);
          if (shouldSend) {
            result.deadlinesSent.push(deadline.id);
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : "Unknown error";
          result.errors.push(`Deadline ${deadline.id}: ${errorMsg}`);
          logger.error(`Error processing deadline ${deadline.id}:`, error);
        }
      }

      cursor = deadlines[deadlines.length - 1].id;

      // If we got fewer than BATCH_SIZE, there are no more records
      if (deadlines.length < BATCH_SIZE) break;
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    result.errors.push(`Global error: ${errorMsg}`);
    logger.error("Deadline processing failed:", error);
  }

  result.completedAt = new Date();
  return result;
}

/**
 * Process a single deadline and send reminder if needed
 */
async function processDeadline(
  deadline: DeadlineWithUser,
  result: DeadlineProcessingResult,
): Promise<boolean> {
  const { user } = deadline;
  const config = user.supervisionConfig;

  // Check if user has notifications enabled
  if (config && !config.enableAutoReminders) {
    result.skipped++;
    return false;
  }

  // Check notification method
  const notificationMethod = config?.notificationMethod || "email";

  // Calculate days until due (needed by both portal and email paths)
  const today = startOfDay(new Date());
  const dueDate = startOfDay(new Date(deadline.dueDate));
  const daysUntilDue = getDaysBetween(dueDate, today);

  // G-4: Portal notification — create an in-app notification instead of skipping
  if (notificationMethod === "portal" || notificationMethod === "both") {
    const days = Math.abs(daysUntilDue);
    const isOverdueForPortal = daysUntilDue < 0;
    try {
      await createNotification({
        userId: deadline.userId,
        type: isOverdueForPortal ? "DEADLINE_OVERDUE" : "DEADLINE_REMINDER",
        title: isOverdueForPortal
          ? `Überfällig: ${deadline.title}`
          : `Deadline: ${deadline.title}`,
        message: isOverdueForPortal
          ? `${deadline.title} ist ${days} Tage überfällig.`
          : `${deadline.title} ist in ${days} Tagen fällig.`,
        actionUrl: "/dashboard/timeline",
        entityType: "deadline",
        entityId: deadline.id,
        severity:
          daysUntilDue < 0
            ? "URGENT"
            : days <= 3
              ? "CRITICAL"
              : days <= 7
                ? "WARNING"
                : "INFO",
        organizationId: deadline.organizationId ?? undefined,
      });
    } catch (portalErr) {
      logger.warn(
        `Failed to create portal notification for deadline ${deadline.id}`,
        portalErr,
      );
    }

    // If portal-only, we are done (no email). For "both", continue to email.
    if (notificationMethod === "portal") {
      result.sent++;
      return true;
    }
  }

  // Determine recipient email
  const recipientEmail = config?.designatedContactEmail || user.email;
  if (!recipientEmail) {
    result.skipped++;
    return false;
  }

  // Check if we should send a reminder based on reminderDays
  const reminderDays = deadline.reminderDays || [30, 14, 7, 3, 1];
  const remindersSent = deadline.remindersSent || [];

  // Find the highest reminder threshold that applies (SVA-75).
  // Use <= instead of === so missed cron runs still trigger the reminder.
  // wasReminderSent dedup prevents duplicate sends.
  const sortedDays = [...reminderDays].sort((a, b) => b - a);
  const matchingReminderDay = sortedDays.find((day) => {
    if (daysUntilDue <= day) {
      return !wasReminderSent(remindersSent, deadline.dueDate, day);
    }
    return false;
  });

  // Special case: send daily reminders for overdue deadlines (up to 7 days)
  const isOverdue = daysUntilDue < 0 && daysUntilDue >= -7;
  const shouldSendOverdue = isOverdue && !wasTodayReminderSent(remindersSent);

  if (!matchingReminderDay && !shouldSendOverdue) {
    result.skipped++;
    return false;
  }

  // Build dashboard URL
  const baseUrl = (process.env.AUTH_URL || "https://caelex.eu").replace(
    /\/$/,
    "",
  );
  const dashboardUrl = `${baseUrl}/dashboard/timeline`;

  // Send the reminder
  const emailResult = await sendDeadlineReminder(
    recipientEmail,
    user.id,
    deadline.id,
    {
      recipientName: user.name || "User",
      deadlineTitle: deadline.title,
      dueDate: deadline.dueDate,
      daysRemaining: Math.max(0, daysUntilDue),
      priority: deadline.priority,
      category: deadline.category,
      regulatoryRef: deadline.regulatoryRef || undefined,
      penaltyInfo: deadline.penaltyInfo || undefined,
      description: deadline.description || undefined,
      dashboardUrl,
    },
  );

  if (emailResult.success) {
    // Update remindersSent array
    await prisma.deadline.update({
      where: { id: deadline.id },
      data: {
        remindersSent: {
          push: new Date(),
        },
      },
    });

    // G-3: Weekly escalation to org admin/owner for deadlines overdue > 7 days
    const daysOverdue = -daysUntilDue;
    if (daysOverdue > 7 && daysOverdue % 7 === 0 && deadline.organizationId) {
      try {
        const orgAdmin = await prisma.organizationMember.findFirst({
          where: {
            organizationId: deadline.organizationId,
            role: { in: ["OWNER", "ADMIN"] },
          },
          select: { userId: true },
        });

        if (orgAdmin && orgAdmin.userId !== deadline.userId) {
          await createNotification({
            userId: orgAdmin.userId,
            type: "DEADLINE_OVERDUE",
            title: `ESKALATION: ${deadline.title} ist ${daysOverdue} Tage überfällig`,
            message: `Die Deadline "${deadline.title}" ist seit ${daysOverdue} Tagen überfällig. Bitte überprüfen und Maßnahmen einleiten.`,
            actionUrl: "/dashboard/timeline",
            severity: "CRITICAL",
            organizationId: deadline.organizationId,
          });
        }
      } catch (escalationErr) {
        logger.warn(
          `Failed to escalate overdue deadline ${deadline.id}`,
          escalationErr,
        );
      }
    }

    result.sent++;
    return true;
  } else {
    result.errors.push(
      `Failed to send email for deadline ${deadline.id}: ${emailResult.error}`,
    );
    return false;
  }
}

/**
 * Check if a reminder was sent today
 */
function wasTodayReminderSent(remindersSent: Date[]): boolean {
  const today = startOfDay(new Date());
  return remindersSent.some((sent) => {
    const sentDate = startOfDay(new Date(sent));
    return sentDate.getTime() === today.getTime();
  });
}

/**
 * Get deadlines approaching for a specific user
 * Useful for generating digest or dashboard stats
 */
export async function getUpcomingDeadlinesForUser(
  userId: string,
  daysAhead: number = 30,
): Promise<Deadline[]> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const futureDate = new Date(startOfToday);
  futureDate.setDate(futureDate.getDate() + daysAhead);

  return prisma.deadline.findMany({
    where: {
      userId,
      status: {
        in: ["UPCOMING", "DUE_SOON"],
      },
      dueDate: {
        lte: futureDate,
        gte: startOfToday,
      },
    },
    orderBy: {
      dueDate: "asc",
    },
  });
}

/**
 * Get overdue deadlines for a specific user
 */
export async function getOverdueDeadlinesForUser(
  userId: string,
): Promise<Deadline[]> {
  return prisma.deadline.findMany({
    where: {
      userId,
      status: "OVERDUE",
    },
    orderBy: {
      dueDate: "asc",
    },
  });
}
