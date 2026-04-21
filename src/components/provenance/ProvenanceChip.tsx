"use client";

/**
 * ProvenanceChip — the universal "trust sticker" shown next to any
 * derived value in Caelex. Three density modes:
 *
 *   full:    [🛡 Deterministic]     — for row-level emphasis
 *   compact: [🛡 Reg]               — for dense tables
 *   icon:    [🛡]                   — for side-by-side with tight labels
 *
 * The chip is a pure presentational component. It reads the origin plus
 * optional metadata (confidence, stale, onClick) and renders the right
 * color + icon + label. No data fetching.
 *
 * Accessibility: the chip always exposes a full-sentence description via
 * `aria-label`, regardless of density mode — screen readers always get the
 * origin + description even when the visible text is abbreviated.
 */

import { useLanguage } from "@/components/providers/LanguageProvider";
import {
  getTrustToken,
  formatConfidence,
  type TrustOrigin,
} from "@/lib/design/trust-tokens";
import { Clock } from "lucide-react";

export type ChipDensity = "full" | "compact" | "icon";

interface ProvenanceChipProps {
  origin: TrustOrigin | string;
  /** Visual density. Defaults to "full". */
  density?: ChipDensity;
  /** For ai-inferred traces: value in [0,1]. Renders as percentage after label. */
  confidence?: number | null;
  /** Whether the underlying trace has passed its expiresAt. Renders a ⏰ badge. */
  stale?: boolean;
  /** When provided, chip renders as button and fires on click. Side-peek etc. */
  onClick?: () => void;
  /** Extra Tailwind — appended last so callers can override without !important. */
  className?: string;
}

export function ProvenanceChip({
  origin,
  density = "full",
  confidence,
  stale = false,
  onClick,
  className = "",
}: ProvenanceChipProps) {
  const { t } = useLanguage();
  const token = getTrustToken(origin);
  const Icon = token.icon;

  const label = t(token.i18n.labelKey);
  const description = t(token.i18n.descriptionKey);

  const confidencePct =
    origin === "ai-inferred" ? formatConfidence(confidence) : null;

  // Full aria-label always describes the origin in human language — even
  // in icon-only mode. Include confidence + stale state so SR users don't
  // miss them when the visible text is short.
  const ariaParts = [label, description];
  if (confidencePct !== null) {
    ariaParts.push(`${t("provenance.confidence")} ${confidencePct}`);
  }
  if (stale) ariaParts.push(t("provenance.stale"));
  const ariaLabel = ariaParts.join(" — ");

  // Pick short label for compact mode. Keeping this DOM-simple (no JS
  // string truncation) means SSR and CSR render identically.
  const displayLabel =
    density === "icon"
      ? null
      : density === "compact"
        ? label.length > 10
          ? `${label.slice(0, 9)}…`
          : label
        : label;

  // Base classes shared across densities.
  const base =
    "inline-flex items-center gap-1 rounded-full border text-[11px] font-medium tracking-tight transition-colors";

  // Density-specific padding + gap.
  const densityCls =
    density === "icon"
      ? "p-1"
      : density === "compact"
        ? "px-1.5 py-0.5"
        : "px-2 py-0.5";

  const interactive = onClick
    ? "cursor-pointer hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-current/30"
    : "";

  const staleCls = stale ? "ring-1 ring-amber-400/60" : "";

  const classes = [
    base,
    densityCls,
    token.colors.chipBg,
    token.colors.chipBorder,
    token.colors.chipText,
    interactive,
    staleCls,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const Tag = onClick ? "button" : "span";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-label={ariaLabel}
      title={density === "icon" ? ariaLabel : undefined}
      className={classes}
    >
      <Icon
        className={`h-3 w-3 flex-shrink-0 ${token.colors.iconAccent}`}
        aria-hidden="true"
      />
      {displayLabel && <span className="leading-none">{displayLabel}</span>}
      {confidencePct !== null && density !== "icon" && (
        <span
          className={`leading-none tabular-nums opacity-70 ${density === "compact" ? "hidden" : ""}`}
        >
          {confidencePct}
        </span>
      )}
      {stale && (
        <Clock
          className="h-3 w-3 flex-shrink-0 text-amber-500 dark:text-amber-400"
          aria-hidden="true"
        />
      )}
    </Tag>
  );
}

export default ProvenanceChip;
