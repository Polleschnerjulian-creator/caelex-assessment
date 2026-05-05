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
  searchParams: Promise<{ regulation?: string; status?: string }>;
}

const STATUS_PARAM_VALUES: Record<string, ComplianceStatus> = {
  pending: "PENDING",
  draft: "DRAFT",
  evidence: "EVIDENCE_REQUIRED",
  review: "UNDER_REVIEW",
  attested: "ATTESTED",
  expired: "EXPIRED",
};

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

  // Branch: filtered = flat list; unfiltered = 3-section inbox.
  let filteredItems: ComplianceItem[] = [];
  let inbox: Awaited<ReturnType<typeof getTodayInboxForUser>> | null = null;
  let total: number;

  // Cleared-today KPI runs in parallel with the inbox query so it
  // doesn't add latency. Counts ComplianceItemSnoozes created since
  // 00:00 UTC — the cleanest "user took an action" signal we have today.
  let clearedToday = 0;
  if (filterActive) {
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
    <div className="mx-auto max-w-screen-2xl px-6 py-8 sm:px-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-slate-200/80 pb-5 dark:border-white/[0.08]">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-50">
            Today
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            {filterActive
              ? `${total} item${total === 1 ? "" : "s"} matching the active filters.`
              : isOnboardingEmpty
                ? "Welcome — let's set up your compliance workspace."
                : `${total} open item${total === 1 ? "" : "s"} across ${Object.keys(REGULATION_LABELS).length} regimes. Press ⌘K to search the full set.`}
          </p>
        </div>
        {/* KPI chips — visible feedback loop for "I cleared X today".
            Hidden in the onboarding-empty state since 0/0 isn't a useful
            signal at zero items. */}
        {!isOnboardingEmpty ? (
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-baseline gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="tabular-nums">{total}</span>
                <span className="text-slate-500 dark:text-slate-400">
                  in inbox
                </span>
              </span>
              <span className="inline-flex items-baseline gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                <span className="tabular-nums">{clearedToday}</span>
                <span className="text-emerald-700/80 dark:text-emerald-400/80">
                  cleared today
                </span>
              </span>
            </div>
            <Link
              href="/dashboard/legacy"
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 underline-offset-4 transition hover:text-slate-700 hover:underline dark:text-slate-500 dark:hover:text-slate-300"
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
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-emerald-50/30 to-white p-8 shadow-sm sm:p-10 dark:border-white/[0.08] dark:from-white/[0.03] dark:via-emerald-500/[0.04] dark:to-white/[0.03]">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
          <Sparkles className="h-3 w-3" />
          New here
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
          You're all caught up — because we haven't started yet.
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
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
                  ? "group flex flex-col rounded-xl border border-emerald-300 bg-emerald-50 p-5 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-100/70 dark:border-emerald-500/30 dark:bg-emerald-500/[0.08] dark:hover:border-emerald-500/50 dark:hover:bg-emerald-500/[0.12]"
                  : "group flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-white/[0.02] dark:hover:border-white/15 dark:hover:bg-white/[0.04]"
              }
            >
              <div className="flex items-start justify-between">
                <div
                  className={
                    card.primary
                      ? "flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-200 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                      : "flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-400"
                  }
                >
                  <Icon className="h-4 w-4" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100 dark:text-slate-500" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {card.label}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {card.description}
              </p>
            </Link>
          );
        })}
      </section>

      <p className="text-center text-xs text-slate-500 dark:text-slate-500">
        Once you have items in flight, this page becomes your daily inbox. Press
        ⌘K anytime to search across everything.
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
      ? "h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
      : "h-3.5 w-3.5 text-slate-500 dark:text-slate-400";

  return (
    <section className="mb-7">
      <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
        <Icon className={iconClass} />
        <span>{title}</span>
        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-100 px-1.5 text-[10px] font-medium tabular-nums text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
          {count}
        </span>
      </h2>
      {count === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-4 py-5 text-center text-sm text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-slate-500">
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
    <div className="mb-6 space-y-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.02]">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
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
        <span className="mr-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
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
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-2.5 dark:border-white/[0.06]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
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
            className="text-[11px] font-medium text-emerald-600 underline-offset-4 transition hover:text-emerald-700 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300"
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
          ? "rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-800 ring-1 ring-inset ring-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/40"
          : "rounded-md bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-100 hover:text-slate-900 hover:ring-slate-300 dark:bg-white/[0.03] dark:text-slate-400 dark:ring-white/[0.08] dark:hover:bg-white/[0.06] dark:hover:text-slate-200 dark:hover:ring-white/15"
      }
    >
      {label}
    </Link>
  );
}
