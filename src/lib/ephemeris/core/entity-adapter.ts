// ═══════════════════════════════════════════════════════════════════════════════
// EPHEMERIS — Spacecraft ↔ OperatorEntity Adapter
//
// Converts between the existing Spacecraft Prisma model and the generic
// OperatorEntityInput type, enabling the engine to work with the generic
// entity model while maintaining full backward compatibility.
// ═══════════════════════════════════════════════════════════════════════════════

import type { Spacecraft } from "@prisma/client";
import type { OperatorEntityInput } from "./types";

/**
 * Convert a Prisma Spacecraft to an OperatorEntityInput.
 * Maps spacecraft-specific fields into the generic entity structure.
 */
export function spacecraftToEntity(
  spacecraft: Spacecraft,
): OperatorEntityInput {
  return {
    id: spacecraft.id,
    organizationId: spacecraft.organizationId,
    operatorType: "SCO",
    name: spacecraft.name,
    identifiers: {
      type: "SCO",
      noradId: spacecraft.noradId ?? undefined,
      cosparId: spacecraft.cosparId ?? undefined,
    },
    metadata: {
      type: "SCO",
      altitudeKm: spacecraft.altitudeKm ?? undefined,
      inclinationDeg: spacecraft.inclinationDeg ?? undefined,
      orbitType: spacecraft.orbitType ?? undefined,
      launchDate: spacecraft.launchDate ?? undefined,
      missionType: spacecraft.missionType ?? undefined,
    },
    jurisdictions: [],
    status:
      spacecraft.status === "OPERATIONAL" || spacecraft.status === "LAUNCHED"
        ? "ACTIVE"
        : spacecraft.status === "PRE_LAUNCH"
          ? "PLANNED"
          : "DECOMMISSIONED",
  };
}

/**
 * Extracts the noradId from an OperatorEntityInput, if it's an SCO type.
 */
export function getNoradId(entity: OperatorEntityInput): string | undefined {
  if (entity.operatorType === "SCO") {
    return entity.identifiers.noradId;
  }
  return undefined;
}

/**
 * Gets the entity display identifier (what to show in UI/logs).
 */
export function getEntityDisplayId(entity: OperatorEntityInput): string {
  switch (entity.operatorType) {
    case "SCO":
      return entity.identifiers.noradId ?? entity.id;
    case "LO":
      return entity.identifiers.vehicleId ?? entity.id;
    case "LSO":
      return entity.identifiers.facilityId ?? entity.id;
    case "ISOS":
      return entity.identifiers.missionId ?? entity.id;
    case "CAP":
      return entity.identifiers.serviceId ?? entity.id;
    case "PDP":
      return entity.identifiers.systemId ?? entity.id;
    case "TCO":
      return entity.identifiers.facilityId ?? entity.id;
    default:
      return entity.id;
  }
}
