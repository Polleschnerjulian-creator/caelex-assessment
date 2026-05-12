/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — single chat route.
 *
 * Renders the persisted chat by id. Auth + org-membership are gated
 * by the parent (atlas) layout. The chat itself enforces ownerUserId
 * server-side via /api/atlas/chat/[id].
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { AtlasChatView } from "@/components/atlas/v2/AtlasChatView";

export const dynamic = "force-dynamic";

export default async function AtlasChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AtlasChatView chatId={id} />;
}
