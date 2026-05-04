/**
 * Operator-universe data layer — Sprint 10B (Wow-Pattern #6)
 *
 * Reads the operator's mission + ecosystem into a shape suitable for
 * a 3D scene: operator at the centre (the "star"), spacecraft as
 * orbiting "planets" (orbit radius keyed off `orbitType`, status
 * drives colour), stakeholder engagements as outer "moons" (drift
 * around the entire system).
 *
 * # Why we don't use real altitude
 *
 * `Spacecraft.altitudeKm` is optional and only populated for ops
 * teams who actually filled the orbital-parameters block. Using it
 * directly would give an empty universe for new tenants. Instead we
 * key off the `orbitType` string enum (LEO/MEO/GEO/HEO) — every row
 * has one because it's a required field — and derive a stable
 * "scene radius" so the picture renders even before altitude data
 * lands.
 *
 * Spacecraft with an explicit `altitudeKm` get a small +/- per-craft
 * jitter inside their orbit band so two LEO satellites don't draw on
 * top of each other. Spacecraft without it get a deterministic
 * jitter from a hash of the spacecraft id — same input → same
 * position so the universe doesn't shuffle on re-render.
 *
 * # Why a static layout, not a force simulation
 *
 * Force-directed layouts in 3D are heavy (10–60 fps cost on mid
 * tier) and non-deterministic (frame-to-frame jitter on hover).
 * For a "your mission at a glance" picture we want every load to
 * look the same so the user builds a mental map. Per-craft seeded
 * jitter + orbit bands gives that for free.
 *
 * # Auth scope
 *
 * Per-org. Spacecraft cascade-delete with Organization, so reading
 * `where: { organizationId }` is safe.
 */

import "server-only";

import type {
  SpacecraftStatus,
  StakeholderType,
  EngagementStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────

export interface UniverseOperator {
  id: string;
  name: string;
}

export interface UniverseSpacecraft {
  id: string;
  name: string;
  missionType: string;
  /** LEO / MEO / GEO / HEO — drives orbit band radius. */
  orbitType: string;
  status: SpacecraftStatus;
  /** May be null for rows without orbital-parameters filled in. */
  altitudeKm: number | null;
  /**
   * Orbit-band radius in scene units. LEO closest, HEO farthest.
   * Stable per spacecraft across reads.
   */
  orbitRadius: number;
  /**
   * Initial angular offset (radians, 0..2π). Deterministic from
   * spacecraft id so the universe doesn't shuffle on refresh.
   */
  initialAngle: number;
  /**
   * Out-of-plane Y offset (scene units, +/- ~0.4) so multiple
   * crafts in the same orbit band don't overlap.
   */
  yOffset: number;
  /**
   * Orbit speed multiplier — LEO orbits faster than GEO. Cosmetic,
   * not a real Kepler relationship. Lower = slower.
   */
  speedMultiplier: number;
}

export interface UniverseStakeholder {
  id: string;
  type: StakeholderType;
  companyName: string;
  status: EngagementStatus;
  /**
   * Angular position on the outer "moon" ring. Deterministic from
   * stakeholder id so visualization is stable.
   */
  angle: number;
}

export interface OperatorUniverse {
  operator: UniverseOperator;
  spacecraft: UniverseSpacecraft[];
  stakeholders: UniverseStakeholder[];
  /** Quick-glance counts for the side panel. */
  totals: {
    spacecraftByStatus: Record<SpacecraftStatus, number>;
    stakeholderCount: number;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────

/**
 * Scene-unit orbit radii per orbit band. The visual scale is intentionally
 * compressed — real LEO is ~400km, GEO is ~36,000km, but rendering at
 * proper scale makes LEO invisible. We log-flavoured the spacing so the
 * picture reads as "increasingly far out" without making the inner orbits
 * vanishingly small.
 */
const ORBIT_RADIUS_BY_TYPE: Record<string, number> = {
  LEO: 2.5,
  MEO: 4.0,
  GEO: 5.5,
  HEO: 7.0,
};

const FALLBACK_ORBIT_RADIUS = 3.5; // for unknown orbitType strings

/**
 * Stakeholders sit on a ring outside the outermost spacecraft orbit.
 * Re-declared verbatim in the client component (it can't import this
 * file — `server-only` would throw on the client).
 */
const STAKEHOLDER_RING_RADIUS = 9.0;

const ZERO_BY_STATUS: Record<SpacecraftStatus, number> = {
  PRE_LAUNCH: 0,
  LAUNCHED: 0,
  OPERATIONAL: 0,
  DECOMMISSIONING: 0,
  DEORBITED: 0,
  LOST: 0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Deterministic 32-bit hash of a string id. We don't need crypto-strong —
 * we just need same-id-same-output so the visualization is stable across
 * reads. xfnv1a is a tiny non-crypto hash that fits in two lines.
 */
function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0; // force unsigned 32-bit
}

/** Map a hash to [0, 1). */
function unitFromHash(hash: number): number {
  return (hash & 0xffffff) / 0x1000000;
}

/** Given a spacecraft id, returns [angle 0..2π, yOffset -0.4..+0.4]. */
function jitterFromId(id: string): { angle: number; yOffset: number } {
  const h = hashId(id);
  const angle = unitFromHash(h) * Math.PI * 2;
  // Use a different bit slice so angle and yOffset aren't correlated.
  const yUnit = unitFromHash(h >>> 11);
  const yOffset = (yUnit - 0.5) * 0.8;
  return { angle, yOffset };
}

/** LEO faster than HEO — purely cosmetic but reads as "physical". */
function speedFromOrbit(orbitType: string): number {
  switch (orbitType) {
    case "LEO":
      return 1.0;
    case "MEO":
      return 0.6;
    case "GEO":
      return 0.4;
    case "HEO":
      return 0.25;
    default:
      return 0.7;
  }
}

// ─── Public fetcher ───────────────────────────────────────────────────────

/**
 * Build the operator-universe scene data for one organisation.
 * Two parallel fetches (org+spacecraft, engagements), shaped in-memory.
 *
 * Returns an empty-but-valid universe (operator only, no spacecraft, no
 * stakeholders) when the org has no records yet — the client renders a
 * lone star + "no satellites yet" hint.
 */
export async function getOperatorUniverse(
  organizationId: string,
): Promise<OperatorUniverse> {
  const [org, spacecraftRows, engagementRows] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    }),
    prisma.spacecraft.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        missionType: true,
        orbitType: true,
        status: true,
        altitudeKm: true,
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
    prisma.stakeholderEngagement.findMany({
      where: {
        organizationId,
        isRevoked: false,
        status: { in: ["INVITED", "ACTIVE"] },
      },
      select: {
        id: true,
        type: true,
        companyName: true,
        status: true,
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
  ]);

  if (!org) {
    return {
      operator: { id: organizationId, name: "(unknown organisation)" },
      spacecraft: [],
      stakeholders: [],
      totals: {
        spacecraftByStatus: { ...ZERO_BY_STATUS },
        stakeholderCount: 0,
      },
    };
  }

  const spacecraft: UniverseSpacecraft[] = spacecraftRows.map((s) => {
    const baseRadius =
      ORBIT_RADIUS_BY_TYPE[s.orbitType] ?? FALLBACK_ORBIT_RADIUS;
    const { angle, yOffset } = jitterFromId(s.id);
    // If the row has a real altitude, nudge orbitRadius slightly within the
    // band so different LEOs sit at different distances. The nudge is at most
    // ±0.3 scene units so the band stays distinct.
    const altitudeNudge =
      s.altitudeKm != null
        ? // Map altitudeKm into a small fraction of the band — purely visual.
          // Use a sigmoid-flavoured map so very high altitudes don't blow up.
          (Math.tanh(s.altitudeKm / 20000) - 0.5) * 0.6
        : 0;

    return {
      id: s.id,
      name: s.name,
      missionType: s.missionType,
      orbitType: s.orbitType,
      status: s.status,
      altitudeKm: s.altitudeKm,
      orbitRadius: baseRadius + altitudeNudge,
      initialAngle: angle,
      yOffset,
      speedMultiplier: speedFromOrbit(s.orbitType),
    };
  });

  // Stakeholders sit on a single outer ring, evenly distributed by index
  // so the picture reads as "ring of partners". We don't use jitter here —
  // the deterministic angle keeps the visualization stable.
  const stakeholders: UniverseStakeholder[] = engagementRows.map((e, i) => ({
    id: e.id,
    type: e.type,
    companyName: e.companyName,
    status: e.status,
    angle:
      engagementRows.length > 0 ? (i / engagementRows.length) * Math.PI * 2 : 0,
  }));

  // Status histogram for the side panel.
  const spacecraftByStatus: Record<SpacecraftStatus, number> = {
    ...ZERO_BY_STATUS,
  };
  for (const s of spacecraftRows) {
    spacecraftByStatus[s.status] += 1;
  }

  return {
    operator: { id: org.id, name: org.name },
    spacecraft,
    stakeholders,
    totals: {
      spacecraftByStatus,
      stakeholderCount: stakeholders.length,
    },
  };
}
