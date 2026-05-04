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
      className="caelex-glass-regular flex h-full w-56 shrink-0 flex-col"
      style={{
        borderRadius: 0,
        borderTop: "none",
        borderBottom: "none",
        borderLeft: "none",
      }}
    >
      {/* Brand */}
      <div
        className="flex h-12 items-center gap-2 px-3"
        style={{ borderBottom: "1px solid var(--caelex-divider)" }}
      >
        <div
          className="flex h-6 w-6 items-center justify-center rounded text-[var(--caelex-text-on-tint)]"
          style={{
            background: "var(--caelex-accent)",
            boxShadow: "0 0 0 1px var(--caelex-accent-rim)",
          }}
        >
          <span className="font-mono text-[11px] font-bold">C</span>
        </div>
        <div className="flex items-baseline gap-1.5 leading-none">
          <span className="caelex-text-primary font-mono text-[11px] font-semibold uppercase tracking-[0.18em]">
            CAELEX
          </span>
          <span
            className="font-mono text-[9px] uppercase tracking-[0.2em]"
            style={{ color: "var(--caelex-accent-text)" }}
          >
            COMPLY
          </span>
        </div>
      </div>

      {/* Cmd-K hint — single most important affordance per the brief */}
      <div
        className="px-3 py-2"
        style={{ borderBottom: "1px solid var(--caelex-divider)" }}
      >
        <button
          type="button"
          className="caelex-focusable caelex-text-tertiary flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors duration-tp-quick ease-tp-apple"
          style={{
            background: "var(--caelex-content-sunken)",
            border: "1px solid var(--caelex-content-border)",
          }}
          onClick={() => {
            const event = new KeyboardEvent("keydown", {
              key: "k",
              metaKey: true,
              bubbles: true,
            });
            window.dispatchEvent(event);
          }}
        >
          <span>Search Caelex…</span>
          <span className="flex items-center gap-0.5">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        <SidebarSection label="Mission" items={mission} isActive={isActive} />
        <SidebarSection
          label="Workflows"
          items={workflows}
          isActive={isActive}
          className="mt-5"
        />
        <SidebarSection
          label="Compliance"
          items={compliance}
          isActive={isActive}
          className="mt-5"
        />

        {/* Reference (collapsible). Hidden when empty so we don't
            ship an empty disclosure widget. */}
        {reference.length > 0 ? (
          <>
            <button
              type="button"
              onClick={() => setReferenceOpen((o) => !o)}
              aria-expanded={referenceOpen}
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
          </>
        ) : null}
      </div>

      {/* User footer */}
      <div
        className="px-2 py-2"
        style={{ borderTop: "1px solid var(--caelex-divider)" }}
      >
        <Link
          href="/dashboard/settings/ui"
          className={cn(
            "caelex-focusable flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors duration-tp-quick ease-tp-apple",
            pathname.startsWith("/dashboard/settings")
              ? "caelex-tint-accent caelex-text-primary"
              : "caelex-text-secondary hover:caelex-text-primary",
          )}
          style={
            pathname.startsWith("/dashboard/settings")
              ? undefined
              : { background: "transparent" }
          }
        >
          <Settings className="h-3.5 w-3.5" />
          <span className="font-mono uppercase tracking-wider text-[10px]">
            Settings
          </span>
        </Link>
        {userEmail || userName ? (
          <div className="mt-1.5 flex items-center gap-2 rounded-lg px-2 py-1.5">
            <div
              className="caelex-text-primary flex h-6 w-6 items-center justify-center rounded-md font-mono text-[10px] font-medium"
              style={{
                background: "var(--caelex-content-sunken)",
                boxShadow: "0 0 0 1px var(--caelex-content-border)",
              }}
            >
              {(userName ?? userEmail ?? "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 leading-tight">
              <div className="caelex-text-primary truncate text-[11px] font-medium">
                {userName ?? "User"}
              </div>
              <div className="caelex-text-tertiary truncate font-mono text-[9px]">
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
        <span className="caelex-text-tertiary font-mono text-[9px] uppercase tracking-[0.2em]">
          {label}
        </span>
      </div>
      <ul className="space-y-0.5">
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
      // Sprint 12 — active row uses Arctic Teal tint (caelex-tint-accent)
      // not a filled bar. Per the brief: "Active row gets Arctic Teal
      // tint at 12% alpha + 1px Arctic Teal accent on the leading
      // edge — *not* a filled bar."
      // Class `palantir-stripe-emerald` retained on the active branch
      // for the leading-edge bar; the @data-theme=light bridge in
      // globals.css remaps its emerald to Arctic Teal automatically.
      // Class `ring-emerald-500/30` retained on the active branch
      // because tests assert on it; the bridge remaps the ring colour
      // to the accent rim under [data-caelex-theme="light"].
      className={cn(
        "caelex-focusable group relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12px] transition-colors duration-tp-quick ease-tp-apple",
        active
          ? "caelex-tint-accent caelex-text-primary palantir-stripe-emerald ring-1 ring-inset ring-emerald-500/30"
          : dim
            ? "caelex-text-tertiary hover:caelex-text-secondary"
            : "caelex-text-secondary hover:caelex-text-primary",
      )}
    >
      <Icon
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          active
            ? ""
            : "caelex-text-tertiary group-hover:caelex-text-secondary",
        )}
        style={active ? { color: "var(--caelex-accent)" } : undefined}
      />
      <span className="flex-1 truncate font-medium">{item.label}</span>
      {item.badge && item.badge > 0 ? (
        <span
          className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-md px-1 font-mono text-[9px] font-bold"
          style={{
            background: "var(--caelex-accent)",
            color: "var(--caelex-text-on-tint)",
          }}
        >
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}
