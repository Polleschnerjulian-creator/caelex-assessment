/**
 * MetadataStrip — key:value metadata strip for Scholar.
 *
 * Replaces the old row of 4 identical gray chips that gave equal visual
 * weight to unequal facts. Here the ONE action-relevant fact (status)
 * leads as a StatusPill; the remaining facts read as quiet "Label Value"
 * pairs so hierarchy reflects importance.
 *
 * Presentational only: no hooks, no data imports. Server component.
 *
 * STRICTLY MONOCHROME: black / white / gray-* only — zero other hues.
 * WCAG 1.4.3: label gray-700 on white ≈ 8:1 ✓ · value gray-900 ≈ 15:1 ✓
 *
 * Layout choice — a single responsive `flex flex-wrap` rail of inline
 * "Label Value" pairs (not a <dl> grid). Each pair is an indivisible
 * unit, so labels never orphan from their values when the rail wraps;
 * `gap-x-6`/`gap-y-2` keep pairs legibly separated on one or many rows.
 * A grid was rejected: at narrow widths its columns collapse awkwardly,
 * whereas inline pairs degrade gracefully to a stacked list.
 */

import { DEFAULT_SCHOLAR_LOCALE, t, type ScholarLocale } from "../_i18n/core";
import { SOURCE } from "../_i18n/source";
import { SCHOLAR_TYPE } from "./scholar-type";
import { StatusPill } from "./StatusPill";

interface MetadataItem {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

interface MetadataStripProps {
  status?: string;
  items: MetadataItem[];
  className?: string;
  locale?: ScholarLocale;
}

// Treat null / undefined / "" as "no value" → skip the pair entirely.
// Other falsy-but-meaningful values (0, false) are kept intentionally.
function hasValue(value: React.ReactNode): boolean {
  return value !== null && value !== undefined && value !== "";
}

export function MetadataStrip({
  status,
  items,
  className,
  locale = DEFAULT_SCHOLAR_LOCALE,
}: MetadataStripProps) {
  const visibleItems = items.filter((item) => hasValue(item.value));

  // Nothing action-relevant and nothing to show → render nothing.
  if (!status && visibleItems.length === 0) return null;

  return (
    <dl
      className={
        "flex flex-wrap items-center gap-x-6 gap-y-2" +
        (className ? " " + className : "")
      }
    >
      {status && (
        <div className="flex items-center">
          <dt className="sr-only">{t(locale, SOURCE, "statusSrLabel")}</dt>
          <dd className="m-0">
            <StatusPill status={status} locale={locale} />
          </dd>
        </div>
      )}

      {visibleItems.map((item, index) => (
        <div key={index} className="flex items-baseline gap-2">
          <dt className={SCHOLAR_TYPE.metaLabel}>{item.label}</dt>
          <dd
            className={
              "m-0 text-small text-gray-900" + (item.mono ? " font-mono" : "")
            }
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
