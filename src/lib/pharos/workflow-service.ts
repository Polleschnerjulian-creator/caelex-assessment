import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Pharos Workflow Service — DB-persistierte FSM-Operationen.
 *
 * Ergänzt die in-memory FSMs aus workflow-fsm.ts um Persistierung in
 * `WorkflowCase` (aktueller Stand) + `WorkflowTransition` (signierte
 * Hash-Chain pro Case). Jede Service-Funktion ist atomar (Prisma-TX),
 * sodass parallele Events nicht zu Doppel-Transitions oder
 * Hash-Chain-Brüchen führen.
 *
 * Public API:
 *   - createWorkflowCase  — startet eine neue FSM-Instanz
 *   - dispatchEvent       — feuert ein Event auf die FSM (signed transition)
 *   - autoTransitionDueCases — Cron-Helper für SLA-Breach-Auto-Transitions
 *   - listOpenCases / getCase / getTransitions — Reads
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  euSpaceActAuthFSM,
  nis2IncidentFSM,
  WorkflowFSM,
  type AuthEvent,
  type AuthState,
  type Nis2Event,
  type Nis2State,
} from "./workflow-fsm";

const FSM_REGISTRY = {
  "nis2-incident-v1": nis2IncidentFSM,
  "eu-space-act-authorisation-v1": euSpaceActAuthFSM,
} as const;

export type FSMId = keyof typeof FSM_REGISTRY;

export class WorkflowError extends Error {
  constructor(
    public readonly code:
      | "FSM_NOT_FOUND"
      | "CASE_NOT_FOUND"
      | "INVALID_EVENT"
      | "ALREADY_FINAL"
      | "DB_ERROR",
    message: string,
  ) {
    super(message);
    this.name = "WorkflowError";
  }
}

function getFSM(fsmId: string): WorkflowFSM<string, string> {
  const fsm = (FSM_REGISTRY as Record<string, WorkflowFSM<string, string>>)[
    fsmId
  ];
  if (!fsm) throw new WorkflowError("FSM_NOT_FOUND", `Unknown fsmId: ${fsmId}`);
  return fsm;
}

// ─── Create ───────────────────────────────────────────────────────────

export async function createWorkflowCase(input: {
  fsmId: FSMId;
  caseRef: string;
  oversightId?: string;
  authorityProfileId?: string;
  operatorOrgId?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ caseId: string; currentState: string }> {
  const fsm = getFSM(input.fsmId);
  const initial = fsm.initialState();

  const created = await prisma.workflowCase.create({
    data: {
      fsmId: input.fsmId,
      caseRef: input.caseRef,
      oversightId: input.oversightId,
      authorityProfileId: input.authorityProfileId,
      operatorOrgId: input.operatorOrgId,
      currentState: initial,
      metadata: input.metadata ?? null,
    },
    select: { id: true, currentState: true },
  });
  return { caseId: created.id, currentState: created.currentState };
}

// ─── Dispatch Event ───────────────────────────────────────────────────

export async function dispatchEvent(input: {
  caseId: string;
  event: string;
  actorUserId: string | null;
  payload?: Record<string, unknown>;
}): Promise<{
  ok: boolean;
  newState?: string;
  transitionId?: string;
  reason?: string;
}> {
  return await prisma.$transaction(async (tx) => {
    const cur = await tx.workflowCase.findUnique({
      where: { id: input.caseId },
      select: {
        id: true,
        fsmId: true,
        caseRef: true,
        currentState: true,
        lastTransitionHash: true,
        closedAt: true,
      },
    });
    if (!cur) {
      return { ok: false, reason: "case-not-found" };
    }
    if (cur.closedAt) {
      return { ok: false, reason: "case-already-closed" };
    }

    const fsm = getFSM(cur.fsmId);
    const target = fsm.next(cur.currentState, input.event);
    if (!target) {
      return {
        ok: false,
        reason: `Event '${input.event}' is not allowed in state '${cur.currentState}'`,
      };
    }

    const signed = fsm.signTransition({
      caseRef: cur.caseRef,
      from: cur.currentState,
      to: target,
      event: input.event,
      actorUserId: input.actorUserId,
      payload: input.payload,
      previousHash: cur.lastTransitionHash ?? undefined,
    });

    const created = await tx.workflowTransition.create({
      data: {
        caseId: cur.id,
        fromState: signed.from,
        toState: signed.to,
        event: signed.event,
        reason: signed.reason ?? null,
        payload: (signed.payload as object | null) ?? null,
        actorUserId: signed.actorUserId,
        previousHash: cur.lastTransitionHash,
        transitionHash: signed.transitionHash,
        signature: signed.signature,
        publicKeyBase64: signed.publicKeyBase64,
        occurredAt: new Date(signed.occurredAt),
      },
      select: { id: true },
    });

    await tx.workflowCase.update({
      where: { id: cur.id },
      data: {
        currentState: target,
        enteredStateAt: new Date(),
        lastTransitionHash: signed.transitionHash,
        closedAt: fsm.isFinal(target) ? new Date() : null,
      },
    });

    return { ok: true, newState: target, transitionId: created.id };
  });
}

// ─── SLA Auto-Transition (Cron) ───────────────────────────────────────

/** Scan open cases and auto-transition any whose SLA has elapsed.
 *  Returns counts for cron-job logging. */
export async function autoTransitionDueCases(): Promise<{
  scanned: number;
  transitioned: number;
  errors: number;
}> {
  let scanned = 0;
  let transitioned = 0;
  let errors = 0;

  const open = await prisma.workflowCase.findMany({
    where: { closedAt: null },
    select: {
      id: true,
      fsmId: true,
      caseRef: true,
      currentState: true,
      enteredStateAt: true,
      lastTransitionHash: true,
    },
    take: 500,
  });

  for (const c of open) {
    scanned++;
    try {
      const fsm = getFSM(c.fsmId);
      const auto = fsm.afterTransition(c.currentState, c.enteredStateAt);
      if (!auto) continue;

      // Use the same transactional dispatch path, but synthesize an
      // _AFTER event (special event name that signTransition understands).
      const signed = fsm.signTransition({
        caseRef: c.caseRef,
        from: c.currentState,
        to: auto.target,
        event: "_AFTER",
        reason: auto.reason,
        actorUserId: null,
        previousHash: c.lastTransitionHash ?? undefined,
      });
      await prisma.$transaction([
        prisma.workflowTransition.create({
          data: {
            caseId: c.id,
            fromState: signed.from,
            toState: signed.to,
            event: signed.event,
            reason: signed.reason ?? null,
            actorUserId: null,
            previousHash: c.lastTransitionHash,
            transitionHash: signed.transitionHash,
            signature: signed.signature,
            publicKeyBase64: signed.publicKeyBase64,
            occurredAt: new Date(signed.occurredAt),
          },
        }),
        prisma.workflowCase.update({
          where: { id: c.id },
          data: {
            currentState: auto.target,
            enteredStateAt: new Date(),
            lastTransitionHash: signed.transitionHash,
            closedAt: fsm.isFinal(auto.target) ? new Date() : null,
          },
        }),
      ]);
      transitioned++;
    } catch (err) {
      errors++;
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[workflow-service] auto-transition ${c.id} failed: ${msg}`);
    }
  }

  return { scanned, transitioned, errors };
}

// ─── Reads ─────────────────────────────────────────────────────────────

export async function listOpenCases(input: {
  fsmId?: FSMId;
  authorityProfileId?: string;
  operatorOrgId?: string;
  limit?: number;
}) {
  return prisma.workflowCase.findMany({
    where: {
      closedAt: null,
      ...(input.fsmId ? { fsmId: input.fsmId } : {}),
      ...(input.authorityProfileId
        ? { authorityProfileId: input.authorityProfileId }
        : {}),
      ...(input.operatorOrgId ? { operatorOrgId: input.operatorOrgId } : {}),
    },
    orderBy: { enteredStateAt: "asc" },
    take: input.limit ?? 100,
  });
}

export async function getCase(caseId: string) {
  return prisma.workflowCase.findUnique({
    where: { id: caseId },
    include: {
      transitions: {
        orderBy: { occurredAt: "asc" },
      },
    },
  });
}
