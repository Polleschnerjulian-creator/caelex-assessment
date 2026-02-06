/**
 * URSO Registration Service
 * Handles space object registration for UN Registry of Space Objects
 */

import { prisma } from "@/lib/prisma";
import type {
  SpaceObjectRegistration,
  SpaceObjectType,
  OrbitalRegime,
  RegistrationStatus,
  Prisma,
} from "@prisma/client";

// ─── Types ───

export interface CreateRegistrationInput {
  organizationId: string;
  spacecraftId: string;
  createdBy: string;

  // Basic Info
  objectName: string;
  objectType: SpaceObjectType;
  ownerOperator: string;
  stateOfRegistry: string;

  // Optional fields
  internationalDesignator?: string;
  noradCatalogNumber?: string;
  launchDate?: Date;
  launchSite?: string;
  launchVehicle?: string;
  launchState?: string;
  orbitalRegime: OrbitalRegime;
  perigee?: number;
  apogee?: number;
  inclination?: number;
  period?: number;
  nodeLongitude?: number;
  jurisdictionState?: string;
  generalFunction?: string;
}

export interface UpdateRegistrationInput {
  objectName?: string;
  objectType?: SpaceObjectType;
  ownerOperator?: string;
  stateOfRegistry?: string;
  internationalDesignator?: string;
  noradCatalogNumber?: string;
  launchDate?: Date | null;
  launchSite?: string;
  launchVehicle?: string;
  launchState?: string;
  orbitalRegime?: OrbitalRegime;
  perigee?: number | null;
  apogee?: number | null;
  inclination?: number | null;
  period?: number | null;
  nodeLongitude?: number | null;
  jurisdictionState?: string;
  generalFunction?: string;
}

export interface SubmissionResult {
  success: boolean;
  registrationId: string;
  submittedAt: Date;
  ncaReference?: string;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface COSPARSuggestion {
  suggestedId: string;
  launchYear: number;
  launchNumber: number;
  sequence: string;
}

// ─── CRUD Operations ───

export async function createRegistration(
  input: CreateRegistrationInput,
): Promise<SpaceObjectRegistration> {
  const registration = await prisma.spaceObjectRegistration.create({
    data: {
      organizationId: input.organizationId,
      spacecraftId: input.spacecraftId,
      createdBy: input.createdBy,
      objectName: input.objectName,
      objectType: input.objectType,
      ownerOperator: input.ownerOperator,
      stateOfRegistry: input.stateOfRegistry,
      orbitalRegime: input.orbitalRegime,
      internationalDesignator: input.internationalDesignator,
      noradCatalogNumber: input.noradCatalogNumber,
      launchDate: input.launchDate,
      launchSite: input.launchSite,
      launchVehicle: input.launchVehicle,
      launchState: input.launchState,
      perigee: input.perigee,
      apogee: input.apogee,
      inclination: input.inclination,
      period: input.period,
      nodeLongitude: input.nodeLongitude,
      jurisdictionState: input.jurisdictionState,
      generalFunction: input.generalFunction,
      status: "DRAFT",
    },
    include: {
      spacecraft: true,
      organization: true,
    },
  });

  // Create initial status history entry
  await prisma.registrationStatusHistory.create({
    data: {
      registrationId: registration.id,
      toStatus: "DRAFT",
      changedBy: input.createdBy,
      reason: "Registration created",
    },
  });

  return registration;
}

export async function getRegistration(
  id: string,
  organizationId: string,
): Promise<SpaceObjectRegistration | null> {
  return prisma.spaceObjectRegistration.findFirst({
    where: {
      id,
      organizationId,
    },
    include: {
      spacecraft: true,
      organization: true,
      statusHistory: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      attachments: true,
    },
  });
}

export async function listRegistrations(
  organizationId: string,
  options?: {
    status?: RegistrationStatus;
    spacecraftId?: string;
    page?: number;
    pageSize?: number;
  },
): Promise<{ registrations: SpaceObjectRegistration[]; total: number }> {
  const page = options?.page || 1;
  const pageSize = options?.pageSize || 20;

  const where: Prisma.SpaceObjectRegistrationWhereInput = {
    organizationId,
  };

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.spacecraftId) {
    where.spacecraftId = options.spacecraftId;
  }

  const [registrations, total] = await Promise.all([
    prisma.spaceObjectRegistration.findMany({
      where,
      include: {
        spacecraft: {
          select: {
            id: true,
            name: true,
            cosparId: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.spaceObjectRegistration.count({ where }),
  ]);

  return { registrations, total };
}

export async function updateRegistration(
  id: string,
  organizationId: string,
  input: UpdateRegistrationInput,
  updatedBy: string,
): Promise<SpaceObjectRegistration> {
  // Verify ownership
  const existing = await prisma.spaceObjectRegistration.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    throw new Error("Registration not found");
  }

  // Only allow updates in DRAFT or AMENDMENT_REQUIRED status
  if (!["DRAFT", "AMENDMENT_REQUIRED"].includes(existing.status)) {
    throw new Error(
      `Cannot update registration in ${existing.status} status. Only DRAFT or AMENDMENT_REQUIRED registrations can be modified.`,
    );
  }

  const registration = await prisma.spaceObjectRegistration.update({
    where: { id },
    data: {
      ...input,
      lastAmendmentDate: new Date(),
    },
    include: {
      spacecraft: true,
      organization: true,
    },
  });

  return registration;
}

export async function deleteRegistration(
  id: string,
  organizationId: string,
): Promise<void> {
  // Verify ownership
  const existing = await prisma.spaceObjectRegistration.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    throw new Error("Registration not found");
  }

  // Only allow deletion of DRAFT registrations
  if (existing.status !== "DRAFT") {
    throw new Error("Only draft registrations can be deleted");
  }

  await prisma.spaceObjectRegistration.delete({
    where: { id },
  });
}

// ─── Business Logic ───

export async function submitToURSO(
  id: string,
  organizationId: string,
  submittedBy: string,
): Promise<SubmissionResult> {
  // Get registration
  const registration = await prisma.spaceObjectRegistration.findFirst({
    where: { id, organizationId },
    include: {
      spacecraft: true,
      organization: true,
    },
  });

  if (!registration) {
    return {
      success: false,
      registrationId: id,
      submittedAt: new Date(),
      error: "Registration not found",
    };
  }

  // Validate before submission
  const validation = validateRegistrationData(registration);
  if (!validation.valid) {
    return {
      success: false,
      registrationId: id,
      submittedAt: new Date(),
      error: `Validation failed: ${validation.errors.join(", ")}`,
    };
  }

  // Update status to SUBMITTED
  const submittedAt = new Date();
  await prisma.spaceObjectRegistration.update({
    where: { id },
    data: {
      status: "SUBMITTED",
      submittedAt,
      submittedBy,
    },
  });

  // Create status history entry
  await prisma.registrationStatusHistory.create({
    data: {
      registrationId: id,
      fromStatus: registration.status,
      toStatus: "SUBMITTED",
      changedBy: submittedBy,
      reason: "Submitted for URSO registration",
    },
  });

  // Generate NCA reference (in production, this would come from actual submission)
  const ncaReference = `NCA-${registration.stateOfRegistry.toUpperCase()}-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  await prisma.spaceObjectRegistration.update({
    where: { id },
    data: { ncaReference },
  });

  return {
    success: true,
    registrationId: id,
    submittedAt,
    ncaReference,
  };
}

export function validateRegistrationData(
  input: Partial<SpaceObjectRegistration>,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!input.objectName) errors.push("Object name is required");
  if (!input.objectType) errors.push("Object type is required");
  if (!input.ownerOperator) errors.push("Owner/Operator is required");
  if (!input.stateOfRegistry) errors.push("State of registry is required");
  if (!input.orbitalRegime) errors.push("Orbital regime is required");

  // Launch info validation
  if (input.launchDate && input.launchDate > new Date()) {
    warnings.push("Launch date is in the future");
  }

  // Orbital parameters validation
  if (
    input.perigee !== null &&
    input.apogee !== null &&
    input.perigee &&
    input.apogee
  ) {
    if (input.perigee > input.apogee) {
      errors.push("Perigee cannot be greater than apogee");
    }
  }

  if (input.inclination !== null && input.inclination !== undefined) {
    if (input.inclination < 0 || input.inclination > 180) {
      errors.push("Inclination must be between 0 and 180 degrees");
    }
  }

  // GEO-specific validation
  if (input.orbitalRegime === "GEO") {
    if (!input.nodeLongitude) {
      warnings.push("Longitude is recommended for GEO objects");
    }
    if (input.perigee && (input.perigee < 35000 || input.perigee > 36500)) {
      warnings.push("Perigee outside typical GEO range (35,000-36,500 km)");
    }
  }

  // COSPAR ID validation
  if (input.internationalDesignator) {
    const cosparPattern = /^\d{4}-\d{3}[A-Z]{1,3}$/;
    if (!cosparPattern.test(input.internationalDesignator)) {
      errors.push(
        "Invalid COSPAR ID format. Expected: YYYY-NNNXXX (e.g., 2025-042A)",
      );
    }
  }

  // NORAD ID validation
  if (input.noradCatalogNumber) {
    const noradPattern = /^\d{1,5}$/;
    if (!noradPattern.test(input.noradCatalogNumber)) {
      errors.push("Invalid NORAD catalog number. Expected: 1-5 digit number");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function generateCOSPARSuggestion(
  launchYear: number,
  launchNumber?: number,
  sequence?: string,
): COSPARSuggestion {
  // Default to next available number (in production, query existing registrations)
  const suggestedLaunchNumber =
    launchNumber || Math.floor(Math.random() * 100) + 1;
  const suggestedSequence = sequence || "A";

  const paddedLaunchNumber = suggestedLaunchNumber.toString().padStart(3, "0");
  const suggestedId = `${launchYear}-${paddedLaunchNumber}${suggestedSequence}`;

  return {
    suggestedId,
    launchYear,
    launchNumber: suggestedLaunchNumber,
    sequence: suggestedSequence,
  };
}

export async function checkDuplicateRegistration(params: {
  organizationId: string;
  internationalDesignator?: string;
  noradCatalogNumber?: string;
  objectName?: string;
}): Promise<{ isDuplicate: boolean; existingId?: string }> {
  const where: Prisma.SpaceObjectRegistrationWhereInput = {
    organizationId: params.organizationId,
    OR: [],
  };

  if (params.internationalDesignator) {
    (where.OR as Prisma.SpaceObjectRegistrationWhereInput[]).push({
      internationalDesignator: params.internationalDesignator,
    });
  }

  if (params.noradCatalogNumber) {
    (where.OR as Prisma.SpaceObjectRegistrationWhereInput[]).push({
      noradCatalogNumber: params.noradCatalogNumber,
    });
  }

  if (params.objectName) {
    (where.OR as Prisma.SpaceObjectRegistrationWhereInput[]).push({
      objectName: { equals: params.objectName, mode: "insensitive" },
    });
  }

  // Only check if we have something to search for
  if (!(where.OR as Prisma.SpaceObjectRegistrationWhereInput[]).length) {
    return { isDuplicate: false };
  }

  const existing = await prisma.spaceObjectRegistration.findFirst({
    where,
    select: { id: true },
  });

  return {
    isDuplicate: !!existing,
    existingId: existing?.id,
  };
}

// ─── Export Functions ───

export async function exportForUNOOSA(organizationId: string): Promise<string> {
  const registrations = await prisma.spaceObjectRegistration.findMany({
    where: {
      organizationId,
      status: { in: ["SUBMITTED", "REGISTERED"] },
    },
    include: {
      spacecraft: true,
    },
    orderBy: { submittedAt: "desc" },
  });

  // Generate CSV
  const headers = [
    "International Designator",
    "NORAD Number",
    "Object Name",
    "Object Type",
    "State of Registry",
    "Launch Date",
    "Launch Site",
    "Launch Vehicle",
    "Orbital Regime",
    "Perigee (km)",
    "Apogee (km)",
    "Inclination (deg)",
    "Period (min)",
    "Owner/Operator",
    "General Function",
    "Status",
    "Registered Date",
    "URSO Reference",
  ].join(",");

  const rows = registrations.map((r) =>
    [
      r.internationalDesignator || "",
      r.noradCatalogNumber || "",
      `"${r.objectName.replace(/"/g, '""')}"`,
      r.objectType,
      r.stateOfRegistry,
      r.launchDate?.toISOString().split("T")[0] || "",
      r.launchSite || "",
      r.launchVehicle || "",
      r.orbitalRegime,
      r.perigee?.toString() || "",
      r.apogee?.toString() || "",
      r.inclination?.toString() || "",
      r.period?.toString() || "",
      `"${r.ownerOperator.replace(/"/g, '""')}"`,
      r.generalFunction ? `"${r.generalFunction.replace(/"/g, '""')}"` : "",
      r.status,
      r.registeredAt?.toISOString().split("T")[0] || "",
      r.ursoReference || "",
    ].join(","),
  );

  return [headers, ...rows].join("\n");
}

// ─── Status Management ───

export async function updateRegistrationStatus(
  id: string,
  organizationId: string,
  newStatus: RegistrationStatus,
  changedBy: string,
  reason?: string,
): Promise<SpaceObjectRegistration> {
  const registration = await prisma.spaceObjectRegistration.findFirst({
    where: { id, organizationId },
  });

  if (!registration) {
    throw new Error("Registration not found");
  }

  // Create status history entry
  await prisma.registrationStatusHistory.create({
    data: {
      registrationId: id,
      fromStatus: registration.status,
      toStatus: newStatus,
      changedBy,
      reason,
    },
  });

  // Update additional fields based on status
  const updateData: Prisma.SpaceObjectRegistrationUpdateInput = {
    status: newStatus,
  };

  if (newStatus === "REGISTERED") {
    updateData.registeredAt = new Date();
    // Generate URSO reference if not present
    if (!registration.ursoReference) {
      updateData.ursoReference = `URSO/${registration.stateOfRegistry}/${new Date().getFullYear()}/${Math.floor(Math.random() * 10000)}`;
    }
  }

  if (newStatus === "DEREGISTERED") {
    updateData.deregisteredAt = new Date();
  }

  return prisma.spaceObjectRegistration.update({
    where: { id },
    data: updateData,
    include: {
      spacecraft: true,
      organization: true,
    },
  });
}
