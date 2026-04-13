// src/data/legal-sources/sources/_template.ts

/**
 * Template for adding a new jurisdiction to the Legal Sources database.
 *
 * Instructions:
 * 1. Copy this file to `{country_code}.ts` (e.g., `fr.ts`)
 * 2. Replace XX with the ISO 3166-1 alpha-2 country code
 * 3. Research and populate all applicable legal sources
 * 4. Add to `src/data/legal-sources/index.ts` imports and JURISDICTION_DATA map
 * 5. Add tests in `tests/unit/data/legal-sources.test.ts`
 *
 * Quality requirements per source:
 * - Accurate official_reference (BGBl, OJ L, etc.)
 * - Working source_url to official publication
 * - At least 2 key_provisions with article references
 * - Correct status reflecting current legal state
 * - competent_authorities linked to valid Authority IDs
 * - last_verified within 6 months
 */

import type { LegalSource, Authority } from "../types";

// ─── [COUNTRY NAME] Authorities ──────────────────────────────────────

export const AUTHORITIES_XX: Authority[] = [
  // Add authorities here
];

// ─── [COUNTRY NAME] Legal Sources ────────────────────────────────────

export const LEGAL_SOURCES_XX: LegalSource[] = [
  // Add legal sources here, grouped by type:
  // 1. International treaties (ratified by this jurisdiction)
  // 2. National laws
  // 3. National regulations / standards
  // 4. EU law (if EU member state)
  // 5. Policy documents / draft legislation
];
