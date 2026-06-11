/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Tests für autoEmbedMandateFile — der Vault-RAG Embed-Job.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    atlasMandateFile: {
      findUnique: vi.fn(),
    },
    atlasKnowledgeChunk: {
      count: vi.fn(),
      createMany: vi.fn(),
      // AUDIT-FIX H15: pgvector insert is createManyAndReturn (ids for
      // the follow-up CASE-WHEN vector UPDATE via $executeRaw).
      createManyAndReturn: vi.fn(),
    },
    $executeRaw: vi.fn(),
  },
}));

vi.mock("@/lib/atlas/knowledge/embed.server", () => ({
  chunkText: vi.fn((text: string) => [text.slice(0, 100), text.slice(100)]),
  embedTexts: vi.fn(async (chunks: string[]) =>
    chunks.map((_, i) => Array.from({ length: 1536 }, () => i / 1536)),
  ),
  EMBED_MODEL: "test-embed-model",
}));

// SEC-T0-1 step 5: chunk text is encrypted before persisting; the real
// helper needs ENCRYPTION_KEY and would throw in vitest.
vi.mock("@/lib/atlas/atlas-encryption", () => ({
  encryptAtlasField: vi.fn(async (text: string) => `enc:${text}`),
  decryptAtlasField: vi.fn(async (text: string | null) => text),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { autoEmbedMandateFile } from "./auto-embed.server";
import { prisma } from "@/lib/prisma";

describe("autoEmbedMandateFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 'skipped' when file has no extractedText", async () => {
    vi.mocked(prisma.atlasMandateFile.findUnique).mockResolvedValue({
      id: "f1",
      mandateId: "m1",
      mandate: { organizationId: "o1" },
      uploadedByUserId: "u1",
      filename: "image.jpg",
      mimeType: "image/jpeg",
      extractedText: null,
    } as never);

    const result = await autoEmbedMandateFile("f1");
    /* toMatchObject avoids discriminated-union narrowing complaints */
    expect(result).toMatchObject({
      status: "skipped",
      reason: expect.stringContaining("no extracted text"),
    });
    expect(prisma.atlasKnowledgeChunk.createMany).not.toHaveBeenCalled();
  });

  it("returns 'skipped' when chunks already exist (idempotent)", async () => {
    vi.mocked(prisma.atlasMandateFile.findUnique).mockResolvedValue({
      id: "f1",
      mandateId: "m1",
      mandate: { organizationId: "o1" },
      uploadedByUserId: "u1",
      filename: "doc.pdf",
      mimeType: "application/pdf",
      extractedText: "Some long text content here.",
    } as never);
    vi.mocked(prisma.atlasKnowledgeChunk.count).mockResolvedValue(3);

    const result = await autoEmbedMandateFile("f1");
    expect(result).toMatchObject({
      status: "skipped",
      reason: expect.stringContaining("already embedded"),
    });
    expect(prisma.atlasKnowledgeChunk.createMany).not.toHaveBeenCalled();
  });

  it("returns 'embedded' with chunk count on success", async () => {
    vi.mocked(prisma.atlasMandateFile.findUnique).mockResolvedValue({
      id: "f1",
      mandateId: "m1",
      mandate: { organizationId: "o1" },
      uploadedByUserId: "u1",
      filename: "doc.pdf",
      mimeType: "application/pdf",
      extractedText: "A".repeat(500),
    } as never);
    vi.mocked(prisma.atlasKnowledgeChunk.count).mockResolvedValue(0);
    // H15 two-step insert: createManyAndReturn yields the row ids, the
    // vector itself lands via ONE $executeRaw CASE-WHEN update.
    vi.mocked(prisma.atlasKnowledgeChunk.createManyAndReturn).mockResolvedValue(
      [{ id: "k1" }, { id: "k2" }] as never,
    );
    vi.mocked(prisma.$executeRaw).mockResolvedValue(2 as never);

    const result = await autoEmbedMandateFile("f1");
    expect(result).toMatchObject({
      status: "embedded",
      chunkCount: 2,
    });
    expect(
      prisma.atlasKnowledgeChunk.createManyAndReturn,
    ).toHaveBeenCalledTimes(1);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    // SEC-T0-1: persisted chunk text must be the ENCRYPTED form.
    const createArgs = vi.mocked(prisma.atlasKnowledgeChunk.createManyAndReturn)
      .mock.calls[0][0] as { data: Array<{ text: string }> };
    for (const row of createArgs.data) {
      expect(row.text).toMatch(/^enc:/);
    }
  });

  it("returns 'failed' when file not found", async () => {
    vi.mocked(prisma.atlasMandateFile.findUnique).mockResolvedValue(null);
    const result = await autoEmbedMandateFile("missing");
    expect(result).toMatchObject({
      status: "failed",
      reason: expect.stringContaining("not found"),
    });
  });
});
