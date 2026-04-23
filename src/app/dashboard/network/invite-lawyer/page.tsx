/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * /dashboard/network/invite-lawyer — operator creates a matter to
 * invite a law firm.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { InviteForm } from "@/components/legal-network/InviteForm";

export const dynamic = "force-dynamic";

export default function InviteLawyerPage() {
  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <Link
        href="/dashboard/network/legal-counsel"
        className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-6 inline-block"
      >
        ← Zurück
      </Link>
      <div className="mb-6">
        <div className="text-[10px] tracking-[0.22em] uppercase text-slate-500 mb-2">
          Neues Mandat
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Kanzlei einladen
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Bilateral signiert. Du behältst Kontrolle und kannst den Zugriff
          jederzeit widerrufen.
        </p>
      </div>
      <InviteForm
        returnHref="/dashboard/network/legal-counsel"
        inviteLabel="Einladung erstellen"
        counterpartyLabel="Kanzlei-Organisation (Atlas-Org-ID)"
      />
    </div>
  );
}
