"use client";

/**
 * ApplicabilityGateBanner — the Trade "front door" for brand-new orgs.
 *
 * Shown above HomeOnboarding while the org has not yet completed the
 * export-control applicability triage. Answers the clueless first-timer's
 * real first question ("does export control even apply to us, and which
 * rules?") before dropping them into classify + screen. Once the triage is
 * done, the home swaps this for a compact "dein Geltungsbereich" row.
 *
 * Premium technical language (Apple × Palantir, light): a flat, hairline-
 * framed ORIENTIERUNG section — no card, no gradient — leading with a
 * confident headline and the page's single solid-ink primary action.
 *
 * Presentational only (tsc/eslint/review-gated; jsdom hangs on this machine).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";

export function ApplicabilityGateBanner() {
  return (
    <section className="py-7">
      <div className="mb-5 flex items-baseline justify-between">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-trade-text-muted">
          Orientierung
        </span>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-trade-text-muted">
          ~2 Min
        </span>
      </div>

      <Link
        href="/trade/applicability"
        data-testid="applicability-gate-banner"
        className="group flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-7"
      >
        <div className="max-w-[500px]">
          <h2 className="text-[18px] font-semibold leading-snug tracking-[-0.018em] text-trade-text-primary">
            Klär, welche Exportkontroll-Regeln für dich gelten.
          </h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-trade-text-muted">
            Eine ehrliche Orientierung — keine Rechtsberatung. Danach zeigt
            Passage genau die Schritte, die für deinen Geltungsbereich zählen.
          </p>
        </div>
        <span className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-trade-text-primary px-[17px] text-[12.5px] font-semibold text-trade-bg-panel shadow-sm transition group-hover:-translate-y-px">
          Einschätzung starten
          <span className="font-mono opacity-80">→</span>
        </span>
      </Link>
    </section>
  );
}
