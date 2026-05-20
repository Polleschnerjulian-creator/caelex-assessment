/**
 * AI Blocks Types (Sprint B3)
 *
 * Public surface for the durable, re-runnable prompt-block system.
 */

import "server-only";

export type AIBlockTriggerType =
  | "manual"
  | "evidence-change"
  | "schedule"
  | "regulation-update";

export type AIBlockOwnerType =
  | "compliance-item"
  | "module"
  | "organization"
  | "spacecraft";

export interface CreateAIBlockInput {
  organizationId: string;
  ownerType: AIBlockOwnerType;
  ownerId: string;
  name: string;
  description?: string;
  prompt: string;
  triggerType: AIBlockTriggerType;
  schedule?: string;
  regulationRef?: string;
  isPinned?: boolean;
  displayIcon?: string;
}

export interface AIBlockRunContext {
  /** Who/what triggered this run. */
  triggeredBy: string;
  /** Optional human-readable note (e.g. "Evidence X uploaded — re-running gap analysis"). */
  triggerReason?: string;
  /** Optional context injected into the LLM prompt — e.g. recent evidence content. */
  contextPayload?: Record<string, unknown>;
}

export interface AIBlockExecutionResult {
  id: string;
  blockId: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  output: string | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  modelName: string | null;
  durationMs: number | null;
}

export interface AIBlockSummary {
  id: string;
  organizationId: string;
  ownerType: AIBlockOwnerType;
  ownerId: string;
  name: string;
  description: string | null;
  triggerType: AIBlockTriggerType;
  isPinned: boolean;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  createdAt: string;
}
