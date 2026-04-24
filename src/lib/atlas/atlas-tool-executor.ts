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
import {
  createInvite,
  MatterServiceError,
} from "@/lib/legal-network/matter-service";
import { SCOPE_LEVELS, type ScopeLevel } from "@/lib/legal-network/scope";
import { logger } from "@/lib/logger";
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

// ─── find_operator_organization ─────────────────────────────────────
//
// Searches active operator orgs by name/slug fragment. Used by Claude
// to resolve a user-supplied client name into a cuid BEFORE creating
// an invite — never invite a guessed org id.

const FindOperatorOrganizationInput = z.object({
  query: z.string().min(2).max(100),
});

const OPERATOR_LIMIT = 8;

async function findOperatorOrganization(args: {
  input: unknown;
}): Promise<AtlasToolResult> {
  const parsed = FindOperatorOrganizationInput.safeParse(args.input);
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

  const orgs = await prisma.organization.findMany({
    where: {
      isActive: true,
      // Operator or BOTH orgs — you can't invite a pure law firm
      // into a matter on the ATLAS side (it would be same-side).
      orgType: { in: ["OPERATOR", "BOTH"] },
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      orgType: true,
    },
    orderBy: { name: "asc" },
    take: OPERATOR_LIMIT,
  });

  return {
    content: JSON.stringify({
      query: q,
      totalMatches: orgs.length,
      matches: orgs,
    }),
    isError: false,
  };
}

// ─── create_matter_invite ───────────────────────────────────────────
//
// Wraps lib/legal-network/matter-service#createInvite with Atlas-tool
// ergonomics: preview-first flow, scope-level quick-pick, post-create
// navigation signal.

const CreateMatterInviteInput = z.object({
  action: z.enum(["preview", "create"]),
  operator_org_id: z.string().cuid(),
  matter_name: z.string().min(3).max(200),
  reference: z.string().max(50).optional(),
  scope_level: z
    .enum(["advisory", "active_counsel", "full_counsel"])
    .optional()
    .default("active_counsel"),
  duration_months: z.number().int().min(1).max(60).optional().default(12),
});

async function createMatterInviteTool(args: {
  input: unknown;
  callerUserId: string;
  callerOrgId: string;
}): Promise<AtlasToolResult> {
  const parsed = CreateMatterInviteInput.safeParse(args.input);
  if (!parsed.success) {
    return {
      content: JSON.stringify({
        error: "Invalid tool input",
        code: "INVALID_INPUT",
        details: parsed.error.flatten(),
      }),
      isError: true,
    };
  }
  const {
    action,
    operator_org_id,
    matter_name,
    reference,
    scope_level,
    duration_months,
  } = parsed.data;

  // Resolve the operator org to show a meaningful preview/confirmation.
  // Also validates: must be active + operator-typed + not the caller's
  // own org (you can't invite yourself).
  const operator = await prisma.organization.findUnique({
    where: { id: operator_org_id },
    select: { id: true, name: true, slug: true, orgType: true, isActive: true },
  });

  if (!operator) {
    return {
      content: JSON.stringify({
        error: "Operator not found",
        code: "OPERATOR_NOT_FOUND",
      }),
      isError: true,
    };
  }
  if (!operator.isActive) {
    return {
      content: JSON.stringify({
        error: `Operator ${operator.name} is inactive`,
        code: "OPERATOR_INACTIVE",
      }),
      isError: true,
    };
  }
  if (operator.orgType === "LAW_FIRM") {
    return {
      content: JSON.stringify({
        error: `${operator.name} is a law firm, not an operator — cannot invite as client`,
        code: "WRONG_ORG_TYPE",
      }),
      isError: true,
    };
  }
  if (operator.id === args.callerOrgId) {
    return {
      content: JSON.stringify({
        error: "Cannot invite your own organisation",
        code: "SELF_INVITE",
      }),
      isError: true,
    };
  }

  const proposedScope = SCOPE_LEVELS[scope_level as ScopeLevel];

  // Preview: return what WOULD happen, no side effects.
  if (action === "preview") {
    return {
      content: JSON.stringify({
        action: "preview",
        summary: {
          operator_name: operator.name,
          operator_id: operator.id,
          matter_name,
          reference: reference ?? null,
          scope_level,
          scope_categories: proposedScope.map((s) => s.category),
          scope_permission_count: proposedScope.reduce(
            (sum, s) => sum + s.permissions.length,
            0,
          ),
          duration_months,
        },
        confirmation_required:
          "Der User muss explizit bestätigen ('ja schicken', 'bestätigt', 'go') bevor du mit action='create' aufrufen darfst.",
      }),
      isError: false,
    };
  }

  // Create: actually persist + send.
  try {
    const result = await createInvite({
      initiatorOrgId: args.callerOrgId,
      initiatorUserId: args.callerUserId,
      initiatorSide: "ATLAS",
      counterpartyOrgId: operator.id,
      name: matter_name,
      reference,
      proposedScope,
      proposedDurationMonths: duration_months,
    });

    // NOTE: Email dispatch lives in the /api/network/invite route,
    // not the service. Fire it best-effort so Claude-initiated invites
    // still email the operator. Log failures but don't surface them —
    // the matter is created either way, so the UX priority is getting
    // the lawyer into the workspace.
    void dispatchInviteEmailBestEffort({
      matterId: result.matter.id,
      rawToken: result.rawToken,
      callerOrgId: args.callerOrgId,
      callerUserId: args.callerUserId,
      operatorOrgId: operator.id,
      matterName: matter_name,
      matterReference: reference,
      proposedScope,
      expiresAt: result.invitation.expiresAt,
    });

    return {
      content: JSON.stringify({
        action: "create",
        matterId: result.matter.id,
        invitationId: result.invitation.id,
        expiresAt: result.invitation.expiresAt,
        operator_name: operator.name,
        message: `Einladung an ${operator.name} erstellt. Workspace öffnet sich automatisch.`,
      }),
      isError: false,
      navigateUrl: `/atlas/network/${result.matter.id}/workspace`,
    };
  } catch (err) {
    if (err instanceof MatterServiceError) {
      return {
        content: JSON.stringify({
          error: err.message,
          code: err.code,
        }),
        isError: true,
      };
    }
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Atlas create_matter_invite failed: ${msg}`);
    return {
      content: JSON.stringify({
        error: "Invite creation failed",
        code: "SERVICE_ERROR",
      }),
      isError: true,
    };
  }
}

// ─── Email dispatch — fire-and-forget ────────────────────────────────
//
// Duplicated logic from /api/network/invite because the service layer
// deliberately doesn't know about email. We could pull this into the
// service in a future refactor, but for now mirror the route's
// best-effort pattern exactly so the dispatch semantics are identical.

async function dispatchInviteEmailBestEffort(input: {
  matterId: string;
  rawToken: string;
  callerOrgId: string;
  callerUserId: string;
  operatorOrgId: string;
  matterName: string;
  matterReference?: string;
  proposedScope: Array<{ category: string; permissions: string[] }>;
  expiresAt: Date;
}): Promise<void> {
  try {
    const { sendEmail } = await import("@/lib/email");
    const { renderLegalMatterInviteEmail } =
      await import("@/lib/email/legal-matter-invite");

    const [callerOrg, callerUser, operatorOwner] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: input.callerOrgId },
        select: { name: true },
      }),
      prisma.user.findUnique({
        where: { id: input.callerUserId },
        select: { name: true, email: true },
      }),
      prisma.organizationMember.findFirst({
        where: { organizationId: input.operatorOrgId, role: "OWNER" },
        include: {
          user: { select: { email: true } },
          organization: { select: { name: true } },
        },
        orderBy: { joinedAt: "asc" },
      }),
    ]);

    const recipient = operatorOwner?.user?.email
      ? {
          email: operatorOwner.user.email,
          orgName: operatorOwner.organization.name,
        }
      : null;

    if (!recipient) {
      logger.warn(
        `Atlas invite email: no OWNER email for operator ${input.operatorOrgId}`,
      );
      return;
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ??
      "https://www.caelex.eu";
    const acceptUrl = `${baseUrl}/network/accept/${input.rawToken}`;
    const expiresInHours = Math.max(
      1,
      Math.floor((input.expiresAt.getTime() - Date.now()) / (60 * 60 * 1000)),
    );
    const scopeSummary =
      input.proposedScope
        .map((s) => {
          const cat = s.category.toLowerCase().replace(/_/g, " ");
          return `${cat} (${s.permissions.join("/")})`;
        })
        .join(" · ") || "Minimaler Scope";

    const { subject, html, text } = renderLegalMatterInviteEmail({
      inviterOrgName: callerOrg?.name ?? "Atlas",
      inviterName: callerUser?.name ?? callerUser?.email ?? "Ein Atlas-User",
      recipientOrgName: recipient.orgName,
      matterName: input.matterName,
      matterReference: input.matterReference ?? null,
      scopeSummary,
      acceptUrl,
      expiresInHours,
      direction: "ATLAS_INVITES_CAELEX",
    });

    await sendEmail({
      to: recipient.email,
      subject,
      html,
      text,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Atlas invite email dispatch failed: ${msg}`);
  }
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
    case "find_operator_organization":
      return findOperatorOrganization(args);
    case "create_matter_invite":
      return createMatterInviteTool(args);
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
