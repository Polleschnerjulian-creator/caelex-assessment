import { redirect } from "next/navigation";
import Link from "next/link";
import { Inbox, Calendar, Eye, X, BarChart3 } from "lucide-react";
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

  return (
    <div className="mx-auto max-w-screen-2xl px-6 py-6">
      <header className="mb-6 flex items-end justify-between gap-6 border-b border-white/[0.06] pb-4">
        <div>
          <div className="mb-1.5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400">
            <Inbox className="h-3 w-3" />
            INBOX · TODAY
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">
            What needs you this week
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-slate-500">
            {filterActive
              ? `${total} item${total === 1 ? "" : "s"} matching filters.`
              : `${total} item${total === 1 ? "" : "s"} across ${Object.keys(REGULATION_LABELS).length} compliance regimes. Use Cmd-K to search the full set.`}
          </p>
        </div>
        {/* Inbox-Zero KPI cluster — Sprint 1 #1: makes the "I cleared
            X items today" feedback loop visible. Plus an escape hatch
            to the legacy chart dashboard. */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-baseline gap-3 font-mono text-[10px] uppercase tracking-wider">
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="tabular-nums text-slate-200">{total}</span>
              <span>in inbox</span>
            </span>
            <span className="text-slate-600">·</span>
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              <span className="tabular-nums text-emerald-300">
                {clearedToday}
              </span>
              <span>cleared today</span>
            </span>
          </div>
          <Link
            href="/dashboard/legacy"
            className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500 underline-offset-2 transition hover:text-slate-300 hover:underline"
          >
            <BarChart3 className="h-2.5 w-2.5" />
            Skip to legacy charts
          </Link>
        </div>
      </header>

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
  return (
    <section className="mb-8">
      <h2 className="mb-3 flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
        <Icon
          className={
            accent === "emerald" ? "h-3 w-3 text-emerald-400" : "h-3 w-3"
          }
        />
        {title}
        <span className="rounded-sm bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] tabular-nums text-slate-300 ring-1 ring-inset ring-white/10">
          {count}
        </span>
      </h2>
      {count === 0 ? (
        <p className="palantir-surface rounded-md p-4 text-center text-xs text-slate-500">
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
    <div className="palantir-surface mb-6 rounded-md p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-2 font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-slate-500">
          REG
        </span>
        <FilterChip
          href={buildHref(null, statusFilter)}
          active={regulationFilter === null}
          label="ALL"
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
        <span className="mr-2 font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-slate-500">
          STATUS
        </span>
        <FilterChip
          href={buildHref(regulationFilter, null)}
          active={statusFilter === null}
          label="ALL"
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
        <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.04] pt-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">
            ACTIVE
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
            className="font-mono text-[10px] uppercase tracking-wider text-emerald-400 underline-offset-2 transition hover:text-emerald-300 hover:underline"
          >
            CLEAR ALL
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
          ? "rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-emerald-300 ring-1 ring-inset ring-emerald-500/40"
          : "rounded bg-white/[0.02] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-400 ring-1 ring-inset ring-white/[0.06] transition hover:bg-white/[0.04] hover:text-slate-200 hover:ring-white/15"
      }
    >
      {label}
    </Link>
  );
}
