/**
 * Admin CRM: Notes API
 *
 * POST /api/admin/crm/notes — create a note linked to contact/company/deal
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";

const createSchema = z
  .object({
    body: z.string().min(1).max(10000),
    contactId: z.string().cuid().optional(),
    companyId: z.string().cuid().optional(),
    dealId: z.string().cuid().optional(),
  })
  .refine(
    (d) => !!d.contactId || !!d.companyId || !!d.dealId,
    "At least one of contactId, companyId, dealId is required",
  );

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await requireRole(["admin"]);

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const note = await prisma.crmNote.create({
      data: {
        body: parsed.data.body,
        authorId: session.user.id,
        contactId: parsed.data.contactId,
        companyId: parsed.data.companyId,
        dealId: parsed.data.dealId,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    // Log as activity
    await prisma.crmActivity.create({
      data: {
        type: "NOTE_ADDED",
        source: "MANUAL",
        summary:
          parsed.data.body.length > 80
            ? parsed.data.body.slice(0, 80) + "…"
            : parsed.data.body,
        body: parsed.data.body,
        contactId: parsed.data.contactId,
        companyId: parsed.data.companyId,
        dealId: parsed.data.dealId,
        userId: session.user.id,
      },
    });

    logger.info("CRM note created", {
      noteId: note.id,
      authorId: session.user.id,
    });

    return NextResponse.json({ note }, { status: 201 });
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
    logger.error("Failed to create CRM note", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to create note") },
      { status: 500 },
    );
  }
}
