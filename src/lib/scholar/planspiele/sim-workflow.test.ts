import { describe, it, expect } from "vitest";
import { buildScholarWorkflow } from "./sim-workflow.server";
import { ASI_REENTRY } from "@/data/scholar/planspiele/asi-reentry";

describe("scholar planspiel workflow", () => {
  it("initial state is the first phase", () => {
    const wf = buildScholarWorkflow(ASI_REENTRY);
    expect(wf.getDefinition().initialState).toBe("authority");
  });

  it("advance is gated to the phase's advanceRequiresRole", async () => {
    const wf = buildScholarWorkflow(ASI_REENTRY);
    const okOperator = await wf.canTransition("authority", "advance", {
      actorRole: "operator",
      phaseComplete: true,
    });
    expect(okOperator).toBe(true);

    const okOther = await wf.canTransition("authority", "advance", {
      actorRole: "regulator",
      phaseComplete: true,
    });
    expect(okOther).toBe(false);
  });

  it("cannot advance until the phase artifact is complete", async () => {
    const wf = buildScholarWorkflow(ASI_REENTRY);
    const blocked = await wf.canTransition("authority", "advance", {
      actorRole: "operator",
      phaseComplete: false,
    });
    expect(blocked).toBe(false);
  });

  it("last phase advances into the terminal completed state", () => {
    const wf = buildScholarWorkflow(ASI_REENTRY);
    expect(wf.isTerminalState("completed")).toBe(true);
    expect(wf.getNextStates("deficiency")).toContain("completed");
  });

  it("every non-terminal phase exposes an advance + abandon transition", () => {
    const wf = buildScholarWorkflow(ASI_REENTRY);
    for (const phase of ASI_REENTRY.phases) {
      const events = wf
        .getAvailableTransitions(phase.phaseKey, {
          actorRole: "operator",
          phaseComplete: true,
        })
        .map((t) => t.event);
      expect(events).toContain("advance");
      expect(events).toContain("abandon");
    }
  });
});
