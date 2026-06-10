/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * SERVER-ONLY NIS2 Gateway — Ultimate Assessment rebuild (Task 1.7).
 *
 * Extended NIS2 classifier for the operator-assessment spine. This module
 * REPLACES the legacy `classifyNIS2Entity` (src/lib/nis2-engine.server.ts) for
 * the new verdict pipeline only — the legacy engine stays untouched until the
 * legacy wizards are retired (its Rule 4 encodes the Art 26 misreading and is
 * retired WITH those wizards, never silently changed under them).
 *
 * §7.1/§7.2 corrections baked in (BINDING):
 *  - #3 Non-EU establishment: NIS2 space-sector jurisdiction follows
 *    establishment (Art 26(1) chapeau). There is NO Art 26 representative path
 *    into the space sector — the Art 26(3) representative mechanism applies
 *    ONLY to the Art 26(1)(b) digital categories. No path in this module ever
 *    returns "important via Art 26".
 *  - #4 Size cap: LARGE per Rec. 2003/361 = ≥250 headcount OR
 *    (turnover >€50M AND balance sheet >€43M). Turnover alone never upgrades
 *    an entity to essential — the balance-sheet leg is an AND-condition.
 *  - #5 Member-state designation cites Art 2(2)(b)–(e) + final subparagraph —
 *    NOT Art 2(2)(f) (that is public administration).
 *  - §7.2 ECN gate: a public electronic-communications provider routes to
 *    "in scope under another NIS2 sector" — NEVER a clean "does not apply".
 *  - 4th state: `needs_clarification` is first-class. Insufficient data or an
 *    unsure decisive input is NEVER rendered as "does not apply".
 *
 * Honesty invariants (plan header, binding):
 *  - Unknown rounds UP (monotonic): flipping an answered input to unsure never
 *    moves the classification toward out_of_scope.
 *  - `{state:"unsure"}` is THE stored representation of unsure; the "unsure"
 *    string literals in `NIS2GatewayInput` are ADAPTER OUTPUT produced by
 *    `gatewayInputFromAnswers` — never stored answer values (Task 1.3
 *    convention).
 *  - No fabricated findings: a member state absent from `MS_TRANSPOSITIONS`
 *    gets `status: "unverified"` — an act name is NEVER guessed.
 *
 * Rule order (mirrors the legacy engine's documented-rule style):
 *  Rule 1 — ECN routing (Annex I Sector 11 excludes public ECN providers).
 *  Rule 2 — Non-EU establishment analysis (Art 26(1) chapeau; corrected #3).
 *  Rule 3 — Member-state designation (Art 2(2)(b)–(e); unsure → "clarify with
 *           your NCA", never a silent No).
 *  Rule 4 — Annex I attachment (own ground segment) + size classification with
 *           the balance-sheet AND-condition and group aggregation
 *           (unsure → round up to the larger reading + verify note).
 *  Rule 5 — Art 2(2)(b)–(e) exceptions below the size caps (sole provider /
 *           societal-safety impact).
 *  Rule 6 — needs_clarification for any remaining decisive null/unsure.
 *  Rule 7 — (always, classification-independent) `transpositions` =
 *           `nis2ServiceStates` mapped through `MS_TRANSPOSITIONS`; absent
 *           states → status "unverified".
 */

import "server-only";

import type { FindingSource } from "@/lib/assessment/finding";
import type { AnswerMap, TriStateAnswer } from "@/lib/assessment/answers";

// ─── Public contract (plan Task 1.7 — other lanes implement against this) ───

export type NIS2GatewayClassification =
  | "essential"
  | "important"
  | "out_of_scope"
  | "needs_clarification";

// The "unsure" literals below are ADAPTER OUTPUT produced by
// gatewayInputFromAnswers from stored {state:"unsure"} answers (Task 1.3
// convention) — never stored values.
export interface NIS2GatewayInput {
  // all fields tri-state-capable; built from the AnswerMap
  establishedInEU: boolean | "unsure";
  euGroundStationCountries: string[]; // from q4_3b; [] when none/not asked
  groundSegment: "own" | "outsourced" | "none" | "unsure";
  publicECNProvider: boolean | "unsure" | null; // null = not asked (branch hidden)
  headcountBand:
    | "h_1_9"
    | "h_10_49"
    | "h_50_249"
    | "h_250_plus"
    | "unsure"
    | null; // q1_5_headcount
  turnoverBand:
    | "t_lt_2m"
    | "t_2_10m"
    | "t_10_50m"
    | "t_gt_50m"
    | "unsure"
    | null; // q1_5_turnover
  balanceSheetBand: "bs_le_10m" | "bs_le_43m" | "bs_gt_43m" | "unsure" | null;
  partOfGroup: boolean | "unsure" | null;
  groupHeadcountBand?: NIS2GatewayInput["headcountBand"];
  groupTurnoverBand?: NIS2GatewayInput["turnoverBand"];
  designatedByMemberState: boolean | "unsure" | null;
  soleProviderOrSocietalCritical: boolean | "unsure" | null;
  nis2ServiceStates: string[]; // from q6_4 confirmed list; [] when not asked
}

/** §4 Q6.4: which national transposition applies — honest per-MS state. */
export interface MSTransposition {
  state: string; // lowercase country code, e.g. "de"
  actName: string | null; // null when status is "unverified"
  inForce: string | null; // ISO date | null
  status: "in_force" | "unverified"; // "unverified" renders "transposition status unverified"
}

/** Small static dataset — grows via the deep-research rulebook process (§11 governance).
 *  ONLY web-verified entries get an act name; everything else is honestly unverified. */
export const MS_TRANSPOSITIONS: Record<
  string,
  Omit<MSTransposition, "state">
> = {
  de: { actName: "NIS2UmsuCG", inForce: "2025-12-06", status: "in_force" },
  // all other MS deliberately absent → status "unverified" (NEVER guess an act name)
};

export interface NIS2GatewayResult {
  classification: NIS2GatewayClassification;
  reason: string;
  citation: FindingSource[]; // §7.1-corrected cites only
  verifyNotes: string[]; // e.g. "confirm group figures", "confirm balance sheet"
  routedToOtherSector: boolean; // ECN yes — never rendered as "NIS2 does not apply"
  supplyChainFinding: boolean; // outsourced ground segment
  clarificationsNeeded: { questionId: string; whatItWouldChange: string }[];
  transpositions: MSTransposition[]; // per Q6.4-confirmed MS; source for the §6 verdict-header "(DE transposition)" element (Task 3.3)
}

// ─── Question ids consumed by the adapter (question-graph contract) ─────────

const Q = {
  establishment: "q1_2_establishment",
  headcount: "q1_5_headcount",
  turnover: "q1_5_turnover",
  balanceSheet: "q1_6_balance_sheet",
  group: "q1_7_group",
  groupHeadcount: "q1_7_group_headcount",
  groupTurnover: "q1_7_group_turnover",
  groundSegment: "q4_3_ground_segment",
  groundCountries: "q4_3b_ground_countries",
  publicECN: "q6_1_public_ecn",
  designation: "q6_2_ms_designation",
  soleProvider: "q6_3_sole_provider",
  msTranspositions: "q6_4_ms_transpositions",
} as const;

/** EU-27 lowercase country codes (incl. "el" alias for Greece). Used to filter
 *  ground-station countries down to the EU subset the establishment analysis
 *  cares about. */
export const EU_MEMBER_STATES: ReadonlySet<string> = new Set([
  "at",
  "be",
  "bg",
  "hr",
  "cy",
  "cz",
  "dk",
  "ee",
  "fi",
  "fr",
  "de",
  "gr",
  "el",
  "hu",
  "ie",
  "it",
  "lv",
  "lt",
  "lu",
  "mt",
  "nl",
  "pl",
  "pt",
  "ro",
  "sk",
  "si",
  "es",
  "se",
]);

// ─── Citations (§7.1-corrected — the ONLY cites this module may emit) ────────

const NIS2_AS_OF = "2022-12-27";

const CITE_ANNEX_I_SPACE: FindingSource = {
  label: "NIS2 Directive",
  citation:
    "Directive (EU) 2022/2555 Annex I, Sector 11 (Space) — excludes providers of public electronic communications networks",
  asOf: NIS2_AS_OF,
  verified: true,
};

const CITE_ART_26_CHAPEAU: FindingSource = {
  label: "NIS2 Directive",
  citation:
    "Directive (EU) 2022/2555 Art. 26(1) chapeau (jurisdiction follows establishment)",
  asOf: NIS2_AS_OF,
  verified: true,
};

const CITE_DESIGNATION: FindingSource = {
  label: "NIS2 Directive",
  citation:
    "Directive (EU) 2022/2555 Art. 2(2)(b)–(e) + final subparagraph (member-state identification list)",
  asOf: NIS2_AS_OF,
  verified: true,
};

const CITE_SIZE_CAP: FindingSource = {
  label: "NIS2 Directive",
  citation: "Directive (EU) 2022/2555 Art. 2(1), Art. 3",
  asOf: NIS2_AS_OF,
  verified: true,
};

const CITE_SME_DEFINITION: FindingSource = {
  label: "Commission Recommendation 2003/361/EC",
  citation: "Annex Art. 2 (SME ceilings)",
  asOf: "2003-05-06",
  verified: true,
};

const CITE_SUPPLY_CHAIN: FindingSource = {
  label: "NIS2 Directive",
  citation: "Directive (EU) 2022/2555 Art. 21(2)(d) (supply-chain security)",
  asOf: NIS2_AS_OF,
  verified: true,
};

// ─── Band ordering helpers ───────────────────────────────────────────────────

type HeadcountBand = Exclude<
  NIS2GatewayInput["headcountBand"],
  "unsure" | null
>;
type TurnoverBand = Exclude<NIS2GatewayInput["turnoverBand"], "unsure" | null>;
type BalanceBand = Exclude<
  NIS2GatewayInput["balanceSheetBand"],
  "unsure" | null
>;

const HEADCOUNT_ORDER: readonly HeadcountBand[] = [
  "h_1_9",
  "h_10_49",
  "h_50_249",
  "h_250_plus",
];
const TURNOVER_ORDER: readonly TurnoverBand[] = [
  "t_lt_2m",
  "t_2_10m",
  "t_10_50m",
  "t_gt_50m",
];
const BALANCE_ORDER: readonly BalanceBand[] = [
  "bs_le_10m",
  "bs_le_43m",
  "bs_gt_43m",
];

function maxBand<T extends string>(order: readonly T[], a: T, b: T): T {
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}

type Clarification = NIS2GatewayResult["clarificationsNeeded"][number];

// ─── Size resolution (Rule 4 semantics) ──────────────────────────────────────

interface SizeResolution {
  kind: "essential" | "important" | "below_caps" | "indeterminate";
  verifyNotes: string[];
  clarifications: Clarification[];
}

/** Combine an own band with the aggregated group band for one dimension.
 *  Group figures are aggregated per the EU SME definition, so when present we
 *  take the larger of the two (conservative); a missing group figure while
 *  partOfGroup=yes is a group gap (the aggregated size is unknown UPWARD). */
function effectiveBand<T extends string>(
  order: readonly T[],
  own: T | "unsure" | null,
  group: T | "unsure" | null | undefined,
  useGroup: boolean,
): { band: T | "unsure" | null; groupGap: boolean } {
  if (!useGroup) return { band: own, groupGap: false };
  if (group == null) return { band: own, groupGap: true };
  if (own === "unsure" || group === "unsure")
    return { band: "unsure", groupGap: false };
  if (own == null) return { band: group, groupGap: false };
  return { band: maxBand(order, own, group), groupGap: false };
}

/** Classify from fully-resolved bands (no unsure; nulls filled by caller).
 *  §7.1 #4: LARGE = ≥250 headcount OR (turnover >€50M AND balance >€43M).
 *  NIS2 floor (Art 2(1)): in scope unless small/micro per Rec. 2003/361 —
 *  i.e. in scope when headcount ≥50 OR (turnover >€10M AND balance >€10M). */
function classifyBands(
  hc: HeadcountBand,
  t: TurnoverBand,
  bs: BalanceBand,
): "essential" | "important" | "below_caps" {
  const large = hc === "h_250_plus" || (t === "t_gt_50m" && bs === "bs_gt_43m");
  if (large) return "essential";
  // h_250_plus already returned "essential" above (TS alias-narrows it out).
  const headcountFloor = hc === "h_50_249";
  const financialFloor =
    (t === "t_10_50m" || t === "t_gt_50m") &&
    (bs === "bs_le_43m" || bs === "bs_gt_43m");
  return headcountFloor || financialFloor ? "important" : "below_caps";
}

function resolveSize(input: NIS2GatewayInput): SizeResolution {
  const verifyNotes: string[] = [];
  const clarifications: Clarification[] = [];

  const useGroup = input.partOfGroup === true;
  const groupUnknown =
    input.partOfGroup === "unsure" || input.partOfGroup === null;

  const hcEff = effectiveBand(
    HEADCOUNT_ORDER,
    input.headcountBand,
    input.groupHeadcountBand,
    useGroup,
  );
  const tEff = effectiveBand(
    TURNOVER_ORDER,
    input.turnoverBand,
    input.groupTurnoverBand,
    useGroup,
  );
  const groupGap = useGroup && (hcEff.groupGap || tEff.groupGap);

  // Unsure → conservative LARGER reading (monotonic round-up) + verify note.
  let hc = hcEff.band;
  let t = tEff.band;
  let bs = input.balanceSheetBand;
  if (hc === "unsure") {
    hc = "h_250_plus";
    verifyNotes.push(
      "Headcount band unsure — conservative larger reading applied; confirm headcount.",
    );
  }
  if (t === "unsure") {
    t = "t_gt_50m";
    verifyNotes.push(
      "Turnover band unsure — conservative larger reading applied; confirm turnover.",
    );
  }
  if (bs === "unsure") {
    bs = "bs_gt_43m";
    verifyNotes.push(
      "Balance sheet unsure — conservative larger reading (> €43M) applied; confirm balance sheet.",
    );
  }

  // Nulls (not asked) are never presumed: two-sided evaluation. If the
  // classification differs between the smallest and largest fill, the null is
  // decisive → indeterminate (Rule 6), never a clean verdict.
  const fill = (which: "min" | "max") =>
    classifyBands(
      (hc ?? (which === "min" ? "h_1_9" : "h_250_plus")) as HeadcountBand,
      (t ?? (which === "min" ? "t_lt_2m" : "t_gt_50m")) as TurnoverBand,
      (bs ?? (which === "min" ? "bs_le_10m" : "bs_gt_43m")) as BalanceBand,
    );
  const minClass = fill("min");
  const maxClass = fill("max");

  if (minClass !== maxClass) {
    if (hc == null)
      clarifications.push({
        questionId: Q.headcount,
        whatItWouldChange:
          "Your headcount band is needed to determine the NIS2 size classification (Art. 2(1), Rec. 2003/361).",
      });
    if (t == null)
      clarifications.push({
        questionId: Q.turnover,
        whatItWouldChange:
          "Your turnover band is needed to determine the NIS2 size classification (Art. 2(1), Rec. 2003/361).",
      });
    if (bs == null)
      clarifications.push({
        questionId: Q.balanceSheet,
        whatItWouldChange:
          "Your balance-sheet band decides between classifications — large requires turnover > €50M AND balance sheet > €43M (Rec. 2003/361).",
      });
    return { kind: "indeterminate", verifyNotes, clarifications };
  }

  const kind: SizeResolution["kind"] = minClass;

  // Group aggregation gaps: the aggregated size is unknown UPWARD. Below the
  // caps that is decisive (aggregation could bring the entity into scope);
  // at "important" it is a verify note (could raise to essential).
  if (groupUnknown || groupGap) {
    if (kind === "below_caps") {
      clarifications.push({
        questionId: Q.group,
        whatItWouldChange:
          "Aggregated group figures (linked enterprises per the EU SME definition) could bring you into NIS2 scope — confirm group structure and group-level headcount/turnover.",
      });
      return { kind: "indeterminate", verifyNotes, clarifications };
    }
    if (kind === "important") {
      verifyNotes.push(
        "Aggregated group figures could raise your classification to essential — confirm group structure and group-level figures.",
      );
    } else {
      verifyNotes.push(
        "Confirm group structure — classification already conservative at essential.",
      );
    }
  }

  return { kind, verifyNotes, clarifications };
}

// ─── The gateway ─────────────────────────────────────────────────────────────

/**
 * Extended NIS2 classifier with the first-class `needs_clarification` state.
 * See the module JSDoc for the documented rule order. The classification is
 * monotonic in uncertainty: an unsure input can only keep or widen the
 * obligation picture (round up / needs_clarification) — it NEVER produces
 * out_of_scope.
 */
export function classifyNIS2Gateway(
  input: NIS2GatewayInput,
): NIS2GatewayResult {
  // Rule 7 — always computed, classification-independent.
  const transpositions = buildTranspositions(input.nis2ServiceStates);
  // Outsourced ground segment always yields the supply-chain finding flag,
  // whichever rule decides the classification.
  const supplyChainFinding = input.groundSegment === "outsourced";

  const verifyNotes: string[] = [];
  const clarificationsNeeded: Clarification[] = [];

  const base = {
    routedToOtherSector: false,
    supplyChainFinding,
    transpositions,
  };

  // ── Rule 1: ECN routing ──────────────────────────────────────────────────
  // Annex I Sector 11 (Space) explicitly EXCLUDES public ECN providers. A Yes
  // routes to "another NIS2 sector" — NEVER a clean "NIS2 does not apply".
  if (input.publicECNProvider === true) {
    return {
      ...base,
      classification: "needs_clarification",
      routedToOtherSector: true,
      reason:
        "You provide public electronic-communications networks/services: in scope under another NIS2 sector — outside this tool's space-sector scope. NIS2 Annex I Sector 11 (Space) excludes public ECN providers because they are covered under the electronic-communications sector; your NIS2 obligations attach there, not via the space sector.",
      citation: [CITE_ANNEX_I_SPACE],
      verifyNotes,
      clarificationsNeeded: [
        {
          questionId: Q.publicECN,
          whatItWouldChange:
            "Your NIS2 classification must be determined under the electronic-communications sector rules — outside this tool's space-sector scope.",
        },
      ],
    };
  }
  if (input.publicECNProvider === "unsure") {
    return {
      ...base,
      classification: "needs_clarification",
      reason:
        "It is unclear whether you provide public electronic-communications networks/services. Because Annex I Sector 11 (Space) excludes public ECN providers, this is decisive for which sector your NIS2 obligations attach under — unsure rounds up to needs-clarification, never to 'does not apply'.",
      citation: [CITE_ANNEX_I_SPACE],
      verifyNotes,
      clarificationsNeeded: [
        {
          questionId: Q.publicECN,
          whatItWouldChange:
            "If you are a public ECN provider, NIS2 applies via the electronic-communications sector; if not, the space-sector analysis below applies.",
        },
      ],
    };
  }
  if (input.publicECNProvider === null && input.groundSegment === "own") {
    // Quick tier: Q6.1 is full-tier. Honest note, no classification downgrade.
    verifyNotes.push(
      "Confirm you are not a public electronic-communications provider (full assessment) — Annex I 'Space' excludes public ECN providers.",
    );
  }

  // ── Rule 2: non-EU establishment analysis (§7.1 #3 corrected) ───────────
  if (input.establishedInEU === false) {
    const euGround = input.euGroundStationCountries.filter((c) =>
      EU_MEMBER_STATES.has(c.toLowerCase()),
    );
    if (euGround.length === 0) {
      return {
        ...base,
        classification: "out_of_scope",
        reason:
          "NIS2 space-sector jurisdiction follows establishment (Art. 26(1) chapeau): you are not established in the EU and operate no ground infrastructure in an EU member state. Unlike the digital categories in Art. 26(1)(b), there is NO representative path into NIS2 for space operators — a non-EU space operator never becomes 'important + representative' via Art. 26.",
        citation: [CITE_ART_26_CHAPEAU, CITE_ANNEX_I_SPACE],
        verifyNotes,
        clarificationsNeeded,
      };
    }
    return {
      ...base,
      classification: "needs_clarification",
      reason: `You are not established in the EU but operate ground-segment infrastructure in EU member state(s) (${euGround.join(
        ", ",
      )}) — an establishment analysis is required: operating ground infrastructure in a member state can constitute an establishment there, which would bring the space-sector activity into NIS2 scope (Art. 26(1) chapeau). Insufficient data is never rendered as 'does not apply'.`,
      citation: [CITE_ART_26_CHAPEAU, CITE_ANNEX_I_SPACE],
      verifyNotes,
      clarificationsNeeded: [
        {
          questionId: Q.establishment,
          whatItWouldChange:
            "Whether your EU ground infrastructure constitutes an establishment in a member state decides whether NIS2 space-sector obligations attach (Art. 26(1) chapeau).",
        },
      ],
    };
  }
  if (input.establishedInEU === "unsure") {
    // Round up: EU establishment presumed (more obligations), verify flag.
    verifyNotes.push(
      "Establishment unsure — EU establishment presumed (conservative); confirm where your organisation is established.",
    );
    clarificationsNeeded.push({
      questionId: Q.establishment,
      whatItWouldChange:
        "NIS2 space-sector jurisdiction follows establishment (Art. 26(1) chapeau) — confirming a non-EU establishment without EU ground infrastructure would take you out of scope.",
    });
  }

  // Size resolution (Rule 4 semantics) — computed up front because Rules 3-5
  // all consult it; the documented decision precedence below is unchanged.
  const size = resolveSize(input);
  verifyNotes.push(...size.verifyNotes);

  // ── Rule 3: member-state designation (Art 2(2)(b)–(e), §7.1 #5) ─────────
  // NOT Art 2(2)(f) — that is public administration. CER-critical entities
  // enter via Art 2(3) / Art 3(1)(f).
  if (input.designatedByMemberState === true) {
    const classification: NIS2GatewayClassification =
      size.kind === "essential" ? "essential" : "important";
    verifyNotes.push(
      "Confirm with your NCA whether the identification decision designates you as essential or important (Art. 3(1)).",
    );
    return {
      ...base,
      classification,
      reason:
        "A member state has identified your entity under NIS2 Art. 2(2)(b)–(e) (final subparagraph: member-state identification list) — this brings you into scope REGARDLESS of size. The essential/important tier follows the identification decision and your size; the conservative reading shown here should be confirmed with the designating authority.",
      citation: [CITE_DESIGNATION, CITE_SIZE_CAP],
      verifyNotes,
      clarificationsNeeded,
    };
  }
  const designationUnsure = input.designatedByMemberState === "unsure";
  if (designationUnsure) {
    clarificationsNeeded.push({
      questionId: Q.designation,
      whatItWouldChange:
        "A member-state identification under Art. 2(2)(b)–(e) brings you into NIS2 scope regardless of size — clarify with your NCA.",
    });
    verifyNotes.push(
      "Member-state designation status unsure — clarify with your NCA (Art. 2(2)(b)–(e)).",
    );
  }

  // ── Rule 4: Annex I attachment + size classification ────────────────────
  // NIS2 Annex I Sector 11 (Space) attaches to operators of ground-based
  // infrastructure supporting space-based services. Outsourced ground segment
  // is NOT Annex-I-space attachment — it produces a supply-chain finding.
  if (input.groundSegment === "unsure") {
    return {
      ...base,
      classification: "needs_clarification",
      reason:
        "Whether you operate your own ground-segment infrastructure is decisive for NIS2 Annex I Sector 11 (Space) attachment — unsure rounds up to needs-clarification, never to 'does not apply'.",
      citation: [CITE_ANNEX_I_SPACE],
      verifyNotes,
      clarificationsNeeded: [
        ...clarificationsNeeded,
        {
          questionId: Q.groundSegment,
          whatItWouldChange:
            "Operating your own ground infrastructure attaches you to NIS2 Annex I Sector 11 (Space); outsourcing produces a supply-chain finding instead.",
        },
      ],
    };
  }
  if (input.groundSegment === "outsourced" || input.groundSegment === "none") {
    if (designationUnsure) {
      return {
        ...base,
        classification: "needs_clarification",
        reason:
          "You do not operate Annex I Sector 11 (Space) ground infrastructure yourself, but your member-state designation status is unsure — a designation under Art. 2(2)(b)–(e) would bring you into scope regardless. Clarify with your NCA; unsure is never rendered as 'does not apply'.",
        citation: [CITE_DESIGNATION, CITE_ANNEX_I_SPACE],
        verifyNotes,
        clarificationsNeeded,
      };
    }
    if (input.groundSegment === "outsourced") {
      return {
        ...base,
        classification: "out_of_scope",
        reason:
          "You use third-party ground-segment services rather than operating your own ground infrastructure: NIS2 Annex I Sector 11 (Space) attaches to the infrastructure OPERATOR, so the space-sector classification does not attach to you directly. NIS2 reaches you instead through your ground-segment provider's supply-chain security obligations (Art. 21(2)(d)) — see the supply-chain finding.",
        citation: [CITE_ANNEX_I_SPACE, CITE_SUPPLY_CHAIN],
        verifyNotes,
        clarificationsNeeded,
      };
    }
    return {
      ...base,
      classification: "out_of_scope",
      reason:
        "You report no ground-segment use: NIS2 Annex I Sector 11 (Space) attaches to operators of ground-based infrastructure supporting space-based services, so no space-sector attachment was identified. No member-state designation was reported.",
      citation: [CITE_ANNEX_I_SPACE],
      verifyNotes,
      clarificationsNeeded,
    };
  }

  // groundSegment === "own" → Annex I Sector 11 (Space) entity candidate.
  if (size.kind === "essential" || size.kind === "important") {
    return {
      ...base,
      classification: size.kind,
      reason:
        size.kind === "essential"
          ? "You operate ground-segment infrastructure (NIS2 Annex I, Sector 11 'Space') and qualify as a LARGE enterprise per Rec. 2003/361 — ≥250 headcount OR (turnover > €50M AND balance sheet > €43M) — making you an essential entity (Art. 3(1))."
          : "You operate ground-segment infrastructure (NIS2 Annex I, Sector 11 'Space') and meet the medium-size floor per Rec. 2003/361 without reaching the large-enterprise ceilings (≥250 headcount OR turnover > €50M AND balance sheet > €43M) — making you an important entity (Art. 3(2)).",
      citation: [CITE_SIZE_CAP, CITE_SME_DEFINITION, CITE_ANNEX_I_SPACE],
      verifyNotes,
      clarificationsNeeded,
    };
  }
  if (size.kind === "indeterminate") {
    // Rule 6 — decisive nulls in the size inputs: insufficient data is never
    // rendered as "does not apply".
    return {
      ...base,
      classification: "needs_clarification",
      reason:
        "Decisive size inputs are missing or depend on unconfirmed group aggregation, so the NIS2 size classification (Art. 2(1), Rec. 2003/361) cannot be determined. Insufficient data is never rendered as 'does not apply' — provide the named inputs to resolve.",
      citation: [CITE_SIZE_CAP, CITE_SME_DEFINITION],
      verifyNotes,
      clarificationsNeeded: [...clarificationsNeeded, ...size.clarifications],
    };
  }

  // ── Rule 5: Art 2(2)(b)–(e) exceptions below the size caps ──────────────
  if (input.soleProviderOrSocietalCritical === true) {
    verifyNotes.push(
      "Confirm with your NCA whether the member state identifies you as essential or important (Art. 3(1)).",
    );
    return {
      ...base,
      classification: "important",
      reason:
        "You are below the NIS2 size caps, but you report being the sole provider of your service in a member state or that disruption would have significant societal or safety impact — the Art. 2(2)(b)–(e) exceptions bring such entities into scope regardless of size. Shown conservatively as important; the member-state identification decision determines the final tier.",
      citation: [CITE_DESIGNATION, CITE_SIZE_CAP],
      verifyNotes,
      clarificationsNeeded,
    };
  }
  if (input.soleProviderOrSocietalCritical === "unsure") {
    return {
      ...base,
      classification: "needs_clarification",
      reason:
        "You are below the NIS2 size caps, but it is unclear whether the Art. 2(2)(b)–(e) exceptions (sole provider / significant societal or safety impact) apply to you — unsure on a decisive input is never rendered as 'does not apply'.",
      citation: [CITE_DESIGNATION, CITE_SIZE_CAP],
      verifyNotes,
      clarificationsNeeded: [
        ...clarificationsNeeded,
        {
          questionId: Q.soleProvider,
          whatItWouldChange:
            "If you are the sole provider in a member state or your disruption would have significant societal/safety impact, NIS2 applies regardless of size (Art. 2(2)(b)–(e)).",
        },
      ],
    };
  }

  // ── Rule 6: needs_clarification for any remaining decisive null/unsure ──
  if (designationUnsure) {
    return {
      ...base,
      classification: "needs_clarification",
      reason:
        "You are below the NIS2 size caps and your member-state designation status is unsure — a designation under Art. 2(2)(b)–(e) would bring you into scope regardless of size. Clarify with your NCA; unsure is never rendered as a silent No.",
      citation: [CITE_DESIGNATION, CITE_SIZE_CAP],
      verifyNotes,
      clarificationsNeeded,
    };
  }
  if (
    input.designatedByMemberState === null ||
    input.soleProviderOrSocietalCritical === null
  ) {
    const missing: Clarification[] = [];
    if (input.designatedByMemberState === null)
      missing.push({
        questionId: Q.designation,
        whatItWouldChange:
          "A member-state identification under Art. 2(2)(b)–(e) would bring you into NIS2 scope regardless of size.",
      });
    if (input.soleProviderOrSocietalCritical === null)
      missing.push({
        questionId: Q.soleProvider,
        whatItWouldChange:
          "The Art. 2(2)(b)–(e) exceptions (sole provider / societal-safety impact) can apply below the size caps — this has not been assessed yet.",
      });
    return {
      ...base,
      classification: "needs_clarification",
      reason:
        "You are below the NIS2 size caps, but the Art. 2(2)(b)–(e) exception inputs have not been assessed — insufficient data is never rendered as 'does not apply'. Complete the full assessment to resolve.",
      citation: [CITE_DESIGNATION, CITE_SIZE_CAP],
      verifyNotes,
      clarificationsNeeded: [...clarificationsNeeded, ...missing],
    };
  }

  // Honest, fully-answered below-caps: every gate answered, no exception.
  return {
    ...base,
    classification: "out_of_scope",
    reason:
      "You are below the NIS2 size caps (small/micro per Rec. 2003/361), no member state has identified you under Art. 2(2)(b)–(e), and no size-cap exception applies — the NIS2 space-sector obligations do not attach to your entity (Art. 2(1)).",
    citation: [CITE_SIZE_CAP, CITE_SME_DEFINITION],
    verifyNotes,
    clarificationsNeeded,
  };
}

// ─── Rule 7: member-state transpositions (always, classification-independent) ─

function buildTranspositions(states: string[]): MSTransposition[] {
  return states.map((raw) => {
    const state = raw.toLowerCase();
    const known = MS_TRANSPOSITIONS[state];
    if (known) return { state, ...known };
    // NEVER guess an act name for an unverified member state.
    return { state, actName: null, inForce: null, status: "unverified" };
  });
}

// ─── Adapter: AnswerMap → NIS2GatewayInput ──────────────────────────────────
// Task 1.3 convention: {state:"unsure"} is THE stored unsure. This adapter MAY
// translate it into the "unsure" string literals of its OWN input type — that
// is an adapter-output shape, never a stored answer value.

function rawAnswer(answers: AnswerMap, id: string): TriStateAnswer | undefined {
  return answers[id];
}

function singleValue(answers: AnswerMap, id: string): string | "unsure" | null {
  const a = rawAnswer(answers, id);
  if (!a || a.state === "not_asked") return null;
  if (a.state === "unsure") return "unsure";
  return typeof a.value === "string" ? a.value : null;
}

function multiValue(answers: AnswerMap, id: string): string[] {
  const a = rawAnswer(answers, id);
  if (!a || a.state !== "answered" || !Array.isArray(a.value)) return [];
  return a.value.filter((v): v is string => typeof v === "string");
}

function yesNo(answers: AnswerMap, id: string): boolean | "unsure" | null {
  const v = singleValue(answers, id);
  if (v === "yes") return true;
  if (v === "no") return false;
  if (v === "unsure") return "unsure";
  return null;
}

function bandValue<T extends string>(
  answers: AnswerMap,
  id: string,
  order: readonly T[],
): T | "unsure" | null {
  const v = singleValue(answers, id);
  if (v === "unsure") return "unsure";
  if (v !== null && (order as readonly string[]).includes(v)) return v as T;
  return null;
}

/** Build the gateway input from the stored tri-state answer map. */
export function gatewayInputFromAnswers(answers: AnswerMap): NIS2GatewayInput {
  const establishmentRaw = singleValue(answers, Q.establishment);
  // Establishment is an always-on question; a missing answer is conservative
  // "unsure" (round up — never presume a non-EU exit).
  const establishedInEU: boolean | "unsure" =
    establishmentRaw === null || establishmentRaw === "unsure"
      ? "unsure"
      : establishmentRaw === "eu";

  const groundRaw = singleValue(answers, Q.groundSegment);
  const groundSegment: NIS2GatewayInput["groundSegment"] =
    groundRaw === "own" || groundRaw === "outsourced" || groundRaw === "none"
      ? groundRaw
      : "unsure"; // unsure OR missing → conservative unsure

  const euGroundStationCountries = multiValue(
    answers,
    Q.groundCountries,
  ).filter((c) => EU_MEMBER_STATES.has(c.toLowerCase()));

  const partOfGroup = yesNo(answers, Q.group);

  return {
    establishedInEU,
    euGroundStationCountries,
    groundSegment,
    publicECNProvider: yesNo(answers, Q.publicECN),
    headcountBand: bandValue(answers, Q.headcount, HEADCOUNT_ORDER),
    turnoverBand: bandValue(answers, Q.turnover, TURNOVER_ORDER),
    balanceSheetBand: bandValue(answers, Q.balanceSheet, BALANCE_ORDER),
    partOfGroup,
    groupHeadcountBand:
      partOfGroup === true
        ? bandValue(answers, Q.groupHeadcount, HEADCOUNT_ORDER)
        : null,
    groupTurnoverBand:
      partOfGroup === true
        ? bandValue(answers, Q.groupTurnover, TURNOVER_ORDER)
        : null,
    designatedByMemberState: yesNo(answers, Q.designation),
    soleProviderOrSocietalCritical: yesNo(answers, Q.soleProvider),
    nis2ServiceStates: multiValue(answers, Q.msTranspositions).map((s) =>
      s.toLowerCase(),
    ),
  };
}
