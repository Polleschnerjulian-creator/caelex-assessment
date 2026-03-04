/**
 * Verity 2036 -- HTTP Server
 *
 * Standalone Node.js HTTP server (no Express) that exposes the Verity 2036
 * attestation, certificate, key management, and transparency APIs.
 *
 * Middleware chain (applied in order):
 *  1. Request ID generation (X-Request-Id header)
 *  2. CORS / Content-Type headers
 *  3. Rate limiting (before auth to prevent enumeration)
 *  4. Body parsing (POST only, 1 MB max)
 *  5. Route dispatch with auth + validation + service call
 *  6. Error handling (catch-all)
 *
 * Graceful shutdown on SIGINT / SIGTERM.
 */

import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

import { closePool } from "./db/client.js";
import { ApiError, ErrorCode } from "./errors/codes.js";
import { logger } from "./logging/logger.js";
import { handleError } from "./middleware/error-handler.js";
import {
  rateLimiter,
  getTierForEndpoint,
  setRateLimitHeaders,
} from "./middleware/rate-limit.js";
import { attachRequestId } from "./middleware/request-id.js";
import { handleAttestations } from "./routes/attestations.js";
import { handleCertificates } from "./routes/certificates.js";
import { handleKeys } from "./routes/keys.js";
import { handleTransparency } from "./routes/transparency.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env["PORT"] ?? "3100", 10);
const MAX_BODY_SIZE = 1_048_576; // 1 MB

// ---------------------------------------------------------------------------
// Body parser
// ---------------------------------------------------------------------------

/**
 * Reads and parses a JSON request body with a 1 MB size limit.
 * Rejects oversized or malformed bodies with a VALIDATION_ERROR.
 */
async function parseBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;

    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        reject(
          new ApiError(ErrorCode.VALIDATION_ERROR, "Request body too large"),
        );
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf-8");
        if (raw.length === 0) {
          resolve(undefined);
          return;
        }
        const body = JSON.parse(raw) as unknown;
        resolve(body);
      } catch {
        reject(new ApiError(ErrorCode.VALIDATION_ERROR, "Invalid JSON"));
      }
    });

    req.on("error", reject);
  });
}

// ---------------------------------------------------------------------------
// Rate-limit key extraction
// ---------------------------------------------------------------------------

/**
 * Derives a rate-limit key from the request. Uses the API key prefix
 * (first 8 chars of the Bearer token) when available, otherwise falls
 * back to the client IP address.
 */
function getRateLimitKey(req: IncomingMessage): string {
  const authHeader = req.headers["authorization"];
  if (
    authHeader &&
    typeof authHeader === "string" &&
    authHeader.startsWith("Bearer ")
  ) {
    const token = authHeader.slice("Bearer ".length).trim();
    if (token.length >= 8) {
      return token.slice(0, 8);
    }
  }

  // Fallback to IP address
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return req.socket.remoteAddress ?? "unknown";
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const startTime = Date.now();

  // 1. Attach request ID
  const requestId = attachRequestId(req, res);

  // 2. CORS and Content-Type headers
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Request-Id",
  );
  res.setHeader(
    "Access-Control-Expose-Headers",
    "X-Request-Id, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After",
  );

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse URL path (strip query string)
  const urlPath = (req.url ?? "/").split("?")[0] ?? "/";

  // 3. Rate limiting (before auth)
  const rateLimitKey = getRateLimitKey(req);
  const tier = getTierForEndpoint(urlPath);
  const rateLimitResult = await rateLimiter.check(rateLimitKey, tier);
  setRateLimitHeaders(res, rateLimitResult);

  if (!rateLimitResult.allowed) {
    throw new ApiError(ErrorCode.RATE_LIMIT_EXCEEDED, "Rate limit exceeded");
  }

  // 4. Parse body for POST requests
  let body: unknown;
  if (req.method === "POST") {
    body = await parseBody(req);
  }

  // 5. Route dispatch
  if (urlPath.startsWith("/v1/attestations")) {
    await handleAttestations(req, res, urlPath, requestId, body);
  } else if (urlPath.startsWith("/v1/certificates")) {
    await handleCertificates(req, res, urlPath, requestId, body);
  } else if (urlPath.startsWith("/v1/keys")) {
    await handleKeys(req, res, urlPath, requestId, body);
  } else if (urlPath.startsWith("/v1/transparency")) {
    await handleTransparency(req, res, urlPath, requestId);
  } else if (urlPath === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
    );
  } else {
    throw new ApiError(ErrorCode.RESOURCE_NOT_FOUND, `Not found: ${urlPath}`);
  }

  // 6. Log request completion with timing
  const duration = Date.now() - startTime;
  logger.info("request.completed", {
    request_id: requestId,
    method: req.method,
    path: urlPath,
    status_code: res.statusCode,
    duration_ms: duration,
  });
}

// ---------------------------------------------------------------------------
// Server creation
// ---------------------------------------------------------------------------

const server = createServer((req, res) => {
  handleRequest(req, res).catch((error: unknown) => {
    // Extract requestId from response header if already set
    const requestId =
      (res.getHeader("X-Request-Id") as string | undefined) ?? "unknown";

    handleError(error, res, requestId);

    // Log request completion for error cases too
    logger.info("request.completed", {
      request_id: requestId,
      method: req.method,
      path: (req.url ?? "/").split("?")[0],
      status_code: res.statusCode,
      error: true,
    });
  });
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}, starting graceful shutdown`);

  // Stop accepting new connections
  server.close(() => {
    logger.info("HTTP server closed");
  });

  // Close the database connection pool
  try {
    await closePool();
    logger.info("Database pool closed");
  } catch (err: unknown) {
    logger.error("Error closing database pool", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Force exit after 10 seconds if graceful shutdown stalls
  setTimeout(() => {
    logger.error("Graceful shutdown timed out, forcing exit");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGINT", () => {
  void gracefulShutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void gracefulShutdown("SIGTERM");
});

// ---------------------------------------------------------------------------
// Start listening
// ---------------------------------------------------------------------------

server.listen(PORT, () => {
  logger.info(`Verity 2036 server listening on port ${PORT}`, {
    port: PORT,
    node_version: process.version,
  });
});

export { server };
