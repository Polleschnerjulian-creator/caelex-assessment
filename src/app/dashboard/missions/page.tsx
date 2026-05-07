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
    "Mission portfolio: programs, customers, spacecraft assignments, and the regulatory phase roadmap that wraps each one.",
};

export const dynamic = "force-dynamic";

/**
 * Missions list — the V2 mission-first landing.
 *
 * Sprint Mission-3 refactor: missions are now first-class entities
 * (vs the old Spacecraft=Mission collapse). The list groups by
 * status (Active / Planned / Completed-or-Cancelled) and surfaces
 * mission-level metadata: missionType, programPhase, primaryEndUser,
 * spacecraft count. Each card links to the mission detail.
 */
export default async function MissionsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/missions");
  }
  const ui = await resolveComplyUiVersion();
  if (ui === "v1") redirect("/dashboard");

  const missions = await getMissionsForUser(session.user.id);

  const active = missions.filter((m) => m.status === "ACTIVE");
  const planned = missions.filter((m) => m.status === "PLANNED");
  const archived = missions.filter(
    (m) => m.status === "COMPLETED" || m.status === "CANCELLED",
  );
  const paused = missions.filter((m) => m.status === "PAUSED");

  const sansFont =
    'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';
  const displayFont =
    'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';

  return (
    <div
      className="mx-auto max-w-screen-2xl px-8 py-8"
      style={{ fontFamily: sansFont }}
    >
      <header
        className="mb-8 flex items-end justify-between gap-6 pb-5"
        style={{ borderBottom: "0.5px solid rgba(255, 255, 255, 0.08)" }}
      >
        <div className="min-w-0">
          <h1
            className="text-[28px] font-semibold text-white"
            style={{
              fontFamily: displayFont,
              letterSpacing: "-0.022em",
              lineHeight: 1.15,
            }}
          >
            Missions
          </h1>
          <p
            className="mt-1.5 max-w-2xl text-[14px]"
            style={{
              color: "rgba(255, 255, 255, 0.55)",
              letterSpacing: "-0.005em",
            }}
          >
            Each mission groups one or more spacecraft serving the same program
            — constellations, single satellites, launch campaigns, or
            multi-mission hardware. Click any card to drill into its phase
            roadmap, customers, and regulatory references.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-5">
          <Stat label="Active" value={active.length} />
          <Stat label="Planned" value={planned.length} />
          <Stat label="Total" value={missions.length} />
          <Link
            href="/dashboard/missions/new"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors"
            style={{
              background: "rgba(255, 255, 255, 0.92)",
              color: "rgb(20, 20, 22)",
              letterSpacing: "-0.005em",
            }}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
            New mission
          </Link>
        </div>
      </header>

      {missions.length === 0 ? (
        <EmptyState />
      ) : (
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
      className="group flex flex-col gap-3 rounded-xl p-4 transition-colors duration-150"
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        boxShadow:
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.05), 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
        letterSpacing: "-0.005em",
      }}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className="truncate text-[14px] font-semibold text-white"
            style={{ letterSpacing: "-0.011em" }}
          >
            {mission.name}
          </h3>
          <div
            className="mt-0.5 flex items-center gap-1.5 text-[11px]"
            style={{ color: "rgba(255, 255, 255, 0.45)" }}
          >
            {mission.reference ? (
              <span className="truncate font-mono">{mission.reference}</span>
            ) : (
              <span>No reference</span>
            )}
            <span aria-hidden>·</span>
            <span>{phaseLabel(mission.programPhase)}</span>
          </div>
        </div>
        <StatusPill status={mission.status} />
      </header>

      {/* Mission characteristics */}
      <ul
        className="flex flex-wrap gap-x-3 gap-y-1 text-[11.5px]"
        style={{ color: "rgba(255, 255, 255, 0.55)" }}
      >
        <li className="inline-flex items-center gap-1.5">
          <Satellite
            className="h-3.5 w-3.5"
            strokeWidth={1.75}
            style={{ color: "rgba(255, 255, 255, 0.4)" }}
          />
          <span>{missionTypeLabel(mission.missionType)}</span>
        </li>
        <li className="inline-flex items-center gap-1.5">
          <Layers
            className="h-3.5 w-3.5"
            strokeWidth={1.75}
            style={{ color: "rgba(255, 255, 255, 0.4)" }}
          />
          <span>
            {mission.spacecraftCount} spacecraft
            {mission.spacecraftCount === 1 ? "" : "s"}
          </span>
        </li>
        {mission.primaryEndUser ? (
          <li className="inline-flex max-w-[180px] items-center gap-1.5">
            <Users
              className="h-3.5 w-3.5 shrink-0"
              strokeWidth={1.75}
              style={{ color: "rgba(255, 255, 255, 0.4)" }}
            />
            <span className="truncate">{mission.primaryEndUser}</span>
          </li>
        ) : null}
        {mission.startedAt ? (
          <li className="inline-flex items-center gap-1.5">
            <Calendar
              className="h-3.5 w-3.5"
              strokeWidth={1.75}
              style={{ color: "rgba(255, 255, 255, 0.4)" }}
            />
            <time dateTime={mission.startedAt.toISOString()}>
              Started {mission.startedAt.toISOString().slice(0, 10)}
            </time>
          </li>
        ) : mission.plannedStartAt ? (
          <li className="inline-flex items-center gap-1.5">
            <Calendar
              className="h-3.5 w-3.5"
              strokeWidth={1.75}
              style={{ color: "rgba(255, 255, 255, 0.4)" }}
            />
            <time dateTime={mission.plannedStartAt.toISOString()}>
              Planned {mission.plannedStartAt.toISOString().slice(0, 10)}
            </time>
          </li>
        ) : null}
      </ul>

      {/* Primary spacecraft strip */}
      {mission.primarySpacecraft ? (
        <div
          className="flex items-center justify-between gap-2 rounded-lg px-3 py-2"
          style={{
            background: "rgba(255, 255, 255, 0.04)",
          }}
        >
          <div className="min-w-0 leading-tight">
            <div
              className="truncate text-[12px] font-medium"
              style={{ color: "rgba(255, 255, 255, 0.92)" }}
            >
              {mission.primarySpacecraft.spacecraftName}
            </div>
            <div
              className="mt-0.5 flex items-center gap-1.5 text-[10.5px]"
              style={{ color: "rgba(255, 255, 255, 0.5)" }}
            >
              <Globe
                className="h-3 w-3"
                strokeWidth={1.75}
                style={{ color: "rgba(255, 255, 255, 0.4)" }}
              />
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
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums"
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                color: "rgba(255, 255, 255, 0.65)",
              }}
            >
              +{mission.spacecraftCount - 1}
            </span>
          ) : null}
        </div>
      ) : (
        <div
          className="rounded-lg px-3 py-2 text-[11.5px]"
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            color: "rgba(255, 255, 255, 0.4)",
          }}
        >
          No spacecraft assigned yet — assign one from the detail page.
        </div>
      )}

      {/* Phase roadmap progress */}
      <div
        className="mt-1 pt-3"
        style={{ borderTop: "0.5px solid rgba(255, 255, 255, 0.06)" }}
      >
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span
            className="inline-flex items-center gap-1.5 text-[11.5px]"
            style={{ color: "rgba(255, 255, 255, 0.55)" }}
          >
            <ListChecks
              className="h-3.5 w-3.5"
              strokeWidth={1.75}
              style={{ color: "rgba(255, 255, 255, 0.4)" }}
            />
            {mission.phaseCount} phase{mission.phaseCount === 1 ? "" : "s"}
          </span>
          <span
            className="text-[12px] font-medium tabular-nums"
            style={{ color: "rgba(255, 255, 255, 0.85)" }}
          >
            {mission.roadmapProgressPct}%
          </span>
        </div>

        {mission.activePhase ? (
          <>
            <div className="mb-2">
              <p
                className="text-[12.5px] font-medium"
                style={{
                  color: "rgba(255, 255, 255, 0.92)",
                  letterSpacing: "-0.005em",
                }}
              >
                {mission.activePhase.name}
              </p>
              <p
                className="text-[11px]"
                style={{ color: "rgba(255, 255, 255, 0.45)" }}
              >
                {mission.activePhase.status.replace(/_/g, " ").toLowerCase()} ·{" "}
                {mission.activePhase.progress}%
              </p>
            </div>
            <ProgressBar value={mission.activePhase.progress} />
          </>
        ) : (
          <p
            className="text-[11.5px]"
            style={{ color: "rgba(255, 255, 255, 0.35)" }}
          >
            No phases yet
          </p>
        )}
      </div>

      <footer
        className="mt-1 flex items-center justify-between pt-3 text-[11.5px]"
        style={{ borderTop: "0.5px solid rgba(255, 255, 255, 0.04)" }}
      >
        <span style={{ color: "rgba(255, 255, 255, 0.4)" }}>View detail</span>
        <span
          className="inline-flex items-center gap-1 transition-transform group-hover:translate-x-0.5"
          style={{ color: "rgba(255, 255, 255, 0.7)" }}
        >
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span
        style={{
          color: "rgba(255, 255, 255, 0.45)",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        className="text-[20px] font-semibold tabular-nums text-white"
        style={{ letterSpacing: "-0.018em" }}
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
