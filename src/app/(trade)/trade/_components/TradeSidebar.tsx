"use client";

/**
 * Caelex Trade — Sidebar with collapsible groups.
 *
 * Sprint Sidebar-Reorg: the flat 15+ link list was getting crowded
 * as new features shipped (operations pipeline, deemed exports, EUCs,
 * re-export consents, VSDs, Sammelgenehmigungen, supplement-2, audit
 * center, classify-AI, settings). We now bucket links into 6 named
 * groups, each collapsible.
 *
 * Group structure:
 *
 *   1. OVERVIEW            — Today (dashboard), Astra Trade (AI)
 *   2. MASTER DATA         — Items, Counterparties
 *   3. OPERATIONS          — Operations pipeline, Licenses, Classify (AI)
 *   4. LIFECYCLE DOCUMENTS — EUCs, Re-Export Consents, Self-Disclosures
 *                             (VSD), Sammelgenehmigungen
 *   5. REPORTS & WORKFLOWS — Deemed Exports (+ Z33 Training Corpus slot)
 *   6. CONFIGURATION       — Compliance Program, Settings
 *
 * Defaults: Overview / Master Data / Operations are expanded. The
 * remaining three are collapsed but auto-expand if the current route
 * lives inside one of them.
 *
 * Persistence: open/closed state per group is stored in localStorage
 * (key `caelex-trade-sidebar-groups-v1`). SSR-safe: the initial
 * render uses the static defaults, then a one-shot useEffect hydrates
 * from localStorage on mount to avoid hydration mismatches.
 *
 * Mobile: at < 768px the parent shell's permanent rail is hidden via
 * Tailwind's `hidden md:block` pattern (sibling concern). This
 * component additionally renders a fixed hamburger button + drawer
 * overlay that is only visible below the md breakpoint. The drawer
 * dismisses on backdrop tap or route change.
 */

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
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
  Sparkles,
  ScanSearch,
  Settings,
  UserCog,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { TradeSidebarGroup } from "./TradeSidebarGroup";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** When set, item renders disabled with a "Coming in <X>" hint. */
  comingIn?: string;
  /** When set, treat any pathname starting with this prefix as active. */
  activePrefix?: string;
}

interface NavGroup {
  id: string;
  label: string;
  /** Initial expanded state on first visit (pre-localStorage). */
  defaultExpanded: boolean;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    defaultExpanded: true,
    items: [
      { label: "Today", href: "/trade", icon: Inbox },
      {
        label: "Astra Trade",
        href: "/trade/astra",
        icon: Sparkles,
        activePrefix: "/trade/astra",
      },
    ],
  },
  {
    id: "master-data",
    label: "Master Data",
    defaultExpanded: true,
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
  {
    id: "operations",
    label: "Operations",
    defaultExpanded: true,
    items: [
      {
        label: "Operations",
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
  {
    id: "lifecycle-documents",
    label: "Lifecycle Documents",
    defaultExpanded: false,
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
    id: "reports-workflows",
    label: "Reports & Workflows",
    defaultExpanded: false,
    items: [
      {
        label: "Deemed Exports",
        href: "/trade/deemed-exports",
        icon: UserCog,
        activePrefix: "/trade/deemed-exports",
      },
      // Z33 — Training Corpus link goes here
    ],
  },
  {
    id: "configuration",
    label: "Configuration",
    defaultExpanded: false,
    items: [
      {
        label: "Compliance Program",
        href: "/trade/program",
        icon: ShieldCheck,
        activePrefix: "/trade/program",
      },
      {
        label: "Settings",
        href: "/trade/settings",
        icon: Settings,
        activePrefix: "/trade/settings",
      },
    ],
  },
];

export const STORAGE_KEY = "caelex-trade-sidebar-groups-v1";

export function isItemActive(item: NavItem, pathname: string): boolean {
  if (item.comingIn) return false;
  if (item.activePrefix) return pathname.startsWith(item.activePrefix);
  return pathname === item.href;
}

/** Find the group id that owns the currently-active route, if any. */
export function findActiveGroupId(pathname: string): string | null {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (isItemActive(item, pathname)) return group.id;
    }
  }
  return null;
}

/** Build the default-expanded map from the static config. */
function buildDefaultExpanded(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const g of NAV_GROUPS) out[g.id] = g.defaultExpanded;
  return out;
}

interface SidebarItemProps {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}

function SidebarItem({ item, active, onNavigate }: SidebarItemProps) {
  const Icon = item.icon;
  const baseClasses =
    "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition";
  const enabledClasses = active
    ? "bg-trade-accent-soft text-trade-accent-strong"
    : "text-trade-text-secondary hover:bg-trade-hover hover:text-trade-text-primary";
  const disabledClasses =
    "cursor-not-allowed text-trade-text-muted hover:bg-transparent";

  const content = (
    <>
      <Icon
        size={16}
        className={
          active
            ? "text-trade-accent-strong"
            : "text-trade-text-muted group-hover:text-trade-text-secondary"
        }
      />
      <span className="flex-1 truncate">{item.label}</span>
      {item.comingIn ? (
        <span className="rounded-sm bg-trade-bg-subtle px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-trade-text-muted">
          {item.comingIn}
        </span>
      ) : null}
    </>
  );

  if (item.comingIn) {
    return (
      <div
        className={`${baseClasses} ${disabledClasses}`}
        aria-disabled="true"
        title={`Coming in ${item.comingIn}`}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={`${baseClasses} ${enabledClasses}`}
      data-active={active}
      onClick={onNavigate}
    >
      {content}
    </Link>
  );
}

interface SidebarContentProps {
  pathname: string;
  expandedMap: Record<string, boolean>;
  onToggle: (id: string) => void;
  onNavigate?: () => void;
  org: { id: string; name: string };
}

function SidebarContent({
  pathname,
  expandedMap,
  onToggle,
  onNavigate,
  org,
}: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex flex-col gap-1 border-b border-trade-border-subtle px-3 py-3">
        <Image
          src="/logos/trade-studio-light.svg"
          alt="Caelex Trade"
          width={140}
          height={56}
          className="h-10 w-auto dark:hidden"
          priority
        />
        <Image
          src="/logos/trade-studio-dark.svg"
          alt="Caelex Trade"
          width={140}
          height={56}
          className="hidden h-10 w-auto dark:block"
          priority
        />
        <span className="truncate text-[11px] font-medium uppercase tracking-wider text-trade-text-muted">
          {org.name}
        </span>
      </header>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV_GROUPS.map((group) => (
          <TradeSidebarGroup
            key={group.id}
            id={group.id}
            label={group.label}
            expanded={expandedMap[group.id] ?? group.defaultExpanded}
            onToggle={onToggle}
          >
            {group.items.map((item) => (
              <li key={`${group.id}-${item.label}`}>
                <SidebarItem
                  item={item}
                  active={isItemActive(item, pathname)}
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </TradeSidebarGroup>
        ))}
      </nav>
    </div>
  );
}

interface Props {
  org: {
    id: string;
    name: string;
  };
}

export function TradeSidebar({ org }: Props) {
  const pathname = usePathname();
  const [expandedMap, setExpandedMap] =
    React.useState<Record<string, boolean>>(buildDefaultExpanded);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Hydrate from localStorage on mount. Done in an effect so SSR
  // markup matches first-client render (no hydration mismatch).
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      // Merge with defaults — new groups added later still get a
      // sensible initial state.
      setExpandedMap((prev) => ({ ...prev, ...parsed }));
    } catch {
      // Corrupt JSON or storage-blocked: fall back to defaults.
    }
  }, []);

  // Auto-expand the group containing the active route. Runs whenever
  // pathname changes (e.g. user clicks a closed group's child via
  // a deep link or back/forward navigation).
  React.useEffect(() => {
    const activeGroupId = findActiveGroupId(pathname);
    if (!activeGroupId) return;
    setExpandedMap((prev) => {
      if (prev[activeGroupId]) return prev;
      return { ...prev, [activeGroupId]: true };
    });
  }, [pathname]);

  // Close the mobile drawer on route changes.
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleToggle = React.useCallback((id: string) => {
    setExpandedMap((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Storage blocked (private mode, quota exceeded): silently
          // continue — in-memory state remains correct for this
          // session.
        }
      }
      return next;
    });
  }, []);

  return (
    <>
      {/* Desktop: inline content fills the parent <aside> in TradeShell.
          Hidden below md to let the mobile drawer drive UX. */}
      <div
        className="hidden h-full md:flex md:flex-col"
        data-testid="trade-sidebar-desktop"
      >
        <SidebarContent
          pathname={pathname}
          expandedMap={expandedMap}
          onToggle={handleToggle}
          org={org}
        />
      </div>

      {/* Mobile hamburger toggle (< 768px). Fixed-position overlay so
          it stays accessible regardless of where the shell renders
          this component. */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        aria-expanded={mobileOpen}
        data-testid="trade-sidebar-mobile-toggle"
        className="fixed left-3 top-3 z-40 inline-flex h-9 w-9 items-center justify-center rounded-md border border-trade-border-subtle bg-trade-bg-panel text-trade-text-secondary md:hidden"
      >
        <Menu size={18} aria-hidden="true" />
      </button>

      {/* Mobile drawer backdrop. */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      {/* Mobile drawer panel. Slides in from the left. */}
      <div
        data-testid="trade-sidebar-mobile-drawer"
        aria-hidden={!mobileOpen}
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-trade-border-subtle bg-trade-bg-panel transition-transform duration-200 ease-out md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
          className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md text-trade-text-secondary"
        >
          <X size={18} aria-hidden="true" />
        </button>
        <SidebarContent
          pathname={pathname}
          expandedMap={expandedMap}
          onToggle={handleToggle}
          onNavigate={() => setMobileOpen(false)}
          org={org}
        />
      </div>
    </>
  );
}
