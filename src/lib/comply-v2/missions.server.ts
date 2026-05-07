import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Comply v2 Missions — Sprint Mission-1/2 (refactor).
 *
 * BEFORE the refactor (Sprint 5A): Spacecraft was treated as the
 * canonical Mission identity (1:1). MissionPhase.missionId pointed at
 * Spacecraft.id by convention. That broke for constellations,
 * launchers (one vehicle, many missions), pre-launch planning, and
 * sequential customers on shared hardware.
 *
 * AFTER the refactor: a real `Mission` model is the source of truth.
 * Spacecraft are linked to Mission via the M:N `MissionSpacecraft`
 * junction with role + time-bounds. `MissionPhase.missionRefId` is
 * the new FK; the legacy `missionId` string column is kept and
 * backfilled by `ensureMissionsForOrg()` so old code keeps working
 * during the migration window.
 *
 * # Auto-migration ("lazy backfill" pattern)
 *
 * On every list-fetch we run `ensureMissionsForOrg(orgId, userId)`.
 * It looks for Spacecraft in this org that have no active
 * MissionSpacecraft assignment, and for each one:
 *
 *   1. Creates a default 1:1 Mission with name = spacecraft.name,
 *      missionType derived from Spacecraft.missionType (string),
 *      status + programPhase derived from Spacecraft.status.
 *   2. Inserts an active MissionSpacecraft row (role="primary").
 *   3. Backfills missionRefId on any MissionPhase rows whose legacy
 *      missionId equals the Spacecraft.id.
 *
 * Idempotent: once every Spacecraft has an assignment, the loop's
 * filter returns nothing and the function is a no-op. Per-org cost
 * amortizes to zero over time.
 *
 * # Org resolution
 *
 * Same convention as the rest of comply-v2: a user's "primary org" is
 * their earliest-joined OrganizationMember row.
 *
 * # Caching
 *
 * No caching today. Listed missions per-org cap at 200; that's a
 * single query plus the migration shim. If list-traffic ever grows,
 * a `react`-cache wrapper or a per-org snapshot is the next step.
 */

import {
  MissionStatus,
  MissionProgramPhase,
  MissionType,
  type SpacecraftStatus,
  type PhaseStatus,
  type MilestoneStatus,
  type Prisma,
} from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────

export interface MissionPhaseSummary {
  id: string;
  name: string;
  status: PhaseStatus;
  progress: number; // 0-100
  startDate: Date;
  endDate: Date;
}

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

export interface MissionPhaseDetail extends MissionPhaseSummary {
  description: string | null;
  color: string | null;
  dependsOn: string[];
  milestones: MissionMilestone[];
}

export interface AssignedSpacecraftSummary {
  assignmentId: string;
  spacecraftId: string;
  spacecraftName: string;
  /** "primary" | "backup" | "constellation_member" | "drone" | "rideshare" | … */
  role: string;
  startedAt: Date;
  endedAt: Date | null;
  constellationSlot: number | null;
  status: SpacecraftStatus;
  cosparId: string | null;
  noradId: string | null;
  orbitType: string;
  altitudeKm: number | null;
}

export interface MissionSummary {
  id: string;
  name: string;
  reference: string | null;
  description: string | null;
  missionType: MissionType;
  programPhase: MissionProgramPhase;
  status: MissionStatus;
  primaryEndUser: string | null;
  primaryEndUserCountryCode: string | null;
  plannedStartAt: Date | null;
  startedAt: Date | null;
  endedAt: Date | null;
  authorityRefs: string[];
  spacecraftCount: number;
  /** First (active) primary spacecraft assignment, if any. Convenient
   *  for list cards that want to surface a representative s/c. */
  primarySpacecraft: AssignedSpacecraftSummary | null;
  /** Phase-roadmap derivatives. */
  phaseCount: number;
  activePhase: MissionPhaseSummary | null;
  roadmapProgressPct: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MissionDetail extends MissionSummary {
  /** All currently-assigned (endedAt=null) spacecraft. */
  assignedSpacecraft: AssignedSpacecraftSummary[];
  /** All historical assignments (endedAt set). */
  pastSpacecraft: AssignedSpacecraftSummary[];
  /** All phases (chronological) with milestones embedded. */
  phases: MissionPhaseDetail[];
  /** Aggregate milestone counts across all phases. */
  totalMilestones: number;
  regulatoryMilestones: number;
}

export interface CreateMissionInput {
  name: string;
  description?: string | null;
  reference?: string | null;
  missionType?: MissionType;
  programPhase?: MissionProgramPhase;
  status?: MissionStatus;
  primaryEndUser?: string | null;
  primaryEndUserCountryCode?: string | null;
  plannedStartAt?: Date | null;
  startedAt?: Date | null;
  endedAt?: Date | null;
  authorityRefs?: string[];
}

export type UpdateMissionInput = Partial<CreateMissionInput>;

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Resolve the user's primary organization id. Returns null if the
 * user has no memberships (rare, only during onboarding or for
 * legacy single-tenant rows).
 */
export async function resolvePrimaryOrgId(
  userId: string,
): Promise<string | null> {
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
  return user?.organizationMemberships[0]?.organizationId ?? null;
}

/**
 * Build the full mission summary list for a user's primary org.
 * Triggers the lazy auto-migration on first call.
 */
export async function getMissionsForUser(
  userId: string,
): Promise<MissionSummary[]> {
  const orgId = await resolvePrimaryOrgId(userId);
  if (!orgId) return [];

  // Auto-migration: bring legacy Spacecraft-only rows under Mission.
  await ensureMissionsForOrg(orgId, userId);

  // Now read the canonical Mission table.
  const missions = await prisma.mission.findMany({
    where: { organizationId: orgId },
    include: {
      spacecraft: {
        where: { endedAt: null },
        include: {
          spacecraft: {
            select: {
              id: true,
              name: true,
              status: true,
              cosparId: true,
              noradId: true,
              orbitType: true,
              altitudeKm: true,
            },
          },
        },
        orderBy: { startedAt: "asc" },
      },
      phases: {
        select: {
          id: true,
          name: true,
          status: true,
          progress: true,
          startDate: true,
          endDate: true,
        },
        orderBy: { startDate: "asc" },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  return missions.map(missionToSummary);
}

/**
 * Detail view of a single mission. Includes full assignment history
 * and all phases.
 */
export async function getMissionDetail(
  userId: string,
  missionId: string,
): Promise<MissionDetail | null> {
  const orgId = await resolvePrimaryOrgId(userId);
  if (!orgId) return null;

  const mission = await prisma.mission.findFirst({
    where: { id: missionId, organizationId: orgId },
    include: {
      spacecraft: {
        include: {
          spacecraft: {
            select: {
              id: true,
              name: true,
              status: true,
              cosparId: true,
              noradId: true,
              orbitType: true,
              altitudeKm: true,
            },
          },
        },
        orderBy: [{ endedAt: "asc" }, { startedAt: "asc" }],
      },
      phases: {
        include: {
          milestones: {
            orderBy: { targetDate: "asc" },
          },
        },
        orderBy: { startDate: "asc" },
      },
    },
  });

  if (!mission) return null;

  const assigned = mission.spacecraft.filter((a) => a.endedAt === null);
  const past = mission.spacecraft.filter((a) => a.endedAt !== null);

  const phaseDetails = mission.phases.map(phaseRowToDetail);
  const totalMilestones = phaseDetails.reduce(
    (acc, p) => acc + p.milestones.length,
    0,
  );
  const regulatoryMilestones = phaseDetails.reduce(
    (acc, p) => acc + p.milestones.filter((m) => m.isRegulatory).length,
    0,
  );

  // Build summary using a phase shape compatible with the shared
  // missionToSummary (it only reads id/status/progress/startDate/endDate
  // — the phase records here include all those).
  const summary = missionToSummary({
    ...mission,
    spacecraft: assigned,
    phases: phaseDetails,
  });

  return {
    ...summary,
    assignedSpacecraft: assigned.map(assignmentToSummary),
    pastSpacecraft: past.map(assignmentToSummary),
    phases: phaseDetails,
    totalMilestones,
    regulatoryMilestones,
  };
}

/**
 * Create a new mission. The user must be a member of the target org.
 * Reference (if provided) must be unique within the org.
 */
export async function createMission(
  userId: string,
  input: CreateMissionInput,
): Promise<MissionDetail> {
  const orgId = await resolvePrimaryOrgId(userId);
  if (!orgId) throw new Error("User has no primary organization");

  const trimmedName = input.name.trim();
  if (!trimmedName) throw new Error("Mission name is required");
  if (trimmedName.length > 200) throw new Error("Mission name too long");

  const reference = normalizeReference(input.reference);
  if (reference) {
    const existing = await prisma.mission.findFirst({
      where: { organizationId: orgId, reference },
      select: { id: true },
    });
    if (existing)
      throw new Error(`Mission reference "${reference}" already exists`);
  }

  const created = await prisma.mission.create({
    data: {
      organizationId: orgId,
      createdById: userId,
      name: trimmedName,
      description: input.description?.trim() || null,
      reference,
      missionType: input.missionType ?? MissionType.EARTH_OBSERVATION,
      programPhase: input.programPhase ?? MissionProgramPhase.PHASE_A,
      status: input.status ?? MissionStatus.PLANNED,
      primaryEndUser: input.primaryEndUser?.trim() || null,
      primaryEndUserCountryCode:
        input.primaryEndUserCountryCode?.toUpperCase()?.slice(0, 2) || null,
      plannedStartAt: input.plannedStartAt ?? null,
      startedAt: input.startedAt ?? null,
      endedAt: input.endedAt ?? null,
      authorityRefs: input.authorityRefs ?? [],
    },
  });

  // Return the detail shape so the API layer can render the response
  // without an extra round-trip.
  const detail = await getMissionDetail(userId, created.id);
  if (!detail) throw new Error("Mission creation succeeded but read failed");
  return detail;
}

export async function updateMission(
  userId: string,
  missionId: string,
  patch: UpdateMissionInput,
): Promise<MissionDetail> {
  const orgId = await resolvePrimaryOrgId(userId);
  if (!orgId) throw new Error("User has no primary organization");

  const mission = await prisma.mission.findFirst({
    where: { id: missionId, organizationId: orgId },
    select: { id: true, reference: true },
  });
  if (!mission) throw new Error("Mission not found");

  // Build the update payload field-by-field — Prisma treats `undefined`
  // as "don't update" but `null` as "set to null", which is exactly
  // what we want for nullable string fields.
  const data: Prisma.MissionUpdateInput = {};
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (!trimmed) throw new Error("Mission name cannot be empty");
    if (trimmed.length > 200) throw new Error("Mission name too long");
    data.name = trimmed;
  }
  if (patch.description !== undefined)
    data.description = patch.description?.trim() || null;
  if (patch.reference !== undefined) {
    const newRef = normalizeReference(patch.reference);
    if (newRef && newRef !== mission.reference) {
      const conflict = await prisma.mission.findFirst({
        where: {
          organizationId: orgId,
          reference: newRef,
          NOT: { id: missionId },
        },
        select: { id: true },
      });
      if (conflict)
        throw new Error(`Mission reference "${newRef}" already exists`);
    }
    data.reference = newRef;
  }
  if (patch.missionType !== undefined) data.missionType = patch.missionType;
  if (patch.programPhase !== undefined) data.programPhase = patch.programPhase;
  if (patch.status !== undefined) data.status = patch.status;
  if (patch.primaryEndUser !== undefined)
    data.primaryEndUser = patch.primaryEndUser?.trim() || null;
  if (patch.primaryEndUserCountryCode !== undefined)
    data.primaryEndUserCountryCode =
      patch.primaryEndUserCountryCode?.toUpperCase()?.slice(0, 2) || null;
  if (patch.plannedStartAt !== undefined)
    data.plannedStartAt = patch.plannedStartAt;
  if (patch.startedAt !== undefined) data.startedAt = patch.startedAt;
  if (patch.endedAt !== undefined) data.endedAt = patch.endedAt;
  if (patch.authorityRefs !== undefined)
    data.authorityRefs = patch.authorityRefs;

  await prisma.mission.update({ where: { id: missionId }, data });

  const detail = await getMissionDetail(userId, missionId);
  if (!detail) throw new Error("Mission update succeeded but read failed");
  return detail;
}

/**
 * Soft-archive a mission by setting status=CANCELLED + endedAt=now.
 * We don't hard-delete because:
 *  - Authorization workflows + audit logs may reference the missionId
 *  - 5+ year retention requirements (§22 AWV / 15 CFR 762)
 */
export async function archiveMission(
  userId: string,
  missionId: string,
): Promise<MissionDetail> {
  const orgId = await resolvePrimaryOrgId(userId);
  if (!orgId) throw new Error("User has no primary organization");

  const mission = await prisma.mission.findFirst({
    where: { id: missionId, organizationId: orgId },
    select: { id: true },
  });
  if (!mission) throw new Error("Mission not found");

  const now = new Date();
  await prisma.$transaction([
    prisma.mission.update({
      where: { id: missionId },
      data: { status: MissionStatus.CANCELLED, endedAt: now },
    }),
    // End all currently-active spacecraft assignments — they implicitly
    // end with the mission.
    prisma.missionSpacecraft.updateMany({
      where: { missionId, endedAt: null },
      data: { endedAt: now },
    }),
  ]);

  const detail = await getMissionDetail(userId, missionId);
  if (!detail) throw new Error("Mission archive succeeded but read failed");
  return detail;
}

export interface AssignSpacecraftInput {
  spacecraftId: string;
  role?: string;
  startedAt?: Date;
  constellationSlot?: number | null;
  notes?: string | null;
}

export async function assignSpacecraft(
  userId: string,
  missionId: string,
  input: AssignSpacecraftInput,
): Promise<MissionDetail> {
  const orgId = await resolvePrimaryOrgId(userId);
  if (!orgId) throw new Error("User has no primary organization");

  // Verify both mission and spacecraft belong to the user's org —
  // important since /api/spacecraft is a public-ish read but we don't
  // want to allow cross-org assignment.
  const [mission, spacecraft] = await Promise.all([
    prisma.mission.findFirst({
      where: { id: missionId, organizationId: orgId },
      select: { id: true },
    }),
    prisma.spacecraft.findFirst({
      where: { id: input.spacecraftId, organizationId: orgId },
      select: { id: true },
    }),
  ]);
  if (!mission) throw new Error("Mission not found");
  if (!spacecraft) throw new Error("Spacecraft not found in this organization");

  // Prevent duplicate active assignment of the same spacecraft to the
  // same mission. Detach first, then re-assign — that's what the UI
  // surface for "move spacecraft" should do (separate operation).
  const dupe = await prisma.missionSpacecraft.findFirst({
    where: {
      missionId,
      spacecraftId: input.spacecraftId,
      endedAt: null,
    },
    select: { id: true },
  });
  if (dupe) throw new Error("Spacecraft is already assigned to this mission");

  await prisma.missionSpacecraft.create({
    data: {
      missionId,
      spacecraftId: input.spacecraftId,
      role: input.role?.trim() || "primary",
      startedAt: input.startedAt ?? new Date(),
      constellationSlot: input.constellationSlot ?? null,
      notes: input.notes?.trim() || null,
    },
  });

  const detail = await getMissionDetail(userId, missionId);
  if (!detail) throw new Error("Assignment succeeded but read failed");
  return detail;
}

export async function detachSpacecraft(
  userId: string,
  missionId: string,
  assignmentId: string,
): Promise<MissionDetail> {
  const orgId = await resolvePrimaryOrgId(userId);
  if (!orgId) throw new Error("User has no primary organization");

  const assignment = await prisma.missionSpacecraft.findFirst({
    where: {
      id: assignmentId,
      missionId,
      mission: { organizationId: orgId },
    },
    select: { id: true, endedAt: true },
  });
  if (!assignment) throw new Error("Assignment not found");
  if (assignment.endedAt) throw new Error("Assignment is already ended");

  await prisma.missionSpacecraft.update({
    where: { id: assignmentId },
    data: { endedAt: new Date() },
  });

  const detail = await getMissionDetail(userId, missionId);
  if (!detail) throw new Error("Detach succeeded but read failed");
  return detail;
}

// ─── Auto-migration shim ──────────────────────────────────────────────────

/**
 * For each Spacecraft in the org without an active MissionSpacecraft
 * row, create a 1:1 default Mission (status/programPhase derived from
 * Spacecraft.status; missionType from the spacecraft's free-text
 * missionType field). Also backfills MissionPhase.missionRefId.
 *
 * Idempotent: re-running it after migration finds zero orphan
 * spacecraft and zero orphan phases.
 *
 * Safe to call on every list-fetch — typical cost is one query
 * (LEFT JOIN to find orphans), often returning empty after the
 * migration window is past.
 */
export async function ensureMissionsForOrg(
  orgId: string,
  createdById: string,
): Promise<{ missionsCreated: number; phasesBackfilled: number }> {
  // Find all spacecraft in the org that have no ACTIVE assignment.
  // We don't migrate spacecraft that have been "decommissioned out"
  // of all their missions on purpose — but in practice, no historical
  // data has any MissionSpacecraft rows yet, so this is a no-op on
  // the second call.
  const orphans = await prisma.spacecraft.findMany({
    where: {
      organizationId: orgId,
      missionAssignments: { none: { endedAt: null } },
    },
    select: {
      id: true,
      name: true,
      status: true,
      missionType: true,
      launchDate: true,
      endOfLifeDate: true,
    },
  });

  if (orphans.length === 0) {
    // Still backfill any phases that have a missionId pointing at a
    // spacecraft that already has a Mission. Cheap on subsequent runs
    // because of the missionRefId index + IS NULL filter.
    const phasesBackfilled = await backfillPhaseMissionRefs(orgId);
    return { missionsCreated: 0, phasesBackfilled };
  }

  // Bulk-create Mission rows for the orphans. Done sequentially in a
  // transaction to keep the missionId/spacecraftId join consistent.
  let missionsCreated = 0;
  await prisma.$transaction(async (tx) => {
    for (const sc of orphans) {
      const mission = await tx.mission.create({
        data: {
          organizationId: orgId,
          createdById,
          name: sc.name,
          missionType: mapSpacecraftMissionTypeToEnum(sc.missionType),
          programPhase: mapSpacecraftStatusToProgramPhase(sc.status),
          status: mapSpacecraftStatusToMissionStatus(sc.status),
          plannedStartAt: sc.launchDate,
          startedAt: sc.status === "PRE_LAUNCH" ? null : sc.launchDate,
          endedAt:
            sc.status === "DEORBITED" || sc.status === "LOST"
              ? sc.endOfLifeDate
              : null,
        },
      });
      await tx.missionSpacecraft.create({
        data: {
          missionId: mission.id,
          spacecraftId: sc.id,
          role: "primary",
          // backdate to s/c.launchDate when known so historical
          // analytics (e.g. "missions started in 2024") work right.
          startedAt: sc.launchDate ?? new Date(),
        },
      });
      // Phases that referenced the spacecraft.id directly get the new
      // FK pointing at the freshly-created mission.
      await tx.missionPhase.updateMany({
        where: { missionId: sc.id, missionRefId: null },
        data: { missionRefId: mission.id },
      });
      missionsCreated++;
    }
  });

  const phasesBackfilled = await backfillPhaseMissionRefs(orgId);
  return { missionsCreated, phasesBackfilled };
}

/**
 * Runs the missionRefId backfill in a separate query (outside the
 * primary $transaction) so we can hit any phases that already have a
 * matching Mission via spacecraft assignment, regardless of when the
 * Mission was created. Idempotent.
 */
async function backfillPhaseMissionRefs(orgId: string): Promise<number> {
  // Find all phases where missionId equals a Spacecraft.id that's
  // already linked to a Mission via MissionSpacecraft. Set missionRefId.
  // We do this in raw SQL to keep it to one round-trip — Prisma's
  // updateMany doesn't support sub-selects.
  const result = await prisma.$executeRawUnsafe(
    `
    UPDATE "MissionPhase" mp
    SET "missionRefId" = ms."missionId"
    FROM "MissionSpacecraft" ms
    INNER JOIN "Mission" m ON m.id = ms."missionId"
    WHERE mp."missionId" = ms."spacecraftId"
      AND mp."missionRefId" IS NULL
      AND ms."endedAt" IS NULL
      AND m."organizationId" = $1;
  `,
    orgId,
  );
  return Number(result);
}

// ─── Internals ────────────────────────────────────────────────────────────

function normalizeReference(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > 100) throw new Error("Mission reference too long");
  return trimmed;
}

/** Free-text Spacecraft.missionType → MissionType enum.
 *  Defaults to OTHER for unknown values. */
function mapSpacecraftMissionTypeToEnum(raw: string): MissionType {
  const normalized = raw.toLowerCase().replace(/[\s_-]+/g, "_");
  switch (normalized) {
    case "earth_observation":
    case "eo":
    case "remote_sensing":
      return MissionType.EARTH_OBSERVATION;
    case "communication":
    case "communications":
    case "comms":
    case "broadband":
    case "iot":
      return MissionType.COMMUNICATIONS;
    case "navigation":
    case "pnt":
    case "gnss":
      return MissionType.NAVIGATION;
    case "science":
    case "scientific":
    case "research":
      return MissionType.SCIENCE;
    case "iod":
    case "in_orbit_demonstration":
      return MissionType.IOD;
    case "tech_demo":
    case "technology_demonstration":
      return MissionType.TECH_DEMO;
    case "human_spaceflight":
    case "crewed":
      return MissionType.HUMAN_SPACEFLIGHT;
    case "oos_adr":
    case "servicing":
    case "debris_removal":
      return MissionType.OOS_ADR;
    case "launch":
    case "launcher":
      return MissionType.LAUNCH;
    default:
      return MissionType.OTHER;
  }
}

/** Spacecraft hardware status → Mission operational status.
 *  Note: a DECOMMISSIONING spacecraft is still in an ACTIVE mission
 *  (the mission is winding down but ongoing). LOST → CANCELLED
 *  treats unrecoverable s/c as cancelled mission. */
function mapSpacecraftStatusToMissionStatus(
  s: SpacecraftStatus,
): MissionStatus {
  switch (s) {
    case "PRE_LAUNCH":
      return MissionStatus.PLANNED;
    case "LAUNCHED":
    case "OPERATIONAL":
    case "DECOMMISSIONING":
      return MissionStatus.ACTIVE;
    case "DEORBITED":
      return MissionStatus.COMPLETED;
    case "LOST":
      return MissionStatus.CANCELLED;
    default:
      return MissionStatus.PLANNED;
  }
}

/** Spacecraft hardware status → NASA Phase (best guess).
 *  Once a spacecraft exists in the registry we assume it's at least
 *  past Phase B (Concept Development). LAUNCHED implies we just
 *  finished Phase D's launch event. */
function mapSpacecraftStatusToProgramPhase(
  s: SpacecraftStatus,
): MissionProgramPhase {
  switch (s) {
    case "PRE_LAUNCH":
      return MissionProgramPhase.PHASE_C;
    case "LAUNCHED":
      return MissionProgramPhase.PHASE_D;
    case "OPERATIONAL":
      return MissionProgramPhase.PHASE_E;
    case "DECOMMISSIONING":
    case "DEORBITED":
    case "LOST":
      return MissionProgramPhase.PHASE_F;
    default:
      return MissionProgramPhase.PHASE_A;
  }
}

// ─── Internal mappers (Prisma row → API summary) ──────────────────────────

type MissionWithIncludes = Prisma.MissionGetPayload<{
  include: {
    spacecraft: {
      include: {
        spacecraft: {
          select: {
            id: true;
            name: true;
            status: true;
            cosparId: true;
            noradId: true;
            orbitType: true;
            altitudeKm: true;
          };
        };
      };
    };
    phases: {
      select: {
        id: true;
        name: true;
        status: true;
        progress: true;
        startDate: true;
        endDate: true;
      };
    };
  };
}>;

type AssignmentRow = MissionWithIncludes["spacecraft"][number];

/**
 * Structural shape used by `missionToSummary`. The detail-page query
 * pulls richer phase data (including milestones); both that shape
 * and the list-page `MissionWithIncludes` are assignable to this
 * minimal contract.
 */
interface MissionForSummary {
  id: string;
  name: string;
  reference: string | null;
  description: string | null;
  missionType: MissionType;
  programPhase: MissionProgramPhase;
  status: MissionStatus;
  primaryEndUser: string | null;
  primaryEndUserCountryCode: string | null;
  plannedStartAt: Date | null;
  startedAt: Date | null;
  endedAt: Date | null;
  authorityRefs: string[];
  spacecraft: AssignmentRow[];
  phases: Array<{
    id: string;
    name: string;
    status: PhaseStatus;
    progress: number;
    startDate: Date;
    endDate: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

function missionToSummary(m: MissionForSummary): MissionSummary {
  const activeAssignments = m.spacecraft.filter((a) => a.endedAt === null);
  const primary =
    activeAssignments.find((a) => a.role === "primary") ?? activeAssignments[0];

  return {
    id: m.id,
    name: m.name,
    reference: m.reference,
    description: m.description,
    missionType: m.missionType,
    programPhase: m.programPhase,
    status: m.status,
    primaryEndUser: m.primaryEndUser,
    primaryEndUserCountryCode: m.primaryEndUserCountryCode,
    plannedStartAt: m.plannedStartAt,
    startedAt: m.startedAt,
    endedAt: m.endedAt,
    authorityRefs: m.authorityRefs,
    spacecraftCount: activeAssignments.length,
    primarySpacecraft: primary ? assignmentToSummary(primary) : null,
    phaseCount: m.phases.length,
    activePhase: pickActivePhase(m.phases),
    roadmapProgressPct: avgProgress(m.phases),
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

function assignmentToSummary(a: AssignmentRow): AssignedSpacecraftSummary {
  return {
    assignmentId: a.id,
    spacecraftId: a.spacecraftId,
    spacecraftName: a.spacecraft.name,
    role: a.role,
    startedAt: a.startedAt,
    endedAt: a.endedAt,
    constellationSlot: a.constellationSlot,
    status: a.spacecraft.status,
    cosparId: a.spacecraft.cosparId,
    noradId: a.spacecraft.noradId,
    orbitType: a.spacecraft.orbitType,
    altitudeKm: a.spacecraft.altitudeKm,
  };
}

function phaseToSummary(p: {
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
  if (inProgress) return phaseToSummary(inProgress);
  const nextPlanned = phases
    .filter((p) => p.status === "PLANNED" && p.startDate.getTime() >= now)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0];
  if (nextPlanned) return phaseToSummary(nextPlanned);
  const lastCompleted = phases
    .filter((p) => p.status === "COMPLETED")
    .sort((a, b) => b.endDate.getTime() - a.endDate.getTime())[0];
  if (lastCompleted) return phaseToSummary(lastCompleted);
  return phaseToSummary(phases[0]);
}

function avgProgress(phases: Array<{ progress: number }>): number {
  if (phases.length === 0) return 0;
  const sum = phases.reduce((acc, p) => acc + (p.progress ?? 0), 0);
  return Math.round(sum / phases.length);
}

type PhaseDetailRow = Prisma.MissionPhaseGetPayload<{
  include: { milestones: true };
}>;

function phaseRowToDetail(p: PhaseDetailRow): MissionPhaseDetail {
  return {
    id: p.id,
    name: p.name,
    status: p.status,
    progress: p.progress,
    startDate: p.startDate,
    endDate: p.endDate,
    description: p.description,
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
  };
}
