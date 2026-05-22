import "server-only";
import { prisma } from "@/lib/prisma";
import {
  type TradeVoluntaryDisclosure,
  type TradeVSDStatus,
  type TradeVSDAuthority,
  type TradeVSDViolationType,
  type TradeVSDOutcome,
} from "@prisma/client";

/**
 * Caelex Trade — Voluntary Self-Disclosure service (Sprint E1b).
 *
 * Thin Prisma wrapper for the TradeVoluntaryDisclosure model.
 *
 * State machine:
 *   DISCOVERED → INVESTIGATING → DRAFTED → SUBMITTED → ACKNOWLEDGED → RESOLVED
 *   any non-terminal → WITHDRAWN (operator pulls before authority response)
 *
 * The transitionVsdStatus() guard enforces forward-only progress
 * along the canonical path. WITHDRAWN is reachable from any
 * non-terminal state (the operator can pull the disclosure at any
 * point before authority resolution). RESOLVED additionally requires
 * a TradeVSDOutcome to be specified.
 *
 * Org-scope is enforced on every read + write — cross-org FK
 * references (operation/item/party) are validated against the same
 * organisation before persistence.
 */

// ─── Types ──────────────────────────────────────────────────────────

export type VSDWithRelations = TradeVoluntaryDisclosure & {
  operation: { id: string; reference: string } | null;
  item: { id: string; name: string; internalSku: string | null } | null;
  party: { id: string; canonicalName: string; countryCode: string } | null;
};

export interface VSDCreateInput {
  organizationId: string;
  authority: TradeVSDAuthority;
  violationType: TradeVSDViolationType;
  title: string;
  description: string;
  discoveredAt: Date;
  occurredAt?: Date | null;
  operationId?: string | null;
  itemId?: string | null;
  partyId?: string | null;
  notes?: string | null;
  lastActionById: string;
}

export interface VSDStatusTransitionInput {
  organizationId: string;
  vsdId: string;
  nextStatus: TradeVSDStatus;
  lastActionById: string;
  /** Required when transitioning to SUBMITTED. */
  filingReference?: string | null;
  /** Required when transitioning to RESOLVED. */
  outcome?: TradeVSDOutcome | null;
  /** Optional — only meaningful for outcome=CIVIL_PENALTY/SETTLEMENT. */
  penaltyAmountUsd?: number | null;
  outcomeNotes?: string | null;
  notes?: string | null;
  filingDocumentId?: string | null;
}

// ─── Reads ──────────────────────────────────────────────────────────

export async function listVsds(
  organizationId: string,
  options: { status?: TradeVSDStatus; authority?: TradeVSDAuthority } = {},
): Promise<VSDWithRelations[]> {
  return prisma.tradeVoluntaryDisclosure.findMany({
    where: {
      organizationId,
      ...(options.status ? { status: options.status } : {}),
      ...(options.authority ? { authority: options.authority } : {}),
    },
    orderBy: { discoveredAt: "desc" },
    include: {
      operation: { select: { id: true, reference: true } },
      item: {
        select: { id: true, name: true, internalSku: true },
      },
      party: {
        select: { id: true, canonicalName: true, countryCode: true },
      },
    },
  });
}

export async function getVsd(
  organizationId: string,
  vsdId: string,
): Promise<VSDWithRelations | null> {
  return prisma.tradeVoluntaryDisclosure.findFirst({
    where: { id: vsdId, organizationId },
    include: {
      operation: { select: { id: true, reference: true } },
      item: {
        select: { id: true, name: true, internalSku: true },
      },
      party: {
        select: { id: true, canonicalName: true, countryCode: true },
      },
    },
  });
}

// ─── Writes ─────────────────────────────────────────────────────────

export async function createVsd(
  input: VSDCreateInput,
): Promise<TradeVoluntaryDisclosure> {
  // Org-scope defence: refuse cross-org entity links.
  if (input.operationId) {
    const op = await prisma.tradeOperation.findFirst({
      where: {
        id: input.operationId,
        organizationId: input.organizationId,
      },
      select: { id: true },
    });
    if (!op) throw new Error("Operation not found in this organisation");
  }
  if (input.itemId) {
    const item = await prisma.tradeItem.findFirst({
      where: { id: input.itemId, organizationId: input.organizationId },
      select: { id: true },
    });
    if (!item) throw new Error("Item not found in this organisation");
  }
  if (input.partyId) {
    const party = await prisma.tradeParty.findFirst({
      where: { id: input.partyId, organizationId: input.organizationId },
      select: { id: true },
    });
    if (!party) throw new Error("Party not found in this organisation");
  }

  return prisma.tradeVoluntaryDisclosure.create({
    data: {
      organizationId: input.organizationId,
      authority: input.authority,
      violationType: input.violationType,
      title: input.title,
      description: input.description,
      discoveredAt: input.discoveredAt,
      occurredAt: input.occurredAt ?? null,
      operationId: input.operationId ?? null,
      itemId: input.itemId ?? null,
      partyId: input.partyId ?? null,
      notes: input.notes ?? null,
      lastActionById: input.lastActionById,
    },
  });
}

export async function transitionVsdStatus(
  input: VSDStatusTransitionInput,
): Promise<TradeVoluntaryDisclosure> {
  const current = await prisma.tradeVoluntaryDisclosure.findFirst({
    where: { id: input.vsdId, organizationId: input.organizationId },
  });
  if (!current) {
    throw new Error("VSD not found in this organisation");
  }

  if (!isValidTransition(current.status, input.nextStatus)) {
    throw new Error(
      `Invalid lifecycle transition ${current.status} → ${input.nextStatus}`,
    );
  }

  // SUBMITTED requires a filing reference; RESOLVED requires outcome.
  if (input.nextStatus === "SUBMITTED" && !input.filingReference) {
    throw new Error("SUBMITTED transition requires a filing reference");
  }
  if (input.nextStatus === "RESOLVED" && !input.outcome) {
    throw new Error("RESOLVED transition requires an outcome");
  }

  const now = new Date();
  const data: Record<string, unknown> = {
    status: input.nextStatus,
    lastActionById: input.lastActionById,
  };

  // Stamp the timestamp matching this transition.
  if (input.nextStatus === "INVESTIGATING") data.investigatingAt = now;
  if (input.nextStatus === "DRAFTED") data.draftedAt = now;
  if (input.nextStatus === "SUBMITTED") {
    data.submittedAt = now;
    data.filingReference = input.filingReference;
  }
  if (input.nextStatus === "ACKNOWLEDGED") data.acknowledgedAt = now;
  if (input.nextStatus === "RESOLVED") {
    data.resolvedAt = now;
    data.outcome = input.outcome;
    if (input.penaltyAmountUsd !== undefined) {
      data.penaltyAmountUsd = input.penaltyAmountUsd;
    }
    if (input.outcomeNotes !== undefined) {
      data.outcomeNotes = input.outcomeNotes;
    }
  }
  if (input.nextStatus === "WITHDRAWN") {
    data.outcome = "WITHDRAWN" satisfies TradeVSDOutcome;
    data.resolvedAt = now;
  }

  if (input.filingDocumentId !== undefined) {
    data.filingDocumentId = input.filingDocumentId;
  }
  if (input.notes !== undefined) {
    data.notes = input.notes;
  }

  return prisma.tradeVoluntaryDisclosure.update({
    where: { id: input.vsdId },
    data,
  });
}

/**
 * Allowed transitions:
 *   DISCOVERED    → INVESTIGATING
 *   INVESTIGATING → DRAFTED
 *   DRAFTED       → SUBMITTED
 *   SUBMITTED     → ACKNOWLEDGED
 *   ACKNOWLEDGED  → RESOLVED
 *   any non-terminal → WITHDRAWN
 *
 * Terminal states: RESOLVED, WITHDRAWN.
 *
 * Note: We intentionally do NOT allow skipping states. Each
 * transition records a timestamp that's later used by the
 * authority deadline-tracking cron + audit defense.
 */
function isValidTransition(
  current: TradeVSDStatus,
  next: TradeVSDStatus,
): boolean {
  if (current === next) return false;
  if (next === "WITHDRAWN") {
    return current !== "RESOLVED" && current !== "WITHDRAWN";
  }
  const allowed: Record<TradeVSDStatus, TradeVSDStatus[]> = {
    DISCOVERED: ["INVESTIGATING"],
    INVESTIGATING: ["DRAFTED"],
    DRAFTED: ["SUBMITTED"],
    SUBMITTED: ["ACKNOWLEDGED"],
    ACKNOWLEDGED: ["RESOLVED"],
    RESOLVED: [],
    WITHDRAWN: [],
  };
  return allowed[current].includes(next);
}
