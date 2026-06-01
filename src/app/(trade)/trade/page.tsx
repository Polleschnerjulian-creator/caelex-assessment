import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import { getComplianceHealth } from "@/lib/trade/compliance-health-service";
import { getActivityFeed } from "@/lib/trade/welcome-feed/activity-feed-service";
import { aggregateActionItems } from "@/lib/trade/action-inbox-aggregator";
import { pickHeroAction } from "@/lib/trade/home-hero";
import { ActionInboxPanel } from "./_components/ActionInboxPanel";
import { assembleDeadlines } from "./_components/UpcomingDeadlinesStrip";
import { HomeHero } from "./_components/HomeHero";
import { HomeOnboarding } from "./_components/HomeOnboarding";
import { ApplicabilityGateBanner } from "./_components/ApplicabilityGateBanner";
import { MiniStatsStrip } from "./_components/MiniStatsStrip";
import { TradeCommandTrigger } from "./_components/TradeCommandTrigger";

export const metadata = {
  title: "Caelex Trade — Dashboard",
};

/**
 * Caelex Trade — Welcome dashboard (Sprint A5).
 *
 * Replaces the T2 placeholder tiles with real org-scoped aggregates
 * pulled directly via Prisma (same pattern as layout.tsx — the route
 * is server-only and behind the TRADE product-access gate so a single
 * round-trip is appropriate).
 *
 * Surfaces:
 *   1. Four KPI tiles — Items, Counterparties, Active Licenses, Open
 *      Operations — each clickable, linking to the corresponding list
 *      page. Each tile shows a sub-count where it adds value
 *      (e.g. unclassified items, parties needing review, expiring
 *      licenses, in-progress operations).
 *   2. Sanctions-screening status strip — distribution of party rows
 *      across CLEAR / POTENTIAL_MATCH / CONFIRMED_HIT / NOT_SCREENED /
 *      STALE buckets. The first three are the action signals; the
 *      last two surface follow-up work.
 *   3. Operations pipeline — distribution across the lifecycle status
 *      states, visualised as a horizontal stacked bar so the operator
 *      sees the flow shape at a glance.
 *   4. Expiring-licenses alert — only renders when ≥1 license is
 *      within 90 days of validUntil. Click-through goes to /trade/
 *      licenses with an implicit filter.
 *
 * If the org has no Trade data yet, an empty-state hero CTA points at
 * /trade/items to start the workflow.
 */
export default async function TradeDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/trade-login?callbackUrl=%2Ftrade");
  }

  const orgId = await resolveOrgId(session.user.id, session.user.email);
  const now = new Date();
  const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Parallel-fetch all aggregates. complianceHealth bundles
  // EUC + Re-Export + VSD into a single roundtrip via its own
  // internal Promise.all (Sprint X1). KPIs + activity feed +
  // deadline-source rows are added in Sprint Welcome-Polish.
  const [
    org,
    itemsCount,
    _unclassifiedItemsCount,
    partiesTotal,
    partiesByStatus,
    operationsTotal,
    operationsByStatus,
    licensesActiveCount,
    licensesExpiringSoon,
    _complianceHealth,
    _activityEvents,
    eucDeadlineRows,
    reexportDeadlineRows,
    sammelgenehmigungDeadlineRows,
    supplement2DeadlineRows,
    vsdDeadlineRows,
    // ── U-HIGH-1 action-inbox cohorts (read in parallel with the rest) ──
    blockedOperationRows,
    awaitingEucRows,
    partiesNeedingReviewRows,
    vsdsDiscoveredRows,
    // ── Applicability front-door state (gate banner vs "dein Geltungsbereich") ──
    applicabilityProfile,
  ] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    }),
    prisma.tradeItem.count({ where: { organizationId: orgId } }),
    prisma.tradeItem.count({
      where: {
        organizationId: orgId,
        status: { in: ["DRAFT", "REQUIRES_REVIEW"] },
      },
    }),
    prisma.tradeParty.count({ where: { organizationId: orgId } }),
    prisma.tradeParty.groupBy({
      where: { organizationId: orgId },
      by: ["screeningStatus"],
      _count: { _all: true },
    }),
    prisma.tradeOperation.count({ where: { organizationId: orgId } }),
    prisma.tradeOperation.groupBy({
      where: { organizationId: orgId },
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.tradeLicense.count({
      where: { organizationId: orgId, status: "ACTIVE" },
    }),
    prisma.tradeLicense.findMany({
      where: {
        organizationId: orgId,
        status: "ACTIVE",
        validUntil: {
          lte: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
          gte: now,
        },
      },
      select: {
        id: true,
        licenseType: true,
        licenseNumber: true,
        validUntil: true,
      },
      orderBy: { validUntil: "asc" },
      take: 5,
    }),
    getComplianceHealth(orgId),
    getActivityFeed(orgId, { now, maxItems: 20, windowDays: 30 }),
    prisma.tradeEUCRequest.findMany({
      where: {
        organizationId: orgId,
        status: "VALIDATED",
        validUntil: { gte: now, lte: thirtyDaysAhead },
      },
      select: {
        id: true,
        validUntil: true,
        formType: true,
        party: { select: { legalName: true } },
      },
      orderBy: { validUntil: "asc" },
    }),
    prisma.tradeReexportConsent.findMany({
      where: {
        organizationId: orgId,
        status: "APPROVED",
        validUntil: { gte: now, lte: thirtyDaysAhead },
      },
      select: {
        id: true,
        validUntil: true,
        newDestinationCountry: true,
        newEndUserName: true,
      },
      orderBy: { validUntil: "asc" },
    }),
    prisma.tradeSammelgenehmigung.findMany({
      where: {
        organizationId: orgId,
        status: "ACTIVE",
        validUntil: { gte: now, lte: thirtyDaysAhead },
      },
      select: {
        id: true,
        validUntil: true,
        title: true,
        bafaReference: true,
      },
      orderBy: { validUntil: "asc" },
    }),
    prisma.tradeSupplement2Report.findMany({
      where: {
        organizationId: orgId,
        status: "DRAFT",
        dueDate: { gte: now, lte: thirtyDaysAhead },
      },
      select: {
        id: true,
        dueDate: true,
        reportingPeriod: true,
      },
      orderBy: { dueDate: "asc" },
    }),
    // VSDs in pre-filing states with imminent authority clocks. We
    // surface OFAC 60-day, BIS 90-day, others 180-day as deadlineAt
    // anchors. The map below resolves the deadline anchor based on
    // authority + discoveredAt.
    prisma.tradeVoluntaryDisclosure.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["DISCOVERED", "INVESTIGATING", "DRAFTED"] },
      },
      select: {
        id: true,
        title: true,
        authority: true,
        discoveredAt: true,
      },
      orderBy: { discoveredAt: "asc" },
    }),
    // ── U-HIGH-1 action-inbox fetches ──
    prisma.tradeOperation.findMany({
      where: { organizationId: orgId, status: "BLOCKED" },
      select: {
        id: true,
        reference: true,
        counterparty: { select: { legalName: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.tradeEUCRequest.findMany({
      where: { organizationId: orgId, status: "SENT_TO_PARTY" },
      select: {
        id: true,
        sentAt: true,
        party: { select: { legalName: true } },
      },
      orderBy: { sentAt: "asc" },
      take: 20,
    }),
    prisma.tradeParty.findMany({
      where: {
        organizationId: orgId,
        screeningStatus: {
          in: ["POTENTIAL_MATCH", "CONFIRMED_HIT", "STALE"],
        },
      },
      select: { id: true, legalName: true, screeningStatus: true },
      orderBy: { lastScreenedAt: "asc" },
      take: 20,
    }),
    prisma.tradeVoluntaryDisclosure.findMany({
      where: { organizationId: orgId, status: "DISCOVERED" },
      select: { id: true, title: true, discoveredAt: true },
      orderBy: { discoveredAt: "asc" },
      take: 20,
    }),
    // Applicability front-door: completion marker gates the home banner; the
    // persisted regime tags feed the "dein Geltungsbereich" summary chip.
    prisma.tradeOrgProfile.findUnique({
      where: { organizationId: orgId },
      select: {
        applicabilityCompletedAt: true,
        preferredRegimesJson: true,
      },
    }),
  ]);

  // Reshape group-by results into lookup maps.
  const partiesMap: Record<string, number> = {};
  for (const row of partiesByStatus) {
    partiesMap[row.screeningStatus] = row._count._all;
  }
  const operationsMap: Record<string, number> = {};
  for (const row of operationsByStatus) {
    operationsMap[row.status] = row._count._all;
  }

  const _openOperations =
    (operationsMap.DRAFT ?? 0) +
    (operationsMap.AWAITING_CLASSIFICATION ?? 0) +
    (operationsMap.SCREENING ?? 0) +
    (operationsMap.AWAITING_LICENSE ?? 0) +
    (operationsMap.LICENSED ?? 0);

  const _partiesNeedingReview =
    (partiesMap.POTENTIAL_MATCH ?? 0) +
    (partiesMap.CONFIRMED_HIT ?? 0) +
    (partiesMap.STALE ?? 0);

  const _hasAnyData =
    itemsCount > 0 ||
    partiesTotal > 0 ||
    operationsTotal > 0 ||
    licensesActiveCount > 0;

  // Resolve VSD authority clocks to concrete deadline dates. The
  // deadline anchor is `discoveredAt + authority window`. We surface
  // only deadlines that fall within the next 30 days (i.e. the row is
  // still pre-clock-crossing but the clock is closing in).
  const vsdAuthorityWindowDays: Record<string, number> = {
    OFAC: 60,
    BIS: 90,
    DDTC: 180,
    BAFA: 180,
    EU_COMPETENT_AUTHORITY: 180,
    OTHER: 180,
  };
  const vsdDeadlinesNext30: Array<{
    id: string;
    title: string;
    authority: string;
    deadlineAt: Date;
  }> = [];
  for (const vsd of vsdDeadlineRows) {
    const windowDays = vsdAuthorityWindowDays[vsd.authority as string] ?? 180;
    const deadlineAt = new Date(
      vsd.discoveredAt.getTime() + windowDays * 24 * 60 * 60 * 1000,
    );
    if (deadlineAt >= now && deadlineAt <= thirtyDaysAhead) {
      vsdDeadlinesNext30.push({
        id: vsd.id,
        title: vsd.title,
        authority: vsd.authority,
        deadlineAt,
      });
    }
  }

  const _upcomingDeadlines = assembleDeadlines({
    eucs: eucDeadlineRows,
    reexports: reexportDeadlineRows,
    sammelgenehmigungen: sammelgenehmigungDeadlineRows,
    supplement2: supplement2DeadlineRows,
    vsdDeadlines: vsdDeadlinesNext30,
  });

  // Action inbox — pure-function aggregator over the cohorts above.
  // The aggregator owns severity classification + sorting; the panel
  // is presentation-only.
  const actionItems = aggregateActionItems({
    blockedOperations: blockedOperationRows.map((op) => ({
      id: op.id,
      reference: op.reference,
      counterpartyName: op.counterparty?.legalName ?? null,
    })),
    licensesExpiringSoon: licensesExpiringSoon
      .filter(
        (l): l is typeof l & { validUntil: Date } => l.validUntil !== null,
      )
      .map((l) => ({
        id: l.id,
        licenseNumber: l.licenseNumber,
        licenseType: l.licenseType,
        validUntil: l.validUntil,
      })),
    eucsAwaitingAction: awaitingEucRows.map((euc) => ({
      id: euc.id,
      sentAt: euc.sentAt,
      partyName: euc.party.legalName,
    })),
    partiesNeedingReview: partiesNeedingReviewRows
      // The Prisma enum is wider than the aggregator cohort; narrow at
      // the boundary so the aggregator's type guarantees hold.
      .filter(
        (
          p,
        ): p is typeof p & {
          screeningStatus: "POTENTIAL_MATCH" | "CONFIRMED_HIT" | "STALE";
        } =>
          p.screeningStatus === "POTENTIAL_MATCH" ||
          p.screeningStatus === "CONFIRMED_HIT" ||
          p.screeningStatus === "STALE",
      )
      .map((p) => ({
        id: p.id,
        legalName: p.legalName,
        screeningStatus: p.screeningStatus,
      })),
    vsdDeadlinesNear: vsdDeadlinesNext30,
    vsdsNeedingInvestigation: vsdsDiscoveredRows.map((v) => ({
      id: v.id,
      title: v.title,
      discoveredAt: v.discoveredAt,
    })),
    now,
  });

  const heroState = pickHeroAction(actionItems, {
    items: itemsCount,
    parties: partiesTotal,
    operations: operationsTotal,
  });
  const showOnboarding = heroState.variant === "onboarding";

  // Applicability front-door state. Until the triage is completed, the
  // onboarding branch leads with the gate banner; once done, it shows a
  // compact "dein Geltungsbereich" chip summarising the regimes that apply.
  const applicabilityDone = Boolean(
    applicabilityProfile?.applicabilityCompletedAt,
  );
  const applicabilityRegimeLabel = summariseRegimes(
    applicabilityProfile?.preferredRegimesJson ?? null,
  );

  const miniStats = [
    { label: "Vorgänge aktiv", value: String(operationsTotal) },
    { label: "Artikel", value: String(itemsCount) },
    { label: "Partner", value: String(partiesTotal) },
    { label: "Regime aktiv", value: "16" },
  ];

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-trade-text-muted">
            {new Date().toLocaleDateString("de-DE", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}{" "}
            · {org?.name ?? "Workspace"}
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-trade-text-primary">
            {showOnboarding ? "Willkommen 👋" : "Guten Tag 👋"}
          </h1>
        </div>
        <TradeCommandTrigger />
      </div>

      {showOnboarding ? (
        <div className="mt-6 space-y-5">
          {applicabilityDone ? (
            <Link
              href="/trade/applicability"
              className="flex items-center justify-between gap-3 rounded-lg border border-trade-border bg-trade-bg-panel px-4 py-3 transition hover:bg-trade-hover"
            >
              <div className="min-w-0">
                <div className="text-[10px] font-medium uppercase tracking-wide text-trade-text-muted">
                  Dein Geltungsbereich
                </div>
                <div className="mt-0.5 truncate text-[13px] font-medium text-trade-text-primary">
                  {applicabilityRegimeLabel}
                </div>
              </div>
              <span className="shrink-0 text-[12px] font-medium text-trade-accent-strong">
                Einschätzung ansehen
              </span>
            </Link>
          ) : (
            <ApplicabilityGateBanner />
          )}
          <HomeOnboarding />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <HomeHero state={heroState} />
          <ActionInboxPanel items={actionItems} />
          <MiniStatsStrip stats={miniStats} />
        </div>
      )}
    </div>
  );
}

async function resolveOrgId(
  userId: string,
  email: string | null | undefined,
): Promise<string> {
  if (isSuperAdmin(email)) {
    const anyOrg = await prisma.organization.findFirst({
      where: { isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    return anyOrg?.id ?? "super-admin-no-org";
  }
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organization: { isActive: true } },
    select: { organization: { select: { id: true } } },
    orderBy: { joinedAt: "asc" },
  });
  return membership?.organization.id ?? "no-org";
}

/**
 * Render the persisted `preferredRegimesJson` (e.g. `["BAFA","BIS"]`) as a
 * short German "dein Geltungsbereich" summary for the home chip. Always
 * leads with EU Dual-Use (the baseline most orgs share); appends the
 * national/US authorities the triage flagged. Tolerant of malformed JSON.
 */
function summariseRegimes(raw: string | null): string {
  const baseline = "EU Dual-Use";
  if (!raw) return baseline;
  let tags: string[] = [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      tags = parsed.filter((t): t is string => typeof t === "string");
    }
  } catch {
    return baseline;
  }
  const labels: string[] = [baseline];
  if (tags.includes("BAFA")) labels.push("BAFA");
  if (tags.includes("BIS")) labels.push("US EAR (BIS)");
  if (tags.includes("DDTC")) labels.push("US ITAR (DDTC)");
  return labels.join(" · ");
}
