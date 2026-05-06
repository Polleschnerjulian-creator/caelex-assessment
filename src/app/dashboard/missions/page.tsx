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
 * Sprint 5A: list view + V2Sidebar entry.
 * Sprint 5B: per-mission detail page (`/dashboard/missions/[id]`)
 *           — cards link there.
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
            Each spacecraft is one mission. Click any card to drill into its
            phase roadmap and milestones.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-5">
          <Stat label="Linked" value={linked.length} />
          <Stat label="Unlinked" value={unlinked.length} />
        </div>
      </header>

      {missions.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {linked.length > 0 ? (
            <section className="mb-10">
              <h2
                className="mb-3 px-0.5"
                style={{
                  color: "rgba(255, 255, 255, 0.45)",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
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
              <h2
                className="mb-3 px-0.5"
                style={{
                  color: "rgba(255, 255, 255, 0.45)",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Unlinked phases
              </h2>
              <p
                className="mb-3 text-[13px]"
                style={{ color: "rgba(255, 255, 255, 0.45)" }}
              >
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
            {mission.cosparId ? (
              <span>{mission.cosparId}</span>
            ) : mission.linked ? (
              <span>No COSPAR yet</span>
            ) : (
              <span>Unlinked</span>
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
      <ul
        className="flex flex-wrap gap-x-3 gap-y-1 text-[11.5px]"
        style={{ color: "rgba(255, 255, 255, 0.55)" }}
      >
        {mission.missionType ? (
          <li className="inline-flex items-center gap-1.5">
            <Satellite
              className="h-3.5 w-3.5"
              strokeWidth={1.75}
              style={{ color: "rgba(255, 255, 255, 0.4)" }}
            />
            <span className="capitalize">
              {mission.missionType.replace(/_/g, " ")}
            </span>
          </li>
        ) : null}
        {mission.orbitType ? (
          <li className="inline-flex items-center gap-1.5">
            <Globe
              className="h-3.5 w-3.5"
              strokeWidth={1.75}
              style={{ color: "rgba(255, 255, 255, 0.4)" }}
            />
            <span>
              {mission.orbitType}
              {mission.altitudeKm
                ? ` · ${Math.round(mission.altitudeKm)} km`
                : ""}
            </span>
          </li>
        ) : null}
        {mission.launchDate ? (
          <li className="inline-flex items-center gap-1.5">
            <Calendar
              className="h-3.5 w-3.5"
              strokeWidth={1.75}
              style={{ color: "rgba(255, 255, 255, 0.4)" }}
            />
            <time dateTime={mission.launchDate.toISOString()}>
              {mission.launchDate.toISOString().slice(0, 10)}
            </time>
          </li>
        ) : null}
      </ul>

      {/* Active phase + progress */}
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
        <span style={{ color: "rgba(255, 255, 255, 0.4)" }}>View roadmap</span>
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

function StatusPill({
  status,
}: {
  status: NonNullable<MissionSummary["status"]>;
}) {
  // Apple HIG: status indicators use a colored DOT + neutral label,
  // not a fully-tinted pill. Drops the loud emerald/cyan backgrounds
  // for a subtle dot color + monochrome white text.
  const dotColor =
    status === "OPERATIONAL"
      ? "rgba(255, 255, 255, 0.85)" // operational = neutral bright
      : status === "LAUNCHED"
        ? "var(--ios-teal)"
        : status === "PRE_LAUNCH"
          ? "var(--ios-orange)"
          : status === "DECOMMISSIONING"
            ? "var(--ios-red)"
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
      {status.replace(/_/g, " ").toLowerCase()}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  // Single neutral fill — no green/amber tone-shifting. Apple's
  // progress bars are always white/system-tint regardless of value;
  // the value itself communicates the state.
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
        Add a spacecraft from the registration module or import a CelesTrak TLE.
        Each spacecraft becomes one mission with its own phase roadmap.
      </p>
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/modules/registration"
          className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium text-white transition-colors"
          style={{
            background: "rgba(255, 255, 255, 0.92)",
            color: "rgb(20, 20, 22)",
            letterSpacing: "-0.005em",
          }}
        >
          Register spacecraft
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
        </Link>
        <Link
          href="/dashboard/ephemeris"
          className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors"
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            color: "rgba(255, 255, 255, 0.85)",
            letterSpacing: "-0.005em",
          }}
        >
          Import TLE
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
        </Link>
      </div>
    </div>
  );
}
