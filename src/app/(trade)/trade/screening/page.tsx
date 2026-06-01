/**
 * /trade/screening — Sanctions Screening Triage (UI Phase 3C).
 *
 * RSC shell that renders the client-side triage work queue. Auth + sidebar +
 * badge counts come from the (trade)/trade layout, so this page inherits the
 * same chrome as /trade/parties. The queue itself is fetched client-side by
 * <ScreeningTriageTable /> from the existing /api/trade/parties endpoint.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { ScreeningTriageTable } from "./ScreeningTriageTable";
import { Term } from "../_components/Term";

export const metadata = { title: "Screening Triage · Caelex Trade" };

export default function ScreeningTriagePage() {
  return (
    <div className="mx-auto max-w-screen-2xl px-8 py-8">
      <header className="mb-7 border-b border-trade-border-subtle pb-5">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-muted">
          <Link
            href="/trade"
            className="transition hover:text-trade-text-primary"
          >
            Trade Operations
          </Link>{" "}
          <span className="text-trade-border-strong">/</span>{" "}
          <span className="text-trade-text-secondary">Screening Triage</span>
        </div>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-trade-text-primary">
          Sanctions Screening Triage
        </h1>
        <p className="mt-1.5 max-w-2xl text-[14px] text-trade-text-secondary">
          Potential matches, stale, and unscreened counterparties — ordered by
          urgency. Re-screen in bulk (free, in-memory) and resolve each hit with
          an audited decision.
        </p>
      </header>

      <ScreeningTriageTable />

      <p
        lang="de"
        className="mt-8 max-w-3xl text-[11px] leading-relaxed text-trade-text-muted"
      >
        Sanctions-Screening ist ein Werkzeug zur Decision-Support, kein Counsel.
        Treffer erfordern menschliche Triage durch qualifizierten AV. Bestätigte
        Treffer blockieren den Partner für neue Vorgänge. Verstöße gegen{" "}
        <Term>OFAC</Term>/EU-Sanktionen können zu erheblichen Bußen führen.
      </p>
    </div>
  );
}
