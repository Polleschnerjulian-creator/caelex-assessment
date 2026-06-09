"use client";

/**
 * OperationTeachingSpine — the PERSISTENT six-stage teaching rail above the
 * operations list (Caelex Passage P2, Lane B).
 *
 * THE PROBLEM IT SOLVES
 * A returning operator who opens /trade/operations gets a bare filterable
 * table: rows, statuses, risk scores — but no "where am I in the export-control
 * journey / what does the law require at each gate / who decides". The spine
 * makes the six-stage lifecycle (the same vocabulary OperationStepper teaches on
 * the detail page) ALWAYS visible, with the org's own operations bucketed by
 * stage, and — for the selected stage — a teaching panel that renders the exact
 * {what / why / wherefore} an auditor reads.
 *
 * "Teaching is a free side effect of transparency": this component invents NO
 * new explanation markup. Each stage's teaching card is an `ExplainedResult`
 * built through the P0 envelope constructors (`explainedResult`) and rendered
 * through `<ExplainedPanel>`. The legal basis is therefore SHOWN, with cited
 * sources (the regime + list version), never asserted in prose. The same
 * refusal-to-render-an-incomplete-envelope guard protects this surface.
 *
 * LEGAL INVARIANTS (this is PURE PRESENTATION — it upholds them by not touching
 * them):
 *   - No determination logic. The teaching cards describe what the LAW requires
 *     at a gate in the abstract; they make no per-operation determination and
 *     therefore can never be "more permissive".
 *   - No mutation. No POST, no auto-write, no auto-clear. The spine only reads
 *     the rows the page already loaded and counts them by stage.
 *   - The teaching for every gate restates the thesis: the AI prepares a draft;
 *     a NAMED HUMAN reviews, decides, and is recorded. "Wer entscheidet" always
 *     answers: a qualified person (the Ausfuhrverantwortlicher), never Caelex.
 *
 * The stage vocabulary (DRAFT → CLASSIFY → SCREEN → LICENSE → LICENSED →
 * EXECUTED) and ordering are REUSED from OperationStepper (`HAPPY_PATH`) so the
 * list spine and the detail stepper can never drift apart.
 *
 * Dark-theme trade-* tokens only, matching the surrounding operations list.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import * as React from "react";
import Link from "next/link";
import {
  Edit3,
  ScanSearch,
  FileSearch,
  ShieldCheck,
  Truck,
  GraduationCap,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

import { ExplainedPanel } from "@/components/trade/ExplainedPanel";
import {
  explainedResult,
  type ExplainedResult,
} from "@/lib/comply-v2/trade/explained-result";
import { nextActionLabel, type OperationStatus } from "./OperationStepper";

// ─── Pipeline-stage narrowing ────────────────────────────────────────────────
//
// HAPPY_PATH is typed `ReadonlyArray<OperationStatus>` in OperationStepper, so
// `(typeof HAPPY_PATH)[number]` WIDENS back to the full 8-value OperationStatus
// union (including the off-pipeline BLOCKED / VOLUNTARY_DISCLOSURE_FILED). The
// six-stage maps below only supply the 6 pipeline keys, so we need a narrow
// const tuple to type those Records / map keys without the off-pipeline values.
//
// This tuple MUST list the same six stages, in the same order, as HAPPY_PATH —
// it is the static-typing counterpart of HAPPY_PATH's runtime ordering. The
// off-pipeline runtime bucket (BLOCKED / VOLUNTARY_DISCLOSURE_FILED) is handled
// separately in countByStage and is intentionally NOT part of PipelineStage.
const PIPELINE_STAGES = [
  "DRAFT",
  "AWAITING_CLASSIFICATION",
  "SCREENING",
  "AWAITING_LICENSE",
  "LICENSED",
  "EXECUTED",
] as const;
type PipelineStage = (typeof PIPELINE_STAGES)[number];

// ─── Minimal row shape this spine reads ──────────────────────────────────────
//
// Intentionally structural (not the full OperationRow) so the spine couples to
// nothing but `status` — the only field it counts on. Any object carrying a
// pipeline/off-pipeline status satisfies it.

export interface TeachableOperation {
  status: OperationStatus;
}

// ─── Per-stage display metadata (icon + short label) ─────────────────────────
//
// Labels mirror OperationStepper.STEP_META so the rail reads identically to the
// detail-page stepper. Kept local (that map isn't exported) but verified against
// it by sharing the HAPPY_PATH ordering.

const STAGE_ICON: Record<PipelineStage, LucideIcon> = {
  DRAFT: Edit3,
  AWAITING_CLASSIFICATION: ScanSearch,
  SCREENING: FileSearch,
  AWAITING_LICENSE: FileSearch,
  LICENSED: ShieldCheck,
  EXECUTED: Truck,
};

const STAGE_SHORT_LABEL: Record<PipelineStage, string> = {
  DRAFT: "Entwurf",
  AWAITING_CLASSIFICATION: "Einstufung",
  SCREENING: "Screening",
  AWAITING_LICENSE: "Lizenz",
  LICENSED: "Lizenziert",
  EXECUTED: "Ausgeführt",
};

// ─── The teaching content per stage ──────────────────────────────────────────
//
// Each entry becomes an ExplainedResult<null> via `buildStageTeaching` below.
// This is the SAME {what / why / wherefore / sources} envelope the auditor
// reads — the teaching is the by-product, not a parallel artefact.
//
//   what       — "Was das Gesetz verlangt" (one line, the gate's purpose).
//   why        — the legal basis + cited regime (rendered under "Show reasoning"
//                with the SOURCES block giving list/citation/version).
//   wherefore  — "Was als Nächstes" + "Wer entscheidet" (the named human).
//
// Every stage uses HIGH confidence with ≥1 source: these are settled statutory
// gates, not per-operation determinations. The envelope constructor THROWS if a
// source is ever dropped, so this content can never ship un-cited.

interface StageTeachingCopy {
  /** "Was das Gesetz verlangt" — the gate's legal purpose, one line. */
  what: string;
  /** Legal basis + reasoning (rendered in the WHY disclosure). */
  why: string;
  /** "Was als Nächstes / Wer entscheidet" — next action + the named decider. */
  wherefore: string;
  /** Provenance: the regime + citation shown in the SOURCES block. */
  sources: ExplainedResult<null>["sources"];
}

const STAGE_TEACHING: Record<PipelineStage, StageTeachingCopy> = {
  DRAFT: {
    what: "Entwurf: der Vorgang wird angelegt — Artikel, Partner, Route und Verwendungszweck werden erfasst, bevor irgendeine Prüfung greift.",
    why: "Im Entwurf existiert noch KEINE Freigabe. Eine fehlende Einstufung ist keine Freigabe (§ 8 AWV, Art. 4 VO (EU) 2021/821): ohne erfasste Güter- und Empfängerdaten kann weder Listenprüfung noch Catch-all bewertet werden. Der Entwurf sammelt nur die Tatsachen, die die nächsten Tore brauchen.",
    wherefore:
      "Was als Nächstes: Güter und Gegenpartei vollständig erfassen, dann zur Einstufung weiterreichen. Wer entscheidet: der Sachbearbeiter erstellt den Entwurf — Caelex schlägt vor, der Mensch trägt ein.",
    sources: [
      {
        label: "Außenwirtschaftsverordnung (AWV)",
        citation: "§ 8 AWV — Erfassungs- und Sorgfaltspflichten",
        listVersion: "AWV i.d.F. 2025",
      },
    ],
  },
  AWAITING_CLASSIFICATION: {
    what: "Einstufung: jedes Gut erhält seine Güterlistennummer (ECCN / USML-Kategorie / Anhang-I-Position) — das bestimmt, OB und WOHIN eine Genehmigung nötig ist.",
    why: "Die Einstufung ist die Wurzel jeder Exportkontrolle: EU Anhang I (VO (EU) 2021/821) für Dual-Use, ECCN nach EAR (15 CFR 774 Supp. 1) für US-Güter, USML-Kategorie nach ITAR (22 CFR 121) für Rüstung. Ohne korrekte Nummer ist jede Folgeentscheidung wertlos. Caelex erstellt einen begründeten Einstufungs-VORSCHLAG mit Trefferregel und Quelle.",
    wherefore:
      "Was als Nächstes: " +
      nextActionLabel("AWAITING_CLASSIFICATION") +
      " — den KI-Vorschlag prüfen und die Einstufung bestätigen. Wer entscheidet: ein qualifizierter Prüfer / Ausfuhrverantwortlicher bestätigt die Nummer; die KI entscheidet nie selbst.",
    sources: [
      {
        label: "EU Dual-Use-Verordnung — Anhang I",
        citation: "VO (EU) 2021/821, Anhang I",
        listVersion: "konsolidiert 2024",
      },
      {
        label: "US Commerce Control List (EAR)",
        citation: "15 CFR 774 Supp. 1",
      },
      {
        label: "US Munitions List (ITAR)",
        citation: "22 CFR 121",
      },
    ],
  },
  SCREENING: {
    what: "Screening: Gegenpartei, Empfänger und Endverwender werden gegen Sanktions- und Verbotslisten geprüft — ein Treffer blockiert den Vorgang.",
    why: "Listenprüfung ist zwingend vor jeder Lieferung: EU-Sanktionen (VO (EU) 833/2014 u. a. restriktive Maßnahmen), OFAC SDN-Liste (US Specially Designated Nationals), plus Catch-all-Warnsignale nach Art. 4/5/9/10 VO (EU) 2021/821. Bei fehlender oder veralteter Listenprüfung gilt: fail-closed — kein stilles Grün, sondern ein blockierender Unverified-Zustand.",
    wherefore:
      "Was als Nächstes: " +
      nextActionLabel("SCREENING") +
      " — Treffer und Beinah-Treffer (potential match) menschlich bewerten und dokumentieren. Wer entscheidet: der Compliance-Verantwortliche gibt frei oder blockiert; ein bestätigter Treffer hält den Vorgang an.",
    sources: [
      {
        label: "EU restriktive Maßnahmen (Sanktionen)",
        citation: "VO (EU) 833/2014",
        listVersion: "konsolidierte Fassung",
      },
      {
        label: "OFAC Specially Designated Nationals (SDN)",
        citation: "OFAC SDN List",
      },
      {
        label: "EU Dual-Use — Catch-all",
        citation: "VO (EU) 2021/821, Art. 4/5/9/10",
      },
    ],
  },
  AWAITING_LICENSE: {
    what: "Lizenz beantragt: wo die Einstufung eine Genehmigung verlangt, wird sie bei der Behörde beantragt — die Lieferung wartet auf die Entscheidung.",
    why: "Die Genehmigung erteilt die zuständige Behörde, nicht Caelex: in Deutschland das BAFA (Bundesamt für Wirtschaft und Ausfuhrkontrolle) nach AWG/AWV, für US-Güter BIS (EAR) bzw. DDTC (ITAR). Die Antragsunterlagen — inkl. Endverbleibserklärung (EUC) — bereitet Caelex als prüfbaren Entwurf vor; eingereicht und unterschrieben wird durch den Menschen.",
    wherefore:
      "Was als Nächstes: " +
      nextActionLabel("AWAITING_LICENSE") +
      " — sobald die Behörde die Genehmigung erteilt, als lizenziert markieren. Wer entscheidet: die Genehmigungsbehörde erteilt; der Ausfuhrverantwortliche reicht ein und verantwortet die Angaben.",
    sources: [
      {
        label: "Außenwirtschaftsgesetz / -verordnung (BAFA)",
        citation: "AWG i.V.m. AWV — Genehmigungspflicht",
        listVersion: "i.d.F. 2025",
      },
      {
        label: "US Export Administration Regulations (BIS)",
        citation: "15 CFR 730 ff.",
      },
    ],
  },
  LICENSED: {
    what: "Lizenziert: eine gültige Genehmigung liegt vor — die Lieferung ist gegen ihre Auflagen, Mengen und Gültigkeit zu fahren.",
    why: "Eine Genehmigung ist kein Freibrief: sie bindet an Bedingungen, Höchstmengen und ein Ablaufdatum (Auflagenvorbehalt nach AWV; license conditions nach EAR). Mengen- oder Fristüberschreitung macht die Ausfuhr ungenehmigt. Caelex führt den Lizenz-Stack und warnt vor Erschöpfung/Ablauf — die Einhaltung bleibt menschlich verantwortet.",
    wherefore:
      "Was als Nächstes: " +
      nextActionLabel("LICENSED") +
      " — erst nach finaler menschlicher Bestätigung ausführen. Wer entscheidet: der Ausfuhrverantwortliche bestätigt, dass Auflagen, Menge und Gültigkeit gewahrt sind, bevor versendet wird.",
    sources: [
      {
        label: "Außenwirtschaftsverordnung — Auflagen",
        citation: "AWV — Nebenbestimmungen zur Genehmigung",
        listVersion: "i.d.F. 2025",
      },
    ],
  },
  EXECUTED: {
    what: "Ausgeführt: die Ware ist versandt und zollrechtlich angemeldet — der Vorgang ist abgeschlossen und revisionssicher dokumentiert.",
    why: "Die Ausfuhr wird zollrechtlich über ATLAS-Ausfuhr (AES, Automated Export System) angemeldet; die Genehmigungs- und Einstufungsnachweise müssen mit der Anmeldung übereinstimmen und werden archiviert (Aufbewahrungs- und Nachweispflichten nach AWV / UZK). Die append-only Provenance hält fest, WER WANN WAS entschieden hat — die gerichtsfeste Akte.",
    wherefore:
      "Was als Nächstes: nichts — der Vorgang ist abgeschlossen. Die Akte (Einstufung, Screening, Lizenz, Zollanmeldung) ist als Dossier exportierbar. Wer entschied: jede Stufe trägt ihren menschlichen Entscheider-of-Record im Audit-Trail.",
    sources: [
      {
        label: "Zoll — Ausfuhranmeldung (ATLAS / AES)",
        citation: "UZK Art. 263 ff. i.V.m. ATLAS-Ausfuhr",
      },
      {
        label: "Außenwirtschaftsverordnung — Nachweispflichten",
        citation: "AWV — Aufbewahrung & Nachweis",
        listVersion: "i.d.F. 2025",
      },
    ],
  },
};

/**
 * Build the explained-result envelope for a stage's teaching card. Uses the P0
 * `explainedResult` constructor so a missing source/why THROWS at build time —
 * the teaching content can never ship un-cited or un-explained.
 */
function buildStageTeaching(stage: PipelineStage): ExplainedResult<null> {
  const copy = STAGE_TEACHING[stage];
  return explainedResult<null>({
    value: null,
    what: copy.what,
    why: copy.why,
    wherefore: copy.wherefore,
    confidence: "HIGH",
    sources: copy.sources,
    // Teaching is reference material, not a proposal to apply — there is no
    // per-operation decision to record here. Mark the override as not-applicable
    // so the panel shows the thesis text without an actionable override button.
    override: { allowed: false },
  });
}

// ─── Stage-count derivation (no new fetch) ───────────────────────────────────

/**
 * Bucket the already-loaded rows by pipeline stage. Off-pipeline rows (BLOCKED /
 * VOLUNTARY_DISCLOSURE_FILED) are counted separately so the happy-path rail
 * stays clean while still surfacing that some operations have halted.
 */
function countByStage(operations: ReadonlyArray<TeachableOperation>): {
  perStage: Record<PipelineStage, number>;
  offPipeline: number;
} {
  const perStage = {
    DRAFT: 0,
    AWAITING_CLASSIFICATION: 0,
    SCREENING: 0,
    AWAITING_LICENSE: 0,
    LICENSED: 0,
    EXECUTED: 0,
  } as Record<PipelineStage, number>;
  let offPipeline = 0;

  for (const op of operations) {
    if (op.status === "BLOCKED" || op.status === "VOLUNTARY_DISCLOSURE_FILED") {
      offPipeline += 1;
      continue;
    }
    // op.status is now a pipeline status; index is safe.
    perStage[op.status as PipelineStage] += 1;
  }

  return { perStage, offPipeline };
}

/**
 * Pick the stage the rail should open on. We surface the EARLIEST stage that
 * actually has operations waiting on a human — i.e. the org's current "leading
 * edge" of work — because that's the gate the operator most needs reminding of.
 * If everything is executed (or there are no rows), fall back to DRAFT, the
 * start of the journey.
 */
function defaultSelectedStage(
  perStage: Record<PipelineStage, number>,
): PipelineStage {
  // Stages that wait on a human action, earliest first.
  const ACTIONABLE: ReadonlyArray<PipelineStage> = [
    "DRAFT",
    "AWAITING_CLASSIFICATION",
    "SCREENING",
    "AWAITING_LICENSE",
    "LICENSED",
  ];
  for (const stage of ACTIONABLE) {
    if (perStage[stage] > 0) return stage;
  }
  return "DRAFT";
}

// ─── Public component ────────────────────────────────────────────────────────

interface Props {
  /** The rows the list already loaded. Counted by stage — no new fetch. */
  operations: ReadonlyArray<TeachableOperation>;
  /** Optional className for the outer rail container. */
  className?: string;
}

export function OperationTeachingSpine({ operations, className = "" }: Props) {
  const { perStage, offPipeline } = React.useMemo(
    () => countByStage(operations),
    [operations],
  );

  // `selected` is null until the user picks a stage; while null we show the
  // derived "leading edge" default. A deliberate pick is held in state and
  // therefore survives row refreshes (filter/search/new op) on its own — no ref
  // needed. We never auto-override a user's choice.
  const [selected, setSelected] = React.useState<PipelineStage | null>(null);

  const effectiveStage: PipelineStage =
    selected ?? defaultSelectedStage(perStage);

  const teaching = React.useMemo(
    () => buildStageTeaching(effectiveStage),
    [effectiveStage],
  );

  const isEmpty = operations.length === 0;

  // Empty-org state: a short "start your first operation" teaching intro instead
  // of a counts rail (there is nothing to count yet).
  if (isEmpty) {
    return (
      <div
        className={`mb-6 rounded-xl border border-trade-border-subtle bg-trade-bg-elevated p-5 ${className}`}
        aria-label="Export-control journey — teaching intro"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-trade-accent-soft text-trade-accent-strong">
            <GraduationCap className="h-5 w-5" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-trade-text-primary">
              Der Exportkontroll-Weg in sechs Stufen
            </h2>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-trade-text-secondary">
              Jeder Vorgang durchläuft dieselben sechs Tore — Entwurf →
              Einstufung → Screening → Lizenz → Lizenziert → Ausgeführt. An
              jedem Tor gilt: Caelex bereitet einen begründeten Vorschlag vor,
              ein qualifizierter Mensch entscheidet und wird protokolliert.
              Legen Sie Ihren ersten Vorgang an, um den Weg zu beginnen.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {PIPELINE_STAGES.map((stage, i) => {
                const Icon = STAGE_ICON[stage];
                return (
                  <React.Fragment key={stage}>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-trade-border-subtle bg-trade-bg-panel px-2.5 py-1 text-[11px] font-medium text-trade-text-secondary">
                      <Icon
                        className="h-3 w-3 text-trade-text-muted"
                        strokeWidth={2}
                        aria-hidden
                      />
                      {STAGE_SHORT_LABEL[stage]}
                    </span>
                    {i < PIPELINE_STAGES.length - 1 ? (
                      <ArrowRight
                        className="h-3 w-3 text-trade-text-muted"
                        strokeWidth={2}
                        aria-hidden
                      />
                    ) : null}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      className={`mb-6 rounded-xl border border-trade-border-subtle bg-trade-bg-elevated p-5 ${className}`}
      aria-label="Export-control journey — stage overview and teaching"
    >
      <div className="mb-4 flex items-center gap-2">
        <GraduationCap
          className="h-4 w-4 text-trade-text-muted"
          strokeWidth={2}
          aria-hidden
        />
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.10em] text-trade-text-secondary">
          Wo stehen Ihre Vorgänge — und was das Gesetz verlangt
        </h2>
      </div>

      {/* ── Stage rail: six selectable stage buttons with live counts ── */}
      <div
        role="tablist"
        aria-label="Lifecycle stages"
        aria-orientation="horizontal"
        className="flex items-stretch gap-1 overflow-x-auto pb-1"
      >
        {PIPELINE_STAGES.map((stage, i) => {
          const Icon = STAGE_ICON[stage];
          const count = perStage[stage];
          const isActive = stage === effectiveStage;
          return (
            <React.Fragment key={stage}>
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls="teaching-stage-panel"
                id={`teaching-stage-tab-${stage}`}
                onClick={() => setSelected(stage)}
                className={`flex min-w-[92px] shrink-0 flex-col items-center gap-1.5 rounded-lg px-3 py-2.5 text-center transition ${
                  isActive
                    ? "bg-trade-accent-soft ring-1 ring-trade-accent"
                    : "bg-trade-bg-panel ring-1 ring-trade-border-subtle hover:bg-trade-hover"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Icon
                    className={`h-3.5 w-3.5 ${
                      isActive
                        ? "text-trade-accent-strong"
                        : "text-trade-text-muted"
                    }`}
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span
                    className={`text-[18px] font-bold tabular-nums leading-none ${
                      isActive
                        ? "text-trade-accent-strong"
                        : count > 0
                          ? "text-trade-text-primary"
                          : "text-trade-text-muted"
                    }`}
                  >
                    {count}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-[0.06em] ${
                    isActive
                      ? "text-trade-accent-strong"
                      : "text-trade-text-secondary"
                  }`}
                >
                  {STAGE_SHORT_LABEL[stage]}
                </span>
                <span className="sr-only">
                  Stufe {i + 1} von {PIPELINE_STAGES.length}:{" "}
                  {STAGE_SHORT_LABEL[stage]}, {count}{" "}
                  {count === 1 ? "Vorgang" : "Vorgänge"}
                  {isActive ? " (ausgewählt)" : ""}
                </span>
              </button>
              {i < PIPELINE_STAGES.length - 1 ? (
                <div
                  aria-hidden
                  className="mt-6 h-px w-3 shrink-0 self-start bg-trade-border-subtle"
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </div>

      {/* Off-pipeline note — halted operations are surfaced, never hidden. */}
      {offPipeline > 0 ? (
        <p className="mt-2 text-[11px] text-trade-accent-danger">
          {offPipeline} {offPipeline === 1 ? "Vorgang ist" : "Vorgänge sind"}{" "}
          angehalten (blockiert oder Selbstanzeige) und nicht im
          Standard-Lebenszyklus.
        </p>
      ) : null}

      {/* ── Teaching panel for the selected stage ── */}
      <div
        id="teaching-stage-panel"
        role="tabpanel"
        aria-labelledby={`teaching-stage-tab-${effectiveStage}`}
        className="mt-4"
      >
        <ExplainedPanel
          result={teaching}
          kind={`Stufe ${
            PIPELINE_STAGES.indexOf(effectiveStage) + 1
          } · ${STAGE_SHORT_LABEL[effectiveStage]} — was das Gesetz verlangt`}
        />
      </div>

      {/* Affordance to act on the selected stage's operations: filter the table
          to that stage. Pure navigation (?status=) — the list page already reads
          this param. No mutation. */}
      {perStage[effectiveStage] > 0 ? (
        <div className="mt-3">
          <Link
            href={`/trade/operations?status=${effectiveStage}`}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-trade-accent-strong transition hover:opacity-80"
          >
            {perStage[effectiveStage]}{" "}
            {perStage[effectiveStage] === 1 ? "Vorgang" : "Vorgänge"} in dieser
            Stufe anzeigen
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          </Link>
        </div>
      ) : null}
    </section>
  );
}

export default OperationTeachingSpine;

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
