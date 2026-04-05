import "server-only";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

interface RRuleResult {
  nextDate: Date;
  frequency: string;
}

/**
 * Parse a simple RRULE string and compute the next occurrence after a given date.
 * Supports: FREQ=YEARLY, FREQ=QUARTERLY, FREQ=MONTHLY
 */
export function parseRRule(rrule: string, afterDate: Date): RRuleResult | null {
  if (!rrule) return null;

  const parts: Record<string, string> = {};
  for (const segment of rrule.split(";")) {
    const [key, value] = segment.split("=");
    parts[key] = value;
  }

  const freq = parts["FREQ"];
  if (!freq) return null;

  const now = new Date(afterDate);

  switch (freq) {
    case "YEARLY": {
      const month = parseInt(parts["BYMONTH"] || "1") - 1; // 0-indexed
      const day = parseInt(parts["BYMONTHDAY"] || "1");

      let next = new Date(now.getFullYear(), month, day);
      if (next <= now) {
        next = new Date(now.getFullYear() + 1, month, day);
      }
      return { nextDate: next, frequency: "yearly" };
    }

    case "QUARTERLY": {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const nextQuarterMonth = (currentQuarter + 1) * 3;
      const day = parseInt(parts["BYMONTHDAY"] || "1");

      let next = new Date(now.getFullYear(), nextQuarterMonth, day);
      if (next <= now) {
        next = new Date(now.getFullYear(), nextQuarterMonth + 3, day);
      }
      return { nextDate: next, frequency: "quarterly" };
    }

    case "MONTHLY": {
      const day = parseInt(parts["BYMONTHDAY"] || "1");

      let next = new Date(now.getFullYear(), now.getMonth(), day);
      if (next <= now) {
        next = new Date(now.getFullYear(), now.getMonth() + 1, day);
      }
      return { nextDate: next, frequency: "monthly" };
    }

    default:
      return null;
  }
}

/**
 * Process all recurring deadlines: find completed ones with RRULE,
 * create the next occurrence.
 */
export async function processRecurringDeadlines(): Promise<{
  processed: number;
  created: number;
  errors: number;
}> {
  let processed = 0;
  let created = 0;
  let errors = 0;

  // Find all completed deadlines that have a recurrence rule
  const completedRecurring = await prisma.deadline.findMany({
    where: {
      status: "COMPLETED",
      recurrenceRule: { not: null },
    },
    take: 200, // Process in batches
  });

  for (const deadline of completedRecurring) {
    processed++;

    try {
      const nextOccurrence = parseRRule(
        deadline.recurrenceRule!,
        deadline.dueDate,
      );
      if (!nextOccurrence) continue;

      // Check if the next occurrence already exists
      const existing = await prisma.deadline.findFirst({
        where: {
          userId: deadline.userId,
          organizationId: deadline.organizationId,
          title: deadline.title,
          dueDate: nextOccurrence.nextDate,
          moduleSource: deadline.moduleSource,
        },
      });

      if (existing) continue; // Already created

      // Create the next occurrence
      await prisma.deadline.create({
        data: {
          userId: deadline.userId,
          organizationId: deadline.organizationId,
          title: deadline.title,
          description: deadline.description,
          dueDate: nextOccurrence.nextDate,
          category: deadline.category,
          priority: deadline.priority,
          status: "UPCOMING",
          moduleSource: deadline.moduleSource,
          regulatoryRef: deadline.regulatoryRef,
          recurrenceRule: deadline.recurrenceRule, // Carry forward the rule
          isRecurring: true,
          parentId: deadline.id,
          reminderDays: deadline.reminderDays,
        },
      });

      created++;
      logger.info(
        `[RRULE] Created next occurrence of "${deadline.title}" for ${nextOccurrence.nextDate.toISOString().split("T")[0]}`,
      );
    } catch (err) {
      errors++;
      logger.warn(`[RRULE] Failed to process deadline ${deadline.id}`, err);
    }
  }

  return { processed, created, errors };
}
