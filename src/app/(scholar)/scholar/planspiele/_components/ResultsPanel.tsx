import { Check, X } from "lucide-react";
import { SCHOLAR_TYPE } from "../../_components/scholar-type";
import { t, type ScholarLocale } from "../../_i18n/core";
import { PLANSPIELE_PLAY } from "../../_i18n/planspiele-play";

/** Pre-resolved display row (labels/notes already i18n-resolved by the page). */
export interface ResultRow {
  label: string;
  note: string;
  earned: number;
  weight: number;
  correct: boolean;
  track: "engine" | "ai";
}

/**
 * Monochrome two-track score breakdown for one phase. Correctness is shown by a
 * check/cross glyph + bar fill, NEVER by hue (gray-900 vs gray-400).
 */
export function ResultsPanel({
  phaseTitle,
  rows,
  locale,
}: {
  phaseTitle: string;
  rows: ResultRow[];
  locale: ScholarLocale;
}) {
  const totalW = rows.reduce((a, r) => a + r.weight, 0);
  const totalE = rows.reduce((a, r) => a + r.earned, 0);
  const pct = totalW ? Math.round((totalE / totalW) * 100) : 0;

  return (
    <div className="rounded-2xl border border-gray-200/70 bg-white px-5 py-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className={SCHOLAR_TYPE.provisionLabel}>{phaseTitle}</h3>
        <span className={`tabular-nums ${SCHOLAR_TYPE.metaLabel}`}>
          {t(locale, PLANSPIELE_PLAY, "play.score")}: {pct}%
        </span>
      </div>

      <div
        className="mt-2 h-1.5 w-full rounded-full bg-gray-200"
        aria-hidden={true}
      >
        <div
          className="h-1.5 rounded-full bg-gray-900"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="mt-4 space-y-3" role="list">
        {rows.map((r, i) => (
          <li key={`${r.label}-${i}`} className="flex items-start gap-3">
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
                <span className={`tabular-nums ${SCHOLAR_TYPE.meta}`}>
                  {r.earned}/{r.weight}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="rounded border border-gray-300 px-1.5 py-0.5 text-micro font-semibold uppercase tracking-[0.08em] text-gray-600">
                  {r.track === "engine"
                    ? t(locale, PLANSPIELE_PLAY, "play.engineGraded")
                    : t(locale, PLANSPIELE_PLAY, "play.coachGraded")}
                </span>
                {r.note && <span className={SCHOLAR_TYPE.meta}>{r.note}</span>}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
