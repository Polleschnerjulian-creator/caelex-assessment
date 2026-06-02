"use client";

/**
 * Caelex Trade — Black icon rail (Passage shell, column 1).
 *
 * The slim ~62px dark rail that carries the top-level sections as icon-only
 * <Link>s. This is CHROME — it stays dark in both light and dark themes
 * (like the mockup), so all colors here are hardcoded rather than tokenised.
 *
 * Visual contract mirrors `.mockups/passage-light.html` `.rail` / `.ri` /
 * `.mark` / `.av`:
 *   - black `#0b0c0f` → `#101216` top-down gradient, 0.5px right hairline
 *   - icons at rgba(255,255,255,.56); hover lifts to .92 on a .06 wash
 *   - active = white icon on rgba(255,255,255,.12) rounded-square + a 3px
 *     white left indicator
 *   - logo mark (passage glyph) up top, org-initials chip at the bottom
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RAIL, RAIL_FOOTER_KEYS, activeRailKey } from "./trade-nav";
import type { SidebarBadgeCounts } from "@/lib/trade/sidebar-badge-counts.server";

interface Props {
  org: {
    id: string;
    name: string;
  };
  /** Per-org attention counts — used to render an unread dot on rail icons
   *  whose section has pending work. Optional (legacy/test renders). */
  badgeCounts?: SidebarBadgeCounts;
}

/** Sum of every badge cohort — used to flag the rail icon with a dot. */
function railHasAttention(
  key: string,
  counts: SidebarBadgeCounts | undefined,
): boolean {
  if (!counts) return false;
  switch (key) {
    case "operations":
      return counts.operationsBlocked > 0;
    case "screening":
    case "masterdata":
      return counts.partiesNeedingReview > 0;
    case "documents":
      return counts.eucAwaitingAction > 0 || counts.vsdOpen > 0;
    default:
      return false;
  }
}

/** Two-letter initials from an org name (e.g. "Acme Space" → "AS"). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "··";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function TradeRail({ org, badgeCounts }: Props) {
  const pathname = usePathname();
  const activeKey = activeRailKey(pathname);

  const primary = RAIL.filter((i) => !RAIL_FOOTER_KEYS.has(i.key));
  const footer = RAIL.filter((i) => RAIL_FOOTER_KEYS.has(i.key));

  return (
    <nav
      aria-label="Passage navigation"
      className="flex h-full w-full flex-col items-center"
      style={{
        background: "linear-gradient(180deg, #101216, #0b0c0f)",
        borderRight: "0.5px solid rgba(255, 255, 255, 0.06)",
        padding: "14px 0",
        gap: "6px",
      }}
    >
      {/* Brand mark — passage glyph, links Home */}
      <Link
        href="/trade"
        aria-label={`${org.name} — Passage`}
        title="Passage"
        className="grid place-items-center transition-opacity hover:opacity-90"
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          marginBottom: 10,
          background: "linear-gradient(160deg, #26282f, #141519)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,.10), 0 2px 6px rgba(0,0,0,.4)",
        }}
      >
        <PassageMark />
      </Link>

      {/* Primary section icons */}
      {primary.map((item) => (
        <RailIcon
          key={item.key}
          item={item}
          active={activeKey === item.key}
          attention={railHasAttention(item.key, badgeCounts)}
          pathname={pathname}
        />
      ))}

      {/* Spacer pushes the footer group + avatar to the bottom */}
      <div style={{ flex: 1 }} />

      {/* Footer section icons (settings, program) */}
      {footer.map((item) => (
        <RailIcon
          key={item.key}
          item={item}
          active={activeKey === item.key}
          attention={railHasAttention(item.key, badgeCounts)}
          pathname={pathname}
        />
      ))}

      {/* Org avatar chip */}
      <Link
        href="/trade/settings"
        title={org.name}
        aria-label={`${org.name} — Einstellungen`}
        className="grid place-items-center transition-opacity hover:opacity-90"
        style={{
          width: 34,
          height: 34,
          borderRadius: 11,
          marginTop: 4,
          // Neutral graphite (was indigo) — keep the rail strictly monochrome.
          background: "linear-gradient(150deg, #3c3f46, #222329)",
          color: "#fff",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.01em",
        }}
      >
        {initials(org.name)}
      </Link>
    </nav>
  );
}

interface RailIconProps {
  item: (typeof RAIL)[number];
  active: boolean;
  attention: boolean;
  pathname: string;
}

function RailIcon({ item, active, attention }: RailIconProps) {
  const Icon = item.icon;
  const [hover, setHover] = React.useState(false);

  // Color/background resolve to match the mockup's `.ri` / `.ri:hover` /
  // `.ri.on`. Inline styles (not Tailwind) so the hardcoded chrome colors
  // never get rewritten by the light/dark token system.
  const color = active
    ? "#ffffff"
    : hover
      ? "rgba(255,255,255,.92)"
      : "rgba(255,255,255,.56)";
  const background = active
    ? "rgba(255,255,255,.12)"
    : hover
      ? "rgba(255,255,255,.06)"
      : "transparent";

  return (
    <Link
      href={item.href}
      prefetch={true}
      title={item.label}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className="relative grid place-items-center"
      style={{
        width: 40,
        height: 40,
        borderRadius: 11,
        color,
        background,
        transition: "background .16s ease, color .16s ease",
      }}
    >
      {/* Active left indicator — 3px white bar, matches `.ri.on::before` */}
      {active ? (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: -11,
            top: "50%",
            transform: "translateY(-50%)",
            width: 3,
            height: 18,
            borderRadius: 3,
            background: "#fff",
          }}
        />
      ) : null}

      <Icon size={20} strokeWidth={1.6} aria-hidden="true" />

      {/* Unread dot — top-right, when this section has pending attention */}
      {attention && !active ? (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 7,
            right: 7,
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#ff9500",
            boxShadow: "0 0 0 2px #0b0c0f",
          }}
        />
      ) : null}
    </Link>
  );
}

/** The Passage wordmark glyph (two strokes + a baseline), white on the
 *  dark mark tile — lifted verbatim from the approved mockup. */
function PassageMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 19 L13 5 M11 19 L19 5"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M4 12 H20"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity=".55"
      />
    </svg>
  );
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
