/**
 * Honey Token Service
 *
 * Manages fake credentials/data planted to detect unauthorized access.
 * When an attacker accesses a honey token, it triggers alerts and logs the intrusion.
 *
 * Use cases:
 * - Fake API keys in .env.backup files
 * - Fake AWS credentials in config files
 * - Decoy database URLs in documentation
 * - Trap credentials in leaked documents
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import { logSecurityEvent } from "@/lib/services/security-audit-service";
import {
  SecurityAuditEventType,
  RiskLevel,
  HoneyTokenType,
} from "@prisma/client";

interface CreateHoneyTokenInput {
  tokenType: HoneyTokenType;
  name: string;
  description?: string;
  tokenValue: string;
  alertEmail?: string;
  alertWebhookUrl?: string;
  contextPath?: string;
  contextType?: string;
}

interface TriggerContext {
  ipAddress?: string;
  userAgent?: string;
  requestPath?: string;
  requestMethod?: string;
  requestHeaders?: Record<string, string>;
  city?: string;
  country?: string;
  countryCode?: string;
}

/**
 * Create a new honey token.
 */
export async function createHoneyToken(input: CreateHoneyTokenInput) {
  // Generate a hash for quick lookup
  const encoder = new TextEncoder();
  const data = encoder.encode(input.tokenValue);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const tokenHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return prisma.honeyToken.create({
    data: {
      tokenType: input.tokenType,
      name: input.name,
      description: input.description,
      tokenValue: input.tokenValue,
      tokenHash,
      alertEmail: input.alertEmail,
      alertWebhookUrl: input.alertWebhookUrl,
      contextPath: input.contextPath,
      contextType: input.contextType,
    },
  });
}

/**
 * Check if a value matches any active honey token.
 * Call this when processing API keys, credentials, or any sensitive input.
 * Returns the triggered honey token if found.
 */
export async function checkForHoneyToken(
  value: string,
  context: TriggerContext = {},
): Promise<{ triggered: boolean; tokenId?: string; tokenName?: string }> {
  if (!value) return { triggered: false };

  // Check against all active honey tokens
  // For production scale, use tokenHash index lookup
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const valueHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const honeyToken = await prisma.honeyToken.findFirst({
    where: {
      tokenHash: valueHash,
      isActive: true,
    },
  });

  if (honeyToken) {
    // Record the trigger
    await recordHoneyTokenTrigger(honeyToken.id, context);
    return {
      triggered: true,
      tokenId: honeyToken.id,
      tokenName: honeyToken.name,
    };
  }

  return { triggered: false };
}

/**
 * Record a honey token trigger event.
 */
async function recordHoneyTokenTrigger(
  honeyTokenId: string,
  context: TriggerContext,
): Promise<void> {
  // Sanitize headers - remove sensitive info but keep useful attack context
  const sanitizedHeaders = context.requestHeaders
    ? sanitizeHeaders(context.requestHeaders)
    : undefined;

  // Create trigger record
  await prisma.honeyTokenTrigger.create({
    data: {
      honeyTokenId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      requestPath: context.requestPath,
      requestMethod: context.requestMethod,
      requestHeaders: sanitizedHeaders,
      city: context.city,
      country: context.country,
      countryCode: context.countryCode,
      severity: "HIGH",
    },
  });

  // Update honey token statistics
  const honeyToken = await prisma.honeyToken.update({
    where: { id: honeyTokenId },
    data: {
      triggerCount: { increment: 1 },
      lastTriggeredAt: new Date(),
      lastTriggeredIp: context.ipAddress,
      lastTriggeredUa: context.userAgent,
    },
  });

  // Log to security audit
  await logSecurityEvent({
    event: SecurityAuditEventType.HONEY_TOKEN_TRIGGERED,
    description: `Honey token "${honeyToken.name}" (${honeyToken.tokenType}) was accessed`,
    riskLevel: RiskLevel.CRITICAL,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    city: context.city,
    country: context.country,
    targetType: "honey_token",
    targetId: honeyTokenId,
    metadata: {
      tokenName: honeyToken.name,
      tokenType: honeyToken.tokenType,
      contextPath: honeyToken.contextPath,
      requestPath: context.requestPath,
    },
  });

  // Send alerts asynchronously (don't await to not slow down response)
  sendHoneyTokenAlerts(honeyToken, context).catch(console.error);
}

/**
 * Send alerts for honey token trigger.
 */
async function sendHoneyTokenAlerts(
  honeyToken: {
    id: string;
    name: string;
    tokenType: string;
    alertEmail?: string | null;
    alertWebhookUrl?: string | null;
  },
  context: TriggerContext,
): Promise<void> {
  const alertPayload = {
    event: "HONEY_TOKEN_TRIGGERED",
    tokenId: honeyToken.id,
    tokenName: honeyToken.name,
    tokenType: honeyToken.tokenType,
    triggeredAt: new Date().toISOString(),
    context: {
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      requestPath: context.requestPath,
      location:
        context.city && context.country
          ? `${context.city}, ${context.country}`
          : undefined,
    },
  };

  // Send email alert if configured
  if (honeyToken.alertEmail) {
    try {
      const { sendEmail } = await import("@/lib/email");
      await sendEmail({
        to: honeyToken.alertEmail,
        subject: `SECURITY ALERT: Honey Token "${honeyToken.name}" Triggered`,
        html: `
          <h2 style="color: #dc2626;">Security Alert: Honey Token Triggered</h2>
          <p>A honey token was accessed, indicating potential unauthorized access:</p>
          <ul>
            <li><strong>Token Name:</strong> ${honeyToken.name}</li>
            <li><strong>Token Type:</strong> ${honeyToken.tokenType}</li>
            <li><strong>Time:</strong> ${new Date().toISOString()}</li>
            <li><strong>IP Address:</strong> ${context.ipAddress || "Unknown"}</li>
            <li><strong>Location:</strong> ${context.city && context.country ? `${context.city}, ${context.country}` : "Unknown"}</li>
            <li><strong>Request Path:</strong> ${context.requestPath || "N/A"}</li>
          </ul>
          <p><strong>Immediate Action Required:</strong> Review your security logs and consider this a potential breach indicator.</p>
        `,
      });
    } catch (error) {
      console.error("Failed to send honey token email alert:", error);
    }
  }

  // Send webhook alert if configured
  if (honeyToken.alertWebhookUrl) {
    try {
      await fetch(honeyToken.alertWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(alertPayload),
      });
    } catch (error) {
      console.error("Failed to send honey token webhook alert:", error);
    }
  }
}

/**
 * Sanitize request headers for storage - remove auth tokens but keep attack indicators.
 */
function sanitizeHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const sensitiveHeaders = [
    "authorization",
    "cookie",
    "set-cookie",
    "x-auth-token",
    "x-api-key",
  ];

  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * List all honey tokens with statistics.
 */
export async function listHoneyTokens() {
  return prisma.honeyToken.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { triggers: true },
      },
    },
  });
}

/**
 * Get honey token details with recent triggers.
 */
export async function getHoneyTokenDetails(id: string) {
  return prisma.honeyToken.findUnique({
    where: { id },
    include: {
      triggers: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
}

/**
 * Update honey token settings.
 */
export async function updateHoneyToken(
  id: string,
  data: {
    name?: string;
    description?: string;
    alertEmail?: string | null;
    alertWebhookUrl?: string | null;
    isActive?: boolean;
  },
) {
  return prisma.honeyToken.update({
    where: { id },
    data,
  });
}

/**
 * Delete a honey token and its triggers.
 */
export async function deleteHoneyToken(id: string) {
  return prisma.honeyToken.delete({
    where: { id },
  });
}

/**
 * Generate a realistic-looking fake API key.
 */
export function generateFakeApiKey(prefix = "caelex"): string {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = `${prefix}_fake_`;
  for (let i = 0; i < 32; i++) {
    key += charset[Math.floor(Math.random() * charset.length)];
  }
  return key;
}

/**
 * Generate a realistic-looking fake AWS credential.
 */
export function generateFakeAwsCredential(
  type: "access_key" | "secret",
): string {
  if (type === "access_key") {
    // AWS access keys start with AKIA
    let key = "AKIAFAKE";
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    for (let i = 0; i < 12; i++) {
      key += charset[Math.floor(Math.random() * charset.length)];
    }
    return key;
  } else {
    // AWS secret keys are 40 chars, base64-like
    const charset =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let secret = "";
    for (let i = 0; i < 40; i++) {
      secret += charset[Math.floor(Math.random() * charset.length)];
    }
    return secret;
  }
}

/**
 * Generate a realistic-looking fake database URL.
 */
export function generateFakeDatabaseUrl(
  type: "postgres" | "mysql" = "postgres",
): string {
  const user = "admin_backup";
  const pass = `fake${Math.random().toString(36).slice(2, 10)}`;
  const host = `db-backup-${Math.random().toString(36).slice(2, 8)}.internal.example.com`;

  if (type === "postgres") {
    return `postgresql://${user}:${pass}@${host}:5432/caelex_backup`;
  } else {
    return `mysql://${user}:${pass}@${host}:3306/caelex_backup`;
  }
}
