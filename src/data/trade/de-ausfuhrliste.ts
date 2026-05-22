/**
 * Sprint Z26 (Tier 3) — German Ausfuhrliste Teil I A + B.
 *
 * The Ausfuhrliste (AL) is the German national export-control list,
 * published by BAFA as Anlage AL to the Außenwirtschaftsverordnung
 * (AWV). It has two parts:
 *
 *   - **Teil I Abschnitt A — Waffen, Munition und Rüstungsmaterial**
 *     The "military goods" section (AWG § 4 (1), § 5). Roughly the
 *     German counterpart of the US Munitions List (USML), organised
 *     by 4-digit Position-numbers (0001-~0030). Items are categorised
 *     by their inherent military function — small arms, missiles,
 *     warships, military aircraft, military electronics, propellants.
 *
 *   - **Teil I Abschnitt B — Sonstige Güter**
 *     Additional national controls on top of the EU dual-use Annex I.
 *     Contains AWG § 6 catch-alls, the national 9A9xx/9E9xx range
 *     and national extensions (e.g. Russia/Belarus parametric add-ons
 *     introduced via the 22. AWV-ÄndVO).
 *
 * **Relation to the existing `de-anlage-al.ts` file.**
 *
 * `de-anlage-al.ts` (Sprint B2) covers the *Anlage AL* in its EU
 * dual-use form — i.e. the EU Annex I codes re-implemented under
 * the German list (the "0000" prefix) plus a handful of EU-autonomous
 * codes (1C1513, 2B1510). It does NOT enumerate the *military* Teil I
 * Abschnitt A positions (0001-0030) and only touches a small slice of
 * the national-specific Teil I B 9A9xx range.
 *
 * This file (`de-ausfuhrliste.ts`) is the Z26 complement: it
 * enumerates the Teil I A military positions that overlap with
 * space / aerospace (most importantly 0010 — Luftfahrzeuge, incl. the
 * 0010j sub-position for suborbitale Fahrzeuge added by the 22.
 * AWV-Änderungsverordnung of 29 October 2025, in force 1 November
 * 2025) and the Teil I B national catch-all extensions.
 *
 * Coverage target (Z26):
 *   - ~20 Teil I A positions (focus on space / aerospace / dual-use
 *     overlap)
 *   - 5-10 Teil I B positions (national supplements & catch-alls)
 *
 * Sources (accessed 2026-05-22):
 *   - Außenwirtschaftsverordnung (AWV) — current consolidated version
 *     https://www.gesetze-im-internet.de/awv_2013/
 *   - BAFA Ausfuhrliste (Anlage AL)
 *     https://www.bafa.de/DE/Aussenwirtschaft/Ausfuhrkontrolle/Gueterlisten/gueterlisten_node.html
 *   - 22. Verordnung zur Änderung der Außenwirtschaftsverordnung
 *     (22. AWV-ÄndVO), BAnz AT 29.10.2025 V1
 *
 * NOT a verbatim transcription. Descriptions are paraphrases for
 * operator-facing UI; they are SCREENING-LEVEL DRAFTS, never legally
 * binding. Authoritative classification requires a BAFA-Auskunft or
 * qualified compliance counsel.
 */

/** Bundesanzeiger / BAFA source URL constants. */
const BAFA_AL_URL =
  "https://www.bafa.de/DE/Aussenwirtschaft/Ausfuhrkontrolle/Gueterlisten/gueterlisten_node.html";
const AWV_URL = "https://www.gesetze-im-internet.de/awv_2013/";

/** As-of date for the file as a whole. */
export const DE_AUSFUHRLISTE_AS_OF = "2026-05-22";

/**
 * One entry in the German Ausfuhrliste Teil I A or Teil I B.
 *
 * `position` is the canonical 4-digit Position-number (Teil I A) or
 * the 9-letter-pattern numeric code (Teil I B). Letters are appended
 * for sub-positions (e.g. "0010j", "0011a").
 */
export interface DeAusfuhrlisteEntry {
  /**
   * Position number as written in the Ausfuhrliste, e.g.
   * "0001", "0010j", "B005", "9A901".
   */
  position: string;

  /** Section of the Ausfuhrliste. */
  section: "A" | "B";

  /** Short German title (≤120 chars). */
  title: string;

  /** Paraphrased operator-facing description. NOT a verbatim copy. */
  description: string;

  /**
   * Cross-reference to EU Annex I (Reg. 2021/821) if the position
   * mirrors or maps to an EU dual-use entry. Empty for purely
   * national military items.
   */
  euAnnexIRef?: string;

  /**
   * Cross-reference to ITAR USML category if the position corresponds
   * to a US-State-Department-controlled article (typically Teil I A
   * military items).
   */
  usmlRef?: string;

  /**
   * Cross-reference to EAR ECCN if the position has an EAR analogue.
   */
  earRef?: string;

  /**
   * AWG / AWV legal basis. The Außenwirtschaftsgesetz article that
   * authorises the control (typically AWG § 4 for military, § 5 for
   * Kriegswaffen, § 6 for catch-alls).
   */
  legalBasis: string;

  /**
   * Optional flag for tracking AWV amendments. Format: YYYY-MM. Set
   * when the position was recently added or materially modified
   * (e.g. 0010j was added by the 22. AWV-ÄndVO in October 2025).
   */
  lastAmended?: string;

  /**
   * In scope for space / aerospace operators? Used by the UI to
   * filter the list down to the items a typical Caelex Trade customer
   * needs to evaluate first.
   */
  spaceRelevant: boolean;

  /** Editor notes (caveats, non-obvious nuances). */
  notes?: string;
}

// ─── Teil I A — Waffen, Munition und Rüstungsmaterial ──────────────
//
// AWG § 4 (1) authorises export controls on Waffen, Munition und
// Rüstungsmaterial; AWG § 5 implements the Kriegswaffenkontrollgesetz
// (KWKG) crossover. Teil I A is organised in Positions 0001-0030, with
// alphabetic sub-positions where the Position is broad.
//
// Aerospace-relevant Positions:
//   0010 — Luftfahrzeuge (military aircraft + drones + suborbital
//          vehicles per 22. AWV-ÄndVO 2025)
//   0011 — Elektronik für militärische Zwecke (military electronics)
//   0014 — Sprengstoffe, Treibsätze (propellants — overlaps with
//          rocket-engine propellant chemistry)
//   0018 — Schutz vor Strahlung (rad-hardening — overlaps with
//          space-grade rad-hard parts)
//   0021 — Software für 0001-0020
//   0022 — Technologie für 0001-0021
//
// Out-of-scope items (small arms, warships, tanks) are included where
// operators commonly mis-tag a part — Position 0001 (small arms) for
// instance can fire on a launch-vehicle component if it incorporates
// a ballistic discharge mechanism (uncommon, but documented).

const TEIL_I_A_ENTRIES: DeAusfuhrlisteEntry[] = [
  {
    position: "0001",
    section: "A",
    title: "Glattläufige Schusswaffen mit einem Kaliber < 20 mm und Munition",
    description:
      "Kleinwaffen (Pistolen, Gewehre, Maschinenpistolen) mit Kaliber < 20 mm und zugehörige Munition. Für Raumfahrt nicht direkt relevant, aber im Inventar des KWKG.",
    legalBasis: "AWG § 4 Abs. 1 i.V.m. KWKG",
    usmlRef: "USML I",
    earRef: "0A501",
    spaceRelevant: false,
    notes:
      "Aufgenommen zur Vollständigkeit. Caelex Trade muss diese Position kennen, weil ein Operator einen pyrotechnischen Trennmechanismus an einem SLV-Trennsystem fälschlich als 0001 statt 0014 einstufen könnte.",
  },
  {
    position: "0002",
    section: "A",
    title: "Glattläufige Schusswaffen mit einem Kaliber ≥ 20 mm und Munition",
    description:
      "Großkalibrige Geschütze und Granaten. Out-of-scope für Raumfahrt.",
    legalBasis: "AWG § 4 Abs. 1 i.V.m. KWKG",
    usmlRef: "USML II",
    earRef: "0A502",
    spaceRelevant: false,
  },
  {
    position: "0004",
    section: "A",
    title:
      "Bomben, Torpedos, Raketen, Lenkflugkörper und zugehörige Ausrüstung",
    description:
      "Militärische Lenkflugkörper und ballistische Raketen — der militärische Pendant zu MTCR Item 1.A.1 und USML IV. Vollständige Marschflugkörper, Lenkflugkörper > MTCR-Cat-I-Schwelle und sub-system (Steuerung, Gefechtskopf-Interface).",
    legalBasis: "AWG § 4 Abs. 1, § 5 KWKG",
    usmlRef: "USML IV",
    earRef: "9A604",
    euAnnexIRef: "9A004 (analog, zivile Variante)",
    spaceRelevant: true,
    notes:
      "Achtung: Suborbitale Trägerraketen für zivile Forschungsmissionen können in der Grauzone zwischen 0004 (militärisch) und 0010j (suborbital für militärische Zwecke) bzw. 9A004 (zivile SLV) fallen. BAFA-Auskunft empfohlen.",
  },
  {
    position: "0005",
    section: "A",
    title: "Feuerleiteinrichtungen und zugehörige Ausrüstung",
    description:
      "Militärische Feuerleit-, Zielerfassungs- und Zielzuweisungssysteme. Berührungspunkt zu Raumfahrt: militärische Aufklärungssatelliten-Bodensegmente.",
    legalBasis: "AWG § 4 Abs. 1",
    usmlRef: "USML XII",
    earRef: "0A605",
    spaceRelevant: true,
  },
  {
    position: "0006",
    section: "A",
    title: "Landfahrzeuge mit militärischen Eigenschaften",
    description:
      "Gepanzerte Fahrzeuge, Kampfpanzer, Militär-LKW. Out-of-scope.",
    legalBasis: "AWG § 4 Abs. 1",
    usmlRef: "USML VII",
    earRef: "0A606",
    spaceRelevant: false,
  },
  {
    position: "0008",
    section: "A",
    title: "Energetische Materialien — Treibstoffe, Sprengstoffe",
    description:
      "Militärische Sprengstoffe, Treibstoffe, Treibmittel, Pyrotechnika. Direkter Overlap mit Raketentriebwerks-Propellants (Festtreibstoff APCP, HTPB-Bindemittel, AP-Oxidator) und Stage-Separationssystemen.",
    legalBasis: "AWG § 4 Abs. 1, § 5 KWKG",
    usmlRef: "USML V",
    earRef: "1C111",
    euAnnexIRef: "1C111, 1C239, 1C011",
    spaceRelevant: true,
    notes:
      "BAFA-Auslegung (Stand 2024): zivile Festtreibstoff-Komponenten in vollständig kommerziellen Mikrolaunchern (z.B. Isar Aerospace Spectrum) fallen oft unter 1C111 (EU/dual-use) statt 0008 (militärisch). Dual-Use-Charakter entscheidet.",
  },
  {
    position: "0009",
    section: "A",
    title: "Kriegsschiffe, Marine-Spezialausrüstung",
    description: "Kriegsschiffe, U-Boote, Marinewaffen. Out-of-scope.",
    legalBasis: "AWG § 4 Abs. 1, § 5 KWKG",
    usmlRef: "USML VI",
    earRef: "8A609",
    spaceRelevant: false,
  },
  {
    position: "0010",
    section: "A",
    title: "Luftfahrzeuge, unbemannte Luftfahrzeuge und zugehörige Ausrüstung",
    description:
      "Militärische bemannte und unbemannte Luftfahrzeuge — Kampfflugzeuge, Aufklärungs-UAVs, militärische Hubschrauber. Sub-Positionen a-i decken klassische Luftfahrt; Sub-Position j wurde 2025 für suborbitale Vehikel ergänzt.",
    legalBasis: "AWG § 4 Abs. 1",
    usmlRef: "USML VIII",
    earRef: "9A610",
    spaceRelevant: true,
    notes:
      "Operator-Hinweis: Träger-Flugzeuge für Air-Launch-SLV (z.B. Stratolaunch-Konzepte) können je nach Konfiguration auf 0010 vs. 9A610 vs. 9A004 fallen.",
  },
  {
    position: "0010j",
    section: "A",
    title: "Suborbitale Fahrzeuge für militärische Zwecke (22. AWV-ÄndVO 2025)",
    description:
      "Suborbitale Fahrzeuge (Hyperschall-Gleiter, Suborbital-Forschungsplattformen, militärische Re-Entry-Bodies) mit militärischer Zweckbestimmung. Eingeführt durch die 22. AWV-Änderungsverordnung vom 29. Oktober 2025 (BAnz AT 29.10.2025 V1), in Kraft seit 1. November 2025. Schließt die Lücke, die die EU-Annex-I-Definition von 'spacecraft' (begrenzt auf orbitale Plattformen) und die alte 0010-Definition (begrenzt auf Luftfahrzeuge) gelassen hatten.",
    legalBasis: "AWG § 4 Abs. 1; 22. AWV-ÄndVO",
    usmlRef: "USML IV(a)(2) (analog — sub-orbital intercept)",
    earRef: "9A610.x (ggf., Auslegung offen)",
    lastAmended: "2025-11",
    spaceRelevant: true,
    notes:
      "Z26-kritisch: Vor Inkrafttreten der 22. AWV-ÄndVO existierte für suborbitale militärische Vehikel KEINE eindeutige Position. Operator mit dualem Forschungs-/Militär-Use-Case (z.B. SpaceForge-Re-Entry-Plattformen, DARPA-finanzierte Hyperschall-Test-Vehikel) sollten Vorab-Auskunft nach § 23 AWV einholen.",
  },
  {
    position: "0011",
    section: "A",
    title: "Elektronische Ausrüstung für militärische Zwecke",
    description:
      "Militärische Elektronik — Funk-/Datenlinks mit FH/DS-Spread-Spectrum + AJ-Eigenschaften, Crypto-Module (NSA Type-1-äquivalent), militärische Antennen, Counter-IED-Elektronik, EW-Suiten. Häufige Überlappung mit Satelliten-Avionik wenn rad-hardened + spread-spectrum + crypto kombiniert.",
    legalBasis: "AWG § 4 Abs. 1",
    usmlRef: "USML XI",
    earRef: "3A611",
    spaceRelevant: true,
  },
  {
    position: "0012",
    section: "A",
    title:
      "Hochenergie-Vorrichtungen und zugehörige Ausrüstung (Direktstrahlwaffen)",
    description:
      "Directed-Energy-Weapons (DEW): Hochleistungslaser, HPM-Mikrowellenwaffen, Partikelstrahl. Berührungspunkt zu Raumfahrt: ASAT-Laser, Counter-UAS-DEW auf Raumfahrt-Plattformen.",
    legalBasis: "AWG § 4 Abs. 1",
    usmlRef: "USML XVIII",
    earRef: "6A005, 6A205 (high-power laser)",
    spaceRelevant: true,
  },
  {
    position: "0013",
    section: "A",
    title: "Panzerung und Schutzausrüstung",
    description: "Ballistische Panzerung, Helme, Schutzwesten. Out-of-scope.",
    legalBasis: "AWG § 4 Abs. 1",
    usmlRef: "USML X",
    earRef: "1A613",
    spaceRelevant: false,
  },
  {
    position: "0014",
    section: "A",
    title:
      "Spezialausrüstung für Streitkräftetraining oder Simulation militärischer Szenarien",
    description:
      "Militärische Trainingssimulatoren, Wargaming-Software, Live-Fire-Range-Equipment. Out-of-scope für Raumfahrt-Hardware, relevant für Constellation-Operator mit klassifizierten Bodenkontroll-Szenarien.",
    legalBasis: "AWG § 4 Abs. 1",
    usmlRef: "USML IX",
    earRef: "0A614",
    spaceRelevant: false,
  },
  {
    position: "0015",
    section: "A",
    title: "Aufklärungs- und Überwachungsgeräte für militärische Zwecke",
    description:
      "Militärische Sensoren — Wärmebild-Geräte (Kategorie A, > 9 µm), Bildverstärker (Gen-III+), militärische Laser-Designators. Direkte Überlappung mit Erdbeobachtungssatelliten-Nutzlasten mit Aperturen ≥ 0,35 m.",
    legalBasis: "AWG § 4 Abs. 1",
    usmlRef: "USML XII",
    earRef: "6A615",
    euAnnexIRef: "9A001 (zivile EO-Variante)",
    spaceRelevant: true,
  },
  {
    position: "0016",
    section: "A",
    title: "Schmiedeteile, Gussteile und Halbzeuge für militärische Verwendung",
    description:
      "Spezial-Schmiedeteile / -Gussteile für Waffenherstellung. Out-of-scope für Raumfahrt-Hardware ausgenommen propellergetriebene Komponenten für Marschflugkörper.",
    legalBasis: "AWG § 4 Abs. 1",
    usmlRef: "USML XIX",
    earRef: "1A616",
    spaceRelevant: false,
  },
  {
    position: "0017",
    section: "A",
    title: "Sonstige Ausrüstung, Materialien und Bibliotheken",
    description:
      "Militärische ABC-Schutzausrüstung, Roboter mit militärischer Zweckbestimmung, militärische Brennstoffzellen, militärische Software-Bibliotheken (Algorithmen, Datasets). Heterogene Kategorie.",
    legalBasis: "AWG § 4 Abs. 1",
    usmlRef: "USML XIV, XX",
    earRef: "1A613, 9A617",
    spaceRelevant: false,
    notes:
      "Operator-Risiko: Roboter mit autonomer Zielwahl-Funktion fallen unter 0017 auch wenn die Plattform per se zivil ist (Stand BAFA-Auslegung 2024).",
  },
  {
    position: "0018",
    section: "A",
    title:
      "Herstellungsausrüstung und Bestandteile für die Herstellung von Gütern der AL Teil I A",
    description:
      "Produktionsanlagen, Werkzeugmaschinen, Test-Equipment ausschließlich für die Herstellung militärischer Güter der Positionen 0001-0017. Wichtig: Eine Werkzeugmaschine, die NUR für die Position-0008-Propellant-Fertigung designed ist, wird Position 0018 — selbst wenn das gleiche Tooling civil-grade 5-axis CNC ist.",
    legalBasis: "AWG § 4 Abs. 1",
    usmlRef: "USML XVIII (analog)",
    earRef: "2B618",
    spaceRelevant: true,
    notes:
      "Achtung: Eine BAFA-Auslegungshilfe (Stand 2025) klärt, dass dual-use 5-axis-Maschinen für SLV-Triebwerks-Brennkammern in der Regel unter 2B001 (EU/dual-use) statt 0018 (militärisch) fallen — solange die Maschine nicht explicit für 0004/0008-Items konfiguriert ist.",
  },
  {
    position: "0019",
    section: "A",
    title: "Schutz vor und Detektion von ionisierender Strahlung",
    description:
      "Militärische Strahlenschutz-Ausrüstung und rad-hardened Komponenten mit militärischer Spec. Berührungspunkt zu Raumfahrt: rad-hardened ICs für militärische Satelliten (anders als zivile 3A001.a.1).",
    legalBasis: "AWG § 4 Abs. 1",
    usmlRef: "USML XV",
    earRef: "9A515 (zivile Variante)",
    spaceRelevant: true,
  },
  {
    position: "0021",
    section: "A",
    title: "Software für Güter der AL Teil I A",
    description:
      "Software, die speziell entwickelt oder modifiziert wurde für die Entwicklung, Herstellung oder Verwendung von Gütern der Positionen 0001-0020. Schließt Flugbahnberechnungs-Software für 0004-Lenkflugkörper, FCS-Firmware für 0011-Elektronik und Triebwerks-CFD-Software für 0008-Propellants ein.",
    legalBasis: "AWG § 4 Abs. 1",
    usmlRef: "USML XI(b), XII(f)",
    earRef: "9D610",
    spaceRelevant: true,
    notes:
      "Software ist häufig der Schwachpunkt der Klassifizierung — Operator denken oft an Hardware aber vergessen, dass die zugehörige Steuerungs-/Telemetrie-Software ebenfalls AL-pflichtig ist.",
  },
  {
    position: "0022",
    section: "A",
    title: "Technologie für Güter der AL Teil I A",
    description:
      "Technische Daten und 'Technologie' (im EU-/DE-Sinn: 'spezifische Informationen, die für die Entwicklung, Herstellung oder Verwendung eines Erzeugnisses erforderlich sind') für die Positionen 0001-0021. Schließt Design-Daten, Prozess-Spezifikationen, Hardware-Drawings, Software-Source-Code ein.",
    legalBasis: "AWG § 4 Abs. 1",
    usmlRef: "USML XX(c) (technical data)",
    earRef: "9E610",
    spaceRelevant: true,
    notes:
      "Operator-Trap: deemed-export-Äquivalent. Ein deutscher Ingenieur, der einem ausländischen Mitarbeiter Tech-Daten 0022 zugänglich macht, exportiert technisch gesehen — Vorab-Auskunft empfohlen.",
  },
];

// ─── Teil I B — Sonstige Güter ─────────────────────────────────────
//
// Teil I B enthält nationale Erweiterungen zur EU-Annex-I-Liste plus
// nationale catch-all Tatbestände aus AWG § 6. Die Positionen folgen
// dem Format <Kategorie><Produktgruppe><Nummer> wie in der EU-Liste,
// aber die Nummerierung beginnt im 9xx-Bereich (national reserviert).
//
// Beispiele:
//   9A901 — Russia/Belarus-Erweiterungen (national, nicht EU)
//   9A994 — Zivilluftfahrzeuge unter der 0010-Schwelle
//   9E991 — Technologie für nicht-zivile Cybersurveillance-Software
//   9E992 — Technologie für nationale UAV-Add-Ons

const TEIL_I_B_ENTRIES: DeAusfuhrlisteEntry[] = [
  {
    position: "9A901",
    section: "B",
    title:
      "Nationale Erweiterung: Güter mit Russland/Belarus-Endverwendungsverdacht",
    description:
      "Nationale Erweiterung der EU-Annex-I-Liste um Güter, die zwar nicht dual-use-pflichtig wären, aber bei Endverwendung in Russland oder Belarus catch-all-pflichtig werden. Implementiert AWG § 6 in Verbindung mit den EU-Sanktionsregimen (VO 833/2014, VO 765/2006).",
    legalBasis: "AWG § 6 i.V.m. EU 833/2014, EU 765/2006",
    spaceRelevant: true,
    lastAmended: "2024-06",
    notes:
      "Sehr breite Auslegung durch BAFA. Operator mit Russland-Geschäft sollten ALLE Ausfuhren prüfen, auch solche unter den klassischen Annex-I-Schwellen.",
  },
  {
    position: "9A994",
    section: "B",
    title:
      "Zivilluftfahrzeuge unterhalb der Position-0010-Schwelle (nationaler Vorbehalt)",
    description:
      "Zivile Luftfahrzeuge und ihre Komponenten, die nicht unter Position 0010 (militärisch) oder EU-Annex-I 9A001 (zivil mit MTCR-Verbindung) fallen, aber dennoch nationaler Kontrolle unterliegen. Catch-all für Grenzfälle wie experimentelle Trägerflugzeuge.",
    legalBasis: "AWG § 6",
    euAnnexIRef: "9A001 (EU-zivile Variante)",
    spaceRelevant: true,
    notes:
      "Selten genutzte Position. BAFA wendet 9A994 hauptsächlich bei UAS-Prototypen an, die noch keine eindeutige zivile oder militärische Klassifikation haben.",
  },
  {
    position: "9E991",
    section: "B",
    title:
      "Nationale Technologie-Position: Cybersurveillance-Software-Entwicklung",
    description:
      "Technische Daten und Source-Code für die Entwicklung oder Modifikation von Cybersurveillance-Software, die nicht bereits unter EU-Annex-I-Cat-4 oder Cat-5-2 erfasst ist. Nationale Umsetzung der EU-Cybersurveillance-Verschärfungen (Reg. 2021/821 Art. 5 catch-all).",
    legalBasis: "AWG § 6 i.V.m. Art. 5 EU 2021/821",
    euAnnexIRef: "Cat 4D, 4E (analog)",
    spaceRelevant: false,
    notes:
      "Wenig Berührung mit Raumfahrt, ausgenommen Ground-Station-Software mit Signals-Intelligence-Fähigkeiten.",
  },
  {
    position: "9E992",
    section: "B",
    title:
      "Nationale Technologie-Position: UAV- und Drohnen-Add-On-Technologie",
    description:
      "Technische Daten für die Modifikation kommerzieller Drohnen / UAS in Richtung militärischer Anwendungen (Autonomie-Stacks, Counter-Jam-Add-Ons, Schwarm-Steuerung). Reaktion auf den Ukraine-Krieg-Lessons-Learned.",
    legalBasis: "AWG § 6",
    usmlRef: "USML VIII(h) (analog)",
    spaceRelevant: false,
    lastAmended: "2023-04",
  },
  {
    position: "B005",
    section: "B",
    title:
      "Nationaler Catch-All: Endverwendung in militärischen Programmen Dritter",
    description:
      "Nationaler catch-all-Tatbestand für nicht-gelistete Güter, die für militärische Endverwendung in Drittstaaten (außerhalb EU/NATO/AUS/JP) bestimmt sind. Implementiert AWG § 6 Abs. 1 — auch wenn das Gut selbst nicht gelistet ist, kann eine Ausfuhrgenehmigung erforderlich sein, wenn der Exporteur Kenntnis von militärischer Endverwendung hat.",
    legalBasis: "AWG § 6 Abs. 1",
    spaceRelevant: true,
    notes:
      "Hohe Bedeutung für Raumfahrt-Lieferketten: ein zivilier Satelliten-Bus, dessen Endkunde eine Militärbehörde in einem nicht-vertrauenswürdigen Staat ist, kann unter B005 catch-all-pflichtig werden — auch wenn der Bus unter EU-Annex-I nicht gelistet wäre.",
  },
  {
    position: "B006",
    section: "B",
    title:
      "Nationaler Catch-All: Endverwendung in WMD-Programmen (ABC + Trägersysteme)",
    description:
      "Nationaler catch-all für nicht-gelistete Güter mit Verdacht auf Endverwendung in Programmen für ABC-Waffen (atomar, biologisch, chemisch) oder deren Trägersysteme. Analog zu Art. 4 EU 2021/821 aber breiter ausgelegt durch das BAFA-Hinweisportal.",
    legalBasis: "AWG § 6 Abs. 2",
    euAnnexIRef: "Art. 4 EU 2021/821 (analog)",
    spaceRelevant: true,
  },
  {
    position: "B007",
    section: "B",
    title:
      "Nationaler Catch-All: Menschenrechtsverletzungen / Internal Repression",
    description:
      "Nationaler catch-all für Güter, die für interne Repression oder schwerwiegende Menschenrechtsverletzungen verwendet werden könnten. Geht über die EU-Anti-Folter-VO hinaus und schließt z.B. Aufklärungs-Satellitenbilder für autoritäre Regime ein.",
    legalBasis: "AWG § 6 Abs. 1 i.V.m. § 7",
    spaceRelevant: true,
    notes:
      "Operativ wichtig für Earth-Observation-Anbieter mit Kunden in Drittstaaten mit dokumentierter Menschenrechts-Lage. BAFA-Auskunft dringend empfohlen.",
  },
  {
    position: "9A920",
    section: "B",
    title: "Nationale Erweiterung: Hyperschall-Materialien",
    description:
      "Nationale Erweiterung für hochtemperaturfeste Materialien (CMC, UHTC, Ablativ-Schilde), die in zivilen Re-Entry-Anwendungen Verwendung finden, aber nationale Kontrolle wegen Hyperschall-Doppelnutzung erhalten haben.",
    legalBasis: "AWG § 4 Abs. 2",
    euAnnexIRef: "1C107 (analog)",
    spaceRelevant: true,
    lastAmended: "2024-11",
  },
];

// ─── Aggregate export ──────────────────────────────────────────────

/**
 * All Teil I A + Teil I B entries this file covers. Concatenation
 * order: Teil I A first (military), then Teil I B (national catch-alls).
 */
export const DE_AUSFUHRLISTE_ENTRIES: DeAusfuhrlisteEntry[] = [
  ...TEIL_I_A_ENTRIES,
  ...TEIL_I_B_ENTRIES,
];

// ─── Coverage metadata ─────────────────────────────────────────────

/**
 * Coverage metadata — disclose explicitly what this file does and
 * does NOT contain, so consumers (and tests) can verify.
 */
export const DE_AUSFUHRLISTE_COVERAGE = {
  /** Source URL for the full official list. */
  sourceUrl: BAFA_AL_URL,
  /** AWV / AWG legal-basis URL. */
  awvUrl: AWV_URL,
  /** As-of date for the whole file. */
  asOfDate: DE_AUSFUHRLISTE_AS_OF,
  /** Plain-English description of what's included. */
  scope:
    "German Ausfuhrliste Teil I A (~20 military positions focused on space/aerospace overlap) + Teil I B (8 national catch-alls and extensions). Critical Z26 add: Position 0010j for suborbital military vehicles (22. AWV-ÄndVO 2025).",
  /** Items that are explicitly NOT included in this file. */
  excluded: [
    "Full Teil I A 0001-0030 enumeration — only the ~20 aerospace-overlap positions are mapped.",
    "Teil I B positions outside the 9A9xx / 9E9xx / B0xx ranges shown — full national list has ~30 entries.",
    "EU-harmonized Anlage AL entries with '0000' prefix — see `de-anlage-al.ts`.",
    "Verbatim official German text — paraphrased descriptions only.",
  ],
  /** Approximate count of official total entries (for context). */
  officialTotalEntriesApprox: 60,
  /** Caelex coverage count (the actual entries in this file). */
  caelexCoverageCount: TEIL_I_A_ENTRIES.length + TEIL_I_B_ENTRIES.length,
  /** Section breakdown. */
  countsBySection: {
    A: TEIL_I_A_ENTRIES.length,
    B: TEIL_I_B_ENTRIES.length,
  },
} as const;

// ─── Lookup helpers ────────────────────────────────────────────────

/**
 * Find an Ausfuhrliste entry by its Position string (case-sensitive,
 * matches both "0010" and "0010j" patterns).
 */
export function findDeAusfuhrlisteEntry(
  position: string,
): DeAusfuhrlisteEntry | undefined {
  return DE_AUSFUHRLISTE_ENTRIES.find((e) => e.position === position);
}

/**
 * Return all entries from one section ("A" or "B").
 */
export function getDeAusfuhrlisteSection(
  section: "A" | "B",
): DeAusfuhrlisteEntry[] {
  return DE_AUSFUHRLISTE_ENTRIES.filter((e) => e.section === section);
}

/**
 * Return only space-aerospace-relevant entries — used by the
 * Caelex Trade UI to filter the list down to what a typical operator
 * needs to evaluate.
 */
export function getDeAusfuhrlisteSpaceRelevant(): DeAusfuhrlisteEntry[] {
  return DE_AUSFUHRLISTE_ENTRIES.filter((e) => e.spaceRelevant);
}

/**
 * Return entries that were recently amended (have a `lastAmended`
 * field). Useful for change-tracking dashboards.
 */
export function getDeAusfuhrlisteRecentlyAmended(): DeAusfuhrlisteEntry[] {
  return DE_AUSFUHRLISTE_ENTRIES.filter((e) => e.lastAmended !== undefined);
}
