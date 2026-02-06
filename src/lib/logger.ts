/**
 * Secure Logging Utility
 *
 * Provides environment-aware logging that:
 * - In production: Sanitizes errors to prevent information leakage
 * - In development: Provides full error details for debugging
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.error("Failed to process request", error);
 *   logger.warn("Rate limit approaching", { userId, remaining });
 *   logger.info("User logged in", { userId });
 */

const isProduction = process.env.NODE_ENV === "production";

/**
 * Sanitize an error for production logging.
 * Removes stack traces and sensitive information.
 */
function sanitizeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: isProduction ? "[REDACTED]" : error.message,
      // Only include stack in development
      ...(isProduction ? {} : { stack: error.stack }),
    };
  }

  if (typeof error === "object" && error !== null) {
    // Shallow sanitize object - remove potentially sensitive keys
    const sensitiveKeys = [
      "password",
      "secret",
      "token",
      "key",
      "authorization",
      "cookie",
      "session",
      "credit",
      "ssn",
      "api_key",
      "apiKey",
      "privateKey",
      "private_key",
    ];

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(error)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof value === "string" && value.length > 500) {
        sanitized[key] = value.substring(0, 100) + "...[TRUNCATED]";
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return { value: String(error) };
}

/**
 * Format log message with timestamp and context.
 */
function formatLogEntry(
  level: string,
  message: string,
  context?: Record<string, unknown>,
): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : "";
  return `[${timestamp}] [${level}] ${message}${contextStr}`;
}

/**
 * Logger interface with environment-aware behavior.
 */
export const logger = {
  /**
   * Log an error. In production, sanitizes the error details.
   */
  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    const sanitizedError = error ? sanitizeError(error) : undefined;
    const logContext = {
      ...context,
      ...(sanitizedError ? { error: sanitizedError } : {}),
    };

    if (isProduction) {
      // Structured logging for production (better for log aggregation)
      console.error(
        JSON.stringify({
          level: "error",
          message,
          timestamp: new Date().toISOString(),
          ...logContext,
        }),
      );
    } else {
      // Human-readable for development
      console.error(formatLogEntry("ERROR", message, logContext));
      if (error instanceof Error && error.stack) {
        console.error(error.stack);
      }
    }
  },

  /**
   * Log a warning.
   */
  warn(message: string, context?: Record<string, unknown>) {
    if (isProduction) {
      console.warn(
        JSON.stringify({
          level: "warn",
          message,
          timestamp: new Date().toISOString(),
          ...context,
        }),
      );
    } else {
      console.warn(formatLogEntry("WARN", message, context));
    }
  },

  /**
   * Log informational message.
   */
  info(message: string, context?: Record<string, unknown>) {
    if (isProduction) {
      console.info(
        JSON.stringify({
          level: "info",
          message,
          timestamp: new Date().toISOString(),
          ...context,
        }),
      );
    } else {
      console.info(formatLogEntry("INFO", message, context));
    }
  },

  /**
   * Log debug message (only in development).
   */
  debug(message: string, context?: Record<string, unknown>) {
    if (!isProduction) {
      console.debug(formatLogEntry("DEBUG", message, context));
    }
  },

  /**
   * Log security-related events.
   * Always logs but sanitizes sensitive data in production.
   */
  security(
    event: string,
    details: Record<string, unknown>,
    severity: "low" | "medium" | "high" | "critical" = "medium",
  ) {
    const sanitizedDetails = isProduction ? sanitizeError(details) : details;

    const logEntry = {
      level: "security",
      event,
      severity,
      timestamp: new Date().toISOString(),
      details: sanitizedDetails,
    };

    if (severity === "critical" || severity === "high") {
      console.error(JSON.stringify(logEntry));
    } else {
      console.warn(JSON.stringify(logEntry));
    }
  },
};

export default logger;
