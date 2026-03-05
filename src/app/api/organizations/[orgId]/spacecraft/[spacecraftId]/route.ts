/**
 * Spacecraft Detail API
 * GET: Get spacecraft details
 * PATCH: Update spacecraft
 * DELETE: Delete spacecraft
 */

import { z } from "zod";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getSafeErrorMessage } from "@/lib/validations";
import { verifyOrganizationAccess } from "@/lib/middleware/organization-guard";
import {
  getSpacecraft,
  updateSpacecraft,
  deleteSpacecraft,
  updateSpacecraftStatus,
  canTransitionStatus,
  STATUS_CONFIG,
} from "@/lib/services/spacecraft-service";
import type { SpacecraftStatus } from "@prisma/client";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ orgId: string; spacecraftId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, spacecraftId } = await params;

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

    const spacecraft = await getSpacecraft(spacecraftId, orgId);

    if (!spacecraft) {
      return NextResponse.json(
        { error: "Spacecraft not found" },
        { status: 404 },
      );
    }

    // Include available status transitions
    const availableTransitions = (
      Object.keys(STATUS_CONFIG) as SpacecraftStatus[]
    ).filter((status) => canTransitionStatus(spacecraft.status, status));

    return NextResponse.json({
      spacecraft,
      availableTransitions,
    });
  } catch (error) {
    logger.error("Error fetching spacecraft", error);
    return NextResponse.json(
      { error: "Failed to fetch spacecraft" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, spacecraftId } = await params;

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

    const updateSpacecraftSchema = z.object({
      name: z.string().min(2).optional(),
      cosparId: z.string().optional(),
      noradId: z.string().optional(),
      missionType: z
        .enum([
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
        ])
        .optional(),
      launchDate: z.string().optional(),
      endOfLifeDate: z.string().optional(),
      orbitType: z
        .enum([
          "LEO",
          "MEO",
          "GEO",
          "HEO",
          "SSO",
          "polar",
          "cislunar",
          "deep_space",
          "other",
        ])
        .optional(),
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
    const parsed = updateSpacecraftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    // Check if this is just a status update
    if (parsed.data.status && Object.keys(parsed.data).length === 1) {
      const spacecraft = await updateSpacecraftStatus(
        spacecraftId,
        orgId,
        parsed.data.status,
        session.user.id,
      );

      return NextResponse.json({
        spacecraft,
        message: "Spacecraft status updated successfully",
      });
    }

    // Full update
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

    const spacecraft = await updateSpacecraft(
      spacecraftId,
      orgId,
      {
        name,
        cosparId,
        noradId,
        missionType,
        launchDate: launchDate ? new Date(launchDate) : undefined,
        endOfLifeDate: endOfLifeDate ? new Date(endOfLifeDate) : undefined,
        orbitType,
        altitudeKm:
          altitudeKm !== undefined ? parseFloat(String(altitudeKm)) : undefined,
        inclinationDeg:
          inclinationDeg !== undefined
            ? parseFloat(String(inclinationDeg))
            : undefined,
        status,
        description,
        metadata,
      },
      session.user.id,
    );

    return NextResponse.json({
      spacecraft,
      message: "Spacecraft updated successfully",
    });
  } catch (error) {
    logger.error("Error updating spacecraft", error);
    const message = getSafeErrorMessage(error, "Failed to update spacecraft");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, spacecraftId } = await params;

    // Verify access
    const access = await verifyOrganizationAccess(orgId, session.user.id, {
      requiredPermissions: ["spacecraft:delete"],
    });

    if (!access.success) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }

    await deleteSpacecraft(spacecraftId, orgId, session.user.id);

    return NextResponse.json({
      message: "Spacecraft deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting spacecraft", error);
    const message = getSafeErrorMessage(error, "Failed to delete spacecraft");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
