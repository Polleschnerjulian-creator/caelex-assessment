/**
 * Attestation Verification API (Public)
 * POST - Verify an attestation by its signature hash
 * No authentication required — this is a public verification endpoint
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyByHash } from "@/lib/services/attestation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { signatureHash } = body;

    if (!signatureHash || typeof signatureHash !== "string") {
      return NextResponse.json(
        { error: "signatureHash is required and must be a string" },
        { status: 400 },
      );
    }

    // Validate hash format (SHA-256 hex string)
    if (!/^[a-f0-9]{64}$/i.test(signatureHash)) {
      return NextResponse.json(
        {
          error:
            "Invalid hash format. Expected a 64-character hex string (SHA-256).",
        },
        { status: 400 },
      );
    }

    const result = await verifyByHash(signatureHash);

    if (!result.valid) {
      const att = "attestation" in result ? result.attestation : undefined;
      return NextResponse.json({
        valid: false,
        error: "error" in result ? result.error : "Verification failed",
        attestation: att
          ? {
              id: att.id,
              type: att.type,
              title: att.title,
              signerName: att.signerName,
              signerOrg: att.signerOrg,
              issuedAt: att.issuedAt,
              isRevoked: att.isRevoked,
              revokedAt: att.revokedAt,
              organization: att.organization,
              engagement: att.engagement,
            }
          : undefined,
      });
    }

    const att = "attestation" in result ? result.attestation : undefined;
    return NextResponse.json({
      valid: true,
      hashValid: "hashValid" in result ? result.hashValid : undefined,
      chainValid: "chainValid" in result ? result.chainValid : undefined,
      attestation: att
        ? {
            id: att.id,
            type: att.type,
            title: att.title,
            statement: att.statement,
            scope: att.scope,
            signerName: att.signerName,
            signerTitle: att.signerTitle,
            signerOrg: att.signerOrg,
            signatureHash: att.signatureHash,
            issuedAt: att.issuedAt,
            validUntil: att.validUntil,
            isRevoked: att.isRevoked,
            organization: att.organization,
            engagement: att.engagement,
          }
        : undefined,
    });
  } catch (error) {
    console.error("Failed to verify attestation:", error);
    return NextResponse.json(
      { error: "Failed to verify attestation" },
      { status: 500 },
    );
  }
}
