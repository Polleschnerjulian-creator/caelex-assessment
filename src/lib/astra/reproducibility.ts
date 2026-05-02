/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Astra reproducibility / EU AI Act audit-trail helper — Sprint 6B
 *
 * Each AstraProposal row should carry enough metadata that we can
 * reconstruct WHY Astra made that suggestion. The EU AI Act Art. 12
 * (record-keeping) requires automatic logging of "circumstances of
 * use" sufficient to investigate incidents and verify the system's
 * functioning. Hashing rather than storing the raw prompts keeps the
 * row size bounded while still letting us prove "this proposal was
 * generated from THIS exact system prompt + THIS exact user message".
 *
 * # What's captured
 *
 *   - **model identity**: model name + (separate) engine version, so
 *     filtering "all proposals from claude-sonnet-4-6" or "everything
 *     since engine v2.3" is one indexed query.
 *   - **sampling params**: temperature, max_tokens — anything that
 *     affects determinism.
 *   - **input hashes**: SHA-256 of system prompt + user message +
 *     compiled context blob. A diff between two proposals is "system
 *     prompt unchanged, context changed" or vice versa.
 *   - **conversation lineage**: conversationId + messageId so we can
 *     replay exact tool-use sequences.
 *   - **capturedAt**: separate from row.createdAt (which is db-write
 *     time) — captures *when the inputs were assembled*.
 *
 * # What's NOT captured (yet)
 *
 *   - Raw prompts — too big, and PII risk. Hash-only.
 *   - Tool-result snapshots — those live in `decisionLog` already.
 *   - Temperature 0 ≠ deterministic with Anthropic (the API has
 *     non-deterministic kernel paths). We log temperature for audit
 *     but don't promise replay-bit-equality.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { createHash } from "crypto";

// ─── Public types ─────────────────────────────────────────────────────────

export interface ReproducibilityRecord {
  /** Anthropic model identifier, e.g. "claude-sonnet-4-6". */
  modelName: string;
  /** Engine version snapshot. Defaults to ENV `ASTRA_ENGINE_VERSION`
   *  or "unset" when no env var is provided. */
  engineVersion: string;
  /** Sampling temperature passed to the API. */
  temperature: number;
  /** max_tokens passed to the API. */
  maxTokens: number;
  /** SHA-256 of the system prompt (hex). */
  systemPromptHash: string;
  /** SHA-256 of the user message that triggered the action (hex). */
  userMessageHash: string;
  /** SHA-256 of the compiled context blob (hex). */
  contextHash: string;
  /** AstraConversation.id this proposal originated from. May be null
   *  for tool-only paths that never created a chat. */
  conversationId: string | null;
  /** AstraMessage.id of the assistant turn that emitted the action.
   *  May be null for the same reason. */
  messageId: string | null;
  /** ISO-8601 timestamp at which the inputs were captured. */
  capturedAt: string;
}

export interface ReproducibilityInputs {
  modelName: string;
  /** Optional override; falls back to env. */
  engineVersion?: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  userMessage: string;
  contextBlob: string;
  conversationId?: string | null;
  messageId?: string | null;
  /** Override capturedAt for deterministic tests. */
  now?: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const sha256 = (s: string): string =>
  createHash("sha256").update(s, "utf8").digest("hex");

const ENGINE_VERSION_FALLBACK =
  process.env.ASTRA_ENGINE_VERSION?.trim() ||
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
  "unset";

/**
 * Build the structured reproducibility record. Pure — no IO. Output
 * is JSON-serialisable (Date → ISO string) so it can flow straight
 * into `prisma.astraProposal.create({ data: { reproducibility } })`.
 */
export function buildReproducibilityRecord(
  inputs: ReproducibilityInputs,
): ReproducibilityRecord {
  return {
    modelName: inputs.modelName,
    engineVersion: inputs.engineVersion ?? ENGINE_VERSION_FALLBACK,
    temperature: inputs.temperature,
    maxTokens: inputs.maxTokens,
    systemPromptHash: sha256(inputs.systemPrompt),
    userMessageHash: sha256(inputs.userMessage),
    contextHash: sha256(inputs.contextBlob),
    conversationId: inputs.conversationId ?? null,
    messageId: inputs.messageId ?? null,
    capturedAt: (inputs.now ?? new Date()).toISOString(),
  };
}

/**
 * Quick "did the inputs change between two proposals" diff — useful
 * for the audit-trail UI in Sprint 6D. Returns a list of property
 * names that differ, ignoring `capturedAt`.
 */
export function diffReproducibility(
  a: ReproducibilityRecord,
  b: ReproducibilityRecord,
): string[] {
  const changed: string[] = [];
  const keys: (keyof ReproducibilityRecord)[] = [
    "modelName",
    "engineVersion",
    "temperature",
    "maxTokens",
    "systemPromptHash",
    "userMessageHash",
    "contextHash",
    "conversationId",
    "messageId",
  ];
  for (const k of keys) {
    if (a[k] !== b[k]) changed.push(k);
  }
  return changed;
}
