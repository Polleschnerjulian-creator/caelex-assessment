/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Sprint B1 — Approval-Policy (Interactive Pauses).
 * ────────────────────────────────────────────────────────────────────
 * Determines whether a given tool requires lawyer approval before
 * execution in agent-mode. Used by the agent route to insert a pause-
 * point ahead of any tool whose name matches a "dangerous prefix"
 * allowlist.
 *
 * Why a prefix-list (not a per-tool flag):
 *   - Naming convention in Atlas already segregates side-effects:
 *     `create_*`, `send_*`, `schedule_*`, `finalize_*` produce
 *     permanent / outbound / scheduled / finalised artefacts.
 *   - Read-only (`search_*`, `get_*`, `list_*`) and in-memory drafts
 *     (`draft_*`, `compare_*`, `summarize_*`) are reversible — no
 *     approval needed.
 *   - Any NEW tool added under one of the dangerous prefixes is
 *     automatically gated; no per-tool wiring required.
 *
 * Pure module — no I/O. Importable from anywhere in the agent stack.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

/* The four "dangerous-prefix" buckets. Order doesn't matter; matched
   via `startsWith`. Keep this list tight — every entry is an extra
   pause-point in the lawyer's workflow, which compounds friction. */
const DANGEROUS_PREFIXES = [
  "create_",
  "send_",
  "schedule_",
  "finalize_",
  // H2 (2026-05): persistent org-level writes + sub-agent fan-out were
  // flagged requiresApproval in tool-metadata but slipped past the gate
  // because they don't match the four prefixes above. set_org_branding /
  // save_document_template mutate firm-wide settings; delegate_subtasks
  // spawns parallel sub-agents. Reversible drafts (draft_*/refine_*)
  // deliberately stay OUT — they're in-memory artefacts the lawyer reads.
  "set_",
  "save_",
  "delegate_",
] as const;

/** True when the tool requires an explicit lawyer-approval gate. */
export function requiresApproval(toolName: string): boolean {
  return DANGEROUS_PREFIXES.some((p) => toolName.startsWith(p));
}

/**
 * One-line rationale shown in the UI next to the approval prompt.
 * Aimed at the lawyer ("WHY am I being asked to approve this?"),
 * not the model. German output — Atlas surface language.
 */
export function approvalRationale(toolName: string): string {
  if (toolName.startsWith("create_")) {
    return "Erzeugt einen permanenten Datensatz.";
  }
  if (toolName.startsWith("send_")) {
    return "Versendet eine Nachricht / Kommunikation.";
  }
  if (toolName.startsWith("schedule_")) {
    return "Trägt einen Termin / eine Frist in den Kalender ein.";
  }
  if (toolName.startsWith("finalize_")) {
    return "Finalisiert ein Dokument / einen Schriftsatz.";
  }
  if (toolName.startsWith("set_") || toolName.startsWith("save_")) {
    return "Ändert dauerhafte Kanzlei-/Organisations-Einstellungen.";
  }
  if (toolName.startsWith("delegate_")) {
    return "Startet mehrere autonome Sub-Agenten (zusätzliche Kosten).";
  }
  return "Schritt mit Side-Effects — Anwalt-Freigabe erforderlich.";
}

/* Audit-trail shape for approvalGates JSON column on AtlasAgentRun.
   Exported as a type-alias so the route + /approve endpoint + UI all
   share one canonical shape. `decision === null` = pending; once the
   lawyer decides, decision moves to approved | rejected | modified
   and decidedAt is set. */
export interface ApprovalGate {
  toolUseId: string;
  toolName: string;
  /// The tool input the agent originally requested. Persisted even
  /// when the lawyer chose "modified" so the audit trail shows the
  /// before/after delta.
  originalInput: Record<string, unknown>;
  /// One of "approved" | "rejected" | "modified" once decided;
  /// null while the run is paused awaiting input.
  decision: "approved" | "rejected" | "modified" | null;
  /// Only present when decision === "modified" — the lawyer-edited
  /// input that actually gets passed to the tool.
  modifiedInput?: Record<string, unknown>;
  /// Lawyer-facing reason ("Erzeugt einen permanenten Datensatz.")
  /// captured at pause-time for replay in history view.
  rationale: string;
  /// ISO-string when the pause was emitted (server-side wall-clock).
  requestedAt: string;
  /// ISO-string when the lawyer's decision was POSTed; null while
  /// pending.
  decidedAt: string | null;
}
