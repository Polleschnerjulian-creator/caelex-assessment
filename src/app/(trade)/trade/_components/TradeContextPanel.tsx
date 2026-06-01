"use client";

/**
 * Caelex Trade — White contextual panel (Passage shell, column 2).
 *
 * The ~250px panel that shows the active rail section's title + grouped
 * link rows. Unlike the rail (hardcoded dark chrome), this panel is THEMED:
 * it draws from the `--trade-*` tokens so it reads as a crisp white panel in
 * light mode and a near-black panel in dark mode.
 *
 * Visual contract mirrors `.mockups/passage-light.html` `.nav` / `.row` /
 * `.sec` / `.g`:
 *   - 16px semibold panel title, optional count badge top-right
 *   - 34px rows, 8px radius, leading icon/glyph slot + label + trailing
 *     tabular-num count
 *   - active row = soft selected fill + bumped weight
 *   - section labels: 10.5px uppercase, tracked, muted
 *   - status glyphs: soft-bg square + saturated icon (Apple system hues)
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  PANELS,
  activeRailKey,
  type PanelItem,
  type PanelGlyph,
} from "./trade-nav";
import type { SidebarBadgeCounts } from "@/lib/trade/sidebar-badge-counts.server";

interface Props {
  /** Per-org attention counts → trailing tabular-num counts on rows. */
  badgeCounts?: SidebarBadgeCounts;
}

/** Apple-system soft-bg / saturated-icon pairs for the status glyph chips.
 *  Mirrors the mockup's `.g.green` … `.g.indigo`. Hardcoded (not tokenised)
 *  because these are semantic status hues that should stay constant across
 *  light/dark — the soft backgrounds read fine on both panel surfaces. */
const GLYPH_STYLE: Record<PanelGlyph, { bg: string; fg: string }> = {
  slate: { bg: "#eef0f4", fg: "#8a90a0" },
  amber: { bg: "#fef3e2", fg: "#f5970a" },
  orange: { bg: "#feeee7", fg: "#fb6f3b" },
  green: { bg: "#e8f8ee", fg: "#2fb457" },
  red: { bg: "#fdecea", fg: "#f23b30" },
  indigo: { bg: "#eef0ff", fg: "#5b5bf0" },
};

/**
 * Active-row test — query-string-aware.
 *
 * Priority order:
 *   1. Explicit `item.match` function (bypass everything).
 *   2. Status-filter rows: href contains `?status=X` → active when pathname
 *      is `/trade/operations` AND `currentStatusParam === X`.
 *   3. "Alle" / base rows at `/trade/operations` (no param) → active when on
 *      that path AND there is NO active status param.
 *   4. Fallback: exact href match or href-prefix match (ignores query).
 */
function isRowActive(
  item: PanelItem,
  pathname: string,
  currentStatusParam: string | null,
): boolean {
  if (item.match) return item.match(pathname);

  // Parse any ?status= value baked into the item's href.
  let itemStatusParam: string | null = null;
  try {
    itemStatusParam = new URL(item.href, "http://x").searchParams.get("status");
  } catch {
    // malformed href — fall through to legacy logic
  }

  // The plain pathname (strip query) that the item targets.
  const itemPathname = item.href.split("?")[0];

  if (itemStatusParam !== null) {
    // Status-filter row: match path + exact param value.
    return pathname === itemPathname && currentStatusParam === itemStatusParam;
  }

  if (
    itemPathname === "/trade/operations" &&
    pathname === "/trade/operations"
  ) {
    // "Alle" row (no status param in href): active only when no param is set.
    return currentStatusParam === null;
  }

  // Default: exact match or prefix match on the plain pathname.
  if (pathname === itemPathname) return true;
  return pathname.startsWith(itemPathname + "/");
}

export function TradeContextPanel({ badgeCounts }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentStatusParam = searchParams.get("status");
  const section = PANELS[activeRailKey(pathname)] ?? PANELS.home;

  return (
    <nav
      aria-label={section.title}
      className="flex h-full w-full flex-col"
      style={{
        background: "var(--trade-bg-panel)",
        borderRight: "0.5px solid var(--trade-border)",
        padding: "16px 12px 12px",
      }}
    >
      {/* Panel title */}
      <h1
        className="flex items-center gap-2"
        style={{
          fontSize: 16,
          fontWeight: 650,
          letterSpacing: "-0.012em",
          color: "var(--trade-text-primary)",
          padding: "4px 8px 12px",
        }}
      >
        {section.title}
      </h1>

      {/* Scrollable groups */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {section.groups.map((group, gi) => (
          <div key={group.label ?? `g${gi}`}>
            {group.label ? (
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 680,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  color: "var(--trade-text-muted)",
                  padding: "16px 9px 5px",
                }}
              >
                {group.label}
              </div>
            ) : null}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <li key={item.href + item.label}>
                  <PanelRow
                    item={item}
                    active={isRowActive(item, pathname, currentStatusParam)}
                    badgeCounts={badgeCounts}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}

interface PanelRowProps {
  item: PanelItem;
  active: boolean;
  badgeCounts?: SidebarBadgeCounts;
}

function PanelRow({ item, active, badgeCounts }: PanelRowProps) {
  const [hover, setHover] = React.useState(false);
  const Icon = item.icon;

  const badgeRaw =
    item.badgeKey && badgeCounts ? badgeCounts[item.badgeKey] : 0;
  const showBadge = badgeRaw > 0;
  const badgeText = badgeRaw > 99 ? "99+" : String(badgeRaw);

  // Row background: active → soft selected fill; hover → faint wash. Both
  // pull from tokens so the panel adapts in dark mode.
  const background = active
    ? "var(--trade-bg-subtle)"
    : hover
      ? "var(--trade-hover)"
      : "transparent";
  const color = active
    ? "var(--trade-text-primary)"
    : "var(--trade-text-secondary)";

  return (
    <Link
      href={item.href}
      prefetch={true}
      title={item.label}
      aria-current={active ? "page" : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className="flex items-center"
      style={{
        height: 34,
        borderRadius: 8,
        padding: "0 9px",
        gap: 10,
        color,
        fontSize: 13.5,
        fontWeight: active ? 560 : 480,
        letterSpacing: "-0.006em",
        background,
        transition: "background .14s ease, color .14s ease",
      }}
    >
      {/* Leading slot — icon OR status glyph chip */}
      <span
        className="grid place-items-center"
        style={{ width: 18, height: 18, flex: "0 0 18px" }}
      >
        {item.glyph ? (
          <PanelGlyphChip variant={item.glyph} />
        ) : Icon ? (
          <Icon
            size={16}
            strokeWidth={1.7}
            aria-hidden="true"
            style={{ color: "currentColor" }}
          />
        ) : null}
      </span>

      <span
        className="flex-1 truncate"
        style={{ overflow: "hidden", textOverflow: "ellipsis" }}
      >
        {item.label}
      </span>

      {showBadge ? (
        <span
          style={{
            fontSize: 12.5,
            color: "var(--trade-text-muted)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {badgeText}
        </span>
      ) : null}
    </Link>
  );
}

/** Soft-bg + saturated-icon square (mockup `.g.*`). The icon glyph is
 *  chosen per status family so the chip reads at a glance. */
function PanelGlyphChip({ variant }: { variant: PanelGlyph }) {
  const { bg, fg } = GLYPH_STYLE[variant];
  return (
    <span
      aria-hidden="true"
      className="grid place-items-center"
      style={{
        width: 18,
        height: 18,
        borderRadius: 6,
        background: bg,
        color: fg,
      }}
    >
      <GlyphIcon variant={variant} />
    </span>
  );
}

/** 12px status icons matching the mockup's per-status SVGs. */
function GlyphIcon({ variant }: { variant: PanelGlyph }) {
  const common = {
    width: 12,
    height: 12,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
  } as const;
  switch (variant) {
    case "slate":
      // filled dot
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "amber":
      // clock
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "orange":
      // lock
      return (
        <svg {...common}>
          <path d="M5 8h14v11H5z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        </svg>
      );
    case "green":
      // check
      return (
        <svg {...common}>
          <path
            d="m5 12.5 4.5 4.5L19 7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "red":
      // x-circle
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8 8l8 8M16 8l-8 8" strokeLinecap="round" />
        </svg>
      );
    case "indigo":
      // globe (regime)
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18" />
        </svg>
      );
  }
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
