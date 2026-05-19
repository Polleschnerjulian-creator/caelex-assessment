/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * SEC-T0-1 Step 6 — One-shot backfill for at-rest encryption of Atlas
 * mandate content.
 *
 * Migrates existing PLAINTEXT rows in the 5 encrypted Models to the
 * per-organization-encrypted format. Idempotent — already-encrypted
 * rows are skipped via isAtlasFieldEncrypted (the underlying
 * migrateToOrgEncryption in lib/encryption.ts is a no-op on org-
 * encrypted strings). Safe to re-run.
 *
 * Models migrated (in dependency order so failures cluster cleanly):
 *   1. AtlasMandate          — clientName, clientContact, customInstructions
 *   2. AtlasMessage          — content (JSONB array, walks text-blocks)
 *   3. AtlasMandateFile      — extractedText
 *   4. AtlasKnowledgeChunk   — text
 *   5. AtlasResearchEntry    — content, query (orgId resolved via
 *                              user's primary OrganizationMember row)
 *
 * USAGE:
 *
 *   Dry-run (just count, no writes):
 *     npx tsx scripts/encrypt-atlas-backfill.ts --dry-run
 *
 *   Real run:
 *     npx tsx scripts/encrypt-atlas-backfill.ts
 *
 *   Single model only:
 *     npx tsx scripts/encrypt-atlas-backfill.ts --only=mandate
 *     (one of: mandate, message, file, chunk, library)
 *
 * Output: per-model tally of scanned/encrypted/skipped/failed rows.
 *
 * SAFETY:
 *   - Batched 100 rows at a time to avoid memory spikes.
 *   - Per-row error caught + logged; one bad row doesn't abort the batch.
 *   - Cursor-based pagination so a crash + restart resumes safely.
 *   - dual-read in production means PARTIAL completion is non-disruptive:
 *     decryptAtlasField + decryptAtlasMessageContent already tolerate
 *     mixed encrypted/plaintext rows.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { config } from "dotenv";
config();

import { prisma } from "@/lib/prisma";
import {
  migrateAtlasField,
  migrateAtlasMessageContent,
  isAtlasFieldEncrypted,
} from "@/lib/atlas/atlas-encryption";

const BATCH_SIZE = 100;

interface Tally {
  scanned: number;
  encrypted: number;
  skipped: number;
  failed: number;
}

function newTally(): Tally {
  return { scanned: 0, encrypted: 0, skipped: 0, failed: 0 };
}

function logTally(model: string, t: Tally, dryRun: boolean): void {
  const mode = dryRun ? "[DRY-RUN]" : "[LIVE]";
  console.log(
    `  ${mode} ${model.padEnd(25)} scanned=${t.scanned} encrypted=${t.encrypted} skipped=${t.skipped} failed=${t.failed}`,
  );
}

/* ── 1. AtlasMandate ──────────────────────────────────────────────── */

async function backfillMandate(dryRun: boolean): Promise<Tally> {
  console.log(
    "[backfill] AtlasMandate.{clientName,clientContact,customInstructions}",
  );
  const tally = newTally();
  let cursor: string | undefined;
  while (true) {
    const batch = await prisma.atlasMandate.findMany({
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        organizationId: true,
        clientName: true,
        clientContact: true,
        customInstructions: true,
      },
    });
    if (batch.length === 0) break;
    for (const row of batch) {
      tally.scanned++;
      try {
        const updates: Record<string, string | null> = {};
        let touched = false;
        for (const field of [
          "clientName",
          "clientContact",
          "customInstructions",
        ] as const) {
          const val = row[field];
          if (val && !isAtlasFieldEncrypted(val)) {
            const migrated = await migrateAtlasField(val, row.organizationId);
            updates[field] = migrated ?? null;
            touched = true;
          }
        }
        if (touched) {
          if (!dryRun) {
            await prisma.atlasMandate.update({
              where: { id: row.id },
              data: updates,
            });
          }
          tally.encrypted++;
        } else {
          tally.skipped++;
        }
      } catch (err) {
        tally.failed++;
        console.error(
          `    ✗ mandate ${row.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    cursor = batch[batch.length - 1].id;
    if (tally.scanned % 500 === 0)
      logTally("AtlasMandate (progress)", tally, dryRun);
  }
  logTally("AtlasMandate", tally, dryRun);
  return tally;
}

/* ── 2. AtlasMessage ──────────────────────────────────────────────── */

async function backfillMessage(dryRun: boolean): Promise<Tally> {
  console.log("[backfill] AtlasMessage.content (JSONB text-block walker)");
  const tally = newTally();
  let cursor: string | undefined;
  while (true) {
    const batch = await prisma.atlasMessage.findMany({
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        content: true,
        chat: { select: { organizationId: true } },
      },
    });
    if (batch.length === 0) break;
    for (const row of batch) {
      tally.scanned++;
      try {
        const orgId = row.chat.organizationId;
        const migratedContent = await migrateAtlasMessageContent(
          row.content,
          orgId,
        );
        /* Idempotency check: serialize both and compare. If identical,
           no migration happened (all text-blocks were already encrypted
           OR the array contained no text-blocks). */
        const before = JSON.stringify(row.content);
        const after = JSON.stringify(migratedContent);
        if (before === after) {
          tally.skipped++;
        } else {
          if (!dryRun) {
            await prisma.atlasMessage.update({
              where: { id: row.id },
              data: { content: migratedContent as object },
            });
          }
          tally.encrypted++;
        }
      } catch (err) {
        tally.failed++;
        console.error(
          `    ✗ message ${row.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    cursor = batch[batch.length - 1].id;
    if (tally.scanned % 500 === 0)
      logTally("AtlasMessage (progress)", tally, dryRun);
  }
  logTally("AtlasMessage", tally, dryRun);
  return tally;
}

/* ── 3. AtlasMandateFile ──────────────────────────────────────────── */

async function backfillMandateFile(dryRun: boolean): Promise<Tally> {
  console.log("[backfill] AtlasMandateFile.extractedText");
  const tally = newTally();
  let cursor: string | undefined;
  while (true) {
    const batch = await prisma.atlasMandateFile.findMany({
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        extractedText: true,
        mandate: { select: { organizationId: true } },
      },
    });
    if (batch.length === 0) break;
    for (const row of batch) {
      tally.scanned++;
      try {
        if (!row.extractedText || isAtlasFieldEncrypted(row.extractedText)) {
          tally.skipped++;
          continue;
        }
        const orgId = row.mandate.organizationId;
        const migrated = await migrateAtlasField(row.extractedText, orgId);
        if (!dryRun) {
          await prisma.atlasMandateFile.update({
            where: { id: row.id },
            data: { extractedText: migrated },
          });
        }
        tally.encrypted++;
      } catch (err) {
        tally.failed++;
        console.error(
          `    ✗ file ${row.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    cursor = batch[batch.length - 1].id;
    if (tally.scanned % 500 === 0)
      logTally("AtlasMandateFile (progress)", tally, dryRun);
  }
  logTally("AtlasMandateFile", tally, dryRun);
  return tally;
}

/* ── 4. AtlasKnowledgeChunk ───────────────────────────────────────── */

async function backfillKnowledgeChunk(dryRun: boolean): Promise<Tally> {
  console.log("[backfill] AtlasKnowledgeChunk.text");
  const tally = newTally();
  let cursor: string | undefined;
  while (true) {
    const batch = await prisma.atlasKnowledgeChunk.findMany({
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, text: true, organizationId: true },
    });
    if (batch.length === 0) break;
    for (const row of batch) {
      tally.scanned++;
      try {
        if (!row.text || isAtlasFieldEncrypted(row.text)) {
          tally.skipped++;
          continue;
        }
        const migrated = await migrateAtlasField(row.text, row.organizationId);
        if (!dryRun) {
          await prisma.atlasKnowledgeChunk.update({
            where: { id: row.id },
            data: { text: migrated ?? "" },
          });
        }
        tally.encrypted++;
      } catch (err) {
        tally.failed++;
        console.error(
          `    ✗ chunk ${row.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    cursor = batch[batch.length - 1].id;
    if (tally.scanned % 500 === 0)
      logTally("AtlasKnowledgeChunk (progress)", tally, dryRun);
  }
  logTally("AtlasKnowledgeChunk", tally, dryRun);
  return tally;
}

/* ── 5. AtlasResearchEntry ────────────────────────────────────────── */

/* AtlasResearchEntry has no organizationId column (per D-5 the SEC-H2
   fix is a separate later concern). For the encryption-backfill we
   resolve the orgId via the user's primary OrganizationMember row
   (ordered by joinedAt ASC). Users with no org-membership are skipped
   with a warning — should not happen in practice but defensive. */
async function resolveUserPrimaryOrg(userId: string): Promise<string | null> {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    orderBy: { joinedAt: "asc" },
    select: { organizationId: true },
  });
  return membership?.organizationId ?? null;
}

async function backfillResearchEntry(dryRun: boolean): Promise<Tally> {
  console.log("[backfill] AtlasResearchEntry.{content,query}");
  const tally = newTally();
  let cursor: string | undefined;
  /* Cache per-user orgId lookup to avoid N×OrganizationMember queries
     for users with many library entries. */
  const userOrgCache = new Map<string, string | null>();
  while (true) {
    const batch = await prisma.atlasResearchEntry.findMany({
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, userId: true, content: true, query: true },
    });
    if (batch.length === 0) break;
    for (const row of batch) {
      tally.scanned++;
      try {
        let orgId = userOrgCache.get(row.userId);
        if (orgId === undefined) {
          orgId = await resolveUserPrimaryOrg(row.userId);
          userOrgCache.set(row.userId, orgId);
        }
        if (!orgId) {
          tally.failed++;
          console.error(
            `    ✗ research-entry ${row.id}: no org found for user ${row.userId}`,
          );
          continue;
        }
        const updates: Record<string, string | null> = {};
        let touched = false;
        if (row.content && !isAtlasFieldEncrypted(row.content)) {
          updates.content = (await migrateAtlasField(row.content, orgId)) ?? "";
          touched = true;
        }
        if (row.query && !isAtlasFieldEncrypted(row.query)) {
          updates.query = await migrateAtlasField(row.query, orgId);
          touched = true;
        }
        if (touched) {
          if (!dryRun) {
            await prisma.atlasResearchEntry.update({
              where: { id: row.id },
              data: updates,
            });
          }
          tally.encrypted++;
        } else {
          tally.skipped++;
        }
      } catch (err) {
        tally.failed++;
        console.error(
          `    ✗ research-entry ${row.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    cursor = batch[batch.length - 1].id;
    if (tally.scanned % 500 === 0)
      logTally("AtlasResearchEntry (progress)", tally, dryRun);
  }
  logTally("AtlasResearchEntry", tally, dryRun);
  return tally;
}

/* ── Entry point ──────────────────────────────────────────────────── */

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const onlyArg = args.find((a) => a.startsWith("--only="));
  const only = onlyArg?.slice("--only=".length);

  console.log(
    `[backfill] SEC-T0-1 Step 6 — Atlas encryption backfill ${dryRun ? "(DRY-RUN)" : "(LIVE)"}`,
  );
  console.log(`[backfill] only=${only ?? "all"} batchSize=${BATCH_SIZE}`);
  console.log("");

  const allowed = new Set(["mandate", "message", "file", "chunk", "library"]);
  if (only && !allowed.has(only)) {
    console.error(
      `[backfill] invalid --only=${only}. Must be one of: ${[...allowed].join(", ")}`,
    );
    process.exit(1);
  }

  const results: Record<string, Tally> = {};
  if (!only || only === "mandate") {
    results.mandate = await backfillMandate(dryRun);
  }
  if (!only || only === "message") {
    results.message = await backfillMessage(dryRun);
  }
  if (!only || only === "file") {
    results.file = await backfillMandateFile(dryRun);
  }
  if (!only || only === "chunk") {
    results.chunk = await backfillKnowledgeChunk(dryRun);
  }
  if (!only || only === "library") {
    results.library = await backfillResearchEntry(dryRun);
  }

  console.log("");
  console.log("[backfill] ────────── SUMMARY ──────────");
  let totalScanned = 0,
    totalEncrypted = 0,
    totalFailed = 0;
  for (const [name, t] of Object.entries(results)) {
    totalScanned += t.scanned;
    totalEncrypted += t.encrypted;
    totalFailed += t.failed;
    console.log(
      `  ${name.padEnd(15)} scanned=${t.scanned} encrypted=${t.encrypted} skipped=${t.skipped} failed=${t.failed}`,
    );
  }
  console.log("");
  console.log(
    `[backfill] TOTAL scanned=${totalScanned} encrypted=${totalEncrypted} failed=${totalFailed} ${dryRun ? "(no writes performed)" : ""}`,
  );

  if (totalFailed > 0) {
    console.error(
      `[backfill] ⚠ ${totalFailed} rows failed — re-run is safe (skips already-encrypted rows). Inspect logs above.`,
    );
    process.exit(1);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("[backfill] fatal:", err);
  prisma.$disconnect();
  process.exit(1);
});
