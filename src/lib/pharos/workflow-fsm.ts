import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Pharos Workflow FSM — minimal pure-TS state machine for behördliche
 * Verfahrensabläufe.
 *
 * Konzeptpapier-§4.3 spezifiziert XState v5; wir rollen aber einen
 * 150-LOC FSM-Helper weil:
 *   1. zero new runtime deps (XState v5 ~50KB)
 *   2. unsere Use-Cases brauchen weder Actor-Model noch SCXML-
 *      Kompatibilität — nur State + Transitions + Time-Triggers +
 *      Signaturen.
 *   3. jeder Transition-Event muss Ed25519-signiert + hash-chained
 *      werden, das ist domain-spezifisch und passt nicht 1:1 in
 *      XState's `actions`.
 *
 * Erste Maschine: NIS2-Incident-Reporting mit den drei gesetzlichen
 * Fristen (24h Early-Warning, 72h Incident-Notification, 30d Final-Report).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { createHash, sign } from "node:crypto";
import { logger } from "@/lib/logger";
import { deriveAuthorityKeypair } from "./receipt";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_k, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(v).sort()) {
        out[k] = (v as Record<string, unknown>)[k];
      }
      return out;
    }
    return v;
  });
}

// ─── Generic FSM types ────────────────────────────────────────────────

export interface StateDef<TState extends string, TEvent extends string> {
  /** Human-readable label of this state. */
  label: string;
  /** Ist das ein Final-State? */
  final?: boolean;
  /** Erlaubte Events von diesem State + Ziel-State. */
  on?: Partial<Record<TEvent, TState>>;
  /** SLA-Trigger: wenn nach X ms kein Event kam → Auto-Transition. */
  after?: { afterMs: number; target: TState; reason: string };
}

export interface MachineDef<TState extends string, TEvent extends string> {
  id: string;
  initial: TState;
  states: Record<TState, StateDef<TState, TEvent>>;
}

export interface SignedTransition<
  TState extends string,
  TEvent extends string,
> {
  fsmId: string;
  caseRef: string;
  from: TState;
  to: TState;
  event: TEvent | "_AFTER";
  reason?: string;
  occurredAt: string;
  actorUserId: string | null;
  payload?: Record<string, unknown>;
  /** Hash über alle Felder oben + previousHash. */
  transitionHash: string;
  signature: string;
  publicKeyBase64: string;
}

// ─── Engine ───────────────────────────────────────────────────────────

export class WorkflowFSM<TState extends string, TEvent extends string> {
  constructor(private def: MachineDef<TState, TEvent>) {}

  initialState(): TState {
    return this.def.initial;
  }

  isFinal(state: TState): boolean {
    return !!this.def.states[state]?.final;
  }

  /** Compute next state on event firing. Returns null if event invalid
   *  for the current state (caller can either reject or hold). */
  next(state: TState, event: TEvent): TState | null {
    const def = this.def.states[state];
    if (!def?.on) return null;
    return (def.on[event] as TState | undefined) ?? null;
  }

  /** Compute auto-transition target if SLA breached. */
  afterTransition(
    state: TState,
    enteredStateAt: Date,
    now: Date = new Date(),
  ): { target: TState; reason: string } | null {
    const def = this.def.states[state];
    if (!def?.after) return null;
    const elapsed = now.getTime() - enteredStateAt.getTime();
    if (elapsed >= def.after.afterMs) {
      return { target: def.after.target, reason: def.after.reason };
    }
    return null;
  }

  /** Mint a SignedTransition for the given event. The signature uses an
   *  Ed25519 key derived from the actor's userId (or "system" for
   *  auto-transitions). previousHash chains it into the per-case
   *  audit-log; the very first transition uses sha256("genesis"). */
  signTransition(input: {
    caseRef: string;
    from: TState;
    to: TState;
    event: TEvent | "_AFTER";
    reason?: string;
    actorUserId: string | null;
    payload?: Record<string, unknown>;
    previousHash?: string;
  }): SignedTransition<TState, TEvent> {
    const occurredAt = new Date().toISOString();
    const previousHash = input.previousHash ?? sha256Hex("genesis");
    const transitionHash = sha256Hex(
      [
        previousHash,
        canonicalJson({
          actorUserId: input.actorUserId ?? "system",
          caseRef: input.caseRef,
          event: input.event,
          fsmId: this.def.id,
          from: input.from,
          occurredAt,
          payload: input.payload ?? null,
          reason: input.reason ?? null,
          to: input.to,
        }),
      ].join("|"),
    );
    const signerId = input.actorUserId
      ? `approver:${input.actorUserId}`
      : `system:${this.def.id}`;
    const kp = deriveAuthorityKeypair(signerId);
    const sigBuf = sign(
      null,
      Buffer.from(transitionHash, "hex"),
      kp.privateKey,
    );
    return {
      fsmId: this.def.id,
      caseRef: input.caseRef,
      from: input.from,
      to: input.to,
      event: input.event,
      reason: input.reason,
      occurredAt,
      actorUserId: input.actorUserId,
      payload: input.payload,
      transitionHash,
      signature: sigBuf.toString("base64"),
      publicKeyBase64: kp.publicKeyBase64,
    };
  }
}

// ─── NIS2 Incident-Reporting Machine ─────────────────────────────────

export type Nis2State =
  | "AwaitingEarlyWarning"
  | "AwaitingNotification"
  | "AwaitingFinalReport"
  | "UnderReview"
  | "Closed"
  | "Breached24h"
  | "Breached72h"
  | "Breached30d";

export type Nis2Event =
  | "EARLY_WARNING_RECEIVED"
  | "INCIDENT_NOTIFICATION_RECEIVED"
  | "FINAL_REPORT_RECEIVED"
  | "SACHBEARBEITER_DECISION_CLOSE"
  | "BREACH_ACKNOWLEDGED";

export const NIS2_INCIDENT_FSM_DEF: MachineDef<Nis2State, Nis2Event> = {
  id: "nis2-incident-v1",
  initial: "AwaitingEarlyWarning",
  states: {
    AwaitingEarlyWarning: {
      label: "Wartet auf Early Warning (24h-Frist)",
      after: {
        afterMs: 24 * 3600_000,
        target: "Breached24h",
        reason: "24h-Early-Warning-Frist nach NIS2 Art. 23(4)(a) verstrichen",
      },
      on: {
        EARLY_WARNING_RECEIVED: "AwaitingNotification",
      },
    },
    AwaitingNotification: {
      label: "Wartet auf Incident-Notification (72h-Frist)",
      after: {
        afterMs: 72 * 3600_000,
        target: "Breached72h",
        reason: "72h-Notification-Frist nach NIS2 Art. 23(4)(b) verstrichen",
      },
      on: {
        INCIDENT_NOTIFICATION_RECEIVED: "AwaitingFinalReport",
      },
    },
    AwaitingFinalReport: {
      label: "Wartet auf Final Report (30d-Frist)",
      after: {
        afterMs: 30 * 24 * 3600_000,
        target: "Breached30d",
        reason: "30d-Final-Report-Frist nach NIS2 Art. 23(4)(c) verstrichen",
      },
      on: {
        FINAL_REPORT_RECEIVED: "UnderReview",
      },
    },
    UnderReview: {
      label: "Behörden-Review",
      on: {
        SACHBEARBEITER_DECISION_CLOSE: "Closed",
      },
    },
    Closed: {
      label: "Verfahren beendet",
      final: true,
    },
    Breached24h: {
      label: "24h-Frist verletzt",
      on: {
        EARLY_WARNING_RECEIVED: "AwaitingNotification",
        BREACH_ACKNOWLEDGED: "Closed",
      },
    },
    Breached72h: {
      label: "72h-Frist verletzt",
      on: {
        INCIDENT_NOTIFICATION_RECEIVED: "AwaitingFinalReport",
        BREACH_ACKNOWLEDGED: "Closed",
      },
    },
    Breached30d: {
      label: "30d-Frist verletzt",
      on: {
        FINAL_REPORT_RECEIVED: "UnderReview",
        BREACH_ACKNOWLEDGED: "Closed",
      },
    },
  },
};

export const nis2IncidentFSM = new WorkflowFSM(NIS2_INCIDENT_FSM_DEF);

// ─── EU Space Act Authorisation Machine ──────────────────────────────

export type AuthState =
  | "Submitted"
  | "Triage"
  | "RequiresAdditionalInfo"
  | "InReview"
  | "AwaitingApproval"
  | "Approved"
  | "Rejected"
  | "Withdrawn";

export type AuthEvent =
  | "TRIAGE_COMPLETE"
  | "REQUEST_INFO"
  | "INFO_PROVIDED"
  | "REVIEW_COMPLETE"
  | "APPROVED_FINAL"
  | "REJECTED_FINAL"
  | "OPERATOR_WITHDREW";

export const EU_SPACE_ACT_AUTH_FSM_DEF: MachineDef<AuthState, AuthEvent> = {
  id: "eu-space-act-authorisation-v1",
  initial: "Submitted",
  states: {
    Submitted: {
      label: "Antrag eingegangen",
      on: { TRIAGE_COMPLETE: "Triage", OPERATOR_WITHDREW: "Withdrawn" },
    },
    Triage: {
      label: "Vorprüfung",
      on: {
        REQUEST_INFO: "RequiresAdditionalInfo",
        REVIEW_COMPLETE: "InReview",
        OPERATOR_WITHDREW: "Withdrawn",
      },
    },
    RequiresAdditionalInfo: {
      label: "Wartet auf Operator-Nachreichung",
      after: {
        afterMs: 30 * 24 * 3600_000,
        target: "Withdrawn",
        reason:
          "30 Tage ohne Nachreichung — Antrag gilt als zurückgezogen (analog VwVfG §32)",
      },
      on: {
        INFO_PROVIDED: "InReview",
        OPERATOR_WITHDREW: "Withdrawn",
      },
    },
    InReview: {
      label: "Sachbearbeiter-Prüfung",
      on: {
        REVIEW_COMPLETE: "AwaitingApproval",
        REQUEST_INFO: "RequiresAdditionalInfo",
      },
    },
    AwaitingApproval: {
      label: "Wartet auf k-of-n-Approval",
      on: { APPROVED_FINAL: "Approved", REJECTED_FINAL: "Rejected" },
    },
    Approved: { label: "Genehmigt", final: true },
    Rejected: { label: "Abgelehnt", final: true },
    Withdrawn: { label: "Zurückgezogen", final: true },
  },
};

export const euSpaceActAuthFSM = new WorkflowFSM(EU_SPACE_ACT_AUTH_FSM_DEF);
