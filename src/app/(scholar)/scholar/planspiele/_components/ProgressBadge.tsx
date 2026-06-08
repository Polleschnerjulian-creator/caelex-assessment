import { Check } from "lucide-react";
import { t, type ScholarLocale } from "../../_i18n/core";
import { PLANSPIELE_PLAY } from "../../_i18n/planspiele-play";

/**
 * ProgressBadge — the catalog status chip for a Planspiel card.
 *
 * SERVER component, presentational only. Shows whether the student has not
 * started / is in progress / has completed a scenario, plus the score when
 * completed.
 *
 * STRICTLY MONOCHROME — the three states are distinguished by FILL, not hue:
 *   • completed   → solid gray-900 chip, white text, Check glyph + "· NN%".
 *   • in_progress → outlined gray-900 chip, gray-900 text.
 *   • not_started → outlined gray-300 chip, gray-500 text.
 *
 * Accessibility: the visible label is the full state word (not icon-only); the
 * Check glyph is decorative (aria-hidden). Inline-flex with py keeps the chip's
 * hit/!read area legible; it is non-interactive (a status, not a control).
 */
export function ProgressBadge({
  status,
  score,
  locale,
}: {
  status: "not_started" | "in_progress" | "completed";
  /** 0..100, shown only when completed. */
  score?: number;
  locale: ScholarLocale;
}) {
  const label =
    status === "completed"
      ? t(locale, PLANSPIELE_PLAY, "play.status.completed")
      : status === "in_progress"
        ? t(locale, PLANSPIELE_PLAY, "play.status.inProgress")
        : t(locale, PLANSPIELE_PLAY, "play.status.notStarted");

  const className =
    status === "completed"
      ? "border-gray-900 bg-gray-900 text-white"
      : status === "in_progress"
        ? "border-gray-900 bg-white text-gray-900"
        : "border-gray-300 bg-white text-gray-500";

  const pct =
    status === "completed" && typeof score === "number"
      ? Math.max(0, Math.min(100, Math.round(score)))
      : null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-micro font-semibold uppercase tracking-[0.06em] ${className}`}
    >
      {status === "completed" && (
        <Check size={12} strokeWidth={2.75} aria-hidden={true} />
      )}
      {label}
      {pct !== null && <span className="tabular-nums">· {pct}%</span>}
    </span>
  );
}
