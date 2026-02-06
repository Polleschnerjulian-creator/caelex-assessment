import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  WorkflowEngine,
  createWorkflowEngine,
  createTransition,
  createAutoTransition,
} from "@/lib/workflow/engine";
import type { WorkflowDefinition } from "@/lib/workflow/types";

interface TestContext {
  documentsComplete: boolean;
  isApproved: boolean;
  userId: string;
}

const createTestDefinition = (): WorkflowDefinition<TestContext> => ({
  id: "test-workflow",
  name: "Test Workflow",
  version: "1.0",
  initialState: "draft",
  states: {
    draft: {
      transitions: {
        submit: {
          to: "pending_review",
          description: "Submit for review",
        },
        archive: {
          to: "archived",
          description: "Archive draft",
        },
      },
      metadata: {
        label: "Draft",
      },
    },
    pending_review: {
      transitions: {
        approve: {
          to: "approved",
          description: "Approve the workflow",
          guard: async (ctx) => ctx.documentsComplete,
        },
        reject: {
          to: "rejected",
          description: "Reject the workflow",
        },
        auto_approve: {
          to: "approved",
          auto: true,
          autoCondition: (ctx) => ctx.isApproved && ctx.documentsComplete,
          description: "Auto-approve when conditions are met",
        },
      },
      metadata: {
        label: "Pending Review",
      },
    },
    approved: {
      transitions: {},
      metadata: {
        label: "Approved",
        isTerminal: true,
      },
    },
    rejected: {
      transitions: {
        resubmit: {
          to: "pending_review",
          description: "Resubmit for review",
        },
      },
      metadata: {
        label: "Rejected",
      },
    },
    archived: {
      transitions: {},
      metadata: {
        label: "Archived",
        isTerminal: true,
      },
    },
  },
});

describe("WorkflowEngine", () => {
  let definition: WorkflowDefinition<TestContext>;
  let engine: WorkflowEngine<TestContext>;
  let context: TestContext;

  beforeEach(() => {
    definition = createTestDefinition();
    engine = new WorkflowEngine(definition);
    context = {
      documentsComplete: false,
      isApproved: false,
      userId: "user-1",
    };
  });

  describe("constructor", () => {
    it("should create engine with valid definition", () => {
      expect(engine).toBeInstanceOf(WorkflowEngine);
    });

    it("should throw for invalid initial state", () => {
      const invalidDef = {
        ...definition,
        initialState: "nonexistent",
      };
      expect(() => new WorkflowEngine(invalidDef)).toThrow(
        'Invalid workflow definition: initial state "nonexistent" not found in states',
      );
    });

    it("should throw for invalid transition target", () => {
      const invalidDef: WorkflowDefinition<TestContext> = {
        ...definition,
        states: {
          draft: {
            transitions: {
              submit: {
                to: "nonexistent",
                description: "Submit",
              },
            },
          },
        },
      };
      expect(() => new WorkflowEngine(invalidDef)).toThrow(
        /targets unknown state/,
      );
    });

    it("should accept custom options", () => {
      const engineWithOptions = new WorkflowEngine(definition, {
        debug: true,
        maxAutoTransitions: 5,
      });
      expect(engineWithOptions).toBeInstanceOf(WorkflowEngine);
    });
  });

  describe("getDefinition", () => {
    it("should return the workflow definition", () => {
      expect(engine.getDefinition()).toEqual(definition);
    });
  });

  describe("getState", () => {
    it("should return state definition for valid state", () => {
      const state = engine.getState("draft");
      expect(state).toBeDefined();
      expect(state?.metadata?.label).toBe("Draft");
    });

    it("should return undefined for invalid state", () => {
      const state = engine.getState("nonexistent");
      expect(state).toBeUndefined();
    });
  });

  describe("getAvailableTransitions", () => {
    it("should return available transitions for a state", () => {
      const transitions = engine.getAvailableTransitions("draft", context);
      expect(transitions).toHaveLength(2);
      expect(transitions.map((t) => t.event)).toContain("submit");
      expect(transitions.map((t) => t.event)).toContain("archive");
    });

    it("should return empty array for invalid state", () => {
      const transitions = engine.getAvailableTransitions(
        "nonexistent",
        context,
      );
      expect(transitions).toHaveLength(0);
    });

    it("should include auto flag and condition status", () => {
      const transitions = engine.getAvailableTransitions(
        "pending_review",
        context,
      );
      const autoTransition = transitions.find(
        (t) => t.event === "auto_approve",
      );
      expect(autoTransition?.auto).toBe(true);
      expect(autoTransition?.conditionMet).toBe(false);
    });

    it("should report condition as met when true", () => {
      context.isApproved = true;
      context.documentsComplete = true;
      const transitions = engine.getAvailableTransitions(
        "pending_review",
        context,
      );
      const autoTransition = transitions.find(
        (t) => t.event === "auto_approve",
      );
      expect(autoTransition?.conditionMet).toBe(true);
    });
  });

  describe("canTransition", () => {
    it("should return true for valid transition without guard", async () => {
      const canTransition = await engine.canTransition(
        "draft",
        "submit",
        context,
      );
      expect(canTransition).toBe(true);
    });

    it("should return false for invalid state", async () => {
      const canTransition = await engine.canTransition(
        "nonexistent",
        "submit",
        context,
      );
      expect(canTransition).toBe(false);
    });

    it("should return false for invalid event", async () => {
      const canTransition = await engine.canTransition(
        "draft",
        "nonexistent",
        context,
      );
      expect(canTransition).toBe(false);
    });

    it("should return false when guard rejects", async () => {
      context.documentsComplete = false;
      const canTransition = await engine.canTransition(
        "pending_review",
        "approve",
        context,
      );
      expect(canTransition).toBe(false);
    });

    it("should return true when guard passes", async () => {
      context.documentsComplete = true;
      const canTransition = await engine.canTransition(
        "pending_review",
        "approve",
        context,
      );
      expect(canTransition).toBe(true);
    });
  });

  describe("executeTransition", () => {
    it("should execute valid transition", async () => {
      const result = await engine.executeTransition("draft", "submit", context);
      expect(result.success).toBe(true);
      expect(result.previousState).toBe("draft");
      expect(result.currentState).toBe("pending_review");
      expect(result.transitionEvent).toBe("submit");
    });

    it("should fail for invalid state", async () => {
      const result = await engine.executeTransition(
        "nonexistent",
        "submit",
        context,
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found in workflow");
    });

    it("should fail for invalid event", async () => {
      const result = await engine.executeTransition(
        "draft",
        "nonexistent",
        context,
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found in state");
    });

    it("should fail when guard rejects", async () => {
      context.documentsComplete = false;
      const result = await engine.executeTransition(
        "pending_review",
        "approve",
        context,
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain("guard rejected");
    });

    it("should succeed when guard passes", async () => {
      context.documentsComplete = true;
      const result = await engine.executeTransition(
        "pending_review",
        "approve",
        context,
      );
      expect(result.success).toBe(true);
      expect(result.currentState).toBe("approved");
    });

    it("should include timestamp", async () => {
      const result = await engine.executeTransition("draft", "submit", context);
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe("evaluateTransitions", () => {
    it("should not transition when conditions not met", async () => {
      const result = await engine.evaluateTransitions(
        "pending_review",
        context,
      );
      expect(result.transitioned).toBe(false);
      expect(result.finalState).toBe("pending_review");
    });

    it("should auto-transition when conditions met", async () => {
      context.isApproved = true;
      context.documentsComplete = true;
      const result = await engine.evaluateTransitions(
        "pending_review",
        context,
      );
      expect(result.transitioned).toBe(true);
      expect(result.finalState).toBe("approved");
      expect(result.transitions).toHaveLength(1);
    });

    it("should handle state without auto-transitions", async () => {
      const result = await engine.evaluateTransitions("draft", context);
      expect(result.transitioned).toBe(false);
      expect(result.finalState).toBe("draft");
    });

    it("should return empty transitions array when none occur", async () => {
      const result = await engine.evaluateTransitions("draft", context);
      expect(result.transitions).toHaveLength(0);
    });
  });

  describe("getNextStates", () => {
    it("should return possible next states", () => {
      const nextStates = engine.getNextStates("draft");
      expect(nextStates).toContain("pending_review");
      expect(nextStates).toContain("archived");
    });

    it("should return empty array for terminal state", () => {
      const nextStates = engine.getNextStates("approved");
      expect(nextStates).toHaveLength(0);
    });

    it("should return empty array for invalid state", () => {
      const nextStates = engine.getNextStates("nonexistent");
      expect(nextStates).toHaveLength(0);
    });
  });

  describe("isTerminalState", () => {
    it("should return true for terminal state", () => {
      expect(engine.isTerminalState("approved")).toBe(true);
      expect(engine.isTerminalState("archived")).toBe(true);
    });

    it("should return false for non-terminal state", () => {
      expect(engine.isTerminalState("draft")).toBe(false);
      expect(engine.isTerminalState("pending_review")).toBe(false);
    });

    it("should return true for invalid state", () => {
      expect(engine.isTerminalState("nonexistent")).toBe(true);
    });
  });

  describe("getAllStates", () => {
    it("should return all state names", () => {
      const states = engine.getAllStates();
      expect(states).toContain("draft");
      expect(states).toContain("pending_review");
      expect(states).toContain("approved");
      expect(states).toContain("rejected");
      expect(states).toContain("archived");
      expect(states).toHaveLength(5);
    });
  });

  describe("getTerminalStates", () => {
    it("should return only terminal states", () => {
      const terminalStates = engine.getTerminalStates();
      expect(terminalStates).toContain("approved");
      expect(terminalStates).toContain("archived");
      expect(terminalStates).not.toContain("draft");
      expect(terminalStates).not.toContain("pending_review");
    });
  });
});

describe("createWorkflowEngine", () => {
  it("should create a WorkflowEngine instance", () => {
    const definition = createTestDefinition();
    const engine = createWorkflowEngine(definition);
    expect(engine).toBeInstanceOf(WorkflowEngine);
  });

  it("should accept options", () => {
    const definition = createTestDefinition();
    const engine = createWorkflowEngine(definition, { debug: true });
    expect(engine).toBeInstanceOf(WorkflowEngine);
  });
});

describe("createTransition", () => {
  it("should create a basic transition", () => {
    const transition = createTransition("target");
    expect(transition.to).toBe("target");
    expect(transition.auto).toBeUndefined();
  });

  it("should include additional options", () => {
    const transition = createTransition("target", {
      description: "Test transition",
    });
    expect(transition.to).toBe("target");
    expect(transition.description).toBe("Test transition");
  });
});

describe("createAutoTransition", () => {
  it("should create an auto transition", () => {
    const condition = (ctx: { ready: boolean }) => ctx.ready;
    const transition = createAutoTransition("target", condition);
    expect(transition.to).toBe("target");
    expect(transition.auto).toBe(true);
    expect(transition.autoCondition).toBe(condition);
  });

  it("should include additional options", () => {
    const condition = (ctx: { ready: boolean }) => ctx.ready;
    const transition = createAutoTransition("target", condition, {
      description: "Auto transition",
    });
    expect(transition.description).toBe("Auto transition");
  });
});

describe("WorkflowEngine with hooks", () => {
  it("should call beforeTransition hook", async () => {
    const beforeTransition = vi.fn();
    const definition: WorkflowDefinition<TestContext> = {
      ...createTestDefinition(),
      hooks: {
        beforeTransition,
      },
    };
    const engine = new WorkflowEngine(definition);
    const context: TestContext = {
      documentsComplete: false,
      isApproved: false,
      userId: "user-1",
    };

    await engine.executeTransition("draft", "submit", context);
    expect(beforeTransition).toHaveBeenCalled();
  });

  it("should call afterTransition hook", async () => {
    const afterTransition = vi.fn();
    const definition: WorkflowDefinition<TestContext> = {
      ...createTestDefinition(),
      hooks: {
        afterTransition,
      },
    };
    const engine = new WorkflowEngine(definition);
    const context: TestContext = {
      documentsComplete: false,
      isApproved: false,
      userId: "user-1",
    };

    await engine.executeTransition("draft", "submit", context);
    expect(afterTransition).toHaveBeenCalled();
  });

  it("should call onError hook on failure", async () => {
    const onError = vi.fn();
    const definition: WorkflowDefinition<TestContext> = {
      id: "test",
      name: "Test",
      version: "1.0",
      initialState: "draft",
      states: {
        draft: {
          transitions: {
            submit: {
              to: "pending",
              onTransition: async () => {
                throw new Error("Test error");
              },
            },
          },
        },
        pending: {
          transitions: {},
        },
      },
      hooks: {
        onError,
      },
    };
    const engine = new WorkflowEngine(definition);
    const context: TestContext = {
      documentsComplete: false,
      isApproved: false,
      userId: "user-1",
    };

    const result = await engine.executeTransition("draft", "submit", context);
    expect(result.success).toBe(false);
    expect(onError).toHaveBeenCalled();
  });
});

describe("WorkflowEngine with state hooks", () => {
  it("should call onExit when leaving state", async () => {
    const onExit = vi.fn();
    const definition: WorkflowDefinition<TestContext> = {
      id: "test",
      name: "Test",
      version: "1.0",
      initialState: "draft",
      states: {
        draft: {
          onExit,
          transitions: {
            submit: {
              to: "pending",
            },
          },
        },
        pending: {
          transitions: {},
        },
      },
    };
    const engine = new WorkflowEngine(definition);
    const context: TestContext = {
      documentsComplete: false,
      isApproved: false,
      userId: "user-1",
    };

    await engine.executeTransition("draft", "submit", context);
    expect(onExit).toHaveBeenCalledWith(context);
  });

  it("should call onEnter when entering state", async () => {
    const onEnter = vi.fn();
    const definition: WorkflowDefinition<TestContext> = {
      id: "test",
      name: "Test",
      version: "1.0",
      initialState: "draft",
      states: {
        draft: {
          transitions: {
            submit: {
              to: "pending",
            },
          },
        },
        pending: {
          onEnter,
          transitions: {},
        },
      },
    };
    const engine = new WorkflowEngine(definition);
    const context: TestContext = {
      documentsComplete: false,
      isApproved: false,
      userId: "user-1",
    };

    await engine.executeTransition("draft", "submit", context);
    expect(onEnter).toHaveBeenCalledWith(context);
  });
});
