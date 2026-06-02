import type { ClassificationResult } from "@/lib/trade/classification/classify-item";
import type { TradeScreeningStatus } from "@prisma/client";

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
export interface VerdictResult {
  verdict: Verdict;
  headline: string;
  steps: StepResult[];
  pendenzen: Pendenz[];
}

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

export function deriveVerdict(
  lines: LineAssessment[],
  screening: ScreeningAssessment,
  now: Date = new Date(),
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

  return { verdict, headline, steps, pendenzen };
}
