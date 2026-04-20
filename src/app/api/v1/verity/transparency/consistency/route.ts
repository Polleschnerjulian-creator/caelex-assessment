import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getConsistencyFromStore } from "@/lib/verity/transparency/log-store";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";

/**
 * GET /api/v1/verity/transparency/consistency?old=N&new=M
 *
 * Returns a cryptographic proof (RFC 6962 §2.1.4) that the Verity
 * transparency log at size M is a strict extension of the log at
 * size N — i.e. the first N leaves were NOT rewritten between the
 * two snapshots. A verifier with both signed tree heads can apply
 * verifyConsistencyProof offline; no trust in Caelex needed.
 *
 * Auth: NONE — public, rate-limited via verity_public tier.
 *
 * Edge cases (per RFC 6962):
 *   • old == 0  → proof is []; any tree trivially extends the empty tree
 *   • old == new → proof is []; verifier just checks the roots match
 */
export async function GET(request: NextRequest) {
  const rl = await checkRateLimit("verity_public", getIdentifier(request));
  if (!rl.success) return createRateLimitResponse(rl);

  const { searchParams } = request.nextUrl;
  const oldParam = searchParams.get("old");
  const newParam = searchParams.get("new");

  if (oldParam === null || newParam === null) {
    return NextResponse.json(
      { error: "query params `old` and `new` are required" },
      { status: 400 },
    );
  }

  const oldSize = Number(oldParam);
  const newSize = Number(newParam);

  if (
    !Number.isInteger(oldSize) ||
    !Number.isInteger(newSize) ||
    oldSize < 0 ||
    newSize < 0
  ) {
    return NextResponse.json(
      { error: "`old` and `new` must be non-negative integers" },
      { status: 400 },
    );
  }
  if (oldSize > newSize) {
    return NextResponse.json(
      { error: "`old` must be ≤ `new`" },
      { status: 400 },
    );
  }

  const bundle = await getConsistencyFromStore(prisma, oldSize, newSize);
  if (!bundle) {
    return NextResponse.json(
      {
        error:
          "no consistency proof available — at least one STH missing, or the log is internally inconsistent",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    oldSize: bundle.oldSize,
    newSize: bundle.newSize,
    oldRoot: bundle.oldRoot,
    newRoot: bundle.newRoot,
    proof: bundle.proof,
    oldSTH: bundle.oldSTH,
    newSTH: bundle.newSTH,
  });
}
