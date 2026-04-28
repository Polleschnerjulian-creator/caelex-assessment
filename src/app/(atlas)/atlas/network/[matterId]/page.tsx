/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { MatterDetail } from "@/components/legal-network/MatterDetail";

export const dynamic = "force-dynamic";

export default async function AtlasMatterDetailPage({
  params,
}: {
  params: Promise<{ matterId: string }>;
}) {
  const { matterId } = await params;
  return (
    <div className="atlas-themed min-h-screen bg-[var(--atlas-bg-page)]">
      <MatterDetail
        matterId={matterId}
        viewerSide="ATLAS"
        returnHref="/atlas/network"
      />
    </div>
  );
}
