"use client";

/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Analytics Center — the thin page-agnostic top bar (Phase 4).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * A slim header strip aligned to the content column. The left slot (`children`)
 * is a page-supplied title or breadcrumb; the right slot shows the signed-in
 * super-admin's email next to a "SUPER-ADMIN" badge — a constant reminder that
 * this surface has cross-tenant reach (and that every read is access-logged).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { ReactNode } from "react";

export interface AdminTopBarProps {
  userEmail: string;
  /** Left-aligned page title / breadcrumb slot. */
  children?: ReactNode;
}

export default function AdminTopBar({ userEmail, children }: AdminTopBarProps) {
  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between gap-4 px-6 glass-surface"
      style={{
        height: 64,
        borderBottom: "1px solid var(--border-default)",
      }}
    >
      <div
        className="min-w-0 text-[14px] font-medium"
        style={{ color: "var(--text-primary)" }}
      >
        {children}
      </div>

      <div className="flex flex-shrink-0 items-center gap-2.5">
        <span
          className="text-[12px]"
          style={{ color: "var(--text-secondary)" }}
        >
          {userEmail}
        </span>
        <span
          className="rounded-full px-2.5 py-[3px] text-[9.5px] font-medium uppercase tracking-[0.12em]"
          style={{
            background: "var(--accent-primary-soft)",
            color: "var(--accent-primary)",
            border: "1px solid var(--accent-line)",
          }}
        >
          Super-Admin
        </span>
      </div>
    </header>
  );
}
