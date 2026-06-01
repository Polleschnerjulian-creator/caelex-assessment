"use client";

/**
 * Caelex Trade — Sidebar — matches Caelex Comply V2 chrome.
 *
 * Mirrors `src/components/dashboard/v2/V2Sidebar.tsx`:
 *   - 244px wide, solid dark rgb(20,20,22) background
 *   - 0.5px white/0.06 right-edge hairline
 *   - inset specular top highlight (macOS Tahoe detail)
 *   - Inter font, near-SF-Pro metrics
 *   - 4 sections: Today / Master Data / Operations / Documents
 *   - Footer: Settings + Compliance Program
 *   - Active row: rgba(255,255,255,0.07) fill + bumped weight
 *   - Hover: rgba(255,255,255,0.04) fill
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Sparkles,
  Workflow,
  Boxes,
  Compass,
  FileText,
  ScanLine,
  ShieldCheck,
  Settings,
  BookOpen,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import type { SidebarBadgeCounts } from "@/lib/trade/sidebar-badge-counts.server";
import { RecentlyVisitedSection } from "./RecentlyVisitedSection";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Hover-tooltip explainer for compliance jargon — surfaced via
   *  `title` attr + hover-tooltip for new users. */
  tooltip?: string;
  match?: (pathname: string) => boolean;
  /** Key into SidebarBadgeCounts — when > 0 we render a pill next to
   *  the label so operators see "you have 3 things to look at" without
   *  clicking through. */
  badgeKey?: keyof SidebarBadgeCounts;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const SECTIONS: ReadonlyArray<NavSection> = [
  {
    label: "Start",
    items: [
      {
        href: "/trade",
        label: "Home",
        icon: Home,
        match: (p) => p === "/trade",
        tooltip: "Deine Schaltzentrale — was als Nächstes zu tun ist.",
      },
      {
        href: "/trade/applicability",
        label: "Geltungsbereich",
        icon: Compass,
        match: (p) => p.startsWith("/trade/applicability"),
        tooltip:
          "Betrifft mich Exportkontrolle? — welche Regime gelten + was du tun musst.",
      },
      {
        href: "/trade/astra",
        label: "Astra",
        icon: Sparkles,
        match: (p) => p.startsWith("/trade/astra"),
        tooltip: "Frag einfach — KI-Assistent für Export-Compliance.",
      },
    ],
  },
  {
    label: "Arbeit",
    items: [
      {
        href: "/trade/operations",
        label: "Vorgänge",
        icon: Workflow,
        match: (p) => p.startsWith("/trade/operations"),
        tooltip:
          "Ausfuhrvorgänge: Was? An wen? Wohin? → ein Urteil. + Pipeline + Lizenzen.",
        badgeKey: "operationsBlocked",
      },
      {
        href: "/trade/master-data",
        label: "Stammdaten",
        icon: Boxes,
        match: (p) =>
          p.startsWith("/trade/master-data") ||
          p.startsWith("/trade/items") ||
          p.startsWith("/trade/parties"),
        tooltip: "Artikel & Partner — automatisch klassifiziert & gescreent.",
      },
      {
        href: "/trade/screening",
        label: "Screening",
        icon: ScanLine,
        match: (p) => p.startsWith("/trade/screening"),
        tooltip:
          "Sanktions-Treffer triagieren — Potential Matches, veraltete & ungescreente Partner.",
        badgeKey: "partiesNeedingReview",
      },
      {
        href: "/trade/documents",
        label: "Dokumente",
        icon: FileText,
        match: (p) => p.startsWith("/trade/documents"),
        tooltip: "Alle Genehmigungen & Nachweise an einem Ort.",
        badgeKey: "eucAwaitingAction",
      },
    ],
  },
  // NOTE: Compliance-Programm + Einstellungen are NOT a SECTIONS group —
  // they live in FOOTER_ITEMS (rendered separately below) per the existing
  // sidebar pattern. Adding them here too would render them twice.
];

const FOOTER_ITEMS: ReadonlyArray<NavItem> = [
  {
    href: "/trade/program",
    label: "Compliance Program",
    icon: ShieldCheck,
    match: (p) => p.startsWith("/trade/program"),
    tooltip:
      "Internal Compliance Program (ICP) documentation: org structure, training, screening, recordkeeping, audit.",
  },
  {
    href: "/trade/research/training-corpus",
    label: "Training Corpus",
    icon: BookOpen,
    match: (p) => p.startsWith("/trade/research"),
    tooltip:
      "Curated BAFA AzG + DDTC CJ precedents — searchable knowledge base for classification reasoning.",
  },
  {
    href: "/trade/settings",
    label: "Settings",
    icon: Settings,
    match: (p) => p.startsWith("/trade/settings"),
    tooltip: "Workspace settings, notifications, API keys, audit retention.",
  },
];

function isItemActive(item: NavItem, pathname: string): boolean {
  if (item.match) return item.match(pathname);
  if (pathname === item.href) return true;
  return pathname.startsWith(item.href + "/");
}

interface Props {
  org: {
    id: string;
    name: string;
  };
  /** Per-org "needs attention" counts. Optional — sidebar renders
   *  cleanly without badges if not provided (e.g. legacy tests). */
  badgeCounts?: SidebarBadgeCounts;
}

export function TradeSidebar({ org, badgeCounts }: Props) {
  const pathname = usePathname();

  // Match V2Sidebar font stack — Inter + Apple system fallback.
  const sidebarFont =
    'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif';

  return (
    <nav
      aria-label="Caelex Trade navigation"
      className="flex h-full w-[244px] shrink-0 flex-col"
      style={{
        background: "rgb(20, 20, 22)",
        borderRight: "0.5px solid rgba(255, 255, 255, 0.06)",
        boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.06)",
        fontFamily: sidebarFont,
      }}
    >
      {/* Brand — workspace wordmark (org name in big modern type) */}
      <div className="flex h-[72px] items-center px-4">
        <Link
          href="/trade"
          className="block transition-opacity hover:opacity-80"
          aria-label={`${org.name} — Overview`}
        >
          <span
            className="block leading-none"
            style={{
              fontSize: "28px",
              fontWeight: 600,
              letterSpacing: "-0.025em",
              color: "rgba(255, 255, 255, 0.96)",
            }}
          >
            {org.name}
          </span>
        </Link>
      </div>

      {/* Scrollable sections */}
      <div
        className="flex-1 overflow-y-auto px-2.5 pb-3"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {SECTIONS.map((section, idx) => (
          <SidebarSection
            key={section.label}
            label={section.label}
            items={section.items}
            pathname={pathname}
            badgeCounts={badgeCounts}
            className={idx === 0 ? "" : "mt-5"}
          />
        ))}

        {/* Recently visited (U-MED-7) — localStorage-backed last 5 paths.
            Rendered AFTER the static nav so it doesn't push the canonical
            navigation down the viewport on first-time users. */}
        <RecentlyVisitedSection />
      </div>

      {/* Footer — divider + Settings/Program/Research */}
      <div
        className="px-2.5 py-3"
        style={{ borderTop: "0.5px solid rgba(255, 255, 255, 0.06)" }}
      >
        {FOOTER_ITEMS.map((item) => (
          <SidebarRow
            key={item.href}
            item={item}
            active={isItemActive(item, pathname)}
            badgeCounts={badgeCounts}
          />
        ))}
        {/* Help trigger — dispatches a window event consumed by
            TradeHelpCenter so we don't need to thread state through
            the shell. Also reachable via the "?" key. */}
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("caelex-trade:open-help"));
            }
          }}
          title="Help · glossary · keyboard shortcuts (?)"
          className="group flex w-full items-center gap-3 rounded-md px-2.5 py-1.5 transition-colors duration-150"
          style={{
            background: "transparent",
            color: "rgba(255, 255, 255, 0.65)",
            fontSize: "13px",
            fontWeight: 450,
            letterSpacing: "-0.005em",
          }}
        >
          <HelpCircle
            className="h-[15px] w-[15px] shrink-0"
            strokeWidth={1.75}
            aria-hidden="true"
            style={{ color: "rgba(255, 255, 255, 0.65)" }}
          />
          <span className="flex-1 truncate text-left">Help</span>
          <kbd
            aria-hidden="true"
            className="rounded px-1 text-[10px] font-mono"
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              color: "rgba(255, 255, 255, 0.60)",
            }}
          >
            ?
          </kbd>
        </button>
      </div>
    </nav>
  );
}

interface SidebarSectionProps {
  label: string;
  items: ReadonlyArray<NavItem>;
  pathname: string;
  badgeCounts?: SidebarBadgeCounts;
  className?: string;
}

function SidebarSection({
  label,
  items,
  pathname,
  badgeCounts,
  className = "",
}: SidebarSectionProps) {
  return (
    <section className={className}>
      <h3
        className="mb-1 px-2.5 text-[10.5px] font-semibold uppercase"
        style={{
          /* WCAG 2.2 AA — bumped from 0.35 to 0.62 to clear 4.5:1
             contrast on rgb(20,20,22) sidebar at 10.5px (small text). */
          color: "rgba(255, 255, 255, 0.62)",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </h3>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => (
          <li key={item.href}>
            <SidebarRow
              item={item}
              active={isItemActive(item, pathname)}
              badgeCounts={badgeCounts}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

interface SidebarRowProps {
  item: NavItem;
  active: boolean;
  badgeCounts?: SidebarBadgeCounts;
}

function SidebarRow({ item, active, badgeCounts }: SidebarRowProps) {
  const Icon = item.icon;
  // Resolve the per-item attention count from the parent map, if any.
  // `> 0` gate keeps the chrome quiet when there's nothing to do — empty
  // badges create visual noise that desensitises operators to real alerts.
  const badgeRaw =
    item.badgeKey && badgeCounts ? badgeCounts[item.badgeKey] : 0;
  const showBadge = badgeRaw > 0;
  // Cap visual width at 99+ so the pill doesn't stretch the row. 99 is the
  // conventional rollover point (Gmail, Slack, Linear all use it).
  const badgeText = badgeRaw > 99 ? "99+" : String(badgeRaw);
  // Augmented a11y label: "Counterparties (3 need review)" instead of just
  // "Counterparties" — VoiceOver reads the full intent without sighted users
  // having to translate "3" against the section context.
  const ariaLabel = showBadge
    ? `${item.label} (${badgeRaw} ${badgeKeyLabel(item.badgeKey)})`
    : undefined;
  return (
    <Link
      href={item.href}
      prefetch={true}
      title={item.tooltip ?? item.label}
      aria-label={ariaLabel}
      className="group flex items-center gap-3 rounded-md px-2.5 py-1.5 transition-colors duration-150"
      style={{
        background: active ? "rgba(255, 255, 255, 0.07)" : "transparent",
        color: active
          ? "rgba(255, 255, 255, 0.96)"
          : "rgba(255, 255, 255, 0.65)",
        fontSize: "13px",
        fontWeight: active ? 500 : 450,
        letterSpacing: "-0.005em",
      }}
    >
      <Icon
        className="h-[15px] w-[15px] shrink-0"
        strokeWidth={1.75}
        aria-hidden="true"
        style={{
          color: active
            ? "rgba(255, 255, 255, 0.96)"
            : "rgba(255, 255, 255, 0.65)",
        }}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {showBadge ? (
        <span
          aria-hidden="true"
          className="ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums"
          style={{
            background: "rgba(255, 255, 255, 0.10)",
            color: "rgba(255, 255, 255, 0.92)",
            letterSpacing: "0",
          }}
        >
          {badgeText}
        </span>
      ) : null}
    </Link>
  );
}

/** Short human suffix for the row's aria-label, e.g. "need review". */
function badgeKeyLabel(key: keyof SidebarBadgeCounts | undefined): string {
  switch (key) {
    case "partiesNeedingReview":
      return "need screening review";
    case "operationsBlocked":
      return "blocked";
    case "licensesExpiringSoon":
      return "expiring within 14 days";
    case "eucAwaitingAction":
      return "awaiting action";
    case "vsdOpen":
      return "open self-disclosures";
    default:
      return "items";
  }
}
