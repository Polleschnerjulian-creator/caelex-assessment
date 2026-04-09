import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

// Mock dependencies
const mockCollectGenerate2Data = vi.fn();
const mockBuildGenerate2Prompt = vi.fn();
const mockBuildSectionPrompt = vi.fn();
const mockComputeReadiness = vi.fn();
const mockLogAuditEvent = vi.fn();

vi.mock("./data-collector", () => ({
  collectGenerate2Data: (...args: unknown[]) =>
    mockCollectGenerate2Data(...args),
}));

vi.mock("./prompt-builder", () => ({
  buildGenerate2Prompt: (...args: unknown[]) =>
    mockBuildGenerate2Prompt(...args),
  buildSectionPrompt: (...args: unknown[]) => mockBuildSectionPrompt(...args),
}));

vi.mock("./readiness", () => ({
  computeReadiness: (...args: unknown[]) => mockComputeReadiness(...args),
}));

vi.mock("@/lib/audit", () => ({
  logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
}));

const mockNCADocumentCreate = vi.fn();
const mockNCADocumentFindUniqueOrThrow = vi.fn();
const mockNCADocumentUpdate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    nCADocument: {
      create: (...args: unknown[]) => mockNCADocumentCreate(...args),
      findUniqueOrThrow: (...args: unknown[]) =>
        mockNCADocumentFindUniqueOrThrow(...args),
      update: (...args: unknown[]) => mockNCADocumentUpdate(...args),
    },
  },
}));

// Mock Anthropic SDK — the real module checks process.env.ANTHROPIC_API_KEY at
// module scope. To bypass this, we mock the entire @anthropic-ai/sdk module and
// also replace the internal getAnthropicClient via a vi.spyOn approach.
// However, getAnthropicClient is not exported. Instead, we mock the Anthropic class
// to be always constructable and set the env before the dynamic import.
const mockMessagesCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockMessagesCreate };
    },
  };
});

// We need to re-import with ANTHROPIC_API_KEY set.
// Use dynamic import after setting env.

describe("index.ts orchestrator", () => {
  let initGeneration: typeof import("./index").initGeneration;
  let generateSection: typeof import("./index").generateSection;
  let markGenerationFailed: typeof import("./index").markGenerationFailed;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset module registry so ANTHROPIC_API_KEY is re-evaluated
    vi.resetModules();

    // Set env BEFORE importing the module
    process.env.ANTHROPIC_API_KEY = "test-key-123";

    // Re-mock everything that was cleared by resetModules
    vi.doMock("server-only", () => ({}));
    vi.doMock("./data-collector", () => ({
      collectGenerate2Data: (...args: unknown[]) =>
        mockCollectGenerate2Data(...args),
    }));
    vi.doMock("./prompt-builder", () => ({
      buildGenerate2Prompt: (...args: unknown[]) =>
        mockBuildGenerate2Prompt(...args),
      buildSectionPrompt: (...args: unknown[]) =>
        mockBuildSectionPrompt(...args),
    }));
    vi.doMock("./readiness", () => ({
      computeReadiness: (...args: unknown[]) => mockComputeReadiness(...args),
    }));
    vi.doMock("@/lib/audit", () => ({
      logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
    }));
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        nCADocument: {
          create: (...args: unknown[]) => mockNCADocumentCreate(...args),
          findUniqueOrThrow: (...args: unknown[]) =>
            mockNCADocumentFindUniqueOrThrow(...args),
          update: (...args: unknown[]) => mockNCADocumentUpdate(...args),
        },
      },
    }));
    vi.doMock("@anthropic-ai/sdk", () => ({
      default: class MockAnthropic {
        messages = { create: mockMessagesCreate };
      },
    }));

    // Now import the module
    const mod = await import("./index");
    initGeneration = mod.initGeneration;
    generateSection = mod.generateSection;
    markGenerationFailed = mod.markGenerationFailed;

    // Default mock values
    mockCollectGenerate2Data.mockResolvedValue({
      operator: {
        organizationName: "Test Corp",
        operatorType: "SCO",
        establishmentCountry: "DE",
        userId: "user-123",
      },
      debris: null,
      cybersecurity: null,
      spacecraft: [],
    });

    mockBuildGenerate2Prompt.mockReturnValue({
      systemPrompt: "System prompt content",
      userMessage: "User message content",
    });

    mockComputeReadiness.mockReturnValue({
      documentType: "DMP",
      score: 75,
      level: "partial",
      presentFields: 5,
      totalFields: 9,
      missingCritical: [],
    });

    mockNCADocumentCreate.mockResolvedValue({
      id: "doc-123",
    });

    mockLogAuditEvent.mockResolvedValue(undefined);
    mockNCADocumentUpdate.mockResolvedValue({});

    mockNCADocumentFindUniqueOrThrow.mockResolvedValue({
      rawContent: JSON.stringify({
        _type: "prompt_context",
        systemPrompt: "System prompt",
        userMessage: "User message",
      }),
    });

    mockBuildSectionPrompt.mockReturnValue("Section prompt content");

    mockMessagesCreate.mockResolvedValue({
      content: [{ type: "text", text: "Generated section content" }],
      usage: { input_tokens: 100, output_tokens: 200 },
    });
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  describe("initGeneration", () => {
    it("returns document ID, sections, and readiness", async () => {
      const result = await initGeneration("user-123", "org-456", "DMP", "en");
      expect(result).toHaveProperty("documentId");
      expect(result).toHaveProperty("sections");
      expect(result).toHaveProperty("readinessScore");
      expect(result).toHaveProperty("readinessLevel");
      expect(result.documentId).toBe("doc-123");
      expect(result.readinessScore).toBe(75);
      expect(result.readinessLevel).toBe("partial");
    });

    it("calls collectGenerate2Data with correct parameters", async () => {
      await initGeneration("user-abc", "org-xyz", "CYBER_POLICY", "de");
      expect(mockCollectGenerate2Data).toHaveBeenCalledWith(
        "user-abc",
        "org-xyz",
      );
    });

    it("calls buildGenerate2Prompt with correct parameters", async () => {
      await initGeneration("user-123", "org-456", "DMP", "fr");
      expect(mockBuildGenerate2Prompt).toHaveBeenCalledWith(
        "DMP",
        expect.any(Object),
        "fr",
      );
    });

    it("creates an NCA document record", async () => {
      await initGeneration("user-123", "org-456", "DMP", "en");
      expect(mockNCADocumentCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-123",
            organizationId: "org-456",
            documentType: "DMP",
            status: "GENERATING",
            language: "en",
          }),
        }),
      );
    });

    it("logs an audit event", async () => {
      await initGeneration("user-123", "org-456", "DMP", "en");
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "DOCUMENT_GENERATED",
          userId: "user-123",
          entityType: "NCADocument",
          entityId: "doc-123",
        }),
      );
    });

    it("uses default language 'en' when not specified", async () => {
      await initGeneration("user-123", "org-456", "DMP");
      expect(mockBuildGenerate2Prompt).toHaveBeenCalledWith(
        "DMP",
        expect.any(Object),
        "en",
      );
    });

    it("passes packageId when provided", async () => {
      await initGeneration("user-123", "org-456", "DMP", "en", "pkg-789");
      expect(mockNCADocumentCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            packageId: "pkg-789",
          }),
        }),
      );
    });

    it("returns sections for the given document type", async () => {
      const result = await initGeneration("user-123", "org-456", "DMP", "en");
      expect(result.sections).toBeDefined();
      expect(Array.isArray(result.sections)).toBe(true);
      expect(result.sections.length).toBeGreaterThan(0);
    });
  });

  describe("generateSection", () => {
    it("returns generated content with token counts", async () => {
      const result = await generateSection(
        "doc-123",
        0,
        "Executive Summary",
        2,
      );
      expect(result).toHaveProperty("content");
      expect(result).toHaveProperty("sectionIndex", 0);
      expect(result).toHaveProperty("inputTokens", 100);
      expect(result).toHaveProperty("outputTokens", 200);
      expect(result.content).toBe("Generated section content");
    });

    it("throws when document prompt context is not found", async () => {
      mockNCADocumentFindUniqueOrThrow.mockResolvedValue({
        rawContent: null,
      });

      await expect(generateSection("doc-123", 0, "Test", 1)).rejects.toThrow(
        "Document prompt context not found",
      );
    });

    it("throws when document prompt context is malformed JSON", async () => {
      mockNCADocumentFindUniqueOrThrow.mockResolvedValue({
        rawContent: "not valid json",
      });

      await expect(generateSection("doc-123", 0, "Test", 1)).rejects.toThrow(
        "Document prompt context is malformed JSON",
      );
    });

    it("calls buildSectionPrompt with correct parameters", async () => {
      await generateSection("doc-123", 2, "Orbital Parameters", 3);
      expect(mockBuildSectionPrompt).toHaveBeenCalledWith(
        "User message",
        3,
        "Orbital Parameters",
      );
    });

    it("handles non-retryable errors immediately", async () => {
      const error = new Error("Not found");
      (error as unknown as { status: number }).status = 404;
      mockMessagesCreate.mockRejectedValue(error);

      await expect(generateSection("doc-123", 0, "Test", 1)).rejects.toThrow(
        "Not found",
      );
    });

    it("handles response with multiple text blocks", async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [
          { type: "text", text: "Part 1" },
          { type: "text", text: "Part 2" },
        ],
        usage: { input_tokens: 50, output_tokens: 100 },
      });

      const result = await generateSection("doc-123", 0, "Test", 1);
      expect(result.content).toBe("Part 1\nPart 2");
    });

    it("handles response with non-text blocks (filters them out)", async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [
          { type: "text", text: "Real content" },
          { type: "tool_use", id: "tool-1", name: "test" },
        ],
        usage: { input_tokens: 50, output_tokens: 100 },
      });

      const result = await generateSection("doc-123", 0, "Test", 1);
      expect(result.content).toBe("Real content");
    });

    it("handles empty response content", async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [],
        usage: { input_tokens: 50, output_tokens: 0 },
      });

      const result = await generateSection("doc-123", 0, "Test", 1);
      expect(result.content).toBe("");
    });

    it("wraps non-Error thrown values into Error objects", async () => {
      mockMessagesCreate.mockRejectedValue("string error");

      await expect(generateSection("doc-123", 0, "Test", 1)).rejects.toThrow(
        "string error",
      );
    });
  });

  describe("markGenerationFailed", () => {
    it("updates the document status to FAILED with error message", async () => {
      await markGenerationFailed("doc-123", "Generation timed out");
      expect(mockNCADocumentUpdate).toHaveBeenCalledWith({
        where: { id: "doc-123" },
        data: {
          status: "FAILED",
          error: "Generation timed out",
        },
      });
    });

    it("calls prisma update with correct document ID", async () => {
      await markGenerationFailed("doc-xyz", "API error");
      expect(mockNCADocumentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "doc-xyz" },
        }),
      );
    });
  });
});
