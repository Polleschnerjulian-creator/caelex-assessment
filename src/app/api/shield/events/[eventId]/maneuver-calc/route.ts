/**
 * Shield Maneuver Calculator API
 *
 * GET /api/shield/events/[eventId]/maneuver-calc
 * Returns a ManeuverResult estimate for the given conjunction event.
 *
 * Fetches the event's spacecraft orbital parameters (altitudeKm, inclinationDeg)
 * if a Spacecraft record is linked via the event's noradId. Falls back to
 * conservative defaults when no orbital data is found.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateManeuver } from "@/lib/shield/maneuver-calculator";
import { logger } from "@/lib/logger";

/** Minimum acceptable miss distance after maneuver (metres). */
const DEFAULT_TARGET_MISS_DISTANCE_M = 1000;

/** Conservative altitude used when spacecraft record has no altitudeKm. */
const FALLBACK_ALTITUDE_KM = 550;

/** Conservative inclination used when spacecraft record has no inclinationDeg. */
const FALLBACK_INCLINATION_DEG = 53;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true, role: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { eventId } = await params;

    const event = await prisma.conjunctionEvent.findFirst({
      where: {
        id: eventId,
        organizationId: membership.organizationId,
      },
      select: {
        id: true,
        noradId: true,
        spacecraftId: true,
        latestMissDistance: true,
        latestPc: true,
        tca: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // ── Resolve spacecraft orbital parameters ──────────────────────────────
    const spacecraft = event.spacecraftId
      ? await prisma.spacecraft.findFirst({
          where: {
            id: event.spacecraftId,
            organizationId: membership.organizationId,
          },
          select: { altitudeKm: true, inclinationDeg: true },
        })
      : null;

    const altitudeKm = spacecraft?.altitudeKm ?? FALLBACK_ALTITUDE_KM;
    const inclinationDeg =
      spacecraft?.inclinationDeg ?? FALLBACK_INCLINATION_DEG;

    // ── Derive hoursToTca from TCA timestamp ───────────────────────────────
    const nowMs = Date.now();
    const tcaMs = new Date(event.tca).getTime();
    const hoursToTca = Math.max((tcaMs - nowMs) / (1000 * 3600), 0.01);

    // ── Miss distances ─────────────────────────────────────────────────────
    // latestMissDistance is stored in km in CDMRecord (MIN_RNG field) but
    // ConjunctionEvent.latestMissDistance is Float — units follow CDM (km).
    // Convert km → metres for the calculator.
    const currentMissDistanceM = event.latestMissDistance * 1000;
    const targetMissDistanceM = Math.max(
      currentMissDistanceM,
      DEFAULT_TARGET_MISS_DISTANCE_M,
    );

    // ── Run calculator ─────────────────────────────────────────────────────
    const result = calculateManeuver({
      altitudeKm,
      inclinationDeg,
      currentMissDistanceM,
      targetMissDistanceM,
      hoursToTca,
      collisionProbability: event.latestPc,
    });

    return NextResponse.json({
      data: {
        eventId: event.id,
        ...result,
        // Surface the inputs used so the client can display them
        inputs: {
          altitudeKm,
          inclinationDeg,
          currentMissDistanceM,
          targetMissDistanceM,
          hoursToTca,
          collisionProbability: event.latestPc,
        },
      },
    });
  } catch (error) {
    logger.error("Failed to calculate maneuver", error);
    return NextResponse.json(
      { error: "Failed to calculate maneuver" },
      { status: 500 },
    );
  }
}
