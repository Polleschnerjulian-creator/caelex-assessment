import { prisma } from "@/lib/prisma";
import { sendDocumentExpiryAlert } from "@/lib/email";
import { getDaysBetween, startOfDay } from "./index";
import type { Document, User, SupervisionConfig } from "@prisma/client";

export interface DocumentExpiryResult {
  processed: number;
  sent: number;
  skipped: number;
  errors: string[];
  documentsSent: string[];
  startedAt: Date;
  completedAt: Date;
}

interface DocumentWithUser extends Document {
  user: User & {
    supervisionConfig: SupervisionConfig | null;
  };
}

// Track sent alerts in memory for this run (since documents don't have remindersSent field)
// In production, you might want to add this field to the Document model
const sentAlerts = new Set<string>();

/**
 * Process document expiry alerts for all users
 * Should be called by the cron job daily
 */
export async function processDocumentExpiry(): Promise<DocumentExpiryResult> {
  const startedAt = new Date();
  const result: DocumentExpiryResult = {
    processed: 0,
    sent: 0,
    skipped: 0,
    errors: [],
    documentsSent: [],
    startedAt,
    completedAt: new Date(),
  };

  try {
    // Find all documents that:
    // 1. Have an expiry date
    // 2. Are not already archived or expired status
    // 3. Are the latest version
    // 4. Expire within the max alert window (90 days) or have already expired (up to 30 days ago)
    const cutoffDatePast = new Date();
    cutoffDatePast.setDate(cutoffDatePast.getDate() - 30); // Include up to 30 days expired

    const cutoffDateFuture = new Date();
    cutoffDateFuture.setDate(cutoffDateFuture.getDate() + 90); // Look ahead 90 days

    const documents = await prisma.document.findMany({
      where: {
        expiryDate: {
          not: null,
          gte: cutoffDatePast,
          lte: cutoffDateFuture,
        },
        isLatest: true,
        status: {
          notIn: ["ARCHIVED", "SUPERSEDED", "REJECTED"],
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

    console.log(`Processing ${documents.length} documents for expiry alerts`);

    // Check for documents that have already been alerted today
    const todayAlerts = await getTodayAlerts();
    for (const alertId of todayAlerts) {
      sentAlerts.add(alertId);
    }

    for (const document of documents) {
      result.processed++;

      try {
        const shouldSend = await processDocument(
          document as DocumentWithUser,
          result,
        );
        if (shouldSend) {
          result.documentsSent.push(document.id);
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        result.errors.push(`Document ${document.id}: ${errorMsg}`);
        console.error(`Error processing document ${document.id}:`, error);
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    result.errors.push(`Global error: ${errorMsg}`);
    console.error("Document expiry processing failed:", error);
  }

  result.completedAt = new Date();
  return result;
}

/**
 * Get alerts that were already sent today for documents
 */
async function getTodayAlerts(): Promise<string[]> {
  const todayStart = startOfDay(new Date());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const logs = await prisma.notificationLog.findMany({
    where: {
      notificationType: "document_expiry",
      sentAt: {
        gte: todayStart,
        lt: todayEnd,
      },
      status: "sent",
    },
    select: {
      entityId: true,
    },
  });

  return logs
    .filter((log) => log.entityId !== null)
    .map((log) => log.entityId as string);
}

/**
 * Process a single document and send alert if needed
 */
async function processDocument(
  document: DocumentWithUser,
  result: DocumentExpiryResult,
): Promise<boolean> {
  const { user } = document;
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

  // Check if expiry date exists
  if (!document.expiryDate) {
    result.skipped++;
    return false;
  }

  // Calculate days until expiry
  const today = startOfDay(new Date());
  const expiryDate = startOfDay(new Date(document.expiryDate));
  const daysUntilExpiry = getDaysBetween(expiryDate, today);

  // Check if we should send an alert based on expiryAlertDays
  const alertDays = document.expiryAlertDays || [90, 30, 14, 7];

  // Check if current days matches any alert threshold
  const shouldAlert =
    alertDays.includes(daysUntilExpiry) || // Exact match
    (daysUntilExpiry <= 0 && daysUntilExpiry >= -7); // Expired within last 7 days

  if (!shouldAlert) {
    result.skipped++;
    return false;
  }

  // Check if we already sent an alert for this document today
  const alertKey = `${document.id}-${today.toISOString().split("T")[0]}`;
  if (sentAlerts.has(document.id)) {
    result.skipped++;
    return false;
  }

  // Build dashboard URL
  const baseUrl = process.env.AUTH_URL || "https://caelex.io";
  const dashboardUrl = `${baseUrl}/dashboard`;

  // Send the alert
  const emailResult = await sendDocumentExpiryAlert(
    recipientEmail,
    user.id,
    document.id,
    {
      recipientName: user.name || "User",
      documentName: document.name,
      expiryDate: document.expiryDate,
      daysUntilExpiry: Math.max(0, daysUntilExpiry),
      category: document.category,
      moduleType: document.moduleType || undefined,
      regulatoryRef: document.regulatoryRef || undefined,
      dashboardUrl,
    },
  );

  if (emailResult.success) {
    sentAlerts.add(document.id);

    // Update document to mark as expired if needed
    if (daysUntilExpiry <= 0 && !document.isExpired) {
      await prisma.document.update({
        where: { id: document.id },
        data: {
          isExpired: true,
          status: "EXPIRED",
        },
      });
    }

    result.sent++;
    return true;
  } else {
    result.errors.push(
      `Failed to send email for document ${document.id}: ${emailResult.error}`,
    );
    return false;
  }
}

/**
 * Get expiring documents for a specific user
 */
export async function getExpiringDocumentsForUser(
  userId: string,
  daysAhead: number = 90,
): Promise<Document[]> {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  return prisma.document.findMany({
    where: {
      userId,
      isLatest: true,
      expiryDate: {
        not: null,
        lte: futureDate,
        gte: new Date(),
      },
      status: {
        notIn: ["ARCHIVED", "SUPERSEDED", "REJECTED", "EXPIRED"],
      },
    },
    orderBy: {
      expiryDate: "asc",
    },
  });
}

/**
 * Get expired documents for a specific user
 */
export async function getExpiredDocumentsForUser(
  userId: string,
): Promise<Document[]> {
  return prisma.document.findMany({
    where: {
      userId,
      isLatest: true,
      OR: [
        { isExpired: true },
        { status: "EXPIRED" },
        {
          expiryDate: {
            lt: new Date(),
          },
        },
      ],
    },
    orderBy: {
      expiryDate: "desc",
    },
  });
}
