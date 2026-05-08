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
  Briefcase,
  AlertOctagon,
  Truck,
  ArrowUpRight,
  Hourglass,
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
  type RelatedWorkflowRef,
  type RelatedDocumentRef,
  type RelatedIncidentRef,
  type RelatedTradeOperationRef,
} from "@/lib/comply-v2/missions.server";
import { MissionDetailActions } from "./MissionDetailActions";
import {
  Nis2PhaseCountdown,
  type PhaseRow,
} from "@/components/dashboard/v2/Nis2PhaseCountdown";

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
      className="mx-auto max-w-7xl px-6 py-8 sm:px-8"
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

      <Nis2PhaseAlertSection incidents={mission.relatedIncidents} />

      <RelatedSections
        workflows={mission.relatedWorkflows}
        documents={mission.relatedDocuments}
        incidents={mission.relatedIncidents}
        tradeOps={mission.relatedTradeOperations}
      />
    </div>
  );
}

/**
 * Sprint C-UI — surfaces unsubmitted NIS2 reporting phases across all
 * incidents linked to this mission. Hidden when no open phases exist.
 * Tone-shifts the card border based on the worst-tier across rows
 * (rose for any OVERDUE/ESCALATED, amber for any WARNING/CRITICAL).
 */
function Nis2PhaseAlertSection({
  incidents,
}: {
  incidents: MissionDetail["relatedIncidents"];
}) {
  const rows: PhaseRow[] = incidents.flatMap((inc) =>
    inc.openPhases.map((p) => ({
      ...p,
      incidentNumber: inc.incidentNumber,
      incidentTitle: inc.title,
    })),
  );

  if (rows.length === 0) return null;

  // Worst-tier tone for the card border
  const now = new Date();
  const hasOverdue = rows.some(
    (r) =>
      r.markedOverdueAt ||
      r.escalatedAt ||
      new Date(r.deadline).getTime() <= now.getTime(),
  );
  const hasWarning = rows.some(
    (r) => r.warnedCriticalAt || r.warnedApproachingAt,
  );

  const borderTone = hasOverdue
    ? "border-rose-500/25 bg-gradient-to-b from-rose-500/[0.03] to-rose-500/[0.008]"
    : hasWarning
      ? "border-amber-500/20 bg-gradient-to-b from-amber-500/[0.025] to-amber-500/[0.008]"
      : "border-white/[0.06] bg-gradient-to-b from-white/[0.025] to-white/[0.012]";

  return (
    <section
      className={`mt-6 overflow-hidden rounded-xl border ${borderTone} shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]`}
    >
      <header className="flex items-start justify-between gap-3 border-b border-white/[0.05] bg-white/[0.012] px-5 py-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold tracking-tight text-slate-100">
            <Hourglass className="h-3.5 w-3.5 text-amber-300" />
            NIS2 reporting deadlines
          </h2>
          <p className="mt-0.5 text-[12px] text-slate-400">
            Art. 23 phases for active incidents on this mission. T-12h / T-2h /
            T+0 / T+24h tiers fire automatically (notification + email).
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-white/[0.05] px-2.5 py-0.5 text-[11px] font-medium text-slate-300 ring-1 ring-inset ring-white/[0.06]">
          {rows.length} open
        </span>
      </header>
      <Nis2PhaseCountdown phases={rows} now={new Date()} showIncidentRef />
    </section>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────

function Breadcrumb({ missionName }: { missionName: string }) {
  return (
    <nav className="mb-5 flex items-center gap-2 text-[11px] font-medium tracking-wide text-slate-500">
      <Link
        href="/dashboard/missions"
        className="inline-flex items-center gap-1.5 text-slate-400 transition hover:text-slate-200"
      >
        <ArrowLeft className="h-3 w-3" />
        Missions
      </Link>
      <span aria-hidden className="text-slate-600">
        /
      </span>
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
    <header className="mb-6 flex flex-col gap-4 border-b border-white/[0.06] pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/[0.08] px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-emerald-300 ring-1 ring-inset ring-emerald-500/20">
          <Rocket className="h-3 w-3" />
          Mission
        </div>
        <h1
          className="truncate text-[28px] font-semibold text-slate-50"
          style={{
            fontFamily: displayFont,
            letterSpacing: "-0.022em",
            lineHeight: 1.15,
          }}
        >
          {mission.name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12px] text-slate-400">
          {mission.reference ? (
            <span className="rounded bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] text-slate-300 ring-1 ring-inset ring-white/[0.06]">
              {mission.reference}
            </span>
          ) : null}
          <Chip>{missionTypeLabel(mission.missionType)}</Chip>
          <Chip>{phaseLabel(mission.programPhase)}</Chip>
        </div>
      </div>
      <BigStatusPill status={mission.status} />
    </header>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white/[0.04] px-2 py-0.5 text-[11.5px] text-slate-300 ring-1 ring-inset ring-white/[0.06]">
      {children}
    </span>
  );
}

function BigStatusPill({ status }: { status: MissionDetail["status"] }) {
  const tone =
    status === "ACTIVE"
      ? {
          bg: "bg-emerald-500/[0.08]",
          text: "text-emerald-300",
          ring: "ring-emerald-500/25",
          dot: "bg-emerald-400",
        }
      : status === "PLANNED"
        ? {
            bg: "bg-amber-500/[0.08]",
            text: "text-amber-300",
            ring: "ring-amber-500/25",
            dot: "bg-amber-400",
          }
        : status === "PAUSED"
          ? {
              bg: "bg-orange-500/[0.08]",
              text: "text-orange-300",
              ring: "ring-orange-500/25",
              dot: "bg-orange-400",
            }
          : status === "COMPLETED"
            ? {
                bg: "bg-cyan-500/[0.08]",
                text: "text-cyan-300",
                ring: "ring-cyan-500/25",
                dot: "bg-cyan-400",
              }
            : status === "CANCELLED"
              ? {
                  bg: "bg-rose-500/[0.08]",
                  text: "text-rose-300",
                  ring: "ring-rose-500/25",
                  dot: "bg-rose-400",
                }
              : {
                  bg: "bg-slate-500/[0.08]",
                  text: "text-slate-400",
                  ring: "ring-slate-500/25",
                  dot: "bg-slate-400",
                };
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-semibold ring-1 ring-inset ${tone.bg} ${tone.text} ${tone.ring}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function FactsCard({ mission }: { mission: MissionDetail }) {
  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-b from-white/[0.025] to-white/[0.012] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <header className="flex items-center gap-2 border-b border-white/[0.05] bg-white/[0.012] px-5 py-3">
        <Satellite className="h-3.5 w-3.5 text-slate-400" />
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Mission profile
        </h2>
      </header>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-5 sm:grid-cols-3 lg:grid-cols-4">
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
        <div className="border-t border-white/[0.05] bg-white/[0.012] px-5 py-4">
          <p className="text-[12.5px] leading-relaxed text-slate-300">
            {mission.description}
          </p>
        </div>
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
    <div className="min-w-0">
      <dt className="mb-1 inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {Icon ? <Icon className="h-3 w-3" /> : null}
        {label}
      </dt>
      <dd
        className={`truncate text-[13px] ${
          display === "—" ? "text-slate-600" : "font-medium text-slate-100"
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
  const tones = {
    emerald: {
      icon: "text-emerald-400",
      iconBg: "bg-emerald-500/10 ring-emerald-500/15",
    },
    amber: {
      icon: "text-amber-400",
      iconBg: "bg-amber-500/10 ring-amber-500/15",
    },
    slate: {
      icon: "text-slate-400",
      iconBg: "bg-white/[0.04] ring-white/[0.06]",
    },
  } as const;
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-b from-white/[0.025] to-white/[0.012] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </span>
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-md ring-1 ring-inset ${tones[tone].iconBg}`}
        >
          <Icon className={`h-3 w-3 ${tones[tone].icon}`} />
        </span>
      </div>
      <div className="mt-3 text-[26px] font-semibold tabular-nums leading-none tracking-tight text-slate-50">
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
    <section className="mb-6 overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-b from-white/[0.025] to-white/[0.012] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <header className="flex items-start justify-between gap-3 border-b border-white/[0.05] bg-white/[0.012] px-5 py-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[14px] font-semibold tracking-tight text-slate-100">
            <Rocket className="h-3.5 w-3.5 text-slate-400" />
            Spacecraft assignments
          </h2>
          <p className="mt-0.5 text-[12px] text-slate-400">
            Use &ldquo;Assign spacecraft&rdquo; above to add hardware. Detach
            preserves history; ended assignments stay on record.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-white/[0.05] px-2.5 py-0.5 text-[11px] font-medium text-slate-300 ring-1 ring-inset ring-white/[0.06]">
          {active.length} active
        </span>
      </header>
      {active.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] ring-1 ring-inset ring-white/[0.06]">
            <Rocket className="h-4 w-4 text-slate-500" />
          </div>
          <p className="text-[12.5px] text-slate-400">
            No spacecraft currently assigned.
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Click &ldquo;Assign spacecraft&rdquo; to bring hardware under this
            mission.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-white/[0.05] bg-white/[0.012]">
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
                  className="border-b border-white/[0.04] transition last:border-b-0 hover:bg-white/[0.015]"
                  data-assignment-id={a.assignmentId}
                >
                  <Td className="font-medium text-slate-100">
                    {a.spacecraftName}
                  </Td>
                  <Td>
                    <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[11px] text-slate-300 ring-1 ring-inset ring-white/[0.06]">
                      {a.role.replace(/_/g, " ")}
                    </span>
                  </Td>
                  <Td className="tabular-nums">
                    {a.constellationSlot ?? (
                      <span className="text-slate-600">—</span>
                    )}
                  </Td>
                  <Td>
                    {[a.cosparId, a.noradId].filter(Boolean).length > 0 ? (
                      <span className="font-mono text-[11px] text-slate-400">
                        {[a.cosparId, a.noradId].filter(Boolean).join(" · ")}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </Td>
                  <Td>
                    {a.orbitType}
                    {a.altitudeKm ? (
                      <span className="text-slate-500">
                        {" "}
                        · {Math.round(a.altitudeKm)} km
                      </span>
                    ) : null}
                  </Td>
                  <Td className="tabular-nums text-slate-400">
                    {a.startedAt.toISOString().slice(0, 10)}
                  </Td>
                  <Td>
                    <SpacecraftStatusPill status={a.status} />
                  </Td>
                  <Td>
                    <button
                      type="button"
                      data-detach-assignment={a.assignmentId}
                      className="rounded-md px-2.5 py-1 text-[11px] font-medium text-rose-300 ring-1 ring-inset ring-rose-500/25 transition hover:bg-rose-500/10"
                    >
                      Detach
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {past.length > 0 ? (
        <details className="border-t border-white/[0.05] bg-white/[0.012] px-5 py-3">
          <summary className="flex cursor-pointer items-center gap-2 text-[11.5px] font-medium text-slate-400 transition hover:text-slate-200">
            <History className="h-3 w-3" />
            Past assignments
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] tabular-nums text-slate-400">
              {past.length}
            </span>
          </summary>
          <ul className="mt-3 space-y-1.5 text-[12px] text-slate-400">
            {past.map((a) => (
              <li
                key={a.assignmentId}
                className="flex items-center justify-between gap-3"
              >
                <span className="truncate">
                  <span className="font-medium text-slate-300">
                    {a.spacecraftName}
                  </span>
                  <span className="ml-1.5 text-slate-600">·</span>
                  <span className="ml-1.5">{a.role.replace(/_/g, " ")}</span>
                </span>
                <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-slate-500">
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
    <th className="px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">
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
    <td className={`px-4 py-3 align-middle text-slate-300 ${className ?? ""}`}>
      {children}
    </td>
  );
}

function SpacecraftStatusPill({
  status,
}: {
  status: MissionDetail["assignedSpacecraft"][number]["status"];
}) {
  const tones: Record<
    string,
    { bg: string; text: string; ring: string; dot: string }
  > = {
    OPERATIONAL: {
      bg: "bg-emerald-500/[0.08]",
      text: "text-emerald-300",
      ring: "ring-emerald-500/20",
      dot: "bg-emerald-400",
    },
    LAUNCHED: {
      bg: "bg-cyan-500/[0.08]",
      text: "text-cyan-300",
      ring: "ring-cyan-500/20",
      dot: "bg-cyan-400",
    },
    PRE_LAUNCH: {
      bg: "bg-amber-500/[0.08]",
      text: "text-amber-300",
      ring: "ring-amber-500/20",
      dot: "bg-amber-400",
    },
    DECOMMISSIONING: {
      bg: "bg-orange-500/[0.08]",
      text: "text-orange-300",
      ring: "ring-orange-500/20",
      dot: "bg-orange-400",
    },
    DEORBITED: {
      bg: "bg-slate-500/[0.08]",
      text: "text-slate-400",
      ring: "ring-slate-500/20",
      dot: "bg-slate-400",
    },
    LOST: {
      bg: "bg-rose-500/[0.08]",
      text: "text-rose-300",
      ring: "ring-rose-500/20",
      dot: "bg-rose-400",
    },
  };
  const t = tones[status] ?? tones.DEORBITED;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${t.bg} ${t.text} ${t.ring}`}
    >
      <span aria-hidden className={`h-1 w-1 rounded-full ${t.dot}`} />
      {status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ")}
    </span>
  );
}

function AuthorityRefsCard({ refs }: { refs: string[] }) {
  if (refs.length === 0) return null;
  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-b from-white/[0.025] to-white/[0.012] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <header className="flex items-center justify-between gap-2 border-b border-white/[0.05] bg-white/[0.012] px-5 py-3">
        <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          <FileText className="h-3.5 w-3.5" />
          Authority references
        </h2>
        <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10.5px] tabular-nums text-slate-400 ring-1 ring-inset ring-white/[0.06]">
          {refs.length}
        </span>
      </header>
      <ul className="flex flex-wrap gap-2 px-5 py-4">
        {refs.map((ref, i) => (
          <li
            key={`${ref}-${i}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] px-2.5 py-1.5 font-mono text-[11.5px] text-slate-200 ring-1 ring-inset ring-white/[0.07]"
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
      <section className="overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-b from-white/[0.025] to-white/[0.012] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <header className="flex items-center gap-2 border-b border-white/[0.05] bg-white/[0.012] px-5 py-3">
          <ListChecks className="h-3.5 w-3.5 text-slate-400" />
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Phase roadmap
          </h2>
        </header>
        <div className="px-5 py-10 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] ring-1 ring-inset ring-white/[0.06]">
            <ListChecks className="h-4 w-4 text-slate-500" />
          </div>
          <p className="text-[12.5px] text-slate-400">
            No phases yet. Add planning phases via{" "}
            <Link
              href="/dashboard/timeline"
              className="font-medium text-emerald-300 underline-offset-4 transition hover:text-emerald-200 hover:underline"
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
    <section className="overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-b from-white/[0.025] to-white/[0.012] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <header className="flex items-center justify-between gap-2 border-b border-white/[0.05] bg-white/[0.012] px-5 py-3">
        <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          <ListChecks className="h-3.5 w-3.5" />
          Phase roadmap
        </h2>
        <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10.5px] tabular-nums text-slate-400 ring-1 ring-inset ring-white/[0.06]">
          {phases.length} {phases.length === 1 ? "phase" : "phases"}
        </span>
      </header>
      <ol className="divide-y divide-white/[0.04]">
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
      ? "border-l-emerald-500/60 bg-emerald-500/[0.025]"
      : phase.status === "COMPLETED"
        ? "border-l-cyan-500/40"
        : phase.status === "DELAYED"
          ? "border-l-rose-500/60 bg-rose-500/[0.025]"
          : phase.status === "ON_HOLD"
            ? "border-l-slate-500/30 opacity-70"
            : "border-l-amber-500/40";

  return (
    <li className={`border-l-2 px-5 py-4 ${statusTone}`}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400 ring-1 ring-inset ring-white/[0.06]">
              Phase {order}
            </span>
            <PhaseStatusPill status={phase.status} />
          </div>
          <h3 className="mt-1.5 truncate text-[14px] font-semibold text-slate-100">
            {phase.name}
          </h3>
          {phase.description ? (
            <p className="mt-1 text-[12.5px] leading-relaxed text-slate-400">
              {phase.description}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-[10.5px] tabular-nums text-slate-400">
            {phase.startDate.toISOString().slice(0, 10)}
          </div>
          <div className="font-mono text-[10.5px] tabular-nums text-slate-600">
            → {phase.endDate.toISOString().slice(0, 10)}
          </div>
        </div>
      </header>

      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-[0.12em]">
          <span className="text-slate-500">Progress</span>
          <span className="tabular-nums text-slate-300">{phase.progress}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={`h-full transition-all duration-500 ${
              phase.progress >= 75
                ? "bg-emerald-400"
                : phase.progress >= 30
                  ? "bg-amber-400"
                  : "bg-slate-400"
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
        <ul className="mt-4 space-y-2.5 border-t border-white/[0.05] pt-3">
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

// ─── Sprint MA — Cross-domain related sections ────────────────────────────

function RelatedSections({
  workflows,
  documents,
  incidents,
  tradeOps,
}: {
  workflows: RelatedWorkflowRef[];
  documents: RelatedDocumentRef[];
  incidents: RelatedIncidentRef[];
  tradeOps: RelatedTradeOperationRef[];
}) {
  return (
    <section className="mt-8 grid gap-4 lg:grid-cols-2">
      <RelatedCard
        title="Authorization workflows"
        icon={Briefcase}
        count={workflows.length}
        emptyHint="No NCA authorization workflow has been linked to this mission yet."
        emptyCtaLabel="Open workflows"
        emptyCtaHref="/dashboard/modules/authorization"
      >
        {workflows.length > 0 ? (
          <ul className="divide-y divide-white/[0.04]">
            {workflows.map((w) => (
              <RelatedRow
                key={w.id}
                href={`/dashboard/modules/authorization?workflow=${w.id}`}
                title={`${w.primaryNCAName} · ${w.pathway.replace(/_/g, " ")}`}
                meta={[
                  w.operatorType ?? null,
                  w.targetSubmission
                    ? `target ${w.targetSubmission.toISOString().slice(0, 10)}`
                    : null,
                  w.submittedAt
                    ? `submitted ${w.submittedAt.toISOString().slice(0, 10)}`
                    : null,
                ]}
                statusPill={<WorkflowStatusPill status={w.status} />}
              />
            ))}
          </ul>
        ) : null}
      </RelatedCard>

      <RelatedCard
        title="Documents"
        icon={FileText}
        count={documents.length}
        emptyHint="No documents have been linked to this mission yet."
        emptyCtaLabel="Open document vault"
        emptyCtaHref="/dashboard/documents"
      >
        {documents.length > 0 ? (
          <ul className="divide-y divide-white/[0.04]">
            {documents.map((d) => (
              <RelatedRow
                key={d.id}
                href={`/dashboard/documents?id=${d.id}`}
                title={d.name}
                meta={[
                  d.category.toLowerCase().replace(/_/g, " "),
                  formatBytes(d.fileSize),
                  d.expiryDate
                    ? `expires ${d.expiryDate.toISOString().slice(0, 10)}`
                    : null,
                  d.isExpired ? "EXPIRED" : null,
                ]}
                statusPill={
                  <DocumentStatusPill status={d.status} expired={d.isExpired} />
                }
              />
            ))}
          </ul>
        ) : null}
      </RelatedCard>

      <RelatedCard
        title="Incidents"
        icon={AlertOctagon}
        count={incidents.length}
        tone={
          incidents.some(
            (i) => i.status !== "resolved" && i.status !== "closed",
          )
            ? "rose"
            : undefined
        }
        emptyHint="No incidents recorded for this mission. Good."
        emptyCtaLabel="Open incidents"
        emptyCtaHref="/dashboard/incidents"
      >
        {incidents.length > 0 ? (
          <ul className="divide-y divide-white/[0.04]">
            {incidents.map((i) => (
              <RelatedRow
                key={i.id}
                href={`/dashboard/incidents/${i.id}`}
                title={`${i.incidentNumber} · ${i.title}`}
                meta={[
                  i.category.replace(/_/g, " "),
                  `detected ${i.detectedAt.toISOString().slice(0, 10)}`,
                  i.requiresNCANotification
                    ? i.reportedToNCA
                      ? "NCA reported"
                      : "NCA report due"
                    : null,
                ]}
                statusPill={
                  <IncidentSeverityPill
                    severity={i.severity}
                    status={i.status}
                  />
                }
              />
            ))}
          </ul>
        ) : null}
      </RelatedCard>

      <RelatedCard
        title="Trade operations"
        icon={Truck}
        count={tradeOps.length}
        tone={tradeOps.some((o) => o.catchAllAnyHit) ? "amber" : undefined}
        emptyHint="No export-control operations linked to this mission yet."
        emptyCtaLabel="Open trade module"
        emptyCtaHref="/dashboard/modules/export-control"
      >
        {tradeOps.length > 0 ? (
          <ul className="divide-y divide-white/[0.04]">
            {tradeOps.map((op) => (
              <RelatedRow
                key={op.id}
                href={`/dashboard/modules/export-control/operations/${op.id}`}
                title={`${op.reference} · ${op.counterpartyName}`}
                meta={[
                  op.operationType.toLowerCase().replace(/_/g, " "),
                  `${op.shipFromCountry} → ${op.shipToCountry}`,
                  op.scheduledShipDate
                    ? `ship ${op.scheduledShipDate.toISOString().slice(0, 10)}`
                    : null,
                  op.catchAllAnyHit ? "catch-all hit" : null,
                ]}
                statusPill={
                  <TradeOpStatusPill
                    status={op.status}
                    riskScore={op.riskScore}
                  />
                }
              />
            ))}
          </ul>
        ) : null}
      </RelatedCard>
    </section>
  );
}

function RelatedCard({
  title,
  icon: Icon,
  count,
  emptyHint,
  emptyCtaHref,
  emptyCtaLabel,
  children,
  tone,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  emptyHint: string;
  emptyCtaHref: string;
  emptyCtaLabel: string;
  children?: React.ReactNode;
  tone?: "rose" | "amber";
}) {
  const accent =
    tone === "rose"
      ? "bg-rose-500/10 text-rose-300 ring-rose-500/15"
      : tone === "amber"
        ? "bg-amber-500/10 text-amber-300 ring-amber-500/15"
        : "bg-white/[0.04] text-slate-400 ring-white/[0.06]";
  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-b from-white/[0.025] to-white/[0.012] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <header className="flex items-center justify-between gap-2 border-b border-white/[0.05] bg-white/[0.012] px-5 py-3">
        <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          <Icon className="h-3.5 w-3.5" />
          {title}
        </h2>
        <span
          className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold tabular-nums ring-1 ring-inset ${accent}`}
        >
          {count}
        </span>
      </header>
      {count === 0 ? (
        <div className="px-5 py-6 text-center">
          <p className="mb-2 text-[12.5px] text-slate-400">{emptyHint}</p>
          <Link
            href={emptyCtaHref}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-300 transition hover:text-emerald-200"
          >
            {emptyCtaLabel}
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

function RelatedRow({
  href,
  title,
  meta,
  statusPill,
}: {
  href: string;
  title: string;
  meta: Array<string | null>;
  statusPill?: React.ReactNode;
}) {
  const filteredMeta = meta.filter((m): m is string => Boolean(m));
  return (
    <li>
      <Link
        href={href}
        className="group flex items-start justify-between gap-3 px-5 py-3 transition hover:bg-white/[0.015]"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-medium text-slate-100 group-hover:text-white">
            {title}
          </p>
          {filteredMeta.length > 0 ? (
            <p className="mt-0.5 truncate text-[11px] text-slate-500">
              {filteredMeta.join(" · ")}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {statusPill}
          <ArrowUpRight className="h-3.5 w-3.5 text-slate-500 transition group-hover:text-slate-300" />
        </div>
      </Link>
    </li>
  );
}

function WorkflowStatusPill({ status }: { status: string }) {
  const tones: Record<
    string,
    { bg: string; text: string; ring: string; dot: string }
  > = {
    not_started: {
      bg: "bg-slate-500/[0.08]",
      text: "text-slate-400",
      ring: "ring-slate-500/20",
      dot: "bg-slate-400",
    },
    in_progress: {
      bg: "bg-amber-500/[0.08]",
      text: "text-amber-300",
      ring: "ring-amber-500/20",
      dot: "bg-amber-400",
    },
    submitted: {
      bg: "bg-cyan-500/[0.08]",
      text: "text-cyan-300",
      ring: "ring-cyan-500/20",
      dot: "bg-cyan-400",
    },
    under_review: {
      bg: "bg-cyan-500/[0.08]",
      text: "text-cyan-300",
      ring: "ring-cyan-500/20",
      dot: "bg-cyan-400",
    },
    approved: {
      bg: "bg-emerald-500/[0.08]",
      text: "text-emerald-300",
      ring: "ring-emerald-500/20",
      dot: "bg-emerald-400",
    },
    rejected: {
      bg: "bg-rose-500/[0.08]",
      text: "text-rose-300",
      ring: "ring-rose-500/20",
      dot: "bg-rose-400",
    },
  };
  const t = tones[status] ?? tones.not_started;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-medium ring-1 ring-inset ${t.bg} ${t.text} ${t.ring}`}
    >
      <span aria-hidden className={`h-1 w-1 rounded-full ${t.dot}`} />
      {status.replace(/_/g, " ")}
    </span>
  );
}

function DocumentStatusPill({
  status,
  expired,
}: {
  status: string;
  expired: boolean;
}) {
  if (expired) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/[0.08] px-2 py-0.5 text-[10.5px] font-medium text-rose-300 ring-1 ring-inset ring-rose-500/20">
        <span aria-hidden className="h-1 w-1 rounded-full bg-rose-400" />
        expired
      </span>
    );
  }
  const isApproved = status === "APPROVED";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-medium ring-1 ring-inset ${
        isApproved
          ? "bg-emerald-500/[0.08] text-emerald-300 ring-emerald-500/20"
          : "bg-white/[0.04] text-slate-400 ring-white/[0.06]"
      }`}
    >
      <span
        aria-hidden
        className={`h-1 w-1 rounded-full ${
          isApproved ? "bg-emerald-400" : "bg-slate-400"
        }`}
      />
      {status.toLowerCase()}
    </span>
  );
}

function IncidentSeverityPill({
  severity,
  status,
}: {
  severity: string;
  status: string;
}) {
  const tones: Record<string, string> = {
    critical: "bg-rose-500/[0.10] text-rose-300 ring-rose-500/25",
    high: "bg-orange-500/[0.10] text-orange-300 ring-orange-500/25",
    medium: "bg-amber-500/[0.10] text-amber-300 ring-amber-500/25",
    low: "bg-slate-500/[0.08] text-slate-400 ring-slate-500/20",
  };
  const t = tones[severity] ?? tones.low;
  const isResolved = status === "resolved" || status === "closed";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-medium ring-1 ring-inset ${t} ${isResolved ? "opacity-60" : ""}`}
    >
      {severity}
    </span>
  );
}

function TradeOpStatusPill({
  status,
  riskScore,
}: {
  status: string;
  riskScore: number | null;
}) {
  const riskTone =
    riskScore !== null && riskScore >= 70
      ? "bg-rose-500/[0.10] text-rose-300 ring-rose-500/25"
      : riskScore !== null && riskScore >= 40
        ? "bg-amber-500/[0.10] text-amber-300 ring-amber-500/25"
        : "bg-emerald-500/[0.08] text-emerald-300 ring-emerald-500/20";
  return (
    <span className="inline-flex items-center gap-1.5">
      {riskScore !== null ? (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold tabular-nums ring-1 ring-inset ${riskTone}`}
          title={`Risk score ${riskScore}/100`}
        >
          {riskScore}
        </span>
      ) : null}
      <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10.5px] font-medium text-slate-400 ring-1 ring-inset ring-white/[0.06]">
        {status.toLowerCase().replace(/_/g, " ")}
      </span>
    </span>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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
