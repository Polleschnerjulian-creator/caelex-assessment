/**
 * Input Validation Schemas
 *
 * Centralized validation using Zod for type-safe input validation.
 * All user input MUST be validated before processing.
 *
 * Security considerations:
 * - Prevent SQL injection via parameterized queries (Prisma handles this)
 * - Prevent XSS via HTML sanitization
 * - Prevent ReDoS via safe regex patterns
 * - Enforce data constraints
 */

import { z } from "zod";

// ─── Sanitization Helpers ───

/**
 * Strip all HTML tags from a string.
 * This is a server-safe implementation that doesn't require jsdom.
 *
 * Security note: This is used in combination with Zod validation patterns
 * that reject input containing < or > characters, so this is primarily
 * a defense-in-depth measure.
 */
export function sanitizeHtml(dirty: string): string {
  // Remove HTML tags
  let clean = dirty.replace(/<[^>]*>/g, "");
  // Decode common HTML entities
  clean = clean
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  // Remove any remaining HTML tags after entity decode
  clean = clean.replace(/<[^>]*>/g, "");
  return clean;
}

/**
 * Sanitize and trim string input.
 */
export function sanitizeString(value: string): string {
  return sanitizeHtml(value.trim());
}

// ─── Common Validation Patterns ───

// Safe patterns that avoid ReDoS
const patterns = {
  // No HTML tags
  noHtml: /^[^<>]*$/,
  // Alphanumeric with common characters
  alphanumericExtended: /^[a-zA-Z0-9\s\-_.,'()&]+$/,
  // ISO country code (2 letters)
  countryCode: /^[A-Z]{2}$/,
  // Safe identifier (no special chars)
  identifier: /^[a-zA-Z0-9_-]+$/,
};

// ─── Authentication Schemas ───

/**
 * User registration validation.
 * OWASP recommends 12+ character passwords.
 */
export const RegisterSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .regex(patterns.noHtml, "Name contains invalid characters")
    .transform(sanitizeString),

  email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email too long")
    .toLowerCase()
    .transform(sanitizeString),

  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(128, "Password too long")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[^a-zA-Z0-9]/,
      "Password must contain at least one special character",
    ),

  organization: z
    .string()
    .max(200, "Organization name too long")
    .optional()
    .transform((v) => (v ? sanitizeString(v) : undefined)),
});

/**
 * Login validation.
 */
export const LoginSchema = z.object({
  email: z.string().email("Invalid email").max(255).toLowerCase(),
  password: z.string().min(1, "Password required").max(128),
});

/**
 * Password change validation.
 */
export const PasswordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password required"),
    newPassword: z
      .string()
      .min(12, "Password must be at least 12 characters")
      .max(128)
      .regex(/[a-z]/, "Must contain lowercase letter")
      .regex(/[A-Z]/, "Must contain uppercase letter")
      .regex(/[0-9]/, "Must contain number")
      .regex(/[^a-zA-Z0-9]/, "Must contain special character"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

// ─── Assessment Schemas ───

/**
 * Operator types allowed in the system.
 */
export const OperatorTypeEnum = z.enum([
  "SCO", // Spacecraft Operator
  "LO", // Launch Operator
  "LSO", // Launch Site Operator
  "TCO", // Third Country Operator
  "ISOS", // In-Space Services Provider
  "PDP", // Primary Data Provider
  "CAP", // Collision Avoidance Provider
]);

/**
 * Article status values.
 */
export const ArticleStatusEnum = z.enum([
  "not_started",
  "in_progress",
  "under_review",
  "compliant",
  "not_applicable",
]);

/**
 * Update article status.
 */
export const UpdateArticleStatusSchema = z.object({
  articleId: z
    .string()
    .min(1)
    .max(50)
    .regex(patterns.identifier, "Invalid article ID"),
  status: ArticleStatusEnum,
  notes: z
    .string()
    .max(5000, "Notes too long")
    .optional()
    .nullable()
    .transform((v) => (v ? sanitizeString(v) : null)),
});

/**
 * Environmental assessment input.
 */
export const EnvironmentalAssessmentSchema = z.object({
  assessmentName: z
    .string()
    .max(200)
    .optional()
    .transform((v) => (v ? sanitizeString(v) : undefined)),

  missionName: z
    .string()
    .max(200)
    .optional()
    .transform((v) => (v ? sanitizeString(v) : undefined)),

  operatorType: z.enum(["spacecraft", "launch", "launch_site"]),
  missionType: z.enum(["commercial", "research", "government", "educational"]),

  spacecraftMassKg: z.coerce.number().min(0.1).max(1000000),
  spacecraftCount: z.coerce.number().int().min(1).max(100000),
  orbitType: z.enum(["LEO", "MEO", "GEO", "HEO", "cislunar", "deep_space"]),
  altitudeKm: z.coerce.number().int().min(100).max(1000000).optional(),
  missionDurationYears: z.coerce.number().int().min(1).max(100),

  launchVehicle: z.string().max(100),
  launchSharePercent: z.coerce.number().min(0).max(100),
  launchSiteCountry: z
    .string()
    .length(2)
    .regex(patterns.countryCode)
    .optional()
    .nullable(),

  spacecraftPropellant: z.string().max(100).optional().nullable(),
  propellantMassKg: z.coerce.number().min(0).max(100000).optional().nullable(),

  groundStationCount: z.coerce.number().int().min(0).max(1000),
  dailyContactHours: z.coerce.number().min(0).max(24),

  deorbitStrategy: z.enum([
    "controlled_deorbit",
    "passive_decay",
    "graveyard_orbit",
    "retrieval",
  ]),

  isSmallEnterprise: z.boolean().default(false),
  isResearchEducation: z.boolean().default(false),
});

/**
 * Cybersecurity assessment input.
 */
export const CybersecurityAssessmentSchema = z.object({
  assessmentName: z
    .string()
    .max(200)
    .optional()
    .transform((v) => (v ? sanitizeString(v) : undefined)),

  organizationSize: z.enum(["micro", "small", "medium", "large"]),
  employeeCount: z.coerce.number().int().min(1).max(1000000).optional(),
  annualRevenue: z.coerce.number().min(0).max(1e12).optional(),

  spaceSegmentComplexity: z.enum([
    "single_satellite",
    "small_constellation",
    "large_constellation",
    "ground_only",
  ]),
  satelliteCount: z.coerce.number().int().min(0).max(100000).optional(),
  hasGroundSegment: z.boolean().default(true),
  groundStationCount: z.coerce.number().int().min(0).max(1000).optional(),

  dataSensitivityLevel: z.enum([
    "public",
    "internal",
    "confidential",
    "restricted",
  ]),
  processesPersonalData: z.boolean().default(false),
  handlesGovData: z.boolean().default(false),

  existingCertifications: z.array(z.string().max(50)).max(20).optional(),
  hasSecurityTeam: z.boolean().default(false),
  securityTeamSize: z.coerce.number().int().min(0).max(10000).optional(),
  hasIncidentResponsePlan: z.boolean().default(false),
  hasBCP: z.boolean().default(false),

  criticalSupplierCount: z.coerce.number().int().min(0).max(10000).optional(),
  supplierSecurityAssessed: z.boolean().default(false),
});

/**
 * Insurance assessment input.
 */
export const InsuranceAssessmentSchema = z.object({
  assessmentName: z
    .string()
    .max(200)
    .optional()
    .transform((v) => (v ? sanitizeString(v) : undefined)),

  primaryJurisdiction: z.string().length(2).regex(patterns.countryCode),
  operatorType: z.enum(["spacecraft", "launch", "launch_site"]),
  companySize: z.enum(["micro", "small", "medium", "large"]),

  orbitRegime: z.enum(["LEO", "MEO", "GEO", "HEO", "cislunar", "deep_space"]),
  satelliteCount: z.coerce.number().int().min(1).max(100000),
  satelliteValueEur: z.coerce.number().min(0).max(1e12).optional(),
  totalMissionValueEur: z.coerce.number().min(0).max(1e12).optional(),
  isConstellationOperator: z.boolean().default(false),
  hasManeuverability: z.boolean().default(false),
  missionDurationYears: z.coerce.number().int().min(1).max(100),
  hasFlightHeritage: z.boolean().default(false),
  launchVehicle: z.string().max(100).optional(),
  launchProvider: z.string().max(200).optional(),
  launchDate: z.coerce.date().optional().nullable(),

  hasADR: z.boolean().default(false),
  hasPropulsion: z.boolean().default(false),
  hasHazardousMaterials: z.boolean().default(false),
  crossBorderOps: z.boolean().default(false),

  annualRevenueEur: z.coerce.number().min(0).max(1e12).optional(),
  turnoversShareSpace: z.coerce.number().min(0).max(100).optional(),
});

// ─── Query Schemas ───

/**
 * Pagination and sorting parameters.
 */
export const QueryParamsSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum(["createdAt", "updatedAt", "name", "status"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z
    .string()
    .max(100)
    .optional()
    .transform((v) => (v ? sanitizeString(v) : undefined)),
});

// ─── Validation Helpers ───

/**
 * Validate data against a schema with error formatting.
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error };
}

/**
 * Format Zod errors for API response.
 */
export function formatZodErrors(error: z.ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join(".") || "root";
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  }

  return formatted;
}

/**
 * Create a validation error response.
 */
export function createValidationErrorResponse(error: z.ZodError): Response {
  return new Response(
    JSON.stringify({
      error: "Validation Error",
      details: formatZodErrors(error),
    }),
    {
      status: 400,
      headers: { "Content-Type": "application/json" },
    },
  );
}

// ─── Safe Error Handling ───

/**
 * Get a safe error message for API responses.
 * In production, returns a generic message to prevent information disclosure.
 * In development, returns the actual error message for debugging.
 */
export function getSafeErrorMessage(
  error: unknown,
  genericMessage: string = "An error occurred",
): string {
  // In development, show actual error for debugging
  if (process.env.NODE_ENV === "development") {
    return error instanceof Error ? error.message : genericMessage;
  }

  // In production, always return generic message
  return genericMessage;
}

/**
 * Check if an error message is safe to expose to clients.
 * Only business logic errors (validation, not found, etc.) should be exposed.
 */
export function isUserFacingError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  // These are safe to expose as they are business logic errors
  const safePatterns = [
    /not found/i,
    /already exists/i,
    /invalid/i,
    /required/i,
    /unauthorized/i,
    /forbidden/i,
    /expired/i,
  ];

  return safePatterns.some((pattern) => pattern.test(error.message));
}

// ─── Safe JSON Parsing ───

/**
 * Safely parse JSON with a fallback value.
 * Prevents crashes on malformed data from database.
 */
export function safeJsonParse<T>(
  json: string | null | undefined,
  fallback: T,
): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    console.warn("Failed to parse JSON, using fallback:", {
      json: json.slice(0, 100),
    });
    return fallback;
  }
}

/**
 * Safely parse JSON array with empty array fallback.
 */
export function safeJsonParseArray<T>(json: string | null | undefined): T[] {
  return safeJsonParse<T[]>(json, []);
}

/**
 * Safely parse JSON object with empty object fallback.
 */
export function safeJsonParseObject<T extends Record<string, unknown>>(
  json: string | null | undefined,
): T {
  return safeJsonParse<T>(json, {} as T);
}

// ─── Common ID Schemas ───

/**
 * CUID validation - used for most entity IDs in the system.
 */
export const CuidSchema = z
  .string()
  .min(1, "ID is required")
  .max(30, "Invalid ID format")
  .regex(/^c[a-z0-9]+$/, "Invalid ID format");

/**
 * UUID validation - used for some external integrations.
 */
export const UuidSchema = z.string().uuid("Invalid UUID format");

// ─── Webhook Schemas ───

/**
 * Webhook URL validation.
 */
export const WebhookUrlSchema = z
  .string()
  .url("Invalid webhook URL")
  .max(2048, "URL too long")
  .refine((url) => url.startsWith("https://"), "Webhook URL must use HTTPS");

/**
 * Webhook creation input.
 */
export const CreateWebhookSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name too long")
    .transform(sanitizeString),
  url: WebhookUrlSchema,
  events: z
    .array(z.string().max(100))
    .min(1, "At least one event is required")
    .max(50, "Too many events"),
  organizationId: CuidSchema,
});

/**
 * Webhook update input.
 */
export const UpdateWebhookSchema = z.object({
  name: z.string().min(1).max(100).transform(sanitizeString).optional(),
  url: WebhookUrlSchema.optional(),
  events: z.array(z.string().max(100)).min(1).max(50).optional(),
  isActive: z.boolean().optional(),
});

// ─── API Key Schemas ───

/**
 * API key creation input.
 */
export const CreateApiKeySchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name too long")
    .transform(sanitizeString),
  scopes: z
    .array(
      z
        .string()
        .max(50)
        .regex(/^[a-z:_]+$/, "Invalid scope format"),
    )
    .min(1, "At least one scope is required")
    .max(20, "Too many scopes"),
  expiresAt: z.coerce.date().optional().nullable(),
  rateLimit: z.coerce.number().int().min(10).max(10000).optional(),
});

// ─── Notification Schemas ───

/**
 * Mark notifications as read.
 */
export const MarkNotificationsReadSchema = z.object({
  notificationIds: z
    .array(CuidSchema)
    .min(1, "At least one notification ID is required")
    .max(100, "Too many notifications"),
});

/**
 * Dismiss notification.
 */
export const DismissNotificationSchema = z.object({
  notificationId: CuidSchema,
});

/**
 * Notification settings update.
 */
export const NotificationSettingsSchema = z.object({
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  categories: z
    .record(
      z.string(),
      z.object({
        email: z.boolean().optional(),
        push: z.boolean().optional(),
      }),
    )
    .optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time format")
    .optional(),
  quietHoursEnd: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time format")
    .optional(),
  digestEnabled: z.boolean().optional(),
  digestFrequency: z.enum(["daily", "weekly"]).optional(),
});

// ─── Session Schemas ───

/**
 * Session revocation input.
 */
export const RevokeSessionsSchema = z
  .object({
    sessionIds: z.array(CuidSchema).max(100, "Too many sessions").optional(),
    revokeAll: z.boolean().optional(),
  })
  .refine(
    (data) => data.sessionIds?.length || data.revokeAll,
    "Either sessionIds or revokeAll must be provided",
  );

// ─── Stripe Schemas ───

/**
 * Checkout session creation.
 */
export const CreateCheckoutSessionSchema = z.object({
  priceId: z
    .string()
    .min(1, "Price ID is required")
    .max(100)
    .regex(/^price_/, "Invalid price ID format"),
  successUrl: z.string().url().max(2048).optional(),
  cancelUrl: z.string().url().max(2048).optional(),
});

/**
 * Portal session creation.
 */
export const CreatePortalSessionSchema = z.object({
  returnUrl: z.string().url().max(2048).optional(),
});

// ─── Audit Schemas ───

/**
 * Audit report request.
 */
export const AuditReportRequestSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  entityType: z.string().max(50).optional(),
  actions: z.array(z.string().max(50)).max(20).optional(),
  format: z.enum(["pdf", "json", "csv"]).default("pdf"),
});

/**
 * Compliance certificate request.
 */
export const ComplianceCertificateSchema = z.object({
  assessmentId: CuidSchema.optional(),
  includeDetails: z.boolean().default(false),
});

// ─── Authorization Workflow Schemas ───

/**
 * Workflow status update.
 */
export const UpdateWorkflowStatusSchema = z.object({
  status: z.enum([
    "DRAFT",
    "PENDING_DOCUMENTS",
    "UNDER_REVIEW",
    "PENDING_AUTHORITY",
    "APPROVED",
    "REJECTED",
    "WITHDRAWN",
  ]),
  notes: z
    .string()
    .max(5000)
    .optional()
    .transform((v) => (v ? sanitizeString(v) : undefined)),
});

/**
 * Document upload for workflow.
 */
export const WorkflowDocumentSchema = z.object({
  documentType: z.string().max(100),
  fileName: z.string().max(255),
  mimeType: z.string().max(100),
  fileSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(100 * 1024 * 1024), // 100MB max
});

// ─── Export Types ───

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type UpdateArticleStatusInput = z.infer<
  typeof UpdateArticleStatusSchema
>;
export type EnvironmentalAssessmentInput = z.infer<
  typeof EnvironmentalAssessmentSchema
>;
export type CybersecurityAssessmentInput = z.infer<
  typeof CybersecurityAssessmentSchema
>;
export type InsuranceAssessmentInput = z.infer<
  typeof InsuranceAssessmentSchema
>;
export type QueryParams = z.infer<typeof QueryParamsSchema>;
