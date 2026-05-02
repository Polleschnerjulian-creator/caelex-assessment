import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Rocket,
  Satellite,
  Globe,
  Calendar,
  Compass,
  ListChecks,
  Flag,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Target,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import {
  getMissionDetail,
  type MissionDetail,
  type MissionPhaseDetail,
  type MissionMilestone,
} from "@/lib/comply-v2/mission-detail.server";

export const dynamic = "force-dynamic";

// Next 15: dynamic-route params is now async.
type RouteParams = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: RouteParams }) {
  const { id } = await params;
  return {
    title: `Mission ${id.slice(0, 8)}… — Caelex Comply`,
    description:
      "Spacecraft summary, regulatory phase roadmap, and milestone tracker.",
  };
}

/**
 * Mission detail — V2-exclusive surface that renders the full phase
 * roadmap for a single mission. Sprint 5B delivers the static
 * timeline view; subsequent sprints add inline editing + Astra
 * recommendations on what's next.
 */
export default async function MissionDetailPage({
  params,
}: {
  params: RouteParams;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?next=/dashboard/missions/${id}`);
  }
  const ui = await resolveComplyUiVersion();
  if (ui === "v1") redirect("/dashboard");

  const mission = await getMissionDetail(session.user.id, id);
  if (!mission) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-screen-2xl px-6 py-6">
      <Breadcrumb missionName={mission.name} />

      <DetailHeader mission={mission} />

      {mission.linked ? <SpacecraftCard mission={mission} /> : null}

      <StatsRow mission={mission} />

      <PhaseRoadmap phases={mission.phases} />
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────

function Breadcrumb({ missionName }: { missionName: string }) {
  return (
    <nav className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
      <Link
        href="/dashboard/missions"
        className="inline-flex items-center gap-1 transition hover:text-emerald-300"
      >
        <ArrowLeft className="h-3 w-3" />
        Missions
      </Link>
      <span aria-hidden>·</span>
      <span className="truncate text-slate-300">{missionName}</span>
    </nav>
  );
}

function DetailHeader({ mission }: { mission: MissionDetail }) {
  return (
    <header className="mb-6 flex items-end justify-between gap-6 border-b border-white/[0.06] pb-4">
      <div className="min-w-0">
        <div className="mb-1.5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400">
          <Rocket className="h-3 w-3" />
          {mission.linked ? "MISSION" : "UNLINKED MISSION"}
        </div>
        <h1 className="truncate text-xl font-semibold tracking-tight text-slate-100">
          {mission.name}
        </h1>
        {mission.cosparId || mission.noradId ? (
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">
            {mission.cosparId ? `COSPAR ${mission.cosparId}` : null}
            {mission.cosparId && mission.noradId ? "  ·  " : null}
            {mission.noradId ? `NORAD ${mission.noradId}` : null}
          </p>
        ) : null}
      </div>
      {mission.status ? <BigStatusPill status={mission.status} /> : null}
    </header>
  );
}

function BigStatusPill({
  status,
}: {
  status: NonNullable<MissionDetail["status"]>;
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
      className={`inline-flex shrink-0 items-center gap-1.5 rounded px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ring-1 ring-inset ${tone}`}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {status.replace(/_/g, " ")}
    </span>
  );
}

function SpacecraftCard({ mission }: { mission: MissionDetail }) {
  return (
    <section className="palantir-surface mb-6 rounded-md p-4">
      <h2 className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-300">
        Spacecraft
      </h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
        <DefItem
          label="Mission type"
          value={mission.missionType}
          icon={Satellite}
          format="capitalize-snake"
        />
        <DefItem label="Orbit" value={mission.orbitType} icon={Globe} />
        <DefItem
          label="Altitude"
          value={
            mission.altitudeKm ? `${Math.round(mission.altitudeKm)} km` : null
          }
          icon={Globe}
        />
        <DefItem
          label="Inclination"
          value={
            mission.inclinationDeg !== null
              ? `${mission.inclinationDeg.toFixed(1)}°`
              : null
          }
          icon={Compass}
        />
        <DefItem
          label="Launch"
          value={
            mission.launchDate
              ? mission.launchDate.toISOString().slice(0, 10)
              : null
          }
          icon={Calendar}
        />
        <DefItem
          label="End of life"
          value={
            mission.endOfLifeDate
              ? mission.endOfLifeDate.toISOString().slice(0, 10)
              : null
          }
          icon={Calendar}
        />
      </dl>
      {mission.description ? (
        <p className="mt-4 border-t border-white/[0.06] pt-3 text-xs text-slate-400">
          {mission.description}
        </p>
      ) : null}
    </section>
  );
}

function DefItem({
  label,
  value,
  icon: Icon,
  format,
}: {
  label: string;
  value: string | null;
  icon?: React.ComponentType<{ className?: string }>;
  format?: "capitalize-snake";
}) {
  const display =
    value === null || value === undefined || value === ""
      ? "—"
      : format === "capitalize-snake"
        ? value.replace(/_/g, " ")
        : value;
  return (
    <div>
      <dt className="mb-1 inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
        {Icon ? <Icon className="h-3 w-3" /> : null}
        {label}
      </dt>
      <dd
        className={`text-xs ${
          display === "—" ? "text-slate-600" : "text-slate-100 capitalize"
        }`}
      >
        {display}
      </dd>
    </div>
  );
}

function StatsRow({ mission }: { mission: MissionDetail }) {
  return (
    <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        label="Phases"
        value={mission.phases.length}
        icon={ListChecks}
        tone="slate"
      />
      <StatTile
        label="Roadmap progress"
        value={`${mission.roadmapProgressPct}%`}
        icon={Target}
        tone="emerald"
      />
      <StatTile
        label="Milestones"
        value={mission.totalMilestones}
        icon={Flag}
        tone="slate"
      />
      <StatTile
        label="Regulatory"
        value={mission.regulatoryMilestones}
        icon={ShieldCheck}
        tone={mission.regulatoryMilestones > 0 ? "amber" : "slate"}
      />
    </section>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "emerald" | "amber" | "slate";
}) {
  const accent =
    tone === "emerald"
      ? "text-emerald-400"
      : tone === "amber"
        ? "text-amber-400"
        : "text-slate-500";
  const stripe =
    tone === "emerald"
      ? "palantir-stripe-emerald"
      : tone === "amber"
        ? "palantir-stripe-amber"
        : "";
  return (
    <div
      className={`palantir-surface flex flex-col gap-1.5 rounded-md p-4 ${stripe}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">
          {label}
        </span>
        <Icon className={`h-3 w-3 ${accent}`} />
      </div>
      <div className="font-mono text-2xl font-bold tracking-tight tabular-nums text-slate-50">
        {value}
      </div>
    </div>
  );
}

function PhaseRoadmap({ phases }: { phases: MissionPhaseDetail[] }) {
  if (phases.length === 0) {
    return (
      <section>
        <h2 className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
          Phase roadmap
        </h2>
        <div className="palantir-surface rounded-md p-8 text-center">
          <p className="text-xs text-slate-500">
            No phases yet. Add planning phases via{" "}
            <Link
              href="/dashboard/timeline"
              className="text-emerald-400 transition hover:text-emerald-300"
            >
              Timeline
            </Link>
            .
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
        Phase roadmap
      </h2>
      <ol className="space-y-3">
        {phases.map((phase, idx) => (
          <PhaseRow key={phase.id} phase={phase} order={idx + 1} />
        ))}
      </ol>
    </section>
  );
}

function PhaseRow({
  phase,
  order,
}: {
  phase: MissionPhaseDetail;
  order: number;
}) {
  const statusTone =
    phase.status === "IN_PROGRESS"
      ? "border-l-emerald-500/60 bg-emerald-500/[0.03]"
      : phase.status === "COMPLETED"
        ? "border-l-cyan-500/40"
        : phase.status === "DELAYED"
          ? "border-l-red-500/60 bg-red-500/[0.03]"
          : phase.status === "ON_HOLD"
            ? "border-l-slate-500/30 opacity-60"
            : "border-l-amber-500/40";

  return (
    <li className={`palantir-surface rounded-md border-l-2 p-4 ${statusTone}`}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
              Phase {order}
            </span>
            <PhaseStatusPill status={phase.status} />
          </div>
          <h3 className="mt-1 truncate text-sm font-semibold text-slate-100">
            {phase.name}
          </h3>
          {phase.description ? (
            <p className="mt-1 text-xs text-slate-400">{phase.description}</p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
            {phase.startDate.toISOString().slice(0, 10)}
          </div>
          <div className="font-mono text-[10px] text-slate-600">
            → {phase.endDate.toISOString().slice(0, 10)}
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between font-mono text-[9px] uppercase tracking-wider">
          <span className="text-slate-500">Progress</span>
          <span className="tabular-nums text-slate-300">{phase.progress}%</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={`h-full transition-all duration-500 ${
              phase.progress >= 75
                ? "bg-emerald-500"
                : phase.progress >= 30
                  ? "bg-amber-500"
                  : "bg-slate-500"
            }`}
            style={{ width: `${Math.max(0, Math.min(100, phase.progress))}%` }}
            role="progressbar"
            aria-valuenow={phase.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${phase.name} progress`}
          />
        </div>
      </div>

      {/* Milestones */}
      {phase.milestones.length > 0 ? (
        <ul className="mt-4 space-y-2 border-t border-white/[0.06] pt-3">
          {phase.milestones.map((m) => (
            <MilestoneRow key={m.id} milestone={m} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function PhaseStatusPill({ status }: { status: MissionPhaseDetail["status"] }) {
  const tone =
    status === "IN_PROGRESS"
      ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30"
      : status === "COMPLETED"
        ? "bg-cyan-500/10 text-cyan-300 ring-cyan-500/30"
        : status === "DELAYED"
          ? "bg-red-500/10 text-red-300 ring-red-500/30"
          : status === "ON_HOLD"
            ? "bg-slate-500/10 text-slate-500 ring-slate-500/30"
            : "bg-amber-500/10 text-amber-300 ring-amber-500/30";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ring-1 ring-inset ${tone}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function MilestoneRow({ milestone }: { milestone: MissionMilestone }) {
  const Icon = pickMilestoneIcon(milestone);
  const tone =
    milestone.status === "COMPLETED"
      ? "text-emerald-400"
      : milestone.status === "MISSED"
        ? "text-red-400"
        : milestone.status === "RESCHEDULED"
          ? "text-amber-400"
          : milestone.status === "IN_PROGRESS"
            ? "text-cyan-400"
            : "text-slate-400";
  return (
    <li className="flex items-start gap-3 text-xs">
      <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${tone}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-medium text-slate-200">{milestone.name}</span>
          <time
            dateTime={milestone.targetDate.toISOString()}
            className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-slate-500"
          >
            {milestone.targetDate.toISOString().slice(0, 10)}
          </time>
        </div>
        {milestone.description ? (
          <p className="text-[11px] text-slate-500">{milestone.description}</p>
        ) : null}
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider">
          {milestone.isRegulatory ? (
            <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1 py-0.5 text-amber-300 ring-1 ring-inset ring-amber-500/30">
              <ShieldCheck className="h-2.5 w-2.5" />
              Regulatory
              {milestone.regulatoryRef ? ` · ${milestone.regulatoryRef}` : ""}
            </span>
          ) : null}
          {milestone.isCritical ? (
            <span className="inline-flex items-center gap-1 rounded bg-red-500/10 px-1 py-0.5 text-red-300 ring-1 ring-inset ring-red-500/30">
              <AlertTriangle className="h-2.5 w-2.5" />
              Critical
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function pickMilestoneIcon(
  m: MissionMilestone,
): React.ComponentType<{ className?: string }> {
  if (m.status === "COMPLETED") return CheckCircle2;
  if (m.status === "MISSED") return AlertTriangle;
  if (m.status === "RESCHEDULED") return Clock;
  return Flag;
}
