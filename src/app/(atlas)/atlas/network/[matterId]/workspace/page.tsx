/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * /atlas/network/[matterId]/workspace — Phase 5 matter workspace.
 *
 * Pinboard-first shell: empty state is a centered hero prompt; once
 * the user sends their first message the layout transitions into a
 * split view (chat sidebar + pinboard of tool-generated cards).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { WorkspacePinboard } from "@/components/legal-network/workspace/pinboard/WorkspacePinboard";

export const dynamic = "force-dynamic";

export default async function MatterWorkspacePage({
  params,
}: {
  params: Promise<{ matterId: string }>;
}) {
  const { matterId } = await params;
  return <WorkspacePinboard matterId={matterId} />;
}
