import "server-only";
import type { PrismaClient } from "@prisma/client";
import { safeLog } from "@/lib/verity/utils/redaction";

/**
 * Auto-Detect Dependencies
 *
 * Scans existing entities within an organization and infers dependency
 * relationships based on known patterns:
 *
 * 1. ISOS → SCO: via targetNoradId in ISOS entity metadata
 * 2. Constellation matching: SCOs sharing a name prefix (e.g., "Starlink-")
 * 3. LO → LSO: via launchSite metadata in LO entities
 * 4. TCO → SCO: TCO ground stations serving specific satellites
 * 5. CAP → SCO: Capacity providers hosting payloads on specific satellites
 */

interface DetectedDependency {
  sourceEntityId: string;
  targetEntityId: string;
  dependencyType: string;
  strength: string;
  description: string;
  confidence: number; // 0-1, how confident the detection is
}

export async function autoDetectDependencies(
  organizationId: string,
  prisma: PrismaClient,
): Promise<{ detected: DetectedDependency[]; created: number }> {
  safeLog("Auto-detecting dependencies", { organizationId });

  const entities = await prisma.operatorEntity.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      operatorType: true,
      metadata: true,
    },
  });

  // Fetch existing dependencies to avoid duplicates
  const existing = await prisma.entityDependency.findMany({
    where: { organizationId, isActive: true },
    select: {
      sourceEntityId: true,
      targetEntityId: true,
      dependencyType: true,
    },
  });
  const existingKeys = new Set(
    existing.map(
      (d) => `${d.sourceEntityId}:${d.targetEntityId}:${d.dependencyType}`,
    ),
  );

  const detected: DetectedDependency[] = [];

  // ─── 1. ISOS → SCO via targetNoradId ─────────────────────────────────────
  const isosEntities = entities.filter((e) => e.operatorType === "ISOS");
  const scoEntities = entities.filter((e) => e.operatorType === "SCO");

  for (const isos of isosEntities) {
    const meta = isos.metadata as Record<string, unknown> | null;
    const targetNoradId = meta?.targetNoradId as string | undefined;
    if (!targetNoradId) continue;

    const targetSco = scoEntities.find((sco) => {
      const scoMeta = sco.metadata as Record<string, unknown> | null;
      return scoMeta?.noradId === targetNoradId;
    });

    if (targetSco) {
      detected.push({
        sourceEntityId: isos.id,
        targetEntityId: targetSco.id,
        dependencyType: "SERVICING_TARGET",
        strength: "CRITICAL",
        description: `ISOS ${isos.name} services SCO ${targetSco.name} (NORAD ${targetNoradId})`,
        confidence: 0.95,
      });
    }
  }

  // ─── 2. Constellation matching (SCO name prefix) ─────────────────────────
  const prefixGroups = new Map<string, typeof scoEntities>();
  for (const sco of scoEntities) {
    // Extract prefix: "Starlink-1234" → "Starlink"
    const match = sco.name.match(/^(.+?)[-_\s]\d+$/);
    if (!match) continue;
    const prefix = match[1]!;
    const group = prefixGroups.get(prefix) ?? [];
    group.push(sco);
    prefixGroups.set(prefix, group);
  }

  for (const [, group] of prefixGroups) {
    if (group.length < 2) continue;
    // Link constellation members in a chain (each depends on the prior for coordination)
    for (let i = 1; i < group.length; i++) {
      detected.push({
        sourceEntityId: group[i]!.id,
        targetEntityId: group[i - 1]!.id,
        dependencyType: "INSURANCE_SHARED",
        strength: "MEDIUM",
        description: `Constellation co-members: ${group[i]!.name} and ${group[i - 1]!.name}`,
        confidence: 0.7,
      });
    }
  }

  // ─── 3. LO → LSO via launchSite metadata ─────────────────────────────────
  const loEntities = entities.filter((e) => e.operatorType === "LO");
  const lsoEntities = entities.filter((e) => e.operatorType === "LSO");

  for (const lo of loEntities) {
    const meta = lo.metadata as Record<string, unknown> | null;
    const launchSite = meta?.launchSite as string | undefined;
    if (!launchSite) continue;

    const matchingLso = lsoEntities.find(
      (lso) =>
        lso.name.toLowerCase().includes(launchSite.toLowerCase()) ||
        ((lso.metadata as Record<string, unknown> | null)?.siteCode as
          | string
          | undefined) === launchSite,
    );

    if (matchingLso) {
      detected.push({
        sourceEntityId: lo.id,
        targetEntityId: matchingLso.id,
        dependencyType: "LAUNCH_SITE",
        strength: "CRITICAL",
        description: `LO ${lo.name} launches from LSO ${matchingLso.name}`,
        confidence: 0.9,
      });
    }
  }

  // ─── 4. TCO → SCO via served satellites ──────────────────────────────────
  const tcoEntities = entities.filter((e) => e.operatorType === "TCO");

  for (const tco of tcoEntities) {
    const meta = tco.metadata as Record<string, unknown> | null;
    const servedNoradIds = (meta?.servedNoradIds ?? meta?.servedSatellites) as
      | string[]
      | undefined;
    if (!servedNoradIds || !Array.isArray(servedNoradIds)) continue;

    for (const noradId of servedNoradIds) {
      const targetSco = scoEntities.find((sco) => {
        const scoMeta = sco.metadata as Record<string, unknown> | null;
        return scoMeta?.noradId === noradId;
      });

      if (targetSco) {
        detected.push({
          sourceEntityId: targetSco.id,
          targetEntityId: tco.id,
          dependencyType: "TTC_PROVIDER",
          strength: "HIGH",
          description: `SCO ${targetSco.name} depends on TCO ${tco.name} for TT&C`,
          confidence: 0.85,
        });
      }
    }
  }

  // ─── 5. CAP → SCO via hosted payloads ────────────────────────────────────
  const capEntities = entities.filter((e) => e.operatorType === "CAP");

  for (const cap of capEntities) {
    const meta = cap.metadata as Record<string, unknown> | null;
    const hostSatellites = (meta?.hostSatellites ?? meta?.hostedOnNoradIds) as
      | string[]
      | undefined;
    if (!hostSatellites || !Array.isArray(hostSatellites)) continue;

    for (const noradId of hostSatellites) {
      const hostSco = scoEntities.find((sco) => {
        const scoMeta = sco.metadata as Record<string, unknown> | null;
        return scoMeta?.noradId === noradId;
      });

      if (hostSco) {
        detected.push({
          sourceEntityId: cap.id,
          targetEntityId: hostSco.id,
          dependencyType: "CAPACITY_SOURCE",
          strength: "HIGH",
          description: `CAP ${cap.name} hosted on SCO ${hostSco.name}`,
          confidence: 0.85,
        });
      }
    }
  }

  // ─── Filter out already-existing dependencies ────────────────────────────
  const novel = detected.filter(
    (d) =>
      !existingKeys.has(
        `${d.sourceEntityId}:${d.targetEntityId}:${d.dependencyType}`,
      ),
  );

  // ─── Create high-confidence dependencies ─────────────────────────────────
  let created = 0;
  for (const dep of novel) {
    if (dep.confidence < 0.7) continue; // Skip low-confidence detections

    await prisma.entityDependency.create({
      data: {
        organizationId,
        sourceEntityId: dep.sourceEntityId,
        targetEntityId: dep.targetEntityId,
        dependencyType: dep.dependencyType as never,
        strength: dep.strength as never,
        description: dep.description,
        metadata: { autoDetected: true, confidence: dep.confidence },
      },
    });
    created++;
  }

  safeLog("Auto-detection complete", {
    organizationId,
    totalDetected: detected.length,
    novel: novel.length,
    created,
  });

  return { detected: novel, created };
}
