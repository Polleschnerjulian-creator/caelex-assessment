import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { dispatchSourceAmendment } from "@/lib/atlas/notify";
import { getLegalSourceById } from "@/data/legal-sources";

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

    // Audit M-5 fix: admin decisions on regulatory-source changes belong in
    // the tamper-evident AuditLog chain, not only the app logger, so they
    // surface in the Audit Center + compliance exports.
    await logAuditEvent({
      userId: admin.userId,
      action:
        parsed.data.action === "reviewed"
          ? "atlas_source_reviewed"
          : "atlas_source_dismissed",
      entityType: "atlas_source_check",
      entityId: parsed.data.sourceId,
      newValue: {
        status: updated.status,
        note: parsed.data.note ?? null,
      },
      description: `Platform-admin ${parsed.data.action} source ${parsed.data.sourceId}`,
    });

    // Fan out AtlasNotification rows to subscribers of this source
    // and its containing jurisdiction — but ONLY on "reviewed"
    // actions. A dismissed source change isn't something subscribers
    // need to hear about (admin triaged it as noise). Fire-and-forget
    // via `void` so an empty subscriber list or a write hiccup in
    // the notifications table can never roll back the admin's
    // review decision.
    if (parsed.data.action === "reviewed") {
      const source = getLegalSourceById(parsed.data.sourceId);
      const sourceTitle =
        source?.title_local ?? source?.title_en ?? parsed.data.sourceId;
      void dispatchSourceAmendment({
        sourceId: parsed.data.sourceId,
        title: `${sourceTitle} — amendment detected`,
        summary:
          parsed.data.note?.trim() ||
          `A change to ${sourceTitle} has been detected and reviewed. Check the source page for the diff and updated provisions.`,
      });
    }

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
