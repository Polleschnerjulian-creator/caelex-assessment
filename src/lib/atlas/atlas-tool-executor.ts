import "server-only";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Atlas Tool Executor — runs the workspace-level tools defined in
 * atlas-tools.ts. Distinct from matter-tool-executor (which operates
 * INSIDE a scope-gated mandate) — these run at the firm-member level
 * and route users between matters.
 *
 * Every tool call:
 *   1. Zod-validates input
 *   2. Prisma query scoped to `callerOrgId` as law firm
 *   3. Returns JSON payload Claude will paraphrase + a UI directive
 *      (navigateUrl) the SSE layer forwards to the client
 *
 * No audit log — these are read-only directory lookups over the firm's
 * own matters, not cross-firm data access.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { AtlasToolName } from "./atlas-tools";

// ─── Shared result shape ─────────────────────────────────────────────

export interface AtlasToolResult {
  /** JSON-string payload fed back to Claude as tool_result. */
  content: string;
  /** True on validation / scope failures. */
  isError: boolean;
  /** Optional client navigation directive — the SSE route forwards this
   *  as a `navigate` event, the AIMode client calls router.push(). Only
   *  set on unambiguous single-match 'open' calls. */
  navigateUrl?: string;
}

// ─── find_or_open_matter ─────────────────────────────────────────────

const FindOrOpenMatterInput = z.object({
  query: z.string().min(2).max(100),
  action: z.enum(["search", "open"]),
});

const MATTER_LIMIT = 8;

async function findOrOpenMatter(args: {
  input: unknown;
  callerUserId: string;
  callerOrgId: string;
}): Promise<AtlasToolResult> {
  const parsed = FindOrOpenMatterInput.safeParse(args.input);
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

  // Fuzzy contains on name + reference + client org name. Case-
  // insensitive. We cap at 8 hits — more than that the user should
  // refine anyway.
  const matches = await prisma.legalMatter.findMany({
    where: {
      lawFirmOrgId: args.callerOrgId,
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
    clientName: m.clientOrg.name,
    status: m.status,
    updatedAt: m.updatedAt,
    workspaceUrl: `/atlas/network/${m.id}/workspace`,
    canOpen: m.status === "ACTIVE",
  }));

  // 'open' action + single ACTIVE match → signal navigation
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

// ─── Dispatcher ─────────────────────────────────────────────────────

export async function executeAtlasTool(args: {
  name: AtlasToolName;
  input: unknown;
  callerUserId: string;
  callerOrgId: string;
}): Promise<AtlasToolResult> {
  switch (args.name) {
    case "find_or_open_matter":
      return findOrOpenMatter(args);
    default: {
      const _never: never = args.name;
      return {
        content: JSON.stringify({
          error: `Unknown tool: ${String(_never)}`,
          code: "UNKNOWN_TOOL",
        }),
        isError: true,
      };
    }
  }
}
