/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Workflow Library (Sprint 6, 2026-05-12).
 *
 * Curated catalog of multi-step legal workflows users can launch from
 * Quickstart-cards or the dedicated /atlas/workflows page.
 *
 * Sprint 6 MVP: each workflow is a single-prompt pre-fill with
 * recommended tool-toggles. Sprint 7+ may add multi-step pipelines
 * (the WorkflowStep[] field is reserved in the type system today).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export type WorkflowCategory =
  | "compliance"
  | "drafting"
  | "comparison"
  | "monitoring"
  | "document"
  | "research";

export interface WorkflowStep {
  prompt: string;
  expectedTools: string[];
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: WorkflowCategory;
  /** Sprint 6 single-prompt mode. */
  startingPrompt: string;
  /** Sprint 7+ — reserved for multi-step pipelines. */
  pipeline?: WorkflowStep[];
  /** Override default tool-toggles when launching. */
  toolToggles?: Record<string, boolean>;
  /** Tools the LLM is most likely to call (used for Astra hints + eval). */
  expectedTools?: string[];
  /** Time-to-completion estimate (display hint). */
  estimatedMinutes?: number;
  /** When true, surfaces in the homepage Quickstart grid. */
  isQuickstart?: boolean;
}

export const WORKFLOW_LIBRARY: Workflow[] = [
  /* ─── Compliance (5) ──────────────────────────────────────────────── */
  {
    id: "eu-space-act-applicability",
    emoji: "⚖️",
    name: "EU Space Act Applicability",
    description:
      "Klärt, ob und wie der EU Space Act (COM(2025) 335) auf einen Operator anwendbar ist. Modul-Mapping, Articles, Ausnahmen.",
    category: "compliance",
    startingPrompt:
      "Prüfe die Anwendbarkeit des EU Space Act für meinen Mandanten. Beziehe die einschlägigen Artikel ein und nenne Behörden + Fristen. Operator-Typ: [SCO/LO/GSO]. Establishment: [eu/third_country_eu_services/third_country_no_eu].",
    expectedTools: ["assess_eu_space_act", "search_legal_sources"],
    estimatedMinutes: 3,
    isQuickstart: true,
  },
  {
    id: "nis2-classification",
    emoji: "🛡️",
    name: "NIS2 Auto-Classification",
    description:
      "Klassifiziert einen Operator nach NIS2 (Essential / Important / Out-of-Scope) mit Begründung + Pflichten + Reporting-Timeline.",
    category: "compliance",
    startingPrompt:
      "Klassifiziere meinen Operator nach NIS2. Sektor: [space/digital_infrastructure/...]. Mitarbeiter: [<50/50-249/250+]. Mitgliedstaat: [DE/FR/IT/...]. Nenne Pflichten + Reporting-Fristen.",
    expectedTools: ["classify_nis2"],
    estimatedMinutes: 2,
    isQuickstart: true,
  },
  {
    id: "itar-ear-classification",
    emoji: "📋",
    name: "ITAR/EAR Klassifizierung",
    description:
      "Klassifiziert ein space-relevantes Item nach ITAR (USML), EAR (CCL) und EU Dual-Use Verordnung 2021/821 inkl. Sanktions-Overlay.",
    category: "compliance",
    startingPrompt:
      "Klassifiziere folgende Komponente nach ITAR/EAR und EU Dual-Use 2021/821. Nenne maßgebliche Listings + Genehmigungswege + Sanktions-Risiken. Item: [Beschreibung]. End-Use: [civil/dual_use/military]. Destination: [Land].",
    expectedTools: ["classify_export_control"],
    estimatedMinutes: 4,
    isQuickstart: true,
  },
  {
    id: "spectrum-filing",
    emoji: "📡",
    name: "ITU Spectrum-Filing",
    description:
      "ITU-Coordination-Pfad für ein Satelliten-System (API/CR/N), Notifying Administration, Frequenz-Band-Allocation, Timeline.",
    category: "compliance",
    startingPrompt:
      "Welcher ITU-Filing-Pfad ist für mein Satelliten-System nötig? Frequenz-Band: [L/S/C/X/Ku/Ka]. Orbit: [LEO/MEO/GEO]. Notifying Admin: [DE/FR/LU/...]. Nenne Coordination-Trigger + Timeline.",
    expectedTools: ["check_spectrum_filing"],
    estimatedMinutes: 3,
  },
  {
    id: "copuos-debris-mitigation",
    emoji: "🛰️",
    name: "COPUOS / IADC Debris-Konformität",
    description:
      "Prüft Mission gegen UN COPUOS / IADC Debris-Mitigation-Guidelines (25-Jahre-Regel, GEO-Graveyard, Passivierung).",
    category: "compliance",
    startingPrompt:
      "Prüfe meine Mission gegen COPUOS/IADC Debris-Mitigation. Operative Höhe: [km]. Masse: [kg]. Propulsion: [chemical/electric/cold_gas/none]. Controlled re-entry geplant: [yes/no].",
    expectedTools: ["check_copuos_compliance"],
    estimatedMinutes: 2,
  },

  /* ─── Comparison (2) ──────────────────────────────────────────────── */
  {
    id: "multi-jurisdiction-comparison",
    emoji: "🌍",
    name: "Multi-Jurisdiktion-Vergleich",
    description:
      "Vergleicht 3-5 nationale Weltraum-Regime entlang Authorisierung, Liability-Cap, Insurance-Min, Frequency-Coordinator, Export-Lizenz.",
    category: "comparison",
    startingPrompt:
      "Vergleiche [DE/FR/IT/UK/LU] für [Authorisierung-Typ]. Erstelle eine Matrix: Behörde · Liability-Cap · Insurance-Min · Frequency-Coordinator · Export-Lizenz. Nenne Empfehlung mit Begründung.",
    expectedTools: [
      "compare_jurisdictions_for_filing",
      "assess_national_space_law",
    ],
    estimatedMinutes: 4,
    isQuickstart: true,
  },
  {
    id: "national-space-law-deep-dive",
    emoji: "🇩🇪",
    name: "Nationales Weltraumrecht — Deep Dive",
    description:
      "Detaillierte Analyse einer einzelnen Jurisdiktion: Lizenzregime, Liability, Versicherung, Registrierung, Aufsicht.",
    category: "research",
    startingPrompt:
      "Erstelle einen Deep-Dive zum nationalen Weltraumrecht von [Land]. Operator-Typ: [satellite_operator/launch_provider/...]. Fokus: [authorization/liability_insurance/registration/supervision/all].",
    expectedTools: [
      "assess_national_space_law",
      "search_legal_sources",
      "find_authority",
    ],
    estimatedMinutes: 5,
  },

  /* ─── Drafting (3) ────────────────────────────────────────────────── */
  {
    id: "bnetza-filing-pack",
    emoji: "📑",
    name: "BNetzA Filing-Pack erstellen",
    description:
      "Erstellt einen Entwurf für eine BNetzA-Frequenzanmeldung inkl. Form-Felder + technische Specs + Begleitschreiben.",
    category: "drafting",
    startingPrompt:
      "Erstelle ein Filing-Pack für eine BNetzA-Frequenzanmeldung. Mission: [Beschreibung]. Frequenz: [GHz]. Orbit: [km]. Operator: [Name]. Inkludiere Antrag + technische Anlage + Begleitschreiben.",
    expectedTools: [
      "draft_authorization_application",
      "check_spectrum_filing",
      "find_authority",
    ],
    estimatedMinutes: 6,
    isQuickstart: true,
  },
  {
    id: "compliance-memo",
    emoji: "📝",
    name: "Compliance-Memo (Klient)",
    description:
      "Lawyer-grade Memo zu einem regulatorischen Topic für den Mandanten. Cited, mit klarer Gliederung.",
    category: "drafting",
    startingPrompt:
      "Erstelle ein Compliance-Memo zu folgendem Thema für den Mandanten. Thema: [Beschreibung]. Länge: ca. 800 Wörter. Inkludiere: (1) Sachverhalt, (2) Rechtslage mit Citations, (3) konkrete Empfehlung, (4) offene Punkte.",
    expectedTools: [
      "draft_compliance_brief",
      "search_legal_sources",
      "search_cases",
    ],
    estimatedMinutes: 7,
  },
  {
    id: "ndaa-section-1260h-check",
    emoji: "🇺🇸",
    name: "ITAR Flow-Down Klausel-Check",
    description:
      "Prüft Lieferanten-Vertrag auf ITAR-Flow-Down-Klauseln und identifiziert fehlende Pflicht-Provisions (22 CFR 124.8).",
    category: "drafting",
    startingPrompt:
      "Prüfe folgenden Lieferanten-Vertrag auf ITAR-Flow-Down-Klauseln (22 CFR 124.8). Hochgeladene Datei: [fileId]. Nenne fehlende Pflicht-Provisions + Redline-Vorschläge.",
    expectedTools: [
      "find_clauses",
      "summarize_document",
      "classify_export_control",
    ],
    estimatedMinutes: 5,
  },

  /* ─── Document (3) ────────────────────────────────────────────────── */
  {
    id: "document-summary",
    emoji: "📄",
    name: "Dokument zusammenfassen",
    description:
      "Erstellt eine 200-300-Wort-Zusammenfassung eines hochgeladenen Dokuments aus gewählter Perspektive.",
    category: "document",
    startingPrompt:
      "Fasse das hochgeladene Dokument [fileId] zusammen aus der Perspektive [neutral/operator/buyer/regulator]. 200-300 Wörter. Nenne Hauptpunkte + offene Risiken.",
    expectedTools: ["summarize_document", "classify_document"],
    estimatedMinutes: 2,
  },
  {
    id: "contract-comparison",
    emoji: "🔍",
    name: "Vertrags-Vergleich",
    description:
      "Side-by-side Vergleich zweier Verträge entlang einer Dimension (Liability / IP / Termination / etc.) mit Redline-Vorschlägen.",
    category: "document",
    startingPrompt:
      "Vergleiche die Verträge [fileIdA] und [fileIdB] entlang der Dimension [liability/IP/termination/governing_law]. Nenne Diff + Redline-Vorschläge + Risiko-Bewertung.",
    expectedTools: ["compare_documents", "find_clauses"],
    estimatedMinutes: 4,
    isQuickstart: true,
  },

  /* ─── Monitoring (1) ──────────────────────────────────────────────── */
  {
    id: "norm-changes-briefing",
    emoji: "🔔",
    name: "Norm-Änderungen Briefing",
    description:
      "Liste alle Norm-Änderungen einer Jurisdiktion seit Datum X. Mit Validity-Status pro Norm.",
    category: "monitoring",
    startingPrompt:
      "Welche Norm-Änderungen gab es in [Jurisdiktion] in den letzten [N] Tagen? Liste mit Status pro Norm und Auswirkung auf typische Operator-Profile.",
    expectedTools: ["get_recent_norm_changes", "check_article_status"],
    estimatedMinutes: 3,
  },

  /* ── Sprint 9 Vertragsanalyse + Mandat-Briefing Workflows ─────────
     Diese Workflows bündeln häufige Anwalts-Tasks in vorgefertigte
     Prompts. Sie nutzen die existing Tool-Chain (summarize_document,
     find_clauses, compare_documents) ohne neue Server-Code-Pfade. */

  {
    id: "contract-red-flag-analysis",
    name: "Vertrag: Red-Flag-Analyse",
    emoji: "🚩",
    description:
      "Lade einen Vertrag hoch. Atlas analysiert klausel-für-klausel auf Risiken (🔴 Kritisch / 🟡 Achtung / 🟢 Standard) mit Counter-Drafting-Vorschlägen.",
    category: "document",
    isQuickstart: true,
    startingPrompt: `Analysiere den angehängten Vertrag systematisch klausel-für-klausel auf Red Flags aus Sicht meines Mandanten. Strukturiere die Antwort so:

**Zusammenfassung** (2-3 Sätze: Gesamtrisiko-Einschätzung)

**🔴 KRITISCH** (Klauseln die meinem Mandanten erheblichen Schaden zufügen können — hier muss verhandelt werden)

Pro Klausel:
- **Klausel:** [Bezeichnung + ungefährer §/Abschnitt]
- **Risiko:** [Konkretes Problem]
- **Counter-Drafting:** [Vorschlag für Verhandlung]

**🟡 ACHTUNG** (Akzeptabel aber ungewöhnlich — sollte Senior-Anwalt sehen)

[gleiche Struktur]

**🟢 STANDARD** (Marktüblich — kein Handlungsbedarf)

[Kurze Liste]

**Fehlende Klauseln** (Standardklauseln die im Vertrag fehlen)

[Liste mit kurzer Begründung]

Berücksichtige BGB, HGB und (falls anwendbar) jurisdiktion-spezifische Regelungen aus den Atlas-Tools.`,
    expectedTools: [
      "summarize_document",
      "find_clauses",
      "search_legal_sources",
      "check_article_status",
    ],
    estimatedMinutes: 8,
  },
  {
    id: "contract-clause-extraction",
    name: "Vertrag: Klausel-Extraktion",
    emoji: "📋",
    description:
      "Extrahiert alle Standard-Klauseln eines hochgeladenen Vertrags in strukturierter Tabelle (Force Majeure, Haftung, Termination, Datenschutz, etc.).",
    category: "document",
    startingPrompt: `Extrahiere aus dem angehängten Vertrag alle Standard-Klauseln in einer strukturierten Tabelle. Für jede Klausel:

| Klausel-Typ | Wortlaut (Auszug) | Bewertung |
|---|---|---|

Decke mindestens diese Klausel-Typen ab (falls vorhanden):
- Vertragsparteien + Vertragsgegenstand
- Laufzeit / Termination
- Haftung / Haftungsbeschränkung
- Force Majeure
- Datenschutz / DSGVO
- Vertraulichkeit / NDA
- Gerichtsstand / Anwendbares Recht
- Schiedsklausel / Mediation
- Salvatorische Klausel
- Änderungsvorbehalt

Markiere fehlende Standard-Klauseln am Ende mit ⚠️.`,
    expectedTools: ["summarize_document", "find_clauses"],
    estimatedMinutes: 5,
  },
  {
    id: "mandate-briefing-summary",
    name: "Mandats-Briefing: Wo stehen wir?",
    emoji: "📌",
    description:
      "Auto-generierte Zusammenfassung des aktuell aktiven Mandats: bisherige Recherche, offene Fragen, nächste Schritte. Perfekt für Re-Einstieg nach Pause oder Mandant-Update.",
    category: "research",
    isQuickstart: true,
    startingPrompt: `Erstelle ein Mandats-Briefing zum aktuell aktiven Mandat. Strukturiere so:

**Sachverhalt** (2-4 Sätze, basierend auf Custom Instructions + bisherigen Chats des Mandats)

**Bisherige Recherche-Ergebnisse**
[Aufzählung der wichtigsten Erkenntnisse — chronologisch mit Datum]

**Offene Fragen**
[Was wurde in bisherigen Chats aufgeworfen aber nicht abschließend geklärt?]

**Nächste Schritte (Empfehlung)**
[Was sollte als nächstes recherchiert oder gedraftet werden? Konkrete Atlas-Workflows vorschlagen.]

**Hochgeladene Dateien**
[Pro Datei: Name + 1-Satz-Inhaltsangabe]`,
    expectedTools: ["search_legal_sources", "summarize_document"],
    estimatedMinutes: 4,
  },
  {
    id: "client-email-draft",
    name: "Mandanten-Email entwerfen",
    emoji: "✉️",
    description:
      "Wandelt die Antwort eines Chats in eine fertige Mandanten-Email um — höflich, klar strukturiert, Disclaimer am Ende. Direkt copy-paste in den Mail-Client.",
    category: "drafting",
    isQuickstart: true,
    startingPrompt: `Entwirf eine Mandanten-Email mit folgender Struktur:

**An:** [Mandant — Platzhalter [MANDANT_NAME]]
**Von:** [Anwalt — Platzhalter [ANWALT_NAME]]
**Betreff:** [Aussagekräftiger Betreff, max 80 Zeichen]

---

Sehr geehrte/r [MANDANT_NAME],

[Einstieg: 1-2 Sätze Kontext-Bezug]

[Hauptteil: die Erkenntnisse strukturiert + verständlich für einen Nicht-Juristen — Bullet-Points wo sinnvoll, Fachbegriffe in Klammern erklärt]

[Empfehlung / nächste Schritte]

[Höflicher Schluss-Satz mit Rückfragenangebot]

Mit freundlichen Grüßen
[ANWALT_NAME]

---

**Disclaimer:** Diese Email basiert auf einer Atlas-Recherche und ersetzt nicht die abschließende juristische Beurteilung im Einzelfall.

Verwende formelles Sie, aber lesbar für einen kaufmännischen Mandanten ohne Jura-Hintergrund.`,
    expectedTools: ["search_legal_sources", "check_article_status"],
    estimatedMinutes: 3,
  },
  {
    id: "client-memo-formal",
    name: "Internes Memo (formell)",
    emoji: "📝",
    description:
      "Erstellt ein formell strukturiertes Memo zum aktuellen Sachverhalt: Sachverhalt → Rechtsfrage → Würdigung → Ergebnis. Für die Akte oder als Vorlage für ein anwaltliches Gutachten.",
    category: "drafting",
    startingPrompt: `Erstelle ein formelles juristisches Memo nach klassischer Struktur:

**MEMO**
Datum: [heute]
Bearbeitet: [Anwalt]
Mandat: [aus aktivem Mandat]

**1. Sachverhalt**
[Kompakter Sachverhalt — 1 Absatz]

**2. Rechtsfrage**
[Die zu beantwortende Rechtsfrage — präzise formuliert]

**3. Rechtliche Würdigung**

**3.1 Anwendbares Recht**
[Welche Normen / Treaties / Verordnungen sind einschlägig?]

**3.2 Subsumtion**
[Anwendung der Normen auf den Sachverhalt — TBM + Rechtsfolge]

**3.3 Rechtsprechung**
[Falls vorhanden: relevante Urteile mit Quellen]

**4. Ergebnis**
[Klare Antwort auf die Rechtsfrage. Max 3-5 Sätze.]

**5. Empfehlung**
[Konkreter Handlungsvorschlag — was sollte das Mandat als nächstes tun?]

Verwende präzise juristische Sprache. Quellen klar zitieren (Atlas-Pills).`,
    expectedTools: [
      "search_legal_sources",
      "search_cases",
      "check_article_status",
    ],
    estimatedMinutes: 6,
  },

  /* ─── Multi-step pipelines (T1.E, 2026-05-26) ─────────────────────────
   * Sprint 6 reserved `pipeline?: WorkflowStep[]`. T1.E makes it real:
   * the workflow-pipeline-runner.server.ts module executes these steps
   * sequentially as turns of the SAME AtlasChat (chatId carried
   * forward). Each step is a user-prompt; the model's answer becomes
   * context for the next step.
   *
   * Pipelines are opt-in via the future `/api/atlas/workflows/run`
   * route — the existing single-prompt Quickstart cards still launch
   * just the `startingPrompt`. ────────────────────────────────────────── */
  {
    id: "eu-space-act-vollanalyse",
    emoji: "🛰️",
    name: "EU Space Act — Vollanalyse (3 Steps)",
    description:
      "Pipeline-Workflow: (1) Anwendbarkeit klären, (2) Pflichten + Authorities + Fristen ableiten, (3) Mandanten-Memo entwerfen. Drei Turns desselben Chats mit fortlaufendem Context.",
    category: "compliance",
    startingPrompt:
      "Starte die EU-Space-Act-Vollanalyse für meinen Mandanten. Operator-Typ: [SCO/LO/GSO]. Establishment: [eu/third_country_eu_services/third_country_no_eu]. Mitgliedstaat: [DE/FR/IT/LU/...].",
    pipeline: [
      {
        prompt:
          "Schritt 1 — Anwendbarkeit. Klassifiziere den Operator nach EU Space Act und bestimme das anwendbare Regime (Standard / Light). Nenne die einschlägigen Articles + Operator-Module + ggf. Ausnahmen. Quellen als [ATLAS:...]-Pills.",
        expectedTools: ["assess_eu_space_act", "search_legal_sources"],
      },
      {
        prompt:
          "Schritt 2 — Pflichten + Authorities. Welche konkreten Compliance-Pflichten ergeben sich aus der Klassifizierung in Schritt 1? Liste pro Pflicht: (a) zuständige Behörde, (b) Fristen, (c) erforderliche Unterlagen. Strukturiert als Tabelle.",
        expectedTools: [
          "list_jurisdiction_authorities",
          "get_filing_deadlines",
          "search_legal_sources",
        ],
      },
      {
        prompt:
          "Schritt 3 — Mandanten-Memo. Entwirf ein formelles Memo (Sachverhalt → Rechtsfrage → Würdigung → Ergebnis → Empfehlung) auf Basis der Erkenntnisse aus Schritt 1 und 2. Disclaimer + Atlas-Pills am Ende.",
        expectedTools: ["search_legal_sources", "check_article_status"],
      },
    ],
    expectedTools: [
      "assess_eu_space_act",
      "list_jurisdiction_authorities",
      "get_filing_deadlines",
      "search_legal_sources",
    ],
    estimatedMinutes: 12,
  },
  {
    id: "eu-space-act-mit-antrag",
    emoji: "📝",
    name: "EU Space Act — Vollanalyse + Antrag-Entwurf (4 Steps, mit Approval-Gate)",
    description:
      "Wie eu-space-act-vollanalyse, plus Schritt 4: Authorisierungs-Antrag-Entwurf via draft_authorization_application. Schritt 4 erfordert User-Approval (Tool generiert ein vollständiges Behörden-Dokument).",
    category: "compliance",
    startingPrompt:
      "Starte die EU-Space-Act-Vollanalyse + Antrag-Entwurf für meinen Mandanten. Operator-Typ: [SCO/LO/GSO]. Establishment: [eu/third_country_eu_services/third_country_no_eu]. Mitgliedstaat: [DE/FR/IT/LU/...].",
    pipeline: [
      {
        prompt:
          "Schritt 1 — Anwendbarkeit. Klassifiziere den Operator nach EU Space Act und bestimme das anwendbare Regime.",
        expectedTools: ["assess_eu_space_act", "search_legal_sources"],
      },
      {
        prompt: "Schritt 2 — Pflichten + Authorities + Fristen tabellarisch.",
        expectedTools: [
          "list_jurisdiction_authorities",
          "get_filing_deadlines",
        ],
      },
      {
        prompt:
          "Schritt 3 — Sachverhaltszusammenfassung für den Antrag (auf Basis Schritt 1+2).",
        expectedTools: ["search_legal_sources"],
      },
      {
        /* Approval-required step: draft_authorization_application
           generates a binding document for a national authority — the
           pre-flight gate halts here unless `bypassApproval: true`. */
        prompt:
          "Schritt 4 — Antrag-Entwurf. Erstelle den vollständigen Authorisierungs-Antrag für die zuständige Behörde basierend auf Schritt 1-3.",
        expectedTools: ["draft_authorization_application"],
      },
    ],
    expectedTools: [
      "assess_eu_space_act",
      "list_jurisdiction_authorities",
      "get_filing_deadlines",
      "draft_authorization_application",
    ],
    estimatedMinutes: 25,
  },
];

export function listWorkflows(opts?: {
  category?: WorkflowCategory;
  quickstartsOnly?: boolean;
}): Workflow[] {
  let result = [...WORKFLOW_LIBRARY];
  if (opts?.category)
    result = result.filter((w) => w.category === opts.category);
  if (opts?.quickstartsOnly) result = result.filter((w) => w.isQuickstart);
  return result;
}

export function getWorkflowById(id: string): Workflow | undefined {
  return WORKFLOW_LIBRARY.find((w) => w.id === id);
}

export function listCategories(): {
  category: WorkflowCategory;
  count: number;
  label: string;
}[] {
  const labels: Record<WorkflowCategory, string> = {
    compliance: "Compliance",
    drafting: "Drafting",
    comparison: "Vergleich",
    monitoring: "Monitoring",
    document: "Dokument",
    research: "Recherche",
  };
  const counts = new Map<WorkflowCategory, number>();
  for (const w of WORKFLOW_LIBRARY) {
    counts.set(w.category, (counts.get(w.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({
      category,
      count,
      label: labels[category],
    }));
}
