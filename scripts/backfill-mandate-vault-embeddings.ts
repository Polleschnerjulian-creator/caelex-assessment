/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * One-shot backfill für M2 Vault-RAG: embed alle existing AtlasMandateFile-
 * Rows die noch keine AtlasKnowledgeChunk-Einträge haben.
 *
 * Idempotent — re-running ist safe (autoEmbedMandateFile skipped
 * Files die schon Chunks haben).
 *
 * Usage: npx tsx scripts/backfill-mandate-vault-embeddings.ts
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { config } from "dotenv";
config();

import { prisma } from "@/lib/prisma";
import { autoEmbedMandateFile } from "@/lib/atlas/mandate/auto-embed.server";

async function main() {
  console.log("[backfill] starting Vault-RAG embed backfill");
  const files = await prisma.atlasMandateFile.findMany({
    select: { id: true, filename: true, mandateId: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(`[backfill] found ${files.length} mandate-files total`);

  const tally = { embedded: 0, skipped: 0, failed: 0 };
  for (const file of files) {
    const result = await autoEmbedMandateFile(file.id);
    tally[result.status]++;
    if (result.status === "embedded") {
      console.log(
        `  ✓ ${file.filename} (mandate ${file.mandateId}) — ${result.chunkCount} chunks`,
      );
    } else if (result.status === "failed") {
      console.log(`  ✗ ${file.filename} — ${result.reason}`);
    } else {
      // skipped — quiet
    }
  }

  console.log(
    `[backfill] done. embedded=${tally.embedded} skipped=${tally.skipped} failed=${tally.failed}`,
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("[backfill] fatal:", err);
  process.exit(1);
});
