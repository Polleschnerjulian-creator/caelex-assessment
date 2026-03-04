/**
 * Verity 2036 -- Key Management Route Handlers
 *
 * POST /v1/keys/rotate  — Rotate an existing key (authenticated)
 * POST /v1/keys/revoke  — Revoke a key (authenticated)
 */

import type { IncomingMessage, ServerResponse } from "node:http";

import { withApiAuth } from "../auth/middleware.js";
import { ApiError, ErrorCode } from "../errors/codes.js";
import { logger } from "../logging/logger.js";
import { rotateKey, revokeKey } from "../services/keys.js";
import { rotateKeySchema, revokeKeySchema } from "../validation/schemas.js";

/**
 * Route handler for /v1/keys/* endpoints.
 *
 * Both key operations require authentication. There is no public mode
 * for key management operations.
 *
 * @param req       - Incoming HTTP request (body already parsed by caller).
 * @param res       - Server response.
 * @param path      - URL path (e.g. "/v1/keys/rotate").
 * @param requestId - Unique request identifier for tracing.
 * @param body      - Parsed JSON body (undefined for non-POST).
 */
export async function handleKeys(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
  requestId: string,
  body?: unknown,
): Promise<void> {
  // ---- POST /v1/keys/rotate --------------------------------------------
  if (path === "/v1/keys/rotate" && req.method === "POST") {
    const tenant = await withApiAuth(req, "keys:rotate");

    const parsed = rotateKeySchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        ErrorCode.VALIDATION_ERROR,
        parsed.error.errors.map((e) => e.message).join("; "),
      );
    }

    const result = await rotateKey(tenant.tenant_id, parsed.data);

    logger.info("keys.rotate", {
      request_id: requestId,
      tenant_id: tenant.tenant_id,
      new_key_id: result.new_key_id,
      previous_key_id: result.previous_key_id,
    });

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
    return;
  }

  // ---- POST /v1/keys/revoke --------------------------------------------
  if (path === "/v1/keys/revoke" && req.method === "POST") {
    const tenant = await withApiAuth(req, "keys:revoke");

    const parsed = revokeKeySchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        ErrorCode.VALIDATION_ERROR,
        parsed.error.errors.map((e) => e.message).join("; "),
      );
    }

    const result = await revokeKey(tenant.tenant_id, parsed.data);

    logger.info("keys.revoke", {
      request_id: requestId,
      tenant_id: tenant.tenant_id,
      key_id: result.key_id,
      revocation_id: result.revocation_id,
    });

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
    return;
  }

  // ---- Unknown sub-path ------------------------------------------------
  throw new ApiError(ErrorCode.RESOURCE_NOT_FOUND, `Not found: ${path}`);
}
