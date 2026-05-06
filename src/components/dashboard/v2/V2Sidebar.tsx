"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gauge,
  Inbox,
  ListChecks,
  ShieldCheck,
  Bot,
  Settings,
  Globe,
  Orbit,
  Satellite,
  Network,
  AlertTriangle,
  ScrollText,
  FileSearch,
  ChevronDown,
  ChevronRight,
  Rocket,
  Activity,
  Link2,
  Heart,
  Clock,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/v2/kbd";

/**
 * V2Sidebar — the Linear-style permanent left rail for Comply v2.
 *
 * Sprint 5C reorganises the rail into a 4-section taxonomy that
 * mirrors the operator's mental model:
 *
 *   1. MISSION     — your spacecraft world. Always expanded. Top of
 *                    the rail because Caelex is a mission-first tool.
 *   2. WORKFLOWS   — daily action items (Today, Triage, Proposals,
 *                    Astra). Always expanded — this is where work
 *                    happens.
 *   3. COMPLIANCE  — regulatory state, audit, attestations, network.
 *                    Always expanded.
 *   4. REFERENCE   — collapsible catch-all (currently empty until
 *                    we promote V1 module links here).
 *
 * Active route gets emerald highlight; pendingProposals badge shows
 * on the Proposals link from any surface.
 *
 * Replaces the legacy DashboardShell sidebar entirely for V2 users.
 * V1 users still see DashboardShell (kept in the repo for rollback
 * per docs/CAELEX-COMPLY-CONCEPT.md § 3 Rollback-Strategie).
 */

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  hint?: string;
  badge?: number;
  match?: (pathname: string) => boolean;
}

export interface V2SidebarProps {
  pendingProposals: number;
  userEmail?: string | null;
  userName?: string | null;
}

export function V2Sidebar({
  pendingProposals,
  userEmail,
  userName,
}: V2SidebarProps) {
  const pathname = usePathname();
  const [referenceOpen, setReferenceOpen] = React.useState(false);

  const mission: NavItem[] = [
    {
      href: "/dashboard/missions",
      label: "Missions",
      icon: Rocket,
      match: (p) => p.startsWith("/dashboard/missions"),
    },
    {
      href: "/dashboard/ops-console",
      label: "Ops Console",
      icon: Activity,
    },
    {
      href: "/dashboard/mission-control",
      label: "Mission Control",
      icon: Globe,
    },
    {
      href: "/dashboard/universe",
      label: "Universe",
      icon: Sparkles,
    },
    { href: "/dashboard/ephemeris", label: "Ephemeris", icon: Orbit },
    { href: "/dashboard/sentinel", label: "Sentinel", icon: Satellite },
  ];

  const workflows: NavItem[] = [
    { href: "/dashboard/today", label: "Today", icon: Inbox },
    { href: "/dashboard/triage", label: "Triage", icon: ListChecks },
    {
      href: "/dashboard/proposals",
      label: "Proposals",
      icon: ShieldCheck,
      badge: pendingProposals,
    },
    {
      href: "/dashboard/astra-v2",
      label: "Astra",
      icon: Bot,
      match: (p) => p.startsWith("/dashboard/astra-v2"),
    },
  ];

  const compliance: NavItem[] = [
    { href: "/dashboard/posture", label: "Posture", icon: Gauge },
    { href: "/dashboard/tracker", label: "Article Tracker", icon: FileSearch },
    { href: "/dashboard/incidents", label: "Incidents", icon: AlertTriangle },
    {
      href: "/dashboard/audit-center",
      label: "Audit Center",
      icon: ScrollText,
    },
    {
      href: "/dashboard/audit-chain",
      label: "Audit Chain",
      icon: Link2,
    },
    {
      href: "/dashboard/health-pulse",
      label: "Health Pulse",
      icon: Heart,
    },
    {
      href: "/dashboard/time-travel",
      label: "Time Travel",
      icon: Clock,
    },
    { href: "/dashboard/network", label: "Network", icon: Network },
  ];

  // Reference is intentionally empty in Sprint 5C — V1 modules will
  // be promoted here in a follow-up once we know which surfaces
  // operators still hit. Kept as a section so the collapse-toggle
  // exists and we can add items without re-laying-out.
  const reference: NavItem[] = [];

  const isActive = (item: NavItem): boolean => {
    if (item.match) return item.match(pathname);
    if (pathname === item.href) return true;
    return pathname.startsWith(item.href + "/");
  };

  return (
    // Sprint 12 — Caelex Liquid Glass: chrome layer renders as
    // Glass-Regular. The wrapper has no rounded corners (sidebar
    // is edge-to-edge) but inherits the backdrop-filter +
    // background-rim shadow stack via .caelex-glass-regular.
    <nav
      aria-label="Comply navigation"
      className="apple-chrome-surface flex h-full w-60 shrink-0 flex-col border-r"
    >
      {/* Brand — Apple-style wordmark, no chunky icon, just type */}
      <div className="flex h-12 items-center px-4">
        <span
          className="text-[15px] font-semibold tracking-tight text-white"
          style={{
            fontFamily:
              '-apple-system, "SF Pro Display", system-ui, sans-serif',
            letterSpacing: "-0.018em",
          }}
        >
          Caelex
        </span>
        <span
          className="ml-1.5 text-[12px] font-medium text-white/35"
          style={{
            fontFamily:
              '-apple-system, "SF Pro Display", system-ui, sans-serif',
            letterSpacing: "-0.011em",
          }}
        >
          Comply
        </span>
      </div>

      {/* Sprint 12B: cmd-K trigger relocated to V2TopBar (the brief
          calls it "the single most important affordance" — top bar
          is its proper home). The CommandPalette still listens for
          ⌘K on window, so the keyboard shortcut works from anywhere
          inside the sidebar. */}

      <div
        className="flex-1 overflow-y-auto px-3 py-3"
        style={{
          fontFamily: '-apple-system, "SF Pro Text", system-ui, sans-serif',
        }}
      >
        <SidebarSection label="Mission" items={mission} isActive={isActive} />
        <SidebarSection
          label="Workflows"
          items={workflows}
          isActive={isActive}
          className="mt-6"
        />
        <SidebarSection
          label="Compliance"
          items={compliance}
          isActive={isActive}
          className="mt-6"
        />

        {/* Reference (collapsible). Hidden when empty so we don't
            ship an empty disclosure widget. */}
        {reference.length > 0 ? (
          <>
            <button
              type="button"
              onClick={() => setReferenceOpen((o) => !o)}
              aria-expanded={referenceOpen}
              className="apple-nav-section-label mt-6 flex w-full items-center justify-between gap-2 rounded px-2 py-1 transition hover:text-white/60"
            >
              <span>Reference</span>
              {referenceOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
            {referenceOpen ? (
              <ul className="mt-1 space-y-px">
                {reference.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} active={isActive(item)} dim />
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
      </div>

      {/* User footer — Apple-style: borderless, settings as nav row,
          account as avatar circle + name */}
      <div
        className="apple-chrome-divider px-3 py-3"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          fontFamily: '-apple-system, "SF Pro Text", system-ui, sans-serif',
        }}
      >
        <Link
          href="/dashboard/settings/ui"
          prefetch={true}
          className={cn(
            "group flex items-center gap-2.5 rounded-lg px-2 py-2 text-[13px] transition-colors duration-150",
            pathname.startsWith("/dashboard/settings")
              ? "apple-nav-active font-medium"
              : "apple-nav-idle",
          )}
          style={{
            letterSpacing: "-0.011em",
          }}
        >
          <Settings
            className={cn(
              "h-4 w-4 shrink-0 transition-colors",
              pathname.startsWith("/dashboard/settings")
                ? "text-white"
                : "text-white/55 group-hover:text-white/85",
            )}
            strokeWidth={1.6}
          />
          <span>Settings</span>
        </Link>
        {userEmail || userName ? (
          <div className="mt-1 flex items-center gap-2.5 rounded-lg px-2 py-2">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.08)",
                letterSpacing: 0,
              }}
            >
              {(userName ?? userEmail ?? "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 leading-tight">
              <div
                className="truncate text-[12.5px] font-medium text-white/90"
                style={{ letterSpacing: "-0.011em" }}
              >
                {userName ?? "User"}
              </div>
              <div
                className="truncate text-[11px] text-white/40"
                style={{ letterSpacing: 0 }}
              >
                {userEmail}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────

function SidebarSection({
  label,
  items,
  isActive,
  className,
}: {
  label: string;
  items: NavItem[];
  isActive: (item: NavItem) => boolean;
  className?: string;
}) {
  return (
    <section className={className} aria-label={label}>
      <div className="mb-1 px-2 py-1">
        <span className="apple-nav-section-label">{label}</span>
      </div>
      <ul className="space-y-px">
        {items.map((item) => (
          <li key={item.href}>
            <NavLink item={item} active={isActive(item)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function NavLink({
  item,
  active,
  dim = false,
}: {
  item: NavItem;
  active: boolean;
  dim?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      // 2026-05-06: prefetch={true} forces a full route prefetch on
      // hover/viewport-entry — required because all dashboard
      // routes are now `force-dynamic` (see dashboard/layout.tsx),
      // and Next.js 15's default Link only prefetches static routes
      // + the loading.tsx fallback for dynamic ones. Without this,
      // every sidebar click triggered a fresh server roundtrip
      // (300-600ms perceived as "the app is hanging"). With it,
      // hovering a sidebar item warms the cache so click feels
      // instant.
      prefetch={true}
      // Apple HIG: active row = subtle white selection-tint (8.5% alpha).
      // No accent stripe, no ring, no colored icon. Hover = 4% white wash.
      // Icon uses 1.6 stroke weight (between Lucide default 2 and SF
      // Symbols' thin 1.5) so it reads as Apple-system-icon-feel.
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg px-2 py-2 text-[13px] transition-colors duration-150",
        active
          ? "apple-nav-active font-medium"
          : dim
            ? "apple-nav-idle text-white/40"
            : "apple-nav-idle",
      )}
      style={{
        letterSpacing: "-0.011em",
      }}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          active ? "text-white" : "text-white/55 group-hover:text-white/85",
        )}
        strokeWidth={1.6}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && item.badge > 0 ? (
        <span
          className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums"
          style={{
            background: "rgba(255,255,255,0.16)",
            color: "rgba(255,255,255,0.92)",
            letterSpacing: 0,
          }}
        >
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}
