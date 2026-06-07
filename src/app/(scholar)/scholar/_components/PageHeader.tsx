/**
 * PageHeader — consistent h1 + subtitle block for Scholar pages.
 *
 * Presentational only: no hooks, no data imports.
 * Works in both server components and the client search page.
 *
 * WCAG 1.3.1 / 2.4.6: visible h1 with gray-900 on #F7F8FA ≥15:1 ✓
 * WCAG 1.4.3: subtitle gray-500 on #F7F8FA ≈ 4.7:1 ✓
 *
 * Design: Apple-inspired — tight semibold heading, no wide-tracked eyebrow.
 * The eyebrow prop is kept for API compat but rendered only when it adds
 * meaningful context not already in the title (e.g. jurisdiction code).
 * For generic "CAELEX SCHOLAR" eyebrows the h1 is the hero — no eyebrow shown.
 */

import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
}

// Eyebrows that add no context beyond the page title — omit them silently.
const GENERIC_EYEBROWS = new Set(["Caelex Scholar", "CAELEX SCHOLAR"]);

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
}: PageHeaderProps) {
  const showEyebrow = !GENERIC_EYEBROWS.has(eyebrow);

  return (
    <div className="mb-8">
      {/* Eyebrow — only for contextual labels like jurisdiction codes */}
      {showEyebrow && (
        <div className="flex items-center gap-2 mb-2">
          {Icon && (
            <Icon
              size={13}
              className="text-gray-400"
              strokeWidth={1.5}
              aria-hidden={true}
            />
          )}
          {/* Refined eyebrow: sentence-case, semibold, near-zero tracking — no shout */}
          <span className="text-[12px] font-semibold text-gray-500 tracking-[-0.01em]">
            {eyebrow}
          </span>
        </div>
      )}

      {/* h1 — tight, confident, Apple-style */}
      <h1 className="text-[28px] font-semibold text-gray-900 tracking-[-0.025em] leading-[1.1]">
        {title}
      </h1>

      {/* Subtitle — muted, comfortable line-height */}
      {subtitle && (
        <p className="mt-2 text-[13px] text-gray-500 leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}
