/**
 * POST /api/admin/crm/contacts/from-lead — convert an AssessmentLead into
 * a CrmContact (CRM Phase 3).
 *
 * Idempotent by email: an existing contact is UPDATED (source tag merged,
 * company backfilled if empty) instead of duplicated, so "Alle übernehmen"
 * after a fair is safe to click twice. The lead's campaign source (e.g.
 * "ila2026") travels into `sourceTags`; the lead's free-text company is
 * find-or-created as a CrmCompany by case-insensitive name.
 *
 * Gate mirrors the other CRM routes: super-admin, else DB "admin" role.
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { isSuperAdmin } from "@/lib/super-admin";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";

const bodySchema = z.object({ leadId: z.string().cuid() });

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isSuperAdmin(session.user.email)) {
      await requireRole(["admin"]);
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Expected { leadId }" },
        { status: 400 },
      );
    }

    const lead = await prisma.assessmentLead.findUnique({
      where: { id: parsed.data.leadId },
    });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Company: find-or-create by case-insensitive name (free text on the lead).
    let companyId: string | undefined;
    if (lead.company && lead.company.trim().length > 1) {
      const name = lead.company.trim();
      const existingCompany = await prisma.crmCompany.findFirst({
        where: { name: { equals: name, mode: "insensitive" } },
        select: { id: true },
      });
      companyId =
        existingCompany?.id ??
        (
          await prisma.crmCompany.create({
            data: { name },
            select: { id: true },
          })
        ).id;
    }

    const email = lead.email.toLowerCase();
    const sourceTag = lead.source || "assessment-results";

    const existing = await prisma.crmContact.findUnique({
      where: { email },
      select: { id: true, sourceTags: true, companyId: true },
    });

    if (existing) {
      // Idempotent merge — never a duplicate row.
      const tags = new Set(existing.sourceTags);
      tags.add(sourceTag);
      const contact = await prisma.crmContact.update({
        where: { id: existing.id },
        data: {
          sourceTags: Array.from(tags),
          ...(existing.companyId === null && companyId ? { companyId } : {}),
        },
        select: { id: true },
      });
      return NextResponse.json({ contactId: contact.id, created: false });
    }

    const contact = await prisma.crmContact.create({
      data: {
        email,
        title: lead.role,
        companyId,
        lifecycleStage: "LEAD",
        sourceTags: [sourceTag, "assessment-lead"],
      },
      select: { id: true },
    });

    await prisma.crmActivity.create({
      data: {
        type: "ASSESSMENT_COMPLETED",
        source: "SYSTEM",
        summary: `Assessment-Lead übernommen (${lead.assessmentType}, Quelle: ${sourceTag})`,
        contactId: contact.id,
        companyId,
        userId: session.user.id,
      },
    });

    logger.info("CRM contact created from assessment lead", {
      leadId: lead.id,
      contactId: contact.id,
    });

    return NextResponse.json({ contactId: contact.id, created: true });
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
    logger.error("Failed to convert lead to contact", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to convert lead") },
      { status: 500 },
    );
  }
}
