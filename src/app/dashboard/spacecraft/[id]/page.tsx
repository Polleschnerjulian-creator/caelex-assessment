import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  Satellite,
  ArrowLeft,
  Calendar,
  Globe,
  Activity,
  AlertTriangle,
  ExternalLink,
  Info,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import { prisma } from "@/lib/prisma";
import {
  PageContainer,
  PageHeader,
  StatusPill,
} from "@/components/dashboard/v2/ui/PageChrome";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Spacecraft — Caelex Comply",
  description:
    "Per-spacecraft compliance state, mission assignments, orbital parameters, and debris-mitigation status.",
};

/**
 * Sprint UF33 (P0-D) — Spacecraft Detail Page.
 *
 * Audit finding P0-D: clicking a spacecraft name in the mission-detail
 * table did nothing — there was no per-hardware drill-down. For
 * operators with constellations (12+ sats), this is critical: TLE
 * history, compliance state, decommissioning plan all live per
 * spacecraft, not per mission.
 *
 * Renders:
 *   1. Header — name, COSPAR, NORAD, status pill
 *   2. FactsCard — orbital params (orbit type, altitude, inclination,
 *      launchDate, endOfLife)
 *   3. MissionsCard — current + past mission assignments with
 *      time-bounds and roles. Each row links to mission detail.
 *   4. ComplianceCard — debris assessments (the only V2-mapped
 *      compliance entity scoped per-spacecraft today). Future
 *      enhancement: TLE history, conjunction alerts, fuel state.
 *
 * Security: spacecraft is org-scoped via the Spacecraft.organizationId
 * relation. We resolve the user's primary org and refuse to show a
 * spacecraft that doesn't belong to it (404 — not 403, to avoid
 * leaking existence of resources across orgs).
 */
export default async function SpacecraftDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard");
  }
  const ui = await resolveComplyUiVersion();
  if (ui === "v1") redirect("/dashboard");

  const { id } = await params;

  // Resolve primary org for this user. Mirror the pattern used by
  // missions.server.ts so the access check is consistent with the
  // Mission-Detail page.
  const member = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { joinedAt: "asc" },
    select: { organizationId: true },
  });
  if (!member) {
    notFound();
  }

  const spacecraft = await prisma.spacecraft.findFirst({
    where: { id, organizationId: member.organizationId },
    include: {
      // Both active + past assignments. Mission domain is M:N via
      // MissionSpacecraft with time-bounds.
      missionAssignments: {
        include: {
          mission: {
            select: {
              id: true,
              name: true,
              reference: true,
              status: true,
              missionType: true,
              programPhase: true,
            },
          },
        },
        orderBy: { startedAt: "desc" },
      },
      // Debris assessments — link via spacecraftId. The actual
      // schema columns are complianceScore (Int), orbitType,
      // constellationTier, planGenerated, deorbitStrategy.
      debrisAssessments: {
        select: {
          id: true,
          missionName: true,
          orbitType: true,
          deorbitStrategy: true,
          complianceScore: true,
          planGenerated: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      },
    },
  });

  if (!spacecraft) {
    notFound();
  }

  const activeAssignments = spacecraft.missionAssignments.filter(
    (a) => a.endedAt === null,
  );
  const pastAssignments = spacecraft.missionAssignments.filter(
    (a) => a.endedAt !== null,
  );

  const statusTone = STATUS_TONE[spacecraft.status] ?? "slate";

  return (
    <PageContainer>
      {/* Breadcrumb back to either the active mission or missions list */}
      <nav
        className="mb-3 flex items-center gap-2 text-[11.5px] text-slate-400"
        aria-label="Breadcrumb"
      >
        <Link
          href="/dashboard/missions"
          className="inline-flex items-center gap-1 transition hover:text-slate-200"
        >
          <ArrowLeft className="h-3 w-3" />
          Missions
        </Link>
        {activeAssignments[0]?.mission ? (
          <>
            <span aria-hidden className="text-slate-600">
              ›
            </span>
            <Link
              href={`/dashboard/missions/${activeAssignments[0].mission.id}`}
              className="transition hover:text-slate-200"
            >
              {activeAssignments[0].mission.name}
            </Link>
            <span aria-hidden className="text-slate-600">
              ›
            </span>
          </>
        ) : null}
        <span className="text-slate-300">{spacecraft.name}</span>
      </nav>

      <PageHeader
        eyebrow="Spacecraft"
        eyebrowIcon={Satellite}
        title={spacecraft.name}
        description={
          <>
            {spacecraft.missionType.replace(/_/g, " ")} ·{" "}
            <span className="font-mono text-slate-400">
              {[spacecraft.cosparId, spacecraft.noradId]
                .filter(Boolean)
                .join(" · ") || "no public identifiers yet"}
            </span>
          </>
        }
        actions={
          <StatusPill tone={statusTone}>
            {spacecraft.status.replace(/_/g, " ").toLowerCase()}
          </StatusPill>
        }
      />

      {/* ─── Orbital + status facts ────────────────────────────────────── */}
      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Orbit type" icon={Globe} value={spacecraft.orbitType} />
        <Stat
          label="Altitude"
          icon={Activity}
          value={
            spacecraft.altitudeKm !== null
              ? `${Math.round(spacecraft.altitudeKm)} km`
              : "—"
          }
        />
        <Stat
          label="Inclination"
          icon={Activity}
          value={
            spacecraft.inclinationDeg !== null
              ? `${spacecraft.inclinationDeg.toFixed(2)}°`
              : "—"
          }
        />
        <Stat
          label="Launch date"
          icon={Calendar}
          value={
            spacecraft.launchDate
              ? spacecraft.launchDate.toISOString().slice(0, 10)
              : spacecraft.status === "PRE_LAUNCH"
                ? "Pre-launch"
                : "—"
          }
        />
      </section>

      {/* ─── Mission assignments ───────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Mission assignments
        </h2>

        {activeAssignments.length === 0 && pastAssignments.length === 0 ? (
          <div className="rounded-xl border border-white/[0.05] bg-white/[0.012] p-6">
            <p className="text-[12.5px] text-slate-400">
              This spacecraft has no mission assignments yet. Assign it to a
              mission from the{" "}
              <Link
                href="/dashboard/missions"
                className="text-emerald-300 underline-offset-2 hover:underline"
              >
                missions page
              </Link>
              .
            </p>
          </div>
        ) : (
          <div
            className="overflow-hidden rounded-xl"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              boxShadow:
                "inset 0 1px 0 0 rgba(255, 255, 255, 0.06), 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
            }}
          >
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-white/[0.05] text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                  <th className="px-4 py-2.5 text-left">Mission</th>
                  <th className="px-4 py-2.5 text-left">Role</th>
                  <th className="px-4 py-2.5 text-left">Slot</th>
                  <th className="px-4 py-2.5 text-left">Started</th>
                  <th className="px-4 py-2.5 text-left">Ended</th>
                </tr>
              </thead>
              <tbody>
                {[...activeAssignments, ...pastAssignments].map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-white/[0.04] transition last:border-b-0 hover:bg-white/[0.015]"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/dashboard/missions/${a.mission.id}`}
                        className="inline-flex items-center gap-1.5 font-medium text-slate-100 transition hover:text-emerald-300"
                      >
                        {a.mission.name}
                        <ExternalLink
                          className="h-3 w-3 text-slate-600"
                          strokeWidth={2}
                        />
                      </Link>
                      {a.mission.reference ? (
                        <div className="mt-0.5 font-mono text-[10.5px] text-slate-500">
                          {a.mission.reference}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[11px] text-slate-300 ring-1 ring-inset ring-white/[0.06]">
                        {a.role.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-400">
                      {a.constellationSlot ?? (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-400">
                      {a.startedAt.toISOString().slice(0, 10)}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-400">
                      {a.endedAt ? (
                        a.endedAt.toISOString().slice(0, 10)
                      ) : (
                        <span className="text-emerald-300">active</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ─── Compliance state — debris assessments (per-spacecraft) ───── */}
      <section className="mb-8">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Compliance state — debris mitigation
        </h2>

        {spacecraft.debrisAssessments.length === 0 ? (
          <div className="rounded-xl border border-white/[0.05] bg-white/[0.012] p-6">
            <p className="text-[12.5px] text-slate-400">
              No debris-mitigation assessments yet for this spacecraft.{" "}
              <Link
                href="/dashboard/modules/debris"
                className="text-emerald-300 underline-offset-2 hover:underline"
              >
                Run an assessment
              </Link>{" "}
              to populate IADC + ISO 24113 + Art. 67 status.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {spacecraft.debrisAssessments.map((d) => {
              const score = d.complianceScore;
              const scoreColor =
                score === null
                  ? "text-slate-500"
                  : score >= 80
                    ? "text-emerald-300"
                    : score >= 50
                      ? "text-amber-300"
                      : "text-rose-300";
              return (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-3 rounded-lg p-3"
                  style={{
                    background: "rgba(255, 255, 255, 0.025)",
                    boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.05)",
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-medium text-slate-100">
                      {d.missionName ?? "Debris assessment"}
                      <span className="ml-2 font-mono text-[10.5px] text-slate-500">
                        {d.orbitType}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[10.5px] text-slate-500">
                      Updated {d.updatedAt.toISOString().slice(0, 10)}
                      {" · Score: "}
                      <span className={`font-semibold ${scoreColor}`}>
                        {score !== null ? `${score}%` : "—"}
                      </span>
                      {" · Strategy: "}
                      <span className="text-slate-300">
                        {d.deorbitStrategy.replace(/_/g, " ").toLowerCase()}
                      </span>
                      {d.planGenerated ? (
                        <span className="ml-1.5 text-emerald-300/70">
                          · plan generated
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <Link
                    href="/dashboard/modules/debris"
                    className="text-[11px] font-medium text-emerald-300 transition hover:text-emerald-200"
                  >
                    Open →
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Sprint UF33 — Roadmap hint for the per-spacecraft surfaces
          we don't yet render (Decommissioning workflow per audit
          P1-M6, TLE-history per ephemeris, fuel-state, conjunction
          alerts). Honest disclosure: tells the operator what's
          coming so they don't think the page is buggy. */}
      <section className="rounded-xl border border-white/[0.05] bg-white/[0.012] p-4">
        <div className="flex items-start gap-2.5">
          <Info
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500"
            strokeWidth={2}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              Roadmap
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-slate-500">
              TLE history, conjunction-alert log, fuel state, and a dedicated
              decommissioning workflow ship in follow-up sprints. Today this
              page shows mission assignments + debris assessments — the
              per-hardware compliance data already in the schema.
            </p>
          </div>
        </div>
      </section>
    </PageContainer>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────

function Stat({
  label,
  icon: Icon,
  value,
}: {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  value: string;
}) {
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        boxShadow:
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.05), 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          {label}
        </span>
        <Icon className="h-3 w-3 text-slate-600" strokeWidth={2} />
      </div>
      <p className="mt-1 text-[15px] font-semibold tabular-nums text-slate-100">
        {value}
      </p>
    </div>
  );
}

const STATUS_TONE: Record<string, "emerald" | "amber" | "rose" | "slate"> = {
  PRE_LAUNCH: "amber",
  LAUNCHED: "emerald",
  OPERATIONAL: "emerald",
  DECOMMISSIONING: "amber",
  DEORBITED: "slate",
  LOST: "rose",
};
