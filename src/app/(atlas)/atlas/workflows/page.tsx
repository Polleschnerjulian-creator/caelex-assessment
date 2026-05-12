/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Workflow browse page.
 *
 * Lists the curated catalog grouped by category. Click → navigates
 * to homepage with the workflow's startingPrompt pre-filled.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { WorkflowCatalog } from "@/components/atlas/v2/WorkflowCatalog";

export const dynamic = "force-dynamic";

export default function WorkflowsPage() {
  return <WorkflowCatalog />;
}
