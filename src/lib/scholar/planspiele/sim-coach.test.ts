import { describe, it, expect, beforeEach } from "vitest";
import { coachReviewArtifact, countCitations } from "./sim-coach.server";
import { ASI_REENTRY } from "@/data/scholar/planspiele/asi-reentry";

const phase3 = ASI_REENTRY.phases.find((p) => p.phaseKey === "cover_letter")!;

describe("Track-2 sim-coach no-key fallback", () => {
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("with NO api key, returns a deterministic rubric-checklist (zero external cost)", async () => {
    const out = await coachReviewArtifact({
      scenario: ASI_REENTRY,
      phase: phase3,
      artifactText:
        "We rely on Law 89/2025 and Article 11 for the disposal showing.",
    });
    expect(out.mode).toBe("fallback");
    const aiCrit = phase3.rubric.filter((r) => r.track === "ai");
    expect(out.lines).toHaveLength(aiCrit.length);
    expect(out.lines.every((l) => typeof l.earned === "number")).toBe(true);
  });

  it("fallback flags too-few citations on a cover_letter", async () => {
    const out = await coachReviewArtifact({
      scenario: ASI_REENTRY,
      phase: phase3,
      artifactText: "No citations here.",
    });
    const cites = out.lines.find((l) => l.category === "citation_accuracy")!;
    expect(cites.correct).toBe(false);
    expect(cites.earned).toBe(0);
  });

  it("fallback passes citation_accuracy when minCitations is met", async () => {
    const out = await coachReviewArtifact({
      scenario: ASI_REENTRY,
      phase: phase3,
      artifactText: "Per Law 89/2025 and Article 11, disposal is compliant.",
    });
    const cites = out.lines.find((l) => l.category === "citation_accuracy")!;
    expect(cites.correct).toBe(true);
  });
});

describe("countCitations", () => {
  it("counts distinct provision-like references", () => {
    expect(countCitations("Law 89/2025 and Article 11")).toBe(2);
    expect(countCitations("Article 5 and Article 5 again")).toBe(1); // dedup
    expect(countCitations("nothing here")).toBe(0);
  });
});
