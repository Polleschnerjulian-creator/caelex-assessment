import { Check, X } from "lucide-react";
import { SCHOLAR_TYPE } from "../../_components/scholar-type";
import { t, type ScholarLocale } from "../../_i18n/core";
import { PLANSPIELE_PLAY } from "../../_i18n/planspiele-play";
import { ScoreReveal } from "./ScoreReveal";

/** Pre-resolved display row (labels/notes already i18n-resolved by the page). */
export interface ResultRow {
  /** The rubric criterion key (== RubricLine.category), used to join model comparisons. */
  critKey: string;
  label: string;
  note: string;
  earned: number;
  weight: number;
  correct: boolean;
  track: "engine" | "ai";
}

/**
 * Model-answer comparison for one ENGINE-track criterion. Built server-side from
 * `scenario.answerKey` + the student's submitted content (see debrief page).
 * `you` / `model` are pre-formatted display fragments (a value, or a "k/N" count).
 * Serialisable so a Server Component can pass it into this island-free component.
 */
export interface ModelComparison {
  /** Rubric criterion key this comparison belongs to (joins to ResultRow.critKey). */
  critKey: string;
  /** The student's submitted value/count, pre-formatted (e.g. "AGCOM", "2/3"). */
  you: string;
  /** The model/expected value/count, pre-formatted (e.g. "ASI", "3/3"). */
  model: string;
}

/**
 * Monochrome two-track score breakdown for one phase — the learning payoff.
 *
 * Correctness is shown by a check/cross glyph + bar fill, NEVER by hue (gray-900
 * vs gray-400). The per-phase percentage animates in via `ScoreReveal`. For every
 * ENGINE-track criterion that has a model comparison, the row shows the student's
 * value beside the model answer ("Du: AGCOM · Muster: ASI" / "2/3 · 3/3") so the
 * student sees the right answer inline. AI-coach rows keep their coach note.
 */
export function ResultsPanel({
  phaseTitle,
  rows,
  modelComparison = [],
  locale,
}: {
  phaseTitle: string;
  rows: ResultRow[];
  /** Per-engine-criterion model comparisons, joined to rows by critKey. */
  modelComparison?: ModelComparison[];
  locale: ScholarLocale;
}) {
  const totalW = rows.reduce((a, r) => a + r.weight, 0);
  const totalE = rows.reduce((a, r) => a + r.earned, 0);
  const pct = totalW ? Math.round((totalE / totalW) * 100) : 0;

  const cmpByKey = new Map<string, ModelComparison>();
  for (const c of modelComparison) cmpByKey.set(c.critKey, c);

  const youLabel = t(locale, PLANSPIELE_PLAY, "play.youChose");
  const modelLabel = t(locale, PLANSPIELE_PLAY, "play.modelAnswer2");

  return (
    <div className="rounded-2xl border border-gray-200/70 bg-white px-5 py-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <h3 className={`${SCHOLAR_TYPE.sectionHeading} pt-1`}>{phaseTitle}</h3>
        <div className="flex-shrink-0">
          <ScoreReveal
            value={pct}
            label={t(locale, PLANSPIELE_PLAY, "play.score")}
          />
        </div>
      </div>

      <ul className="mt-5 space-y-4" role="list">
        {rows.map((r, i) => {
          const cmp = cmpByKey.get(r.critKey);
          return (
            <li key={`${r.critKey}-${i}`} className="flex items-start gap-3">
              {r.correct ? (
                <Check
                  size={16}
                  strokeWidth={2}
                  className="mt-0.5 flex-shrink-0 text-gray-900"
                  aria-label={t(locale, PLANSPIELE_PLAY, "play.met")}
                />
              ) : (
                <X
                  size={16}
                  strokeWidth={2}
                  className="mt-0.5 flex-shrink-0 text-gray-400"
                  aria-label={t(locale, PLANSPIELE_PLAY, "play.notMet")}
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={SCHOLAR_TYPE.body}>{r.label}</span>
                  <span
                    className={`flex-shrink-0 tabular-nums ${SCHOLAR_TYPE.meta}`}
                  >
                    {r.earned}/{r.weight}
                  </span>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="rounded border border-gray-300 px-1.5 py-0.5 text-micro font-semibold uppercase tracking-[0.08em] text-gray-600">
                    {r.track === "engine"
                      ? t(locale, PLANSPIELE_PLAY, "play.engineGraded")
                      : t(locale, PLANSPIELE_PLAY, "play.coachGraded")}
                  </span>
                  {r.note && (
                    <span className={SCHOLAR_TYPE.meta}>{r.note}</span>
                  )}
                </div>

                {/* Model-answer comparison: the single biggest learning upgrade —
                    the student sees their value beside the model answer inline. */}
                {cmp && (
                  <div className="mt-2 flex flex-wrap items-stretch gap-2">
                    <span className="inline-flex items-baseline gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1">
                      <span className="text-micro font-semibold uppercase tracking-[0.08em] text-gray-500">
                        {youLabel}
                      </span>
                      <span className="text-small font-medium tabular-nums text-gray-700">
                        {cmp.you}
                      </span>
                    </span>
                    <span className="inline-flex items-baseline gap-1.5 rounded-md border border-gray-900 bg-gray-900 px-2.5 py-1">
                      <span className="text-micro font-semibold uppercase tracking-[0.08em] text-gray-300">
                        {modelLabel}
                      </span>
                      <span className="text-small font-semibold tabular-nums text-white">
                        {cmp.model}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
