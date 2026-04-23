/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * /network/accept/[token] — the Legal Network consent-landing page.
 *
 * This is a legal-weight moment. The design follows Appendix B of the
 * phase-1 design doc: plain-language scope preview, visually equal
 * Accept / Amend / Reject buttons, explicit revocation terms.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { Suspense } from "react";
import { ConsentCard } from "./ConsentCard";

export const dynamic = "force-dynamic";

export default async function NetworkAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-6 py-16">
      <Suspense fallback={<div className="text-slate-500">Lade…</div>}>
        <ConsentCard token={token} />
      </Suspense>
    </div>
  );
}
