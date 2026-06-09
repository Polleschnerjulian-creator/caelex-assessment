/**
 * Caelex Passage — Trade Astra Proposal Service (P2, Lane A).
 *
 * THE THESIS, MADE LITERAL AND DURABLE.
 *
 * The P0 engine gate (`decideTradeToolGate`) already refuses to let Astra
 * commit a mutating export-control decision: a mutating Trade tool is
 * deflected to a PROPOSAL the human reviews and applies. But until now that
 * proposal was an in-memory `TradeToolGateProposal` envelope that EVAPORATED
 * at request end — the model saw "I queued a proposal", yet nothing was ever
 * written, so there was no queue for the human to act on and no record for the
 * EU-AI-Act audit trail.
 *
 * This service closes that gap WITHOUT weakening any invariant. It persists an
 * `AstraProposal` row (status PENDING) at the moment of deflection, so:
 *
 *   - The human has a durable queue to review + apply (or reject).
 *   - The decision-of-record is recorded: WHO applied, WHEN, and WHY — the
 *     named human, never "the AI".
 *   - The model run that produced the proposal is captured (modelName +
 *     engineVersion + reproducibility) for Art. 12 traceability.
 *
 * HARD INVARIANTS this module upholds (each outranks every other goal):
 *   - NEVER auto-execute. This module only WRITES a PENDING proposal. It does
 *     not, and must not, run any underlying mutating effect. Application is a
 *     separate, human-initiated step (see `trade-proposal-actions.server.ts`).
 *   - Fail-closed. A persistence failure must surface to the model as a
 *     non-success — it must NEVER be reported as "done" or silently green.
 *   - Additive. No schema change: Trade proposals are distinguished from
 *     Comply proposals by `actionName` ∈ the six MUTATING_TRADE_TOOLS, and
 *     carry `itemId = null` (Trade proposals don't link a ComplianceItem).
 *
 * Reuses the exact AstraProposal write shape Comply's define-action layer uses
 * (params Json, decisionLog Json, rationale, expiresAt, modelName,
 * engineVersion, reproducibility) so the two surfaces speak one vocabulary.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { MUTATING_TRADE_TOOLS } from "@/lib/astra/trade-tool-gate";
import type { ReproducibilityRecord } from "@/lib/astra/reproducibility";

/**
 * Trade proposals expire 7 days after creation — same TTL Comply's
 * `writeProposal()` uses. A stale, un-acted proposal is swept to EXPIRED by
 * the existing proposal-lifecycle cron (it keys off `expiresAt`, action-name
 * agnostic), so no new sweep is needed for Trade.
 */
export const TRADE_PROPOSAL_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The canonical set of Trade tool names that produce a proposal. Mirrors
 * `MUTATING_TRADE_TOOLS` (the engine gate's mutating registry). Held as a Set
 * for O(1) membership checks in the queue filter + this writer's guard.
 *
 * Exported so the queue surface can filter `AstraProposal.actionName IN (…)`
 * to show ONLY Trade proposals — the field-based discriminator that lets us
 * avoid an `AstraProposal.product` schema column.
 */
export const TRADE_PROPOSAL_ACTION_NAMES: ReadonlySet<string> = new Set(
  MUTATING_TRADE_TOOLS,
);

/** Inputs to persist a deflected Trade tool call as a PENDING proposal. */
export interface CreateTradeProposalInput {
  /** The acting (proposing) user — the proposal owner. */
  userId: string;
  /** The mutating Trade tool name (one of MUTATING_TRADE_TOOLS). */
  toolName: string;
  /** The LLM-supplied tool input, persisted verbatim as `params`. */
  input: Record<string, unknown>;
  /**
   * The gate's human-readable WHY this became a proposal — persisted as
   * `rationale` so the reviewer sees the AI's stated reason before applying.
   */
  reason: string;
  /**
   * Astra's chain-of-thought leading to this proposal, if the engine supplied
   * one. Persisted as `decisionLog` (JSON). Omitted from the INSERT when empty
   * so the proposal card doesn't render a blank "Reasoning" section.
   */
  decisionLog?: unknown[];
  /**
   * EU-AI-Act Art. 12 reproducibility snapshot of the model run, if available.
   * Denormalized into indexed `modelName` + `engineVersion` columns for fast
   * filtering; full record stored in the `reproducibility` JSON column.
   */
  reproducibility?: ReproducibilityRecord;
  /**
   * Fallback model id when no full reproducibility record is threaded (the
   * common case for a single tool-call deflection). Lets the audit trail still
   * record WHICH model proposed, even without the full forensic record.
   */
  modelName?: string;
}

/**
 * Persist a deflected mutating Trade tool call as a PENDING AstraProposal.
 *
 * Returns the new proposal's id + expiry on success, or `null` on failure.
 * The caller (the tool-executor's `propose` branch) treats a `null` as a
 * fail-closed signal: it must report the deflection to the model WITHOUT
 * claiming the proposal was durably queued — never a silent green.
 *
 * GUARD: refuses any `toolName` that is not a known mutating Trade tool. A
 * read-only tool, or a tool from another product, must never reach this
 * writer — that would be a caller bug, and writing it as a "Trade proposal"
 * would corrupt the queue's field-based discriminator. We fail closed and
 * return null rather than persist an out-of-contract row.
 */
export async function createTradeProposal(
  args: CreateTradeProposalInput,
): Promise<{ proposalId: string; expiresAt: Date } | null> {
  if (!TRADE_PROPOSAL_ACTION_NAMES.has(args.toolName)) {
    logger.error(
      "[trade-astra-proposal] refused: not a mutating Trade tool — proposal NOT written (fail-closed)",
      { toolName: args.toolName, userId: args.userId },
    );
    return null;
  }

  const expiresAt = new Date(Date.now() + TRADE_PROPOSAL_TTL_MS);

  // Match Comply's writeProposal(): an empty decisionLog is omitted entirely
  // (DB default NULL) so the proposal card doesn't render a blank reasoning
  // block. Distinct from Prisma.JsonNull (the JSON null literal).
  const decisionLog =
    Array.isArray(args.decisionLog) && args.decisionLog.length > 0
      ? (args.decisionLog as unknown as Prisma.InputJsonValue)
      : undefined;

  const repro = args.reproducibility;
  // Prefer the full record's modelName; fall back to the supplied model id.
  const modelName = repro?.modelName ?? args.modelName ?? null;
  const engineVersion = repro?.engineVersion ?? null;

  try {
    const proposal = await prisma.astraProposal.create({
      data: {
        userId: args.userId,
        actionName: args.toolName,
        params: args.input as Prisma.InputJsonValue,
        // Trade proposals do not target a ComplianceItem — the
        // field-based discriminator (actionName) identifies them.
        itemId: null,
        rationale: args.reason,
        decisionLog,
        expiresAt,
        modelName,
        engineVersion,
        reproducibility: repro
          ? (repro as unknown as Prisma.InputJsonValue)
          : undefined,
      },
      select: { id: true, expiresAt: true },
    });

    logger.info("[trade-astra-proposal] PENDING proposal written", {
      proposalId: proposal.id,
      userId: args.userId,
      toolName: args.toolName,
    });

    return { proposalId: proposal.id, expiresAt: proposal.expiresAt };
  } catch (err) {
    // Fail closed: the caller must NOT tell the model the proposal was queued.
    logger.error(
      "[trade-astra-proposal] persistence FAILED — proposal NOT queued (fail-closed)",
      err,
      { userId: args.userId, toolName: args.toolName },
    );
    return null;
  }
}
