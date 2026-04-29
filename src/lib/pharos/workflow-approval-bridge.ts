import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Pharos Workflow ↔ Approval Bridge.
 *
 * Verbindet WorkflowFSMs mit Multi-Party-Approvals: bestimmte
 * State-Transitions erzeugen automatisch einen ApprovalRequest,
 * und sobald der Request APPROVED ist, fired die Bridge automatisch
 * das Final-Event auf die FSM.
 *
 * Mapping (per FSM + State, declarative):
 *   eu-space-act-authorisation-v1
 *     state AwaitingApproval → kind AUTHORIZATION_DECISION
 *       on APPROVED → dispatch APPROVED_FINAL
 *       on REJECTED → dispatch REJECTED_FINAL
 *
 *   nis2-incident-v1
 *     keine Approvals nötig (Sachbearbeiter signt direkt)
 *
 * Architektur: ein Cron-Pass alle 5 Min. (kombiniert mit der SLA-Cron)
 * gleicht WorkflowCase und ApprovalRequest ab und erzeugt fehlende
 * Approvals + dispatched fertige Approvals zurück. Idempotent.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { dispatchEvent } from "./workflow-service";
import { createApprovalRequest } from "./approval-service";
import type { ApprovalKind } from "./multi-party-approval";

interface BridgeRule {
  fsmId: string;
  state: string;
  approvalKind: ApprovalKind;
  /** Map of approval-result → FSM-event to dispatch back. */
  onApproved: string;
  onRejected?: string;
}

const BRIDGE_RULES: BridgeRule[] = [
  {
    fsmId: "eu-space-act-authorisation-v1",
    state: "AwaitingApproval",
    approvalKind: "AUTHORIZATION_DECISION",
    onApproved: "APPROVED_FINAL",
    onRejected: "REJECTED_FINAL",
  },
];

/** Returns the bridge rule (if any) that maps the given state of a
 *  given FSM to an ApprovalKind. */
function findRule(fsmId: string, state: string): BridgeRule | null {
  return (
    BRIDGE_RULES.find((r) => r.fsmId === fsmId && r.state === state) ?? null
  );
}

interface BridgeStats {
  approvalsCreated: number;
  approvalsApprovedDispatched: number;
  approvalsRejectedDispatched: number;
  approvalsExpiredHandled: number;
  errors: number;
}

/** Cron-style sweep — for every open WorkflowCase whose state requires
 *  an Approval, ensure the approval exists; for every closed Approval,
 *  fire the corresponding FSM event back. Idempotent. */
export async function runBridgeSweep(): Promise<BridgeStats> {
  const stats: BridgeStats = {
    approvalsCreated: 0,
    approvalsApprovedDispatched: 0,
    approvalsRejectedDispatched: 0,
    approvalsExpiredHandled: 0,
    errors: 0,
  };

  // ─── Pass 1: cases that need approvals → create them ──────────────
  const openCases = await prisma.workflowCase.findMany({
    where: { closedAt: null },
    select: {
      id: true,
      fsmId: true,
      currentState: true,
      authorityProfileId: true,
      operatorOrgId: true,
      oversightId: true,
      caseRef: true,
      metadata: true,
    },
    take: 500,
  });

  for (const c of openCases) {
    const rule = findRule(c.fsmId, c.currentState);
    if (!rule) continue;
    if (!c.authorityProfileId) continue;

    // Idempotency: skip if there's already an OPEN/APPROVED/REJECTED
    // approval-request linked to this case via metadata.workflowCaseId.
    const existing = await prisma.approvalRequest.findFirst({
      where: {
        kind: rule.approvalKind,
        oversightId: c.oversightId,
        // Phase-2-Erweiterung: bessere Workflow-Approval-Verlinkung via
        // dedicated FK. Phase 1: Match über payload.workflowCaseId.
        payload: {
          path: ["workflowCaseId"],
          equals: c.id,
        },
      },
      select: { id: true, status: true },
    });
    if (existing) continue;

    try {
      await createApprovalRequest({
        kind: rule.approvalKind,
        authorityProfileId: c.authorityProfileId,
        oversightId: c.oversightId ?? undefined,
        initiatedBy: "system:workflow-bridge",
        payload: {
          workflowCaseId: c.id,
          fsmId: c.fsmId,
          caseRef: c.caseRef,
          state: c.currentState,
          metadata: c.metadata,
        },
      });
      stats.approvalsCreated++;
    } catch (err) {
      stats.errors++;
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(
        `[bridge] failed to create approval for case ${c.id}: ${msg}`,
      );
    }
  }

  // ─── Pass 2: closed approvals → dispatch FSM events back ─────────
  const closedApprovals = await prisma.approvalRequest.findMany({
    where: {
      status: { in: ["APPROVED", "REJECTED", "EXPIRED"] },
      // Only those linked to a workflow-case (created by the bridge).
      payload: {
        path: ["workflowCaseId"],
        not: { equals: null as unknown as undefined },
      },
    },
    select: { id: true, status: true, payload: true },
    take: 500,
  });

  for (const a of closedApprovals) {
    const payload = a.payload as { workflowCaseId?: string; fsmId?: string };
    const caseId = payload?.workflowCaseId;
    const fsmId = payload?.fsmId;
    if (!caseId || !fsmId) continue;

    const c = await prisma.workflowCase.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        currentState: true,
        closedAt: true,
        fsmId: true,
      },
    });
    if (!c || c.closedAt) continue; // already closed/dispatched

    const rule = findRule(c.fsmId, c.currentState);
    if (!rule) continue; // case has moved past the AwaitingApproval state

    let event: string | null = null;
    if (a.status === "APPROVED") event = rule.onApproved;
    else if (a.status === "REJECTED" && rule.onRejected)
      event = rule.onRejected;
    else if (a.status === "EXPIRED" && rule.onRejected) {
      event = rule.onRejected;
      stats.approvalsExpiredHandled++;
    }
    if (!event) continue;

    try {
      const r = await dispatchEvent({
        caseId: c.id,
        event,
        actorUserId: null, // system-driven
        payload: { sourceApprovalId: a.id },
      });
      if (r.ok) {
        if (event === rule.onApproved) stats.approvalsApprovedDispatched++;
        else stats.approvalsRejectedDispatched++;
      }
    } catch (err) {
      stats.errors++;
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[bridge] dispatch failed for approval ${a.id}: ${msg}`);
    }
  }

  return stats;
}
