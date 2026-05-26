import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V3 — Network Tools (T0.1.e bundle-split, 2026-05-26).
 *
 * Three tools covering the Caelex Network (operator-org directory +
 * bilateral matter invitations + solo-matter creation):
 *   - find_operator_organization (lookup by name/slug fragment)
 *   - create_matter_invite (preview-then-create, sends invite email)
 *   - create_solo_matter (lawyer-side-only mandate, no operator handshake)
 *
 * Both create_* tools return `navigateUrl` so the SSE layer can
 * route the client into the new matter workspace.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { encryptAtlasField, decryptAtlasField } from "./atlas-encryption";
import { SCOPE_LEVELS, type ScopeLevel } from "@/lib/legal-network/scope";
import {
  createInvite,
  MatterServiceError,
} from "@/lib/legal-network/matter-service";

/* ── Result type ────────────────────────────────────────────────────── */

export interface NetworkToolResult {
  content: string;
  isError: boolean;
  /** create_* tools return this so the chat-engine emits a `navigate`
   *  SSE event for client-side routing into the new workspace. */
  navigateUrl?: string;
}

/* ── Tool definitions ───────────────────────────────────────────────── */

export const NETWORK_TOOLS: Anthropic.Tool[] = [
  {
    name: "find_operator_organization",
    description: `Searches the Caelex operator-organisation directory (all registered satellite operators / launch providers / space-service companies) by name fragment. Use this before \`create_matter_invite\` to resolve a client name to an orgId — never pass a guessed id.

Matches are fuzzy (case-insensitive contains on name + slug). Only ACTIVE operator orgs are returned. Max 8 candidates.

After calling:
  - 1 match → use its \`id\` in create_matter_invite, confirm the org name with user.
  - Multiple matches → list numbered, ask user to pick.
  - Zero matches → operator is not (yet) on Caelex. **Two options to proceed**:
    (a) **DEFAULT for a project-workspace**: use \`create_solo_matter\` directly with free-text clientName. The lawyer can work in the mandate immediately (vault, chats, agent-runs, deadlines) — no bilateral handshake needed.
    (b) Only when the lawyer explicitly wants a bilateral Caelex-counsel relationship: tell them the operator must sign up at caelex.eu first (not supported by this tool).
  Prefer (a) for "lege ein Mandat an", "mach mir einen Workspace für X" — these don't need the operator on Caelex.`,
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Free-text org name fragment (e.g. 'Rocket', 'Arianespace', 'Planet Labs'). 2-100 characters.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "create_matter_invite",
    description: `Creates a bilateral matter invitation from the caller's law firm to a Caelex operator org. The operator must still accept (handshake), but from Atlas's side the mandate draft is persisted and the invitation email is sent to the operator's OWNER.

HARD RULE — confirmation flow:
  1. On first call for a given mandate, ALWAYS pass action='preview'. Returns a dry-run payload with operator name + proposed scope + expiry.
  2. Only after the user has explicitly approved in natural language (e.g. 'ja, schick', 'bestätigt', 'go'), call again with action='create'.
  Never create without a preview turn first — even if the user was very explicit, the preview shows the operator org resolution which may surprise them.

On successful create, the client automatically navigates into the new matter's workspace (hero state — no conversations yet). The invitation email dispatch happens best-effort; even if email fails the mandate is created and the user gets the workspace link.

Scope levels:
  - 'advisory' (L1) — read + summaries only. One-off advisory work.
  - 'active_counsel' (L2) — read + annotate on compliance/auth/docs/timeline/incidents. Ongoing mandate.
  - 'full_counsel' (L3) — L2 + export + spacecraft registry. Full legal representation.

Defaults: scope_level='active_counsel', duration_months=12.`,
    input_schema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["preview", "create"],
          description:
            "'preview' for dry-run (mandatory first turn); 'create' to actually persist + send email.",
        },
        operator_org_id: {
          type: "string",
          description:
            "cuid of the operator org (resolved via find_operator_organization first).",
        },
        matter_name: {
          type: "string",
          description:
            "Human-readable mandate name, 3-200 chars. E.g. 'ESA Copernicus — NIS2 Compliance', 'Rocket Inc — Launch Authorization'.",
        },
        reference: {
          type: "string",
          description:
            "Optional firm-internal reference number, e.g. 'BHO-2026-112'. Max 50 chars.",
        },
        scope_level: {
          type: "string",
          enum: ["advisory", "active_counsel", "full_counsel"],
          description:
            "Predefined scope tier. Use advisory for one-off questions, active_counsel for ongoing mandates, full_counsel for full representation.",
        },
        duration_months: {
          type: "number",
          description: "Validity in months, 1-60. Default 12.",
        },
      },
      required: ["action", "operator_org_id", "matter_name"],
    },
  },
  {
    name: "create_solo_matter",
    description: `Creates a LAWYER-SIDE-ONLY mandate (project workspace) WITHOUT requiring the operator to be a Caelex-registered org. This is the DEFAULT mandate-creation path for almost all cases. Use this when:
- find_operator_organization returns zero matches AND the lawyer wants a workspace anyway
- the lawyer says "lege ein Mandat an für X", "mach mir einen Workspace für Y", "ich brauch ein Projekt"
- the client/operator is a prospect, an internal project, or just doesn't need a Caelex login

The mandate becomes a FULL project workspace immediately: Vault (files), Chats, Notes, Deadlines, Time-Entries, Agent-Runs, Background-Agent — alles hängt am mandateId.

clientName / clientContact are FREE-TEXT strings (no FK enforcement, no Caelex registration). The lawyer can later upgrade to a bilateral Caelex-counsel relationship via /atlas/network if the operator joins.

Approval flow: this tool starts with \`create_\` prefix and therefore triggers Atlas's automatic approval-gate (Sprint B1). The lawyer sees an approval card with the proposed name/clientName before persistence. Single call (no preview/create split — the approval gate IS the preview).

After successful creation, returns the new \`mandateId\`. The client navigates into the workspace at /atlas/mandate/[id].`,
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "Mandate name (3-200 chars). E.g. 'Spire · SAT-2026', 'Internes Compliance-Projekt Q1', 'Akquise Iridium NIS2-Pitch'.",
        },
        clientName: {
          type: "string",
          description:
            "OPTIONAL free-text client/operator name. NO Caelex registration needed. E.g. 'Spire Global GmbH', 'Iridium Communications', 'Intern'.",
        },
        clientContact: {
          type: "string",
          description:
            "OPTIONAL client contact (email or phone). E.g. 'legal@spire.com'.",
        },
        jurisdiction: {
          type: "string",
          description: "OPTIONAL ISO-Code. E.g. 'DE', 'FR', 'EU', 'US'.",
        },
        operatorType: {
          type: "string",
          description:
            "OPTIONAL operator-type tag. E.g. 'satellite_operator', 'launch_provider', 'isos', 'data_provider'.",
        },
        primaryAuthority: {
          type: "string",
          description:
            "OPTIONAL primary regulatory authority. E.g. 'BNetzA', 'CNES', 'FCC', 'ESA'.",
        },
        customInstructions: {
          type: "string",
          description:
            "OPTIONAL Markdown system-prompt suffix injected into every chat of this mandate. Max 4000 chars. Lawyer can edit later.",
        },
      },
      required: ["name"],
    },
  },
];

const NETWORK_TOOL_NAMES = NETWORK_TOOLS.map((t) => t.name) as string[];

export function isNetworkToolName(name: string): boolean {
  return NETWORK_TOOL_NAMES.includes(name);
}

/* ── find_operator_organization ─────────────────────────────────────── */

const FindOperatorOrganizationInput = z.object({
  query: z.string().min(2).max(100),
});

const OPERATOR_LIMIT = 8;

async function findOperatorOrganization(
  input: unknown,
): Promise<NetworkToolResult> {
  const parsed = FindOperatorOrganizationInput.safeParse(input);
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

  /* H-2: orgType filter is enforced — the previous schema-drift
     fallback silently re-ran the query without the orgType filter,
     which meant that immediately after a deploy where the migration
     hadn't run, the tool would return ANY active org (including
     LAW_FIRMs) as counterparty candidates. We now hard-fail loudly
     so the operator notices instead of letting the tool continue in
     an unsafe mode. */
  let orgs: Array<{
    id: string;
    name: string;
    slug: string | null;
    orgType?: string | null;
  }>;
  try {
    orgs = await prisma.organization.findMany({
      where: {
        isActive: true,
        orgType: { in: ["OPERATOR", "BOTH"] },
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, slug: true, orgType: true },
      orderBy: { name: "asc" },
      take: OPERATOR_LIMIT,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/orgtype.*does not exist|column.*orgtype/i.test(msg)) {
      logger.error(
        "[atlas/find_operator_organization] Organization.orgType column missing — migration not applied. Refusing the lookup so we don't accidentally surface law-firm orgs as counterparty candidates.",
      );
      return {
        content: JSON.stringify({
          error:
            "Operator directory temporarily unavailable — migration pending. Please contact support.",
          code: "ORG_TYPE_MIGRATION_PENDING",
        }),
        isError: true,
      };
    }
    throw err;
  }

  return {
    content: JSON.stringify({
      query: q,
      totalMatches: orgs.length,
      matches: orgs,
    }),
    isError: false,
  };
}

/* ── create_matter_invite ───────────────────────────────────────────── */

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
    /* AUDIT-FIX M9: bail out if invite is already expired before
       burning a DB round-trip and email-send. */
    if (input.expiresAt.getTime() <= Date.now()) {
      logger.warn(
        "[atlas/tool] dispatchInviteEmailBestEffort: computed expiry already past, skipping email",
        {
          matterId: input.matterId,
          operatorOrgId: input.operatorOrgId,
          expiresAt: input.expiresAt.toISOString(),
        },
      );
      return;
    }

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

async function createMatterInvite(args: {
  input: unknown;
  callerUserId: string;
  callerOrgId: string;
}): Promise<NetworkToolResult> {
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

  let operator: {
    id: string;
    name: string;
    slug: string | null;
    isActive: boolean;
    orgType?: string | null;
  } | null;
  try {
    operator = await prisma.organization.findUnique({
      where: { id: operator_org_id },
      select: {
        id: true,
        name: true,
        slug: true,
        orgType: true,
        isActive: true,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/orgtype.*does not exist|column.*orgtype/i.test(msg)) {
      logger.error(
        "[atlas/create_matter_invite] Organization.orgType column missing — refusing the invite create. Migration must be applied before matter invites can be safely processed.",
      );
      return {
        content: JSON.stringify({
          error:
            "Matter invites temporarily unavailable — migration pending. Please contact support.",
          code: "ORG_TYPE_MIGRATION_PENDING",
        }),
        isError: true,
      };
    }
    throw err;
  }

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
  /* AUDIT-FIX 2026-05-17: previously the truthy guard skipped LAW_FIRM
     check entirely for null orgType. Now blocks both LAW_FIRM and null. */
  if (operator.orgType === "LAW_FIRM") {
    return {
      content: JSON.stringify({
        error: `${operator.name} is a law firm, not an operator — cannot invite as client`,
        code: "WRONG_ORG_TYPE",
      }),
      isError: true,
    };
  }
  if (operator.orgType === null) {
    return {
      content: JSON.stringify({
        error: `${operator.name} has no orgType set — refusing to invite as operator without explicit type`,
        code: "UNKNOWN_ORG_TYPE",
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

/* ── create_solo_matter ─────────────────────────────────────────────── */

const CreateSoloMatterInput = z.object({
  name: z.string().trim().min(3).max(200),
  clientName: z.string().trim().max(200).optional(),
  clientContact: z.string().trim().max(200).optional(),
  /* AUDIT-FIX 2026-05-17: aligned with POST /api/atlas/mandate's max(8)
     to match JURISDICTIONS dropdown codes. */
  jurisdiction: z.string().trim().max(8).optional(),
  operatorType: z.string().trim().max(80).optional(),
  primaryAuthority: z.string().trim().max(120).optional(),
  customInstructions: z.string().max(4000).optional(),
});

async function createSoloMatter(args: {
  input: unknown;
  callerUserId: string;
  callerOrgId: string;
}): Promise<NetworkToolResult> {
  const parsed = CreateSoloMatterInput.safeParse(args.input);
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
  const d = parsed.data;
  try {
    /* SEC-T0-1 step 2b: encrypt the 3 PII fields before create. */
    const encClientName = await encryptAtlasField(
      d.clientName || null,
      args.callerOrgId,
    );
    const encClientContact = await encryptAtlasField(
      d.clientContact || null,
      args.callerOrgId,
    );
    const encCustomInstructions = await encryptAtlasField(
      d.customInstructions || null,
      args.callerOrgId,
    );
    const mandate = await prisma.atlasMandate.create({
      data: {
        organizationId: args.callerOrgId,
        ownerUserId: args.callerUserId,
        name: d.name,
        clientName: encClientName,
        clientContact: encClientContact,
        customInstructions: encCustomInstructions,
        jurisdiction: d.jurisdiction || null,
        operatorType: d.operatorType || null,
        primaryAuthority: d.primaryAuthority || null,
        members: {
          create: { userId: args.callerUserId, role: "owner" },
        },
      },
      select: {
        id: true,
        name: true,
        clientName: true,
        jurisdiction: true,
        operatorType: true,
        primaryAuthority: true,
        createdAt: true,
      },
    });
    const mandateWithPlain = {
      ...mandate,
      clientName: await decryptAtlasField(mandate.clientName),
    };
    return {
      content: JSON.stringify({
        ok: true,
        mandateId: mandateWithPlain.id,
        message: `Mandat "${mandateWithPlain.name}" angelegt. Workspace verfügbar unter /atlas/mandate/${mandateWithPlain.id}.`,
        mandate: mandateWithPlain,
      }),
      isError: false,
      navigateUrl: `/atlas/mandate/${mandateWithPlain.id}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[atlas/create_solo_matter] failed: ${msg}`);
    return {
      content: JSON.stringify({
        error: "Mandate creation failed",
        code: "DB_ERROR",
        detail: msg.slice(0, 200),
      }),
      isError: true,
    };
  }
}

/** Bundle entry-point. */
export async function executeNetworkTool(args: {
  name: string;
  input: unknown;
  callerUserId: string;
  callerOrgId: string;
}): Promise<NetworkToolResult> {
  switch (args.name) {
    case "find_operator_organization":
      return findOperatorOrganization(args.input);
    case "create_matter_invite":
      return createMatterInvite({
        input: args.input,
        callerUserId: args.callerUserId,
        callerOrgId: args.callerOrgId,
      });
    case "create_solo_matter":
      return createSoloMatter({
        input: args.input,
        callerUserId: args.callerUserId,
        callerOrgId: args.callerOrgId,
      });
    default:
      return {
        content: JSON.stringify({
          error: `Unknown network tool: ${args.name}`,
        }),
        isError: true,
      };
  }
}
