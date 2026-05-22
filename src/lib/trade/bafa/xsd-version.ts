/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Z5c — BAFA XSD version watcher.
 *
 * BAFA refreshes the ELAN-K2 schema on an irregular cadence (roughly
 * quarterly). When they do, our serializer's emitted XML may drift
 * out of conformance — element names get renamed, optional fields
 * become required, enum values change.
 *
 * This module is the **drift detector**:
 *
 *   - `EXPECTED_BAFA_XSD_VERSION` — the version Caelex was last
 *     verified against. Hard-coded; only bumped intentionally after
 *     re-verifying the serializer against a new schema dump.
 *   - `getCurrentBafaXsdVersion()` — returns the version constant
 *     embedded in our types file (`BAFA_XSD_VERSION` from xsd-types.ts).
 *   - `checkBafaXsdVersionDrift()` — compares the two and returns a
 *     structured status the UI can render.
 *
 * The actual remote-fetch (hitting bafa.de to see what version the
 * portal advertises) is intentionally NOT done here. That belongs in
 * a cron job — see TODO in Z5c follow-up below. Z5c ships the local
 * tripwire only.
 */

import { BAFA_XSD_VERSION } from "./xsd-types";

/**
 * EXPECTED — what the serializer was last verified against. This is
 * the constant the Z5c watcher will warn about when it diverges from
 * `BAFA_XSD_VERSION` (the schema-types constant).
 *
 * Bump policy:
 *   1. Pull the new BAFA-ELAN-K2 XSD from
 *      https://www.bafa.de/DE/Aussenwirtschaft/Ausfuhrkontrolle/ELAN-K2/
 *   2. Diff against the previous version.
 *   3. Update `xsd-types.ts` if any element-name / required-field
 *      changes affect Caelex's emitted subset.
 *   4. Run the full Z5 test suite.
 *   5. THEN bump both `BAFA_XSD_VERSION` (in xsd-types.ts) AND this
 *      `EXPECTED_BAFA_XSD_VERSION` constant to the new date.
 *
 * Bumping ONLY the schema-types constant (without re-verifying the
 * serializer) triggers the warning UI — that's by design. Don't take
 * a shortcut by bumping this constant first.
 */
export const EXPECTED_BAFA_XSD_VERSION = "2026-02-05";

/**
 * Get the BAFA-XSD version the serializer is currently targeting.
 * Pulled from `xsd-types.BAFA_XSD_VERSION` — single source of truth.
 */
export function getCurrentBafaXsdVersion(): string {
  return BAFA_XSD_VERSION;
}

/**
 * BAFA XSD drift status. Returned by `checkBafaXsdVersionDrift()`.
 */
export type BafaXsdDriftStatus =
  | { kind: "ok"; version: string }
  | {
      kind: "drift";
      current: string;
      expected: string;
      severity: "minor" | "major";
    };

/**
 * Compare current vs expected XSD versions and return a structured
 * drift report. UI surfaces this as a banner / warning chip.
 *
 * Severity heuristic: same calendar year → "minor", different year
 * → "major". Refines if BAFA ever publishes a semver scheme.
 */
export function checkBafaXsdVersionDrift(): BafaXsdDriftStatus {
  const current = getCurrentBafaXsdVersion();
  const expected = EXPECTED_BAFA_XSD_VERSION;

  if (current === expected) {
    return { kind: "ok", version: current };
  }

  // Crude year-comparison for severity. Format yyyy-mm-dd; if the
  // string-prefix differs that's a major bump. Same prefix = minor.
  const currentYear = current.slice(0, 4);
  const expectedYear = expected.slice(0, 4);
  const severity: "minor" | "major" =
    currentYear === expectedYear ? "minor" : "major";

  return { kind: "drift", current, expected, severity };
}
