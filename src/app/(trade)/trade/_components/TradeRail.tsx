"use client";

/**
 * Caelex Trade — Dark icon rail (leftmost column).
 *
 * Pattern: matches the reference UI (compact dark rail + light context
 * sidebar + main content). Mirrors Linear's app shell, Apple Mail's
 * "Mailboxes" toolbar, and the Notion sidebar's icon rail.
 *
 * Layout:
 *   - Fixed 56px width
 *   - Solid dark background (#0A0A0A)
 *   - Brand pyramid logo at top
 *   - Stacked icon buttons, vertically spaced
 *   - Active section: 36×36 rounded-rect with rgba(255,255,255,0.08) fill
 *   - Inactive: muted white (50% opacity)
 *   - Hover: brightens to 85% opacity
 *
 * The active section is derived from the current pathname — each rail
 * entry owns one or more route prefixes.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Package,
  Workflow,
  FileText,
  Sparkles,
  Settings as SettingsIcon,
  type LucideIcon,
} from "lucide-react";

export interface RailSection {
  id: string;
  label: string;
  icon: LucideIcon;
  /** The route that the rail-icon links to (its primary page). */
  href: string;
  /** Pathname prefixes that mark this rail as active. */
  prefixes: ReadonlyArray<string>;
}

export const RAIL_SECTIONS: ReadonlyArray<RailSection> = [
  {
    id: "today",
    label: "Today",
    icon: Home,
    href: "/trade",
    prefixes: ["/trade/astra"],
  },
  {
    id: "data",
    label: "Data",
    icon: Package,
    href: "/trade/items",
    prefixes: ["/trade/items", "/trade/parties", "/trade/counterparties"],
  },
  {
    id: "operations",
    label: "Operations",
    icon: Workflow,
    href: "/trade/operations",
    prefixes: ["/trade/operations", "/trade/licenses", "/trade/classify"],
  },
  {
    id: "documents",
    label: "Documents",
    icon: FileText,
    href: "/trade/euc",
    prefixes: [
      "/trade/euc",
      "/trade/reexport-consents",
      "/trade/vsd",
      "/trade/sammelgenehmigungen",
      "/trade/france-los",
      "/trade/uk-ecju",
      "/trade/faa-ast",
      "/trade/deemed-exports",
    ],
  },
  {
    id: "astra",
    label: "Astra",
    icon: Sparkles,
    href: "/trade/astra",
    prefixes: ["/trade/astra"],
  },
  {
    id: "settings",
    label: "Settings",
    icon: SettingsIcon,
    href: "/trade/settings",
    prefixes: [
      "/trade/settings",
      "/trade/program",
      "/trade/research",
      "/trade/audit-center",
    ],
  },
];

/** Resolve the active rail section from the current pathname.
 *  Falls back to "today" if no prefix matches. */
export function findActiveRailId(pathname: string): string {
  // Exact match for /trade → today
  if (pathname === "/trade") return "today";

  // Prefix scan — longest match wins (avoids "today" matching everything)
  let best: { id: string; len: number } = { id: "today", len: 0 };
  for (const section of RAIL_SECTIONS) {
    for (const prefix of section.prefixes) {
      if (pathname.startsWith(prefix) && prefix.length > best.len) {
        best = { id: section.id, len: prefix.length };
      }
    }
  }
  return best.id;
}

export function TradeRail() {
  const pathname = usePathname();
  const activeId = findActiveRailId(pathname);

  return (
    <nav
      className="flex h-full w-[56px] shrink-0 flex-col items-center gap-1 py-3"
      style={{ background: "#0A0A0A" }}
      aria-label="Caelex Trade primary sections"
    >
      {/* Brand mark — Caelex pyramid logo (white) */}
      <Link
        href="/trade"
        className="mb-2 flex h-9 w-9 items-center justify-center"
        aria-label="Caelex Trade"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2 L22 20 L2 20 Z M12 8 L17 18 L7 18 Z"
            fill="#FFFFFF"
            fillRule="evenodd"
          />
        </svg>
      </Link>

      {/* Section icons */}
      {RAIL_SECTIONS.map((section) => {
        const Icon = section.icon;
        const active = section.id === activeId;
        return (
          <Link
            key={section.id}
            href={section.href}
            aria-label={section.label}
            aria-current={active ? "page" : undefined}
            title={section.label}
            className="group flex h-9 w-9 items-center justify-center rounded-[8px] transition-colors duration-100"
            style={{
              background: active ? "rgba(255, 255, 255, 0.10)" : "transparent",
            }}
          >
            <Icon
              size={18}
              strokeWidth={1.75}
              style={{
                color: active
                  ? "rgba(255, 255, 255, 0.98)"
                  : "rgba(255, 255, 255, 0.5)",
              }}
              className="transition-colors duration-100 group-hover:[color:rgba(255,255,255,0.85)]"
            />
          </Link>
        );
      })}
    </nav>
  );
}
