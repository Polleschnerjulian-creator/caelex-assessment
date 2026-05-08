import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Inbox,
  Calendar,
  Eye,
  X,
  BarChart3,
  Radio,
  ListChecks,
  FolderOpen,
  ArrowRight,
  Sparkles,
  Check,
  Gauge,
  ShieldCheck,
  FileSearch,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { auth } from "@/lib/auth";
import {
  getTodayInboxForUser,
  getComplianceItemsForUser,
  getClearedTodayCountForUser,
} from "@/lib/comply-v2/compliance-item.server";
import {
  getOnboardingSetupState,
  type OnboardingSetupState,
} from "@/lib/comply-v2/onboarding-state.server";
import {
  type ComplianceItem,
  type ComplianceStatus,
  type RegulationKey,
  REGULATIONS,
  REGULATION_LABELS,
} from "@/lib/comply-v2/types";
import { Badge } from "@/components/ui/v2/badge";
import { ComplianceItemCard } from "@/components/dashboard/v2/ComplianceItemCard";

export const metadata = {
  title: "Today — Caelex Comply",
  description: "What needs your attention this week.",
};

// Auth-gated + uses session-keyed DB queries via Promise.all. The
// dashboard layout already exports force-dynamic which would cover
// us implicitly, but every other V2 server page sets it explicitly
// — making it explicit here keeps the convention uniform and protects
// against accidental SSG if the layout flag is ever dropped.
export const dynamic = "force-dynamic";

/**
 * Today inbox — the Mercury-pattern landing surface for Comply v2.
 *
 * Default landing for v2 users (Phase 2 will redirect /dashboard →
 * /dashboard/today when complyUiVersion === "v2"). Today reachable
 * via Cmd-K and the V2Shell preview banner.
 *
 * Three sections:
 *   • URGENT      — items the user should action today
 *   • THIS WEEK   — items needing attention by EOW
 *   • WATCHING    — items in flight (under review or draft)
 *                   plus any items the user has explicitly snoozed
 *
 * Each card has an action menu (Snooze / Wake / Note) wired to
 * Server Actions in `./server-actions.ts`. Actions are defined via
 * the defineAction() framework in src/lib/comply-v2/actions/.
 */
interface TodayPageProps {
  searchParams: Promise<{
    regulation?: string;
    status?: string;
    /** Set to "1" to render mock items so the populated UI is visible
     *  before any real ComplianceItems exist. Sprint-1 dev aid only —
     *  no DB writes happen, snooze/attest actions on demo items are
     *  no-ops. */
    demo?: string;
  }>;
}

const STATUS_PARAM_VALUES: Record<string, ComplianceStatus> = {
  pending: "PENDING",
  draft: "DRAFT",
  evidence: "EVIDENCE_REQUIRED",
  review: "UNDER_REVIEW",
  attested: "ATTESTED",
  expired: "EXPIRED",
};

/**
 * Mock ComplianceItem fixtures used when ?demo=1. Cover all 3 buckets,
 * mix of regulations + statuses so every NextStep CTA variant from
 * Sprint 1.2 (CONNECT_SENTINEL / UPLOAD_EVIDENCE / RUN_ASSESSMENT /
 * REVIEW_DRAFT / ATTEST / WAIT_FOR_APPROVAL) renders at least once.
 *
 * Targets are absolute dates relative to now() so the priority-bucket
 * computation places them in the buckets we want.
 */
function buildDemoInbox(userId: string): {
  urgent: ComplianceItem[];
  thisWeek: ComplianceItem[];
  watching: ComplianceItem[];
  snoozedUntilByItemId: Record<string, string>;
  /** Sprint UF46 — match the live shape so the Section "X of Y" hint
   *  works in demo mode too. With only 7 hand-curated items there's
   *  no truncation, so totals == lengths. */
  totals: { urgent: number; thisWeek: number; watching: number };
} {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const future = (days: number) => new Date(now + days * day);

  const urgent: ComplianceItem[] = [
    {
      id: "DEBRIS:demo_1",
      rowId: "demo_1",
      regulation: "DEBRIS",
      userId,
      requirementId: "Art. 70",
      status: "EVIDENCE_REQUIRED",
      notes: null,
      evidenceNotes: null,
      targetDate: future(2),
      updatedAt: new Date(now - 6 * 60 * 60 * 1000),
      priority: "URGENT",
    },
    {
      id: "NIS2:demo_2",
      rowId: "demo_2",
      regulation: "NIS2",
      userId,
      requirementId: "Art. 23",
      status: "EVIDENCE_REQUIRED",
      notes: "24-hour incident notification — last drill confirmed gap.",
      evidenceNotes: null,
      targetDate: future(4),
      updatedAt: new Date(now - 18 * 60 * 60 * 1000),
      priority: "URGENT",
    },
    {
      id: "CYBERSECURITY:demo_3",
      rowId: "demo_3",
      regulation: "CYBERSECURITY",
      userId,
      requirementId: "Art. 21.2.e",
      status: "EXPIRED",
      notes: null,
      evidenceNotes: null,
      targetDate: future(-3),
      updatedAt: new Date(now - 4 * day),
      priority: "URGENT",
    },
  ];

  const thisWeek: ComplianceItem[] = [
    {
      id: "UK_SPACE_ACT:demo_4",
      rowId: "demo_4",
      regulation: "UK_SPACE_ACT",
      userId,
      requirementId: "Sec. 5",
      status: "PENDING",
      notes: null,
      evidenceNotes: null,
      targetDate: future(12),
      updatedAt: new Date(now - 2 * day),
      priority: "HIGH",
    },
    {
      id: "EXPORT_CONTROL:demo_5",
      rowId: "demo_5",
      regulation: "EXPORT_CONTROL",
      userId,
      requirementId: "EAR §734",
      status: "DRAFT",
      notes:
        "Astra prepared an EAR commodity classification draft based on your bus data — review the proposed ECCN.",
      evidenceNotes: null,
      targetDate: future(18),
      updatedAt: new Date(now - 12 * 60 * 60 * 1000),
      priority: "HIGH",
    },
  ];

  const watching: ComplianceItem[] = [
    {
      id: "SPECTRUM:demo_6",
      rowId: "demo_6",
      regulation: "SPECTRUM",
      userId,
      requirementId: "ITU §11.2",
      status: "UNDER_REVIEW",
      notes: "Submitted to BNetzA last Friday — typical review window 14 days.",
      evidenceNotes: null,
      targetDate: future(28),
      updatedAt: new Date(now - 5 * day),
      priority: "MEDIUM",
    },
    {
      id: "CRA:demo_7",
      rowId: "demo_7",
      regulation: "CRA",
      userId,
      requirementId: "Annex I.1",
      status: "DRAFT",
      notes:
        "Cyber Resilience Act applicability assessment — ground-segment software falls under Class II per @niklas's analysis.",
      evidenceNotes: null,
      targetDate: future(40),
      updatedAt: new Date(now - 3 * day),
      priority: "MEDIUM",
    },
  ];

  return {
    urgent,
    thisWeek,
    watching,
    // One item explicitly snoozed for 7d to show the "snoozed" badge.
    snoozedUntilByItemId: {
      "CRA:demo_7": new Date(now + 7 * day).toISOString(),
    },
    totals: {
      urgent: urgent.length,
      thisWeek: thisWeek.length,
      watching: watching.length,
    },
  };
}

export default async function TodayInboxPage({ searchParams }: TodayPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/today");
  }

  // Sprint 1 (2026-05-05): /dashboard/today is now the universal
  // landing for both V1 and V2 users. The previous V1-redirect to
  // /dashboard is gone — instead /dashboard now redirects HERE, and
  // /dashboard/legacy preserves the V1 chart dashboard for users who
  // want it back. See docs/COMPLY-WORKFLOW-PLAN.md.

  // Parse URL filter params. Filter mode = filtered flat list,
  // unfiltered mode = the 3-section Mercury inbox.
  const sp = await searchParams;
  const filterRegulation =
    sp.regulation && REGULATIONS.includes(sp.regulation as RegulationKey)
      ? (sp.regulation as RegulationKey)
      : null;
  const filterStatus =
    sp.status && STATUS_PARAM_VALUES[sp.status]
      ? STATUS_PARAM_VALUES[sp.status]
      : null;
  const filterActive = filterRegulation !== null || filterStatus !== null;
  const demoMode = sp.demo === "1";

  // Branch: filtered = flat list; unfiltered = 3-section inbox.
  let filteredItems: ComplianceItem[] = [];
  let inbox: Awaited<ReturnType<typeof getTodayInboxForUser>> | null = null;
  let total: number;

  // Cleared-today KPI runs in parallel with the inbox query so it
  // doesn't add latency. Counts ComplianceItemSnoozes created since
  // 00:00 UTC — the cleanest "user took an action" signal we have today.
  let clearedToday = 0;

  if (demoMode) {
    // Demo path — bypass DB entirely. Filters still apply to the demo
    // set so the user can poke at the FilterBar with realistic data.
    const demo = buildDemoInbox(session.user.id);
    inbox = demo;
    total = demo.totals.urgent + demo.totals.thisWeek + demo.totals.watching;
    clearedToday = 4; // sample value to show the KPI chip populated
    if (filterActive) {
      const all = [...demo.urgent, ...demo.thisWeek, ...demo.watching];
      filteredItems = all.filter(
        (i) =>
          (!filterRegulation || i.regulation === filterRegulation) &&
          (!filterStatus || i.status === filterStatus),
      );
      total = filteredItems.length;
    }
  } else if (filterActive) {
    [filteredItems, clearedToday] = await Promise.all([
      getComplianceItemsForUser(session.user.id, {
        regulations: filterRegulation ? [filterRegulation] : undefined,
        statuses: filterStatus ? [filterStatus] : undefined,
        limit: 200,
      }),
      getClearedTodayCountForUser(session.user.id),
    ]);
    total = filteredItems.length;
  } else {
    [inbox, clearedToday] = await Promise.all([
      getTodayInboxForUser(session.user.id),
      getClearedTodayCountForUser(session.user.id),
    ]);
    // Sprint UF46 — use pre-cap totals so the page-level total
    // reflects what the operator actually has (not what fits in the
    // 100-cap render).
    total = inbox.totals.urgent + inbox.totals.thisWeek + inbox.totals.watching;
  }

  // True empty-state: no items in any bucket AND no filter applied.
  // Surfaces the onboarding hero instead of three sad "Nothing X" cards.
  const isOnboardingEmpty = !filterActive && total === 0;

  // Setup-state powers the smart Today empty state. Only fetched when
  // we'd actually render the empty state (saves a query on the
  // populated path). Demo mode is always "all_done" since it pretends
  // the user has data.
  const setupState: OnboardingSetupState | null =
    isOnboardingEmpty && !demoMode
      ? await getOnboardingSetupState(session.user.id)
      : null;

  // When the user has no items at all, render a centered narrower
  // layout per Apple HIG empty-state convention. The populated state
  // gets the wide max-w-[1600px] inbox layout.
  const containerClass = isOnboardingEmpty
    ? "mx-auto max-w-3xl px-6 py-12 sm:px-10"
    : "mx-auto max-w-[1600px] px-6 py-8 sm:px-10 lg:px-14";

  return (
    <div className={containerClass}>
      {demoMode ? (
        <div className="apple-glass-card mb-6 flex items-center justify-between gap-4 px-4 py-2 text-[13px]">
          <span className="inline-flex items-center gap-2">
            <Sparkles
              className="h-3.5 w-3.5"
              style={{ color: "var(--ios-yellow)" }}
              strokeWidth={2}
            />
            <strong className="font-semibold text-white">Demo mode</strong>
            <span style={{ color: "var(--ios-label-secondary)" }}>
              Showing 7 mock items. Snooze / attest actions are no-ops.
            </span>
          </span>
          <Link
            href="/dashboard/today"
            className="font-medium text-white underline-offset-4 hover:underline"
          >
            Exit demo
          </Link>
        </div>
      ) : null}

      {!isOnboardingEmpty ? (
        <header className="mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-white/[0.06] pb-5">
          <div className="min-w-0">
            <h1
              className="text-[34px] font-semibold tracking-tight text-white sm:text-[34px]"
              style={{
                letterSpacing: "-0.022em",
                fontFamily:
                  '-apple-system, "SF Pro Display", system-ui, sans-serif',
                lineHeight: 1.1,
              }}
            >
              Today
            </h1>
            <p
              className="mt-1.5 max-w-2xl text-[15px]"
              style={{
                color: "var(--ios-label-secondary)",
                letterSpacing: "-0.011em",
              }}
            >
              {filterActive
                ? `${total} item${total === 1 ? "" : "s"} matching the active filters.`
                : `${total} open item${total === 1 ? "" : "s"} across ${Object.keys(REGULATION_LABELS).length} regimes. Press ⌘K to search the full set.`}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-baseline gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium"
                style={{
                  background: "var(--ios-fill-tertiary)",
                  color: "var(--ios-label)",
                }}
              >
                <span
                  className="inline-flex h-1.5 w-1.5 rounded-full"
                  style={{ background: "var(--ios-blue)" }}
                />
                <span className="tabular-nums">{total}</span>
                <span style={{ color: "var(--ios-label-secondary)" }}>
                  in inbox
                </span>
              </span>
              <span
                className="inline-flex items-baseline gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium"
                style={{
                  background: "var(--ios-fill-tertiary)",
                  color: "var(--ios-label)",
                }}
              >
                <span className="tabular-nums">{clearedToday}</span>
                <span style={{ color: "var(--ios-label-secondary)" }}>
                  cleared today
                </span>
              </span>
            </div>
            <Link
              href="/dashboard/legacy"
              className="inline-flex items-center gap-1 text-[11px] underline-offset-4 transition hover:underline"
              style={{ color: "var(--ios-label-tertiary)" }}
            >
              <BarChart3 className="h-3 w-3" />
              View legacy charts
            </Link>
          </div>
        </header>
      ) : null}

      {isOnboardingEmpty ? (
        <OnboardingHero setupState={setupState} />
      ) : (
        <>
          <FilterBar
            regulationFilter={filterRegulation}
            statusFilter={filterStatus}
          />

          {filterActive ? (
            <Section
              title="Filtered results"
              count={filteredItems.length}
              emptyMessage="No items match the current filters."
              accent="emerald"
              icon={Inbox}
            >
              {filteredItems.map((item) => (
                <ComplianceItemCard
                  key={item.id}
                  item={serializableItem(item)}
                  snoozedUntil={null}
                />
              ))}
            </Section>
          ) : inbox ? (
            <>
              <Section
                title="Urgent"
                count={inbox.urgent.length}
                total={inbox.totals.urgent}
                emptyMessage="No urgent items right now."
                accent="emerald"
                icon={Inbox}
              >
                {inbox.urgent.map((item) => (
                  <ComplianceItemCard
                    key={item.id}
                    item={serializableItem(item)}
                    snoozedUntil={inbox!.snoozedUntilByItemId[item.id] ?? null}
                  />
                ))}
              </Section>

              <Section
                title="This week"
                count={inbox.thisWeek.length}
                total={inbox.totals.thisWeek}
                emptyMessage="Nothing on the radar this week."
                accent="slate"
                icon={Calendar}
              >
                {inbox.thisWeek.map((item) => (
                  <ComplianceItemCard
                    key={item.id}
                    item={serializableItem(item)}
                    snoozedUntil={inbox!.snoozedUntilByItemId[item.id] ?? null}
                  />
                ))}
              </Section>

              <Section
                title="Watching"
                count={inbox.watching.length}
                total={inbox.totals.watching}
                emptyMessage="Nothing in flight."
                accent="slate"
                icon={Eye}
              >
                {inbox.watching.map((item) => (
                  <ComplianceItemCard
                    key={item.id}
                    item={serializableItem(item)}
                    snoozedUntil={inbox!.snoozedUntilByItemId[item.id] ?? null}
                  />
                ))}
              </Section>

              {/* Sprint UF11 — Cross-links footer strip. Audit found
                  Today was an island: no links to Posture, Triage,
                  Proposals, Article Tracker, or Audit Center — users
                  had to navigate via sidebar or ⌘K. This strip gives
                  the natural "where to go next" affordance for each
                  compliance workflow surface. */}
              <TodayCrossLinks />
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

// ─── Sprint UF11 — Cross-links footer ────────────────────────────────────
//
// Why a static link grid rather than persona-aware ordering:
//
//   - Today is the operator daily-driver inbox. The 5 surfaces below
//     are the natural follow-ups regardless of persona — every persona
//     benefits from quick access to Posture, Article Tracker, etc.
//   - Personalization (auditor pushes Audit Center first, investor
//     pushes Assure) is the Help-drawer's job — it already does that
//     based on useUseCase(). Today stays simple and consistent.
//
// If we later add per-persona reordering, a useUseCase() call here +
// an order-prop on each card is the path.

function TodayCrossLinks() {
  return (
    <section className="mt-10">
      <h3
        className="mb-3 px-0.5"
        style={{
          color: "rgba(255, 255, 255, 0.4)",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        Where to go next
      </h3>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <CrossLink
          href="/dashboard/posture"
          icon={Gauge}
          label="Posture"
          description="Score + open work"
        />
        <CrossLink
          href="/dashboard/triage"
          icon={Radio}
          label="Triage"
          description="Acknowledge signals"
        />
        <CrossLink
          href="/dashboard/proposals"
          icon={ShieldCheck}
          label="Proposals"
          description="Approve Astra actions"
        />
        <CrossLink
          href="/dashboard/tracker"
          icon={FileSearch}
          label="Article tracker"
          description="Per-article status"
        />
        <CrossLink
          href="/dashboard/audit-center"
          icon={ScrollText}
          label="Audit center"
          description="Evidence coverage"
        />
      </div>
    </section>
  );
}

function CrossLink({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors"
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
      }}
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
        style={{
          background: "rgba(255, 255, 255, 0.04)",
          boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
        }}
        aria-hidden
      >
        <Icon
          className="h-3.5 w-3.5"
          strokeWidth={1.75}
          style={{ color: "rgba(255, 255, 255, 0.65)" }}
        />
      </span>
      <div className="min-w-0 flex-1">
        <div
          className="text-[12.5px] font-medium"
          style={{
            color: "rgba(255, 255, 255, 0.9)",
            letterSpacing: "-0.005em",
          }}
        >
          {label}
        </div>
        <div
          className="text-[11px]"
          style={{ color: "rgba(255, 255, 255, 0.45)" }}
        >
          {description}
        </div>
      </div>
      <ArrowRight
        className="h-3 w-3 shrink-0 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-60"
        strokeWidth={2}
        style={{ color: "rgba(255, 255, 255, 0.6)" }}
      />
    </Link>
  );
}

/**
 * Smart Onboarding Hero — branches on the user's setup state.
 *
 * Per Apple HIG empty-state convention, an empty-state should have
 * ONE primary action that's actually correct for the user, not a
 * 3-tile gallery of "maybe try one of these". The setupState.
 * nextAction tells us which one:
 *
 *   set_up_organization → "Set up your organization" → /onboarding
 *   add_spacecraft      → "Add your spacecraft"      → /onboarding
 *   run_assessment      → "Run applicability assessment" → /assessment/unified
 *   open_first_item     → fallback: items must exist somewhere
 *   all_done            → user genuinely caught up (can't reach if
 *                         total === 0 unless edge case)
 *
 * If setupState is null (demo mode), falls back to the legacy
 * 3-tile pattern.
 */
function OnboardingHero({
  setupState,
}: {
  setupState: OnboardingSetupState | null;
}) {
  // Determine the primary CTA based on setup state. Each action
  // gets: headline, body, button label, button href, icon.
  const primary = pickPrimaryAction(setupState);

  const PrimaryIcon = primary.icon;

  return (
    <div
      className="mx-auto max-w-xl space-y-6 pt-4"
      style={{
        fontFamily:
          'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
        letterSpacing: "-0.005em",
      }}
    >
      {/* Hero — left-aligned per Apple HIG empty-state convention.
          Single icon-tile + headline + body + ONE primary CTA. */}
      <section>
        <div
          className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            boxShadow:
              "inset 0 1px 0 0 rgba(255, 255, 255, 0.16), inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)",
          }}
        >
          <PrimaryIcon
            className="h-5 w-5"
            strokeWidth={1.75}
            style={{ color: "rgba(255, 255, 255, 0.92)" }}
          />
        </div>
        <h2
          className="text-[28px] font-semibold tracking-tight text-white"
          style={{
            letterSpacing: "-0.022em",
            fontFamily:
              'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
            lineHeight: 1.15,
          }}
        >
          {primary.title}
        </h2>
        <p
          className="mt-2 max-w-md text-[14.5px] leading-relaxed"
          style={{ color: "rgba(255, 255, 255, 0.6)" }}
        >
          {primary.body}
        </p>

        <div className="mt-6 flex items-center gap-2">
          <Link
            href={primary.href}
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors"
            style={{
              background: "rgba(255, 255, 255, 0.92)",
              color: "rgb(20, 20, 22)",
            }}
          >
            {primary.buttonLabel}
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
          </Link>
          {primary.secondary ? (
            <Link
              href={primary.secondary.href}
              className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors"
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                color: "rgba(255, 255, 255, 0.85)",
              }}
            >
              {primary.secondary.label}
            </Link>
          ) : null}
        </div>
      </section>

      {/* Sprint UF4 — progressive Getting-Started checklist showing
          ALL 4 setup gates. The user sees the journey, not just the
          next step. Each row is greyed-out (done) or highlighted
          (current/pending) with its own quick-action link. */}
      {setupState ? <GettingStartedChecklist setupState={setupState} /> : null}

      {/* Demo-mode escape hatch — quiet text link, doesn't compete
          with the primary CTA. */}
      <p
        className="pt-2 text-[12.5px]"
        style={{ color: "rgba(255, 255, 255, 0.4)" }}
      >
        Or{" "}
        <Link
          href="/dashboard/today?demo=1"
          className="font-medium underline-offset-2 hover:underline"
          style={{ color: "rgba(255, 255, 255, 0.65)" }}
        >
          preview the populated UI with demo items
        </Link>
        .
      </p>
    </div>
  );
}

/**
 * Sprint UF4 — Progressive Getting-Started checklist.
 *
 * Shows ALL 4 onboarding gates with their done/pending status so the
 * user sees the full journey, not just the next step.
 */
function GettingStartedChecklist({
  setupState,
}: {
  setupState: OnboardingSetupState;
}) {
  const items = [
    {
      key: "org",
      done: setupState.hasOrganization,
      label: "Set up your organization",
      hint: "Name + jurisdiction + operator type drives which regulations apply.",
      href: "/onboarding",
    },
    {
      key: "asset",
      done: setupState.hasMission || setupState.hasSpacecraft,
      label: "Create your first mission",
      hint: setupState.hasMission
        ? `${setupState.missionCount} mission${setupState.missionCount === 1 ? "" : "s"} created.`
        : setupState.hasSpacecraft
          ? `${setupState.spacecraftCount} spacecraft registered (auto-wrapped to mission).`
          : "A mission groups spacecraft serving the same operational program.",
      href:
        setupState.hasMission || setupState.hasSpacecraft
          ? "/dashboard/missions"
          : "/dashboard/missions/new",
    },
    {
      key: "assessment",
      done: setupState.hasAnyAssessment,
      label: "Run an applicability assessment",
      hint: "~15 questions to determine which articles apply. Generates your compliance roadmap.",
      href: "/assessment/unified",
    },
    {
      key: "items",
      done: setupState.hasComplianceItems,
      label: "Open your first compliance item",
      hint: "Once the assessment is run, items appear here and in /dashboard/today.",
      href: "/dashboard/today",
    },
  ];

  const completedSteps = items.filter((i) => i.done).length;

  return (
    <section
      className="mt-2 overflow-hidden rounded-2xl"
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        boxShadow:
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.06), 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
      }}
    >
      <header className="flex items-center justify-between gap-2 border-b border-white/[0.05] bg-white/[0.012] px-5 py-3">
        <div>
          <h3 className="text-[13px] font-semibold tracking-tight text-slate-100">
            Getting started
          </h3>
          <p className="mt-0.5 text-[11.5px] text-slate-500">
            Complete these to unlock your compliance dashboard.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] tabular-nums text-slate-400">
            {completedSteps} / {items.length}
          </span>
          <div
            className="h-1.5 w-16 overflow-hidden rounded-full"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <div
              className="h-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${(completedSteps / items.length) * 100}%` }}
            />
          </div>
        </div>
      </header>
      <ol className="divide-y divide-white/[0.04]">
        {items.map((item, idx) => (
          <li key={item.key}>
            <Link
              href={item.href}
              className={`group flex items-start gap-3 px-5 py-3 transition ${
                item.done
                  ? "opacity-60 hover:opacity-100"
                  : "hover:bg-white/[0.02]"
              }`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums ring-1 ring-inset ${
                  item.done
                    ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                    : "bg-white/[0.04] text-slate-400 ring-white/[0.08]"
                }`}
                aria-hidden
              >
                {item.done ? (
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                ) : (
                  idx + 1
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div
                  className={`text-[12.5px] font-medium ${
                    item.done ? "text-slate-400 line-through" : "text-slate-100"
                  }`}
                >
                  {item.label}
                </div>
                <p className="mt-0.5 text-[11.5px] text-slate-500">
                  {item.hint}
                </p>
              </div>
              {!item.done ? (
                <ArrowRight
                  className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-500 opacity-0 transition group-hover:opacity-100"
                  strokeWidth={2}
                />
              ) : null}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * Pick the right primary action for the user's setup state. Falls
 * back to the assessment path when setupState is null (demo mode or
 * unauthenticated edge case) so the empty state never shows nothing.
 */
function pickPrimaryAction(setupState: OnboardingSetupState | null): {
  title: string;
  body: string;
  buttonLabel: string;
  href: string;
  icon: LucideIcon;
  secondary?: { label: string; href: string };
} {
  const action = setupState?.nextAction ?? "run_assessment";

  switch (action) {
    case "set_up_organization":
      return {
        title: "Set up your organization",
        body: "Caelex needs to know your operator type and jurisdiction before it can model which regulations apply to you. Takes about a minute.",
        buttonLabel: "Continue setup",
        href: "/onboarding",
        icon: FolderOpen,
      };
    case "create_first_mission":
      return {
        title: "Create your first mission",
        body: "A mission groups one or more spacecraft serving the same operational program — single satellite, constellation, or launch campaign. Mission is the canonical unit your compliance work hangs off of.",
        buttonLabel: "New mission",
        href: "/dashboard/missions/new",
        icon: Radio,
        secondary: {
          label: "Add spacecraft instead",
          href: "/onboarding",
        },
      };
    case "add_spacecraft":
      // Legacy path — pre-Mission-domain orgs that haven't been
      // backfilled yet. The lazy-migration in getMissionsForUser()
      // will wrap any registered Spacecraft into a Mission on first
      // list-fetch, so this path is rarely hit in practice.
      return {
        title: "Add your spacecraft",
        body: "Each spacecraft is auto-wrapped into a Mission. Add the satellites you operate (or plan to launch).",
        buttonLabel: "Add spacecraft",
        href: "/onboarding",
        icon: Radio,
        secondary: { label: "Browse modules", href: "/dashboard/modules" },
      };
    case "run_assessment":
      return {
        title: "Run an applicability assessment",
        body: "Answer ~15 questions to determine which EU Space Act, NIS2, debris and national-law articles apply to you. We'll generate your compliance roadmap.",
        buttonLabel: "Start assessment",
        href: "/assessment/unified",
        icon: ListChecks,
        secondary: { label: "Browse modules", href: "/dashboard/modules" },
      };
    case "open_first_item":
    case "all_done":
    default:
      return {
        title: "You're all caught up",
        body: "No pending items right now. Astra will surface new compliance work here when it lands.",
        buttonLabel: "Browse modules",
        href: "/dashboard/modules",
        icon: ListChecks,
      };
  }
}

/**
 * Serialize Date fields → string for client-component consumption.
 * Server Components can pass Date objects through React's RSC payload,
 * but Date instances are not stable across the wire — converting at
 * the boundary keeps the Client Component prop-shape obvious.
 */
function serializableItem(item: ComplianceItem): ComplianceItem {
  return {
    ...item,
    targetDate: item.targetDate ? new Date(item.targetDate) : null,
    updatedAt: new Date(item.updatedAt),
  };
}

function Section({
  title,
  count,
  total,
  emptyMessage,
  accent,
  icon: Icon,
  children,
}: {
  title: string;
  count: number;
  /**
   * Sprint UF46 (P1-D1) — pre-cap total. If supplied AND > count we
   * render "+N more" so the operator knows the bucket was truncated.
   */
  total?: number;
  emptyMessage: string;
  accent: "emerald" | "slate";
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  const iconClass =
    accent === "emerald"
      ? "h-3.5 w-3.5 text-white/80"
      : "h-3.5 w-3.5 text-white/45";
  const overflow =
    typeof total === "number" && total > count ? total - count : 0;

  return (
    <section className="mb-8">
      <h2 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
        <Icon className={iconClass} />
        <span>{title}</span>
        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/[0.06] px-1.5 text-[10px] font-medium tabular-nums text-white/70 ring-1 ring-inset ring-white/[0.08]">
          {typeof total === "number" ? total : count}
        </span>
      </h2>
      {count === 0 ? (
        <p className="rounded-lg border border-dashed border-white/[0.08] bg-white/[0.015] px-4 py-5 text-center text-sm text-white/40">
          {emptyMessage}
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {children}
          </div>
          {overflow > 0 ? (
            <p className="mt-3 text-[11.5px] text-white/45">
              Showing {count} of {total} — {overflow} more in this bucket.
              Filter or open Posture to see the rest.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

/**
 * Filter bar — URL-based filtering of ComplianceItems by regulation
 * and status. Each filter is a Link that adds/removes a query param;
 * server re-renders with the new filter applied. No client-side
 * state, no JS — pure HTML navigation.
 *
 * Two-row layout:
 *   - Regulation filters (8 regimes + "All")
 *   - Status filters (6 normalized states + "All")
 *
 * Active filters render as filled emerald pills with an X to clear.
 */
function FilterBar({
  regulationFilter,
  statusFilter,
}: {
  regulationFilter: RegulationKey | null;
  statusFilter: ComplianceStatus | null;
}) {
  const baseHref = "/dashboard/today";
  const buildHref = (
    overrideReg: RegulationKey | null,
    overrideStatus: ComplianceStatus | null,
  ): string => {
    const sp = new URLSearchParams();
    if (overrideReg) sp.set("regulation", overrideReg);
    if (overrideStatus) {
      const reverseMap: Record<ComplianceStatus, string> = {
        PENDING: "pending",
        DRAFT: "draft",
        EVIDENCE_REQUIRED: "evidence",
        UNDER_REVIEW: "review",
        ATTESTED: "attested",
        EXPIRED: "expired",
        NOT_APPLICABLE: "na",
      };
      sp.set("status", reverseMap[overrideStatus]);
    }
    const qs = sp.toString();
    return qs ? `${baseHref}?${qs}` : baseHref;
  };

  const STATUS_OPTIONS: Array<{ value: ComplianceStatus; label: string }> = [
    { value: "PENDING", label: "Pending" },
    { value: "DRAFT", label: "Draft" },
    { value: "EVIDENCE_REQUIRED", label: "Evidence req." },
    { value: "UNDER_REVIEW", label: "Under review" },
    { value: "ATTESTED", label: "Attested" },
    { value: "EXPIRED", label: "Expired" },
  ];

  const filterActive = regulationFilter !== null || statusFilter !== null;

  return (
    <div className="comply-glass-shell mb-6 space-y-2.5 p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
          Regime
        </span>
        <FilterChip
          href={buildHref(null, statusFilter)}
          active={regulationFilter === null}
          label="All"
        />
        {REGULATIONS.map((reg) => (
          <FilterChip
            key={reg}
            href={buildHref(reg, statusFilter)}
            active={regulationFilter === reg}
            label={reg.replace(/_/g, " ")}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
          Status
        </span>
        <FilterChip
          href={buildHref(regulationFilter, null)}
          active={statusFilter === null}
          label="All"
        />
        {STATUS_OPTIONS.map((s) => (
          <FilterChip
            key={s.value}
            href={buildHref(regulationFilter, s.value)}
            active={statusFilter === s.value}
            label={s.label}
          />
        ))}
      </div>

      {filterActive ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
            Active
          </span>
          {regulationFilter ? (
            <Badge variant="default">
              {REGULATION_LABELS[regulationFilter]}
              <Link
                href={buildHref(null, statusFilter)}
                aria-label="Clear regulation filter"
                className="-mr-1 ml-1 inline-flex items-center"
              >
                <X className="h-3 w-3" />
              </Link>
            </Badge>
          ) : null}
          {statusFilter ? (
            <Badge variant="default">
              {statusFilter.replace(/_/g, " ").toLowerCase()}
              <Link
                href={buildHref(regulationFilter, null)}
                aria-label="Clear status filter"
                className="-mr-1 ml-1 inline-flex items-center"
              >
                <X className="h-3 w-3" />
              </Link>
            </Badge>
          ) : null}
          <Link
            href={baseHref}
            className="text-[11px] font-medium text-white/70 underline-offset-4 transition hover:text-white hover:underline"
          >
            Clear all
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function FilterChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-md bg-white/[0.12] px-2 py-1 text-[11px] font-medium text-white ring-1 ring-inset ring-white/30 backdrop-blur-sm transition hover:bg-white/[0.18]"
          : "rounded-md bg-white/[0.025] px-2 py-1 text-[11px] font-medium text-white/55 ring-1 ring-inset ring-white/[0.08] transition hover:bg-white/[0.06] hover:text-white hover:ring-white/15"
      }
    >
      {label}
    </Link>
  );
}
