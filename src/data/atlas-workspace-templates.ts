/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas-Workspace Templates — Quick-Start für typische Mandate.
 *
 * Statt jedes Mal ein leeres Board zu öffnen, kann der Anwalt aus
 * einer Vorlage starten. Jede Vorlage füllt:
 *   - Eine Mandanten-Karte (Stub mit Platzhaltern zum Ausfüllen).
 *   - 3-6 Quellen-Karten aus dem Atlas-Korpus mit echtem Wortlaut +
 *     korrekter Citation. Identische Format-Konvention wie der
 *     Korpus-Picker, damit der Export-Endpoint sie automatisch ins
 *     "Quellen-Anhang"-Bucket sortiert.
 *   - Eine Atlas-Notiz (kind=note) als Anleitung für die nächsten
 *     Schritte ("Synthetisiere danach eine Klausel...").
 *
 * Die Templates sind bewusst eng gehalten — 3 echte Use Cases statt
 * 20 oberflächliche. Lieber später aufstocken sobald die Anwälte
 * Feedback geben welche Use-Cases sie wirklich brauchen.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

export interface WorkspaceTemplateCard {
  /** "user" / "ai-clause" / "ai-answer" — same union the runtime
   *  workspace uses. Templates only emit "user" cards because the AI
   *  cards should be earned by the lawyer's interaction, not seeded. */
  kind: "user";
  title: string;
  content: string;
}

export interface WorkspaceTemplate {
  id: string;
  title: string;
  /** One-sentence pitch for the picker UI. */
  description: string;
  /** Workspace title to set after creation. Title may include
   *  placeholders that the lawyer renames. */
  workspaceTitle: string;
  /** Tag the picker uses to group templates by domain. */
  category: "license" | "compliance" | "comparison" | "incident" | "contract";
  cards: WorkspaceTemplateCard[];
}

// ─── DE-Satelliten-Lizenz ─────────────────────────────────────────────
//
// The bread-and-butter use case for a German space-law associate:
// helping a satellite operator obtain authorisation under SatDSiG +
// the EU Space Act. The starter cards include the canonical sources
// most Lizenzanträge cite, plus a guidance note on next steps.

const DE_LICENSE: WorkspaceTemplate = {
  id: "de-satellite-license",
  title: "DE Satelliten-Lizenz",
  description:
    "Lizenzantrag für deutschen Satellitenbetreiber — SatDSiG, EU Space Act Art. 7, Versicherung.",
  workspaceTitle: "[Mandant] — DE Satelliten-Lizenz",
  category: "license",
  cards: [
    {
      kind: "user",
      title: "Mandantenprofil",
      content: `Mandant: [Name eintragen]
Sitz: Deutschland
Rechtsform: [GmbH / AG / SE]
Geschäftsmodell: [z.B. Erdbeobachtung, Telekommunikation, In-Orbit-Servicing]
Geplante Aktivität: [z.B. Betrieb eines GEO-Satelliten ab 2027]
Payload-Charakteristik: [optisch / SAR / Telekom / dual-use]
Frequenzband(e): [Ku / Ka / X / S]

Offene Punkte:
- Wahl der NCA (BMWK / BNetzA)
- Versicherungsbedarf (Mindestdeckung)
- ITAR-Relevanz bei dual-use Komponenten`,
    },
    {
      kind: "user",
      title: "Art. 7: Authorisation Requirement",
      content: `Art. 7 EU Space Act (COM(2025) 335)

Establishes the authorisation requirement for space operators. Each Member State designates a competent authority (NCA) to grant authorisations. Operators must demonstrate technical capability, financial responsibility, and compliance with safety/debris/cybersecurity standards prior to commencing operations.`,
    },
    {
      kind: "user",
      title: "SatDSiG § 4 — Genehmigungspflicht",
      content: `§ 4 SatDSiG (Gesetz über die Sicherheit von Satellitendaten)

Genehmigungspflicht für den Betrieb hochwertiger Erdfernerkundungssysteme. Anwendung auf in Deutschland niedergelassene Operator. Antrag beim Bundesministerium für Wirtschaft und Klimaschutz (BMWK). Voraussetzungen: technische Eignung, Zuverlässigkeit der Verantwortlichen, Datensicherheitskonzept.`,
    },
    {
      kind: "user",
      title: "Art. 95: Insurance Requirement",
      content: `Art. 95 EU Space Act (COM(2025) 335)

Mandatory third-party liability insurance for all authorised operators. Minimum coverage scaled by mass + orbit class + activity type. The Commission may set sectoral minimums via implementing acts. Insurance must remain valid for the entire operational lifetime including post-mission disposal phase.`,
    },
    {
      kind: "user",
      title: "Art. 76: Cybersecurity Requirements",
      content: `Art. 76 EU Space Act (COM(2025) 335)

Cybersecurity requirements for space operators. References NIS2 Art. 21 controls as the baseline plus space-specific additions: ground-segment security, telemetry-link encryption, command-link authentication, anti-spoofing measures. Critical operators must implement risk-management framework.`,
    },
    {
      kind: "user",
      title: "Nächste Schritte",
      content: `Empfohlener Workflow:

1. Mandantenprofil oben vervollständigen.
2. Falls dual-use: ITAR-/EAR-Quellen über den Korpus-Picker hinzufügen.
3. "Atlas fragen": "Welche NCA und welche Frist?"
4. "Klausel synthetisieren" sobald alle relevanten Karten gepinnt sind — Atlas erzeugt eine Klausel mit Inline-Citations.
5. "Konflikte prüfen" — Atlas prüft auf Widersprüche zwischen Karten.
6. PDF-Export als Memo an Mandant / Senior.`,
    },
  ],
};

// ─── NIS2 Space-Operator Compliance ───────────────────────────────────
//
// Many satellite operators are classified as "essential" or
// "important" entities under NIS2 — and they don't realise it until
// the first cybersecurity audit. This template helps the lawyer
// frame the compliance gap analysis.

const NIS2_COMPLIANCE: WorkspaceTemplate = {
  id: "nis2-space-operator",
  title: "NIS2 Compliance — Space Operator",
  description:
    "Compliance-Gap-Analyse für Space-Operator unter NIS2 (Art. 21 + Risk-Management).",
  workspaceTitle: "[Mandant] — NIS2 Compliance-Gap",
  category: "compliance",
  cards: [
    {
      kind: "user",
      title: "Mandantenprofil — NIS2-Klassifizierung",
      content: `Mandant: [Name eintragen]
Sitz / Niederlassungen: [Liste alle EU-Länder]
Branche: Space sector (NIS2 Annex I Sector 11)
Mitarbeiter: [#]
Jahresumsatz: [€M]

NIS2-Klassifizierung (vorläufig):
[ ] Essential entity (Annex I + >250 MA / >€50M)
[ ] Important entity (Annex I + 50-249 MA)
[ ] Aus dem Anwendungsbereich (zu klein)

Bestehende Maßnahmen:
- [ ] ISMS / ISO 27001 zertifiziert
- [ ] Incident-Response-Plan existiert
- [ ] Lieferkettenrisiken adressiert
- [ ] Penetration Tests durchgeführt`,
    },
    {
      kind: "user",
      title: "NIS2 Art. 21(2)(a) — Risk-Analysis Policy",
      content: `NIS2 Art. 21(2)(a)

Documented information security policy covering risk analysis. Policy must address ground segment, space segment, and inter-segment communication. Senior-management approval required. Annual review mandatory.

Space-specific guidance: explicitly address RF interference, debris-induced failures, ASAT threats. Cover ground stations, mission control centres, TT&C links, inter-satellite links.`,
    },
    {
      kind: "user",
      title: "NIS2 Art. 21(2)(b) — Incident Handling",
      content: `NIS2 Art. 21(2)(b)

Incident-handling procedures. Must include early warning (24h to CSIRT), incident notification (72h), final report (1 month). Space operators face additional scrutiny: orbital incidents (debris-generation, collision), ground-segment compromises, RF interference cases.`,
    },
    {
      kind: "user",
      title: "NIS2 Art. 21(2)(c) — Business Continuity",
      content: `NIS2 Art. 21(2)(c)

Business continuity, backup management, and crisis management. For space operators: ground-segment redundancy, alternate command centres, satellite control hand-over procedures, data backup strategy with off-site replication.`,
    },
    {
      kind: "user",
      title: "NIS2 Art. 21(2)(d) — Supply Chain Security",
      content: `NIS2 Art. 21(2)(d)

Supply-chain-security assessment of direct suppliers. Space operators have unusual supply chains: launch providers, satellite manufacturers, ground-segment vendors, software/firmware providers. Each tier requires due diligence.`,
    },
    {
      kind: "user",
      title: "Nächste Schritte",
      content: `Empfohlener Workflow:

1. Mandantenprofil oben vervollständigen — vor allem die NIS2-Klassifizierung.
2. Falls Mandant in mehreren EU-Ländern: nationale NIS2-Umsetzungsgesetze über den Korpus-Picker hinzufügen.
3. "Was fehlt noch?" anklicken — Atlas schlägt evtl. weitere relevante NIS2-Pflichten (Art. 21(2)(e)-(j)) vor.
4. Pro Anforderung: Mandanten-Status notieren ("erfüllt"/"teilweise"/"offen").
5. "Klausel synthetisieren" für Compliance-Statement-Entwurf.`,
    },
  ],
};

// ─── Cross-Border DE/FR Vergleich ─────────────────────────────────────
//
// "Sollen wir den Mandanten in DE oder FR ansiedeln?" — eine sehr
// häufige Frage bei der Strukturierung neuer Space-Companies. Das
// Template seedet die Quellen für beide Länder und lässt den Anwalt
// dann "Atlas fragen" für den Vergleich.

const CROSS_BORDER_DE_FR: WorkspaceTemplate = {
  id: "cross-border-de-fr",
  title: "Cross-Border: DE vs FR",
  description:
    "Vergleich Lizenzregime DE vs FR für Standortwahl bei Neugründungen.",
  workspaceTitle: "[Mandant] — DE vs FR Standortwahl",
  category: "comparison",
  cards: [
    {
      kind: "user",
      title: "Mandantenprofil — Standortentscheidung",
      content: `Mandant: [Name eintragen]
Status: [Neugründung / Verlagerung]
Mögliche Standorte: Deutschland / Frankreich
Geplante Aktivität: [Satelliten-Operator / Launch-Site / In-Orbit-Servicing]

Entscheidungskriterien:
- Lizenz-Aufwand & Bearbeitungszeit
- Versicherungsanforderungen (€-Mindestdeckung)
- Staatliche Indemnifizierung
- Verfügbarkeit von Fachpersonal
- Steuerliche Aspekte (außerhalb des Workspaces)`,
    },
    {
      kind: "user",
      title: "🇩🇪 SatDSiG § 4 — DE Genehmigungspflicht",
      content: `§ 4 SatDSiG (DE)

Genehmigungspflicht durch BMWK. Bearbeitungszeit ca. 6-12 Monate. Voraussetzungen: technische Eignung, Datensicherheit, Zuverlässigkeit. Keine Mindestversicherung im Gesetz selbst — durch BMWK-Auflage individuell festgelegt. Operator-Sitz oder feste Niederlassung in DE erforderlich.`,
    },
    {
      kind: "user",
      title: "🇫🇷 Art. 4 Décret 2009-643 — FR Genehmigungspflicht",
      content: `Art. 4 Décret 2009-643 (FR)

Genehmigung durch CNES (Centre National d'Études Spatiales). Comprehensive technical assessment of the space object demonstrating conformity with regulations on technical requirements for space operations. Bearbeitungszeit ca. 9-15 Monate.`,
    },
    {
      kind: "user",
      title: "🇫🇷 Art. 6 LOS — FR Versicherung & Garantie",
      content: `Art. 6 Loi relative aux opérations spatiales (FR LOS)

Mandatory third-party liability insurance: minimum €60M. Französische Regierung garantiert für Schäden über der Versicherungssumme — Indemnifizierungsschirm für Operator. Finanzielle Garantie zusätzlich erforderlich für Post-Mission-Disposal.`,
    },
    {
      kind: "user",
      title: "Nächste Schritte",
      content: `Empfohlener Workflow:

1. Mandantenprofil oben vervollständigen.
2. "Atlas fragen": "Welche Jurisdiktion ist günstiger und warum — basierend auf den gepinnten Quellen?"
3. Atlas vergleicht **basierend auf den gepinnten Karten** statt aus Trainings-Wissen.
4. Falls weitere Punkte: "Was fehlt noch?" — Atlas schlägt z.B. ITAR-Quellen vor wenn dual-use im Profil.
5. PDF-Export als Standortempfehlungs-Memo an Mandant.`,
    },
  ],
};

// ─── Sanctions Diligence Pack ─────────────────────────────────────────
//
// Cross-border transactions touching Russian, Chinese, or sanctioned
// counterparties. Pre-loaded with the four canonical sanctions
// instruments + the EU Dual-Use Regulation as the dual-track screening
// frame.

const SANCTIONS_DILIGENCE: WorkspaceTemplate = {
  id: "sanctions-diligence-pack",
  title: "Sanktions-Diligence",
  description:
    "Cross-Border-Screening — EU 833/2014, UK Russia Regs, OFAC, PRC Export Law, Dual-Use VO",
  workspaceTitle: "[Mandant] — Sanctions Diligence",
  category: "compliance",
  cards: [
    {
      kind: "user",
      title: "Mandant + Zielmarkt",
      content: `Mandant: [Name]
Sektor: [Hardware-Hersteller / Operator / Servicer]
Zielmarkt(e): [RU / CN / IR / DPRK / sonstige]
Konkrete Transaktion: [Export / Investment / Datenfluss]
Endkunden bekannt? [Ja/Nein]
US-Origin-Anteil im Produkt: [%]
EU-Origin-Anteil: [%]
Zeithorizont: [...]`,
    },
    {
      kind: "user",
      title: "EU-Sanktion: VO 833/2014",
      content: `Council Regulation (EU) No 833/2014 — RU-Sektorensanktionen.

- Anhang VII (Hochtechnologie): erfasst Raumfahrzeuge, GNSS-Empfänger, INS, Sternensensoren.
- Anhang XXIII (Industriegüter): Antriebskomponenten, rad-hard Elektronik.
- Anhang IV (Endempfängerliste): direkt geblockt.
- Art. 12g: Best-Efforts-Sorgfaltspflicht gegen Drittlandsumlenkung (Belarus, Zentralasien, Kaukasus).

→ Atlas-ID: INT-EU-SANCTIONS-RU-833`,
    },
    {
      kind: "user",
      title: "UK-Sanktion: SI 2019/855",
      content: `The Russia (Sanctions) (EU Exit) Regulations 2019 — Post-Brexit UK-Regime.

- Part 5 (Trade): Verbote für Dual-Use, Kritische Infrastruktur.
- Reg. 19A-19F: Asset-Freeze-Designations (OFSI Consolidated List).
- Achtung: UK ≠ EU seit Brexit — beide Regime separat screenen.

→ Atlas-ID: INT-UK-RUSSIA-REGS-2019`,
    },
    {
      kind: "user",
      title: "US-Sanktion: OFAC SDN + BIS Entity List",
      content: `OFAC SDN (E.O. 14024 RU, OFAC Iran/DPRK, BIS Entity List).

- 50%-Rule: jede ≥50%-Tochter eines Designated ist selbst geblockt.
- Sekundärsanktionen: erfassen Nicht-US-Operatoren bei US-Origin-Content (de minimis).
- Foreign Direct Product Rule: erfasst auch nicht-US-Hardware aus US-Technologie.

→ Atlas-IDs: INT-OFAC-SDN-SPACE, US-EAR, US-ITAR`,
    },
    {
      kind: "user",
      title: "PRC Exportkontrollgesetz 2020",
      content: `Export Control Law of the PRC + 2024 Dual-Use Items Regulations.

- MIIT-Permit für Items im Catalogue.
- Art. 18: Catch-all + Unverified End-User List (analog BIS).
- Art. 48: Counter-measures gegen "diskriminierende" Drittlandsmaßnahmen → Reziproke Beschränkungen für US-Counterparties.

→ Atlas-ID: INT-CN-EXPORT-LAW-2020`,
    },
    {
      kind: "user",
      title: "EU Dual-Use VO 2021/821",
      content: `EU-VO 2021/821 — direkt anwendbar in DE/FR/IT/etc., kein nationaler Transponderakt.

- Anhang I Cat. 7: Navigation/Avionik (GNSS, INS, Star Trackers).
- Anhang I Cat. 9: Aerospace + Propulsion (komplette Satelliten, Antriebe, Reaktionsräder).
- Art. 4: Catch-all → screen jede Transaktion, nicht nur gelistete Items.

→ Atlas-ID: DE-DUALUSE-2021`,
    },
    {
      kind: "user",
      title: "Diligence-Workflow",
      content: `Empfohlene Reihenfolge:

1. Lieferketten-Mapping: Welche Komponenten? Welcher Origin (US/EU/CN/RU)?
2. End-User-Screening: OFSI Consolidated + OFAC SDN + EU Annex IV + BIS Entity List.
3. End-Use-Screening: Militärisch? Dual-Use? WMD?
4. License-Klassifikation: Einzeln je Jurisdiktion (BAFA/SBDU/BIS/DDTC/MIIT/FSTEC).
5. Vertragliche Kondicionen: Diversion-Klausel, Compliance-Reps, Audit-Rechte.

⚠ EU-Sanktionen sind unmittelbar anwendbar — Rechtswahl kann sie nicht verdrängen.`,
    },
  ],
};

// ─── ITU Filing Pack ──────────────────────────────────────────────────
//
// Operator preparing a satellite-network coordination filing. Pre-loaded
// with the ITU framework + national filing-administration entry points
// for the major regulators that operators actually go through.

const ITU_FILING: WorkspaceTemplate = {
  id: "itu-filing-pack",
  title: "ITU Filing Pack",
  description:
    "Satellite-Spectrum Coordination — ITU RR + WRC-23 + nationale Frequenzbehörden",
  workspaceTitle: "[Operator] — ITU Filing",
  category: "compliance",
  cards: [
    {
      kind: "user",
      title: "Mission + Frequenzplan",
      content: `Operator: [Name]
Mission: [GEO / LEO / MEO / NGSO]
Konstellation? [Ja, N=... / Einzelsatellit]
Frequenzbänder: [Ku / Ka / Q/V / S / X / L]
TT&C: [Band, Modulation]
Payload: [Band, Service-Klasse]
Zielmarkt: [global / EU / regional]
Filing-Administration: [BNetzA / Ofcom / FCC / ARCEP / TDRA / sonstige]`,
    },
    {
      kind: "user",
      title: "ITU Radio Regulations 2024",
      content: `ITU-RR 2024-Edition (post WRC-23). Treaty-rang, bindet 194 Mitgliedstaaten.

- Art. 5: Frequenzzuteilungstabelle (Region 1/2/3).
- Art. 9: Coordination — API → CR/C → bilaterale Coordination.
- Art. 11: Notification + Recording im MIFR.
- Art. 22: PFD/EPFD-Limits für Weltraumdienste.

GEO-Coordination: typisch 2–7 Jahre. NGSO: deutlich kürzer aber EPFD-Constraints.

→ Atlas-IDs: INT-ITU-RR, INT-ITU-WRC-23`,
    },
    {
      kind: "user",
      title: "WRC-23 Outcomes (anwendbar 2024+)",
      content: `WRC-23 Final Acts — neue Regeln für Mega-Konstellationen + IMT-2030.

- AI 1.16: NGSO FSS in Ka + Q/V — neue EPFD-Vorgaben für Starlink/Kuiper-2.
- AI 1.18: 6G/IMT-2030 — Direct-to-Device-Allokationen vorbereiten.
- WRC-27 (geplant 2027): wird mehrere WRC-23-Kompromisse revidieren — CPM-Zyklus ab 2025 monitoren.

→ Atlas-ID: INT-ITU-WRC-23`,
    },
    {
      kind: "user",
      title: "Nationale Filing-Pfade (Auswahl)",
      content: `BNetzA (DE): TKG §§ 91 ff. — DE-Operator filed über BNetzA.
ARCEP (FR): CPCE — Code des postes et communications électroniques.
Ofcom (UK): WTA 2006 — UK-Operator-Filing.
FCC (US): Communications Act + 47 CFR Part 25 — US-Filing + Market-Access für non-US Networks.
TDRA (UAE): Spektrumkoordination + UAE-Satelliten-Network-Filings.
ANATEL (BR): General Telecommunications Law — BR-Filing.
ANFR (FR): Frequenzkoordinationsstelle, arbeitet mit ARCEP.
ACMA (AU): Radiocommunications Act 1992.
MSIT (KR): Radio Waves Act.
ANATEL/MIIT (CN): MIIT für Spectrum + ITU-Coordination für CN-Filings.

Achtung: Coordination muss VOR Launch eingeleitet werden — unfiled Networks haben keinen MIFR-Schutz.`,
    },
    {
      kind: "user",
      title: "Worst-Case-Szenarien",
      content: `Häufige Stolpersteine:

1. API-Veröffentlichung verfehlt → Network-Status verloren.
2. Coordination mit Nachbar-Operator blockiert → 18+ Monate Verzögerung.
3. PFD/EPFD-Verstoß im Betrieb → Notification entzogen.
4. Two-Step-Filing: Network angefordert aber nicht in Betrieb → "bringing into use"-Frist verpasst (7 Jahre nach Notification).
5. Übergangsregeln WRC-23 nicht eingehalten → grandfathered nur unter strikten Bedingungen.

→ Recovery: Regulärer Filing-Refresh, BNetzA-Liaison, ggf. ITU-Koordination via Re-Submission.`,
    },
  ],
};

// ─── Insurance Placement Pack ─────────────────────────────────────────
//
// Operator placing a launch + in-orbit cover. Brings together the
// contract-law + market + prudential layers across the relevant
// jurisdictions.

const INSURANCE_PLACEMENT: WorkspaceTemplate = {
  id: "insurance-placement-pack",
  title: "Insurance Placement",
  description:
    "Launch + In-Orbit Cover — DE-VVG, UK-IA-2015, INT-Markt, Solvency II, IDD",
  workspaceTitle: "[Operator] — Insurance Placement",
  category: "contract",
  cards: [
    {
      kind: "user",
      title: "Mission + Risikoprofil",
      content: `Operator: [Name]
Mission: [Vehicle / Satellitentyp / TRL]
Versicherter Wert: [Pre-Launch / Launch / In-Orbit / Third-Party-Liability]
Limit pro Layer: [...]
Selbstbehalt: [...]
Launch-Site: [CSG / KSC / Vandenberg / Plesetsk / Wenchang]
Operator-Sitz: [DE / FR / UK / US / sonstige]
Choice of Law im Wording: [English / German / French / sonstige]
Broker: [...]`,
    },
    {
      kind: "user",
      title: "UK Insurance Act 2015 (London-Wording)",
      content: `Insurance Act 2015 — substanzielle Grundlage für Lloyd's-Wordings.

- § 3: Duty of fair presentation (löst Marine Insurance Act 1906 utmost good faith ab).
- §§ 8-11: Verhältnismäßige Rechtsfolgen statt Avoidance ab initio.
- § 9-11: Basis-of-contract-Klauseln abgeschafft; Garantie-Verstoß suspendiert nicht terminiert.
- § 12: Fraudulent Claims → Vertrag ab Tat als beendet.

→ Atlas-ID: UK-INSURANCE-ACT-2015`,
    },
    {
      kind: "user",
      title: "DE VVG (Choice-of-Law-Trap für DE-Risiken)",
      content: `Versicherungsvertragsgesetz — wenn deutsches Recht gewählt.

- §§ 19-22: Anzeigepflichten — fahrlässig/grob fahrlässig/arglistig differenziert.
- §§ 100-115: Direktanspruch des Geschädigten + Insurer's Duty to Defend.
- § 32: zwingende Versicherungsnehmer-Schutzbestimmungen — Londoner Wordings können nicht 1:1 unter DE-Recht abgebildet werden.

→ Choice-of-Law-Analyse routinemäßig nötig.

→ Atlas-ID: DE-VVG`,
    },
    {
      kind: "user",
      title: "Markt-Struktur",
      content: `Lloyd's leads (Beazley, Hiscox, AEGIS London, Brit, Tokio Marine Kiln). Continental followers: Allianz, Munich Re, SCOR. Asian capacity: Mitsui Sumitomo, Tokio Marine, Mapfre.

Mutuals: Galactic Re (SES/Eutelsat-aligned), Operator Captives.

Standard-Layering:
  1. Pre-Launch (Transit + Integration).
  2. Launch (Zündung bis Trennung).
  3. In-Orbit-Lebensdauer (Commissioning bis EOL).
  4. Third-Party Liability.

Wording-Basis: LSW (Lloyd's Space Insurance Wording), Joint Hull, Munich Re Benchmark.

Markt 2026: hardened nach Verlust-Zyklus 2023-24 (Viasat-3, Inmarsat-6 F2 Anomalien, mehrere LEO-Failures).

→ Atlas-ID: INT-SPACE-INSURANCE-MARKET`,
    },
    {
      kind: "user",
      title: "EU Solvency II + IDD (für EU-Insurer)",
      content: `Solvency II Directive 2009/138/EC (recast 2025/2):
- SCR/MCR-Kapitalanforderungen, Standardformel oder Internal Model.
- Cross-border-Lizenz: EU-zugelassener Versicherer kann EU-weit zeichnen.
- Solvency II 2.0 (2025): reduzierte Kapitalanforderung für Long-Term-Equity.

IDD (Reg. 2016/97):
- Art. 17-20: Conduct of Business + Demands-and-Needs.
- Art. 25: POG (Product Oversight and Governance).

→ Relevant für EU-domizilierte Versicherer (Allianz, Munich Re, SCOR).
→ Atlas-IDs: EU-SOLVENCY-II, EU-IDD`,
    },
  ],
};

// ─── Master List ──────────────────────────────────────────────────────
//
// Exports stay flat (array, not Map) so the template-picker can
// iterate cleanly. Order = display order.

export const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
  DE_LICENSE,
  NIS2_COMPLIANCE,
  CROSS_BORDER_DE_FR,
  SANCTIONS_DILIGENCE,
  ITU_FILING,
  INSURANCE_PLACEMENT,
];

export function getTemplateById(id: string): WorkspaceTemplate | undefined {
  return WORKSPACE_TEMPLATES.find((t) => t.id === id);
}

/** Lightweight summary shape for the public list endpoint. The
 *  picker doesn't need card content client-side — it only uses
 *  title/description/category to render the picker rows. */
export interface WorkspaceTemplateSummary {
  id: string;
  title: string;
  description: string;
  category: WorkspaceTemplate["category"];
  cardCount: number;
}

export function listTemplateSummaries(): WorkspaceTemplateSummary[] {
  return WORKSPACE_TEMPLATES.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    category: t.category,
    cardCount: t.cards.length,
  }));
}
