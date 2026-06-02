"use client";

/**
 * Caelex Trade — Single sidebar nav (Neon-console shell).
 *
 * One always-visible light sidebar with icon + label rows, grouped by area
 * (Start / Arbeit / Stammdaten / Compliance) plus a bottom-pinned footer
 * (Compliance-Programm, Einstellungen). Replaces the rail+panel master-
 * detail with Neon's flat pattern (PROJECT / BRANCH / APP BACKEND).
 *
 * Active row = light-gray fill + dark icon/label (mirrors the Neon active
 * item). Attention badges render a small count chip on the right.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SIDEBAR_GROUPS,
  SIDEBAR_FOOTER,
  type SidebarNavItem,
} from "./trade-nav";
import type { SidebarBadgeCounts } from "@/lib/trade/sidebar-badge-counts.server";

interface Props {
  badgeCounts?: SidebarBadgeCounts;
}

export function TradeSidebarNav({ badgeCounts }: Props) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Passage Navigation"
      className="flex h-full flex-col overflow-y-auto px-2.5 py-3"
      style={{
        background: "var(--trade-bg-panel)",
        borderRight: "1px solid var(--trade-border)",
      }}
    >
      {SIDEBAR_GROUPS.map((group) => (
        <div key={group.label} className="mb-1">
          <div className="mb-1 px-2 pt-3 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-trade-text-muted">
            {group.label}
          </div>
          {group.items.map((item) => (
            <NavRow
              key={item.href}
              item={item}
              active={item.match(pathname)}
              count={badgeCounts?.[item.badgeKey ?? "operationsBlocked"]}
              showCount={Boolean(item.badgeKey)}
            />
          ))}
        </div>
      ))}

      <div className="flex-1" />

      <div className="mt-2 border-t border-trade-border-subtle pt-2">
        {SIDEBAR_FOOTER.map((item) => (
          <NavRow
            key={item.href}
            item={item}
            active={item.match(pathname)}
            showCount={false}
          />
        ))}
      </div>
    </nav>
  );
}

function NavRow({
  item,
  active,
  count,
  showCount,
}: {
  item: SidebarNavItem;
  active: boolean;
  count?: number;
  showCount: boolean;
}) {
  const Icon = item.icon;
  const badge =
    showCount && typeof count === "number" && count > 0 ? count : null;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition ${
        active
          ? "bg-trade-bg-subtle font-medium text-trade-text-primary"
          : "text-trade-text-secondary hover:bg-trade-hover hover:text-trade-text-primary"
      }`}
    >
      <Icon
        className={`h-4 w-4 shrink-0 ${active ? "text-trade-text-primary" : "text-trade-text-muted group-hover:text-trade-text-primary"}`}
        strokeWidth={1.7}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {badge ? (
        <span className="shrink-0 rounded-full bg-trade-bg-subtle px-1.5 text-[10px] font-semibold tabular-nums text-trade-text-secondary ring-1 ring-trade-border-subtle">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
