import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V3 — Mandate Tools (T0.1.b bundle-split, 2026-05-26).
 *
 * Currently one tool: `find_or_open_matter` — fuzzy search the
 * caller's law-firm matters by name / reference / client-org name,
 * with optional navigation hint when an unambiguous single ACTIVE
 * match is found via action="open".
 *
 * Future home for `search_mandate_vault` (currently special-cased
 * in atlas-tool-executor.ts because it pre-dates the bundle-pattern;
 * see T0.1.i in docs/ATLAS-V3-MASTER-PLAN.md).
 *
 * Extracted from `atlas-tool-executor.ts` as part of T0.1 (see
 * docs/ATLAS-V3-MASTER-PLAN.md § 4). Follows the same shape as
 * compliance-tools.server.ts / branding-tools.server.ts:
 *   - export `MANDATE_TOOLS: Anthropic.Tool[]` for ATLAS_TOOLS
 *     aggregation
 *   - export `isMandateToolName()` runtime guard for the dispatcher
 *   - export `executeMandateTool()` the bundle entry-point
 *
 * Result-type carries optional `navigateUrl` — the chat-engine's
 * SSE layer forwards it as a `navigate` client event when present.
 * Other bundles don't surface navigation hints; this is the
 * mandate-bundle's privilege.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

/* ── Result type ────────────────────────────────────────────────────── */

export interface MandateToolResult {
  /** JSON-string payload fed back to Claude as tool_result. */
  content: string;
  /** True on validation / scope failures. */
  isError: boolean;
  /** Optional client navigation directive — the SSE route forwards
   *  this as a `navigate` event when present. Only set on
   *  unambiguous single-match 'open' calls. */
  navigateUrl?: string;
}

/* ── Tool definitions ───────────────────────────────────────────────── */

export const MANDATE_TOOLS: Anthropic.Tool[] = [
  {
    name: "find_or_open_matter",
    description: `Searches the user's law-firm for matching mandates (matters) by name or reference and either lists candidates or navigates directly into a matter's workspace.

Two actions:
- action="search": returns ranked candidates. Use when the lawyer wants to compare or hasn't fully specified.
- action="open": when paired with a single unambiguous ACTIVE match, signals client-side navigation to the matter workspace. Use when the lawyer says "open mandate X" / "switch to mandate Y" with high confidence.

Fuzzy contains on name + reference + client-org name. Case-insensitive. Capped at 8 results — recommend the lawyer refine if more.`,
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Free-text matter query: name fragment ('Spire Authorization'), reference ('M-2026-014'), or client-org name ('Spire Global').",
        },
        action: {
          type: "string",
          enum: ["search", "open"],
          description:
            "search = return candidates; open = navigate into the matter when unambiguous single ACTIVE match.",
        },
      },
      required: ["query", "action"],
    },
  },
];

const MANDATE_TOOL_NAMES = MANDATE_TOOLS.map((t) => t.name) as string[];

/** Runtime guard for the dispatcher in atlas-tool-executor.ts. */
export function isMandateToolName(name: string): boolean {
  return MANDATE_TOOL_NAMES.includes(name);
}

/* ── Tool execution ─────────────────────────────────────────────────── */

const FindOrOpenMatterInput = z.object({
  query: z.string().min(2).max(100),
  action: z.enum(["search", "open"]),
});

const MATTER_LIMIT = 8;

async function findOrOpenMatter(
  input: unknown,
  callerOrgId: string,
): Promise<MandateToolResult> {
  const parsed = FindOrOpenMatterInput.safeParse(input);
  if (!parsed.success) {
    return {
      content: JSON.stringify({
        error: "Invalid tool input",
        code: "INVALID_INPUT",
      }),
      isError: true,
    };
  }

  const q = parsed.data.query.trim();

  /* Fuzzy contains on name + reference + client org name. Case-
     insensitive. We cap at MATTER_LIMIT hits — more than that the
     user should refine anyway. */
  const matches = await prisma.legalMatter.findMany({
    where: {
      lawFirmOrgId: callerOrgId,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { reference: { contains: q, mode: "insensitive" } },
        {
          clientOrg: {
            name: { contains: q, mode: "insensitive" },
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      reference: true,
      status: true,
      updatedAt: true,
      clientOrg: { select: { id: true, name: true } },
    },
    orderBy: [
      { status: "asc" }, // ACTIVE comes before SUSPENDED alphabetically
      { updatedAt: "desc" },
    ],
    take: MATTER_LIMIT,
  });

  const candidates = matches.map((m) => ({
    id: m.id,
    name: m.name,
    reference: m.reference,
    /* AUDIT-FIX 2026-05-17: clientOrg is nullable (solo-matters have no
       linked operator org since create_solo_matter shipped). Previously
       `m.clientOrg.name` crashed with TypeError on null. Fall back to
       null so the agent can read it as "no client-org linked". */
    clientName: m.clientOrg?.name ?? null,
    status: m.status,
    updatedAt: m.updatedAt,
    workspaceUrl: `/atlas/network/${m.id}/workspace`,
    canOpen: m.status === "ACTIVE",
  }));

  /* 'open' action + single ACTIVE match → signal navigation. */
  const activeMatches = candidates.filter((c) => c.canOpen);
  const shouldNavigate =
    parsed.data.action === "open" && activeMatches.length === 1;

  return {
    content: JSON.stringify({
      query: q,
      action: parsed.data.action,
      totalMatches: candidates.length,
      activeMatches: activeMatches.length,
      matches: candidates,
      navigate: shouldNavigate ? activeMatches[0].workspaceUrl : null,
    }),
    isError: false,
    navigateUrl: shouldNavigate ? activeMatches[0].workspaceUrl : undefined,
  };
}

/** Bundle entry-point. Dispatches by tool-name to the appropriate handler. */
export async function executeMandateTool(args: {
  name: string;
  input: unknown;
  callerOrgId: string;
}): Promise<MandateToolResult> {
  switch (args.name) {
    case "find_or_open_matter":
      return findOrOpenMatter(args.input, args.callerOrgId);
    default:
      return {
        content: JSON.stringify({
          error: `Unknown mandate tool: ${args.name}`,
        }),
        isError: true,
      };
  }
}
