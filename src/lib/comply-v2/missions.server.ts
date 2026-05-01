import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Comply v2 Missions — Sprint 5A
 *
 * Mission-First UI data layer. The V2 dashboard's primary lens is
 * the **mission**: each operator's spacecraft + the regulatory phase
 * roadmap that wraps it. Sprint 5A delivers the list view; 5B adds
 * the per-mission detail with phase Gantt; 5C wires astra/workflow
 * cross-links.
 *
 * # Data shape decision
 *
 * Rather than introducing a new top-level `Mission` model (and the
 * migration + ownership question that brings), we treat the existing
 * **Spacecraft** record as the canonical mission identity. Reasons:
 *
 *   1. `Spacecraft` is already org-scoped, status-tracked, and
 *      cross-referenced from registrations / hazards / debris.
 *   2. `MissionPhase.missionId` is a string — we adopt the convention
 *      that it equals the Spacecraft's `id`. Existing phases that
 *      don't match are surfaced as **unlinked** missions so nothing
 *      gets hidden.
 *   3. Zero schema change → no migration → no V1 risk.
 *
 * If a future sprint demands a real Mission entity (multi-spacecraft
 * constellations as a single mission, etc.), promotion is a follow-up
 * additive migration. Today's shape is good enough for the list view.
 *
 * # Org resolution
 *
 * V1 still mixes per-user and per-org data. We follow the V1
 * convention: a user's "primary org" is their **earliest joined**
 * `OrganizationMember` row. Same lookup as `comply-ui-version.server.ts`,
 * `pharos/oversight`, `v1/hub/members`. If the user has no
 * memberships we return an empty mission list (the page renders the
 * empty state — no error).
 *
 * # No new caching
 *
 * Pure projection over Spacecraft + MissionPhase. The V2 posture
 * surface materialises a daily snapshot for trends; missions don't
 * yet need that. If list-page traffic ever grows, a simple
 * `react`-cache wrapper or a per-org snapshot table is the next step.
 */

import type { SpacecraftStatus, PhaseStatus } from "@prisma/client";

export interface MissionPhaseSummary {
  id: string;
  name: string;
  status: PhaseStatus;
  progress: number; // 0-100
  startDate: Date;
  endDate: Date;
}

export interface MissionSummary {
  /** Canonical mission identity. Either `Spacecraft.id` (linked) or
   *  the raw `MissionPhase.missionId` string (unlinked / planning-only). */
  id: string;
  /** Display name. From Spacecraft.name when linked, else the first
   *  non-null missionName found across phases. */
  name: string;
  /** True when the mission has a backing Spacecraft row. */
  linked: boolean;
  /** Spacecraft fields — only populated when `linked === true`. */
  status: SpacecraftStatus | null;
  missionType: string | null;
  orbitType: string | null;
  altitudeKm: number | null;
  launchDate: Date | null;
  cosparId: string | null;
  noradId: string | null;
  /** Phase-roadmap derivatives. */
  phaseCount: number;
  /** Currently in-progress phase, if any. Else the next planned. Else null. */
  activePhase: MissionPhaseSummary | null;
  /** Average of phase.progress weighted by phase count (rough roadmap %). */
  roadmapProgressPct: number;
}

/**
 * Build the full mission summary list for a user. Two parallel
 * fetches (org Spacecrafts, user MissionPhases), joined in-memory.
 *
 * Result is sorted: linked missions first (by status priority then
 * launchDate desc), then unlinked at the bottom.
 */
export async function getMissionsForUser(
  userId: string,
): Promise<MissionSummary[]> {
  // Resolve primary org. If none, no spacecraft fetch needed — but
  // we still surface unlinked phases (a user can have planning data
  // without an org seat — rare but possible during onboarding).
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      organizationMemberships: {
        take: 1,
        orderBy: { joinedAt: "asc" },
        select: { organizationId: true },
      },
    },
  });
  const orgId = user?.organizationMemberships[0]?.organizationId ?? null;

  const [spacecrafts, phases] = await Promise.all([
    orgId
      ? prisma.spacecraft.findMany({
          where: { organizationId: orgId },
          select: {
            id: true,
            name: true,
            status: true,
            missionType: true,
            orbitType: true,
            altitudeKm: true,
            launchDate: true,
            cosparId: true,
            noradId: true,
          },
          orderBy: { createdAt: "desc" },
          take: 200,
        })
      : Promise.resolve(
          [] as Array<{
            id: string;
            name: string;
            status: SpacecraftStatus;
            missionType: string;
            orbitType: string;
            altitudeKm: number | null;
            launchDate: Date | null;
            cosparId: string | null;
            noradId: string | null;
          }>,
        ),
    prisma.missionPhase.findMany({
      where: { userId },
      select: {
        id: true,
        missionId: true,
        missionName: true,
        name: true,
        status: true,
        progress: true,
        startDate: true,
        endDate: true,
      },
      orderBy: { startDate: "asc" },
      take: 1000,
    }),
  ]);

  // Group phases by missionId — the join key.
  const phasesByMission = new Map<string, typeof phases>();
  for (const phase of phases) {
    const list = phasesByMission.get(phase.missionId) ?? [];
    list.push(phase);
    phasesByMission.set(phase.missionId, list);
  }

  const linkedMissions: MissionSummary[] = spacecrafts.map((sc) => {
    const ps = phasesByMission.get(sc.id) ?? [];
    phasesByMission.delete(sc.id); // mark as consumed
    return {
      id: sc.id,
      name: sc.name,
      linked: true,
      status: sc.status,
      missionType: sc.missionType,
      orbitType: sc.orbitType,
      altitudeKm: sc.altitudeKm,
      launchDate: sc.launchDate,
      cosparId: sc.cosparId,
      noradId: sc.noradId,
      phaseCount: ps.length,
      activePhase: pickActivePhase(ps),
      roadmapProgressPct: avgProgress(ps),
    };
  });

  // Anything still in the map is an unlinked mission — phases
  // referencing a missionId that has no Spacecraft. Surface them so
  // operators don't lose track of legacy planning data.
  const unlinkedMissions: MissionSummary[] = [];
  for (const [missionId, ps] of phasesByMission.entries()) {
    const firstNamed = ps.find((p) => p.missionName);
    unlinkedMissions.push({
      id: missionId,
      name: firstNamed?.missionName ?? "Unlinked mission",
      linked: false,
      status: null,
      missionType: null,
      orbitType: null,
      altitudeKm: null,
      launchDate: null,
      cosparId: null,
      noradId: null,
      phaseCount: ps.length,
      activePhase: pickActivePhase(ps),
      roadmapProgressPct: avgProgress(ps),
    });
  }

  return [
    ...linkedMissions.sort(byStatusThenLaunch),
    ...unlinkedMissions.sort((a, b) => a.name.localeCompare(b.name)),
  ];
}

// ─── Internals ─────────────────────────────────────────────────────────────

/** Pick the most relevant phase to surface on the mission card.
 *  Priority: in-progress → next planned (earliest startDate >= today)
 *  → most recent completed → null. */
function pickActivePhase(
  phases: Array<{
    id: string;
    name: string;
    status: PhaseStatus;
    progress: number;
    startDate: Date;
    endDate: Date;
  }>,
): MissionPhaseSummary | null {
  if (phases.length === 0) return null;
  const now = Date.now();
  const inProgress = phases.find((p) => p.status === "IN_PROGRESS");
  if (inProgress) return toSummary(inProgress);
  const nextPlanned = phases
    .filter((p) => p.status === "PLANNED" && p.startDate.getTime() >= now)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0];
  if (nextPlanned) return toSummary(nextPlanned);
  const lastCompleted = phases
    .filter((p) => p.status === "COMPLETED")
    .sort((a, b) => b.endDate.getTime() - a.endDate.getTime())[0];
  if (lastCompleted) return toSummary(lastCompleted);
  return toSummary(phases[0]);
}

function toSummary(p: {
  id: string;
  name: string;
  status: PhaseStatus;
  progress: number;
  startDate: Date;
  endDate: Date;
}): MissionPhaseSummary {
  return {
    id: p.id,
    name: p.name,
    status: p.status,
    progress: p.progress,
    startDate: p.startDate,
    endDate: p.endDate,
  };
}

function avgProgress(phases: Array<{ progress: number }>): number {
  if (phases.length === 0) return 0;
  const sum = phases.reduce((acc, p) => acc + (p.progress ?? 0), 0);
  return Math.round(sum / phases.length);
}

/** Sort linked missions by operational priority: OPERATIONAL → LAUNCHED →
 *  PRE_LAUNCH → DECOMMISSIONING → DEORBITED → LOST.  Ties broken by
 *  launchDate desc (newer first). */
const STATUS_PRIORITY: Record<SpacecraftStatus, number> = {
  OPERATIONAL: 0,
  LAUNCHED: 1,
  PRE_LAUNCH: 2,
  DECOMMISSIONING: 3,
  DEORBITED: 4,
  LOST: 5,
};

function byStatusThenLaunch(a: MissionSummary, b: MissionSummary): number {
  const aP = a.status ? STATUS_PRIORITY[a.status] : 99;
  const bP = b.status ? STATUS_PRIORITY[b.status] : 99;
  if (aP !== bP) return aP - bP;
  const aT = a.launchDate?.getTime() ?? 0;
  const bT = b.launchDate?.getTime() ?? 0;
  return bT - aT;
}
