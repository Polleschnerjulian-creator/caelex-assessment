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
      </div>
    </div>
  );
}
