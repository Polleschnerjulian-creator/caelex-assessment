#!/usr/bin/env tsx
/**
 * One-time migration: legacy ExportControlAssessment (user-scoped)
 * → TradeComplianceProgram (org-scoped, Sprint T4).
 *
 * For each legacy assessment (excluding archived ones), this script
 * resolves the owning user to a primary organisation and writes the
 * field-by-field equivalent into the new V2 schema. Sensitive fields
 * (DDTC nr, EO email) are encrypted directly here — the script can't
 * import program-service.ts because that module uses `import "server-
 * only"` which throws under tsx. Same pattern as the existing
 * scripts/backfill-derivation-traces.ts and scripts/encrypt-atlas-
 * backfill.ts: reimplement the minimal insert logic inline.
 *
 * Idempotency:
 *   - Per-org dedup via `seenOrgs` set; earliest createdAt wins.
 *   - Per `tradeComplianceProgram.organizationId` and per
 *     `(programId, requirementId)` unique-keys at the DB level mean
 *     re-running after a partial pass is a no-op for already-migrated
 *     rows.
 *
 * Edge cases logged (not aborted):
 *   - User without active org → SKIP[no-org]
 *   - Org already migrated by an earlier assessment → SKIP[org-conflict]
 *
 * Run (after deploy):
 *   export $(grep -v '^#' .env.local | xargs) && \
 *     npx tsx scripts/migrate-legacy-export-control.ts
 *
 * Dry-run (no DB writes, just counts):
 *   DRY_RUN=1 npx tsx scripts/migrate-legacy-export-control.ts
 */

import { PrismaClient } from "@prisma/client";
import { encrypt } from "../src/lib/encryption";
import {
  mapAssessmentToProgramPatch,
  mapLegacyStatusToEnum,
} from "../src/lib/trade/migrate-legacy-assessment";
import type { ProgramProfilePatch } from "../src/lib/trade/program-service";

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === "1";

interface Counters {
  candidates: number;
  migrated: number;
  skippedNoOrg: number;
  skippedOrgConflict: number;
  requirementStatusesMigrated: number;
}

async function resolvePrimaryOrg(userId: string): Promise<string | null> {
  const m = await prisma.organizationMember.findFirst({
    where: { userId, organization: { isActive: true } },
    select: { organizationId: true },
    orderBy: { joinedAt: "asc" },
  });
  return m?.organizationId ?? null;
}

async function encryptOptional(
  plaintext: string | null | undefined,
): Promise<string | null> {
  if (plaintext === null || plaintext === undefined || plaintext === "") {
    return null;
  }
  return encrypt(plaintext);
}

/**
 * Writes the program row directly. Reimplements the encryption boundary
 * that program-service.ts handles for runtime callers — the script can't
 * import that module because of the `server-only` directive.
 */
async function upsertProgramRow(
  organizationId: string,
  patch: ProgramProfilePatch,
): Promise<{ id: string }> {
  const { ddtcRegistrationNo, empoweredOfficialEmail, ...plain } = patch;

  const sensitive: {
    ddtcRegistrationNoEnc?: string | null;
    empoweredOfficialEmailEnc?: string | null;
  } = {};
  if (Object.prototype.hasOwnProperty.call(patch, "ddtcRegistrationNo")) {
    sensitive.ddtcRegistrationNoEnc = await encryptOptional(
      ddtcRegistrationNo ?? null,
    );
  }
  if (Object.prototype.hasOwnProperty.call(patch, "empoweredOfficialEmail")) {
    sensitive.empoweredOfficialEmailEnc = await encryptOptional(
      empoweredOfficialEmail ?? null,
    );
  }

  return prisma.tradeComplianceProgram.upsert({
    where: { organizationId },
    create: { organizationId, ...plain, ...sensitive },
    update: { ...plain, ...sensitive },
    select: { id: true },
  });
}

async function main() {
  console.log(
    `\n${DRY_RUN ? "[DRY RUN] " : ""}Migrating legacy ExportControlAssessment → TradeComplianceProgram\n`,
  );

  const assessments = await prisma.exportControlAssessment.findMany({
    where: { status: { not: "archived" } },
    include: { requirementStatuses: true },
    orderBy: { createdAt: "asc" },
  });

  const counters: Counters = {
    candidates: assessments.length,
    migrated: 0,
    skippedNoOrg: 0,
    skippedOrgConflict: 0,
    requirementStatusesMigrated: 0,
  };
  const seenOrgs = new Set<string>();

  for (const a of assessments) {
    const orgId = await resolvePrimaryOrg(a.userId);
    if (!orgId) {
      counters.skippedNoOrg += 1;
      console.log(`SKIP[no-org] assessment=${a.id} user=${a.userId}`);
      continue;
    }
    if (seenOrgs.has(orgId)) {
      counters.skippedOrgConflict += 1;
      console.log(
        `SKIP[org-conflict] assessment=${a.id} user=${a.userId} org=${orgId} — already migrated earlier in this pass`,
      );
      continue;
    }
    seenOrgs.add(orgId);

    if (DRY_RUN) {
      counters.migrated += 1;
      counters.requirementStatusesMigrated += a.requirementStatuses.length;
      console.log(
        `MIGRATE[dry] assessment=${a.id} → org=${orgId} (${a.requirementStatuses.length} requirements)`,
      );
      continue;
    }

    const patch = mapAssessmentToProgramPatch(a);
    const program = await upsertProgramRow(orgId, patch);
    counters.migrated += 1;

    for (const rs of a.requirementStatuses) {
      const status = mapLegacyStatusToEnum(rs.status);
      await prisma.tradeProgramRequirementStatus.upsert({
        where: {
          programId_requirementId: {
            programId: program.id,
            requirementId: rs.requirementId,
          },
        },
        create: {
          programId: program.id,
          requirementId: rs.requirementId,
          status,
          notes: rs.notes ?? null,
          evidenceNotes: rs.evidenceNotes ?? null,
          targetDate: rs.targetDate ?? null,
          responsibleParty: rs.responsibleParty ?? null,
        },
        update: {
          status,
          notes: rs.notes ?? null,
          evidenceNotes: rs.evidenceNotes ?? null,
          targetDate: rs.targetDate ?? null,
          responsibleParty: rs.responsibleParty ?? null,
        },
      });
      counters.requirementStatusesMigrated += 1;
    }
    console.log(
      `MIGRATE[ok] assessment=${a.id} → org=${orgId} program=${program.id} (${a.requirementStatuses.length} requirements)`,
    );
  }

  console.log("\n=== Migration Summary ===");
  console.log(counters);
  console.log(DRY_RUN ? "\n(no writes — DRY_RUN=1)\n" : "");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
