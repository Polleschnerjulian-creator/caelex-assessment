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
import DOMPurify from "isomorphic-dompurify";

// ─── Sanitization Helpers ───

/**
 * Sanitize HTML input - strips all HTML tags.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // Strip all HTML
    ALLOWED_ATTR: [],
  });
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
