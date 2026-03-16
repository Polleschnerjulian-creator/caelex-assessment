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
    anthropicClient = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
      // Explicit timeout prevents indefinite hangs if Anthropic is slow.
      // 120s per API call — well within Vercel's maxDuration=300.
      timeout: 120_000,
    });
  }
  return anthropicClient;
}

/**
 * Prompt context stored in rawContent during GENERATING status.
 * Separated from the final markdown which overwrites rawContent on completion.
 */
export interface StoredPromptContext {
  _type: "prompt_context";
  systemPrompt: string;
  userMessage: string;
  model: string;
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
  // H-7: Early API key check — fail fast before any DB operations
  if (!getAnthropicClient()) {
    throw new Error(
      "Document generation requires ANTHROPIC_API_KEY to be configured",
    );
  }

  const meta = NCA_DOC_TYPE_MAP[documentType];
  const sections = SECTION_DEFINITIONS[documentType];

  // Collect all assessment data (H-6: passes organizationId for org-scoped queries)
  const dataBundle = await collectGenerate2Data(userId, organizationId);

  // Compute readiness
  const readiness = computeReadiness(documentType, dataBundle);

  // Build 4-layer prompt
  const { systemPrompt, userMessage } = buildGenerate2Prompt(
    documentType,
    dataBundle,
    language,
  );

  // H-5: Store prompt context with type marker and model in rawContent.
  // During GENERATING status, rawContent holds the prompt context as JSON.
  // On completion (complete/route.ts), rawContent is overwritten with final markdown.
  const promptContext: StoredPromptContext = {
    _type: "prompt_context",
    systemPrompt,
    userMessage,
    model: MODEL,
  };

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
      modelUsed: MODEL,
      rawContent: JSON.stringify(promptContext),
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

  // H-5: Load stored prompt context (includes model used during init)
  const doc = await prisma.nCADocument.findUniqueOrThrow({
    where: { id: documentId },
    select: { rawContent: true },
  });

  if (!doc.rawContent) {
    throw new Error("Document prompt context not found");
  }

  let parsed: StoredPromptContext;
  try {
    parsed = JSON.parse(doc.rawContent) as StoredPromptContext;
  } catch {
    throw new Error("Document prompt context is malformed JSON");
  }

  if (parsed._type !== "prompt_context") {
    throw new Error(
      "Document rawContent does not contain prompt context — document may already be completed",
    );
  }

  // L-9: Use the model stored during init for consistency across all sections
  const { systemPrompt, userMessage, model: storedModel } = parsed;
  const sectionModel = storedModel || MODEL;

  // Build section-specific prompt
  const sectionPrompt = buildSectionPrompt(
    userMessage,
    sectionNumber,
    sectionTitle,
  );

  // Single attempt — the CLIENT already retries on 429/5xx with backoff.
  // Removing the server-side retry loop prevents double-retry amplification
  // that caused multi-minute silent hangs (the "freeze" bug).
  const response = await client.messages.create({
    model: sectionModel,
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
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n") || "";

  return {
    content,
    sectionIndex,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
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
