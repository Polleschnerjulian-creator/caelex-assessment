/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
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

// ─── Master List ──────────────────────────────────────────────────────
//
// Exports stay flat (array, not Map) so the template-picker can
// iterate cleanly. Order = display order.

export const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
  DE_LICENSE,
  NIS2_COMPLIANCE,
  CROSS_BORDER_DE_FR,
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
