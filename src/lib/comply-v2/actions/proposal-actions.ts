import "server-only";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import { getActionRegistry } from "./define-action";

/**
 * Proposal lifecycle operations.
 *
 * These aren't `defineAction()` actions themselves — they're the
 * orchestrators that read/apply/reject AstraProposal rows. They
 * sit one layer above the action registry.
 *
 * Authorization model:
 *   - Owner of the proposal (proposal.userId) can always approve/reject.
 *   - Super-admins can approve/reject anyone's proposal.
 *   - Phase 2: ApprovalRule-based delegation (e.g. "any OWNER in the
 *     org can approve another OWNER's proposal") will plug in here.
 *
 * Approving runs the underlying action's handler with the proposal
 * owner's permissions (not the approver's), via
 * DefinedAction.applyApprovedProposal — see the docstring on that
 * method.
 */

export type ProposalDecision = "APPLIED" | "REJECTED";

interface DecisionResult {
  ok: boolean;
  status: string;
  message?: string;
}

/**
 * Verify the current session is allowed to act on this proposal.
 * Throws if not. Returns the proposal record if allowed.
 */
async function loadAuthorizedProposal(proposalId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthenticated");
  }

  const proposal = await prisma.astraProposal.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      userId: true,
      actionName: true,
      params: true,
      status: true,
      itemId: true,
      expiresAt: true,
      rationale: true,
    },
  });
  if (!proposal) throw new Error("Proposal not found");

  const allowed =
    proposal.userId === session.user.id || isSuperAdmin(session.user.email);
  if (!allowed) {
    throw new Error("Not authorized to decide on this proposal");
  }

  if (proposal.status !== "PENDING") {
    throw new Error(`Proposal is already ${proposal.status}`);
  }
  if (proposal.expiresAt.getTime() < Date.now()) {
    throw new Error("Proposal has expired");
  }

  return { proposal, approverUserId: session.user.id };
}

/**
 * Approve a pending proposal — runs the underlying action handler
 * with the original proposer's permissions and marks the proposal
 * APPLIED.
 */
export async function applyProposal(
  proposalId: string,
): Promise<DecisionResult> {
  try {
    const { proposal } = await loadAuthorizedProposal(proposalId);

    const action = getActionRegistry().get(proposal.actionName);
    if (!action) {
      throw new Error(
        `Action "${proposal.actionName}" not registered. Cannot apply.`,
      );
    }

    // Run the original handler. `applyApprovedProposal` skips the
    // `requiresApproval` gate, otherwise approving would just write
    // a fresh proposal and never converge.
    await action.applyApprovedProposal(proposal.params, proposal.userId);

    await prisma.astraProposal.update({
      where: { id: proposalId },
      data: {
        status: "APPLIED",
        decidedAt: new Date(),
        appliedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/proposals");
    revalidatePath("/dashboard/today");
    return { ok: true, status: "APPLIED" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Apply failed";
    return { ok: false, status: "ERROR", message };
  }
}

/**
 * Reject a pending proposal with an optional reviewer note.
 */
export async function rejectProposal(
  proposalId: string,
  reviewerNote?: string,
): Promise<DecisionResult> {
  try {
    await loadAuthorizedProposal(proposalId);

    await prisma.astraProposal.update({
      where: { id: proposalId },
      data: {
        status: "REJECTED",
        decidedAt: new Date(),
        reviewerNote: reviewerNote?.trim() || null,
      },
    });

    revalidatePath("/dashboard/proposals");
    return { ok: true, status: "REJECTED" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Reject failed";
    return { ok: false, status: "ERROR", message };
  }
}
