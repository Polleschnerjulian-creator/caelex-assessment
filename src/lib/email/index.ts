import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { prisma } from "@/lib/prisma";
import {
  getResendClient,
  isResendConfigured,
  getEmailFrom,
  getEmailFromName,
} from "./resend-client";
import type {
  EmailConfig,
  SendEmailOptions,
  EmailResult,
  DeadlineReminderData,
  DocumentExpiryData,
  WeeklyDigestData,
  IncidentAlertData,
} from "./types";
import { renderDeadlineReminder } from "./templates/deadline-reminder";
import { renderDocumentExpiry } from "./templates/document-expiry";
import { renderWeeklyDigest } from "./templates/weekly-digest";
import { renderIncidentAlert } from "./templates/incident-alert";

// ─── Email Provider Type ───

type EmailProvider = "resend" | "smtp" | "none";

function getEmailProvider(): EmailProvider {
  if (isResendConfigured()) {
    return "resend";
  }
  if (isSmtpConfigured()) {
    return "smtp";
  }
  return "none";
}

// ─── SMTP Configuration (Fallback) ───

function isSmtpConfigured(): boolean {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

function getSmtpConfig(): EmailConfig {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM || "noreply@caelex.io";
  const fromName = process.env.SMTP_FROM_NAME || "Caelex Compliance";

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP configuration incomplete. Check SMTP_HOST, SMTP_USER, SMTP_PASS environment variables.",
    );
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    from: { name: fromName, email: fromEmail },
  };
}

// ─── SMTP Transporter Singleton ───

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    const config = getSmtpConfig();
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }
  return transporter;
}

// ─── Email Validation ───

export function isEmailConfigured(): boolean {
  return getEmailProvider() !== "none";
}

export async function verifyEmailConnection(): Promise<boolean> {
  const provider = getEmailProvider();

  if (provider === "resend") {
    // Resend doesn't require connection verification
    return true;
  }

  if (provider === "smtp") {
    try {
      const transport = getTransporter();
      await transport.verify();
      return true;
    } catch (error) {
      console.error("SMTP connection verification failed:", error);
      return false;
    }
  }

  return false;
}

// ─── Resend Send Function ───

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  text?: string,
): Promise<EmailResult> {
  const resend = getResendClient();

  if (!resend) {
    return { success: false, error: "Resend not configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${getEmailFromName()} <${getEmailFrom()}>`,
      to: [to],
      subject,
      html,
      text: text || stripHtml(html),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

// ─── SMTP Send Function ───

async function sendViaSmtp(
  to: string,
  subject: string,
  html: string,
  text?: string,
): Promise<EmailResult> {
  try {
    const config = getSmtpConfig();
    const transport = getTransporter();

    const result = await transport.sendMail({
      from: `"${config.from.name}" <${config.from.email}>`,
      to,
      subject,
      html,
      text: text || stripHtml(html),
    });

    return { success: true, messageId: result.messageId };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

// ─── Core Send Function ───

export async function sendEmail(
  options: SendEmailOptions,
): Promise<EmailResult> {
  const {
    to,
    subject,
    html,
    text,
    userId,
    notificationType,
    entityType,
    entityId,
    metadata,
  } = options;

  const provider = getEmailProvider();

  // Check if email is configured
  if (provider === "none") {
    console.warn("Email not configured, skipping send");
    return { success: false, error: "Email not configured" };
  }

  let result: EmailResult;

  try {
    // Use Resend as primary provider, SMTP as fallback
    if (provider === "resend") {
      result = await sendViaResend(to, subject, html, text);
    } else {
      result = await sendViaSmtp(to, subject, html, text);
    }

    // Log notification
    if (userId && notificationType && entityType) {
      await logNotification({
        userId,
        recipientEmail: to,
        notificationType,
        entityType,
        entityId: entityId || null,
        subject,
        status: result.success ? "sent" : "failed",
        errorMessage: result.error,
        metadata: metadata ? JSON.stringify(metadata) : null,
        provider,
      });
    }

    if (!result.success) {
      console.error(`Failed to send email via ${provider}:`, result.error);
    }

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`Failed to send email via ${provider}:`, errorMessage);

    // Log failed send
    if (userId && notificationType && entityType) {
      await logNotification({
        userId,
        recipientEmail: to,
        notificationType,
        entityType,
        entityId: entityId || null,
        subject,
        status: "failed",
        errorMessage,
        metadata: metadata ? JSON.stringify(metadata) : null,
        provider,
      });
    }

    return { success: false, error: errorMessage };
  }
}

// ─── Notification Logging ───

interface LogNotificationParams {
  userId: string;
  recipientEmail: string;
  notificationType: string;
  entityType: string;
  entityId: string | null;
  subject: string;
  status: string;
  errorMessage?: string;
  metadata?: string | null;
  provider?: string;
}

async function logNotification(params: LogNotificationParams): Promise<void> {
  try {
    await prisma.notificationLog.create({
      data: {
        userId: params.userId,
        recipientEmail: params.recipientEmail,
        notificationType: params.notificationType,
        entityType: params.entityType,
        entityId: params.entityId,
        subject: params.subject,
        status: params.status,
        errorMessage: params.errorMessage,
        metadata: params.metadata,
      },
    });
  } catch (error) {
    console.error("Failed to log notification:", error);
  }
}

// ─── Utility Functions ───

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Specialized Email Functions ───

export async function sendDeadlineReminder(
  to: string,
  userId: string,
  deadlineId: string,
  data: DeadlineReminderData,
): Promise<EmailResult> {
  const { html, subject } = await renderDeadlineReminder(data);

  return sendEmail({
    to,
    subject,
    html,
    userId,
    notificationType: "deadline_reminder",
    entityType: "deadline",
    entityId: deadlineId,
    metadata: { daysRemaining: data.daysRemaining, priority: data.priority },
  });
}

export async function sendDocumentExpiryAlert(
  to: string,
  userId: string,
  documentId: string,
  data: DocumentExpiryData,
): Promise<EmailResult> {
  const { html, subject } = await renderDocumentExpiry(data);

  return sendEmail({
    to,
    subject,
    html,
    userId,
    notificationType: "document_expiry",
    entityType: "document",
    entityId: documentId,
    metadata: {
      daysUntilExpiry: data.daysUntilExpiry,
      category: data.category,
    },
  });
}

export async function sendWeeklyDigest(
  to: string,
  userId: string,
  data: WeeklyDigestData,
): Promise<EmailResult> {
  const { html, subject } = await renderWeeklyDigest(data);

  return sendEmail({
    to,
    subject,
    html,
    userId,
    notificationType: "weekly_digest",
    entityType: "summary",
    metadata: {
      deadlineCount: data.upcomingDeadlines.length,
      documentCount: data.expiringDocuments.length,
      overdueCount: data.overdueItems.length,
    },
  });
}

export async function sendIncidentAlert(
  to: string,
  userId: string,
  incidentId: string,
  data: IncidentAlertData,
): Promise<EmailResult> {
  const { html, subject } = await renderIncidentAlert(data);

  return sendEmail({
    to,
    subject,
    html,
    userId,
    notificationType: "incident_alert",
    entityType: "incident",
    entityId: incidentId,
    metadata: { severity: data.severity, category: data.category },
  });
}

// ─── Batch Sending ───

export async function sendBatchEmails(
  emails: SendEmailOptions[],
  options?: { maxConcurrent?: number; delayMs?: number },
): Promise<{ sent: number; failed: number; errors: string[] }> {
  // Resend has rate limits: 10 emails/second for free tier, 100/second for paid
  const maxConcurrent = options?.maxConcurrent || 5;
  const delayMs = options?.delayMs || 150; // Slightly higher delay for Resend rate limits

  const results = { sent: 0, failed: 0, errors: [] as string[] };

  // Process in batches
  for (let i = 0; i < emails.length; i += maxConcurrent) {
    const batch = emails.slice(i, i + maxConcurrent);

    const batchResults = await Promise.all(
      batch.map((email) => sendEmail(email)),
    );

    for (const result of batchResults) {
      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
        if (result.error) {
          results.errors.push(result.error);
        }
      }
    }

    // Delay between batches to avoid rate limiting
    if (i + maxConcurrent < emails.length && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

// ─── Test Email Function ───

export async function sendTestEmail(to: string): Promise<EmailResult> {
  const provider = getEmailProvider();

  return sendEmail({
    to,
    subject: `[Caelex] Test Email - ${provider.toUpperCase()} Provider`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px;">
        <h1 style="color: #3B82F6;">Caelex Email Test</h1>
        <p>This is a test email to verify your email configuration.</p>
        <p><strong>Provider:</strong> ${provider}</p>
        <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 14px;">
          If you received this email, your Caelex email configuration is working correctly.
        </p>
      </div>
    `,
  });
}

// ─── Re-export types ───

export type { SendEmailOptions, EmailResult } from "./types";
