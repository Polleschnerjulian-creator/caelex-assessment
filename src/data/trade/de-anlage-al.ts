/**
 * Sprint B2 — DE Anlage AL (Ausfuhrliste) — German national export-control list.
 *
 * The Anlage AL is the national export-control list maintained by BAFA
 * (Bundesamt für Wirtschaft und Ausfuhrkontrolle). It implements:
 *   - EU Dual-Use Regulation 2021/821 Annex I (identical codes, "0000" prefix omitted)
 *   - EU-autonomous additions (from Delegated Regulations)
 *   - German-specific autonomous controls beyond Wassenaar / MTCR
 *   - Catch-all controls under AWG § 4 / AWV § 9
 *
 * Structure of Anlage AL codes:
 *   - "0000 xxxx" = EU-harmonized items (maps directly to EU Annex I codes)
 *   - "1C1513"    = EU-autonomous item 1C513 implemented under DE national list
 *   - "2B1510"    = EU-autonomous item 2B510 implemented under DE national list
 *   - "0007"      = DE-national entry corresponding to USML IV (MANPADS etc.)
 *   - "0009"      = DE-national entry corresponding to SLVs
 *
 * BAFA is the German licensing authority for dual-use and national-list items.
 * Military items are licensed by BAFA under the Kriegswaffenkontrollgesetz (KWKG)
 * and the Außenwirtschaftsverordnung (AWV).
 *
 * Source: BAFA Anlage AL (current version, accessed 2026-05-07)
 * https://www.bafa.de/DE/Aussenwirtschaft/Ausfuhrkontrolle/Gueterlisten/gueterlisten_node.html
 *
 * NOT a verbatim transcription. Descriptions are paraphrases.
 */

import type { ClassificationEntry, ClassificationCoverage } from "./schema";

const SOURCE_BASE =
  "https://www.bafa.de/DE/Aussenwirtschaft/Ausfuhrkontrolle/Gueterlisten/gueterlisten_node.html";

const ASOF = "2026-05-07";

export const DE_ANLAGE_AL_COVERAGE: ClassificationCoverage = {
  jurisdiction: "DE_ANLAGE_AL",
  scope:
    "German Anlage AL entries for aerospace-relevant items: EU-harmonized Cat. 9 entries, EU-autonomous entries (1C1513, 2B1510), and German-specific national-control codes (0007 MANPADS, 0009 SLVs). BAFA licensing authority.",
  excluded: [
    "Full text of EU-harmonized entries (see eu-annex-i.ts for detailed descriptions)",
    "KWKG-listed war weapons (Kriegswaffen) — licensed separately by BAFA/BMWi",
    "Non-aerospace categories (0001-0006, 0008, 0010+)",
  ],
  asOfDate: ASOF,
  officialTotalEntriesApprox: 2000,
  caelexCoverageCount: 8,
};

export const DE_ANLAGE_AL_ENTRIES: ClassificationEntry[] = [
  // ─── German national codes for SLVs and MANPADS ─────────────────────
  {
    code: "0009",
    jurisdiction: "DE_ANLAGE_AL",
    title: "Lenkflugkörper und Raumfahrzeuge (SLVs)",
    description:
      "Deutsche nationale AL-Position 0009: vollständige Raumtransportsysteme (SLV) und Trägerraketen. Entspricht EU Annex I 9A004 + 9A104 / MTCR 1.A.1. Genehmigungspflichtig nach AWV durch BAFA.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "complete-launch-vehicles",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "I",
    notes:
      "Isar Aerospace Spectrum, RFA One, HyImpulse SL1 — alle AL 0009-pflichtig sobald vollständige Trägerrakete oder Stufe exportiert wird.",
  },
  {
    code: "0007",
    jurisdiction: "DE_ANLAGE_AL",
    title: "MANPADS und Anti-Satelliten-Systeme",
    description:
      "Deutsche nationale AL-Position 0007: schultergestützte Flugabwehrsysteme und Anti-Satelliten-Fähigkeiten. Entspricht USML IV(b)/IV(c). Kriegswaffenkontrollpflichtig.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "manpads-and-anti-spacecraft",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "I",
  },

  // ─── EU-autonomous entries (implemented in DE national list) ─────────
  {
    code: "1C1513",
    jurisdiction: "DE_ANLAGE_AL",
    title: "Hochentropie-Legierungen und Refraktärmetall-Pulver (EU-autonom)",
    description:
      "DE-Umsetzung von EU Annex I 1C513 (Delegierte VO 2025/2003): HEA und Refraktärmetallpulver (W, Ta, Mo, Nb, Re) über definierten Reinheits-/Partikelgrößenschwellen. Neues EU-autonomes Kontrollregime ohne Wassenaar-Konsens.",
    controlReasons: ["NS"],
    crossReferenceTopic: "high-entropy-alloys-refractory",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    notes:
      "BAFA Auslegungshinweis (Entwurf 2025-Q4): Pulver für Raketentriebwerk-Brennkammern gelten ab dem ersten Anwendungsgespräch als kontrollpflichtig.",
  },
  {
    code: "2B1510",
    jurisdiction: "DE_ANLAGE_AL",
    title: "Metall-Additivfertigungsanlagen (EU-autonom)",
    description:
      "DE-Umsetzung von EU Annex I 2B510 (Delegierte VO 2025/2003): DMLS/SLM/EBM-Anlagen für Metallteile über Thermozyklus- und Aufbauratenschwellen. Relevant für deutsche New-Space-Unternehmen (Isar, RFA, HyImpulse).",
    controlReasons: ["NS"],
    crossReferenceTopic: "metal-additive-manufacturing-aerospace",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    notes:
      "BAFA empfiehlt Vorab-Auskunft gemäß AWV § 23 Abs. 1 bei Maschinen mit Build-Volumen > 0,5 m³ oder Einsatz in Raketentriebwerks-Fertigung.",
  },

  // ─── EU-harmonized entries (Anlage AL = EU Annex I code 1:1) ────────
  {
    code: "9A004",
    jurisdiction: "DE_ANLAGE_AL",
    title: "Raumfahrzeuge und Trägersysteme (EU-harmonisiert)",
    description:
      "Anlage AL 9A004 = EU Annex I 9A004. Vollständige Raumtransportsysteme und Raumfahrzeuge. MTCR Cat. I-Schwelle: ≥ 500 kg Nutzlast zu ≥ 300 km Reichweite.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "complete-launch-vehicles",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "I",
  },
  {
    // KORRIGIERT 2026-06-13: Elektrische Antriebe gehören zu 9A004.f (EU
    // Annex I / CCL 9A004.f → 9A515), NICHT zu 9A011. 9A011 =
    // Ramjet/Scramjet/Combined-Cycle-Triebwerke (Wassenaar 9.A.11).
    code: "9A004.f",
    jurisdiction: "DE_ANLAGE_AL",
    title: "Elektrische Antriebe für Raumfahrzeuge (EU-harmonisiert)",
    description:
      "Anlage AL 9A004.f = EU Annex I 9A004.f. Hall-Effekt-Triebwerke, Gittertriebwerke, FEEP, PPT für Raumfahrzeuge (Schub > 300 mN UND Isp > 1.500 s, ODER Eingangsleistung > 15 kW). BAFA-Auskunft empfohlen wenn PCU/PPU aus US-Fertigung.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "hall-thrusters-electric-propulsion",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "9A515",
    jurisdiction: "DE_ANLAGE_AL",
    title: "Raumfahrzeugplattformen (EU-harmonisiert)",
    description:
      "Anlage AL 9A515 = EU Annex I 9A515. Raumfahrzeuge und Plattformen mit Militär-/Geheimdienstfähigkeiten oder über militärischen Leistungsschwellen.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-bus-platforms",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "3A001.a.1",
    jurisdiction: "DE_ANLAGE_AL",
    title: "Strahlengehärtete ICs (EU-harmonisiert)",
    description:
      "Anlage AL 3A001.a.1 = EU Annex I 3A001.a.1. Strahlungsresistente integrierte Schaltkreise über TID/SEU-Schwellen. Häufig in Satelliten-Avionik — US-Ursprung triggert De-minimis.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
];

/**
 * Lookup by Anlage AL code.
 */
export function findDeAnlageAlEntry(
  code: string,
): ClassificationEntry | undefined {
  return DE_ANLAGE_AL_ENTRIES.find((e) => e.code === code);
}

/**
 * Lookup all DE Anlage AL entries for a given cross-reference topic slug.
 */
export function findDeAnlageAlEntriesByTopic(
  slug: string,
): ClassificationEntry[] {
  return DE_ANLAGE_AL_ENTRIES.filter((e) => e.crossReferenceTopic === slug);
}
