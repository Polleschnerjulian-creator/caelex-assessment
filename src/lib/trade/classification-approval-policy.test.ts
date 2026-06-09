/**
 * Tests for src/lib/trade/classification-approval-policy.ts — T-M18.
 *
 * Pure-logic coverage of the author≠approver gate. No mocks needed.
 */

import { describe, it, expect } from "vitest";

import {
  evaluateApprovalEligibility,
  type ApprovalPolicyInput,
} from "./classification-approval-policy";

function input(overrides: Partial<ApprovalPolicyInput>): ApprovalPolicyInput {
  return {
    decision: "ACCEPTED",
    fourEyesEnabled: true,
    authorUserId: "author-1",
    actingUserId: "approver-2",
    ...overrides,
  };
}

describe("evaluateApprovalEligibility — four-eyes ON (default, moderate)", () => {
  it("BLOCKS self-approval when the acting user authored the draft (ACCEPTED)", () => {
    const r = evaluateApprovalEligibility(
      input({ authorUserId: "u-1", actingUserId: "u-1", decision: "ACCEPTED" }),
    );
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("SELF_APPROVAL_BLOCKED");
    expect(r.message).toMatch(/Vier-Augen/);
  });

  it("BLOCKS self-approval on MODIFIED too (an edit still advances a code)", () => {
    const r = evaluateApprovalEligibility(
      input({ authorUserId: "u-1", actingUserId: "u-1", decision: "MODIFIED" }),
    );
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("SELF_APPROVAL_BLOCKED");
  });

  it("surfaces SECOND_APPROVER_REQUIRED when the author is the org's sole eligible approver", () => {
    const r = evaluateApprovalEligibility(
      input({
        authorUserId: "u-1",
        actingUserId: "u-1",
        decision: "ACCEPTED",
        soleEligibleApprover: true,
      }),
    );
    expect(r.allowed).toBe(false);
    // The more specific reason wins so the UI can say "add a teammate".
    expect(r.reason).toBe("SECOND_APPROVER_REQUIRED");
  });

  it("does NOT auto-allow self-approval just because the user is alone", () => {
    // The whole point: a lone user must NOT be able to self-sign — they
    // must add a second reviewer. allowed stays false.
    const r = evaluateApprovalEligibility(
      input({
        authorUserId: "solo",
        actingUserId: "solo",
        decision: "ACCEPTED",
        soleEligibleApprover: true,
      }),
    );
    expect(r.allowed).toBe(false);
  });

  it("ALLOWS approval by a different human than the author", () => {
    const r = evaluateApprovalEligibility(
      input({ authorUserId: "author-1", actingUserId: "approver-2" }),
    );
    expect(r.allowed).toBe(true);
    expect(r.reason).toBeNull();
  });

  it("ALLOWS the author to REJECT their own draft (lowers exposure)", () => {
    const r = evaluateApprovalEligibility(
      input({ authorUserId: "u-1", actingUserId: "u-1", decision: "REJECTED" }),
    );
    expect(r.allowed).toBe(true);
    expect(r.reason).toBeNull();
  });
});

describe("evaluateApprovalEligibility — four-eyes OFF (org opted out)", () => {
  it("ALLOWS self-approval when four-eyes is disabled", () => {
    const r = evaluateApprovalEligibility(
      input({
        fourEyesEnabled: false,
        authorUserId: "u-1",
        actingUserId: "u-1",
        decision: "ACCEPTED",
      }),
    );
    expect(r.allowed).toBe(true);
    expect(r.reason).toBeNull();
  });
});
