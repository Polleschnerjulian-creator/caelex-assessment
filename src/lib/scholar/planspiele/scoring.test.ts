import { describe, it, expect } from "vitest";
import { scorePhaseEngine, rubricRatio } from "./scoring.server";
import { ASI_REENTRY } from "@/data/scholar/planspiele/asi-reentry";

const phase1 = ASI_REENTRY.phases.find((p) => p.phaseKey === "authority")!;
const phase2 = ASI_REENTRY.phases.find((p) => p.phaseKey === "application")!;

describe("Track-1 engine scoring", () => {
  it("awards the full weight when the right authority is chosen", () => {
    const lines = scorePhaseEngine(ASI_REENTRY, phase1, {
      authority: "ASI",
      justification: "x",
    });
    const authority = lines.find((l) => l.category === "authority_correct")!;
    expect(authority.earned).toBe(authority.weight);
    expect(authority.correct).toBe(true);
  });

  it("awards zero for the wrong authority", () => {
    const lines = scorePhaseEngine(ASI_REENTRY, phase1, {
      authority: "AGCOM",
      justification: "x",
    });
    const authority = lines.find((l) => l.category === "authority_correct")!;
    expect(authority.earned).toBe(0);
    expect(authority.correct).toBe(false);
  });

  it("gives partial credit for a partially-complete application", () => {
    const lines = scorePhaseEngine(ASI_REENTRY, phase2, {
      insurance: true,
      debrisPlan: true,
      disposalPlan: false,
      cybersecurity: false,
      casualtyRisk: "<1e-4",
    });
    const modules = lines.find((l) => l.category === "mandatory_modules")!;
    expect(modules.earned).toBeGreaterThan(0);
    expect(modules.earned).toBeLessThan(modules.weight);
    expect(modules.correct).toBe(false);
  });

  it("awards full module credit + correct casualty threshold for a complete application", () => {
    const lines = scorePhaseEngine(ASI_REENTRY, phase2, {
      insurance: true,
      debrisPlan: true,
      disposalPlan: true,
      cybersecurity: true,
      casualtyRisk: "<1e-4",
    });
    const modules = lines.find((l) => l.category === "mandatory_modules")!;
    const casualty = lines.find((l) => l.category === "casualty_threshold")!;
    expect(modules.earned).toBe(modules.weight);
    expect(casualty.correct).toBe(true);
    expect(rubricRatio(lines)).toBe(1);
  });

  it("only scores criteria whose track === 'engine'", () => {
    const lines = scorePhaseEngine(ASI_REENTRY, phase1, {
      authority: "ASI",
      justification: "x",
    });
    expect(
      lines.every(
        (l) =>
          phase1.rubric.find((r) => r.key === l.category)?.track === "engine",
      ),
    ).toBe(true);
  });
});
