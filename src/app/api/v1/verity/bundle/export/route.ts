import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildBundle,
  MAX_BUNDLE_SIZE,
} from "@/lib/verity/bundle/bundle-builder";
import { safeLog } from "@/lib/verity/utils/redaction";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";

/**
 * POST /api/v1/verity/bundle/export
 *
 * Emits a single regulator-ready JSON artifact ("Verity Bundle")
 * containing every cryptographic primitive needed to verify a set
 * of Verity attestations completely offline. See
 * `src/lib/verity/bundle/types.ts` for the full shape and
 * `buildReadme()` in the builder for the offline verification
 * instructions embedded in every bundle.
 *
 * Auth: session. Operator-scoped — requested attestationIds must
 * all belong to the caller's organization, otherwise the builder
 * throws (loudly, instead of silently dropping).
 *
 * Rate-limited via the conservative `verity_bundle` tier (5/hour)
 * because building a bundle reads the full leaf table + computes
 * several Merkle trees.
 */

const BundleInputSchema = z
  .union([
    z.object({
      attestationIds: z.array(z.string().min(1)).min(1).max(MAX_BUNDLE_SIZE),
    }),
    z.object({ satelliteNoradId: z.string().min(1) }),
    z.object({ regulationRef: z.string().min(1) }),
  ])
  .refine((v) => Object.keys(v).length === 1, {
    message: "Supply exactly one selector",
  });

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "verity_bundle",
      session.user.id ?? getIdentifier(request),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const body = await request.json();
    const parsed = BundleInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Resolve the caller's primary organization. Bundles are emitted
    // per-org, not per-user — users can belong to multiple orgs but
    // we scope by the one tied to this session's first membership.
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });
    if (!membership) {
      return NextResponse.json(
        { error: "No organization found for this session" },
        { status: 403 },
      );
    }

    const input = parsed.data;
    const selector =
      "attestationIds" in input
        ? {
            type: "ids" as const,
            attestationIds: input.attestationIds,
          }
        : "satelliteNoradId" in input
          ? {
              type: "satellite" as const,
              satelliteNoradId: input.satelliteNoradId,
            }
          : {
              type: "regulation" as const,
              regulationRef: input.regulationRef,
            };

    let bundle;
    try {
      bundle = await buildBundle({
        prisma,
        operatorId: membership.organizationId,
        selector,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Operator-scope or size violations throw from the builder; surface
      // them as 400 rather than 500.
      const isClientError =
        msg.includes("owned by this operator") ||
        msg.includes("too many attestations") ||
        msg.includes("no attestations match") ||
        msg.includes("must be non-empty");
      safeLog("Bundle export failed", {
        userId: session.user.id,
        orgId: membership.organizationId,
        error: msg,
      });
      return NextResponse.json(
        { error: msg },
        { status: isClientError ? 400 : 500 },
      );
    }

    safeLog("Bundle exported", {
      bundleId: bundle.bundleId,
      orgId: membership.organizationId,
      entryCount: String(bundle.entries.length),
      sthTreeSize: bundle.sth ? String(bundle.sth.treeSize) : "null",
    });

    return NextResponse.json(bundle);
  } catch (err) {
    safeLog("Bundle export route crashed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
