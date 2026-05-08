import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSafeErrorMessage, CuidSchema } from "@/lib/validations";
import {
  logAuditEvent,
  getRequestContext,
  generateAuditDescription,
} from "@/lib/audit";
import { assertNotAuditor } from "@/lib/use-case-server";
import { logger } from "@/lib/logger";

/**
 * POST /api/regulatory-feed/forward
 *
 * Sprint UF40 (P1-P7) — Regulatory-Feed → Inbox handoff.
 *
 * The audit's literal ask was "Convert to ComplianceItem" but
 * ComplianceItems are projections of `*RequirementStatus` rows — not
 * creatable entities (see `compliance-item.server.ts`). The honest
 * implementation that fulfills the spirit of P1-P7: forward the
 * regulatory update to the user's actionable inbox.
 *
 * Effect:
 *   1. Creates a `Notification` (type COMPLIANCE_ACTION_REQUIRED) for
 *      the user. The notification surfaces in /dashboard/today and
 *      /dashboard/triage; `actionUrl` deep-links back to the source on
 *      EUR-Lex so the operator can re-read context.
 *   2. Marks the update as read for the user's org so it stops
 *      cluttering the regulatory-feed list.
 *
 * Idempotent — guarded by a (userId, entityType, entityId) check.
 * Re-clicking returns success without spawning a duplicate notification.
 */

const ForwardSchema = z.object({
  updateId: CuidSchema,
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // Auditor RBAC — server-side belt-and-suspenders parallel to
    // /api/tracker/articles. An auditor session must not be able to
    // mutate inbox state even if the client guard is bypassed.
    const auditorBlock = await assertNotAuditor(userId);
    if (auditorBlock) return auditorBlock;

    const body = await req.json();
    const parsed = ForwardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { updateId } = parsed.data;

    // Resolve user org membership — needed for org-scoped Read marker
    // and for the Notification.organizationId column.
    const membership = await prisma.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
    });
    if (!membership) {
      return NextResponse.json(
        { error: "No organization membership found" },
        { status: 400 },
      );
    }

    // Fetch the regulatory update to copy its content into the
    // notification body.
    const update = await prisma.regulatoryUpdate.findUnique({
      where: { id: updateId },
      select: {
        id: true,
        celexNumber: true,
        title: true,
        documentType: true,
        sourceUrl: true,
        severity: true,
        affectedModules: true,
        summary: true,
        matchReason: true,
      },
    });
    if (!update) {
      return NextResponse.json(
        { error: "Regulatory update not found" },
        { status: 404 },
      );
    }

    // Idempotency guard — if a notification for this update already
    // exists for the user, return success without duplicating. The
    // (entityType, entityId) combination is the natural key.
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        entityType: "regulatory_update",
        entityId: update.id,
      },
      select: { id: true },
    });

    let notificationId: string;
    let alreadyForwarded = false;

    if (existing) {
      notificationId = existing.id;
      alreadyForwarded = true;
    } else {
      // Map regulatory severity → notification severity. There's no
      // 1:1 mapping (regulatory has CRITICAL/HIGH/MEDIUM/LOW; notif
      // has INFO/WARNING/URGENT/CRITICAL). Conservative bias: HIGH
      // becomes URGENT so it lands at the top of Today.
      const severityMap = {
        CRITICAL: "CRITICAL" as const,
        HIGH: "URGENT" as const,
        MEDIUM: "WARNING" as const,
        LOW: "INFO" as const,
      };
      const notifSeverity = severityMap[update.severity] ?? "INFO";

      const moduleLabel =
        update.affectedModules.length > 0
          ? ` · Affects: ${update.affectedModules.join(", ")}`
          : "";

      const message = update.summary
        ? `${update.summary}\n\nMatch reason: ${update.matchReason}${moduleLabel}\n\nCELEX ${update.celexNumber}`
        : `${update.matchReason}${moduleLabel}\n\nCELEX ${update.celexNumber}`;

      const created = await prisma.notification.create({
        data: {
          userId,
          organizationId: membership.organizationId,
          type: "COMPLIANCE_ACTION_REQUIRED",
          title: `Regulator: ${update.title.slice(0, 140)}${
            update.title.length > 140 ? "…" : ""
          }`,
          message,
          // Deep-link back to the EUR-Lex source so the operator can
          // re-read the regulation when they pick the item up later.
          actionUrl: update.sourceUrl,
          entityType: "regulatory_update",
          entityId: update.id,
          severity: notifSeverity,
        },
        select: { id: true },
      });
      notificationId = created.id;
    }

    // Whether or not we created the notification, mark the regulatory
    // update as read so it stops appearing in the unread-feed view.
    // skipDuplicates (createMany) would be nicer for batches, but a
    // single upsert here is fine and atomic.
    await prisma.regulatoryUpdateRead.upsert({
      where: {
        regulatoryUpdateId_organizationId: {
          regulatoryUpdateId: update.id,
          organizationId: membership.organizationId,
        },
      },
      update: {
        readByUserId: userId,
        readAt: new Date(),
      },
      create: {
        regulatoryUpdateId: update.id,
        organizationId: membership.organizationId,
        readByUserId: userId,
      },
    });

    // Audit log — only on first forward, not re-clicks.
    if (!alreadyForwarded) {
      const { ipAddress, userAgent } = getRequestContext(req);
      await logAuditEvent({
        userId,
        action: "regulatory_update_forwarded",
        entityType: "regulatory_update",
        entityId: update.id,
        previousValue: null,
        newValue: {
          notificationId,
          celexNumber: update.celexNumber,
          severity: update.severity,
        },
        description: generateAuditDescription(
          "regulatory_update_forwarded",
          "regulatory_update",
          undefined,
          { celex: update.celexNumber },
        ),
        ipAddress,
        userAgent,
      });
    }

    return NextResponse.json({
      success: true,
      notificationId,
      alreadyForwarded,
    });
  } catch (error) {
    logger.error("Error forwarding regulatory update to inbox", error);
    return NextResponse.json(
      {
        error: getSafeErrorMessage(error, "Failed to forward update to inbox"),
      },
      { status: 500 },
    );
  }
}
