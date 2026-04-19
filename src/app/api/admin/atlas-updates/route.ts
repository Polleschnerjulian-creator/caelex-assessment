import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * GET   /api/admin/atlas-updates — List source checks for admin review
 * PATCH /api/admin/atlas-updates — Mark a check as reviewed/dismissed
 *
 * Both require platform-admin role. C2 fix: prior version accepted any
 * authenticated user, which let users suppress compliance-change alerts.
 */

export const runtime = "nodejs";

const PatchSchema = z.object({
  sourceId: z.string().min(1).max(200),
  action: z.enum(["reviewed", "dismissed"]),
  note: z.string().max(2000).optional(),
});

export async function GET() {
  const admin = await requirePlatformAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Platform-admin role required" },
      { status: 403 },
    );
  }

  const checks = await prisma.atlasSourceCheck.findMany({
    orderBy: [
      { status: "asc" }, // CHANGED first
      { lastChanged: "desc" },
      { lastChecked: "desc" },
    ],
  });

  return NextResponse.json({ checks });
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

  try {
    const updated = await prisma.atlasSourceCheck.update({
      where: { sourceId: parsed.data.sourceId },
      data: {
        status: parsed.data.action === "reviewed" ? "REVIEWED" : "DISMISSED",
        reviewedAt: new Date(),
        reviewedBy: admin.userId,
        reviewNote: parsed.data.note ?? null,
      },
    });

    logger.info("Atlas source check reviewed", {
      sourceId: parsed.data.sourceId,
      action: parsed.data.action,
      reviewedBy: admin.userId,
    });

    return NextResponse.json({ check: updated });
  } catch (err) {
    logger.error("Atlas source check update failed", { error: err });
    // Prisma's "record not found" is the most common cause — treat as 404
    return NextResponse.json(
      { error: "Source check not found or update failed" },
      { status: 404 },
    );
  }
}
