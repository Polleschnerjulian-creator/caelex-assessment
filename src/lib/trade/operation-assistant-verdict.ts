import type { ClassificationResult } from "@/lib/trade/classification/classify-item";
import type { TradeScreeningStatus } from "@prisma/client";
import {
  explainedResult,
  unverifiedResult,
  type ExplainedResult,
  type ExplainSource,
} from "@/lib/comply-v2/trade/explained-result";

export type Verdict = "GO" | "REVIEW" | "BLOCKED";
export type StepStatus = "done" | "gap" | "blocked";
export type AssistantStep =
  | "classify"
  | "screen"
  | "jurisdiction"
  | "license"
  | "form";

export interface StepResult {
  step: AssistantStep;
  status: StepStatus;
  summary: string;
  why: string;
  detailRef?: string;
}
export interface Pendenz {
  /** Stable machine-readable identifier. Optional for legacy callers. */
  id?: string;
  label: string;
  actionHref?: string;
}
export interface LineAssessment {
  lineId: string;
  itemId: string;
  itemName: string;
  classified: boolean;
  classification: ClassificationResult | null;
}
export interface ScreeningAssessment {
  status: TradeScreeningStatus;
  partyName: string;
  partyBlocked: boolean;
  /** When the counterparty was last screened. A CLEAR party whose last
   *  screening is older than SCREENING_STALE_AFTER_DAYS is treated as a gap
   *  (not a clean GO), so the verdict reflects screening freshness in real
   *  time rather than trusting a possibly-outdated stored CLEAR. Omitted /
   *  null = freshness unknown → not downgraded. */
  lastScreenedAt?: Date | null;
}
/**
 * Provenance of the US-content percentage that drives the de-minimis math.
 *
 *   SELF_DECLARED — the operator typed `usContentPercent` on the item (a single
 *     `TradeItem.usContentPercent` Float). It is NOT derived from a verifiable,
 *     line-item bill of materials. A favourable (below-threshold / eligible)
 *     de-minimis outcome resting on a self-declared number must therefore NEVER
 *     be shown as a confident green — it is downgraded to UNVERIFIED so the
 *     "US-Anteil selbst-deklariert — nicht aus einer geprüften Stückliste"
 *     caveat is unmissable. This is the operation-verdict default today: the
 *     operation lines carry only a single percentage, no BOM rollup.
 *
 *   BOM_ROLLUP — the percentage was rolled up from an auditable per-line bill
 *     of materials (per `calculateBomDeMinimis()`, 15 CFR § 734.4 + Supp. No. 2
 *     to Part 734). A favourable outcome MAY then carry a higher (but still
 *     cited, never blindly green) confidence. Reserved for when the operation
 *     verdict is fed a real BOM — DO NOT pass this on a self-declared number.
 *
 * Strictly less permissive by construction: SELF_DECLARED can only DOWNGRADE
 * confidence; it never upgrades an outcome or relaxes a threshold.
 */
export type DeMinimisProvenance = "SELF_DECLARED" | "BOM_ROLLUP";

export interface VerdictResult {
  verdict: Verdict;
  headline: string;
  steps: StepResult[];
  pendenzen: Pendenz[];
  /**
   * G9 — the de-minimis result, surfaced through the explanation envelope so
   * the operator sees the threshold applied (25% std / 10% D:1 / 0% E:1-E:2,
   * 15 CFR § 734.4) AND the provenance of the US-content input. Built by
   * `deriveDeMinimisExplained()`. ALWAYS present (the de-minimis question is
   * always answered, even if the answer is "no US-content was declared").
   *
   * The `value` carries the machine-readable de-minimis facts; the envelope
   * carries the honest WHY/WHEREFORE/CONFIDENCE. When the input is
   * self-declared (the operation default), a favourable outcome is capped at
   * UNVERIFIED — never a confident green de-minimis on an unaudited number.
   */
  deMinimisExplained: ExplainedResult<DeMinimisVerdictValue>;
  /**
   * Spec §4.3b / Task 6 — the primary dual-use list under which this operation
   * was assessed (e.g. "EU_ANNEX_I", "EAR_CCL"). Set only when the exporter's
   * country-of-seat is known AND supported by Passage. Null for unsupported or
   * unknown seats.
   */
  assessedUnder?: string | null;
  /**
   * Spec §4.7 / Task 6 — informational notice shown when the org's billing
   * address could not be resolved (no country set). Signals that the assessment
   * implicitly applied EU standard rules without a confirmed seat.
   */
  originNotice?: string | null;
}

/**
 * Machine-readable de-minimis facts carried inside the envelope's `value`.
 * Mirrors the fields a reviewer / dossier needs, decoupled from the prose.
 */
export interface DeMinimisVerdictValue {
  /** The de-minimis outcome aggregated across the operation's lines. */
  outcome: DeMinimisVerdictOutcome;
  /** Provenance of the US-content input the math rested on. */
  provenance: DeMinimisProvenance;
  /**
   * The most-permissive applied threshold across the lines, for display:
   * 25 (standard / D:1), 10 (E:1-E:2 reduced), 0 (ITAR / no de-minimis), or
   * null when no de-minimis math ran (no US-content declared).
   */
  appliedThresholdPercent: number | null;
  /**
   * The self-declared US-controlled-content percentage that drove the math,
   * or null when none was declared. Surfaced so the reviewer sees the exact
   * number whose provenance is being qualified.
   */
  usControlledContentPercent: number | null;
}

/**
 * Aggregated de-minimis outcome across an operation's lines. The blocking /
 * gap-producing outcomes mirror the per-item `DeMinimisResult.outcome`; the
 * verdict additionally distinguishes "no US-content was declared" from
 * "declared content is within threshold" because their honesty differs.
 */
export type DeMinimisVerdictOutcome =
  | "ITAR_CONTROLLED"
  | "EXCEEDED_OR_FDPR"
  | "EMBARGOED_DESTINATION"
  | "REQUIRES_LEGAL_REVIEW"
  | "WITHIN_THRESHOLD"
  | "NO_US_CONTENT_DECLARED";

const VERDICT_EMOJI: Record<Verdict, string> = {
  GO: "\u{1F7E2}",
  REVIEW: "\u{1F7E1}",
  BLOCKED: "\u{1F534}",
};

/** A CLEAR counterparty whose last screening is older than this is treated as
 *  a screening gap by the verdict (matches the trade-rescreen-stale cron's
 *  STALE_AFTER_DAYS = 30). */
const SCREENING_STALE_AFTER_DAYS = 30;

function worst(a: StepStatus, b: StepStatus): StepStatus {
  if (a === "blocked" || b === "blocked") return "blocked";
  if (a === "gap" || b === "gap") return "gap";
  return "done";
}

function hardBlock(c: ClassificationResult): boolean {
  const d = c.licenseDetermination;
  return (
    d.gate === "BLOCKED" ||
    d.itarBlock ||
    d.embargoBlock ||
    d.annexIVBlock ||
    d.mtcrCatIBlock
  );
}

function licenseRequired(c: ClassificationResult): boolean {
  return c.licenseDetermination.requirements.some((r) =>
    ["REQUIRED", "LIKELY_REQUIRED", "EXCEPTION_MAY_APPLY", "UNKNOWN"].includes(
      r.status,
    ),
  );
}

// ─── De-minimis explanation envelope (G9 — de-minimis honesty) ──────────────
//
// The operation verdict's de-minimis input is the per-item self-declared
// `usContentPercent` (a single `TradeItem.usContentPercent` Float), NOT an
// auditable per-line bill-of-materials rollup. A favourable de-minimis outcome
// resting on a self-declared number is therefore NEVER shown as a confident
// green — it is surfaced through the explanation envelope at UNVERIFIED
// confidence with the plain caveat that the number is operator-declared. This
// only ever DOWNGRADES confidence (fail-closed); it changes no threshold and
// flips no outcome.

/** 15 CFR § 734.4 — the de-minimis rule citation, reused across envelopes. */
const DE_MINIMIS_CITATION = "15 CFR § 734.4 (De minimis U.S. content)";

/** Source provenance for a de-minimis determination — the statute itself. */
function deMinimisStatuteSource(): ExplainSource {
  return {
    label: "EAR De-minimis Rule (15 CFR Part 734)",
    citation: DE_MINIMIS_CITATION,
    listVersion: "15 CFR Part 734 + Supp. No. 2 to Part 734",
    url: "https://www.ecfr.gov/current/title-15/part-734/section-734.4",
  };
}

/**
 * Plain-language provenance caveat for a self-declared US-content input.
 * Single-sourced so the wording stays identical across `why` + `wherefore`.
 */
const SELF_DECLARED_CAVEAT =
  "US-Anteil selbst-deklariert — nicht aus einer geprüften Stückliste (BOM) abgeleitet. Die Prozentzahl wurde vom Bediener am Artikel eingetragen (TradeItem.usContentPercent), nicht aus einer per-Position bewerteten Stückliste nach 15 CFR § 734.4 + Supplement Nr. 2 zu Part 734 hochgerechnet.";

/**
 * The verbose outcome string emitted by the per-item de-minimis calculator,
 * as carried on `ClassificationResult.deMinimis.outcome`.
 */
type RawDeMinimisOutcome =
  | "DE_MINIMIS_ELIGIBLE"
  | "DE_MINIMIS_EXCEEDED"
  | "ITAR_CONTROLLED"
  | "FDPR_TRIGGERED"
  | "EMBARGOED_DESTINATION"
  | "REQUIRES_LEGAL_REVIEW";

/**
 * Pick the single de-minimis outcome that governs the whole operation, by
 * precedence: ITAR → embargo → exceeded/FDPR → legal-review → within-threshold
 * → none declared. Conservative: the most-blocking outcome present wins, so
 * one bad line is never masked by a clean one.
 */
function aggregateDeMinimisOutcome(classified: ClassificationResult[]): {
  outcome: DeMinimisVerdictOutcome;
  governing: ClassificationResult | null;
} {
  const raw = classified
    .map((c) => ({
      c,
      o: c.deMinimis?.outcome as RawDeMinimisOutcome | undefined,
    }))
    .filter((x): x is { c: ClassificationResult; o: RawDeMinimisOutcome } =>
      Boolean(x.o),
    );

  if (raw.length === 0) {
    return { outcome: "NO_US_CONTENT_DECLARED", governing: null };
  }

  const find = (o: RawDeMinimisOutcome) =>
    raw.find((x) => x.o === o)?.c ?? null;

  const itar = find("ITAR_CONTROLLED");
  if (itar) return { outcome: "ITAR_CONTROLLED", governing: itar };

  const embargo = find("EMBARGOED_DESTINATION");
  if (embargo) return { outcome: "EMBARGOED_DESTINATION", governing: embargo };

  const exceeded = find("DE_MINIMIS_EXCEEDED") ?? find("FDPR_TRIGGERED");
  if (exceeded) return { outcome: "EXCEEDED_OR_FDPR", governing: exceeded };

  const legal = find("REQUIRES_LEGAL_REVIEW");
  if (legal) return { outcome: "REQUIRES_LEGAL_REVIEW", governing: legal };

  const eligible = find("DE_MINIMIS_ELIGIBLE");
  if (eligible) return { outcome: "WITHIN_THRESHOLD", governing: eligible };

  // Should be unreachable (all raw outcomes are covered above), but stay
  // conservative: an unrecognised outcome is treated as "needs review".
  return { outcome: "REQUIRES_LEGAL_REVIEW", governing: raw[0].c };
}

/**
 * Build the de-minimis explanation envelope for an operation, establishing the
 * PROVENANCE of the US-content input (G9). Pure — no I/O.
 *
 * Confidence rules (strictly fail-closed):
 *   - ITAR_CONTROLLED / EMBARGOED_DESTINATION → a determined BLOCK. These do
 *     not depend on the (un)trustworthiness of the percentage — ITAR is a 0%
 *     rule and an embargo is destination-driven — so they carry a determined
 *     confidence (HIGH) and a real source. They are never green regardless.
 *   - EXCEEDED_OR_FDPR / REQUIRES_LEGAL_REVIEW → a determined NON-clear
 *     (review-needed) result; surfaced with its threshold + provenance. A
 *     self-declared input that already EXCEEDS the threshold is, if anything,
 *     conservative (a true BOM could only move the number, and the outcome is
 *     already non-clear), so a determined band is honest here.
 *   - WITHIN_THRESHOLD → the dangerous case. A "below the de-minimis threshold"
 *     result is the only outcome that could read as a green clearance. On a
 *     SELF_DECLARED input it is therefore capped at UNVERIFIED — never a
 *     confident green on an unaudited number. On a BOM_ROLLUP input it may
 *     carry a determined (LOW) band, still citing the BOM source.
 *   - NO_US_CONTENT_DECLARED → UNVERIFIED: the absence of a declared US-content
 *     percentage is not a clearance. "Eine fehlende Einstufung ist keine
 *     Freigabe" — the operator simply hasn't supplied the input.
 */
export function deriveDeMinimisExplained(
  classified: ClassificationResult[],
  provenance: DeMinimisProvenance = "SELF_DECLARED",
): ExplainedResult<DeMinimisVerdictValue> {
  const { outcome, governing } = aggregateDeMinimisOutcome(classified);
  const dm = governing?.deMinimis ?? null;
  const pct = dm?.usControlledContentPercent ?? null;
  const threshold = dm?.appliedThresholdPercent ?? null;
  const selfDeclared = provenance === "SELF_DECLARED";

  const value: DeMinimisVerdictValue = {
    outcome,
    provenance,
    appliedThresholdPercent: outcome === "ITAR_CONTROLLED" ? 0 : threshold,
    usControlledContentPercent: pct,
  };

  // Provenance line appended to the WHY for every percentage-driven outcome.
  const provenanceLine = selfDeclared
    ? ` ${SELF_DECLARED_CAVEAT}`
    : " US-Anteil aus einer per-Position bewerteten Stückliste (BOM) hochgerechnet (15 CFR § 734.4 + Supplement Nr. 2 zu Part 734).";

  switch (outcome) {
    case "ITAR_CONTROLLED":
      return explainedResult({
        value,
        what: "ITAR-kontrollierter US-Anteil — De-minimis greift nicht (0%-Regel).",
        why: "Der Vorgang enthält USML/ITAR-kontrollierten US-Anteil. Für ITAR-Artikel gilt keine De-minimis-Schwelle (0%, 15 CFR § 734.4) — schon ein Bruchteil eines Prozents begründet US-Jurisdiktion (DDTC). Dieser Block hängt NICHT von der Prozentzahl ab.",
        wherefore:
          "Eine EU-Genehmigung genügt nicht. DDTC-Autorisierung (DSP-5 / TAA) ist vor jedem Transfer erforderlich — Vorgang anhalten und Fachberatung einholen.",
        confidence: "HIGH",
        sources: [deMinimisStatuteSource()],
      });

    case "EMBARGOED_DESTINATION":
      return explainedResult({
        value,
        what: "Embargo-Bestimmungsland — De-minimis-Prozentzahl ist nachrangig.",
        why: "Das Bestimmungsland liegt in EAR Country Group E:1/E:2 (umfassendes Embargo). Eine EAR-Genehmigung ist unabhängig vom US-Anteil erforderlich (15 CFR § 734.4) — die Prozentzahl entscheidet hier nicht.",
        wherefore:
          "Nicht liefern ohne spezifische Genehmigung (BIS/BAFA); Ablehnung ist der Regelfall. Fachberatung einholen.",
        confidence: "HIGH",
        sources: [deMinimisStatuteSource()],
      });

    case "EXCEEDED_OR_FDPR":
      return explainedResult({
        value,
        what:
          threshold !== null && pct !== null
            ? `US-Anteil (${pct}%) über der De-minimis-Schwelle (${threshold}%) / FDPR — EAR greift.`
            : "US-Anteil über der De-minimis-Schwelle / FDPR — EAR greift.",
        why:
          (threshold !== null && pct !== null
            ? `Der deklarierte US-kontrollierte EAR-Anteil (${pct}%) überschreitet die anwendbare De-minimis-Schwelle (${threshold}%, 15 CFR § 734.4), oder die Foreign Direct Product Rule greift. Das ausländische Erzeugnis unterliegt dann der EAR.`
            : "Der deklarierte US-kontrollierte EAR-Anteil überschreitet die anwendbare De-minimis-Schwelle (15 CFR § 734.4), oder die Foreign Direct Product Rule greift.") +
          provenanceLine,
        wherefore:
          "BIS-Genehmigung beantragen oder eine anwendbare License Exception (z. B. STA/ENC/TMP) nachweisen — nicht ohne Autorisierung exportieren.",
        confidence: "MEDIUM",
        sources: [deMinimisStatuteSource()],
      });

    case "REQUIRES_LEGAL_REVIEW":
      return unverifiedResult({
        value,
        what: "De-minimis nicht abschließend bestimmbar — rechtliche Prüfung nötig.",
        why:
          "Die De-minimis-Berechnung konnte nicht abgeschlossen werden (Sonder-ECCN oder fehlende Daten). Dies ist keine Freigabe." +
          provenanceLine,
        wherefore:
          "Qualifizierte US-Exportkontroll-Beratung für eine vollständige EAR-Jurisdiktionsanalyse einholen, bevor geliefert wird.",
        sources: [deMinimisStatuteSource()],
      });

    case "WITHIN_THRESHOLD":
      if (selfDeclared) {
        // The dangerous case: a "below threshold" result on a self-declared
        // number must NOT read as a confident green. Fail-closed → UNVERIFIED.
        return unverifiedResult({
          value,
          what:
            threshold !== null && pct !== null
              ? `US-Anteil (${pct}%) unter der Schwelle (${threshold}%) — aber selbst-deklariert, daher nicht bestätigt.`
              : "US-Anteil unter der De-minimis-Schwelle — aber selbst-deklariert, daher nicht bestätigt.",
          why:
            (threshold !== null && pct !== null
              ? `Der deklarierte US-Anteil (${pct}%) liegt unter der anwendbaren De-minimis-Schwelle (${threshold}%, 15 CFR § 734.4). ABER: `
              : "Der deklarierte US-Anteil liegt unter der anwendbaren De-minimis-Schwelle (15 CFR § 734.4). ABER: ") +
            SELF_DECLARED_CAVEAT +
            " Ohne geprüfte Stückliste ist diese De-minimis-Eignung nicht belastbar — sie wird daher als unbestätigt (keine Freigabe) ausgewiesen.",
          wherefore:
            "Die De-minimis-Berechnung per-Position mit BOM-Kostendaten belegen und 5 Jahre aufbewahren. Erst dann ist die Unterschreitung der Schwelle belastbar.",
          sources: [deMinimisStatuteSource()],
        });
      }
      // BOM-backed: the number is auditable; a determined (but never green-
      // washed) LOW band is honest, still citing the source.
      return explainedResult({
        value,
        what:
          threshold !== null && pct !== null
            ? `US-Anteil (${pct}%) unter der De-minimis-Schwelle (${threshold}%) — aus geprüfter Stückliste.`
            : "US-Anteil unter der De-minimis-Schwelle — aus geprüfter Stückliste.",
        why:
          (threshold !== null && pct !== null
            ? `Der US-kontrollierte Anteil (${pct}%) liegt unter der anwendbaren De-minimis-Schwelle (${threshold}%, 15 CFR § 734.4).`
            : "Der US-kontrollierte Anteil liegt unter der anwendbaren De-minimis-Schwelle (15 CFR § 734.4).") +
          provenanceLine +
          " De-minimis-Eignung gilt nur, wenn alle übrigen Bedingungen (Endverbleib, Endverwender, Land) ebenfalls erfüllt sind.",
        wherefore:
          "De-minimis-Berechnung dokumentieren und 5 Jahre aufbewahren; übrige Exportbedingungen separat prüfen.",
        confidence: "LOW",
        sources: [deMinimisStatuteSource()],
      });

    case "NO_US_CONTENT_DECLARED":
    default:
      return unverifiedResult({
        value,
        what: "Kein US-Anteil deklariert — De-minimis nicht geprüft (keine Freigabe).",
        why: "Für keinen Artikel des Vorgangs wurde ein US-Anteil (usContentPercent) angegeben, daher lief keine De-minimis-Berechnung. Eine fehlende Einstufung ist KEINE Freigabe — die De-minimis-Frage bleibt schlicht unbeantwortet.",
        wherefore:
          "Falls die Artikel US-kontrollierten Anteil enthalten: US-Anteil je Position erfassen (idealerweise aus einer Stückliste) und erneut prüfen. Andernfalls dokumentieren, dass kein US-Anteil vorliegt.",
        sources: [deMinimisStatuteSource()],
      });
  }
}

export function deriveVerdict(
  lines: LineAssessment[],
  screening: ScreeningAssessment,
  now: Date = new Date(),
  deMinimisProvenance: DeMinimisProvenance = "SELF_DECLARED",
): VerdictResult {
  const pendenzen: Pendenz[] = [];

  // Step 1: classify
  const unclassified = lines.filter((l) => !l.classified || !l.classification);
  const classifyStep: StepResult = unclassified.length
    ? {
        step: "classify",
        status: "gap",
        summary: `${unclassified.length} von ${lines.length} Artikel(n) noch nicht klassifiziert`,
        why: "Ohne ECCN/USML-Einstufung laesst sich der Genehmigungsbedarf nicht bestimmen.",
      }
    : {
        step: "classify",
        status: "done",
        summary: "Alle Artikel klassifiziert",
        why: "Jeder Artikel traegt eine Einstufung (ECCN/USML/AL).",
      };
  for (const l of unclassified) {
    pendenzen.push({
      label: `Artikel „${l.itemName}“ klassifizieren`,
      actionHref: `/trade/items/${l.itemId}`,
    });
  }

  // Step 2: screen
  // Defence-in-depth: a CLEAR party whose last screening predates the
  // staleness window is downgraded to a gap, so the verdict never returns a
  // clean GO on screening data that may predate a sanctions-list update.
  const screeningStale =
    screening.status === "CLEAR" &&
    !!screening.lastScreenedAt &&
    now.getTime() - screening.lastScreenedAt.getTime() >
      SCREENING_STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;
  let screenStep: StepResult;
  if (screening.partyBlocked || screening.status === "CONFIRMED_HIT") {
    screenStep = {
      step: "screen",
      status: "blocked",
      summary: `${screening.partyName}: Sanktionstreffer`,
      why: "Bestaetigter Treffer auf einer kritischen Sanktionsliste — Lieferung untersagt.",
    };
  } else if (screening.status === "POTENTIAL_MATCH") {
    screenStep = {
      step: "screen",
      status: "gap",
      summary: `${screening.partyName}: moeglicher Treffer — Pruefung noetig`,
      why: "Fuzzy-/Kaskaden-Treffer muss manuell abgeklaert werden, bevor geliefert wird.",
    };
    pendenzen.push({ label: `Screening von „${screening.partyName}“ klaeren` });
  } else if (
    screening.status === "NOT_SCREENED" ||
    screening.status === "STALE" ||
    screeningStale
  ) {
    const notScreened = screening.status === "NOT_SCREENED";
    screenStep = {
      step: "screen",
      status: "gap",
      summary: `${screening.partyName}: ${notScreened ? "noch nicht gescreent" : "Screening veraltet"}`,
      why: notScreened
        ? "Gegenpartei muss gegen OFAC/EU/UN/BIS gescreent werden."
        : `Letztes Screening aelter als ${SCREENING_STALE_AFTER_DAYS} Tage — vor Lieferung neu screenen.`,
    };
    pendenzen.push({
      label: `„${screening.partyName}“ ${notScreened ? "screenen" : "neu screenen"}`,
    });
  } else {
    screenStep = {
      step: "screen",
      status: "done",
      summary: `${screening.partyName}: sauber`,
      why: "Aktuelles Screening ohne Treffer auf den kritischen Listen.",
    };
  }

  // Step 3: jurisdiction / de-minimis
  const classified = lines
    .map((l) => l.classification)
    .filter((c): c is ClassificationResult => Boolean(c));
  const deMinimisOutcomes = classified
    .map((c) => c.deMinimis?.outcome)
    .filter(Boolean) as string[];
  let jurisdictionStep: StepResult;
  if (deMinimisOutcomes.includes("ITAR_CONTROLLED")) {
    jurisdictionStep = {
      step: "jurisdiction",
      status: "blocked",
      summary: "ITAR-kontrollierter US-Anteil",
      why: "ITAR-Anteil → US-Jurisdiktion, eine EU-Genehmigung genuegt nicht.",
    };
  } else if (
    deMinimisOutcomes.some((o) =>
      [
        "DE_MINIMIS_EXCEEDED",
        "FDPR_TRIGGERED",
        "EMBARGOED_DESTINATION",
        "REQUIRES_LEGAL_REVIEW",
      ].includes(o),
    )
  ) {
    jurisdictionStep = {
      step: "jurisdiction",
      status: "gap",
      summary: "US-Anteil ueber Schwelle / FDPR — Pruefung noetig",
      why: "De-minimis-Schwelle ueberschritten oder FDPR greift; US-Reexport-Bezug pruefen.",
    };
    pendenzen.push({ label: "US-Anteil / De-minimis pruefen" });
  } else if (deMinimisOutcomes.length === 0) {
    jurisdictionStep = {
      step: "jurisdiction",
      status: "done",
      summary: "Keine relevanten US-Anteile deklariert",
      why: "Kein US-Content angegeben — De-minimis nicht einschlaegig.",
    };
  } else {
    jurisdictionStep = {
      step: "jurisdiction",
      status: "done",
      summary: "US-Anteil unter De-minimis-Schwelle",
      why: "US-Anteil bleibt unter der anwendbaren Schwelle.",
    };
  }

  // Step 4: license
  const anyHardBlock = classified.some(hardBlock);
  const anyLicense = classified.some(licenseRequired);
  const anyReview = classified.some(
    (c) => c.licenseDetermination.gate === "REVIEW_NEEDED",
  );
  let licenseStep: StepResult;
  if (anyHardBlock) {
    licenseStep = {
      step: "license",
      status: "blocked",
      summary: "Lieferung untersagt",
      why: "Harte Sperre (ITAR/Embargo/Annex IV/MTCR Cat-I) — keine Ausnahme greift.",
    };
  } else if (anyLicense || anyReview) {
    licenseStep = {
      step: "license",
      status: "gap",
      summary: "Genehmigung erforderlich",
      why: "Mindestens ein Artikel loest eine Genehmigungspflicht aus.",
    };
  } else {
    licenseStep = {
      step: "license",
      status: "done",
      summary: "Keine Genehmigung erforderlich (NLR/EAR99)",
      why: "Kein Trigger, keine Schwelle ueberschritten.",
    };
  }

  // Step 5: form
  let formStep: StepResult;
  if (anyHardBlock) {
    formStep = {
      step: "form",
      status: "blocked",
      summary: "Kein Antrag — Vorgang abbrechen",
      why: "Bei harter Sperre ist kein Genehmigungsantrag moeglich.",
    };
  } else if (anyLicense || anyReview) {
    formStep = {
      step: "form",
      status: "gap",
      summary: "BAFA-Antrag vorbereiten",
      why: "Genehmigungspflicht → ELAN-K2-Antrag aus dem Vorgang erzeugen.",
    };
    pendenzen.push({ label: "BAFA-Antrag (ELAN-K2) erstellen" });
  } else {
    formStep = {
      step: "form",
      status: "done",
      summary: "Kein Antrag noetig",
      why: "Keine Genehmigungspflicht — Lieferung ohne BAFA-Antrag.",
    };
  }

  const steps = [
    classifyStep,
    screenStep,
    jurisdictionStep,
    licenseStep,
    formStep,
  ];
  const overall = steps.reduce<StepStatus>(
    (acc, s) => worst(acc, s.status),
    "done",
  );
  const verdict: Verdict =
    overall === "blocked" ? "BLOCKED" : overall === "gap" ? "REVIEW" : "GO";

  const headlineText: Record<Verdict, string> = {
    GO: "Darf liefern — keine Genehmigung erforderlich",
    REVIEW: anyHardBlock
      ? "Pruefung noetig"
      : anyLicense || anyReview
        ? "Genehmigung noetig"
        : "Offene Punkte vor Lieferung",
    BLOCKED: "Lieferung verboten",
  };
  const headline = `${VERDICT_EMOJI[verdict]} ${headlineText[verdict]}`;

  // G9 — surface the de-minimis result through the explanation envelope so the
  // applied threshold + the PROVENANCE of the US-content input are visible. The
  // operation's input is self-declared by default (the lines carry only a
  // single per-item `usContentPercent`, not an auditable BOM rollup), so a
  // favourable outcome is capped at UNVERIFIED — never a confident green on an
  // unaudited number. This is read-only over `classified`; it does not change
  // any step status or the overall verdict.
  const deMinimisExplained = deriveDeMinimisExplained(
    classified,
    deMinimisProvenance,
  );

  return { verdict, headline, steps, pendenzen, deMinimisExplained };
}
