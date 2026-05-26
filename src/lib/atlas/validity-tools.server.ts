import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Validity Tools (Sprint 4, 2026-05-12).
 *
 * Three lawyer-facing tools that surface live source-validity:
 *   - check_article_status(articleOrSourceId) — in_force / amended /
 *     repealed / pending / needs_review with last_verified date,
 *     amendment chain, source URL.
 *   - get_recent_norm_changes(jurisdiction?, daysBack?) — list sources
 *     whose `last_verified` falls within the window OR whose status
 *     transitioned to non-in_force.
 *   - find_related_norms(sourceId) — uses related_sources +
 *     amends/amended_by/superseded_by edges.
 *
 * MVP scope: status data comes from the static corpus (LegalSource
 * fields: status, last_verified, amended_by, superseded_by). Real-time
 * EUR-Lex / gesetze-im-internet polling is deferred to a later sprint
 * (large effort: parser maintenance, robots.txt, regional rate-limits).
 *
 * The tools produce structured data the chat-engine renders as
 * citation badges (🟢 / 🟡 / ⚠️) under each Atlas-cited source.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type Anthropic from "@anthropic-ai/sdk";
import {
  ALL_SOURCES,
  getLegalSourceById,
  type LegalSource,
} from "@/data/legal-sources";
import { prisma } from "@/lib/prisma";

/* ── Status taxonomy ─────────────────────────────────────────────────── */

export type ValidityBadge =
  | "in_force"
  | "needs_review" // in_force but last_verified is stale
  | "pending" // draft, proposed, planned
  | "amended" // superseded but with newer version pointed to
  | "repealed" // expired / not_ratified / superseded with no successor
  | "unknown"; // citation didn't resolve to a corpus entry

const STALE_DAYS = 365;

export interface ValidityCheck {
  /** The (possibly normalised) source-id we resolved against. */
  sourceId: string;
  /** Original citation as written by the LLM (may include §, Art., etc). */
  citation: string;
  /** Validity badge for the UI. */
  badge: ValidityBadge;
  /** Source title for tooltip. */
  title: string | null;
  /** Status from the corpus (may differ from badge — e.g. in_force +
   *  stale → badge=needs_review, status=in_force). */
  status: LegalSource["status"] | null;
  lastVerified: string | null;
  staleDays: number | null;
  amendedBy: string[] | null;
  supersededBy: string | null;
  sourceUrl: string | null;
}

/* ── Public helpers (also re-used by citation-extractor) ─────────────── */

/**
 * Parse "DE-WeltraumG-§1" → "DE-WeltraumG-§1" first; if that doesn't
 * exist as a source-id, fall back to the parent ("DE-WeltraumG"). The
 * corpus mostly indexes at the source level; provision/article suffixes
 * are commonly attached by hand by the LLM. We try a few normalisation
 * strategies before giving up.
 */
export function resolveSourceId(citation: string): {
  sourceId: string;
  source: LegalSource | null;
} {
  /* 1. Direct hit. */
  const direct = getLegalSourceById(citation);
  if (direct) return { sourceId: citation, source: direct };

  /* 2. Strip trailing §-clause. */
  const withoutParagraph = citation.replace(/-§.*$/i, "");
  if (withoutParagraph !== citation) {
    const hit = getLegalSourceById(withoutParagraph);
    if (hit) return { sourceId: withoutParagraph, source: hit };
  }

  /* 3. Strip trailing -Art. clause. */
  const withoutArticle = citation.replace(/-Art\..*$/i, "");
  if (withoutArticle !== citation) {
    const hit = getLegalSourceById(withoutArticle);
    if (hit) return { sourceId: withoutArticle, source: hit };
  }

  /* AUDIT-FIX L6: The case-insensitive prefix-startsWith fallback
     was removed. Two reasons:
       1. Combined with the citation-extractor regex (now tightened to
          forbid path-traversal chars), the bidirectional `startsWith`
          allowed a citation `DE-X` to silently resolve to any source
          whose id begins with `DE-X*`, hiding model errors.
       2. The §-clause and -Art. clause strips above (steps 2–3) already
          handle the legitimate "extra suffix" case. The bidirectional
          startsWith mainly produced false-positive resolutions that
          made bad citations look valid in the UI.
     Prefer an explicit `unknown` badge over a misleading fuzzy match. */

  return { sourceId: citation, source: null };
}

/**
 * Build a ValidityCheck for a single citation. Pure function; no I/O.
 */
export function checkValidity(citation: string): ValidityCheck {
  const { sourceId, source } = resolveSourceId(citation);
  if (!source) {
    return {
      sourceId,
      citation,
      badge: "unknown",
      title: null,
      status: null,
      lastVerified: null,
      staleDays: null,
      amendedBy: null,
      supersededBy: null,
      sourceUrl: null,
    };
  }

  const lastVerified = source.last_verified;
  const staleDays = computeStaleDays(lastVerified);

  let badge: ValidityBadge;
  switch (source.status) {
    case "in_force":
      badge =
        staleDays !== null && staleDays > STALE_DAYS
          ? "needs_review"
          : "in_force";
      break;
    case "draft":
    case "proposed":
    case "planned":
      badge = "pending";
      break;
    case "superseded":
      badge = source.superseded_by ? "amended" : "repealed";
      break;
    case "expired":
    case "not_ratified":
      badge = "repealed";
      break;
    default:
      badge = "unknown";
  }

  return {
    sourceId,
    citation,
    badge,
    title: source.title_en ?? source.title_local ?? null,
    status: source.status,
    lastVerified,
    staleDays,
    amendedBy: source.amended_by ?? null,
    supersededBy: source.superseded_by ?? null,
    sourceUrl: source.source_url ?? null,
  };
}

function computeStaleDays(lastVerifiedIso: string | undefined): number | null {
  if (!lastVerifiedIso) return null;
  const lv = new Date(lastVerifiedIso).getTime();
  if (Number.isNaN(lv)) return null;
  const days = Math.floor((Date.now() - lv) / (1000 * 60 * 60 * 24));
  return days >= 0 ? days : 0;
}

/* ── Tool definitions (Anthropic-tool format) ────────────────────────── */

export const VALIDITY_TOOLS: Anthropic.Tool[] = [
  {
    name: "check_article_status",
    description:
      "Returns live validity status for a specific Atlas legal-source ID or citation (e.g. 'DE-WeltraumG', 'EU-NIS2-Art.21', 'INT-OST-1967'). Use this when the lawyer asks 'Is X still in force?' / 'Wurde X geändert?' / 'Status von X?'. Returns: status (in_force/amended/repealed/pending/needs_review), last_verified date, amendment chain, official URL.",
    input_schema: {
      type: "object",
      properties: {
        articleOrSourceId: {
          type: "string",
          description:
            "The Atlas source-ID or article-citation. Examples: 'DE-WeltraumG-2024', 'EU-NIS2-Art.21', 'INT-OST-1967'. Tolerates §-suffixes and case differences.",
        },
      },
      required: ["articleOrSourceId"],
    },
  },
  {
    name: "get_recent_norm_changes",
    description:
      "Lists Atlas-corpus sources whose status changed recently OR whose 'last_verified' date falls within the lookback window. Use when lawyer asks 'Was hat sich kürzlich in DE geändert?' / 'Welche Normen wurden in der letzten Woche aktualisiert?'. Returns up to 25 entries with badge + lastVerified.",
    input_schema: {
      type: "object",
      properties: {
        jurisdiction: {
          type: "string",
          description:
            "Optional ISO-2 jurisdiction code to filter by (e.g. 'DE', 'EU', 'INT'). Leave empty for all.",
        },
        daysBack: {
          type: "number",
          description: "Lookback window in days. Default 90.",
        },
        onlyChanged: {
          type: "boolean",
          description:
            "If true, return only sources with status != in_force OR with amendment edges.",
        },
      },
    },
  },
  {
    name: "find_related_norms",
    description:
      "Returns the 'amendment graph' for a source — its amendments, supersessions, and explicitly-related sources. Use when lawyer asks 'Welche Normen sind mit X verbunden?' / 'Was ändert X?' / 'Welche Vorgängerversion gilt noch?'.",
    input_schema: {
      type: "object",
      properties: {
        sourceId: {
          type: "string",
          description:
            "The Atlas source-ID to query (e.g. 'DE-WeltraumG', 'EU-NIS2'). Tolerates §-suffixes.",
        },
      },
      required: ["sourceId"],
    },
  },
  {
    name: "track_amendment",
    description:
      "Subscribe the calling user to amendment notifications for a specific Atlas source OR a whole jurisdiction. When the source-check cron later detects a substantive change and an admin approves it, the subscriber gets an in-app notification (SOURCE_AMENDED or JURISDICTION_UPDATE). Use when the lawyer asks 'Benachrichtige mich, wenn sich X ändert' / 'Track this regulation' / 'Watch for amendments to ...'. Idempotent — re-subscribing returns the existing subscription.",
    input_schema: {
      type: "object",
      properties: {
        targetId: {
          type: "string",
          description:
            "For targetType=SOURCE: the Atlas source-ID (e.g. 'DE-WeltraumG', 'EU-NIS2'). Must exist in the corpus. For targetType=JURISDICTION: the ISO-2 code ('DE', 'FR', 'EU', 'INT').",
        },
        targetType: {
          type: "string",
          enum: ["SOURCE", "JURISDICTION"],
          description:
            "Whether to watch a specific source or every change in a whole jurisdiction. Default: SOURCE.",
        },
      },
      required: ["targetId"],
    },
  },
];

const VALIDITY_TOOL_NAMES = VALIDITY_TOOLS.map((t) => t.name) as string[];

export function isValidityToolName(name: string): boolean {
  return VALIDITY_TOOL_NAMES.includes(name);
}

/* ── Executor ────────────────────────────────────────────────────────── */

export interface ValidityToolResult {
  content: string;
  isError: boolean;
}

/** Optional caller-identity context. Required by `track_amendment`
 *  which writes a row keyed on (userId, organizationId). The other
 *  three tools are pure-data lookups against the static corpus and
 *  ignore this argument. Kept optional so existing call-sites that
 *  pass only (name, input) keep working. */
export interface ValidityToolContext {
  callerUserId: string;
  callerOrgId: string;
}

export async function executeValidityTool(
  name: string,
  input: unknown,
  ctx?: ValidityToolContext,
): Promise<ValidityToolResult> {
  switch (name) {
    case "check_article_status":
      return runCheckArticleStatus(input);
    case "get_recent_norm_changes":
      return runGetRecentNormChanges(input);
    case "find_related_norms":
      return runFindRelatedNorms(input);
    case "track_amendment":
      return runTrackAmendment(input, ctx);
    default:
      return {
        content: JSON.stringify({ error: `Unknown validity tool: ${name}` }),
        isError: true,
      };
  }
}

interface CheckStatusInput {
  articleOrSourceId: string;
}

function runCheckArticleStatus(rawInput: unknown): ValidityToolResult {
  const i = rawInput as CheckStatusInput;
  if (!i?.articleOrSourceId) {
    return {
      content: JSON.stringify({ error: "articleOrSourceId required" }),
      isError: true,
    };
  }
  const check = checkValidity(i.articleOrSourceId);
  if (check.badge === "unknown") {
    return {
      content: JSON.stringify({
        ...check,
        message:
          "Citation did not resolve to an Atlas-corpus source. Try search_legal_sources() with a free-text query, or call get_legal_source_by_id with the canonical source-id.",
      }),
      isError: false,
    };
  }
  return {
    content: JSON.stringify({
      ...check,
      humanLabel: humanLabelFor(check.badge),
      stalenessAdvisory:
        check.staleDays !== null && check.staleDays > STALE_DAYS
          ? `Source's last_verified is ${check.staleDays} days old (>${STALE_DAYS}-day threshold). Re-verify against the official portal before quoting in a binding filing.`
          : null,
    }),
    isError: false,
  };
}

interface RecentChangesInput {
  jurisdiction?: string;
  daysBack?: number;
  onlyChanged?: boolean;
}

function runGetRecentNormChanges(rawInput: unknown): ValidityToolResult {
  const i = (rawInput ?? {}) as RecentChangesInput;
  const daysBack = typeof i.daysBack === "number" ? i.daysBack : 90;
  const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000;
  const jur = i.jurisdiction?.toUpperCase();

  const hits: ValidityCheck[] = [];
  for (const source of ALL_SOURCES) {
    if (jur && source.jurisdiction !== jur) continue;
    const lv = new Date(source.last_verified ?? "").getTime();
    const recentlyVerified = !Number.isNaN(lv) && lv >= cutoff;
    const isChanged =
      source.status !== "in_force" ||
      (source.amended_by?.length ?? 0) > 0 ||
      !!source.superseded_by;
    if (i.onlyChanged && !isChanged) continue;
    if (!recentlyVerified && !isChanged) continue;
    hits.push(checkValidity(source.id));
    if (hits.length >= 25) break;
  }

  return {
    content: JSON.stringify({
      query: {
        jurisdiction: jur ?? null,
        daysBack,
        onlyChanged: !!i.onlyChanged,
      },
      count: hits.length,
      results: hits,
      note: "MVP returns sources from the static Atlas corpus. Real-time EUR-Lex / national-portal polling is on the roadmap.",
    }),
    isError: false,
  };
}

interface RelatedNormsInput {
  sourceId: string;
}

function runFindRelatedNorms(rawInput: unknown): ValidityToolResult {
  const i = rawInput as RelatedNormsInput;
  if (!i?.sourceId) {
    return {
      content: JSON.stringify({ error: "sourceId required" }),
      isError: true,
    };
  }
  const { source } = resolveSourceId(i.sourceId);
  if (!source) {
    return {
      content: JSON.stringify({
        sourceId: i.sourceId,
        related: [],
        message: "Source-ID not found in corpus.",
      }),
      isError: false,
    };
  }
  const collect = (ids: string[] | undefined) =>
    (ids ?? [])
      .map((id) => {
        const v = checkValidity(id);
        return v.badge === "unknown" ? null : v;
      })
      .filter((v): v is ValidityCheck => v !== null);

  return {
    content: JSON.stringify({
      sourceId: source.id,
      title: source.title_en ?? source.title_local,
      jurisdiction: source.jurisdiction,
      currentStatus: checkValidity(source.id),
      amends: collect(source.amends ? [source.amends] : undefined),
      amendedBy: collect(source.amended_by),
      supersededBy: collect(
        source.superseded_by ? [source.superseded_by] : undefined,
      ),
      relatedSources: collect(source.related_sources?.slice(0, 12)),
    }),
    isError: false,
  };
}

function humanLabelFor(badge: ValidityBadge): string {
  switch (badge) {
    case "in_force":
      return "In force";
    case "needs_review":
      return "In force (last_verified stale)";
    case "pending":
      return "Pending / draft";
    case "amended":
      return "Amended (newer version available)";
    case "repealed":
      return "Repealed / expired";
    case "unknown":
      return "Unknown / not in corpus";
  }
}

/* ── track_amendment (T1.B.11, 2026-05-26) ──────────────────────────── */

interface TrackAmendmentInput {
  targetId: string;
  targetType?: "SOURCE" | "JURISDICTION";
}

async function runTrackAmendment(
  rawInput: unknown,
  ctx: ValidityToolContext | undefined,
): Promise<ValidityToolResult> {
  if (!ctx) {
    return {
      content: JSON.stringify({
        error:
          "Auth context required (callerUserId + callerOrgId). Pass via the chat-engine which resolves Atlas auth automatically.",
      }),
      isError: true,
    };
  }
  const i = rawInput as TrackAmendmentInput;
  if (!i?.targetId) {
    return {
      content: JSON.stringify({ error: "targetId required" }),
      isError: true,
    };
  }
  const targetType = i.targetType ?? "SOURCE";
  if (targetType !== "SOURCE" && targetType !== "JURISDICTION") {
    return {
      content: JSON.stringify({
        error: `Invalid targetType: ${targetType}. Allowed: SOURCE | JURISDICTION.`,
      }),
      isError: true,
    };
  }

  /* SOURCE-target hygiene: must exist in the static corpus. Mirrors
     the upsert route at /api/atlas/alerts/subscriptions so we don't
     silently persist orphan subscriptions on typos / stale ids. */
  if (targetType === "SOURCE") {
    const { source } = resolveSourceId(i.targetId);
    if (!source) {
      return {
        content: JSON.stringify({
          error: `Unknown sourceId '${i.targetId}'. Use search_legal_sources or check_article_status to find the canonical id first.`,
        }),
        isError: true,
      };
    }
  }

  try {
    const sub = await prisma.atlasAlertSubscription.upsert({
      where: {
        userId_targetType_targetId: {
          userId: ctx.callerUserId,
          targetType,
          targetId: i.targetId,
        },
      },
      create: {
        userId: ctx.callerUserId,
        organizationId: ctx.callerOrgId,
        targetType,
        targetId: i.targetId,
      },
      /* Idempotent: re-subscribing returns the existing row. */
      update: {},
    });
    return {
      content: JSON.stringify({
        subscriptionId: sub.id,
        targetType: sub.targetType,
        targetId: sub.targetId,
        createdAt: sub.createdAt,
        message: `You'll be notified when an amendment to ${i.targetId} (${targetType}) is approved by an admin. Manage your subscriptions under /atlas/settings/alerts.`,
      }),
      isError: false,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: JSON.stringify({
        error: `Subscription write failed: ${msg}`,
      }),
      isError: true,
    };
  }
}
