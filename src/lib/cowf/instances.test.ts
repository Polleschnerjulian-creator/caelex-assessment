/**
 * COWF Instances — definition + instance CRUD tests.
 *
 * Coverage:
 *
 *   1. registerWorkflowDef idempotence — same (name, version) returns existing
 *   2. findWorkflowDef — by name+version, by name (latest)
 *   3. startWorkflow — creates instance + emits initial STATE_TRANSITION event
 *   4. startWorkflow — rejects unknown defId
 *   5. startWorkflow — rejects initialState not in def.states
 *   6. startWorkflow — rolls back instance row when event-append throws
 *   7. advanceState — appends event AND updates currentState column
 *   8. completeWorkflow — sets completedAt + appends COMPLETED event
 *   9. pauseWorkflow — sets pausedUntil + appends PAUSED event
 *  10. loadInstance — returns null for missing, summary for existing
 *  11. listActiveInstances — filters out completed + archived
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockOperatorWorkflowDef,
  mockOperatorWorkflowInstance,
  mockAppendWorkflowEvent,
} = vi.hoisted(() => ({
  mockOperatorWorkflowDef: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  mockOperatorWorkflowInstance: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  mockAppendWorkflowEvent: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    operatorWorkflowDef: mockOperatorWorkflowDef,
    operatorWorkflowInstance: mockOperatorWorkflowInstance,
  },
}));

vi.mock("./events.server", () => ({
  appendWorkflowEvent: mockAppendWorkflowEvent,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import {
  advanceState,
  completeWorkflow,
  findWorkflowDef,
  listActiveInstances,
  loadInstance,
  pauseWorkflow,
  registerWorkflowDef,
  startWorkflow,
} from "./instances.server";
import { WorkflowEventType } from "./types";

const ORG_ID = "org_1";
const USER_ID = "user_1";

beforeEach(() => {
  vi.clearAllMocks();
  mockAppendWorkflowEvent.mockResolvedValue({
    id: "evt_1",
    sequence: 0,
    prevHash: "GENESIS_x",
    entryHash: "a".repeat(64),
    occurredAt: new Date(),
  });
});

// ─── registerWorkflowDef ───────────────────────────────────────────────────

describe("registerWorkflowDef", () => {
  it("creates a new def when (name, version) does not exist", async () => {
    mockOperatorWorkflowDef.findUnique.mockResolvedValue(null);
    mockOperatorWorkflowDef.create.mockResolvedValue({ id: "def_1" });
    const result = await registerWorkflowDef({
      name: "test",
      version: 1,
      description: "x",
      states: ["A", "B"],
      steps: [],
    });
    expect(result.created).toBe(true);
    expect(result.id).toBe("def_1");
    expect(mockOperatorWorkflowDef.create).toHaveBeenCalledTimes(1);
  });

  it("returns existing def when (name, version) already exists", async () => {
    mockOperatorWorkflowDef.findUnique.mockResolvedValue({ id: "def_old" });
    const result = await registerWorkflowDef({
      name: "test",
      version: 1,
      description: "x",
      states: ["A"],
      steps: [],
    });
    expect(result.created).toBe(false);
    expect(result.id).toBe("def_old");
    expect(mockOperatorWorkflowDef.create).not.toHaveBeenCalled();
  });
});

// ─── findWorkflowDef ───────────────────────────────────────────────────────

describe("findWorkflowDef", () => {
  it("returns def by name+version", async () => {
    mockOperatorWorkflowDef.findUnique.mockResolvedValue({
      id: "def_1",
      version: 1,
      states: ["A", "B"],
    });
    const result = await findWorkflowDef("test", 1);
    expect(result).toEqual({ id: "def_1", version: 1, states: ["A", "B"] });
  });

  it("returns latest version when version omitted", async () => {
    mockOperatorWorkflowDef.findFirst.mockResolvedValue({
      id: "def_3",
      version: 3,
      states: ["A"],
    });
    const result = await findWorkflowDef("test");
    expect(result?.version).toBe(3);
    expect(mockOperatorWorkflowDef.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { version: "desc" } }),
    );
  });

  it("returns null when name not found", async () => {
    mockOperatorWorkflowDef.findFirst.mockResolvedValue(null);
    expect(await findWorkflowDef("missing")).toBeNull();
  });
});

// ─── startWorkflow ─────────────────────────────────────────────────────────

describe("startWorkflow", () => {
  it("creates instance + emits initial STATE_TRANSITION event", async () => {
    mockOperatorWorkflowDef.findUnique.mockResolvedValue({
      id: "def_1",
      states: ["DRAFT", "DONE"],
      name: "test",
      version: 1,
    });
    mockOperatorWorkflowInstance.create.mockResolvedValue({ id: "inst_1" });

    const result = await startWorkflow({
      defId: "def_1",
      userId: USER_ID,
      organizationId: ORG_ID,
      initialState: "DRAFT",
    });

    expect(result.instanceId).toBe("inst_1");
    expect(mockAppendWorkflowEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: "inst_1",
        eventType: WorkflowEventType.STATE_TRANSITION,
        causedBy: `user:${USER_ID}`,
        resultingState: "DRAFT",
      }),
    );
  });

  it("rejects unknown defId", async () => {
    mockOperatorWorkflowDef.findUnique.mockResolvedValue(null);
    await expect(
      startWorkflow({
        defId: "missing",
        userId: USER_ID,
        organizationId: ORG_ID,
        initialState: "DRAFT",
      }),
    ).rejects.toThrow(/not found/);
  });

  it("rejects initialState not in def.states", async () => {
    mockOperatorWorkflowDef.findUnique.mockResolvedValue({
      id: "def_1",
      states: ["DRAFT", "DONE"],
      name: "test",
      version: 1,
    });
    await expect(
      startWorkflow({
        defId: "def_1",
        userId: USER_ID,
        organizationId: ORG_ID,
        initialState: "BAD_STATE",
      }),
    ).rejects.toThrow(/initialState/);
  });

  it("rolls back instance row when event-append throws", async () => {
    mockOperatorWorkflowDef.findUnique.mockResolvedValue({
      id: "def_1",
      states: ["DRAFT"],
      name: "test",
      version: 1,
    });
    mockOperatorWorkflowInstance.create.mockResolvedValue({ id: "inst_2" });
    mockAppendWorkflowEvent.mockRejectedValueOnce(
      new Error("hash chain failed"),
    );
    mockOperatorWorkflowInstance.delete.mockResolvedValue({ id: "inst_2" });

    await expect(
      startWorkflow({
        defId: "def_1",
        userId: USER_ID,
        organizationId: ORG_ID,
        initialState: "DRAFT",
      }),
    ).rejects.toThrow(/hash chain/);

    // Roll-back delete was called
    expect(mockOperatorWorkflowInstance.delete).toHaveBeenCalledWith({
      where: { id: "inst_2" },
    });
  });

  it("attaches subject info to instance + event payload", async () => {
    mockOperatorWorkflowDef.findUnique.mockResolvedValue({
      id: "def_1",
      states: ["DRAFT"],
      name: "test",
      version: 1,
    });
    mockOperatorWorkflowInstance.create.mockResolvedValue({ id: "inst_3" });

    await startWorkflow({
      defId: "def_1",
      userId: USER_ID,
      organizationId: ORG_ID,
      initialState: "DRAFT",
      subject: { type: "Spacecraft", id: "sc_42" },
    });

    expect(mockOperatorWorkflowInstance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subjectType: "Spacecraft",
          subjectId: "sc_42",
        }),
      }),
    );
    expect(mockAppendWorkflowEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          subject: { type: "Spacecraft", id: "sc_42" },
        }),
      }),
    );
  });
});

// ─── advanceState ──────────────────────────────────────────────────────────

describe("advanceState", () => {
  it("appends event THEN updates currentState column", async () => {
    mockOperatorWorkflowInstance.update.mockResolvedValue({
      id: "inst_1",
      currentState: "DONE",
    });

    const callOrder: string[] = [];
    mockAppendWorkflowEvent.mockImplementation(async () => {
      callOrder.push("append");
      return {
        id: "evt_2",
        sequence: 1,
        prevHash: "x",
        entryHash: "y",
        occurredAt: new Date(),
      };
    });
    mockOperatorWorkflowInstance.update.mockImplementation(async () => {
      callOrder.push("update");
      return { id: "inst_1", currentState: "DONE" };
    });

    await advanceState({
      workflowId: "inst_1",
      toState: "DONE",
      causedBy: "user:u1",
    });

    expect(callOrder).toEqual(["append", "update"]);
  });
});

// ─── completeWorkflow ──────────────────────────────────────────────────────

describe("completeWorkflow", () => {
  it("emits COMPLETED event + sets completedAt", async () => {
    mockOperatorWorkflowInstance.update.mockResolvedValue({});
    await completeWorkflow({
      workflowId: "inst_1",
      causedBy: "user:u1",
      finalState: "CLOSED",
    });
    expect(mockAppendWorkflowEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: WorkflowEventType.COMPLETED,
        resultingState: "CLOSED",
      }),
    );
    expect(mockOperatorWorkflowInstance.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          completedAt: expect.any(Date),
          currentState: "CLOSED",
        }),
      }),
    );
  });
});

// ─── pauseWorkflow ─────────────────────────────────────────────────────────

describe("pauseWorkflow", () => {
  it("emits PAUSED event + sets pausedUntil", async () => {
    mockOperatorWorkflowInstance.update.mockResolvedValue({});
    const until = new Date("2026-12-01T00:00:00Z");
    await pauseWorkflow({
      workflowId: "inst_1",
      pausedUntil: until,
      causedBy: "user:u1",
      reason: "Holiday",
    });
    expect(mockAppendWorkflowEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: WorkflowEventType.PAUSED,
        payload: expect.objectContaining({
          reason: "Holiday",
          pausedUntil: until.toISOString(),
        }),
      }),
    );
    expect(mockOperatorWorkflowInstance.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { pausedUntil: until },
      }),
    );
  });
});

// ─── loadInstance / listActiveInstances ────────────────────────────────────

describe("loadInstance", () => {
  it("returns null for missing", async () => {
    mockOperatorWorkflowInstance.findUnique.mockResolvedValue(null);
    expect(await loadInstance("missing")).toBeNull();
  });

  it("returns summary for existing instance with subject", async () => {
    mockOperatorWorkflowInstance.findUnique.mockResolvedValue({
      id: "inst_1",
      defId: "def_1",
      def: { name: "test", version: 1 },
      userId: USER_ID,
      organizationId: ORG_ID,
      subjectType: "Spacecraft",
      subjectId: "sc_42",
      currentState: "DRAFT",
      actionableBy: null,
      pausedUntil: null,
      hardDeadline: null,
      startedAt: new Date(),
      completedAt: null,
      archivedAt: null,
    });
    const summary = await loadInstance("inst_1");
    expect(summary?.id).toBe("inst_1");
    expect(summary?.defName).toBe("test");
    expect(summary?.subject).toEqual({ type: "Spacecraft", id: "sc_42" });
  });

  it("returns subject:null when subjectType is null", async () => {
    mockOperatorWorkflowInstance.findUnique.mockResolvedValue({
      id: "inst_1",
      defId: "def_1",
      def: { name: "test", version: 1 },
      userId: USER_ID,
      organizationId: ORG_ID,
      subjectType: null,
      subjectId: null,
      currentState: "DRAFT",
      actionableBy: null,
      pausedUntil: null,
      hardDeadline: null,
      startedAt: new Date(),
      completedAt: null,
      archivedAt: null,
    });
    const summary = await loadInstance("inst_1");
    expect(summary?.subject).toEqual({ type: null, id: null });
  });
});

describe("listActiveInstances", () => {
  it("filters by organizationId, archivedAt:null, completedAt:null", async () => {
    mockOperatorWorkflowInstance.findMany.mockResolvedValue([]);
    await listActiveInstances(ORG_ID);
    expect(mockOperatorWorkflowInstance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: ORG_ID,
          archivedAt: null,
          completedAt: null,
        },
      }),
    );
  });
});
