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
 * The topbar's left slot carries a PAGE-DRIVEN surface label derived from the
 * active route (e.g. "CRM", "Steering") — not a constant "Analytics Center",
 * which mislabelled CRM/Steering. Each page still owns its own
 * <AdminPageHeader> inside the scroll body, so the big heading scrolls with the
 * content while this terse breadcrumb + email/badge stay pinned.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
import AdminTopBar from "./AdminTopBar";

export interface AdminShellProps {
  userEmail: string;
  children: ReactNode;
}

/**
 * Resolve the pinned topbar label from the current route. Longest-prefix wins
 * so "/admin/crm" beats "/admin"; the Cockpit root ("/admin") is matched
 * exactly. Falls back to "Admin" for any future sub-route not listed here
 * (never a stale "Analytics Center").
 */
function topBarTitle(pathname: string): string {
  const exact: Record<string, string> = {
    "/admin": "Cockpit",
  };
  if (exact[pathname]) return exact[pathname];

  const prefixes: { prefix: string; label: string }[] = [
    { prefix: "/admin/steering", label: "Steering" },
    { prefix: "/admin/products", label: "Products" },
    { prefix: "/admin/revenue", label: "Revenue" },
    { prefix: "/admin/growth", label: "Growth" },
    { prefix: "/admin/customers", label: "Customers" },
    { prefix: "/admin/efficiency", label: "Efficiency" },
    { prefix: "/admin/crm", label: "CRM" },
    { prefix: "/admin/retention", label: "Retention" },
    { prefix: "/admin/funnels", label: "Funnels" },
    { prefix: "/admin/paths", label: "Paths" },
  ];
  const match = prefixes.find(
    (p) => pathname === p.prefix || pathname.startsWith(p.prefix + "/"),
  );
  return match?.label ?? "Admin";
}

export default function AdminShell({ userEmail, children }: AdminShellProps) {
  const pathname = usePathname();
  const title = topBarTitle(pathname);

  return (
    <div
      className="caelex-admin min-h-screen"
      style={{
        // Near-black base with a single faint emerald glow top-right for depth
        // (the brand accent breathing through the dark terminal).
        background:
          "radial-gradient(1100px 580px at 84% -12%, rgba(16,185,129,0.07), transparent 60%), var(--bg-base, #08080b)",
        color: "var(--text-primary)",
      }}
    >
      <AdminSidebar />

      {/* Content column — offset by the 240px fixed rail. */}
      <div className="ml-[240px] flex min-h-screen flex-col">
        <AdminTopBar userEmail={userEmail}>{title}</AdminTopBar>

        <main className="flex-1 px-6 py-6">
          {/* Centered, width-capped column so wide monitors don't stretch
              charts to an unreadable aspect ratio. */}
          <div className="mx-auto w-full max-w-[1280px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
