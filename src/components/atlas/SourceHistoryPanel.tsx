"use client";

import { useEffect, useState } from "react";
import { History, ChevronDown, ChevronRight } from "lucide-react";
import { RedlineView } from "./RedlineView";
import type { DiffSegment } from "@/lib/atlas/redline";

/**
 * Public-facing amendment history for a single Atlas source. Fetches
 * /api/atlas/sources/[id]/history (cached by the API for its duration)
 * and renders a chronological list of admin-approved changes, each with
 * the Claude summary + an inline word-level redline.
 *
 * Only surfaced when there is at least one approved amendment — new
 * sources or quiet sources show nothing rather than an empty card.
 */

interface Amendment {
  id: string;
  detectedAt: string;
  diffSummaryAi: string | null;
  diffKeyChanges: unknown;
  integratedAt: string | null;
  segments: DiffSegment[];
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function keyChangesArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

export function SourceHistoryPanel({ sourceId }: { sourceId: string }) {
  const [amendments, setAmendments] = useState<Amendment[] | null>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/atlas/sources/${encodeURIComponent(sourceId)}/history`, {
      cache: "force-cache",
    })
      .then((r) => (r.ok ? r.json() : { amendments: [] }))
      .then((data) => {
        if (!cancelled) setAmendments(data.amendments ?? []);
      })
      .catch(() => {
        if (!cancelled) setAmendments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [sourceId]);

  // Null = still loading; [] = loaded but nothing to show. In both
  // cases we render nothing — history is a progressive-enhancement
  // feature that shouldn't push layout around.
  if (!amendments || amendments.length === 0) return null;

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className="mt-8" aria-labelledby="history-heading">
      <div className="flex items-center gap-2 mb-4">
        <History
          size={15}
          className="text-[var(--atlas-text-muted)]"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <h2
          id="history-heading"
          className="text-[11px] font-semibold text-[var(--atlas-text-muted)] tracking-[0.15em] uppercase"
        >
          Detected amendments
        </h2>
        <span className="text-[11px] text-[var(--atlas-text-faint)]">
          {amendments.length}
        </span>
      </div>

      <div className="space-y-2 max-w-3xl">
        {amendments.map((a) => {
          const isOpen = openIds.has(a.id);
          const tags = keyChangesArray(a.diffKeyChanges);
          return (
            <article
              key={a.id}
              className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)]"
            >
              <button
                type="button"
                onClick={() => toggle(a.id)}
                aria-expanded={isOpen}
                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[var(--atlas-bg-surface-muted)] transition-colors rounded-xl"
              >
                {isOpen ? (
                  <ChevronDown
                    size={14}
                    className="text-[var(--atlas-text-faint)] mt-0.5 flex-shrink-0"
                    strokeWidth={1.5}
                  />
                ) : (
                  <ChevronRight
                    size={14}
                    className="text-[var(--atlas-text-faint)] mt-0.5 flex-shrink-0"
                    strokeWidth={1.5}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[11px] font-medium text-[var(--atlas-text-secondary)]">
                      {formatDate(a.detectedAt)}
                    </span>
                    {a.integratedAt && (
                      <span className="text-[9px] font-medium uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                        Integrated
                      </span>
                    )}
                    {tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="text-[9px] font-medium text-[var(--atlas-text-secondary)] bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] rounded px-1.5 py-0.5"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <p className="text-[12px] text-[var(--atlas-text-secondary)] leading-relaxed">
                    {a.diffSummaryAi ?? "Amendment detected."}
                  </p>
                </div>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-[var(--atlas-border-subtle)]">
                  <RedlineView segments={a.segments} />
                </div>
              )}
            </article>
          );
        })}
      </div>

      <p className="mt-3 text-[10px] text-[var(--atlas-text-faint)] max-w-2xl">
        Amendments detected automatically against the official source URL and
        reviewed by a Caelex editor before being published here.
      </p>
    </section>
  );
}
