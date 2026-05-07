/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * DDTC Debarred Parties parser.
 *
 * Source: US State Department Directorate of Defense Trade Controls
 * URL:    Same as OFAC + BIS — the trade.gov consolidated CSV that
 *         bundles all three US lists into one fetch.
 * Authority: 22 CFR §127.7 (ITAR debarments)
 *
 * Implementation: delegates to parseConsolidatedCsv() which parses the
 * full consolidated CSV once, then we extract the DDTC_DEBARRED bucket.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { TradeSanctionsList } from "@prisma/client";
import type { CanonicalSanctionsEntry, SanctionsSourceParser } from "./types";
import {
  CONSOLIDATED_URL,
  parseConsolidatedCsv,
} from "./trade-gov-consolidated";

export function parseDdtcDebarred(raw: string): CanonicalSanctionsEntry[] {
  const result = parseConsolidatedCsv(raw);
  return result.byList.get(TradeSanctionsList.DDTC_DEBARRED) ?? [];
}

export const ddtcDebarredParser: SanctionsSourceParser = {
  list: TradeSanctionsList.DDTC_DEBARRED,
  defaultSourceUrl: CONSOLIDATED_URL,
  parse: parseDdtcDebarred,
};
