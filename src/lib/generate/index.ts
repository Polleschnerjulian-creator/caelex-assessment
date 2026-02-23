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
import { SECTION_DEFINITIONS } from "./section-definitions";
import { NCA_DOC_TYPE_MAP } from "./types";
import type {
  NCADocumentType,
  Generate2InitResult,
  Generate2SectionResult,
} from "./types";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.GENERATION_MODEL || "claude-sonnet-4-6";
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

  let parsed: { systemPrompt: string; userMessage: string };
  try {
    parsed = JSON.parse(doc.rawContent) as {
      systemPrompt: string;
      userMessage: string;
    };
  } catch {
    throw new Error("Document prompt context is malformed JSON");
  }
  const { systemPrompt, userMessage } = parsed;

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
        // Use prompt caching — system prompt is identical for all sections of a document.
        // Sections 2+ hit the cache, reducing latency by ~50% and input cost by ~90%.
        system: [
          {
            type: "text" as const,
            text: systemPrompt,
            cache_control: { type: "ephemeral" as const },
          },
        ],
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
        console.error(
          `[generateSection] Section ${sectionNumber} "${sectionTitle}" failed permanently:`,
          { status, attempt, error: lastError.message },
        );
        throw lastError;
      }

      // Exponential backoff: 2s, 4s, 8s
      const delayMs = 2000 * Math.pow(2, attempt);
      console.warn(
        `[generateSection] Retrying section ${sectionNumber} (attempt ${attempt + 1}/${MAX_RETRIES}) after ${delayMs}ms — status ${status}`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError || new Error("Section generation failed after retries");
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
