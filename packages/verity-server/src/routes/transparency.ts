/**
 * Verity 2036 -- Transparency Route Handlers
 *
 * GET /v1/transparency/inclusion/:reference_id — Get inclusion proof (authenticated)
 */

import type { IncomingMessage, ServerResponse } from "node:http";

import { withApiAuth } from "../auth/middleware.js";
import { ApiError, ErrorCode } from "../errors/codes.js";
import { logger } from "../logging/logger.js";
import { getInclusionProof } from "../services/transparency.js";

/**
 * Route handler for /v1/transparency/* endpoints.
 *
 * @param req       - Incoming HTTP request.
 * @param res       - Server response.
 * @param path      - URL path (e.g. "/v1/transparency/inclusion/abc123").
 * @param requestId - Unique request identifier for tracing.
 */
export async function handleTransparency(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
  requestId: string,
): Promise<void> {
  // ---- GET /v1/transparency/inclusion/:reference_id --------------------
  const inclusionPrefix = "/v1/transparency/inclusion/";
  if (path.startsWith(inclusionPrefix) && req.method === "GET") {
    const referenceId = decodeURIComponent(path.slice(inclusionPrefix.length));

    if (!referenceId || referenceId.includes("/")) {
      throw new ApiError(
        ErrorCode.VALIDATION_ERROR,
        "Invalid or missing reference_id parameter",
      );
    }

    const tenant = await withApiAuth(req, "transparency:read");

    const result = await getInclusionProof(referenceId, tenant.tenant_id);

    if (!result) {
      throw new ApiError(
        ErrorCode.RESOURCE_NOT_FOUND,
        "Inclusion proof not found. The entry may not exist or has not yet been included in a checkpoint.",
      );
    }

    logger.info("transparency.inclusion", {
      request_id: requestId,
      tenant_id: tenant.tenant_id,
      reference_id: referenceId,
      entry_id: result.entryId,
    });

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
    return;
  }

  // ---- Unknown sub-path ------------------------------------------------
  throw new ApiError(ErrorCode.RESOURCE_NOT_FOUND, `Not found: ${path}`);
}
