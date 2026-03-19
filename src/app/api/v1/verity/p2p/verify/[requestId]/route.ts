import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/v1/verity/p2p/verify/[requestId]
 * Public endpoint — returns verification status and shared attestation data
 * for a peer-to-peer verification request.
 * No authentication required.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const { requestId } = await params;

    const p2pRequest = await prisma.verityP2PRequest.findFirst({
      where: { requestId },
    });

    if (!p2pRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (p2pRequest.status !== "APPROVED") {
      return NextResponse.json({
        verified: false,
        reason:
          p2pRequest.status === "DECLINED"
            ? "Request was declined"
            : p2pRequest.status === "PENDING"
              ? "Request is pending"
              : "Request is not approved",
      });
    }

    if (p2pRequest.expiresAt < new Date()) {
      return NextResponse.json({
        verified: false,
        reason: "Request has expired",
      });
    }

    // Fetch the shared attestations
    const attestations =
      p2pRequest.attestationIds.length > 0
        ? await prisma.verityAttestation.findMany({
            where: {
              attestationId: { in: p2pRequest.attestationIds },
              revokedAt: null,
            },
            select: {
              attestationId: true,
              regulationRef: true,
              result: true,
              trustLevel: true,
              signature: true,
              issuedAt: true,
              expiresAt: true,
            },
          })
        : [];

    return NextResponse.json({
      verified: true,
      respondedAt: p2pRequest.responseAt?.toISOString() ?? null,
      attestations: attestations.map((a) => ({
        attestationId: a.attestationId,
        regulationRef: a.regulationRef,
        result: a.result,
        trustLevel: a.trustLevel,
        signature: a.signature,
        issuedAt: a.issuedAt.toISOString(),
        expiresAt: a.expiresAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[p2p/verify/[requestId]]", error);
    return NextResponse.json(
      { error: "Failed to verify request" },
      { status: 500 },
    );
  }
}
