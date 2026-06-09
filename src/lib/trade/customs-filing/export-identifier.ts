/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Caelex Passage (Trade) P1 — honest export-identifier resolution.
 *
 * THE FAIL-CLOSED RULE FOR CUSTOMS IDENTIFIERS.
 *
 * Before P1 the customs/BAFA payload builders silently substituted a
 * fabricated all-zero identifier when the org had not set one:
 *
 *   EORI   →  "DE000000000000000"
 *   EIN    →  "000000000"
 *   port   →  "0000"
 *
 * That is exactly the failure mode the export-control invariant forbids:
 * a missing identifier was papered over with a plausible-looking-but-fake
 * value that could travel into a real Ausfuhranmeldung / AES filing. A
 * fabricated EORI on a customs declaration is a false statement to the
 * authority — the liability for which attaches to the NAMED human who
 * files, never to "the AI".
 *
 * This module replaces those zero-fills with an HONEST, unmistakable
 * placeholder token. When an identifier is unset the builders emit the
 * placeholder (which is loud, human-readable, and obviously not a real
 * number) and the surface FLAGS the draft as not-fileable. The document
 * is never silently passed with a fake identifier — fail-closed: a
 * missing identifier blocks/flags the document, it does not pass.
 *
 * Pure + dependency-free. Safe to import from server builders and from
 * client preview/flagging UI alike (no `server-only`, no React).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

/**
 * The honest placeholder token emitted in place of a missing customs
 * identifier. Deliberately:
 *   - human-readable (a regulator/operator reading the draft sees the gap),
 *   - obviously not a real identifier (cannot be mistaken for a number),
 *   - stable, so the renderer + tests can detect "this draft is flagged".
 *
 * NOTE: it is intentionally NOT a syntactically-valid EORI/EIN — the
 * point is that a draft carrying it MUST NOT be filed as-is.
 */
export const MISSING_IDENTIFIER_PLACEHOLDER =
  "⚠ FEHLT — im Org-Profil hinterlegen";

/**
 * `true` when `value` is the honest missing-identifier placeholder (or any
 * legacy all-zero fabrication that may linger in a persisted draft). Used
 * by the preview/flagging UI to refuse to mark a draft fileable.
 */
export function isMissingIdentifier(value: string | null | undefined): boolean {
  if (value == null) return true;
  const v = value.trim();
  if (v.length === 0) return true;
  if (v === MISSING_IDENTIFIER_PLACEHOLDER) return true;
  // Defensive: reject any legacy all-zero fabrication (e.g. "DE000…0",
  // "000000000", "0000", "00000000") that may have been persisted before
  // this fix landed, so a stale draft cannot pass a fake identifier.
  if (/^[A-Z]{0,2}0+$/i.test(v)) return true;
  return false;
}

/**
 * Resolve a customs identifier to either its REAL value or the honest
 * placeholder — NEVER a fabricated zero-fill. The export-control,
 * fail-closed substitute for `value ?? "DE000…0"`.
 *
 * Returns the trimmed real value when present; otherwise the loud
 * placeholder token. Callers that build a payload always get a string
 * (the field is required by the XSD), but a placeholder string is
 * unmistakably not a real identifier, and the surface flags it.
 */
export function resolveIdentifierOrPlaceholder(
  value: string | null | undefined,
): string {
  if (value == null) return MISSING_IDENTIFIER_PLACEHOLDER;
  const v = value.trim();
  return v.length > 0 ? v : MISSING_IDENTIFIER_PLACEHOLDER;
}

/**
 * The set of identifier fields a customs/BAFA filing draft depends on.
 * A preview surface checks each so the human sees EXACTLY which
 * identifiers are missing before they download a draft.
 */
export interface ExportIdentifierSet {
  /** EU EORI (ATLAS Ausfuhranmeldung Exporter block). */
  eoriNumber?: string | null;
  /** US EIN (AES/ACE USPPI block). */
  usExporterEin?: string | null;
  /** Legal exporter/USPPI name (falls back to org name; rarely missing). */
  exporterName?: string | null;
  /** Default port-of-export code (DE office code / US Schedule D port). */
  exportPortCode?: string | null;
}

/**
 * One flag describing a missing identifier for the preview UI.
 */
export interface MissingIdentifierFlag {
  /** Stable key matching `ExportIdentifierSet`. */
  field: keyof ExportIdentifierSet;
  /** Human label, e.g. "EORI", "US EIN". */
  label: string;
  /** Which filing this gap blocks, e.g. "ATLAS Ausfuhranmeldung". */
  blocks: string;
}

/**
 * Compute the list of identifier gaps for a draft, in filing order. Empty
 * list ⇒ every required identifier is present (the draft is not flagged on
 * identifier grounds). Used by `CustomsStagePanel` to render the honest
 * "set these before you file" banner + by tests.
 *
 * NOTE: `exporterName` is NOT flagged — it always falls back to the org
 * name (which is non-null), so it is an override, never a fail-closed gap.
 */
export function missingExportIdentifiers(
  ids: ExportIdentifierSet,
): MissingIdentifierFlag[] {
  const flags: MissingIdentifierFlag[] = [];
  if (isMissingIdentifier(ids.eoriNumber)) {
    flags.push({
      field: "eoriNumber",
      label: "EORI",
      blocks: "ATLAS Ausfuhranmeldung (DE)",
    });
  }
  if (isMissingIdentifier(ids.usExporterEin)) {
    flags.push({
      field: "usExporterEin",
      label: "US EIN",
      blocks: "AES / ACE filing (US)",
    });
  }
  if (isMissingIdentifier(ids.exportPortCode)) {
    flags.push({
      field: "exportPortCode",
      label: "Ausfuhrzollstelle / Port of export",
      blocks: "ATLAS + AES",
    });
  }
  return flags;
}
