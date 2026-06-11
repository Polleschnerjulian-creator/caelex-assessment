/**
 * POST /api/admin/crm/companies/bulk — Sammel-Erfassung von Firmen.
 *
 * Founder-Workflow: "26 Kanzleien aus der Liste rein, jetzt sofort."
 * Body: { companies: [{ name, website?, city?, note? }] }, max. 100 pro Call.
 *
 * Idempotent per case-insensitive Namens-Match (Muster: from-lead-Route):
 * vorhandene Firmen werden ÜBERSPRUNGEN, nie dupliziert — zweimal einfügen
 * ist sicher. Die Namensliste wird einmal geladen (ein Query statt N
 * findFirst-Roundtrips); Duplikate innerhalb des Batches werden ebenfalls
 * erkannt. Eine Notiz wird als CrmNote an die Firma gehängt (CrmCompany
 * hat kein notes-Skalarfeld, nur die Relation).
 *
 * Gate spiegelt die Geschwister-Routen: Super-Admin, sonst DB-Rolle "admin".
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { isSuperAdmin } from "@/lib/super-admin";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";

/** Leere/Whitespace-Strings aus toleranten Quellen wie `undefined` behandeln. */
const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const companyRowSchema = z.object({
  name: z.string().trim().min(1).max(200),
  website: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(500).optional(),
  ),
  city: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  note: z.preprocess(emptyToUndefined, z.string().trim().max(5000).optional()),
});

const bodySchema = z.object({
  companies: z.array(companyRowSchema).min(1).max(100),
});

/** "kanzlei.de" → "https://kanzlei.de" (tolerant gegenüber fehlendem Protokoll). */
function normalizeWebsite(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

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
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    // Alle vorhandenen Namen EINMAL laden (case-insensitive Dedup ohne
    // N findFirst-Roundtrips). Soft-gelöschte Firmen blockieren nicht.
    const existing = await prisma.crmCompany.findMany({
      where: { deletedAt: null },
      select: { name: true },
    });
    const knownNames = new Set(
      existing.map((c) => c.name.trim().toLowerCase()),
    );

    const createdIds: string[] = [];
    const skipped: string[] = [];
    const noteRows: { body: string; authorId: string; companyId: string }[] =
      [];

    for (const row of parsed.data.companies) {
      const key = row.name.toLowerCase();
      if (knownNames.has(key)) {
        skipped.push(row.name);
        continue;
      }
      knownNames.add(key); // Dedup auch innerhalb des Batches

      const company = await prisma.crmCompany.create({
        data: {
          name: row.name,
          website: normalizeWebsite(row.website),
          city: row.city,
        },
        select: { id: true },
      });
      createdIds.push(company.id);

      if (row.note) {
        noteRows.push({
          body: row.note,
          authorId: session.user.id,
          companyId: company.id,
        });
      }
    }

    if (noteRows.length > 0) {
      await prisma.crmNote.createMany({ data: noteRows });
    }
    if (createdIds.length > 0) {
      await prisma.crmActivity.createMany({
        data: createdIds.map((companyId) => ({
          type: "OTHER" as const,
          source: "MANUAL" as const,
          summary: "Firma per Sammel-Erfassung angelegt",
          companyId,
          userId: session.user.id,
        })),
      });
    }

    logger.info("CRM companies bulk-created", {
      created: createdIds.length,
      skipped: skipped.length,
      createdBy: session.user.id,
    });

    return NextResponse.json({
      created: createdIds.length,
      skipped,
      createdIds,
    });
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
    logger.error("Failed to bulk-create CRM companies", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to bulk-create companies") },
      { status: 500 },
    );
  }
}
