/**
 * Caelex Trade — BAFA-Bescheid extracted-fields type contract.
 *
 * Shared zwischen `bafa-bescheid-parser.server.ts` (Claude Vision wrapper)
 * und `LicensePdfDrop.tsx` (UI). Pure type-only Modul; kein "server-only",
 * damit der Frontend-Code die Shape importieren kann.
 *
 * Architecture-decision: Wir nehmen die TradeLicense-Felder als Source-
 * of-Truth (siehe `prisma.schema.prisma`), und mappen 1:1 was Claude
 * aus dem Bescheid extrahiert. Felder, die im PDF nicht enthalten sind
 * oder die Claude nicht extrahieren kann, sind `null` mit `fieldConfidence:
 * "missing"`. Das UI zeigt diese als "manuell ergänzen" Hint.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

/** BAFA-Lizenz-Typen — exact match with TradeLicenseType Prisma enum. */
export type BafaLicenseType =
  | "BAFA_EINZEL"
  | "BAFA_AGG_12"
  | "BAFA_AGG_16"
  | "BAFA_AGG_27"
  | "BAFA_AGG_47"
  | "BAFA_EUGEA_EU001"
  | "BAFA_EUGEA_EU002";

/** Confidence-Level pro Feld. "missing" = Feld nicht im PDF gefunden. */
export type FieldConfidence = "high" | "medium" | "low" | "missing";

/** Structured extraction von einem BAFA-Bescheid PDF.
 *
 *  Mapping zur TradeLicense Tabelle:
 *    licenseNumber   → TradeLicense.licenseNumber
 *    licenseType     → TradeLicense.licenseType (enum)
 *    issuedAt        → TradeLicense.issuedAt (DateTime, hier ISO-string)
 *    validUntil      → TradeLicense.validUntil (DateTime, hier ISO-string)
 *    totalCapValue   → TradeLicense.totalCapValue (Float, EUR)
 *    capCurrency     → TradeLicense.capCurrency (default "EUR")
 *    coveredEccnCodes → TradeLicense.conditions.coveredCodes
 *    coveredCountries → TradeLicense.conditions.coveredCountries
 *    additionalConditions → TradeLicense.conditions.notes
 */
export interface BafaBescheidExtraction {
  /** Bescheid-Nummer, z.B. "G/2025/12345" oder "AGG-12-2025-987". */
  licenseNumber: string | null;
  /** Klassifizierter Lizenz-Typ — Claude entscheidet basierend auf
   *  Bescheidkopf + Geltungsbereich. Null wenn nicht eindeutig. */
  licenseType: BafaLicenseType | null;
  /** Ausstellungsdatum (ISO 8601). */
  issuedAt: string | null;
  /** Gültig-bis-Datum (ISO 8601). Bei AGG/EUGEA typischerweise gesetzt;
   *  bei reinen Einzelgenehmigungen optional. */
  validUntil: string | null;
  /** Wert-Obergrenze in Bescheid-Währung. Null = unbegrenzt. */
  totalCapValue: number | null;
  /** ISO 4217 Currency Code (typisch "EUR" für BAFA). */
  capCurrency: string;
  /** ECCN-Codes (EU Annex I oder DE Ausfuhrliste) die der Bescheid
   *  abdeckt. Leer-Array = "alle Codes des Antrags". */
  coveredEccnCodes: string[];
  /** ISO 3166-1 alpha-2 Länder-Codes. Leer = "alle Länder des Antrags". */
  coveredCountries: string[];
  /** Freie Auflagen / Nebenbestimmungen — original Wortlaut. */
  additionalConditions: string[];
  /** Per-Feld confidence so das UI niedrig-confidence-Felder flaggen kann. */
  fieldConfidence: Record<keyof BafaBescheidStructuredFields, FieldConfidence>;
  /** Warnings aus dem Parser — z.B. "Bescheid wirkt wie ein DDTC-Document,
   *  nicht BAFA — soll der DDTC-Parser laufen?" */
  warnings: string[];
}

/** Convenience-Type: nur die strukturierten Daten-Felder, ohne meta. */
export type BafaBescheidStructuredFields = Pick<
  BafaBescheidExtraction,
  | "licenseNumber"
  | "licenseType"
  | "issuedAt"
  | "validUntil"
  | "totalCapValue"
  | "capCurrency"
  | "coveredEccnCodes"
  | "coveredCountries"
  | "additionalConditions"
>;

/** Discriminated-Union Result aus dem Parser. */
export type BafaBescheidParseResult =
  | {
      ok: true;
      extraction: BafaBescheidExtraction;
      modelUsed: string;
      latencyMs: number;
    }
  | { ok: false; error: string; warnings?: string[] };

/** Helper: prüft ob ein Feld als "ausreichend confident" gilt für
 *  Auto-Fill (vs "operator muss validieren"). Threshold: medium+. */
export function isFieldUsable(c: FieldConfidence): boolean {
  return c === "high" || c === "medium";
}
