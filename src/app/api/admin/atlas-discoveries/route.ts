import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * GET   /api/admin/atlas-discoveries — list discovered source candidates
 * PATCH /api/admin/atlas-discoveries  — approve / reject one by id
 *
 * A "discovery" is an AtlasPendingSourceCandidate — a feed entry we
 * matched as space-law-related but that isn't yet in the static data
 * files. Admin reviews:
 *   APPROVE — add to a data file (manual PR) and mark approved here
 *   REJECT  — false positive / out of scope
 */

export const runtime = "nodejs";

const QuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "ALL"]).default("PENDING"),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

const PatchSchema = z.object({
  id: z.string().min(1).max(200),
  action: z.enum(["approve", "reject"]),
  note: z.string().max(2000).optional(),
});

export async function GET(request: NextRequest) {
  const admin = await requirePlatformAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Platform-admin role required" },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query params", details: parsed.error.format() },
      { status: 400 },
    );
  }

  const { status, limit } = parsed.data;
  const where = status === "ALL" ? {} : { reviewStatus: status };

  const candidates = await prisma.atlasPendingSourceCandidate.findMany({
    where,
    orderBy: [{ detectedAt: "desc" }],
    take: limit,
  });

  return NextResponse.json({ candidates });
}

export async function PATCH(request: NextRequest) {
  const admin = await requirePlatformAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Platform-admin role required" },
      { status: 403 },
    );
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = PatchSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.format() },
      { status: 400 },
    );
  }

  const { id, action, note } = parsed.data;
  const now = new Date();

  try {
    const updated = await prisma.atlasPendingSourceCandidate.update({
      where: { id },
      data: {
        reviewStatus: action === "approve" ? "APPROVED" : "REJECTED",
        reviewedAt: now,
        reviewedBy: admin.userId,
        reviewNote: note ?? null,
      },
    });

    logger.info("Atlas discovery reviewed", {
      id,
      action,
      reviewedBy: admin.userId,
    });

    return NextResponse.json({ candidate: updated });
  } catch (err) {
    logger.error("Atlas discovery update failed", { id, error: err });
    return NextResponse.json(
      { error: "Candidate not found or update failed" },
      { status: 404 },
    );
  }
}
