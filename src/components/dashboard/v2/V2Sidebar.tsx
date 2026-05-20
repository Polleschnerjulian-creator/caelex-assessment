"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
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
  Rocket,
  FileText,
  Bell,
  Fingerprint,
  Newspaper,
  Globe2,
  Layers,
  // Sprint UF23 — operator-relevant orphan routes surfaced.
  Send,
  Wand2,
  Boxes,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/v2/kbd";
import type { OnboardingSetupState } from "@/lib/comply-v2/onboarding-state.server";

/**
 * V2Sidebar — the Linear-style permanent left rail for Comply v2.
 *
 * Sprint Sidebar-Refactor (post all-V2-builds): regrouped into 4
 * sections matching the operator's actual workflow patterns. Net
 * effect: 19 → 19 items, but better-bucketed and the 5 newly-built
 * surfaces (Notifications, Documents, Regulatory Feed, Audit Log,
 * System Health) are reachable from the rail. Four wow-features
 * (Universe, Time Travel, Health Pulse, Audit Chain) moved out of
 * primary nav — they remain reachable by URL + are candidates for
 * tab integration into their parent surfaces.
 *
 *   1. TODAY'S WORK — daily inbox/queue surfaces. Top of the rail
 *                     because this is where the user starts every
 *                     morning.
 *   2. OPERATIONS   — missions, hardware, autonomous monitoring.
 *                     The "what's flying" view.
 *   3. COMPLIANCE   — regulatory state, evidence, network, trade.
 *                     The "what we owe regulators" view.
 *   4. AUDIT &      — audit trails, system observability. The
 *      SYSTEM        "show your work + verify it's running" view
 *                    (regulators + ops).
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
  setupState?: OnboardingSetupState | null;
}

export function V2Sidebar({
  pendingProposals,
  userEmail,
  userName,
  setupState,
}: V2SidebarProps) {
  const pathname = usePathname();

  // Sprint Sidebar-Refactor — sections regrouped per workflow pattern.
  // Wow-features (Universe / Time Travel / Health Pulse / Audit Chain)
  // moved out of primary nav — still URL-reachable, candidates for
  // tab integration into parent surfaces in a follow-up.

  const todaysWork: NavItem[] = [
    { href: "/dashboard/today", label: "Today", icon: Inbox },
    // Day-1 Magic Moment removed from primary nav — one-shot event,
    // still URL-reachable at /dashboard/day1 + Cmd-K verb.
    { href: "/dashboard/triage", label: "Triage", icon: ListChecks },
    {
      href: "/dashboard/proposals",
      label: "Proposals",
      icon: ShieldCheck,
      badge: pendingProposals,
    },
    {
      href: "/dashboard/notifications",
      label: "Notifications",
      icon: Bell,
    },
    {
      href: "/dashboard/astra-v2",
      label: "Astra",
      icon: Bot,
      match: (p) => p.startsWith("/dashboard/astra-v2"),
    },
  ];

  const operations: NavItem[] = [
    {
      href: "/dashboard/missions",
      label: "Missions",
      icon: Rocket,
      match: (p) => p.startsWith("/dashboard/missions"),
    },
    {
      // Was "Mission Control" — the 3D satellite-tracking globe.
      // Renamed to describe what the surface actually IS rather than
      // what it's called internally.
      href: "/dashboard/mission-control",
      label: "Live Tracking",
      icon: Globe,
    },
    {
      // Was "Ephemeris" — physics-driven orbital compliance forecasting.
      // "Orbit Forecast" tells operators what they get.
      href: "/dashboard/ephemeris",
      label: "Orbit Forecast",
      icon: Orbit,
    },
    {
      // Was "Sentinel" — distributed telemetry agents collecting
      // signed evidence packets. "Live Telemetry" is what an operator
      // would search for.
      href: "/dashboard/sentinel",
      label: "Live Telemetry",
      icon: Satellite,
    },
  ];

  const compliance: NavItem[] = [
    { href: "/dashboard/posture", label: "Posture", icon: Gauge },
    {
      href: "/dashboard/modules",
      label: "Modules",
      icon: Layers,
      match: (p) => p.startsWith("/dashboard/modules"),
    },
    // Was "Article Tracker" — "tracker" doesn't say what it does;
    // "Status" tells the operator they'll see compliant/in-progress flags.
    {
      href: "/dashboard/tracker",
      label: "Article Status",
      icon: FileSearch,
    },
    { href: "/dashboard/incidents", label: "Incidents", icon: AlertTriangle },
    {
      href: "/dashboard/documents",
      label: "Documents",
      icon: FileText,
    },
    // Was "Generate" — now spells out what it does.
    {
      href: "/dashboard/generate",
      label: "AI Document Generator",
      icon: Wand2,
    },
    // Was "NCA Portal" — "NCA" is insider-lingo (National Competent
    // Authority). "Authority Submissions" is self-explanatory.
    {
      href: "/dashboard/nca-portal",
      label: "Authority Submissions",
      icon: Send,
    },
    // Was "Regulatory Feed" — operators don't search "feed", they
    // search "updates".
    {
      href: "/dashboard/regulatory-feed",
      label: "Regulation Updates",
      icon: Newspaper,
    },
    // Was "Network" — generic word; "Stakeholder Network" says who.
    {
      href: "/dashboard/network",
      label: "Stakeholder Network",
      icon: Network,
    },
    // Was "Trade" — broadens to "Trade & Export" to make export-
    // control coverage obvious (operators care about that distinction).
    {
      href: "/dashboard/trade",
      label: "Trade & Export",
      icon: Globe2,
      match: (p) => p.startsWith("/dashboard/trade"),
    },
    // Was "Digital Twin" — buzzword that doesn't describe the feature.
    // "What-If Simulator" tells the operator they can model scenarios.
    {
      href: "/dashboard/digital-twin",
      label: "What-If Simulator",
      icon: Boxes,
    },
  ];

  // Sidebar-Cleanup — niche / admin / drill-down tools removed from
  // primary nav (still URL-reachable + Cmd-K):
  //   - Lineage Explorer   → drill-down from item detail pages
  //   - Hash Chain         → sub-tool of Audit Log
  //   - Ops Console        → technical/admin surface
  //   - System Health      → belongs under Settings
  const audit: NavItem[] = [
    {
      href: "/dashboard/audit-center",
      label: "Audit Center",
      icon: ScrollText,
    },
    {
      href: "/dashboard/audit-log",
      label: "Audit Log",
      icon: Fingerprint,
    },
  ];

  const isActive = (item: NavItem): boolean => {
    if (item.match) return item.match(pathname);
    if (pathname === item.href) return true;
    return pathname.startsWith(item.href + "/");
  };

  // Premium-Sidebar Typography: Inter (already loaded via /app/layout.tsx
  // as --font-inter) for cross-platform consistency. Inter's metrics
  // are deliberately tuned to be near-identical to SF Pro — this is
  // the same trick Linear, Vercel, Cal.com, and Raycast all use to
  // get a Mac-native feel that survives Windows/Linux.
  const sidebarFont =
    'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif';

  return (
    <nav
      aria-label="Comply navigation"
      className="flex h-full w-[244px] shrink-0 flex-col"
      style={{
        // Solid premium dark surface — drop the aggressive translucency.
        // Linear / Raycast / macOS Mail use a near-opaque dark surface
        // (~92% opacity) with a hairline right-edge separator, NOT a
        // see-through frosted glass. The "depth" comes from the
        // specular rim + drop shadow, not from blur.
        background: "rgb(20, 20, 22)",
        borderRight: "0.5px solid rgba(255, 255, 255, 0.06)",
        // Specular rim — visible inner top edge, the macOS Tahoe detail.
        boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.06)",
        fontFamily: sidebarFont,
      }}
    >
      {/* Brand — Caelex Comply Studio logo (the real comply wordmark,
          NOT the generic Caelex C-mark). Two SVG variants:
            - Dark mode → white-on-transparent logo
            - Light mode → black-on-transparent logo
          Switched via Tailwind's `dark:` modifier (the V2ShellThemeRoot
          sets `dark` class for V2). Logo is the largest visual element
          in the sidebar header — 40px height — so it carries the brand
          presence per the user feedback "deutlich größer". */}
      <div className="flex h-[72px] items-center px-4">
        <Link
          href="/dashboard/today"
          className="block"
          aria-label="Caelex Comply Studio — go to Today"
        >
          {/* Light-mode variant (black logo) */}
          <Image
            src="/logos/comply-studio-light.svg"
            alt="Caelex Comply Studio"
            width={290}
            height={130}
            priority
            unoptimized
            className="block dark:hidden"
            style={{ width: "auto", height: 40 }}
          />
          {/* Dark-mode variant (white logo) */}
          <Image
            src="/logos/comply-studio-dark.svg"
            alt="Caelex Comply Studio"
            width={290}
            height={130}
            priority
            unoptimized
            className="hidden dark:block"
            style={{ width: "auto", height: 40 }}
          />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 pb-4">
        <SidebarSection label="Inbox" items={todaysWork} isActive={isActive} />
        <SidebarSection
          label="Operations"
          items={operations}
          isActive={isActive}
          className="mt-6"
        />
        <SidebarSection
          label="Compliance"
          items={compliance}
          isActive={isActive}
          className="mt-6"
        />
        <SidebarSection
          label="Audit"
          items={audit}
          isActive={isActive}
          className="mt-6"
        />
      </div>

      {/* Setup-progress badge — only renders when onboarding is
          incomplete. Tapping it returns the user to the wizard
          which resumes at the next incomplete step. Disappears
          entirely once setup is done so it doesn't permanently
          steal sidebar real estate. */}
      {setupState && setupState.completedSteps < setupState.totalSteps ? (
        <SetupProgressBadge state={setupState} />
      ) : null}

      {/* Footer — hairline divider, Settings row + Account row.
          No bordered pill, no email line. Just the essentials. */}
      <div
        className="px-2.5 py-3"
        style={{ borderTop: "0.5px solid rgba(255, 255, 255, 0.06)" }}
      >
        <Link
          href="/dashboard/settings/ui"
          prefetch={true}
          className={cn(
            "group flex items-center gap-3 rounded-md px-2.5 py-1.5 transition-colors duration-150",
          )}
          style={{
            background: pathname.startsWith("/dashboard/settings")
              ? "rgba(255, 255, 255, 0.07)"
              : "transparent",
            color: pathname.startsWith("/dashboard/settings")
              ? "rgba(255, 255, 255, 0.96)"
              : "rgba(255, 255, 255, 0.65)",
            fontSize: "13px",
            fontWeight: pathname.startsWith("/dashboard/settings") ? 500 : 450,
            letterSpacing: "-0.005em",
          }}
        >
          <Settings
            className="h-[15px] w-[15px] shrink-0"
            strokeWidth={1.75}
            style={{
              color: pathname.startsWith("/dashboard/settings")
                ? "rgba(255, 255, 255, 0.96)"
                : "rgba(255, 255, 255, 0.55)",
            }}
          />
          <span>Settings</span>
        </Link>
        {userEmail || userName ? (
          <div className="mt-1 flex items-center gap-3 rounded-md px-2.5 py-1.5">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.12)",
                letterSpacing: 0,
              }}
            >
              {(userName ?? userEmail ?? "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 leading-tight">
              <div
                className="truncate text-[13px] font-medium"
                style={{
                  color: "rgba(255, 255, 255, 0.92)",
                  letterSpacing: "-0.005em",
                }}
              >
                {userName ?? "User"}
              </div>
              <div
                className="truncate text-[11px]"
                style={{
                  color: "rgba(255, 255, 255, 0.4)",
                  letterSpacing: 0,
                }}
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
      <div className="mb-1.5 px-2.5 pt-2">
        <span
          style={{
            color: "rgba(255, 255, 255, 0.45)",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
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
      // Active state communicated TWO ways:
      //   1. aria-current="page" — accessibility + test hook
      //   2. inline `background` style — visual selection-tint
      // The aria attribute is the canonical signal; the visual is
      // derived from it. Tests assert on aria-current, not the
      // inline style which is volatile.
      aria-current={active ? "page" : undefined}
      // Linear/Raycast-style active row: subtle 7% white wash, NO blue
      // tint, NO ring. Active text gets bumped to weight 500 for the
      // hierarchy cue. Icons use strokeWidth 1.75 (Lucide native is 2;
      // 1.75 is between SF Symbols and Lucide and reads premium).
      // Sub-pixel letter-spacing (-0.005em) is the difference between
      // "feels native" and "feels like Inter on a Windows machine".
      className={cn(
        "group relative flex items-center gap-3 rounded-md transition-colors duration-150",
      )}
      style={{
        background: active ? "rgba(255, 255, 255, 0.07)" : "transparent",
        color: active
          ? "rgba(255, 255, 255, 0.96)"
          : dim
            ? "rgba(255, 255, 255, 0.4)"
            : "rgba(255, 255, 255, 0.65)",
        fontSize: "13px",
        fontWeight: active ? 500 : 450,
        letterSpacing: "-0.005em",
        padding: "5px 10px",
      }}
      onMouseEnter={(e) => {
        if (!active)
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      <Icon
        className="h-[15px] w-[15px] shrink-0"
        strokeWidth={1.75}
        style={{
          color: active
            ? "rgba(255, 255, 255, 0.96)"
            : "rgba(255, 255, 255, 0.55)",
        }}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && item.badge > 0 ? (
        <span
          className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums"
          style={{
            background: "rgba(255, 255, 255, 0.12)",
            color: "rgba(255, 255, 255, 0.9)",
            letterSpacing: 0,
          }}
        >
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

/**
 * Setup-progress badge — sidebar footer block above the Settings
 * row. Shows N/4 dots filled, the next-action label, and routes to
 * the right place when clicked. Hidden once all 4 steps are done.
 */
function SetupProgressBadge({ state }: { state: OnboardingSetupState }) {
  const labels: Record<OnboardingSetupState["nextAction"], string> = {
    set_up_organization: "Set up organization",
    create_first_mission: "Create first mission",
    add_spacecraft: "Add your spacecraft",
    run_assessment: "Run assessment",
    open_first_item: "Open first item",
    all_done: "All set",
  };
  const hrefs: Record<OnboardingSetupState["nextAction"], string> = {
    set_up_organization: "/onboarding",
    create_first_mission: "/dashboard/missions/new",
    add_spacecraft: "/onboarding",
    run_assessment: "/assessment/unified",
    open_first_item: "/dashboard/today",
    all_done: "/dashboard/today",
  };

  return (
    <div
      className="mx-2.5 my-2 rounded-xl p-3"
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        boxShadow:
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.05), 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span
          style={{
            color: "rgba(255, 255, 255, 0.45)",
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Setup
        </span>
        <span
          className="tabular-nums"
          style={{
            color: "rgba(255, 255, 255, 0.7)",
            fontSize: "11px",
            fontWeight: 500,
          }}
        >
          {state.completedSteps}/{state.totalSteps}
        </span>
      </div>
      <div className="mb-2.5 flex gap-1">
        {Array.from({ length: state.totalSteps }, (_, i) => (
          <span
            key={i}
            aria-hidden
            className="h-1 flex-1 rounded-full"
            style={{
              background:
                i < state.completedSteps
                  ? "rgba(255, 255, 255, 0.92)"
                  : "rgba(255, 255, 255, 0.12)",
            }}
          />
        ))}
      </div>
      <Link
        href={hrefs[state.nextAction]}
        prefetch={true}
        className="block w-full rounded-md px-2 py-1.5 text-center transition-colors"
        style={{
          background: "rgba(255, 255, 255, 0.92)",
          color: "rgb(20, 20, 22)",
          fontSize: "12px",
          fontWeight: 500,
          letterSpacing: "-0.005em",
        }}
      >
        {labels[state.nextAction]}
      </Link>
    </div>
  );
}
