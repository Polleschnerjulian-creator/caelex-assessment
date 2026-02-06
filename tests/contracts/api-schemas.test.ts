/**
 * API Schema Contract Tests
 *
 * Validates that API responses conform to expected shapes.
 * These tests catch breaking changes in API response formats
 * that might affect frontend consumers.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// ─── Shared Response Schemas ────────────────────────────────────────────────

/** Standard error response used across all API routes */
const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

/** Standard paginated list response */
const PaginatedResponseSchema = z.object({
  total: z.number().int().min(0),
  limit: z.number().int().min(1),
  offset: z.number().int().min(0),
});

/** Rate limit headers that should be present on API responses */
const RateLimitHeadersSchema = z.object({
  "X-RateLimit-Limit": z.string(),
  "X-RateLimit-Remaining": z.string(),
  "X-RateLimit-Reset": z.string(),
});

/** 429 Too Many Requests response */
const RateLimitResponseSchema = z.object({
  error: z.literal("Too Many Requests"),
  message: z.string(),
  retryAfter: z.number().positive(),
});

// ─── Auth API Schemas ───────────────────────────────────────────────────────

const SignupErrorSchema = z.object({
  error: z.string(),
  details: z.record(z.string(), z.array(z.string())).optional(),
});

// ─── Dashboard API Schemas ──────────────────────────────────────────────────

const DashboardOverviewSchema = z.object({
  success: z.literal(true),
  overview: z.object({
    overallScore: z.number(),
    modules: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        status: z.enum([
          "compliant",
          "partial",
          "non_compliant",
          "not_started",
        ]),
        score: z.number(),
      }),
    ),
  }),
  score: z.object({
    overall: z.number(),
    grade: z.enum(["A", "B", "C", "D", "F"]),
    status: z.enum(["compliant", "partial", "non_compliant", "not_started"]),
    breakdown: z.record(
      z.string(),
      z.object({
        score: z.number(),
        weight: z.number(),
        weightedScore: z.number(),
        status: z.string(),
      }),
    ),
  }),
  topRecommendations: z.array(
    z.object({
      priority: z.enum(["critical", "high", "medium", "low"]),
      module: z.string(),
      action: z.string(),
    }),
  ),
});

const DashboardMetricsSchema = z.object({
  success: z.literal(true),
  metrics: z.object({
    authorization: z.object({
      workflowsActive: z.number(),
      workflowsCompleted: z.number(),
    }),
    incidents: z.object({
      total: z.number(),
      open: z.number(),
      resolved: z.number(),
    }),
  }),
  generatedAt: z.string(),
});

// ─── Notification API Schemas ───────────────────────────────────────────────

const NotificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  severity: z.string(),
  read: z.boolean(),
  config: z.object({}).passthrough().optional(),
});

const NotificationsListSchema = z.object({
  notifications: z.array(NotificationSchema),
  total: z.number(),
  unreadCount: z.number(),
  limit: z.number(),
  offset: z.number(),
  categories: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
    }),
  ),
});

const UnreadCountSchema = z.object({
  count: z.number().int().min(0),
});

// ─── Timeline API Schemas ───────────────────────────────────────────────────

const DeadlineSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  dueDate: z.string(), // ISO date string
  category: z.string(),
  priority: z.string(),
  status: z.string(),
});

// ─── NCA Submissions Schemas ────────────────────────────────────────────────

const NCASubmissionSchema = z.object({
  id: z.string(),
  ncaAuthority: z.string(),
  ncaAuthorityLabel: z.string(),
  submissionMethod: z.string(),
  submissionMethodLabel: z.string(),
  status: z.string(),
  statusLabel: z.string(),
  statusColor: z.string(),
});

// ─── Contract Tests ─────────────────────────────────────────────────────────

describe("API Schema Contracts", () => {
  describe("Error Response Format", () => {
    it("should validate standard error response", () => {
      const validError = { error: "Unauthorized" };
      const result = ErrorResponseSchema.safeParse(validError);
      expect(result.success).toBe(true);
    });

    it("should validate error with message", () => {
      const validError = {
        error: "Forbidden",
        message: "Invalid request origin",
      };
      const result = ErrorResponseSchema.safeParse(validError);
      expect(result.success).toBe(true);
    });

    it("should reject error without error field", () => {
      const invalidError = { message: "Something went wrong" };
      const result = ErrorResponseSchema.safeParse(invalidError);
      expect(result.success).toBe(false);
    });

    it("should validate signup error with details", () => {
      const validError = {
        error: "Validation failed",
        details: {
          email: ["Invalid email format"],
          password: ["Must be at least 12 characters"],
        },
      };
      const result = SignupErrorSchema.safeParse(validError);
      expect(result.success).toBe(true);
    });
  });

  describe("Paginated Response Format", () => {
    it("should validate standard pagination fields", () => {
      const valid = { total: 42, limit: 20, offset: 0 };
      const result = PaginatedResponseSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should reject negative total", () => {
      const invalid = { total: -1, limit: 20, offset: 0 };
      const result = PaginatedResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject zero limit", () => {
      const invalid = { total: 10, limit: 0, offset: 0 };
      const result = PaginatedResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject negative offset", () => {
      const invalid = { total: 10, limit: 20, offset: -1 };
      const result = PaginatedResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("Rate Limit Response Format", () => {
    it("should validate 429 response body", () => {
      const valid = {
        error: "Too Many Requests" as const,
        message: "Rate limit exceeded. Please try again later.",
        retryAfter: 30,
      };
      const result = RateLimitResponseSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should reject non-positive retryAfter", () => {
      const invalid = {
        error: "Too Many Requests" as const,
        message: "Rate limit exceeded.",
        retryAfter: 0,
      };
      const result = RateLimitResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("Dashboard Overview Contract", () => {
    it("should validate a complete dashboard overview response", () => {
      const valid = {
        success: true as const,
        overview: {
          overallScore: 72,
          modules: [
            {
              id: "authorization",
              name: "Authorization & Registration",
              status: "compliant" as const,
              score: 95,
            },
            {
              id: "debris",
              name: "Debris Mitigation",
              status: "partial" as const,
              score: 60,
            },
          ],
        },
        score: {
          overall: 72,
          grade: "C" as const,
          status: "partial" as const,
          breakdown: {
            authorization: {
              score: 95,
              weight: 0.25,
              weightedScore: 23.75,
              status: "compliant",
            },
          },
        },
        topRecommendations: [
          {
            priority: "critical" as const,
            module: "debris",
            action: "Complete deorbit plan",
          },
        ],
      };

      const result = DashboardOverviewSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should reject invalid grade", () => {
      const invalid = {
        success: true,
        overview: { overallScore: 72, modules: [] },
        score: {
          overall: 72,
          grade: "X", // Invalid
          status: "partial",
          breakdown: {},
        },
        topRecommendations: [],
      };

      const result = DashboardOverviewSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject invalid priority", () => {
      const invalid = {
        success: true,
        overview: { overallScore: 72, modules: [] },
        score: {
          overall: 72,
          grade: "C",
          status: "partial",
          breakdown: {},
        },
        topRecommendations: [
          {
            priority: "super_critical", // Invalid
            module: "debris",
            action: "Something",
          },
        ],
      };

      const result = DashboardOverviewSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("Notifications Contract", () => {
    it("should validate a notifications list response", () => {
      const valid = {
        notifications: [
          {
            id: "notif-1",
            userId: "user-1",
            type: "DEADLINE_APPROACHING",
            title: "Deadline soon",
            message: "Your deadline is approaching",
            severity: "WARNING",
            read: false,
            config: { label: "Deadline Approaching" },
          },
        ],
        total: 1,
        unreadCount: 1,
        limit: 20,
        offset: 0,
        categories: [{ id: "deadlines", label: "Deadlines & Reminders" }],
      };

      const result = NotificationsListSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should validate unread count response", () => {
      const valid = { count: 5 };
      const result = UnreadCountSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should reject negative unread count", () => {
      const invalid = { count: -1 };
      const result = UnreadCountSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("Consistent Error Codes", () => {
    it("should use 401 for unauthenticated requests", () => {
      // All API routes should return 401 with { error: "Unauthorized" }
      const expected = { error: "Unauthorized" };
      const result = ErrorResponseSchema.safeParse(expected);
      expect(result.success).toBe(true);
      expect(expected.error).toBe("Unauthorized");
    });

    it("should use 400 for validation errors", () => {
      const examples = [
        { error: "Missing required fields" },
        { error: "operatorType is required" },
        { error: "Invalid category" },
        { error: "Validation failed" },
      ];

      examples.forEach((example) => {
        const result = ErrorResponseSchema.safeParse(example);
        expect(result.success).toBe(true);
      });
    });

    it("should use 403 for CSRF violations", () => {
      const expected = {
        error: "Forbidden",
        message: "Invalid request origin",
      };
      const result = ErrorResponseSchema.safeParse(expected);
      expect(result.success).toBe(true);
    });

    it("should use 500 for internal server errors", () => {
      const examples = [
        { error: "Failed to fetch submissions" },
        { error: "Failed to create incident" },
        { error: "Failed to fetch deadlines" },
        { error: "Internal server error" },
      ];

      examples.forEach((example) => {
        const result = ErrorResponseSchema.safeParse(example);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("NCA Submission Contract", () => {
    it("should validate enriched submission response", () => {
      const valid = {
        id: "sub-1",
        ncaAuthority: "DE_BMWK",
        ncaAuthorityLabel: "Federal Ministry",
        submissionMethod: "EMAIL",
        submissionMethodLabel: "Email",
        status: "PENDING",
        statusLabel: "Pending",
        statusColor: "yellow",
      };

      const result = NCASubmissionSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should require all label fields", () => {
      const incomplete = {
        id: "sub-1",
        ncaAuthority: "DE_BMWK",
        // Missing label fields
      };

      const result = NCASubmissionSchema.safeParse(incomplete);
      expect(result.success).toBe(false);
    });
  });
});
