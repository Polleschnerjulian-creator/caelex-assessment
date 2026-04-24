import "server-only";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
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

export const ATLAS_TOOLS: Anthropic.Tool[] = [
  {
    name: "find_or_open_matter",
    description: `Searches the user's law-firm for matching mandates (matters) by name or reference and either lists candidates or navigates directly into a matter's workspace.

Call this when the user asks to "open a workspace for client XY", "zeig mir den Mandant XY", "search my matters", "finde mein Mandat mit der Ref ATLAS-2025-003", or similar intent-to-switch-context phrases.

Scope:
  - Only matters where the caller's current organisation is the law firm.
  - Only ACTIVE matters are navigable ('open' action). SUSPENDED/REVOKED/CLOSED matters will appear in search results with a status flag but cannot be opened — tell the user why.
  - Search is fuzzy on matter name and reference (case-insensitive contains).

Actions:
  - 'open': Use when the user expresses a direct wish to enter a workspace AND the search is specific enough that you expect a single match. If the lookup finds exactly one active matter, the client will auto-navigate to it. If it finds zero or multiple, the tool returns the candidates so you can disambiguate with the user.
  - 'search': Use when the user wants an overview. Always returns a candidate list; no auto-navigation.

Style after calling:
  - On single-match 'open': briefly confirm (e.g. "Öffne Workspace zu 'Mandant XY'…") — the client handles navigation.
  - On multi-match: list the matches (1. …, 2. …) and ask the user to pick one by number or clarify.
  - On zero matches: suggest creating a new matter via /atlas/network.`,
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "User's free-text description of the matter to find. Typical inputs: client name fragment, matter reference ('ATLAS-2025-003'), or short description. 2-100 characters.",
        },
        action: {
          type: "string",
          enum: ["search", "open"],
          description:
            "'open' auto-navigates on single match; 'search' always lists. When in doubt, use 'open' — a multi-hit still returns the list without navigating.",
        },
      },
      required: ["query", "action"],
    },
  },
];

export type AtlasToolName = "find_or_open_matter";

export function isAtlasToolName(name: string): name is AtlasToolName {
  return ATLAS_TOOLS.some((t) => t.name === name);
}
