import "server-only";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { AssetType } from "@prisma/client";

// ═══════════════════════════════════════════════════════════
// NEXUS ↔ CRA — Assessment-to-Asset Link
// ═══════════════════════════════════════════════════════════

/**
 * Map CRA space product type IDs to NEXUS asset types.
 *
 * When a CRA Assessment is created for a known space product type, this mapping
 * identifies which NEXUS asset types are relevant so the assessment can be
 * cross-referenced with the org's asset register.
 */
const CRA_TO_NEXUS_MAP: Record<string, AssetType[]> = {
  obc: ["FLIGHT_SOFTWARE"],
  aocs_flight_sw: ["FLIGHT_SOFTWARE"],
  ttc_ground_system: ["GROUND_STATION", "TTC_UPLINK", "TTC_DOWNLINK"],
  mission_control_sw: ["GROUND_SOFTWARE"],
  satellite_c2: ["GROUND_SOFTWARE"],
  hsm_space: ["FLIGHT_SOFTWARE"],
  sdr: ["INTER_SATELLITE_LINK"],
  gnss_receiver: ["INTER_SATELLITE_LINK"],
  ground_station_sw: ["GROUND_SOFTWARE"],
  data_handling_unit: ["DATA_PROCESSING"],
  intersatellite_link: ["INTER_SATELLITE_LINK"],
  flight_software: ["FLIGHT_SOFTWARE"],
  payload_processor: ["PAYLOAD"],
  ground_network_infra: ["GROUND_STATION"],
  key_management_sw: ["GROUND_SOFTWARE"],
  star_tracker: ["PAYLOAD"],
  reaction_wheel: ["PAYLOAD"],
  solar_array_driver: ["PAYLOAD"],
  ground_monitoring_tool: ["GROUND_SOFTWARE"],
};

/**
 * Link a CRA Assessment to the most relevant NEXUS asset.
 *
 * Looks up the org's NEXUS assets by type (derived from the CRA product type),
 * attempts name-based matching, and stores a ComplianceEvidence cross-reference
 * so the relationship is discoverable from both modules.
 */
export async function linkCRAAssessmentToNexus(
  craAssessmentId: string,
  spaceProductTypeId: string | null,
  productName: string,
  organizationId: string,
): Promise<{ linkedAssetId: string | null }> {
  if (!spaceProductTypeId || !organizationId) return { linkedAssetId: null };

  const nexusTypes = CRA_TO_NEXUS_MAP[spaceProductTypeId];
  if (!nexusTypes) return { linkedAssetId: null };

  // Find matching NEXUS asset by type + name similarity
  const candidates = await prisma.asset.findMany({
    where: {
      organizationId,
      assetType: { in: nexusTypes },
      isDeleted: false,
    },
    select: { id: true, name: true, assetType: true },
  });

  if (candidates.length === 0) return { linkedAssetId: null };

  // Try to match by product name similarity
  const productLower = productName.toLowerCase();
  const match =
    candidates.find(
      (a) =>
        a.name.toLowerCase().includes(productLower) ||
        productLower.includes(a.name.toLowerCase().split(" — ").pop() || ""),
    ) || candidates[0]; // Fallback to first candidate of matching type

  // Create a cross-reference via ComplianceEvidence
  await prisma.complianceEvidence.create({
    data: {
      organizationId,
      createdBy: "system",
      regulationType: "CYBERSECURITY",
      requirementId: `cra-nexus-link-${craAssessmentId}`,
      title: `CRA Assessment linked to NEXUS Asset: ${match.name}`,
      description: `CRA product "${productName}" (${spaceProductTypeId}) automatically linked to NEXUS asset "${match.name}" (${match.assetType}).`,
      evidenceType: "OTHER",
      status: "ACCEPTED",
      sourceType: "AUTOMATED",
      confidence: 0.8,
    },
  });

  logger.info(
    `[CRA→NEXUS] Linked CRA assessment ${craAssessmentId} to NEXUS asset ${match.id} (${match.name})`,
  );

  return { linkedAssetId: match.id };
}
