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
