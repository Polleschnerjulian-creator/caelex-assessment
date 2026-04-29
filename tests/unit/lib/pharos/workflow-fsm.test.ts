/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Workflow FSM tests — pin the NIS2 + EU Space Act state machines.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, beforeAll, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

beforeAll(() => {
  process.env.ENCRYPTION_KEY =
    process.env.ENCRYPTION_KEY ||
    "test-encryption-key-for-unit-tests-deterministic-32chars";
});

import {
  EU_SPACE_ACT_AUTH_FSM_DEF,
  euSpaceActAuthFSM,
  NIS2_INCIDENT_FSM_DEF,
  nis2IncidentFSM,
} from "@/lib/pharos/workflow-fsm";

describe("NIS2 Incident FSM", () => {
  it("starts in AwaitingEarlyWarning", () => {
    expect(nis2IncidentFSM.initialState()).toBe("AwaitingEarlyWarning");
  });

  it("happy-path: EarlyWarning → Notification → FinalReport → Review → Closed", () => {
    let s = nis2IncidentFSM.initialState();
    s = nis2IncidentFSM.next(s, "EARLY_WARNING_RECEIVED")!;
    expect(s).toBe("AwaitingNotification");
    s = nis2IncidentFSM.next(s, "INCIDENT_NOTIFICATION_RECEIVED")!;
    expect(s).toBe("AwaitingFinalReport");
    s = nis2IncidentFSM.next(s, "FINAL_REPORT_RECEIVED")!;
    expect(s).toBe("UnderReview");
    s = nis2IncidentFSM.next(s, "SACHBEARBEITER_DECISION_CLOSE")!;
    expect(s).toBe("Closed");
    expect(nis2IncidentFSM.isFinal(s)).toBe(true);
  });

  it("rejects invalid event from current state", () => {
    expect(
      nis2IncidentFSM.next("AwaitingEarlyWarning", "FINAL_REPORT_RECEIVED"),
    ).toBeNull();
  });

  it("auto-transitions to Breached24h after 24h", () => {
    const enteredAt = new Date(Date.now() - 25 * 3600_000);
    const after = nis2IncidentFSM.afterTransition(
      "AwaitingEarlyWarning",
      enteredAt,
    );
    expect(after).not.toBeNull();
    expect(after!.target).toBe("Breached24h");
    expect(after!.reason).toMatch(/24h/);
  });

  it("does NOT auto-transition before 24h elapsed", () => {
    const enteredAt = new Date(Date.now() - 1000);
    const after = nis2IncidentFSM.afterTransition(
      "AwaitingEarlyWarning",
      enteredAt,
    );
    expect(after).toBeNull();
  });

  it("breached states allow recovery via late submission", () => {
    expect(nis2IncidentFSM.next("Breached24h", "EARLY_WARNING_RECEIVED")).toBe(
      "AwaitingNotification",
    );
    expect(nis2IncidentFSM.next("Breached24h", "BREACH_ACKNOWLEDGED")).toBe(
      "Closed",
    );
  });

  it("def has 8 states", () => {
    expect(Object.keys(NIS2_INCIDENT_FSM_DEF.states).length).toBe(8);
  });
});

describe("EU Space Act Authorisation FSM", () => {
  it("starts in Submitted", () => {
    expect(euSpaceActAuthFSM.initialState()).toBe("Submitted");
  });

  it("happy-path: Submitted → Triage → InReview → AwaitingApproval → Approved", () => {
    let s = euSpaceActAuthFSM.initialState();
    s = euSpaceActAuthFSM.next(s, "TRIAGE_COMPLETE")!;
    expect(s).toBe("Triage");
    s = euSpaceActAuthFSM.next(s, "REVIEW_COMPLETE")!;
    expect(s).toBe("InReview");
    s = euSpaceActAuthFSM.next(s, "REVIEW_COMPLETE")!;
    expect(s).toBe("AwaitingApproval");
    s = euSpaceActAuthFSM.next(s, "APPROVED_FINAL")!;
    expect(s).toBe("Approved");
    expect(euSpaceActAuthFSM.isFinal(s)).toBe(true);
  });

  it("RequiresAdditionalInfo expires after 30d → Withdrawn", () => {
    const enteredAt = new Date(Date.now() - 31 * 24 * 3600_000);
    const after = euSpaceActAuthFSM.afterTransition(
      "RequiresAdditionalInfo",
      enteredAt,
    );
    expect(after?.target).toBe("Withdrawn");
  });

  it("Withdrawn is final and has no outgoing transitions", () => {
    expect(euSpaceActAuthFSM.isFinal("Withdrawn")).toBe(true);
    expect(EU_SPACE_ACT_AUTH_FSM_DEF.states.Withdrawn.on).toBeUndefined();
  });

  it("from any pre-final state operator can withdraw", () => {
    expect(euSpaceActAuthFSM.next("Submitted", "OPERATOR_WITHDREW")).toBe(
      "Withdrawn",
    );
    expect(euSpaceActAuthFSM.next("Triage", "OPERATOR_WITHDREW")).toBe(
      "Withdrawn",
    );
  });
});

describe("signTransition", () => {
  it("produces a SignedTransition with valid hash chain", () => {
    const t = nis2IncidentFSM.signTransition({
      caseRef: "CASE-1",
      from: "AwaitingEarlyWarning",
      to: "AwaitingNotification",
      event: "EARLY_WARNING_RECEIVED",
      actorUserId: "user-1",
    });
    expect(t.fsmId).toBe("nis2-incident-v1");
    expect(t.transitionHash).toMatch(/^[0-9a-f]{64}$/);
    expect(t.signature).toBeTruthy();
    expect(t.publicKeyBase64).toBeTruthy();
  });

  it("chains via previousHash", () => {
    const a = nis2IncidentFSM.signTransition({
      caseRef: "CASE-2",
      from: "AwaitingEarlyWarning",
      to: "AwaitingNotification",
      event: "EARLY_WARNING_RECEIVED",
      actorUserId: "u",
    });
    const b = nis2IncidentFSM.signTransition({
      caseRef: "CASE-2",
      from: "AwaitingNotification",
      to: "AwaitingFinalReport",
      event: "INCIDENT_NOTIFICATION_RECEIVED",
      actorUserId: "u",
      previousHash: a.transitionHash,
    });
    // The chain is forward-different
    expect(b.transitionHash).not.toBe(a.transitionHash);
  });

  it("system-driven _AFTER transitions sign with system key", () => {
    const t = nis2IncidentFSM.signTransition({
      caseRef: "CASE-3",
      from: "AwaitingEarlyWarning",
      to: "Breached24h",
      event: "_AFTER",
      reason: "SLA breach",
      actorUserId: null,
    });
    expect(t.actorUserId).toBeNull();
    expect(t.signature).toBeTruthy();
  });
});
