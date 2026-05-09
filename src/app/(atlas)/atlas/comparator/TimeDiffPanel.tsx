"use client";

/**
 * Atlas Comparator — Time-travel diff panel (D2/Time-travel BOLD).
 *
 * "What changed for DE between 2024-01-01 and 2026-05-01?" Slide-over
 * panel showing every legal-source event in the (from, to] window for
 * each selected jurisdiction. Powered by `comparator-time-diff.ts`'s
 * computeTimeDiff() over the existing forecast-engine event feed.
 */

import { useMemo, useState } from "react";
import { ArrowRight, Clock, X } from "lucide-react";
import {
  computeTimeDiff,
  type TimeDiffResult,
} from "@/lib/atlas/comparator-time-diff";
import type { SpaceLawCountryCode } from "@/lib/space-law-types";
import { JURISDICTION_DATA } from "@/data/national-space-laws";

interface TimeDiffPanelProps {
  open: boolean;
  onClose: () => void;
  jurisdictions: SpaceLawCountryCode[];
  language: "de" | "en" | "fr" | "es";
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoNYearsAgo(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

export function TimeDiffPanel({
  open,
  onClose,
  jurisdictions,
  language,
}: TimeDiffPanelProps) {
  const isDe = language === "de";
  /* Default window: last 24 months. Most "what changed?" memos in
     the partner's day-job span 1-2 years. */
  const [fromIso, setFromIso] = useState(() => isoNYearsAgo(2));
  const [toIso, setToIso] = useState(() => todayIso());

  const result = useMemo<TimeDiffResult>(() => {
    return computeTimeDiff(new Date(fromIso), new Date(toIso), jurisdictions);
  }, [fromIso, toIso, jurisdictions]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isDe ? "Zeit-Differenzansicht" : "Time-travel diff"}
      className="fixed inset-0 z-40 flex"
      onClick={onClose}
    >
      <div className="flex-1 bg-black/30 backdrop-blur-sm" />
      <aside
        className="w-full max-w-lg h-full bg-[var(--atlas-bg-surface)] border-l border-[var(--atlas-border)] shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 px-5 py-4 border-b border-[var(--atlas-border-subtle)] bg-[var(--atlas-bg-surface)] flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Clock
                className="h-3.5 w-3.5 text-[var(--atlas-text-faint)]"
                strokeWidth={1.8}
              />
              <span className="text-[10px] font-semibold tracking-widest text-[var(--atlas-text-faint)] uppercase">
                {isDe ? "Was hat sich geändert?" : "What changed?"}
              </span>
            </div>
            <h2 className="text-[15px] font-semibold text-[var(--atlas-text-primary)]">
              {isDe ? "Zeit-Differenz" : "Time-travel diff"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isDe ? "Schließen" : "Close"}
            className="flex-shrink-0 p-1.5 rounded-md text-[var(--atlas-text-faint)] hover:text-[var(--atlas-text-primary)] hover:bg-[var(--atlas-bg-inset)] transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Date-range picker */}
          <div className="flex items-end gap-3">
            <label className="flex-1">
              <span className="block text-[10px] font-semibold tracking-widest text-[var(--atlas-text-muted)] uppercase mb-1">
                {isDe ? "Von" : "From"}
              </span>
              <input
                type="date"
                value={fromIso}
                onChange={(e) => setFromIso(e.target.value)}
                max={toIso}
                className="w-full bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] rounded-md px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] outline-none focus:border-[var(--atlas-border-strong)]"
              />
            </label>
            <ArrowRight
              className="h-4 w-4 text-[var(--atlas-text-faint)] mb-2"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <label className="flex-1">
              <span className="block text-[10px] font-semibold tracking-widest text-[var(--atlas-text-muted)] uppercase mb-1">
                {isDe ? "Bis" : "To"}
              </span>
              <input
                type="date"
                value={toIso}
                onChange={(e) => setToIso(e.target.value)}
                min={fromIso}
                className="w-full bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] rounded-md px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] outline-none focus:border-[var(--atlas-border-strong)]"
              />
            </label>
          </div>

          {/* Quick-range chips */}
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { label: isDe ? "12 Monate" : "12 months", years: 1 },
                { label: isDe ? "24 Monate" : "24 months", years: 2 },
                { label: isDe ? "5 Jahre" : "5 years", years: 5 },
              ] as const
            ).map(({ label, years }) => (
              <button
                key={years}
                type="button"
                onClick={() => {
                  setFromIso(isoNYearsAgo(years));
                  setToIso(todayIso());
                }}
                className="px-2 py-0.5 text-[10.5px] font-medium text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] bg-[var(--atlas-bg-inset)] hover:bg-[var(--atlas-bg-surface-muted)] rounded transition-colors"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Aggregate summary */}
          <div className="rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface-muted)] px-3 py-2.5 text-[12px]">
            {result.uniqueEventCount === 0 ? (
              <span className="text-[var(--atlas-text-muted)]">
                {isDe
                  ? "Keine regulatorischen Änderungen in diesem Zeitfenster für die ausgewählten Jurisdiktionen."
                  : "No regulatory changes in this window for the selected jurisdictions."}
              </span>
            ) : (
              <span className="font-medium text-[var(--atlas-text-primary)]">
                {result.uniqueEventCount}{" "}
                {isDe
                  ? `${result.uniqueEventCount === 1 ? "Änderung" : "Änderungen"} insgesamt`
                  : `${result.uniqueEventCount === 1 ? "change" : "changes"} total`}
              </span>
            )}
          </div>

          {/* Per-jurisdiction breakdown */}
          <div className="space-y-3">
            {result.byJurisdiction.map(({ jurisdictionCode, events }) => {
              const data = JURISDICTION_DATA.get(
                jurisdictionCode as SpaceLawCountryCode,
              );
              return (
                <div
                  key={jurisdictionCode}
                  className="rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-3 py-2 bg-[var(--atlas-bg-surface-muted)] border-b border-[var(--atlas-border-subtle)]">
                    <span className="text-[11px] font-bold tracking-wider text-[var(--atlas-text-secondary)]">
                      {jurisdictionCode}
                    </span>
                    <span className="text-[12px] text-[var(--atlas-text-primary)]">
                      {data?.countryName ?? jurisdictionCode}
                    </span>
                    <span className="ml-auto text-[10.5px] text-[var(--atlas-text-muted)] font-mono tabular-nums">
                      {events.length}{" "}
                      {events.length === 1
                        ? isDe
                          ? "Änderung"
                          : "change"
                        : isDe
                          ? "Änderungen"
                          : "changes"}
                    </span>
                  </div>
                  {events.length === 0 ? (
                    <div className="px-3 py-3 text-[11.5px] text-[var(--atlas-text-faint)] italic">
                      {isDe
                        ? "Keine Änderungen in diesem Zeitfenster."
                        : "No changes in this window."}
                    </div>
                  ) : (
                    <ul className="divide-y divide-[var(--atlas-border-subtle)]">
                      {events.map((e) => (
                        <li
                          key={`${jurisdictionCode}-${e.id}`}
                          className="px-3 py-2.5 text-[12px]"
                        >
                          <div className="flex items-baseline justify-between gap-2 mb-0.5">
                            <span className="font-medium text-[var(--atlas-text-primary)] truncate">
                              {e.label}
                            </span>
                            <span className="text-[10px] text-[var(--atlas-text-faint)] font-mono tabular-nums shrink-0">
                              {e.effectiveDate}
                            </span>
                          </div>
                          <div className="text-[11px] text-[var(--atlas-text-muted)] leading-relaxed">
                            {e.summary}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[var(--atlas-text-faint)]">
                            {e.dimensions.map((d) => (
                              <span
                                key={d}
                                className="px-1.5 py-0.5 rounded bg-[var(--atlas-bg-inset)] uppercase tracking-wider"
                              >
                                {d.replace("_", " ")}
                              </span>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}
