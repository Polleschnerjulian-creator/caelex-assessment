"use server";

import { revalidatePath } from "next/cache";
import {
  applyProposal,
  rejectProposal,
} from "@/lib/comply-v2/actions/proposal-actions";
import { logger } from "@/lib/logger";

/**
 * Form-action wrappers for the AstraProposal queue UI.
 *
 * Each wrapper reads the proposalId (and optional reviewerNote) from
 * FormData and delegates to the orchestrator in
 * src/lib/comply-v2/actions/proposal-actions.ts. Failures are
 * surfaced via logger.warn for now; Phase 2 adds a toast surface.
 */

export async function applyProposalAction(formData: FormData): Promise<void> {
  const proposalId = formData.get("proposalId");
  if (typeof proposalId !== "string" || !proposalId) {
    logger.warn("[comply-v2] applyProposalAction: missing proposalId");
    return;
  }
  const result = await applyProposal(proposalId);
  if (!result.ok) {
    logger.warn("[comply-v2] applyProposal failed", { error: result.message });
  }
  revalidatePath("/dashboard/proposals");
}

export async function rejectProposalAction(formData: FormData): Promise<void> {
  const proposalId = formData.get("proposalId");
  if (typeof proposalId !== "string" || !proposalId) {
    logger.warn("[comply-v2] rejectProposalAction: missing proposalId");
    return;
  }
  const noteRaw = formData.get("reviewerNote");
  const note = typeof noteRaw === "string" ? noteRaw : undefined;
  const result = await rejectProposal(proposalId, note);
  if (!result.ok) {
    logger.warn("[comply-v2] rejectProposal failed", { error: result.message });
  }
  revalidatePath("/dashboard/proposals");
}
