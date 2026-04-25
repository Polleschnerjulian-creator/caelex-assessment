/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * /network/pharos-accept/[token] — operator consent landing for an
 * inbound Pharos oversight invitation.
 *
 * This is a legal-weight moment: the operator-side compliance officer
 * sees the authority's identity, the legal reference, the Mandatory
 * Disclosure Floor (MDF — non-negotiable), and the proposed Voluntary
 * Disclosure Floor (VDF — operator may extend). They then choose
 * ACCEPT (with optional VDF amendment) or DISPUTE.
 *
 * Mirroring the Atlas /network/accept/[token] design language, with
 * Pharos-specific copy explaining the asymmetric power dynamic.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { Suspense } from "react";
import { OversightConsentCard } from "./OversightConsentCard";

export const dynamic = "force-dynamic";

export default async function PharosAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-950 flex items-center justify-center px-6 py-16">
      <Suspense
        fallback={
          <div className="text-slate-500 dark:text-slate-400">
            Lade Aufsichts-Einladung…
          </div>
        }
      >
        <OversightConsentCard token={token} />
      </Suspense>
    </div>
  );
}
