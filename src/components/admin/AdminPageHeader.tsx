"use client";

/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Analytics Center — the per-page title row (Phase 4).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The big page heading + optional subtitle on the left, with a `right` slot for
 * page-level controls (a range selector, a refresh button, a "generated at"
 * stamp). Every /admin page opens with one of these so the title rhythm is
 * identical across Cockpit / Retention / Funnels / Paths.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { ReactNode } from "react";

export interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  /** Page-level controls aligned to the right of the heading. */
  right?: ReactNode;
}

export default function AdminPageHeader({
  title,
  subtitle,
  right,
}: AdminPageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1
          className="text-[22px] font-semibold leading-tight tracking-[-0.01em]"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="mt-1 text-[13px] leading-snug"
            style={{ color: "var(--text-secondary)" }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  );
}
