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
 *   5. REPORTS & WORKFLOWS — Deemed Exports
 *   7. RESEARCH — Training Corpus (Z33 — BAFA AzG + DDTC CJ precedents)
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
  Rocket,
  Sparkles,
  ScanSearch,
  Settings,
  UserCog,
  Menu,
  X,
  BookOpen,
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
      {
        label: "France LOS",
        href: "/trade/france-los",
        icon: Rocket,
        activePrefix: "/trade/france-los",
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
      // Z37-UK — UK ECJU export licences (SIEL/OIEL/OGEL/SIEL-TC/OITCL)
      {
        label: "UK ECJU Licences",
        href: "/trade/uk-ecju",
        icon: FileCheck,
        activePrefix: "/trade/uk-ecju",
      },
      // Z38-US — FAA AST commercial launch licences (14 CFR Part 450)
      {
        label: "FAA AST Launch",
        href: "/trade/faa-ast",
        icon: Rocket,
        activePrefix: "/trade/faa-ast",
      },
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
  {
    id: "research",
    label: "Research",
    defaultExpanded: false,
    items: [
      {
        label: "Training Corpus",
        href: "/trade/research/training-corpus",
        icon: BookOpen,
        activePrefix: "/trade/research/training-corpus",
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

  // Apple macOS sidebar row recipe:
  //   - 28px tall (py-1.5 + 13px line-height)
  //   - 8px horizontal padding inside the row
  //   - active: solid tinted fill (accent at 14% opacity) + accent label/icon
  //   - hover (inactive): subtle --trade-fill-4 background
  //   - disabled: tertiary label, no hover
  const rowStyle: React.CSSProperties = active
    ? {
        background: "color-mix(in srgb, var(--trade-accent) 14%, transparent)",
        color: "var(--trade-accent-strong)",
      }
    : item.comingIn
      ? { color: "var(--trade-label-tertiary)" }
      : { color: "var(--trade-label-secondary)" };

  const iconStyle: React.CSSProperties = active
    ? { color: "var(--trade-accent-strong)" }
    : { color: "var(--trade-label-tertiary)" };

  const content = (
    <>
      <Icon size={16} strokeWidth={1.75} style={iconStyle} />
      <span className="flex-1 truncate">{item.label}</span>
      {item.comingIn ? (
        <span
          className="rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{
            background: "var(--trade-fill-4)",
            color: "var(--trade-label-tertiary)",
          }}
        >
          {item.comingIn}
        </span>
      ) : null}
    </>
  );

  const baseClasses =
    "group flex items-center gap-2.5 rounded-[6px] px-2 py-1.5 text-[13px] font-medium transition-colors duration-100";

  if (item.comingIn) {
    return (
      <div
        className={`${baseClasses} cursor-not-allowed`}
        style={rowStyle}
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
      className={`${baseClasses} ${active ? "" : "hover:bg-[color:var(--trade-fill-4)] hover:text-[color:var(--trade-label)]"}`}
      style={rowStyle}
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
      {/* Header — Apple sidebar workspace switcher style.
          Tight padding, small logo, org name in muted weight. */}
      <header
        className="flex items-center gap-2 px-3 py-3"
        style={{ borderBottom: "1px solid var(--trade-separator)" }}
      >
        <Image
          src="/logos/trade-studio-light.svg"
          alt="Caelex Trade"
          width={120}
          height={28}
          className="h-7 w-auto dark:hidden"
          priority
        />
        <Image
          src="/logos/trade-studio-dark.svg"
          alt="Caelex Trade"
          width={120}
          height={28}
          className="hidden h-7 w-auto dark:block"
          priority
        />
      </header>

      {/* Org row — Apple "current workspace" affordance.
          Small avatar circle (initial) + org name + chevron hint. */}
      <div
        className="flex items-center gap-2 px-3 py-2.5"
        style={{ borderBottom: "1px solid var(--trade-separator)" }}
      >
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold"
          style={{
            background:
              "color-mix(in srgb, var(--trade-accent) 16%, transparent)",
            color: "var(--trade-accent-strong)",
          }}
        >
          {org.name.charAt(0).toUpperCase()}
        </div>
        <span
          className="flex-1 truncate text-[13px] font-medium"
          style={{ color: "var(--trade-label)" }}
        >
          {org.name}
        </span>
      </div>

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
