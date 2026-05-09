"use client";

/**
 * Atlas Comparator — Cell Source Panel (D4).
 *
 * Click any cell in ComparisonTable → side panel shows the primary-
 * source provenance for that exact assertion: the verbatim cell value,
 * the jurisdiction's legislation name + status + year, the keyArticles
 * (when known), a deep-link to the official text URL (national gazette
 * / EUR-Lex / etc.), and an in-Atlas link to the jurisdiction's full
 * detail page.
 *
 * Verification loop goes from "leave the comparator → search the
 * gazette → find the article" (3+ minutes) to "click cell → click
 * official text" (5 seconds).
 *
 * Ships without per-cell articleRef data because most RowDef accessors
 * compute composite values (e.g. "yes — €60M") that aren't tied to a
 * single article. The data model has articleRef on
 * `licensingRequirements[]` + `applicabilityRules[]`; threading those
 * through is a stage-2 enhancement.
 */

import { ExternalLink, X, FileText } from "lucide-react";
import Link from "next/link";
import type { JurisdictionLaw } from "@/lib/space-law-types";

interface CellSourcePanelProps {
  open: boolean;
  onClose: () => void;
  /** The cell's content + the source it came from. Set together when
   *  the user clicks a cell, cleared on dismiss. */
  cell: {
    rowLabel: string;
    value: string;
    jurisdiction: JurisdictionLaw;
  } | null;
  language: "de" | "en" | "fr" | "es";
}

export function CellSourcePanel({
  open,
  onClose,
  cell,
  language,
}: CellSourcePanelProps) {
  if (!open || !cell) return null;
  const isDe = language === "de";
  const { rowLabel, value, jurisdiction: j } = cell;
  const url = j.legislation.officialUrl;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={
        isDe
          ? `Primärquelle für ${j.countryName}`
          : `Primary source for ${j.countryName}`
      }
      /* Right-side slide-over. Click the dim backdrop to dismiss. */
      className="fixed inset-0 z-40 flex"
      onClick={onClose}
    >
      <div className="flex-1 bg-black/30 backdrop-blur-sm" />
      <aside
        className="w-full max-w-md h-full bg-[var(--atlas-bg-surface)] border-l border-[var(--atlas-border)] shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--atlas-border-subtle)] bg-[var(--atlas-bg-surface)]">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-[10px] font-semibold tracking-widest text-[var(--atlas-text-faint)] uppercase">
                {j.countryCode}
              </span>
              <span className="text-[14px] font-medium text-[var(--atlas-text-primary)]">
                {j.countryName}
              </span>
              <span aria-hidden className="text-[16px]">
                {j.flagEmoji}
              </span>
            </div>
            <h2 className="text-[15px] font-semibold text-[var(--atlas-text-primary)] leading-tight">
              {rowLabel}
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
          {/* The cell value, verbatim */}
          <section>
            <h3 className="text-[10px] font-semibold tracking-widest text-[var(--atlas-text-muted)] uppercase mb-2">
              {isDe ? "Wert in dieser Zelle" : "Cell value"}
            </h3>
            <div className="rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface-muted)] px-3 py-2.5 text-[13px] text-[var(--atlas-text-primary)] font-medium">
              {value}
            </div>
          </section>

          {/* Primary legislation */}
          <section>
            <h3 className="text-[10px] font-semibold tracking-widest text-[var(--atlas-text-muted)] uppercase mb-2">
              {isDe ? "Maßgebliches Gesetz" : "Governing legislation"}
            </h3>
            <div className="space-y-2 text-[12.5px] text-[var(--atlas-text-secondary)]">
              <div>
                <div className="font-medium text-[var(--atlas-text-primary)]">
                  {j.legislation.name}
                </div>
                {j.legislation.nameLocal &&
                  j.legislation.nameLocal !== j.legislation.name && (
                    <div className="text-[11.5px] italic text-[var(--atlas-text-muted)] mt-0.5">
                      {j.legislation.nameLocal}
                    </div>
                  )}
              </div>
              <div className="flex items-center gap-3 text-[11px] text-[var(--atlas-text-muted)]">
                <span>
                  {isDe ? "Erlassen" : "Enacted"} {j.legislation.yearEnacted}
                </span>
                {j.legislation.yearAmended && (
                  <span>
                    · {isDe ? "Geändert" : "Amended"}{" "}
                    {j.legislation.yearAmended}
                  </span>
                )}
                <span className="ml-auto inline-flex items-center px-1.5 py-0.5 rounded font-mono uppercase text-[9px] tracking-wider bg-[var(--atlas-bg-inset)] text-[var(--atlas-text-secondary)]">
                  {j.legislation.status}
                </span>
              </div>
              {j.legislation.keyArticles && (
                <div className="text-[11.5px] text-[var(--atlas-text-muted)] pt-1 border-t border-[var(--atlas-border-subtle)]">
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-[var(--atlas-text-faint)] mr-1.5">
                    {isDe ? "Schlüsselartikel" : "Key articles"}:
                  </span>
                  {j.legislation.keyArticles}
                </div>
              )}
            </div>
          </section>

          {/* Authority */}
          <section>
            <h3 className="text-[10px] font-semibold tracking-widest text-[var(--atlas-text-muted)] uppercase mb-2">
              {isDe ? "Zuständige Behörde" : "Licensing authority"}
            </h3>
            <div className="text-[12.5px] text-[var(--atlas-text-secondary)]">
              <div className="font-medium text-[var(--atlas-text-primary)]">
                {j.licensingAuthority.name}
              </div>
              {j.licensingAuthority.parentMinistry && (
                <div className="text-[11.5px] text-[var(--atlas-text-muted)] mt-0.5">
                  {j.licensingAuthority.parentMinistry}
                </div>
              )}
              {j.licensingAuthority.website && (
                <a
                  href={j.licensingAuthority.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1.5 text-[11.5px] text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  {j.licensingAuthority.website.replace(/^https?:\/\//, "")}
                  <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                </a>
              )}
            </div>
          </section>

          {/* Action row — primary verify path */}
          <section className="pt-3 border-t border-[var(--atlas-border-subtle)]">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--atlas-action-bg)] text-[var(--atlas-action-text)] text-[13px] font-medium hover:bg-[var(--atlas-action-bg-hover)] transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} />
                {isDe
                  ? "Am offiziellen Text prüfen"
                  : "Verify at official text"}
              </a>
            ) : (
              <div className="text-[11.5px] text-center text-[var(--atlas-text-muted)] italic py-2">
                {isDe
                  ? "Kein offizieller Volltext-Link hinterlegt — nutzen Sie die Atlas-Detailseite oder die Behörden-Website oben."
                  : "No official-text URL on file — use the Atlas detail page or the authority website above."}
              </div>
            )}
            <Link
              href={`/atlas/jurisdictions/${encodeURIComponent(j.countryCode)}`}
              className="mt-2 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[var(--atlas-border)] text-[12px] font-medium text-[var(--atlas-text-secondary)] hover:text-[var(--atlas-text-primary)] hover:bg-[var(--atlas-bg-inset)] transition-colors"
            >
              <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
              {isDe
                ? `${j.countryName} in Atlas öffnen`
                : `Open ${j.countryName} in Atlas`}
            </Link>
          </section>
        </div>
      </aside>
    </div>
  );
}
