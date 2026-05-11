/**
 * prisma/backfill-atlas-share-expiry.ts
 *
 * One-shot backfill for AtlasWorkspace shares that pre-date the M-4
 * expiry-feature. Any workspace with `shareToken` + `shareEnabledAt`
 * but missing `shareExpiresAt` is brought into the new policy:
 *
 *   shareExpiresAt = max(shareEnabledAt, now) + 90 days
 *
 * Idempotent — running twice does nothing on the second pass.
 *
 * Run:
 *   npx tsx --env-file-if-exists=.env.local prisma/backfill-atlas-share-expiry.ts
 *
 * Read-only by default (--dry-run); pass --execute to actually write.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SHARE_TTL_DAYS = 90;
const SHARE_TTL_MS = SHARE_TTL_DAYS * 24 * 60 * 60 * 1000;

async function main() {
  const dryRun = !process.argv.includes("--execute");

  console.log(`\n┌─ ATLAS SHARE EXPIRY BACKFILL ─────────────────────────┐`);
  console.log(
    `  mode: ${dryRun ? "DRY-RUN (no writes)" : "EXECUTE (will write)"}`,
  );

  const orphans = await prisma.atlasWorkspace.findMany({
    where: {
      shareToken: { not: null },
      shareEnabledAt: { not: null },
      shareExpiresAt: null,
    },
    select: {
      id: true,
      title: true,
      userId: true,
      shareEnabledAt: true,
      createdAt: true,
    },
  });

  console.log(`  found:   ${orphans.length} share(s) without expiry`);
  if (orphans.length === 0) {
    console.log(`  nothing to do — all good.`);
    console.log(`└────────────────────────────────────────────────────────┘\n`);
    return;
  }

  for (const ws of orphans) {
    const baseAt = ws.shareEnabledAt ?? ws.createdAt;
    const newExpiry = new Date(
      Math.max(baseAt.getTime(), Date.now()) + SHARE_TTL_MS,
    );
    console.log(
      `    ${ws.id.padEnd(24)} · "${ws.title.slice(0, 40).padEnd(40)}" → expires ${newExpiry.toISOString()}`,
    );

    if (!dryRun) {
      await prisma.atlasWorkspace.update({
        where: { id: ws.id },
        data: { shareExpiresAt: newExpiry },
      });
    }
  }

  console.log(``);
  console.log(
    `  ${dryRun ? "DRY-RUN: no rows touched. Re-run with --execute." : `Done. Updated ${orphans.length} row(s).`}`,
  );
  console.log(`└────────────────────────────────────────────────────────┘\n`);
}

main()
  .catch((e) => {
    console.error("\n[backfill-atlas-share-expiry] failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
