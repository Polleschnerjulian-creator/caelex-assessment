"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronRight } from "lucide-react";

import { breadcrumbsFromPath } from "./breadcrumbs";
import { Kbd } from "@/components/ui/v2/kbd";
import { cn } from "@/lib/utils";

/**
 * V2TopBar — Sprint 12B (Caelex Liquid Glass top chrome)
 *
 * 48px tall, edge-to-edge, sticky to the viewport top, rendered as
 * Glass-Regular per the Sprint 12 brief:
 *
 *   ┌─ breadcrumbs ────────────┬─ ⌘K Search Caelex…  ┬─ ◉  bell  avatar ─┐
 *   │ Dashboard › Posture      │ (320px pill)         │ status dot · pill │
 *   └──────────────────────────┴──────────────────────┴───────────────────┘
 *
 * # Why this exists separately from V2Sidebar
 *
 * Pre-Sprint 12B the cmd-K trigger lived in the sidebar — a compromise
 * because there was no top bar. The brief is explicit: "Center: command
 * palette trigger — pill button '⌘K Search Caelex…' 320px wide. Single
 * most important affordance; surface it like Linear does." The top bar
 * is the right home for it.
 *
 * # Why dispatched-keydown for ⌘K
 *
 * The CommandPalette component listens for the canonical ⌘K event on
 * `window`. By dispatching the same event when the pill is clicked we
 * reuse the open path — no new prop wiring, no state hoisting.
 *
 * # Why client component
 *
 * `usePathname()` is a client hook. The breadcrumb derivation is a
 * pure function, so the actual computation is server-safe — but the
 * pathname source is not. Could split into a server-rendered shell +
 * client breadcrumb island, but the gain is marginal for a 48px-tall
 * always-rendered surface.
 *
 * # Notification + avatar slots
 *
 * Sprint 12B ships visual placeholders only:
 *   - Bell with no count (real notifications wire in Sprint 12F+)
 *   - Avatar pill rendered from props — already passed by V2Shell
 *
 * The Sentinel run-status dot from the brief is *not* in this commit
 * (it needs a Sentinel-status fetcher; Sprint 12G ships that with the
 * full SpaceX-launch-style telemetry strip).
 */
export interface V2TopBarProps {
  userName?: string | null;
  userEmail?: string | null;
}

export function V2TopBar({ userName, userEmail }: V2TopBarProps) {
  const pathname = usePathname();
  const crumbs = React.useMemo(() => breadcrumbsFromPath(pathname), [pathname]);

  return (
    <header
      data-testid="v2-topbar"
      className="caelex-glass-regular sticky top-0 z-30 flex h-12 items-center gap-3 px-4"
      style={{
        borderRadius: 0,
        borderTop: "none",
        borderLeft: "none",
        borderRight: "none",
      }}
    >
      {/* Left — breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
        data-testid="v2-topbar-breadcrumbs"
        className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px] leading-none"
      >
        {crumbs.map((c, i) => (
          <React.Fragment key={c.href}>
            {i > 0 ? (
              <ChevronRight
                aria-hidden="true"
                className="h-3 w-3 shrink-0"
                style={{ color: "var(--caelex-text-tertiary)" }}
              />
            ) : null}
            {c.isCurrent ? (
              <span
                aria-current="page"
                className="caelex-text-primary truncate font-body font-medium"
              >
                {c.label}
              </span>
            ) : (
              <Link
                href={c.href}
                className={cn(
                  "caelex-text-secondary caelex-focusable truncate rounded font-body font-normal transition-colors duration-tp-quick ease-tp-apple",
                )}
              >
                {c.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Center — ⌘K pill (the single most important affordance) */}
      <button
        type="button"
        data-testid="v2-topbar-cmdk"
        aria-label="Open command palette"
        onClick={() => {
          const event = new KeyboardEvent("keydown", {
            key: "k",
            metaKey: true,
            bubbles: true,
          });
          window.dispatchEvent(event);
        }}
        className="caelex-focusable hidden h-8 w-[320px] shrink-0 items-center justify-between gap-3 rounded-lg px-3 font-body text-[13px] transition-colors duration-tp-quick ease-tp-apple md:inline-flex"
        style={{
          background: "var(--caelex-content-sunken)",
          border: "1px solid var(--caelex-content-border)",
          color: "var(--caelex-text-tertiary)",
        }}
      >
        <span className="truncate">Search Caelex…</span>
        <span className="flex items-center gap-0.5">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      {/* Right — notification bell + avatar pill */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label="Notifications"
          data-testid="v2-topbar-bell"
          className="caelex-focusable caelex-text-secondary hover:caelex-text-primary inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-tp-quick ease-tp-apple"
          style={{ background: "transparent" }}
        >
          <Bell className="h-3.5 w-3.5" />
        </button>

        {userEmail || userName ? (
          <div
            data-testid="v2-topbar-avatar"
            className="caelex-focusable flex h-8 items-center gap-2 rounded-lg pl-1 pr-2.5"
            style={{
              background: "var(--caelex-content-sunken)",
              border: "1px solid var(--caelex-content-border)",
            }}
          >
            <div
              className="caelex-text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-medium"
              style={{
                background: "var(--caelex-content)",
                boxShadow: "0 0 0 1px var(--caelex-content-border)",
              }}
            >
              {(userName ?? userEmail ?? "?").slice(0, 1).toUpperCase()}
            </div>
            <span className="caelex-text-primary hidden max-w-[140px] truncate font-body text-[12px] font-medium md:inline">
              {userName ?? userEmail}
            </span>
          </div>
        ) : null}
      </div>
    </header>
  );
}
