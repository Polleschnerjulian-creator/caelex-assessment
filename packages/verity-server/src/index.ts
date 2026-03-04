/**
 * Verity 2036 -- Public API Surface
 *
 * Re-exports key modules for programmatic use by downstream consumers.
 * This file is the entry point specified in package.json "main".
 */

// Database
export { getPool, closePool, query } from "./db/client.js";
export { PostgresKeyStore } from "./db/key-store.js";

// Authentication
export { withApiAuth } from "./auth/middleware.js";
export { isPublicVerifyRequest } from "./auth/public-verify.js";

// Middleware
export { rateLimiter } from "./middleware/rate-limit.js";

// Errors
export { ApiError, ErrorCode } from "./errors/codes.js";

// Logging
export { logger } from "./logging/logger.js";

// Types
export type { TenantContext, RequestContext } from "./auth/types.js";
