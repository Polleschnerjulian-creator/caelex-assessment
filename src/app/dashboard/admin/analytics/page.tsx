/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Legacy analytics surface — RETIRED (consolidated into the (admin) v2 cockpit).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The old `/dashboard/admin/analytics` 6-tab "CEO Analytics" dashboard (and the
 * eight `/api/admin/analytics/*` JSON routes that fed it) have been superseded
 * by the canonical `(admin)` v2 surface: a Steering/PMF home, a per-product
 * Cockpit with REAL revenue (`@/lib/admin/revenue`) + WACO value-events
 * (`@/lib/admin/value-events`), and dedicated Growth / Customers / Retention /
 * Funnels / Paths / CRM pages. Maintaining two analytics stacks meant duplicated
 * (and divergent) math, so the v1 stack is removed.
 *
 * Rather than 404 stale bookmarks / saved links to this path, this page issues a
 * permanent server-side redirect to the new cockpit root (`/admin`). The
 * `(admin)` layout enforces the super-admin gate on the destination, so this
 * forwarder carries no auth logic of its own. `permanentRedirect()` /
 * `redirect()` throw, so nothing renders.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { permanentRedirect } from "next/navigation";

/**
 * Always evaluate the forward at request time (no static prerender of a
 * redirect), so old links resolve consistently regardless of cache state.
 */
export const dynamic = "force-dynamic";

export default function LegacyAdminAnalyticsRedirect(): never {
  // HTTP 308 — the honest status for a retired route with a stable replacement,
  // so caches / search engines learn the new home (`/admin`).
  permanentRedirect("/admin");
}
