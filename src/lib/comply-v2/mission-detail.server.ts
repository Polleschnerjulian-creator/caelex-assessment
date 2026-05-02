import "server-only";
import { prisma } from "@/lib/prisma";
import type {
  SpacecraftStatus,
  PhaseStatus,
  MilestoneStatus,
} from "@prisma/client";

/**
 * Comply v2 Mission Detail — Sprint 5B
 *
 * Reads everything needed to render `/dashboard/missions/[id]`:
 * spacecraft summary + ordered phases + milestones per phase.
 *
 * # Auth surface
 *
 * The detail page must protect against cross-org spacecraft leakage.
 * `getMissionDetail` requires both userId and missionId, then verifies
 * one of two access conditions:
 *
 *   1. **Linked path** — a `Spacecraft` with `id = missionId` exists
 *      AND its `organizationId` matches the user's primary org. We
 *      then read MissionPhases scoped to the user (legacy per-user
 *      data — same scoping as the list view).
 *   2. **Unlinked path** — no Spacecraft matches; the missionId is a
 *      legacy planning identifier. We require at least one
 *      MissionPhase with that `missionId` to belong to the user. If
 *      none, return `null` (404).
 *
 * Returning `null` consistently for both "not found" and "wrong
 * tenant" prevents id-enumeration attacks.
 */

export interface MissionMilestone {
  id: string;
  name: string;
  description: string | null;
  targetDate: Date;
  completedDate: Date | null;
  status: MilestoneStatus;
  isCritical: boolean;
  isRegulatory: boolean;
  regulatoryRef: string | null;
  icon: string | null;
}

export interface MissionPhaseDetail {
  id: string;
  name: string;
  description: string | null;
  status: PhaseStatus;
  progress: number;
  startDate: Date;
  endDate: Date;
  color: string | null;
  dependsOn: string[];
  milestones: MissionMilestone[];
}

export interface MissionDetail {
  id: string;
  name: string;
  linked: boolean;
  // Spacecraft fields — null on unlinked missions.
  status: SpacecraftStatus | null;
  missionType: string | null;
  orbitType: string | null;
  altitudeKm: number | null;
  inclinationDeg: number | null;
  cosparId: string | null;
  noradId: string | null;
  launchDate: Date | null;
  endOfLifeDate: Date | null;
  description: string | null;
  // Phase + milestone roadmap.
  phases: MissionPhaseDetail[];
  /** Mean of phase progress, rounded. 0 when no phases. */
  roadmapProgressPct: number;
  /** Count of milestones across all phases. */
  totalMilestones: number;
  /** Count of regulatory-tagged milestones. */
  regulatoryMilestones: number;
}

export async function getMissionDetail(
  userId: string,
  missionId: string,
): Promise<MissionDetail | null> {
  // Resolve primary org first — needed for spacecraft tenant check.
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

  // Two-leg fetch in parallel — the spacecraft (filtered by org) and
  // every phase the user owns for this mission.
  const [spacecraft, phases] = await Promise.all([
    orgId
      ? prisma.spacecraft.findUnique({
          where: { id: missionId },
          select: {
            id: true,
            organizationId: true,
            name: true,
            status: true,
            missionType: true,
            orbitType: true,
            altitudeKm: true,
            inclinationDeg: true,
            cosparId: true,
            noradId: true,
            launchDate: true,
            endOfLifeDate: true,
            description: true,
          },
        })
      : Promise.resolve(null),
    prisma.missionPhase.findMany({
      where: { userId, missionId },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        progress: true,
        startDate: true,
        endDate: true,
        color: true,
        dependsOn: true,
        missionName: true,
        milestones: {
          select: {
            id: true,
            name: true,
            description: true,
            targetDate: true,
            completedDate: true,
            status: true,
            isCritical: true,
            isRegulatory: true,
            regulatoryRef: true,
            icon: true,
          },
          orderBy: { targetDate: "asc" },
        },
      },
      orderBy: { startDate: "asc" },
    }),
  ]);

  // Tenant guard: if spacecraft exists but belongs to another org,
  // treat as not-found (no info leak).
  const linked = spacecraft && spacecraft.organizationId === orgId;
  const hasUnlinkedPhases = !linked && phases.length > 0;

  if (!linked && !hasUnlinkedPhases) return null;

  const phaseDetails: MissionPhaseDetail[] = phases.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    status: p.status,
    progress: p.progress,
    startDate: p.startDate,
    endDate: p.endDate,
    color: p.color,
    dependsOn: p.dependsOn,
    milestones: p.milestones.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      targetDate: m.targetDate,
      completedDate: m.completedDate,
      status: m.status,
      isCritical: m.isCritical,
      isRegulatory: m.isRegulatory,
      regulatoryRef: m.regulatoryRef,
      icon: m.icon,
    })),
  }));

  const totalMilestones = phaseDetails.reduce(
    (acc, p) => acc + p.milestones.length,
    0,
  );
  const regulatoryMilestones = phaseDetails.reduce(
    (acc, p) => acc + p.milestones.filter((m) => m.isRegulatory).length,
    0,
  );

  const roadmapProgressPct =
    phaseDetails.length === 0
      ? 0
      : Math.round(
          phaseDetails.reduce((acc, p) => acc + (p.progress ?? 0), 0) /
            phaseDetails.length,
        );

  if (linked) {
    return {
      id: spacecraft.id,
      name: spacecraft.name,
      linked: true,
      status: spacecraft.status,
      missionType: spacecraft.missionType,
      orbitType: spacecraft.orbitType,
      altitudeKm: spacecraft.altitudeKm,
      inclinationDeg: spacecraft.inclinationDeg,
      cosparId: spacecraft.cosparId,
      noradId: spacecraft.noradId,
      launchDate: spacecraft.launchDate,
      endOfLifeDate: spacecraft.endOfLifeDate,
      description: spacecraft.description,
      phases: phaseDetails,
      roadmapProgressPct,
      totalMilestones,
      regulatoryMilestones,
    };
  }

  // Unlinked branch — derive name from first phase that has one.
  const firstNamed = phases.find((p) => p.missionName);
  return {
    id: missionId,
    name: firstNamed?.missionName ?? "Unlinked mission",
    linked: false,
    status: null,
    missionType: null,
    orbitType: null,
    altitudeKm: null,
    inclinationDeg: null,
    cosparId: null,
    noradId: null,
    launchDate: null,
    endOfLifeDate: null,
    description: null,
    phases: phaseDetails,
    roadmapProgressPct,
    totalMilestones,
    regulatoryMilestones,
  };
}
