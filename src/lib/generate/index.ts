/**
 * Generate 2.0 — Orchestrator
 *
 * NCA-submission-ready document generation engine.
 * Uses chunked generation (section-by-section) to stay within Vercel's 60s timeout.
 */

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { collectGenerate2Data } from "./data-collector";
import { buildGenerate2Prompt, buildSectionPrompt } from "./prompt-builder";
import { computeReadiness } from "./readiness";
import { parseMarkdownToSections } from "@/lib/astra/document-generator/content-structurer";
import { SECTION_DEFINITIONS } from "./section-definitions";
import { NCA_DOC_TYPE_MAP } from "./types";
import type {
  NCADocumentType,
  Generate2InitResult,
  Generate2SectionResult,
  Generate2CompleteResult,
} from "./types";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS_PER_SECTION = 3072;
const PROMPT_VERSION = "gen2-v1.0";

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic | null {
  if (!ANTHROPIC_API_KEY) return null;
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

/**
 * Initialize a chunked NCA document generation.
 * Collects data, computes readiness, stores prompt context, returns section list.
 */
export async function initGeneration(
  userId: string,
  organizationId: string,
  documentType: NCADocumentType,
  language: string = "en",
  packageId?: string,
): Promise<Generate2InitResult> {
  const meta = NCA_DOC_TYPE_MAP[documentType];
  const sections = SECTION_DEFINITIONS[documentType];

  // Collect all assessment data
  const dataBundle = await collectGenerate2Data(userId, organizationId);

  // Compute readiness
  const readiness = computeReadiness(documentType, dataBundle);

  // Build 4-layer prompt
  const { systemPrompt, userMessage } = buildGenerate2Prompt(
    documentType,
    dataBundle,
    language,
  );

  // Create NCADocument record with stored prompt context
  const doc = await prisma.nCADocument.create({
    data: {
      userId,
      organizationId,
      packageId,
      documentType,
      title: meta.title,
      language,
      status: "GENERATING",
      readinessScore: readiness.score,
      promptVersion: PROMPT_VERSION,
      rawContent: JSON.stringify({ systemPrompt, userMessage }),
      content: [], // will accumulate sections
    },
  });

  await logAuditEvent({
    action: "DOCUMENT_GENERATED",
    userId,
    entityType: "NCADocument",
    entityId: doc.id,
    metadata: {
      documentType,
      language,
      readinessScore: readiness.score,
      readinessLevel: readiness.level,
      phase: "init",
    },
  });

  return {
    documentId: doc.id,
    sections,
    readinessScore: readiness.score,
    readinessLevel: readiness.level,
  };
}

/**
 * Generate a single section for an existing NCA document.
 */
export async function generateSection(
  documentId: string,
  sectionIndex: number,
  sectionTitle: string,
  sectionNumber: number,
): Promise<Generate2SectionResult> {
  const client = getAnthropicClient();
  if (!client) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  // Load stored prompt context
  const doc = await prisma.nCADocument.findUniqueOrThrow({
    where: { id: documentId },
    select: { rawContent: true },
  });

  if (!doc.rawContent) {
    throw new Error("Document prompt context not found");
  }

  const { systemPrompt, userMessage } = JSON.parse(doc.rawContent) as {
    systemPrompt: string;
    userMessage: string;
  };

  // Build section-specific prompt
  const sectionPrompt = buildSectionPrompt(
    userMessage,
    sectionNumber,
    sectionTitle,
  );

  // Retry with exponential backoff for transient errors (429, 529, 500)
  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS_PER_SECTION,
        temperature: 0.3,
        system: systemPrompt,
        messages: [{ role: "user", content: sectionPrompt }],
      });

      const content =
        response.content
          .filter(
            (block): block is Anthropic.TextBlock => block.type === "text",
          )
          .map((block) => block.text)
          .join("\n") || "";

      return {
        content,
        sectionIndex,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const status = (err as { status?: number }).status;
      const isRetryable = status === 429 || status === 529 || status === 500;

      if (!isRetryable || attempt === MAX_RETRIES) {
        throw lastError;
      }

      // Exponential backoff: 2s, 4s, 8s
      const delayMs = 2000 * Math.pow(2, attempt);
      console.log(
        `[generateSection] Retrying section ${sectionNumber} (attempt ${attempt + 1}/${MAX_RETRIES}) after ${delayMs}ms — status ${status}`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError || new Error("Section generation failed after retries");
}

/**
 * Finalize a chunked generation: assemble sections, count markers, mark COMPLETED.
 */
export async function finalizeGeneration(
  documentId: string,
  userId: string,
  sectionContents: string[],
  totalInputTokens: number,
  totalOutputTokens: number,
  generationTimeMs: number,
): Promise<Generate2CompleteResult> {
  // Filter out null/undefined values and ensure all entries are strings
  const validContents = sectionContents
    .map((s) => (typeof s === "string" ? s : ""))
    .filter((s) => s.length > 0);

  const fullContent = validContents.join("\n\n");

  console.log(
    `[finalizeGeneration] Parsing ${validContents.length} sections, totalChars=${fullContent.length}`,
  );

  const sections = parseMarkdownToSections(fullContent);

  console.log(
    `[finalizeGeneration] Parsed into ${sections.length} report sections`,
  );

  // Count [ACTION REQUIRED] and [EVIDENCE:] markers
  const actionRequiredCount = (
    fullContent.match(/\[ACTION REQUIRED[^\]]*\]/g) || []
  ).length;
  const evidencePlaceholderCount = (
    fullContent.match(/\[EVIDENCE[^\]]*\]/g) || []
  ).length;

  // If no sections were parsed (AI didn't use ## SECTION: markers),
  // create a single section from the raw content as fallback
  const finalSections =
    sections.length > 0
      ? sections
      : [
          {
            title: "Generated Content",
            content: [
              { type: "text" as const, value: fullContent.substring(0, 50000) },
            ],
          },
        ];

  const contentJson = JSON.parse(JSON.stringify(finalSections));

  console.log(`[finalizeGeneration] Updating DB for doc ${documentId}`);

  await prisma.nCADocument.update({
    where: { id: documentId },
    data: {
      status: "COMPLETED",
      content: contentJson,
      rawContent: fullContent,
      modelUsed: MODEL,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      generationTimeMs,
      actionRequiredCount,
      evidencePlaceholderCount,
    },
  });

  console.log(`[finalizeGeneration] DB updated, logging audit event`);

  // Audit log in a try-catch so it doesn't block the response
  try {
    await logAuditEvent({
      action: "DOCUMENT_GENERATED",
      userId,
      entityType: "NCADocument",
      entityId: documentId,
      metadata: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        generationTimeMs,
        sectionCount: finalSections.length,
        actionRequiredCount,
        evidencePlaceholderCount,
        phase: "complete",
      },
    });
  } catch (auditErr) {
    console.error(
      "[finalizeGeneration] Audit log failed (non-blocking):",
      auditErr,
    );
  }

  return {
    content: finalSections,
    actionRequiredCount,
    evidencePlaceholderCount,
  };
}

/**
 * Mark a document as failed.
 */
export async function markGenerationFailed(
  documentId: string,
  error: string,
): Promise<void> {
  await prisma.nCADocument.update({
    where: { id: documentId },
    data: {
      status: "FAILED",
      error,
    },
  });
}
