import { prisma } from "@/lib/prisma";
import { sendDeadlineReminder } from "@/lib/email";
import { getDaysBetween, wasReminderSent, startOfDay } from "./index";
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
    });

    logger.info(`Processing ${deadlines.length} deadlines for reminders`);

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
  if (notificationMethod === "portal") {
    result.skipped++;
    return false;
  }

  // Determine recipient email
  const recipientEmail = config?.designatedContactEmail || user.email;
  if (!recipientEmail) {
    result.skipped++;
    return false;
  }

  // Calculate days until due
  const today = startOfDay(new Date());
  const dueDate = startOfDay(new Date(deadline.dueDate));
  const daysUntilDue = getDaysBetween(dueDate, today);

  // Check if we should send a reminder based on reminderDays
  const reminderDays = deadline.reminderDays || [30, 14, 7, 3, 1];
  const remindersSent = deadline.remindersSent || [];

  // Find which reminder day we should check
  const matchingReminderDay = reminderDays.find((day) => {
    // Check if the number of days until due matches a reminder day
    // Also handle overdue cases (negative days)
    if (daysUntilDue === day) {
      // Check if we already sent a reminder for this threshold
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
  const baseUrl = process.env.AUTH_URL || "https://caelex.io";
  const dashboardUrl = `${baseUrl}/dashboard/modules/timeline/deadlines/${deadline.id}`;

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
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  return prisma.deadline.findMany({
    where: {
      userId,
      status: {
        in: ["UPCOMING", "DUE_SOON"],
      },
      dueDate: {
        lte: futureDate,
        gte: new Date(),
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
