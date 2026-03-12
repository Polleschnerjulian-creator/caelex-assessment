import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeLog } from "@/lib/verity/utils/redaction";
import {
  calculateSatelliteComplianceState,
  calculateEntityComplianceState,
} from "@/lib/ephemeris/core/satellite-compliance-state";
import { toPublicState } from "@/lib/ephemeris/core/types";
import type { OperatorEntityInput } from "@/lib/ephemeris/core/types";

/**
 * GET /api/v1/ephemeris/fleet
 * Returns compliance state for all entities (SCO + LO) in the user's organization.
 *
 * Performance: Reads pre-calculated states from DB (written by ephemeris-daily cron).
 * Falls back to live calculation only for entities without cached state.
 *
 * Each returned entry includes an `operatorType` field ("SCO" | "LO").
 *
 * Auth: Session-based
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const orgId = membership.organizationId;

    // ── Try reading pre-calculated states from DB (fast path) ──────────
    const cachedStates = await readCachedStates(orgId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fleet: any[] = [];
    let fromCacheCount = 0;

    // ── SCO: Spacecraft ────────────────────────────────────────────────
    const allSpacecraft = await prisma.spacecraft.findMany({
      where: { organizationId: orgId },
      select: { noradId: true, name: true, launchDate: true },
      orderBy: { name: "asc" },
    });

    const spacecraft = allSpacecraft.filter(
      (sc): sc is typeof sc & { noradId: string } => sc.noradId !== null,
    );

    const uncachedSpacecraft: Array<{
      noradId: string;
      name: string;
      launchDate: Date | null;
    }> = [];

    for (const sc of spacecraft) {
      const cached = cachedStates.get(sc.noradId);
      if (cached) {
        fleet.push({
          ...cached,
          operatorType:
            (cached as Record<string, unknown>).operatorType ?? "SCO",
        });
        fromCacheCount++;
      } else {
        uncachedSpacecraft.push(sc);
      }
    }

    if (uncachedSpacecraft.length > 0) {
      const states = await Promise.allSettled(
        uncachedSpacecraft.map((sc) =>
          calculateSatelliteComplianceState({
            prisma,
            orgId,
            noradId: sc.noradId,
            satelliteName: sc.name,
            launchDate: sc.launchDate,
          }),
        ),
      );

      for (let i = 0; i < states.length; i++) {
        const result = states[i]!;
        if (result.status === "fulfilled") {
          fleet.push({ ...toPublicState(result.value), operatorType: "SCO" });
        } else {
          safeLog("Fleet calculation failed for satellite", {
            noradId: uncachedSpacecraft[i]?.noradId,
            error:
              result.reason instanceof Error
                ? result.reason.message
                : "Unknown",
          });
        }
      }
    }

    // ── LO: Launch Vehicle Entities ────────────────────────────────────
    const loEntities = await readLoEntities(orgId);

    for (const entity of loEntities) {
      const displayId = entity.identifiers.vehicleId ?? entity.id;
      const cached = cachedStates.get(displayId);
      if (cached) {
        fleet.push({
          ...cached,
          operatorType:
            (cached as Record<string, unknown>).operatorType ?? "LO",
        });
        fromCacheCount++;
      } else {
        // Live-calculate LO compliance state
        try {
          const internalState = await calculateEntityComplianceState(
            entity,
            prisma,
          );
          fleet.push({ ...toPublicState(internalState), operatorType: "LO" });
        } catch (err) {
          safeLog("Fleet calculation failed for LO entity", {
            entityId: entity.id,
            error: err instanceof Error ? err.message : "Unknown",
          });
        }
      }
    }

    const totalEntities = spacecraft.length + loEntities.length;

    return NextResponse.json({
      data: fleet,
      meta: {
        total: totalEntities,
        calculated: fleet.length,
        fromCache: fromCacheCount,
      },
    });
  } catch (error) {
    safeLog("Ephemeris fleet error", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return NextResponse.json(
      { error: "Failed to calculate fleet compliance" },
      { status: 500 },
    );
  }
}

/**
 * Read pre-calculated compliance states from the SatelliteComplianceState table.
 * Returns a Map of noradId → public state JSON (as stored by ephemeris-daily cron).
 */
async function readCachedStates(
  orgId: string,
): Promise<Map<string, Record<string, unknown>>> {
  const result = new Map<string, Record<string, unknown>>();

  try {
    const states = await prisma.satelliteComplianceState.findMany({
      where: { operatorId: orgId },
      select: {
        noradId: true,
        stateJson: true,
        calculatedAt: true,
      },
    });

    for (const state of states) {
      // Only use cached state if it has stateJson and is less than 25 hours old
      // (ephemeris-daily runs every 24h, so 25h covers slight timing drift)
      if (!state.stateJson) continue;
      const ageMs = Date.now() - state.calculatedAt.getTime();
      if (ageMs > 25 * 60 * 60 * 1000) continue;

      result.set(state.noradId, state.stateJson as Record<string, unknown>);
    }
  } catch (error) {
    safeLog("Failed to read cached fleet states", {
      error: error instanceof Error ? error.message : "Unknown",
    });
  }

  return result;
}

/**
 * Read LO (Launch Operator) entities from the OperatorEntity table.
 * Returns them as OperatorEntityInput objects ready for compliance calculation.
 */
async function readLoEntities(orgId: string): Promise<OperatorEntityInput[]> {
  try {
    const entities = await prisma.operatorEntity.findMany({
      where: {
        organizationId: orgId,
        operatorType: "LO",
      },
    });

    return entities.map((e) => ({
      id: e.id,
      organizationId: e.organizationId,
      operatorType: e.operatorType,
      name: e.name,
      identifiers:
        e.identifiers as unknown as OperatorEntityInput["identifiers"],
      metadata: (e.metadata as Record<string, unknown>) ?? {},
      jurisdictions: e.jurisdictions,
      status: e.status as OperatorEntityInput["status"],
    }));
  } catch (error) {
    safeLog("Failed to read LO entities", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return [];
  }
}
