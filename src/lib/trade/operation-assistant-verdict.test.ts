import { describe, it, expect } from "vitest";
import {
  deriveVerdict,
  type LineAssessment,
  type ScreeningAssessment,
} from "./operation-assistant-verdict";
import type { ClassificationResult } from "@/lib/trade/classification/classify-item";

function classification(over: {
  gate?: "CLEARED" | "REVIEW_NEEDED" | "BLOCKED";
  itarBlock?: boolean;
  embargoBlock?: boolean;
  annexIVBlock?: boolean;
  mtcrCatIBlock?: boolean;
  required?: boolean;
  deMinimisOutcome?: string | null;
}): ClassificationResult {
  return {
    triggerEval: {} as never, // deriveVerdict never reads triggerEval
    deMinimis:
      over.deMinimisOutcome == null
        ? null
        : ({
            outcome: over.deMinimisOutcome,
            appliedThresholdPercent: 25,
            usControlledContentPercent: 40,
            fdprFlag: false,
            riskLevel: "MEDIUM",
            reasons: [],
            recommendations: [],
            disclaimer: "",
          } as never),
    licenseDetermination: {
      requirements: over.required
        ? ([
            {
              jurisdiction: "DE",
              authority: "BAFA",
              status: "REQUIRED",
              licenseType: "BAFA_ANTRAG",
              reason: "9A515 to CN",
              recommendedAction: "BAFA-Antrag stellen",
            },
          ] as never)
        : [],
      gate: over.gate ?? "CLEARED",
      mtcrCatIBlock: over.mtcrCatIBlock ?? false,
      itarBlock: over.itarBlock ?? false,
      embargoBlock: over.embargoBlock ?? false,
      annexIVBlock: over.annexIVBlock ?? false,
      nextSteps: [],
      disclaimer: "",
    },
  };
}

function line(over: Partial<LineAssessment> = {}): LineAssessment {
  return {
    lineId: "l1",
    itemId: "i1",
    itemName: "Widget",
    classified: true,
    classification: classification({ gate: "CLEARED" }),
    ...over,
  };
}

const clearScreen: ScreeningAssessment = {
  status: "CLEAR",
  partyName: "Acme Space SAS",
  partyBlocked: false,
};

describe("deriveVerdict - screening staleness (M4)", () => {
  const now = new Date("2026-06-01T00:00:00Z");

  it("downgrades a CLEAR party screened > 30 days ago to a gap (REVIEW)", () => {
    const stale: ScreeningAssessment = {
      status: "CLEAR",
      partyName: "Acme Space SAS",
      partyBlocked: false,
      lastScreenedAt: new Date("2026-04-01T00:00:00Z"), // ~61 days before now
    };
    const result = deriveVerdict([line()], stale, now);
    const screen = result.steps.find((s) => s.step === "screen")!;
    expect(screen.status).toBe("gap");
    expect(screen.summary).toMatch(/veraltet/i);
    expect(result.verdict).toBe("REVIEW");
  });

  it("keeps a CLEAR party screened within 30 days as done (GO)", () => {
    const fresh: ScreeningAssessment = {
      status: "CLEAR",
      partyName: "Acme Space SAS",
      partyBlocked: false,
      lastScreenedAt: new Date("2026-05-20T00:00:00Z"), // ~12 days before now
    };
    const result = deriveVerdict([line()], fresh, now);
    const screen = result.steps.find((s) => s.step === "screen")!;
    expect(screen.status).toBe("done");
    expect(result.verdict).toBe("GO");
  });

  it("does not downgrade when lastScreenedAt is absent (freshness unknown)", () => {
    const result = deriveVerdict([line()], clearScreen, now);
    const screen = result.steps.find((s) => s.step === "screen")!;
    expect(screen.status).toBe("done");
    expect(result.verdict).toBe("GO");
  });
});

describe("deriveVerdict - green path", () => {
  it("GO only when every line is CLEARED and the party is fresh-CLEAR", () => {
    const r = deriveVerdict([line()], clearScreen);
    expect(r.verdict).toBe("GO");
    expect(r.pendenzen).toHaveLength(0);
    expect(r.steps.find((s) => s.step === "license")!.status).toBe("done");
  });
});

describe("deriveVerdict - blocked dominates", () => {
  it("BLOCKED when a line gate is BLOCKED", () => {
    const r = deriveVerdict(
      [
        line({
          classification: classification({ gate: "BLOCKED", itarBlock: true }),
        }),
      ],
      clearScreen,
    );
    expect(r.verdict).toBe("BLOCKED");
  });
  it("BLOCKED when the counterparty is a confirmed sanctions hit", () => {
    const r = deriveVerdict([line()], {
      ...clearScreen,
      status: "CONFIRMED_HIT",
    });
    expect(r.verdict).toBe("BLOCKED");
    expect(r.steps.find((s) => s.step === "screen")!.status).toBe("blocked");
  });
  it("BLOCKED when the counterparty record is BLOCKED", () => {
    const r = deriveVerdict([line()], { ...clearScreen, partyBlocked: true });
    expect(r.verdict).toBe("BLOCKED");
  });
  it("BLOCKED beats a green line", () => {
    const r = deriveVerdict(
      [
        line(),
        line({
          lineId: "l2",
          classification: classification({
            gate: "BLOCKED",
            embargoBlock: true,
          }),
        }),
      ],
      clearScreen,
    );
    expect(r.verdict).toBe("BLOCKED");
  });
});

describe("deriveVerdict - review for any gap (never a false green)", () => {
  it("REVIEW when a line is not yet classified", () => {
    const r = deriveVerdict(
      [line({ classified: false, classification: null })],
      clearScreen,
    );
    expect(r.verdict).toBe("REVIEW");
    expect(r.steps.find((s) => s.step === "classify")!.status).toBe("gap");
    expect(r.pendenzen.some((p) => /klassifiz/i.test(p.label))).toBe(true);
  });
  it("REVIEW when the counterparty is not screened", () => {
    const r = deriveVerdict([line()], {
      ...clearScreen,
      status: "NOT_SCREENED",
    });
    expect(r.verdict).toBe("REVIEW");
    expect(r.steps.find((s) => s.step === "screen")!.status).toBe("gap");
  });
  it("REVIEW when screening is stale", () => {
    expect(
      deriveVerdict([line()], { ...clearScreen, status: "STALE" }).verdict,
    ).toBe("REVIEW");
  });
  it("REVIEW (not BLOCKED) for a potential sanctions match", () => {
    const r = deriveVerdict([line()], {
      ...clearScreen,
      status: "POTENTIAL_MATCH",
    });
    expect(r.verdict).toBe("REVIEW");
    expect(r.steps.find((s) => s.step === "screen")!.status).toBe("gap");
  });
  it("REVIEW when a license is required", () => {
    const r = deriveVerdict(
      [
        line({
          classification: classification({
            gate: "REVIEW_NEEDED",
            required: true,
          }),
        }),
      ],
      clearScreen,
    );
    expect(r.verdict).toBe("REVIEW");
    expect(r.steps.find((s) => s.step === "license")!.status).toBe("gap");
    expect(r.steps.find((s) => s.step === "form")!.status).toBe("gap");
    expect(r.pendenzen.some((p) => /BAFA/i.test(p.label))).toBe(true);
  });
  it("REVIEW when de-minimis is exceeded without a hard block", () => {
    const r = deriveVerdict(
      [
        line({
          classification: classification({
            gate: "REVIEW_NEEDED",
            deMinimisOutcome: "DE_MINIMIS_EXCEEDED",
          }),
        }),
      ],
      clearScreen,
    );
    expect(r.verdict).toBe("REVIEW");
    expect(r.steps.find((s) => s.step === "jurisdiction")!.status).toBe("gap");
  });
});

describe("deriveVerdict - shape", () => {
  it("always emits exactly five steps in canonical order", () => {
    const r = deriveVerdict([line()], clearScreen);
    expect(r.steps.map((s) => s.step)).toEqual([
      "classify",
      "screen",
      "jurisdiction",
      "license",
      "form",
    ]);
  });
  it("produces a non-empty German headline for each verdict", () => {
    expect(
      deriveVerdict([line()], clearScreen).headline.length,
    ).toBeGreaterThan(0);
    expect(
      deriveVerdict(
        [line({ classification: classification({ gate: "BLOCKED" }) })],
        clearScreen,
      ).headline.length,
    ).toBeGreaterThan(0);
  });
});
