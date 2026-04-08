/**
 * Admin CRM: AI Draft Email Endpoint
 *
 * POST /api/admin/crm/ai/draft-email
 * Body: { contactId: string, goal: string, tone?: "friendly" | "formal" | "direct" }
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { draftFollowupEmail } from "@/lib/crm/ai.server";

const schema = z.object({
  contactId: z.string().cuid(),
  goal: z.string().min(1).max(500),
  tone: z.enum(["friendly", "formal", "direct"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await requireRole(["admin"]);

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const contact = await prisma.crmContact.findUnique({
      where: { id: parsed.data.contactId, deletedAt: null },
      include: { company: true },
    });
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const recentActivities = await prisma.crmActivity.findMany({
      where: { contactId: parsed.data.contactId },
      orderBy: { occurredAt: "desc" },
      take: 15,
      select: { type: true, summary: true, occurredAt: true },
    });

    const result = await draftFollowupEmail({
      contact,
      company: contact.company,
      recentActivities,
      tone: parsed.data.tone,
      goal: parsed.data.goal,
    });

    return NextResponse.json(result);
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
    logger.error("CRM draft email failed", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Draft email failed") },
      { status: 500 },
    );
  }
}
