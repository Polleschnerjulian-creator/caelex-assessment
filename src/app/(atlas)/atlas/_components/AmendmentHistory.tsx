import { Clock, ExternalLink } from "lucide-react";
import type { Amendment } from "@/data/legal-sources";

/**
 * Renders the amendment timeline of a legal source — most recent first.
 * Degrades gracefully: returns null when no amendments are tracked yet.
 */
export function AmendmentHistory({
  amendments,
  dateEnacted,
}: {
  amendments: Amendment[] | undefined;
  dateEnacted: string | undefined;
}) {
  if (!amendments || amendments.length === 0) return null;
  // M13: localeCompare only sorts correctly when every entry is ISO-8601.
  // Fall back to Date.parse() so a year-only string like "2024" stays in
  // order relative to full ISO dates. Invalid dates sink to the end.
  const sorted = [...amendments].sort((a, b) => {
    const ta = Date.parse(a.date);
    const tb = Date.parse(b.date);
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return tb - ta;
  });

  return (
    <details className="mt-3 pt-3 border-t border-gray-100 group">
      <summary className="flex items-center gap-2 cursor-pointer list-none text-[11px] font-semibold text-gray-700 hover:text-gray-900">
        <Clock
          size={11}
          strokeWidth={2}
          className="text-gray-400 group-open:text-gray-700"
        />
        Amendment history ({sorted.length})
        <span className="text-[10px] font-normal text-gray-400 group-open:hidden">
          — click to expand
        </span>
      </summary>

      <ol className="mt-3 relative border-l border-gray-200 ml-1.5">
        {sorted.map((a, i) => (
          <li key={`${a.date}-${i}`} className="ml-4 mb-3 last:mb-0">
            <span
              className="absolute -left-[5px] w-2.5 h-2.5 rounded-full bg-white border-2 border-emerald-500"
              aria-hidden="true"
            />
            <div className="flex flex-wrap items-baseline gap-2 mb-0.5">
              <span className="text-[11px] font-semibold text-gray-900 tabular-nums">
                {a.date}
              </span>
              <span className="text-[10px] font-mono text-gray-500">
                {a.reference}
              </span>
              {a.source_url && (
                <a
                  href={a.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Official text of amendment ${a.reference}`}
                  className="inline-flex items-center gap-0.5 text-[10px] text-gray-500 hover:text-emerald-700"
                >
                  text <ExternalLink size={9} aria-hidden="true" />
                </a>
              )}
            </div>
            <p className="text-[11px] text-gray-700 leading-relaxed">
              {a.summary}
            </p>
            {a.affected_sections && a.affected_sections.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {a.affected_sections.map((sec) => (
                  <span
                    key={sec}
                    className="text-[9px] font-mono text-gray-600 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5"
                  >
                    {sec}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
        {dateEnacted && (
          <li className="ml-4 mt-2">
            <span
              className="absolute -left-[5px] w-2.5 h-2.5 rounded-full bg-gray-200 border-2 border-white"
              aria-hidden="true"
            />
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] font-semibold text-gray-500 tabular-nums">
                {dateEnacted}
              </span>
              <span className="text-[10px] text-gray-400">
                Original enactment
              </span>
            </div>
          </li>
        )}
      </ol>
    </details>
  );
}
