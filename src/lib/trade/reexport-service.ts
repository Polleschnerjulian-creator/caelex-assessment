import "server-only";
import { prisma } from "@/lib/prisma";
import {
  type TradeReexportConsent,
  type TradeReexportStatus,
  type TradeReexportFormType,
} from "@prisma/client";

/**
 * Caelex Trade — Re-Export Consent Letter service (Sprint E4b).
 *
 * Thin Prisma wrapper for TradeReexportConsent. Same org-scope rules
 * as the EUC service: all reads gated by orgId, cross-org writes
 * actively refused via defensive party/operation lookups.
 *
 * State machine (lifecycle):
 *   DRAFTED → SENT → APPROVED → EXPIRED
 *   DRAFTED → SENT → DENIED   (terminal-style — operation halts)
 *   any non-terminal → REVOKED
 *
 * Note: DENIED is reachable from SENT (mirroring real-world "exporter
 * refused consent" outcomes). It's terminal: the operator must seek
 * an alternative authorisation rather than re-trying the same flow.
 */

// ─── Types ──────────────────────────────────────────────────────────

export type ReexportWithRelations = TradeReexportConsent & {
  requestingParty: { id: string; canonicalName: string; countryCode: string };
  operation: { id: string; reference: string } | null;
};

export interface ReexportCreateInput {
  organizationId: string;
  formType: TradeReexportFormType;
  requestingPartyId: string;
  originalExporterName: string;
  originalExporterCountry: string;
  newDestinationCountry: string;
  newEndUserName: string;
  originalLicenseNumber?: string | null;
  operationId?: string | null;
  notes?: string | null;
  lastActionById: string;
}

export interface ReexportStatusTransitionInput {
  organizationId: string;
  reexportId: string;
  nextStatus: TradeReexportStatus;
  lastActionById: string;
  /** Required when transitioning to DENIED. */
  denialReason?: string | null;
  /** Required when transitioning to APPROVED (validity-end date). */
  validUntil?: Date | null;
  signedDocumentId?: string | null;
  notes?: string | null;
}

// ─── Reads ──────────────────────────────────────────────────────────

export async function listReexportConsents(
  organizationId: string,
  options: { status?: TradeReexportStatus } = {},
): Promise<ReexportWithRelations[]> {
  return prisma.tradeReexportConsent.findMany({
    where: {
      organizationId,
      ...(options.status ? { status: options.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      requestingParty: {
        select: { id: true, canonicalName: true, countryCode: true },
      },
      operation: { select: { id: true, reference: true } },
    },
  });
}

export async function getReexportConsent(
  organizationId: string,
  reexportId: string,
): Promise<ReexportWithRelations | null> {
  return prisma.tradeReexportConsent.findFirst({
    where: { id: reexportId, organizationId },
    include: {
      requestingParty: {
        select: { id: true, canonicalName: true, countryCode: true },
      },
      operation: { select: { id: true, reference: true } },
    },
  });
}

// ─── Writes ─────────────────────────────────────────────────────────

export async function createReexportConsent(
  input: ReexportCreateInput,
): Promise<TradeReexportConsent> {
  // Org-scope defence: refuse cross-org party / operation.
  const party = await prisma.tradeParty.findFirst({
    where: {
      id: input.requestingPartyId,
      organizationId: input.organizationId,
    },
    select: { id: true },
  });
  if (!party) {
    throw new Error("Requesting party not found in this organisation");
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

  return prisma.tradeReexportConsent.create({
    data: {
      organizationId: input.organizationId,
      formType: input.formType,
      originalLicenseNumber: input.originalLicenseNumber ?? null,
      originalExporterName: input.originalExporterName,
      originalExporterCountry: input.originalExporterCountry,
      requestingPartyId: input.requestingPartyId,
      newDestinationCountry: input.newDestinationCountry,
      newEndUserName: input.newEndUserName,
      operationId: input.operationId ?? null,
      notes: input.notes ?? null,
      lastActionById: input.lastActionById,
    },
  });
}

export async function transitionReexportStatus(
  input: ReexportStatusTransitionInput,
): Promise<TradeReexportConsent> {
  const current = await prisma.tradeReexportConsent.findFirst({
    where: { id: input.reexportId, organizationId: input.organizationId },
  });
  if (!current) {
    throw new Error("Re-export consent not found in this organisation");
  }

  if (!isValidTransition(current.status, input.nextStatus)) {
    throw new Error(
      `Invalid lifecycle transition ${current.status} → ${input.nextStatus}`,
    );
  }

  // DENIED requires a reason; APPROVED encourages but doesn't require
  // a validUntil (operators may add it later).
  if (input.nextStatus === "DENIED" && !input.denialReason) {
    throw new Error("DENIED transition requires a denial reason");
  }

  const now = new Date();
  const data: Record<string, unknown> = {
    status: input.nextStatus,
    lastActionById: input.lastActionById,
  };

  if (input.nextStatus === "SENT") data.sentAt = now;
  if (input.nextStatus === "APPROVED" || input.nextStatus === "DENIED") {
    data.decidedAt = now;
  }
  if (input.nextStatus === "DENIED") {
    data.denialReason = input.denialReason;
  }

  if (input.signedDocumentId !== undefined) {
    data.signedDocumentId = input.signedDocumentId;
  }
  if (input.validUntil !== undefined) {
    data.validUntil = input.validUntil;
  }
  if (input.notes !== undefined) {
    data.notes = input.notes;
  }

  return prisma.tradeReexportConsent.update({
    where: { id: input.reexportId },
    data,
  });
}

/**
 * Allowed transitions:
 *   DRAFTED  → SENT      (dispatch to original exporter)
 *   SENT     → APPROVED  (consent granted)
 *   SENT     → DENIED    (consent refused — terminal)
 *   APPROVED → EXPIRED   (validUntil passed — usually cron-set)
 *   any non-terminal → REVOKED  (operator override)
 *
 * Terminal states: APPROVED→EXPIRED, DENIED, EXPIRED, REVOKED.
 */
function isValidTransition(
  current: TradeReexportStatus,
  next: TradeReexportStatus,
): boolean {
  if (current === next) return false;
  if (next === "REVOKED") {
    // Reachable from any non-terminal state
    return (
      current !== "EXPIRED" && current !== "REVOKED" && current !== "DENIED"
    );
  }
  // Explicit allowed forward steps
  const allowed: Record<TradeReexportStatus, TradeReexportStatus[]> = {
    DRAFTED: ["SENT"],
    SENT: ["APPROVED", "DENIED"],
    APPROVED: ["EXPIRED"],
    DENIED: [],
    EXPIRED: [],
    REVOKED: [],
  };
  return allowed[current].includes(next);
}
