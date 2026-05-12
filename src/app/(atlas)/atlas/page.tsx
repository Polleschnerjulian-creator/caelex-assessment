/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Homepage route.
 *
 * Sprint 1, 2026-05-12. Replaces the legacy 1460-LOC search-first
 * homepage. The previous implementation (with semantic-search input,
 * jurisdiction grid, source-type browser, etc.) is preserved in git
 * history at the commit immediately before this rewrite. The Korpus
 * browse experience now lives at /atlas/sources, /atlas/cases,
 * /atlas/treaties, /atlas/jurisdictions — reachable from the
 * sidebar's KORPUS section.
 *
 * The route renders a single client island, AtlasHomepage, which is
 * the ChatGPT-style empty state. Compare:
 *   docs/ATLAS-V2-MASTER-PLAN.md § "Surface A: Homepage"
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { AtlasHomepage } from "@/components/atlas/v2/AtlasHomepage";

export const dynamic = "force-dynamic";

export default function AtlasV2HomepageRoute() {
  return <AtlasHomepage />;
}
