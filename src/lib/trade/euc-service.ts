import "server-only";
import { prisma } from "@/lib/prisma";
import {
  type TradeEUCRequest,
  type TradeEUCStatus,
  type TradeEUCFormType,
} from "@prisma/client";

/**
 * Caelex Trade — End-Use Certificate (EUC) service (Sprint E5b).
 *
 * Thin Prisma wrapper for the TradeEUCRequest model. All reads are
 * org-scoped — the caller passes orgId resolved from the session and
 * the service refuses to fetch rows outside that org boundary.
 *
 * The MVP doesn't generate PDFs, send emails or upload signed copies
 * — those land in later sprints (E5c, E5d). For now the service just
 * tracks the lifecycle row so operators have a single audit-ready
 * place to manage their EUC paper trail.
 */

// ─── Types ──────────────────────────────────────────────────────────

export type EucWithRelations = TradeEUCRequest & {
  party: { id: string; canonicalName: string; countryCode: string };
  operation: { id: string; reference: string } | null;
};

export interface EucCreateInput {
  organizationId: string;
  formType: TradeEUCFormType;
  partyId: string;
  operationId?: string | null;
  validUntil?: Date | null;
  notes?: string | null;
  lastActionById: string;
}

export interface EucStatusTransitionInput {
  organizationId: string;
  eucId: string;
  nextStatus: TradeEUCStatus;
  lastActionById: string;
  /** Optional document-vault id when transitioning to RECEIVED. */
  signedDocumentId?: string | null;
  /** Optional override for validity-end date (e.g. set on VALIDATED). */
  validUntil?: Date | null;
  /** Operator notes to append on this transition. */
  notes?: string | null;
}

// ─── Reads ──────────────────────────────────────────────────────────

/**
 * List EUC requests for an org, ordered most-recent-first. Eager-loads
 * the counterparty and (when present) the operation so the list page
 * can show readable references without an N+1.
 */
export async function listEucRequests(
  organizationId: string,
  options: { status?: TradeEUCStatus } = {},
): Promise<EucWithRelations[]> {
  return prisma.tradeEUCRequest.findMany({
    where: {
      organizationId,
      ...(options.status ? { status: options.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      party: { select: { id: true, canonicalName: true, countryCode: true } },
      operation: { select: { id: true, reference: true } },
    },
  });
}

/**
 * Fetch a single EUC by id, scoped to the org. Returns null when the
 * id doesn't belong to the org — the caller MUST treat null as 404 to
 * avoid leaking cross-org existence.
 */
export async function getEucRequest(
  organizationId: string,
  eucId: string,
): Promise<EucWithRelations | null> {
  return prisma.tradeEUCRequest.findFirst({
    where: { id: eucId, organizationId },
    include: {
      party: { select: { id: true, canonicalName: true, countryCode: true } },
      operation: { select: { id: true, reference: true } },
    },
  });
}

// ─── Writes ─────────────────────────────────────────────────────────

/**
 * Create a new EUC request in REQUESTED status. Validates that the
 * referenced party (and operation, if provided) actually belong to
 * the same org — defence in depth against client-supplied IDs.
 */
export async function createEucRequest(
  input: EucCreateInput,
): Promise<TradeEUCRequest> {
  // Org-scope verification — refuse to create with a party that lives
  // in a different org.
  const party = await prisma.tradeParty.findFirst({
    where: { id: input.partyId, organizationId: input.organizationId },
    select: { id: true },
  });
  if (!party) {
    throw new Error("Counterparty not found in this organisation");
  }

  if (input.operationId) {
    const op = await prisma.tradeOperation.findFirst({
      where: {
        id: input.operationId,
        organizationId: input.organizationId,
      },
      select: { id: true },
    });
    if (!op) {
      throw new Error("Operation not found in this organisation");
    }
  }

  return prisma.tradeEUCRequest.create({
    data: {
      organizationId: input.organizationId,
      formType: input.formType,
      partyId: input.partyId,
      operationId: input.operationId ?? null,
      validUntil: input.validUntil ?? null,
      notes: input.notes ?? null,
      lastActionById: input.lastActionById,
    },
  });
}

/**
 * Advance the lifecycle. The state machine is strict — REQUESTED can
 * only progress to SENT_TO_PARTY; SENT_TO_PARTY only to RECEIVED, etc.
 * REVOKED is reachable from any non-terminal state. EXPIRED is set by
 * the (future) cron — operators don't typically set it manually.
 */
export async function transitionEucStatus(
  input: EucStatusTransitionInput,
): Promise<TradeEUCRequest> {
  const current = await prisma.tradeEUCRequest.findFirst({
    where: { id: input.eucId, organizationId: input.organizationId },
  });
  if (!current) {
    throw new Error("EUC request not found in this organisation");
  }

  if (!isValidTransition(current.status, input.nextStatus)) {
    throw new Error(
      `Invalid lifecycle transition ${current.status} → ${input.nextStatus}`,
    );
  }

  const now = new Date();
  const data: Record<string, unknown> = {
    status: input.nextStatus,
    lastActionById: input.lastActionById,
  };

  // Stamp the timestamp matching this transition.
  if (input.nextStatus === "SENT_TO_PARTY") data.sentAt = now;
  if (input.nextStatus === "RECEIVED") data.receivedAt = now;
  if (input.nextStatus === "VALIDATED") data.validatedAt = now;

  if (input.signedDocumentId !== undefined) {
    data.signedDocumentId = input.signedDocumentId;
  }
  if (input.validUntil !== undefined) {
    data.validUntil = input.validUntil;
  }
  if (input.notes !== undefined) {
    data.notes = input.notes;
  }

  return prisma.tradeEUCRequest.update({
    where: { id: input.eucId },
    data,
  });
}

/**
 * State-machine guardrail. Allowed forward path:
 *   REQUESTED → SENT_TO_PARTY → RECEIVED → VALIDATED → EXPIRED
 * REVOKED is reachable from any non-terminal state at any time.
 */
function isValidTransition(
  current: TradeEUCStatus,
  next: TradeEUCStatus,
): boolean {
  if (current === next) return false;
  if (next === "REVOKED") {
    return current !== "EXPIRED" && current !== "REVOKED";
  }
  const order: TradeEUCStatus[] = [
    "REQUESTED",
    "SENT_TO_PARTY",
    "RECEIVED",
    "VALIDATED",
    "EXPIRED",
  ];
  const currentIdx = order.indexOf(current);
  const nextIdx = order.indexOf(next);
  // Only allow forward progress along the canonical path.
  return currentIdx >= 0 && nextIdx === currentIdx + 1;
}
