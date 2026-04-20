import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInclusionForAttestation } from "@/lib/verity/transparency/log-store";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";

/**
 * GET /api/v1/verity/transparency/inclusion/:attestationId
 *
 * Returns an inclusion proof for the given attestation against the
 * latest signed tree head. A caller holding the public attestation
 * JSON can verify offline:
 *
 *   1. recompute hashLeaf(canonical bytes) and match proof.leafHash
 *   2. walk proof.path up to proof.root
 *   3. check proof.root === sth.rootHash
 *   4. verify sth.signature over sthSigningBytes(ts, size, root, kid)
 *      using the Verity public key registered under sth.issuerKeyId
 *
 * Auth: NONE — public, rate-limited via verity_public tier.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attestationId: string }> },
) {
  const rl = await checkRateLimit("verity_public", getIdentifier(request));
  if (!rl.success) return createRateLimitResponse(rl);

  const { attestationId } = await params;
  if (!attestationId || !/^va_[a-z0-9_]+$/i.test(attestationId)) {
    return NextResponse.json(
      { error: "invalid attestationId format" },
      { status: 400 },
    );
  }

  const res = await getInclusionForAttestation(prisma, attestationId);
  if (!res) {
    return NextResponse.json(
      {
        error:
          "no inclusion proof available — attestation not yet in the log, or not covered by the latest STH",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    attestationId,
    proof: {
      leafIndex: res.proof.leafIndex,
      treeSize: res.proof.treeSize,
      path: res.proof.path,
      leafHash: res.proof.leafHash,
      root: res.proof.root,
    },
    sth: res.sth,
  });
}
