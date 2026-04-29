import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Pharos Approval Service — DB-persistierte k-of-n-Approvals.
 *
 * Wraps multi-party-approval.ts with Prisma-Persistierung. Public API:
 *   - createApprovalRequest — neuen Request anlegen (Status OPEN)
 *   - signApprovalRequest   — Signatur eines Approvers hinzufügen
 *   - finalizeApprovalRequest — wenn k-Threshold erreicht → APPROVED
 *   - listOpenApprovals     — Inbox für Sachbearbeiter
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  buildApprovalRequest,
  DEFAULT_PROFILES,
  signApproval,
  verifyApprovalQuorum,
  type ApprovalKind,
  type ApproverRole,
} from "./multi-party-approval";

export class ApprovalServiceError extends Error {
  constructor(
    public readonly code:
      | "REQUEST_NOT_FOUND"
      | "REQUEST_NOT_OPEN"
      | "EXPIRED"
      | "ALREADY_SIGNED"
      | "QUORUM_NOT_MET",
    message: string,
  ) {
    super(message);
    this.name = "ApprovalServiceError";
  }
}

export async function createApprovalRequest(input: {
  kind: ApprovalKind;
  authorityProfileId: string;
  oversightId?: string;
  initiatedBy: string;
  payload: Record<string, unknown>;
  ttlHours?: number;
}): Promise<{ requestId: string; payloadHash: string; expiresAt: Date }> {
  const profile = DEFAULT_PROFILES[input.kind];
  const requestData = buildApprovalRequest({
    id: "tmp", // overwritten by db cuid
    ...input,
    ttlHours: input.ttlHours ?? profile.ttlHours,
  });

  const created = await prisma.approvalRequest.create({
    data: {
      kind: input.kind,
      authorityProfileId: input.authorityProfileId,
      oversightId: input.oversightId,
      initiatedBy: input.initiatedBy,
      payload: input.payload,
      payloadHash: requestData.payloadHash,
      status: "OPEN",
      initiatedAt: new Date(requestData.initiatedAt),
      expiresAt: new Date(requestData.expiresAt),
    },
    select: { id: true, payloadHash: true, expiresAt: true },
  });
  return {
    requestId: created.id,
    payloadHash: created.payloadHash,
    expiresAt: created.expiresAt,
  };
}

export async function signApprovalRequest(input: {
  requestId: string;
  approverUserId: string;
  approverRole: ApproverRole;
}): Promise<{
  ok: boolean;
  signed: boolean;
  finalized: boolean;
  reason?: string;
}> {
  const req = await prisma.approvalRequest.findUnique({
    where: { id: input.requestId },
    include: { signatures: true },
  });
  if (!req) {
    throw new ApprovalServiceError(
      "REQUEST_NOT_FOUND",
      "Request nicht gefunden",
    );
  }
  if (req.status !== "OPEN") {
    throw new ApprovalServiceError(
      "REQUEST_NOT_OPEN",
      `Request hat Status ${req.status}`,
    );
  }
  if (Date.now() > req.expiresAt.getTime()) {
    await prisma.approvalRequest.update({
      where: { id: req.id },
      data: { status: "EXPIRED", closedAt: new Date() },
    });
    throw new ApprovalServiceError("EXPIRED", "Approval-Request abgelaufen");
  }

  // Prevent double-sign
  const already = req.signatures.find(
    (s) => s.approverUserId === input.approverUserId,
  );
  if (already) {
    throw new ApprovalServiceError(
      "ALREADY_SIGNED",
      "User hat bereits signiert",
    );
  }

  // Build the request shape that signApproval expects
  const requestShape = {
    id: req.id,
    kind: req.kind as ApprovalKind,
    payload: req.payload as Record<string, unknown>,
    authorityProfileId: req.authorityProfileId,
    oversightId: req.oversightId ?? undefined,
    initiatedBy: req.initiatedBy,
    initiatedAt: req.initiatedAt.toISOString(),
    expiresAt: req.expiresAt.toISOString(),
    payloadHash: req.payloadHash,
  };
  const sig = signApproval(
    requestShape,
    input.approverUserId,
    input.approverRole,
  );

  await prisma.approvalSignature.create({
    data: {
      requestId: req.id,
      approverUserId: input.approverUserId,
      approverRole: input.approverRole,
      payloadHash: sig.payloadHash,
      signature: sig.signature,
      publicKeyBase64: sig.publicKeyBase64,
      signedAt: new Date(sig.signedAt),
    },
  });

  // Re-evaluate quorum
  const fresh = await prisma.approvalRequest.findUnique({
    where: { id: req.id },
    include: { signatures: true },
  });
  if (!fresh) return { ok: true, signed: true, finalized: false };

  const verdict = verifyApprovalQuorum(
    requestShape,
    fresh.signatures.map((s) => ({
      approverUserId: s.approverUserId,
      approverRole: s.approverRole as ApproverRole,
      payloadHash: s.payloadHash,
      signature: s.signature,
      publicKeyBase64: s.publicKeyBase64,
      signedAt: s.signedAt.toISOString(),
    })),
  );

  if (verdict.ok && verdict.aggregateHash) {
    await prisma.approvalRequest.update({
      where: { id: req.id },
      data: {
        status: "APPROVED",
        aggregateHash: verdict.aggregateHash,
        closedAt: new Date(),
      },
    });
    return { ok: true, signed: true, finalized: true };
  }
  return {
    ok: true,
    signed: true,
    finalized: false,
    reason: verdict.reason,
  };
}

export async function listOpenApprovals(authorityProfileId: string) {
  return prisma.approvalRequest.findMany({
    where: {
      authorityProfileId,
      status: "OPEN",
      expiresAt: { gt: new Date() },
    },
    include: {
      signatures: {
        select: {
          id: true,
          approverUserId: true,
          approverRole: true,
          signedAt: true,
        },
      },
    },
    orderBy: { initiatedAt: "desc" },
    take: 100,
  });
}

export async function getApprovalRequest(requestId: string) {
  return prisma.approvalRequest.findUnique({
    where: { id: requestId },
    include: { signatures: true },
  });
}

/** Cron sweep — markiert OPEN-Requests als EXPIRED wenn Frist
 *  abgelaufen. Idempotent. */
export async function expireStaleApprovals(): Promise<{ expired: number }> {
  const stale = await prisma.approvalRequest.findMany({
    where: { status: "OPEN", expiresAt: { lt: new Date() } },
    select: { id: true },
  });
  if (stale.length === 0) return { expired: 0 };
  await prisma.approvalRequest.updateMany({
    where: { id: { in: stale.map((s) => s.id) } },
    data: { status: "EXPIRED", closedAt: new Date() },
  });
  logger.info(`[approval-service] expired ${stale.length} stale requests`);
  return { expired: stale.length };
}
