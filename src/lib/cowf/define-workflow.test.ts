/**
 * defineWorkflow + state-graph validator tests.
 *
 * Coverage:
 *
 *   1. Happy path — valid workflow returns DefineWorkflowInput shape
 *   2. Validates name + version
 *   3. Validates initialState ∈ states
 *   4. Validates step.from ∈ states
 *   5. Validates step.to ∈ states
 *   6. Validates decision branch step keys exist
 *   7. Validates decision branch.to ∈ states
 *   8. Validates waitForEvent.onTimeout points to a real step key
 *   9. Validates at least one step exits initialState
 *  10. Concrete workflow: W3 (Continuous Compliance Heartbeat) loads + validates
 */

import { describe, it, expect, vi } from "vitest";
import { defineWorkflow, WorkflowDefinitionError } from "./define-workflow";
import { step } from "./steps";

// ─── Happy path ────────────────────────────────────────────────────────────

describe("defineWorkflow — happy path", () => {
  it("returns a WorkflowDef with storedInput, handlers map, and meta", () => {
    const def = defineWorkflow({
      name: "test",
      version: 1,
      description: "A test workflow",
      states: ["A", "B"],
      initialState: "A",
      steps: {
        "go-to-b": step.action({
          key: "go-to-b",
          from: "A",
          to: "B",
          run: vi.fn(),
        }),
      },
    });
    expect(def.storedInput.name).toBe("test");
    expect(def.storedInput.version).toBe(1);
    expect(def.storedInput.states).toEqual(["A", "B"]);
    expect(def.storedInput.steps).toHaveLength(1);
    expect(def.handlers.size).toBe(1);
    expect(def.meta.initialState).toBe("A");
    expect(def.meta.stepKeys).toEqual(["go-to-b"]);
  });

  it("uses the map-key as canonical (overwriting factory key on mismatch)", () => {
    const def = defineWorkflow({
      name: "test",
      version: 1,
      description: "x",
      states: ["A", "B"],
      initialState: "A",
      steps: {
        "actual-key": step.action({
          // factory's internal key is different — defineWorkflow normalises
          key: "stale-key",
          from: "A",
          to: "B",
          run: vi.fn(),
        }),
      },
    });
    expect(def.storedInput.steps[0].key).toBe("actual-key");
  });
});

// ─── Validation failures ───────────────────────────────────────────────────

describe("defineWorkflow — validation", () => {
  it("rejects empty name", () => {
    expect(() =>
      defineWorkflow({
        name: "",
        version: 1,
        description: "x",
        states: ["A"],
        initialState: "A",
        steps: {},
      }),
    ).toThrow(WorkflowDefinitionError);
  });

  it("rejects non-positive version", () => {
    expect(() =>
      defineWorkflow({
        name: "x",
        version: 0,
        description: "x",
        states: ["A"],
        initialState: "A",
        steps: {},
      }),
    ).toThrow(WorkflowDefinitionError);
  });

  it("rejects empty states", () => {
    expect(() =>
      defineWorkflow({
        name: "x",
        version: 1,
        description: "x",
        states: [],
        initialState: "A",
        steps: {},
      }),
    ).toThrow(WorkflowDefinitionError);
  });

  it("rejects initialState not in states", () => {
    expect(() =>
      defineWorkflow({
        name: "x",
        version: 1,
        description: "x",
        states: ["A", "B"],
        initialState: "Z",
        steps: {
          go: step.action({
            key: "go",
            from: "A",
            to: "B",
            run: vi.fn(),
          }),
        },
      }),
    ).toThrow(/initialState/);
  });

  it("rejects step.from not in states", () => {
    expect(() =>
      defineWorkflow({
        name: "x",
        version: 1,
        description: "x",
        states: ["A", "B"],
        initialState: "A",
        steps: {
          go: step.action({
            key: "go",
            from: "GHOST",
            to: "B",
            run: vi.fn(),
          }),
        },
      }),
    ).toThrow(/from "GHOST"/);
  });

  it("rejects step.to not in states", () => {
    expect(() =>
      defineWorkflow({
        name: "x",
        version: 1,
        description: "x",
        states: ["A", "B"],
        initialState: "A",
        steps: {
          go: step.action({
            key: "go",
            from: "A",
            to: "GHOST",
            run: vi.fn(),
          }),
        },
      }),
    ).toThrow(/to "GHOST"/);
  });

  it("rejects decision branch pointing to non-existent step", () => {
    expect(() =>
      defineWorkflow({
        name: "x",
        version: 1,
        description: "x",
        states: ["A", "B", "C"],
        initialState: "A",
        steps: {
          decide: step.decision({
            key: "decide",
            from: "A",
            to: "B",
            branches: [
              {
                predicate: { x: 1 },
                step: "ghost-step",
                to: "C",
              },
            ],
          }),
        },
      }),
    ).toThrow(/non-existent step "ghost-step"/);
  });

  it("rejects decision branch.to not in states", () => {
    expect(() =>
      defineWorkflow({
        name: "x",
        version: 1,
        description: "x",
        states: ["A", "B"],
        initialState: "A",
        steps: {
          decide: step.decision({
            key: "decide",
            from: "A",
            to: "B",
            branches: [
              {
                predicate: { x: 1 },
                step: "decide", // self-reference is valid as a step ref
                to: "GHOST",
              },
            ],
          }),
        },
      }),
    ).toThrow(/branch.to "GHOST"/);
  });

  it("rejects waitForEvent.onTimeout pointing to non-existent step", () => {
    expect(() =>
      defineWorkflow({
        name: "x",
        version: 1,
        description: "x",
        states: ["A", "B"],
        initialState: "A",
        steps: {
          wait: step.waitForEvent({
            key: "wait",
            from: "A",
            to: "B",
            eventType: "x.y",
            onTimeout: "ghost-step",
          }),
        },
      }),
    ).toThrow(/onTimeout "ghost-step"/);
  });

  it("rejects workflow with no step exiting initialState", () => {
    expect(() =>
      defineWorkflow({
        name: "x",
        version: 1,
        description: "x",
        states: ["A", "B", "C"],
        initialState: "A",
        steps: {
          // Step exists but exits B, not A
          go: step.action({
            key: "go",
            from: "B",
            to: "C",
            run: vi.fn(),
          }),
        },
      }),
    ).toThrow(/no step transitions out of initialState/);
  });

  it("aggregates multiple issues into a single thrown error", () => {
    try {
      defineWorkflow({
        name: "",
        version: 0,
        description: "x",
        states: [],
        initialState: "A",
        steps: {},
      });
      expect.fail("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(WorkflowDefinitionError);
      expect((err as WorkflowDefinitionError).issues.length).toBeGreaterThan(1);
    }
  });
});

// ─── Concrete workflow: W3 — Continuous Compliance Heartbeat ───────────────

describe("W3 — Continuous Compliance Heartbeat", () => {
  it("loads + validates without throwing", async () => {
    const { continuousHeartbeatWorkflow, W3_NAME, W3_VERSION } =
      await import("./workflows/continuous-heartbeat");
    expect(continuousHeartbeatWorkflow.meta.name).toBe(W3_NAME);
    expect(continuousHeartbeatWorkflow.meta.version).toBe(W3_VERSION);
    expect(continuousHeartbeatWorkflow.meta.initialState).toBe("SCANNING");
    expect(continuousHeartbeatWorkflow.meta.states).toContain("CLOSED");
  });

  it("has all 7 steps that the COWF spec describes", async () => {
    const { continuousHeartbeatWorkflow } =
      await import("./workflows/continuous-heartbeat");
    const expectedKeys = [
      "compute-snapshot",
      "diff-against-prior",
      "drift-decision",
      "close-no-change",
      "astra-reason-about-drift",
      "generate-proposals",
      "close-with-drift",
    ];
    for (const k of expectedKeys) {
      expect(continuousHeartbeatWorkflow.meta.stepKeys).toContain(k);
    }
  });

  it("uses an astra step for the drift-explanation phase", async () => {
    const { continuousHeartbeatWorkflow } =
      await import("./workflows/continuous-heartbeat");
    const astraStep = continuousHeartbeatWorkflow.storedInput.steps.find(
      (s) => s.key === "astra-reason-about-drift",
    );
    expect(astraStep?.kind).toBe("astra");
  });

  it("uses a decision step to branch on drift detection", async () => {
    const { continuousHeartbeatWorkflow } =
      await import("./workflows/continuous-heartbeat");
    const decisionStep = continuousHeartbeatWorkflow.storedInput.steps.find(
      (s) => s.key === "drift-decision",
    );
    expect(decisionStep?.kind).toBe("decision");
  });

  it("storedInput is JSON-serialisable (round-trip safe)", async () => {
    const { continuousHeartbeatWorkflow } =
      await import("./workflows/continuous-heartbeat");
    const json = JSON.stringify(continuousHeartbeatWorkflow.storedInput);
    const parsed = JSON.parse(json);
    expect(parsed.name).toBe(continuousHeartbeatWorkflow.storedInput.name);
    expect(parsed.steps).toHaveLength(
      continuousHeartbeatWorkflow.storedInput.steps.length,
    );
  });
});
