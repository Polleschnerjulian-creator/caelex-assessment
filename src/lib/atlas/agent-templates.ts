/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Agent-Templates / Workflow-Bibliothek.
 *
 * Curated 1-Click-Workflows for the Agent-Mode. Each template is a
 * pre-tuned goal that the lawyer can run directly OR adapt before
 * running. Categories group the workflows by lawyer-task-type.
 *
 * Why curated templates: empty Goal-Input is a blank-page-fear UX.
 * Templates seed the lawyer's mental model ("Atlas can do THESE
 * things"), drastically reduce time-to-first-run, and are demo-gold
 * for investor / mandant presentations.
 *
 * Each template is intentionally tight — one specific outcome, not a
 * vague "do everything legal". The lawyer can always edit the goal
 * in the textarea before submitting.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export type TemplateCategory =
  | "compliance"
  | "drafting"
  | "research"
  | "filing"
  | "transaction"
  | "internal";

export interface AgentTemplate {
  id: string;
  category: TemplateCategory;
  /** Short title shown on the card. */
  title: string;
  /** 1-2 sentence description shown below the title. */
  description: string;
  /** The actual goal text that gets pre-filled when the user clicks
   *  the template. The lawyer can edit it before submitting. */
  goal: string;
  /** Whether this template benefits from a mandate-context being
   *  selected before running (most do). */
  needsMandate?: boolean;
  /** Whether this template typically needs a file-attachment (e.g.
   *  Bescheid for Widerspruch-Draft). Surfaces a UX hint. */
  needsFile?: boolean;
  /** Estimated cost band for the lawyer's mental budget. */
  costBand: "low" | "medium" | "high";
  /** Estimated duration in seconds. */
  estimatedSeconds: number;
  /**
   * Sprint C2 — Smart Sequencing. IDs of templates that logically
   * follow THIS one. Atlas suggests them as 1-click follow-ups in
   * the agent-run UI once this template completes. The relationship
   * is hand-curated (not learned) — the lawyer-author of the template
   * encodes the typical pipeline.
   *
   * Example: "nis2-classification" → "mandantenbrief-status" because
   * after classifying the mandant, the natural next step is a status
   * brief to the client. Or "bnetza-filing-pack" → "frist-check-mandat"
   * because filings come with deadlines that need tracking.
   *
   * Empty array / undefined = template is a terminal node (no obvious
   * next step suggested).
   */
  suggestedNext?: string[];
}

export const AGENT_TEMPLATES: AgentTemplate[] = [
  /* ── Compliance ─────────────────────────────────────────────────── */
  {
    id: "nis2-classification",
    category: "compliance",
    title: "NIS2-Klassifizierung + Compliance-Brief",
    description:
      "Klassifiziere den Mandanten (essential / important / out-of-scope), recherchiere die anwendbaren Pflichten aus Art. 21 / 23, drafte den Compliance-Brief mit Fristen.",
    goal: "Erstelle eine NIS2-Klassifizierung für meinen Mandanten anhand der hinterlegten Operator-Profil-Daten. Klassifiziere als essential / important / out-of-scope, recherchiere die einschlägigen Pflichten aus NIS2 Art. 21 (Risikomanagement) und Art. 23 (Meldepflichten), und drafte einen Compliance-Brief mit konkreter Roadmap + allen Transpositionsfristen.",
    needsMandate: true,
    costBand: "medium",
    estimatedSeconds: 75,
    suggestedNext: ["mandantenbrief-status", "frist-check-mandat"],
  },
  {
    id: "itar-ear-classification",
    category: "compliance",
    title: "ITAR / EAR Komponenten-Klassifikation",
    description:
      "Prüfe ob die genannten Komponenten unter ITAR (USML) oder EAR (CCL) fallen, identifiziere ECCN-Klassifizierung und nenne den maßgeblichen Genehmigungsweg.",
    goal: "Klassifiziere die folgenden Komponenten nach ITAR (USML) und EAR (CCL): [Komponenten-Liste]. Nenne pro Komponente: ECCN-Klassifizierung, anwendbare Kontrollkategorie, erforderliche Lizenz (DSP-5 / TAA / EAR99 / etc.), Re-Export-Beschränkungen, und maßgebliche Behörde (DDTC / BIS).",
    costBand: "medium",
    estimatedSeconds: 90,
    suggestedNext: ["mandantenbrief-status"],
  },
  {
    id: "copuos-debris-mitigation",
    category: "compliance",
    title: "COPUOS / IADC Debris-Mitigation-Check",
    description:
      "Bewerte die Mission gegen die COPUOS Space Debris Mitigation Guidelines + IADC-Standards (25-year-rule, post-mission disposal, fragmentation prevention).",
    goal: "Bewerte die Debris-Mitigation-Conformität meiner Mission gegen die COPUOS Space Debris Mitigation Guidelines + IADC-Standards. Prüfe insbesondere: 25-year-rule (LEO post-mission disposal), graveyard-orbit-Anforderungen für GEO, Fragmentation-Prevention (Passivierung), Collision-Avoidance-Pflichten. Liefere eine Conformity-Matrix + Empfehlungen.",
    needsMandate: true,
    costBand: "medium",
    estimatedSeconds: 90,
    suggestedNext: ["esa-license-application", "mandantenbrief-status"],
  },

  /* ── Filing / Authorisation ─────────────────────────────────────── */
  {
    id: "bnetza-filing-pack",
    category: "filing",
    title: "BNetzA-Frequenzanmelde-Pack",
    description:
      "Komplettes Antrags-Pack für eine BNetzA-Frequenzanmeldung: Antragsformular-Inhalte, Begleitschreiben, Fristen, Gebühren-Schätzung.",
    goal: "Erstelle ein vollständiges Antrags-Pack für die BNetzA-Frequenzanmeldung meiner Mission. Inkludiere: ausgefüllte Antragsformular-Inhalte (alle relevanten Felder), Begleitschreiben mit Begründung der Frequenzauswahl, Liste aller einzureichenden Anlagen, Anmeldegebühren-Schätzung, und Anmeldefrist relativ zum Launch-Datum. Reference das TKG + die FrequenzVerordnung.",
    needsMandate: true,
    costBand: "high",
    estimatedSeconds: 120,
    suggestedNext: ["frist-check-mandat", "mandantenbrief-status"],
  },
  {
    id: "esa-license-application",
    category: "filing",
    title: "EU Space Act Authorisierung — Antrag",
    description:
      "Drafte den Authorisierungsantrag nach EU Space Act für den Operator inkl. Risikoanalyse, Insurance-Nachweis, Debris-Plan.",
    goal: "Drafte den Authorisierungsantrag nach EU Space Act für meinen Mandanten. Inkludiere alle nach Art. 8-12 erforderlichen Bestandteile: Operator-Identifikation, Mission-Description, Risikoanalyse-Outline, Insurance-Coverage-Nachweis (mind. Liability-Cap), Debris-Mitigation-Plan, Cybersecurity-Maßnahmen. Nenne die Behörde + Frist.",
    needsMandate: true,
    costBand: "high",
    estimatedSeconds: 150,
    suggestedNext: ["frist-check-mandat", "mandantenbrief-status"],
  },
  {
    id: "widerspruch-bescheid",
    category: "filing",
    title: "Widerspruch gegen Behörden-Bescheid",
    description:
      "Drafte einen rechtssicheren Widerspruch gegen einen ablehnenden Bescheid mit Anhörungsrüge-Begründung + Fristen.",
    goal: "Drafte einen Widerspruch gegen den im Anhang befindlichen Behörden-Bescheid. Inkludiere: korrekte Empfänger-Adresse, Bescheid-Identifikation, materielle Gegen-Argumentation gegen jeden Ablehnungs-Grund, hilfsweise Anhörungsrüge nach §28 VwVfG, Antrag auf Aufhebung. Trag die Widerspruchsfrist in den Mandat-Kalender ein. Privileged & Confidential Stempel ist Pflicht.",
    needsMandate: true,
    needsFile: true,
    costBand: "high",
    estimatedSeconds: 120,
    suggestedNext: ["frist-check-mandat", "mandantenbrief-status"],
  },

  /* ── Drafting ───────────────────────────────────────────────────── */
  {
    id: "mandantenbrief-status",
    category: "drafting",
    title: "Mandanten-Status-Brief",
    description:
      "Knapper, höflich-bestimmter Mandantenbrief mit aktuellem Verfahrens-Stand + nächsten Schritten + Honorar-Hinweisen.",
    goal: "Drafte einen knappen Mandantenbrief (3-4 Absätze) mit dem aktuellen Stand des Verfahrens basierend auf den hinterlegten Mandat-Notizen + Chats. Inkludiere: was wurde getan, was steht offen, nächste Aktionspunkte vom Mandanten, voraussichtliches Honorar-Volumen für den nächsten Quartal. Höflich-bestimmt, kein Marketing-Ton.",
    needsMandate: true,
    costBand: "low",
    estimatedSeconds: 45,
    suggestedNext: ["frist-check-mandat"],
  },
  {
    id: "vertrag-haftungsanalyse",
    category: "drafting",
    title: "Vertrag — Haftungsklauseln-Analyse",
    description:
      "Analysiere die Haftungs- und Garantieklauseln im hochgeladenen Vertrag, identifiziere Mandanten-Risiken, schlage Gegenpositionen vor.",
    goal: "Analysiere den im Anhang befindlichen Vertrag mit Fokus auf Haftungs-, Gewährleistungs-, und Freistellungsklauseln. Pro Klausel: was steht drin, welches Risiko trifft den Mandanten, welche Gegenposition wäre marktüblich. Schließe mit einem Verhandlungs-Memo (max 1 Seite, 5 Top-Punkte zur Nachverhandlung).",
    needsFile: true,
    costBand: "medium",
    estimatedSeconds: 90,
    suggestedNext: ["klausel-suche-eigene"],
  },

  /* ── Research ───────────────────────────────────────────────────── */
  {
    id: "multi-jurisdiction-compare",
    category: "research",
    title: "Multi-Jurisdiktion-Vergleich (DE/FR/UK/IT/LU)",
    description:
      "Tabellarischer Vergleich der Authorisierungs-Regimes für Satellitenbetreiber in 5 EU-Jurisdiktionen + Empfehlung.",
    goal: "Vergleiche die Authorisierungs-Verfahren für Satellitenbetreiber in DE, FR, UK, IT, LU. Pro Jurisdiktion: zuständige Behörde, anwendbares Gesetz, Verfahrensdauer (Median), Anmeldegebühren, Liability-Cap, Insurance-Minimum, Debris-Compliance-Standard, Spektrum-Coordinator. Liefere eine Decision-Matrix mit Empfehlung welche Jurisdiktion für meinen LEO-Constellation-Use-Case am vorteilhaftesten ist.",
    costBand: "high",
    estimatedSeconds: 150,
    suggestedNext: ["esa-license-application", "bnetza-filing-pack"],
  },
  {
    id: "klausel-suche-eigene",
    category: "research",
    title: "Klausel-Suche in eigenen Schriftsätzen",
    description:
      "Durchsuche die Kanzlei-Klausel-Bibliothek nach passenden Klauseln für ein gegebenes Vertragsthema.",
    goal: "Durchsuche meine Klausel-Bibliothek nach Klauseln zum Thema [Thema beschreiben — z.B. 'Schiedsklausel ICC mit Sitz in Genf', 'Liability-Cap mit Carve-Outs', 'IP-Übertragung bei Software-Customization']. Liefere die top 3-5 Klauseln mit kurzer Bewertung pro Klausel (Stärke, Schwäche, Anpassungs-Vorschlag).",
    costBand: "low",
    estimatedSeconds: 45,
    suggestedNext: ["vertrag-haftungsanalyse"],
  },

  /* ── Internal / Kanzlei-Operations ──────────────────────────────── */
  {
    id: "frist-check-mandat",
    category: "internal",
    title: "Frist-Check für Mandat",
    description:
      "Liste alle offenen Fristen im Mandat (Behörden + Mandanten + intern), priorisiere nach Dringlichkeit + Risiko, schlage nächste Aktionen vor.",
    goal: "Erstelle einen Frist-Check für mein aktives Mandat. Liste alle offenen Fristen (Behörden-Fristen, Mandanten-Termine, interne Deadlines) mit Datum, Verantwortlichem, Risiko-Bewertung. Sortiere nach Dringlichkeit. Pro Frist: was muss bis dahin getan werden, was passiert wenn versäumt. Schließe mit einer Top-3-Action-List für diese Woche.",
    needsMandate: true,
    costBand: "low",
    estimatedSeconds: 45,
    suggestedNext: ["mandantenbrief-status"],
  },
  {
    id: "data-room-vorbereitung",
    category: "internal",
    title: "Data-Room-Vorbereitung",
    description:
      "Indexiere alle Mandant-Files, erstelle FAQ-Liste mit erwarteten Investor-Fragen + vorbereiteten Antworten basierend auf Vault-Inhalten.",
    goal: "Bereite einen Data-Room für eine kommende Due Diligence vor. Schritt 1: Indexiere alle Mandant-Files im Vault nach Kategorien (Corporate, IP, Finanz, Verträge, Compliance, Mitarbeiter). Schritt 2: Erstelle eine FAQ-Liste mit den 10-15 häufigsten Investor-Fragen + jeweils einer vorbereiteten Antwort basierend auf den Vault-Inhalten + identifiziere Lücken (was fehlt im Vault, das angefordert werden müsste).",
    needsMandate: true,
    costBand: "high",
    estimatedSeconds: 180,
    suggestedNext: ["mandantenbrief-status"],
  },
];

export const TEMPLATE_CATEGORIES: {
  id: TemplateCategory;
  label: string;
  description: string;
}[] = [
  {
    id: "compliance",
    label: "Compliance",
    description: "Klassifikationen + Compliance-Briefs",
  },
  {
    id: "filing",
    label: "Filing / Authorisierung",
    description: "Behörden-Anträge + Bescheid-Antworten",
  },
  {
    id: "drafting",
    label: "Drafting",
    description: "Schriftsätze + Mandanten-Korrespondenz",
  },
  {
    id: "research",
    label: "Research",
    description: "Mehrjurisdiktionelle + tiefen-Recherchen",
  },
  {
    id: "transaction",
    label: "Transaktion",
    description: "M&A + Asset-Deals + Joint Ventures",
  },
  {
    id: "internal",
    label: "Kanzlei-intern",
    description: "Frist-Checks + Data-Room + Operations",
  },
];

export function getTemplateById(id: string): AgentTemplate | null {
  return AGENT_TEMPLATES.find((t) => t.id === id) ?? null;
}

export function getTemplatesByCategory(
  category: TemplateCategory,
): AgentTemplate[] {
  return AGENT_TEMPLATES.filter((t) => t.category === category);
}
