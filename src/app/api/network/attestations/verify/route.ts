/**
 * Attestation Verification API (Public)
 * POST - Verify an attestation by its signature hash
 * No authentication required — this is a public verification endpoint
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyByHash } from "@/lib/services/attestation";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    // Rate limit: auth tier for public verification (strict: 5/min)
    const rl = await checkRateLimit("auth", getIdentifier(request));
    if (!rl.success) return createRateLimitResponse(rl);

    const schema = z.object({
      signatureHash: z
        .string()
        .regex(
          /^[a-f0-9]{64}$/i,
          "Expected a 64-character hex string (SHA-256)",
        ),
    });

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { signatureHash } = parsed.data;

    const result = await verifyByHash(signatureHash);

    if (!result.valid) {
      // SEC-8: Minimal info for failed verification — no signer details or relationships
      return NextResponse.json({
        valid: false,
        error: "error" in result ? result.error : "Verification failed",
      });
    }

    const att = "attestation" in result ? result.attestation : undefined;
    // SEC-8: Return only minimal verification info — do NOT leak statement, scope,
    // signerName, signerTitle, signerEmail, signatureHash, or relationship details
    return NextResponse.json({
      valid: true,
      hashValid: "hashValid" in result ? result.hashValid : undefined,
      chainValid: "chainValid" in result ? result.chainValid : undefined,
      attestation: att
        ? {
            type: att.type,
            signerOrg: att.signerOrg,
            issuedAt: att.issuedAt,
            expiresAt: att.validUntil,
          }
        : undefined,
    });
  } catch (error) {
    logger.error("Failed to verify attestation", error);
    return NextResponse.json(
      { error: "Failed to verify attestation" },
      { status: 500 },
    );
  }
}
