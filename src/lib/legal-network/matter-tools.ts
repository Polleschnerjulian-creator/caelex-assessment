import "server-only";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Matter Tools — Claude-callable functions for Phase 3 data bridge.
 *
 * Each tool definition mirrors an Anthropic SDK Tool schema. The
 * actual execution is in `matter-tool-executor.ts`; this file is
 * just the contract Claude sees (names, descriptions, input schemas).
 *
 * Phase 3a: one tool, `load_compliance_overview`. Claude can request
 * the client-operator's current compliance state (assessments,
 * statuses) scoped by the matter. Every call is gated through
 * `requireActiveMatter` and audit-logged.
 *
 * Future iterations will add: load_authorization_workflow,
 * load_deadlines, search_legal_sources, draft_memo, compare_
 * jurisdictions. Keep additions additive — never break Claude's
 * understanding of an existing tool.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type Anthropic from "@anthropic-ai/sdk";

export const MATTER_TOOLS: Anthropic.Tool[] = [
  {
    name: "load_compliance_overview",
    description: `Loads the CURRENT compliance state of the client operator. Returns counts and summary statuses for the five core assessment types: cybersecurity, NIS2, debris mitigation, insurance, environmental.

Call this when the user asks anything about "how is the client doing", "current status", "what's open", "what's missing", or when drafting a memo that needs grounded facts. Do NOT invent compliance numbers — always load them.

Access is subject to the matter's consented scope on COMPLIANCE_ASSESSMENTS (READ or READ_SUMMARY permission required). If the scope is missing, this tool returns an error; the user should be told their current scope doesn't authorise this, and to request a scope amendment.

Returns a JSON summary — not the raw records. The summary is designed to fit in a single response turn without overwhelming the context window.`,
    input_schema: {
      type: "object",
      properties: {
        detail_level: {
          type: "string",
          enum: ["summary", "full"],
          description:
            "`summary` returns just counts and statuses. `full` adds the top 3 most recent records per assessment type with their key fields. Default summary.",
        },
      },
    },
  },

  {
    name: "search_legal_sources",
    description: `Searches Atlas's curated legal corpus (800+ space-law instruments) via semantic similarity. Use this WHENEVER you need to cite a specific regulation, article, or paragraph — do not invent citations from memory.

Good queries are concept-level: "satellite licensing authority Germany", "re-entry safety obligations EU", "NIS2 incident reporting timelines". Returns the top 5 matches with jurisdiction, title, and relevance score. After picking a match, quote it precisely in your answer; direct users to the source URL so they can read the original text.

This tool does NOT require any scope on the matter — the Atlas corpus is shared across all firms and clients. It's always safe to call.`,
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Concept-level search query in any supported language (EN/DE/FR/ES). 4-200 characters.",
        },
        limit: {
          type: "number",
          description: "Number of matches to return, 1-10. Default 5.",
        },
      },
      required: ["query"],
    },
  },

  {
    name: "draft_memo_to_note",
    description: `Saves the current draft content as a persistent Matter Note. Use this at the end of a conversation when the user has asked you to produce a memo, summary, or draft — you write the content to a note so the lawyer can find it later in the Notes tab.

Do NOT call this unprompted. Only when the user explicitly says "save this", "draft a memo", "write this up", or similar. Confirm the note title with the user before saving if it's ambiguous.

Requires a scope granting ANNOTATE on any category (notes are firm-internal metadata, not client data — the scope check is a consistency guard, not a privacy gate).`,
    input_schema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description:
            "Short descriptive title, 3-200 chars. E.g. 'Memo — FR spectrum licensing timeline'.",
        },
        content: {
          type: "string",
          description:
            "The full memo/note content, Markdown-formatted. Can be up to 100k chars.",
        },
      },
      required: ["title", "content"],
    },
  },
];

/**
 * Tool name lookup — used by the executor to dispatch by name.
 */
export type MatterToolName =
  | "load_compliance_overview"
  | "search_legal_sources"
  | "draft_memo_to_note";

export function isMatterToolName(name: string): name is MatterToolName {
  return MATTER_TOOLS.some((t) => t.name === name);
}
