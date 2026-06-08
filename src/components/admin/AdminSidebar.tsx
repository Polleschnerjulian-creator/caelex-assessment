"use client";

/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Analytics Center — the fixed left navigation rail (Phase 4).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Four destinations for the cross-product analytics cockpit. Active state is
 * derived from usePathname: the Cockpit root ("/admin") matches exactly (so it
 * doesn't light up on every sub-route), while the leaf pages match a prefix.
 * A muted "← Back to app" link returns to the operator dashboard.
 *
 * Visual language mirrors the operator Sidebar (glass surface, --sidebar-* and
 * accent tokens, rounded nav pills) but this is a self-contained, much simpler
 * rail — no collapse, no groups — because /admin has a flat four-item IA.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Filter,
  GitBranch,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";

interface NavLink {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** Cockpit root matches exactly; leaves match as a path prefix. */
  exact?: boolean;
}

const NAV: NavLink[] = [
  {
    href: "/admin",
    label: "Cockpit",
    icon: <LayoutDashboard size={18} strokeWidth={1.5} />,
    exact: true,
  },
  {
    href: "/admin/retention",
    label: "Retention",
    icon: <Users size={18} strokeWidth={1.5} />,
  },
  {
    href: "/admin/funnels",
    label: "Funnels",
    icon: <Filter size={18} strokeWidth={1.5} />,
  },
  {
    href: "/admin/paths",
    label: "Paths",
    icon: <GitBranch size={18} strokeWidth={1.5} />,
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (item: NavLink) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <aside
      className="fixed left-0 top-0 z-30 flex h-screen w-[240px] flex-col glass-surface"
      style={{ borderRight: "1px solid var(--border-default)" }}
    >
      {/* Brand */}
      <div
        className="flex items-center gap-2.5 px-5"
        style={{ height: 64, borderBottom: "1px solid var(--border-default)" }}
      >
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{
            background: "var(--accent-primary-soft)",
            color: "var(--accent-primary)",
          }}
        >
          <ShieldCheck size={18} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 leading-tight">
          <p
            className="text-[14px] font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Caelex Admin
          </p>
          <p
            className="text-[10px] uppercase tracking-[0.08em]"
            style={{ color: "var(--text-secondary)" }}
          >
            Analytics
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav aria-label="Admin navigation" className="flex-1 space-y-0.5 p-3">
        {NAV.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="group flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] transition-colors duration-150"
              style={{
                background: active ? "var(--accent-primary-soft)" : undefined,
                color: active
                  ? "var(--accent-primary)"
                  : "var(--text-secondary)",
                fontWeight: active ? 600 : 500,
              }}
              onMouseEnter={(e) => {
                if (!active)
                  e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                if (!active)
                  e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              <span
                className="flex-shrink-0"
                style={{
                  color: active ? "var(--accent-primary)" : "inherit",
                }}
              >
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Back to app */}
      <div
        className="p-3"
        style={{ borderTop: "1px solid var(--border-default)" }}
      >
        <Link
          href="/dashboard"
          className="group flex items-center gap-2 rounded-[10px] px-3 py-2 text-[12.5px] transition-colors duration-150"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--text-primary)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--text-secondary)")
          }
        >
          <ArrowLeft size={15} strokeWidth={1.5} />
          <span>Back to app</span>
        </Link>
      </div>
    </aside>
  );
}
