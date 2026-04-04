import "server-only";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { getCategoryForType, getAssetTypeConfig } from "../types";
import type {
  AssetType,
  AssetCriticality,
  AssetOperationalStatus,
} from "@prisma/client";

// ═══════════════════════════════════════════════════════════
// NEXUS ↔ Spacecraft — Auto-Create Assets on Registration
// ═══════════════════════════════════════════════════════════

// Standard assets per spacecraft — every satellite needs these
const STANDARD_ASSETS: Array<{
  suffix: string;
  name: string;
  assetType: AssetType;
  criticality: AssetCriticality;
}> = [
  {
    suffix: "OBC",
    name: "On-board Computer",
    assetType: "FLIGHT_SOFTWARE",
    criticality: "CRITICAL",
  },
  {
    suffix: "AOCS",
    name: "AOCS Flight Software",
    assetType: "FLIGHT_SOFTWARE",
    criticality: "CRITICAL",
  },
  {
    suffix: "TTC-UP",
    name: "TT&C Uplink",
    assetType: "TTC_UPLINK",
    criticality: "CRITICAL",
  },
  {
    suffix: "TTC-DN",
    name: "TT&C Downlink",
    assetType: "TTC_DOWNLINK",
    criticality: "CRITICAL",
  },
  {
    suffix: "PWR",
    name: "Power System",
    assetType: "PAYLOAD",
    criticality: "HIGH",
  },
  {
    suffix: "COMM",
    name: "Communication Link",
    assetType: "INTER_SATELLITE_LINK",
    criticality: "HIGH",
  },
];

// Mission-specific assets
const MISSION_ASSETS: Record<
  string,
  Array<{
    suffix: string;
    name: string;
    assetType: AssetType;
    criticality: AssetCriticality;
  }>
> = {
  earth_observation: [
    {
      suffix: "PAYLOAD-EO",
      name: "EO Payload Instrument",
      assetType: "PAYLOAD",
      criticality: "HIGH",
    },
    {
      suffix: "DH",
      name: "Data Handling Unit",
      assetType: "DATA_PROCESSING",
      criticality: "MEDIUM",
    },
  ],
  communication: [
    {
      suffix: "PAYLOAD-COM",
      name: "Communication Payload",
      assetType: "PAYLOAD",
      criticality: "CRITICAL",
    },
    {
      suffix: "ISL",
      name: "Intersatellite Link",
      assetType: "INTER_SATELLITE_LINK",
      criticality: "HIGH",
    },
  ],
  navigation: [
    {
      suffix: "PAYLOAD-NAV",
      name: "Navigation Payload",
      assetType: "PAYLOAD",
      criticality: "CRITICAL",
    },
    {
      suffix: "GNSS",
      name: "GNSS Receiver",
      assetType: "INTER_SATELLITE_LINK",
      criticality: "HIGH",
    },
  ],
  scientific: [
    {
      suffix: "PAYLOAD-SCI",
      name: "Science Instrument",
      assetType: "PAYLOAD",
      criticality: "HIGH",
    },
  ],
};

/**
 * Map spacecraft status to NEXUS asset operational status.
 */
function mapSpacecraftStatus(status: string): AssetOperationalStatus {
  switch (status) {
    case "OPERATIONAL":
      return "ACTIVE";
    case "PRE_LAUNCH":
      return "PLANNED";
    case "LAUNCHED":
      return "ACTIVE";
    case "DECOMMISSIONING":
      return "MAINTENANCE";
    case "DEORBITED":
    case "LOST":
      return "DECOMMISSIONED";
    default:
      return "PLANNED";
  }
}

/**
 * Auto-create standard NEXUS assets for a newly registered spacecraft.
 *
 * Creates standard subsystem assets (OBC, AOCS, TTC, etc.) plus mission-specific
 * assets based on the spacecraft's missionType. Also establishes OBC → subsystem
 * dependency edges (CONTROLLED_BY).
 */
export async function autoCreateAssetsForSpacecraft(
  spacecraftId: string,
  organizationId: string,
  userId: string,
): Promise<{ created: number; assetIds: string[] }> {
  const spacecraft = await prisma.spacecraft.findFirst({
    where: { id: spacecraftId, organizationId },
  });

  if (!spacecraft) throw new Error("Spacecraft not found");

  // Determine which assets to create
  const assetsToCreate = [
    ...STANDARD_ASSETS,
    ...(MISSION_ASSETS[spacecraft.missionType] || []),
  ];

  // Check which assets already exist for this spacecraft
  const existing = await prisma.asset.findMany({
    where: { spacecraftId, organizationId, isDeleted: false },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((a) => a.name));

  const newAssets = assetsToCreate.filter((a) => {
    const fullName = `${spacecraft.name} — ${a.name}`;
    return !existingNames.has(fullName);
  });

  if (newAssets.length === 0) return { created: 0, assetIds: [] };

  // Create assets
  const createdIds: string[] = [];
  const operationalStatus = mapSpacecraftStatus(spacecraft.status);

  for (const asset of newAssets) {
    const typeConfig = getAssetTypeConfig(asset.assetType);
    const category = getCategoryForType(asset.assetType);

    const created = await prisma.asset.create({
      data: {
        organizationId,
        spacecraftId,
        name: `${spacecraft.name} — ${asset.name}`,
        assetType: asset.assetType,
        category,
        criticality: asset.criticality,
        description: `Auto-generated from spacecraft ${spacecraft.name} (${spacecraft.missionType}). ${asset.name} subsystem.`,
        operationalStatus,
        isDeleted: false,
        nis2Relevant: typeConfig?.nis2Relevant ?? false,
        euSpaceActRelevant: typeConfig?.euSpaceActRelevant ?? false,
        createdBy: userId,
      },
    });
    createdIds.push(created.id);
  }

  // Auto-create standard dependencies (OBC controls everything)
  const obcAsset = await prisma.asset.findFirst({
    where: {
      spacecraftId,
      organizationId,
      name: { contains: "On-board Computer" },
      isDeleted: false,
    },
  });

  if (obcAsset) {
    const otherAssets = await prisma.asset.findMany({
      where: {
        spacecraftId,
        organizationId,
        id: { not: obcAsset.id },
        isDeleted: false,
      },
      select: { id: true },
    });

    for (const other of otherAssets) {
      // Check if dependency already exists (unique constraint: source + target + type)
      const exists = await prisma.assetDependency.findFirst({
        where: {
          sourceAssetId: obcAsset.id,
          targetAssetId: other.id,
          dependencyType: "CONTROLLED_BY",
        },
      });
      if (!exists) {
        await prisma.assetDependency.create({
          data: {
            sourceAssetId: obcAsset.id,
            targetAssetId: other.id,
            dependencyType: "CONTROLLED_BY",
            strength: "HARD",
            description: "Auto-detected: OBC manages all spacecraft subsystems",
          },
        });
      }
    }
  }

  await logAuditEvent({
    userId,
    action: "nexus_assets_auto_created",
    entityType: "nexus_asset",
    entityId: spacecraftId,
    newValue: {
      created: createdIds.length,
      assetTypes: newAssets.map((a) => a.assetType),
    },
    description: `Auto-created ${createdIds.length} NEXUS assets for spacecraft ${spacecraft.name}`,
    organizationId,
  });

  logger.info(
    `[NEXUS] Auto-created ${createdIds.length} assets for spacecraft ${spacecraft.name}`,
  );

  return { created: createdIds.length, assetIds: createdIds };
}
