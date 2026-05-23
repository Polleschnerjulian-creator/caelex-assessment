"use client";

/**
 * Caelex Trade — Light context sidebar (middle column).
 *
 * Pattern: matches the reference UI — single-context light sidebar that
 * shows the items for the currently-active rail section. Title at top,
 * grouped list of items, subtle hover/active states, no collapsibles.
 *
 * The active rail section is derived from the URL via `findActiveRailId`
 * (see TradeRail). Each rail section owns 1+ subsection of nav items.
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
  Settings as SettingsIcon,
  UserCog,
  Menu,
  X,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { findActiveRailId, RAIL_SECTIONS } from "./TradeRail";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** When set, treat any pathname starting with this prefix as active. */
  activePrefix?: string;
  /** Optional right-aligned counter badge. */
  count?: number;
}

interface NavSubsection {
  /** Optional muted label above the items (omit for "default" subsection). */
  label?: string;
  items: NavItem[];
}

interface RailSectionContent {
  /** Big title at top of the sidebar (≤25 chars). */
  title: string;
  /** One or more subsections of nav items. */
  subsections: NavSubsection[];
}

/** What appears in the light sidebar for each rail section.
 *  Keys match RAIL_SECTIONS ids in TradeRail.tsx. */
const SIDEBAR_CONTENT: Record<string, RailSectionContent> = {
  today: {
    title: "Today",
    subsections: [
      {
        items: [
          { label: "Overview", href: "/trade", icon: Inbox },
          {
            label: "Astra Trade",
            href: "/trade/astra",
            icon: Sparkles,
            activePrefix: "/trade/astra",
          },
        ],
      },
    ],
  },
  data: {
    title: "Data",
    subsections: [
      {
        items: [
          {
            label: "Items",
            href: "/trade/items",
            icon: Package,
            activePrefix: "/trade/items",
          },
          {
            label: "Counterparties",
            href: "/trade/parties",
            icon: Users,
            activePrefix: "/trade/parties",
          },
        ],
      },
    ],
  },
  operations: {
    title: "Operations",
    subsections: [
      {
        items: [
          {
            label: "Pipeline",
            href: "/trade/operations",
            icon: Workflow,
            activePrefix: "/trade/operations",
          },
          {
            label: "Licenses",
            href: "/trade/licenses",
            icon: FileCheck,
            activePrefix: "/trade/licenses",
          },
          {
            label: "Classify (AI)",
            href: "/trade/classify",
            icon: ScanSearch,
            activePrefix: "/trade/classify",
          },
        ],
      },
    ],
  },
  documents: {
    title: "Documents",
    subsections: [
      {
        label: "Lifecycle",
        items: [
          {
            label: "End-Use Certificates",
            href: "/trade/euc",
            icon: FileSignature,
            activePrefix: "/trade/euc",
          },
          {
            label: "Re-Export Consents",
            href: "/trade/reexport-consents",
            icon: FileSignature,
            activePrefix: "/trade/reexport-consents",
          },
          {
            label: "Self-Disclosures",
            href: "/trade/vsd",
            icon: AlertOctagon,
            activePrefix: "/trade/vsd",
          },
          {
            label: "Sammelgenehmigungen",
            href: "/trade/sammelgenehmigungen",
            icon: Layers,
            activePrefix: "/trade/sammelgenehmigungen",
          },
        ],
      },
      {
        label: "Authorisations",
        items: [
          {
            label: "France LOS",
            href: "/trade/france-los",
            icon: Rocket,
            activePrefix: "/trade/france-los",
          },
          {
            label: "UK ECJU Licences",
            href: "/trade/uk-ecju",
            icon: FileCheck,
            activePrefix: "/trade/uk-ecju",
          },
          {
            label: "FAA AST Launch",
            href: "/trade/faa-ast",
            icon: Rocket,
            activePrefix: "/trade/faa-ast",
          },
        ],
      },
      {
        label: "Reports",
        items: [
          {
            label: "Deemed Exports",
            href: "/trade/deemed-exports",
            icon: UserCog,
            activePrefix: "/trade/deemed-exports",
          },
        ],
      },
    ],
  },
  astra: {
    title: "Astra",
    subsections: [
      {
        items: [
          {
            label: "Chat",
            href: "/trade/astra",
            icon: Sparkles,
            activePrefix: "/trade/astra",
          },
        ],
      },
    ],
  },
  settings: {
    title: "Settings",
    subsections: [
      {
        label: "Workspace",
        items: [
          {
            label: "Compliance Program",
            href: "/trade/program",
            icon: ShieldCheck,
            activePrefix: "/trade/program",
          },
          {
            label: "General",
            href: "/trade/settings",
            icon: SettingsIcon,
            activePrefix: "/trade/settings",
          },
        ],
      },
      {
        label: "Research",
        items: [
          {
            label: "Training Corpus",
            href: "/trade/research/training-corpus",
            icon: BookOpen,
            activePrefix: "/trade/research/training-corpus",
          },
        ],
      },
    ],
  },
};

function isItemActive(item: NavItem, pathname: string): boolean {
  if (item.activePrefix) return pathname.startsWith(item.activePrefix);
  return pathname === item.href;
}

// ──────────────────────────────────────────────────────────────
// Sidebar item — Apple "Mail row" style.
// ──────────────────────────────────────────────────────────────

interface SidebarItemProps {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}

function SidebarItem({ item, active, onNavigate }: SidebarItemProps) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`group flex h-8 items-center gap-2.5 rounded-[6px] px-2 text-[14px] transition-colors duration-100 ${
        active ? "" : "hover:bg-[color:var(--trade-fill-4)]"
      }`}
      style={{
        background: active ? "var(--trade-fill-3)" : "transparent",
        color: active ? "var(--trade-label)" : "var(--trade-label-secondary)",
        fontWeight: active ? 600 : 400,
      }}
    >
      <Icon
        size={16}
        strokeWidth={1.75}
        style={{
          color: active ? "var(--trade-label)" : "var(--trade-label-tertiary)",
        }}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {typeof item.count === "number" ? (
        <span
          className="text-[13px] tabular-nums"
          style={{ color: "var(--trade-label-tertiary)" }}
        >
          {item.count}
        </span>
      ) : null}
    </Link>
  );
}

// ──────────────────────────────────────────────────────────────
// Sidebar content (shared between desktop + mobile drawer)
// ──────────────────────────────────────────────────────────────

interface SidebarContentProps {
  pathname: string;
  onNavigate?: () => void;
  org: { id: string; name: string };
}

function SidebarContent({ pathname, onNavigate, org }: SidebarContentProps) {
  const activeRailId = findActiveRailId(pathname);
  const content = SIDEBAR_CONTENT[activeRailId] ?? SIDEBAR_CONTENT.today;
  const railSection =
    RAIL_SECTIONS.find((r) => r.id === activeRailId) ?? RAIL_SECTIONS[0];

  return (
    <div className="flex h-full flex-col">
      {/* Title — big, Apple "Opportunities" style.
          Workspace name floats above as a tiny breadcrumb. */}
      <header className="px-4 pt-5 pb-3">
        <p
          className="mb-1 text-[11px] font-medium uppercase tracking-[0.04em]"
          style={{ color: "var(--trade-label-quaternary)" }}
        >
          {org.name}
        </p>
        <h1
          className="text-[22px] leading-tight tracking-[-0.018em]"
          style={{ color: "var(--trade-label)", fontWeight: 600 }}
        >
          {content.title}
        </h1>
      </header>

      {/* Subsections */}
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {content.subsections.map((sub, idx) => (
          <section key={idx} className="mb-4">
            {sub.label ? (
              <p
                className="mb-1.5 px-2 pt-2 text-[12px] font-medium"
                style={{ color: "var(--trade-label-tertiary)" }}
              >
                {sub.label}
              </p>
            ) : null}
            <ul className="flex flex-col gap-px">
              {sub.items.map((item) => (
                <li key={item.href}>
                  <SidebarItem
                    item={item}
                    active={isItemActive(item, pathname)}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>

      {/* Footer hint — what rail section we're on */}
      <footer
        className="px-4 py-3 text-[11px]"
        style={{
          color: "var(--trade-label-quaternary)",
          borderTop: "1px solid var(--trade-separator)",
        }}
      >
        {railSection.label} workspace
      </footer>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Public component — desktop inline + mobile drawer
// ──────────────────────────────────────────────────────────────

interface Props {
  org: {
    id: string;
    name: string;
  };
}

export function TradeSidebar({ org }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Desktop: inline content fills the parent <aside> in TradeShell. */}
      <div
        className="hidden h-full md:flex md:flex-col"
        data-testid="trade-sidebar-desktop"
      >
        <SidebarContent pathname={pathname} org={org} />
      </div>

      {/* Mobile hamburger toggle (< 768px) */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        aria-expanded={mobileOpen}
        data-testid="trade-sidebar-mobile-toggle"
        className="fixed left-3 top-3 z-40 inline-flex h-9 w-9 items-center justify-center rounded-md md:hidden"
        style={{
          background: "var(--trade-surface)",
          border: "1px solid var(--trade-separator)",
          color: "var(--trade-label-secondary)",
        }}
      >
        <Menu size={18} aria-hidden="true" />
      </button>

      {/* Mobile drawer backdrop */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      {/* Mobile drawer panel */}
      <div
        data-testid="trade-sidebar-mobile-drawer"
        aria-hidden={!mobileOpen}
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-out md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: "var(--trade-surface-secondary)",
          borderRight: "1px solid var(--trade-separator)",
        }}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
          className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md"
          style={{ color: "var(--trade-label-secondary)" }}
        >
          <X size={18} aria-hidden="true" />
        </button>
        <SidebarContent
          pathname={pathname}
          onNavigate={() => setMobileOpen(false)}
          org={org}
        />
      </div>
    </>
  );
}

// Re-export NAV_GROUPS as empty for back-compat (any imports won't break)
export const NAV_GROUPS: never[] = [];
export const STORAGE_KEY = "caelex-trade-sidebar-rail-v1";
