import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Package,
  Users,
  ArrowRight,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CalendarClock,
  type LucideIcon,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import { getComplianceHealth } from "@/lib/trade/compliance-health-service";
import { getActivityFeed } from "@/lib/trade/welcome-feed/activity-feed-service";
import { aggregateActionItems } from "@/lib/trade/action-inbox-aggregator";
import { ComplianceHealthPanel } from "./_components/ComplianceHealthPanel";
import { ActivityFeedPanel } from "./_components/ActivityFeedPanel";
import { ActionInboxPanel } from "./_components/ActionInboxPanel";
import { OnboardingBanner } from "./_components/OnboardingBanner";
import {
  UpcomingDeadlinesStrip,
  assembleDeadlines,
} from "./_components/UpcomingDeadlinesStrip";
import { WorkspaceHeader } from "./_components/WorkspaceHeader";
import { QuickStartGrid } from "./_components/QuickStartGrid";
import { CompliancePostureCard } from "./_components/CompliancePostureCard";

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
    unclassifiedItemsCount,
    partiesTotal,
    partiesByStatus,
    operationsTotal,
    operationsByStatus,
    licensesActiveCount,
    licensesExpiringSoon,
    complianceHealth,
    activityEvents,
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

  const openOperations =
    (operationsMap.DRAFT ?? 0) +
    (operationsMap.AWAITING_CLASSIFICATION ?? 0) +
    (operationsMap.SCREENING ?? 0) +
    (operationsMap.AWAITING_LICENSE ?? 0) +
    (operationsMap.LICENSED ?? 0);

  const partiesNeedingReview =
    (partiesMap.POTENTIAL_MATCH ?? 0) +
    (partiesMap.CONFIRMED_HIT ?? 0) +
    (partiesMap.STALE ?? 0);

  const hasAnyData =
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

  const upcomingDeadlines = assembleDeadlines({
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

  return (
    <div className="mx-auto max-w-[1200px] px-10 py-10">
      {/* Apple-style Workspace header — replaces large H1 + LIVE pill */}
      <WorkspaceHeader orgName={org?.name ?? "your workspace"} />

      {/* QuickStart grid — Apple-style hero cards with 3D illustrations.
          The previous KpiCardsRow (Key indicators) is suppressed in this
          iteration to reduce visual duplication — QuickStart covers the
          same entities with stronger visual hierarchy. */}
      <QuickStartGrid
        itemsCount={itemsCount}
        unclassifiedItemsCount={unclassifiedItemsCount}
        partiesTotal={partiesTotal}
        partiesNeedingReview={partiesNeedingReview}
        licensesActiveCount={licensesActiveCount}
        licensesExpiringCount={licensesExpiringSoon.length}
        openOperations={openOperations}
        operationsTotal={operationsTotal}
      />

      {/* Compliance Posture — NEW killer card aggregating the 9 engines */}
      <CompliancePostureCard />

      {/* Today's Action Inbox (U-HIGH-1) — what needs human action right now.
          Sits above UpcomingDeadlinesStrip because "act now" beats "act in
          14 days" for daily-triage attention. */}
      <ActionInboxPanel items={actionItems} />

      {/* Upcoming deadlines strip (Sprint Welcome-Polish) */}
      <UpcomingDeadlinesStrip deadlines={upcomingDeadlines} now={now} />

      {/* Recent activity feed (Sprint Welcome-Polish) */}
      <ActivityFeedPanel events={activityEvents} now={now} />

      {/* Compliance health — EUC + Re-Export + VSD workflow surfaces */}
      <ComplianceHealthPanel summary={complianceHealth} />

      {/* First-run onboarding banner (U-CRIT-2 MVP). Renders only when
          the org has zero Trade data — once any item/party/operation
          exists, the banner hides itself. Offers 4 entry paths:
          seed sample data, ask Astra, ⌘K palette, help center. */}
      {!hasAnyData && <OnboardingBanner />}

      {/* Expiring licenses alert */}
      {licensesExpiringSoon.length > 0 && (
        <section className="mb-8 rounded-md border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="flex-1">
              <h3 className="text-[14px] font-semibold text-amber-800">
                {licensesExpiringSoon.length} license
                {licensesExpiringSoon.length === 1 ? "" : "s"} expiring within
                90 days
              </h3>
              <ul className="mt-2 space-y-1 text-[12px] text-amber-900">
                {licensesExpiringSoon.map((lic) => {
                  const days = Math.floor(
                    (new Date(lic.validUntil!).getTime() - Date.now()) /
                      (1000 * 60 * 60 * 24),
                  );
                  return (
                    <li key={lic.id} className="flex items-center gap-2">
                      <span className="font-mono">
                        {lic.licenseNumber ?? lic.licenseType}
                      </span>
                      <span>
                        — {days}d left (until{" "}
                        {new Date(lic.validUntil!).toLocaleDateString("en-GB")})
                      </span>
                    </li>
                  );
                })}
              </ul>
              <Link
                href="/trade/licenses"
                className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-amber-700 transition hover:text-amber-900"
              >
                Review licenses
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Sanctions screening strip */}
      {partiesTotal > 0 && (
        <section className="mb-8 rounded-md border border-trade-border-subtle bg-trade-bg-panel p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-trade-text-secondary">
              Counterparty Screening
            </h2>
            <Link
              href="/trade/parties"
              className="text-[11px] text-trade-text-secondary transition hover:text-trade-text-primary"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <ScreeningBucket
              label="Clear"
              count={partiesMap.CLEAR ?? 0}
              total={partiesTotal}
              icon={ShieldCheck}
              tone="ok"
            />
            <ScreeningBucket
              label="Potential"
              count={partiesMap.POTENTIAL_MATCH ?? 0}
              total={partiesTotal}
              icon={AlertTriangle}
              tone="warn"
            />
            <ScreeningBucket
              label="Confirmed"
              count={partiesMap.CONFIRMED_HIT ?? 0}
              total={partiesTotal}
              icon={ShieldAlert}
              tone="danger"
            />
            <ScreeningBucket
              label="Stale"
              count={partiesMap.STALE ?? 0}
              total={partiesTotal}
              icon={Clock}
              tone="stale"
            />
            <ScreeningBucket
              label="Not screened"
              count={partiesMap.NOT_SCREENED ?? 0}
              total={partiesTotal}
              icon={Users}
              tone="muted"
            />
          </div>
        </section>
      )}

      {/* Operations pipeline */}
      {operationsTotal > 0 && (
        <section className="mb-8 rounded-md border border-trade-border-subtle bg-trade-bg-panel p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-trade-text-secondary">
              Operations Pipeline
            </h2>
            <Link
              href="/trade/operations"
              className="text-[11px] text-trade-text-secondary transition hover:text-trade-text-primary"
            >
              View all →
            </Link>
          </div>
          <PipelineBar opsByStatus={operationsMap} total={operationsTotal} />
        </section>
      )}

      {/* Footer disclaimer */}
      <p
        lang="de"
        className="mt-10 max-w-3xl text-[11px] leading-relaxed text-trade-text-muted"
      >
        Caelex Trade ist ein Decision-Support-Werkzeug für Export-Compliance —
        kein Counsel. Jede Klassifizierungs-, Screening- oder Lizenz-
        Entscheidung ist von einem qualifizierten Ausfuhrverantwortlichen zu
        verifizieren, bevor Güter physisch oder elektronisch bewegt werden.
      </p>
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

// ─── Screening bucket ─────────────────────────────────────────────────

interface ScreeningBucketProps {
  label: string;
  count: number;
  total: number;
  icon: LucideIcon;
  tone: "ok" | "warn" | "danger" | "stale" | "muted";
}

function ScreeningBucket({
  label,
  count,
  total,
  icon: Icon,
  tone,
}: ScreeningBucketProps) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const toneClass = {
    ok: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    warn: "bg-amber-50 text-amber-700 ring-amber-200",
    danger: "bg-red-50 text-red-700 ring-red-200",
    stale: "bg-orange-50 text-orange-700 ring-orange-200",
    muted:
      "bg-trade-bg-subtle text-trade-text-secondary ring-trade-border-subtle",
  }[tone];

  return (
    <div className={`rounded-md p-3 ring-1 ${toneClass}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1 text-[22px] font-bold leading-none tabular-nums">
        {count}
      </div>
      <div className="mt-0.5 text-[10px] opacity-75">{pct.toFixed(0)}%</div>
    </div>
  );
}

// ─── Pipeline bar ─────────────────────────────────────────────────────

function PipelineBar({
  opsByStatus,
  total,
}: {
  opsByStatus: Record<string, number>;
  total: number;
}) {
  const segments: {
    status: string;
    label: string;
    count: number;
    className: string;
  }[] = [
    {
      status: "DRAFT",
      label: "Draft",
      count: opsByStatus.DRAFT ?? 0,
      className: "bg-slate-300",
    },
    {
      status: "AWAITING_CLASSIFICATION",
      label: "Classification",
      count: opsByStatus.AWAITING_CLASSIFICATION ?? 0,
      className: "bg-amber-300",
    },
    {
      status: "SCREENING",
      label: "Screening",
      count: opsByStatus.SCREENING ?? 0,
      className: "bg-amber-400",
    },
    {
      status: "AWAITING_LICENSE",
      label: "License",
      count: opsByStatus.AWAITING_LICENSE ?? 0,
      className: "bg-amber-500",
    },
    {
      status: "LICENSED",
      label: "Licensed",
      count: opsByStatus.LICENSED ?? 0,
      className: "bg-blue-400",
    },
    {
      status: "EXECUTED",
      label: "Executed",
      count: opsByStatus.EXECUTED ?? 0,
      className: "bg-emerald-500",
    },
    {
      status: "BLOCKED",
      label: "Blocked",
      count: opsByStatus.BLOCKED ?? 0,
      className: "bg-red-500",
    },
    {
      status: "VOLUNTARY_DISCLOSURE_FILED",
      label: "VDisc",
      count: opsByStatus.VOLUNTARY_DISCLOSURE_FILED ?? 0,
      className: "bg-red-700",
    },
  ];

  const nonZero = segments.filter((s) => s.count > 0);

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-trade-bg-subtle">
        {nonZero.map((s) => (
          <div
            key={s.status}
            className={s.className}
            style={{ width: `${(s.count / total) * 100}%` }}
            title={`${s.label}: ${s.count}`}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 md:grid-cols-4">
        {segments.map((s) => (
          <div key={s.status} className="flex items-center gap-2 text-[11px]">
            <span className={`h-2 w-2 shrink-0 rounded ${s.className}`} />
            <span className="text-trade-text-secondary">{s.label}</span>
            <span className="ml-auto font-mono text-trade-text-primary">
              {s.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
