/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Mandat-Akte Export (Markdown).
 *
 *   GET /api/atlas/mandate/[id]/export
 *
 * Generates a comprehensive Markdown document containing every piece
 * of structured information about the mandate — header, parties,
 * deadlines, time-entries, vault files (filenames only, not blobs),
 * member list, chat list. Lawyer can:
 *   - Save as .md for the firm's document-management system
 *   - Paste into Word / Pages
 *   - Pipe through pandoc for PDF
 *
 * Closes the audit-finding "kein Akte-Export". A real ZIP-with-PDFs
 * is the future iteration (would need to fetch chat-message bodies
 * + transform per-chat via jsPDF on the server, plus stream R2 blobs);
 * Markdown is the highest-value MVP because it captures the structured
 * data the lawyer cares about most and works with every downstream
 * tool.
 *
 * Auth: mandate-membership relation filter. Filename includes mandate
 * slug + ISO date for uniqueness in the firm's archive.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { type NextRequest, NextResponse } from "next/server";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { decryptAtlasField } from "@/lib/atlas/atlas-encryption";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PARTY_TYPE_LABEL: Record<string, string> = {
  client: "Mandant",
  opponent: "Gegner",
  authority: "Behörde",
  co_counsel: "Co-Counsel",
  other: "Sonstige",
};

/* AUDIT-FIX Q04 (2026-05-17): slugify moved to shared
   @/lib/atlas/filename-slug. Wrapper keeps the "mandat" fallback. */
import { slugifyFilename } from "@/lib/atlas/filename-slug";
function slugify(s: string): string {
  return slugifyFilename(s, "mandat");
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: mandateId } = await ctx.params;

  /* Export is potentially expensive (joins across 6+ tables) so use the
     export rate-limit tier instead of api. */
  const rl = await checkRateLimit("export", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    /* Single big fetch — membership-gated via the OR-relation filter. */
    const mandate = await prisma.atlasMandate.findFirst({
      where: {
        id: mandateId,
        organizationId: atlas.organizationId,
        OR: [
          { ownerUserId: atlas.userId },
          { members: { some: { userId: atlas.userId } } },
        ],
      },
      select: {
        id: true,
        name: true,
        clientName: true,
        clientContact: true,
        customInstructions: true,
        jurisdiction: true,
        operatorType: true,
        primaryAuthority: true,
        status: true,
        createdAt: true,
        archivedAt: true,
        closedAt: true,
        owner: { select: { name: true, email: true } },
        parties: {
          orderBy: [{ type: "asc" }, { createdAt: "asc" }],
          select: {
            type: true,
            name: true,
            role: true,
            contact: true,
            address: true,
            reference: true,
            notes: true,
          },
        },
        deadlines: {
          orderBy: { dueAt: "asc" },
          select: {
            title: true,
            description: true,
            dueAt: true,
            warnDays: true,
            status: true,
            url: true,
          },
        },
        timeEntries: {
          orderBy: { workedOn: "desc" },
          take: 200,
          select: {
            description: true,
            minutes: true,
            billable: true,
            hourlyRateEur: true,
            workedOn: true,
            user: { select: { name: true, email: true } },
          },
        },
        files: {
          orderBy: { createdAt: "desc" },
          select: {
            filename: true,
            mimeType: true,
            sizeBytes: true,
            createdAt: true,
          },
        },
        members: {
          orderBy: { addedAt: "asc" },
          select: {
            role: true,
            addedAt: true,
            user: { select: { name: true, email: true } },
          },
        },
        chats: {
          orderBy: { updatedAt: "desc" },
          take: 100,
          select: {
            title: true,
            createdAt: true,
            updatedAt: true,
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

    /* SEC-T0-1 / A-H2: decrypt PII fields before rendering into Markdown.
       decryptAtlasField is idempotent on plaintext + null — safe during
       the dual-read transition. Parallel awaits; other fields are
       non-encrypted and need no special handling. */
    const [clientName, clientContact, customInstructions] = await Promise.all([
      decryptAtlasField(mandate.clientName),
      decryptAtlasField(mandate.clientContact),
      decryptAtlasField(mandate.customInstructions),
    ]);

    /* Build the Markdown document. */
    const lines: string[] = [];
    lines.push(`# Mandats-Akte: ${mandate.name}`);
    lines.push("");
    lines.push(`*Exportiert am ${formatDateTime(new Date())}*`);
    lines.push("");
    lines.push("---");
    lines.push("");

    /* Header / Metadaten */
    lines.push("## Übersicht");
    lines.push("");
    lines.push(`- **Status:** ${mandate.status}`);
    lines.push(
      `- **Owner:** ${mandate.owner?.name ?? mandate.owner?.email ?? "—"}`,
    );
    lines.push(`- **Angelegt:** ${formatDate(mandate.createdAt)}`);
    if (mandate.archivedAt)
      lines.push(`- **Archiviert:** ${formatDate(mandate.archivedAt)}`);
    if (mandate.closedAt)
      lines.push(`- **Geschlossen:** ${formatDate(mandate.closedAt)}`);
    if (clientName) lines.push(`- **Klient:** ${clientName}`);
    if (clientContact) lines.push(`- **Klient-Kontakt:** ${clientContact}`);
    if (mandate.jurisdiction)
      lines.push(`- **Jurisdiktion:** ${mandate.jurisdiction}`);
    if (mandate.operatorType)
      lines.push(`- **Operatortyp:** ${mandate.operatorType}`);
    if (mandate.primaryAuthority)
      lines.push(`- **Primäre Behörde:** ${mandate.primaryAuthority}`);
    lines.push("");

    /* Parteien */
    if (mandate.parties.length > 0) {
      lines.push("## Parteien");
      lines.push("");
      /* Group by type for readability. */
      const grouped = new Map<string, typeof mandate.parties>();
      for (const p of mandate.parties) {
        if (!grouped.has(p.type)) grouped.set(p.type, []);
        grouped.get(p.type)!.push(p);
      }
      for (const [type, items] of grouped) {
        lines.push(`### ${PARTY_TYPE_LABEL[type] ?? type}`);
        lines.push("");
        for (const p of items) {
          lines.push(`**${p.name}**${p.role ? ` — ${p.role}` : ""}`);
          if (p.contact) lines.push(`- Kontakt: ${p.contact}`);
          if (p.address) lines.push(`- Adresse: ${p.address}`);
          if (p.reference) lines.push(`- Aktenzeichen: ${p.reference}`);
          if (p.notes) lines.push(`- Notizen: ${p.notes}`);
          lines.push("");
        }
      }
    }

    /* Deadlines */
    if (mandate.deadlines.length > 0) {
      lines.push("## Fristen");
      lines.push("");
      lines.push("| Status | Fällig | Titel | Vorwarnung | Link |");
      lines.push("|---|---|---|---|---|");
      for (const d of mandate.deadlines) {
        lines.push(
          `| ${d.status} | ${formatDate(d.dueAt)} | ${d.title.replace(/\|/g, "\\|")} | ${d.warnDays} Tage | ${d.url ?? "—"} |`,
        );
      }
      lines.push("");
    }

    /* Stundenerfassung */
    if (mandate.timeEntries.length > 0) {
      const totalMin = mandate.timeEntries.reduce((s, e) => s + e.minutes, 0);
      const billableMin = mandate.timeEntries
        .filter((e) => e.billable)
        .reduce((s, e) => s + e.minutes, 0);
      lines.push("## Stundenerfassung");
      lines.push("");
      lines.push(
        `*Gesamt: ${(totalMin / 60).toFixed(2)}h · davon abrechenbar: ${(billableMin / 60).toFixed(2)}h*`,
      );
      lines.push("");
      lines.push(
        "| Datum | Bearbeiter | Beschreibung | Min | Abrechenbar | Stundensatz |",
      );
      lines.push("|---|---|---|---|---|---|");
      for (const e of mandate.timeEntries) {
        lines.push(
          `| ${formatDate(e.workedOn)} | ${e.user?.name ?? e.user?.email ?? "—"} | ${(e.description ?? "—").replace(/\|/g, "\\|").replace(/\n/g, " ")} | ${e.minutes} | ${e.billable ? "Ja" : "Nein"} | ${e.hourlyRateEur ?? "—"} |`,
        );
      }
      lines.push("");
    }

    /* Vault — filenames only */
    if (mandate.files.length > 0) {
      lines.push("## Vault-Dateien");
      lines.push("");
      lines.push(
        "*(Dateinamen + Metadaten — die Original-Blobs liegen in R2 und sind nicht Teil dieses Exports.)*",
      );
      lines.push("");
      lines.push("| Datei | Typ | Größe | Hochgeladen |");
      lines.push("|---|---|---|---|");
      for (const f of mandate.files) {
        const sizeKb = (f.sizeBytes / 1024).toFixed(1);
        lines.push(
          `| ${f.filename.replace(/\|/g, "\\|")} | ${f.mimeType} | ${sizeKb} KB | ${formatDate(f.createdAt)} |`,
        );
      }
      lines.push("");
    }

    /* Members */
    if (mandate.members.length > 0) {
      lines.push("## Mitglieder");
      lines.push("");
      for (const m of mandate.members) {
        lines.push(
          `- ${m.user?.name ?? m.user?.email ?? "—"} (${m.role}, seit ${formatDate(m.addedAt)})`,
        );
      }
      lines.push("");
    }

    /* Chats — titles only (bodies would be too large for a 1-shot export;
       per-chat export is a future feature). */
    if (mandate.chats.length > 0) {
      lines.push("## Chats");
      lines.push("");
      lines.push(
        "*(Liste der Chat-Titel — der Inhalt jedes Chats kann separat exportiert werden.)*",
      );
      lines.push("");
      for (const c of mandate.chats) {
        lines.push(
          `- ${c.title || "Unbenannter Chat"} *(zuletzt aktualisiert ${formatDateTime(c.updatedAt)})*`,
        );
      }
      lines.push("");
    }

    /* Custom Instructions */
    if (customInstructions) {
      lines.push("## Custom Instructions");
      lines.push("");
      lines.push(customInstructions);
      lines.push("");
    }

    const markdown = lines.join("\n");
    const filename = `atlas-mandat-${slugify(mandate.name)}-${new Date().toISOString().slice(0, 10)}.md`;

    logger.info("[atlas/export] generated", {
      mandateId,
      userId: atlas.userId,
      bytes: markdown.length,
    });

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        /* Avoid intermediate caches; this is per-user export. */
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    logger.error("[atlas/export] failed", {
      mandateId,
      userId: atlas.userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
