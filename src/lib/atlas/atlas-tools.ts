import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas Tools — Claude-callable functions for the generic Atlas AI
 * Mode (/api/atlas/ai-chat). These differ from the matter-scoped tools
 * (matter-tools.ts): those only work inside a specific mandate with
 * consented scope, while these are *workspace-level* — they help users
 * find and open mandates, not read their data.
 *
 * Phase 6a: one tool, `find_or_open_matter`. The client-side SSE
 * handler translates its response into a `navigate` event that pushes
 * the user into the matter workspace.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type Anthropic from "@anthropic-ai/sdk";
import { COMPLIANCE_TOOLS } from "./compliance-tools.server";
import { VALIDITY_TOOLS } from "./validity-tools.server";
import { DOCUMENT_TOOLS } from "./document-tools.server";
import { BRANDING_TOOLS } from "./branding-tools.server";
import { MANDATE_TOOLS } from "./mandate-tools.server";
import { DEADLINES_TOOLS } from "./deadlines-tools.server";
import { TEMPLATES_TOOLS } from "./templates-tools.server";
import { KORPUS_TOOLS } from "./korpus-tools.server";
import { COMPARISON_TOOLS } from "./comparison-tools.server";
import { NETWORK_TOOLS } from "./network-tools.server";
import { DRAFTING_TOOLS } from "./drafting-tools.server";

const CORE_ATLAS_TOOLS: Anthropic.Tool[] = [
  /* Network tools (find_operator_organization, create_matter_invite,
     create_solo_matter) moved to network-tools.server.ts as part of
     Atlas V3 T0.1.e bundle-split (2026-05-26). Resolved at runtime
     via isNetworkToolName() in atlas-tool-executor.ts. */

  /* find_or_open_matter moved to mandate-tools.server.ts as part of
     Atlas V3 T0.1 bundle-split (2026-05-26). Resolved at runtime via
     isMandateToolName() in atlas-tool-executor.ts. */

  // ───────────────────────────────────────────────────────────────────
  // Legal-source navigation tools — added 2026-04 to give Astra explicit
  // ID-routing across the catalogue rather than relying on vector recall
  // for cross-cutting sources (sanctions, standards, ITU, insurance,
  // sectoral, EU programmes). The tools complement library-recall: when
  // the lawyer asks something specific ("show me ITU coordination
  // procedure"), Astra invokes get_legal_source_by_id directly; for
  // open-ended questions Astra still falls back on vector recall over
  // the embedded library.
  // ───────────────────────────────────────────────────────────────────

  /* search_legal_sources, get_legal_source_by_id, list_jurisdiction_authorities,
     search_cases, get_case_by_id moved to korpus-tools.server.ts
     (Atlas V3 T0.1.d bundle-split, 2026-05-26). */

  /* compare_jurisdictions_for_filing + summarize_changes_since moved
     to comparison-tools.server.ts (Atlas V3 T0.1.f bundle-split,
     2026-05-26). Resolved at runtime via isComparisonToolName(). */

  /* get_filing_deadlines moved to deadlines-tools.server.ts as part
     of Atlas V3 T0.1.g bundle-split (2026-05-26). Resolved at
     runtime via isDeadlinesToolName() in atlas-tool-executor.ts. */

  {
    name: "search_mandate_vault",
    description: `Durchsucht die Vault-Files des aktuell angehängten Mandats nach semantischer Ähnlichkeit zur Query (RAG). Nur verfügbar wenn Chat einem Mandat zugewiesen ist — die chat-engine filtert dieses Tool raus wenn kein Mandat attached ist.

Returns up to \`limit\` Treffer (default 5, max 10). Jeder Treffer enthält: \`fileId\` (für Citation-Link), \`filename\`, \`text\` (der relevante Chunk), \`score\` (cosine 0..1), und \`chunkIndex/totalChunks\` für Quellenangabe.

Use cases:
 - "Was steht im Schriftsatz vom 12.3. zur Frequenzkoordination?"
 - "Find die Stelle im BNetzA-Bescheid wo die Widerspruchsfrist genannt wird"
 - "Welche Files erwähnen den Antrag XY?"

Cite sources in your reply with markdown links: \`[Mandats-Datei: filename.pdf](/atlas/mandate/<mandateId>/vault/<fileId>)\`. The chat-view renders these as clickable file references.`,
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Free-text query — was suchst du im Vault? Mind. 3 Zeichen.",
        },
        limit: {
          type: "integer",
          description: "Max number of chunks to return (default 5, max 10).",
          default: 5,
          minimum: 1,
          maximum: 10,
        },
      },
      required: ["query"],
    },
  },

  /* ── Sprint 12 (2026-05-17): Chat-native Document Drafting ───────────
   * 5 tools that turn natural-language requests like "Schreib mir ne
   * Vollmacht für OrbitCo" or "Antrag an BNetzA für Frequenz" into
   * structured document scaffolds the AI uses to compose the actual
   * Word-ready document IN ITS CHAT REPLY.
   *
   * Each tool auto-loads mandate context (parties, jurisdiction,
   * primary authority, custom instructions) when a mandateId is
   * attached to the chat, so the lawyer doesn't have to repeat
   * Mandanten-Daten every time.
   *
   * All draft tools return a SCAFFOLD payload, not a finished
   * document — the AI uses the scaffold + the citations it picked
   * to write the actual prose. Output goes into the chat as Markdown
   * which the lawyer can download via the per-table PDF buttons
   * (existing) or copy-paste into Word.
   *
   * HARD RULE: every draft must include the legal-review disclaimer
   * + the PRIVILEGED & CONFIDENTIAL marker for Schriftsatz / Verträge.
   *
   * The 6 chat-native drafting tools (Schriftsatz/Mandantenbrief/Vertrag/
   * Aktennotiz/refine_document) + the 2 V2 scaffolders (draft_authorization
   * + draft_compliance_brief) all moved to drafting-tools.server.ts as
   * part of Atlas V3 T0.1.h bundle-split (2026-05-26).
   * ─────────────────────────────────────────────────────────────────── */
];

/* Sprint D2 — agent-mode-only orchestration tools. Not used by chat-
   mode (the executor in atlas-tool-executor.ts has no handler; agent
   route special-cases them BEFORE delegating to the executor). The
   model is told about them via the agent system-prompt + the tool
   description below. */
const AGENT_ORCHESTRATION_TOOLS: Anthropic.Tool[] = [
  {
    name: "delegate_subtasks",
    description: `Sprint D2 — Fires K parallel sub-agents (max 4) to do genuinely-parallel work. Each sub-agent is single-completion (NO tool-use): it gets a self-contained prompt + lawyer-context and returns Markdown text. Results come back concatenated as \`## <title>\` sections so you can navigate them.

USE THIS WHEN:
 - "Compare X across N jurisdictions" — fire 1 sub-agent per jurisdiction
 - "Analyse N independent contract sections" — fire 1 sub-agent per section
 - "Recherchiere Argumentation für 3 verschiedene Hypothesen" — fire 1 per hypothesis

DO NOT use for:
 - Sequential dependencies (sub-agent B needs sub-agent A's output) — chain them in your own plan instead
 - Single-task work (just do it inline; delegation has overhead)
 - Anything requiring tool-use (sub-agents have no tools)

Each sub-task prompt MUST be self-contained — embed any mandate context, jurisdiction, or facts the sub-agent needs. Sub-agents see ONLY their own prompt, not your conversation.

Cost: K parallel Claude completions, max 1500 tokens each. Real wall-clock speedup ≈ K× for IO-bound work. Don't dispatch unless you'd genuinely save sequential turns.`,
    input_schema: {
      type: "object",
      properties: {
        subtasks: {
          type: "array",
          description:
            "Array of 1-4 sub-task specs. Each must have non-empty title (max 200 chars) + a self-contained prompt (≥10 chars, max 4000 chars).",
          items: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description:
                  "Short label for the sub-task (e.g. 'Frankreich — Authorisierung', 'Sec 3.2 — Haftungsklausel').",
              },
              prompt: {
                type: "string",
                description:
                  "Self-contained prompt the sub-agent will receive. Embed any context the sub-agent needs — it has no conversation history.",
              },
            },
            required: ["title", "prompt"],
          },
          minItems: 1,
          maxItems: 4,
        },
      },
      required: ["subtasks"],
    },
  },
];

/* Atlas V2 Sprint 3-5 + V3 T0.1: tool bundles merged into the
   canonical ATLAS_TOOLS array so the chat-engine picks them up
   automatically.
   - Sprint 3: 8 compliance tools (compliance-tools.server.ts)
   - Sprint 4: 3 validity tools (validity-tools.server.ts)
   - Sprint 5: 5 document tools (document-tools.server.ts)
   - V3 T0.1: 2 branding tools (branding-tools.server.ts) */
export const ATLAS_TOOLS: Anthropic.Tool[] = [
  ...CORE_ATLAS_TOOLS,
  ...COMPLIANCE_TOOLS,
  ...VALIDITY_TOOLS,
  ...DOCUMENT_TOOLS,
  ...BRANDING_TOOLS,
  ...MANDATE_TOOLS,
  ...DEADLINES_TOOLS,
  ...TEMPLATES_TOOLS,
  ...KORPUS_TOOLS,
  ...COMPARISON_TOOLS,
  ...NETWORK_TOOLS,
  ...DRAFTING_TOOLS,
  /* Sprint D2 — orchestration tools (agent-mode special-case). */
  ...AGENT_ORCHESTRATION_TOOLS,
];

/* Core (Sprint 1) tool-name union. Compliance tool names are matched at
   runtime via isComplianceToolName(); we intentionally don't enumerate
   them in the AtlasToolName literal-union to keep this file stable as
   the compliance-tools file grows. */
export type AtlasToolName =
  /* find_or_open_matter moved to mandate-tools.server.ts
     (Atlas V3 T0.1.b bundle-split). Resolved at runtime. */
  /* find_operator_organization, create_matter_invite, create_solo_matter
     moved to network-tools.server.ts (Atlas V3 T0.1.e bundle-split). */
  /* search_legal_sources, get_legal_source_by_id,
     list_jurisdiction_authorities, search_cases, get_case_by_id moved
     to korpus-tools.server.ts (Atlas V3 T0.1.d bundle-split). */
  /* list_workspace_templates moved to templates-tools.server.ts (T0.1.c). */
  /* draft_authorization_application, draft_compliance_brief, draft_schriftsatz,
     draft_mandantenbrief, draft_vertrag, draft_aktennotiz, refine_document
     all moved to drafting-tools.server.ts (Atlas V3 T0.1.h bundle-split). */
  /* compare_jurisdictions_for_filing + summarize_changes_since moved
     to comparison-tools.server.ts (T0.1.f). */
  /* get_filing_deadlines moved to deadlines-tools.server.ts (T0.1.g). */
  /* Sprint 12 C — letterhead via chat. Now lives in branding-tools.server.ts
     (Atlas V3 T0.1 bundle-split). Names resolved at runtime via
     isBrandingToolName() in atlas-tool-executor.ts, like the
     compliance/validity/document bundles. */
  /* Sprint 12 D — document templates moved to templates-tools.server.ts
     (Atlas V3 T0.1.c bundle-split, 2026-05-26). */
  /* Sprint D2 — agent-mode orchestration. Resolved by the agent
     route's special-case path, NOT by atlas-tool-executor. */
  "delegate_subtasks";

export function isAtlasToolName(name: string): boolean {
  return ATLAS_TOOLS.some((t) => t.name === name);
}
