/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Sprint C2 — Workflow-Suggester (Smart Sequencing).
 * ────────────────────────────────────────────────────────────────────
 * Given a completed agent-run that was launched from a curated
 * template, return the logically-next templates the lawyer might want
 * to run. Pure look-up over the hand-curated `suggestedNext` graph in
 * `agent-templates.ts` — no LLM call, no DB read.
 *
 * The route emits these as a `suggested_next` SSE event at run-end;
 * the UI renders them as 1-click cards under the artifacts. Click =
 * pre-fill the next template's goal + auto-attach the same mandate +
 * fire a fresh run.
 *
 * Why server-side (rather than just client-side):
 *   - Keeps the template-graph definition in one place (the template
 *     library is server-rendered for SSR).
 *   - Future-proofs for dynamic suggestions (e.g. based on the
 *     verification findings, the mandate's open deadlines, etc.) —
 *     the route can extend the suggestion logic without UI changes.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import {
  AGENT_TEMPLATES,
  getTemplateById,
  type AgentTemplate,
} from "@/lib/atlas/agent-templates";

export interface WorkflowSuggestion {
  templateId: string;
  title: string;
  description: string;
  category: AgentTemplate["category"];
  /// Why this is suggested — short rationale shown in the card.
  /// Generated from the source template's relationship.
  rationale: string;
  /// Forward the same cost/duration hints so the lawyer can budget.
  costBand: AgentTemplate["costBand"];
  estimatedSeconds: number;
  /// Whether the suggested template needs a mandate-context. The UI
  /// can warn or auto-attach if a mandate is already in scope.
  needsMandate: boolean;
  /// Whether the suggested template typically needs a file attachment.
  needsFile: boolean;
}

/* Lawyer-facing rationale per category-pair — short, one line, German.
   Generated from {source-category} → {next-category} relationship. */
function rationaleFor(source: AgentTemplate, next: AgentTemplate): string {
  /* Same-category continuations have generic rationales; cross-
     category ones get a more pointed reason. */
  if (source.category === "compliance" && next.category === "drafting") {
    return "Klassifizierung steht — jetzt den Mandanten briefen.";
  }
  if (source.category === "filing" && next.id === "frist-check-mandat") {
    return "Antrag eingereicht — Fristen für Folge-Aktionen tracken.";
  }
  if (source.category === "filing" && next.id === "mandantenbrief-status") {
    return "Filing abgeschlossen — Mandanten über den Stand informieren.";
  }
  if (source.id === "vertrag-haftungsanalyse") {
    return "Risiken identifiziert — passende Gegenklauseln aus dem eigenen Bestand suchen.";
  }
  if (source.id === "multi-jurisdiction-compare") {
    return "Jurisdiktion gewählt — jetzt das Filing dort starten.";
  }
  if (source.id === "klausel-suche-eigene") {
    return "Klausel gefunden — im konkreten Vertrag auf Haftung prüfen.";
  }
  if (source.id === "frist-check-mandat") {
    return "Fristen bekannt — den Mandanten proaktiv informieren.";
  }
  if (source.category === "internal" && next.category === "drafting") {
    return "Interner Schritt fertig — den Mandanten auf den neuesten Stand bringen.";
  }
  /* Fallback for any uncurated pair. */
  return `Logischer nächster Schritt (${next.category}).`;
}

/**
 * Resolve suggestions for a just-completed run. Returns [] when:
 *   - templateId is null / unknown (run wasn't started from a template)
 *   - the source template has no `suggestedNext` entries
 *   - all suggested IDs resolve to missing templates (data integrity)
 *
 * Pure function — safe to call sync in the route, no I/O.
 */
export function suggestNextWorkflows(
  templateId: string | null,
): WorkflowSuggestion[] {
  if (!templateId) return [];
  const source = getTemplateById(templateId);
  if (!source || !source.suggestedNext || source.suggestedNext.length === 0) {
    return [];
  }
  const out: WorkflowSuggestion[] = [];
  for (const nextId of source.suggestedNext) {
    const next = getTemplateById(nextId);
    if (!next) {
      /* Silent skip — a stale suggestedNext entry pointing at a
         removed template shouldn't break the run-completion event. */
      continue;
    }
    out.push({
      templateId: next.id,
      title: next.title,
      description: next.description,
      category: next.category,
      rationale: rationaleFor(source, next),
      costBand: next.costBand,
      estimatedSeconds: next.estimatedSeconds,
      needsMandate: next.needsMandate === true,
      needsFile: next.needsFile === true,
    });
  }
  return out;
}

/**
 * Inverse lookup — given a template id, find all templates that
 * suggest it as a follow-up. Useful for the history-page "incoming"
 * widget: "this template is suggested after: NIS2-Klassifizierung,
 * Multi-Jurisdiction-Vergleich".
 * Currently unused by the route but exported for the history UI to
 * pick up when it's wired (separate sprint).
 */
export function findPredecessors(templateId: string): AgentTemplate[] {
  return AGENT_TEMPLATES.filter((t) => t.suggestedNext?.includes(templateId));
}
