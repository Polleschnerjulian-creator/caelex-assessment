/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * /atlas/network/[matterId]/workspace — Phase 2 matter workspace.
 * Full-screen dark-stage working surface.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { WorkspaceShell } from "@/components/legal-network/workspace/WorkspaceShell";

export const dynamic = "force-dynamic";

export default async function MatterWorkspacePage({
  params,
}: {
  params: Promise<{ matterId: string }>;
}) {
  const { matterId } = await params;
  return <WorkspaceShell matterId={matterId} />;
}
