/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /dashboard/network/inbox — pending Legal Network invitations for
 * the operator's (or firm's) currently-active organisation.
 *
 * Session-authenticated alternative to the email-token path: gives
 * recipients a stable place to find their invites even when the
 * email is lost. Accept/reject is a one-click action; scope-narrowing
 * (amend) opens a side panel for per-permission adjustments.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { InboxList } from "@/components/legal-network/inbox/InboxList";

export const dynamic = "force-dynamic";

export default function NetworkInboxPage() {
  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="text-[10px] tracking-[0.22em] uppercase text-slate-500 mb-2">
          Legal Network · Posteingang
        </div>
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
          Offene Einladungen
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Mandatsanfragen die auf deine Zustimmung warten. Akzeptieren aktiviert
          den Hash-Chain-Handshake; anpassen engt den Scope ein bevor du
          zustimmst.
        </p>
      </div>

      <InboxList />
    </div>
  );
}
