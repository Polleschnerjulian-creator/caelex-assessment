/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * /admin/crm — the full CRM (pipeline · contacts · companies · deals · activities
 * + the meeting importer) inside the LIGHT cross-product /admin center.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * This is a thin server entry that mounts the shared client `CrmWorkspace`. The
 * (admin)/admin/layout.tsx already wraps every page in `AdminShell` (light
 * `.caelex-admin` chrome) and enforces the super-admin page gate via
 * `requireSuperAdminPage()` — so NO additional gate or shell is added here. The
 * token-based CRM components (var(--text-primary), var(--surface-raised),
 * glass-*) are overridden to light automatically inside `.caelex-admin`.
 *
 * `dynamic = "force-dynamic"` keeps this subtree per-request (the workspace
 * fetches /api/admin/crm/* at runtime; never statically cache it).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import CrmWorkspace from "@/components/crm/CrmWorkspace";

export const dynamic = "force-dynamic";

export const metadata = { title: "CRM | Caelex Admin" };

export default function AdminCrmPage() {
  return <CrmWorkspace />;
}
