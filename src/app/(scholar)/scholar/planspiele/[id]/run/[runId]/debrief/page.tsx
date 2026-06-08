/**
 * /scholar/planspiele/[id]/run/[runId]/debrief — the debrief (pedagogical core).
 *
 * getRunForUser is the IDOR gate. For each phase the student submitted, the page
 * recomputes the two-track score server-side (scorePhaseEngine + the no-key
 * sim-coach fallback — zero external cost by default), then lays the run out as a
 * vertical DECISION TIMELINE: each phase a numbered step on a spine — the
 * student's artifact → the animated score + model-answer comparison
 * (ResultsPanel) → the governing corpus excerpts (CorpusRail, deep-linked). An
 * overall ScoreReveal headlines the payoff; a reflective write-up (client island)
 * + a plain-text export round out the debrief.
 *
 * Next.js 15: params is a Promise — await it. Strictly MONOCHROME.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getRunForUser } from "@/lib/scholar/planspiele/runs.server";
import { getScenarioById } from "@/data/scholar/planspiele/index";
import {
  scorePhaseEngine,
  type RubricLine,
} from "@/lib/scholar/planspiele/scoring.server";
import { coachReviewArtifact } from "@/lib/scholar/planspiele/sim-coach.server";
import type {
  ScholarPlanspielScenario,
  ScholarPlanspielPhase,
} from "@/data/scholar/planspiele/types";
import { ScholarPage } from "../../../../../_components/ScholarPage";
import { PageHeader } from "../../../../../_components/PageHeader";
import { BackLink } from "../../../../../_components/BackLink";
import { SCHOLAR_TYPE } from "../../../../../_components/scholar-type";
import { DownloadButton } from "../../../../../_components/DownloadButton";
import { t } from "../../../../../_i18n/core";
import { getScholarLocale } from "../../../../../_i18n/locale.server";
import { PLANSPIELE } from "../../../../../_i18n/planspiele";
import { PLANSPIELE_PLAY, playT } from "../../../../../_i18n/planspiele-play";
import {
  ResultsPanel,
  type ResultRow,
  type ModelComparison,
} from "../../../../_components/ResultsPanel";
import { CorpusRail } from "../../../../_components/CorpusRail";
import { ReflectionForm } from "../../../../_components/ReflectionForm";
import { ScoreReveal } from "../../../../_components/ScoreReveal";
import { FREE_TEXT_ANSWER_KEY } from "../../../../_components/scaffold";
import { Check, Minus } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string; runId: string }>;
}

/** One field a student submitted, summarised for the "your artifact" recap. */
interface ArtifactSummaryField {
  /** Resolved human element name (the field's labelKey). */
  label: string;
  /** Field type, so the recap can render booleans as a glyph. */
  type: "boolean" | "select" | "text";
  /** Boolean value (for type === "boolean"). */
  on?: boolean;
  /** Display value for select/text (already trimmed). */
  value?: string;
}

/**
 * Summarise what the student actually submitted for a phase — pure presentation
 * over data the page already holds (no new data, no engine call). Structured
 * artifacts list each field + its value; free-text artifacts surface the prose.
 */
function summariseArtifact(
  phase: ScholarPlanspielPhase,
  content: Record<string, unknown>,
  locale: Parameters<typeof playT>[0],
): { fields: ArtifactSummaryField[]; freeText: string } {
  const kind = phase.artifact.kind;
  if (kind === "authority_choice" || kind === "application_form") {
    const fields = (phase.artifact.fields ?? []).map((f) => {
      if (f.type === "boolean") {
        return {
          label: playT(locale, f.labelKey),
          type: "boolean" as const,
          on: content[f.key] === true,
        };
      }
      const raw = content[f.key];
      return {
        label: playT(locale, f.labelKey),
        type: f.type,
        value: typeof raw === "string" ? raw.trim() : "",
      };
    });
    return { fields, freeText: "" };
  }
  const raw = content[FREE_TEXT_ANSWER_KEY];
  return { fields: [], freeText: typeof raw === "string" ? raw.trim() : "" };
}

/**
 * Build the per-engine-criterion model-answer comparisons for a phase, from
 * `scenario.answerKey` (the model answer) + the student's submitted content.
 * Mirrors scorePhaseEngine's three rule types so the displayed "You vs Model"
 * always matches what the grader compared — but as display fragments, not scores.
 *   - exactMatch → you = submitted value, model = expected value.
 *   - allOf      → you = "k/N" present, model = "N/N".
 *   - timing     → you = "k/N" on-time parts, model = "N/N".
 */
function buildModelComparison(
  scenario: ScholarPlanspielScenario,
  phase: ScholarPlanspielPhase,
  content: Record<string, unknown>,
): ModelComparison[] {
  const ak = scenario.answerKey ?? {};
  const out: ModelComparison[] = [];
  for (const crit of phase.rubric) {
    if (crit.track !== "engine") continue;
    const entry = ak[crit.key];
    if (!entry) continue;

    if (entry.type === "exactMatch") {
      const raw = content[entry.field];
      const you =
        raw === undefined || raw === null || raw === "" ? "—" : String(raw);
      out.push({ critKey: crit.key, you, model: String(entry.expected) });
    } else if (entry.type === "allOf") {
      const n = entry.fields.length;
      const present = entry.fields.filter((f) => content[f] === true).length;
      out.push({
        critKey: crit.key,
        you: `${present}/${n}`,
        model: `${n}/${n}`,
      });
    } else {
      const n = entry.parts.length;
      const onTime = entry.parts.filter(
        (p) => content[p.field] === p.expected,
      ).length;
      out.push({
        critKey: crit.key,
        you: `${onTime}/${n}`,
        model: `${n}/${n}`,
      });
    }
  }
  return out;
}

export default async function DebriefPage({ params }: PageProps) {
  const { runId } = await params;

  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (!userId) notFound();

  const run = await getRunForUser(userId, runId);
  if (!run) notFound();

  const scenario = getScenarioById(run.scenarioId);
  if (!scenario) notFound();

  const locale = await getScholarLocale(userId);

  const phases = [...scenario.phases].sort((a, b) => a.order - b.order);

  const subByPhase = new Map<string, unknown>();
  for (const s of run.submissions) subByPhase.set(s.phaseKey, s.contentJson);

  const blocks: {
    phaseKey: string;
    phaseTitle: string;
    rows: ResultRow[];
    modelComparison: ModelComparison[];
    summary: { fields: ArtifactSummaryField[]; freeText: string };
    sourceIds: string[];
    caseIds: string[];
    pct: number;
  }[] = [];
  for (const phase of phases) {
    const content = (subByPhase.get(phase.phaseKey) ?? {}) as Record<
      string,
      unknown
    >;
    const engineLines = scorePhaseEngine(scenario, phase, content);
    let aiLines: RubricLine[] = [];
    const isFree =
      phase.artifact.kind === "cover_letter" ||
      phase.artifact.kind === "deficiency_response";
    if (isFree) {
      const out = await coachReviewArtifact({
        scenario,
        phase,
        artifactText: String(content.text ?? ""),
      });
      aiLines = out.lines;
    }
    const rows: ResultRow[] = [...engineLines, ...aiLines].map((l) => {
      const crit = phase.rubric.find((r) => r.key === l.category);
      return {
        critKey: l.category,
        label: crit ? playT(locale, crit.labelKey) : l.category,
        note: l.note ? playT(locale, l.note) : "",
        earned: l.earned,
        weight: l.weight,
        correct: l.correct,
        track: crit?.track ?? "engine",
      };
    });
    const totalW = rows.reduce((a, r) => a + r.weight, 0);
    const totalE = rows.reduce((a, r) => a + r.earned, 0);
    const pct = totalW ? Math.round((totalE / totalW) * 100) : 0;
    blocks.push({
      phaseKey: phase.phaseKey,
      phaseTitle: playT(locale, phase.titleKey),
      rows,
      modelComparison: buildModelComparison(scenario, phase, content),
      summary: summariseArtifact(phase, content, locale),
      sourceIds: phase.citedSourceIds,
      caseIds: phase.citedCaseIds,
      pct,
    });
  }

  // Overall score: mean of the per-phase percentages (each phase rubric sums to
  // 100, so an unweighted mean treats every phase equally — a clean headline).
  const overall = blocks.length
    ? Math.round(blocks.reduce((a, b) => a + b.pct, 0) / blocks.length)
    : 0;

  // Latest reflection (append-only REFLECTION events).
  const reflectionEvent = [...run.events]
    .reverse()
    .find((e) => e.kind === "REFLECTION");
  const initialReflection = reflectionEvent
    ? String(
        (reflectionEvent.payload as unknown as Record<string, unknown>)?.text ??
          "",
      )
    : "";

  // Plain-text export.
  const exportLines: string[] = [
    `${playT(locale, scenario.titleKey)} — ${t(locale, PLANSPIELE_PLAY, "play.debrief")}`,
    `${t(locale, PLANSPIELE_PLAY, "play.overallScore")}: ${overall}/100`,
    "",
  ];
  for (const b of blocks) {
    exportLines.push(`${b.phaseTitle} — ${b.pct}/100`);
    for (const r of b.rows) {
      exportLines.push(
        `  - ${r.label}: ${r.earned}/${r.weight}${r.note ? ` — ${r.note}` : ""}`,
      );
    }
    for (const c of b.modelComparison) {
      const crit = b.rows.find((r) => r.critKey === c.critKey);
      const youLabel = t(locale, PLANSPIELE_PLAY, "play.youChose");
      const modelLabel = t(locale, PLANSPIELE_PLAY, "play.modelAnswer2");
      exportLines.push(
        `    · ${crit?.label ?? c.critKey} — ${youLabel}: ${c.you} · ${modelLabel}: ${c.model}`,
      );
    }
    exportLines.push("");
  }
  const exportText = exportLines.join("\n");

  return (
    <ScholarPage>
      <BackLink
        fallbackHref={`/scholar/planspiele/${scenario.id}/run/${run.id}`}
        fallbackLabel={t(locale, PLANSPIELE, "backToCatalog")}
      />

      <div className="mt-4">
        <PageHeader
          eyebrow={playT(locale, scenario.titleKey)}
          title={t(locale, PLANSPIELE_PLAY, "play.debrief")}
          subtitle={t(locale, PLANSPIELE_PLAY, "play.debriefIntro")}
        />
      </div>

      {/* Payoff header: the overall score + the export action. */}
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-gray-900 bg-white px-6 py-5 shadow-sm">
        <ScoreReveal
          value={overall}
          label={t(locale, PLANSPIELE_PLAY, "play.overallScore")}
        />
        <DownloadButton
          content={exportText}
          filename={`debrief-${scenario.id}.txt`}
          label={t(locale, PLANSPIELE_PLAY, "play.exportDebrief")}
        />
      </div>

      {/* Decision timeline: one numbered step per phase on a connecting spine. */}
      <ol
        className="mt-8 space-y-0"
        aria-label={t(locale, PLANSPIELE_PLAY, "play.timeline")}
      >
        {blocks.map((b, i) => {
          const isLast = i === blocks.length - 1;
          return (
            <li key={b.phaseKey} className="relative flex gap-4 pb-8 last:pb-0">
              {/* Spine: numbered marker + connector line to the next step. */}
              <div className="flex flex-shrink-0 flex-col items-center">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-900 bg-gray-900 text-caption font-semibold tabular-nums text-white"
                  aria-hidden={true}
                >
                  {i + 1}
                </span>
                {!isLast && (
                  <span
                    className="mt-1 w-px flex-1 bg-gray-200"
                    aria-hidden={true}
                  />
                )}
              </div>

              {/* Step content: artifact recap → score + model comparison → corpus. */}
              <div className="min-w-0 flex-1 space-y-3">
                <ArtifactRecap
                  phaseTitle={b.phaseTitle}
                  summary={b.summary}
                  locale={locale}
                />
                <ResultsPanel
                  phaseTitle={b.phaseTitle}
                  rows={b.rows}
                  modelComparison={b.modelComparison}
                  locale={locale}
                />
                <CorpusRail
                  sourceIds={b.sourceIds}
                  caseIds={b.caseIds}
                  locale={locale}
                />
              </div>
            </li>
          );
        })}
      </ol>

      <section className="mt-10" aria-labelledby="reflection-heading">
        <h2 id="reflection-heading" className={SCHOLAR_TYPE.sectionHeading}>
          {t(locale, PLANSPIELE_PLAY, "play.reflection")}
        </h2>
        <div className="mt-3">
          <ReflectionForm
            runId={run.id}
            initial={initialReflection}
            locale={locale}
          />
        </div>
      </section>

      <p className={`mt-8 ${SCHOLAR_TYPE.meta}`}>
        {t(locale, PLANSPIELE_PLAY, "play.aiDisclosure")}
      </p>

      <footer className="mt-20 pt-8 border-t border-gray-200 pb-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-micro font-semibold uppercase tracking-[0.08em] text-gray-600">
              Scholar
            </span>
            <span className="text-caption text-gray-600">by Caelex</span>
          </div>
          <span className="text-caption text-gray-600">
            © {new Date().getFullYear()} Caelex
          </span>
        </div>
      </footer>
    </ScholarPage>
  );
}

/**
 * "Your artifact" recap card — what the student submitted for this phase, shown
 * at the top of each timeline step so the graded comparison below has context.
 * Server-rendered, monochrome; booleans read as a Check / Minus glyph (never hue).
 */
function ArtifactRecap({
  phaseTitle,
  summary,
  locale,
}: {
  phaseTitle: string;
  summary: { fields: ArtifactSummaryField[]; freeText: string };
  locale: Parameters<typeof playT>[0];
}) {
  const hasFields = summary.fields.length > 0;
  const hasText = summary.freeText.length > 0;
  if (!hasFields && !hasText) return null;

  return (
    <div className="rounded-2xl border border-gray-200/70 bg-gray-50 px-5 py-4 shadow-sm">
      <h4 className={SCHOLAR_TYPE.eyebrow}>
        {t(locale, PLANSPIELE_PLAY, "play.yourWork")}
      </h4>
      <span className="sr-only">{phaseTitle}</span>

      {hasFields && (
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          {summary.fields.map((f, i) => (
            <div
              key={i}
              className="flex items-baseline justify-between gap-3 border-b border-gray-200/70 pb-1.5"
            >
              <dt className={`min-w-0 truncate ${SCHOLAR_TYPE.meta}`}>
                {f.label}
              </dt>
              <dd className="flex-shrink-0">
                {f.type === "boolean" ? (
                  f.on ? (
                    <Check
                      size={15}
                      strokeWidth={2}
                      className="text-gray-900"
                      aria-label={t(locale, PLANSPIELE_PLAY, "play.met")}
                    />
                  ) : (
                    <Minus
                      size={15}
                      strokeWidth={2}
                      className="text-gray-400"
                      aria-label={t(locale, PLANSPIELE_PLAY, "play.notMet")}
                    />
                  )
                ) : (
                  <span className="text-small font-medium tabular-nums text-gray-900">
                    {f.value || "—"}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {hasText && (
        <p className="mt-3 whitespace-pre-wrap text-small leading-relaxed text-gray-700">
          {summary.freeText.length > 320
            ? `${summary.freeText.slice(0, 320).trimEnd()}…`
            : summary.freeText}
        </p>
      )}
    </div>
  );
}
