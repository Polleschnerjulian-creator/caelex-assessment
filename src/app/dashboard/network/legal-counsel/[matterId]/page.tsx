/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { MatterDetail } from "@/components/legal-network/MatterDetail";

export const dynamic = "force-dynamic";

export default async function CaelexMatterDetailPage({
  params,
}: {
  params: Promise<{ matterId: string }>;
}) {
  const { matterId } = await params;
  return (
    <MatterDetail
      matterId={matterId}
      viewerSide="CAELEX"
      returnHref="/dashboard/network/legal-counsel"
    />
  );
}
