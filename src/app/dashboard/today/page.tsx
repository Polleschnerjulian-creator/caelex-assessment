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
} from "lucide-react";
import { auth } from "@/lib/auth";
import {
  getTodayInboxForUser,
  getComplianceItemsForUser,
  getClearedTodayCountForUser,
} from "@/lib/comply-v2/compliance-item.server";
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
    total = demo.urgent.length + demo.thisWeek.length + demo.watching.length;
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
    total = inbox.urgent.length + inbox.thisWeek.length + inbox.watching.length;
  }

  // True empty-state: no items in any bucket AND no filter applied.
  // Surfaces the onboarding hero instead of three sad "Nothing X" cards.
  const isOnboardingEmpty = !filterActive && total === 0;

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8 sm:px-10 lg:px-14">
      {demoMode ? (
        <div className="comply-glass-pill mb-6 flex items-center justify-between gap-4 px-4 py-2 text-xs text-amber-200/90">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <strong className="font-semibold text-amber-100">Demo mode</strong>
            <span className="text-white/60">
              Showing 7 mock items so you can preview the populated UI. Snooze /
              attest actions on demo items are no-ops.
            </span>
          </span>
          <Link
            href="/dashboard/today"
            className="font-semibold text-amber-100 underline-offset-4 hover:underline"
          >
            Exit demo
          </Link>
        </div>
      ) : null}

      <header className="mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-white/[0.06] pb-5">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Today
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-white/55">
            {filterActive
              ? `${total} item${total === 1 ? "" : "s"} matching the active filters.`
              : isOnboardingEmpty
                ? "Welcome — let's set up your compliance workspace."
                : `${total} open item${total === 1 ? "" : "s"} across ${Object.keys(REGULATION_LABELS).length} regimes. Press ⌘K to search the full set.`}
          </p>
        </div>
        {!isOnboardingEmpty ? (
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span className="comply-glass-pill inline-flex items-baseline gap-1.5 px-3 py-1 text-xs font-medium">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-white/80" />
                <span className="tabular-nums text-white">{total}</span>
                <span className="text-white/55">in inbox</span>
              </span>
              <span className="comply-glass-pill inline-flex items-baseline gap-1.5 px-3 py-1 text-xs font-medium">
                <span className="tabular-nums text-white">{clearedToday}</span>
                <span className="text-white/55">cleared today</span>
              </span>
            </div>
            <Link
              href="/dashboard/legacy"
              className="inline-flex items-center gap-1 text-[11px] text-white/40 underline-offset-4 transition hover:text-white/80 hover:underline"
            >
              <BarChart3 className="h-3 w-3" />
              View legacy charts
            </Link>
          </div>
        ) : null}
      </header>

      {isOnboardingEmpty ? (
        <OnboardingHero />
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
                emptyMessage="Nothing urgent. Take a breath."
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
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

/**
 * Onboarding hero — shown when the user has zero compliance items
 * across all 3 buckets. Replaces the previous three-empty-cards
 * layout (which made an empty-state user feel like the page was
 * broken). Three quick-start CTAs cover the actual onboarding paths:
 * connect telemetry (auto-attest), run an assessment (determine
 * applicability), or browse the regulation modules (manual setup).
 */
function OnboardingHero() {
  const cards: Array<{
    href: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    primary?: boolean;
  }> = [
    {
      href: "/dashboard/sentinel",
      label: "Connect Sentinel",
      description:
        "Auto-attest cybersecurity, NIS2 and debris controls from your telemetry. ~5 min.",
      icon: Radio,
      primary: true,
    },
    {
      href: "/assessment",
      label: "Run an assessment",
      description:
        "Answer ~15 questions to see which EU Space Act, UK Space Act and NIS2 articles apply to you.",
      icon: ListChecks,
    },
    {
      href: "/dashboard/modules",
      label: "Browse modules",
      description:
        "Skim the 8 regulation regimes Caelex tracks and pick the one most relevant to you.",
      icon: FolderOpen,
    },
  ];

  return (
    <div className="space-y-8">
      <section className="comply-glass-shell p-8 sm:p-10">
        <div className="comply-glass-pill mb-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-white/80">
          <Sparkles className="h-3 w-3" />
          New here
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
          You're all caught up — because we haven't started yet.
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
          Caelex Comply tracks 8 regulatory regimes for satellite operators — EU
          Space Act, NIS2, debris mitigation, cybersecurity, spectrum, export
          control, and the UK + US frameworks. Pick how you'd like to start.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className={
                card.primary
                  ? "comply-glass-card group flex flex-col p-5 ring-1 ring-inset ring-white/15 hover:ring-white/25"
                  : "comply-glass-card group flex flex-col p-5"
              }
            >
              <div className="flex items-start justify-between">
                <div
                  className={
                    card.primary
                      ? "flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.12] text-white"
                      : "flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06] text-white/70"
                  }
                >
                  <Icon className="h-4 w-4" />
                </div>
                <ArrowRight className="h-4 w-4 text-white/30 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-white">
                {card.label}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-white/55">
                {card.description}
              </p>
            </Link>
          );
        })}
      </section>

      <p className="text-center text-xs text-white/40">
        Once you have items in flight, this page becomes your daily inbox. Press
        ⌘K anytime to search across everything. Or{" "}
        <Link
          href="/dashboard/today?demo=1"
          className="font-medium text-white/80 underline-offset-4 hover:underline hover:text-white"
        >
          preview the populated UI with demo items
        </Link>
        .
      </p>
    </div>
  );
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
  emptyMessage,
  accent,
  icon: Icon,
  children,
}: {
  title: string;
  count: number;
  emptyMessage: string;
  accent: "emerald" | "slate";
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  const iconClass =
    accent === "emerald"
      ? "h-3.5 w-3.5 text-white/80"
      : "h-3.5 w-3.5 text-white/45";

  return (
    <section className="mb-8">
      <h2 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
        <Icon className={iconClass} />
        <span>{title}</span>
        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/[0.06] px-1.5 text-[10px] font-medium tabular-nums text-white/70 ring-1 ring-inset ring-white/[0.08]">
          {count}
        </span>
      </h2>
      {count === 0 ? (
        <p className="rounded-lg border border-dashed border-white/[0.08] bg-white/[0.015] px-4 py-5 text-center text-sm text-white/40">
          {emptyMessage}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {children}
        </div>
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
