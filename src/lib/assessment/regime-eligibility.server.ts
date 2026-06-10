/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * SERVER-ONLY Light-Regime Eligibility — Ultimate Assessment spine (Task 1.8).
 *
 * Replaces the legacy one-liner (`entitySize === "small" || "research"`,
 * engine.server.ts) with a REAL COM(2025) 335 Art. 10 eligibility check:
 *
 *   Prong A — research/educational institution (Q1.4 org type): eligible.
 *   Prong B — SMALL enterprise per Commission Recommendation 2003/361/EC:
 *     headcount < 50 AND (turnover ≤ €10M OR balance-sheet total ≤ €10M),
 *     INCLUDING linked-enterprise/group aggregation (Annex Art. 3) — the
 *     "30-person Airbus subsidiary self-declares small" hole is closed.
 *
 * Output is three-valued, never a silent boolean:
 *   eligible               — every input in the chain answered + qualifying.
 *   likely_eligible_verify — direction is light, but a decisive or
 *                            confidence-relevant input is unsure/unasked
 *                            (group structure, group bands, any size band).
 *                            §7.3 trim: in the QUICK tier the group question
 *                            is not asked, so a small entity gets
 *                            "regime direction pending group verification"
 *                            — NEVER a silent eligible.
 *   not_eligible           — an ANSWERED input disqualifies (headcount ≥ 50
 *                            own or aggregated, or both financial legs
 *                            exceeded). Aggregation only ever enlarges, so a
 *                            determined disqualification stands even when
 *                            other inputs are unsure (monotonic: unknowns
 *                            never improve the verdict — invariant 2).
 *
 * Question ids and option values are the plan-pinned graph contract
 * (Tasks 1.5/1.8): `q1_4_org_type`, `q1_5_headcount`, `q1_5_turnover`,
 * `q1_6_balance_sheet` (bs_le_10m | bs_le_43m | bs_gt_43m),
 * `q1_7_group` (yes | no, tier "full"), `q1_7_group_headcount`,
 * `q1_7_group_turnover` (same band values as the own-entity questions).
 *
 * PROPRIETARY AND CONFIDENTIAL
 */

import "server-only";

import type { AnswerMap } from "@/lib/assessment/answers";
import {
  determinedFinding,
  type AssessmentFinding,
  type FindingSource,
} from "@/lib/assessment/finding";

// ─── Question ids (plan-pinned graph contract) ──────────────────────────────

const Q_ORG_TYPE = "q1_4_org_type";
const Q_HEADCOUNT = "q1_5_headcount";
const Q_TURNOVER = "q1_5_turnover";
const Q_BALANCE = "q1_6_balance_sheet";
const Q_GROUP = "q1_7_group";
const Q_GROUP_HEADCOUNT = "q1_7_group_headcount";
const Q_GROUP_TURNOVER = "q1_7_group_turnover";

// ─── Sources ────────────────────────────────────────────────────────────────

const ART_10_SOURCE: FindingSource = {
  label: "EU Space Act proposal — Commission text",
  citation: "COM(2025) 335 Art. 10 (light regimes)",
  asOf: "2025-06-25",
  verified: true,
};

const SME_DEFINITION_SOURCE: FindingSource = {
  label: "Commission Recommendation 2003/361/EC",
  citation: "Annex Art. 2 (size ceilings), Art. 3 (linked enterprises)",
  asOf: "2003-05-06",
  verified: true,
};

// ─── Public contract (plan Task 1.8) ────────────────────────────────────────

export type RegimeEligibility =
  | "eligible"
  | "likely_eligible_verify"
  | "not_eligible";

export interface RegimeResult {
  eligibility: RegimeEligibility;
  reasoning: { step: string; basis: string }[]; // the shown reasoning chain (§5 stage 3)
  finding: AssessmentFinding<RegimeEligibility>;
}

// ─── Internal three-valued band reading ─────────────────────────────────────

type BandReading = "small" | "exceeds" | "unknown";

/** Read an answer's value; "unknown" covers unsure / not_asked / missing. */
function readBand(
  answers: AnswerMap,
  id: string,
  smallValues: readonly string[],
  exceedsValues: readonly string[],
): BandReading {
  const a = answers[id];
  if (a?.state !== "answered") return "unknown";
  const v = String(a.value);
  if (smallValues.includes(v)) return "small";
  if (exceedsValues.includes(v)) return "exceeds";
  return "unknown";
}

const HEADCOUNT_SMALL = ["h_1_9", "h_10_49"] as const;
const HEADCOUNT_EXCEEDS = ["h_50_249", "h_250_plus"] as const;
const TURNOVER_SMALL = ["t_lt_2m", "t_2_10m"] as const;
const TURNOVER_EXCEEDS = ["t_10_50m", "t_gt_50m"] as const;
const BALANCE_SMALL = ["bs_le_10m"] as const;
const BALANCE_EXCEEDS = ["bs_le_43m", "bs_gt_43m"] as const;

function answeredLabel(answers: AnswerMap, id: string): string {
  const a = answers[id];
  if (!a) return "Not answered";
  if (a.state === "unsure") return "I'm not sure";
  if (a.state === "not_asked") return "Not asked";
  return String(a.value);
}

// ─── Implementation ─────────────────────────────────────────────────────────

export function determineLightRegime(
  answers: AnswerMap,
  tier: "quick" | "full",
  rulebookVersion: string,
): RegimeResult {
  const reasoning: { step: string; basis: string }[] = [];
  const verifyNotes: string[] = [];

  // ── Prong A: research/educational institution (Art. 10) ─────────────────
  const orgType = answers[Q_ORG_TYPE];
  if (orgType?.state === "answered" && orgType.value === "research_edu") {
    reasoning.push({
      step: "Organisation type: research or educational institution — light-regime prong satisfied without a size test.",
      basis: "COM(2025) 335 Art. 10 (research/educational institutions)",
    });
    return buildResult(
      "eligible",
      reasoning,
      verifyNotes,
      answers,
      rulebookVersion,
    );
  }
  reasoning.push({
    step: `Organisation type: ${answeredLabel(answers, Q_ORG_TYPE)} — research/educational prong not applicable; testing the small-enterprise prong.`,
    basis: "COM(2025) 335 Art. 10",
  });

  // ── Prong B: SMALL enterprise per Rec. 2003/361 with group aggregation ──

  // Own-entity headcount (mandatory leg — no alternative).
  const ownHeadcount = readBand(
    answers,
    Q_HEADCOUNT,
    HEADCOUNT_SMALL,
    HEADCOUNT_EXCEEDS,
  );
  if (ownHeadcount === "exceeds") {
    reasoning.push({
      step: `Headcount band ${answeredLabel(answers, Q_HEADCOUNT)} — at or above the 50-headcount small-enterprise ceiling. Not eligible; group aggregation could only enlarge the figures.`,
      basis: "Rec. 2003/361/EC Annex Art. 2(2)",
    });
    return buildResult(
      "not_eligible",
      reasoning,
      verifyNotes,
      answers,
      rulebookVersion,
    );
  }
  if (ownHeadcount === "small") {
    reasoning.push({
      step: `Headcount band ${answeredLabel(answers, Q_HEADCOUNT)} — below the 50-headcount small-enterprise ceiling.`,
      basis: "Rec. 2003/361/EC Annex Art. 2(2)",
    });
  } else {
    reasoning.push({
      step: "Headcount band unknown — small-enterprise status cannot be confirmed without it.",
      basis: "Rec. 2003/361/EC Annex Art. 2(2)",
    });
    verifyNotes.push("confirm headcount band");
  }

  // Own-entity financial legs (turnover OR balance sheet, three-valued).
  const ownTurnover = readBand(
    answers,
    Q_TURNOVER,
    TURNOVER_SMALL,
    TURNOVER_EXCEEDS,
  );
  const ownBalance = readBand(
    answers,
    Q_BALANCE,
    BALANCE_SMALL,
    BALANCE_EXCEEDS,
  );

  if (ownTurnover === "exceeds" && ownBalance === "exceeds") {
    reasoning.push({
      step: "Both financial legs exceeded: turnover above €10M AND balance-sheet total above €10M — the small-enterprise financial ceiling fails on both alternatives.",
      basis: "Rec. 2003/361/EC Annex Art. 2(2)",
    });
    return buildResult(
      "not_eligible",
      reasoning,
      verifyNotes,
      answers,
      rulebookVersion,
    );
  }
  if (ownTurnover === "small" || ownBalance === "small") {
    reasoning.push({
      step:
        ownTurnover === "small"
          ? `Turnover band ${answeredLabel(answers, Q_TURNOVER)} — within the €10M small-enterprise ceiling.`
          : `Balance-sheet band ${answeredLabel(answers, Q_BALANCE)} — within the €10M small-enterprise ceiling (turnover alternative).`,
      basis: "Rec. 2003/361/EC Annex Art. 2(2)",
    });
  }
  // §7.1 #4 / plan Task 1.8: ANY unsure among the size inputs lowers
  // confidence — bands are self-declared, so an unsure turnover or balance
  // sheet always downgrades to verify (never a silent eligible), even when
  // the other financial leg is answered small.
  if (ownTurnover === "unknown") verifyNotes.push("confirm turnover band");
  if (ownBalance === "unknown") verifyNotes.push("confirm balance-sheet band");
  if (ownTurnover === "unknown" && ownBalance === "unknown") {
    reasoning.push({
      step: "Neither financial leg (turnover / balance sheet) is confirmed — the financial ceiling cannot be tested.",
      basis: "Rec. 2003/361/EC Annex Art. 2(2)",
    });
  } else if (ownTurnover === "unknown" || ownBalance === "unknown") {
    reasoning.push({
      step: "One financial input is unconfirmed — eligibility direction holds but requires verification (conservative reading: unknowns never improve the verdict).",
      basis: "Rec. 2003/361/EC Annex Art. 2(2)",
    });
  }

  // ── Group / linked-enterprise aggregation (Rec. 2003/361 Annex Art. 3) ──
  const group = answers[Q_GROUP];

  if (group?.state === "answered" && group.value === "yes") {
    const groupHeadcount = readBand(
      answers,
      Q_GROUP_HEADCOUNT,
      HEADCOUNT_SMALL,
      HEADCOUNT_EXCEEDS,
    );
    const groupTurnover = readBand(
      answers,
      Q_GROUP_TURNOVER,
      TURNOVER_SMALL,
      TURNOVER_EXCEEDS,
    );

    if (groupHeadcount === "exceeds") {
      reasoning.push({
        step: `Part of a group with aggregated headcount band ${answeredLabel(answers, Q_GROUP_HEADCOUNT)} — linked-enterprise aggregation puts the entity at or above the 50-headcount ceiling. Not eligible.`,
        basis: "Rec. 2003/361/EC Annex Art. 3 (linked enterprises) + Art. 2(2)",
      });
      return buildResult(
        "not_eligible",
        reasoning,
        verifyNotes,
        answers,
        rulebookVersion,
      );
    }
    if (groupHeadcount === "small") {
      reasoning.push({
        step: `Group (aggregated) headcount band ${answeredLabel(answers, Q_GROUP_HEADCOUNT)} — below the 50-headcount ceiling after aggregation.`,
        basis: "Rec. 2003/361/EC Annex Art. 3",
      });
    } else {
      verifyNotes.push("confirm aggregated group headcount");
    }

    if (groupTurnover === "small") {
      reasoning.push({
        step: `Group (aggregated) turnover band ${answeredLabel(answers, Q_GROUP_TURNOVER)} — within the €10M ceiling after aggregation.`,
        basis: "Rec. 2003/361/EC Annex Art. 3",
      });
    } else if (groupTurnover === "exceeds") {
      // Aggregated turnover exceeds €10M; the balance-sheet alternative is
      // not collected at group level, so this cannot determine NOT-eligible
      // on its own — it downgrades to verify (honest, not fabricated).
      reasoning.push({
        step: `Group (aggregated) turnover band ${answeredLabel(answers, Q_GROUP_TURNOVER)} — above the €10M ceiling; the group balance-sheet alternative is not collected here, so light-regime eligibility requires verification of the aggregated balance sheet.`,
        basis: "Rec. 2003/361/EC Annex Art. 2(2) + Art. 3",
      });
      verifyNotes.push(
        "verify aggregated group balance sheet (turnover leg exceeded)",
      );
    } else {
      verifyNotes.push("confirm aggregated group turnover");
    }
  } else if (group?.state === "answered" && group.value === "no") {
    reasoning.push({
      step: "Not part of a group — no linked-enterprise aggregation; the own-entity figures stand.",
      basis: "Rec. 2003/361/EC Annex Art. 3",
    });
  } else if (group?.state === "unsure") {
    reasoning.push({
      step: "Group structure unsure — the EU SME definition aggregates linked enterprises, so eligibility stays directional until the group structure is verified.",
      basis: "Rec. 2003/361/EC Annex Art. 3",
    });
    verifyNotes.push("verify group structure (linked enterprises ≥25%)");
  } else if (tier === "quick") {
    // §7.3 trim: the group question is full-tier only, so in the quick tier
    // it is NOT asked. NEVER a silent eligible — the quick verdict states the
    // direction only, pending group verification.
    reasoning.push({
      step: "Group structure not asked in the quick tier — regime direction pending group verification (the EU SME definition aggregates linked enterprises).",
      basis: "Rec. 2003/361/EC Annex Art. 3 (§7.3 quick-tier trim)",
    });
    verifyNotes.push("regime direction pending group verification");
  } else {
    // Full tier but the group answer is missing/not_asked — defensive:
    // validateSubmission should have required it upstream; round to verify.
    reasoning.push({
      step: "Group structure not recorded — the EU SME definition aggregates linked enterprises, so eligibility requires group verification.",
      basis: "Rec. 2003/361/EC Annex Art. 3",
    });
    verifyNotes.push("verify group structure (answer not recorded)");
  }

  // ── Final mapping ────────────────────────────────────────────────────────
  const ownSmallConfirmed =
    ownHeadcount === "small" &&
    (ownTurnover === "small" || ownBalance === "small");

  if (!ownSmallConfirmed && verifyNotes.length === 0) {
    // Defensive: everything answered but nothing confirms small —
    // e.g. turnover exceeds while balance small was required. Treat any
    // non-confirmed fully-answered state without a hard disqualifier as
    // verification-needed rather than inventing a determination.
    verifyNotes.push("confirm small-enterprise status against Rec. 2003/361");
  }

  if (verifyNotes.length > 0) {
    return buildResult(
      "likely_eligible_verify",
      reasoning,
      verifyNotes,
      answers,
      rulebookVersion,
    );
  }

  reasoning.push({
    step: "Light regime: eligible — small enterprise confirmed on every leg, including group aggregation.",
    basis: "COM(2025) 335 Art. 10",
  });
  return buildResult(
    "eligible",
    reasoning,
    verifyNotes,
    answers,
    rulebookVersion,
  );
}

// ─── Finding envelope ───────────────────────────────────────────────────────

function buildResult(
  eligibility: RegimeEligibility,
  reasoning: { step: string; basis: string }[],
  verifyNotes: string[],
  answers: AnswerMap,
  rulebookVersion: string,
): RegimeResult {
  const whyTrace = [
    Q_ORG_TYPE,
    Q_HEADCOUNT,
    Q_TURNOVER,
    Q_BALANCE,
    Q_GROUP,
    Q_GROUP_HEADCOUNT,
    Q_GROUP_TURNOVER,
  ]
    .filter((id) => answers[id] && answers[id].state !== "not_asked")
    .map((id) => ({ questionId: id, answerLabel: answeredLabel(answers, id) }));

  const what =
    eligibility === "eligible"
      ? "Light regime (Art. 10): eligible."
      : eligibility === "not_eligible"
        ? "Light regime (Art. 10): not eligible — standard regime applies."
        : "Light regime (Art. 10): likely eligible — verification required.";

  const why = reasoning.map((r) => `${r.step} [${r.basis}]`).join(" ");

  const wherefore =
    eligibility === "eligible"
      ? "Simplified resilience requirements and the delayed Environmental Footprint Declaration apply under Art. 10. Safety obligations remain in full."
      : eligibility === "not_eligible"
        ? "Full compliance is required across all pillars; no Art. 10 simplifications apply."
        : `Regime direction is light, pending verification: ${verifyNotes.join("; ")}. Until verified, plan against the standard regime (conservative reading).`;

  const finding = determinedFinding<RegimeEligibility>({
    value: eligibility,
    verdict:
      eligibility === "eligible"
        ? "applicable"
        : eligibility === "not_eligible"
          ? "not_applicable"
          : "conditional",
    what,
    why,
    wherefore,
    whyTrace,
    confidence:
      eligibility === "likely_eligible_verify" ? "PROBABLE" : "DETERMINED",
    sources: [ART_10_SOURCE, SME_DEFINITION_SOURCE],
    cluster: "authorization_registration",
    rulebookVersion,
  });

  return { eligibility, reasoning, finding };
}
