/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * /atlas/network/invite — law firm creates a new matter.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { InviteForm } from "@/components/legal-network/InviteForm";

export const dynamic = "force-dynamic";

export default function AtlasInvitePage() {
  return (
    <div className="atlas-themed min-h-screen bg-[var(--atlas-bg-page)] px-8 py-12">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/atlas/network"
          className="text-xs text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] mb-6 inline-block"
        >
          ← Zurück
        </Link>
        <div className="mb-6">
          <div className="text-[10px] tracking-[0.22em] uppercase text-[var(--atlas-text-faint)] mb-2">
            Neues Mandat
          </div>
          <h1 className="text-2xl font-semibold text-[var(--atlas-text-primary)]">
            Mandant einladen
          </h1>
          <p className="text-sm text-[var(--atlas-text-muted)] mt-1">
            Beidseitiger Handshake — der Mandant muss zustimmen bevor Zugriff
            freigeschaltet wird.
          </p>
        </div>
        <InviteForm
          returnHref="/atlas/network"
          inviteLabel="Einladung erstellen"
          counterpartyLabel="Mandanten-Organisation (Caelex-Org-ID)"
        />

        {/* P0-Compliance · Berufsrechtlicher Hinweis. Stellt sicher dass
            der Anwalt vor Versand weiß, welche Sub-Processoren mandats-
            bezogene Daten verarbeiten und dass alle § 43e BRAO / § 203
            StGB konform verpflichtet sind. */}
        <div className="mt-8 rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-[var(--atlas-text-faint)] mt-0.5">
              Berufsrecht
            </span>
          </div>
          <p className="text-[12px] text-[var(--atlas-text-muted)] leading-relaxed">
            Mit dem Versand einer Einladung erklärst du, dass du die
            Verschwiegenheitspflicht (§ 43a Abs. 2 BRAO) gewahrt hast und der
            Mandant — sobald er die Einladung akzeptiert — der allgemeinen
            Genehmigung nach Art. 28 Abs. 2 DSGVO sowie dem
            Berufsgeheimnisträger-Annex (§ 10a des AVV) zustimmt.
          </p>
          <p className="text-[12px] text-[var(--atlas-text-muted)] leading-relaxed">
            Caelex verpflichtet alle{" "}
            <a
              href="/legal/sub-processors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-dotted hover:text-[var(--atlas-text-primary)]"
            >
              Sub-Auftragsverarbeiter
            </a>{" "}
            (KI-Inferenz, Hosting, Datenbank) ausdrücklich auf § 203 StGB und §
            43e Abs. 3 BRAO. Drittlandtransfer ausschließlich unter EU-US Data
            Privacy Framework + Standardvertragsklauseln + Zero-Data- Retention.
            Volltext im{" "}
            <a
              href="/legal/dpa"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-dotted hover:text-[var(--atlas-text-primary)]"
            >
              AVV
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
