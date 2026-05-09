/**
 * Atlas Drafting — Authorization-application section catalog.
 *
 * Bundle 35 (S5) introduces section-by-section generation: instead of
 * asking the model to dump a 9-section authorization scaffold all at
 * once, the lawyer steps through each section, generates it, reviews,
 * tweaks, accepts, and moves on. The compounding result is a
 * partner-quality draft Marie can defend section-by-section.
 *
 * This module is the canonical catalog of those sections. The order
 * matches what BHO Legal / Heuking / Dentons Space typically file with
 * BNetzA / ARCEP / Ofcom — sequence drives the workflow UI.
 *
 * Each section knows how to produce its own per-section prompt given
 * the mandate intake + jurisdiction + operator type. Bundle 37's
 * authority-template-adapter will reformat the same per-section prompts
 * for BNetzA-specific or FCC-specific output style.
 */

import type { MandateIntake } from "./mandate-intake";

export type SectionStatus = "pending" | "generated" | "accepted" | "skipped";

export interface AuthSection {
  id: string;
  /** Human title in DE / EN. */
  title: { de: string; en: string };
  /** What the section covers, in lawyer-workflow language. */
  description: { de: string; en: string };
  /** Build the per-section prompt. Pure — used for both preview + dispatch. */
  buildPrompt: (args: {
    intake: MandateIntake;
    jurisdiction: string;
    operatorType: string;
    operatorLabel: string;
    lang: "de" | "en";
  }) => string;
}

const ctx = (i: MandateIntake, lang: "de" | "en"): string => {
  const labels =
    lang === "de"
      ? {
          client: "Mandant",
          specs: "Specs",
          mission: "Mission",
          freq: "Frequenzen",
          launch: "Launch",
        }
      : {
          client: "Client",
          specs: "Specs",
          mission: "Mission",
          freq: "Frequencies",
          launch: "Launch",
        };
  const parts: string[] = [];
  if (i.client.trim()) parts.push(`${labels.client}: ${i.client.trim()}`);
  if (i.satelliteSpecs.trim())
    parts.push(`${labels.specs}: ${i.satelliteSpecs.trim()}`);
  if (i.missionProfile.trim())
    parts.push(`${labels.mission}: ${i.missionProfile.trim()}`);
  if (i.frequencies.trim())
    parts.push(`${labels.freq}: ${i.frequencies.trim()}`);
  if (i.launchDate.trim())
    parts.push(`${labels.launch}: ${i.launchDate.trim()}`);
  return parts.join(" | ");
};

export const AUTH_SECTIONS: AuthSection[] = [
  {
    id: "operator-identification",
    title: {
      de: "1. Antragsteller & Rechtsstatus",
      en: "1. Applicant & legal status",
    },
    description: {
      de: "Vollständige Firmierung, Sitz, Handelsregister-Nr., gesetzliche Vertreter, Bevollmächtigung des Anwalts.",
      en: "Full legal name, seat, commercial register number, statutory representatives, counsel power-of-attorney.",
    },
    buildPrompt: ({ intake, jurisdiction, operatorLabel, lang }) =>
      lang === "de"
        ? `Erstelle Abschnitt 1 ("Antragsteller & Rechtsstatus") für einen ${operatorLabel}-Genehmigungsantrag in ${jurisdiction}. Inkludiere Platzhalter-Felder für: vollständige Firmierung, Rechtsform, Sitz, HR-Nummer, gesetzliche Vertreter, anwaltliche Bevollmächtigung. Mandanten-Kontext: ${ctx(intake, "de")}. Nur diesen einen Abschnitt liefern, mit Überschrift und Platzhaltern in eckigen Klammern.`
        : `Draft section 1 ("Applicant & legal status") for a ${operatorLabel} authorization filing in ${jurisdiction}. Include placeholder fields for: full legal name, legal form, seat, commercial register number, statutory representatives, counsel power-of-attorney. Mandate context: ${ctx(intake, "en")}. Return only this one section, with heading and placeholders in square brackets.`,
  },
  {
    id: "mission-profile",
    title: {
      de: "2. Missionsprofil & technische Spezifikation",
      en: "2. Mission profile & technical specification",
    },
    description: {
      de: "Konstellation, Bahnhöhe, Inklination, Massen, Aktive Lebensdauer, primärer Mission-Use-Case.",
      en: "Constellation, altitude, inclination, mass, active lifetime, primary mission use case.",
    },
    buildPrompt: ({ intake, jurisdiction, operatorLabel, lang }) =>
      lang === "de"
        ? `Erstelle Abschnitt 2 ("Missionsprofil & technische Spezifikation") für einen ${operatorLabel}-Genehmigungsantrag in ${jurisdiction}. Strukturiere: Konstellationsbeschreibung, Bahnhöhe + Inklination + Exzentrizität, Trockenmasse pro Satellit, Antriebssystem, Aktive Mission-Lebensdauer (Jahre), primärer Use-Case. Verwende die Mandanten-Daten falls vorhanden: ${ctx(intake, "de")}. Nur diesen einen Abschnitt liefern.`
        : `Draft section 2 ("Mission profile & technical specification") for a ${operatorLabel} authorization filing in ${jurisdiction}. Structure: constellation description, altitude + inclination + eccentricity, dry mass per satellite, propulsion system, active mission lifetime (years), primary use case. Use the mandate data where available: ${ctx(intake, "en")}. Return only this one section.`,
  },
  {
    id: "spectrum-coordination",
    title: {
      de: "3. Spektrum & Frequenzkoordination",
      en: "3. Spectrum & frequency coordination",
    },
    description: {
      de: "ITU-Filing-Status (API/CR/N), nationale Funklizenz, Einhaltung der Power-Flux-Density-Limits, Inter-System-Koordination.",
      en: "ITU filing status (API/CR/N), national radio license, PFD-limit compliance, inter-system coordination.",
    },
    buildPrompt: ({ intake, jurisdiction, operatorLabel, lang }) =>
      lang === "de"
        ? `Erstelle Abschnitt 3 ("Spektrum & Frequenzkoordination") für einen ${operatorLabel}-Genehmigungsantrag in ${jurisdiction}. Adressiere: aktuell eingereichte ITU-Filings (API/CR/Notification mit Datum + Referenz), nationale Funklizenz-Beantragung, Einhaltung der ITU RR Article 22 PFD-Limits, Stand der Inter-System-Koordinationsverhandlungen mit angrenzenden Operatoren. Frequenzdaten: ${intake.frequencies.trim() || "[noch zu spezifizieren]"}. Nur diesen einen Abschnitt.`
        : `Draft section 3 ("Spectrum & frequency coordination") for a ${operatorLabel} authorization filing in ${jurisdiction}. Address: currently submitted ITU filings (API/CR/notification with dates + references), national radio licence application, ITU RR Article 22 PFD-limit compliance, status of inter-system coordination negotiations with adjacent operators. Frequency data: ${intake.frequencies.trim() || "[to be specified]"}. Return only this one section.`,
  },
  {
    id: "orbital-debris",
    title: {
      de: "4. Bahnparameter & Debris-Mitigation-Plan",
      en: "4. Orbital parameters & debris-mitigation plan",
    },
    description: {
      de: "Konjunktions-Risiko-Bewertung, COLA-Verfahren, IADC/COPUOS-Compliance, Reaktionsmatrix.",
      en: "Conjunction-risk assessment, COLA procedure, IADC/COPUOS compliance, response matrix.",
    },
    buildPrompt: ({ jurisdiction, operatorLabel, lang }) =>
      lang === "de"
        ? `Erstelle Abschnitt 4 ("Bahnparameter & Debris-Mitigation-Plan") für einen ${operatorLabel}-Genehmigungsantrag in ${jurisdiction}. Strukturiere: Conjunction-Risk-Assessment-Methodik, COLA-Schwellwerte (Pc-Threshold, Manöver-Lead-Time), Compliance mit IADC Space Debris Mitigation Guidelines, COPUOS LTS-Guidelines, Reaktions-Matrix bei Conjunction Warnings (18th SDS / EUSST). Nur diesen einen Abschnitt.`
        : `Draft section 4 ("Orbital parameters & debris-mitigation plan") for a ${operatorLabel} authorization filing in ${jurisdiction}. Structure: conjunction-risk-assessment methodology, COLA thresholds (Pc threshold, manoeuvre lead time), compliance with IADC Space Debris Mitigation Guidelines, COPUOS LTS guidelines, response matrix to conjunction warnings (18th SDS / EUSST). Return only this one section.`,
  },
  {
    id: "end-of-life",
    title: {
      de: "5. Re-Entry & End-of-Life-Plan",
      en: "5. Re-entry & end-of-life plan",
    },
    description: {
      de: "Disposal-Strategie (kontrolliert vs. natürlich), 25-Jahre-Regel-Compliance, Casualty-Risk-Bewertung.",
      en: "Disposal strategy (controlled vs natural), 25-year rule compliance, casualty-risk assessment.",
    },
    buildPrompt: ({ intake, jurisdiction, operatorLabel, lang }) =>
      lang === "de"
        ? `Erstelle Abschnitt 5 ("Re-Entry & End-of-Life-Plan") für einen ${operatorLabel}-Genehmigungsantrag in ${jurisdiction}. Adressiere: Disposal-Strategie (kontrollierter De-Orbit / passive natürliche Decay), Compliance mit IADC 25-Jahre-Regel (oder neuer EU Space Act 5-Jahre-Vorgabe falls anwendbar), Casualty-Risk pro DAS-Berechnung (≤ 10⁻⁴), Disposal-Reserve-Treibstoff. Bahnhöhe aus Mandanten-Profil: ${intake.satelliteSpecs.trim() || "[noch zu spezifizieren]"}. Nur diesen einen Abschnitt.`
        : `Draft section 5 ("Re-entry & end-of-life plan") for a ${operatorLabel} authorization filing in ${jurisdiction}. Address: disposal strategy (controlled de-orbit / passive natural decay), compliance with IADC 25-year rule (or the new EU Space Act 5-year mandate if applicable), DAS-computed casualty risk (≤ 1e-4), disposal-reserve propellant. Altitude from mandate profile: ${intake.satelliteSpecs.trim() || "[to be specified]"}. Return only this one section.`,
  },
  {
    id: "insurance-liability",
    title: {
      de: "6. Versicherung & Haftungsdeckung",
      en: "6. Insurance & liability coverage",
    },
    description: {
      de: "Third-Party-Liability-Police, Deckungssumme, Self-Insurance-Backstop, Liability Convention 1972 Mapping.",
      en: "Third-party liability policy, sum insured, self-insurance backstop, Liability Convention 1972 mapping.",
    },
    buildPrompt: ({ jurisdiction, operatorLabel, lang }) =>
      lang === "de"
        ? `Erstelle Abschnitt 6 ("Versicherung & Haftungsdeckung") für einen ${operatorLabel}-Genehmigungsantrag in ${jurisdiction}. Strukturiere: Third-Party-Liability-Police mit Versicherer + Deckungssumme + Laufzeit, Self-Insurance-Backstop, gesetzliche Mindestdeckungssumme nach ${jurisdiction}-Recht, Mapping auf Liability Convention 1972 (Art. II/III), Recourse-Klauseln. Platzhalter für tatsächliche Vertrags-Daten in eckigen Klammern. Nur diesen einen Abschnitt.`
        : `Draft section 6 ("Insurance & liability coverage") for a ${operatorLabel} authorization filing in ${jurisdiction}. Structure: third-party liability policy with insurer + sum insured + duration, self-insurance backstop, statutory minimum sum-insured under ${jurisdiction} law, mapping to the Liability Convention 1972 (Art. II/III), recourse clauses. Placeholders for actual contract data in square brackets. Return only this one section.`,
  },
  {
    id: "cybersecurity",
    title: {
      de: "7. Cybersicherheit (NIS2-Mapping)",
      en: "7. Cybersecurity (NIS2 mapping)",
    },
    description: {
      de: "Risikomanagement-Maßnahmen Art. 21 NIS2, Incident-Response, Lieferketten-Sicherheit, Reporting an BSI/ANSSI.",
      en: "Art. 21 NIS2 risk-management measures, incident response, supply-chain security, reporting to BSI/ANSSI.",
    },
    buildPrompt: ({ jurisdiction, operatorLabel, lang }) =>
      lang === "de"
        ? `Erstelle Abschnitt 7 ("Cybersicherheit / NIS2-Mapping") für einen ${operatorLabel}-Genehmigungsantrag in ${jurisdiction}. Adressiere: NIS2 Art. 21 Risikomanagement-Maßnahmen (zehn Kontrollen), Incident-Response-Plan inkl. 24/72-Stunden-Reporting-Pflicht (BSI für DE, ANSSI für FR, NCSC für UK), Lieferketten-Sicherheit (Art. 21 Abs. 2 lit. d), Bewertung als Wesentliche/Wichtige Einrichtung. Nur diesen einen Abschnitt.`
        : `Draft section 7 ("Cybersecurity / NIS2 mapping") for a ${operatorLabel} authorization filing in ${jurisdiction}. Address: NIS2 Art. 21 risk-management measures (the ten controls), incident-response plan incl. 24/72-hour reporting duty (BSI for DE, ANSSI for FR, NCSC for UK), supply-chain security (Art. 21 §2 lit. d), essential / important entity classification. Return only this one section.`,
  },
  {
    id: "compliance-attestations",
    title: {
      de: "8. Compliance-Attestierungen",
      en: "8. Compliance attestations",
    },
    description: {
      de: "Selbsterklärungen zu Sanktionen-Compliance, Export-Kontrolle, Beneficial-Ownership, Antikorruption.",
      en: "Self-declarations on sanctions compliance, export control, beneficial ownership, anti-corruption.",
    },
    buildPrompt: ({ jurisdiction, operatorLabel, lang }) =>
      lang === "de"
        ? `Erstelle Abschnitt 8 ("Compliance-Attestierungen") für einen ${operatorLabel}-Genehmigungsantrag in ${jurisdiction}. Liefere die Selbsterklärungs-Texte für: EU/UN-Sanktionen-Compliance, Export-Kontrolle (EU Dual-Use VO 2021/821, ITAR/EAR-Mapping), Beneficial-Ownership ≥ 25 % (für Trustee-Strukturen), Antikorruption (UN Convention against Corruption + nationales Recht). Jeweils mit Unterschrifts-Block. Nur diesen einen Abschnitt.`
        : `Draft section 8 ("Compliance attestations") for a ${operatorLabel} authorization filing in ${jurisdiction}. Provide self-declaration texts for: EU/UN sanctions compliance, export control (EU Dual-Use Regulation 2021/821, ITAR/EAR mapping), beneficial ownership ≥ 25% (for trustee structures), anti-corruption (UN Convention against Corruption + national law). Each with signature block. Return only this one section.`,
  },
  {
    id: "cover-statement",
    title: {
      de: "9. Anschreiben & Unterschriftsblock",
      en: "9. Cover statement & signature block",
    },
    description: {
      de: "Formelles Anschreiben an die Behörde, Anlagen-Verzeichnis, Bevollmächtigter mit Unterschrift.",
      en: "Formal cover letter to the authority, enclosures list, authorized signatory block.",
    },
    buildPrompt: ({ jurisdiction, operatorLabel, lang }) =>
      lang === "de"
        ? `Erstelle Abschnitt 9 ("Anschreiben & Unterschriftsblock") für einen ${operatorLabel}-Genehmigungsantrag in ${jurisdiction}. Liefere: formelles Anschreiben an die zuständige Behörde, vollständiges Anlagen-Verzeichnis (Sections 1-8 plus technische Anhänge), zwei Unterschrifts-Blöcke (Antragsteller + bevollmächtigter Anwalt), Datum, Ort. Nur diesen einen Abschnitt.`
        : `Draft section 9 ("Cover statement & signature block") for a ${operatorLabel} authorization filing in ${jurisdiction}. Provide: formal cover letter to the competent authority, complete enclosures list (sections 1-8 plus technical annexes), two signature blocks (applicant + authorized counsel), date, place. Return only this one section.`,
  },
];
