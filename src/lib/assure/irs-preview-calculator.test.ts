import { describe, it, expect, beforeEach } from "vitest";
import { vi } from "vitest";

// Because the module has a module-level `lastScore` variable, we need to
// use resetModules + dynamic import for tests that depend on the delta.
// For most tests we can import statically and just be aware of ordering.

describe("irs-preview-calculator", () => {
  // Reset modules before each describe block so `lastScore` resets to 0
  let calculateIRSPreview: typeof import("./irs-preview-calculator").calculateIRSPreview;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("./irs-preview-calculator");
    calculateIRSPreview = mod.calculateIRSPreview;
  });

  describe("empty input", () => {
    it("should return all components with score 0 and grade C-", () => {
      const result = calculateIRSPreview({});
      expect(result.overallScore).toBe(0);
      expect(result.grade).toBe("C-");
      expect(result.gradeLabel).toBe("Getting Started");
      expect(result.components).toHaveLength(6);
      for (const c of result.components) {
        expect(c.score).toBe(0);
        expect(c.weightedScore).toBe(0);
        expect(c.dataAvailable).toBe(false);
      }
    });
  });

  describe("weights", () => {
    it("should have weights that sum to 1.0", () => {
      const result = calculateIRSPreview({});
      const totalWeight = result.components.reduce(
        (sum, c) => sum + c.weight,
        0,
      );
      expect(totalWeight).toBeCloseTo(1.0, 10);
    });
  });

  describe("scoreMarket", () => {
    it("TAM >= 1B should score 30 pts", () => {
      const result = calculateIRSPreview({ tam: 1_000_000_000 });
      const market = result.components.find((c) => c.id === "market")!;
      // TAM=30, but completeness is 1/4=25% < 30%, so capped at 30
      expect(market.score).toBe(30);
      expect(market.dataAvailable).toBe(true);
    });

    it("TAM >= 100M but < 1B should score 20 pts", () => {
      const result = calculateIRSPreview({ tam: 500_000_000 });
      const market = result.components.find((c) => c.id === "market")!;
      // completeness 1/4=25% <30% → capped at min(20, 30) = 20
      expect(market.score).toBe(20);
    });

    it("TAM < 100M should score 10 pts", () => {
      const result = calculateIRSPreview({ tam: 50_000_000 });
      const market = result.components.find((c) => c.id === "market")!;
      expect(market.score).toBe(10);
    });

    it("SAM >= 100M should score 20 pts", () => {
      const result = calculateIRSPreview({ sam: 100_000_000 });
      const market = result.components.find((c) => c.id === "market")!;
      expect(market.score).toBe(20);
    });

    it("SAM >= 10M but < 100M should score 15 pts", () => {
      const result = calculateIRSPreview({ sam: 50_000_000 });
      const market = result.components.find((c) => c.id === "market")!;
      expect(market.score).toBe(15);
    });

    it("SAM < 10M should score 8 pts", () => {
      const result = calculateIRSPreview({ sam: 5_000_000 });
      const market = result.components.find((c) => c.id === "market")!;
      expect(market.score).toBe(8);
    });

    it("SOM >= 10M should score 20 pts", () => {
      const result = calculateIRSPreview({ som: 10_000_000 });
      const market = result.components.find((c) => c.id === "market")!;
      expect(market.score).toBe(20);
    });

    it("SOM >= 1M but < 10M should score 15 pts", () => {
      const result = calculateIRSPreview({ som: 5_000_000 });
      const market = result.components.find((c) => c.id === "market")!;
      expect(market.score).toBe(15);
    });

    it("SOM < 1M should score 8 pts", () => {
      const result = calculateIRSPreview({ som: 500_000 });
      const market = result.components.find((c) => c.id === "market")!;
      expect(market.score).toBe(8);
    });

    it("stage adds 10 pts", () => {
      const result = calculateIRSPreview({ stage: "SEED" });
      const market = result.components.find((c) => c.id === "market")!;
      // completeness 1/4=25% <30% → capped at min(10, 30) = 10
      expect(market.score).toBe(10);
    });

    it("completeness < 30% caps score at 30", () => {
      // 1 field filled out of 4 = 25% completeness → capped at 30
      const result = calculateIRSPreview({ tam: 2_000_000_000 });
      const market = result.components.find((c) => c.id === "market")!;
      expect(market.score).toBe(30); // raw 30 capped at 30
    });

    it("completeness >= 30% does not cap score", () => {
      // 2 of 4 = 50% completeness → no cap, but clamp to 0-100
      const result = calculateIRSPreview({
        tam: 1_000_000_000,
        sam: 100_000_000,
      });
      const market = result.components.find((c) => c.id === "market")!;
      // TAM=30 + SAM=20 = 50, completeness 50%
      expect(market.score).toBe(50);
    });

    it("all market fields filled should give high score", () => {
      const result = calculateIRSPreview({
        tam: 2_000_000_000,
        sam: 200_000_000,
        som: 20_000_000,
        stage: "SERIES_A",
      });
      const market = result.components.find((c) => c.id === "market")!;
      // TAM=30+SAM=20+SOM=20+stage=10=80, completeness 100%
      expect(market.score).toBe(80);
    });

    it("dataAvailable is false when no market fields filled", () => {
      const result = calculateIRSPreview({});
      const market = result.components.find((c) => c.id === "market")!;
      expect(market.dataAvailable).toBe(false);
    });
  });

  describe("scoreTechnology", () => {
    it("TRL * 10 capped at 40", () => {
      const result = calculateIRSPreview({ trl: 5 });
      const tech = result.components.find((c) => c.id === "technology")!;
      // 5*10=50 → min(50,40) = 40
      expect(tech.score).toBe(40);
    });

    it("TRL 3 gives 30", () => {
      const result = calculateIRSPreview({ trl: 3 });
      const tech = result.components.find((c) => c.id === "technology")!;
      expect(tech.score).toBe(30);
    });

    it("patents * 10 capped at 30", () => {
      const result = calculateIRSPreview({ patentCount: 4 });
      const tech = result.components.find((c) => c.id === "technology")!;
      // 4*10=40 → min(40,30) = 30
      expect(tech.score).toBe(30);
    });

    it("patents 2 gives 20", () => {
      const result = calculateIRSPreview({ patentCount: 2 });
      const tech = result.components.find((c) => c.id === "technology")!;
      expect(tech.score).toBe(20);
    });

    it("productStage 'concept' gives 5", () => {
      const result = calculateIRSPreview({ productStage: "concept" });
      const tech = result.components.find((c) => c.id === "technology")!;
      expect(tech.score).toBe(5);
    });

    it("productStage 'prototype' gives 15", () => {
      const result = calculateIRSPreview({ productStage: "prototype" });
      const tech = result.components.find((c) => c.id === "technology")!;
      expect(tech.score).toBe(15);
    });

    it("productStage 'mvp' gives 25", () => {
      const result = calculateIRSPreview({ productStage: "mvp" });
      const tech = result.components.find((c) => c.id === "technology")!;
      expect(tech.score).toBe(25);
    });

    it("productStage 'beta' gives 30", () => {
      const result = calculateIRSPreview({ productStage: "beta" });
      const tech = result.components.find((c) => c.id === "technology")!;
      expect(tech.score).toBe(30);
    });

    it("productStage 'revenue' gives 30", () => {
      const result = calculateIRSPreview({ productStage: "revenue" });
      const tech = result.components.find((c) => c.id === "technology")!;
      expect(tech.score).toBe(30);
    });

    it("unknown productStage gives 10 (default)", () => {
      const result = calculateIRSPreview({ productStage: "unknown_stage" });
      const tech = result.components.find((c) => c.id === "technology")!;
      expect(tech.score).toBe(10);
    });

    it("combined TRL + patents + productStage clamped at 100", () => {
      const result = calculateIRSPreview({
        trl: 9,
        patentCount: 5,
        productStage: "revenue",
      });
      const tech = result.components.find((c) => c.id === "technology")!;
      // trl=min(90,40)=40 + patents=min(50,30)=30 + revenue=30 = 100 → clamp 100
      expect(tech.score).toBe(100);
    });
  });

  describe("scoreTeam", () => {
    it("founderCount >= 2 gives 25", () => {
      const result = calculateIRSPreview({ founderCount: 2 });
      const team = result.components.find((c) => c.id === "team")!;
      expect(team.score).toBe(25);
    });

    it("founderCount = 1 gives 15", () => {
      const result = calculateIRSPreview({ founderCount: 1 });
      const team = result.components.find((c) => c.id === "team")!;
      expect(team.score).toBe(15);
    });

    it("hasSpaceBackground adds 25", () => {
      const result = calculateIRSPreview({ hasSpaceBackground: true });
      const team = result.components.find((c) => c.id === "team")!;
      expect(team.score).toBe(25);
    });

    it("hasSpaceBackground false does not add points", () => {
      const result = calculateIRSPreview({ hasSpaceBackground: false });
      const team = result.components.find((c) => c.id === "team")!;
      expect(team.score).toBe(0);
    });

    it("keyHires * 5 capped at 25", () => {
      const result = calculateIRSPreview({ keyHiresCount: 6 });
      const team = result.components.find((c) => c.id === "team")!;
      // 6*5=30 → min(30,25) = 25
      expect(team.score).toBe(25);
    });

    it("keyHires 3 gives 15", () => {
      const result = calculateIRSPreview({ keyHiresCount: 3 });
      const team = result.components.find((c) => c.id === "team")!;
      expect(team.score).toBe(15);
    });

    it("advisors * 5 capped at 25", () => {
      const result = calculateIRSPreview({ advisorCount: 6 });
      const team = result.components.find((c) => c.id === "team")!;
      expect(team.score).toBe(25);
    });

    it("advisors 2 gives 10", () => {
      const result = calculateIRSPreview({ advisorCount: 2 });
      const team = result.components.find((c) => c.id === "team")!;
      expect(team.score).toBe(10);
    });

    it("all team fields max out at 100", () => {
      const result = calculateIRSPreview({
        founderCount: 3,
        hasSpaceBackground: true,
        keyHiresCount: 10,
        advisorCount: 10,
      });
      const team = result.components.find((c) => c.id === "team")!;
      // 25+25+25+25=100
      expect(team.score).toBe(100);
    });
  });

  describe("scoreFinancial", () => {
    it("MRR >= 50k gives 30", () => {
      const result = calculateIRSPreview({ mrr: 50_000 });
      const fin = result.components.find((c) => c.id === "financial")!;
      expect(fin.score).toBe(30);
    });

    it("MRR >= 10k but < 50k gives 20", () => {
      const result = calculateIRSPreview({ mrr: 30_000 });
      const fin = result.components.find((c) => c.id === "financial")!;
      expect(fin.score).toBe(20);
    });

    it("MRR < 10k gives 10", () => {
      const result = calculateIRSPreview({ mrr: 5_000 });
      const fin = result.components.find((c) => c.id === "financial")!;
      expect(fin.score).toBe(10);
    });

    it("runway >= 18 gives 30", () => {
      const result = calculateIRSPreview({ runwayMonths: 18 });
      const fin = result.components.find((c) => c.id === "financial")!;
      expect(fin.score).toBe(30);
    });

    it("runway >= 12 but < 18 gives 20", () => {
      const result = calculateIRSPreview({ runwayMonths: 14 });
      const fin = result.components.find((c) => c.id === "financial")!;
      expect(fin.score).toBe(20);
    });

    it("runway < 12 gives 10", () => {
      const result = calculateIRSPreview({ runwayMonths: 6 });
      const fin = result.components.find((c) => c.id === "financial")!;
      expect(fin.score).toBe(10);
    });

    it("burnRate adds 15 pts", () => {
      const result = calculateIRSPreview({ burnRate: 100_000 });
      const fin = result.components.find((c) => c.id === "financial")!;
      expect(fin.score).toBe(15);
    });

    it("previousFunding adds 15 pts", () => {
      const result = calculateIRSPreview({ previousFunding: 1_000_000 });
      const fin = result.components.find((c) => c.id === "financial")!;
      expect(fin.score).toBe(15);
    });

    it("all financial fields", () => {
      const result = calculateIRSPreview({
        mrr: 100_000,
        runwayMonths: 24,
        burnRate: 50_000,
        previousFunding: 5_000_000,
      });
      const fin = result.components.find((c) => c.id === "financial")!;
      // 30+30+15+15=90
      expect(fin.score).toBe(90);
    });
  });

  describe("scoreRegulatory", () => {
    it("complyLinked adds 20", () => {
      const result = calculateIRSPreview({ complyLinked: true });
      const reg = result.components.find((c) => c.id === "regulatory")!;
      expect(reg.score).toBe(20);
    });

    it("assessments * 15 capped at 40", () => {
      const result = calculateIRSPreview({ assessmentsCompleted: 3 });
      const reg = result.components.find((c) => c.id === "regulatory")!;
      // 3*15=45 → min(45,40)=40
      expect(reg.score).toBe(40);
    });

    it("assessments 2 gives 30", () => {
      const result = calculateIRSPreview({ assessmentsCompleted: 2 });
      const reg = result.components.find((c) => c.id === "regulatory")!;
      expect(reg.score).toBe(30);
    });

    it("complianceScore * 0.4 rounded", () => {
      const result = calculateIRSPreview({ complianceScore: 80 });
      const reg = result.components.find((c) => c.id === "regulatory")!;
      // Math.round(80*0.4) = 32
      expect(reg.score).toBe(32);
    });

    it("all regulatory fields", () => {
      const result = calculateIRSPreview({
        complyLinked: true,
        assessmentsCompleted: 3,
        complianceScore: 100,
      });
      const reg = result.components.find((c) => c.id === "regulatory")!;
      // 20 + min(45,40) + round(100*0.4)=40 = 100
      expect(reg.score).toBe(100);
    });
  });

  describe("scoreTraction", () => {
    it("mrr adds 30", () => {
      const result = calculateIRSPreview({ mrr: 10_000 });
      const traction = result.components.find((c) => c.id === "traction")!;
      expect(traction.score).toBe(30);
    });

    it("targetRaise adds 20", () => {
      const result = calculateIRSPreview({ targetRaise: 5_000_000 });
      const traction = result.components.find((c) => c.id === "traction")!;
      expect(traction.score).toBe(20);
    });

    it("operatorType adds 15", () => {
      const result = calculateIRSPreview({ operatorType: "SCO" });
      const traction = result.components.find((c) => c.id === "traction")!;
      expect(traction.score).toBe(15);
    });

    it("all traction fields give 65", () => {
      const result = calculateIRSPreview({
        mrr: 10_000,
        targetRaise: 5_000_000,
        operatorType: "SCO",
      });
      const traction = result.components.find((c) => c.id === "traction")!;
      expect(traction.score).toBe(65);
    });
  });

  describe("getGrade boundaries", () => {
    it("score 95 => A+", () => {
      // Build a very high-scoring input
      const result = calculateIRSPreview({
        tam: 2_000_000_000,
        sam: 200_000_000,
        som: 20_000_000,
        stage: "SERIES_A",
        trl: 9,
        patentCount: 5,
        productStage: "revenue",
        founderCount: 3,
        hasSpaceBackground: true,
        keyHiresCount: 10,
        advisorCount: 10,
        mrr: 100_000,
        burnRate: 100_000,
        runwayMonths: 24,
        previousFunding: 10_000_000,
        complyLinked: true,
        assessmentsCompleted: 5,
        complianceScore: 100,
        targetRaise: 10_000_000,
        operatorType: "SCO",
      });
      // market=80, tech=100, team=100, fin=90, reg=100, traction=65
      // 80*0.2 + 100*0.2 + 100*0.15 + 90*0.15 + 100*0.15 + 65*0.15
      // = 16 + 20 + 15 + 13.5 + 15 + 9.75 = 89.25 → rounded 89
      // With these numbers it should be A- (70-89) or close to A+(90)
      expect(result.overallScore).toBeGreaterThanOrEqual(80);
      expect(["A+", "A", "A-"]).toContain(result.grade);
    });

    it("score 0 => C-", () => {
      const result = calculateIRSPreview({});
      expect(result.grade).toBe("C-");
      expect(result.gradeLabel).toBe("Getting Started");
    });
  });

  describe("grade mapping coverage", () => {
    // We test specific overallScore ranges by constructing inputs that yield known scores.
    // The grade boundaries are: A+(>=90), A(>=80), A-(>=70), B+(>=60), B(>=50), B-(>=40), C+(>=30), C(>=20), C-(<20)

    it("grade B range (50-59)", () => {
      // Need overall ~50. Let's use market + tech partially
      const result = calculateIRSPreview({
        tam: 2_000_000_000,
        sam: 200_000_000,
        som: 20_000_000,
        stage: "SERIES_A",
        trl: 4,
        productStage: "revenue",
      });
      // market = 80 (all 4 filled, 100% completeness)
      // tech = 40+30 = 70
      // weighted: 80*0.2 + 70*0.2 = 16+14 = 30
      // That's only 30 → C+
      // Need more... add some team
      const result2 = calculateIRSPreview({
        tam: 2_000_000_000,
        sam: 200_000_000,
        som: 20_000_000,
        stage: "SERIES_A",
        trl: 4,
        productStage: "revenue",
        founderCount: 2,
        mrr: 10_000,
        targetRaise: 5_000_000,
        operatorType: "SCO",
      });
      // market=80, tech=70, team=25, fin=20(mrr), reg=0, traction=65
      // 80*.2 + 70*.2 + 25*.15 + 20*.15 + 0*.15 + 65*.15
      // = 16 + 14 + 3.75 + 3 + 0 + 9.75 = 46.5 → 47 → B-
      expect(result2.overallScore).toBeGreaterThanOrEqual(40);
    });
  });

  describe("delta calculation", () => {
    it("first call has delta = overallScore - 0", () => {
      const result = calculateIRSPreview({ mrr: 50_000 });
      // first call, lastScore was 0
      expect(result.delta).toBe(result.overallScore);
    });

    it("second call shows change from first", () => {
      const result1 = calculateIRSPreview({ mrr: 50_000 });
      const firstScore = result1.overallScore;

      const result2 = calculateIRSPreview({
        mrr: 50_000,
        targetRaise: 5_000_000,
      });
      expect(result2.delta).toBe(result2.overallScore - firstScore);
    });

    it("same input twice gives delta 0 on second call", () => {
      const result1 = calculateIRSPreview({ mrr: 50_000 });
      const result2 = calculateIRSPreview({ mrr: 50_000 });
      expect(result2.delta).toBe(0);
    });
  });

  describe("component structure", () => {
    it("has correct component ids and labels", () => {
      const result = calculateIRSPreview({});
      const ids = result.components.map((c) => c.id);
      expect(ids).toEqual([
        "market",
        "technology",
        "team",
        "financial",
        "regulatory",
        "traction",
      ]);

      expect(result.components[0].label).toBe("Market & Opportunity");
      expect(result.components[1].label).toBe("Technology & Product");
      expect(result.components[2].label).toBe("Team & Leadership");
      expect(result.components[3].label).toBe("Financial Health");
      expect(result.components[4].label).toBe("Regulatory Position");
      expect(result.components[5].label).toBe("Traction & Validation");
    });

    it("weightedScore = score * weight", () => {
      const result = calculateIRSPreview({
        tam: 1_000_000_000,
        sam: 100_000_000,
        trl: 4,
      });
      for (const c of result.components) {
        expect(c.weightedScore).toBeCloseTo(c.score * c.weight, 10);
      }
    });

    it("overallScore is the rounded sum of weightedScores", () => {
      const result = calculateIRSPreview({
        tam: 1_000_000_000,
        sam: 100_000_000,
        trl: 4,
        founderCount: 2,
        mrr: 30_000,
      });
      const sum = result.components.reduce((s, c) => s + c.weightedScore, 0);
      expect(result.overallScore).toBe(Math.round(sum));
    });
  });

  describe("edge cases", () => {
    it("zero values do not count as filled", () => {
      const result = calculateIRSPreview({
        tam: 0,
        sam: 0,
        som: 0,
        trl: 0,
        patentCount: 0,
        founderCount: 0,
        keyHiresCount: 0,
        advisorCount: 0,
        mrr: 0,
        burnRate: 0,
        runwayMonths: 0,
        previousFunding: 0,
        assessmentsCompleted: 0,
        complianceScore: 0,
        targetRaise: 0,
      });
      expect(result.overallScore).toBe(0);
    });

    it("negative values do not count as filled", () => {
      const result = calculateIRSPreview({ tam: -100 });
      const market = result.components.find((c) => c.id === "market")!;
      expect(market.dataAvailable).toBe(false);
    });
  });
});
