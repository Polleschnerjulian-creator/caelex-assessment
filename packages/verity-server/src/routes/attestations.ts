/**
 * Verity 2036 -- Attestation Route Handlers
 *
 * POST /v1/attestations/create  — Create a new attestation (authenticated)
 * POST /v1/attestations/verify  — Verify an attestation (public or authenticated)
 */

import type { IncomingMessage, ServerResponse } from "node:http";

import { withApiAuth } from "../auth/middleware.js";
import { isPublicVerifyRequest } from "../auth/public-verify.js";
import { ApiError, ErrorCode } from "../errors/codes.js";
import { logger } from "../logging/logger.js";
import {
  createAttestation,
  verifyAttestation,
} from "../services/attestation.js";
import {
  createAttestationSchema,
  verifyAttestationSchema,
} from "../validation/schemas.js";

/**
 * Route handler for /v1/attestations/* endpoints.
 *
 * @param req       - Incoming HTTP request (body already parsed by caller).
 * @param res       - Server response.
 * @param path      - URL path (e.g. "/v1/attestations/create").
 * @param requestId - Unique request identifier for tracing.
 * @param body      - Parsed JSON body (undefined for non-POST).
 */
export async function handleAttestations(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
  requestId: string,
  body?: unknown,
): Promise<void> {
  // ---- POST /v1/attestations/create ------------------------------------
  if (path === "/v1/attestations/create" && req.method === "POST") {
    const tenant = await withApiAuth(req, "attestations:create");

    const parsed = createAttestationSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        ErrorCode.VALIDATION_ERROR,
        parsed.error.errors.map((e) => e.message).join("; "),
      );
    }

    const result = await createAttestation(
      tenant.tenant_id,
      parsed.data as Parameters<typeof createAttestation>[1],
    );

    logger.info("attestations.create", {
      request_id: requestId,
      tenant_id: tenant.tenant_id,
      attestation_id: result.attestation_id,
    });

    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
    return;
  }

  // ---- POST /v1/attestations/verify ------------------------------------
  if (path === "/v1/attestations/verify" && req.method === "POST") {
    // Public verify: if the body contains a full attestation payload, skip auth
    const isPublic = isPublicVerifyRequest(body);

    let tenantId: string;
    if (isPublic) {
      // For public verification the tenant_id comes from the payload itself
      tenantId = "public";
    } else {
      const tenant = await withApiAuth(req, "attestations:verify");
      tenantId = tenant.tenant_id;
    }

    const parsed = verifyAttestationSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        ErrorCode.VALIDATION_ERROR,
        parsed.error.errors.map((e) => e.message).join("; "),
      );
    }

    const result = await verifyAttestation(tenantId, parsed.data);

    logger.info("attestations.verify", {
      request_id: requestId,
      tenant_id: tenantId,
      valid: result.valid,
    });

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
    return;
  }

  // ---- Unknown sub-path ------------------------------------------------
  throw new ApiError(ErrorCode.RESOURCE_NOT_FOUND, `Not found: ${path}`);
}
