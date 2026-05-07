import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Rocket,
  Satellite,
  Globe,
  Calendar,
  ListChecks,
  Flag,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Target,
  Users,
  Layers,
  FileText,
  History,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import { prisma } from "@/lib/prisma";
import {
  getMissionDetail,
  resolvePrimaryOrgId,
  type MissionDetail,
  type MissionPhaseDetail,
  type MissionMilestone,
} from "@/lib/comply-v2/missions.server";
import { MissionDetailActions } from "./MissionDetailActions";

export const dynamic = "force-dynamic";

type RouteParams = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: RouteParams }) {
  const { id } = await params;
  return {
    title: `Mission ${id.slice(0, 8)}… — Caelex Comply`,
    description:
      "Mission identity, customer / authority references, spacecraft assignments, and the regulatory phase roadmap.",
  };
}

/**
 * Mission detail page (Sprint Mission-3 rewrite).
 *
 * Server component:
 *   1. Fetches the mission via getMissionDetail (org-scoped, includes
 *      assigned + past spacecraft + phases + milestones)
 *   2. Fetches the org's available spacecraft (those not currently
 *      active on this mission) for the assignment picker
 *   3. Renders the read-only mission view + interactive client island
 *      <MissionDetailActions /> for edit / archive / assign / detach
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

  // Fetch the org's available spacecraft for the assignment picker.
  // Exclude any spacecraft currently active on THIS mission (assignment
  // would 409). Other-mission spacecraft ARE allowed — same hardware
  // can serve sequential missions.
  const orgId = await resolvePrimaryOrgId(session.user.id);
  const activeIdsHere = new Set(
    mission.assignedSpacecraft.map((a) => a.spacecraftId),
  );
  const availableSpacecraft = orgId
    ? (
        await prisma.spacecraft.findMany({
          where: { organizationId: orgId },
          select: {
            id: true,
            name: true,
            status: true,
            cosparId: true,
            noradId: true,
            orbitType: true,
            altitudeKm: true,
          },
          orderBy: { createdAt: "desc" },
          take: 200,
        })
      ).filter((s) => !activeIdsHere.has(s.id))
    : [];

  const sansFont =
    'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';
  const displayFont =
    'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';

  return (
    <div
      className="mx-auto max-w-screen-2xl px-6 py-6"
      style={{ fontFamily: sansFont }}
    >
      <Breadcrumb missionName={mission.name} />

      <DetailHeader mission={mission} displayFont={displayFont} />

      <MissionDetailActions
        missionId={mission.id}
        currentName={mission.name}
        currentReference={mission.reference}
        currentDescription={mission.description}
        currentMissionType={mission.missionType}
        currentProgramPhase={mission.programPhase}
        currentStatus={mission.status}
        currentPrimaryEndUser={mission.primaryEndUser}
        currentPrimaryEndUserCountryCode={mission.primaryEndUserCountryCode}
        currentPlannedStartAt={
          mission.plannedStartAt
            ? mission.plannedStartAt.toISOString().slice(0, 10)
            : null
        }
        currentStartedAt={
          mission.startedAt
            ? mission.startedAt.toISOString().slice(0, 10)
            : null
        }
        currentEndedAt={
          mission.endedAt ? mission.endedAt.toISOString().slice(0, 10) : null
        }
        currentAuthorityRefs={mission.authorityRefs}
        availableSpacecraft={availableSpacecraft}
        assignedSpacecraft={mission.assignedSpacecraft}
      />

      <FactsCard mission={mission} />

      <StatsRow mission={mission} />

      <AssignedSpacecraftSection
        active={mission.assignedSpacecraft}
        past={mission.pastSpacecraft}
      />

      <AuthorityRefsCard refs={mission.authorityRefs} />

      <PhaseRoadmap phases={mission.phases} />
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────

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

function DetailHeader({
  mission,
  displayFont,
}: {
  mission: MissionDetail;
  displayFont: string;
}) {
  return (
    <header className="mb-5 flex items-end justify-between gap-6 border-b border-white/[0.06] pb-4">
      <div className="min-w-0">
        <div className="mb-1.5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400">
          <Rocket className="h-3 w-3" />
          MISSION
        </div>
        <h1
          className="truncate text-[24px] font-semibold tracking-tight text-slate-100"
          style={{ fontFamily: displayFont, letterSpacing: "-0.022em" }}
        >
          {mission.name}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">
          {mission.reference ? <span>REF · {mission.reference}</span> : null}
          <span>{phaseLabel(mission.programPhase)}</span>
          <span>{missionTypeLabel(mission.missionType)}</span>
        </div>
      </div>
      <BigStatusPill status={mission.status} />
    </header>
  );
}

function BigStatusPill({ status }: { status: MissionDetail["status"] }) {
  const tone =
    status === "ACTIVE"
      ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30"
      : status === "PLANNED"
        ? "bg-amber-500/10 text-amber-300 ring-amber-500/30"
        : status === "PAUSED"
          ? "bg-orange-500/10 text-orange-300 ring-orange-500/30"
          : status === "COMPLETED"
            ? "bg-cyan-500/10 text-cyan-300 ring-cyan-500/30"
            : status === "CANCELLED"
              ? "bg-red-500/10 text-red-300 ring-red-500/30"
              : "bg-slate-500/10 text-slate-400 ring-slate-500/30";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ring-1 ring-inset ${tone}`}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function FactsCard({ mission }: { mission: MissionDetail }) {
  return (
    <section className="mb-5 rounded-md p-4 ring-1 ring-inset ring-white/[0.06]">
      <h2 className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-300">
        Mission profile
      </h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
        <DefItem
          label="Type"
          value={missionTypeLabel(mission.missionType)}
          icon={Satellite}
        />
        <DefItem
          label="Program phase"
          value={phaseLabel(mission.programPhase)}
          icon={Layers}
        />
        <DefItem
          label="Primary end-user"
          value={mission.primaryEndUser}
          icon={Users}
        />
        <DefItem
          label="End-user country"
          value={mission.primaryEndUserCountryCode}
          icon={Globe}
        />
        <DefItem
          label="Planned start"
          value={dateOnly(mission.plannedStartAt)}
          icon={Calendar}
        />
        <DefItem
          label="Started"
          value={dateOnly(mission.startedAt)}
          icon={Calendar}
        />
        <DefItem
          label="Ended"
          value={dateOnly(mission.endedAt)}
          icon={Calendar}
        />
        <DefItem
          label="Spacecraft assigned"
          value={String(mission.spacecraftCount)}
          icon={Rocket}
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
}: {
  label: string;
  value: string | null;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const display =
    value === null || value === undefined || value === "" ? "—" : value;
  return (
    <div>
      <dt className="mb-1 inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
        {Icon ? <Icon className="h-3 w-3" /> : null}
        {label}
      </dt>
      <dd
        className={`text-xs ${
          display === "—" ? "text-slate-600" : "text-slate-100"
        }`}
      >
        {display}
      </dd>
    </div>
  );
}

function StatsRow({ mission }: { mission: MissionDetail }) {
  return (
    <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        label="Regulatory milestones"
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
  return (
    <div className="flex flex-col gap-1.5 rounded-md p-4 ring-1 ring-inset ring-white/[0.06]">
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

function AssignedSpacecraftSection({
  active,
  past,
}: {
  active: MissionDetail["assignedSpacecraft"];
  past: MissionDetail["pastSpacecraft"];
}) {
  return (
    <section className="mb-6 rounded-md ring-1 ring-inset ring-white/[0.06]">
      <header className="border-b border-white/[0.06] px-4 py-3">
        <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-300">
          Spacecraft assignments
        </h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Use the &quot;Assign spacecraft&quot; control above to add a
          spacecraft to this mission. Detach when the spacecraft retires from
          the mission (history is preserved).
        </p>
      </header>
      {active.length === 0 ? (
        <div className="px-4 py-6 text-center text-[11px] text-slate-500">
          No spacecraft currently assigned.
        </div>
      ) : (
        <table className="w-full text-left text-xs">
          <thead className="text-slate-500">
            <tr className="border-b border-white/[0.06]">
              <Th>Spacecraft</Th>
              <Th>Role</Th>
              <Th>Slot</Th>
              <Th>COSPAR / NORAD</Th>
              <Th>Orbit</Th>
              <Th>Since</Th>
              <Th>Status</Th>
              <Th>
                <span className="sr-only">Action</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {active.map((a) => (
              <tr
                key={a.assignmentId}
                className="border-b border-white/[0.04] last:border-b-0"
                data-assignment-id={a.assignmentId}
              >
                <Td className="font-medium text-slate-100">
                  {a.spacecraftName}
                </Td>
                <Td>{a.role}</Td>
                <Td>{a.constellationSlot ?? "—"}</Td>
                <Td className="font-mono text-[10px] text-slate-400">
                  {[a.cosparId, a.noradId].filter(Boolean).join(" · ") || "—"}
                </Td>
                <Td>
                  {a.orbitType}
                  {a.altitudeKm ? ` · ${Math.round(a.altitudeKm)} km` : ""}
                </Td>
                <Td>{a.startedAt.toISOString().slice(0, 10)}</Td>
                <Td>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-slate-400">
                    {a.status}
                  </span>
                </Td>
                <Td>
                  <button
                    type="button"
                    data-detach-assignment={a.assignmentId}
                    className="rounded px-2 py-0.5 text-[10px] uppercase tracking-wider text-rose-400 ring-1 ring-inset ring-rose-500/30 transition hover:bg-rose-500/10"
                  >
                    Detach
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {past.length > 0 ? (
        <details className="border-t border-white/[0.06] px-4 py-3">
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-slate-500">
            <History className="mr-1 inline h-3 w-3" />
            Past assignments ({past.length})
          </summary>
          <ul className="mt-3 space-y-1 text-xs text-slate-500">
            {past.map((a) => (
              <li
                key={a.assignmentId}
                className="flex items-center justify-between gap-3"
              >
                <span>
                  {a.spacecraftName}{" "}
                  <span className="text-slate-600">· {a.role}</span>
                </span>
                <span className="font-mono text-[10px] text-slate-600">
                  {a.startedAt.toISOString().slice(0, 10)} →{" "}
                  {a.endedAt ? a.endedAt.toISOString().slice(0, 10) : "?"}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-3 py-2 align-middle text-slate-300 ${className ?? ""}`}>
      {children}
    </td>
  );
}

function AuthorityRefsCard({ refs }: { refs: string[] }) {
  if (refs.length === 0) return null;
  return (
    <section className="mb-6 rounded-md p-4 ring-1 ring-inset ring-white/[0.06]">
      <h2 className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-300">
        <FileText className="h-3 w-3" />
        Authority references
      </h2>
      <ul className="flex flex-wrap gap-2">
        {refs.map((ref, i) => (
          <li
            key={`${ref}-${i}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-2.5 py-1 font-mono text-[11px] text-slate-200 ring-1 ring-inset ring-white/[0.06]"
          >
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
            {ref}
          </li>
        ))}
      </ul>
    </section>
  );
}

function PhaseRoadmap({ phases }: { phases: MissionPhaseDetail[] }) {
  if (phases.length === 0) {
    return (
      <section>
        <h2 className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
          Phase roadmap
        </h2>
        <div className="rounded-md p-8 text-center ring-1 ring-inset ring-white/[0.06]">
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
    <li
      className={`rounded-md border-l-2 p-4 ring-1 ring-inset ring-white/[0.06] ${statusTone}`}
    >
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

// ─── Label helpers ─────────────────────────────────────────────────────────

function dateOnly(d: Date | null): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

function missionTypeLabel(t: MissionDetail["missionType"]): string {
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
    default:
      return "Other";
  }
}

function phaseLabel(p: MissionDetail["programPhase"]): string {
  switch (p) {
    case "PHASE_A":
      return "Phase A";
    case "PHASE_B":
      return "Phase B";
    case "PHASE_C":
      return "Phase C";
    case "PHASE_D":
      return "Phase D";
    case "PHASE_E":
      return "Phase E";
    case "PHASE_F":
      return "Phase F";
    default:
      return p;
  }
}
