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
  Inbox,
  Package,
  Users,
  ShieldCheck,
  Workflow,
  FileCheck,
  FileSignature,
  Layers,
  AlertOctagon,
  Rocket,
  Sparkles,
  ScanSearch,
  Settings,
  UserCog,
  BookOpen,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import type { SidebarBadgeCounts } from "@/lib/trade/sidebar-badge-counts.server";

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
    label: "Today",
    items: [
      {
        href: "/trade",
        label: "Overview",
        icon: Inbox,
        tooltip: "Daily workspace snapshot — KPIs, action inbox, deadlines.",
      },
      {
        href: "/trade/astra",
        label: "Astra Trade",
        icon: Sparkles,
        match: (p) => p.startsWith("/trade/astra"),
        tooltip:
          "AI assistant for export-compliance. Ask classification, screening, license-determination questions in natural language.",
      },
    ],
  },
  {
    label: "Master Data",
    items: [
      {
        href: "/trade/items",
        label: "Items",
        icon: Package,
        match: (p) => p.startsWith("/trade/items"),
        tooltip:
          "Trade items (BoM lines) with multi-jurisdiction classification (ECCN / USML / EU Annex I / etc.).",
      },
      {
        href: "/trade/parties",
        label: "Counterparties",
        icon: Users,
        match: (p) => p.startsWith("/trade/parties"),
        tooltip:
          "Customers, suppliers, partners. Screened against OFAC SDN, BIS Entity, DDTC Debarred, UK OFSI, UN Consolidated.",
        badgeKey: "partiesNeedingReview",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        href: "/trade/operations",
        label: "Pipeline",
        icon: Workflow,
        match: (p) => p.startsWith("/trade/operations"),
        tooltip:
          "Atomic shipment lifecycle: Items × Counterparty × Route × License. DRAFT → SCREENING → LICENSED → EXECUTED.",
        badgeKey: "operationsBlocked",
      },
      {
        href: "/trade/licenses",
        label: "Licenses",
        icon: FileCheck,
        match: (p) => p.startsWith("/trade/licenses"),
        tooltip:
          "Active BAFA, BIS, DDTC, EU general authorisations with draw-down tracking + expiry warnings.",
        badgeKey: "licensesExpiringSoon",
      },
      {
        href: "/trade/classify",
        label: "Classify (AI)",
        icon: ScanSearch,
        match: (p) => p.startsWith("/trade/classify"),
        tooltip:
          "Upload a datasheet/PDF — Astra extracts technical attributes + suggests ECCN/USML classification.",
      },
    ],
  },
  {
    label: "Documents",
    items: [
      {
        href: "/trade/euc",
        label: "End-Use Certificates",
        icon: FileSignature,
        match: (p) => p.startsWith("/trade/euc"),
        tooltip:
          "End-Use Certificates (EUCs) confirm end-user + end-use for restricted items. Required under § 17 AWV, 15 CFR § 748.10, EU Annex IV.",
        badgeKey: "eucAwaitingAction",
      },
      {
        href: "/trade/reexport-consents",
        label: "Re-Export Consents",
        icon: FileSignature,
        match: (p) => p.startsWith("/trade/reexport-consents"),
        tooltip:
          "Authorisations from the original exporter allowing onward re-export to a new destination. Required under § 17 AWV + 15 CFR § 734.16.",
      },
      {
        href: "/trade/vsd",
        label: "Self-Disclosures",
        icon: AlertOctagon,
        match: (p) => p.startsWith("/trade/vsd"),
        tooltip:
          "Voluntary Self-Disclosures (VSDs) to OFAC / BIS / DDTC / BAFA when a potential violation is discovered. Time-sensitive (60–180 day windows).",
        badgeKey: "vsdOpen",
      },
      {
        href: "/trade/sammelgenehmigungen",
        label: "Sammelgenehmigungen",
        icon: Layers,
        match: (p) => p.startsWith("/trade/sammelgenehmigungen"),
        tooltip:
          "German BAFA collective export authorisations (AGG / AGE) covering multiple shipments under one approval. Volume-cap + draw-down tracked.",
      },
      {
        href: "/trade/france-los",
        label: "France LOS",
        icon: Rocket,
        match: (p) => p.startsWith("/trade/france-los"),
        tooltip:
          "France LOS (Loi sur les Opérations Spatiales) authorisations — casualty-risk ≤1×10⁻⁴ regime for French space launches/operations.",
      },
      {
        href: "/trade/uk-ecju",
        label: "UK ECJU",
        icon: FileCheck,
        match: (p) => p.startsWith("/trade/uk-ecju"),
        tooltip:
          "UK ECJU export licences: SIEL, OIEL, OGEL, SIEL-TC, OITCL — for dual-use + military exports from the UK.",
      },
      {
        href: "/trade/faa-ast",
        label: "FAA AST",
        icon: Rocket,
        match: (p) => p.startsWith("/trade/faa-ast"),
        tooltip:
          "FAA AST (14 CFR Part 450) commercial space launch + reentry licences. ULP-tolerance Ec calculator inside.",
      },
      {
        href: "/trade/deemed-exports",
        label: "Deemed Exports",
        icon: UserCog,
        match: (p) => p.startsWith("/trade/deemed-exports"),
        tooltip:
          "Release of controlled technology to foreign nationals INSIDE the US/EU is treated as an export. Tracks foreign-national access authorisations.",
      },
    ],
  },
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
