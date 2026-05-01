import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Rocket,
  Satellite,
  Globe,
  Calendar,
  ListChecks,
  ArrowRight,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import {
  getMissionsForUser,
  type MissionSummary,
} from "@/lib/comply-v2/missions.server";

export const metadata = {
  title: "Missions — Caelex Comply",
  description:
    "Your spacecraft missions and the regulatory phase roadmap that wraps each one.",
};

export const dynamic = "force-dynamic";

/**
 * Missions list — the V2 mission-first landing.
 *
 * Sprint 5A: list view only. Cards show Spacecraft + active-phase
 * summary. The phase Gantt + per-mission detail page lands in 5B
 * (the cards link there, and the route exists as a stub).
 *
 * V1 users get redirected to the legacy /dashboard. The page is
 * V2-exclusive — there's no equivalent in V1 chrome.
 */
export default async function MissionsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/missions");
  }
  const ui = await resolveComplyUiVersion();
  if (ui === "v1") redirect("/dashboard");

  const missions = await getMissionsForUser(session.user.id);

  const linked = missions.filter((m) => m.linked);
  const unlinked = missions.filter((m) => !m.linked);

  return (
    <div className="mx-auto max-w-screen-2xl px-6 py-6">
      <header className="mb-6 flex items-end justify-between gap-6 border-b border-white/[0.06] pb-4">
        <div>
          <div className="mb-1.5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400">
            <Rocket className="h-3 w-3" />
            MISSIONS · {missions.length}
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">
            Mission overview
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-slate-500">
            Each spacecraft is one mission. The card surfaces its operational
            status and the active regulatory phase. Detail view with full phase
            Gantt lands in Sprint 5B.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Stat label="Linked" value={linked.length} />
          <Stat label="Unlinked" value={unlinked.length} />
        </div>
      </header>

      {missions.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {linked.length > 0 ? (
            <section className="mb-8">
              <h2 className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                Active spacecraft
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {linked.map((m) => (
                  <MissionCard key={m.id} mission={m} />
                ))}
              </div>
            </section>
          ) : null}

          {unlinked.length > 0 ? (
            <section>
              <h2 className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                Unlinked phases
              </h2>
              <p className="mb-3 text-[11px] text-slate-500">
                Mission phases without a backing spacecraft. Likely legacy
                planning rows; link them by setting the spacecraft id on the
                phase.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {unlinked.map((m) => (
                  <MissionCard key={m.id} mission={m} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────

function MissionCard({ mission }: { mission: MissionSummary }) {
  return (
    <article className="palantir-surface group flex flex-col gap-3 rounded-md p-4 transition hover:bg-white/[0.04]">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold tracking-tight text-slate-100">
            {mission.name}
          </h3>
          <div className="mt-0.5 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
            {mission.cosparId ? (
              <span>{mission.cosparId}</span>
            ) : mission.linked ? (
              <span>No COSPAR yet</span>
            ) : (
              <span>UNLINKED</span>
            )}
            {mission.noradId ? (
              <>
                <span aria-hidden>·</span>
                <span>NORAD {mission.noradId}</span>
              </>
            ) : null}
          </div>
        </div>
        {mission.status ? <StatusPill status={mission.status} /> : null}
      </header>

      {/* Mission characteristics */}
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
        {mission.missionType ? (
          <li className="inline-flex items-center gap-1">
            <Satellite className="h-3 w-3 text-slate-500" />
            <span className="capitalize">
              {mission.missionType.replace(/_/g, " ")}
            </span>
          </li>
        ) : null}
        {mission.orbitType ? (
          <li className="inline-flex items-center gap-1">
            <Globe className="h-3 w-3 text-slate-500" />
            <span>
              {mission.orbitType}
              {mission.altitudeKm
                ? ` · ${Math.round(mission.altitudeKm)} km`
                : ""}
            </span>
          </li>
        ) : null}
        {mission.launchDate ? (
          <li className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3 text-slate-500" />
            <time dateTime={mission.launchDate.toISOString()}>
              {mission.launchDate.toISOString().slice(0, 10)}
            </time>
          </li>
        ) : null}
      </ul>

      {/* Active phase + progress */}
      <div className="mt-1 border-t border-white/[0.06] pt-3">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
            <ListChecks className="mr-1 inline h-3 w-3" />
            {mission.phaseCount} phase{mission.phaseCount === 1 ? "" : "s"}
          </span>
          <span className="font-mono text-[10px] tabular-nums text-slate-300">
            {mission.roadmapProgressPct}%
          </span>
        </div>

        {mission.activePhase ? (
          <>
            <div className="mb-2">
              <p className="text-[11px] font-medium text-slate-200">
                {mission.activePhase.name}
              </p>
              <p className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
                {mission.activePhase.status} · {mission.activePhase.progress}%
              </p>
            </div>
            <ProgressBar value={mission.activePhase.progress} />
          </>
        ) : (
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-600">
            No phases yet
          </p>
        )}
      </div>

      <footer className="mt-1 flex items-center justify-between border-t border-white/[0.04] pt-3 font-mono text-[9px] uppercase tracking-wider">
        <span className="text-slate-600">Detail view in Sprint 5B</span>
        <Link
          href="/dashboard/timeline"
          className="inline-flex items-center gap-1 text-slate-500 transition hover:text-emerald-300"
        >
          Timeline
          <ArrowRight className="h-3 w-3" />
        </Link>
      </footer>
    </article>
  );
}

function StatusPill({
  status,
}: {
  status: NonNullable<MissionSummary["status"]>;
}) {
  const tone =
    status === "OPERATIONAL"
      ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30"
      : status === "LAUNCHED"
        ? "bg-cyan-500/10 text-cyan-300 ring-cyan-500/30"
        : status === "PRE_LAUNCH"
          ? "bg-amber-500/10 text-amber-300 ring-amber-500/30"
          : status === "DECOMMISSIONING"
            ? "bg-orange-500/10 text-orange-300 ring-orange-500/30"
            : "bg-slate-500/10 text-slate-400 ring-slate-500/30";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ring-1 ring-inset ${tone}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const tone =
    clamped >= 75
      ? "bg-emerald-500"
      : clamped >= 30
        ? "bg-amber-500"
        : "bg-slate-500";
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className={`h-full ${tone} transition-all duration-500`}
        style={{ width: `${clamped}%` }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </span>
      <span className="font-mono text-base font-semibold tabular-nums text-slate-100">
        {value}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="palantir-surface mx-auto max-w-xl rounded-md p-12 text-center">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/30">
        <Rocket className="h-5 w-5 text-emerald-400" />
      </div>
      <h2 className="mb-2 text-sm font-semibold text-slate-100">
        No missions yet
      </h2>
      <p className="mx-auto max-w-md text-xs text-slate-500">
        Add a spacecraft from the registration module or import a CelesTrak TLE.
        Each spacecraft becomes one mission with its own phase roadmap.
      </p>
      <div className="mt-6 inline-flex items-center gap-2">
        <Link
          href="/dashboard/modules/registration"
          className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-emerald-300 ring-1 ring-inset ring-emerald-500/30 transition hover:bg-emerald-500/20"
        >
          Register spacecraft
          <ArrowRight className="h-3 w-3" />
        </Link>
        <Link
          href="/dashboard/ephemeris"
          className="inline-flex items-center gap-1 rounded bg-white/[0.04] px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-300 ring-1 ring-inset ring-white/[0.08] transition hover:bg-white/[0.08]"
        >
          Import TLE
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
