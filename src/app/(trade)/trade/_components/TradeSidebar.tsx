"use client";

/**
 * Caelex Trade — Sidebar skeleton (Sprint T2).
 *
 * Three-zone layout:
 *   1. Header — Caelex Trade wordmark + active organisation name
 *   2. Nav    — 8 grouped sections; some items are clickable today,
 *               others are flagged "Coming in <sprint>" and render
 *               disabled with a tooltip-style hint
 *   3. Footer — Settings link + active-user pill (placeholder text;
 *               proper user fetching happens once a TradeUserProvider
 *               is added in a later sprint)
 *
 * The skeleton renders all eight sections but most leaf items are
 * disabled. Active items get the indigo accent highlight via
 * `data-active="true"` and Tailwind's `data-active:` variant tokens
 * driven by --trade-accent / --trade-accent-soft.
 */

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
  Sparkles,
  Settings,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** When set, item renders disabled with a "Coming in <X>" hint. */
  comingIn?: string;
  /** When set, treat any pathname starting with this prefix as active. */
  activePrefix?: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Workspace",
    items: [{ label: "Today", href: "/trade", icon: Inbox }],
  },
  {
    label: "Trade",
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
    ],
  },
  {
    label: "Compliance",
    items: [
      {
        label: "Program",
        href: "/trade/program",
        icon: ShieldCheck,
        activePrefix: "/trade/program",
      },
    ],
  },
  {
    label: "Assistant",
    items: [
      {
        label: "Astra Trade",
        href: "/trade/astra",
        icon: Sparkles,
        activePrefix: "/trade/astra",
      },
    ],
  },
];

function isItemActive(item: NavItem, pathname: string): boolean {
  if (item.comingIn) return false;
  if (item.activePrefix) return pathname.startsWith(item.activePrefix);
  return pathname === item.href;
}

interface SidebarItemProps {
  item: NavItem;
  active: boolean;
}

function SidebarItem({ item, active }: SidebarItemProps) {
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
    >
      {content}
    </Link>
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
        {NAV_SECTIONS.map((section) => (
          <section key={section.label} className="mb-4">
            <h2 className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-trade-text-muted">
              {section.label}
            </h2>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <li key={`${section.label}-${item.label}`}>
                  <SidebarItem
                    item={item}
                    active={isItemActive(item, pathname)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>

      {/* Footer */}
      <footer className="border-t border-trade-border-subtle px-3 py-2">
        <Link
          href="/trade"
          className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-trade-text-secondary transition hover:bg-trade-hover hover:text-trade-text-primary"
        >
          <Settings size={16} className="text-trade-text-muted" />
          <span>Settings</span>
        </Link>
      </footer>
    </div>
  );
}
