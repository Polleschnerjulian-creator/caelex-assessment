/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Create-Mandate route.
 *
 * Minimal form for Sprint 1. The richer Mandate-Project view (files,
 * members, custom-instructions editor) lands in Sprint 2.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { CreateMandateForm } from "@/components/atlas/v2/CreateMandateForm";

export const dynamic = "force-dynamic";

export default function NewMandatePage() {
  return <CreateMandateForm />;
}
