/**
 * Organization Spacecraft API
 * GET: List spacecraft for organization
 * POST: Create new spacecraft
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getSafeErrorMessage } from "@/lib/validations";
import { verifyOrganizationAccess } from "@/lib/middleware/organization-guard";
import {
  getSpacecraftList,
  createSpacecraft,
  getSpacecraftStats,
  MISSION_TYPES,
  ORBIT_TYPES,
} from "@/lib/services/spacecraft-service";
import type { SpacecraftStatus } from "@prisma/client";

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
    const limit = parseInt(url.searchParams.get("limit") || "50");
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
    console.error("Error fetching spacecraft:", error);
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

    const body = await request.json();
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
    } = body;

    // Validation
    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Spacecraft name must be at least 2 characters" },
        { status: 400 },
      );
    }

    if (!missionType) {
      return NextResponse.json(
        { error: "Mission type is required" },
        { status: 400 },
      );
    }

    if (!orbitType) {
      return NextResponse.json(
        { error: "Orbit type is required" },
        { status: 400 },
      );
    }

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
        altitudeKm: altitudeKm ? parseFloat(altitudeKm) : undefined,
        inclinationDeg: inclinationDeg ? parseFloat(inclinationDeg) : undefined,
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
    console.error("Error creating spacecraft:", error);
    const message = getSafeErrorMessage(error, "Failed to create spacecraft");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
