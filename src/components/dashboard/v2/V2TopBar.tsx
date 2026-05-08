"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { breadcrumbsFromPath } from "./breadcrumbs";
import { HelpDrawerTrigger } from "./HelpDrawer";
import { NotificationCenterV2 } from "./NotificationCenterV2";
import { TopbarOrgIndicator } from "./TopbarOrgIndicator";

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
      className="apple-chrome-surface sticky top-0 z-30 flex h-12 items-center gap-3 border-b px-4"
      style={{
        fontFamily: '-apple-system, "SF Pro Text", system-ui, sans-serif',
      }}
    >
      {/* Left — breadcrumbs (Apple-style: hairline chevrons, current
          page in white, trail in white/60) */}
      <nav
        aria-label="Breadcrumb"
        data-testid="v2-topbar-breadcrumbs"
        className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px] leading-none"
        style={{ letterSpacing: "-0.011em" }}
      >
        {crumbs.map((c, i) => (
          <React.Fragment key={c.href}>
            {i > 0 ? (
              <ChevronRight
                aria-hidden="true"
                className="h-3 w-3 shrink-0 text-white/25"
                strokeWidth={1.6}
              />
            ) : null}
            {c.isCurrent ? (
              <span
                aria-current="page"
                className="truncate font-medium text-white"
              >
                {c.label}
              </span>
            ) : (
              <Link
                href={c.href}
                className="truncate text-white/55 transition-colors hover:text-white"
              >
                {c.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Sprint UF12 — Active organization indicator. Hidden when
          the user has 0 or 1 orgs (no switcher needed). Otherwise
          shows a compact pill with the active org name + dropdown.
          Critical for consultants juggling multiple client orgs. */}
      <TopbarOrgIndicator />

      {/* Center — Apple-style search pill: rounded-full, no border,
          translucent, with subtle keyboard-shortcut chips */}
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
        className="apple-search-pill hidden h-8 w-[320px] shrink-0 items-center justify-between gap-3 rounded-full px-4 text-[13px] md:inline-flex"
        style={{ letterSpacing: "-0.011em" }}
      >
        <span className="truncate">Search Caelex</span>
        <span className="flex items-center gap-0.5">
          <span className="apple-kbd">⌘</span>
          <span className="apple-kbd">K</span>
        </span>
      </button>

      {/* Right — help · notification bell · bare avatar circle (no
          bordered pill, no name overlay; user identity is already in
          sidebar). Help button uses the (?) icon + global "?" keypress
          shortcut, like Linear / GitHub. */}
      <div className="flex shrink-0 items-center gap-1">
        <HelpDrawerTrigger />
        <NotificationCenterV2 />

        {userEmail || userName ? (
          <button
            type="button"
            aria-label={`Account: ${userName ?? userEmail}`}
            data-testid="v2-topbar-avatar"
            className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white transition-transform hover:scale-105"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.08)",
              letterSpacing: 0,
            }}
          >
            {(userName ?? userEmail ?? "?").slice(0, 1).toUpperCase()}
          </button>
        ) : null}
      </div>
    </header>
  );
}
