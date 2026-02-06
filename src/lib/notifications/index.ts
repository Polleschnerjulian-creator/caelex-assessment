// Notification System Entry Point

export {
  processDeadlineReminders,
  type DeadlineProcessingResult,
} from "./deadline-processor";
export {
  processDocumentExpiry,
  type DocumentExpiryResult,
} from "./document-processor";

// Notification types
export type NotificationChannel = "email" | "portal" | "both";

export interface NotificationPreferences {
  enableAutoReminders: boolean;
  notificationMethod: NotificationChannel;
  reminderDaysAdvance: number;
  designatedContactEmail?: string;
  communicationLanguage: string;
}

export interface ProcessingStats {
  processed: number;
  sent: number;
  skipped: number;
  errors: string[];
  startedAt: Date;
  completedAt: Date;
}

// Utility function to get days between two dates
export function getDaysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  const diffTime = new Date(date1).getTime() - new Date(date2).getTime();
  return Math.ceil(diffTime / oneDay);
}

// Utility function to check if a date is today
export function isToday(date: Date): boolean {
  const today = new Date();
  const checkDate = new Date(date);
  return (
    checkDate.getFullYear() === today.getFullYear() &&
    checkDate.getMonth() === today.getMonth() &&
    checkDate.getDate() === today.getDate()
  );
}

// Utility function to get the start of a day
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Utility function to check if reminder was already sent for a specific day threshold
export function wasReminderSent(
  remindersSent: Date[],
  dueDate: Date,
  reminderDay: number,
): boolean {
  const targetDate = new Date(dueDate);
  targetDate.setDate(targetDate.getDate() - reminderDay);

  return remindersSent.some((sent) => {
    const sentDate = startOfDay(new Date(sent));
    const target = startOfDay(targetDate);
    return sentDate.getTime() === target.getTime();
  });
}
