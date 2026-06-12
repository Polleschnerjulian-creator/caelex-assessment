/**
 * Sprint B6 — License-Determination Engine.
 *
 * Given the outputs of the Property-Trigger Engine (Sprint B3),
 * the De-minimis Calculator (Sprint B5), and the destination/end-user
 * context, this engine determines the overall licensing posture.
 *
 * ─── What this engine does ────────────────────────────────────────────
 * It answers: "For this item going to this destination, what license or
 * authorization do I need from which jurisdiction?"
 *
 * Output:
 *   - `LicenseRequirement` per jurisdiction that controls the item
 *   - Overall risk gate (MTCR Cat. I strong-presumption-of-denial)
 *   - Recommended next steps ordered by urgency
 *
 * ─── What this engine does NOT do ────────────────────────────────────
 * - Determine the specific license exception that applies (too fact-specific)
 * - Screen counterparties against sanctions lists (Sprint Wave A)
 * - Replace qualified legal counsel
 *
 * ─── Architecture notes ───────────────────────────────────────────────
 * This engine is PURE — no DB calls, no HTTP, no async.
 * Inputs come from the previously computed evaluation objects.
 *
 * Source: EAR 15 CFR Parts 730-774, ITAR 22 CFR Parts 120-130,
 *         EU Reg. 2021/821 Art. 3/4/5, AWV § 8/9/10
 */

import type { TriggerEvaluation } from "./property-trigger-engine";
import type { DeMinimisResult } from "./de-minimis-calculator";
import { EMBARGOED_COUNTRIES } from "./de-minimis-calculator";
import { EU27_MEMBER_STATES } from "@/lib/comply-v2/trade/eu-member-states";
import {
  matchLicenseExceptions,
  type ApplicableException,
  type ExceptionMatchInput,
} from "./license-exception-matrix";
import type { OriginRegimeRouting } from "./classification/origin-regime-map";
import {
  REGIME_MATURITY,
  type CorpusRegime,
} from "@/data/trade/normalized-corpus";
import type { ListId } from "./classification/order-of-review";

// ─── Types ────────────────────────────────────────────────────────────

export type LicenseAuthority =
  | "BIS" // US Bureau of Industry and Security (EAR)
  | "DDTC" // US Directorate of Defense Trade Controls (ITAR)
  | "BAFA" // German Federal Office for Economic Affairs (DE)
  | "EU_COMPETENT_AUTHORITY" // National competent authority under EU 2021/821
  | "MTCR_REVIEW"; // MTCR multilateral — each partner nation reviews separately

export type LicenseType =
  | "SPECIFIC_LICENSE" // Individual application to licensing authority
  | "LICENSE_EXCEPTION" // Applicable exception (STA, TMP, ENC, etc.)
  | "GENERAL_LICENSE" // EU-style general/global license
  | "NLR" // No License Required (self-classification)
  | "TAA" // Technical Assistance Agreement (DDTC for ITAR tech)
  | "DSP5" // DDTC individual export license (physical articles)
  | "BAFA_ANTRAG"; // German individual export license (BAFA Antrag)

export type RequirementStatus =
  | "REQUIRED" // License/auth required before export
  | "LIKELY_REQUIRED" // Likely required — further analysis needed
  | "EXCEPTION_MAY_APPLY" // A license exception may be applicable
  | "NLR" // No License Required — item not controlled here
  | "DENIED" // Strong presumption of denial (MTCR Cat. I or embargo)
  | "PROHIBITED" // Hard prohibition under EU Reg. 833/2014 Art. 2b
  | "UNKNOWN"; // Cannot determine without additional info

export interface LicenseRequirement {
  jurisdiction: string;
  authority: LicenseAuthority;
  status: RequirementStatus;
  licenseType: LicenseType | null;
  /** Short reason for this requirement. */
  reason: string;
  /** Specific action the exporter should take. */
  recommendedAction: string;
  /** Reference code from the underlying classification. */
  triggerCode?: string;
  /**
   * Applicable license exception that may downgrade this requirement
   * from REQUIRED to EXCEPTION_MAY_APPLY. Populated by the
   * license-exception-matrix integration (Sprint D4). Only set when
   * the caller supplies an exceptionContext and a matching exception
   * was found by `matchLicenseExceptions()`.
   */
  applicableException?: {
    code: string;
    label: string;
    citation: string;
    conditions: string[];
  };
}

export type OverallGate = "CLEARED" | "REVIEW_NEEDED" | "BLOCKED";

export interface LicenseDetermination {
  /** Per-jurisdiction requirements. */
  requirements: LicenseRequirement[];

  /** Overall gating decision. */
  gate: OverallGate;

  /**
   * True if MTCR Cat. I strong-presumption-of-denial applies to any code.
   * This gate effectively blocks the export path for most destinations.
   */
  mtcrCatIBlock: boolean;

  /**
   * True if the item is ITAR-controlled. ITAR requires DDTC authorization;
   * De-minimis rule does not apply.
   */
  itarBlock: boolean;

  /**
   * True if the destination is embargoed under US/EU/UN sanctions.
   */
  embargoBlock: boolean;

  /**
   * Sprint Z2b — true if the counterparty is on Reg. 833/2014
   * Annex IV. Art. 2b carries a HARD prohibition on dual-use exports
   * to listed entities REGARDLESS of civilian intent. When this fires
   * the gate becomes BLOCKED with a non-derogable PROHIBITED status.
   */
  annexIVBlock: boolean;

  /** Ordered list of recommended next steps (most urgent first). */
  nextSteps: string[];

  /**
   * License exceptions that may apply. Populated when the caller
   * supplies an `exceptionContext` to `determineLicenseRequirements`.
   * Same list as `LicenseRequirement.applicableException` rolled up
   * across all jurisdictions — useful for a top-level "exceptions
   * that might apply" UI panel.
   */
  applicableExceptions?: ApplicableException[];

  /** Mandatory disclaimer. */
  disclaimer: string;
}

// ─── Gate 4.5: Thin-origin-regime mapping ─────────────────────────────
//
// Maps each ListId from OriginRegimeRouting to the CorpusRegime key used
// in REGIME_MATURITY. Multilateral ListIds (WASSENAAR, MTCR, NSG, AG)
// are intentionally absent — the gate NEVER fires on multilateral baselines,
// only on the exporter's primary list. A missing key means the gate does
// not fire for that ListId (fail-safe: no false reviews).
//
// Exported (value, not a copy) so the golden-set matrix harness can derive
// thin-origin status from the SAME table this gate uses — see
// `classification/golden-set/golden-set.test.ts`. Export only; no behavior
// change.
export const LIST_ID_TO_CORPUS_REGIME: Partial<Record<ListId, CorpusRegime>> = {
  EAR_CCL: "US_CCL",
  EU_ANNEX_I: "EU_ANNEX_I",
  UK_STRATEGIC: "UK_STRATEGIC",
  JP_METI: "JP_METI",
  IN_SCOMET: "IN_SCOMET",
  EU_CML: "EU_CML",
  CA_ECL: "CA_ECL",
  AU_DSGL: "AU_DSGL",
  KR_STRATEGIC: "KR_STRATEGIC",
  CH_GKV: "CH_GKV",
  NO_LIST: "NO_LIST",
  USML: "USML",
  DE_AUSFUHRLISTE: "DE_AUSFUHRLISTE",
  // Multilateral baselines intentionally absent — gate never fires on them.
};

/**
 * Returns a human-readable German label for a ListId used in Gate 4.5 reasons.
 */
function listIdLabel(listId: ListId): string {
  const labels: Partial<Record<ListId, string>> = {
    UK_STRATEGIC: "UK-Kontrollliste (UK Strategic Export Control List)",
    JP_METI: "Japan-METI-Kontrollliste",
    IN_SCOMET: "India SCOMET-Liste",
    EU_CML: "EU-Common-Military-List",
    CA_ECL: "Kanada ECL (Export Control List)",
    AU_DSGL: "Australien DSGL (Defence and Strategic Goods List)",
    KR_STRATEGIC: "Korea Strategic-Kontrollliste",
    CH_GKV: "Schweiz GKV (Güterkontrollverordnung)",
    NO_LIST: "Norwegen Kontrollliste",
    DE_AUSFUHRLISTE: "DE-Ausfuhrliste",
    EAR_CCL: "US EAR Commerce Control List",
    EU_ANNEX_I: "EU Annex I Dual-Use-Liste",
    USML: "US Munitions List (USML)",
  };
  return labels[listId] ?? listId;
}

// ─── Engine ───────────────────────────────────────────────────────────

const DISCLAIMER =
  "License determinations from Caelex Trade are screening-level guidance only. They are NOT legal opinions and NOT a substitute for qualified export-control counsel. Always verify with BAFA (DE), BIS (US), or the relevant EU National Competent Authority before proceeding with any controlled export.";

/**
 * Determine licensing requirements based on trigger engine output and
 * de-minimis calculator result.
 *
 * @param triggerEval  Output of `evaluateItemSignals()` from Sprint B3.
 * @param deMinimis    Output of `calculateDeMinimis()` from Sprint B5.
 *                     Pass null if de-minimis has not been calculated yet.
 * @param destinationCountry  ISO-2 destination country code (for embargo check).
 * @param exceptionContext  Optional Sprint-D4 enrichment. When supplied,
 *                     the function calls `matchLicenseExceptions()` and
 *                     downgrades REQUIRED → EXCEPTION_MAY_APPLY where an
 *                     applicable exception is found for the matching
 *                     authority. Backward-compatible: omitting it
 *                     preserves the pre-D4 behaviour (matrix isolated).
 *                     `destinationCountry` from arg 3 is reused — the
 *                     `ExceptionMatchInput.destinationCountry` is set
 *                     from this argument and need not be repeated.
 */
export function determineLicenseRequirements(
  triggerEval: TriggerEvaluation,
  deMinimis: DeMinimisResult | null,
  destinationCountry?: string,
  exceptionContext?: Omit<ExceptionMatchInput, "destinationCountry">,
  /**
   * Sprint Z2b — counterparty screening context. When provided and
   * the operation's counterparty (or intermediary) is matched by
   * EU_ANNEX_IV, Gate 0 fires with a PROHIBITED requirement that
   * cannot be derogated via license exceptions.
   *
   * Shape mirrors a subset of `screen-party.server.ts` output:
   *   { sanctionsLists: ["EU_ANNEX_IV", "EU_FSF", ...] }
   * The keys are the TradeSanctionsList enum values.
   */
  screeningContext?: {
    sanctionsLists: string[];
  },
  /**
   * T-M5 — actual classified ECCN codes for the item, as stored on the
   * trade item record (set by operator manual classification or Astra
   * suggestion). These are DISTINCT from the heuristic trigger engine's
   * *suggested* codes: the trigger engine may fire no rules for an item
   * that has been directly classified (e.g. no aperture/keyword signal),
   * yet the item is unambiguously dual-use because eccnEU / eccnUS is set.
   *
   * Gate 0 (Art. 2b Annex IV prohibition) must fire whenever the item
   * carries a real dual-use ECCN, regardless of whether the heuristic
   * engine also flagged it. USML/ITAR codes live in `usmlCategory`, not
   * here, so a non-empty eccnEU / eccnUS always denotes dual-use (Annex I
   * or CCL).  Omit or pass null values to preserve pre-T-M5 behaviour.
   */
  actualCodes?: {
    eccnEU?: string | null;
    eccnUS?: string | null;
    usmlCategory?: string | null;
  },
  /**
   * S0 Task 7 — Gate 4.5 (fail-closed thin-origin-coverage gate).
   *
   * The OriginRegimeRouting for the exporter's seat, resolved via
   * `originRegimes(seat)` in the call stack. When supplied AND the
   * exporter's primary regime has REGIME_MATURITY === 3 (not yet deeply
   * modelled in Passage) AND the item carries control-suspicious signals,
   * the gate fires a REQUIRES_REVIEW requirement with a German clear-text
   * reason naming the regime.
   *
   * Additive + tightening-only: omitting this param (or passing undefined)
   * preserves byte-identical pre-Task-7 behaviour for all existing callers.
   */
  exporterOrigin?: OriginRegimeRouting,
): LicenseDetermination {
  const requirements: LicenseRequirement[] = [];
  const nextSteps: string[] = [];
  let annexIVBlock = false;

  // ─── Gate 0: EU Reg. 833/2014 Annex IV (Art. 2b hard prohibition) ──
  // Highest-priority block. When a counterparty (or intermediary) is
  // on Annex IV, Art. 2b prohibits export of ANY dual-use item
  // (Annex I controlled OR catch-all triggered) REGARDLESS of
  // civilian intent. There is no derogation pathway via licensing
  // exceptions for this block.
  //
  // The item is "dual-use enough to be caught by Art. 2b" when any
  // suggested code targets EU_ANNEX_I or US_CCL. Items with only
  // ITAR (USML) classification fall through to Gate 2.
  if (screeningContext?.sanctionsLists.includes("EU_ANNEX_IV")) {
    // T-M5: "dual-use enough" = heuristic engine suggested an Annex-I/CCL code
    // OR the item already carries a real dual-use ECCN (operator manual
    // classification). The two paths are independent — either one suffices.
    // USML-only items (eccnEU/eccnUS both absent/null) do NOT trigger this
    // gate; they fall through to Gate 2 (DDTC).
    const hasDualUseCode =
      triggerEval.results.some((r) =>
        r.suggestedCodes.some(
          (c) => c.jurisdiction === "EU_ANNEX_I" || c.jurisdiction === "US_CCL",
        ),
      ) ||
      !!actualCodes?.eccnEU?.trim() ||
      !!actualCodes?.eccnUS?.trim();

    if (hasDualUseCode) {
      annexIVBlock = true;
      requirements.push({
        jurisdiction: "EU (Reg. 833/2014 Annex IV)",
        authority: "EU_COMPETENT_AUTHORITY",
        status: "PROHIBITED",
        licenseType: null,
        reason:
          "Counterparty is on EU Reg. 833/2014 Annex IV. Article 2b prohibits export of dual-use items to listed entities REGARDLESS of civilian intent. No licence exception derogates this prohibition.",
        recommendedAction:
          "DO NOT PROCEED. Cancel the operation and document the cancellation. If urgent business need exists, seek qualified counsel — Art. 2b derogations are limited to a narrow set of grandfathered contracts under Art. 12b. Re-confirm party identity via the latest OJEU amendment regulation.",
        triggerCode: "EU 833/2014 Art. 2b",
      });
      nextSteps.unshift(
        "BLOCKED: Counterparty on EU Reg. 833/2014 Annex IV. Art. 2b hard prohibition applies — no licence exception derogates. Cancel the operation.",
      );
    }
  }

  // ─── Gate 1: MTCR Cat. I ──────────────────────────────────────────
  const mtcrCatIBlock = triggerEval.hasMtcrCatIFlag;
  if (mtcrCatIBlock) {
    requirements.push({
      jurisdiction: "MTCR",
      authority: "MTCR_REVIEW",
      status: "DENIED",
      licenseType: null,
      reason:
        "Item triggers MTCR Category I threshold (≥ 500 kg / ≥ 300 km). Strong presumption of denial applies under MTCR partner-nation guidelines.",
      recommendedAction:
        "Do not proceed. Consult specialized export-control legal counsel with MTCR experience. MTCR Cat. I exports are effectively banned except in extraordinary circumstances (government-to-government with guarantees).",
      triggerCode: "MTCR Cat. I",
    });
    nextSteps.unshift(
      "URGENT: MTCR Cat. I strong-presumption-of-denial gate triggered. Halt export planning and seek specialized legal counsel immediately.",
    );
  }

  // ─── Gate 1.5: Comprehensive embargo destination (standalone) ─────
  // An embargoed destination (EAR Country Group E:1/E:2 — Cuba, Iran,
  // North Korea, Syria) is blocked by the DESTINATION itself, independent
  // of US-content / de-minimis. Previously the only embargo block lived
  // inside the de-minimis switch (Gate 3), which runs only when a US
  // content percentage is supplied — so e.g. an EAR99 item with no
  // usContentPercent shipped to Iran slipped through CLEARED. This gate
  // closes that gap: destination-only, fires regardless of de-minimis.
  const embargoDest = destinationCountry?.trim().toUpperCase();
  const embargoDestinationBlock = Boolean(
    embargoDest && EMBARGOED_COUNTRIES.has(embargoDest),
  );
  if (embargoDestinationBlock) {
    requirements.push({
      jurisdiction: `Comprehensive embargo (${embargoDest})`,
      authority: "BIS",
      status: "DENIED",
      licenseType: "SPECIFIC_LICENSE",
      reason: `Destination ${embargoDest} is in EAR Country Group E:1/E:2 (comprehensive US/EU embargo). Export is prohibited absent a specific licence; presumptive denial — independent of US-content / de-minimis.`,
      recommendedAction:
        "Do not proceed. Comprehensive-embargo destinations require a specific licence (BIS/BAFA) and denial is the presumptive outcome. Obtain qualified export-control counsel before any further step.",
      triggerCode: "EMBARGO_DESTINATION",
    });
    nextSteps.unshift(
      `BLOCKED: ${embargoDest} is a comprehensive-embargo destination (EAR E:1/E:2). Export prohibited absent a specific licence — presumptive denial.`,
    );
  }

  // ─── Gate 1.6: EU restrictive measures — RU/BY dual-use destination ban ──
  //
  // PF-1 (S0). A DESTINATION-based prohibition that the prior gates miss.
  // Russia and Belarus are NOT in EMBARGOED_COUNTRIES (= EAR Country Group
  // E:1∪E:2 = {CU, IR, KP, SY}); they sit in the D:1/RESTRICTED group, which
  // only changes the de-minimis THRESHOLD, not the licensing outcome. Before
  // this gate, a declared-9A004 dual-use bus from a DE exporter to RU resolved
  // to REVIEW (Gate 3.5) — but EU sanctions law PROHIBITS that export outright.
  //
  // Legal basis (verbatim instruments — destination-based, NO listed
  // counterparty required, unlike Gate 0's party-based Art. 2b):
  //   • Council Regulation (EU) 833/2014, Art. 2 + Art. 2a (as amended):
  //     prohibition to sell, supply, transfer or export, directly or
  //     indirectly, dual-use goods listed in Annex I of Reg. 2021/821 (Art. 2)
  //     and advanced-technology goods (Art. 2a) to any natural/legal person in
  //     Russia or for use in Russia. (Corroborated in-repo by
  //     `src/data/trade/russia-833-deep-annexes.ts` Annex VII et al. and the
  //     de-minimis calculator's country classifications.)
  //   • Council Regulation (EC) 765/2006 (Belarus, as amended 2022+),
  //     Art. 1e/1f: analogous prohibition on dual-use + advanced-tech exports
  //     to Belarus.
  //
  // SCOPE DECISION (documented): the gate fires for ALL exporter origins, not
  // only EU seats. Over-blocking is acceptable by product principle
  // ("Über-Blocken akzeptabel, Falsch-Freigeben nicht"); US (EAR § 746.8) and
  // UK have equivalent RU prohibitions, and an honest non-EU-origin path would
  // require per-origin embargo-law modelling = out of S0 scope.
  //
  // SIGNAL: the EU-dual-use leg only. Fires when the item carries a declared
  // `eccnEU` (or a declared non-EAR99 `eccnUS`, i.e. CCL dual-use) OR the
  // heuristic engine suggested an EU_ANNEX_I / US_CCL code — the SAME EU signal
  // Gate 3.5/4.5 use (`hasControlledDualUseCode` + `heuristicDualUseFired`).
  // Declared USML/ITAR-only signals do NOT newly block here: that is the
  // US-law leg, and AVA's `itarBlock` hard-blocks ITAR items separately
  // (Gate 2 / deriveVerdict.hardBlock). This keeps the gate's legal claim
  // honest — it asserts only the EU dual-use prohibition.
  //
  // HONESTY (Art. 2a advanced-tech leg): this gate covers Art. 2a / Reg.
  // 765/2006 advanced-tech goods ONLY insofar as the EU-dual-use signal fires.
  // The item-class-based Annex VII/XXIII/XXIX prohibitions are NOT modelled
  // here — there is no reliable itemClass signal in this pipeline. S1+ corpus
  // work will widen this leg.
  //
  // TIGHTENING-ONLY: guarded by `alreadyProhibited` so it never adds a
  // duplicate when Gate 0 (Annex IV) or Gate 1.5 (embargo) already prohibits,
  // and it never weakens a stricter outcome — it only ever adds a BLOCK.
  const RU_BY_BAN_COUNTRIES = new Set<string>(["RU", "BY"]);
  const ruByDest = destinationCountry?.trim().toUpperCase();
  const isRuByDestination = Boolean(
    ruByDest && RU_BY_BAN_COUNTRIES.has(ruByDest),
  );
  // EU-dual-use control signal — declared codes (mirrors Gate 3.5) OR the
  // heuristic EU_ANNEX_I/US_CCL signal (mirrors Gate 4.5's heuristicDualUseFired).
  const ruByEccnEU = actualCodes?.eccnEU?.trim();
  const ruByEccnUS = actualCodes?.eccnUS?.trim();
  const ruByHasDeclaredDualUse =
    !!ruByEccnEU || (!!ruByEccnUS && ruByEccnUS.toUpperCase() !== "EAR99");
  const ruByHeuristicDualUse = triggerEval.results.some((r) =>
    r.suggestedCodes.some(
      (c) => c.jurisdiction === "EU_ANNEX_I" || c.jurisdiction === "US_CCL",
    ),
  );
  const ruByHasDualUseSignal = ruByHasDeclaredDualUse || ruByHeuristicDualUse;
  // Idempotency: do not stack on top of an existing hard prohibition (Gate 0
  // Annex IV PROHIBITED, or Gate 1.5 embargo DENIED). Mirrors Gate 0's pattern.
  const ruByAlreadyProhibited = requirements.some(
    (r) => r.status === "DENIED" || r.status === "PROHIBITED",
  );
  let ruByDestinationBlock = false;
  if (isRuByDestination && ruByHasDualUseSignal && !ruByAlreadyProhibited) {
    ruByDestinationBlock = true;
    const isBelarus = ruByDest === "BY";
    // Effect mirrors Gate 0's hard-prohibition shape (PROHIBITED status,
    // EU_COMPETENT_AUTHORITY, no derogation) so the gate aggregation yields
    // BLOCKED and the embargoBlock flag (consumed by deriveVerdict.hardBlock)
    // is set true the same way Gate 1.5 sets it for EMBARGOED_COUNTRIES.
    requirements.push({
      jurisdiction: isBelarus
        ? "EU (Reg. 765/2006 — Belarus)"
        : "EU (Reg. 833/2014 — Russia)",
      authority: "EU_COMPETENT_AUTHORITY",
      status: "PROHIBITED",
      licenseType: null,
      reason: isBelarus
        ? "Verbringung von EU-Dual-Use-Gütern (Anhang I VO 2021/821) nach Belarus ist nach Art. 1e/1f VO (EG) 765/2006 verboten — kein Genehmigungsweg. (Die Art-1f-Advanced-Tech-Sperre ist nur insoweit abgedeckt, wie das EU-Dual-Use-Signal greift.)"
        : "Verbringung von EU-Dual-Use-Gütern (Anhang I VO 2021/821) nach Russland ist nach Art. 2/2a VO (EU) 833/2014 verboten — kein Genehmigungsweg. (Die Art-2a-Advanced-Tech-Sperre ist nur insoweit abgedeckt, wie das EU-Dual-Use-Signal greift.)",
      recommendedAction: isBelarus
        ? "NICHT AUSFÜHREN. Operation abbrechen und dokumentieren. Die Ausfuhr gelisteter Dual-Use-Güter nach Belarus ist nach VO (EG) 765/2006 untersagt; es gibt keinen regulären Genehmigungsweg. Etwaige enge Ausnahmen nur mit qualifiziertem Exportkontroll-Rechtsberater prüfen."
        : "NICHT AUSFÜHREN. Operation abbrechen und dokumentieren. Die Ausfuhr gelisteter Dual-Use-Güter nach Russland ist nach VO (EU) 833/2014 untersagt; es gibt keinen regulären Genehmigungsweg. Etwaige enge Ausnahmen nur mit qualifiziertem Exportkontroll-Rechtsberater prüfen.",
      triggerCode: isBelarus
        ? "EU_RESTRICTIVE_BY_DUAL_USE"
        : "EU_RESTRICTIVE_RU_DUAL_USE",
    });
    nextSteps.unshift(
      isBelarus
        ? "BLOCKED: Ausfuhr von EU-Dual-Use-Gütern nach Belarus ist nach Art. 1e/1f VO (EG) 765/2006 verboten — kein Genehmigungsweg. Operation abbrechen."
        : "BLOCKED: Ausfuhr von EU-Dual-Use-Gütern nach Russland ist nach Art. 2/2a VO (EU) 833/2014 verboten — kein Genehmigungsweg. Operation abbrechen.",
    );
  }

  // ─── Gate 2: ITAR / USML ──────────────────────────────────────────
  const itarBlock = triggerEval.hasItarFlag;
  if (itarBlock) {
    requirements.push({
      jurisdiction: "US (ITAR)",
      authority: "DDTC",
      status: "REQUIRED",
      licenseType: "DSP5",
      reason:
        "Item is ITAR-controlled (USML jurisdiction). DDTC export authorization (DSP-5 physical export license or TAA for technology) is required. De-minimis rule does NOT apply.",
      recommendedAction:
        "File a DSP-5 export license application with DDTC at dtrade.state.gov. Or, if transferring technical data, negotiate a TAA. Consider requesting a Commodity Jurisdiction (CJ) determination if borderline.",
      triggerCode: triggerEval.results
        .flatMap((r) =>
          r.suggestedCodes.filter((c) => c.itar).map((c) => c.code),
        )
        .join(", "),
    });
    nextSteps.push(
      "File DDTC DSP-5 or negotiate TAA for ITAR-controlled article/technology.",
    );
  }

  // ─── Gate 3: De-minimis / EAR result ──────────────────────────────
  if (deMinimis) {
    switch (deMinimis.outcome) {
      case "ITAR_CONTROLLED":
        // Already handled above — add BIS note
        requirements.push({
          jurisdiction: "US (EAR)",
          authority: "BIS",
          status: "NLR",
          licenseType: "NLR",
          reason:
            "ITAR controls take precedence. BIS (EAR) jurisdiction does not apply separately to USML items.",
          recommendedAction: "See DDTC requirement above.",
        });
        break;

      case "EMBARGOED_DESTINATION":
        // Skip if Gate 1.5 already raised the standalone embargo block for
        // this destination — avoid a duplicate DENIED requirement.
        if (!embargoDestinationBlock) {
          requirements.push({
            jurisdiction: "US (EAR)",
            authority: "BIS",
            status: "DENIED",
            licenseType: "SPECIFIC_LICENSE",
            reason: `Destination (${destinationCountry ?? "embargoed"}) is subject to comprehensive US embargo. BIS-specific license required; most applications denied.`,
            recommendedAction:
              "Do not proceed. US comprehensive embargo destinations require BIS-specific license; denial is the presumptive outcome. Legal review required.",
          });
          nextSteps.push(
            "BLOCKED: Destination is on embargoed country list. BIS license required; presumptive denial.",
          );
        }
        break;

      case "DE_MINIMIS_EXCEEDED":
        requirements.push({
          jurisdiction: "US (EAR)",
          authority: "BIS",
          status: "REQUIRED",
          licenseType: "SPECIFIC_LICENSE",
          reason: `US-origin EAR content (${deMinimis.usControlledContentPercent}%) exceeds de-minimis threshold (${deMinimis.appliedThresholdPercent}%). EAR controls apply to the foreign-made item.`,
          recommendedAction:
            "Apply for BIS license or identify applicable license exception (STA, ENC, TMP, etc.) at bis.doc.gov. Do not export without authorization.",
        });
        nextSteps.push(
          `US EAR license required: US content ${deMinimis.usControlledContentPercent}% > ${deMinimis.appliedThresholdPercent}% threshold.`,
        );
        break;

      case "FDPR_TRIGGERED":
        requirements.push({
          jurisdiction: "US (EAR / FDPR)",
          authority: "BIS",
          status: "LIKELY_REQUIRED",
          licenseType: "SPECIFIC_LICENSE",
          reason:
            "Foreign Direct Product Rule (FDPR) may subject this item to EAR. Item was made using US-origin technology or equipment.",
          recommendedAction:
            "Conduct full FDPR analysis per 15 CFR § 734.9. Determine if the item is a 'direct product' of US technology and whether destination/end-use criteria apply.",
        });
        nextSteps.push(
          "Complete FDPR analysis (15 CFR § 734.9) before shipping. Check Russia/Belarus FDPR and Advanced Computing FDPR if applicable.",
        );
        break;

      case "DE_MINIMIS_ELIGIBLE":
        requirements.push({
          jurisdiction: "US (EAR)",
          authority: "BIS",
          status: "EXCEPTION_MAY_APPLY",
          licenseType: "NLR",
          reason: `US-origin EAR content (${deMinimis.usControlledContentPercent}%) is within de-minimis threshold (${deMinimis.appliedThresholdPercent}%). EAR may not apply solely on de-minimis grounds.`,
          recommendedAction:
            "Document de-minimis calculation with BoM cost data. Retain records for 5 years. Ensure all other conditions (end-use, end-user, country) are also clear.",
        });
        nextSteps.push(
          "Document de-minimis calculation and retain for 5 years per EAR recordkeeping requirements.",
        );
        break;

      case "REQUIRES_LEGAL_REVIEW":
        requirements.push({
          jurisdiction: "US (EAR)",
          authority: "BIS",
          status: "UNKNOWN",
          licenseType: null,
          reason:
            "De-minimis calculation could not be completed — special ECCN or missing data. Manual legal review required.",
          recommendedAction:
            "Engage qualified US export-control counsel for a full EAR jurisdiction analysis.",
        });
        nextSteps.push(
          "EAR jurisdiction unclear: engage qualified US export-control counsel.",
        );
        break;
    }
  } else {
    // No de-minimis result provided
    if (triggerEval.triggeredRuleCount > 0 && !itarBlock) {
      requirements.push({
        jurisdiction: "US (EAR)",
        authority: "BIS",
        status: "UNKNOWN",
        licenseType: null,
        reason:
          "Trigger engine fired but de-minimis analysis not yet completed. Cannot determine EAR licensing requirement.",
        recommendedAction:
          "Run the De-minimis Calculator (Sprint B5) with US content percentage and destination country.",
      });
      nextSteps.push(
        "Complete de-minimis analysis before determining EAR licensing requirement.",
      );
    }
  }

  // ─── Gate 4: EU / DE licensing ───────────────────────────────────
  const hasEuCodes = triggerEval.results.some((r) =>
    r.suggestedCodes.some(
      (c) =>
        c.jurisdiction === "EU_ANNEX_I" || c.jurisdiction === "DE_ANLAGE_AL",
    ),
  );
  if (hasEuCodes) {
    const hasMtcr = triggerEval.results.some((r) =>
      r.suggestedCodes.some((c) => c.mtcrCatI),
    );
    if (hasMtcr) {
      requirements.push({
        jurisdiction: "EU / DE",
        authority: "BAFA",
        status: "DENIED",
        licenseType: "BAFA_ANTRAG",
        reason:
          "Item meets MTCR Cat. I criteria — EU Reg. 2021/821 Art. 4(2) catch-all / MTCR presumption-of-denial applies. BAFA will not issue a license for Cat. I items without extraordinary justification.",
        recommendedAction:
          "Do not apply for BAFA export license without obtaining BAFA Auskunft zur Güterliste first. Consult BAFA's Beratungsstelle.",
      });
    } else {
      requirements.push({
        jurisdiction: "EU / DE",
        authority: "BAFA",
        status: "REQUIRED",
        licenseType: "BAFA_ANTRAG",
        reason:
          "Item is listed in EU Annex I or DE Anlage AL. BAFA individual export license (Antrag) required for non-EU destinations, or EU General Export Authorizations (EU001-EU006) may apply.",
        recommendedAction:
          "Check applicable EU General Export Authorizations (Reg. 2021/821 Annex II) for the destination. If none applies, file BAFA Antrag via ELAN-K2.",
      });
      nextSteps.push(
        "File BAFA export license application via ELAN-K2 (elan.bafa.bund.de) or confirm applicable EU General Authorization.",
      );
    }
  }

  // ─── Sprint D4: fold in license-exception-matrix ──────────────────
  //
  // When the caller supplies an exceptionContext, run the exception
  // matrix and downgrade any REQUIRED requirement whose authority has
  // a matching applicable exception. Skip DENIED (embargo / MTCR Cat I
  // — exceptions don't undo those gates) and LIKELY_REQUIRED / UNKNOWN
  // (not confident enough that an exception fits; keep operator alerted).
  //
  // The mapping authority → exception-code-prefix:
  //   BIS  → "BIS_LICENSE_EXCEPTION_*"  (STA, ENC, GOV, TMP)
  //   BAFA → "BAFA_AGG_*" + "BAFA_EUGEA_*"
  //
  // DDTC ITAR exemptions and UK OGELs are out of scope for the matrix
  // today, so DDTC + UK requirements pass through unchanged.
  let applicableExceptions: ApplicableException[] | undefined;
  if (exceptionContext && destinationCountry) {
    const matchResult = matchLicenseExceptions({
      ...exceptionContext,
      destinationCountry,
    });
    applicableExceptions = matchResult.applicable;

    if (matchResult.applicable.length > 0) {
      for (let i = 0; i < requirements.length; i += 1) {
        const req = requirements[i];
        if (req.status !== "REQUIRED") continue;
        const exc = findExceptionForAuthority(
          req.authority,
          matchResult.applicable,
        );
        if (!exc) continue;
        requirements[i] = {
          ...req,
          status: "EXCEPTION_MAY_APPLY",
          licenseType: "LICENSE_EXCEPTION",
          reason: `${req.reason} However, ${exc.label} (${exc.citation}) may apply — see conditions.`,
          recommendedAction: `Evaluate ${exc.label} per conditions: ${exc.conditions.join("; ")}. If conditions are met, file appropriate notice/declaration instead of a full license application. Original action: ${req.recommendedAction}`,
          applicableException: {
            code: exc.code,
            label: exc.label,
            citation: exc.citation,
            conditions: exc.conditions,
          },
        };
      }
    }
  }

  // ── Gate 3.5: declared control-code backstop (T-M5 completion) ───────
  // Declared control codes must drive the gate even when NO heuristic
  // trigger fired (e.g. a manually-declared ECCN/USML with no physical
  // signals). Two INDEPENDENT controls (an item can be both):
  //   • USML / ITAR (usmlCategory): control attaches to the ITEM itself —
  //     DDTC authorisation is needed for ANY export/transfer, no intra-EU
  //     exemption, independent of destination. Fires even when the
  //     destination is unknown (e.g. item-level classification).
  //   • EU Annex I dual-use (eccnEU, or eccnUS ≠ EAR99): licensing depends
  //     on the DESTINATION. Only a KNOWN non-EU destination requires a
  //     determination → REVIEW_NEEDED. Intra-EU transfers of non-Annex-IV
  //     items are exempt, and an UNKNOWN destination (destination-agnostic
  //     item-level view, T-H6) does NOT fire — the per-operation assessment
  //     handles it once the destination is set.
  // Runs AFTER the Sprint D4 exception matrix on purpose, so its REQUIRED
  // requirements are never silently downgraded. It can only tighten the gate.
  const alreadyProhibited = requirements.some(
    (r) => r.status === "DENIED" || r.status === "PROHIBITED",
  );
  if (!alreadyProhibited) {
    const eccnEUCode = actualCodes?.eccnEU?.trim();
    const eccnUSCode = actualCodes?.eccnUS?.trim();
    const usmlCode = actualCodes?.usmlCategory?.trim();

    // USML / ITAR — item-intrinsic, destination-independent. Skip if an ITAR
    // requirement already exists (heuristic Gate 2 or the itarBlock flag).
    const itarAlreadyCovered =
      itarBlock || requirements.some((r) => r.authority === "DDTC");
    if (usmlCode && !itarAlreadyCovered) {
      requirements.push({
        jurisdiction: "US (ITAR / USML)",
        authority: "DDTC",
        status: "REQUIRED",
        licenseType: "SPECIFIC_LICENSE",
        reason: `Item is classified as ITAR-controlled (USML ${usmlCode}). A DDTC authorisation is required for any export, re-export or transfer; there is no intra-EU exemption for ITAR items.`,
        recommendedAction: `Obtain the applicable DDTC authorisation (e.g. DSP-5 / TAA) before any transfer.`,
        triggerCode: "ACTUAL_USML_DECLARED",
      });
    }

    // EU Annex I dual-use — destination-dependent: only a KNOWN non-EU
    // destination requires a determination. Skip if a dual-use requirement
    // already exists.
    const hasControlledDualUseCode =
      !!eccnEUCode || (!!eccnUSCode && eccnUSCode.toUpperCase() !== "EAR99");
    const destinationKnownNonEU =
      !!destinationCountry &&
      !EU27_MEMBER_STATES.has(destinationCountry.trim().toUpperCase());
    const dualUseAlreadyCovered = requirements.some(
      (r) =>
        r.triggerCode === "ACTUAL_CODE_DECLARED" ||
        r.authority === "BAFA" ||
        r.authority === "EU_COMPETENT_AUTHORITY",
    );
    if (
      hasControlledDualUseCode &&
      destinationKnownNonEU &&
      !dualUseAlreadyCovered
    ) {
      const code = eccnEUCode || eccnUSCode;
      requirements.push({
        jurisdiction: `Export to ${destinationCountry}`,
        authority: "BAFA",
        status: "REQUIRED",
        licenseType: "BAFA_ANTRAG",
        reason: `Item is classified as export-controlled (ECCN ${code}). Export of an EU Annex I dual-use item outside the EU requires an export-licence determination, even when no heuristic trigger fired. Intra-EU transfers of non-Annex-IV items are exempt.`,
        recommendedAction: `Determine the applicable licence (a specific BAFA licence or an EU general/global authorisation) for destination ${destinationCountry} before shipping.`,
        triggerCode: "ACTUAL_CODE_DECLARED",
      });
    }
  }

  // ── Gate 4.5: Fail-closed thin-origin-coverage gate (S0 Task 7) ─────
  //
  // Purpose: when the exporter's origin regime is supported (known seat)
  // but has REGIME_MATURITY === 3 (not yet deeply modelled in Passage),
  // the engine cannot confidently evaluate that regime's own licensing
  // rules. For control-suspicious items, we MUST flag this for human
  // review rather than silently clearing.
  //
  // Fires when ALL of:
  //   1. exporterOrigin is supplied and supported === true
  //   2. At least one of the primary list legs (dualUsePrimary or
  //      militaryPrimary) maps to a CorpusRegime with REGIME_MATURITY === 3
  //   3. The item is "control-suspicious" — same signals as Gate 3.5
  //      (declared ECCN or USML, or heuristic trigger fired). One thin
  //      leg suffices for condition 2 (fail-closed).
  //
  // Effect: tightening-only — promotes gate to REVIEW_NEEDED (or higher if
  // already BLOCKED). Never downgrades an existing BLOCKED/DENIED.
  if (exporterOrigin?.supported === true) {
    // Condition 2: check primary lists against item signals — dual-use leg
    // fires for dual-use items; military leg fires for USML/ITAR items.
    // Coupling each leg to its matching item-type avoids false reviews on
    // DE exporters (EU_ANNEX_I maturity 2, EU_CML maturity 3) for purely
    // dual-use items. One thin leg still suffices when an item IS both.
    const eccnEUCode = actualCodes?.eccnEU?.trim();
    const eccnUSCode = actualCodes?.eccnUS?.trim();
    const usmlCode = actualCodes?.usmlCategory?.trim();
    const hasControlledDualUseCode =
      !!eccnEUCode || (!!eccnUSCode && eccnUSCode.toUpperCase() !== "EAR99");
    const hasDeclaredUsml = !!usmlCode;
    // Heuristic triggers: dual-use heuristic (EU_ANNEX_I/US_CCL codes) or
    // ITAR heuristic. Gate 3.5 mirrors this exactly.
    const heuristicDualUseFired = triggerEval.results.some((r) =>
      r.suggestedCodes.some(
        (c) => c.jurisdiction === "EU_ANNEX_I" || c.jurisdiction === "US_CCL",
      ),
    );
    const heuristicItarFired = triggerEval.hasItarFlag;

    // Determine which primary list qualifies as "thin" for this item:
    //   — dualUsePrimary: relevant when item has dual-use signals (eccnEU/US or
    //     EU_ANNEX_I/US_CCL heuristic). Mirrors Gate 3.5's `hasControlledDualUseCode`
    //     condition.
    //   — militaryPrimary: relevant only when item has USML/ITAR signals (declared
    //     usmlCategory or heuristic ITAR flag).
    let thinRegimeListId: ListId | undefined;

    if (hasControlledDualUseCode || heuristicDualUseFired) {
      const dualCorpus =
        LIST_ID_TO_CORPUS_REGIME[exporterOrigin.dualUsePrimary];
      if (dualCorpus !== undefined && REGIME_MATURITY[dualCorpus] === 3) {
        thinRegimeListId = exporterOrigin.dualUsePrimary;
      }
    }
    if (
      thinRegimeListId === undefined &&
      exporterOrigin.militaryPrimary !== null &&
      (hasDeclaredUsml || heuristicItarFired)
    ) {
      const milCorpus =
        LIST_ID_TO_CORPUS_REGIME[exporterOrigin.militaryPrimary];
      if (milCorpus !== undefined && REGIME_MATURITY[milCorpus] === 3) {
        thinRegimeListId = exporterOrigin.militaryPrimary;
      }
    }

    if (thinRegimeListId !== undefined) {
      // Only add the gate if it is not already blocked/prohibited (never loosen BLOCKED).
      const alreadyBlocked = requirements.some(
        (r) => r.status === "DENIED" || r.status === "PROHIBITED",
      );
      if (!alreadyBlocked) {
        const label = listIdLabel(thinRegimeListId);
        requirements.push({
          jurisdiction: `Exporteur-Sitz (${thinRegimeListId})`,
          authority: "EU_COMPETENT_AUTHORITY",
          status: "LIKELY_REQUIRED",
          licenseType: null,
          reason: `${label} ist in Passage noch nicht tief genug abgedeckt (Tier 3) — Genehmigungspflicht nach ${thinRegimeListId}-Recht manuell prüfen`,
          recommendedAction: `Die Ausfuhrkontrollpflichten nach ${label} manuell mit qualifiziertem Exportkontroll-Rechtsberater klären, bevor die Sendung erfolgt.`,
          triggerCode: "THIN_ORIGIN_REGIME",
        });
        nextSteps.push(
          `Genehmigungspflicht nach ${label} (Tier 3 — nicht vollständig modelliert) manuell prüfen.`,
        );
      }
    }
  }

  // ─── Determine overall gate ───────────────────────────────────────
  // PROHIBITED (Annex IV Art. 2b) is treated equivalently to DENIED for
  // gate-calculation purposes — both produce a BLOCKED overall gate.
  const hasBlocked = requirements.some(
    (r) => r.status === "DENIED" || r.status === "PROHIBITED",
  );
  const hasRequired = requirements.some((r) => r.status === "REQUIRED");
  const hasLikely = requirements.some(
    (r) => r.status === "LIKELY_REQUIRED" || r.status === "UNKNOWN",
  );

  let gate: OverallGate;
  if (hasBlocked || mtcrCatIBlock || annexIVBlock) {
    gate = "BLOCKED";
  } else if (hasRequired || hasLikely) {
    gate = "REVIEW_NEEDED";
  } else if (triggerEval.triggeredRuleCount === 0) {
    gate = "CLEARED";
  } else {
    gate = "REVIEW_NEEDED";
  }

  // ─── Generic next steps ───────────────────────────────────────────
  if (nextSteps.length === 0) {
    nextSteps.push(
      "Conduct end-user and end-use screening against OFAC, BIS, DDTC, and EU/UN denial lists before shipping.",
    );
    nextSteps.push(
      "Retain export records (EEI, license, shipping docs) for 5 years.",
    );
  }

  // embargoBlock — consumed by AVA's deriveVerdict.hardBlock. Gate 1.6's RU/BY
  // dual-use prohibition is an EU restrictive-measures embargo for this flag's
  // purpose: set it the SAME way Gate 1.5 (EMBARGOED_COUNTRIES) does so the
  // operation verdict hard-blocks. (PF-1.)
  const embargoBlock =
    embargoDestinationBlock ||
    ruByDestinationBlock ||
    deMinimis?.outcome === "EMBARGOED_DESTINATION" ||
    requirements.some(
      (r) => r.status === "DENIED" && r.jurisdiction.includes("embargo"),
    );

  return {
    requirements,
    gate,
    mtcrCatIBlock,
    itarBlock,
    embargoBlock,
    annexIVBlock,
    nextSteps,
    ...(applicableExceptions ? { applicableExceptions } : {}),
    disclaimer: DISCLAIMER,
  };
}

/**
 * Map a license authority onto the first applicable exception in the
 * provided list. BIS exceptions (codes starting with
 * "BIS_LICENSE_EXCEPTION_") match BIS requirements; BAFA exceptions
 * ("BAFA_AGG_*" or "BAFA_EUGEA_*") match BAFA / EU_COMPETENT_AUTHORITY
 * requirements. Returns the first match — the matrix returns
 * exceptions in a stable evaluator order, so this gives deterministic
 * picks when several exceptions apply (e.g. STA + ENC for an
 * encryption item to a Country-Group A:5 destination).
 */
function findExceptionForAuthority(
  authority: LicenseAuthority,
  applicable: ApplicableException[],
): ApplicableException | undefined {
  for (const exc of applicable) {
    if (authority === "BIS" && exc.code.startsWith("BIS_LICENSE_EXCEPTION_")) {
      return exc;
    }
    if (
      (authority === "BAFA" || authority === "EU_COMPETENT_AUTHORITY") &&
      (exc.code.startsWith("BAFA_AGG_") || exc.code.startsWith("BAFA_EUGEA_"))
    ) {
      return exc;
    }
  }
  return undefined;
}

/**
 * Shorthand: is this determination fully blocked (cannot export)?
 */
export function isExportBlocked(det: LicenseDetermination): boolean {
  return det.gate === "BLOCKED";
}

/**
 * Count how many jurisdictions require explicit authorization.
 */
export function countRequiredLicenses(det: LicenseDetermination): number {
  return det.requirements.filter(
    (r) => r.status === "REQUIRED" || r.status === "DENIED",
  ).length;
}
