/**
 * Single Registration API
 * GET - Get registration details
 * PATCH - Update registration
 * DELETE - Delete registration
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getSafeErrorMessage } from "@/lib/validations";
import {
  getRegistration,
  updateRegistration,
  deleteRegistration,
  validateRegistrationData,
} from "@/lib/services/registration-service";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    // Verify user has access to organization
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const registration = await getRegistration(id, organizationId);

    if (!registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 },
      );
    }

    // Validate current data
    const validation = validateRegistrationData(registration);

    return NextResponse.json({
      registration,
      validation,
    });
  } catch (error) {
    logger.error("Error fetching registration", error);
    return NextResponse.json(
      { error: "Failed to fetch registration" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const patchSchema = z.object({
      organizationId: z.string().min(1, "Organization ID is required"),
      objectName: z.string().optional(),
      objectType: z.string().optional(),
      cosparId: z.string().optional(),
      noradId: z.string().optional(),
      orbitType: z.string().optional(),
      launchDate: z.string().optional(),
      launchState: z.string().optional(),
      launchSite: z.string().optional(),
      operatingEntity: z.string().optional(),
      ownerCountry: z.string().optional(),
      nodeName: z.string().optional(),
      registrationDate: z.string().optional(),
      notes: z.string().optional(),
    });

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { organizationId, ...allowedData } = parsed.data;

    // Verify user has access to organization
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Build update data from validated fields (excluding organizationId)
    const updateData: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(allowedData)) {
      if (value !== undefined) {
        updateData[field] = value;
      }
    }

    const registration = await updateRegistration(
      id,
      organizationId,
      updateData,
      session.user.id,
    );

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "registration_updated",
        entityType: "registration",
        entityId: id,
        newValue: JSON.stringify(updateData),
        description: `Updated URSO registration for ${registration.objectName}`,
      },
    });

    return NextResponse.json({
      success: true,
      registration,
    });
  } catch (error) {
    logger.error("Error updating registration", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to update registration") },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    // Verify user has access to organization
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await deleteRegistration(id, organizationId);

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "registration_deleted",
        entityType: "registration",
        entityId: id,
        description: "Deleted URSO registration",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting registration", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to delete registration") },
      { status: 500 },
    );
  }
}
