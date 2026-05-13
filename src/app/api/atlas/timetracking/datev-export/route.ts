/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — DATEV-Anwaltsabrechnung CSV-Export.
 *
 *   GET /api/atlas/timetracking/datev-export?from=YYYY-MM-DD
 *                                            &to=YYYY-MM-DD
 *                                            &mandateId=<cuid>?
 *                                            &billableOnly=true?
 *
 * Returns text/csv with the DATEV-Anwaltsabrechnung column convention
 * (UTF-8 BOM-prefixed for German Excel compatibility, semicolon-
 * delimited per German CSV norm, German locale numerics with comma
 * as decimal separator).
 *
 * Columns produced (matches DATEV-Anwaltsabrechnung 2024 import):
 *   1.  Datum                  (DD.MM.YYYY)
 *   2.  Mandanten-Name         (string)
 *   3.  Mandat-Bezeichnung     (string)
 *   4.  Bearbeiter             (Lawyer name / email)
 *   5.  Tätigkeitsbeschreibung (description)
 *   6.  Dauer in Minuten       (int)
 *   7.  Dauer in Stunden       (decimal, German locale)
 *   8.  Stundensatz EUR        (decimal, German locale)
 *   9.  Honorar netto EUR      (= Dauer × Satz, decimal)
 *   10. Abrechenbar             (Ja / Nein)
 *   11. Chat-Referenz           (chatId or empty — audit trail)
 *
 * Returns ALL time-entries the caller has access to (own
 * organization, mandate-membership-gated). NO filter to user-id
 * by default — partner imports the whole firm's time entries for
 * Quartal-Abrechnung.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  mandateId: z.string().cuid().optional(),
  billableOnly: z.enum(["true", "false"]).default("true"),
});

/* DATEV expects German number format: 1.234,56 (dot as thousands,
   comma as decimal). Intl.NumberFormat handles both via locale=de-DE. */
function fmtDe(n: number, fractionDigits = 2): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    useGrouping: false,
  }).format(n);
}

/* CSV-quote a value: wrap in double-quotes if it contains the
   delimiter, a quote, or a newline; double-up internal quotes. */
function csvQuote(s: string): string {
  if (
    s.includes(";") ||
    s.includes('"') ||
    s.includes("\n") ||
    s.includes("\r")
  ) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function fmtDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${d.getFullYear()}`;
}

export async function GET(req: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const rl = await checkRateLimit("export", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    mandateId: url.searchParams.get("mandateId") ?? undefined,
    billableOnly: url.searchParams.get("billableOnly") ?? "true",
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  /* Build where-clause: org-scope ALWAYS via mandate-relation, plus
     optional mandate-id, billable-toggle, and date-range. */
  const where: {
    mandate: { organizationId: string };
    mandateId?: string;
    billable?: boolean;
    workedOn?: { gte?: Date; lte?: Date };
  } = {
    mandate: { organizationId: atlas.organizationId },
  };
  if (parsed.data.mandateId) where.mandateId = parsed.data.mandateId;
  if (parsed.data.billableOnly === "true") where.billable = true;
  if (parsed.data.from || parsed.data.to) {
    where.workedOn = {};
    if (parsed.data.from) where.workedOn.gte = new Date(parsed.data.from);
    if (parsed.data.to) {
      /* Inclusive end-of-day so "to=2026-05-31" includes the 31st. */
      const end = new Date(parsed.data.to);
      end.setHours(23, 59, 59, 999);
      where.workedOn.lte = end;
    }
  }

  const entries = await prisma.atlasTimeEntry.findMany({
    where,
    orderBy: [{ workedOn: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      minutes: true,
      description: true,
      billable: true,
      hourlyRateEur: true,
      workedOn: true,
      chatId: true,
      mandate: {
        select: {
          name: true,
          clientName: true,
        },
      },
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  /* Build CSV. UTF-8 BOM at the start so German Excel doesn't
     mangle umlauts. Semicolon delimiter per German CSV convention. */
  const BOM = "﻿";
  const SEP = ";";
  const headers = [
    "Datum",
    "Mandant",
    "Mandat",
    "Bearbeiter",
    "Tätigkeit",
    "Dauer (Min)",
    "Dauer (h)",
    "Stundensatz EUR",
    "Honorar netto EUR",
    "Abrechenbar",
    "Chat-Ref",
  ];

  const rows = entries.map((e) => {
    const hours = e.minutes / 60;
    const rate = e.hourlyRateEur ?? 0;
    const honorar = e.billable ? hours * rate : 0;
    return [
      fmtDate(e.workedOn),
      e.mandate.clientName ?? "",
      e.mandate.name,
      e.user.name ?? e.user.email ?? "",
      e.description,
      e.minutes.toString(),
      fmtDe(hours, 2),
      rate ? fmtDe(rate, 2) : "",
      honorar ? fmtDe(honorar, 2) : "",
      e.billable ? "Ja" : "Nein",
      e.chatId ?? "",
    ]
      .map((v) => csvQuote(String(v)))
      .join(SEP);
  });

  const csv = BOM + [headers.join(SEP), ...rows].join("\r\n") + "\r\n";

  /* Total at the end as a sanity-check row — sum minutes + sum
     honorar — so the lawyer immediately sees the Quartal-Total. */
  const totalMinutes = entries.reduce((s, e) => s + e.minutes, 0);
  const totalHonorar = entries.reduce(
    (s, e) => s + (e.billable ? (e.minutes / 60) * (e.hourlyRateEur ?? 0) : 0),
    0,
  );
  const totalRow = [
    "",
    "",
    "",
    "",
    `SUMME (${entries.length} Einträge)`,
    totalMinutes.toString(),
    fmtDe(totalMinutes / 60, 2),
    "",
    fmtDe(totalHonorar, 2),
    "",
    "",
  ]
    .map((v) => csvQuote(String(v)))
    .join(SEP);
  const csvWithTotal = csv + totalRow + "\r\n";

  /* Filename includes from-to range for archival clarity. */
  const fromLabel = parsed.data.from ?? "alle";
  const toLabel = parsed.data.to ?? "heute";
  const filename = `caelex-stunden-${fromLabel}_${toLabel}.csv`;

  logger.info("[atlas/timetracking] datev export", {
    userId: atlas.userId,
    entries: entries.length,
    totalMinutes,
    totalHonorar,
    from: parsed.data.from,
    to: parsed.data.to,
    mandateId: parsed.data.mandateId,
  });

  return new Response(csvWithTotal, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
