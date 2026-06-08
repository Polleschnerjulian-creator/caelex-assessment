import { SCHOLAR_TYPE } from "../../_components/scholar-type";
import { t, type ScholarLocale } from "../../_i18n/core";
import { PLANSPIELE_PLAY } from "../../_i18n/planspiele-play";

/**
 * Monochrome phase-progress bar. `current` is 1-based. Filled segments use
 * gray-900, remaining gray-200 — correctness/progress shown by fill, never hue.
 */
export function PhaseProgress({
  total,
  current,
  locale,
}: {
  total: number;
  current: number;
  locale: ScholarLocale;
}) {
  return (
    <div>
      <div className="flex gap-1.5" aria-hidden={true}>
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full ${i < current ? "bg-gray-900" : "bg-gray-200"}`}
          />
        ))}
      </div>
      <p className={`mt-2 ${SCHOLAR_TYPE.meta}`}>
        {t(locale, PLANSPIELE_PLAY, "play.phase")} {current}{" "}
        {t(locale, PLANSPIELE_PLAY, "play.of")} {total}
      </p>
    </div>
  );
}
