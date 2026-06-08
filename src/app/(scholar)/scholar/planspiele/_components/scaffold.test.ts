import { describe, it, expect } from "vitest";
import {
  derivePhaseObjective,
  deriveRequirements,
  countCitations,
  resolveRequirementLabel,
  SUBSTANCE_MIN_WORDS,
} from "./scaffold";
import { ASI_REENTRY } from "@/data/scholar/planspiele/asi-reentry";
import { NIS2_INCIDENT } from "@/data/scholar/planspiele/nis2-orbit-cyber-incident";
import type { ScholarPlanspielPhase } from "@/data/scholar/planspiele/types";

// Real phases by artifact kind, used so the tests track the live data contract.
const authorityPhase = ASI_REENTRY.phases.find(
  (p) => p.artifact.kind === "authority_choice",
)!; // ASI P1: select `authority` + text `justification`
const applicationPhase = ASI_REENTRY.phases.find(
  (p) => p.artifact.kind === "application_form",
)!; // ASI P2: 4 booleans + select `casualtyRisk`
const coverLetterPhase = ASI_REENTRY.phases.find(
  (p) => p.artifact.kind === "cover_letter",
)!; // ASI P3: minCitations 2
const deficiencyPhase = ASI_REENTRY.phases.find(
  (p) => p.artifact.kind === "deficiency_response",
)!; // ASI P4
// A mixed application_form (select timing fields + booleans) to prove the
// derivation is field-driven, not answer-key-driven.
const nis2NotificationPhase = NIS2_INCIDENT.phases.find(
  (p) => p.artifact.kind === "application_form",
)!;

/** Build a long-enough free-text answer to clear the substance threshold. */
function substantialText(): string {
  return Array.from({ length: SUBSTANCE_MIN_WORDS + 5 }, () => "word").join(
    " ",
  );
}

describe("countCitations (pure, mirrors sim-coach)", () => {
  it("counts distinct provision-like tokens and dedups", () => {
    expect(countCitations("Law 89/2025 and Article 11")).toBe(2);
    expect(countCitations("Article 5 and Article 5 again")).toBe(1);
    expect(countCitations("nothing here")).toBe(0);
  });
});

describe("derivePhaseObjective", () => {
  it("returns the phase title/brief keys and the rubric label keys (graded-on)", () => {
    const obj = derivePhaseObjective(authorityPhase);
    expect(obj.titleKey).toBe(authorityPhase.titleKey);
    expect(obj.briefKey).toBe(authorityPhase.briefKey);
    expect(obj.gradedOn).toEqual(authorityPhase.rubric.map((r) => r.labelKey));
  });

  it("preserves rubric order and includes BOTH engine and ai criteria", () => {
    const obj = derivePhaseObjective(applicationPhase);
    // ASI P2 rubric is [mandatory_modules(engine), casualty_threshold(engine)].
    expect(obj.gradedOn).toEqual(["asi.p2.r.modules", "asi.p2.r.casualty"]);
  });

  it("returns only keys — never resolved prose", () => {
    const obj = derivePhaseObjective(coverLetterPhase);
    // Keys are dotted ids, not human sentences.
    expect(obj.titleKey).toMatch(/^asi\./);
    obj.gradedOn.forEach((k) => expect(k).toMatch(/^asi\./));
  });
});

describe("deriveRequirements — authority_choice (presence of select)", () => {
  it("one row per boolean/select field; text fields excluded", () => {
    const items = deriveRequirements(authorityPhase, {});
    // ASI P1 has fields: authority(select) + justification(text). Only the
    // select becomes a requirement row.
    expect(items).toHaveLength(1);
    expect(items[0].fieldKey).toBe("authority");
    expect(items[0].fieldLabelKey).toBe("asi.p1.authority");
    expect(items[0].labelKey).toBe("play.req.fieldChosen");
    expect(items[0].met).toBe(false);
  });

  it("met once a choice is made — and PRESENCE, not correctness", () => {
    // "AGCOM" is the WRONG authority (answerKey expects "ASI"), yet a choice
    // was made, so the presence checklist must still report met=true.
    const items = deriveRequirements(authorityPhase, { authority: "AGCOM" });
    expect(items[0].met).toBe(true);
  });

  it("an empty / whitespace select value is NOT met", () => {
    expect(deriveRequirements(authorityPhase, { authority: "" })[0].met).toBe(
      false,
    );
    expect(
      deriveRequirements(authorityPhase, { authority: "   " })[0].met,
    ).toBe(false);
  });
});

describe("deriveRequirements — application_form (booleans + select)", () => {
  it("emits one row per boolean and per select, skipping any text field", () => {
    const items = deriveRequirements(applicationPhase, {});
    // ASI P2: insurance, debrisPlan, disposalPlan, cybersecurity (4 booleans)
    // + casualtyRisk (select) = 5 rows; no text field present.
    expect(items).toHaveLength(5);
    const keys = items.map((i) => i.fieldKey);
    expect(keys).toEqual([
      "insurance",
      "debrisPlan",
      "disposalPlan",
      "cybersecurity",
      "casualtyRisk",
    ]);
    // Booleans use fieldPresent label; the select uses fieldChosen label.
    const insurance = items.find((i) => i.fieldKey === "insurance")!;
    const casualty = items.find((i) => i.fieldKey === "casualtyRisk")!;
    expect(insurance.labelKey).toBe("play.req.fieldPresent");
    expect(casualty.labelKey).toBe("play.req.fieldChosen");
  });

  it("boolean met only when strictly true; select met when a band is chosen", () => {
    const items = deriveRequirements(applicationPhase, {
      insurance: true,
      debrisPlan: false,
      casualtyRisk: ">1e-5", // a WRONG band, but a band IS chosen → present
    });
    const byKey = Object.fromEntries(items.map((i) => [i.fieldKey, i.met]));
    expect(byKey.insurance).toBe(true);
    expect(byKey.debrisPlan).toBe(false);
    expect(byKey.disposalPlan).toBe(false); // absent
    expect(byKey.casualtyRisk).toBe(true); // presence-not-correctness
  });

  it("does not treat a truthy non-true value as a met boolean", () => {
    // Guards the `=== true` rule: a stray "yes"/1 must not mark a boolean met.
    const items = deriveRequirements(applicationPhase, {
      insurance: "yes",
      debrisPlan: 1,
    });
    const byKey = Object.fromEntries(items.map((i) => [i.fieldKey, i.met]));
    expect(byKey.insurance).toBe(false);
    expect(byKey.debrisPlan).toBe(false);
  });

  it("is field-driven, not answer-key-driven (mixed nis2 form)", () => {
    // nis2 P2 has select timing fields + booleans; every boolean/select field
    // yields a row regardless of whether it is referenced by an answerKey rule.
    const items = deriveRequirements(nis2NotificationPhase, {});
    const fieldKeys = (nis2NotificationPhase.artifact.fields ?? [])
      .filter((f) => f.type === "boolean" || f.type === "select")
      .map((f) => f.key);
    expect(items.map((i) => i.fieldKey)).toEqual(fieldKeys);
    expect(items.every((i) => i.met === false)).toBe(true);
  });
});

describe("deriveRequirements — cover_letter (citations k/N + substance)", () => {
  it("unmet when below the citation floor and too short", () => {
    const items = deriveRequirements(coverLetterPhase, { text: "" });
    expect(items).toHaveLength(2);
    const cited = items.find((i) => i.labelKey === "play.req.cited")!;
    const substance = items.find((i) => i.labelKey === "play.req.substance")!;
    // ASI P3 minCitations = 2.
    expect(cited.detail).toBe("0/2");
    expect(cited.met).toBe(false);
    expect(substance.met).toBe(false);
  });

  it("cited row reports the live k/N count and flips at the threshold", () => {
    const two = deriveRequirements(coverLetterPhase, {
      text: "Per Article 5 and Law 89/2025 we file.",
    }).find((i) => i.labelKey === "play.req.cited")!;
    expect(two.detail).toBe("2/2");
    expect(two.met).toBe(true);

    const one = deriveRequirements(coverLetterPhase, {
      text: "Per Article 5 only.",
    }).find((i) => i.labelKey === "play.req.cited")!;
    expect(one.detail).toBe("1/2");
    expect(one.met).toBe(false);
  });

  it("substance flips once the word count clears the threshold", () => {
    const substance = deriveRequirements(coverLetterPhase, {
      text: substantialText(),
    }).find((i) => i.labelKey === "play.req.substance")!;
    expect(substance.met).toBe(true);
  });

  it("checks PRESENCE not correctness — fabricated cites still count", () => {
    // The cite counter is a presence heuristic; it does not verify the cite is
    // real or relevant, so two invented provisions clear the citation floor of 2.
    const cited = deriveRequirements(coverLetterPhase, {
      text: "See Article 999 and Law 404/2099 (both invented).",
    }).find((i) => i.labelKey === "play.req.cited")!;
    expect(cited.detail).toBe("2/2");
    expect(cited.met).toBe(true);
  });
});

describe("deriveRequirements — deficiency_response (written + addresses)", () => {
  it("both unmet on empty input", () => {
    const items = deriveRequirements(deficiencyPhase, { text: "" });
    expect(items.map((i) => i.labelKey)).toEqual([
      "play.req.revision",
      "play.req.addresses",
    ]);
    expect(items.every((i) => i.met === false)).toBe(true);
  });

  it("'revision written' meets on any non-empty text; 'addresses' needs substance", () => {
    const short = deriveRequirements(deficiencyPhase, {
      text: "Fixed the disposal plan.",
    });
    const revision = short.find((i) => i.labelKey === "play.req.revision")!;
    const addresses = short.find((i) => i.labelKey === "play.req.addresses")!;
    expect(revision.met).toBe(true); // any words present
    expect(addresses.met).toBe(false); // below substance threshold
  });

  it("'addresses' meets once the revision has enough substance", () => {
    const addresses = deriveRequirements(deficiencyPhase, {
      text: substantialText(),
    }).find((i) => i.labelKey === "play.req.addresses")!;
    expect(addresses.met).toBe(true);
  });
});

describe("deriveRequirements — robustness", () => {
  it("never throws on a phase with no fields array", () => {
    const bare: ScholarPlanspielPhase = {
      ...authorityPhase,
      artifact: { kind: "application_form" }, // fields omitted
    };
    expect(deriveRequirements(bare, {})).toEqual([]);
  });

  it("ignores non-string free-text values defensively", () => {
    const items = deriveRequirements(coverLetterPhase, { text: 123 });
    expect(items.find((i) => i.labelKey === "play.req.cited")!.met).toBe(false);
  });
});

describe("resolveRequirementLabel — the {field}/{n} bridge", () => {
  it("the cited row exposes the citation floor as count (fills {n})", () => {
    const cited = deriveRequirements(coverLetterPhase, { text: "" }).find(
      (i) => i.labelKey === "play.req.cited",
    )!;
    expect(cited.count).toBe(2); // ASI P3 minCitations = 2
  });

  it("substitutes {field} from fieldLabelKey and {n} from count", () => {
    const label = resolveRequirementLabel(
      { labelKey: "K", met: false, fieldLabelKey: "F", count: 3 },
      (k) =>
        (({ K: "≥{n} for {field}", F: "citations" }) as Record<string, string>)[
          k
        ] ?? k,
    );
    expect(label).toBe("≥3 for citations");
  });
});
