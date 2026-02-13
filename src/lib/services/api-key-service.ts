/**
 * API Key Service
 * Manages API key generation, validation, and usage tracking
 */

import { prisma } from "@/lib/prisma";
import { ApiKey, ApiRequest, Prisma } from "@prisma/client";
import crypto from "crypto";
import { logSecurityEvent } from "./security-audit-service";

// ─── Types ───

export interface CreateApiKeyInput {
  organizationId: string;
  name: string;
  scopes: string[];
  rateLimit?: number;
  expiresAt?: Date;
  createdById: string;
}

export interface ApiKeyWithoutSecret {
  id: string;
  organizationId: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  isActive: boolean;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdById: string;
  createdAt: Date;
  revokedAt: Date | null;
  revokedReason: string | null;
  maskedKey: string;
}

export interface ValidateApiKeyResult {
  valid: boolean;
  apiKey?: ApiKey;
  error?: string;
  /** True if authenticated with the previous key during grace period */
  usingPreviousKey?: boolean;
  /** When the previous key will stop working (if usingPreviousKey is true) */
  graceEndsAt?: Date;
}

export interface ApiKeyUsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  requestsByEndpoint: Record<string, number>;
  requestsByDay: { date: string; count: number }[];
}

// ─── Constants ───

const API_KEY_PREFIX = "caelex_";
const API_KEY_LENGTH = 32; // Characters after prefix
const ROTATION_GRACE_PERIOD_HOURS = 48; // Grace period for key rotation

// Available API scopes
export const API_SCOPES = {
  // Compliance
  "read:compliance": "View compliance data and scores",
  "write:compliance": "Update compliance assessments",

  // Spacecraft
  "read:spacecraft": "View spacecraft information",
  "write:spacecraft": "Create and update spacecraft",

  // Reports
  "read:reports": "View reports and submissions",
  "write:reports": "Generate and submit reports",

  // Incidents
  "read:incidents": "View incidents",
  "write:incidents": "Create and update incidents",

  // Deadlines
  "read:deadlines": "View deadlines and timeline",

  // Documents
  "read:documents": "View documents",
  "write:documents": "Upload and manage documents",

  // Organization
  "read:organization": "View organization info",

  // Audit
  "read:audit": "View audit logs",
} as const;

export type ApiScope = keyof typeof API_SCOPES;

// ─── Key Generation ───

/**
 * Generate a new API key
 */
export async function createApiKey(
  input: CreateApiKeyInput,
): Promise<{ apiKey: ApiKey; plainTextKey: string }> {
  // Generate random key
  const randomBytes = crypto.randomBytes(API_KEY_LENGTH);
  const keyBody = randomBytes.toString("base64url").slice(0, API_KEY_LENGTH);
  const plainTextKey = `${API_KEY_PREFIX}${keyBody}`;

  // Hash the key for storage
  const keyHash = hashApiKey(plainTextKey);
  const keyPrefix = plainTextKey.slice(0, 12); // "caelex_xxxx"

  const apiKey = await prisma.apiKey.create({
    data: {
      organizationId: input.organizationId,
      name: input.name,
      keyHash,
      keyPrefix,
      scopes: input.scopes,
      rateLimit: input.rateLimit || 1000,
      expiresAt: input.expiresAt,
      createdById: input.createdById,
    },
  });

  // Log security event
  await logSecurityEvent({
    event: "API_KEY_CREATED",
    description: `API key "${input.name}" created`,
    userId: input.createdById,
    organizationId: input.organizationId,
    targetType: "api_key",
    targetId: apiKey.id,
    metadata: {
      scopes: input.scopes,
      rateLimit: input.rateLimit,
    },
  });

  return { apiKey, plainTextKey };
}

/**
 * Hash an API key for secure storage
 */
function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

// ─── Key Validation ───

/**
 * Validate an API key and return the key record if valid.
 * Supports key rotation: during the grace period (48h), both the new and previous keys are valid.
 */
export async function validateApiKey(
  plainTextKey: string,
): Promise<ValidateApiKeyResult> {
  // Check format
  if (!plainTextKey.startsWith(API_KEY_PREFIX)) {
    return { valid: false, error: "Invalid key format" };
  }

  // Hash and lookup by current key
  const keyHash = hashApiKey(plainTextKey);

  let apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: {
      organization: {
        select: { id: true, name: true, isActive: true },
      },
    },
  });

  let usingPreviousKey = false;

  // If not found by current hash, check if it matches a previous key during grace period
  if (!apiKey) {
    // Find key where previousKeyHash matches and grace period hasn't ended
    const keyByPreviousHash = await prisma.apiKey.findFirst({
      where: {
        previousKeyHash: keyHash,
        graceEndsAt: { gt: new Date() },
        isActive: true,
      },
      include: {
        organization: {
          select: { id: true, name: true, isActive: true },
        },
      },
    });

    if (keyByPreviousHash) {
      apiKey = keyByPreviousHash;
      usingPreviousKey = true;
    }
  }

  if (!apiKey) {
    return { valid: false, error: "Invalid API key" };
  }

  // Check if active
  if (!apiKey.isActive) {
    return { valid: false, error: "API key has been revoked" };
  }

  // Check if expired
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { valid: false, error: "API key has expired" };
  }

  // Check if organization is active
  if (!apiKey.organization.isActive) {
    return { valid: false, error: "Organization is inactive" };
  }

  // Update last used timestamp
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  // Return result with deprecation warning if using previous key
  if (usingPreviousKey && apiKey.graceEndsAt) {
    return {
      valid: true,
      apiKey,
      usingPreviousKey: true,
      graceEndsAt: apiKey.graceEndsAt,
    };
  }

  return { valid: true, apiKey };
}

/**
 * Check if an API key has a specific scope
 */
export function hasScope(apiKey: ApiKey, scope: string): boolean {
  return apiKey.scopes.includes(scope) || apiKey.scopes.includes("*");
}

/**
 * Check if an API key has any of the specified scopes
 */
export function hasAnyScope(apiKey: ApiKey, scopes: string[]): boolean {
  if (apiKey.scopes.includes("*")) return true;
  return scopes.some((scope) => apiKey.scopes.includes(scope));
}

// ─── Key Management ───

/**
 * Get all API keys for an organization
 */
export async function getOrganizationApiKeys(
  organizationId: string,
): Promise<ApiKeyWithoutSecret[]> {
  const keys = await prisma.apiKey.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });

  return keys.map((key) => {
    const { keyHash, ...keyWithoutHash } = key;
    return {
      ...keyWithoutHash,
      maskedKey: `${key.keyPrefix}${"•".repeat(20)}`,
    };
  });
}

/**
 * Get a single API key by ID
 */
export async function getApiKeyById(
  keyId: string,
  organizationId: string,
): Promise<ApiKeyWithoutSecret | null> {
  const key = await prisma.apiKey.findFirst({
    where: { id: keyId, organizationId },
  });

  if (!key) return null;

  const { keyHash, ...keyWithoutHash } = key;
  return {
    ...keyWithoutHash,
    maskedKey: `${key.keyPrefix}${"•".repeat(20)}`,
  };
}

/**
 * Update API key settings
 */
export async function updateApiKey(
  keyId: string,
  organizationId: string,
  updates: {
    name?: string;
    scopes?: string[];
    rateLimit?: number;
    isActive?: boolean;
  },
): Promise<ApiKey> {
  return prisma.apiKey.update({
    where: { id: keyId, organizationId },
    data: updates,
  });
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(
  keyId: string,
  organizationId: string,
  revokedById: string,
  reason?: string,
): Promise<ApiKey> {
  const apiKey = await prisma.apiKey.update({
    where: { id: keyId, organizationId },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedReason: reason || "Manually revoked",
    },
  });

  // Log security event
  await logSecurityEvent({
    event: "API_KEY_REVOKED",
    description: `API key "${apiKey.name}" revoked: ${reason || "Manually revoked"}`,
    userId: revokedById,
    organizationId,
    targetType: "api_key",
    targetId: keyId,
    riskLevel: "MEDIUM",
  });

  return apiKey;
}

/**
 * Regenerate an API key (revoke old, create new with same settings)
 * @deprecated Use rotateApiKey() instead for a graceful 48h transition period
 */
export async function regenerateApiKey(
  keyId: string,
  organizationId: string,
  regeneratedById: string,
): Promise<{ apiKey: ApiKey; plainTextKey: string }> {
  // Get existing key
  const existingKey = await prisma.apiKey.findFirst({
    where: { id: keyId, organizationId },
  });

  if (!existingKey) {
    throw new Error("API key not found");
  }

  // Revoke old key
  await revokeApiKey(keyId, organizationId, regeneratedById, "Regenerated");

  // Create new key with same settings
  return createApiKey({
    organizationId,
    name: existingKey.name,
    scopes: existingKey.scopes,
    rateLimit: existingKey.rateLimit,
    expiresAt: existingKey.expiresAt || undefined,
    createdById: regeneratedById,
  });
}

/**
 * Rotate an API key with a 48-hour grace period.
 * The old key continues to work during the grace period, allowing time for migration.
 *
 * @param keyId - The ID of the key to rotate
 * @param organizationId - The organization that owns the key
 * @param rotatedById - The user performing the rotation
 * @returns The updated key and the new plaintext key
 */
export async function rotateApiKey(
  keyId: string,
  organizationId: string,
  rotatedById: string,
): Promise<{ apiKey: ApiKey; plainTextKey: string; graceEndsAt: Date }> {
  // Get existing key
  const existingKey = await prisma.apiKey.findFirst({
    where: { id: keyId, organizationId, isActive: true },
  });

  if (!existingKey) {
    throw new Error("API key not found or already revoked");
  }

  // Generate new key
  const randomBytes = crypto.randomBytes(API_KEY_LENGTH);
  const keyBody = randomBytes.toString("base64url").slice(0, API_KEY_LENGTH);
  const plainTextKey = `${API_KEY_PREFIX}${keyBody}`;
  const newKeyHash = hashApiKey(plainTextKey);
  const newKeyPrefix = plainTextKey.slice(0, 12);

  // Calculate grace period end (48 hours from now)
  const graceEndsAt = new Date();
  graceEndsAt.setHours(graceEndsAt.getHours() + ROTATION_GRACE_PERIOD_HOURS);

  // Update the key: move current hash to previous, set new hash
  const apiKey = await prisma.apiKey.update({
    where: { id: keyId },
    data: {
      previousKeyHash: existingKey.keyHash,
      keyHash: newKeyHash,
      keyPrefix: newKeyPrefix,
      rotatedAt: new Date(),
      graceEndsAt,
    },
  });

  // Log security event
  await logSecurityEvent({
    event: "API_KEY_ROTATED",
    description: `API key "${existingKey.name}" rotated with 48h grace period`,
    userId: rotatedById,
    organizationId,
    targetType: "api_key",
    targetId: keyId,
    metadata: {
      graceEndsAt: graceEndsAt.toISOString(),
      previousKeyPrefix: existingKey.keyPrefix,
      newKeyPrefix,
    },
  });

  return { apiKey, plainTextKey, graceEndsAt };
}

/**
 * Complete a key rotation early by clearing the previous key.
 * Use this after confirming all systems have migrated to the new key.
 */
export async function completeKeyRotation(
  keyId: string,
  organizationId: string,
  completedById: string,
): Promise<ApiKey> {
  const existingKey = await prisma.apiKey.findFirst({
    where: { id: keyId, organizationId, isActive: true },
  });

  if (!existingKey) {
    throw new Error("API key not found or already revoked");
  }

  if (!existingKey.previousKeyHash) {
    throw new Error("No active rotation to complete");
  }

  const apiKey = await prisma.apiKey.update({
    where: { id: keyId },
    data: {
      previousKeyHash: null,
      rotatedAt: null,
      graceEndsAt: null,
    },
  });

  // Log security event
  await logSecurityEvent({
    event: "API_KEY_ROTATION_COMPLETED",
    description: `API key "${existingKey.name}" rotation completed early`,
    userId: completedById,
    organizationId,
    targetType: "api_key",
    targetId: keyId,
  });

  return apiKey;
}

/**
 * Delete an API key permanently
 */
export async function deleteApiKey(
  keyId: string,
  organizationId: string,
): Promise<void> {
  await prisma.apiKey.delete({
    where: { id: keyId, organizationId },
  });
}

// ─── Usage Tracking ───

/**
 * Log an API request
 */
export async function logApiRequest(
  apiKeyId: string,
  request: {
    method: string;
    path: string;
    statusCode: number;
    responseTimeMs: number;
    ipAddress?: string;
    userAgent?: string;
    errorCode?: string;
    errorMessage?: string;
  },
): Promise<void> {
  await prisma.apiRequest.create({
    data: {
      apiKeyId,
      method: request.method,
      path: request.path,
      statusCode: request.statusCode,
      responseTimeMs: request.responseTimeMs,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
      errorCode: request.errorCode,
      errorMessage: request.errorMessage,
    },
  });

  // Log to security audit if it's an API key usage
  if (request.statusCode >= 200 && request.statusCode < 300) {
    // Only log successful requests to avoid spam
    // For failed requests, we already have the ApiRequest record
  }
}

/**
 * Get usage statistics for an API key
 */
export async function getApiKeyUsageStats(
  keyId: string,
  days: number = 30,
): Promise<ApiKeyUsageStats> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const requests = await prisma.apiRequest.findMany({
    where: {
      apiKeyId: keyId,
      createdAt: { gte: startDate },
    },
    select: {
      statusCode: true,
      responseTimeMs: true,
      path: true,
      createdAt: true,
    },
  });

  const totalRequests = requests.length;
  const successfulRequests = requests.filter(
    (r) => r.statusCode >= 200 && r.statusCode < 300,
  ).length;
  const failedRequests = totalRequests - successfulRequests;

  const avgResponseTime =
    totalRequests > 0
      ? Math.round(
          requests.reduce((sum, r) => sum + r.responseTimeMs, 0) /
            totalRequests,
        )
      : 0;

  // Group by endpoint
  const requestsByEndpoint: Record<string, number> = {};
  requests.forEach((r) => {
    const endpoint = r.path.split("?")[0]; // Remove query params
    requestsByEndpoint[endpoint] = (requestsByEndpoint[endpoint] || 0) + 1;
  });

  // Group by day
  const requestsByDayMap: Record<string, number> = {};
  requests.forEach((r) => {
    const date = r.createdAt.toISOString().split("T")[0];
    requestsByDayMap[date] = (requestsByDayMap[date] || 0) + 1;
  });

  const requestsByDay = Object.entries(requestsByDayMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalRequests,
    successfulRequests,
    failedRequests,
    avgResponseTime,
    requestsByEndpoint,
    requestsByDay,
  };
}

// ─── Rate Limiting ───

/**
 * Check if an API key has exceeded its rate limit
 */
export async function checkRateLimit(
  apiKeyId: string,
  rateLimit: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const requestCount = await prisma.apiRequest.count({
    where: {
      apiKeyId,
      createdAt: { gte: oneHourAgo },
    },
  });

  const remaining = Math.max(0, rateLimit - requestCount);
  const resetAt = new Date();
  resetAt.setHours(resetAt.getHours() + 1);
  resetAt.setMinutes(0);
  resetAt.setSeconds(0);

  return {
    allowed: requestCount < rateLimit,
    remaining,
    resetAt,
  };
}

// ─── Cleanup ───

/**
 * Clean up old API request logs
 */
export async function cleanupOldRequestLogs(
  daysOld: number = 90,
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.apiRequest.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
    },
  });

  return result.count;
}

/**
 * Expire old API keys
 */
export async function expireOldApiKeys(): Promise<number> {
  const result = await prisma.apiKey.updateMany({
    where: {
      isActive: true,
      expiresAt: { lt: new Date() },
    },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedReason: "Expired",
    },
  });

  return result.count;
}

/**
 * Clear expired grace periods.
 * Removes previousKeyHash for keys where graceEndsAt has passed.
 */
export async function clearExpiredGracePeriods(): Promise<number> {
  const result = await prisma.apiKey.updateMany({
    where: {
      previousKeyHash: { not: null },
      graceEndsAt: { lt: new Date() },
    },
    data: {
      previousKeyHash: null,
      rotatedAt: null,
      graceEndsAt: null,
    },
  });

  return result.count;
}

/**
 * Check if an API key is currently in rotation (has an active grace period)
 */
export async function isKeyInRotation(
  keyId: string,
  organizationId: string,
): Promise<{
  inRotation: boolean;
  graceEndsAt?: Date;
  hoursRemaining?: number;
}> {
  const key = await prisma.apiKey.findFirst({
    where: { id: keyId, organizationId },
    select: { previousKeyHash: true, graceEndsAt: true },
  });

  if (!key || !key.previousKeyHash || !key.graceEndsAt) {
    return { inRotation: false };
  }

  if (key.graceEndsAt < new Date()) {
    return { inRotation: false };
  }

  const hoursRemaining = Math.ceil(
    (key.graceEndsAt.getTime() - Date.now()) / (1000 * 60 * 60),
  );

  return {
    inRotation: true,
    graceEndsAt: key.graceEndsAt,
    hoursRemaining,
  };
}
