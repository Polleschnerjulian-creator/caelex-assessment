"use client";

/**
 * ApplicabilityGateBanner — the Trade "front door" for brand-new orgs.
 *
 * Shown above HomeOnboarding while the org has not yet completed the
 * export-control applicability triage. Answers the clueless first-timer's
 * real first question ("does export control even apply to us, and which
 * rules?") before dropping them into classify + screen. Once the triage is
 * done, the home swaps this for a compact "dein Geltungsbereich" chip.
 *
 * Presentational only (tsc/eslint/review-gated; jsdom hangs on this machine).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { Compass, ArrowRight } from "lucide-react";

export function ApplicabilityGateBanner() {
  return (
    <Link
      href="/trade/applicability"
      data-testid="applicability-gate-banner"
      className="group relative block overflow-hidden rounded-xl border border-trade-accent/40 bg-gradient-to-br from-indigo-600 to-indigo-500 px-6 py-5 shadow-[0_8px_30px_rgba(79,70,229,0.30)] transition hover:shadow-[0_10px_36px_rgba(79,70,229,0.40)]"
    >
      <div className="flex items-center gap-4">
        <div
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white"
        >
          <Compass className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-medium uppercase tracking-wide text-white/80">
            Neu hier?
          </div>
          <div className="mt-0.5 text-[16px] font-semibold text-white">
            Klär in ~2 Minuten, welche Exportkontroll-Regeln für dich gelten.
          </div>
          <div className="mt-0.5 text-[13px] text-white/90">
            Eine ehrliche Orientierung — keine Rechtsberatung. Danach zeigt dir
            Trade genau deine Schritte.
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-[13px] font-semibold text-indigo-700 transition group-hover:bg-white/95">
          Einschätzung starten
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
