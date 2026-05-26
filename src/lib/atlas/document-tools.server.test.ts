import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V3 — document-tools test coverage (T0.3).
 *
 * The 6 document tools (extract_text_from_pdf, find_clauses,
 * summarize_document, classify_document, compare_documents,
 * search_mandate_knowledge) operate on AtlasMandateFile.extractedText
 * with mandate-membership scoping + encryption-at-rest decryption +
 * vault-content trust wrapping (SEC-T0-1, SEC-T0-2).
 *
 * This test suite focuses on the access-control + validation +
 * pure-data paths (extract + find_clauses). The LLM-dependent tools
 * (summarize / classify / compare) are tested for validation +
 * AI-not-configured paths; full LLM happy paths defer to integration
 * tests since they need a real Anthropic response shape.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { findFirst, decryptField, wrapVault, buildClient } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  decryptField: vi.fn(),
  wrapVault: vi.fn(),
  buildClient: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    atlasMandateFile: { findFirst },
  },
}));

vi.mock("./atlas-encryption", () => ({
  decryptAtlasField: decryptField,
}));

vi.mock("./vault-wrap", () => ({
  wrapVaultContent: wrapVault,
}));

vi.mock("./anthropic-client", () => ({
  buildAnthropicClient: buildClient,
}));

import {
  DOCUMENT_TOOLS,
  isDocumentToolName,
  executeDocumentTool,
} from "./document-tools.server";

function parse(content: string): Record<string, unknown> {
  return JSON.parse(content) as Record<string, unknown>;
}

beforeEach(() => {
  findFirst.mockReset();
  decryptField.mockReset();
  wrapVault.mockReset();
  buildClient.mockReset();
  /* Default decrypt: pass-through. */
  decryptField.mockImplementation(async (v: string | null) => v);
  /* Default wrap: append a marker so tests can verify wrapping happened. */
  wrapVault.mockImplementation((text: string) => `<vc>${text}</vc>`);
});

/* ── Schema + guards ────────────────────────────────────────────────── */

describe("document-tools schema", () => {
  it("exports exactly 6 tools", () => {
    expect(DOCUMENT_TOOLS).toHaveLength(6);
  });

  it("tool names match the V2 Sprint 5 contract", () => {
    const names = DOCUMENT_TOOLS.map((t) => t.name).sort();
    expect(names).toEqual([
      "classify_document",
      "compare_documents",
      "extract_text_from_pdf",
      "find_clauses",
      "search_mandate_knowledge",
      "summarize_document",
    ]);
  });
});

describe("isDocumentToolName", () => {
  it("returns true for all 6 document tools", () => {
    for (const t of DOCUMENT_TOOLS) {
      expect(isDocumentToolName(t.name)).toBe(true);
    }
  });

  it("returns false for unrelated names", () => {
    expect(isDocumentToolName("classify_nis2")).toBe(false);
    expect(isDocumentToolName("web_search")).toBe(false);
    expect(isDocumentToolName("")).toBe(false);
  });
});

describe("executeDocumentTool dispatcher", () => {
  it("returns isError for unknown tool names", async () => {
    const result = await executeDocumentTool({
      name: "bogus_doc_tool",
      input: {},
      callerUserId: "u1",
      callerOrgId: "org-A",
    });
    expect(result.isError).toBe(true);
    expect(parse(result.content).error).toContain("Unknown document tool");
  });
});

/* ── extract_text_from_pdf ──────────────────────────────────────────── */

describe("extract_text_from_pdf", () => {
  it("validates: missing fileId returns error", async () => {
    const result = await executeDocumentTool({
      name: "extract_text_from_pdf",
      input: {},
      callerUserId: "u1",
      callerOrgId: "org-A",
    });
    expect(result.isError).toBe(true);
    expect(parse(result.content).error).toContain("fileId");
  });

  it("file not found / access denied → isError=true", async () => {
    findFirst.mockResolvedValue(null);

    const result = await executeDocumentTool({
      name: "extract_text_from_pdf",
      input: { fileId: "f-xyz" },
      callerUserId: "u1",
      callerOrgId: "org-A",
    });
    expect(result.isError).toBe(true);
    expect(parse(result.content).error).toContain("not found");
  });

  it("file with no extracted text → returns NEEDS_EXTRACTION_NOTE", async () => {
    findFirst.mockResolvedValue({
      id: "f1",
      filename: "doc.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1000,
      documentType: "Contract",
      extractedText: null,
      mandateId: "m1",
    });

    const result = await executeDocumentTool({
      name: "extract_text_from_pdf",
      input: { fileId: "f1" },
      callerUserId: "u1",
      callerOrgId: "org-A",
    });
    expect(result.isError).toBe(false);
    const payload = parse(result.content);
    expect(payload.text).toBeNull();
    expect(payload.message).toContain("noch nicht extrahiert");
  });

  it("happy path: returns vault-wrapped text + size + metadata", async () => {
    findFirst.mockResolvedValue({
      id: "f1",
      filename: "doc.txt",
      mimeType: "text/plain",
      sizeBytes: 500,
      documentType: "Memo",
      extractedText: "encrypted-blob",
      mandateId: "m1",
    });
    decryptField.mockResolvedValue("Plain text content of the document.");

    const result = await executeDocumentTool({
      name: "extract_text_from_pdf",
      input: { fileId: "f1" },
      callerUserId: "u1",
      callerOrgId: "org-A",
    });
    expect(result.isError).toBe(false);
    const payload = parse(result.content);
    expect(payload.fileId).toBe("f1");
    expect(payload.filename).toBe("doc.txt");
    expect(payload.text).toContain("<vc>"); // wrapped
    expect(payload.text).toContain("Plain text content");
    expect(payload.sizeChars).toBe(
      "Plain text content of the document.".length,
    );
  });

  it("truncates long text at maxChars boundary (default 20000)", async () => {
    findFirst.mockResolvedValue({
      id: "f1",
      filename: "huge.txt",
      mimeType: "text/plain",
      sizeBytes: 99999,
      documentType: "Memo",
      extractedText: "A".repeat(30_000),
      mandateId: "m1",
    });
    decryptField.mockResolvedValue("A".repeat(30_000));

    const result = await executeDocumentTool({
      name: "extract_text_from_pdf",
      input: { fileId: "f1" },
      callerUserId: "u1",
      callerOrgId: "org-A",
    });
    const payload = parse(result.content) as { text: string };
    expect(payload.text).toContain("truncated at 20000");
    expect((payload as { sizeChars: number }).sizeChars).toBe(30_000);
  });

  it("respects custom maxChars up to 50_000 cap", async () => {
    findFirst.mockResolvedValue({
      id: "f1",
      filename: "f.txt",
      mimeType: "text/plain",
      sizeBytes: 99999,
      documentType: "Memo",
      extractedText: "A".repeat(80_000),
      mandateId: "m1",
    });
    decryptField.mockResolvedValue("A".repeat(80_000));

    const result = await executeDocumentTool({
      name: "extract_text_from_pdf",
      input: { fileId: "f1", maxChars: 100_000 }, // exceeds cap
      callerUserId: "u1",
      callerOrgId: "org-A",
    });
    const payload = parse(result.content) as { text: string };
    /* Cap is 50_000 — must show truncation at 50000. */
    expect(payload.text).toContain("truncated at 50000");
  });

  it("queries with mandate-membership scope (org + ownerUser OR member)", async () => {
    findFirst.mockResolvedValue(null);
    await executeDocumentTool({
      name: "extract_text_from_pdf",
      input: { fileId: "f1" },
      callerUserId: "u1",
      callerOrgId: "org-A",
    });
    const arg = findFirst.mock.calls[0]?.[0] as {
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

/* ── find_clauses ───────────────────────────────────────────────────── */

describe("find_clauses", () => {
  it("validates: missing fileId or clauseType returns error", async () => {
    let r = await executeDocumentTool({
      name: "find_clauses",
      input: { clauseType: "liability_cap" },
      callerUserId: "u1",
      callerOrgId: "org-A",
    });
    expect(r.isError).toBe(true);

    r = await executeDocumentTool({
      name: "find_clauses",
      input: { fileId: "f1" },
      callerUserId: "u1",
      callerOrgId: "org-A",
    });
    expect(r.isError).toBe(true);
  });

  it("file not found → isError=true", async () => {
    findFirst.mockResolvedValue(null);
    const result = await executeDocumentTool({
      name: "find_clauses",
      input: { fileId: "f1", clauseType: "liability_cap" },
      callerUserId: "u1",
      callerOrgId: "org-A",
    });
    expect(result.isError).toBe(true);
  });

  it("file with no text → returns empty matches with note", async () => {
    findFirst.mockResolvedValue({
      id: "f1",
      filename: "x",
      mimeType: "application/pdf",
      sizeBytes: 0,
      documentType: null,
      extractedText: null,
      mandateId: "m1",
    });
    const result = await executeDocumentTool({
      name: "find_clauses",
      input: { fileId: "f1", clauseType: "liability_cap" },
      callerUserId: "u1",
      callerOrgId: "org-A",
    });
    expect(result.isError).toBe(false);
    const payload = parse(result.content);
    expect(payload.matches).toEqual([]);
  });

  it("unknown clauseType → returns error with allowed list", async () => {
    findFirst.mockResolvedValue({
      id: "f1",
      filename: "x",
      mimeType: "text/plain",
      sizeBytes: 100,
      documentType: null,
      extractedText: "Some contract text",
      mandateId: "m1",
    });
    decryptField.mockResolvedValue("Some contract text");

    const result = await executeDocumentTool({
      name: "find_clauses",
      input: { fileId: "f1", clauseType: "nonexistent_type" },
      callerUserId: "u1",
      callerOrgId: "org-A",
    });
    expect(result.isError).toBe(true);
    expect(parse(result.content).error).toContain("liability_cap");
  });

  it("matches liability_cap pattern in English text", async () => {
    findFirst.mockResolvedValue({
      id: "f1",
      filename: "contract.txt",
      mimeType: "text/plain",
      sizeBytes: 200,
      documentType: "Contract",
      extractedText:
        "Section 5. Liability. Maximum aggregate liability shall not exceed $10,000,000.",
      mandateId: "m1",
    });
    decryptField.mockResolvedValue(
      "Section 5. Liability. Maximum aggregate liability shall not exceed $10,000,000.",
    );

    const result = await executeDocumentTool({
      name: "find_clauses",
      input: { fileId: "f1", clauseType: "liability_cap" },
      callerUserId: "u1",
      callerOrgId: "org-A",
    });
    expect(result.isError).toBe(false);
    const payload = parse(result.content) as {
      matchCount: number;
      matches: Array<{ snippet: string }>;
    };
    expect(payload.matchCount).toBeGreaterThan(0);
    expect(payload.matches[0].snippet).toContain("<vc>"); // vault-wrapped
  });

  it("matches kündigung pattern in German text", async () => {
    findFirst.mockResolvedValue({
      id: "f1",
      filename: "v.txt",
      mimeType: "text/plain",
      sizeBytes: 100,
      documentType: null,
      extractedText:
        "§ 8. Kündigung. Die Vereinbarung kann ordentlich gekündigt werden.",
      mandateId: "m1",
    });
    decryptField.mockResolvedValue(
      "§ 8. Kündigung. Die Vereinbarung kann ordentlich gekündigt werden.",
    );

    const result = await executeDocumentTool({
      name: "find_clauses",
      input: { fileId: "f1", clauseType: "termination" },
      callerUserId: "u1",
      callerOrgId: "org-A",
    });
    const payload = parse(result.content) as { matchCount: number };
    expect(payload.matchCount).toBeGreaterThan(0);
  });

  it("returns hint when no matches found", async () => {
    findFirst.mockResolvedValue({
      id: "f1",
      filename: "x",
      mimeType: "text/plain",
      sizeBytes: 100,
      documentType: null,
      extractedText: "Nothing about liability or kündigung here.",
      mandateId: "m1",
    });
    decryptField.mockResolvedValue(
      "Nothing about liability or kündigung here.",
    );

    const result = await executeDocumentTool({
      name: "find_clauses",
      input: { fileId: "f1", clauseType: "force_majeure" },
      callerUserId: "u1",
      callerOrgId: "org-A",
    });
    const payload = parse(result.content) as {
      matchCount: number;
      hint?: string;
    };
    expect(payload.matchCount).toBe(0);
    expect(payload.hint).toContain("Kein Treffer");
  });
});

/* ── LLM-dependent tools — validation + AI-not-configured paths ────── */

describe("summarize_document — validation + AI gating", () => {
  it("validates: missing fileId returns error", async () => {
    const result = await executeDocumentTool({
      name: "summarize_document",
      input: {},
      callerUserId: "u1",
      callerOrgId: "org-A",
    });
    expect(result.isError).toBe(true);
  });

  it("returns 'AI not configured' when buildAnthropicClient returns null", async () => {
    findFirst.mockResolvedValue({
      id: "f1",
      filename: "x",
      mimeType: "text/plain",
      sizeBytes: 100,
      documentType: null,
      extractedText: "Some text",
      mandateId: "m1",
    });
    decryptField.mockResolvedValue("Some text");
    buildClient.mockReturnValue(null);

    const result = await executeDocumentTool({
      name: "summarize_document",
      input: { fileId: "f1" },
      callerUserId: "u1",
      callerOrgId: "org-A",
    });
    expect(result.isError).toBe(true);
    expect(parse(result.content).error).toContain("AI not configured");
  });
});

describe("classify_document — validation", () => {
  it("validates: missing fileId returns error", async () => {
    const result = await executeDocumentTool({
      name: "classify_document",
      input: {},
      callerUserId: "u1",
      callerOrgId: "org-A",
    });
    expect(result.isError).toBe(true);
  });
});

describe("compare_documents — validation", () => {
  it("validates: missing fileIdA or fileIdB returns error", async () => {
    const r = await executeDocumentTool({
      name: "compare_documents",
      input: { fileIdA: "f1" },
      callerUserId: "u1",
      callerOrgId: "org-A",
    });
    expect(r.isError).toBe(true);
  });
});

describe("search_mandate_knowledge — validation", () => {
  it("validates: missing query returns error", async () => {
    const result = await executeDocumentTool({
      name: "search_mandate_knowledge",
      input: { mandateId: "m1" },
      callerUserId: "u1",
      callerOrgId: "org-A",
    });
    expect(result.isError).toBe(true);
  });
});
