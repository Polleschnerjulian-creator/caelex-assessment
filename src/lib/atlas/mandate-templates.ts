/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Mandate templates (client-safe).
 *
 * Pre-filled starter configurations for common Caelex matters.
 * Picked from the CreateMandateForm template-picker; selecting a
 * template populates every field at once (name + jurisdiction +
 * operator-type + authority + custom-instructions). User can then
 * tweak before submitting.
 *
 * Why these specific templates: each matches a frequently-recurring
 * pattern in space-regulatory legal-work (German launch-services
 * provider seeking BNetzA authorisation, US-headquartered satellite
 * operator with EU subsidiary, etc.). Adding a new template = one
 * entry below; UI auto-renders it.
 *
 * Add a new template: append below. The `id` must stay stable so
 * existing user analytics don't break when we later track which
 * template each mandate started from.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export interface MandateTemplate {
  id: string;
  /** UI label — what the user sees in the picker. */
  label: string;
  /** One-line description shown below the label. */
  description: string;
  /** Emoji for visual recognition in the picker grid. */
  emoji: string;
  /** Default value for the mandate name. User can edit. */
  defaultName: string;
  /** Optional jurisdiction code (DE/FR/UK/…). */
  jurisdiction?: string;
  /** Optional operator-type slug (satellite_operator, launch_provider, …). */
  operatorType?: string;
  /** Optional primary authority (BNetzA / FCC / OFCOM / …). */
  primaryAuthority?: string;
  /** Pre-filled custom instructions — paragraph form, German. */
  customInstructions: string;
}

export const MANDATE_TEMPLATES: MandateTemplate[] = [
  {
    id: "blank",
    label: "Leer starten",
    description: "Felder selbst ausfüllen",
    emoji: "📄",
    defaultName: "",
    customInstructions: "",
  },
  {
    id: "de-satellite-operator",
    label: "DE Satellitenbetreiber",
    description: "BNetzA + DLR, COM(2025) 335 anwendbar",
    emoji: "🛰️",
    defaultName: "DE-Satellite SAT-2026",
    jurisdiction: "DE",
    operatorType: "satellite_operator",
    primaryAuthority: "BNetzA",
    customInstructions:
      "Deutscher Satellitenbetreiber. Primäre Behörden: BNetzA (Frequenz), DLR/BMWK (Weltraum-Authorisation). EU Space Act COM(2025) 335 als Mandant prüfen. Bei Frequenz-Filings ITU-Koordination via Bundesnetzagentur beachten. NIS2-Einstufung als wesentliche Einrichtung wahrscheinlich.",
  },
  {
    id: "us-operator-eu-sub",
    label: "US-Operator mit EU-Tochter",
    description: "ITAR/EAR + EU-Substanztest",
    emoji: "🇺🇸",
    defaultName: "US-Op EU-Sub Mandat",
    jurisdiction: "EU",
    operatorType: "satellite_operator",
    customInstructions:
      "US-Mutter mit EU-Tochter (typisch DE oder LU). Doppelte Compliance-Pflicht: FCC/FAA + EU Space Act + nationales Weltraumrecht der EU-Jurisdiktion. ITAR-Implikation IMMER prüfen — Technologie-Transfer zwischen US-Mutter und EU-Tochter ist exportkontrollrechtlich relevant. EAR-License-Exception ENC/CIV evaluieren. Cost-Optimum-Vergleich DE/LU/NL für Authorisation.",
  },
  {
    id: "launch-services-provider",
    label: "Launch Services Provider",
    description: "Spaceport, Liability, Insurance",
    emoji: "🚀",
    defaultName: "Launch-Services Mandat",
    jurisdiction: "DE",
    operatorType: "launch_provider",
    primaryAuthority: "DLR",
    customInstructions:
      "Launch Services Provider. Kernthemen: Spaceport-Lizenzierung, Third-Party-Liability-Insurance (COM(2025) 335 Art. 8-12), Maximum-Probable-Loss-Berechnung, Cross-Waiver-Vereinbarungen mit Kunden + Subunternehmern. UN Liability Convention (1972) als Hintergrund-Treaty. Bei DE: gleichzeitig Sondergenehmigung nach LuftVG für startende Trägerraketen.",
  },
  {
    id: "earth-observation-eo",
    label: "Earth Observation (EO)",
    description: "Daten-Schutz, Auflösungs-Limits, ITAR",
    emoji: "🌍",
    defaultName: "EO-Mission Mandat",
    operatorType: "satellite_operator",
    customInstructions:
      "Earth-Observation-Operator. Schwerpunkte: Datenschutz (DSGVO bei Personenbezug + nationale Geodaten-Gesetze), Auflösungs-Limits (US Shutter-Control bei <50cm, DE-SatDSiG bei ≥0,5m), ITAR/EAR-Klassifizierung der Sensor-Technologie (ECCN 6A003 Cat I/II), DUAL-USE bei Hyperspektral. Kunden-Vertragsklauseln für Daten-Vertrieb in sensitiven Jurisdiktionen.",
  },
  {
    id: "constellation-bulk-filing",
    label: "Mega-Constellation Bulk-Filing",
    description: "ITU-Koordination, NGSO-NGSO-Konflikte",
    emoji: "🌌",
    defaultName: "Constellation Bulk-Filing",
    operatorType: "satellite_operator",
    customInstructions:
      "Mega-Constellation-Operator (NGSO). Schwerpunkte: ITU-Bringing-into-use-Fristen (7 Jahre nach API-Filing), NGSO-NGSO-Koordination mit anderen Constellation-Filings, FCC Part 25 (US-Market-Access) + nationale Filings in jeder Service-Jurisdiktion. Bei >100 Satelliten: COPUOS-Debris-Mitigation IADC-Guidelines + 25-Year-Deorbit. EU Space Act Art. 14ff für Debris.",
  },
];

/** Look up by id — null when no template matches (e.g. `blank` is
 *  the no-op default). */
export function templateById(id: string): MandateTemplate | null {
  return MANDATE_TEMPLATES.find((t) => t.id === id) ?? null;
}
