/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * BIS Entity List parser.
 *
 * Source: US Commerce Bureau of Industry and Security
 * URL:    Same as OFAC + DDTC — the trade.gov consolidated CSV that
 *         bundles all three US lists into one fetch.
 *
 * Implementation: delegates to parseConsolidatedCsv() which parses the
 * full consolidated CSV once, then we extract the BIS_ENTITY bucket.
 * Per-source filtering is done by the shared parser via the `source`
 * column matching SOURCE_TO_LIST entries.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { TradeSanctionsList } from "@prisma/client";
import type { CanonicalSanctionsEntry, SanctionsSourceParser } from "./types";
import {
  CONSOLIDATED_URL,
  parseConsolidatedCsv,
} from "./trade-gov-consolidated";

export function parseBisEntity(raw: string): CanonicalSanctionsEntry[] {
  const result = parseConsolidatedCsv(raw);
  return result.byList.get(TradeSanctionsList.BIS_ENTITY) ?? [];
}

export const bisEntityParser: SanctionsSourceParser = {
  list: TradeSanctionsList.BIS_ENTITY,
  defaultSourceUrl: CONSOLIDATED_URL,
  parse: parseBisEntity,
};
