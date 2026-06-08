"use client";

/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Analytics Center — the two-column client shell (Phase 4).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Chrome for the whole (admin) route group: a fixed AdminSidebar on the left and
 * a content column (AdminTopBar + scrolling page body) offset by the rail width.
 * The SERVER (admin)/layout enforces the super-admin gate and passes the
 * resolved `userEmail` down — this component renders no auth logic, only layout.
 *
 * The topbar's left slot carries a constant surface label ("Analytics Center");
 * each page owns its own <AdminPageHeader> inside the scroll body, so the heading
 * scrolls with the content while the email/badge stays pinned.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { ReactNode } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminTopBar from "./AdminTopBar";

export interface AdminShellProps {
  userEmail: string;
  children: ReactNode;
}

export default function AdminShell({ userEmail, children }: AdminShellProps) {
  return (
    <div
      className="caelex-admin min-h-screen"
      style={{
        background: "var(--bg-base, #f6f7f9)",
        color: "var(--text-primary)",
      }}
    >
      <AdminSidebar />

      {/* Content column — offset by the 240px fixed rail. */}
      <div className="ml-[240px] flex min-h-screen flex-col">
        <AdminTopBar userEmail={userEmail}>Analytics Center</AdminTopBar>

        <main className="flex-1 px-6 py-6">
          {/* Centered, width-capped column so wide monitors don't stretch
              charts to an unreadable aspect ratio. */}
          <div className="mx-auto w-full max-w-[1280px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
