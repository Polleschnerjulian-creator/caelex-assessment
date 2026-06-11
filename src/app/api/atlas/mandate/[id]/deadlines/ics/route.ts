/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Fristen-Export als ICS-Kalender.
 *
 *   GET /api/atlas/mandate/[id]/deadlines/ics
 *
 * Liefert die OFFENEN Fristen eines Mandats als hand-gerollte
 * iCalendar-Datei (RFC 5545) zum Import in Outlook / Apple Kalender /
 * Google Calendar. Jede Frist wird zum ganztägigen VEVENT am Berliner
 * Kalendertag des Fälligkeitszeitpunkts (DTSTART;VALUE=DATE, DTEND =
 * Folgetag — exklusives Ende per RFC).
 *
 * Bewusst OHNE Library: VCALENDAR/VEVENT sind hier 10 Properties;
 * TEXT-Escaping (§3.3.11), CRLF-Zeilenenden und Line-Folding bei
 * > 75 Oktetten (§3.1) sind unten implementiert + per route.test.ts
 * gepinnt.
 *
 * Auth: exakt wie die Geschwister-Routen unter /deadlines —
 * getAtlasAuth → 401, await params, checkMandateMembership → 403.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { type NextRequest, NextResponse } from "next/server";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { checkMandateMembership } from "@/lib/atlas/mandate-membership";
import { slugifyFilename } from "@/lib/atlas/filename-slug";
import { berlinDayString } from "@/lib/atlas/deadline-date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ── ICS-Bausteine (RFC 5545) ──────────────────────────────────────────── */

/** TEXT-Escaping §3.3.11: Backslash ZUERST, dann Semikolon, Komma,
 *  Zeilenumbrüche als literales \n. */
function escapeIcsText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

const utf8 = new TextEncoder();

/** Line-Folding §3.1: physische Zeilen > 75 OKTETTE (UTF-8-Bytes, nicht
 *  Zeichen) werden mit CRLF + einem Space fortgesetzt. Wir falten an
 *  Codepoint-Grenzen, damit kein Multi-Byte-Zeichen (ü, §, —) zerschnitten
 *  wird; Folgezeilen budgetieren den führenden Space mit ein. */
function foldIcsLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const ch of line) {
    const chBytes = utf8.encode(ch).length;
    if (currentBytes + chBytes > 75) {
      out.push(current);
      current = " ";
      currentBytes = 1;
    }
    current += ch;
    currentBytes += chBytes;
  }
  out.push(current);
  return out;
}

/** "2026-06-15" → "20260615" (DATE-Basisformat). */
function icsDate(day: string): string {
  return day.replace(/-/g, "");
}

/** Folgetag eines "YYYY-MM-DD" — DTEND ist bei ganztägigen Events
 *  exklusiv, der Folgetag ergibt also genau einen Tag Dauer. */
function nextDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/** DTSTAMP im UTC-Basisformat: 2026-06-11T08:30:00.000Z → 20260611T083000Z */
function icsUtcStamp(at: Date): string {
  return at
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

interface IcsDeadline {
  id: string;
  title: string;
  description: string | null;
  dueAt: Date;
  url: string | null;
}

function buildIcs(mandateName: string, deadlines: IcsDeadline[]): string {
  const dtStamp = icsUtcStamp(new Date());
  const logical: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Caelex//Atlas//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(`Fristen — ${mandateName}`)}`,
  ];
  for (const d of deadlines) {
    const day = berlinDayString(d.dueAt);
    logical.push(
      "BEGIN:VEVENT",
      `UID:${d.id}@caelex.eu`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART;VALUE=DATE:${icsDate(day)}`,
      `DTEND;VALUE=DATE:${icsDate(nextDay(day))}`,
      `SUMMARY:${escapeIcsText(d.title)}`,
    );
    if (d.description) {
      logical.push(`DESCRIPTION:${escapeIcsText(d.description)}`);
    }
    /* URL ist VALUE=URI — kein TEXT-Escaping (Kommata/Semikola sind in
       URIs legitim); Folding greift trotzdem. */
    if (d.url) logical.push(`URL:${d.url}`);
    logical.push("END:VEVENT");
  }
  logical.push("END:VCALENDAR");
  return logical.flatMap(foldIcsLine).join("\r\n") + "\r\n";
}

/* ── Handler ───────────────────────────────────────────────────────────── */

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: mandateId } = await ctx.params;
  if (
    !(await checkMandateMembership(
      mandateId,
      atlas.userId,
      atlas.organizationId,
    ))
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rl = await checkRateLimit("api", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const mandate = await prisma.atlasMandate.findUnique({
      where: { id: mandateId },
      select: {
        name: true,
        deadlines: {
          where: { status: "open" },
          orderBy: { dueAt: "asc" },
          take: 500,
          select: {
            id: true,
            title: true,
            description: true,
            dueAt: true,
            url: true,
          },
        },
      },
    });
    if (!mandate) {
      return NextResponse.json(
        { error: "Mandat nicht gefunden" },
        { status: 404 },
      );
    }

    const ics = buildIcs(mandate.name, mandate.deadlines);
    const filename = `atlas-fristen-${slugifyFilename(mandate.name, "mandat")}.ics`;

    logger.info("[atlas/deadlines/ics] exported", {
      mandateId,
      userId: atlas.userId,
      events: mandate.deadlines.length,
    });

    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        /* Per-User-Export — niemals in Zwischen-Caches. */
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    logger.error("[atlas/deadlines/ics] failed", {
      mandateId,
      userId: atlas.userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
