"use client";

/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Analytics Center — the base content card (Phase 4).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * A glass-elevated panel that wraps every chart, table, and grouped block on the
 * /admin pages. Optional `title`/`subtitle` render a header row; `right` slots a
 * control (a range tab group, a "view all" link, a count badge) opposite the
 * title. Children are the body. Keeping this in one component means all admin
 * cards share the same elevation, radius, padding, and header rhythm.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { ReactNode } from "react";

export interface AdminCardProps {
  title?: string;
  subtitle?: string;
  /** A control rendered at the right edge of the header row (tabs, link…). */
  right?: ReactNode;
  className?: string;
  children: ReactNode;
}

export default function AdminCard({
  title,
  subtitle,
  right,
  className = "",
  children,
}: AdminCardProps) {
  // Render the header row only when there is something to put in it, so a bare
  // <AdminCard> is just a padded glass panel with no empty header gap.
  const hasHeader = Boolean(title || subtitle || right);

  return (
    <section
      className={`glass-elevated rounded-2xl p-5 ${className}`}
      style={{ border: "1px solid var(--border-default)" }}
    >
      {hasHeader && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title && (
              <h2
                className="text-[15px] font-semibold leading-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                className="mt-0.5 text-[12px] leading-snug"
                style={{ color: "var(--text-secondary)" }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {right && <div className="flex-shrink-0">{right}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
