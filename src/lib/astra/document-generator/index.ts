/**
 * AI Document Generator Engine
 *
 * Generates NCA-submission-ready compliance documents using Claude AI.
 * Separate from the ASTRA chat engine — optimized for long-form document output.
 */

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { collectAssessmentData } from "./data-collector";
import { buildPrompt } from "./prompt-builder";
import { parseMarkdownToSections } from "./content-structurer";
import type {
  DocumentGenerationParams,
  DocumentGenerationResult,
  DocumentStreamEvent,
} from "./types";
import { DOCUMENT_TYPE_META as DOC_META } from "./types";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOKENS = 8192;
const PROMPT_VERSION = "v1.0";

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic | null {
  if (!ANTHROPIC_API_KEY) return null;
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

/**
 * Generate a complete document (non-streaming).
 */
export async function generateDocument(
  params: DocumentGenerationParams,
): Promise<DocumentGenerationResult> {
  const startTime = Date.now();
  const meta = DOC_META[params.documentType];
  const language = params.language || "en";

  // Create the document record
  const doc = await prisma.generatedDocument.create({
    data: {
      userId: params.userId,
      organizationId: params.organizationId,
      documentType: params.documentType,
      title: meta.title,
      language,
      assessmentId: params.assessmentId,
      status: "GENERATING",
      promptVersion: PROMPT_VERSION,
    },
  });

  try {
    const client = getAnthropicClient();
    if (!client) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    // Collect assessment data
    const dataBundle = await collectAssessmentData(
      params.userId,
      params.organizationId,
      params.documentType,
      params.assessmentId,
    );

    // Build prompt
    const { systemPrompt, userMessage } = buildPrompt(dataBundle, language);

    // Call Claude
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const rawContent =
      response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n") || "";

    // Parse to sections
    const sections = parseMarkdownToSections(rawContent);
    const generationTimeMs = Date.now() - startTime;

    // Update record
    await prisma.generatedDocument.update({
      where: { id: doc.id },
      data: {
        status: "COMPLETED",
        content: JSON.parse(JSON.stringify(sections)),
        rawContent,
        modelUsed: MODEL,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        generationTimeMs,
      },
    });

    // Audit log
    await logAuditEvent({
      action: "DOCUMENT_GENERATED",
      userId: params.userId,
      entityType: "GeneratedDocument",
      entityId: doc.id,
      metadata: {
        documentType: params.documentType,
        language,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        generationTimeMs,
        sectionCount: sections.length,
      },
    });

    return {
      documentId: doc.id,
      sections,
      rawContent,
      modelUsed: MODEL,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      generationTimeMs,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    await prisma.generatedDocument.update({
      where: { id: doc.id },
      data: {
        status: "FAILED",
        error: errorMessage,
      },
    });

    throw error;
  }
}

/**
 * Generate a document with streaming via SSE.
 * Returns an async generator that yields DocumentStreamEvents.
 */
export async function* generateDocumentStream(
  params: DocumentGenerationParams,
): AsyncGenerator<DocumentStreamEvent> {
  const startTime = Date.now();
  const meta = DOC_META[params.documentType];
  const language = params.language || "en";

  // Create the document record
  const doc = await prisma.generatedDocument.create({
    data: {
      userId: params.userId,
      organizationId: params.organizationId,
      documentType: params.documentType,
      title: meta.title,
      language,
      assessmentId: params.assessmentId,
      status: "GENERATING",
      promptVersion: PROMPT_VERSION,
    },
  });

  yield { type: "generation_start", documentId: doc.id, title: meta.title };

  try {
    const client = getAnthropicClient();
    if (!client) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    // Collect assessment data
    const dataBundle = await collectAssessmentData(
      params.userId,
      params.organizationId,
      params.documentType,
      params.assessmentId,
    );

    // Build prompt
    const { systemPrompt, userMessage } = buildPrompt(dataBundle, language);

    // Stream from Claude
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    let fullContent = "";
    let currentSectionIndex = -1;
    let sectionBuffer = "";

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        const text = event.delta.text;
        fullContent += text;
        sectionBuffer += text;

        // Check for new section marker
        if (sectionBuffer.includes("## SECTION:")) {
          const parts = sectionBuffer.split("## SECTION:");
          // Emit remaining content of previous section
          if (currentSectionIndex >= 0 && parts[0]) {
            yield {
              type: "section_content",
              sectionIndex: currentSectionIndex,
              content: parts[0],
            };
            yield {
              type: "section_complete",
              sectionIndex: currentSectionIndex,
            };
          }

          // Start new section
          for (let i = 1; i < parts.length; i++) {
            currentSectionIndex++;
            const titleEnd = parts[i].indexOf("\n");
            const title =
              titleEnd >= 0
                ? parts[i].substring(0, titleEnd).trim()
                : parts[i].trim();

            yield {
              type: "section_start",
              sectionIndex: currentSectionIndex,
              title,
            };

            const remainingContent =
              titleEnd >= 0 ? parts[i].substring(titleEnd + 1) : "";
            if (remainingContent) {
              yield {
                type: "section_content",
                sectionIndex: currentSectionIndex,
                content: remainingContent,
              };
            }
          }
          sectionBuffer = "";
        } else if (currentSectionIndex >= 0) {
          // Emit content chunks for current section
          // Only emit when buffer has enough content (avoid very small chunks)
          if (sectionBuffer.length > 50 || text.includes("\n")) {
            yield {
              type: "section_content",
              sectionIndex: currentSectionIndex,
              content: sectionBuffer,
            };
            sectionBuffer = "";
          }
        }
      }
    }

    // Flush remaining buffer
    if (sectionBuffer && currentSectionIndex >= 0) {
      yield {
        type: "section_content",
        sectionIndex: currentSectionIndex,
        content: sectionBuffer,
      };
      yield { type: "section_complete", sectionIndex: currentSectionIndex };
    }

    // Get final message for usage stats
    const finalMessage = await stream.finalMessage();

    // Parse to sections for storage
    const sections = parseMarkdownToSections(fullContent);
    const generationTimeMs = Date.now() - startTime;

    // Update record
    await prisma.generatedDocument.update({
      where: { id: doc.id },
      data: {
        status: "COMPLETED",
        content: JSON.parse(JSON.stringify(sections)),
        rawContent: fullContent,
        modelUsed: MODEL,
        inputTokens: finalMessage.usage.input_tokens,
        outputTokens: finalMessage.usage.output_tokens,
        generationTimeMs,
      },
    });

    await logAuditEvent({
      action: "DOCUMENT_GENERATED",
      userId: params.userId,
      entityType: "GeneratedDocument",
      entityId: doc.id,
      metadata: {
        documentType: params.documentType,
        language,
        inputTokens: finalMessage.usage.input_tokens,
        outputTokens: finalMessage.usage.output_tokens,
        generationTimeMs,
        sectionCount: sections.length,
        streamed: true,
      },
    });

    yield {
      type: "generation_complete",
      documentId: doc.id,
      totalSections: sections.length,
      generationTimeMs,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    await prisma.generatedDocument.update({
      where: { id: doc.id },
      data: {
        status: "FAILED",
        error: errorMessage,
      },
    });

    yield { type: "error", message: errorMessage };
  }
}

/**
 * Start document generation in the background (fire-and-forget).
 * Used by ASTRA tool handlers to avoid blocking the chat.
 */
export async function startBackgroundGeneration(
  params: DocumentGenerationParams,
): Promise<string> {
  const meta = DOC_META[params.documentType];
  const language = params.language || "en";

  // Create the document record immediately
  const doc = await prisma.generatedDocument.create({
    data: {
      userId: params.userId,
      organizationId: params.organizationId,
      documentType: params.documentType,
      title: meta.title,
      language,
      assessmentId: params.assessmentId,
      status: "PENDING",
      promptVersion: PROMPT_VERSION,
    },
  });

  // Start generation in background (fire-and-forget)
  generateDocument({
    ...params,
  }).catch(async (error) => {
    console.error(
      `Background document generation failed for ${doc.id}:`,
      error,
    );
    // The generateDocument function already updates the status to FAILED
  });

  return doc.id;
}
