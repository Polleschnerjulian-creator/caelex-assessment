"use client";

/**
 * ApplicabilityGateBanner — the Trade "front door" for brand-new orgs.
 *
 * Shown above HomeOnboarding while the org has not yet completed the
 * export-control applicability triage. Answers the clueless first-timer's
 * real first question ("does export control even apply to us, and which
 * rules?") before dropping them into classify + screen.
 *
 * Neon-console style (light): a white rounded card with a soft shadow + a
 * titled header bar, leading with a confident headline and the page's single
 * dark primary action.
 *
 * Presentational only (tsc/eslint/review-gated; jsdom hangs on this machine).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";

export function ApplicabilityGateBanner() {
  return (
    <Link
      href="/trade/applicability"
      data-testid="applicability-gate-banner"
      className="group block overflow-hidden rounded-xl border border-trade-border bg-trade-bg-panel shadow-[var(--trade-shadow-card)] transition hover:border-trade-border-strong"
    >
      <div className="flex items-center justify-between border-b border-trade-border-subtle px-5 py-4">
        <h2 className="text-[14px] font-semibold text-trade-text-primary">
          Orientierung
        </h2>
        <span className="text-[12px] text-trade-text-muted">~2 Min</span>
      </div>
      <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-7">
        <div className="max-w-[540px]">
          <div className="text-[15px] font-semibold leading-snug text-trade-text-primary">
            Klär, welche Exportkontroll-Regeln für dich gelten.
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-trade-text-muted">
            Eine ehrliche Orientierung — keine Rechtsberatung. Danach zeigt
            Passage genau die Schritte, die für deinen Geltungsbereich zählen.
          </p>
        </div>
        <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-trade-text-primary px-4 text-[13px] font-medium text-trade-bg-panel transition group-hover:opacity-90">
          Einschätzung starten
          <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}
