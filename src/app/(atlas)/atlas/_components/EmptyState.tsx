"use client";

/**
 * Atlas Lawyer-UX-Audit F-RES-6 — standardised empty / loading / error state.
 *
 * Before this component, every Atlas surface rolled its own version:
 * `/atlas/alerts` had a polished dashed-border + icon + heading
 * pattern, `/atlas/sources` had bare text, `/atlas/updates` had two
 * lines of muted text, etc. The visual inconsistency made the
 * platform feel unfinished — and the bare-text variants felt like
 * dead ends ("No sources match the current filters." with no
 * affordance to recover).
 *
 * Three variants:
 *   - `empty`   — typical "no results" / "nothing here yet" state
 *   - `loading` — spinner with optional caption
 *   - `error`   — failed-to-load state with optional retry action
 *
 * The icon defaults to a sensible per-variant fallback (Inbox / Loader
 * / AlertCircle) but the consumer can override per call. Description
 * accepts ReactNode so we can mix in inline links and `<kbd>` hints
 * without HTML-encoding gymnastics.
 *
 * Sizes (`sm` / `md` / `lg`) scale the padding and icon footprint
 * — `sm` for inline contexts (filter-empty inside a panel), `md` for
 * page-level empty states (default), `lg` for hero-style first-run
 * states (e.g. /atlas/library before first save).
 */

import type { ReactNode } from "react";
import { AlertCircle, Inbox, Loader2 } from "lucide-react";

type Variant = "empty" | "loading" | "error";
type Size = "sm" | "md" | "lg";

interface EmptyStateProps {
  /** Defaults to "empty". */
  variant?: Variant;
  /** Override the variant default icon. Pass a Lucide-icon element
   *  (already sized) or any ReactNode. Use `null` to suppress the
   *  icon entirely. */
  icon?: ReactNode | null;
  /** Heading line. Required — no point in an empty state without one. */
  title: string;
  /** Body copy. Plain string OR rich ReactNode for inline links / kbd. */
  description?: ReactNode;
  /** Optional CTA below the description. Pass either a button element
   *  for click handlers, or a Link element for navigation. The
   *  component does NOT enforce a style — caller provides one that
   *  fits the surface (action-button vs ghost vs nav-link). */
  action?: ReactNode;
  /** Defaults to "md". */
  size?: Size;
  /** Solid surface card (default) vs dashed border. Dashed signals
   *  "this section is empty by configuration" (e.g. filter-empty);
   *  solid signals "this is the natural empty state for this dataset". */
  bordered?: "solid" | "dashed";
  /** F-RES-6 stage-2: tone selects between Atlas's standard light
   *  surface (default) and a bespoke dark variant for /atlas/library
   *  which uses its own white-on-dark palette. Without this option
   *  the library page would have to fork the component or stay on
   *  bespoke states (the latter was the original Bundle #8 trade-off). */
  tone?: "light" | "dark";
  /** Pass-through className so callers can constrain max-width or
   *  override margins without forking the component. */
  className?: string;
}

const SIZE_PADDING: Record<Size, string> = {
  sm: "px-4 py-6",
  md: "px-5 py-10",
  lg: "px-6 py-16",
};

const SIZE_ICON_WRAP: Record<Size, string> = {
  sm: "h-8 w-8 mb-2",
  md: "h-10 w-10 mb-3",
  lg: "h-14 w-14 mb-4",
};

const SIZE_TITLE: Record<Size, string> = {
  sm: "text-[12px]",
  md: "text-[13px]",
  lg: "text-[15px]",
};

const SIZE_DESC: Record<Size, string> = {
  sm: "text-[11px]",
  md: "text-[11px]",
  lg: "text-[12.5px]",
};

function defaultIcon(variant: Variant, size: Size): ReactNode {
  const px = size === "lg" ? 22 : size === "md" ? 16 : 14;
  switch (variant) {
    case "loading":
      return <Loader2 size={px} strokeWidth={1.5} className="animate-spin" />;
    case "error":
      return <AlertCircle size={px} strokeWidth={1.5} />;
    default:
      return <Inbox size={px} strokeWidth={1.5} />;
  }
}

export function EmptyState({
  variant = "empty",
  icon,
  title,
  description,
  action,
  size = "md",
  bordered = "solid",
  tone = "light",
  className = "",
}: EmptyStateProps) {
  const isDark = tone === "dark";

  /* Per-tone surface + border tokens. Dark variant explicitly uses
     `bg-white/[0.025]` + `ring-1 ring-white/[0.06]` to match the
     library page's existing visual language — those exact values
     come from .libraryEntry styling so the EmptyState doesn't read
     as a foreign component when sitting next to entry cards. */
  const surfaceClass = isDark
    ? "bg-white/[0.025] ring-1 ring-white/[0.06]"
    : "bg-[var(--atlas-bg-surface)]";

  const borderClass = isDark
    ? "" /* dark uses ring instead of border */
    : bordered === "dashed"
      ? "border border-dashed border-[var(--atlas-border)]"
      : "border border-[var(--atlas-border-subtle)]";

  /* Variant tone — error state shifts the icon ring red so the
     failure mode is unmistakable. Empty/loading stay neutral. Dark
     variants keep the same red-error treatment but on dark surfaces. */
  const iconWrapTone =
    variant === "error"
      ? isDark
        ? "bg-red-500/10 border border-red-400/30 text-red-300"
        : "bg-red-50 border border-red-200 text-red-600 dark:bg-red-500/10 dark:border-red-400/30 dark:text-red-300"
      : isDark
        ? "bg-white/[0.03] border border-white/[0.06] text-white/40"
        : "bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] text-[var(--atlas-text-faint)]";

  const titleTone =
    variant === "error"
      ? isDark
        ? "text-red-300"
        : "text-red-700 dark:text-red-300"
      : isDark
        ? "text-white/85"
        : "text-[var(--atlas-text-primary)]";

  const descriptionTone = isDark
    ? "text-white/55"
    : "text-[var(--atlas-text-muted)]";

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "loading" ? "polite" : undefined}
      className={`rounded-xl ${borderClass} ${surfaceClass} ${SIZE_PADDING[size]} text-center ${className}`}
    >
      {icon !== null && (
        <div
          className={`inline-flex items-center justify-center rounded-full ${iconWrapTone} ${SIZE_ICON_WRAP[size]}`}
          aria-hidden="true"
        >
          {icon ?? defaultIcon(variant, size)}
        </div>
      )}
      <h2
        className={`${SIZE_TITLE[size]} font-medium ${titleTone} mb-1 leading-tight`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`${SIZE_DESC[size]} ${descriptionTone} max-w-sm mx-auto leading-relaxed`}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
