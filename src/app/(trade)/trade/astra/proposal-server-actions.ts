"use server";

/**
 * Server-action wrappers for the Trade Astra proposal queue.
 *
 * Thin "use server" boundary: the client queue calls these, they delegate to
 * the orchestrator in src/lib/trade/trade-proposal-actions.server.ts and return
 * a serialisable result. The orchestrator does all auth + the human-decides
 * recording; these wrappers only marshal the proposalId / note.
 *
 * The HARD INVARIANT lives in the orchestrator: applying NEVER auto-commits
 * beyond the one safe-mapped screening — it records the human as decision-of-
 * record and routes them to the native surface for everything else.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  applyTradeProposal,
  rejectTradeProposal,
  type TradeProposalDecisionResult,
} from "@/lib/trade/trade-proposal-actions.server";

export async function applyTradeProposalAction(
  proposalId: string,
): Promise<TradeProposalDecisionResult> {
  if (!proposalId || typeof proposalId !== "string") {
    return { ok: false, status: "ERROR", message: "Missing proposal id" };
  }
  return applyTradeProposal(proposalId);
}

export async function rejectTradeProposalAction(
  proposalId: string,
  reviewerNote?: string,
): Promise<TradeProposalDecisionResult> {
  if (!proposalId || typeof proposalId !== "string") {
    return { ok: false, status: "ERROR", message: "Missing proposal id" };
  }
  const note =
    typeof reviewerNote === "string" && reviewerNote.trim().length > 0
      ? reviewerNote.trim()
      : undefined;
  return rejectTradeProposal(proposalId, note);
}
