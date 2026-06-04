"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 Sidebar redesign — atomic flat-row item.
 *
 * Renders a single sidebar row: optional icon + label + optional right-side
 * action button. Apple-style selection — an inset rounded pill. Hover =
 * bg-elevated; Active = bg-subtle fill + medium-weight label + full-strength
 * icon. No colored accent bar (the amber left-edge dot was retired 2026-06-04 —
 * emphasis is carried by the fill + type weight, not by hue).
 *
 * Supports both NextLink (page navigation) and onClick (action button) variants.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import type { ReactNode, MouseEvent } from "react";

interface BaseProps {
  icon?: ReactNode;
  label: string;
  active?: boolean;
  /** Optional right-side hover-only action (e.g. ⋯ menu, ×). */
  rightAction?: ReactNode;
  /** Sprint 6a (2026-05-18) — if true, rightAction is ALWAYS visible
   *  instead of only on hover. Used for status-dots on mandate items
   *  where the lawyer wants to see workload state at a glance. */
  alwaysVisibleRightAction?: boolean;
  /** Truncate the label at the available width. Default true. */
  truncate?: boolean;
}

type SidebarItemProps =
  | (BaseProps & { href: string; onClick?: never })
  | (BaseProps & { href?: never; onClick: (e: MouseEvent) => void });

const baseClasses =
  "group relative flex items-center gap-2.5 mx-1.5 rounded-lg px-1.5 py-1.5 text-[13px] text-atlas-text-primary transition-colors duration-150";

const idleClasses = "hover:bg-atlas-bg-elevated";
const activeClasses = "bg-atlas-bg-subtle font-medium";

export function SidebarItem(props: SidebarItemProps) {
  const className = `${baseClasses} ${props.active ? activeClasses : idleClasses}`;

  const content = (
    <>
      {props.icon && (
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center transition-colors group-hover:text-atlas-text-primary ${
            props.active
              ? "text-atlas-text-primary"
              : "text-atlas-text-secondary"
          }`}
        >
          {props.icon}
        </span>
      )}
      <span className={props.truncate === false ? "flex-1" : "flex-1 truncate"}>
        {props.label}
      </span>
      {props.rightAction && (
        <span
          className={
            props.alwaysVisibleRightAction
              ? "flex shrink-0 items-center"
              : "opacity-0 transition-opacity group-hover:opacity-100"
          }
        >
          {props.rightAction}
        </span>
      )}
    </>
  );

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`${className} text-left`}
    >
      {content}
    </button>
  );
}
