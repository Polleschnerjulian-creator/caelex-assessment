import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
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
  type LegalSource,
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
import { semanticSearch } from "./semantic-corpus.server";
import {
  regulatoryDeadlines,
  type RegulatoryDeadline,
} from "@/data/timeline-deadlines";
import {
  REGULATION_TIMELINE,
  type RegulationPhase,
} from "@/data/regulation-timeline";

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

async function searchLegalSources(args: {
  input: unknown;
}): Promise<AtlasToolResult> {
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
    /** Component breakdown for debugging — omitted from the model-facing
     *  payload but keeps reasoning explainable in tests. */
    keyword_score?: number;
    semantic_score?: number;
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

  // ── Semantic pass (best-effort, fails open to keyword-only) ────────
  // Cosine-similarity over the prebuilt embeddings catalogue. Returns
  // null when the catalogue or AI Gateway is unavailable — in that
  // case we degrade to keyword-only scoring with no user-visible
  // disruption.
  const semanticHits = await semanticSearch(query, {
    types: ["source"],
    limit: 60,
  }).catch(() => null);
  const semanticScores = new Map<string, number>();
  if (semanticHits) {
    for (const h of semanticHits) {
      semanticScores.set(h.entityId, h.score);
    }
  }

  const candidateIds = new Set(candidates.map((s) => s.id));
  const scoreMap = new Map<string, Hit>();

  // Keyword pass — same scoring as before, normalised to 0-1.
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

    let kw = 0;
    for (const tok of tokens) {
      const titleIdx = titleLc.indexOf(tok);
      if (titleIdx === 0) kw += 0.5;
      else if (titleIdx > 0) kw += 0.25;
      else if (haystack.includes(tok)) kw += 0.1;
    }
    if (titleLc.includes(q)) kw += 0.3;
    else if (haystack.includes(q)) kw += 0.15;
    kw = Math.min(kw, 1);

    const sem = semanticScores.get(s.id) ?? 0;
    // Hybrid weighting: keyword carries titles + exact substrings;
    // semantic carries paraphrase + cross-language. 60/40 favours
    // keyword on the assumption that legal queries are often
    // citation-shaped ("NIS2 Art. 21", "DE-VVG"), where literal
    // matches should dominate.
    const score = Math.min(kw * 0.6 + sem * 0.4, 1);
    if (score < MIN_HIT_SCORE) continue;

    scoreMap.set(s.id, {
      id: s.id,
      jurisdiction: s.jurisdiction,
      type: s.type,
      status: s.status,
      title: s.title_en,
      scope_description:
        s.scope_description?.slice(0, 220) ?? "(no scope description)",
      score: Math.round(score * 100) / 100,
      keyword_score: Math.round(kw * 100) / 100,
      semantic_score: Math.round(sem * 100) / 100,
    });
  }

  // Surface semantic-only hits for sources that survived the
  // jurisdiction/type/area pre-filter but had zero keyword overlap
  // (paraphrase recall — the entire point of adding embeddings).
  if (semanticHits) {
    for (const h of semanticHits) {
      if (scoreMap.has(h.entityId)) continue;
      if (!candidateIds.has(h.entityId)) continue;
      const s = ALL_SOURCES.find((x) => x.id === h.entityId);
      if (!s) continue;
      const score = h.score * 0.4;
      if (score < MIN_HIT_SCORE) continue;
      scoreMap.set(s.id, {
        id: s.id,
        jurisdiction: s.jurisdiction,
        type: s.type,
        status: s.status,
        title: s.title_en,
        scope_description:
          s.scope_description?.slice(0, 220) ?? "(no scope description)",
        score: Math.round(score * 100) / 100,
        keyword_score: 0,
        semantic_score: Math.round(h.score * 100) / 100,
      });
    }
  }

  const hits = [...scoreMap.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, SOURCE_HIT_LIMIT);

  return {
    content: JSON.stringify({
      query,
      filters: { jurisdiction, type, compliance_area },
      hit_count: hits.length,
      hits,
      semantic_available: semanticHits !== null,
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

async function searchCasesTool(args: {
  input: unknown;
}): Promise<AtlasToolResult> {
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

  // ── Semantic pass for case-law (best-effort, fail-soft) ───────────
  // Same hybrid pattern as searchLegalSources — embedding-driven
  // recall + keyword precision. Returns null when embeddings or AI
  // Gateway are unavailable; we fall back to keyword-only without a
  // user-visible error.
  const semanticHits = await semanticSearch(query!, {
    types: ["case"],
    limit: 40,
  }).catch(() => null);
  const semanticScores = new Map<string, number>();
  if (semanticHits) {
    for (const h of semanticHits) semanticScores.set(h.entityId, h.score);
  }

  // Score candidates by token overlap.
  type Hit = LegalCase & { score: number };
  const scoreMap = new Map<string, Hit>();
  const candidateIds = new Set(candidates.map((c) => c.id));

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

    let kw = 0;
    for (const tok of tokens) {
      const titleIdx = titleLc.indexOf(tok);
      if (titleIdx === 0) kw += 0.5;
      else if (titleIdx > 0) kw += 0.25;
      else if (haystack.includes(tok)) kw += 0.1;
    }
    if (titleLc.includes(q)) kw += 0.3;
    else if (haystack.includes(q)) kw += 0.15;
    kw = Math.min(kw, 1);

    const sem = semanticScores.get(c.id) ?? 0;
    const score = Math.min(kw * 0.6 + sem * 0.4, 1);
    if (score < MIN_HIT_SCORE) continue;

    scoreMap.set(c.id, { ...c, score });
  }

  // Surface semantic-only paraphrase hits that survived the
  // jurisdiction/area/applied_source pre-filter.
  if (semanticHits) {
    for (const h of semanticHits) {
      if (scoreMap.has(h.entityId)) continue;
      if (!candidateIds.has(h.entityId)) continue;
      const c = ATLAS_CASES.find((x) => x.id === h.entityId);
      if (!c) continue;
      const score = h.score * 0.4;
      if (score < MIN_HIT_SCORE) continue;
      scoreMap.set(c.id, { ...c, score });
    }
  }

  const hits = [...scoreMap.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, CASE_HIT_LIMIT);

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

// ─── draft_authorization_application ─────────────────────────────────

const OPERATOR_TYPES = [
  "satellite_operator",
  "launch_provider",
  "ground_segment",
  "data_provider",
  "in_orbit_services",
  "constellation_operator",
  "space_resource_operator",
] as const;

const DraftApplicationInput = z.object({
  jurisdiction: z
    .string()
    .min(2)
    .max(5)
    .regex(/^[A-Z]{2,3}$/, {
      message: "jurisdiction must be 2-3 uppercase letters",
    }),
  operator_type: z.enum(OPERATOR_TYPES),
  mission_profile: z.string().max(2000).optional(),
});

/**
 * Returns the highest-relevance OPERATIVE national licensing statutes
 * for a JD. Only primary or secondary national legislation qualifies:
 * a UK SIA 2018 entry is something an operator files under; OST
 * ratifications, ESA accession policy papers, technical standards,
 * and draft proposals are not the regime that grants the licence.
 *
 * Allowlist (not denylist) is the right semantic: treaty stubs and
 * accession policy documents share the `licensing` compliance area
 * tag but don't constitute a domestic licensing regime, and we want
 * `NO_REGIME` to fire honestly for jurisdictions that lack a
 * national space-licensing statute (e.g. Estonia).
 */
function topLicensingSources(jurisdiction: string, limit = 5): LegalSource[] {
  const order: Record<string, number> = {
    fundamental: 0,
    critical: 1,
    high: 2,
    medium: 3,
    low: 4,
  };
  const STATUTORY_TYPES: ReadonlySet<LegalSource["type"]> = new Set([
    "federal_law",
    "federal_regulation",
  ]);
  return ALL_SOURCES.filter(
    (s) =>
      s.jurisdiction === jurisdiction &&
      s.compliance_areas.includes("licensing") &&
      s.status === "in_force" &&
      STATUTORY_TYPES.has(s.type),
  )
    .sort(
      (a, b) =>
        (order[a.relevance_level] ?? 9) - (order[b.relevance_level] ?? 9),
    )
    .slice(0, limit);
}

function draftAuthorizationApplication(args: {
  input: unknown;
}): AtlasToolResult {
  const raw = args.input as { jurisdiction?: unknown };
  const normalised = {
    ...((args.input as object) ?? {}),
    jurisdiction:
      typeof raw?.jurisdiction === "string"
        ? raw.jurisdiction.toUpperCase()
        : raw?.jurisdiction,
  };
  const parsed = DraftApplicationInput.safeParse(normalised);
  if (!parsed.success) {
    return {
      content: JSON.stringify({
        error: "Invalid drafting input",
        code: "INVALID_INPUT",
        issues: parsed.error.issues.map((i) => i.path.join(".")),
      }),
      isError: true,
    };
  }

  const { jurisdiction, operator_type, mission_profile } = parsed.data;
  const sources = topLicensingSources(jurisdiction, 6);

  if (sources.length === 0) {
    // The "no domestic implementation" stub jurisdictions: EE, HR, HU,
    // IS, LI, LT, LV, RO, SI, SK and similar — Atlas has flagged them
    // as having no operative national space-law statute. The agent
    // should explain the OST Art. VI fallback rather than draft.
    return {
      content: JSON.stringify({
        error: `No operative national space-licensing regime catalogued for ${jurisdiction}.`,
        code: "NO_REGIME",
        jurisdiction,
        guidance:
          "Atlas catalogues this jurisdiction as having no dedicated national space-activities statute. The OST Art. VI authorisation obligation is typically discharged through (a) inter-ministerial administrative practice, (b) bilateral arrangements with another jurisdiction whose regime applies, or (c) operating under a foreign operator licence. Tell the user the jurisdiction is not directly draftable and suggest these fallbacks.",
      }),
      isError: true,
    };
  }

  const authorities = getAuthoritiesByJurisdiction(jurisdiction);
  const primaryAuthority = authorities.find((a) =>
    a.applicable_areas.includes("licensing"),
  );

  // Pull quantitative thresholds out of the source provisions. The
  // model can re-cite them in the scaffold without inventing numbers.
  const quantitativeAnchors: Array<{
    label: string;
    source_id: string;
    section: string;
    text: string;
  }> = [];
  for (const s of sources) {
    for (const p of s.key_provisions) {
      const blob = `${p.title} ${p.summary}`.toLowerCase();
      if (
        blob.includes("insurance") ||
        blob.includes("indemnif") ||
        blob.includes("haftpflicht") ||
        blob.includes("versicherung")
      ) {
        quantitativeAnchors.push({
          label: "insurance / indemnification",
          source_id: s.id,
          section: p.section,
          text: p.summary.slice(0, 280),
        });
      } else if (
        blob.includes("casualty") ||
        blob.includes("10⁻⁴") ||
        blob.includes("10⁻⁵") ||
        blob.includes("10⁻⁶") ||
        blob.includes("1:10,000") ||
        blob.includes("re-entry risk") ||
        blob.includes("re-entry casualty")
      ) {
        quantitativeAnchors.push({
          label: "casualty-risk threshold",
          source_id: s.id,
          section: p.section,
          text: p.summary.slice(0, 280),
        });
      } else if (
        blob.includes("post-mission disposal") ||
        blob.includes("end of mission") ||
        blob.includes("end-of-life") ||
        blob.includes("debris mitigation") ||
        blob.includes("trümmer") ||
        blob.includes("entsorgung") ||
        blob.includes("25-year") ||
        blob.includes("5-year")
      ) {
        quantitativeAnchors.push({
          label: "post-mission disposal / debris mitigation",
          source_id: s.id,
          section: p.section,
          text: p.summary.slice(0, 280),
        });
      } else if (
        blob.includes("disposal-reliability") ||
        blob.includes("0.9") ||
        blob.includes("0.95") ||
        blob.includes("reliability ≥") ||
        blob.includes("zuverlässigkeit")
      ) {
        quantitativeAnchors.push({
          label: "disposal reliability target",
          source_id: s.id,
          section: p.section,
          text: p.summary.slice(0, 280),
        });
      }
    }
  }

  const sectionTemplate = [
    {
      heading: "1. Operator identification & corporate authority",
      content_brief:
        "Legal name, registered office, ownership structure, ultimate beneficial owner, prior space-activity history, regulatory record. For non-domestic operators include certified translation of corporate documents.",
    },
    {
      heading: "2. Mission profile",
      content_brief:
        "Orbit, payload mass, frequency bands, end-customer profile, mission duration, propulsion architecture, planned manoeuvre cadence. Reference the operator's mission_profile input verbatim where supplied.",
    },
    {
      heading: "3. Technical safety case",
      content_brief:
        "Failure-mode-and-effects analysis, redundancy architecture, ground-segment cybersecurity baseline, range-safety coordination plan. Cite sectoral standards (ECSS-Q-ST-80C for software-PA, ISO 24113 for SDM).",
    },
    {
      heading: "4. Debris-mitigation and end-of-life plan",
      content_brief:
        "Apply the jurisdiction's PMD timeline (5-year vs 25-year), passivation procedures, casualty-risk computation, disposal-reliability demonstration, conjunction-data-sharing commitment.",
    },
    {
      heading: "5. Insurance and indemnification",
      content_brief:
        "Third-party-liability cover at the jurisdiction's threshold, named beneficiaries, cross-waiver of liability where applicable, indemnification regime above the operator-insurance ceiling.",
    },
    {
      heading: "6. Spectrum coordination",
      content_brief:
        "ITU-R coordination status (API/CR/C filings), national spectrum licence (Ofcom/BNetzA/ANFR/etc.), Resolution 35 milestone schedule for NGSO constellations.",
    },
    {
      heading: "7. Export-control & sanctions screening",
      content_brief:
        "ITAR / EAR / Wassenaar / MTCR / NSG screening of payload origin and end-customer. UK ECJU / FR CIEEMG / DE BAFA / US DDTC / BIS clearance status.",
    },
    {
      heading: "8. National-security review (where applicable)",
      content_brief:
        "FDI screening, Article-346-TFEU defence-industry overlay, dual-use technology disclosure, foreign-control thresholds.",
    },
    {
      heading: "9. Required attachments",
      content_brief:
        "Technical drawings, financial statements, insurance certificates, end-user-undertaking letters, environmental review (NEPA / EIA / Habitats), prior-launch-history attestations.",
    },
  ];

  const payload = {
    drafting_mode: "authorization_application",
    jurisdiction,
    operator_type,
    mission_profile_provided: !!mission_profile,
    primary_authority: primaryAuthority
      ? {
          id: primaryAuthority.id,
          name_en: primaryAuthority.name_en,
          abbreviation: primaryAuthority.abbreviation,
          website: primaryAuthority.website,
        }
      : null,
    legal_framework: sources.map((s) => ({
      id: s.id,
      title: s.title_en,
      type: s.type,
      relevance: s.relevance_level,
      official_reference: s.official_reference,
    })),
    quantitative_anchors: quantitativeAnchors.slice(0, 12),
    section_template: sectionTemplate,
    drafting_directives: [
      "Compose the application in the user's preferred language (DE / EN / FR — match the conversation).",
      "Cite EVERY substantive provision with [ATLAS-ID] in square brackets at the end of the sentence — never invent IDs, only cite IDs from this scaffold.",
      "When the user supplied a mission_profile, weave it into Section 2 and tailor Sections 3-5 to its specifics.",
      "Wrap the final draft with the legal-review disclaimer (see system prompt).",
      "Mark every numerical threshold (insurance cap, casualty risk, PMD year, reliability target) with the source id it came from. Cite the exact provision.",
      "If a section's information is not in the scaffold, write 'TODO — operator to supply' rather than guessing.",
    ],
    next_step_for_user: mission_profile
      ? "Compose the draft, then ask the user to verify the operator details, mission specifics, and which optional sections (FDI, sanctions screening) need to be filled in."
      : "Compose the draft as a template with operator-specific TODOs flagged. Ask the user for operator name, mission profile, and insurance arrangements before finalising.",
  };

  return { content: JSON.stringify(payload), isError: false };
}

// ─── draft_compliance_brief ──────────────────────────────────────────

const DraftBriefInput = z.object({
  topic: z.string().min(5).max(200),
  jurisdictions: z
    .array(
      z
        .string()
        .min(2)
        .max(5)
        .regex(/^[A-Z]{2,3}$/),
    )
    .max(15)
    .optional(),
  operator_context: z.string().max(2000).optional(),
});

function draftComplianceBrief(args: { input: unknown }): AtlasToolResult {
  const raw = args.input as {
    jurisdictions?: unknown;
  };
  const normalised = {
    ...((args.input as object) ?? {}),
    jurisdictions: Array.isArray(raw?.jurisdictions)
      ? (raw.jurisdictions as string[]).map((j) =>
          typeof j === "string" ? j.toUpperCase() : j,
        )
      : raw?.jurisdictions,
  };
  const parsed = DraftBriefInput.safeParse(normalised);
  if (!parsed.success) {
    return {
      content: JSON.stringify({
        error: "Invalid drafting input",
        code: "INVALID_INPUT",
        issues: parsed.error.issues.map((i) => i.path.join(".")),
      }),
      isError: true,
    };
  }

  const { topic, jurisdictions, operator_context } = parsed.data;
  const topicLc = topic.toLowerCase();
  const tokens = topicLc.split(/\s+/).filter((t) => t.length >= 3);

  // Score every source by token overlap on title + scope_description +
  // key_provisions, then pick top hits — no semantic call so the brief
  // scaffold builds with zero external cost.
  type Hit = { source: LegalSource; score: number };
  const scored: Hit[] = [];
  for (const s of ALL_SOURCES) {
    if (s.status !== "in_force" && s.status !== "draft") continue;
    if (jurisdictions && jurisdictions.length > 0) {
      if (
        !jurisdictions.includes(s.jurisdiction) &&
        // Always allow INT/EU sources through — they apply across the
        // jurisdiction list rather than belonging to a single member.
        s.jurisdiction !== "INT" &&
        s.jurisdiction !== "EU"
      ) {
        continue;
      }
    }
    const haystack = (
      s.title_en +
      " " +
      (s.scope_description ?? "") +
      " " +
      s.key_provisions.map((p) => `${p.title} ${p.summary}`).join(" ") +
      " " +
      s.compliance_areas.join(" ")
    ).toLowerCase();
    let score = 0;
    for (const tok of tokens) {
      if (haystack.includes(tok)) score += 0.1;
      if (s.title_en.toLowerCase().includes(tok)) score += 0.3;
    }
    if (haystack.includes(topicLc)) score += 0.4;
    score = Math.min(score, 1);
    if (score >= 0.1) scored.push({ source: s, score });
  }

  scored.sort((a, b) => b.score - a.score);
  const topSources = scored.slice(0, 12);

  // Cross-link cases applying the top-scoring sources.
  const caseSet = new Map<string, LegalCase>();
  for (const { source } of topSources.slice(0, 6)) {
    for (const c of getCasesApplyingSource(source.id)) {
      caseSet.set(c.id, c);
    }
  }
  const relevantCases = [...caseSet.values()].slice(0, 8);

  // Group sources by jurisdiction for the per-JD key-points table.
  const byJurisdiction = new Map<string, Hit[]>();
  for (const hit of topSources) {
    const arr = byJurisdiction.get(hit.source.jurisdiction) ?? [];
    arr.push(hit);
    byJurisdiction.set(hit.source.jurisdiction, arr);
  }
  const jurisdictionBuckets = [...byJurisdiction.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 7)
    .map(([jd, hits]) => ({
      jurisdiction: jd,
      key_sources: hits.slice(0, 4).map((h) => ({
        id: h.source.id,
        title: h.source.title_en,
        relevance: h.source.relevance_level,
      })),
    }));

  const briefStructure = [
    {
      heading: "Executive Summary",
      content_brief:
        "Two-three-sentence answer to the topic. Lead with the operator-actionable conclusion.",
    },
    {
      heading: "Legal Framework",
      content_brief:
        "Hierarchy of governing instruments: international (treaties, IADC, ISO), EU (regulations, directives), national (statutes, decrees). Cite each with [ATLAS-ID].",
    },
    {
      heading: "Per-jurisdiction Analysis",
      content_brief:
        "Render the jurisdictionBuckets as a table. Each row: jurisdiction · primary statute · key-threshold · enforcement-trail.",
    },
    {
      heading: "Enforcement Context",
      content_brief:
        "Cases that have applied the cited sources — render with [CASE-ID] tokens for hover-preview pills. Highlight precedential weight (binding / persuasive / settled-facts).",
    },
    {
      heading: "Risks & Open Questions",
      content_brief:
        "Identify the gaps where the catalogue does not give a definitive answer. Flag what additional facts the operator must supply.",
    },
    {
      heading: "Recommendations",
      content_brief:
        "Concrete next steps. Be specific (e.g. 'file under §X by Y date', 'add an indemnification clause referencing [Z]') rather than abstract.",
    },
  ];

  const payload = {
    drafting_mode: "compliance_brief",
    topic,
    jurisdictions_in_scope: jurisdictions ?? [],
    operator_context_provided: !!operator_context,
    sources_total: scored.length,
    top_sources: topSources.map((h) => ({
      id: h.source.id,
      jurisdiction: h.source.jurisdiction,
      type: h.source.type,
      title: h.source.title_en,
      relevance: h.source.relevance_level,
      score: Math.round(h.score * 100) / 100,
      provisions_count: h.source.key_provisions.length,
    })),
    jurisdiction_buckets: jurisdictionBuckets,
    relevant_cases: relevantCases.map((c) => ({
      id: c.id,
      jurisdiction: c.jurisdiction,
      title: c.title,
      date_decided: c.date_decided,
      precedential_weight: c.precedential_weight,
    })),
    brief_structure: briefStructure,
    drafting_directives: [
      "Render the brief in the user's preferred language (DE / EN — match the conversation).",
      "Use the brief_structure as the section order; tailor section content to the operator_context where supplied.",
      "Cite every substantive proposition with [ATLAS-ID] (sources) or [CASE-ID] (cases) — never invent IDs.",
      "Where the catalogue has no source for a sub-question, say so explicitly and recommend the user supply more facts.",
      "Wrap the final memo with the legal-review disclaimer (see system prompt).",
    ],
  };

  return { content: JSON.stringify(payload), isError: false };
}

// ─── compare_jurisdictions_for_filing ─────────────────────────────────

const COMPARE_CRITERIA = [
  "insurance_cap",
  "casualty_risk_threshold",
  "pmd_timeline",
  "disposal_reliability",
  "indemnification_regime",
  "processing_time",
  "itu_coordination_support",
  "debris_mitigation_baseline",
  "fdi_screening",
  "data_protection_regime",
] as const;

const DEFAULT_COMPARE_JURISDICTIONS = [
  "US",
  "UK",
  "FR",
  "DE",
  "IT",
  "NL",
  "AU",
  "NZ",
];

const DEFAULT_CRITERIA = [
  "insurance_cap",
  "casualty_risk_threshold",
  "pmd_timeline",
  "indemnification_regime",
  "debris_mitigation_baseline",
] as const;

const CompareInput = z.object({
  candidate_jurisdictions: z
    .array(
      z
        .string()
        .min(2)
        .max(5)
        .regex(/^[A-Z]{2,3}$/),
    )
    .max(20)
    .optional(),
  criteria: z.array(z.enum(COMPARE_CRITERIA)).max(10).optional(),
  operator_type: z
    .enum([
      "satellite_operator",
      "launch_provider",
      "ground_segment",
      "in_orbit_services",
      "constellation_operator",
    ])
    .optional(),
});

interface CriterionMatch {
  source_id: string;
  section: string;
  text: string;
}

function findCriterionMatch(
  jurisdiction: string,
  criterion: string,
): CriterionMatch | null {
  const sources = ALL_SOURCES.filter(
    (s) => s.jurisdiction === jurisdiction && s.status === "in_force",
  );

  // Heuristic keyword sets per criterion. We're looking for the most-
  // relevant provision, so we scan the provisions of the highest-
  // relevance sources first.
  const keywordsByCriterion: Record<string, string[]> = {
    insurance_cap: [
      "insurance",
      "haftpflicht",
      "versicherung",
      "indemnif",
      "60 mio",
      "60 million",
    ],
    casualty_risk_threshold: [
      "casualty",
      "1:10,000",
      "10⁻⁴",
      "10⁻⁵",
      "10⁻⁶",
      "re-entry risk",
    ],
    pmd_timeline: [
      "post-mission disposal",
      "end of mission",
      "end-of-life",
      "5-year",
      "25-year",
      "5 jahre",
      "25 jahre",
    ],
    disposal_reliability: [
      "reliability",
      "zuverlässigkeit",
      "0.9",
      "0.95",
      "≥ 0,9",
      "≥ 0,95",
    ],
    indemnification_regime: [
      "indemnif",
      "indemnity",
      "cross-waiver",
      "section 10",
      "§ 50914",
      "krone",
      "indemnification",
    ],
    processing_time: [
      "processing",
      "review period",
      "30 days",
      "60 days",
      "90 days",
      "monaten",
    ],
    itu_coordination_support: [
      "itu",
      "coordination",
      "mifr",
      "spectrum",
      "frequenz",
    ],
    debris_mitigation_baseline: [
      "iso 24113",
      "ecss-u-as-10c",
      "iadc",
      "debris mitigation",
      "trümmer",
    ],
    fdi_screening: [
      "fdi",
      "foreign direct investment",
      "ief",
      "cfius",
      "national-security review",
      "ausländer",
    ],
    data_protection_regime: ["gdpr", "dsgvo", "data protection", "datenschutz"],
  };

  const keywords = keywordsByCriterion[criterion] ?? [];

  const order: Record<string, number> = {
    fundamental: 0,
    critical: 1,
    high: 2,
    medium: 3,
    low: 4,
  };
  const ranked = sources.sort(
    (a, b) => (order[a.relevance_level] ?? 9) - (order[b.relevance_level] ?? 9),
  );

  for (const s of ranked) {
    for (const p of s.key_provisions) {
      const blob = `${p.title} ${p.summary}`.toLowerCase();
      if (keywords.some((kw) => blob.includes(kw))) {
        return {
          source_id: s.id,
          section: p.section,
          text: p.summary.slice(0, 300),
        };
      }
    }
  }
  return null;
}

function compareJurisdictionsForFiling(args: {
  input: unknown;
}): AtlasToolResult {
  const raw = args.input as {
    candidate_jurisdictions?: unknown;
    criteria?: unknown;
  };
  const normalised = {
    ...((args.input as object) ?? {}),
    candidate_jurisdictions: Array.isArray(raw?.candidate_jurisdictions)
      ? (raw.candidate_jurisdictions as string[]).map((j) =>
          typeof j === "string" ? j.toUpperCase() : j,
        )
      : raw?.candidate_jurisdictions,
  };
  const parsed = CompareInput.safeParse(normalised);
  if (!parsed.success) {
    return {
      content: JSON.stringify({
        error: "Invalid comparison input",
        code: "INVALID_INPUT",
        issues: parsed.error.issues.map((i) => i.path.join(".")),
      }),
      isError: true,
    };
  }

  const jurisdictions =
    parsed.data.candidate_jurisdictions &&
    parsed.data.candidate_jurisdictions.length > 0
      ? parsed.data.candidate_jurisdictions
      : DEFAULT_COMPARE_JURISDICTIONS;
  const criteria =
    parsed.data.criteria && parsed.data.criteria.length > 0
      ? parsed.data.criteria
      : [...DEFAULT_CRITERIA];

  const matrix: Array<{
    jurisdiction: string;
    cells: Array<{
      criterion: string;
      match: CriterionMatch | null;
    }>;
  }> = [];

  for (const jd of jurisdictions) {
    const cells = criteria.map((c) => ({
      criterion: c,
      match: findCriterionMatch(jd, c),
    }));
    matrix.push({ jurisdiction: jd, cells });
  }

  // Coverage stats so the model can flag holes honestly.
  const total = matrix.length * criteria.length;
  const filled = matrix.reduce(
    (acc, row) => acc + row.cells.filter((c) => c.match !== null).length,
    0,
  );

  const payload = {
    drafting_mode: "jurisdiction_comparison",
    operator_type: parsed.data.operator_type ?? null,
    jurisdictions,
    criteria,
    coverage_pct: Math.round((filled / total) * 100),
    matrix,
    drafting_directives: [
      "Render the matrix as a markdown table: rows = jurisdictions, columns = criteria.",
      "Each cell with a match: cite [ATLAS-ID] inline. Cells with match=null: render 'Keine Daten' (DE) / 'No data' (EN).",
      "Below the table: 1-2 sentences per criterion summarising the cross-jurisdiction pattern (e.g. '5-year PMD: US/UK/FR 5y; DE/IT 25y until WeltraumG-Entwurf').",
      "Wrap the final comparison with the legal-review disclaimer.",
    ],
  };

  return { content: JSON.stringify(payload), isError: false };
}

// ─── get_filing_deadlines ────────────────────────────────────────────
//
// Time-aware companion to the static-corpus tools. Combines two data
// sources: (a) `regulatoryDeadlines` for recurring/launch-relative
// filings (annual reports, quarterly data submissions, EOL notices,
// ITU windows), and (b) `REGULATION_TIMELINE` for one-time
// lifecycle-events (EU Space Act effective dates, transition windows,
// FCC rule changes).
//
// Operator-type → applicableTo code mapping mirrors the dataset's
// existing string codes (SCO/LO/EO_MISSION/PRS_USER/ALL). Pass-through
// when the agent supplies no operator_type.

const FilingDeadlinesInput = z.object({
  jurisdiction: z.string().min(2).max(5).optional(),
  operator_type: z
    .enum([
      "satellite_operator",
      "launch_provider",
      "ground_segment",
      "in_orbit_services",
      "constellation_operator",
      "earth_observation",
    ])
    .optional(),
  horizon_days: z.number().int().min(7).max(1825).optional(),
});

const OPERATOR_CODE_MAP: Record<string, ReadonlySet<string>> = {
  satellite_operator: new Set(["SCO", "ALL"]),
  launch_provider: new Set(["LO", "ALL"]),
  ground_segment: new Set(["ALL"]),
  in_orbit_services: new Set(["SCO", "ALL"]),
  constellation_operator: new Set(["SCO", "ALL"]),
  earth_observation: new Set(["EO_MISSION", "SCO", "ALL"]),
};

/**
 * Heuristic: extract the jurisdiction tag from a regulatory reference
 * string. "ESA Convention Art. XI" → "INT", "EU Space Act Art. 50-54"
 * → "EU", "FCC Part 25" → "US", "ITU Radio Regulations" → "INT".
 * Returns null when nothing matches — caller treats null as
 * "applies broadly".
 */
function inferDeadlineJurisdiction(d: RegulatoryDeadline): string | null {
  const s = `${d.regulatoryRef} ${d.title}`.toLowerCase();
  if (/\beu\b|european union|eu space act|copernicus|galileo/.test(s))
    return "EU";
  if (
    /\bun\b|registration convention|liability convention|outer space treaty|copuos/.test(
      s,
    )
  )
    return "INT";
  if (/itu|international telecommunication/.test(s)) return "INT";
  if (/\besa\b|european space agency/.test(s)) return "INT";
  if (/\bfcc\b|us\b|noaa|nasa|faa/.test(s)) return "US";
  if (/\buk\b|united kingdom|ofcom|caa/.test(s)) return "UK";
  if (/\bbafa\b|bnetza|bmwk|deutsch/.test(s)) return "DE";
  if (/\bcnes\b|france|frança/.test(s)) return "FR";
  return null;
}

/** ISO date for the next occurrence of a recurring annual deadline. */
function nextAnnualOccurrence(month: number, day: number): Date {
  const now = new Date();
  const candidate = new Date(now.getFullYear(), month - 1, day);
  if (candidate.getTime() < now.getTime()) {
    return new Date(now.getFullYear() + 1, month - 1, day);
  }
  return candidate;
}

function getFilingDeadlines(args: { input: unknown }): AtlasToolResult {
  const parsed = FilingDeadlinesInput.safeParse(args.input);
  if (!parsed.success) {
    return {
      content: JSON.stringify({
        error: "Invalid tool input",
        code: "INVALID_INPUT",
        issues: parsed.error.flatten(),
      }),
      isError: true,
    };
  }
  const horizon = parsed.data.horizon_days ?? 365;
  const targetJur = parsed.data.jurisdiction?.toUpperCase();
  const opCodes = parsed.data.operator_type
    ? OPERATOR_CODE_MAP[parsed.data.operator_type]
    : null;

  const now = new Date();
  const horizonEnd = new Date(now.getTime() + horizon * 24 * 60 * 60 * 1000);

  // ── Bucket A: recurring + launch-relative deadlines ──
  const recurring = regulatoryDeadlines
    .filter((d) => {
      // Operator-type filter (allow when no opCodes were passed).
      if (opCodes) {
        const hits = d.applicableTo.some((code) => opCodes.has(code));
        if (!hits) return false;
      }
      // Jurisdiction filter — only when caller scoped to a specific JD.
      // Otherwise return everything; the agent can scope to a JD later.
      if (targetJur) {
        const inferred = inferDeadlineJurisdiction(d);
        if (inferred && inferred !== targetJur) {
          // Always keep INT/EU because they cross-cut.
          if (inferred !== "INT" && inferred !== "EU") return false;
        }
      }
      return true;
    })
    .map((d) => {
      // Concrete next-occurrence ISO when we can compute one.
      let nextOccurrence: string | null = null;
      let kind:
        | "annual"
        | "quarterly"
        | "yearly"
        | "launch_relative"
        | "irregular" = "irregular";

      if (d.dueDate) {
        const next = nextAnnualOccurrence(d.dueDate.month, d.dueDate.day);
        nextOccurrence = next.toISOString().slice(0, 10);
        kind = "annual";
      } else if (d.recurrence?.includes("QUARTERLY")) {
        kind = "quarterly";
      } else if (d.recurrence?.includes("YEARLY")) {
        kind = "yearly";
      } else if (
        d.offsetAfterLaunch !== undefined ||
        d.offsetBeforeLaunch !== undefined
      ) {
        kind = "launch_relative";
      }
      return {
        id: d.id,
        title: d.title,
        description: d.description,
        kind,
        next_occurrence: nextOccurrence,
        recurrence: d.recurrence ?? null,
        offset_before_launch_days: d.offsetBeforeLaunch ?? null,
        offset_after_launch_days: d.offsetAfterLaunch ?? null,
        category: d.category,
        priority: d.priority,
        regulatory_ref: d.regulatoryRef,
        applicable_to: d.applicableTo,
        penalty_info: d.penaltyInfo ?? null,
        inferred_jurisdiction: inferDeadlineJurisdiction(d),
      };
    })
    .filter((row) => {
      // Keep recurring without dates (lifecycle), but for annual events
      // honour the horizon.
      if (row.kind === "annual" && row.next_occurrence) {
        const t = new Date(row.next_occurrence).getTime();
        return t >= now.getTime() && t <= horizonEnd.getTime();
      }
      return true;
    });

  // ── Bucket B: one-time regulatory-lifecycle events ──
  const lifecycle = REGULATION_TIMELINE.filter((p) => {
    if (p.status === "superseded") return false;
    const eff = new Date(p.effectiveDate).getTime();
    if (Number.isNaN(eff)) return false;
    if (eff < now.getTime()) return false;
    return eff <= horizonEnd.getTime();
  })
    .filter((p) => {
      if (!targetJur) return true;
      const text = `${p.regulation} ${p.applicableTo.join(" ")}`.toLowerCase();
      const targetLower = targetJur.toLowerCase();
      // Conservative — keep EU + universal entries when the user
      // narrowed to a member state.
      if (text.includes("eu ") || p.applicableTo.includes("all_eu_operators"))
        return true;
      return text.includes(targetLower);
    })
    .map((p: RegulationPhase) => ({
      id: p.id,
      title: p.regulation,
      description: p.notes,
      kind: "lifecycle" as const,
      effective_date: p.effectiveDate,
      transition_end_date: p.transitionEndDate ?? null,
      status: p.status,
      applicable_to: p.applicableTo,
      superseded_by: p.supersededBy ?? null,
    }))
    .sort(
      (a, b) =>
        new Date(a.effective_date).getTime() -
        new Date(b.effective_date).getTime(),
    );

  // ── Headlines: closest 3 dated events for the agent to highlight ──
  const datedRecurring = recurring
    .filter((r) => r.next_occurrence)
    .sort(
      (a, b) =>
        new Date(a.next_occurrence as string).getTime() -
        new Date(b.next_occurrence as string).getTime(),
    );
  const headlines = [
    ...datedRecurring.slice(0, 3).map((r) => ({
      kind: r.kind,
      title: r.title,
      date: r.next_occurrence,
      priority: r.priority,
    })),
    ...lifecycle.slice(0, 2).map((l) => ({
      kind: l.kind,
      title: l.title,
      date: l.effective_date,
      priority: "HIGH",
    })),
  ];

  const payload = {
    horizon_days: horizon,
    horizon_until: horizonEnd.toISOString().slice(0, 10),
    scope: {
      jurisdiction: targetJur ?? null,
      operator_type: parsed.data.operator_type ?? null,
    },
    headlines,
    recurring,
    lifecycle,
    counts: {
      recurring: recurring.length,
      lifecycle: lifecycle.length,
    },
    drafting_directives: [
      "Render as a chronologically-sorted list grouped by month, NOT a generic table.",
      "Annual deadlines go first (concrete dates), then launch-relative, then quarterly/yearly recurring without fixed dates, then lifecycle events.",
      "For launch-relative deadlines, write 'X days before launch' / 'Y days after launch' explicitly — don't fake a date.",
      "Cite the regulatory_ref string verbatim next to each entry.",
      "If horizon_days is 30 or 90, lead with: 'Within the next [N] days, the following filings come due:'.",
      "Wrap the final answer with the legal-review disclaimer.",
    ],
  };

  return { content: JSON.stringify(payload), isError: false };
}

// ─── summarize_changes_since ────────────────────────────────────────
//
// "What's changed?" — the agent's stateful counterpart. Pulls deltas
// from THREE existing data sources without per-user tracking:
//   (a) LegalSource.amendments[] — statute / regulation revisions
//   (b) REGULATION_TIMELINE — lifecycle events (effective dates,
//       transition windows, supersession)
//   (c) AtlasUpdate (DB) — admin-published regulatory feed entries
//
// Agent supplies the 'since' date from conversational context
// ("since my last visit on March 1" → 2026-03-01).

const ChangesInput = z.object({
  since: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "must be ISO date YYYY-MM-DD"),
  jurisdiction: z.string().min(2).max(5).optional(),
  source_ids: z.array(z.string().min(2).max(80)).max(20).optional(),
});

interface AmendmentEntry {
  source_id: string;
  source_title: string;
  jurisdiction: string;
  date: string;
  reference: string;
  summary: string;
  affected_sections?: string[];
  source_url?: string;
}

interface LifecycleEntry {
  id: string;
  regulation: string;
  status: RegulationPhase["status"];
  effective_date: string;
  transition_end_date: string | null;
  superseded_by: string | null;
  applicable_to: string[];
}

async function summarizeChangesSince(args: {
  input: unknown;
}): Promise<AtlasToolResult> {
  const parsed = ChangesInput.safeParse(args.input);
  if (!parsed.success) {
    return {
      content: JSON.stringify({
        error: "Invalid tool input",
        code: "INVALID_INPUT",
        issues: parsed.error.flatten(),
      }),
      isError: true,
    };
  }

  const sinceDate = new Date(parsed.data.since);
  if (Number.isNaN(sinceDate.getTime())) {
    return {
      content: JSON.stringify({
        error: "Invalid date",
        code: "INVALID_INPUT",
      }),
      isError: true,
    };
  }
  const sinceMs = sinceDate.getTime();
  const targetJur = parsed.data.jurisdiction?.toUpperCase();
  const idScope = parsed.data.source_ids?.length
    ? new Set(parsed.data.source_ids)
    : null;

  // ── (a) Amendments across the corpus ──
  const amendments: AmendmentEntry[] = [];
  for (const source of ALL_SOURCES) {
    if (idScope && !idScope.has(source.id)) continue;
    if (targetJur && source.jurisdiction !== targetJur) {
      // Keep cross-cutting INT/EU instruments when the user scoped
      // to a Member State — Member-State counsel cares about EU
      // amendments too.
      if (source.jurisdiction !== "INT" && source.jurisdiction !== "EU") {
        continue;
      }
    }
    if (!source.amendments) continue;
    for (const a of source.amendments) {
      const t = new Date(a.date).getTime();
      if (Number.isNaN(t) || t <= sinceMs) continue;
      amendments.push({
        source_id: source.id,
        source_title: source.title_en,
        jurisdiction: source.jurisdiction,
        date: a.date,
        reference: a.reference,
        summary: a.summary,
        affected_sections: a.affected_sections,
        source_url: a.source_url,
      });
    }
  }

  // ── (b) Lifecycle events from REGULATION_TIMELINE ──
  const lifecycle: LifecycleEntry[] = REGULATION_TIMELINE.filter((p) => {
    const t = new Date(p.effectiveDate).getTime();
    if (Number.isNaN(t)) return false;
    if (t <= sinceMs) return false;
    if (t > Date.now()) return false; // only past events; future deadlines belong to get_filing_deadlines
    if (targetJur) {
      const text = `${p.regulation} ${p.applicableTo.join(" ")}`.toLowerCase();
      if (text.includes("eu ") || p.applicableTo.includes("all_eu_operators")) {
        // keep — EU events cross-apply
      } else if (!text.includes(targetJur.toLowerCase())) {
        return false;
      }
    }
    return true;
  }).map((p: RegulationPhase) => ({
    id: p.id,
    regulation: p.regulation,
    status: p.status,
    effective_date: p.effectiveDate,
    transition_end_date: p.transitionEndDate ?? null,
    superseded_by: p.supersededBy ?? null,
    applicable_to: p.applicableTo,
  }));

  // ── (c) AtlasUpdate (DB-published regulatory feed) ──
  // Best-effort — if Prisma table is empty or the migration isn't
  // applied (test env), we return [] and the agent narrates only
  // amendments + lifecycle.
  let updates: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    jurisdiction: string | null;
    sourceId: string | null;
    publishedAt: string;
  }> = [];
  try {
    const dbUpdates = await prisma.atlasUpdate.findMany({
      where: {
        isPublished: true,
        publishedAt: { gt: sinceDate },
        ...(targetJur && { jurisdiction: targetJur }),
        ...(idScope && {
          sourceId: { in: Array.from(idScope) },
        }),
      },
      orderBy: { publishedAt: "desc" },
      take: 50,
    });
    updates = dbUpdates.map((u) => ({
      id: u.id,
      title: u.title,
      description: u.description,
      category: u.category,
      jurisdiction: u.jurisdiction,
      sourceId: u.sourceId,
      publishedAt: u.publishedAt.toISOString().slice(0, 10),
    }));
  } catch (err) {
    logger.warn("[atlas] summarize_changes_since: AtlasUpdate query failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const totalEntries = amendments.length + lifecycle.length + updates.length;

  type Headline = {
    kind: "amendment" | "lifecycle" | "update";
    title: string;
    date: string;
    source_id?: string;
  };
  const allHeadlines: Headline[] = [
    ...amendments.map((a) => ({
      kind: "amendment" as const,
      title: `${a.source_id} — ${a.summary}`,
      date: a.date,
      source_id: a.source_id,
    })),
    ...lifecycle.map((l) => ({
      kind: "lifecycle" as const,
      title: l.regulation,
      date: l.effective_date,
      source_id: l.id,
    })),
    ...updates.map((u) => ({
      kind: "update" as const,
      title: u.title,
      date: u.publishedAt,
      source_id: u.sourceId ?? undefined,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const payload = {
    since: parsed.data.since,
    until: new Date().toISOString().slice(0, 10),
    scope: {
      jurisdiction: targetJur ?? null,
      source_ids: parsed.data.source_ids ?? null,
    },
    headlines: allHeadlines,
    counts: {
      amendments: amendments.length,
      lifecycle: lifecycle.length,
      updates: updates.length,
      total: totalEntries,
    },
    amendments,
    lifecycle,
    updates,
    drafting_directives: [
      "Lead with: 'Between [since] and [until], N regulatory developments occurred:' followed by the headline list.",
      "Group full payload by month, most-recent-first.",
      "Cite each amendment with the source's [ATLAS-ID] and quote the reference verbatim.",
      "When totalEntries is 0, say plainly 'No changes recorded in the catalogue between [since] and [until]' — do NOT pad with synthesis.",
      "Wrap the final answer with the legal-review disclaimer.",
    ],
  };

  return { content: JSON.stringify(payload), isError: false };
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
    case "draft_authorization_application":
      return draftAuthorizationApplication(args);
    case "draft_compliance_brief":
      return draftComplianceBrief(args);
    case "compare_jurisdictions_for_filing":
      return compareJurisdictionsForFiling(args);
    case "get_filing_deadlines":
      return getFilingDeadlines(args);
    case "summarize_changes_since":
      return summarizeChangesSince(args);
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
