/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * DDTC Debarred Parties parser.
 *
 * Source: US State Department Directorate of Defense Trade Controls
 * URL:    https://www.pmddtc.state.gov/ddtc_public?id=ddtc_kb_article_page&sys_id=c22d1833dbb8d300d0a370131f9619f0
 * Format: CSV/HTML, updated rarely (~quarterly).
 * Authority: 22 CFR §127.7 (ITAR debarments)
 *
 * Status: STUB. Like BIS, DDTC is consolidated into the trade.gov
 * consolidated CSV under source="ITAR Debarred (DTC) - Bureau of
 * Political Military Affairs". A4 sprint implements that path.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { TradeSanctionsList } from "@prisma/client";
import type { CanonicalSanctionsEntry, SanctionsSourceParser } from "./types";

const DEFAULT_URL =
  "https://data.trade.gov/downloadable_consolidated_screening_list/v1/consolidated.csv";

/**
 * DDTC Debarred parser — returns empty until A4 aggregation sprint
 * implements the consolidated-CSV path that filters on source="DTC".
 */
export function parseDdtcDebarred(_raw: string): CanonicalSanctionsEntry[] {
  // TODO(A4): parse trade.gov consolidated CSV, filter on
  // source === "ITAR Debarred (DTC) - Bureau of Political Military Affairs"
  return [];
}

export const ddtcDebarredParser: SanctionsSourceParser = {
  list: TradeSanctionsList.DDTC_DEBARRED,
  defaultSourceUrl: DEFAULT_URL,
  parse: parseDdtcDebarred,
};
