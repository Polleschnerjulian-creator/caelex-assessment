/**
 * Environment Variables Validation
 *
 * Validates all required environment variables on startup.
 * Fails fast if critical variables are missing or invalid.
 */

import { z } from "zod";

/**
 * Environment schema defining all required and optional variables.
 */
const envSchema = z.object({
  // ─── Core ───
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // ─── Database ───
  DATABASE_URL: z
    .string()
    .url("DATABASE_URL must be a valid URL")
    .refine(
      (url) => url.startsWith("postgresql://") || url.startsWith("postgres://"),
      {
        message: "DATABASE_URL must be a PostgreSQL connection string",
      },
    ),

  // ─── Authentication ───
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET must be at least 32 characters")
    .describe("Generate with: openssl rand -base64 32"),

  AUTH_URL: z.string().url().optional().describe("Production URL for NextAuth"),

  // ─── OAuth (optional) ───
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),

  // ─── Encryption (required in production) ───
  ENCRYPTION_KEY: z
    .string()
    .min(32)
    .optional()
    .describe("Generate with: openssl rand -hex 32"),

  ENCRYPTION_SALT: z
    .string()
    .min(16)
    .optional()
    .describe("Generate with: openssl rand -hex 16"),

  // ─── Rate Limiting (optional but recommended) ───
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // ─── Monitoring (optional) ───
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // ─── Email (optional) ───
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
});

/**
 * Production-specific requirements.
 */
const productionRequirements = z.object({
  AUTH_URL: z.string().url("AUTH_URL required in production"),
  ENCRYPTION_KEY: z.string().min(32, "ENCRYPTION_KEY required in production"),
  ENCRYPTION_SALT: z.string().min(16, "ENCRYPTION_SALT required in production"),
});

// ─── Types ───

export type Env = z.infer<typeof envSchema>;

// ─── Validation ───

let validatedEnv: Env | null = null;

/**
 * Validate environment variables.
 * Call this at application startup.
 */
export function validateEnv(): Env {
  if (validatedEnv) {
    return validatedEnv;
  }

  // Parse base schema
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(
      result.error.issues
        .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
        .join("\n"),
    );

    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    } else {
      console.warn("⚠️ Continuing in development mode with invalid env vars");
    }
  }

  const env = result.data!;

  // Check production requirements
  if (env.NODE_ENV === "production") {
    const prodResult = productionRequirements.safeParse(process.env);

    if (!prodResult.success) {
      console.error("❌ Missing production environment variables:");
      console.error(
        prodResult.error.issues
          .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
          .join("\n"),
      );
      process.exit(1);
    }
  }

  // Log warnings for missing optional variables
  if (!env.UPSTASH_REDIS_REST_URL && env.NODE_ENV === "production") {
    console.warn(
      "⚠️ UPSTASH_REDIS_REST_URL not set. Rate limiting will use in-memory fallback.",
    );
  }

  if (!env.SENTRY_DSN && env.NODE_ENV === "production") {
    console.warn("⚠️ SENTRY_DSN not set. Error monitoring disabled.");
  }

  if (!env.AUTH_GOOGLE_ID || !env.AUTH_GOOGLE_SECRET) {
    console.log(
      "ℹ️ Google OAuth not configured. OAuth login will be disabled.",
    );
  }

  validatedEnv = env;
  return env;
}

/**
 * Get validated environment variables.
 * Throws if validation hasn't been run.
 */
export function getEnv(): Env {
  if (!validatedEnv) {
    return validateEnv();
  }
  return validatedEnv;
}

/**
 * Check if running in production.
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Check if running in development.
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Check if running in test.
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === "test";
}

// ─── Export validated env ───

export const env = validateEnv();
