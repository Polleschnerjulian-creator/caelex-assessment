/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * /dashboard/network/legal-counsel — operator's law firm list.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { MatterTable } from "@/components/legal-network/MatterTable";

export const dynamic = "force-dynamic";

export default function LegalCounselPage() {
  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase text-slate-500 mb-2">
            Legal Network
          </div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
            Meine Anwälte
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kanzleien mit Zugriff auf deine Compliance-Daten. Jeder Zugriff ist
            hash-chain-signiert und im Audit-Log nachvollziehbar.
          </p>
        </div>
        <Link
          href="/dashboard/network/invite-lawyer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-medium hover:opacity-90 transition"
        >
          + Kanzlei einladen
        </Link>
      </div>

      <MatterTable
        viewerSide="CAELEX"
        inviteHref="/dashboard/network/invite-lawyer"
        emptyCta="Noch keine Anwälte. Lade eine Kanzlei ein."
      />
    </div>
  );
}
