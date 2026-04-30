import { redirect } from "next/navigation";
import Link from "next/link";
import { Inbox, Calendar, Eye, ArrowRight, X } from "lucide-react";
import { auth } from "@/lib/auth";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import {
  getTodayInboxForUser,
  getComplianceItemsForUser,
} from "@/lib/comply-v2/compliance-item.server";
import {
  type ComplianceItem,
  type ComplianceStatus,
  type RegulationKey,
  REGULATIONS,
  REGULATION_LABELS,
} from "@/lib/comply-v2/types";
import { Button } from "@/components/ui/v2/button";
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

  const ui = await resolveComplyUiVersion();
  if (ui === "v1") {
    // Today is V2-only. V1 users land back on the legacy dashboard.
    redirect("/dashboard");
  }

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

  if (filterActive) {
    filteredItems = await getComplianceItemsForUser(session.user.id, {
      regulations: filterRegulation ? [filterRegulation] : undefined,
      statuses: filterStatus ? [filterStatus] : undefined,
      limit: 200,
    });
    total = filteredItems.length;
  } else {
    inbox = await getTodayInboxForUser(session.user.id);
    total = inbox.urgent.length + inbox.thisWeek.length + inbox.watching.length;
  }

  return (
    <div className="mx-auto max-w-screen-xl px-6 py-8">
      <header className="mb-8 flex items-end justify-between gap-6">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <Inbox className="h-3.5 w-3.5" />
            Today
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            What needs you this week
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {filterActive
              ? `${total} item${total === 1 ? "" : "s"} matching filters.`
              : `${total} item${total === 1 ? "" : "s"} across ${Object.keys(REGULATION_LABELS).length} compliance regimes.`}
          </p>
        </div>
        <Button variant="outline" asChild size="sm">
          <Link href="/dashboard">
            Open legacy dashboard
            <ArrowRight />
          </Link>
        </Button>
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
    <section className="mb-10">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        <Icon
          className={
            accent === "emerald"
              ? "h-4 w-4 text-emerald-500"
              : "h-4 w-4 text-slate-400"
          }
        />
        {title}
        <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {count}
        </span>
      </h2>
      {count === 0 ? (
        <p className="ml-6 text-sm text-slate-400 dark:text-slate-500">
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
    <div className="mb-6 space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-2 text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Regulation
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
        <span className="mr-2 text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
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
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
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
            className="text-[11px] text-slate-500 underline-offset-2 transition hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-100"
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
          ? "rounded-full border border-emerald-500 bg-emerald-500 px-2.5 py-0.5 text-[11px] font-medium text-white dark:border-emerald-400 dark:bg-emerald-500/80"
          : "rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] text-slate-700 transition hover:border-emerald-400 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-500 dark:hover:text-emerald-300"
      }
    >
      {label}
    </Link>
  );
}
