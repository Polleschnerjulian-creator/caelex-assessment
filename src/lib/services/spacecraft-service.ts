/**
 * Spacecraft Service
 * Manages spacecraft/assets within organizations
 */

import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import type { Spacecraft, SpacecraftStatus, Prisma } from "@prisma/client";

// ─── Types ───

export interface CreateSpacecraftInput {
  organizationId: string;
  name: string;
  cosparId?: string;
  noradId?: string;
  missionType: string;
  launchDate?: Date;
  endOfLifeDate?: Date;
  orbitType: string;
  altitudeKm?: number;
  inclinationDeg?: number;
  status?: SpacecraftStatus;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateSpacecraftInput {
  name?: string;
  cosparId?: string;
  noradId?: string;
  missionType?: string;
  launchDate?: Date;
  endOfLifeDate?: Date;
  orbitType?: string;
  altitudeKm?: number;
  inclinationDeg?: number;
  status?: SpacecraftStatus;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface SpacecraftFilters {
  status?: SpacecraftStatus;
  orbitType?: string;
  missionType?: string;
  search?: string;
}

export interface SpacecraftWithStats extends Spacecraft {
  _count?: {
    // Future relations can be added here
  };
}

// ─── Mission Types ───

export const MISSION_TYPES = [
  { value: "communication", label: "Communication" },
  { value: "earth_observation", label: "Earth Observation" },
  { value: "navigation", label: "Navigation" },
  { value: "scientific", label: "Scientific Research" },
  { value: "technology_demonstration", label: "Technology Demonstration" },
  { value: "weather", label: "Weather/Meteorology" },
  { value: "military", label: "Military/Defense" },
  { value: "commercial", label: "Commercial Services" },
  { value: "space_station", label: "Space Station/Module" },
  { value: "debris_removal", label: "Debris Removal" },
  { value: "in_orbit_servicing", label: "In-Orbit Servicing" },
  { value: "other", label: "Other" },
] as const;

export const ORBIT_TYPES = [
  { value: "LEO", label: "Low Earth Orbit (< 2,000 km)" },
  { value: "MEO", label: "Medium Earth Orbit (2,000 - 35,786 km)" },
  { value: "GEO", label: "Geostationary Orbit (~35,786 km)" },
  { value: "HEO", label: "Highly Elliptical Orbit" },
  { value: "SSO", label: "Sun-Synchronous Orbit" },
  { value: "polar", label: "Polar Orbit" },
  { value: "cislunar", label: "Cislunar" },
  { value: "deep_space", label: "Deep Space" },
  { value: "other", label: "Other" },
] as const;

export const STATUS_CONFIG: Record<
  SpacecraftStatus,
  { label: string; color: string; description: string }
> = {
  PRE_LAUNCH: {
    label: "Pre-Launch",
    color: "blue",
    description: "Planning and development phase",
  },
  LAUNCHED: {
    label: "Launched",
    color: "purple",
    description: "Successfully launched, commissioning phase",
  },
  OPERATIONAL: {
    label: "Operational",
    color: "green",
    description: "Fully operational and active",
  },
  DECOMMISSIONING: {
    label: "Decommissioning",
    color: "amber",
    description: "End-of-life disposal in progress",
  },
  DEORBITED: {
    label: "Deorbited",
    color: "slate",
    description: "Successfully deorbited",
  },
  LOST: {
    label: "Lost",
    color: "red",
    description: "Contact lost or mission failure",
  },
};

// ─── CRUD Operations ───

export async function createSpacecraft(
  input: CreateSpacecraftInput,
  userId: string,
): Promise<Spacecraft> {
  // Check organization limits
  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: {
      maxSpacecraft: true,
      name: true,
      _count: { select: { spacecraft: true } },
    },
  });

  if (!org) {
    throw new Error("Organization not found");
  }

  if (org.maxSpacecraft !== -1 && org._count.spacecraft >= org.maxSpacecraft) {
    throw new Error(
      `Organization has reached maximum spacecraft limit (${org.maxSpacecraft})`,
    );
  }

  // Check for duplicate COSPAR ID within org
  if (input.cosparId) {
    const existing = await prisma.spacecraft.findFirst({
      where: {
        organizationId: input.organizationId,
        cosparId: input.cosparId,
      },
    });
    if (existing) {
      throw new Error("A spacecraft with this COSPAR ID already exists");
    }
  }

  const spacecraft = await prisma.spacecraft.create({
    data: {
      organizationId: input.organizationId,
      name: input.name,
      cosparId: input.cosparId,
      noradId: input.noradId,
      missionType: input.missionType,
      launchDate: input.launchDate,
      endOfLifeDate: input.endOfLifeDate,
      orbitType: input.orbitType,
      altitudeKm: input.altitudeKm,
      inclinationDeg: input.inclinationDeg,
      status: input.status || "PRE_LAUNCH",
      description: input.description,
      metadata: input.metadata as Prisma.InputJsonValue,
    },
  });

  // Log audit event
  await logAuditEvent({
    userId,
    action: "spacecraft_created",
    entityType: "spacecraft",
    entityId: spacecraft.id,
    description: `Created spacecraft "${spacecraft.name}"`,
    newValue: {
      name: spacecraft.name,
      missionType: spacecraft.missionType,
      orbitType: spacecraft.orbitType,
    },
  });

  return spacecraft;
}

export async function getSpacecraft(
  id: string,
  organizationId: string,
): Promise<Spacecraft | null> {
  return prisma.spacecraft.findFirst({
    where: { id, organizationId },
  });
}

export async function getSpacecraftList(
  organizationId: string,
  filters?: SpacecraftFilters,
  options?: { limit?: number; offset?: number },
): Promise<{ spacecraft: Spacecraft[]; total: number }> {
  const where: Prisma.SpacecraftWhereInput = { organizationId };

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.orbitType) {
    where.orbitType = filters.orbitType;
  }

  if (filters?.missionType) {
    where.missionType = filters.missionType;
  }

  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { cosparId: { contains: filters.search, mode: "insensitive" } },
      { noradId: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [spacecraft, total] = await Promise.all([
    prisma.spacecraft.findMany({
      where,
      orderBy: [{ status: "asc" }, { name: "asc" }],
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.spacecraft.count({ where }),
  ]);

  return { spacecraft, total };
}

export async function updateSpacecraft(
  id: string,
  organizationId: string,
  input: UpdateSpacecraftInput,
  userId: string,
): Promise<Spacecraft> {
  // Get previous state for audit
  const previous = await prisma.spacecraft.findFirst({
    where: { id, organizationId },
  });

  if (!previous) {
    throw new Error("Spacecraft not found");
  }

  // Check for duplicate COSPAR ID if being updated
  if (input.cosparId && input.cosparId !== previous.cosparId) {
    const existing = await prisma.spacecraft.findFirst({
      where: {
        organizationId,
        cosparId: input.cosparId,
        NOT: { id },
      },
    });
    if (existing) {
      throw new Error("A spacecraft with this COSPAR ID already exists");
    }
  }

  const data: Prisma.SpacecraftUpdateInput = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.cosparId !== undefined) data.cosparId = input.cosparId;
  if (input.noradId !== undefined) data.noradId = input.noradId;
  if (input.missionType !== undefined) data.missionType = input.missionType;
  if (input.launchDate !== undefined) data.launchDate = input.launchDate;
  if (input.endOfLifeDate !== undefined)
    data.endOfLifeDate = input.endOfLifeDate;
  if (input.orbitType !== undefined) data.orbitType = input.orbitType;
  if (input.altitudeKm !== undefined) data.altitudeKm = input.altitudeKm;
  if (input.inclinationDeg !== undefined)
    data.inclinationDeg = input.inclinationDeg;
  if (input.status !== undefined) data.status = input.status;
  if (input.description !== undefined) data.description = input.description;
  if (input.metadata !== undefined)
    data.metadata = input.metadata as Prisma.InputJsonValue;

  const updated = await prisma.spacecraft.update({
    where: { id },
    data,
  });

  // Log audit event
  await logAuditEvent({
    userId,
    action: "spacecraft_updated",
    entityType: "spacecraft",
    entityId: id,
    description: `Updated spacecraft "${updated.name}"`,
    previousValue: {
      name: previous.name,
      status: previous.status,
      missionType: previous.missionType,
    },
    newValue: {
      name: updated.name,
      status: updated.status,
      missionType: updated.missionType,
    },
  });

  return updated;
}

export async function deleteSpacecraft(
  id: string,
  organizationId: string,
  userId: string,
): Promise<void> {
  const spacecraft = await prisma.spacecraft.findFirst({
    where: { id, organizationId },
  });

  if (!spacecraft) {
    throw new Error("Spacecraft not found");
  }

  await prisma.spacecraft.delete({
    where: { id },
  });

  // Log audit event
  await logAuditEvent({
    userId,
    action: "spacecraft_deleted",
    entityType: "spacecraft",
    entityId: id,
    description: `Deleted spacecraft "${spacecraft.name}"`,
    previousValue: {
      name: spacecraft.name,
      cosparId: spacecraft.cosparId,
      status: spacecraft.status,
    },
  });
}

// ─── Status Transitions ───

const VALID_STATUS_TRANSITIONS: Record<SpacecraftStatus, SpacecraftStatus[]> = {
  PRE_LAUNCH: ["LAUNCHED", "LOST"],
  LAUNCHED: ["OPERATIONAL", "DECOMMISSIONING", "LOST"],
  OPERATIONAL: ["DECOMMISSIONING", "LOST"],
  DECOMMISSIONING: ["DEORBITED", "LOST"],
  DEORBITED: [], // Terminal state
  LOST: [], // Terminal state
};

export function canTransitionStatus(
  currentStatus: SpacecraftStatus,
  newStatus: SpacecraftStatus,
): boolean {
  if (currentStatus === newStatus) return true;
  return VALID_STATUS_TRANSITIONS[currentStatus].includes(newStatus);
}

export async function updateSpacecraftStatus(
  id: string,
  organizationId: string,
  newStatus: SpacecraftStatus,
  userId: string,
): Promise<Spacecraft> {
  const spacecraft = await prisma.spacecraft.findFirst({
    where: { id, organizationId },
  });

  if (!spacecraft) {
    throw new Error("Spacecraft not found");
  }

  if (!canTransitionStatus(spacecraft.status, newStatus)) {
    throw new Error(
      `Cannot transition from ${spacecraft.status} to ${newStatus}`,
    );
  }

  const updated = await prisma.spacecraft.update({
    where: { id },
    data: { status: newStatus },
  });

  // Log audit event
  await logAuditEvent({
    userId,
    action: "spacecraft_status_changed",
    entityType: "spacecraft",
    entityId: id,
    description: `Changed spacecraft "${spacecraft.name}" status from ${spacecraft.status} to ${newStatus}`,
    previousValue: { status: spacecraft.status },
    newValue: { status: newStatus },
  });

  return updated;
}

// ─── Statistics ───

export interface SpacecraftStats {
  total: number;
  byStatus: Record<SpacecraftStatus, number>;
  byOrbitType: Record<string, number>;
  byMissionType: Record<string, number>;
  operational: number;
  preLaunch: number;
}

export async function getSpacecraftStats(
  organizationId: string,
): Promise<SpacecraftStats> {
  const spacecraft = await prisma.spacecraft.findMany({
    where: { organizationId },
    select: { status: true, orbitType: true, missionType: true },
  });

  const stats: SpacecraftStats = {
    total: spacecraft.length,
    byStatus: {
      PRE_LAUNCH: 0,
      LAUNCHED: 0,
      OPERATIONAL: 0,
      DECOMMISSIONING: 0,
      DEORBITED: 0,
      LOST: 0,
    },
    byOrbitType: {},
    byMissionType: {},
    operational: 0,
    preLaunch: 0,
  };

  for (const sc of spacecraft) {
    // Count by status
    stats.byStatus[sc.status]++;

    // Count by orbit type
    stats.byOrbitType[sc.orbitType] =
      (stats.byOrbitType[sc.orbitType] || 0) + 1;

    // Count by mission type
    stats.byMissionType[sc.missionType] =
      (stats.byMissionType[sc.missionType] || 0) + 1;
  }

  stats.operational = stats.byStatus.OPERATIONAL;
  stats.preLaunch = stats.byStatus.PRE_LAUNCH;

  return stats;
}

// ─── Export Utilities ───

export function formatSpacecraftForExport(
  spacecraft: Spacecraft,
): Record<string, string> {
  return {
    Name: spacecraft.name,
    "COSPAR ID": spacecraft.cosparId || "-",
    "NORAD ID": spacecraft.noradId || "-",
    "Mission Type":
      MISSION_TYPES.find((m) => m.value === spacecraft.missionType)?.label ||
      spacecraft.missionType,
    "Orbit Type":
      ORBIT_TYPES.find((o) => o.value === spacecraft.orbitType)?.label ||
      spacecraft.orbitType,
    Status: STATUS_CONFIG[spacecraft.status].label,
    "Launch Date": spacecraft.launchDate?.toISOString().split("T")[0] || "-",
    "End of Life": spacecraft.endOfLifeDate?.toISOString().split("T")[0] || "-",
    "Altitude (km)": spacecraft.altitudeKm?.toString() || "-",
    "Inclination (deg)": spacecraft.inclinationDeg?.toString() || "-",
    Description: spacecraft.description || "-",
  };
}
