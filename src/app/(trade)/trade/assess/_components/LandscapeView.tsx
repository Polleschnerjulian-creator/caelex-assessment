"use client";

/**
 * Caelex Passage — /trade/assess Screen 3 (Liefer-Landkarte).
 *
 * Renders the engine-derived GO/REVIEW/BLOCKED buckets for the confirmed item
 * over the curated destination set, under the clean-buyer assumption. Each
 * destination is clickable → advances to the single verdict (Screen 4) for the
 * chosen country + the real buyer; a free-text "anderes Ziel" allows any ISO-2.
 *
 * SAFETY (spec §7):
 *  - Every cell is engine-derived — nothing GO is synthesised here (the buckets
 *    come verbatim from POST /api/trade/assess/landscape / runDestinationLandscape).
 *  - The clean-buyer honesty caption (LANDSCAPE_CAPTION) is MANDATORY and is
 *    rendered verbatim: the landscape assumes a clean end-user; the single
 *    verdict on Screen 4 tightens it with the real screening.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState } from "react";
import { ArrowRight, CheckCircle2, AlertTriangle, Ban } from "lucide-react";
import type { LandscapeCell, LandscapeResult } from "@/lib/trade/landscape";

/** One bucket's presentation: heading label + chip class + leading icon. */
const BUCKETS = [
  {
    key: "go" as const,
    label: "GO",
    chip: "trade-chip-success",
    Icon: CheckCircle2,
  },
  {
    key: "review" as const,
    label: "REVIEW",
    chip: "trade-chip-warn",
    Icon: AlertTriangle,
  },
  {
    key: "blocked" as const,
    label: "VERBOTEN",
    chip: "trade-chip-danger",
    Icon: Ban,
  },
];

export function LandscapeView({
  result,
  onChoose,
}: {
  result: LandscapeResult;
  /** Advance to the single verdict for the chosen ISO-2 destination. */
  onChoose: (country: string) => void;
}) {
  const [other, setOther] = useState("");
  const otherIso = other.trim().toUpperCase();
  const otherValid = otherIso.length === 2;

  return (
    <section className="space-y-5" data-testid="assess-landscape-step">
      <div>
        <h2 className="text-lg text-trade-text-primary">Liefer-Landkarte</h2>
        <p className="mt-1 text-sm text-trade-text-muted">
          Wohin du diesen Artikel liefern darfst — derselbe Motor, der auch das
          Einzel-Verdikt berechnet. Wähle ein Ziel, um es mit dem echten Käufer
          zu prüfen.
        </p>
      </div>

      {/* MANDATORY honesty caption — rendered verbatim from the engine result. */}
      <p
        className="rounded-lg border border-trade-border bg-trade-bg-panel px-3 py-2 text-xs text-trade-text-muted"
        data-testid="assess-landscape-caption"
      >
        {result.caption}
      </p>

      <div className="space-y-4">
        {BUCKETS.map(({ key, label, chip, Icon }) => {
          const cells: LandscapeCell[] = result[key];
          return (
            <div
              key={key}
              className="rounded-xl border border-trade-border bg-trade-bg-panel p-4"
              data-testid={`assess-landscape-bucket-${key}`}
            >
              <div className="mb-3 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium ${chip}`}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </span>
                <span className="text-xs text-trade-text-muted">
                  {cells.length}
                </span>
              </div>

              {cells.length === 0 ? (
                <p className="text-xs text-trade-text-muted">
                  Keine Ziele in dieser Kategorie.
                </p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {cells.map((cell) => (
                    <li key={cell.country}>
                      <button
                        type="button"
                        onClick={() => onChoose(cell.country)}
                        className="flex w-full items-start gap-2 rounded-lg border border-trade-border px-3 py-2 text-left transition hover:bg-trade-hover"
                      >
                        <span className="font-semibold text-trade-text-primary">
                          {cell.country}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-xs text-trade-text-muted">
                          {cell.detail}
                        </span>
                        <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-trade-text-muted" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* Free-text fallback — any ISO-2 destination not in the curated set. */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-trade-border bg-trade-bg-panel p-4">
        <label className="block flex-1 text-sm text-trade-text-muted">
          Anderes Ziel
          <input
            value={other}
            onChange={(e) => setOther(e.target.value)}
            placeholder="anderes Ziel (ISO-2, z. B. BR)"
            maxLength={2}
            className="mt-1 w-full rounded-lg border border-trade-border bg-trade-bg-panel px-3 py-2 uppercase text-trade-text-primary"
          />
        </label>
        <button
          type="button"
          disabled={!otherValid}
          onClick={() => onChoose(otherIso)}
          className="inline-flex items-center gap-2 rounded-lg border border-trade-border px-5 py-2.5 text-trade-text-primary transition hover:bg-trade-hover disabled:opacity-40"
        >
          Prüfen <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
