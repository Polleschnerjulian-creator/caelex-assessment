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

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700/40 dark:bg-slate-900/40">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
        <BookOpen size={10} />
        Quellen ({citations.length})
      </div>
      <ul className="divide-y divide-slate-200 dark:divide-slate-800">
        {citations.map((c) => (
          <li
            key={`${c.sourceId}-${c.index}`}
            id={`citation-${c.sourceId}`}
            /* The id is the scroll-anchor target for inline pills
               rendered by MarkdownContent. transition-shadow makes
               the click-ring fade in smoothly when the pill is
               tapped. */
            className="rounded py-2 transition-shadow first:pt-0 last:pb-0 scroll-mt-24"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white font-mono text-[10px] text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                {c.index}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200">
                    {c.citation}
                  </span>
                  <ValidityBadge badge={c.badge} />
                </div>
                {c.title && (
                  <div className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-slate-700 dark:text-slate-300">
                    {c.title}
                  </div>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                  {c.lastVerified && (
                    <span>
                      verified {c.lastVerified}
                      {c.staleDays !== null && c.staleDays > 365 && (
                        <span className="text-amber-600 dark:text-amber-400">
                          {" "}
                          · {Math.floor(c.staleDays / 30)} Mon. alt
                        </span>
                      )}
                    </span>
                  )}
                  {c.occurrences > 1 && <span>· {c.occurrences}× zitiert</span>}
                  {c.amendedBy && c.amendedBy.length > 0 && (
                    <span className="text-orange-600 dark:text-orange-400">
                      · geändert durch {c.amendedBy[0]}
                    </span>
                  )}
                  {c.supersededBy && (
                    <span className="text-orange-600 dark:text-orange-400">
                      · ersetzt durch {c.supersededBy}
                    </span>
                  )}
                </div>
              </div>
              {c.sourceUrl && (
                <a
                  href={c.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-300"
                  title="Offizielle Quelle öffnen"
                >
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
