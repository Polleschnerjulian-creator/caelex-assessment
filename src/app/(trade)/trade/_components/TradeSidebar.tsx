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
  BookOpen,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: (pathname: string) => boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const SECTIONS: ReadonlyArray<NavSection> = [
  {
    label: "Today",
    items: [
      { href: "/trade", label: "Overview", icon: Inbox },
      {
        href: "/trade/astra",
        label: "Astra Trade",
        icon: Sparkles,
        match: (p) => p.startsWith("/trade/astra"),
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
      },
      {
        href: "/trade/parties",
        label: "Counterparties",
        icon: Users,
        match: (p) => p.startsWith("/trade/parties"),
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
      },
      {
        href: "/trade/licenses",
        label: "Licenses",
        icon: FileCheck,
        match: (p) => p.startsWith("/trade/licenses"),
      },
      {
        href: "/trade/classify",
        label: "Classify (AI)",
        icon: ScanSearch,
        match: (p) => p.startsWith("/trade/classify"),
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
      },
      {
        href: "/trade/reexport-consents",
        label: "Re-Export Consents",
        icon: FileSignature,
        match: (p) => p.startsWith("/trade/reexport-consents"),
      },
      {
        href: "/trade/vsd",
        label: "Self-Disclosures",
        icon: AlertOctagon,
        match: (p) => p.startsWith("/trade/vsd"),
      },
      {
        href: "/trade/sammelgenehmigungen",
        label: "Sammelgenehmigungen",
        icon: Layers,
        match: (p) => p.startsWith("/trade/sammelgenehmigungen"),
      },
      {
        href: "/trade/france-los",
        label: "France LOS",
        icon: Rocket,
        match: (p) => p.startsWith("/trade/france-los"),
      },
      {
        href: "/trade/uk-ecju",
        label: "UK ECJU",
        icon: FileCheck,
        match: (p) => p.startsWith("/trade/uk-ecju"),
      },
      {
        href: "/trade/faa-ast",
        label: "FAA AST",
        icon: Rocket,
        match: (p) => p.startsWith("/trade/faa-ast"),
      },
      {
        href: "/trade/deemed-exports",
        label: "Deemed Exports",
        icon: UserCog,
        match: (p) => p.startsWith("/trade/deemed-exports"),
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
  },
  {
    href: "/trade/research/training-corpus",
    label: "Training Corpus",
    icon: BookOpen,
    match: (p) => p.startsWith("/trade/research"),
  },
  {
    href: "/trade/settings",
    label: "Settings",
    icon: Settings,
    match: (p) => p.startsWith("/trade/settings"),
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
}

export function TradeSidebar({ org: _org }: Props) {
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
      {/* Brand — Caelex Trade Studio logo */}
      <div className="flex h-[72px] items-center px-4">
        <Link
          href="/trade"
          className="block"
          aria-label="Caelex Trade — Overview"
        >
          <Image
            src="/logos/trade-studio-dark.svg"
            alt="Caelex Trade"
            width={290}
            height={130}
            priority
            unoptimized
            style={{ width: "auto", height: 40 }}
          />
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
          />
        ))}
      </div>
    </nav>
  );
}

interface SidebarSectionProps {
  label: string;
  items: ReadonlyArray<NavItem>;
  pathname: string;
  className?: string;
}

function SidebarSection({
  label,
  items,
  pathname,
  className = "",
}: SidebarSectionProps) {
  return (
    <section className={className}>
      <h3
        className="mb-1 px-2.5 text-[10.5px] font-semibold uppercase"
        style={{
          color: "rgba(255, 255, 255, 0.35)",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </h3>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => (
          <li key={item.href}>
            <SidebarRow item={item} active={isItemActive(item, pathname)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

interface SidebarRowProps {
  item: NavItem;
  active: boolean;
}

function SidebarRow({ item, active }: SidebarRowProps) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      prefetch={true}
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
        style={{
          color: active
            ? "rgba(255, 255, 255, 0.96)"
            : "rgba(255, 255, 255, 0.55)",
        }}
      />
      <span className="flex-1 truncate">{item.label}</span>
    </Link>
  );
}
