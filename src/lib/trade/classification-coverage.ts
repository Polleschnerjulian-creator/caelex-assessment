/**
 * classification-coverage.ts — Ehrlichkeits-Bewertung der Einstufungsabdeckung.
 *
 * Reines, abhängigkeitsfreies Modul (kein Server-Import, keine DB-Calls).
 * Ziel: Die ABWESENHEIT einer Einstufung klar als "wir wissen es nicht" —
 * NICHT als "frei / unkontrolliert" — kommunizieren.
 *
 * Hintergrund:
 *   Unser Auto-Klassifizierer basiert auf einem kuratierten Seed (~99 Einträge,
 *   Schwerpunkt Raumfahrt-Hardware). Er ist KEIN vollständiger Warenkatalog.
 *   Ein Artikel ohne Treffer ist daher nicht zwingend unkontrolliert — er liegt
 *   möglicherweise außerhalb unserer Seed-Abdeckung. Das fehlende Ergebnis
 *   darf niemals als Freigabe gelesen werden.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Disclaimer (Single Source of Truth) ─────────────────────────────────────

export const CLASSIFICATION_HONESTY_DISCLAIMER =
  "Risikohinweis — keine Rechtsberatung; eine fehlende Einstufung ist keine Freigabe.";

// ─── Typen ───────────────────────────────────────────────────────────────────

export type CoverageLevel = "matched" | "uncertain" | "no-data";

export interface CoverageVerdict {
  level: CoverageLevel;
  headline: string;
  message: string;
  disclaimer: string;
}

export type ItemClassState =
  | "DRAFT"
  | "CLASSIFIED"
  | "REQUIRES_REVIEW"
  | "ARCHIVED";

// ─── assessSuggestionCoverage ─────────────────────────────────────────────────

/**
 * Bewertet die Abdeckungsqualität für Auto-Klassifizierer-Ergebnisse.
 *
 * Regeln:
 *   - Leer → no-data: Klar kommunizieren, dass Abwesenheit ≠ unkontrolliert
 *     und unser Seed nur ein kurierter Schwerpunkt (Raumfahrt) ist.
 *   - Nur LOW-Treffer (kein MEDIUM/HIGH) → uncertain: Schwache Treffer,
 *     fachliche Bestätigung nötig.
 *   - Mind. ein MEDIUM oder HIGH → matched: Vorschlag vorhanden — aber
 *     ehrlich darauf hinweisen, dass es ein Vorschlag ist, keine endgültige
 *     rechtliche Einstufung.
 */
export function assessSuggestionCoverage(
  suggestions: ReadonlyArray<{ confidence: "HIGH" | "MEDIUM" | "LOW" }>,
): CoverageVerdict {
  if (suggestions.length === 0) {
    return {
      level: "no-data",
      headline: "Keine Einstufung aus unseren Daten",
      message:
        "Unser Auto-Klassifizierer hat keinen Treffer gefunden — das bedeutet nicht, " +
        "dass der Artikel unkontrolliert ist. Unsere Kontrolllisten-Daten sind ein " +
        "kuratierter Seed mit Schwerpunkt Raumfahrt-Hardware und kein vollständiger " +
        "Warenkatalog. Artikel außerhalb dieses Bereichs werden möglicherweise nicht " +
        "erkannt. Bitte lass den Artikel von einem Exportkontroll-Experten einstufen, " +
        "bevor du ihn als frei behandelst.",
      disclaimer: CLASSIFICATION_HONESTY_DISCLAIMER,
    };
  }

  const hasStrongMatch = suggestions.some(
    (s) => s.confidence === "HIGH" || s.confidence === "MEDIUM",
  );

  if (!hasStrongMatch) {
    return {
      level: "uncertain",
      headline: "Nur schwache Treffer — bitte fachlich bestätigen",
      message:
        "Der Auto-Klassifizierer hat ausschließlich Treffer mit niedriger Konfidenz " +
        "(LOW) gefunden. Diese Vorschläge sollten von einem Exportkontroll-Experten " +
        "geprüft und bestätigt werden, bevor sie übernommen werden.",
      disclaimer: CLASSIFICATION_HONESTY_DISCLAIMER,
    };
  }

  return {
    level: "matched",
    headline: "Vorschlag vorhanden — du bestätigst",
    message:
      "Der Auto-Klassifizierer hat passende Einträge gefunden. Bitte prüfe und " +
      "bestätige den Vorschlag — die Auto-Einstufung ist ein Hilfsmittel, keine " +
      "endgültige rechtliche Einstufung.",
    disclaimer: CLASSIFICATION_HONESTY_DISCLAIMER,
  };
}

// ─── assessItemClassificationHonesty ─────────────────────────────────────────

/**
 * Bewertet, ob für einen gespeicherten Artikel ein Ehrlichkeits-Hinweis
 * zur Einstufung angezeigt werden soll.
 *
 * Gibt `null` zurück, wenn kein Hinweis nötig ist (kontrollierter Artikel
 * → DeemedExportWarning übernimmt; archivierter Artikel → keine Aktion).
 *
 * Regeln (konservativ):
 *   - hasCodes === true → null (kontrolliert; DeemedExportWarning greift)
 *   - CLASSIFIED + !hasCodes → matched/ruhig: "Als nicht gelistet eingestuft"
 *   - DRAFT oder REQUIRES_REVIEW + !hasCodes → no-data: ehrlich "noch nicht eingestuft"
 *   - ARCHIVED → null
 */
export function assessItemClassificationHonesty(input: {
  status: ItemClassState;
  hasCodes: boolean;
}): CoverageVerdict | null {
  const { status, hasCodes } = input;

  // Kontrollierter Artikel — DeemedExportWarning ist zuständig
  if (hasCodes) return null;

  // Archivierter Artikel — kein Hinweis nötig
  if (status === "ARCHIVED") return null;

  // Bewusst als "nicht gelistet" eingestuft — ruhige Bestätigung
  if (status === "CLASSIFIED") {
    return {
      level: "matched",
      headline: "Als nicht gelistet eingestuft",
      message:
        "Dieser Artikel wurde bewusst ohne Kontrollcode eingestuft (EAR99 / " +
        "nicht-gelistet). Das ist eine dokumentierte Entscheidung, kein offener " +
        "Befund. Stelle sicher, dass die Einstufung aktuell ist und ggf. durch " +
        "eine Fachperson oder behördliche Auskunft gestützt wird.",
      disclaimer: CLASSIFICATION_HONESTY_DISCLAIMER,
    };
  }

  // DRAFT oder REQUIRES_REVIEW ohne Codes — ehrlich "noch nicht eingestuft"
  return {
    level: "no-data",
    headline: "Noch nicht eingestuft — nicht als unkontrolliert behandeln",
    message:
      "Für diesen Artikel sind noch keine Kontrollcodes hinterlegt. " +
      "Eine fehlende Einstufung bedeutet nicht, dass der Artikel frei ist — " +
      "er könnte außerhalb des Schwerpunkts unserer kuratierten Seed-Daten " +
      "(Raumfahrt-Hardware) liegen oder die Einstufung steht noch aus. " +
      "Lass den Artikel von einem Exportkontroll-Experten einstufen, bevor " +
      "du ihn als unkontrolliert behandelst.",
    disclaimer: CLASSIFICATION_HONESTY_DISCLAIMER,
  };
}
