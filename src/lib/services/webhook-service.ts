/**
 * Webhook Service
 * Manages webhook configuration, delivery, and retry logic
 */

import { prisma } from "@/lib/prisma";
import {
  Webhook,
  WebhookDelivery,
  WebhookDeliveryStatus,
  Prisma,
} from "@prisma/client";
import crypto from "crypto";

// ─── Types ───

export interface CreateWebhookInput {
  organizationId: string;
  name: string;
  url: string;
  events: string[];
  headers?: Record<string, string>;
}

export interface WebhookPayload {
  id: string;
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  responseTimeMs?: number;
  error?: string;
}

// ─── Constants ───

const WEBHOOK_TIMEOUT_MS = 10000; // 10 seconds
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [60000, 300000, 900000]; // 1min, 5min, 15min

// Available webhook events
export const WEBHOOK_EVENTS = {
  // Compliance
  "compliance.score_changed": "Compliance score changed",
  "compliance.status_changed": "Compliance status changed",
  "compliance.action_required": "Compliance action required",

  // Spacecraft
  "spacecraft.created": "Spacecraft created",
  "spacecraft.updated": "Spacecraft updated",
  "spacecraft.status_changed": "Spacecraft status changed",

  // Authorization
  "authorization.submitted": "Authorization submitted",
  "authorization.approved": "Authorization approved",
  "authorization.rejected": "Authorization rejected",
  "authorization.status_changed": "Authorization status changed",

  // Reports
  "report.generated": "Report generated",
  "report.submitted": "Report submitted to NCA",
  "report.acknowledged": "Report acknowledged by NCA",

  // Incidents
  "incident.created": "Incident created",
  "incident.updated": "Incident updated",
  "incident.escalated": "Incident escalated",
  "incident.resolved": "Incident resolved",

  // Deadlines
  "deadline.approaching": "Deadline approaching",
  "deadline.overdue": "Deadline overdue",
  "deadline.completed": "Deadline completed",

  // Documents
  "document.uploaded": "Document uploaded",
  "document.approved": "Document approved",
  "document.rejected": "Document rejected",

  // Organization
  "member.joined": "Member joined organization",
  "member.left": "Member left organization",
  "member.role_changed": "Member role changed",
} as const;

export type WebhookEvent = keyof typeof WEBHOOK_EVENTS;

// ─── Webhook CRUD ───

/**
 * Create a new webhook
 */
export async function createWebhook(
  input: CreateWebhookInput,
): Promise<Webhook> {
  // Generate secret for signature verification
  const secret = generateWebhookSecret();

  return prisma.webhook.create({
    data: {
      organizationId: input.organizationId,
      name: input.name,
      url: input.url,
      secret,
      events: input.events,
      headers: input.headers as Prisma.InputJsonValue,
      isActive: true,
    },
  });
}

/**
 * Get all webhooks for an organization
 */
export async function getOrganizationWebhooks(
  organizationId: string,
): Promise<Webhook[]> {
  return prisma.webhook.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get a single webhook by ID
 */
export async function getWebhookById(
  webhookId: string,
  organizationId: string,
): Promise<Webhook | null> {
  return prisma.webhook.findFirst({
    where: { id: webhookId, organizationId },
  });
}

/**
 * Update a webhook
 */
export async function updateWebhook(
  webhookId: string,
  organizationId: string,
  updates: {
    name?: string;
    url?: string;
    events?: string[];
    headers?: Record<string, string>;
    isActive?: boolean;
  },
): Promise<Webhook> {
  return prisma.webhook.update({
    where: { id: webhookId, organizationId },
    data: {
      ...updates,
      headers: updates.headers as Prisma.InputJsonValue,
    },
  });
}

/**
 * Delete a webhook
 */
export async function deleteWebhook(
  webhookId: string,
  organizationId: string,
): Promise<void> {
  await prisma.webhook.delete({
    where: { id: webhookId, organizationId },
  });
}

/**
 * Regenerate webhook secret
 */
export async function regenerateWebhookSecret(
  webhookId: string,
  organizationId: string,
): Promise<string> {
  const newSecret = generateWebhookSecret();

  await prisma.webhook.update({
    where: { id: webhookId, organizationId },
    data: { secret: newSecret },
  });

  return newSecret;
}

// ─── Webhook Delivery ───

/**
 * Trigger webhooks for an event
 */
export async function triggerWebhooks(
  organizationId: string,
  event: string,
  data: Record<string, unknown>,
): Promise<void> {
  // Find all active webhooks subscribed to this event
  const webhooks = await prisma.webhook.findMany({
    where: {
      organizationId,
      isActive: true,
      events: { has: event },
    },
  });

  // Create delivery records and trigger async
  for (const webhook of webhooks) {
    const payload: WebhookPayload = {
      id: crypto.randomUUID(),
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    // Create delivery record
    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        event,
        payload: payload as unknown as Prisma.InputJsonValue,
        status: WebhookDeliveryStatus.PENDING,
        attempts: 0,
      },
    });

    // Trigger delivery (async, don't await)
    deliverWebhook(webhook, delivery, payload).catch((err) => {
      console.error(`Webhook delivery error for ${webhook.id}:`, err);
    });
  }
}

/**
 * Deliver a webhook
 */
async function deliverWebhook(
  webhook: Webhook,
  delivery: WebhookDelivery,
  payload: WebhookPayload,
): Promise<void> {
  const startTime = Date.now();

  try {
    // Generate signature
    const signature = generateSignature(
      JSON.stringify(payload),
      webhook.secret,
    );

    // Build headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Webhook-Id": webhook.id,
      "X-Webhook-Event": payload.event,
      "X-Webhook-Signature": signature,
      "X-Webhook-Timestamp": payload.timestamp,
      ...((webhook.headers as Record<string, string>) || {}),
    };

    // Make request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    const response = await fetch(webhook.url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseTimeMs = Date.now() - startTime;
    const responseBody = await response.text().catch(() => "");

    if (response.ok) {
      // Success
      await prisma.$transaction([
        prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: WebhookDeliveryStatus.DELIVERED,
            statusCode: response.status,
            responseBody: responseBody.slice(0, 1000), // Limit response size
            responseTimeMs,
            attempts: delivery.attempts + 1,
            deliveredAt: new Date(),
          },
        }),
        prisma.webhook.update({
          where: { id: webhook.id },
          data: {
            successCount: { increment: 1 },
            lastTriggeredAt: new Date(),
            lastSuccessAt: new Date(),
            lastError: null,
          },
        }),
      ]);
    } else {
      // Failed - schedule retry
      await handleDeliveryFailure(
        webhook,
        delivery,
        response.status,
        responseBody,
        responseTimeMs,
      );
    }
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    await handleDeliveryFailure(
      webhook,
      delivery,
      undefined,
      errorMessage,
      responseTimeMs,
    );
  }
}

/**
 * Handle delivery failure and schedule retry
 */
async function handleDeliveryFailure(
  webhook: Webhook,
  delivery: WebhookDelivery,
  statusCode: number | undefined,
  errorMessage: string,
  responseTimeMs: number,
): Promise<void> {
  const newAttempts = delivery.attempts + 1;
  const shouldRetry = newAttempts < MAX_RETRY_ATTEMPTS;

  const status = shouldRetry
    ? WebhookDeliveryStatus.RETRYING
    : WebhookDeliveryStatus.FAILED;

  const nextRetryAt = shouldRetry
    ? new Date(Date.now() + RETRY_DELAYS_MS[newAttempts - 1])
    : null;

  await prisma.$transaction([
    prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status,
        statusCode,
        responseBody: errorMessage.slice(0, 1000),
        responseTimeMs,
        attempts: newAttempts,
        nextRetryAt,
        errorMessage: errorMessage.slice(0, 500),
      },
    }),
    prisma.webhook.update({
      where: { id: webhook.id },
      data: {
        failureCount: { increment: 1 },
        lastTriggeredAt: new Date(),
        lastFailureAt: new Date(),
        lastError: errorMessage.slice(0, 500),
      },
    }),
  ]);
}

/**
 * Retry pending webhook deliveries
 */
export async function retryPendingDeliveries(): Promise<number> {
  const pendingDeliveries = await prisma.webhookDelivery.findMany({
    where: {
      status: WebhookDeliveryStatus.RETRYING,
      nextRetryAt: { lte: new Date() },
    },
    include: {
      webhook: true,
    },
  });

  let retriedCount = 0;

  for (const delivery of pendingDeliveries) {
    if (!delivery.webhook.isActive) continue;

    const payload = delivery.payload as unknown as WebhookPayload;
    await deliverWebhook(delivery.webhook, delivery, payload);
    retriedCount++;
  }

  return retriedCount;
}

// ─── Delivery History ───

/**
 * Get delivery history for a webhook
 */
export async function getWebhookDeliveries(
  webhookId: string,
  page: number = 1,
  pageSize: number = 20,
): Promise<{
  deliveries: WebhookDelivery[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const [deliveries, total] = await Promise.all([
    prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.webhookDelivery.count({ where: { webhookId } }),
  ]);

  return { deliveries, total, page, pageSize };
}

/**
 * Get a single delivery by ID
 */
export async function getDeliveryById(
  deliveryId: string,
): Promise<WebhookDelivery | null> {
  return prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
  });
}

/**
 * Manually retry a failed delivery
 */
export async function retryDelivery(deliveryId: string): Promise<void> {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { webhook: true },
  });

  if (!delivery) {
    throw new Error("Delivery not found");
  }

  if (delivery.status === WebhookDeliveryStatus.DELIVERED) {
    throw new Error("Delivery already succeeded");
  }

  // Reset for retry
  await prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: {
      status: WebhookDeliveryStatus.PENDING,
      attempts: 0,
      nextRetryAt: null,
      errorMessage: null,
    },
  });

  const payload = delivery.payload as unknown as WebhookPayload;
  await deliverWebhook(delivery.webhook, delivery, payload);
}

// ─── Test Webhook ───

/**
 * Send a test event to a webhook
 */
export async function testWebhook(
  webhookId: string,
  organizationId: string,
): Promise<DeliveryResult> {
  const webhook = await getWebhookById(webhookId, organizationId);
  if (!webhook) {
    return { success: false, error: "Webhook not found" };
  }

  const testPayload: WebhookPayload = {
    id: crypto.randomUUID(),
    event: "test.ping",
    timestamp: new Date().toISOString(),
    data: {
      message: "This is a test webhook delivery from Caelex",
      webhookId: webhook.id,
      webhookName: webhook.name,
    },
  };

  const startTime = Date.now();

  try {
    const signature = generateSignature(
      JSON.stringify(testPayload),
      webhook.secret,
    );

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Webhook-Id": webhook.id,
      "X-Webhook-Event": testPayload.event,
      "X-Webhook-Signature": signature,
      "X-Webhook-Timestamp": testPayload.timestamp,
      ...((webhook.headers as Record<string, string>) || {}),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    const response = await fetch(webhook.url, {
      method: "POST",
      headers,
      body: JSON.stringify(testPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseTimeMs = Date.now() - startTime;

    return {
      success: response.ok,
      statusCode: response.status,
      responseTimeMs,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      success: false,
      responseTimeMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ─── Helpers ───

/**
 * Generate a secure webhook secret
 */
function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString("base64url")}`;
}

/**
 * Generate HMAC signature for webhook payload
 */
function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Verify webhook signature (for incoming webhooks)
 */
export function verifySignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expectedSignature = generateSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
}

// ─── Cleanup ───

/**
 * Clean up old webhook deliveries
 */
export async function cleanupOldDeliveries(
  daysOld: number = 30,
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.webhookDelivery.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
      status: WebhookDeliveryStatus.DELIVERED,
    },
  });

  return result.count;
}

// ─── Webhook Stats ───

/**
 * Get webhook statistics
 */
export async function getWebhookStats(webhookId: string): Promise<{
  totalDeliveries: number;
  successRate: number;
  avgResponseTime: number;
  deliveriesByStatus: Record<WebhookDeliveryStatus, number>;
  recentFailures: WebhookDelivery[];
}> {
  const [total, byStatus, deliveries, failures] = await Promise.all([
    prisma.webhookDelivery.count({ where: { webhookId } }),
    prisma.webhookDelivery.groupBy({
      by: ["status"],
      where: { webhookId },
      _count: true,
    }),
    prisma.webhookDelivery.findMany({
      where: { webhookId, status: WebhookDeliveryStatus.DELIVERED },
      select: { responseTimeMs: true },
    }),
    prisma.webhookDelivery.findMany({
      where: { webhookId, status: WebhookDeliveryStatus.FAILED },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const deliveriesByStatus = {} as Record<WebhookDeliveryStatus, number>;
  byStatus.forEach((s) => {
    deliveriesByStatus[s.status] = s._count;
  });

  const successCount = deliveriesByStatus[WebhookDeliveryStatus.DELIVERED] || 0;
  const successRate = total > 0 ? (successCount / total) * 100 : 0;

  const avgResponseTime =
    deliveries.length > 0
      ? Math.round(
          deliveries.reduce((sum, d) => sum + (d.responseTimeMs || 0), 0) /
            deliveries.length,
        )
      : 0;

  return {
    totalDeliveries: total,
    successRate: Math.round(successRate * 100) / 100,
    avgResponseTime,
    deliveriesByStatus,
    recentFailures: failures,
  };
}
