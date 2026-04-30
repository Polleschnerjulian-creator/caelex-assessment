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
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/v2/kbd";

/**
 * V2Sidebar — the Linear-style permanent left rail for Comply v2.
 *
 * Three sections, each styled as a flat, density-aware vertical list:
 *
 *   1. PRIMARY      — V2-native surfaces (Posture, Today, Triage,
 *                     Proposals, Astra V2). Always expanded.
 *   2. REFERENCE    — links to legacy modules / Atlas / Documents.
 *                     Collapsible by default to keep focus on V2.
 *   3. USER         — Settings, sign out.
 *
 * Active route gets emerald highlight; pendingProposals badge mirrors
 * the V2Shell-header badge so it's visible from any surface.
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

  const primary: NavItem[] = [
    { href: "/dashboard/posture", label: "Posture", icon: Gauge },
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

  const reference: NavItem[] = [
    {
      href: "/dashboard/mission-control",
      label: "Mission Control",
      icon: Globe,
    },
    { href: "/dashboard/ephemeris", label: "Ephemeris", icon: Orbit },
    { href: "/dashboard/sentinel", label: "Sentinel", icon: Satellite },
    { href: "/dashboard/network", label: "Network", icon: Network },
    { href: "/dashboard/incidents", label: "Incidents", icon: AlertTriangle },
    {
      href: "/dashboard/audit-center",
      label: "Audit Center",
      icon: ScrollText,
    },
    { href: "/dashboard/tracker", label: "Article Tracker", icon: FileSearch },
  ];

  const isActive = (item: NavItem): boolean => {
    if (item.match) return item.match(pathname);
    if (pathname === item.href) return true;
    // Sub-route match: /dashboard/items/... is a child of nothing in
    // primary, but /dashboard/today?regulation=X stays "Today active".
    return pathname.startsWith(item.href + "/");
  };

  return (
    <nav
      aria-label="Comply navigation"
      className="flex h-full w-56 shrink-0 flex-col border-r border-white/[0.06] bg-black/30 backdrop-blur-xl"
    >
      {/* Brand */}
      <div className="flex h-12 items-center gap-2 border-b border-white/[0.06] px-3">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/90 text-slate-950 ring-1 ring-emerald-400/50">
          <span className="font-mono text-[11px] font-bold">C</span>
        </div>
        <div className="flex items-baseline gap-1.5 leading-none">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-100">
            CAELEX
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-emerald-400">
            COMPLY
          </span>
        </div>
      </div>

      {/* Cmd-K hint */}
      <div className="border-b border-white/[0.06] px-3 py-2">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[11px] text-slate-400 transition hover:border-white/10 hover:bg-white/[0.04]"
          onClick={() => {
            const event = new KeyboardEvent("keydown", {
              key: "k",
              metaKey: true,
              bubbles: true,
            });
            window.dispatchEvent(event);
          }}
        >
          <span className="font-mono uppercase tracking-wider">Search</span>
          <span className="flex items-center gap-0.5">
            <Kbd className="border-white/10 bg-white/5 text-[9px] text-slate-300">
              ⌘
            </Kbd>
            <Kbd className="border-white/10 bg-white/5 text-[9px] text-slate-300">
              K
            </Kbd>
          </span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {/* Primary */}
        <div className="mb-1 px-2 py-1">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">
            Primary
          </span>
        </div>
        <ul className="space-y-0.5">
          {primary.map((item) => (
            <li key={item.href}>
              <NavLink item={item} active={isActive(item)} />
            </li>
          ))}
        </ul>

        {/* Reference (collapsible) */}
        <button
          type="button"
          onClick={() => setReferenceOpen((o) => !o)}
          className="mt-5 flex w-full items-center justify-between gap-2 rounded px-2 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500 transition hover:text-slate-300"
        >
          <span>Reference</span>
          {referenceOpen ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>
        {referenceOpen ? (
          <ul className="mt-1 space-y-0.5">
            {reference.map((item) => (
              <li key={item.href}>
                <NavLink item={item} active={isActive(item)} dim />
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* User footer */}
      <div className="border-t border-white/[0.06] px-2 py-2">
        <Link
          href="/dashboard/settings/ui"
          className={cn(
            "flex items-center gap-2 rounded px-2 py-1.5 text-xs transition",
            pathname.startsWith("/dashboard/settings")
              ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/30"
              : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200",
          )}
        >
          <Settings className="h-3.5 w-3.5" />
          <span className="font-mono uppercase tracking-wider text-[10px]">
            Settings
          </span>
        </Link>
        {userEmail || userName ? (
          <div className="mt-1.5 flex items-center gap-2 rounded px-2 py-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-white/[0.06] text-[10px] font-mono font-medium text-slate-300 ring-1 ring-white/10">
              {(userName ?? userEmail ?? "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[11px] font-medium text-slate-200">
                {userName ?? "User"}
              </div>
              <div className="truncate font-mono text-[9px] text-slate-500">
                {userEmail}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </nav>
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
      className={cn(
        "group relative flex items-center gap-2.5 rounded px-2 py-1.5 text-[12px] transition",
        active
          ? "bg-emerald-500/10 text-emerald-200 ring-1 ring-inset ring-emerald-500/30 palantir-stripe-emerald"
          : dim
            ? "text-slate-500 hover:bg-white/[0.03] hover:text-slate-300"
            : "text-slate-300 hover:bg-white/[0.04] hover:text-slate-100",
      )}
    >
      <Icon
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          active
            ? "text-emerald-400"
            : "text-slate-500 group-hover:text-slate-300",
        )}
      />
      <span className="flex-1 truncate font-medium">{item.label}</span>
      {item.badge && item.badge > 0 ? (
        <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-sm bg-emerald-500 px-1 font-mono text-[9px] font-bold text-slate-950">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}
