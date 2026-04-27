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
import {
  ALL_SOURCES,
  getLegalSourceById,
  getAuthoritiesByJurisdiction,
  type LegalSourceType,
  type ComplianceArea,
} from "@/data/legal-sources";
import { listTemplateSummaries } from "@/data/atlas-workspace-templates";
import {
  ATLAS_CASES,
  getCaseById,
  getCasesApplyingSource,
  type LegalCase,
} from "@/data/legal-cases";

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

  // Schema-drift resilient lookup. Try the orgType-filtered query
  // first; on column-missing, retry without the filter so the tool
  // still returns matches. The role-shape filter resumes once the
  // migration lands. See src/lib/legal-network/org-type.ts for the
  // full pattern.
  const buildSelect = () => ({
    id: true,
    name: true,
    slug: true,
    orgType: true,
  });
  const buildFallbackSelect = () => ({
    id: true,
    name: true,
    slug: true,
  });

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
        // Operator or BOTH orgs — you can't invite a pure law firm
        // into a matter on the ATLAS side (it would be same-side).
        orgType: { in: ["OPERATOR", "BOTH"] },
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
        ],
      },
      select: buildSelect(),
      orderBy: { name: "asc" },
      take: OPERATOR_LIMIT,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/orgtype.*does not exist|column.*orgtype/i.test(msg)) throw err;
    orgs = await prisma.organization.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
        ],
      },
      select: buildFallbackSelect(),
      orderBy: { name: "asc" },
      take: OPERATOR_LIMIT,
    });
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

  // Resolve the operator org. Schema-drift resilient: tries with
  // orgType, falls back to a select without it so the existence +
  // isActive checks still apply. The "is this org actually a
  // LAW_FIRM" wrong-type check is conditional on having orgType
  // available.
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
    if (!/orgtype.*does not exist|column.*orgtype/i.test(msg)) throw err;
    operator = await prisma.organization.findUnique({
      where: { id: operator_org_id },
      select: { id: true, name: true, slug: true, isActive: true },
    });
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
  // Conditional wrong-type check — skipped under schema drift.
  if (operator.orgType && operator.orgType === "LAW_FIRM") {
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

// ─── search_legal_sources ───────────────────────────────────────────

const VALID_TYPES: LegalSourceType[] = [
  "international_treaty",
  "federal_law",
  "federal_regulation",
  "technical_standard",
  "eu_regulation",
  "eu_directive",
  "policy_document",
  "draft_legislation",
];

const VALID_AREAS: ComplianceArea[] = [
  "licensing",
  "registration",
  "liability",
  "insurance",
  "cybersecurity",
  "export_control",
  "data_security",
  "frequency_spectrum",
  "environmental",
  "debris_mitigation",
  "space_traffic_management",
  "human_spaceflight",
  "military_dual_use",
];

const SearchSourcesInput = z.object({
  query: z.string().min(2).max(200),
  jurisdiction: z.string().max(5).optional(),
  type: z
    .enum(VALID_TYPES as [LegalSourceType, ...LegalSourceType[]])
    .optional(),
  compliance_area: z
    .enum(VALID_AREAS as [ComplianceArea, ...ComplianceArea[]])
    .optional(),
});

const SOURCE_HIT_LIMIT = 10;
const MIN_HIT_SCORE = 0.05;

function searchLegalSources(args: { input: unknown }): AtlasToolResult {
  const parsed = SearchSourcesInput.safeParse(args.input);
  if (!parsed.success) {
    return {
      content: JSON.stringify({
        error: "Invalid tool input",
        code: "INVALID_INPUT",
        issues: parsed.error.issues.map((i) => i.path.join(".")),
      }),
      isError: true,
    };
  }

  const { query, jurisdiction, type, compliance_area } = parsed.data;
  const q = query.trim().toLowerCase();
  const tokens = q.split(/\s+/).filter((t) => t.length >= 2);

  type Hit = {
    id: string;
    jurisdiction: string;
    type: string;
    status: string;
    title: string;
    scope_description: string;
    score: number;
  };

  // Pre-filter by jurisdiction/type/area; then score remaining by token
  // overlap on title + scope_description + key_provision titles.
  const candidates = ALL_SOURCES.filter((s) => {
    if (jurisdiction && s.jurisdiction !== jurisdiction.toUpperCase()) {
      return false;
    }
    if (type && s.type !== type) return false;
    if (compliance_area && !s.compliance_areas.includes(compliance_area)) {
      return false;
    }
    return true;
  });

  const scored: Hit[] = [];
  for (const s of candidates) {
    const haystack = (
      s.title_en +
      " " +
      (s.title_local ?? "") +
      " " +
      (s.scope_description ?? "") +
      " " +
      s.key_provisions.map((p) => p.title + " " + p.summary).join(" ")
    ).toLowerCase();
    const titleLc = s.title_en.toLowerCase();

    let score = 0;
    for (const tok of tokens) {
      const titleIdx = titleLc.indexOf(tok);
      if (titleIdx === 0) score += 0.5;
      else if (titleIdx > 0) score += 0.25;
      else if (haystack.includes(tok)) score += 0.1;
    }
    // Substring of full query (tight match)
    if (titleLc.includes(q)) score += 0.3;
    else if (haystack.includes(q)) score += 0.15;

    // Normalise to 0-1 and clamp
    score = Math.min(score, 1);

    if (score >= MIN_HIT_SCORE) {
      scored.push({
        id: s.id,
        jurisdiction: s.jurisdiction,
        type: s.type,
        status: s.status,
        title: s.title_en,
        scope_description:
          s.scope_description?.slice(0, 220) ?? "(no scope description)",
        score: Math.round(score * 100) / 100,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const hits = scored.slice(0, SOURCE_HIT_LIMIT);

  return {
    content: JSON.stringify({
      query,
      filters: { jurisdiction, type, compliance_area },
      hit_count: hits.length,
      hits,
      hint:
        hits.length === 0
          ? "No matches. Try a broader query or remove filters."
          : "Drill into a specific source via get_legal_source_by_id with its `id`.",
    }),
    isError: false,
  };
}

// ─── get_legal_source_by_id ─────────────────────────────────────────

const GetSourceByIdInput = z.object({
  source_id: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[A-Z0-9][A-Za-z0-9-]+$/, {
      message: "source_id must be uppercase-prefixed alphanumeric with hyphens",
    }),
});

function getLegalSourceByIdTool(args: { input: unknown }): AtlasToolResult {
  const parsed = GetSourceByIdInput.safeParse(args.input);
  if (!parsed.success) {
    return {
      content: JSON.stringify({
        error: "Invalid source_id format",
        code: "INVALID_INPUT",
      }),
      isError: true,
    };
  }
  const source = getLegalSourceById(parsed.data.source_id);
  if (!source) {
    return {
      content: JSON.stringify({
        error: `Source not found: ${parsed.data.source_id}`,
        code: "NOT_FOUND",
        hint: "Use search_legal_sources to discover the correct id.",
      }),
      isError: true,
    };
  }

  // Return a compact projection — full key_provisions, but trimmed
  // sub-arrays so the model isn't drowned in noise.
  return {
    content: JSON.stringify({
      id: source.id,
      jurisdiction: source.jurisdiction,
      type: source.type,
      status: source.status,
      title: source.title_en,
      title_local: source.title_local,
      official_reference: source.official_reference,
      source_url: source.source_url,
      issuing_body: source.issuing_body,
      competent_authorities: source.competent_authorities,
      relevance_level: source.relevance_level,
      applicable_to: source.applicable_to,
      compliance_areas: source.compliance_areas,
      scope_description: source.scope_description,
      key_provisions: source.key_provisions,
      related_sources: source.related_sources.slice(0, 12),
      amends: source.amends,
      amended_by: source.amended_by?.slice(0, 8),
      implements: source.implements,
      superseded_by: source.superseded_by,
      applies_to_jurisdictions: source.applies_to_jurisdictions?.slice(0, 32),
      signed_by_jurisdictions: source.signed_by_jurisdictions?.slice(0, 32),
      notes: source.notes?.slice(0, 8),
      last_verified: source.last_verified,
    }),
    isError: false,
  };
}

// ─── list_workspace_templates ───────────────────────────────────────

function listWorkspaceTemplates(): AtlasToolResult {
  const summaries = listTemplateSummaries();
  return {
    content: JSON.stringify({
      template_count: summaries.length,
      templates: summaries,
      hint: "Recommend the best-fit template by id. The user clicks it in the UI to seed a new workspace pre-loaded with the relevant Atlas sources.",
    }),
    isError: false,
  };
}

// ─── list_jurisdiction_authorities ──────────────────────────────────

const ListAuthInput = z.object({
  jurisdiction: z
    .string()
    .min(2)
    .max(5)
    .regex(/^[A-Z]{2,3}$/, {
      message: "jurisdiction must be 2-3 uppercase letters",
    }),
});

function listJurisdictionAuthorities(args: {
  input: unknown;
}): AtlasToolResult {
  const raw = args.input as { jurisdiction?: unknown };
  const normalized = {
    jurisdiction:
      typeof raw?.jurisdiction === "string"
        ? raw.jurisdiction.toUpperCase()
        : raw?.jurisdiction,
  };
  const parsed = ListAuthInput.safeParse(normalized);
  if (!parsed.success) {
    return {
      content: JSON.stringify({
        error: "Invalid jurisdiction code",
        code: "INVALID_INPUT",
      }),
      isError: true,
    };
  }
  const code = parsed.data.jurisdiction;
  const authorities = getAuthoritiesByJurisdiction(code);
  if (authorities.length === 0) {
    return {
      content: JSON.stringify({
        jurisdiction: code,
        authority_count: 0,
        authorities: [],
        hint: "No authorities catalogued for this jurisdiction code. Try a different code or 'INT'/'EU'.",
      }),
      isError: false,
    };
  }
  return {
    content: JSON.stringify({
      jurisdiction: code,
      authority_count: authorities.length,
      authorities: authorities.map((a) => ({
        id: a.id,
        name: a.name_en,
        name_local: a.name_local,
        abbreviation: a.abbreviation,
        parent_ministry: a.parent_ministry,
        website: a.website,
        space_mandate: a.space_mandate,
        applicable_areas: a.applicable_areas,
      })),
    }),
    isError: false,
  };
}

// ─── search_cases ───────────────────────────────────────────────────

const SearchCasesInput = z.object({
  query: z.string().min(0).max(200).optional(),
  jurisdiction: z
    .string()
    .min(2)
    .max(5)
    .regex(/^[A-Z]{2,3}$/)
    .optional(),
  compliance_area: z.string().max(40).optional(),
  applied_source_id: z.string().max(80).optional(),
});

const CASE_HIT_LIMIT = 10;

function searchCasesTool(args: { input: unknown }): AtlasToolResult {
  // Normalise upper-case for jurisdiction.
  const raw = args.input as {
    query?: unknown;
    jurisdiction?: unknown;
    compliance_area?: unknown;
    applied_source_id?: unknown;
  };
  const normalised = {
    query: typeof raw?.query === "string" ? raw.query : undefined,
    jurisdiction:
      typeof raw?.jurisdiction === "string"
        ? raw.jurisdiction.toUpperCase()
        : undefined,
    compliance_area:
      typeof raw?.compliance_area === "string"
        ? raw.compliance_area
        : undefined,
    applied_source_id:
      typeof raw?.applied_source_id === "string"
        ? raw.applied_source_id
        : undefined,
  };
  const parsed = SearchCasesInput.safeParse(normalised);
  if (!parsed.success) {
    return {
      content: JSON.stringify({
        error: "Invalid tool input",
        code: "INVALID_INPUT",
        issues: parsed.error.issues.map((i) => i.path.join(".")),
      }),
      isError: true,
    };
  }

  const { query, jurisdiction, compliance_area, applied_source_id } =
    parsed.data;
  const q = (query ?? "").trim().toLowerCase();
  const tokens = q.split(/\s+/).filter((t) => t.length >= 2);

  // Pre-filter
  let candidates: LegalCase[] = ATLAS_CASES;
  if (jurisdiction) {
    candidates = candidates.filter((c) => c.jurisdiction === jurisdiction);
  }
  if (compliance_area) {
    candidates = candidates.filter((c) =>
      c.compliance_areas.includes(
        compliance_area as LegalCase["compliance_areas"][number],
      ),
    );
  }
  if (applied_source_id) {
    candidates = candidates.filter((c) =>
      c.applied_sources.includes(applied_source_id),
    );
  }

  // If no query, return the filtered set ordered by date (newest first).
  if (!q) {
    const ordered = [...candidates]
      .sort((a, b) => b.date_decided.localeCompare(a.date_decided))
      .slice(0, CASE_HIT_LIMIT);
    return {
      content: JSON.stringify({
        filters: { jurisdiction, compliance_area, applied_source_id },
        hit_count: ordered.length,
        hits: ordered.map((c) => ({
          id: c.id,
          jurisdiction: c.jurisdiction,
          forum: c.forum,
          title: c.title,
          plaintiff: c.plaintiff,
          defendant: c.defendant,
          date_decided: c.date_decided,
          ruling_summary: c.ruling_summary.slice(0, 220),
          industry_significance: c.industry_significance.slice(0, 200),
          applied_sources: c.applied_sources,
        })),
        hint:
          ordered.length === 0
            ? "No cases match these filters. Be honest with the user — do NOT invent."
            : "Drill into a specific case via get_case_by_id with its `id`. Reference any case inline as [CASE-...] for hover-preview pills.",
      }),
      isError: false,
    };
  }

  // Score candidates by token overlap.
  type Hit = LegalCase & { score: number };
  const scored: Hit[] = [];
  for (const c of candidates) {
    const haystack = [
      c.title,
      c.plaintiff,
      c.defendant,
      c.facts,
      c.ruling_summary,
      c.legal_holding,
      c.industry_significance,
      ...(c.parties_mentioned ?? []),
      ...(c.notes ?? []),
    ]
      .join(" ")
      .toLowerCase();
    const titleLc = c.title.toLowerCase();

    let score = 0;
    for (const tok of tokens) {
      const titleIdx = titleLc.indexOf(tok);
      if (titleIdx === 0) score += 0.5;
      else if (titleIdx > 0) score += 0.25;
      else if (haystack.includes(tok)) score += 0.1;
    }
    if (titleLc.includes(q)) score += 0.3;
    else if (haystack.includes(q)) score += 0.15;
    score = Math.min(score, 1);

    if (score >= MIN_HIT_SCORE) {
      scored.push({ ...c, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const hits = scored.slice(0, CASE_HIT_LIMIT);

  return {
    content: JSON.stringify({
      query,
      filters: { jurisdiction, compliance_area, applied_source_id },
      hit_count: hits.length,
      hits: hits.map((c) => ({
        id: c.id,
        jurisdiction: c.jurisdiction,
        forum: c.forum,
        title: c.title,
        plaintiff: c.plaintiff,
        defendant: c.defendant,
        date_decided: c.date_decided,
        ruling_summary: c.ruling_summary.slice(0, 220),
        industry_significance: c.industry_significance.slice(0, 200),
        applied_sources: c.applied_sources,
        score: Math.round(c.score * 100) / 100,
      })),
      hint:
        hits.length === 0
          ? "No matches. Try a broader query or remove filters. Do NOT invent cases."
          : "Drill into a specific case via get_case_by_id. Reference inline as [CASE-...] for hover-preview pills.",
    }),
    isError: false,
  };
}

// ─── get_case_by_id ─────────────────────────────────────────────────

const GetCaseByIdInput = z.object({
  case_id: z
    .string()
    .min(2)
    .max(100)
    .regex(/^CASE-[A-Z0-9-]+$/, {
      message:
        "case_id must start with 'CASE-' and contain only uppercase alphanumerics + hyphens",
    }),
});

function getCaseByIdTool(args: { input: unknown }): AtlasToolResult {
  const parsed = GetCaseByIdInput.safeParse(args.input);
  if (!parsed.success) {
    return {
      content: JSON.stringify({
        error: "Invalid case_id format",
        code: "INVALID_INPUT",
        hint: "case_id must look like 'CASE-COSMOS-954-1981' or 'CASE-FCC-SWARM-2018'.",
      }),
      isError: true,
    };
  }
  const c = getCaseById(parsed.data.case_id);
  if (!c) {
    return {
      content: JSON.stringify({
        error: `Case not found: ${parsed.data.case_id}`,
        code: "NOT_FOUND",
        hint: "Use search_cases to discover the correct id. Do NOT invent.",
      }),
      isError: true,
    };
  }

  // Cross-reference: how many other cases also touch the same primary
  // applied_source? Useful for the model to add context.
  const peerCases =
    c.applied_sources.length > 0
      ? getCasesApplyingSource(c.applied_sources[0])
          .filter((p) => p.id !== c.id)
          .slice(0, 5)
          .map((p) => ({ id: p.id, title: p.title }))
      : [];

  return {
    content: JSON.stringify({
      id: c.id,
      jurisdiction: c.jurisdiction,
      forum: c.forum,
      forum_name: c.forum_name,
      title: c.title,
      plaintiff: c.plaintiff,
      defendant: c.defendant,
      date_decided: c.date_decided,
      date_filed: c.date_filed,
      citation: c.citation,
      case_number: c.case_number,
      status: c.status,
      facts: c.facts,
      ruling_summary: c.ruling_summary,
      legal_holding: c.legal_holding,
      remedy: c.remedy,
      industry_significance: c.industry_significance,
      compliance_areas: c.compliance_areas,
      precedential_weight: c.precedential_weight,
      applied_sources: c.applied_sources,
      parties_mentioned: c.parties_mentioned ?? [],
      source_url: c.source_url,
      notes: c.notes ?? [],
      peer_cases_on_same_source: peerCases,
      last_verified: c.last_verified,
    }),
    isError: false,
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
    case "find_operator_organization":
      return findOperatorOrganization(args);
    case "create_matter_invite":
      return createMatterInviteTool(args);
    case "search_legal_sources":
      return searchLegalSources(args);
    case "get_legal_source_by_id":
      return getLegalSourceByIdTool(args);
    case "list_workspace_templates":
      return listWorkspaceTemplates();
    case "list_jurisdiction_authorities":
      return listJurisdictionAuthorities(args);
    case "search_cases":
      return searchCasesTool(args);
    case "get_case_by_id":
      return getCaseByIdTool(args);
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
