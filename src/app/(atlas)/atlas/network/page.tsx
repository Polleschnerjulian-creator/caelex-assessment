/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * /atlas/network — law firm's matters list.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { MatterTable } from "@/components/legal-network/MatterTable";

export const dynamic = "force-dynamic";

export default function AtlasNetworkPage() {
  return (
    <div className="atlas-themed min-h-screen bg-[var(--atlas-bg-page)] px-8 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-[10px] tracking-[0.22em] uppercase text-[var(--atlas-text-faint)] mb-2">
              Legal Network
            </div>
            <h1 className="text-3xl font-semibold text-[var(--atlas-text-primary)]">
              Deine Mandate
            </h1>
            <p className="text-sm text-[var(--atlas-text-muted)] mt-1">
              Beidseitig konsentierte Beziehungen zu Mandanten-Operators. Jede
              Änderung ist hash-chain-signiert.
            </p>
          </div>
          <Link
            href="/atlas/network/invite"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0f0f12] text-white hover:bg-[#1a1a1f] text-sm font-medium transition border border-white/10"
          >
            + Neues Mandat
          </Link>
        </div>

        <MatterTable
          viewerSide="ATLAS"
          inviteHref="/atlas/network/invite"
          emptyCta="Noch keine Mandate. Lade den ersten Mandanten ein."
        />
      </div>
    </div>
  );
}
