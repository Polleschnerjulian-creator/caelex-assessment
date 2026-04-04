import "server-only";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getCategoryForType, getAssetTypeConfig } from "../types";
import type { SBOMComponent } from "@/lib/cra-sbom-service.server";

// ═══════════════════════════════════════════════════════════
// NEXUS ↔ SBOM — Dependency Graph Sync
// ═══════════════════════════════════════════════════════════

/**
 * Sync SBOM components into the NEXUS dependency graph.
 *
 * When a SBOM is uploaded for a CRA assessment, this creates NEXUS software
 * dependency assets for the top components and links them to the parent asset
 * (identified via the CRA→NEXUS evidence link from Integration 2).
 */
export async function syncSBOMToNexus(
  craAssessmentId: string,
  components: SBOMComponent[],
  organizationId: string,
  userId: string,
): Promise<{ created: number; linked: number }> {
  if (!organizationId) return { created: 0, linked: 0 };

  // Find the NEXUS asset linked to this CRA assessment (from Integration 2)
  const link = await prisma.complianceEvidence.findFirst({
    where: {
      organizationId,
      requirementId: `cra-nexus-link-${craAssessmentId}`,
    },
  });

  // Extract the asset name from the link title and look it up
  const linkedAssetName = link?.title?.split(": ").pop() || "";
  const parentAsset = linkedAssetName
    ? await prisma.asset.findFirst({
        where: {
          organizationId,
          name: linkedAssetName,
          isDeleted: false,
        },
        select: { id: true, name: true },
      })
    : null;

  if (!parentAsset) {
    logger.info(
      "[SBOM→NEXUS] No linked NEXUS asset found, skipping dependency sync",
    );
    return { created: 0, linked: 0 };
  }

  // Create or find assets for top 20 critical SBOM components
  const topComponents = components
    .filter((c) => c.name && c.version)
    .slice(0, 20);

  let created = 0;
  let linked = 0;

  const typeConfig = getAssetTypeConfig("FLIGHT_SOFTWARE");
  const category = getCategoryForType("FLIGHT_SOFTWARE");

  for (const comp of topComponents) {
    const assetName = `${comp.name}@${comp.version}`;

    // Check if asset already exists
    let asset = await prisma.asset.findFirst({
      where: {
        organizationId,
        name: assetName,
        assetType: "FLIGHT_SOFTWARE",
        isDeleted: false,
      },
    });

    if (!asset) {
      asset = await prisma.asset.create({
        data: {
          organizationId,
          name: assetName,
          assetType: "FLIGHT_SOFTWARE",
          category,
          criticality: "MEDIUM",
          description:
            `Software dependency from SBOM. ${comp.isOpenSource ? "Open source" : "Proprietary"}. ${comp.license ? `License: ${comp.license}` : ""}`.trim(),
          operationalStatus: "ACTIVE",
          manufacturer: comp.supplier || undefined,
          isDeleted: false,
          nis2Relevant: typeConfig?.nis2Relevant ?? false,
          euSpaceActRelevant: typeConfig?.euSpaceActRelevant ?? false,
          createdBy: userId,
        },
      });
      created++;
    }

    // Create dependency: parent asset REQUIRES this component
    const depExists = await prisma.assetDependency.findFirst({
      where: {
        sourceAssetId: parentAsset.id,
        targetAssetId: asset.id,
        dependencyType: "REQUIRES",
      },
    });

    if (!depExists) {
      await prisma.assetDependency.create({
        data: {
          sourceAssetId: parentAsset.id,
          targetAssetId: asset.id,
          dependencyType: "REQUIRES",
          strength: "HARD",
          description: `Software dependency from SBOM (${comp.purl || comp.name})`,
        },
      });
      linked++;
    }
  }

  logger.info(
    `[SBOM→NEXUS] Created ${created} assets, linked ${linked} dependencies for ${parentAsset.name}`,
  );

  return { created, linked };
}
