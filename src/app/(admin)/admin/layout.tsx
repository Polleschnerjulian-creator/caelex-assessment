/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * (admin) route-group layout — the AUTHORITATIVE page-level gate for the
 * cross-product /admin analytics center (Phase 4).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Layer 2 of the three-layer super-admin defence (middleware → THIS → every
 * /api/admin/v2 route). `requireSuperAdminPage()` re-checks server-side and
 * `redirect()`s non-super-admins itself (anonymous → /login, authed-but-not-
 * privileged → /dashboard with no hint /admin exists), so nothing below renders
 * for an unauthorized caller. We then best-effort audit the shell access (DPA
 * § 5) and hand the resolved email to the client chrome.
 *
 * `dynamic = "force-dynamic"` guarantees the gate runs on every request — this
 * surface must NEVER be statically cached or prerendered, since that would skip
 * the session check.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  requireSuperAdminPage,
  logSuperAdminAccess,
} from "@/lib/admin-auth.server";
import AdminShell from "@/components/admin/AdminShell";

export const metadata = {
  title: "Caelex Admin",
};

// The gate reads the session, so the segment must be rendered per-request and
// never cached/prerendered. (force-dynamic also disables any implicit caching
// of the RSC payload for this layout subtree.)
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirects (throws) for anyone who is not a super-admin — code below this
  // line only ever runs for an authorized platform owner.
  const identity = await requireSuperAdminPage();

  // Best-effort, hash-chained audit of the shell access. No `request` is
  // available in a layout, so IP/UA are omitted; the per-API logs (which DO
  // have the request) capture network context for the data reads themselves.
  await logSuperAdminAccess({
    userId: identity.userId,
    email: identity.email,
    surface: "admin:shell",
  });

  return <AdminShell userEmail={identity.email}>{children}</AdminShell>;
}
