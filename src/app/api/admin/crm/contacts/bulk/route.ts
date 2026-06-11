/**
 * POST /api/admin/crm/contacts/bulk — Sammel-Erfassung von Kontakten.
 *
 * Founder-Workflow: Visitenkarten-Stapel nach einer Messe in einem Rutsch
 * erfassen. Body: { contacts: [{ name, email?, companyName?, note? }] },
 * max. 100 pro Call.
 *
 * Dedup per E-Mail (CrmContact.email ist @unique): vorhandene Kontakte
 * werden ÜBERSPRUNGEN (auch soft-gelöschte — die E-Mail ist DB-weit unique,
 * ein Create würde sonst knallen). Kontakte OHNE E-Mail haben keinen
 * Dedup-Schlüssel und werden immer angelegt. companyName wird wie in der
 * from-lead-Route case-insensitive ge-find-or-created (mit Batch-Cache,
 * damit "Kanzlei X" nicht zweimal entsteht). lifecycleStage = LEAD —
 * der Model-Default und derselbe Wert, den die manuelle Einzel-Erfassung
 * nutzt (es gibt keine "CONTACT"-Stufe im Enum).
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

const contactRowSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.preprocess(
    emptyToUndefined,
    z.string().trim().toLowerCase().email().max(320).optional(),
  ),
  companyName: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(200).optional(),
  ),
  note: z.preprocess(emptyToUndefined, z.string().trim().max(5000).optional()),
});

const bodySchema = z.object({
  contacts: z.array(contactRowSchema).min(1).max(100),
});

/**
 * "Dr. Anna Schmidt" → { firstName: "Dr. Anna", lastName: "Schmidt" }.
 * Einzelnes Wort landet im Nachnamen ("Müller" → Herr/Frau Müller).
 */
function splitName(name: string): {
  firstName: string | undefined;
  lastName: string;
} {
  const tokens = name.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) {
    return { firstName: undefined, lastName: tokens[0] };
  }
  return {
    firstName: tokens.slice(0, -1).join(" "),
    lastName: tokens[tokens.length - 1],
  };
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

    // Vorhandene E-Mails EINMAL laden (ein Query statt N findUnique).
    // Bewusst OHNE deletedAt-Filter: email ist @unique über alle Zeilen.
    const batchEmails = parsed.data.contacts
      .map((c) => c.email)
      .filter((e): e is string => !!e);
    const existing =
      batchEmails.length > 0
        ? await prisma.crmContact.findMany({
            where: { email: { in: batchEmails } },
            select: { email: true },
          })
        : [];
    const knownEmails = new Set(
      existing.map((c) => c.email).filter((e): e is string => !!e),
    );

    // find-or-create-Cache für Firmennamen (case-insensitive, Batch-weit).
    const companyIdByName = new Map<string, string>();
    async function resolveCompanyId(
      companyName: string,
    ): Promise<string | undefined> {
      const key = companyName.toLowerCase();
      const cached = companyIdByName.get(key);
      if (cached) return cached;
      // Muster aus der from-lead-Route: case-insensitive Namens-Match.
      const found = await prisma.crmCompany.findFirst({
        where: { name: { equals: companyName, mode: "insensitive" } },
        select: { id: true },
      });
      const id =
        found?.id ??
        (
          await prisma.crmCompany.create({
            data: { name: companyName },
            select: { id: true },
          })
        ).id;
      companyIdByName.set(key, id);
      return id;
    }

    const now = new Date();
    const createdIds: string[] = [];
    const skipped: string[] = [];
    const noteRows: { body: string; authorId: string; contactId: string }[] =
      [];
    const activityRows: {
      type: "OTHER";
      source: "MANUAL";
      summary: string;
      contactId: string;
      companyId: string | undefined;
      userId: string;
    }[] = [];

    for (const row of parsed.data.contacts) {
      if (row.email && knownEmails.has(row.email)) {
        skipped.push(row.name);
        continue;
      }
      if (row.email) knownEmails.add(row.email); // Batch-interner Dedup

      const companyId = row.companyName
        ? await resolveCompanyId(row.companyName)
        : undefined;

      const { firstName, lastName } = splitName(row.name);
      const contact = await prisma.crmContact.create({
        data: {
          firstName,
          lastName,
          email: row.email,
          companyId,
          lifecycleStage: "LEAD",
          sourceTags: ["manual", "bulk"],
          firstTouchAt: now,
          lastTouchAt: now,
        },
        select: { id: true },
      });
      createdIds.push(contact.id);

      if (row.note) {
        noteRows.push({
          body: row.note,
          authorId: session.user.id,
          contactId: contact.id,
        });
      }
      activityRows.push({
        type: "OTHER",
        source: "MANUAL",
        summary: "Kontakt per Sammel-Erfassung angelegt",
        contactId: contact.id,
        companyId,
        userId: session.user.id,
      });
    }

    if (noteRows.length > 0) {
      await prisma.crmNote.createMany({ data: noteRows });
    }
    if (activityRows.length > 0) {
      await prisma.crmActivity.createMany({ data: activityRows });
    }

    logger.info("CRM contacts bulk-created", {
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
    logger.error("Failed to bulk-create CRM contacts", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to bulk-create contacts") },
      { status: 500 },
    );
  }
}
