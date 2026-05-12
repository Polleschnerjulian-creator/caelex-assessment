/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Mandate detail route.
 *
 * Renders the Claude-Projects-style mandate view. Auth + org-membership
 * are enforced by the parent (atlas) layout. The mandate API itself
 * gates by ownership / explicit membership.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { MandateDetailView } from "@/components/atlas/v2/MandateDetailView";

export const dynamic = "force-dynamic";

export default async function AtlasMandateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MandateDetailView mandateId={id} />;
}
