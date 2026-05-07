/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * BIS Entity List parser.
 *
 * Source: US Commerce Bureau of Industry and Security
 * URL:    https://www.bis.doc.gov/index.php/documents/regulations-docs/2326-supplement-no-4-to-part-744-entity-list-4/file
 * Format: CSV (with header row), updated ~weekly.
 *
 * Status: STUB. Sprint A2 ships OFAC SDN parser end-to-end. BIS uses
 * the trade.gov consolidated CSV (covered in A4 aggregation sprint)
 * which bundles OFAC + BIS + DDTC + FBI in one file with a `source`
 * column. Until then this parser returns [] so the orchestrator
 * gracefully no-ops when called.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { TradeSanctionsList } from "@prisma/client";
import type { CanonicalSanctionsEntry, SanctionsSourceParser } from "./types";

const DEFAULT_URL =
  "https://data.trade.gov/downloadable_consolidated_screening_list/v1/consolidated.csv";

/**
 * BIS Entity List parser — returns empty until A4 aggregation sprint
 * implements the consolidated-CSV path that filters on source="EL".
 */
export function parseBisEntity(_raw: string): CanonicalSanctionsEntry[] {
  // TODO(A4): parse trade.gov consolidated CSV, filter rows where
  // `source` column === "Entity List (EL) - Bureau of Industry and Security".
  return [];
}

export const bisEntityParser: SanctionsSourceParser = {
  list: TradeSanctionsList.BIS_ENTITY,
  defaultSourceUrl: DEFAULT_URL,
  parse: parseBisEntity,
};
