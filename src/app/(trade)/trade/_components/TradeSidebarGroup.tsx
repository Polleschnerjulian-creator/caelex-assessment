"use client";

/**
 * TradeSidebarGroup — collapsible group wrapper for the Trade sidebar.
 *
 * Sprint Sidebar-Reorg: 15+ flat links were getting crowded. We now
 * bucket them into 6 named groups; this component renders one group
 * with a clickable label that toggles its children open/closed.
 *
 * Behaviour:
 *   - Open/closed state is local; the parent <TradeSidebar/> owns
 *     persistence via localStorage and active-route auto-expansion.
 *   - Children are indented 16px (left padding) to make hierarchy
 *     scannable.
 *   - The chevron rotates 90 degrees via pure CSS transition. No
 *     extra animation library required (Framer Motion would be
 *     overkill for a simple rotate).
 *   - Group label uses the project's `text-trade-text-muted` token
 *     and an 11px uppercase tracking-[0.15em] treatment per spec.
 *
 * Accessibility:
 *   - The toggle is a native <button> with aria-expanded so screen
 *     readers announce "expanded" / "collapsed".
 *   - The child list is wrapped in a region with aria-label = the
 *     group label so screen-reader rotor users can jump between
 *     groups.
 */

import * as React from "react";
import { ChevronRight } from "lucide-react";

export interface TradeSidebarGroupProps {
  /** Stable id used by the parent for localStorage persistence. */
  id: string;
  /** Uppercase label shown above the children. */
  label: string;
  /** Whether this group is currently expanded. Controlled by parent. */
  expanded: boolean;
  /** Toggle handler the parent wires to its expansion state map. */
  onToggle: (id: string) => void;
  /** The group's children (typically <SidebarItem/> list items). */
  children: React.ReactNode;
}

export function TradeSidebarGroup({
  id,
  label,
  expanded,
  onToggle,
  children,
}: TradeSidebarGroupProps) {
  const regionId = `trade-sidebar-group-${id}`;
  return (
    <section className="mb-2" aria-label={label}>
      <button
        type="button"
        onClick={() => onToggle(id)}
        aria-expanded={expanded}
        aria-controls={regionId}
        data-testid={`trade-sidebar-group-toggle-${id}`}
        className="group flex w-full items-center gap-1 rounded-[6px] px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] transition-colors"
        style={{ color: "var(--trade-label-tertiary)" }}
      >
        <ChevronRight
          size={10}
          aria-hidden="true"
          className="transition-transform duration-150 ease-out"
          style={{
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            color: "var(--trade-label-quaternary)",
          }}
        />
        <span className="flex-1 text-left">{label}</span>
      </button>
      <div
        id={regionId}
        role="region"
        aria-label={label}
        hidden={!expanded}
        className="pl-0"
      >
        {expanded ? (
          <ul className="mt-0.5 flex flex-col gap-px">{children}</ul>
        ) : null}
      </div>
    </section>
  );
}
