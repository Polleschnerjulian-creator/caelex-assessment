/**
 * deemed-export.ts — Deemed-Export / Technologietransfer Risikobeurteilung.
 *
 * Reines, abhängigkeitsfreies Modul (kein Server-Import, keine DB-Calls).
 * Kann im Browser und auf dem Server verwendet werden.
 *
 * Hintergrund:
 *   Ein "Deemed Export" liegt vor, wenn technische Daten eines kontrollierten
 *   Artikels an einen ausländischen Staatsangehörigen weitergegeben werden —
 *   auch wenn diese Person sich im Inland befindet. Dies kann selbst dann eine
 *   genehmigungspflichtige Ausfuhr darstellen, wenn kein physischer Grenzübergang
 *   stattfindet (15 CFR § 734.13; EAR Part 734; AWG § 2a).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Disclaimer (einmalig definiert, nie dupliziert) ─────────────────────────

export const DEEMED_EXPORT_DISCLAIMER =
  "Risikohinweis — keine Rechtsberatung. Diese Einschätzung dient ausschließlich " +
  "der Sensibilisierung und ersetzt keine juristische Beratung durch einen " +
  "qualifizierten Exportkontroll-Anwalt oder eine Auskunft der zuständigen Behörde " +
  "(BAFA, BIS, DDTC). Im Zweifelsfall ist vor jeder Weitergabe technischer Daten " +
  "eine behördliche Vorabanfrage (Commodity Jurisdiction / BAFA-Auskunft) zu empfehlen.";

// ─── Typen ───────────────────────────────────────────────────────────────────

export interface DeemedExportInput {
  isControlled: boolean;
  /**
   * Optionales Org-Signal: Hat die Organisation ausländische Staatsangehörige
   * (Foreign Nationals) in ihrem Team oder unter ihren Subunternehmern?
   * `undefined` = unbekannt.
   */
  orgHasForeignNationals?: boolean;
}

export type DeemedExportLevel = "none" | "awareness" | "action";

export interface DeemedExportRisk {
  level: DeemedExportLevel;
  headline: string;
  explanation: string;
  guidance: string[];
  disclaimer: string;
}

// ─── Auswertung ──────────────────────────────────────────────────────────────

/**
 * Bewertet das Deemed-Export-Risiko eines Artikels auf Basis seiner
 * Kontrollklassifizierung und ggf. des Org-Signals zu ausländischen
 * Staatsangehörigen.
 *
 * Konservative Regeln (nie nach unten korrigieren):
 *   - Unkontrolliert → "none" (mit ehrlichem Hinweis)
 *   - Kontrolliert + Foreign Nationals bekannt → "action"
 *   - Kontrolliert (sonstige) → "awareness"
 */
export function evaluateDeemedExportRisk(
  input: DeemedExportInput,
): DeemedExportRisk {
  const { isControlled, orgHasForeignNationals } = input;

  // ── Unkontrolliert ────────────────────────────────────────────────────────
  if (!isControlled) {
    return {
      level: "none",
      headline: "Kein Kontroll-Code hinterlegt",
      explanation:
        "Für diesen Artikel ist derzeit kein Kontrollcode (ECCN EU/US, USML, MTCR) eingetragen. " +
        "Wichtig: Nicht eingestuft bedeutet nicht zwingend nicht kontrollpflichtig — " +
        "ein Artikel kann auch ohne hinterlegten Code kontrollierten Ursprungs sein, " +
        "wenn die Einstufung noch aussteht oder nicht vollständig durchgeführt wurde. " +
        "Sobald ein Kontrollcode eingetragen wird, erscheint dieser Hinweis erneut.",
      guidance: [],
      disclaimer: DEEMED_EXPORT_DISCLAIMER,
    };
  }

  // ── Kontrolliert + Foreign Nationals bekannt ──────────────────────────────
  if (orgHasForeignNationals === true) {
    return {
      level: "action",
      headline: "Handlungsbedarf: Deemed-Export-Risiko erhöht",
      explanation:
        "Dieser Artikel trägt Kontrollcodes (ECCN EU/US, USML oder MTCR) und in Ihrer " +
        "Organisation sind ausländische Staatsangehörige gemeldet. Die Weitergabe " +
        "technischer Daten — z. B. Datenblätter, Konstruktionsunterlagen, Fertigungsspezifikationen — " +
        'an ausländische Staatsangehörige gilt rechtlich als Ausfuhr ("Deemed Export") ' +
        "und kann genehmigungspflichtig sein, selbst wenn die Person sich im Inland befindet.",
      guidance: [
        "Behandeln Sie jede Weitergabe technischer Daten dieses Artikels an ausländische " +
          "Staatsangehörige als genehmigungspflichtige Ausfuhr, bis das Gegenteil durch eine " +
          "qualifizierte Rechtsauskunft bestätigt ist.",
        "Prüfen Sie, ob eine Technology Transfer Agreement (TAA) oder eine Deemed-Export-Lizenz " +
          "(BIS EAR / DDTC ITAR) vor der Weitergabe erforderlich ist.",
        "Beschränken Sie den Zugang zu technischen Daten dieses Artikels auf autorisierte Personen " +
          "und dokumentieren Sie jeden Zugriff.",
        "Konsultieren Sie Ihren Exportkontrollbeauftragten oder einen Exportkontroll-Anwalt, " +
          "bevor Sie Daten teilen, E-Mails versenden oder Zugriff auf Dokumentensysteme gewähren.",
        "Erwägen Sie eine behördliche Vorabanfrage (BIS Commodity Classification / DDTC CJ / " +
          "BAFA-Auskunft) zur Rechtssicherheit.",
      ],
      disclaimer: DEEMED_EXPORT_DISCLAIMER,
    };
  }

  // ── Kontrolliert (Foreign Nationals unbekannt oder nicht vorhanden) ────────
  return {
    level: "awareness",
    headline: "Achtung: Kontrollierter Artikel — Deemed-Export-Risiko beachten",
    explanation:
      "Dieser Artikel trägt Kontrollcodes (ECCN EU/US, USML oder MTCR). Wenn Sie " +
      "technische Daten dieses Artikels — z. B. per E-Mail, Dateifreigabe oder " +
      "Systemzugang — an eine nicht-inländische Person weitergeben, kann dies bereits " +
      'eine genehmigungspflichtige Ausfuhr ("Deemed Export") darstellen, auch ohne ' +
      "physischen Grenzübergang des Artikels selbst.",
    guidance: [
      "Stellen Sie sicher, dass der Empfänger vor der Weitergabe technischer Daten " +
        "hinsichtlich seiner Staatsbürgerschaft und seines Aufenthaltsstatus geprüft wurde.",
      "Versenden Sie Datenblätter, Spezifikationen oder Konstruktionsunterlagen nur nach " +
        "Prüfung, ob eine Deemed-Export-Genehmigung erforderlich ist.",
      "Dokumentieren Sie jeden Datentransfer und die durchgeführte Screening-Prüfung.",
      "Wenden Sie sich bei Unklarheiten an Ihren Exportkontrollbeauftragten, bevor Sie " +
        "Daten mit Partnern, Lieferanten oder Auftragnehmern teilen.",
    ],
    disclaimer: DEEMED_EXPORT_DISCLAIMER,
  };
}
