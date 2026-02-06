/**
 * Spacecraft Detail API
 * GET: Get spacecraft details
 * PATCH: Update spacecraft
 * DELETE: Delete spacecraft
 */

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
    console.error("Error fetching spacecraft:", error);
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

    const body = await request.json();

    // Check if this is just a status update
    if (body.status && Object.keys(body).length === 1) {
      const spacecraft = await updateSpacecraftStatus(
        spacecraftId,
        orgId,
        body.status,
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
    } = body;

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
          altitudeKm !== undefined ? parseFloat(altitudeKm) : undefined,
        inclinationDeg:
          inclinationDeg !== undefined ? parseFloat(inclinationDeg) : undefined,
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
    console.error("Error updating spacecraft:", error);
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
    console.error("Error deleting spacecraft:", error);
    const message = getSafeErrorMessage(error, "Failed to delete spacecraft");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
