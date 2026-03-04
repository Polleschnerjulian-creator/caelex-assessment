import type { ServerResponse } from "node:http";
import { ApiError, ErrorCode } from "../errors/codes.js";
import { logger } from "../logging/logger.js";

export function handleError(
  error: unknown,
  res: ServerResponse,
  requestId: string,
): void {
  if (error instanceof ApiError) {
    // Known error — send structured response
    res.writeHead(error.statusCode, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: { code: error.code, message: error.message },
      }),
    );

    // Log at appropriate level
    if (error.statusCode >= 500) {
      logger.error(error.message, {
        request_id: requestId,
        error_code: error.code,
      });
    } else {
      logger.warn(error.message, {
        request_id: requestId,
        error_code: error.code,
        status_code: error.statusCode,
      });
    }
  } else {
    // Unknown error — NEVER expose internals
    logger.error("Internal server error", {
      request_id: requestId,
      error: error instanceof Error ? error.message : "unknown",
    });

    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "An internal error occurred.",
        },
      }),
    );
  }
}
