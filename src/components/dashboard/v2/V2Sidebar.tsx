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
      className="flex h-full w-60 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
    >
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4 dark:border-slate-800">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500 text-white">
          <span className="font-mono text-xs font-bold">C</span>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Caelex
          </span>
          <span className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Comply
          </span>
        </div>
      </div>

      {/* Cmd-K hint */}
      <div className="border-b border-slate-200 px-4 py-2 dark:border-slate-800">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-500 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
          onClick={() => {
            // Trigger ⌘K via synthetic keypress so we don't have to
            // pass the open-state setter all the way down.
            const event = new KeyboardEvent("keydown", {
              key: "k",
              metaKey: true,
              bubbles: true,
            });
            window.dispatchEvent(event);
          }}
        >
          <span>Search…</span>
          <span className="flex items-center gap-0.5">
            <Kbd className="text-[9px]">⌘</Kbd>
            <Kbd className="text-[9px]">K</Kbd>
          </span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        {/* Primary */}
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
          className="mt-6 flex w-full items-center justify-between gap-2 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
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
      <div className="border-t border-slate-200 px-2 py-2 dark:border-slate-800">
        <Link
          href="/dashboard/settings/ui"
          className={cn(
            "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition",
            pathname.startsWith("/dashboard/settings")
              ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
              : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
          )}
        >
          <Settings className="h-3.5 w-3.5" />
          Settings
        </Link>
        {userEmail || userName ? (
          <div className="mt-2 flex items-center gap-2 px-2 py-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {(userName ?? userEmail ?? "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-xs font-medium text-slate-900 dark:text-slate-100">
                {userName ?? "User"}
              </div>
              <div className="truncate text-[10px] text-slate-500 dark:text-slate-400">
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
        "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition",
        active
          ? "bg-emerald-50 text-emerald-900 font-medium dark:bg-emerald-950/30 dark:text-emerald-200"
          : dim
            ? "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          active
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300",
        )}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && item.badge > 0 ? (
        <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-medium text-white">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}
