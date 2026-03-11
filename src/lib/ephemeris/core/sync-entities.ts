import type { PrismaClient } from "@prisma/client";
import { spacecraftToEntity } from "./entity-adapter";

/**
 * Backfill OperatorEntity rows from existing Spacecraft records.
 * Safe to run multiple times — skips spacecraft that already have a matching entity.
 */
export async function syncSpacecraftToEntities(
  prisma: PrismaClient,
): Promise<{ created: number; skipped: number }> {
  const spacecraft = await prisma.spacecraft.findMany();

  let created = 0;
  let skipped = 0;

  for (const sc of spacecraft) {
    // Check if entity already exists for this spacecraft
    const existing = await prisma.operatorEntity.findFirst({
      where: {
        organizationId: sc.organizationId,
        identifiers: { path: ["noradId"], equals: sc.noradId ?? "" },
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    const entity = spacecraftToEntity(sc);
    await prisma.operatorEntity.create({
      data: {
        organizationId: entity.organizationId,
        operatorType: "SCO",
        name: entity.name,
        identifiers: entity.identifiers as unknown as Record<string, unknown>,
        metadata: entity.metadata,
        jurisdictions: entity.jurisdictions,
        status: entity.status,
      },
    });
    created++;
  }

  return { created, skipped };
}
