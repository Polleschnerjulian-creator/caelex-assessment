/**
 * URSO Registration API
 * GET - List registrations
 * POST - Create new registration
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSafeErrorMessage } from "@/lib/validations";
import {
  createRegistration,
  listRegistrations,
  type CreateRegistrationInput,
} from "@/lib/services/registration-service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const status = searchParams.get("status") as
      | "DRAFT"
      | "PENDING_SUBMISSION"
      | "SUBMITTED"
      | "UNDER_REVIEW"
      | "REGISTERED"
      | "AMENDMENT_REQUIRED"
      | "AMENDMENT_PENDING"
      | "DEREGISTERED"
      | "REJECTED"
      | null;
    const spacecraftId = searchParams.get("spacecraftId");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

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

    const result = await listRegistrations(organizationId, {
      status: status || undefined,
      spacecraftId: spacecraftId || undefined,
      page,
      pageSize,
    });

    return NextResponse.json({
      registrations: result.registrations,
      pagination: {
        page,
        pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / pageSize),
      },
    });
  } catch (error) {
    console.error("Error listing registrations:", error);
    return NextResponse.json(
      { error: "Failed to list registrations" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      organizationId,
      spacecraftId,
      objectName,
      objectType,
      ownerOperator,
      stateOfRegistry,
      orbitalRegime,
      ...optionalFields
    } = body;

    // Validate required fields
    if (
      !organizationId ||
      !spacecraftId ||
      !objectName ||
      !objectType ||
      !ownerOperator ||
      !stateOfRegistry ||
      !orbitalRegime
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    // Verify spacecraft belongs to organization
    const spacecraft = await prisma.spacecraft.findFirst({
      where: {
        id: spacecraftId,
        organizationId,
      },
    });

    if (!spacecraft) {
      return NextResponse.json(
        { error: "Spacecraft not found in organization" },
        { status: 404 },
      );
    }

    const input: CreateRegistrationInput = {
      organizationId,
      spacecraftId,
      createdBy: session.user.id,
      objectName,
      objectType,
      ownerOperator,
      stateOfRegistry,
      orbitalRegime,
      ...optionalFields,
    };

    const registration = await createRegistration(input);

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "registration_created",
        entityType: "registration",
        entityId: registration.id,
        newValue: JSON.stringify({
          objectName,
          objectType,
          stateOfRegistry,
        }),
        description: `Created URSO registration for ${objectName}`,
      },
    });

    return NextResponse.json({
      success: true,
      registration,
    });
  } catch (error) {
    console.error("Error creating registration:", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to create registration") },
      { status: 500 },
    );
  }
}
