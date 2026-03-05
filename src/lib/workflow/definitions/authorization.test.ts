import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), error: vi.fn() },
}));

import {
  authorizationWorkflowDefinition,
  getAuthorizationStatusInfo,
  AUTHORIZATION_STATE_ORDER,
  getAuthorizationProgress,
  isAuthorizationTerminal,
} from "./authorization";
import type { AuthorizationContext } from "../types";

// ─── Helper: minimal AuthorizationContext ───

const makeCtx = (
  overrides: Partial<AuthorizationContext> = {},
): AuthorizationContext => ({
  workflowId: "wf-1",
  userId: "user-1",
  operatorType: "SCO",
  primaryNCA: "BNETZA",
  totalDocuments: 0,
  readyDocuments: 0,
  mandatoryDocuments: 5,
  mandatoryReady: 0,
  completenessPercentage: 0,
  allMandatoryComplete: false,
  hasBlockers: false,
  pathway: "standard",
  ...overrides,
});

// ─── Workflow Definition structure ───

describe("authorizationWorkflowDefinition", () => {
  it("has id 'authorization'", () => {
    expect(authorizationWorkflowDefinition.id).toBe("authorization");
  });

  it("has initialState 'not_started'", () => {
    expect(authorizationWorkflowDefinition.initialState).toBe("not_started");
  });

  it("has all 8 expected states", () => {
    const stateNames = Object.keys(authorizationWorkflowDefinition.states);
    expect(stateNames).toEqual(
      expect.arrayContaining([
        "not_started",
        "in_progress",
        "ready_for_submission",
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "withdrawn",
      ]),
    );
    expect(stateNames).toHaveLength(8);
  });

  it("each state has name, description, metadata with color/icon/phase", () => {
    for (const [, state] of Object.entries(
      authorizationWorkflowDefinition.states,
    )) {
      expect(state.name).toBeDefined();
      expect(typeof state.name).toBe("string");
      expect(state.description).toBeDefined();
      expect(state.metadata).toBeDefined();
      expect(state.metadata!.color).toBeDefined();
      expect(state.metadata!.icon).toBeDefined();
      expect(state.metadata!.phase).toBeDefined();
    }
  });

  it("each state has a transitions record", () => {
    for (const [, state] of Object.entries(
      authorizationWorkflowDefinition.states,
    )) {
      expect(state.transitions).toBeDefined();
      expect(typeof state.transitions).toBe("object");
    }
  });

  it("not_started has start and manual_start transitions", () => {
    const transitions =
      authorizationWorkflowDefinition.states.not_started.transitions;
    expect(transitions.start).toBeDefined();
    expect(transitions.manual_start).toBeDefined();
    expect(transitions.start.to).toBe("in_progress");
    expect(transitions.manual_start.to).toBe("in_progress");
  });

  it("in_progress has complete and withdraw transitions", () => {
    const transitions =
      authorizationWorkflowDefinition.states.in_progress.transitions;
    expect(transitions.complete).toBeDefined();
    expect(transitions.complete.to).toBe("ready_for_submission");
    expect(transitions.withdraw).toBeDefined();
    expect(transitions.withdraw.to).toBe("withdrawn");
  });

  it("ready_for_submission has incomplete, submit, withdraw transitions", () => {
    const transitions =
      authorizationWorkflowDefinition.states.ready_for_submission.transitions;
    expect(transitions.incomplete).toBeDefined();
    expect(transitions.incomplete.to).toBe("in_progress");
    expect(transitions.submit).toBeDefined();
    expect(transitions.submit.to).toBe("submitted");
    expect(transitions.withdraw).toBeDefined();
    expect(transitions.withdraw.to).toBe("withdrawn");
  });

  it("terminal states have isTerminal metadata", () => {
    expect(
      authorizationWorkflowDefinition.states.approved.metadata!.isTerminal,
    ).toBe(true);
    expect(
      authorizationWorkflowDefinition.states.rejected.metadata!.isTerminal,
    ).toBe(true);
    expect(
      authorizationWorkflowDefinition.states.withdrawn.metadata!.isTerminal,
    ).toBe(true);
  });
});

// ─── getAuthorizationStatusInfo ───

describe("getAuthorizationStatusInfo", () => {
  it("returns correct info for 'not_started'", () => {
    const info = getAuthorizationStatusInfo("not_started");
    expect(info.label).toBe("Not Started");
    expect(info.color).toBe("#6B7280");
    expect(info.icon).toBe("Circle");
    expect(info.phase).toBe("pre_authorization");
  });

  it("returns correct info for 'in_progress'", () => {
    const info = getAuthorizationStatusInfo("in_progress");
    expect(info.label).toBe("In Progress");
    expect(info.color).toBe("#3B82F6");
    expect(info.icon).toBe("Clock");
    expect(info.phase).toBe("pre_authorization");
  });

  it("returns correct info for 'approved'", () => {
    const info = getAuthorizationStatusInfo("approved");
    expect(info.label).toBe("Approved");
    expect(info.color).toBe("#22C55E");
    expect(info.icon).toBe("CheckCircle2");
    expect(info.phase).toBe("authorized");
  });

  it("returns correct info for 'rejected'", () => {
    const info = getAuthorizationStatusInfo("rejected");
    expect(info.label).toBe("Rejected");
    expect(info.color).toBe("#EF4444");
    expect(info.icon).toBe("XCircle");
    expect(info.phase).toBe("closed");
  });

  it("returns correct info for 'withdrawn'", () => {
    const info = getAuthorizationStatusInfo("withdrawn");
    expect(info.label).toBe("Withdrawn");
    expect(info.phase).toBe("closed");
  });

  it("returns correct info for 'submitted'", () => {
    const info = getAuthorizationStatusInfo("submitted");
    expect(info.label).toBe("Submitted");
    expect(info.color).toBe("#8B5CF6");
    expect(info.icon).toBe("Send");
    expect(info.phase).toBe("under_review");
  });

  it("returns correct info for 'under_review'", () => {
    const info = getAuthorizationStatusInfo("under_review");
    expect(info.label).toBe("Under Review");
    expect(info.color).toBe("#F59E0B");
    expect(info.icon).toBe("Eye");
    expect(info.phase).toBe("under_review");
  });

  it("returns default info for unknown state", () => {
    const info = getAuthorizationStatusInfo("nonexistent_state");
    expect(info.label).toBe("nonexistent_state");
    expect(info.color).toBe("#6B7280");
    expect(info.icon).toBe("Circle");
    expect(info.phase).toBe("unknown");
  });
});

// ─── AUTHORIZATION_STATE_ORDER ───

describe("AUTHORIZATION_STATE_ORDER", () => {
  it("has 6 states in the correct order", () => {
    expect(AUTHORIZATION_STATE_ORDER).toEqual([
      "not_started",
      "in_progress",
      "ready_for_submission",
      "submitted",
      "under_review",
      "approved",
    ]);
  });
});

// ─── getAuthorizationProgress ───

describe("getAuthorizationProgress", () => {
  it.each([
    ["not_started", 0],
    ["in_progress", 20],
    ["ready_for_submission", 40],
    ["submitted", 60],
    ["under_review", 80],
    ["approved", 100],
  ] as const)("returns %i for '%s'", (state, expected) => {
    expect(getAuthorizationProgress(state)).toBe(expected);
  });

  it("returns 0 for unknown state", () => {
    expect(getAuthorizationProgress("unknown")).toBe(0);
  });

  it("returns 0 for 'rejected' (not in linear order)", () => {
    expect(getAuthorizationProgress("rejected")).toBe(0);
  });

  it("returns 0 for 'withdrawn' (not in linear order)", () => {
    expect(getAuthorizationProgress("withdrawn")).toBe(0);
  });
});

// ─── isAuthorizationTerminal ───

describe("isAuthorizationTerminal", () => {
  it("returns true for 'approved'", () => {
    expect(isAuthorizationTerminal("approved")).toBe(true);
  });

  it("returns true for 'rejected'", () => {
    expect(isAuthorizationTerminal("rejected")).toBe(true);
  });

  it("returns true for 'withdrawn'", () => {
    expect(isAuthorizationTerminal("withdrawn")).toBe(true);
  });

  it("returns false for 'in_progress'", () => {
    expect(isAuthorizationTerminal("in_progress")).toBe(false);
  });

  it("returns false for 'not_started'", () => {
    expect(isAuthorizationTerminal("not_started")).toBe(false);
  });

  it("returns false for 'submitted'", () => {
    expect(isAuthorizationTerminal("submitted")).toBe(false);
  });

  it("returns false for 'under_review'", () => {
    expect(isAuthorizationTerminal("under_review")).toBe(false);
  });

  it("returns false for 'ready_for_submission'", () => {
    expect(isAuthorizationTerminal("ready_for_submission")).toBe(false);
  });

  it("returns false for unknown state", () => {
    expect(isAuthorizationTerminal("nonexistent")).toBe(false);
  });
});

// ─── Auto-transition conditions ───

describe("auto-transition conditions", () => {
  describe("not_started → start", () => {
    const autoCondition =
      authorizationWorkflowDefinition.states.not_started.transitions.start
        .autoCondition!;

    it("returns true when totalDocuments > 0 && readyDocuments > 0", () => {
      expect(
        autoCondition(makeCtx({ totalDocuments: 3, readyDocuments: 1 })),
      ).toBe(true);
    });

    it("returns false when totalDocuments is 0", () => {
      expect(
        autoCondition(makeCtx({ totalDocuments: 0, readyDocuments: 0 })),
      ).toBe(false);
    });

    it("returns false when readyDocuments is 0", () => {
      expect(
        autoCondition(makeCtx({ totalDocuments: 5, readyDocuments: 0 })),
      ).toBe(false);
    });
  });

  describe("in_progress → complete", () => {
    const autoCondition =
      authorizationWorkflowDefinition.states.in_progress.transitions.complete
        .autoCondition!;

    it("returns true when all mandatory complete and no blockers", () => {
      expect(
        autoCondition(
          makeCtx({ allMandatoryComplete: true, hasBlockers: false }),
        ),
      ).toBe(true);
    });

    it("returns false when mandatory docs incomplete", () => {
      expect(
        autoCondition(
          makeCtx({ allMandatoryComplete: false, hasBlockers: false }),
        ),
      ).toBe(false);
    });

    it("returns false when there are blockers", () => {
      expect(
        autoCondition(
          makeCtx({ allMandatoryComplete: true, hasBlockers: true }),
        ),
      ).toBe(false);
    });
  });

  describe("ready_for_submission → incomplete", () => {
    const autoCondition =
      authorizationWorkflowDefinition.states.ready_for_submission.transitions
        .incomplete.autoCondition!;

    it("returns true when mandatory docs become incomplete", () => {
      expect(
        autoCondition(
          makeCtx({ allMandatoryComplete: false, hasBlockers: false }),
        ),
      ).toBe(true);
    });

    it("returns true when blockers are detected", () => {
      expect(
        autoCondition(
          makeCtx({ allMandatoryComplete: true, hasBlockers: true }),
        ),
      ).toBe(true);
    });

    it("returns false when all mandatory complete and no blockers", () => {
      expect(
        autoCondition(
          makeCtx({ allMandatoryComplete: true, hasBlockers: false }),
        ),
      ).toBe(false);
    });
  });
});

// ─── Hooks ───

describe("hooks", () => {
  it("beforeTransition logs debug message", async () => {
    const { logger } = await import("@/lib/logger");
    const hook = authorizationWorkflowDefinition.hooks!.beforeTransition!;
    const ctx = {
      ...makeCtx(),
      from: "not_started",
      to: "in_progress",
    };
    await hook(ctx);
    expect(logger.debug).toHaveBeenCalledWith(
      "[Authorization wf-1] Transition: not_started → in_progress",
    );
  });

  it("onError logs error message", async () => {
    const { logger } = await import("@/lib/logger");
    const hook = authorizationWorkflowDefinition.hooks!.onError!;
    const error = new Error("Something went wrong");
    await hook(error, makeCtx());
    expect(logger.error).toHaveBeenCalledWith(
      "[Authorization wf-1] Error:",
      "Something went wrong",
    );
  });

  it("afterTransition exists and runs without error", async () => {
    const hook = authorizationWorkflowDefinition.hooks!.afterTransition!;
    const ctx = { ...makeCtx(), from: "not_started", to: "in_progress" };
    await expect(hook(ctx)).resolves.toBeUndefined();
  });
});

// ─── Guard on submit transition ───

describe("ready_for_submission submit guard", () => {
  const guard =
    authorizationWorkflowDefinition.states.ready_for_submission.transitions
      .submit.guard!;

  it("allows when all mandatory complete and no blockers", async () => {
    const result = await guard(
      makeCtx({ allMandatoryComplete: true, hasBlockers: false }),
    );
    expect(result).toBe(true);
  });

  it("rejects when mandatory docs incomplete", async () => {
    const result = await guard(
      makeCtx({ allMandatoryComplete: false, hasBlockers: false }),
    );
    expect(result).toBe(false);
  });

  it("rejects when there are blockers", async () => {
    const result = await guard(
      makeCtx({ allMandatoryComplete: true, hasBlockers: true }),
    );
    expect(result).toBe(false);
  });
});
