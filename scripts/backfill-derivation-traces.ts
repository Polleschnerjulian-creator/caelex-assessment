#!/usr/bin/env tsx
/**
 * One-time legacy-trace backfill for Context-Omnipresence Phase 1.
 *
 * For every existing OperatorProfile, write a DerivationTrace row per
 * non-null field so that the new Provenance UI has *something* to show
 * from day one. Otherwise Bestandskunden would open the redesigned
 * profile page and see empty "Why?"-panels, which is worse than the
 * current opacity.
 *
 * Legacy traces are recorded as:
 *   - origin:    "user-asserted"   (we don't know the real origin)
 *   - sourceRef: { kind: "user-edit", userId: "legacy-backfill",
 *                  editedAt: profile.lastUpdated }
 *   - derivedAt: profile.lastUpdated   (so history appears plausible)
 *   - expiresAt: null                 (don't force re-verification yet)
 *
 * Idempotent: re-runs skip any (entityType, entityId, fieldName) that
 * already has a trace.
 *
 * This script intentionally does NOT import from *.server.ts (which use
 * `import "server-only"`) — it reimplements the minimal insert logic
 * inline, matching the pattern of scripts/crm-migrate-existing.ts.
 *
 * Run:
 *   export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/backfill-derivation-traces.ts
 *
 * Dry-run mode:
 *   DRY_RUN=1 npx tsx scripts/backfill-derivation-traces.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === "1";

// Mirrors src/lib/services/derivation-trace-service.ts#serializeTraceValue.
// Kept inline to avoid `server-only` import chain.
function serializeTraceValue(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v, (_k, val) =>
    val &&
    typeof val === "object" &&
    !Array.isArray(val) &&
    !(val instanceof Date)
      ? Object.keys(val as Record<string, unknown>)
          .sort()
          .reduce<Record<string, unknown>>((acc, k) => {
            acc[k] = (val as Record<string, unknown>)[k];
            return acc;
          }, {})
      : val,
  );
}

/** Fields on OperatorProfile worth writing traces for.
 *  Excludes metadata fields (id, createdAt, lastUpdated, completeness). */
const BACKFILL_FIELDS = [
  "operatorType",
  "euOperatorCode",
  "entitySize",
  "isResearch",
  "isDefenseOnly",
  "primaryOrbit",
  "orbitAltitudeKm",
  "satelliteMassKg",
  "isConstellation",
  "constellationSize",
  "missionDurationMonths",
  "plannedLaunchDate",
  "establishment",
  "operatingJurisdictions",
  "offersEUServices",
] as const;

type BackfillField = (typeof BACKFILL_FIELDS)[number];

function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  // Booleans default to `false` in the schema — we don't want to write
  // a trace for the default "unanswered" state. So treat boolean-false
  // as unfilled, boolean-true as filled. Slightly opinionated but right
  // for the current boolean fields (isResearch, isDefenseOnly, …).
  if (typeof value === "boolean") return value === true;
  return true;
}

async function backfillProfile(profileId: string): Promise<{
  created: number;
  skipped: number;
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = await (prisma as any).operatorProfile.findUnique({
    where: { id: profileId },
  });
  if (!profile) return { created: 0, skipped: 0 };

  // Fetch existing traces for this entity — used to skip fields that
  // already have a trace (idempotency).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await (prisma as any).derivationTrace.findMany({
    where: { entityType: "operator_profile", entityId: profileId },
    select: { fieldName: true },
  });
  const existingFields = new Set<string>(
    existing.map((t: { fieldName: string }) => t.fieldName),
  );

  let created = 0;
  let skipped = 0;

  const editedAtIso = (profile.lastUpdated as Date).toISOString();

  for (const field of BACKFILL_FIELDS) {
    if (existingFields.has(field)) {
      skipped++;
      continue;
    }
    const value = (profile as Record<BackfillField, unknown>)[field];
    if (!isFilled(value)) {
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      created++;
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).derivationTrace.create({
      data: {
        organizationId: profile.organizationId,
        entityType: "operator_profile",
        entityId: profileId,
        fieldName: field,
        value: serializeTraceValue(value),
        origin: "user-asserted",
        sourceRef: {
          kind: "user-edit",
          userId: "legacy-backfill",
          editedAt: editedAtIso,
          note: "Legacy backfill — pre-Phase-1 data. Origin not recoverable.",
        },
        // Align derivedAt with the profile's last update so the UI shows
        // a plausible history. Postgres + Prisma allow overriding the
        // @default(now()) on create.
        derivedAt: profile.lastUpdated,
        expiresAt: null,
        upstreamTraceIds: [],
      },
    });
    created++;
  }

  return { created, skipped };
}

async function main() {
  const mode = DRY_RUN ? "DRY_RUN" : "LIVE";
  console.log(`[backfill-derivation-traces] mode=${mode}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profiles = await (prisma as any).operatorProfile.findMany({
    select: { id: true, organizationId: true },
  });

  console.log(
    `[backfill-derivation-traces] Found ${profiles.length} OperatorProfiles`,
  );

  let totalCreated = 0;
  let totalSkipped = 0;
  let processedProfiles = 0;

  for (const p of profiles) {
    const { created, skipped } = await backfillProfile(p.id);
    totalCreated += created;
    totalSkipped += skipped;
    processedProfiles++;
    if (processedProfiles % 25 === 0) {
      console.log(
        `  [progress] ${processedProfiles}/${profiles.length} profiles — ` +
          `${totalCreated} traces created, ${totalSkipped} skipped`,
      );
    }
  }

  console.log(
    `[backfill-derivation-traces] Done. ${processedProfiles} profiles processed, ` +
      `${totalCreated} traces created, ${totalSkipped} skipped` +
      (DRY_RUN ? " (dry run — no DB writes)" : ""),
  );

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[backfill-derivation-traces] FAILED:", err);
  await prisma.$disconnect();
  process.exit(1);
});
