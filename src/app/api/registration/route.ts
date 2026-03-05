/**
 * URSO Registration API
 * GET - List registrations
 * POST - Create new registration
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getSafeErrorMessage } from "@/lib/validations";
import type { SpaceObjectType, OrbitalRegime } from "@prisma/client";
import {
  createRegistration,
  listRegistrations,
  type CreateRegistrationInput,
} from "@/lib/services/registration-service";
import { logger } from "@/lib/logger";

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
    logger.error("Error listing registrations", error);
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

    const postSchema = z
      .object({
        organizationId: z.string().min(1, "organizationId is required"),
        spacecraftId: z.string().min(1, "spacecraftId is required"),
        objectName: z.string().min(1, "objectName is required"),
        objectType: z.string().min(1, "objectType is required"),
        ownerOperator: z.string().min(1, "ownerOperator is required"),
        stateOfRegistry: z.string().min(1, "stateOfRegistry is required"),
        orbitalRegime: z.string().min(1, "orbitalRegime is required"),
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
      })
      .passthrough();

    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const {
      organizationId,
      spacecraftId,
      objectName,
      objectType,
      ownerOperator,
      stateOfRegistry,
      orbitalRegime,
      ...optionalFields
    } = parsed.data;

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

    const input = {
      organizationId,
      spacecraftId,
      createdBy: session.user.id,
      objectName,
      objectType: objectType as SpaceObjectType,
      ownerOperator,
      stateOfRegistry,
      orbitalRegime: orbitalRegime as OrbitalRegime,
      ...optionalFields,
    } as CreateRegistrationInput;

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
    logger.error("Error creating registration", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to create registration") },
      { status: 500 },
    );
  }
}
