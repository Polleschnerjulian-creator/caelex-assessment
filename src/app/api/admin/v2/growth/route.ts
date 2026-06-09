/**
 * GET /api/admin/v2/growth?range=7d|30d|90d  →  GrowthResponse
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The top-of-funnel demand + pipeline view: the inbound interest Caelex captures
 * today (demo requests, bookings, contact requests, newsletter sign-ups, public
 * /pulse leads, and the CRM deal pipeline) that is recorded in the database but
 * surfaced NOWHERE in the admin center. It answers "where is demand coming from,
 * how much of it converts, and what's in the pipeline?".
 *
 * WHY this reads raw domain tables (unlike the cockpit, which reads PII-free
 * rollups): the rollups don't carry inbound demand or CRM pipeline, and the
 * events that would feed them are not emitted for these surfaces. A DemoRequest
 * row IS a demo being requested; a CrmDeal in PROPOSAL IS pipeline. So we read
 * those rows directly — but the payload we RETURN is still PII-free: it is
 * integer counts + summed EUR values grouped by channel / stage / status only.
 * No email, name, or company string is ever placed on the response.
 *
 *   • Channel mix  — (source × medium) inbound touches, unioned from
 *     AcquisitionEvent `visit` rows (which carry the real source/medium; the
 *     `signup` rows are a "direct" placeholder we deliberately exclude to avoid
 *     double-counting a visitor) and PulseLead UTM attribution.
 *   • Demand       — DemoRequest / Booking / ContactRequest / Newsletter /
 *     OrganizationInvitation counts, plus the requested→booked→completed funnel.
 *   • Pipeline     — CrmDeal grouped by stage (count + Σ value), open vs terminal,
 *     with a probability-weighted forecast.
 *   • Leads        — PulseLead total vs converted (convertedToOrgId set).
 *
 * NO CAC is computed: there is no marketing-spend source in the schema, so a
 * cost-per-acquisition would be fabricated. We omit it rather than invent it.
 *
 * Auth: super-admin only (requireSuperAdminApi). Every authorized cross-tenant
 * read is audit-logged (logSuperAdminAccess) AFTER the gate passes. The Prisma
 * reads are wrapped in withCache (5 min, keyed by range) so dashboard refresh
 * bursts collapse to a single scan per range.
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
  ADMIN_RANGE_DAYS,
  isAdminRange,
  type AdminRange,
} from "@/lib/admin/analytics-types";
import {
  buildGrowth,
  type GrowthResponse,
  type ChannelTouch,
  type DealStageInput,
} from "@/lib/admin/growth-data";

// Node runtime: Prisma + the audit hash-chain require Node, not Edge.
export const runtime = "nodejs";
// Live operational metrics — never serve from Next's full-route cache.
export const dynamic = "force-dynamic";

/**
 * Assemble the growth payload for the window [since, now]. Pure-ish data
 * assembly: the caller has already gated + audited. Reads the marketing / CRM /
 * lead tables, projecting every row to the minimal channel/stage/count shapes
 * the pure layer needs — never free text or PII-bearing columns.
 */
async function buildGrowthPayload(range: AdminRange): Promise<GrowthResponse> {
  const nowMs = Date.now();
  const rangeDays = ADMIN_RANGE_DAYS[range];
  const since = new Date(nowMs - rangeDays * 24 * 60 * 60 * 1000);

  const [
    // ── Channel mix sources ──
    acqVisits,
    pulseTouches,
    // ── Demand counts ──
    demosRequested,
    demosBooked,
    demosCompleted,
    contactRequests,
    newsletterActive,
    newsletterNew,
    invitesSent,
    // ── CRM pipeline ──
    dealsByStage,
    // ── Lead conversion ──
    leadsTotal,
    leadsConverted,
  ] = await Promise.all([
    // AcquisitionEvent `visit` rows carry the real source/medium (the channel
    // signal). We project to JUST those two columns — no anonymousId, no userId.
    prisma.acquisitionEvent.findMany({
      where: { eventType: "visit", timestamp: { gte: since } },
      select: { source: true, medium: true },
    }),
    // PulseLead UTM attribution — the public /pulse tool's inbound channel.
    prisma.pulseLead.findMany({
      where: { createdAt: { gte: since } },
      select: { utmSource: true, utmMedium: true },
    }),

    // Demand: each a single index-scan count over the window.
    prisma.demoRequest.count({ where: { createdAt: { gte: since } } }),
    // A booked demo = a Booking row scheduled in the window (any non-cancelled
    // status). scheduledAt is the meeting time; we window on it so "booked this
    // range" matches the demo-request window semantics.
    prisma.booking.count({ where: { scheduledAt: { gte: since } } }),
    // A completed demo = a Booking that reached COMPLETED (completedAt set).
    prisma.booking.count({
      where: { status: "COMPLETED", completedAt: { gte: since } },
    }),
    prisma.contactRequest.count({ where: { createdAt: { gte: since } } }),
    // Live newsletter list size = ACTIVE subscriptions (a point-in-time gauge,
    // NOT windowed — the list is the list regardless of the range). The
    // NewsletterStatus enum is PENDING | ACTIVE | UNSUBSCRIBED.
    prisma.newsletterSubscription.count({ where: { status: "ACTIVE" } }),
    // New sign-ups in the window (windowed flow).
    prisma.newsletterSubscription.count({
      where: { subscribedAt: { gte: since } },
    }),
    // Team-virality: invitations created in the window.
    prisma.organizationInvitation.count({
      where: { createdAt: { gte: since } },
    }),

    // CRM pipeline — grouped by stage, excluding soft-deleted rows. count + Σ
    // valueCents per stage. We do NOT window deals (the pipeline is the current
    // book of business, not a per-range flow), matching the CRM stats screen.
    prisma.crmDeal.groupBy({
      by: ["stage"],
      where: { deletedAt: null },
      _count: true,
      _sum: { valueCents: true },
    }),

    // PulseLead conversion — total leads in the window, and the subset that
    // became a paying org (convertedToOrgId set). Both windowed on createdAt so
    // the rate is "of the leads captured this range, how many converted".
    prisma.pulseLead.count({ where: { createdAt: { gte: since } } }),
    prisma.pulseLead.count({
      where: { createdAt: { gte: since }, convertedToOrgId: { not: null } },
    }),
  ]);

  // ── Normalise the two channel sources into one flat ChannelTouch[]. ──
  const channels: ChannelTouch[] = [];
  for (const a of acqVisits) {
    channels.push({ source: a.source, medium: a.medium });
  }
  for (const p of pulseTouches) {
    channels.push({ source: p.utmSource, medium: p.utmMedium });
  }

  // ── Normalise the deal-stage groupBy into DealStageInput[] (BigInt→number). ──
  // _count is a plain number when groupBy is called with `_count: true`.
  // _sum.valueCents is a BigInt|null — convert to a number (cents) for the pure
  // layer; null → 0.
  const dealStages: DealStageInput[] = dealsByStage.map((row) => ({
    stage: row.stage as string,
    count: typeof row._count === "number" ? row._count : 0,
    valueCents: row._sum.valueCents !== null ? Number(row._sum.valueCents) : 0,
  }));

  // ── Compose via the pure layer. ──
  return buildGrowth({
    generatedAtMs: nowMs,
    rangeDays,
    channels,
    demand: {
      demosRequested,
      demosBooked,
      demosCompleted,
      contactRequests,
      newsletterActive,
      newsletterNew,
      invitesSent,
    },
    dealStages,
    leads: { total: leadsTotal, converted: leadsConverted },
  });
}

export async function GET(request: Request) {
  // ── Layer 3 of the /admin gate: authoritative super-admin check. ──
  const gate = await requireSuperAdminApi();
  if (gate instanceof NextResponse) return gate; // 403 — do nothing else.

  // Audit the authorized cross-tenant access (best-effort; never throws).
  await logSuperAdminAccess({
    userId: gate.userId,
    email: gate.email,
    surface: "admin:api/growth",
    request,
  });

  // Validate the untrusted ?range= param; anything else falls back to 30d.
  const rangeParam = new URL(request.url).searchParams.get("range");
  const range: AdminRange = isAdminRange(rangeParam) ? rangeParam : "30d";

  try {
    // Cache the (gated) domain reads for 5 min, keyed by range, so dashboard
    // refresh bursts don't each re-scan the source tables.
    const payload = await withCache(
      `admin:growth:${range}`,
      () => buildGrowthPayload(range),
      300,
    );
    return NextResponse.json(payload);
  } catch (error) {
    // Generic 500 — never leak the underlying DB/error detail to the client.
    logger.error("[admin/v2/growth] Error", error);
    return NextResponse.json(
      { error: "Failed to load growth" },
      { status: 500 },
    );
  }
}
