/**
 * Caelex Passage (Trade) — Astra Proposal lifecycle: APPLY / REJECT.
 *
 * THE DECISION-OF-RECORD LAYER. This is where the thesis becomes literal:
 * Astra wrote a PENDING proposal; here a NAMED HUMAN reviews it and either
 *
 *   - REJECTS it  → status REJECTED + reviewer note + audit row. NO effect.
 *   - APPLIES it  → the human is recorded as decision-of-record (status
 *                   APPLIED, the acting user, timestamp) + audit row, and
 *                   THEN — only where a safe, already-existing service maps
 *                   cleanly — the underlying effect runs WITH THE HUMAN
 *                   recorded as the actor.
 *
 * SAFE-MAPPED EXECUTION (the ONLY tool we run on Apply):
 *   - run_trade_screening → call the existing `screenParty()` service with the
 *     applying human recorded as `systemDecisionUserId` (the decision-maker on
 *     any auto-CLEAR). Screening is conservative-by-design + fail-closed
 *     (T-H3 / staleness gates already escalate a would-be-CLEAR to UNVERIFIED),
 *     so running it can never produce a MORE PERMISSIVE outcome than a human
 *     clicking "Screen now" on the party page. This is the one effect we let
 *     Apply perform.
 *
 * ROUTE-DON'T-EXECUTE (every other mutating Trade tool):
 *   apply_trade_classification / draw_down_trade_license /
 *   confirm_trade_sanctions_hit / advance_trade_operation /
 *   file_trade_submission are NOT blind-executed here. Applying one records
 *   the human decision-of-record + DEEP-LINKS the human to the real surface
 *   (item / operation / party page) where that gated action is performed with
 *   its OWN confirmation. Honest: an Apply never silently mutates beyond the
 *   one safe-mapped screening — it records the human's decision and routes
 *   them to finish it under the surface's native gate.
 *
 * HARD INVARIANTS:
 *   - Never MORE permissive. The only effect Apply runs is a fail-closed
 *     screen; everything else is recorded-and-routed, never auto-committed.
 *   - Every mutating effect is human-initiated + recorded. Apply requires an
 *     authenticated owner/super-admin; the human + timestamp are the decision
 *     of record; an audit row is always written.
 *   - Append-only provenance. We never delete a proposal; we transition its
 *     status and stamp who/when.
 *
 * Authorization mirrors Comply's proposal-actions.ts: the proposal OWNER
 * (proposal.userId) or a super-admin may decide. Trade proposals are
 * identified by `actionName ∈ MUTATING_TRADE_TOOLS` (the field-based
 * discriminator — no schema column).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import { logAuditEvent } from "@/lib/audit";
import { checkRateLimit } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { getSafeErrorMessage } from "@/lib/validations";
import { TRADE_PROPOSAL_ACTION_NAMES } from "./astra-proposal-service.server";

const QUEUE_PATH = "/trade/astra";

/**
 * Result of an apply/reject. `routeTo` is a deep link the UI navigates the
 * human to when an Apply records-and-routes (the non-screening tools): it
 * points at the real surface where the gated action is finished under its own
 * confirmation. Null for a rejection or a safe-executed screen.
 */
export interface TradeProposalDecisionResult {
  ok: boolean;
  status: string;
  message?: string;
  /** Deep link the human should be routed to to finish the action, if any. */
  routeTo?: string | null;
}

/**
 * Load a Trade proposal and verify the session may decide on it. Throws on any
 * failure (not found / not a Trade proposal / not authorized / not pending /
 * expired). Returns the proposal + the acting user id on success.
 */
async function loadAuthorizedTradeProposal(proposalId: string) {
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
      expiresAt: true,
      rationale: true,
    },
  });
  if (!proposal) throw new Error("Proposal not found");

  // Field-based discriminator: this orchestrator only ever acts on Trade
  // proposals. A Comply proposal must go through Comply's own apply/reject
  // (which knows how to run its action handler). Refusing here keeps the two
  // surfaces' trust layers from crossing.
  if (!TRADE_PROPOSAL_ACTION_NAMES.has(proposal.actionName)) {
    throw new Error("Not a Trade proposal");
  }

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

  return { proposal, actorUserId: session.user.id };
}

/**
 * Read a string field from a proposal's `params` JSON, defensively. Trade
 * proposals persist the raw LLM tool input, so any field may be missing or
 * mistyped — we never throw, just return undefined.
 */
function paramString(params: unknown, key: string): string | undefined {
  if (params === null || typeof params !== "object") return undefined;
  const v = (params as Record<string, unknown>)[key];
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
}

/**
 * Resolve the deep-link surface where a NON-screening mutating Trade action is
 * finished under its native confirmation. Derived from the tool name + its
 * persisted params. Always returns a valid Trade route (falls back to the
 * tool's index surface when a specific id isn't in params) so the human is
 * never left without a destination.
 */
function resolveRouteFor(actionName: string, params: unknown): string {
  const partyId = paramString(params, "partyId");
  const operationId =
    paramString(params, "operationId") ?? paramString(params, "opId");
  const itemId = paramString(params, "itemId");
  const licenseId =
    paramString(params, "licenseId") ?? paramString(params, "licenceId");

  switch (actionName) {
    case "apply_trade_classification":
      // Classification is applied on the item's detail/classify surface.
      return itemId ? `/trade/items/${itemId}` : "/trade/classify";
    case "draw_down_trade_license":
      // Drawing down a Sammelgenehmigung / GEA quota happens on the licence.
      return licenseId ? `/trade/licenses/${licenseId}` : "/trade/licenses";
    case "confirm_trade_sanctions_hit":
      // Confirming a hit is a triage decision on the screening queue / party.
      return partyId ? `/trade/parties/${partyId}` : "/trade/screening";
    case "advance_trade_operation":
      // Advancing an operation's lifecycle (the ship gate) lives on the op.
      return operationId
        ? `/trade/operations/${operationId}`
        : "/trade/operations";
    case "file_trade_submission":
      // Filing a BAFA / customs submission happens on the operation surface.
      return operationId
        ? `/trade/operations/${operationId}`
        : "/trade/operations";
    default:
      // Unknown mutating tool (fail-closed default in the gate) → route to the
      // operations index. Never auto-execute an unrecognised action.
      return "/trade/operations";
  }
}

/**
 * Mark the proposal APPLIED, recording the human as decision-of-record, and
 * write the apply audit row. Pure DB transition + audit — does NOT itself run
 * any underlying effect (the caller decides whether to safe-execute or route).
 */
async function recordApplied(
  proposalId: string,
  actorUserId: string,
  actionName: string,
  extraMetadata: Record<string, unknown> = {},
): Promise<void> {
  const now = new Date();
  await prisma.astraProposal.update({
    where: { id: proposalId },
    data: { status: "APPLIED", decidedAt: now, appliedAt: now },
  });
  try {
    await logAuditEvent({
      userId: actorUserId,
      action: "trade_astra_proposal_applied",
      entityType: "comply_proposal",
      entityId: proposalId,
      description: `Applied Trade Astra proposal "${actionName}" — human is decision-of-record`,
      metadata: { actionName, ...extraMetadata },
    });
  } catch (err) {
    // Audit failure must never mask the recorded decision.
    logger.error(
      `[trade-proposal apply ${proposalId}] audit write failed`,
      err,
    );
  }
}

/**
 * APPLY a pending Trade proposal. Records the acting human as decision-of-
 * record, then EITHER safe-executes (screening only) OR routes the human to
 * the native surface (every other mutating tool). Never auto-commits beyond
 * the one fail-closed screening.
 */
export async function applyTradeProposal(
  proposalId: string,
): Promise<TradeProposalDecisionResult> {
  try {
    const { proposal, actorUserId } =
      await loadAuthorizedTradeProposal(proposalId);

    // Rate-limit the actor (mirrors Comply) to prevent bulk-apply abuse.
    const rl = await checkRateLimit("comply_v2_action", `user:${actorUserId}`);
    if (!rl.success) {
      return {
        ok: false,
        status: "RATE_LIMITED",
        message: `Rate limit exceeded. Try again in ${Math.ceil((rl.reset - Date.now()) / 1000)}s.`,
      };
    }

    // ── SAFE-MAPPED EXECUTION: run_trade_screening only ──
    if (proposal.actionName === "run_trade_screening") {
      const partyId = paramString(proposal.params, "partyId");
      if (!partyId) {
        // No party to screen — record the decision, but route the human to
        // the screening queue rather than guess. Fail-closed: never invent a
        // target.
        await recordApplied(proposalId, actorUserId, proposal.actionName, {
          note: "no partyId in params — routed to screening queue",
        });
        revalidatePath(QUEUE_PATH);
        return {
          ok: true,
          status: "APPLIED",
          message:
            "Recorded your decision. The proposal did not specify which counterparty to screen — open the screening queue to run it.",
          routeTo: "/trade/screening",
        };
      }

      // Record the human as decision-of-record FIRST, then run the screen
      // with the human attributed. screenParty is conservative-by-design +
      // fail-closed, so this can never yield a more permissive result than a
      // manual "Screen now".
      await recordApplied(proposalId, actorUserId, proposal.actionName, {
        partyId,
        executedEffect: "screenParty",
      });

      try {
        const { screenParty } =
          await import("@/lib/comply-v2/trade/screening/screen-party.server");
        const res = await screenParty(partyId, {
          systemDecisionUserId: actorUserId,
        });
        // Additional domain audit row — the screening itself (who triggered
        // it, the outcome). Best-effort.
        try {
          await logAuditEvent({
            userId: actorUserId,
            action: "trade_party_screened",
            entityType: "trade_party",
            entityId: partyId,
            description: `Screened party via applied Astra proposal — ${res.summary.verification}`,
            metadata: {
              proposalId,
              decision: res.summary.decision,
              verification: res.summary.verification,
              hitCount: res.summary.hitCount,
            },
          });
        } catch (auditErr) {
          logger.error(
            `[trade-proposal apply ${proposalId}] screening audit failed`,
            auditErr,
          );
        }
        revalidatePath(QUEUE_PATH);
        revalidatePath("/trade/screening");
        revalidatePath(`/trade/parties/${partyId}`);
        return {
          ok: true,
          status: "APPLIED",
          message: `Screening complete — result: ${res.summary.verification}. Review it on the party page.`,
          routeTo: `/trade/parties/${partyId}`,
        };
      } catch (execErr) {
        // The decision is already recorded (APPLIED). The screen failed to
        // run — surface honestly and route the human to retry manually.
        logger.error(
          `[trade-proposal apply ${proposalId}] screenParty failed after record`,
          execErr,
        );
        revalidatePath(QUEUE_PATH);
        return {
          ok: false,
          status: "APPLIED_EXEC_FAILED",
          message:
            "Your decision was recorded, but the screening could not run automatically. Please run it manually from the party page.",
          routeTo: `/trade/parties/${partyId}`,
        };
      }
    }

    // ── ROUTE-DON'T-EXECUTE: every other mutating Trade tool ──
    const routeTo = resolveRouteFor(proposal.actionName, proposal.params);
    await recordApplied(proposalId, actorUserId, proposal.actionName, {
      routedTo: routeTo,
      executedEffect: "none — routed to native surface",
    });
    revalidatePath(QUEUE_PATH);
    return {
      ok: true,
      status: "APPLIED",
      message:
        "Recorded your decision. This action is finalised on its own surface with its native confirmation — opening it now.",
      routeTo,
    };
  } catch (err) {
    logger.error(`[trade-proposal apply ${proposalId}] failed`, err);
    return {
      ok: false,
      status: "ERROR",
      message: getSafeErrorMessage(err, "Apply failed"),
    };
  }
}

/**
 * REJECT a pending Trade proposal with an optional reviewer note. No effect —
 * status REJECTED + note + audit row.
 */
export async function rejectTradeProposal(
  proposalId: string,
  reviewerNote?: string,
): Promise<TradeProposalDecisionResult> {
  try {
    const { proposal, actorUserId } =
      await loadAuthorizedTradeProposal(proposalId);

    const rl = await checkRateLimit("comply_v2_action", `user:${actorUserId}`);
    if (!rl.success) {
      return {
        ok: false,
        status: "RATE_LIMITED",
        message: `Rate limit exceeded. Try again in ${Math.ceil((rl.reset - Date.now()) / 1000)}s.`,
      };
    }

    const trimmedNote = reviewerNote?.trim() || null;
    await prisma.astraProposal.update({
      where: { id: proposalId },
      data: {
        status: "REJECTED",
        decidedAt: new Date(),
        reviewerNote: trimmedNote,
      },
    });

    try {
      await logAuditEvent({
        userId: actorUserId,
        action: "trade_astra_proposal_rejected",
        entityType: "comply_proposal",
        entityId: proposalId,
        description: `Rejected Trade Astra proposal "${proposal.actionName}" — no effect`,
        metadata: {
          actionName: proposal.actionName,
          reviewerNote: trimmedNote,
        },
      });
    } catch (err) {
      logger.error(
        `[trade-proposal reject ${proposalId}] audit write failed`,
        err,
      );
    }

    revalidatePath(QUEUE_PATH);
    return { ok: true, status: "REJECTED" };
  } catch (err) {
    logger.error(`[trade-proposal reject ${proposalId}] failed`, err);
    return {
      ok: false,
      status: "ERROR",
      message: getSafeErrorMessage(err, "Reject failed"),
    };
  }
}
