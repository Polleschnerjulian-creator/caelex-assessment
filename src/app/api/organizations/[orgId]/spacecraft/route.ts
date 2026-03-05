/**
 * Organization Spacecraft API
 * GET: List spacecraft for organization
 * POST: Create new spacecraft
 */

import { z } from "zod";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getSafeErrorMessage, parsePaginationLimit } from "@/lib/validations";
import { verifyOrganizationAccess } from "@/lib/middleware/organization-guard";
import {
  getSpacecraftList,
  createSpacecraft,
  getSpacecraftStats,
  MISSION_TYPES,
  ORBIT_TYPES,
} from "@/lib/services/spacecraft-service";
import type { SpacecraftStatus } from "@prisma/client";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await params;

    // Verify access
    const access = await verifyOrganizationAccess(orgId, session.user.id, {
      requiredPermissions: ["spacecraft:read"],
    });

    if (!access.success) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get("status") as SpacecraftStatus | null;
    const orbitType = url.searchParams.get("orbitType");
    const missionType = url.searchParams.get("missionType");
    const search = url.searchParams.get("search");
    const limit = parsePaginationLimit(url.searchParams.get("limit"));
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const includeStats = url.searchParams.get("stats") === "true";

    // Get spacecraft list
    const { spacecraft, total } = await getSpacecraftList(
      orgId,
      {
        status: status || undefined,
        orbitType: orbitType || undefined,
        missionType: missionType || undefined,
        search: search || undefined,
      },
      { limit, offset },
    );

    // Optionally include stats
    let stats = null;
    if (includeStats) {
      stats = await getSpacecraftStats(orgId);
    }

    return NextResponse.json({
      spacecraft,
      total,
      limit,
      offset,
      stats,
      // Include filter options for UI
      filterOptions: {
        missionTypes: MISSION_TYPES,
        orbitTypes: ORBIT_TYPES,
      },
    });
  } catch (error) {
    logger.error("Error fetching spacecraft", error);
    return NextResponse.json(
      { error: "Failed to fetch spacecraft" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await params;

    // Verify access
    const access = await verifyOrganizationAccess(orgId, session.user.id, {
      requiredPermissions: ["spacecraft:write"],
    });

    if (!access.success) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }

    const createSpacecraftSchema = z.object({
      name: z.string().min(2, "Spacecraft name must be at least 2 characters"),
      cosparId: z.string().optional(),
      noradId: z.string().optional(),
      missionType: z.enum(
        [
          "communication",
          "earth_observation",
          "navigation",
          "scientific",
          "technology_demonstration",
          "weather",
          "military",
          "commercial",
          "space_station",
          "debris_removal",
          "in_orbit_servicing",
          "other",
        ],
        { message: "Mission type is required" },
      ),
      launchDate: z.string().optional(),
      endOfLifeDate: z.string().optional(),
      orbitType: z.enum(
        [
          "LEO",
          "MEO",
          "GEO",
          "HEO",
          "SSO",
          "polar",
          "cislunar",
          "deep_space",
          "other",
        ],
        { message: "Orbit type is required" },
      ),
      altitudeKm: z.union([z.string(), z.number()]).optional(),
      inclinationDeg: z.union([z.string(), z.number()]).optional(),
      status: z
        .enum([
          "PRE_LAUNCH",
          "LAUNCHED",
          "OPERATIONAL",
          "DECOMMISSIONING",
          "DEORBITED",
          "LOST",
        ])
        .optional(),
      description: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    });

    const body = await request.json();
    const parsed = createSpacecraftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const {
      name,
      cosparId,
      noradId,
      missionType,
      launchDate,
      endOfLifeDate,
      orbitType,
      altitudeKm,
      inclinationDeg,
      status,
      description,
      metadata,
    } = parsed.data;

    const spacecraft = await createSpacecraft(
      {
        organizationId: orgId,
        name: name.trim(),
        cosparId: cosparId || undefined,
        noradId: noradId || undefined,
        missionType,
        launchDate: launchDate ? new Date(launchDate) : undefined,
        endOfLifeDate: endOfLifeDate ? new Date(endOfLifeDate) : undefined,
        orbitType,
        altitudeKm: altitudeKm ? parseFloat(String(altitudeKm)) : undefined,
        inclinationDeg: inclinationDeg
          ? parseFloat(String(inclinationDeg))
          : undefined,
        status: status || "PRE_LAUNCH",
        description,
        metadata,
      },
      session.user.id,
    );

    return NextResponse.json({
      spacecraft,
      message: "Spacecraft created successfully",
    });
  } catch (error) {
    logger.error("Error creating spacecraft", error);
    const message = getSafeErrorMessage(error, "Failed to create spacecraft");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
