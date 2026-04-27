"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Search,
  BarChart3,
  Map,
  Globe2,
  Landmark,
  ScrollText,
  Ticket,
  Newspaper,
  Settings,
  Bookmark,
  Bell,
  Menu,
  X,
  Briefcase,
  Library,
  Gavel,
  PenSquare,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import AtlasAstraChat from "@/components/atlas/AtlasAstraChat";
import { AIModeLauncher } from "@/components/atlas/AIModeLauncher";
import { CommandPalette } from "./_components/CommandPalette";
import { useAtlasTheme } from "./_components/AtlasThemeProvider";
import { useAtlasUnreadCount } from "@/hooks/useAtlasUnreadCount";

const MAIN_NAV = [
  {
    labelKey: "atlas.search",
    href: "/atlas",
    icon: Search,
    exact: true,
  },
  { labelKey: "atlas.comparator", href: "/atlas/comparator", icon: BarChart3 },
  { labelKey: "atlas.jurisdictions", href: "/atlas/jurisdictions", icon: Map },
  {
    labelKey: "atlas.international",
    href: "/atlas/international",
    icon: Globe2,
  },
  { labelKey: "atlas.treaties", href: "/atlas/treaties", icon: ScrollText },
  // Sources index — primary discovery surface for the 937-source
  // corpus. Without this entry the catalogue was browsable only via
  // free-text search, which hid the depth of the dataset.
  { labelKey: "atlas.sources", href: "/atlas/sources", icon: Library },
  // Cases index — surfaces the 28-case caselaw database that was
  // previously only reachable via source-detail backlinks or Astra
  // citation pills. Distinct icon (Gavel) to read as adjudication-
  // outcomes vs the statutory text under "sources".
  { labelKey: "atlas.cases", href: "/atlas/cases", icon: Gavel },
  // Drafting Studio — dedicated entry-point for the three drafting
  // tools (authorization application, compliance brief, jurisdictional
  // comparison). Without this nav item the tools could only be reached
  // by stumbling into AI Mode and typing the right command.
  { labelKey: "atlas.drafting", href: "/atlas/drafting", icon: PenSquare },
  { labelKey: "atlas.eu", href: "/atlas/eu", icon: Landmark },
  {
    labelKey: "atlas.landing_rights",
    href: "/atlas/landing-rights",
    icon: Ticket,
  },
  { labelKey: "atlas.updates", href: "/atlas/updates", icon: Newspaper },
  // Legal Network: Kanzlei-Mandanten-Bridge zu Caelex. Zwischen
  // Bookmarks und Alerts, weil's ein eigenständiges Workstream-Ziel
  // ist (nicht nur Lookup wie Jurisdictions).
  { labelKey: "atlas.network", href: "/atlas/network", icon: Briefcase },
  { labelKey: "atlas.bookmarks", href: "/atlas/bookmarks", icon: Bookmark },
  // Phase 5 — Personal Research Library: lawyer's cross-matter
  // bookshelf of saved Atlas answers. Distinct from bookmarks
  // (which point at corpus items); library entries carry full content.
  { labelKey: "atlas.library", href: "/atlas/library", icon: Bookmark },
  // Alerts — user-level notifications feed. The unread-count badge
  // (rendered inline below) is what makes this item more than
  // decorative: without it, users wouldn't know new alerts had landed.
  { labelKey: "atlas.alerts", href: "/atlas/alerts", icon: Bell },
] as const;

const COLLAPSED_W = 58;
const EXPANDED_W = 250;

export default function AtlasShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { resolvedTheme } = useAtlasTheme();
  const [hovered, setHovered] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Unread-count badge next to the Alerts nav item. Polls every 60s
  // while the tab is visible; see src/hooks/useAtlasUnreadCount.ts
  // for the visibility-aware interval behaviour.
  const unreadCount = useAtlasUnreadCount();
  // H13: mobile-only slide-over state. On lg+ the hover-expand behaviour
  // stays; below lg we show a hamburger + off-canvas drawer.
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  // Close the mobile drawer when the route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const expanded = hovered || mobileOpen;
  // On mobile the drawer always shows the full width so labels are legible.
  const sidebarWidth = mobileOpen || hovered ? EXPANDED_W : COLLAPSED_W;

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const widthTransition = mounted
    ? `all ${expanded ? "300ms cubic-bezier(0.34,1.56,0.64,1)" : "250ms cubic-bezier(0.25,0.46,0.45,0.94)"}`
    : "none";

  return (
    <div
      className="atlas-themed h-screen w-screen overflow-hidden bg-[var(--atlas-bg-page)]"
      data-atlas-theme={resolvedTheme}
      suppressHydrationWarning
    >
      {/* ─── Mobile: hamburger toggle (<lg only) ─── */}
      <button
        type="button"
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((v) => !v)}
        className="lg:hidden fixed top-3 left-3 z-[60] h-10 w-10 inline-flex items-center justify-center rounded-xl bg-[#1a1a1a] text-white shadow-lg"
      >
        {mobileOpen ? (
          <X className="h-5 w-5" strokeWidth={2} />
        ) : (
          <Menu className="h-5 w-5" strokeWidth={2} />
        )}
      </button>

      {/* ─── Mobile: backdrop ─── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ─── Sidebar zone ─── */}
      {/* Desktop (>=lg): fixed hover-expanded rail.
          Mobile (<lg): off-canvas slide-over driven by mobileOpen. */}
      <div
        className={`
          fixed z-50 top-0 bottom-0
          bg-[var(--atlas-bg-surface)] border-r border-[var(--atlas-border)]
          flex flex-col
          transition-all duration-300 ease-out
          ${!mounted ? "opacity-0" : "opacity-100"}
          ${mobileOpen ? "left-0" : "-left-[260px] lg:left-0"}
        `}
        style={{
          width: sidebarWidth,
          transition: widthTransition,
          willChange: "width",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* ── Collapsed: separate pills on white bg ── */}
        {/* ── Expanded: full dark panel ── */}

        {/* Logo area */}
        <div
          className={`
            flex items-center flex-shrink-0
            ${expanded ? "h-14 px-4 gap-3 bg-[#1a1a1a]" : "h-14 justify-center"}
          `}
        >
          {/* L1: next/image for automatic srcset + lazy-loading + priority
              for above-the-fold logo. priority=true so the logo doesn't
              LCP-shift. */}
          {!expanded ? (
            // Larger pill in collapsed state — gives the brand mark
            // the same presence as the navigation pills below it.
            <div className="flex items-center justify-center h-11 w-11 rounded-2xl bg-[#1a1a1a]">
              <Image
                src="/caelex-logo-white.png"
                alt="Caelex"
                width={28}
                height={28}
                priority
                className="h-7 w-7 object-contain"
              />
            </div>
          ) : (
            <>
              <Image
                src="/caelex-logo-white.png"
                alt="Caelex"
                width={28}
                height={28}
                priority
                className="h-7 w-7 object-contain flex-shrink-0"
              />
              <div className="flex flex-col overflow-hidden">
                <span className="text-[13px] font-semibold tracking-[0.12em] text-white/90 whitespace-nowrap">
                  ATLAS
                </span>
                <span className="text-[8px] font-medium tracking-[0.2em] text-white/70 uppercase whitespace-nowrap">
                  Space Law Database
                </span>
              </div>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav
          aria-label="Main navigation"
          className={`
            flex-1 overflow-y-auto overflow-x-hidden py-2
            ${expanded ? "px-2 bg-[#1a1a1a]" : "px-1.5"}
          `}
        >
          {!expanded ? (
            /* ── Collapsed: dark pill with icons ── */
            <div
              className="flex flex-col items-center rounded-2xl bg-[#1a1a1a] py-1.5 px-1 mx-auto"
              style={{ width: 42 }}
            >
              {MAIN_NAV.map((item) => {
                const Icon = item.icon;
                const active = isActive(
                  item.href,
                  "exact" in item ? item.exact : undefined,
                );
                const showUnreadBadge =
                  item.href === "/atlas/alerts" && unreadCount > 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={
                      showUnreadBadge
                        ? `${t(item.labelKey)} (${unreadCount} unread)`
                        : t(item.labelKey)
                    }
                    aria-label={
                      showUnreadBadge
                        ? `${t(item.labelKey)}, ${unreadCount} unread`
                        : t(item.labelKey)
                    }
                    className={`
                      group relative flex items-center justify-center
                      h-8 w-8 rounded-lg mb-0.5
                      transition-all duration-150
                      ${active ? "bg-white/[0.12] text-white" : "text-white/70 hover:text-white/80 hover:bg-white/[0.06]"}
                    `}
                  >
                    <Icon
                      className="h-[15px] w-[15px]"
                      strokeWidth={active ? 2 : 1.5}
                      aria-hidden="true"
                    />
                    {showUnreadBadge && (
                      // Collapsed sidebar: compact dot in the top-right
                      // of the icon. A full numeric badge wouldn't fit
                      // cleanly in 8x8 — the dot signals "check here"
                      // and the full count is available on the tooltip
                      // plus on expand.
                      <span
                        aria-hidden="true"
                        className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-red-500 ring-1 ring-[#1a1a1a]"
                      />
                    )}
                    <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#1a1a1a] px-3 py-1.5 text-[11px] font-medium text-white/90 opacity-0 shadow-xl border border-white/10 transition-opacity duration-150 group-hover:opacity-100">
                      {t(item.labelKey)}
                      {showUnreadBadge && (
                        <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-500/20 text-red-300 text-[10px] font-semibold tabular-nums px-1.5 py-0.5 ring-1 ring-red-500/30">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            /* ── Expanded: full labels ── */
            <ul className="flex flex-col gap-0.5">
              {MAIN_NAV.map((item) => {
                const Icon = item.icon;
                const active = isActive(
                  item.href,
                  "exact" in item ? item.exact : undefined,
                );
                const showUnreadBadge =
                  item.href === "/atlas/alerts" && unreadCount > 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`
                        flex items-center gap-3 h-9 px-3 rounded-xl whitespace-nowrap
                        transition-all duration-150
                        ${active ? "bg-white/[0.12] text-white font-medium" : "text-white/70 hover:text-white/80 hover:bg-white/[0.06]"}
                      `}
                    >
                      <Icon
                        className="h-4 w-4 flex-shrink-0"
                        strokeWidth={active ? 2 : 1.5}
                        aria-hidden="true"
                      />
                      <span className="text-[12px] tracking-wide flex-1">
                        {t(item.labelKey)}
                      </span>
                      {showUnreadBadge && (
                        // Expanded sidebar: full numeric badge. 99+
                        // cap keeps long-absent users from getting a
                        // visually-disruptive triple-digit pill.
                        <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-[10px] font-semibold text-white tabular-nums">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        {/* Bottom */}
        <div
          className={`
            flex flex-col flex-shrink-0 py-2
            ${expanded ? "px-2 bg-[#1a1a1a] border-t border-white/[0.08]" : "px-1.5 border-t border-[var(--atlas-border)]"}
          `}
        >
          {!expanded ? (
            /* ── Collapsed: separate bottom pills ── */
            <div className="flex flex-col items-center gap-1.5">
              <Link
                href="/atlas/settings"
                title={t("atlas.settings")}
                aria-label={t("atlas.settings")}
                className={`
                  flex items-center justify-center h-9 w-9 rounded-xl transition-all duration-150
                  ${
                    isActive("/atlas/settings")
                      ? "bg-[var(--atlas-bg-surface)] text-[#1a1a1a]"
                      : "bg-[#1a1a1a] text-white/70 hover:text-white hover:bg-[#2a2a2a]"
                  }
                `}
              >
                <Settings
                  className="h-[15px] w-[15px]"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </Link>
            </div>
          ) : (
            /* ── Expanded: full labels ── */
            <>
              <Link
                href="/atlas/settings"
                aria-label={t("atlas.settings")}
                className={`
                  flex items-center gap-3 h-9 px-3 rounded-xl transition-all duration-150 whitespace-nowrap
                  ${isActive("/atlas/settings") ? "bg-white/[0.12] text-white" : "text-white/60 hover:text-white/70 hover:bg-white/[0.06]"}
                `}
              >
                <Settings
                  className="h-4 w-4"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <span className="text-[12px] tracking-wide">
                  {t("atlas.settings")}
                </span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ─── Main Content (reacts to sidebar) ─── */}
      {/* On mobile (<lg) the sidebar is an overlay drawer, so no margin.
          On desktop the sidebar is a fixed rail and the content reserves
          its width via the --atlas-sidebar-w custom property + lg: breakpoint.
          pt-14 on mobile reserves space for the hamburger button. */}
      <main
        className="h-full overflow-y-auto overflow-x-hidden pt-14 lg:pt-0 lg:ml-[var(--atlas-sidebar-w,58px)]"
        style={
          {
            "--atlas-sidebar-w": `${sidebarWidth}px`,
            transition: widthTransition,
            willChange: "margin-left",
          } as React.CSSProperties
        }
      >
        <div className="min-h-full">{children}</div>
      </main>

      {/* ─── Astra Chat (floating on all ATLAS pages) ─── */}
      <AtlasAstraChat />

      {/* ─── AI Mode Launcher (floating Sparkles pill, all pages) ─── */}
      {/* The homepage sets `body[data-atlas-ai-mode-owner="homepage"]` so
          its inline launcher wins; this one renders on every other page. */}
      <AIModeLauncher />

      {/* ─── Cmd+K Command Palette ─── */}
      <CommandPalette />
    </div>
  );
}
