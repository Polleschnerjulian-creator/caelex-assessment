"use client";

/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Analytics Center — the fixed left navigation rail (Phase 4).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Six destinations for the cross-product command center — Steering, Cockpit,
 * CRM, Retention, Funnels, Paths. Steering is the founder home (top of the
 * rail). Active state is derived from usePathname: both Steering ("/admin/
 * steering") and the Cockpit root ("/admin") match EXACTLY (so the Cockpit
 * doesn't light up on every sub-route and Steering stays distinct), while the
 * other leaf pages match a prefix. A muted "← Back to app" link returns to the
 * operator dashboard.
 *
 * Visual language mirrors the operator Sidebar (glass surface, --sidebar-* and
 * accent tokens, rounded nav pills) but this is a self-contained, much simpler
 * rail — no collapse, no groups — because /admin has a flat single-level IA.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  LayoutDashboard,
  Boxes,
  CircleDollarSign,
  TrendingUp,
  Building2,
  Gauge,
  Users,
  Filter,
  GitBranch,
  ArrowLeft,
  ShieldCheck,
  Inbox,
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
    // Founder home — sits above the Cockpit. Its own prefix so it stays
    // distinct from the exact-matched Cockpit root.
    href: "/admin/steering",
    label: "Steering",
    icon: <Compass size={18} strokeWidth={1.5} />,
  },
  {
    href: "/admin",
    label: "Cockpit",
    icon: <LayoutDashboard size={18} strokeWidth={1.5} />,
    exact: true,
  },
  {
    // Per-product deep-dive — usage, AI spend, by-org breakdown (aggregate only).
    href: "/admin/products",
    label: "Products",
    icon: <Boxes size={18} strokeWidth={1.5} />,
  },
  {
    // Board-grade revenue — MRR/ARR, movement waterfall, 90-day forecast + benchmarks.
    href: "/admin/revenue",
    label: "Revenue",
    icon: <CircleDollarSign size={18} strokeWidth={1.5} />,
  },
  {
    // Growth / PMF — sits right after the Cockpit (acquisition + activation lens).
    href: "/admin/growth",
    label: "Growth",
    icon: <TrendingUp size={18} strokeWidth={1.5} />,
  },
  {
    // Captured assessment leads (email-gated reports) incl. campaign
    // attribution — the follow-up list after a fair/QR campaign.
    href: "/admin/leads",
    label: "Leads",
    icon: <Inbox size={18} strokeWidth={1.5} />,
  },
  {
    // Customers — account-level depth; precedes Retention in the IA.
    href: "/admin/customers",
    label: "Customers",
    icon: <Building2 size={18} strokeWidth={1.5} />,
  },
  {
    // Efficiency — unit economics: viral coefficient + AI cost margin.
    href: "/admin/efficiency",
    label: "Efficiency",
    icon: <Gauge size={18} strokeWidth={1.5} />,
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
              className="group relative flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] transition-colors duration-150"
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
              {/* Active indicator — an emerald bar with a soft glow at the rail edge. */}
              {active && (
                <span
                  aria-hidden
                  className="absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-r-full"
                  style={{
                    width: 2.5,
                    background: "var(--accent-primary)",
                    boxShadow: "0 0 12px var(--accent-primary)",
                  }}
                />
              )}
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
