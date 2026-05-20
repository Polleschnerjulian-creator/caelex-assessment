/**
 * AI Blocks Service (Sprint B3)
 *
 * CRUD + execution for durable, re-runnable prompt blocks. Calls
 * Anthropic Claude when ANTHROPIC_API_KEY is set; soft-fails to a
 * "no LLM configured" execution when missing (still records the
 * AIBlockExecution row with status=FAILED for audit).
 *
 * Public API:
 *   createAIBlock(input)                  → AIBlockSummary
 *   listAIBlocksForOwner(orgId, type, id) → AIBlockSummary[]
 *   listAIBlocksForOrg(orgId)             → AIBlockSummary[]
 *   getAIBlockById(orgId, blockId)        → AIBlockSummary | null
 *   runAIBlock(blockId, context)          → AIBlockExecutionResult
 *   deleteAIBlock(orgId, blockId)         → boolean
 *
 * Org-scoped: all reads + writes filter by organizationId. Never throws —
 * Prisma errors are returned as failed-execution rows so the UI can
 * surface the issue.
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type {
  AIBlockExecutionResult,
  AIBlockOwnerType,
  AIBlockSummary,
  AIBlockRunContext,
  CreateAIBlockInput,
} from "./types";

// ─── Configuration ─────────────────────────────────────────────────────────

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 2048;

// ─── Create ────────────────────────────────────────────────────────────────

export async function createAIBlock(
  input: CreateAIBlockInput,
): Promise<AIBlockSummary> {
  const row = await prisma.aIBlock.create({
    data: {
      organizationId: input.organizationId,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      name: input.name,
      description: input.description ?? null,
      prompt: input.prompt,
      triggerType: input.triggerType,
      schedule: input.schedule ?? null,
      regulationRef: input.regulationRef ?? null,
      isPinned: input.isPinned ?? false,
      displayIcon: input.displayIcon ?? null,
    },
  });
  return toSummary(row);
}

// ─── List ──────────────────────────────────────────────────────────────────

export async function listAIBlocksForOwner(
  organizationId: string,
  ownerType: AIBlockOwnerType,
  ownerId: string,
): Promise<AIBlockSummary[]> {
  const rows = await prisma.aIBlock.findMany({
    where: { organizationId, ownerType, ownerId },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(toSummary);
}

export async function listAIBlocksForOrg(
  organizationId: string,
  options: { limit?: number; onlyPinned?: boolean } = {},
): Promise<AIBlockSummary[]> {
  const rows = await prisma.aIBlock.findMany({
    where: {
      organizationId,
      ...(options.onlyPinned ? { isPinned: true } : {}),
    },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: options.limit ?? 50,
  });
  return rows.map(toSummary);
}

export async function getAIBlockById(
  organizationId: string,
  blockId: string,
): Promise<AIBlockSummary | null> {
  const row = await prisma.aIBlock.findFirst({
    where: { id: blockId, organizationId },
  });
  return row ? toSummary(row) : null;
}

// ─── Execute ───────────────────────────────────────────────────────────────

export async function runAIBlock(
  organizationId: string,
  blockId: string,
  context: AIBlockRunContext,
): Promise<AIBlockExecutionResult> {
  const block = await prisma.aIBlock.findFirst({
    where: { id: blockId, organizationId },
  });
  if (!block) {
    return failedExecution(blockId, context, "Block not found or not in scope");
  }

  // Start an execution row in PENDING state.
  const execution = await prisma.aIBlockExecution.create({
    data: {
      blockId,
      triggeredBy: context.triggeredBy,
      triggerReason: context.triggerReason ?? null,
      status: "PENDING",
      modelName: DEFAULT_MODEL,
      engineVersion: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "dev",
    },
  });

  const t0 = Date.now();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return markFailed(
      execution.id,
      blockId,
      "ANTHROPIC_API_KEY not configured",
      t0,
    );
  }

  try {
    // Compose the full prompt: block.prompt + optional contextPayload.
    const composedPrompt = composePrompt(block.prompt, context.contextPayload);

    // Call Anthropic API directly (no streaming for blocks — we want a
    // single, persistable output).
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: DEFAULT_MAX_TOKENS,
      messages: [{ role: "user", content: composedPrompt }],
    });

    const output = response.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("\n\n");

    const completed = await prisma.aIBlockExecution.update({
      where: { id: execution.id },
      data: {
        status: "SUCCESS",
        output,
        completedAt: new Date(),
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    });

    // Update denormalized fields on the block itself.
    await prisma.aIBlock.update({
      where: { id: blockId },
      data: {
        lastRunAt: completed.completedAt ?? new Date(),
        lastRunStatus: "SUCCESS",
        modelName: DEFAULT_MODEL,
      },
    });

    return {
      id: completed.id,
      blockId,
      status: "SUCCESS",
      output: completed.output,
      errorMessage: null,
      startedAt: completed.startedAt.toISOString(),
      completedAt: completed.completedAt?.toISOString() ?? null,
      inputTokens: completed.inputTokens,
      outputTokens: completed.outputTokens,
      modelName: completed.modelName,
      durationMs: Date.now() - t0,
    };
  } catch (err) {
    return markFailed(
      execution.id,
      blockId,
      err instanceof Error ? err.message : "Unknown LLM error",
      t0,
    );
  }
}

// ─── Delete ────────────────────────────────────────────────────────────────

export async function deleteAIBlock(
  organizationId: string,
  blockId: string,
): Promise<boolean> {
  const block = await prisma.aIBlock.findFirst({
    where: { id: blockId, organizationId },
    select: { id: true },
  });
  if (!block) return false;
  await prisma.aIBlock.delete({ where: { id: blockId } });
  return true;
}

// ─── Internals ─────────────────────────────────────────────────────────────

function composePrompt(
  basePrompt: string,
  context: Record<string, unknown> | undefined,
): string {
  if (!context || Object.keys(context).length === 0) {
    return basePrompt;
  }
  return [
    basePrompt,
    "",
    "─── Context ──────────────────────────────",
    JSON.stringify(context, null, 2),
  ].join("\n");
}

async function markFailed(
  executionId: string,
  blockId: string,
  errorMessage: string,
  t0: number,
): Promise<AIBlockExecutionResult> {
  try {
    const completed = await prisma.aIBlockExecution.update({
      where: { id: executionId },
      data: {
        status: "FAILED",
        errorMessage,
        completedAt: new Date(),
      },
    });
    await prisma.aIBlock
      .update({
        where: { id: blockId },
        data: { lastRunAt: new Date(), lastRunStatus: "FAILED" },
      })
      .catch(() => null);

    return {
      id: completed.id,
      blockId,
      status: "FAILED",
      output: null,
      errorMessage,
      startedAt: completed.startedAt.toISOString(),
      completedAt: completed.completedAt?.toISOString() ?? null,
      inputTokens: null,
      outputTokens: null,
      modelName: completed.modelName,
      durationMs: Date.now() - t0,
    };
  } catch (err) {
    logger.error("[ai-blocks] markFailed failed", {
      executionId,
      error: err instanceof Error ? err.message : "unknown",
    });
    return failedExecution(blockId, { triggeredBy: "unknown" }, errorMessage);
  }
}

function failedExecution(
  blockId: string,
  _context: AIBlockRunContext,
  errorMessage: string,
): AIBlockExecutionResult {
  return {
    id: "(no-row)",
    blockId,
    status: "FAILED",
    output: null,
    errorMessage,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    inputTokens: null,
    outputTokens: null,
    modelName: null,
    durationMs: 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSummary(row: any): AIBlockSummary {
  return {
    id: row.id,
    organizationId: row.organizationId,
    ownerType: row.ownerType as AIBlockOwnerType,
    ownerId: row.ownerId,
    name: row.name,
    description: row.description ?? null,
    triggerType: row.triggerType,
    isPinned: row.isPinned,
    lastRunAt: row.lastRunAt?.toISOString() ?? null,
    lastRunStatus: row.lastRunStatus ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
