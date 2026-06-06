/**
 * PageHeader — consistent eyebrow + h1 + subtitle block for Scholar pages.
 *
 * Presentational only: no hooks, no data imports.
 * Works in both server components and the client search page.
 *
 * WCAG 1.3.1 / 2.4.6: visible h1 with gray-900 on #F7F8FA ≥15:1 ✓
 * WCAG 1.4.3: eyebrow gray-500 on #F7F8FA ≈ 4.7:1 ✓; subtitle gray-600 ≈ 6.0:1 ✓
 */

import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
}: PageHeaderProps) {
  return (
    <div className="mb-8">
      {/* Eyebrow row */}
      <div className="flex items-center gap-2 mb-3">
        {Icon && (
          <Icon
            size={15}
            className="text-gray-500"
            strokeWidth={1.5}
            aria-hidden={true}
          />
        )}
        <span className="text-[11px] font-semibold text-gray-500 tracking-[0.18em] uppercase">
          {eyebrow}
        </span>
      </div>

      {/* h1 */}
      <h1 className="text-[32px] font-light text-gray-900 tracking-[-0.02em] leading-tight">
        {title}
      </h1>

      {/* Subtitle */}
      {subtitle && (
        <p className="mt-2 text-[13px] text-gray-600 leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}
