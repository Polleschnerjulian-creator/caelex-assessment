"use client";

/**
 * CausalBreadcrumb — the "⟵ weil …" single-line suffix that attaches to
 * any value to explain its origin. The visual signature of the Context-
 * Omnipresence system.
 *
 * Example renders:
 *   "Essential Entity   ⟵ weil size ≥250 · assessment 2026-01-15"
 *   "Control A1.3       ⟵ NIS2 Art. 21(2)(d) · verified 2026-02-02"
 *
 * Composes with <ProvenanceChip /> when the caller also wants to
 * surface the origin at a glance — chip goes before the value, breadcrumb
 * after.
 *
 * Inputs:
 *   origin     — drives color/glyph via trust-tokens
 *   reason     — short phrase explaining the derivation (already translated)
 *   citation?  — optional tertiary pointer (e.g. "Art. 21(2)(d)", article tag)
 *   date?      — optional ISO date or Date — rendered as "verified <date>"
 *   onClick?   — click handler; when set, whole breadcrumb is a button
 *
 * Note: the prop is `citation`, not `ref`. React reserves `ref` for the
 * forwardRef imperative handle — using it as a plain string prop collides
 * with that API and throws at render time.
 *
 * Accessibility: the entire breadcrumb is wrapped in a single <span role>
 * with a composed aria-label that reads "<reason>, <date>, <origin>" so
 * screen readers get the provenance context without extra chrome.
 */

import { useLanguage } from "@/components/providers/LanguageProvider";
import { getTrustToken, type TrustOrigin } from "@/lib/design/trust-tokens";

interface CausalBreadcrumbProps {
  origin: TrustOrigin | string;
  /** Short human phrase already translated (caller owns i18n). */
  reason: string;
  /** Optional reference pointer — e.g. "NIS2 Art. 21(2)(d)".
   *  (Named `citation` — `ref` is reserved by React.) */
  citation?: string;
  /** Verified-at date. Accepts Date, ISO string, or undefined. */
  date?: Date | string;
  /** Click handler — opens side-peek or jumps to source. */
  onClick?: () => void;
  className?: string;
}

function formatDate(d: Date | string | undefined, lang: string): string | null {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return null;
  // Intl.DateTimeFormat honours the user language without extra wiring.
  return new Intl.DateTimeFormat(lang, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function CausalBreadcrumb({
  origin,
  reason,
  citation,
  date,
  onClick,
  className = "",
}: CausalBreadcrumbProps) {
  const { t, language } = useLanguage();
  const token = getTrustToken(origin);

  const dateStr = formatDate(date, language);
  const because = t("provenance.causal_because");
  const verifiedOn = t("provenance.verified_on");

  // Composed aria-label: reason + citation + date + origin, all separated
  // by comma for natural SR cadence.
  const ariaParts = [reason];
  if (citation) ariaParts.push(citation);
  if (dateStr) ariaParts.push(`${verifiedOn} ${dateStr}`);
  ariaParts.push(t(token.i18n.labelKey));
  const ariaLabel = ariaParts.join(", ");

  const base =
    "inline-flex items-baseline gap-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400";

  const interactive = onClick
    ? "cursor-pointer hover:underline decoration-dotted underline-offset-2 focus:outline-none focus:ring-1 focus:ring-current/30 rounded"
    : "";

  const classes = [base, interactive, className].filter(Boolean).join(" ");

  const Tag = onClick ? "button" : "span";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-label={ariaLabel}
      className={classes}
    >
      {/* Leading arrow — the visual "⟵ weil" signature. */}
      <span
        className={`select-none ${token.colors.breadcrumbAccent}`}
        aria-hidden="true"
      >
        ⟵
      </span>
      <span className="italic text-slate-400 dark:text-slate-500">
        {because}
      </span>
      {/* Primary reason — weight-medium gives it visual anchor. */}
      <span className={`font-medium ${token.colors.breadcrumbAccent}`}>
        {reason}
      </span>
      {/* Optional middle-dot separator + citation. */}
      {citation && (
        <>
          <span
            aria-hidden="true"
            className="select-none text-slate-300 dark:text-slate-600"
          >
            ·
          </span>
          <span className="tabular-nums">{citation}</span>
        </>
      )}
      {/* Optional trailing date. */}
      {dateStr && (
        <>
          <span
            aria-hidden="true"
            className="select-none text-slate-300 dark:text-slate-600"
          >
            ·
          </span>
          <span className="tabular-nums opacity-80">
            {verifiedOn} {dateStr}
          </span>
        </>
      )}
    </Tag>
  );
}

export default CausalBreadcrumb;
