import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the logger
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import {
  incidentWorkflowDefinition,
  getIncidentStatusInfo,
  INCIDENT_STATE_ORDER,
  getIncidentProgress,
} from "./incident";

describe("incident workflow definition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("incidentWorkflowDefinition structure", () => {
    it("has the correct id", () => {
      expect(incidentWorkflowDefinition.id).toBe("incident");
    });

    it("has the correct name", () => {
      expect(incidentWorkflowDefinition.name).toBe("NIS2 Incident Response");
    });

    it("has version 1.0.0", () => {
      expect(incidentWorkflowDefinition.version).toBe("1.0.0");
    });

    it("has initialState set to reported", () => {
      expect(incidentWorkflowDefinition.initialState).toBe("reported");
    });

    it("has a description", () => {
      expect(incidentWorkflowDefinition.description).toBeDefined();
      expect(typeof incidentWorkflowDefinition.description).toBe("string");
    });
  });

  describe("states", () => {
    const states = incidentWorkflowDefinition.states;

    it("has all 6 expected states", () => {
      const stateKeys = Object.keys(states);
      expect(stateKeys).toContain("reported");
      expect(stateKeys).toContain("triaged");
      expect(stateKeys).toContain("investigating");
      expect(stateKeys).toContain("mitigating");
      expect(stateKeys).toContain("resolved");
      expect(stateKeys).toContain("closed");
      expect(stateKeys).toHaveLength(6);
    });

    it("reported state has correct name", () => {
      expect(states.reported.name).toBe("Reported");
    });

    it("triaged state has correct name", () => {
      expect(states.triaged.name).toBe("Triaged");
    });

    it("investigating state has correct name", () => {
      expect(states.investigating.name).toBe("Investigating");
    });

    it("mitigating state has correct name", () => {
      expect(states.mitigating.name).toBe("Mitigating");
    });

    it("resolved state has correct name", () => {
      expect(states.resolved.name).toBe("Resolved");
    });

    it("closed state has correct name", () => {
      expect(states.closed.name).toBe("Closed");
    });

    it("all states have metadata with color, icon, and phase", () => {
      for (const [, state] of Object.entries(states)) {
        expect(state.metadata).toBeDefined();
        expect(state.metadata!.color).toBeDefined();
        expect(state.metadata!.icon).toBeDefined();
        expect(state.metadata!.phase).toBeDefined();
      }
    });

    it("closed state has isTerminal metadata set to true", () => {
      expect(states.closed.metadata!.isTerminal).toBe(true);
    });

    it("non-closed states do not have isTerminal set", () => {
      const nonClosedStates = [
        "reported",
        "triaged",
        "investigating",
        "mitigating",
        "resolved",
      ];
      for (const stateName of nonClosedStates) {
        expect(states[stateName].metadata?.isTerminal).toBeUndefined();
      }
    });
  });

  describe("transitions", () => {
    const states = incidentWorkflowDefinition.states;

    it("reported has auto_triage and triage transitions", () => {
      const transitions = Object.keys(states.reported.transitions);
      expect(transitions).toContain("auto_triage");
      expect(transitions).toContain("triage");
    });

    it("reported auto_triage targets triaged", () => {
      expect(states.reported.transitions.auto_triage.to).toBe("triaged");
    });

    it("reported triage targets triaged", () => {
      expect(states.reported.transitions.triage.to).toBe("triaged");
    });

    it("auto_triage is an auto-transition", () => {
      expect(states.reported.transitions.auto_triage.auto).toBe(true);
    });

    it("auto_triage has autoCondition function", () => {
      expect(typeof states.reported.transitions.auto_triage.autoCondition).toBe(
        "function",
      );
    });

    it("auto_triage condition requires severity AND requiresNCANotification", () => {
      const condition = states.reported.transitions.auto_triage.autoCondition!;

      // Both defined -> true
      expect(
        condition({
          severity: "high",
          requiresNCANotification: true,
        } as any),
      ).toBe(true);

      // Missing severity -> false
      expect(
        condition({
          severity: undefined,
          requiresNCANotification: true,
        } as any),
      ).toBe(false);

      // Missing requiresNCANotification -> false
      expect(
        condition({
          severity: "high",
          requiresNCANotification: undefined,
        } as any),
      ).toBe(false);

      // Both missing -> false
      expect(
        condition({
          severity: undefined,
          requiresNCANotification: undefined,
        } as any),
      ).toBe(false);
    });

    it("triaged has investigate transition to investigating", () => {
      expect(states.triaged.transitions.investigate.to).toBe("investigating");
    });

    it("investigating has mitigate transition to mitigating", () => {
      expect(states.investigating.transitions.mitigate.to).toBe("mitigating");
    });

    it("mitigating has resolve transition to resolved", () => {
      expect(states.mitigating.transitions.resolve.to).toBe("resolved");
    });

    it("mitigating resolve transition has onTransition that sets resolvedAt", async () => {
      const ctx = {} as any;
      const onTransition = states.mitigating.transitions.resolve.onTransition!;
      await onTransition(ctx);
      expect(ctx.resolvedAt).toBeInstanceOf(Date);
    });

    it("resolved has close transition to closed", () => {
      expect(states.resolved.transitions.close.to).toBe("closed");
    });

    it("resolved has reopen transition to investigating", () => {
      expect(states.resolved.transitions.reopen.to).toBe("investigating");
    });

    it("closed has reopen transition to investigating", () => {
      expect(states.closed.transitions.reopen.to).toBe("investigating");
    });

    it("all transitions have descriptions", () => {
      for (const [, state] of Object.entries(states)) {
        for (const [, transition] of Object.entries(state.transitions)) {
          expect(transition.description).toBeDefined();
          expect(typeof transition.description).toBe("string");
        }
      }
    });
  });

  describe("hooks", () => {
    it("has beforeTransition hook", () => {
      expect(incidentWorkflowDefinition.hooks?.beforeTransition).toBeDefined();
      expect(typeof incidentWorkflowDefinition.hooks!.beforeTransition).toBe(
        "function",
      );
    });

    it("has afterTransition hook", () => {
      expect(incidentWorkflowDefinition.hooks?.afterTransition).toBeDefined();
      expect(typeof incidentWorkflowDefinition.hooks!.afterTransition).toBe(
        "function",
      );
    });

    it("has onError hook", () => {
      expect(incidentWorkflowDefinition.hooks?.onError).toBeDefined();
      expect(typeof incidentWorkflowDefinition.hooks!.onError).toBe("function");
    });

    it("beforeTransition calls logger.debug", async () => {
      const { logger } = await import("@/lib/logger");
      const ctx = {
        incidentId: "INC-001",
        from: "reported",
        to: "triaged",
      } as any;
      await incidentWorkflowDefinition.hooks!.beforeTransition!(ctx);
      expect(logger.debug).toHaveBeenCalled();
    });

    it("onError calls logger.error", async () => {
      const { logger } = await import("@/lib/logger");
      const error = new Error("Test error");
      const ctx = { incidentId: "INC-001" } as any;
      await incidentWorkflowDefinition.hooks!.onError!(error, ctx);
      expect(logger.error).toHaveBeenCalled();
    });

    it("afterTransition does not throw", async () => {
      const ctx = {
        incidentId: "INC-001",
        from: "reported",
        to: "triaged",
      } as any;
      await expect(
        incidentWorkflowDefinition.hooks!.afterTransition!(ctx),
      ).resolves.toBeUndefined();
    });
  });

  describe("getIncidentStatusInfo", () => {
    it("returns correct info for 'reported'", () => {
      const info = getIncidentStatusInfo("reported");
      expect(info.label).toBe("Reported");
      expect(info.color).toBe("#F59E0B");
      expect(info.icon).toBe("AlertTriangle");
      expect(info.phase).toBe("detection");
    });

    it("returns correct info for 'triaged'", () => {
      const info = getIncidentStatusInfo("triaged");
      expect(info.label).toBe("Triaged");
      expect(info.color).toBe("#3B82F6");
      expect(info.icon).toBe("ClipboardCheck");
      expect(info.phase).toBe("assessment");
    });

    it("returns correct info for 'investigating'", () => {
      const info = getIncidentStatusInfo("investigating");
      expect(info.label).toBe("Investigating");
      expect(info.color).toBe("#8B5CF6");
      expect(info.icon).toBe("Search");
      expect(info.phase).toBe("investigation");
    });

    it("returns correct info for 'mitigating'", () => {
      const info = getIncidentStatusInfo("mitigating");
      expect(info.label).toBe("Mitigating");
      expect(info.color).toBe("#F97316");
      expect(info.icon).toBe("Shield");
      expect(info.phase).toBe("containment");
    });

    it("returns correct info for 'resolved'", () => {
      const info = getIncidentStatusInfo("resolved");
      expect(info.label).toBe("Resolved");
      expect(info.color).toBe("#22C55E");
      expect(info.icon).toBe("CheckCircle");
      expect(info.phase).toBe("resolution");
    });

    it("returns correct info for 'closed'", () => {
      const info = getIncidentStatusInfo("closed");
      expect(info.label).toBe("Closed");
      expect(info.color).toBe("#6B7280");
      expect(info.icon).toBe("Archive");
      expect(info.phase).toBe("closed");
    });

    it("returns fallback for unknown state", () => {
      const info = getIncidentStatusInfo("nonexistent_state");
      expect(info.label).toBe("nonexistent_state");
      expect(info.color).toBe("#6B7280");
      expect(info.icon).toBe("Circle");
      expect(info.phase).toBe("unknown");
    });

    it("returns fallback for empty string state", () => {
      const info = getIncidentStatusInfo("");
      expect(info.label).toBe("");
      expect(info.phase).toBe("unknown");
    });
  });

  describe("INCIDENT_STATE_ORDER", () => {
    it("has 6 states", () => {
      expect(INCIDENT_STATE_ORDER).toHaveLength(6);
    });

    it("starts with reported", () => {
      expect(INCIDENT_STATE_ORDER[0]).toBe("reported");
    });

    it("ends with closed", () => {
      expect(INCIDENT_STATE_ORDER[INCIDENT_STATE_ORDER.length - 1]).toBe(
        "closed",
      );
    });

    it("has the correct order", () => {
      expect(INCIDENT_STATE_ORDER).toEqual([
        "reported",
        "triaged",
        "investigating",
        "mitigating",
        "resolved",
        "closed",
      ]);
    });
  });

  describe("getIncidentProgress", () => {
    it("returns 0 for reported (first state)", () => {
      expect(getIncidentProgress("reported")).toBe(0);
    });

    it("returns 20 for triaged (second state)", () => {
      expect(getIncidentProgress("triaged")).toBe(20);
    });

    it("returns 40 for investigating (third state)", () => {
      expect(getIncidentProgress("investigating")).toBe(40);
    });

    it("returns 60 for mitigating (fourth state)", () => {
      expect(getIncidentProgress("mitigating")).toBe(60);
    });

    it("returns 80 for resolved (fifth state)", () => {
      expect(getIncidentProgress("resolved")).toBe(80);
    });

    it("returns 100 for closed (last state)", () => {
      expect(getIncidentProgress("closed")).toBe(100);
    });

    it("returns 0 for unknown state (indexOf returns -1)", () => {
      expect(getIncidentProgress("unknown_state")).toBe(0);
    });

    it("returns 0 for empty string state", () => {
      expect(getIncidentProgress("")).toBe(0);
    });
  });
});
