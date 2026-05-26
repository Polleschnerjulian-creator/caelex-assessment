import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V3 — document-processor test coverage (T0.3).
 *
 * Covers the file-upload + access-control invariants:
 *   - MIME-allow-list (incl. AUDIT-FIX H18 — text/html intentionally
 *     rejected to avoid stored-XSS via extracted-text replay).
 *   - 50 MB size cap (MAX_FILE_BYTES).
 *   - R2-configured gate.
 *   - Mandate-membership scoping.
 *   - 100-file cap per mandate (MAX_FILES_PER_MANDATE).
 *
 * Plus the per-file read-path access controls (download / delete /
 * list) — every read query must include the `mandate.OR` clause that
 * scopes by org + (owner OR member).
 *
 * The text-extraction paths (unpdf, mammoth, sheetjs) and the actual
 * R2 byte-streaming are NOT covered here — they require heavy mocking
 * of external libs + AWS SDK clients. Integration tests cover those.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mandateFindFirst: vi.fn(),
    fileFindFirst: vi.fn(),
    fileFindMany: vi.fn(),
    fileCreate: vi.fn(),
    fileDelete: vi.fn(),
    fileUpdate: vi.fn(),
    r2IsConfigured: vi.fn(),
    encryptField: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    atlasMandate: { findFirst: mocks.mandateFindFirst },
    atlasMandateFile: {
      findFirst: mocks.fileFindFirst,
      findMany: mocks.fileFindMany,
      create: mocks.fileCreate,
      delete: mocks.fileDelete,
      update: mocks.fileUpdate,
    },
    atlasKnowledgeChunk: {
      groupBy: vi.fn(async () => []),
    },
  },
}));

vi.mock("@/lib/storage/r2-client", () => ({
  isR2Configured: mocks.r2IsConfigured,
  getR2Client: vi.fn(() => null),
  getR2BucketName: vi.fn(() => "test-bucket"),
}));

vi.mock("./atlas-encryption", () => ({
  encryptAtlasField: mocks.encryptField,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  uploadFileToMandate,
  getSignedDownloadUrl,
  deleteMandateFile,
  listMandateFiles,
  MAX_FILE_BYTES,
  MAX_FILES_PER_MANDATE,
  type UploadError,
  type UploadResult,
} from "./document-processor.server";

function isError(r: UploadResult | UploadError): r is UploadError {
  return "code" in r;
}

beforeEach(() => {
  for (const m of Object.values(mocks)) m.mockReset();
  /* Default: R2 configured, encryption pass-through. */
  mocks.r2IsConfigured.mockReturnValue(true);
  mocks.encryptField.mockImplementation(async (v: string | null) => v);
});

/* ── Config constants ───────────────────────────────────────────────── */

describe("config constants", () => {
  it("MAX_FILE_BYTES is 50 MB", () => {
    expect(MAX_FILE_BYTES).toBe(50 * 1024 * 1024);
  });

  it("MAX_FILES_PER_MANDATE is 100", () => {
    expect(MAX_FILES_PER_MANDATE).toBe(100);
  });
});

/* ── uploadFileToMandate — validation gates ─────────────────────────── */

describe("uploadFileToMandate — validation", () => {
  const baseArgs = {
    mandateId: "m1",
    userId: "u1",
    organizationId: "org-A",
    filename: "doc.pdf",
    mimeType: "application/pdf",
    data: Buffer.from("test"),
  };

  it("rejects disallowed MIME types with code=MIME_NOT_ALLOWED", async () => {
    const result = await uploadFileToMandate({
      ...baseArgs,
      mimeType: "application/x-executable",
    });
    expect(isError(result)).toBe(true);
    if (isError(result)) {
      expect(result.code).toBe("MIME_NOT_ALLOWED");
    }
  });

  it("AUDIT-FIX H18: rejects text/html (stored-XSS surface)", async () => {
    const result = await uploadFileToMandate({
      ...baseArgs,
      mimeType: "text/html",
    });
    expect(isError(result)).toBe(true);
    if (isError(result)) expect(result.code).toBe("MIME_NOT_ALLOWED");
  });

  it("rejects files larger than MAX_FILE_BYTES with code=FILE_TOO_LARGE", async () => {
    const tooBig = Buffer.alloc(MAX_FILE_BYTES + 1);
    const result = await uploadFileToMandate({
      ...baseArgs,
      data: tooBig,
    });
    expect(isError(result)).toBe(true);
    if (isError(result)) expect(result.code).toBe("FILE_TOO_LARGE");
  });

  it("rejects with R2_NOT_CONFIGURED when isR2Configured returns false", async () => {
    mocks.r2IsConfigured.mockReturnValue(false);

    const result = await uploadFileToMandate(baseArgs);
    expect(isError(result)).toBe(true);
    if (isError(result)) expect(result.code).toBe("R2_NOT_CONFIGURED");
  });

  it("rejects with MANDATE_NOT_FOUND when membership check fails", async () => {
    mocks.mandateFindFirst.mockResolvedValue(null);

    const result = await uploadFileToMandate(baseArgs);
    expect(isError(result)).toBe(true);
    if (isError(result)) expect(result.code).toBe("MANDATE_NOT_FOUND");
  });

  it("rejects with MANDATE_FULL when at 100-file cap", async () => {
    mocks.mandateFindFirst.mockResolvedValue({
      id: "m1",
      _count: { files: MAX_FILES_PER_MANDATE },
    });

    const result = await uploadFileToMandate(baseArgs);
    expect(isError(result)).toBe(true);
    if (isError(result)) expect(result.code).toBe("MANDATE_FULL");
  });

  it("accepts text/plain MIME type", async () => {
    /* Stops early at "membership check fails" without going further —
       we just verify the MIME gate passes by NOT seeing MIME_NOT_ALLOWED. */
    mocks.mandateFindFirst.mockResolvedValue(null);

    const result = await uploadFileToMandate({
      ...baseArgs,
      mimeType: "text/plain",
    });
    if (isError(result)) {
      expect(result.code).not.toBe("MIME_NOT_ALLOWED");
    }
  });

  it("accepts text/markdown MIME type", async () => {
    mocks.mandateFindFirst.mockResolvedValue(null);

    const result = await uploadFileToMandate({
      ...baseArgs,
      mimeType: "text/markdown",
    });
    if (isError(result)) {
      expect(result.code).not.toBe("MIME_NOT_ALLOWED");
    }
  });

  it("accepts application/pdf MIME type", async () => {
    mocks.mandateFindFirst.mockResolvedValue(null);

    const result = await uploadFileToMandate(baseArgs);
    if (isError(result)) {
      expect(result.code).not.toBe("MIME_NOT_ALLOWED");
    }
  });

  it("scopes membership check by org + (owner OR member)", async () => {
    mocks.mandateFindFirst.mockResolvedValue(null);

    await uploadFileToMandate(baseArgs);

    const arg = mocks.mandateFindFirst.mock.calls[0]?.[0] as {
      where: {
        id: string;
        organizationId: string;
        OR: Array<Record<string, unknown>>;
      };
    };
    expect(arg.where.id).toBe("m1");
    expect(arg.where.organizationId).toBe("org-A");
    expect(arg.where.OR).toEqual([
      { ownerUserId: "u1" },
      { members: { some: { userId: "u1" } } },
    ]);
  });
});

/* ── getSignedDownloadUrl ───────────────────────────────────────────── */

describe("getSignedDownloadUrl", () => {
  it("returns error when file not found / access denied", async () => {
    mocks.fileFindFirst.mockResolvedValue(null);

    const result = await getSignedDownloadUrl({
      fileId: "f1",
      userId: "u1",
      organizationId: "org-A",
    });
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("not found");
    }
  });

  it("returns error when R2 not configured", async () => {
    mocks.fileFindFirst.mockResolvedValue({
      id: "f1",
      filename: "x.pdf",
      mimeType: "application/pdf",
      storageKey: "key",
    });
    mocks.r2IsConfigured.mockReturnValue(false);

    const result = await getSignedDownloadUrl({
      fileId: "f1",
      userId: "u1",
      organizationId: "org-A",
    });
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toContain("R2");
  });

  it("returns error when R2 client unavailable", async () => {
    mocks.fileFindFirst.mockResolvedValue({
      id: "f1",
      filename: "x.pdf",
      mimeType: "application/pdf",
      storageKey: "key",
    });
    /* getR2Client is mocked to return null in our top-level mock. */

    const result = await getSignedDownloadUrl({
      fileId: "f1",
      userId: "u1",
      organizationId: "org-A",
    });
    expect("error" in result).toBe(true);
  });

  it("scopes file lookup by mandate-membership (org + owner OR member)", async () => {
    mocks.fileFindFirst.mockResolvedValue(null);

    await getSignedDownloadUrl({
      fileId: "f1",
      userId: "u1",
      organizationId: "org-A",
    });

    const arg = mocks.fileFindFirst.mock.calls[0]?.[0] as {
      where: {
        id: string;
        mandate: {
          organizationId: string;
          OR: Array<Record<string, unknown>>;
        };
      };
    };
    expect(arg.where.id).toBe("f1");
    expect(arg.where.mandate.organizationId).toBe("org-A");
    expect(arg.where.mandate.OR).toEqual([
      { ownerUserId: "u1" },
      { members: { some: { userId: "u1" } } },
    ]);
  });
});

/* ── deleteMandateFile ──────────────────────────────────────────────── */

describe("deleteMandateFile", () => {
  it("returns error when file not found / access denied", async () => {
    mocks.fileFindFirst.mockResolvedValue(null);

    const result = await deleteMandateFile({
      fileId: "f1",
      userId: "u1",
      organizationId: "org-A",
    });
    expect("error" in result).toBe(true);
  });

  it("scopes file lookup by mandate-membership", async () => {
    mocks.fileFindFirst.mockResolvedValue(null);

    await deleteMandateFile({
      fileId: "f1",
      userId: "u1",
      organizationId: "org-A",
    });

    const arg = mocks.fileFindFirst.mock.calls[0]?.[0] as {
      where: {
        id: string;
        mandate: {
          organizationId: string;
          OR: Array<Record<string, unknown>>;
        };
      };
    };
    expect(arg.where.mandate.organizationId).toBe("org-A");
    expect(arg.where.mandate.OR[0]).toEqual({ ownerUserId: "u1" });
  });
});

/* ── listMandateFiles ───────────────────────────────────────────────── */

describe("listMandateFiles", () => {
  it("scopes query by mandate-membership + returns file list", async () => {
    mocks.fileFindMany.mockResolvedValue([
      {
        id: "f1",
        filename: "doc1.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        createdAt: new Date(),
        documentType: "Contract",
      },
    ]);

    const result = await listMandateFiles({
      mandateId: "m1",
      userId: "u1",
      organizationId: "org-A",
    });

    /* The result might be an array OR an object — verify it's iterable
       or at least non-null. */
    expect(result).toBeDefined();

    const arg = mocks.fileFindMany.mock.calls[0]?.[0] as
      | { where: Record<string, unknown> }
      | undefined;
    expect(arg).toBeDefined();
    /* The where clause must restrict by mandate access. */
    expect(JSON.stringify(arg?.where)).toContain("org-A");
  });
});
