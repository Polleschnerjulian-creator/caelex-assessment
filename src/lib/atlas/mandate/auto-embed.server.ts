import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Vault-RAG Auto-Embed (M2 Sprint).
 *
 * Embeds an AtlasMandateFile's extractedText into AtlasKnowledgeChunk
 * rows. Called fire-and-forget from the upload route after R2 + DB
 * persist succeed. Idempotent — re-running on the same fileId is a
 * no-op (skip if chunks already exist for this sourceRef).
 *
 * Failure isolation: this never throws. All errors are caught,
 * logged, and surfaced via the return value. The upload route
 * doesn't await this — the user's HTTP response is already sent.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { chunkText, embedTexts } from "@/lib/atlas/knowledge/embed.server";

export type AutoEmbedResult =
  | { status: "embedded"; chunkCount: number }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

/** Hard-cap chunks per file to avoid surprise OpenAI bills + DB-row
 *  blow-up on a 100-page PDF. 50 chunks × 800 chars ~ 40k chars =
 *  ~10k tokens of context, more than enough for legal docs. */
const MAX_CHUNKS_PER_FILE = 50;

export async function autoEmbedMandateFile(
  fileId: string,
): Promise<AutoEmbedResult> {
  try {
    const file = await prisma.atlasMandateFile.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        mandateId: true,
        uploadedByUserId: true,
        filename: true,
        mimeType: true,
        extractedText: true,
        /* organizationId lebt auf der parent-Mandate, nicht direkt am File. */
        mandate: { select: { organizationId: true } },
      },
    });

    if (!file) {
      return { status: "failed", reason: "File not found" };
    }

    if (!file.extractedText || file.extractedText.trim().length === 0) {
      return {
        status: "skipped",
        reason: "no extracted text (image / unsupported)",
      };
    }

    /* Idempotenz: if chunks for this file already exist, skip. The
       backfill script + the upload-hook can both call us — only one
       should ever land rows. */
    const existing = await prisma.atlasKnowledgeChunk.count({
      where: {
        sourceType: "mandate_file",
        sourceRef: file.id,
      },
    });
    if (existing > 0) {
      return { status: "skipped", reason: "already embedded" };
    }

    /* Chunk + cap.

       AUDIT-FIX H4: Track truncation on the AtlasMandateFile so the
       Vault UI can surface a "truncated — only first N of M chunks
       indexed" badge to the lawyer. Without this, a 100-page PDF that
       produces 200 chunks silently gets only its first 50 chunks into
       the RAG store and the lawyer has no way to know that retrieval
       cannot reach pages 25+. We compute totalChunks BEFORE applying
       the cap so the badge can show the original count. */
    const allChunks = chunkText(file.extractedText, 800);
    const totalChunks = allChunks.length;
    const chunks = allChunks.slice(0, MAX_CHUNKS_PER_FILE);
    if (chunks.length === 0) {
      return {
        status: "skipped",
        reason: "no chunks produced after splitting",
      };
    }

    /* Embed (single batch — embedTexts handles up to 8191 tokens per
       input internally). */
    const embeddings = await embedTexts(chunks);
    if (embeddings.length !== chunks.length) {
      return {
        status: "failed",
        reason: `embedding count mismatch (${embeddings.length} vs ${chunks.length})`,
      };
    }

    /* AUDIT-FIX H15 (pgvector migration): Prisma's typed client
       cannot bind to the `Unsupported("vector(1536)")` column —
       Float[] / number[] payloads are silently rejected. Insert in
       two steps:

         1. createManyAndReturn the rows WITHOUT the embedding (the
            pgvector column is nullable post-migration; rows are
            valid without it). This gives us the auto-generated cuid
            ids for the follow-up update.
         2. Issue ONE $executeRaw UPDATE using a CASE expression so
            each chunk gets its own vector literal in a single
            round-trip. The vector is cast from a Postgres literal
            of the form `'[v1,v2,...]'::vector`.

       The two-step approach is intentional — alternatives are worse:
         - per-row UPDATE: N round-trips per file (50 files = 50 RTT)
         - $executeRaw INSERT with a multi-VALUES list and embedded
           literals: dodges parameterisation, brittle to escape
         - prisma.$executeRaw template-literal INSERT: still requires
           parameter binding for the vector which the driver cannot
           do for Unsupported types
       The CASE-WHEN UPDATE pushes everything into one statement and
       keeps the Prisma client managing ids/timestamps. */
    const inserted = await prisma.atlasKnowledgeChunk.createManyAndReturn({
      data: chunks.map((text, i) => ({
        organizationId: file.mandate.organizationId,
        userId: file.uploadedByUserId,
        sourceType: "mandate_file",
        sourceRef: file.id,
        mandateId: file.mandateId,
        title:
          chunks.length === 1
            ? file.filename
            : `${file.filename} (Chunk ${i + 1}/${chunks.length})`,
        text,
        meta: {
          fileId: file.id,
          mimeType: file.mimeType,
          originalFilename: file.filename,
          chunkIndex: i,
          totalChunks: chunks.length,
        } as object,
      })),
      select: { id: true },
    });

    /* Pair each inserted id with its embedding by ordinal index.
       createManyAndReturn preserves input order (documented in
       Prisma 5.14+ release notes), so the i-th returned id maps to
       the i-th embedding. */
    const idEmbeddingPairs = inserted.map((row, i) => ({
      id: row.id,
      embedding: embeddings[i],
    }));

    /* Build a CASE WHEN expression: one branch per chunk, each
       casting its vector literal. Using Prisma.sql with parameter
       interpolation keeps the ids parameterised against SQL injection
       (the embedding values are pure numbers and assembled into a
       trusted literal). */
    const caseBranches = idEmbeddingPairs.map(
      (p) =>
        Prisma.sql`WHEN ${p.id} THEN ${`[${p.embedding.join(",")}]`}::vector`,
    );
    const ids = idEmbeddingPairs.map((p) => p.id);
    await prisma.$executeRaw(Prisma.sql`
      UPDATE "AtlasKnowledgeChunk"
      SET embedding = CASE id
        ${Prisma.join(caseBranches, " ")}
      END
      WHERE id IN (${Prisma.join(ids)})
    `);

    /* AUDIT-FIX H4: Persist truncation flag on the file row so the
       Vault UI can show a "first 50 of N chunks indexed" badge. We
       only update when truncation actually happened (totalChunks
       exceeded the cap) to avoid pointless writes for the common
       small-file case. */
    if (totalChunks > MAX_CHUNKS_PER_FILE) {
      await prisma.atlasMandateFile.update({
        where: { id: file.id },
        data: {
          embedTruncated: true,
          embedTotalChunks: totalChunks,
        },
      });
    }

    logger.info("[atlas/vault-rag] file embedded", {
      fileId: file.id,
      mandateId: file.mandateId,
      chunkCount: chunks.length,
      cappedFromOriginal: totalChunks > chunks.length ? totalChunks : undefined,
    });

    return { status: "embedded", chunkCount: chunks.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("[atlas/vault-rag] auto-embed failed", {
      fileId,
      error: msg,
    });
    return { status: "failed", reason: msg.slice(0, 200) };
  }
}
