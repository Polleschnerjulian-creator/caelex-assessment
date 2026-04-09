import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    authorizationWorkflow: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    nCASubmission: {
      create: vi.fn(),
    },
  },
}));

// Mock Workflow Engine
vi.mock("@/lib/workflow", () => ({
  createWorkflowEngine: vi.fn(),
  authorizationWorkflowDefinition: {},
}));

// Mock Audit
vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { createWorkflowEngine } from "@/lib/workflow";
import { logAuditEvent } from "@/lib/audit";
import {
  buildAuthorizationContext,
  evaluateWorkflowTransitions,
  getAvailableTransitions,
  executeManualTransition,
  submitWorkflowToNCA,
  withdrawWorkflow,
  getWorkflowSummary,
} from "@/lib/services/authorization-service";

// Typed mocks
const mockFindUnique = prisma.authorizationWorkflow.findUnique as ReturnType<
  typeof vi.fn
>;
const mockUpdate = prisma.authorizationWorkflow.update as ReturnType<
  typeof vi.fn
>;
const mockUpdateMany = (prisma.authorizationWorkflow as any)
  .updateMany as ReturnType<typeof vi.fn>;
const mockCreateWorkflowEngine = createWorkflowEngine as ReturnType<
  typeof vi.fn
>;
const mockLogAuditEvent = logAuditEvent as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDocument(overrides: Record<string, unknown> = {}) {
  return {
    id: "doc-1",
    status: "ready",
    required: true,
    ...overrides,
  };
}

function makeWorkflow(overrides: Record<string, unknown> = {}) {
  return {
    id: "wf-1",
    userId: "user-1",
    operatorType: "SCO",
    primaryNCA: "BNetzA",
    status: "not_started",
    pathway: "standard",
    targetSubmission: null,
    startedAt: null,
    submittedAt: null,
    approvedAt: null,
    rejectedAt: null,
    version: 1,
    documents: [],
    ...overrides,
  };
}

function makeMockEngine(overrides: Record<string, unknown> = {}) {
  return {
    evaluateTransitions: vi.fn(),
    getAvailableTransitions: vi.fn().mockReturnValue([]),
    executeTransition: vi.fn(),
    getState: vi.fn().mockReturnValue({
      name: "Not Started",
      metadata: { color: "#6B7280", icon: "Circle", phase: "preparation" },
    }),
    isTerminalState: vi.fn().mockReturnValue(false),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Authorization Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // buildAuthorizationContext
  // =========================================================================

  describe("buildAuthorizationContext", () => {
    it("should return null when workflow is not found", async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await buildAuthorizationContext("nonexistent");

      expect(result).toBeNull();
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "nonexistent" },
        include: { documents: true },
      });
    });

    it("should build context for workflow with no documents", async () => {
      mockFindUnique.mockResolvedValue(makeWorkflow());

      const result = await buildAuthorizationContext("wf-1");

      expect(result).not.toBeNull();
      expect(result!.totalDocuments).toBe(0);
      expect(result!.readyDocuments).toBe(0);
      expect(result!.mandatoryDocuments).toBe(0);
      expect(result!.mandatoryReady).toBe(0);
      expect(result!.completenessPercentage).toBe(0);
      expect(result!.allMandatoryComplete).toBe(true);
      expect(result!.hasBlockers).toBe(false);
    });

    it("should count ready documents (ready, approved, submitted statuses)", async () => {
      const documents = [
        makeDocument({ id: "d1", status: "ready" }),
        makeDocument({ id: "d2", status: "approved" }),
        makeDocument({ id: "d3", status: "submitted" }),
        makeDocument({ id: "d4", status: "in_progress" }),
      ];
      mockFindUnique.mockResolvedValue(makeWorkflow({ documents }));

      const result = await buildAuthorizationContext("wf-1");

      expect(result!.totalDocuments).toBe(4);
      expect(result!.readyDocuments).toBe(3);
    });

    it("should count mandatory documents and mandatory ready separately", async () => {
      const documents = [
        makeDocument({ id: "d1", status: "ready", required: true }),
        makeDocument({ id: "d2", status: "in_progress", required: true }),
        makeDocument({ id: "d3", status: "ready", required: false }),
      ];
      mockFindUnique.mockResolvedValue(makeWorkflow({ documents }));

      const result = await buildAuthorizationContext("wf-1");

      expect(result!.mandatoryDocuments).toBe(2);
      expect(result!.mandatoryReady).toBe(1);
      expect(result!.allMandatoryComplete).toBe(false);
    });

    it("should calculate completeness percentage based on mandatory documents", async () => {
      const documents = [
        makeDocument({ id: "d1", status: "ready", required: true }),
        makeDocument({ id: "d2", status: "ready", required: true }),
        makeDocument({ id: "d3", status: "in_progress", required: true }),
        makeDocument({ id: "d4", status: "in_progress", required: true }),
      ];
      mockFindUnique.mockResolvedValue(makeWorkflow({ documents }));

      const result = await buildAuthorizationContext("wf-1");

      // 2 out of 4 mandatory ready = 50%
      expect(result!.completenessPercentage).toBe(50);
    });

    it("should fall back to total documents for completeness when no mandatory documents exist", async () => {
      const documents = [
        makeDocument({ id: "d1", status: "ready", required: false }),
        makeDocument({ id: "d2", status: "in_progress", required: false }),
        makeDocument({ id: "d3", status: "in_progress", required: false }),
      ];
      mockFindUnique.mockResolvedValue(makeWorkflow({ documents }));

      const result = await buildAuthorizationContext("wf-1");

      // 1 out of 3 total ready = 33%
      expect(result!.completenessPercentage).toBe(33);
    });

    it("should report completeness as 0 when there are no documents at all", async () => {
      mockFindUnique.mockResolvedValue(makeWorkflow({ documents: [] }));

      const result = await buildAuthorizationContext("wf-1");

      expect(result!.completenessPercentage).toBe(0);
    });

    it("should detect blockers for rejected documents", async () => {
      const documents = [makeDocument({ id: "d1", status: "rejected" })];
      mockFindUnique.mockResolvedValue(makeWorkflow({ documents }));

      const result = await buildAuthorizationContext("wf-1");

      expect(result!.hasBlockers).toBe(true);
    });

    it("should detect blockers for blocked documents", async () => {
      const documents = [makeDocument({ id: "d1", status: "blocked" })];
      mockFindUnique.mockResolvedValue(makeWorkflow({ documents }));

      const result = await buildAuthorizationContext("wf-1");

      expect(result!.hasBlockers).toBe(true);
    });

    it("should not detect blockers when all documents are in good status", async () => {
      const documents = [
        makeDocument({ id: "d1", status: "ready" }),
        makeDocument({ id: "d2", status: "in_progress" }),
        makeDocument({ id: "d3", status: "under_review" }),
      ];
      mockFindUnique.mockResolvedValue(makeWorkflow({ documents }));

      const result = await buildAuthorizationContext("wf-1");

      expect(result!.hasBlockers).toBe(false);
    });

    it("should set allMandatoryComplete to true when all mandatory documents are ready", async () => {
      const documents = [
        makeDocument({ id: "d1", status: "approved", required: true }),
        makeDocument({ id: "d2", status: "submitted", required: true }),
        makeDocument({ id: "d3", status: "in_progress", required: false }),
      ];
      mockFindUnique.mockResolvedValue(makeWorkflow({ documents }));

      const result = await buildAuthorizationContext("wf-1");

      expect(result!.allMandatoryComplete).toBe(true);
      expect(result!.completenessPercentage).toBe(100);
    });

    it("should map workflow fields to context correctly", async () => {
      const targetDate = new Date("2026-06-01");
      const startDate = new Date("2026-01-15");
      const submitDate = new Date("2026-03-01");
      const workflow = makeWorkflow({
        id: "wf-42",
        userId: "user-42",
        operatorType: "LO",
        primaryNCA: "CNES",
        pathway: "light",
        targetSubmission: targetDate,
        startedAt: startDate,
        submittedAt: submitDate,
        documents: [],
      });
      mockFindUnique.mockResolvedValue(workflow);

      const result = await buildAuthorizationContext("wf-42");

      expect(result!.workflowId).toBe("wf-42");
      expect(result!.userId).toBe("user-42");
      expect(result!.operatorType).toBe("LO");
      expect(result!.primaryNCA).toBe("CNES");
      expect(result!.pathway).toBe("light");
      expect(result!.targetSubmission).toEqual(targetDate);
      expect(result!.startedAt).toEqual(startDate);
      expect(result!.submittedAt).toEqual(submitDate);
    });

    it("should use empty string for operatorType when null", async () => {
      mockFindUnique.mockResolvedValue(
        makeWorkflow({ operatorType: null, documents: [] }),
      );

      const result = await buildAuthorizationContext("wf-1");

      expect(result!.operatorType).toBe("");
    });

    it("should set targetSubmission to undefined when null", async () => {
      mockFindUnique.mockResolvedValue(
        makeWorkflow({ targetSubmission: null, documents: [] }),
      );

      const result = await buildAuthorizationContext("wf-1");

      expect(result!.targetSubmission).toBeUndefined();
    });

    it("should report 100% completeness when all documents (all mandatory) are ready", async () => {
      const documents = [
        makeDocument({ id: "d1", status: "ready", required: true }),
        makeDocument({ id: "d2", status: "approved", required: true }),
        makeDocument({ id: "d3", status: "submitted", required: true }),
      ];
      mockFindUnique.mockResolvedValue(makeWorkflow({ documents }));

      const result = await buildAuthorizationContext("wf-1");

      expect(result!.completenessPercentage).toBe(100);
      expect(result!.allMandatoryComplete).toBe(true);
    });
  });

  // =========================================================================
  // evaluateWorkflowTransitions
  // =========================================================================

  describe("evaluateWorkflowTransitions", () => {
    it("should return error result when workflow is not found (first lookup)", async () => {
      // buildAuthorizationContext returns null
      mockFindUnique.mockResolvedValue(null);

      const result = await evaluateWorkflowTransitions("nonexistent");

      expect(result.transitioned).toBe(false);
      expect(result.finalState).toBe("unknown");
      expect(result.errors).toContain("Workflow not found");
    });

    it("should return error result when workflow is not found (second lookup)", async () => {
      // First call (with include) returns the context-building data
      mockFindUnique.mockResolvedValueOnce(makeWorkflow({ documents: [] }));
      // Second call (without include) returns null
      mockFindUnique.mockResolvedValueOnce(null);

      const result = await evaluateWorkflowTransitions("wf-1");

      expect(result.transitioned).toBe(false);
      expect(result.finalState).toBe("unknown");
      expect(result.errors).toContain("Workflow not found");
    });

    it("should call engine.evaluateTransitions and return result when no transition occurs", async () => {
      const workflow = makeWorkflow({ documents: [] });
      mockFindUnique.mockResolvedValue(workflow);

      const engineResult = {
        transitioned: false,
        transitions: [],
        finalState: "not_started",
        errors: [],
      };
      const mockEngine = makeMockEngine({
        evaluateTransitions: vi.fn().mockResolvedValue(engineResult),
      });
      mockCreateWorkflowEngine.mockReturnValue(mockEngine);

      const result = await evaluateWorkflowTransitions("wf-1");

      expect(result.transitioned).toBe(false);
      expect(result.finalState).toBe("not_started");
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockLogAuditEvent).not.toHaveBeenCalled();
    });

    it("should update workflow and log audit when auto-transition occurs", async () => {
      const workflow = makeWorkflow({
        status: "not_started",
        documents: [makeDocument({ status: "ready", required: true })],
      });
      mockFindUnique.mockResolvedValue(workflow);

      const engineResult = {
        transitioned: true,
        transitions: [
          {
            success: true,
            previousState: "not_started",
            currentState: "in_progress",
            transitionEvent: "auto_start",
            timestamp: new Date(),
          },
        ],
        finalState: "in_progress",
        errors: [],
      };
      const mockEngine = makeMockEngine({
        evaluateTransitions: vi.fn().mockResolvedValue(engineResult),
      });
      mockCreateWorkflowEngine.mockReturnValue(mockEngine);
      mockUpdate.mockResolvedValue({});
      mockLogAuditEvent.mockResolvedValue(undefined);

      const result = await evaluateWorkflowTransitions("wf-1");

      expect(result.transitioned).toBe(true);
      expect(result.finalState).toBe("in_progress");
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "wf-1" },
        data: expect.objectContaining({ status: "in_progress" }),
      });
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          action: "workflow_status_changed",
          entityType: "workflow",
          entityId: "wf-1",
        }),
      );
    });

    it("should set startedAt when transitioning to in_progress", async () => {
      const workflow = makeWorkflow({
        status: "not_started",
        startedAt: null,
        documents: [],
      });
      mockFindUnique.mockResolvedValue(workflow);

      const engineResult = {
        transitioned: true,
        transitions: [
          {
            success: true,
            previousState: "not_started",
            currentState: "in_progress",
            transitionEvent: "auto_start",
            timestamp: new Date(),
          },
        ],
        finalState: "in_progress",
        errors: [],
      };
      const mockEngine = makeMockEngine({
        evaluateTransitions: vi.fn().mockResolvedValue(engineResult),
      });
      mockCreateWorkflowEngine.mockReturnValue(mockEngine);
      mockUpdate.mockResolvedValue({});
      mockLogAuditEvent.mockResolvedValue(undefined);

      await evaluateWorkflowTransitions("wf-1");

      const updateCall = mockUpdate.mock.calls[0][0];
      expect(updateCall.data.status).toBe("in_progress");
      expect(updateCall.data.startedAt).toBeInstanceOf(Date);
    });

    it("should set submittedAt when transitioning to submitted", async () => {
      const workflow = makeWorkflow({
        status: "ready_for_submission",
        submittedAt: null,
        documents: [],
      });
      mockFindUnique.mockResolvedValue(workflow);

      const engineResult = {
        transitioned: true,
        transitions: [],
        finalState: "submitted",
        errors: [],
      };
      const mockEngine = makeMockEngine({
        evaluateTransitions: vi.fn().mockResolvedValue(engineResult),
      });
      mockCreateWorkflowEngine.mockReturnValue(mockEngine);
      mockUpdate.mockResolvedValue({});
      mockLogAuditEvent.mockResolvedValue(undefined);

      await evaluateWorkflowTransitions("wf-1");

      const updateCall = mockUpdate.mock.calls[0][0];
      expect(updateCall.data.submittedAt).toBeInstanceOf(Date);
    });

    it("should set approvedAt when transitioning to approved", async () => {
      const workflow = makeWorkflow({
        status: "under_review",
        approvedAt: null,
        documents: [],
      });
      mockFindUnique.mockResolvedValue(workflow);

      const engineResult = {
        transitioned: true,
        transitions: [],
        finalState: "approved",
        errors: [],
      };
      const mockEngine = makeMockEngine({
        evaluateTransitions: vi.fn().mockResolvedValue(engineResult),
      });
      mockCreateWorkflowEngine.mockReturnValue(mockEngine);
      mockUpdate.mockResolvedValue({});
      mockLogAuditEvent.mockResolvedValue(undefined);

      await evaluateWorkflowTransitions("wf-1");

      const updateCall = mockUpdate.mock.calls[0][0];
      expect(updateCall.data.approvedAt).toBeInstanceOf(Date);
    });

    it("should set rejectedAt when transitioning to rejected", async () => {
      const workflow = makeWorkflow({
        status: "under_review",
        rejectedAt: null,
        documents: [],
      });
      mockFindUnique.mockResolvedValue(workflow);

      const engineResult = {
        transitioned: true,
        transitions: [],
        finalState: "rejected",
        errors: [],
      };
      const mockEngine = makeMockEngine({
        evaluateTransitions: vi.fn().mockResolvedValue(engineResult),
      });
      mockCreateWorkflowEngine.mockReturnValue(mockEngine);
      mockUpdate.mockResolvedValue({});
      mockLogAuditEvent.mockResolvedValue(undefined);

      await evaluateWorkflowTransitions("wf-1");

      const updateCall = mockUpdate.mock.calls[0][0];
      expect(updateCall.data.rejectedAt).toBeInstanceOf(Date);
    });

    it("should not overwrite existing startedAt timestamp", async () => {
      const existingDate = new Date("2026-01-01");
      const workflow = makeWorkflow({
        status: "not_started",
        startedAt: existingDate,
        documents: [],
      });
      mockFindUnique.mockResolvedValue(workflow);

      const engineResult = {
        transitioned: true,
        transitions: [],
        finalState: "in_progress",
        errors: [],
      };
      const mockEngine = makeMockEngine({
        evaluateTransitions: vi.fn().mockResolvedValue(engineResult),
      });
      mockCreateWorkflowEngine.mockReturnValue(mockEngine);
      mockUpdate.mockResolvedValue({});
      mockLogAuditEvent.mockResolvedValue(undefined);

      await evaluateWorkflowTransitions("wf-1");

      const updateCall = mockUpdate.mock.calls[0][0];
      // Should only have status, not startedAt (since it already exists)
      expect(updateCall.data.startedAt).toBeUndefined();
    });

    it("should not update database if status did not change", async () => {
      const workflow = makeWorkflow({
        status: "not_started",
        documents: [],
      });
      mockFindUnique.mockResolvedValue(workflow);

      // transitioned is true but finalState matches current status
      const engineResult = {
        transitioned: true,
        transitions: [],
        finalState: "not_started",
        errors: [],
      };
      const mockEngine = makeMockEngine({
        evaluateTransitions: vi.fn().mockResolvedValue(engineResult),
      });
      mockCreateWorkflowEngine.mockReturnValue(mockEngine);

      await evaluateWorkflowTransitions("wf-1");

      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockLogAuditEvent).not.toHaveBeenCalled();
    });

    it("should include context in the result", async () => {
      const workflow = makeWorkflow({ documents: [] });
      mockFindUnique.mockResolvedValue(workflow);

      const engineResult = {
        transitioned: false,
        transitions: [],
        finalState: "not_started",
        errors: [],
      };
      const mockEngine = makeMockEngine({
        evaluateTransitions: vi.fn().mockResolvedValue(engineResult),
      });
      mockCreateWorkflowEngine.mockReturnValue(mockEngine);

      const result = await evaluateWorkflowTransitions("wf-1");

      expect(result.context).toBeDefined();
      expect(result.context.workflowId).toBe("wf-1");
    });
  });

  // =========================================================================
  // getAvailableTransitions
  // =========================================================================

  describe("getAvailableTransitions", () => {
    it("should return empty array when workflow is not found (context null)", async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await getAvailableTransitions("nonexistent");

      expect(result).toEqual([]);
    });

    it("should return empty array when workflow is not found (second lookup)", async () => {
      mockFindUnique.mockResolvedValueOnce(makeWorkflow({ documents: [] }));
      mockFindUnique.mockResolvedValueOnce(null);

      const result = await getAvailableTransitions("wf-1");

      expect(result).toEqual([]);
    });

    it("should delegate to engine.getAvailableTransitions", async () => {
      const workflow = makeWorkflow({ documents: [] });
      mockFindUnique.mockResolvedValue(workflow);

      const expectedTransitions = [
        {
          event: "start",
          to: "in_progress",
          description: "Start workflow",
          auto: false,
          conditionMet: true,
        },
      ];
      const mockEngine = makeMockEngine({
        getAvailableTransitions: vi.fn().mockReturnValue(expectedTransitions),
      });
      mockCreateWorkflowEngine.mockReturnValue(mockEngine);

      const result = await getAvailableTransitions("wf-1");

      expect(result).toEqual(expectedTransitions);
      expect(mockEngine.getAvailableTransitions).toHaveBeenCalledWith(
        "not_started",
        expect.objectContaining({ workflowId: "wf-1" }),
      );
    });

    it("should pass the current workflow status to the engine", async () => {
      const workflow = makeWorkflow({
        status: "in_progress",
        documents: [],
      });
      mockFindUnique.mockResolvedValue(workflow);

      const mockEngine = makeMockEngine();
      mockCreateWorkflowEngine.mockReturnValue(mockEngine);

      await getAvailableTransitions("wf-1");

      expect(mockEngine.getAvailableTransitions).toHaveBeenCalledWith(
        "in_progress",
        expect.any(Object),
      );
    });
  });

  // =========================================================================
  // executeManualTransition
  // =========================================================================

  describe("executeManualTransition", () => {
    it("should return error when workflow is not found (context null)", async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await executeManualTransition(
        "nonexistent",
        "start",
        "user-1",
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Workflow not found");
      expect(result.previousState).toBe("unknown");
      expect(result.currentState).toBe("unknown");
    });

    it("should return unauthorized error when userId does not match", async () => {
      mockFindUnique.mockResolvedValue(
        makeWorkflow({ userId: "user-1", documents: [] }),
      );

      const result = await executeManualTransition("wf-1", "start", "user-999");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("should return error when workflow is not found on second lookup", async () => {
      mockFindUnique.mockResolvedValueOnce(
        makeWorkflow({ userId: "user-1", documents: [] }),
      );
      mockFindUnique.mockResolvedValueOnce(null);

      const result = await executeManualTransition("wf-1", "start", "user-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Workflow not found");
    });

    it("should delegate to engine.executeTransition on success path", async () => {
      const workflow = makeWorkflow({
        status: "not_started",
        documents: [],
      });
      mockFindUnique.mockResolvedValue(workflow);

      const transitionResult = {
        success: true,
        previousState: "not_started",
        currentState: "in_progress",
        transitionEvent: "start",
        timestamp: new Date(),
      };
      const mockEngine = makeMockEngine({
        executeTransition: vi.fn().mockResolvedValue(transitionResult),
      });
      mockCreateWorkflowEngine.mockReturnValue(mockEngine);
      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockLogAuditEvent.mockResolvedValue(undefined);

      const result = await executeManualTransition("wf-1", "start", "user-1");

      expect(result.success).toBe(true);
      expect(result.currentState).toBe("in_progress");
      expect(mockEngine.executeTransition).toHaveBeenCalledWith(
        "not_started",
        "start",
        expect.objectContaining({ workflowId: "wf-1" }),
      );
    });

    it("should update database on successful transition", async () => {
      const workflow = makeWorkflow({
        status: "not_started",
        documents: [],
      });
      mockFindUnique.mockResolvedValue(workflow);

      const transitionResult = {
        success: true,
        previousState: "not_started",
        currentState: "in_progress",
        transitionEvent: "start",
        timestamp: new Date(),
      };
      const mockEngine = makeMockEngine({
        executeTransition: vi.fn().mockResolvedValue(transitionResult),
      });
      mockCreateWorkflowEngine.mockReturnValue(mockEngine);
      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockLogAuditEvent.mockResolvedValue(undefined);

      await executeManualTransition("wf-1", "start", "user-1");

      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { id: "wf-1", version: 1 },
        data: expect.objectContaining({ status: "in_progress" }),
      });
    });

    it("should log audit event on successful transition", async () => {
      const workflow = makeWorkflow({
        status: "not_started",
        documents: [],
      });
      mockFindUnique.mockResolvedValue(workflow);

      const transitionResult = {
        success: true,
        previousState: "not_started",
        currentState: "in_progress",
        transitionEvent: "start",
        timestamp: new Date(),
      };
      const mockEngine = makeMockEngine({
        executeTransition: vi.fn().mockResolvedValue(transitionResult),
      });
      mockCreateWorkflowEngine.mockReturnValue(mockEngine);
      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockLogAuditEvent.mockResolvedValue(undefined);

      await executeManualTransition("wf-1", "start", "user-1");

      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          action: "workflow_start",
          entityType: "workflow",
          entityId: "wf-1",
          previousValue: { status: "not_started" },
          newValue: expect.objectContaining({ status: "in_progress" }),
        }),
      );
    });

    it("should not update database or audit when transition fails", async () => {
      const workflow = makeWorkflow({
        status: "not_started",
        documents: [],
      });
      mockFindUnique.mockResolvedValue(workflow);

      const transitionResult = {
        success: false,
        previousState: "not_started",
        currentState: "not_started",
        transitionEvent: "submit",
        error: "Transition guard rejected the transition",
        timestamp: new Date(),
      };
      const mockEngine = makeMockEngine({
        executeTransition: vi.fn().mockResolvedValue(transitionResult),
      });
      mockCreateWorkflowEngine.mockReturnValue(mockEngine);

      const result = await executeManualTransition("wf-1", "submit", "user-1");

      expect(result.success).toBe(false);
      expect(mockUpdateMany).not.toHaveBeenCalled();
      expect(mockLogAuditEvent).not.toHaveBeenCalled();
    });

    it("should set submittedAt timestamp when transitioning to submitted", async () => {
      const workflow = makeWorkflow({
        status: "ready_for_submission",
        documents: [],
      });
      mockFindUnique.mockResolvedValue(workflow);

      const transitionResult = {
        success: true,
        previousState: "ready_for_submission",
        currentState: "submitted",
        transitionEvent: "submit",
        timestamp: new Date(),
      };
      const mockEngine = makeMockEngine({
        executeTransition: vi.fn().mockResolvedValue(transitionResult),
      });
      mockCreateWorkflowEngine.mockReturnValue(mockEngine);
      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockLogAuditEvent.mockResolvedValue(undefined);

      await executeManualTransition("wf-1", "submit", "user-1");

      const updateCall = mockUpdateMany.mock.calls[0][0];
      expect(updateCall.data.submittedAt).toBeInstanceOf(Date);
    });

    it("should set approvedAt timestamp when transitioning to approved", async () => {
      const workflow = makeWorkflow({
        status: "under_review",
        documents: [],
      });
      mockFindUnique.mockResolvedValue(workflow);

      const transitionResult = {
        success: true,
        previousState: "under_review",
        currentState: "approved",
        transitionEvent: "approve",
        timestamp: new Date(),
      };
      const mockEngine = makeMockEngine({
        executeTransition: vi.fn().mockResolvedValue(transitionResult),
      });
      mockCreateWorkflowEngine.mockReturnValue(mockEngine);
      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockLogAuditEvent.mockResolvedValue(undefined);

      await executeManualTransition("wf-1", "approve", "user-1");

      const updateCall = mockUpdateMany.mock.calls[0][0];
      expect(updateCall.data.approvedAt).toBeInstanceOf(Date);
    });

    it("should set rejectedAt and rejectionReason when transitioning to rejected", async () => {
      const workflow = makeWorkflow({
        status: "under_review",
        documents: [],
      });
      mockFindUnique.mockResolvedValue(workflow);

      const transitionResult = {
        success: true,
        previousState: "under_review",
        currentState: "rejected",
        transitionEvent: "reject",
        timestamp: new Date(),
      };
      const mockEngine = makeMockEngine({
        executeTransition: vi.fn().mockResolvedValue(transitionResult),
      });
      mockCreateWorkflowEngine.mockReturnValue(mockEngine);
      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockLogAuditEvent.mockResolvedValue(undefined);

      await executeManualTransition("wf-1", "reject", "user-1", {
        rejectionReason: "Incomplete documentation",
      });

      const updateCall = mockUpdateMany.mock.calls[0][0];
      expect(updateCall.data.rejectedAt).toBeInstanceOf(Date);
      expect(updateCall.data.rejectionReason).toBe("Incomplete documentation");
    });

    it("should not set rejectionReason when not provided for rejected transition", async () => {
      const workflow = makeWorkflow({
        status: "under_review",
        documents: [],
      });
      mockFindUnique.mockResolvedValue(workflow);

      const transitionResult = {
        success: true,
        previousState: "under_review",
        currentState: "rejected",
        transitionEvent: "reject",
        timestamp: new Date(),
      };
      const mockEngine = makeMockEngine({
        executeTransition: vi.fn().mockResolvedValue(transitionResult),
      });
      mockCreateWorkflowEngine.mockReturnValue(mockEngine);
      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockLogAuditEvent.mockResolvedValue(undefined);

      await executeManualTransition("wf-1", "reject", "user-1");

      const updateCall = mockUpdateMany.mock.calls[0][0];
      expect(updateCall.data.rejectedAt).toBeInstanceOf(Date);
      expect(updateCall.data.rejectionReason).toBeUndefined();
    });

    it("should include additionalData in the audit log newValue", async () => {
      const workflow = makeWorkflow({
        status: "not_started",
        documents: [],
      });
      mockFindUnique.mockResolvedValue(workflow);

      const transitionResult = {
        success: true,
        previousState: "not_started",
        currentState: "in_progress",
        transitionEvent: "start",
        timestamp: new Date(),
      };
      const mockEngine = makeMockEngine({
        executeTransition: vi.fn().mockResolvedValue(transitionResult),
      });
      mockCreateWorkflowEngine.mockReturnValue(mockEngine);
      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockLogAuditEvent.mockResolvedValue(undefined);

      await executeManualTransition("wf-1", "start", "user-1", {
        note: "Starting workflow",
      });

      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          newValue: expect.objectContaining({
            status: "in_progress",
            note: "Starting workflow",
          }),
        }),
      );
    });

    it("should include context in the result", async () => {
      const workflow = makeWorkflow({
        status: "not_started",
        documents: [],
      });
      mockFindUnique.mockResolvedValue(workflow);

      const transitionResult = {
        success: true,
        previousState: "not_started",
        currentState: "in_progress",
        transitionEvent: "start",
        timestamp: new Date(),
      };
      const mockEngine = makeMockEngine({
        executeTransition: vi.fn().mockResolvedValue(transitionResult),
      });
      mockCreateWorkflowEngine.mockReturnValue(mockEngine);
      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockLogAuditEvent.mockResolvedValue(undefined);

      const result = await executeManualTransition("wf-1", "start", "user-1");

      expect(result.context).toBeDefined();
      expect(result.context.workflowId).toBe("wf-1");
    });

    it("should set startedAt when transitioning to in_progress and startedAt is null", async () => {
      const workflow = makeWorkflow({
        status: "not_started",
        startedAt: null,
        documents: [],
      });
      mockFindUnique.mockResolvedValue(workflow);

      const transitionResult = {
        success: true,
        previousState: "not_started",
        currentState: "in_progress",
        transitionEvent: "start",
        timestamp: new Date(),
      };
      const mockEngine = makeMockEngine({
        executeTransition: vi.fn().mockResolvedValue(transitionResult),
      });
      mockCreateWorkflowEngine.mockReturnValue(mockEngine);
      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockLogAuditEvent.mockResolvedValue(undefined);

      await executeManualTransition("wf-1", "start", "user-1");

      const updateCall = mockUpdateMany.mock.calls[0][0];
      expect(updateCall.data.startedAt).toBeInstanceOf(Date);
    });
  });

  // =========================================================================
  // submitWorkflowToNCA
  // =========================================================================

  describe("submitWorkflowToNCA", () => {
    it("should evaluate transitions then execute submit", async () => {
      const workflow = makeWorkflow({
        status: "ready_for_submission",
        documents: [makeDocument({ status: "ready", required: true })],
      });
      mockFindUnique.mockResolvedValue(workflow);

      // For evaluateWorkflowTransitions (no auto-transitions)
      const evalResult = {
        transitioned: false,
        transitions: [],
        finalState: "ready_for_submission",
        errors: [],
      };
      // For executeManualTransition
      const transitionResult = {
        success: true,
        previousState: "ready_for_submission",
        currentState: "submitted",
        transitionEvent: "submit",
        timestamp: new Date(),
      };
      const mockEngine = makeMockEngine({
        evaluateTransitions: vi.fn().mockResolvedValue(evalResult),
        executeTransition: vi.fn().mockResolvedValue(transitionResult),
      });
      mockCreateWorkflowEngine.mockReturnValue(mockEngine);
      mockUpdate.mockResolvedValue({});
      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockLogAuditEvent.mockResolvedValue(undefined);

      const result = await submitWorkflowToNCA("wf-1", "user-1");

      expect(result.success).toBe(true);
      expect(result.currentState).toBe("submitted");
    });

    it("should fail if user is not workflow owner", async () => {
      const workflow = makeWorkflow({
        userId: "user-1",
        documents: [],
      });
      mockFindUnique.mockResolvedValue(workflow);

      const evalResult = {
        transitioned: false,
        transitions: [],
        finalState: "not_started",
        errors: [],
      };
      const mockEngine = makeMockEngine({
        evaluateTransitions: vi.fn().mockResolvedValue(evalResult),
      });
      mockCreateWorkflowEngine.mockReturnValue(mockEngine);

      const result = await submitWorkflowToNCA("wf-1", "user-other");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });
  });

  // =========================================================================
  // withdrawWorkflow
  // =========================================================================

  describe("withdrawWorkflow", () => {
    it("should execute withdraw transition with reason", async () => {
      const workflow = makeWorkflow({
        status: "submitted",
        documents: [],
      });
      mockFindUnique.mockResolvedValue(workflow);

      const transitionResult = {
        success: true,
        previousState: "submitted",
        currentState: "withdrawn",
        transitionEvent: "withdraw",
        timestamp: new Date(),
      };
      const mockEngine = makeMockEngine({
        executeTransition: vi.fn().mockResolvedValue(transitionResult),
      });
      mockCreateWorkflowEngine.mockReturnValue(mockEngine);
      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockLogAuditEvent.mockResolvedValue(undefined);

      const result = await withdrawWorkflow(
        "wf-1",
        "user-1",
        "Changed requirements",
      );

      expect(result.success).toBe(true);
      expect(result.currentState).toBe("withdrawn");
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          newValue: expect.objectContaining({
            withdrawalReason: "Changed requirements",
          }),
        }),
      );
    });

    it("should execute withdraw transition without reason", async () => {
      const workflow = makeWorkflow({
        status: "submitted",
        documents: [],
      });
      mockFindUnique.mockResolvedValue(workflow);

      const transitionResult = {
        success: true,
        previousState: "submitted",
        currentState: "withdrawn",
        transitionEvent: "withdraw",
        timestamp: new Date(),
      };
      const mockEngine = makeMockEngine({
        executeTransition: vi.fn().mockResolvedValue(transitionResult),
      });
      mockCreateWorkflowEngine.mockReturnValue(mockEngine);
      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockLogAuditEvent.mockResolvedValue(undefined);

      const result = await withdrawWorkflow("wf-1", "user-1");

      expect(result.success).toBe(true);
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          newValue: expect.objectContaining({
            withdrawalReason: undefined,
          }),
        }),
      );
    });

    it("should fail when workflow is not found", async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await withdrawWorkflow("nonexistent", "user-1", "reason");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Workflow not found");
    });
  });

  // =========================================================================
  // getWorkflowSummary
  // =========================================================================

  describe("getWorkflowSummary", () => {
    it("should return null when workflow context cannot be built", async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await getWorkflowSummary("nonexistent");

      expect(result).toBeNull();
    });

    it("should return null when workflow is not found on lookup", async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await getWorkflowSummary("wf-1");

      expect(result).toBeNull();
    });

    it("should return full summary for a valid workflow", async () => {
      const workflow = makeWorkflow({
        status: "not_started",
        documents: [],
      });
      mockFindUnique.mockResolvedValue(workflow);

      const stateDef = {
        name: "Not Started",
        metadata: { color: "#6B7280", icon: "Circle", phase: "preparation" },
      };
      const mockEngine = makeMockEngine({
        getState: vi.fn().mockReturnValue(stateDef),
        getAvailableTransitions: vi.fn().mockReturnValue([
          {
            event: "start",
            to: "in_progress",
            auto: false,
            conditionMet: true,
          },
        ]),
        isTerminalState: vi.fn().mockReturnValue(false),
      });
      mockCreateWorkflowEngine.mockReturnValue(mockEngine);

      const result = await getWorkflowSummary("wf-1");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("wf-1");
      expect(result!.status).toBe("not_started");
      expect(result!.statusInfo.label).toBe("Not Started");
      expect(result!.statusInfo.color).toBe("#6B7280");
      expect(result!.statusInfo.icon).toBe("Circle");
      expect(result!.statusInfo.phase).toBe("preparation");
      expect(result!.progress).toBe(0);
      expect(result!.isTerminal).toBe(false);
      expect(result!.availableTransitions).toHaveLength(1);
      expect(result!.context.workflowId).toBe("wf-1");
    });

    it("should calculate progress based on state order", async () => {
      const testCases = [
        { status: "not_started", expectedProgress: 0 },
        { status: "in_progress", expectedProgress: 20 },
        { status: "ready_for_submission", expectedProgress: 40 },
        { status: "submitted", expectedProgress: 60 },
        { status: "under_review", expectedProgress: 80 },
        { status: "approved", expectedProgress: 100 },
      ];

      for (const { status, expectedProgress } of testCases) {
        vi.clearAllMocks();
        const workflow = makeWorkflow({ status, documents: [] });
        mockFindUnique.mockResolvedValue(workflow);

        const mockEngine = makeMockEngine();
        mockCreateWorkflowEngine.mockReturnValue(mockEngine);

        const result = await getWorkflowSummary("wf-1");

        expect(result!.progress).toBe(expectedProgress);
      }
    });

    it("should return 0 progress for unknown statuses not in the state order", async () => {
      const workflow = makeWorkflow({
        status: "withdrawn",
        documents: [],
      });
      mockFindUnique.mockResolvedValue(workflow);

      const mockEngine = makeMockEngine();
      mockCreateWorkflowEngine.mockReturnValue(mockEngine);

      const result = await getWorkflowSummary("wf-1");

      expect(result!.progress).toBe(0);
    });

    it("should use fallback values when state definition has no metadata", async () => {
      const workflow = makeWorkflow({
        status: "not_started",
        documents: [],
      });
      mockFindUnique.mockResolvedValue(workflow);

      const mockEngine = makeMockEngine({
        getState: vi.fn().mockReturnValue({
          name: "Custom State",
          metadata: undefined,
        }),
      });
      mockCreateWorkflowEngine.mockReturnValue(mockEngine);

      const result = await getWorkflowSummary("wf-1");

      expect(result!.statusInfo.label).toBe("Custom State");
      expect(result!.statusInfo.color).toBe("#6B7280");
      expect(result!.statusInfo.icon).toBe("Circle");
      expect(result!.statusInfo.phase).toBe("unknown");
    });

    it("should use workflow status as label when getState returns undefined", async () => {
      const workflow = makeWorkflow({
        status: "not_started",
        documents: [],
      });
      mockFindUnique.mockResolvedValue(workflow);

      const mockEngine = makeMockEngine({
        getState: vi.fn().mockReturnValue(undefined),
      });
      mockCreateWorkflowEngine.mockReturnValue(mockEngine);

      const result = await getWorkflowSummary("wf-1");

      expect(result!.statusInfo.label).toBe("not_started");
      expect(result!.statusInfo.color).toBe("#6B7280");
      expect(result!.statusInfo.icon).toBe("Circle");
      expect(result!.statusInfo.phase).toBe("unknown");
    });

    it("should correctly flag terminal states", async () => {
      const workflow = makeWorkflow({
        status: "approved",
        documents: [],
      });
      mockFindUnique.mockResolvedValue(workflow);

      const mockEngine = makeMockEngine({
        isTerminalState: vi.fn().mockReturnValue(true),
      });
      mockCreateWorkflowEngine.mockReturnValue(mockEngine);

      const result = await getWorkflowSummary("wf-1");

      expect(result!.isTerminal).toBe(true);
    });
  });

  // =========================================================================
  // Edge cases
  // =========================================================================

  describe("Edge cases", () => {
    it("should handle workflow with all documents blocked", async () => {
      const documents = [
        makeDocument({ id: "d1", status: "blocked", required: true }),
        makeDocument({ id: "d2", status: "rejected", required: true }),
        makeDocument({ id: "d3", status: "blocked", required: false }),
      ];
      mockFindUnique.mockResolvedValue(makeWorkflow({ documents }));

      const result = await buildAuthorizationContext("wf-1");

      expect(result!.hasBlockers).toBe(true);
      expect(result!.readyDocuments).toBe(0);
      expect(result!.mandatoryReady).toBe(0);
      expect(result!.completenessPercentage).toBe(0);
      expect(result!.allMandatoryComplete).toBe(false);
    });

    it("should handle mix of blocked and ready documents", async () => {
      const documents = [
        makeDocument({ id: "d1", status: "ready", required: true }),
        makeDocument({ id: "d2", status: "blocked", required: true }),
        makeDocument({ id: "d3", status: "approved", required: true }),
        makeDocument({ id: "d4", status: "rejected", required: false }),
      ];
      mockFindUnique.mockResolvedValue(makeWorkflow({ documents }));

      const result = await buildAuthorizationContext("wf-1");

      expect(result!.hasBlockers).toBe(true);
      expect(result!.totalDocuments).toBe(4);
      expect(result!.readyDocuments).toBe(2);
      expect(result!.mandatoryDocuments).toBe(3);
      expect(result!.mandatoryReady).toBe(2);
      expect(result!.completenessPercentage).toBe(67); // round(2/3 * 100) = 67
    });

    it("should handle documents with only non-mandatory items", async () => {
      const documents = [
        makeDocument({ id: "d1", status: "ready", required: false }),
        makeDocument({ id: "d2", status: "ready", required: false }),
      ];
      mockFindUnique.mockResolvedValue(makeWorkflow({ documents }));

      const result = await buildAuthorizationContext("wf-1");

      expect(result!.mandatoryDocuments).toBe(0);
      expect(result!.allMandatoryComplete).toBe(true);
      expect(result!.completenessPercentage).toBe(100); // 2/2 total ready
    });

    it("should handle in_progress documents not counted as ready", async () => {
      const documents = [
        makeDocument({ id: "d1", status: "in_progress", required: true }),
        makeDocument({ id: "d2", status: "under_review", required: true }),
      ];
      mockFindUnique.mockResolvedValue(makeWorkflow({ documents }));

      const result = await buildAuthorizationContext("wf-1");

      expect(result!.readyDocuments).toBe(0);
      expect(result!.mandatoryReady).toBe(0);
      expect(result!.completenessPercentage).toBe(0);
      expect(result!.allMandatoryComplete).toBe(false);
    });

    it("should handle large number of documents correctly", async () => {
      const documents = Array.from({ length: 100 }, (_, i) => ({
        id: `doc-${i}`,
        status: i < 75 ? "ready" : "in_progress",
        required: i < 50,
      }));
      mockFindUnique.mockResolvedValue(makeWorkflow({ documents }));

      const result = await buildAuthorizationContext("wf-1");

      expect(result!.totalDocuments).toBe(100);
      expect(result!.readyDocuments).toBe(75);
      expect(result!.mandatoryDocuments).toBe(50);
      // First 50 are mandatory, first 75 are ready, so all 50 mandatory are ready
      expect(result!.mandatoryReady).toBe(50);
      expect(result!.completenessPercentage).toBe(100);
      expect(result!.allMandatoryComplete).toBe(true);
    });
  });
});
