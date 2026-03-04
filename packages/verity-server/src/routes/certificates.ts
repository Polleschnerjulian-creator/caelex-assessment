/**
 * Verity 2036 -- Certificate Route Handlers
 *
 * POST /v1/certificates/issue   — Issue a new certificate (authenticated)
 * POST /v1/certificates/verify  — Verify a certificate (public or authenticated)
 */

import type { IncomingMessage, ServerResponse } from "node:http";

import { withApiAuth } from "../auth/middleware.js";
import { isPublicVerifyRequest } from "../auth/public-verify.js";
import { ApiError, ErrorCode } from "../errors/codes.js";
import { logger } from "../logging/logger.js";
import {
  issueCertificate,
  verifyCertificate,
} from "../services/certificate.js";
import {
  issueCertificateSchema,
  verifyCertificateSchema,
} from "../validation/schemas.js";

/**
 * Route handler for /v1/certificates/* endpoints.
 *
 * @param req       - Incoming HTTP request (body already parsed by caller).
 * @param res       - Server response.
 * @param path      - URL path (e.g. "/v1/certificates/issue").
 * @param requestId - Unique request identifier for tracing.
 * @param body      - Parsed JSON body (undefined for non-POST).
 */
export async function handleCertificates(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
  requestId: string,
  body?: unknown,
): Promise<void> {
  // ---- POST /v1/certificates/issue -------------------------------------
  if (path === "/v1/certificates/issue" && req.method === "POST") {
    const tenant = await withApiAuth(req, "certificates:issue");

    const parsed = issueCertificateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        ErrorCode.VALIDATION_ERROR,
        parsed.error.errors.map((e) => e.message).join("; "),
      );
    }

    const result = await issueCertificate(tenant.tenant_id, parsed.data);

    logger.info("certificates.issue", {
      request_id: requestId,
      tenant_id: tenant.tenant_id,
      cert_id: result.cert_id,
    });

    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
    return;
  }

  // ---- POST /v1/certificates/verify ------------------------------------
  if (path === "/v1/certificates/verify" && req.method === "POST") {
    // Public verify: if the body contains a full certificate payload, skip auth
    const isPublic = isPublicVerifyRequest(body);

    let tenantId: string;
    if (isPublic) {
      tenantId = "public";
    } else {
      const tenant = await withApiAuth(req, "certificates:verify");
      tenantId = tenant.tenant_id;
    }

    const parsed = verifyCertificateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        ErrorCode.VALIDATION_ERROR,
        parsed.error.errors.map((e) => e.message).join("; "),
      );
    }

    const result = await verifyCertificate(tenantId, parsed.data);

    logger.info("certificates.verify", {
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
