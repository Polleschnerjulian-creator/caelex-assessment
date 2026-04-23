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
];

/**
 * Tool name lookup — used by the executor to dispatch by name.
 */
export type MatterToolName = "load_compliance_overview";

export function isMatterToolName(name: string): name is MatterToolName {
  return MATTER_TOOLS.some((t) => t.name === name);
}
