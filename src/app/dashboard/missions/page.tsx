import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Rocket,
  Satellite,
  Globe,
  Calendar,
  ListChecks,
  ArrowRight,
  Users,
  Plus,
  Layers,
  Search,
  X,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import {
  getMissionsForUser,
  type MissionSummary,
} from "@/lib/comply-v2/missions.server";
import { getPostureForUser } from "@/lib/comply-v2/posture.server";
import { SortSelect } from "./SortSelect";

export const metadata = {
  title: "Missions — Caelex Comply",
  description:
    "Mission portfolio: programs, customers, spacecraft assignments, and the regulatory phase roadmap that wraps each one.",
};

export const dynamic = "force-dynamic";

// Sprint UF51 (P1-M1) — URL-param driven filters/sort.
type StatusFilter =
  | "all"
  | "ACTIVE"
  | "PLANNED"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED";
type SortKey = "recent" | "name" | "planned" | "started";

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "PLANNED", label: "Planned" },
  { value: "PAUSED", label: "Paused" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Recently updated" },
  { value: "name", label: "Name (A→Z)" },
  { value: "planned", label: "Planned start" },
  { value: "started", label: "Actually started" },
];

interface PageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    sort?: string;
  }>;
}

/**
 * Missions list — the V2 mission-first landing.
 *
 * Sprint Mission-3 refactor: missions are now first-class entities
 * (vs the old Spacecraft=Mission collapse). The list groups by
 * status (Active / Planned / Completed-or-Cancelled) and surfaces
 * mission-level metadata: missionType, programPhase, primaryEndUser,
 * spacecraft count. Each card links to the mission detail.
 *
 * Sprint UF51-52 (P1-M1+M2) — added search/filter/sort + compliance
 * score header KPI. The grouped-by-status default render still
 * works when the user hasn't filtered; setting `?status=ACTIVE`
 * (or any non-"all") flips to a flat sorted list within that status
 * cohort. Sort applies in both modes.
 */
export default async function MissionsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/missions");
  }
  const ui = await resolveComplyUiVersion();
  if (ui === "v1") redirect("/dashboard");

  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase();
  const status: StatusFilter = STATUS_FILTER_OPTIONS.some(
    (o) => o.value === sp.status,
  )
    ? (sp.status as StatusFilter)
    : "all";
  const sort: SortKey = SORT_OPTIONS.some((o) => o.value === sp.sort)
    ? (sp.sort as SortKey)
    : "recent";

  // Fetch missions + posture (for the compliance-score KPI in the
  // header). These run in parallel; posture is cheap because the
  // aggregate query is the same one Posture page uses.
  const [allMissions, posture] = await Promise.all([
    getMissionsForUser(session.user.id),
    getPostureForUser(session.user.id).catch(() => null),
  ]);

  // Apply search filter (across name + reference + primaryEndUser).
  // Server-side because the list is small enough to fit in memory and
  // server filtering means initial render is correct (no flash).
  const searchFiltered = q
    ? allMissions.filter((m) => {
        const hay =
          `${m.name} ${m.reference ?? ""} ${m.primaryEndUser ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
    : allMissions;

  // Apply sort. We sort the full search-filtered set; status grouping
  // happens after this so the per-bucket order is consistent.
  const sortFn = (a: MissionSummary, b: MissionSummary): number => {
    switch (sort) {
      case "name":
        return a.name.localeCompare(b.name);
      case "planned": {
        const at = a.plannedStartAt?.getTime() ?? Number.POSITIVE_INFINITY;
        const bt = b.plannedStartAt?.getTime() ?? Number.POSITIVE_INFINITY;
        return at - bt;
      }
      case "started": {
        // Most-recently-started first; missions never started fall to bottom.
        const at = a.startedAt?.getTime() ?? -Infinity;
        const bt = b.startedAt?.getTime() ?? -Infinity;
        return bt - at;
      }
      case "recent":
      default:
        return b.updatedAt.getTime() - a.updatedAt.getTime();
    }
  };
  const sorted = [...searchFiltered].sort(sortFn);

  const missions = sorted; // post-filter, post-sort
  const active = missions.filter((m) => m.status === "ACTIVE");
  const planned = missions.filter((m) => m.status === "PLANNED");
  const archived = missions.filter(
    (m) => m.status === "COMPLETED" || m.status === "CANCELLED",
  );
  const paused = missions.filter((m) => m.status === "PAUSED");

  const filterActive = q !== "" || status !== "all" || sort !== "recent";
  // When a status filter is set, render a flat list of THAT bucket.
  // Default (status === "all") preserves the grouped-by-status layout
  // — better at-a-glance view of the whole portfolio.
  const filteredFlatList: MissionSummary[] | null =
    status !== "all" ? missions.filter((m) => m.status === status) : null;

  const sansFont =
    'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';
  const displayFont =
    'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';

  return (
    <div
      className="mx-auto max-w-screen-2xl px-8 py-8"
      style={{ fontFamily: sansFont }}
    >
      <header className="mb-6 flex flex-col gap-4 border-b border-white/[0.06] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/[0.08] px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-emerald-300 ring-1 ring-inset ring-emerald-500/20">
            <Rocket className="h-3 w-3" />
            Mission portfolio
          </div>
          <h1
            className="text-[28px] font-semibold text-slate-50"
            style={{
              fontFamily: displayFont,
              letterSpacing: "-0.022em",
              lineHeight: 1.15,
            }}
          >
            Missions
          </h1>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-slate-400">
            Programs, customers, and the regulatory phase roadmap that wraps
            each one. A mission groups one or more spacecraft — constellations,
            single satellites, launch campaigns, or multi-mission hardware.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center gap-1.5">
            {/* Sprint UF52 (P1-M2) — Compliance-score KPI replaces the
                schedule-counts-only header. Counts kept as secondary
                so the operator still sees portfolio shape at a glance,
                but the headline number is now the *compliance signal*
                they actually act on. */}
            {posture ? (
              <ScoreStat label="Compliance" value={posture.overallScore} />
            ) : null}
            <Stat label="Active" value={active.length} tone="emerald" />
            <Stat label="Planned" value={planned.length} tone="amber" />
            <Stat label="Total" value={allMissions.length} tone="slate" />
          </div>
          <Link
            href="/dashboard/missions/new"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-[13px] font-semibold text-emerald-950 transition hover:bg-emerald-400"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
            New mission
          </Link>
        </div>
      </header>

      {/* Sprint UF51 (P1-M1) — Search + filter + sort toolbar.
          GET-form so search updates the URL on submit (back/forward
          works), no client JS needed. */}
      {allMissions.length > 0 ? (
        <FilterToolbar q={q} status={status} sort={sort} />
      ) : null}

      {allMissions.length === 0 ? (
        <EmptyState />
      ) : missions.length === 0 ? (
        <NoResultsState filterActive={filterActive} />
      ) : filteredFlatList ? (
        // Status-filtered: flat sorted list within that bucket.
        <MissionGroup
          label={
            STATUS_FILTER_OPTIONS.find((o) => o.value === status)?.label ??
            String(status)
          }
          missions={filteredFlatList}
          tone={
            status === "ACTIVE"
              ? "emerald"
              : status === "PLANNED"
                ? "amber"
                : status === "PAUSED"
                  ? "orange"
                  : "slate"
          }
        />
      ) : (
        // Default: status-grouped layout.
        <>
          {active.length > 0 ? (
            <MissionGroup label="Active" missions={active} tone="emerald" />
          ) : null}
          {planned.length > 0 ? (
            <MissionGroup label="Planned" missions={planned} tone="amber" />
          ) : null}
          {paused.length > 0 ? (
            <MissionGroup label="Paused" missions={paused} tone="orange" />
          ) : null}
          {archived.length > 0 ? (
            <MissionGroup
              label="Completed / Cancelled"
              missions={archived}
              tone="slate"
            />
          ) : null}
        </>
      )}
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────

function MissionGroup({
  label,
  missions,
  tone,
}: {
  label: string;
  missions: MissionSummary[];
  tone: "emerald" | "amber" | "orange" | "slate";
}) {
  return (
    <section className="mb-10">
      <h2
        className="mb-3 flex items-center gap-2 px-0.5"
        style={{
          color: "rgba(255, 255, 255, 0.55)",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: toneColor(tone) }}
        />
        {label}
        <span
          className="ml-1 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            color: "rgba(255, 255, 255, 0.65)",
          }}
        >
          {missions.length}
        </span>
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {missions.map((m) => (
          <MissionCard key={m.id} mission={m} />
        ))}
      </div>
    </section>
  );
}

function toneColor(tone: "emerald" | "amber" | "orange" | "slate"): string {
  switch (tone) {
    case "emerald":
      return "rgba(52, 199, 89, 0.85)"; // ios-green
    case "amber":
      return "rgba(255, 204, 0, 0.85)"; // ios-yellow
    case "orange":
      return "rgba(255, 149, 0, 0.85)"; // ios-orange
    case "slate":
      return "rgba(255, 255, 255, 0.4)";
  }
}

function MissionCard({ mission }: { mission: MissionSummary }) {
  return (
    <Link
      href={`/dashboard/missions/${mission.id}`}
      className="group flex flex-col gap-3 overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-b from-white/[0.025] to-white/[0.01] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-white/[0.12] hover:from-white/[0.04] hover:to-white/[0.02]"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[14.5px] font-semibold tracking-tight text-slate-100">
            {mission.name}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {mission.reference ? (
              <span className="truncate rounded bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10.5px] text-slate-300 ring-1 ring-inset ring-white/[0.06]">
                {mission.reference}
              </span>
            ) : null}
            <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10.5px] text-slate-400 ring-1 ring-inset ring-white/[0.06]">
              {phaseLabel(mission.programPhase)}
            </span>
          </div>
        </div>
        <StatusPill status={mission.status} />
      </header>

      {/* Mission characteristics */}
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-slate-400">
        <li className="inline-flex items-center gap-1.5">
          <Satellite
            className="h-3.5 w-3.5 text-slate-500"
            strokeWidth={1.75}
          />
          <span>{missionTypeLabel(mission.missionType)}</span>
        </li>
        <li className="inline-flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-slate-500" strokeWidth={1.75} />
          {/* Sprint UF37 (P2-1) — "spacecraft" is uncountable in
              English, no plural-s. Fixed both branches by removing
              the conditional suffix. */}
          <span>{mission.spacecraftCount} spacecraft</span>
        </li>
        {mission.primaryEndUser ? (
          <li className="inline-flex max-w-[180px] items-center gap-1.5">
            <Users
              className="h-3.5 w-3.5 shrink-0 text-slate-500"
              strokeWidth={1.75}
            />
            <span className="truncate">{mission.primaryEndUser}</span>
          </li>
        ) : null}
        {mission.startedAt ? (
          <li className="inline-flex items-center gap-1.5">
            <Calendar
              className="h-3.5 w-3.5 text-slate-500"
              strokeWidth={1.75}
            />
            <time dateTime={mission.startedAt.toISOString()}>
              Started {mission.startedAt.toISOString().slice(0, 10)}
            </time>
          </li>
        ) : mission.plannedStartAt ? (
          <li className="inline-flex items-center gap-1.5">
            <Calendar
              className="h-3.5 w-3.5 text-slate-500"
              strokeWidth={1.75}
            />
            <time dateTime={mission.plannedStartAt.toISOString()}>
              Planned {mission.plannedStartAt.toISOString().slice(0, 10)}
            </time>
          </li>
        ) : null}
      </ul>

      {/* Primary spacecraft strip */}
      {mission.primarySpacecraft ? (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.04] px-3 py-2 ring-1 ring-inset ring-white/[0.05]">
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[12.5px] font-medium text-slate-100">
              {mission.primarySpacecraft.spacecraftName}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-slate-500">
              <Globe className="h-3 w-3 text-slate-500" strokeWidth={1.75} />
              <span>
                {mission.primarySpacecraft.orbitType}
                {mission.primarySpacecraft.altitudeKm
                  ? ` · ${Math.round(mission.primarySpacecraft.altitudeKm)} km`
                  : ""}
              </span>
              {mission.primarySpacecraft.cosparId ? (
                <>
                  <span aria-hidden>·</span>
                  <span className="font-mono">
                    {mission.primarySpacecraft.cosparId}
                  </span>
                </>
              ) : null}
            </div>
          </div>
          {mission.spacecraftCount > 1 ? (
            <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-slate-400 ring-1 ring-inset ring-white/[0.06]">
              +{mission.spacecraftCount - 1}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="rounded-lg bg-white/[0.02] px-3 py-2 text-[11.5px] text-slate-500 ring-1 ring-inset ring-white/[0.04]">
          No spacecraft assigned yet — assign one from the detail page.
        </div>
      )}

      {/* Phase roadmap progress */}
      <div className="mt-1 border-t border-white/[0.05] pt-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-slate-400">
            <ListChecks
              className="h-3.5 w-3.5 text-slate-500"
              strokeWidth={1.75}
            />
            {mission.phaseCount} phase{mission.phaseCount === 1 ? "" : "s"}
          </span>
          <span className="text-[12px] font-semibold tabular-nums text-slate-200">
            {mission.roadmapProgressPct}%
          </span>
        </div>

        {mission.activePhase ? (
          <>
            <div className="mb-2">
              <p className="truncate text-[12.5px] font-medium text-slate-100">
                {mission.activePhase.name}
              </p>
              <p className="text-[11px] text-slate-500">
                {mission.activePhase.status.replace(/_/g, " ").toLowerCase()} ·{" "}
                {mission.activePhase.progress}%
              </p>
            </div>
            <ProgressBar value={mission.activePhase.progress} />
          </>
        ) : (
          <p className="text-[11.5px] text-slate-600">No phases yet</p>
        )}
      </div>

      <footer className="mt-1 flex items-center justify-between border-t border-white/[0.04] pt-3 text-[11.5px]">
        <span className="text-slate-500">View detail</span>
        <span className="inline-flex items-center gap-1 text-slate-300 transition-transform group-hover:translate-x-0.5">
          Open
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
      </footer>
    </Link>
  );
}

function StatusPill({ status }: { status: MissionSummary["status"] }) {
  const dotColor =
    status === "ACTIVE"
      ? "var(--ios-green, rgba(52, 199, 89, 0.95))"
      : status === "PLANNED"
        ? "var(--ios-yellow, rgba(255, 204, 0, 0.95))"
        : status === "PAUSED"
          ? "var(--ios-orange, rgba(255, 149, 0, 0.95))"
          : status === "COMPLETED"
            ? "rgba(255, 255, 255, 0.65)"
            : status === "CANCELLED"
              ? "var(--ios-red, rgba(255, 69, 58, 0.85))"
              : "rgba(255, 255, 255, 0.4)";
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{
        background: "rgba(255, 255, 255, 0.05)",
        color: "rgba(255, 255, 255, 0.85)",
        letterSpacing: "-0.005em",
      }}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: dotColor }}
      />
      {status.toLowerCase()}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className="h-[3px] w-full overflow-hidden rounded-full"
      style={{ background: "rgba(255, 255, 255, 0.06)" }}
    >
      <div
        className="h-full transition-all duration-500"
        style={{
          width: `${clamped}%`,
          background: "rgba(255, 255, 255, 0.7)",
        }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}

/**
 * Sprint UF51 (P1-M1) — search/filter/sort toolbar.
 *
 * Pure GET-form so URL updates on submit and the server re-renders
 * with the new filter state. No client JS required. Keeps the
 * existing filter pills clickable as plain Link <a>s.
 */
function FilterToolbar({
  q,
  status,
  sort,
}: {
  q: string;
  status: StatusFilter;
  sort: SortKey;
}) {
  // Helper for building filter-pill hrefs that preserve OTHER params.
  const hrefWith = (next: {
    q?: string;
    status?: StatusFilter;
    sort?: SortKey;
  }): string => {
    const params = new URLSearchParams();
    const finalQ = next.q !== undefined ? next.q : q;
    const finalStatus = next.status !== undefined ? next.status : status;
    const finalSort = next.sort !== undefined ? next.sort : sort;
    if (finalQ) params.set("q", finalQ);
    if (finalStatus !== "all") params.set("status", finalStatus);
    if (finalSort !== "recent") params.set("sort", finalSort);
    const qs = params.toString();
    return qs ? `/dashboard/missions?${qs}` : "/dashboard/missions";
  };

  return (
    <section className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <form
        action="/dashboard/missions"
        method="get"
        className="relative flex min-w-0 flex-1 items-center"
      >
        <Search
          className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-slate-500"
          strokeWidth={2}
        />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name, reference, or end-user…"
          className="w-full max-w-md rounded-lg border border-white/[0.06] bg-white/[0.02] py-1.5 pl-9 pr-9 text-[12.5px] text-slate-200 placeholder:text-slate-500 focus:border-emerald-500/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
          aria-label="Search missions"
        />
        {/* Hidden inputs preserve the other filter state on submit. */}
        {status !== "all" ? (
          <input type="hidden" name="status" value={status} />
        ) : null}
        {sort !== "recent" ? (
          <input type="hidden" name="sort" value={sort} />
        ) : null}
        {q ? (
          <Link
            href={hrefWith({ q: "" })}
            className="absolute right-2 inline-flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
            aria-label="Clear search"
          >
            <X className="h-3 w-3" />
          </Link>
        ) : null}
      </form>

      <div className="flex flex-wrap items-center gap-2">
        {/* Status pills */}
        <nav className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-0.5">
          {STATUS_FILTER_OPTIONS.map((opt) => {
            const isActive = status === opt.value;
            return (
              <Link
                key={opt.value}
                href={hrefWith({ status: opt.value })}
                className={`rounded-md px-2.5 py-1 text-[11.5px] font-medium transition ${
                  isActive
                    ? "bg-white/[0.06] text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {opt.label}
              </Link>
            );
          })}
        </nav>

        {/* Sort dropdown — submits as the parent form's `sort` field.
            SortSelect is a tiny client component since RSC can't carry
            the onChange event handler that auto-submits on change. */}
        <form action="/dashboard/missions" method="get" className="flex">
          {q ? <input type="hidden" name="q" value={q} /> : null}
          {status !== "all" ? (
            <input type="hidden" name="status" value={status} />
          ) : null}
          <SortSelect defaultValue={sort} options={[...SORT_OPTIONS]} />
        </form>
      </div>
    </section>
  );
}

function NoResultsState({ filterActive }: { filterActive: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.015] px-6 py-10 text-center">
      <p className="text-[13px] font-medium text-slate-200">
        No missions match these filters.
      </p>
      <p className="mt-1 text-[12px] text-slate-500">
        {filterActive
          ? "Adjust the search, status, or sort above — or clear them to see your full portfolio."
          : "Try a different search."}
      </p>
      {filterActive ? (
        <Link
          href="/dashboard/missions"
          className="mt-4 inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 text-[12px] font-medium text-slate-200 transition hover:border-white/[0.14] hover:bg-white/[0.05]"
        >
          <X className="h-3 w-3" />
          Clear filters
        </Link>
      ) : null}
    </div>
  );
}

/**
 * Sprint UF52 (P1-M2) — Compliance-score KPI tile.
 * Visually distinct from the count-Stat tiles so the operator's eye
 * lands on the real signal first. Color tier: ≥80 emerald, ≥60 amber,
 * <60 rose — matches the rest of the platform's score grading.
 */
function ScoreStat({ label, value }: { label: string; value: number }) {
  const accent =
    value >= 80
      ? "text-emerald-300"
      : value >= 60
        ? "text-amber-300"
        : "text-rose-300";
  return (
    <div className="flex min-w-[80px] flex-col items-end rounded-lg border border-emerald-500/15 bg-gradient-to-b from-emerald-500/[0.05] to-emerald-500/[0.012] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-emerald-400/70">
        {label}
      </span>
      <span
        className={`text-[18px] font-semibold tabular-nums leading-tight tracking-tight ${accent}`}
      >
        {value}
        <span className="ml-0.5 text-[12px] font-medium text-slate-500">
          /100
        </span>
      </span>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "slate";
}) {
  const accent =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "amber"
        ? "text-amber-300"
        : "text-slate-300";
  return (
    <div className="flex min-w-[64px] flex-col items-end rounded-lg border border-white/[0.06] bg-gradient-to-b from-white/[0.025] to-white/[0.012] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      <span
        className={`text-[18px] font-semibold tabular-nums leading-tight tracking-tight ${accent}`}
      >
        {value}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="max-w-xl rounded-2xl p-8"
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        boxShadow:
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.06), 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
      }}
    >
      <div
        className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl"
        style={{
          background: "rgba(255, 255, 255, 0.06)",
          boxShadow:
            "inset 0 1px 0 0 rgba(255, 255, 255, 0.12), inset 0 -1px 0 0 rgba(0, 0, 0, 0.25)",
        }}
      >
        <Rocket
          className="h-[18px] w-[18px]"
          strokeWidth={1.75}
          style={{ color: "rgba(255, 255, 255, 0.85)" }}
        />
      </div>
      <h2
        className="mb-1.5 text-[17px] font-semibold text-white"
        style={{ letterSpacing: "-0.018em" }}
      >
        No missions yet
      </h2>
      <p
        className="mb-5 max-w-md text-[13px] leading-relaxed"
        style={{
          color: "rgba(255, 255, 255, 0.55)",
          letterSpacing: "-0.005em",
        }}
      >
        Create your first mission to group spacecraft, track regulatory phases,
        and link customers / authority references. A mission can be a single
        satellite, a constellation, or a launch campaign.
      </p>
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/missions/new"
          className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium text-white transition-colors"
          style={{
            background: "rgba(255, 255, 255, 0.92)",
            color: "rgb(20, 20, 22)",
            letterSpacing: "-0.005em",
          }}
        >
          New mission
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
        </Link>
        <Link
          href="/dashboard/modules/registration"
          className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors"
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            color: "rgba(255, 255, 255, 0.85)",
            letterSpacing: "-0.005em",
          }}
        >
          Register spacecraft first
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
        </Link>
      </div>
    </div>
  );
}

// ─── Label helpers ───────────────────────────────────────────────────────

function missionTypeLabel(t: MissionSummary["missionType"]): string {
  switch (t) {
    case "EARTH_OBSERVATION":
      return "Earth observation";
    case "COMMUNICATIONS":
      return "Communications";
    case "NAVIGATION":
      return "Navigation";
    case "SCIENCE":
      return "Science";
    case "IOD":
      return "In-orbit demonstration";
    case "TECH_DEMO":
      return "Technology demo";
    case "HUMAN_SPACEFLIGHT":
      return "Human spaceflight";
    case "OOS_ADR":
      return "On-orbit servicing";
    case "LAUNCH":
      return "Launch";
    case "OTHER":
    default:
      return "Other";
  }
}

function phaseLabel(p: MissionSummary["programPhase"]): string {
  switch (p) {
    case "PHASE_A":
      return "Phase A · Concept studies";
    case "PHASE_B":
      return "Phase B · Concept dev.";
    case "PHASE_C":
      return "Phase C · Prelim. design";
    case "PHASE_D":
      return "Phase D · Build & launch";
    case "PHASE_E":
      return "Phase E · Operations";
    case "PHASE_F":
      return "Phase F · Closeout";
    default:
      return p;
  }
}
