/**
 * Admin CRM: Assignees API
 *
 * GET /api/admin/crm/assignees — the people a CRM task can be assigned
 * to (platform owners minus test accounts), as {id, name, email}.
 * Also returns `meId` (the caller's user id) so clients can preselect
 * and label "Ich" without an extra session round-trip.
 */

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { isSuperAdmin } from "@/lib/super-admin";
import { getAssignableEmails } from "@/lib/crm/assignees.server";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Super-admins (platform owners) are always authorized. Everyone else must
    // hold the DB "admin" role (requireRole throws ForbiddenError → 403 below).
    if (!isSuperAdmin(session.user.email)) {
      await requireRole(["admin"]);
    }

    const assignees = await prisma.user.findMany({
      where: { email: { in: getAssignableEmails() } },
      select: { id: true, name: true, email: true },
      orderBy: { email: "asc" },
    });

    return NextResponse.json({ assignees, meId: session.user.id });
  } catch (error: unknown) {
    const errName = error instanceof Error ? error.name : "";
    if (errName === "UnauthorizedError") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (errName === "ForbiddenError") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }
    logger.error("Failed to list CRM assignees", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to list assignees") },
      { status: 500 },
    );
  }
}
