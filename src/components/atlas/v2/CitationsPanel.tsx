"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Citations Panel (UI refresh 2026-05-12, theme-aware).
 *
 * Renders the structured citations array (from
 * AtlasMessage.citations, populated by extractCitations) under each
 * assistant message. Lists each cited source with:
 *   - index (matches inline ① ② … pills, future Sprint)
 *   - badge (🟢 in force / 🟡 needs review / ⚠️ amended / ⚠️ repealed)
 *   - title (truncated)
 *   - last_verified date
 *   - sourceUrl link (opens the official portal)
 *
 * Sprint 5+ will replace the [ATLAS:…] tokens in the assistant text
 * with clickable inline pills that scroll to the matching panel row.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { ExternalLink, BookOpen } from "lucide-react";
import { ValidityBadge } from "./ValidityBadge";
import type { ValidityBadge as Badge } from "@/lib/atlas/validity-tools.server";

export interface CitationRecord {
  index: number;
  occurrences: number;
  citation: string;
  sourceId: string;
  badge: Badge;
  title: string | null;
  lastVerified: string | null;
  staleDays: number | null;
  amendedBy: string[] | null;
  supersededBy: string | null;
  sourceUrl: string | null;
  status: string | null;
}

interface Props {
  citations: CitationRecord[];
}

export function CitationsPanel({ citations }: Props) {
  if (citations.length === 0) return null;

  /* Lightweight in-flow listing — no heavy card chrome (no border,
     no card-bg, no rounded-lg). Sits as a tiny "Quellen"-Section
     under the answer with each citation as a single text-line.
     Reads like institutional-document footnote, not like a SaaS
     widget. Matches the lawyer's expected document layout. */
  return (
    <div className="mt-4 border-t border-slate-200 pt-3 dark:border-white/[0.06]">
      <div className="mb-2.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
        <BookOpen size={10} />
        Quellen ({citations.length})
      </div>
      <ol className="space-y-1.5">
        {citations.map((c) => (
          <li
            key={`${c.sourceId}-${c.index}`}
            id={`citation-${encodeURIComponent(c.sourceId)}`}
            className="group/cite -mx-2 flex scroll-mt-24 items-baseline gap-2 rounded-lg px-2 py-1 text-[11.5px] leading-snug text-slate-600 transition-colors hover:bg-black/[0.025] dark:text-slate-400 dark:hover:bg-white/[0.03]"
          >
            <span className="shrink-0 tabular-nums text-slate-400 dark:text-slate-500">
              {c.index}.
            </span>
            <div className="min-w-0 flex-1">
              {/* Internal link to the Atlas-Source detail page —
                  clicking the citation-token + title navigates to
                  /atlas/sources/<sourceId> where the lawyer sees
                  the full text + amendments + verification history.
                  External link (ExternalLink icon on the right)
                  still opens the official source portal in a new
                  tab. Two-link pattern = "open in Atlas" vs.
                  "open at the source". */}
              <Link
                href={`/atlas/sources/${encodeURIComponent(c.sourceId)}`}
                className="transition-colors hover:text-slate-900 dark:hover:text-slate-100"
                title={`Atlas-Seite zu ${c.sourceId} öffnen`}
              >
                <span className="font-mono text-[10.5px] text-slate-700 dark:text-slate-300">
                  {c.citation}
                </span>
                {c.title && (
                  <>
                    <span className="text-slate-400 dark:text-slate-600">
                      {" "}
                      ·{" "}
                    </span>
                    <span className="text-slate-700 underline-offset-2 hover:underline dark:text-slate-300">
                      {c.title}
                    </span>
                  </>
                )}
              </Link>
              <ValidityBadge badge={c.badge} />
              {c.lastVerified && (
                <span className="ml-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                  · {c.lastVerified}
                  {c.staleDays !== null && c.staleDays > 365 && (
                    <span className="text-amber-600 dark:text-amber-400">
                      {" "}
                      ({Math.floor(c.staleDays / 30)} Mon. alt)
                    </span>
                  )}
                </span>
              )}
              {c.occurrences > 1 && (
                <span className="ml-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                  · {c.occurrences}×
                </span>
              )}
              {c.amendedBy && c.amendedBy.length > 0 && (
                <span className="ml-1.5 text-[10px] text-amber-600 dark:text-amber-400">
                  · geändert durch {c.amendedBy[0]}
                </span>
              )}
              {c.supersededBy && (
                <span className="ml-1.5 text-[10px] text-amber-600 dark:text-amber-400">
                  · ersetzt durch {c.supersededBy}
                </span>
              )}
            </div>
            {c.sourceUrl && (
              <a
                href={c.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
                title="Offizielles Portal öffnen (extern)"
              >
                <ExternalLink size={10} />
              </a>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
