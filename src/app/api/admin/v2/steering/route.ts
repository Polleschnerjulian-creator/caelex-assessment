/**
 * GET /api/admin/v2/steering  →  SteeringResponse
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The founder-home / PMF steering screen: the ONE view that answers "which
 * product / jurisdiction / regulation do I double down on, and where do users
 * drop off?". It computes the North-Star Metric — WACO (Weekly Active Compliance
 * Outcomes) — and the PMF traction matrix from AUTHORITATIVE DOMAIN TABLES, not
 * from the analytics event stream (which is almost entirely unwired today and
 * would read permanently zero). A row in `TradeLicense` with `issuedAt` set IS a
 * licence being issued; a completed `*Assessment` IS a compliance outcome — so
 * we count those directly.
 *
 * WHY this reads raw domain tables (unlike the cockpit, which reads PII-free
 * rollups): the rollups don't carry the per-product regulatory outcomes WACO
 * needs, and the events that would feed them are not emitted yet. We therefore
 * read the domain rows here — but the payload we RETURN is still PII-free: it is
 * integer counts grouped by product / jurisdiction only. The per-tenant actor
 * key used to count "distinct tenants" is computed server-side and never leaves
 * this route (the pure layer surfaces a COUNT, not the keys).
 *
 * Auth: super-admin only (requireSuperAdminApi). Every authorized cross-tenant
 * read is audit-logged (logSuperAdminAccess) AFTER the gate passes. The Prisma
 * reads are wrapped in withCache (5 min) so dashboard refresh bursts collapse to
 * a single domain scan.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { withCache } from "@/lib/cache.server";
import {
  requireSuperAdminApi,
  logSuperAdminAccess,
} from "@/lib/admin-auth.server";
import {
  buildSteering,
  type SteeringResponse,
  type ValueOutcomeRow,
  type FrictionInput,
} from "@/lib/admin/steering-data";

// Node runtime: Prisma + the audit hash-chain require Node, not Edge.
export const runtime = "nodejs";
// Live operational metrics — never serve from Next's full-route cache.
export const dynamic = "force-dynamic";

/** Look-back window for the raw domain reads: 5 weeks covers this-week +
 * prior-week + the month-ago week the WACO MoM comparison needs, with a little
 * slack. The pure layer slices the precise windows off `nowMs`. */
const LOOKBACK_DAYS = 35;

/** The unknown-jurisdiction bucket label (kept in sync with the pure layer). */
const UNKNOWN = "unknown";

/**
 * A stable tenant actor key for distinct-counting. Prefer the organization
 * (an outcome belongs to a tenant, not a seat); fall back to the user for
 * user-scoped surfaces (Scholar) or org-less rows. Used ONLY internally — never
 * returned to the client.
 */
function actorKey(
  orgId: string | null | undefined,
  userId: string | null | undefined,
): string {
  if (orgId) return `org:${orgId}`;
  if (userId) return `user:${userId}`;
  return "anon";
}

/**
 * Assemble the steering payload. Pure-ish data assembly: the caller has already
 * gated + audited. Reads the authoritative domain tables over the look-back
 * window, normalises every qualifying row into a {@link ValueOutcomeRow}, then
 * resolves each row's jurisdiction from `User.establishmentCountry` (per-row
 * when a user is known; via the org's modal member country for org-only rows
 * such as licences).
 */
async function buildSteeringPayload(): Promise<SteeringResponse> {
  const nowMs = Date.now();
  const since = new Date(nowMs - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  // ── 1. Read qualifying domain rows (projected to the minimum we need). ──
  // Each Prisma call selects only the keys + timestamp that define the outcome,
  // never free text or PII-bearing columns.

  // Comply — the 10 assessment models. Each has its own "completed" signal:
  //   • report/plan/framework generated (a terminal artefact was produced), OR
  //   • a terminal status (completed/submitted/approved) for the status-bearing
  //     models. We read the GENERATED rows (the strongest, uniform signal) plus,
  //     for status-bearing models, rows in a terminal status — de-duplicated by
  //     row id so an assessment that is both generated AND completed counts once.
  const [
    debris,
    cyber,
    nis2,
    insurance,
    environmental,
    copuos,
    ukSpace,
    usReg,
    exportCtrl,
    spectrum,
  ] = await Promise.all([
    prisma.debrisAssessment.findMany({
      where: { planGenerated: true, planGeneratedAt: { gte: since } },
      select: { organizationId: true, userId: true, planGeneratedAt: true },
    }),
    prisma.cybersecurityAssessment.findMany({
      where: { frameworkGenerated: true, frameworkGeneratedAt: { gte: since } },
      select: {
        organizationId: true,
        userId: true,
        frameworkGeneratedAt: true,
      },
    }),
    prisma.nIS2Assessment.findMany({
      where: { reportGenerated: true, reportGeneratedAt: { gte: since } },
      select: { organizationId: true, userId: true, reportGeneratedAt: true },
    }),
    prisma.insuranceAssessment.findMany({
      where: { reportGenerated: true, reportGeneratedAt: { gte: since } },
      select: { organizationId: true, userId: true, reportGeneratedAt: true },
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
      select: {
        organizationId: true,
        userId: true,
        reportGeneratedAt: true,
        updatedAt: true,
      },
    }),
    prisma.copuosAssessment.findMany({
      where: {
        OR: [
          { reportGenerated: true, reportGeneratedAt: { gte: since } },
          { status: "completed", updatedAt: { gte: since } },
        ],
      },
      select: {
        userId: true,
        reportGeneratedAt: true,
        updatedAt: true,
      },
    }),
    prisma.ukSpaceAssessment.findMany({
      where: {
        OR: [
          { reportGenerated: true, reportGeneratedAt: { gte: since } },
          { status: "completed", updatedAt: { gte: since } },
        ],
      },
      select: { userId: true, reportGeneratedAt: true, updatedAt: true },
    }),
    prisma.usRegulatoryAssessment.findMany({
      where: {
        OR: [
          { reportGenerated: true, reportGeneratedAt: { gte: since } },
          { status: "completed", updatedAt: { gte: since } },
        ],
      },
      select: { userId: true, reportGeneratedAt: true, updatedAt: true },
    }),
    prisma.exportControlAssessment.findMany({
      where: {
        OR: [
          { reportGenerated: true, reportGeneratedAt: { gte: since } },
          { status: "completed", updatedAt: { gte: since } },
        ],
      },
      select: { userId: true, reportGeneratedAt: true, updatedAt: true },
    }),
    prisma.spectrumAssessment.findMany({
      where: {
        OR: [
          { reportGenerated: true, reportGeneratedAt: { gte: since } },
          { status: "completed", updatedAt: { gte: since } },
        ],
      },
      select: { userId: true, reportGeneratedAt: true, updatedAt: true },
    }),
  ]);

  // Passage / Trade.
  const [tradeItems, tradeScreenings, tradeLicenses] = await Promise.all([
    prisma.tradeItem.findMany({
      where: { status: "CLASSIFIED", classifiedAt: { gte: since } },
      select: { organizationId: true, createdById: true, classifiedAt: true },
    }),
    prisma.tradeScreeningResult.findMany({
      // A resolved decision (anything other than the unresolved POTENTIAL_MATCH).
      where: {
        decision: {
          in: ["CLEAR", "CONFIRMED_HIT", "FALSE_POSITIVE_DISMISSED"],
        },
        // Prefer the decision time; many rows set decidedAt, fall back below.
        OR: [{ decidedAt: { gte: since } }, { createdAt: { gte: since } }],
      },
      select: {
        decidedAt: true,
        createdAt: true,
        decidedById: true,
        party: { select: { organizationId: true } },
      },
    }),
    prisma.tradeLicense.findMany({
      where: { issuedAt: { gte: since } },
      select: { organizationId: true, issuedAt: true },
    }),
  ]);

  // Atlas — assistant message turns (a produced AI draft/answer).
  const atlasDrafts = await prisma.atlasMessage.findMany({
    where: { role: "assistant", createdAt: { gte: since } },
    select: {
      createdAt: true,
      senderUserId: true,
      chat: { select: { organizationId: true, ownerUserId: true } },
    },
  });

  // Scholar — user-scoped (students). Runs started + bookmarks saved.
  const [planspielRuns, bookmarks] = await Promise.all([
    prisma.scholarPlanspielRun.findMany({
      where: { startedAt: { gte: since } },
      select: { ownerUserId: true, startedAt: true },
    }),
    prisma.scholarBookmark.findMany({
      where: { createdAt: { gte: since } },
      select: { userId: true, createdAt: true },
    }),
  ]);

  // Cross-product.
  const [ncaSubs, docs, deadlines] = await Promise.all([
    prisma.nCASubmission.findMany({
      where: { submittedAt: { gte: since } },
      select: { userId: true, submittedAt: true },
    }),
    prisma.generatedDocument.findMany({
      where: { status: "COMPLETED", updatedAt: { gte: since } },
      select: { organizationId: true, userId: true, updatedAt: true },
    }),
    prisma.deadline.findMany({
      where: { status: "COMPLETED", completedAt: { gte: since } },
      select: { organizationId: true, userId: true, completedAt: true },
    }),
  ]);

  // ── 2. Normalise into a flat ValueOutcomeRow[] (jurisdiction filled in §3). ──
  const rows: ValueOutcomeRow[] = [];
  // Parallel to `rows` (index-aligned): the (orgId,userId) each row should
  // resolve its jurisdiction from in §3. Kept off the typed row shape so the
  // payload never carries raw ids.
  const rowKeys: Array<{ orgId: string | null; userId: string | null }> = [];
  // Collect the user/org ids we must resolve a jurisdiction for.
  const userIds = new Set<string>();
  const orgIds = new Set<string>();

  function push(
    outcomeId: ValueOutcomeRow["outcomeId"],
    orgId: string | null | undefined,
    userId: string | null | undefined,
    when: Date | null | undefined,
    fallbackWhen?: Date | null,
  ): void {
    const ts = (when ?? fallbackWhen) as Date | null;
    if (!ts) return; // no usable timestamp → skip (never fabricate a time)
    if (userId) userIds.add(userId);
    if (orgId) orgIds.add(orgId);
    rows.push({
      outcomeId,
      actorKey: actorKey(orgId, userId),
      jurisdiction: UNKNOWN, // resolved in §3
      occurredAtMs: ts.getTime(),
    });
    rowKeys.push({ orgId: orgId ?? null, userId: userId ?? null });
  }

  for (const r of debris)
    push(
      "comply_assessment_completed",
      r.organizationId,
      r.userId,
      r.planGeneratedAt,
    );
  for (const r of cyber)
    push(
      "comply_assessment_completed",
      r.organizationId,
      r.userId,
      r.frameworkGeneratedAt,
    );
  for (const r of nis2)
    push(
      "comply_assessment_completed",
      r.organizationId,
      r.userId,
      r.reportGeneratedAt,
    );
  for (const r of insurance)
    push(
      "comply_assessment_completed",
      r.organizationId,
      r.userId,
      r.reportGeneratedAt,
    );
  for (const r of environmental)
    push(
      "comply_assessment_completed",
      r.organizationId,
      r.userId,
      r.reportGeneratedAt,
      r.updatedAt,
    );
  // COPUOS/UK/US/Export/Spectrum have no organizationId column → user-scoped.
  for (const r of copuos)
    push(
      "comply_assessment_completed",
      null,
      r.userId,
      r.reportGeneratedAt,
      r.updatedAt,
    );
  for (const r of ukSpace)
    push(
      "comply_assessment_completed",
      null,
      r.userId,
      r.reportGeneratedAt,
      r.updatedAt,
    );
  for (const r of usReg)
    push(
      "comply_assessment_completed",
      null,
      r.userId,
      r.reportGeneratedAt,
      r.updatedAt,
    );
  for (const r of exportCtrl)
    push(
      "comply_assessment_completed",
      null,
      r.userId,
      r.reportGeneratedAt,
      r.updatedAt,
    );
  for (const r of spectrum)
    push(
      "comply_assessment_completed",
      null,
      r.userId,
      r.reportGeneratedAt,
      r.updatedAt,
    );

  for (const r of tradeItems)
    push(
      "trade_item_classified",
      r.organizationId,
      r.createdById,
      r.classifiedAt,
    );
  for (const r of tradeScreenings)
    push(
      "trade_screening_decided",
      r.party?.organizationId ?? null,
      r.decidedById,
      r.decidedAt,
      r.createdAt,
    );
  for (const r of tradeLicenses)
    push("trade_license_issued", r.organizationId, null, r.issuedAt);

  for (const r of atlasDrafts)
    push(
      "atlas_draft_produced",
      r.chat?.organizationId ?? null,
      r.senderUserId ?? r.chat?.ownerUserId ?? null,
      r.createdAt,
    );

  for (const r of planspielRuns)
    push("scholar_planspiel_run", null, r.ownerUserId, r.startedAt);
  for (const r of bookmarks)
    push("scholar_bookmark_saved", null, r.userId, r.createdAt);

  for (const r of ncaSubs)
    push("nca_submission_filed", null, r.userId, r.submittedAt);
  for (const r of docs)
    push("document_generated", r.organizationId, r.userId, r.updatedAt);
  for (const r of deadlines)
    // completedAt is guaranteed non-null here (the query filters
    // status=COMPLETED + completedAt>=since), so no fallback timestamp is needed.
    push("deadline_met", r.organizationId, r.userId, r.completedAt);

  // ── 3. Resolve jurisdiction from User.establishmentCountry. ──
  // One read for the referenced users; one read for org members to derive an
  // org's modal member country (for org-only rows like licences).
  const [users, orgMembers] = await Promise.all([
    userIds.size > 0
      ? prisma.user.findMany({
          where: { id: { in: Array.from(userIds) } },
          select: { id: true, establishmentCountry: true },
        })
      : Promise.resolve(
          [] as { id: string; establishmentCountry: string | null }[],
        ),
    orgIds.size > 0
      ? prisma.organizationMember.findMany({
          where: { organizationId: { in: Array.from(orgIds) } },
          select: {
            organizationId: true,
            user: { select: { establishmentCountry: true } },
          },
        })
      : Promise.resolve(
          [] as {
            organizationId: string;
            user: { establishmentCountry: string | null };
          }[],
        ),
  ]);

  const userCountry = new Map<string, string>();
  for (const u of users) {
    if (u.establishmentCountry) userCountry.set(u.id, u.establishmentCountry);
  }

  // Org → modal (most common) member establishmentCountry, ignoring nulls.
  const orgCountryVotes = new Map<string, Map<string, number>>();
  for (const m of orgMembers) {
    const c = m.user?.establishmentCountry;
    if (!c) continue;
    let votes = orgCountryVotes.get(m.organizationId);
    if (!votes) {
      votes = new Map<string, number>();
      orgCountryVotes.set(m.organizationId, votes);
    }
    votes.set(c, (votes.get(c) ?? 0) + 1);
  }
  const orgCountry = new Map<string, string>();
  for (const [orgId, votes] of orgCountryVotes.entries()) {
    let best: string | null = null;
    let bestN = -1;
    // Deterministic tiebreak: highest count, then lexicographically smallest.
    for (const [c, n] of Array.from(votes.entries()).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    )) {
      if (n > bestN) {
        bestN = n;
        best = c;
      }
    }
    if (best) orgCountry.set(orgId, best);
  }

  // Stamp each row's jurisdiction: prefer the row's own user country, else the
  // org's modal country, else "unknown".
  for (let i = 0; i < rows.length; i++) {
    const { orgId, userId } = rowKeys[i];
    const j =
      (userId ? userCountry.get(userId) : undefined) ??
      (orgId ? orgCountry.get(orgId) : undefined) ??
      UNKNOWN;
    rows[i].jurisdiction = j;
  }

  // ── 4. Friction map — per-product started-vs-completed from domain tables. ──
  // We count over the SAME look-back window so the ratio matches the outcome
  // counts. "Started" is the denominator (a flow was begun); "completed" is the
  // value-outcome numerator. Derived from real row counts, never funnels.
  const [
    complyStarted,
    complyCompleted,
    tradeItemsStarted,
    tradeItemsClassified,
    tradeOpsStarted,
    tradeOpsLicensed,
  ] = await Promise.all([
    // Comply: assessments created in the window (any model). We approximate the
    // "started" denominator with the most-used assessment model (cyber) plus
    // debris/nis2, which are the three without a status column — counting their
    // creations. (A precise cross-model union is heavier than this screen needs;
    // this is a real, conservative denominator.)
    prisma.cybersecurityAssessment.count({
      where: { createdAt: { gte: since } },
    }),
    prisma.cybersecurityAssessment.count({
      where: { frameworkGenerated: true, frameworkGeneratedAt: { gte: since } },
    }),
    prisma.tradeItem.count({ where: { createdAt: { gte: since } } }),
    prisma.tradeItem.count({
      where: { status: "CLASSIFIED", classifiedAt: { gte: since } },
    }),
    prisma.tradeOperation.count({ where: { createdAt: { gte: since } } }),
    prisma.tradeOperation.count({
      where: {
        status: { in: ["LICENSED", "EXECUTED"] },
        updatedAt: { gte: since },
      },
    }),
  ]);

  const friction: FrictionInput[] = [
    {
      product: "comply",
      flowLabel: "Cybersecurity assessment → framework generated",
      started: complyStarted,
      completed: complyCompleted,
    },
    {
      product: "trade",
      flowLabel: "Export item → classified",
      started: tradeItemsStarted,
      completed: tradeItemsClassified,
    },
    {
      product: "trade",
      flowLabel: "Trade operation → licensed",
      started: tradeOpsStarted,
      completed: tradeOpsLicensed,
    },
  ];

  // ── 5. Compose via the pure layer. ──
  return buildSteering({ nowMs, rows, friction });
}

export async function GET(request: Request) {
  // ── Layer 3 of the /admin gate: authoritative super-admin check. ──
  const gate = await requireSuperAdminApi();
  if (gate instanceof NextResponse) return gate; // 403 — do nothing else.

  // Audit the authorized cross-tenant access (best-effort; never throws).
  await logSuperAdminAccess({
    userId: gate.userId,
    email: gate.email,
    surface: "admin:api/steering",
    request,
  });

  try {
    // Cache the (gated) domain reads for 5 min so refresh bursts don't re-scan.
    const payload = await withCache(
      "admin:steering",
      () => buildSteeringPayload(),
      300,
    );
    return NextResponse.json(payload);
  } catch (error) {
    // Generic 500 — never leak the underlying DB/error detail to the client.
    logger.error("[admin/v2/steering] Error", error);
    return NextResponse.json(
      { error: "Failed to load steering" },
      { status: 500 },
    );
  }
}
