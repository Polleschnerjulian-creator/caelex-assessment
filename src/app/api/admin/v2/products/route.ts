/**
 * GET /api/admin/v2/products?product=atlas|comply|trade|scholar|pharos&range=7d|30d|90d
 *   →  ProductExplorerResponse
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The super-admin "Product Explorer": pick ONE product and see that product's
 * usage, AI spend, value-outcomes, by-organization breakdown, and entitlement —
 * the screen the founder uses to decide WHICH PRODUCT TO DOUBLE DOWN ON.
 *
 * 🔒 GDPR — AGGREGATE + ORGANIZATION-LEVEL ONLY (the founder explicitly chose
 * this granularity, and it is NON-NEGOTIABLE). This route NEVER selects,
 * computes, returns, or renders any INDIVIDUAL user identity:
 *   • "Active users" is COUNT(DISTINCT userId) — a single NUMBER per product/org.
 *     The distinct user-ids are collected into a server-side Set purely to take
 *     its `.size`; the ids THEMSELVES never leave this function and never enter
 *     the JSON payload.
 *   • The by-organization breakdown carries the ORGANIZATION NAME (a legal
 *     entity — fine under legitimate interest) + aggregate counts only. No
 *     per-user rows, no emails, no names of people, no userId values.
 *   • Every Prisma `select` below is projected to the MINIMUM keys the aggregate
 *     needs; user-id columns are read only to feed a distinct-COUNT Set, never to
 *     return them. The shaped payload (ProductExplorerResponse) contains ZERO
 *     user PII.
 * If a query would expose an identifiable person, it is not written here.
 *
 * Auth: super-admin only (requireSuperAdminApi). Every authorized cross-tenant
 * read is audit-logged (logSuperAdminAccess) AFTER the gate passes. The Prisma
 * reads are wrapped in withCache (5 min) so a burst of dashboard refreshes
 * collapses to a single scan per (product, range).
 *
 * WHY raw domain tables (not the PII-free analytics rollups): the rollups don't
 * carry the per-product regulatory value-outcomes / per-org AI spend this screen
 * needs, and the events that would feed them are largely unwired. We therefore
 * read the authoritative domain rows directly — but, as above, the payload we
 * RETURN is still PII-free (integer counts grouped by product / org only).
 */

import { NextResponse } from "next/server";
import { startOfDay, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { withCache } from "@/lib/cache.server";
import {
  requireSuperAdminApi,
  logSuperAdminAccess,
} from "@/lib/admin-auth.server";
import { ADMIN_RANGE_DAYS, isAdminRange } from "@/lib/admin/analytics-types";
import {
  buildProductExplorer,
  isExplorerProduct,
  type ExplorerProduct,
  type ProductExplorerRaw,
  type ProductExplorerResponse,
  type OutcomeCountRaw,
  type OrgAggregateRaw,
} from "@/lib/admin/product-explorer";

// Node runtime: Prisma + the audit hash-chain require Node, not Edge.
export const runtime = "nodejs";
// Live operational metrics — never serve from Next's full-route cache.
export const dynamic = "force-dynamic";

/**
 * The canonical Sonnet-4.6 INPUT rate ($/1M tokens), used to ESTIMATE Astra spend
 * from its token total (Astra persists no USD). Mirrors `PRICE_INPUT_PER_MTOK`
 * in `src/lib/atlas/cost-estimator.ts` (the engine's own cost source) — kept as a
 * LOCAL admin-surface constant rather than imported across the Atlas surface
 * boundary so this lane stays self-contained and the cross-surface pre-commit
 * guard never trips. It is the CODEBASE's existing rate, not an invented one; the
 * pure layer labels any Astra figure derived from it an explicit estimate. Astra
 * stores only a combined token total (no input/output split), so the input rate
 * is used as a conservative blended floor.
 */
const SONNET_INPUT_USD_PER_MTOK = 3.0;

/**
 * Add an organization to a per-org accumulator, tracking the org NAME, a Set of
 * distinct user-ids (for the COUNT only — ids never returned), AI spend, and a
 * raw outcome count. The Set is the GDPR-safe primitive: it yields a number.
 */
interface OrgAcc {
  orgName: string;
  userIds: Set<string>;
  spendUsd: number | null;
  outcomes: number;
}

function ensureOrg(map: Map<string, OrgAcc>, orgId: string): OrgAcc {
  let acc = map.get(orgId);
  if (!acc) {
    acc = {
      orgName: "",
      userIds: new Set<string>(),
      spendUsd: null,
      outcomes: 0,
    };
    map.set(orgId, acc);
  }
  return acc;
}

/** Project a per-org accumulator map into the PII-free OrgAggregateRaw rows the
 * pure layer expects (distinct-user COUNT via `.size`; ids dropped here). */
function projectOrgRows(map: Map<string, OrgAcc>): OrgAggregateRaw[] {
  const rows: OrgAggregateRaw[] = [];
  for (const [organizationId, acc] of map.entries()) {
    rows.push({
      organizationId,
      orgName: acc.orgName,
      activeUsers: acc.userIds.size, // ← COUNT only; user-ids never leave here
      spendUsd: acc.spendUsd,
      outcomes: acc.outcomes,
    });
  }
  return rows;
}

/** Resolve org display names for a set of org-ids in one read (name = a legal
 * entity). Returns a Map id→name; ids absent from the DB simply have no entry. */
async function resolveOrgNames(
  orgIds: Set<string>,
): Promise<Map<string, string>> {
  if (orgIds.size === 0) return new Map();
  const orgs = await prisma.organization.findMany({
    where: { id: { in: Array.from(orgIds) } },
    select: { id: true, name: true },
  });
  const map = new Map<string, string>();
  for (const o of orgs) map.set(o.id, o.name);
  return map;
}

/**
 * Count orgs entitled to a product (ACTIVE or TRIAL access) and, of those, how
 * many produced ≥1 outcome this window (the active set is supplied by the caller
 * as a Set of org-ids it already aggregated). Org-level only.
 */
async function readEntitlement(
  productCode: "COMPLY" | "TRADE" | "ATLAS" | "PHAROS" | "SCHOLAR",
  activeOrgIds: ReadonlySet<string>,
): Promise<{ entitledOrgs: number; entitledActiveOrgs: number }> {
  const entitled = await prisma.organizationProductAccess.findMany({
    where: { product: productCode, status: { in: ["ACTIVE", "TRIAL"] } },
    select: { organizationId: true },
  });
  const entitledIds = new Set(entitled.map((e) => e.organizationId));
  let active = 0;
  for (const id of entitledIds) if (activeOrgIds.has(id)) active += 1;
  return { entitledOrgs: entitledIds.size, entitledActiveOrgs: active };
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-product readers. Each returns a fully-populated ProductExplorerRaw. The
// distinct-user counts are computed from server-side Sets; user-ids never reach
// the returned shape.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ATLAS — AI lawyer surface. Usage + spend + outcomes come from AtlasMessage
 * (assistant turns), attributed to an org via its parent AtlasChat.organizationId
 * and to a user via senderUserId ?? chat.ownerUserId (for the distinct-user COUNT
 * only). Spend = Σ AtlasMessage.costUsd (REAL).
 */
async function readAtlas(
  since: Date,
  priorSince: Date,
  rangeDays: number,
  loginsCount: (slug: ExplorerProduct, s: Date) => Promise<number | null>,
): Promise<ProductExplorerRaw> {
  // Assistant turns in the window, projected to: timestamp (windowing) + the
  // org/user attribution keys + the per-message real cost.
  const [messages, priorMessages] = await Promise.all([
    prisma.atlasMessage.findMany({
      where: { role: "assistant", createdAt: { gte: since } },
      select: {
        senderUserId: true,
        costUsd: true,
        chat: { select: { organizationId: true, ownerUserId: true } },
      },
    }),
    // Prior window: ONLY the distinct-user count needs it → project the minimum.
    prisma.atlasMessage.findMany({
      where: {
        role: "assistant",
        createdAt: { gte: priorSince, lt: since },
      },
      select: {
        senderUserId: true,
        chat: { select: { ownerUserId: true } },
      },
    }),
  ]);

  const distinctUsers = new Set<string>();
  const priorUsers = new Set<string>();
  const byOrg = new Map<string, OrgAcc>();
  let totalCostUsd = 0;
  let totalMessages = 0;

  for (const m of messages) {
    totalMessages += 1;
    const cost = typeof m.costUsd === "number" ? m.costUsd : 0;
    totalCostUsd += cost;
    const userId = m.senderUserId ?? m.chat?.ownerUserId ?? null;
    if (userId) distinctUsers.add(userId);
    const orgId = m.chat?.organizationId ?? null;
    if (orgId) {
      const acc = ensureOrg(byOrg, orgId);
      if (userId) acc.userIds.add(userId);
      acc.spendUsd = (acc.spendUsd ?? 0) + cost;
      acc.outcomes += 1; // each assistant turn is one atlas_draft_produced outcome
    }
  }
  for (const m of priorMessages) {
    const userId = m.senderUserId ?? m.chat?.ownerUserId ?? null;
    if (userId) priorUsers.add(userId);
  }

  const names = await resolveOrgNames(new Set(byOrg.keys()));
  for (const [orgId, acc] of byOrg.entries())
    acc.orgName = names.get(orgId) ?? "";

  const activeOrgIds = new Set(byOrg.keys());
  const entitlement = await readEntitlement("ATLAS", activeOrgIds);

  const outcomeCounts: OutcomeCountRaw[] = [
    { outcomeId: "atlas_draft_produced", count: totalMessages },
  ];

  return {
    product: "atlas",
    rangeDays,
    activeUsers: distinctUsers.size,
    activeUsersPrior: priorUsers.size,
    logins: await loginsCount("atlas", since),
    atlasCostUsd: totalCostUsd,
    atlasMessages: totalMessages,
    astraTokens: 0,
    astraMessages: 0,
    astraUsdPerMtok: SONNET_INPUT_USD_PER_MTOK,
    outcomeCounts,
    orgRows: projectOrgRows(byOrg),
    orgBreakdownUnavailable: false,
    entitledOrgs: entitlement.entitledOrgs,
    entitledActiveOrgs: entitlement.entitledActiveOrgs,
  };
}

/**
 * COMPLY — the operator compliance surface. Outcomes = the 10 *Assessment models
 * (completed) + NCA submissions + generated documents + deadlines met. AI spend =
 * Astra (AstraMessage.tokensUsed, attributed via AstraConversation.organizationId)
 * → estimated USD. Org attribution uses the org-bearing sources only (5 of the 10
 * assessment models + documents + deadlines + Astra); the 5 user-scoped
 * assessment models (copuos/uk/us/export/spectrum) and NCA submissions still
 * contribute to the distinct-user COUNT + the outcome totals, but cannot be
 * grouped by org (no organizationId column) — counted, never faked.
 */
async function readComply(
  since: Date,
  priorSince: Date,
  rangeDays: number,
  loginsCount: (slug: ExplorerProduct, s: Date) => Promise<number | null>,
): Promise<ProductExplorerRaw> {
  // ── Org-bearing assessment models (5): organizationId + userId + when. ──
  const [debris, cyber, nis2, insurance, environmental] = await Promise.all([
    prisma.debrisAssessment.findMany({
      where: { planGenerated: true, planGeneratedAt: { gte: since } },
      select: { organizationId: true, userId: true },
    }),
    prisma.cybersecurityAssessment.findMany({
      where: { frameworkGenerated: true, frameworkGeneratedAt: { gte: since } },
      select: { organizationId: true, userId: true },
    }),
    prisma.nIS2Assessment.findMany({
      where: { reportGenerated: true, reportGeneratedAt: { gte: since } },
      select: { organizationId: true, userId: true },
    }),
    prisma.insuranceAssessment.findMany({
      where: { reportGenerated: true, reportGeneratedAt: { gte: since } },
      select: { organizationId: true, userId: true },
    }),
    prisma.environmentalAssessment.findMany({
      where: {
        OR: [
          { reportGenerated: true, reportGeneratedAt: { gte: since } },
          {
            status: { in: ["submitted", "approved"] },
            updatedAt: { gte: since },
          },
        ],
      },
      select: { organizationId: true, userId: true },
    }),
  ]);

  // ── User-scoped assessment models (5): userId only (no org column). ──
  const [copuos, ukSpace, usReg, exportCtrl, spectrum] = await Promise.all([
    prisma.copuosAssessment.findMany({
      where: {
        OR: [
          { reportGenerated: true, reportGeneratedAt: { gte: since } },
          { status: "completed", updatedAt: { gte: since } },
        ],
      },
      select: { userId: true },
    }),
    prisma.ukSpaceAssessment.findMany({
      where: {
        OR: [
          { reportGenerated: true, reportGeneratedAt: { gte: since } },
          { status: "completed", updatedAt: { gte: since } },
        ],
      },
      select: { userId: true },
    }),
    prisma.usRegulatoryAssessment.findMany({
      where: {
        OR: [
          { reportGenerated: true, reportGeneratedAt: { gte: since } },
          { status: "completed", updatedAt: { gte: since } },
        ],
      },
      select: { userId: true },
    }),
    prisma.exportControlAssessment.findMany({
      where: {
        OR: [
          { reportGenerated: true, reportGeneratedAt: { gte: since } },
          { status: "completed", updatedAt: { gte: since } },
        ],
      },
      select: { userId: true },
    }),
    prisma.spectrumAssessment.findMany({
      where: {
        OR: [
          { reportGenerated: true, reportGeneratedAt: { gte: since } },
          { status: "completed", updatedAt: { gte: since } },
        ],
      },
      select: { userId: true },
    }),
  ]);

  // ── Cross-product Comply outcomes. ──
  const [ncaSubs, docs, deadlines] = await Promise.all([
    prisma.nCASubmission.findMany({
      where: { submittedAt: { gte: since } },
      select: { userId: true },
    }),
    prisma.generatedDocument.findMany({
      where: { status: "COMPLETED", updatedAt: { gte: since } },
      select: { organizationId: true, userId: true },
    }),
    prisma.deadline.findMany({
      where: { status: "COMPLETED", completedAt: { gte: since } },
      select: { organizationId: true, userId: true },
    }),
  ]);

  // ── Astra (Comply copilot) — token spend, attributed via the conversation. ──
  const [astraMsgs, priorAstraMsgs] = await Promise.all([
    prisma.astraMessage.findMany({
      where: { role: "assistant", createdAt: { gte: since } },
      select: {
        tokensUsed: true,
        conversation: { select: { organizationId: true, userId: true } },
      },
    }),
    prisma.astraMessage.findMany({
      where: {
        role: "assistant",
        createdAt: { gte: priorSince, lt: since },
      },
      select: { conversation: { select: { userId: true } } },
    }),
  ]);

  // ── Aggregate. Distinct-user COUNT via Sets (ids never returned). ──
  const distinctUsers = new Set<string>();
  const priorUsers = new Set<string>();
  const byOrg = new Map<string, OrgAcc>();

  // Helper: record an org-bearing assessment/document/deadline outcome.
  function recordOrgOutcome(orgId: string | null, userId: string | null) {
    if (userId) distinctUsers.add(userId);
    if (orgId) {
      const acc = ensureOrg(byOrg, orgId);
      if (userId) acc.userIds.add(userId);
      acc.outcomes += 1;
    }
  }
  // Helper: record a user-scoped outcome (no org grouping possible).
  function recordUserOutcome(userId: string | null) {
    if (userId) distinctUsers.add(userId);
  }

  let assessmentCount = 0;
  for (const r of [
    ...debris,
    ...cyber,
    ...nis2,
    ...insurance,
    ...environmental,
  ]) {
    assessmentCount += 1;
    recordOrgOutcome(r.organizationId ?? null, r.userId ?? null);
  }
  for (const r of [
    ...copuos,
    ...ukSpace,
    ...usReg,
    ...exportCtrl,
    ...spectrum,
  ]) {
    assessmentCount += 1;
    recordUserOutcome(r.userId ?? null);
  }

  const ncaCount = ncaSubs.length;
  for (const r of ncaSubs) recordUserOutcome(r.userId ?? null);

  const docCount = docs.length;
  for (const r of docs)
    recordOrgOutcome(r.organizationId ?? null, r.userId ?? null);

  const deadlineCount = deadlines.length;
  for (const r of deadlines)
    recordOrgOutcome(r.organizationId ?? null, r.userId ?? null);

  // Astra spend + per-org token cost. Tokens → USD via the canonical rate; we
  // accumulate per-org token totals and convert to USD per org at the end.
  let astraTokensTotal = 0;
  const astraMessagesTotal = astraMsgs.length;
  const orgAstraTokens = new Map<string, number>();
  for (const m of astraMsgs) {
    const tokens =
      typeof m.tokensUsed === "number" && m.tokensUsed > 0 ? m.tokensUsed : 0;
    astraTokensTotal += tokens;
    const userId = m.conversation?.userId ?? null;
    if (userId) distinctUsers.add(userId);
    const orgId = m.conversation?.organizationId ?? null;
    if (orgId) {
      const acc = ensureOrg(byOrg, orgId);
      if (userId) acc.userIds.add(userId);
      orgAstraTokens.set(orgId, (orgAstraTokens.get(orgId) ?? 0) + tokens);
    }
  }
  for (const m of priorAstraMsgs) {
    const userId = m.conversation?.userId ?? null;
    if (userId) priorUsers.add(userId);
  }
  // Convert each org's token total into an estimated USD spend (or leave null
  // when the org consumed no tokens). Done here so the per-org spend mirrors the
  // header's estimate basis.
  for (const [orgId, tokens] of orgAstraTokens.entries()) {
    const acc = byOrg.get(orgId);
    if (!acc) continue;
    const usd = (tokens / 1_000_000) * SONNET_INPUT_USD_PER_MTOK;
    acc.spendUsd = (acc.spendUsd ?? 0) + usd;
  }

  const names = await resolveOrgNames(new Set(byOrg.keys()));
  for (const [orgId, acc] of byOrg.entries())
    acc.orgName = names.get(orgId) ?? "";

  const activeOrgIds = new Set(byOrg.keys());
  const entitlement = await readEntitlement("COMPLY", activeOrgIds);

  // Outcome breakdown: one canonical kind per source bucket (assessments are the
  // 10 models summed; nca/docs/deadlines map 1:1 to their value-outcome ids).
  const outcomeCounts: OutcomeCountRaw[] = [
    { outcomeId: "comply_assessment_completed", count: assessmentCount },
    { outcomeId: "nca_submission_filed", count: ncaCount },
    { outcomeId: "document_generated", count: docCount },
    { outcomeId: "deadline_met", count: deadlineCount },
  ];

  return {
    product: "comply",
    rangeDays,
    activeUsers: distinctUsers.size,
    activeUsersPrior: priorUsers.size,
    logins: await loginsCount("comply", since),
    atlasCostUsd: 0,
    atlasMessages: 0,
    astraTokens: astraTokensTotal,
    astraMessages: astraMessagesTotal,
    astraUsdPerMtok: SONNET_INPUT_USD_PER_MTOK,
    outcomeCounts,
    orgRows: projectOrgRows(byOrg),
    orgBreakdownUnavailable: false,
    entitledOrgs: entitlement.entitledOrgs,
    entitledActiveOrgs: entitlement.entitledActiveOrgs,
  };
}

/**
 * TRADE / Passage — export-control automation. Outcomes = items classified +
 * screenings decided + licences issued. Org attribution: items + licences carry
 * organizationId directly; screenings join through TradeParty.organizationId.
 * Distinct-user COUNT from item.createdById + screening.decidedById (licences
 * have no per-user author column → org-only). No AI spend lane.
 */
async function readTrade(
  since: Date,
  priorSince: Date,
  rangeDays: number,
  loginsCount: (slug: ExplorerProduct, s: Date) => Promise<number | null>,
): Promise<ProductExplorerRaw> {
  const [items, screenings, licenses, priorItems, priorScreenings] =
    await Promise.all([
      prisma.tradeItem.findMany({
        where: { status: "CLASSIFIED", classifiedAt: { gte: since } },
        select: { organizationId: true, createdById: true },
      }),
      prisma.tradeScreeningResult.findMany({
        where: {
          decision: {
            in: ["CLEAR", "CONFIRMED_HIT", "FALSE_POSITIVE_DISMISSED"],
          },
          OR: [{ decidedAt: { gte: since } }, { createdAt: { gte: since } }],
        },
        select: {
          decidedById: true,
          party: { select: { organizationId: true } },
        },
      }),
      prisma.tradeLicense.findMany({
        where: { issuedAt: { gte: since } },
        select: { organizationId: true },
      }),
      // Prior-window distinct users (items + screenings) for the trend.
      prisma.tradeItem.findMany({
        where: {
          status: "CLASSIFIED",
          classifiedAt: { gte: priorSince, lt: since },
        },
        select: { createdById: true },
      }),
      prisma.tradeScreeningResult.findMany({
        where: {
          decision: {
            in: ["CLEAR", "CONFIRMED_HIT", "FALSE_POSITIVE_DISMISSED"],
          },
          OR: [
            { decidedAt: { gte: priorSince, lt: since } },
            { createdAt: { gte: priorSince, lt: since } },
          ],
        },
        select: { decidedById: true },
      }),
    ]);

  const distinctUsers = new Set<string>();
  const priorUsers = new Set<string>();
  const byOrg = new Map<string, OrgAcc>();

  for (const r of items) {
    if (r.createdById) distinctUsers.add(r.createdById);
    if (r.organizationId) {
      const acc = ensureOrg(byOrg, r.organizationId);
      if (r.createdById) acc.userIds.add(r.createdById);
      acc.outcomes += 1;
    }
  }
  for (const r of screenings) {
    if (r.decidedById) distinctUsers.add(r.decidedById);
    const orgId = r.party?.organizationId ?? null;
    if (orgId) {
      const acc = ensureOrg(byOrg, orgId);
      if (r.decidedById) acc.userIds.add(r.decidedById);
      acc.outcomes += 1;
    }
  }
  for (const r of licenses) {
    if (r.organizationId) {
      const acc = ensureOrg(byOrg, r.organizationId);
      acc.outcomes += 1; // licences have no per-user author → org-level only
    }
  }
  for (const r of priorItems) if (r.createdById) priorUsers.add(r.createdById);
  for (const r of priorScreenings)
    if (r.decidedById) priorUsers.add(r.decidedById);

  const names = await resolveOrgNames(new Set(byOrg.keys()));
  for (const [orgId, acc] of byOrg.entries())
    acc.orgName = names.get(orgId) ?? "";

  const activeOrgIds = new Set(byOrg.keys());
  const entitlement = await readEntitlement("TRADE", activeOrgIds);

  const outcomeCounts: OutcomeCountRaw[] = [
    { outcomeId: "trade_item_classified", count: items.length },
    { outcomeId: "trade_screening_decided", count: screenings.length },
    { outcomeId: "trade_license_issued", count: licenses.length },
  ];

  return {
    product: "trade",
    rangeDays,
    activeUsers: distinctUsers.size,
    activeUsersPrior: priorUsers.size,
    logins: await loginsCount("trade", since),
    atlasCostUsd: 0,
    atlasMessages: 0,
    astraTokens: 0,
    astraMessages: 0,
    astraUsdPerMtok: SONNET_INPUT_USD_PER_MTOK,
    outcomeCounts,
    orgRows: projectOrgRows(byOrg),
    orgBreakdownUnavailable: false,
    entitledOrgs: entitlement.entitledOrgs,
    entitledActiveOrgs: entitlement.entitledActiveOrgs,
  };
}

/**
 * SCHOLAR — the student legal-research surface. Outcomes = Planspiel runs started
 * + bookmarks saved. Scholar's domain rows are USER-DECOUPLED in the schema (bare
 * ownerUserId / userId, NO organizationId), so a by-organization breakdown is
 * STRUCTURALLY IMPOSSIBLE — we surface that honestly via orgBreakdownUnavailable.
 * The distinct-user COUNT (a single number) still works. No AI spend lane.
 */
async function readScholar(
  since: Date,
  priorSince: Date,
  rangeDays: number,
  loginsCount: (slug: ExplorerProduct, s: Date) => Promise<number | null>,
): Promise<ProductExplorerRaw> {
  const [runs, bookmarks, priorRuns, priorBookmarks] = await Promise.all([
    prisma.scholarPlanspielRun.findMany({
      where: { startedAt: { gte: since } },
      select: { ownerUserId: true },
    }),
    prisma.scholarBookmark.findMany({
      where: { createdAt: { gte: since } },
      select: { userId: true },
    }),
    prisma.scholarPlanspielRun.findMany({
      where: { startedAt: { gte: priorSince, lt: since } },
      select: { ownerUserId: true },
    }),
    prisma.scholarBookmark.findMany({
      where: { createdAt: { gte: priorSince, lt: since } },
      select: { userId: true },
    }),
  ]);

  const distinctUsers = new Set<string>();
  const priorUsers = new Set<string>();
  for (const r of runs) if (r.ownerUserId) distinctUsers.add(r.ownerUserId);
  for (const r of bookmarks) if (r.userId) distinctUsers.add(r.userId);
  for (const r of priorRuns) if (r.ownerUserId) priorUsers.add(r.ownerUserId);
  for (const r of priorBookmarks) if (r.userId) priorUsers.add(r.userId);

  // Entitlement still meaningful (orgs hold Scholar access), but no org can be
  // marked "active" from outcomes since outcomes carry no org → activeOrgIds empty.
  const entitlement = await readEntitlement("SCHOLAR", new Set<string>());

  const outcomeCounts: OutcomeCountRaw[] = [
    { outcomeId: "scholar_planspiel_run", count: runs.length },
    { outcomeId: "scholar_bookmark_saved", count: bookmarks.length },
  ];

  return {
    product: "scholar",
    rangeDays,
    activeUsers: distinctUsers.size,
    activeUsersPrior: priorUsers.size,
    logins: await loginsCount("scholar", since),
    atlasCostUsd: 0,
    atlasMessages: 0,
    astraTokens: 0,
    astraMessages: 0,
    astraUsdPerMtok: SONNET_INPUT_USD_PER_MTOK,
    outcomeCounts,
    orgRows: [], // user-decoupled → no org rows
    orgBreakdownUnavailable: true,
    entitledOrgs: entitlement.entitledOrgs,
    entitledActiveOrgs: entitlement.entitledActiveOrgs,
  };
}

/**
 * PHAROS — bilateral authority-oversight surface. It has no value-outcome domain
 * tables wired today (mirrors steering, which omits Pharos from WACO), so usage /
 * spend / outcomes are honestly zero. Entitlement (orgs holding Pharos access) is
 * still real and surfaced — the founder sees the entitled base even pre-activity.
 */
async function readPharos(rangeDays: number): Promise<ProductExplorerRaw> {
  const entitlement = await readEntitlement("PHAROS", new Set<string>());
  return {
    product: "pharos",
    rangeDays,
    activeUsers: 0,
    activeUsersPrior: null,
    logins: null,
    atlasCostUsd: 0,
    atlasMessages: 0,
    astraTokens: 0,
    astraMessages: 0,
    astraUsdPerMtok: SONNET_INPUT_USD_PER_MTOK,
    outcomeCounts: [],
    orgRows: [],
    orgBreakdownUnavailable: false,
    entitledOrgs: entitlement.entitledOrgs,
    entitledActiveOrgs: entitlement.entitledActiveOrgs,
  };
}

/**
 * Per-product login count.
 *
 * HONEST NULL (by design): the only candidate sources are `LoginEvent` (which has
 * NO `product` column — its rows can't be attributed to a product) and
 * `AnalyticsEvent` (which has a `product` column but, per the analytics taxonomy,
 * emits only page-views + a single signup today — no `login` event is wired). A
 * per-product login count would therefore be permanently zero or unattributable.
 * Rather than dress a structural absence as "0 logins", we return `null` so the
 * page renders an em-dash + an honest "no per-product login signal" caption. If a
 * product-tagged login event is wired later, swap this for the real COUNT (which
 * must still select NO userId — a count only).
 */
async function loginsForProduct(
  _slug: ExplorerProduct,
  _since: Date,
): Promise<number | null> {
  return null;
}

/**
 * Build the Product-Explorer payload for one (product, range). Pure-ish data
 * assembly — the caller has already gated + audited. Dispatches to the per-product
 * reader, then folds the RAW aggregates into the view-model via the pure layer.
 */
async function buildProductPayload(
  product: ExplorerProduct,
  range: string,
  rangeDays: number,
): Promise<ProductExplorerResponse> {
  // Inclusive window matching the cockpit/efficiency convention (today + prior
  // N-1 days), plus the immediately-prior window of equal length for the trend.
  const since = startOfDay(subDays(new Date(), rangeDays - 1));
  const priorSince = startOfDay(subDays(since, rangeDays));

  let raw: ProductExplorerRaw;
  switch (product) {
    case "atlas":
      raw = await readAtlas(since, priorSince, rangeDays, loginsForProduct);
      break;
    case "comply":
      raw = await readComply(since, priorSince, rangeDays, loginsForProduct);
      break;
    case "trade":
      raw = await readTrade(since, priorSince, rangeDays, loginsForProduct);
      break;
    case "scholar":
      raw = await readScholar(since, priorSince, rangeDays, loginsForProduct);
      break;
    case "pharos":
    default:
      raw = await readPharos(rangeDays);
      break;
  }

  const view = buildProductExplorer(raw);
  return {
    product,
    range,
    generatedAt: new Date().toISOString(),
    view,
  };
}

export async function GET(request: Request) {
  // ── Layer 3 of the /admin gate: authoritative super-admin check. ──
  const gate = await requireSuperAdminApi();
  if (gate instanceof NextResponse) return gate; // 403 — do nothing else.

  // Audit the authorized cross-tenant access (best-effort; never throws).
  await logSuperAdminAccess({
    userId: gate.userId,
    email: gate.email,
    surface: "admin:api/products",
    request,
  });

  // Validate the untrusted query params; anything else falls back to a default.
  const url = new URL(request.url);
  const productParam = url.searchParams.get("product");
  const product: ExplorerProduct = isExplorerProduct(productParam)
    ? productParam
    : "atlas";
  const rangeParam = url.searchParams.get("range");
  const range = isAdminRange(rangeParam) ? rangeParam : "30d";
  const rangeDays = ADMIN_RANGE_DAYS[range];

  try {
    // Cache the (gated) reads for 5 min, keyed by (product, range), so refresh
    // bursts don't each re-scan the domain tables.
    const payload = await withCache(
      `admin:products:${product}:${range}`,
      () => buildProductPayload(product, range, rangeDays),
      300,
    );
    return NextResponse.json(payload);
  } catch (error) {
    // Generic 500 — never leak the underlying DB/error detail to the client.
    logger.error("[admin/v2/products] Error", error);
    return NextResponse.json(
      { error: "Failed to load product explorer" },
      { status: 500 },
    );
  }
}
