"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, LogOut, type LucideIcon } from "lucide-react";
import { signOut } from "next-auth/react";

// ─── Nav items — hardcoded German, no i18n dependency ──────────────
//   Add future real routes here. Do NOT add items whose href doesn't exist.

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

const MAIN_NAV: NavItem[] = [
  {
    label: "Suche",
    href: "/scholar",
    icon: Search,
    exact: true,
  },
];

// ─── Sidebar width constants (mirrors old AtlasShell exactly) ───────
const COLLAPSED_W = 58;
const EXPANDED_W = 220;

// ─── Shell ──────────────────────────────────────────────────────────

export default function ScholarShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // WCAG 2.1.1 / 2.4.11: sidebar must expand on keyboard focus-within,
  // not only on mouse hover, so keyboard users see the nav labels.
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Expand when either hovered OR a keyboard user has focus inside
  const expanded = hovered || focused;
  const sidebarWidth = expanded ? EXPANDED_W : COLLAPSED_W;

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Smooth expand/collapse transitions — spring on expand, ease-out on collapse
  const widthTransition = mounted
    ? `all ${expanded ? "300ms cubic-bezier(0.34,1.56,0.64,1)" : "250ms cubic-bezier(0.25,0.46,0.45,0.94)"}`
    : "none";

  return (
    // lang="de": WCAG 3.1.1 — Scholar UI is German; root layout uses lang="en"
    <div
      lang="de"
      className="landing-light h-screen w-screen overflow-hidden bg-[#F7F8FA]"
      style={{ colorScheme: "light" }}
    >
      {/* ─── Sidebar ─── */}
      {/*
        WCAG 2.1.1: onFocus/onBlur expand on keyboard navigation.
        onFocusCapture fires when any descendant receives focus (=focus-within).
        onBlurCapture fires when focus leaves entirely; we check relatedTarget
        to avoid collapsing when moving between items within the sidebar.

        WCAG 2.4.11: sidebar is fixed — content's marginLeft matches sidebarWidth
        so focused elements in <main> are never obscured by the sidebar.
      */}
      <div
        className={[
          "fixed z-40 top-0 left-0 bottom-0",
          "bg-white border-r border-gray-200",
          "flex flex-col",
          "transition-opacity duration-300",
          !mounted ? "opacity-0" : "opacity-100",
        ].join(" ")}
        style={{
          width: sidebarWidth,
          transition: widthTransition,
          willChange: "width",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(e) => {
          // Only collapse when focus leaves the sidebar entirely
          const currentTarget = e.currentTarget as HTMLElement;
          const related = e.relatedTarget as Node | null;
          if (!related || !currentTarget.contains(related)) {
            setFocused(false);
          }
        }}
      >
        {/* ── Logo block ── */}
        <div
          className={[
            "flex items-center flex-shrink-0",
            expanded ? "h-14 px-4 gap-3 bg-[#1a1a1a]" : "h-14 justify-center",
          ].join(" ")}
        >
          {!expanded ? (
            /* Collapsed: dark pill with logo only */
            <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-[#1a1a1a]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/caelex-logo-white.png"
                alt="Caelex Scholar"
                className="h-5 w-5 object-contain"
              />
            </div>
          ) : (
            /* Expanded: logo + wordmark */
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/caelex-logo-white.png"
                alt="Caelex Scholar"
                className="h-7 w-7 object-contain flex-shrink-0"
              />
              <div className="flex flex-col overflow-hidden">
                <span className="text-[13px] font-semibold tracking-[0.12em] text-white/90 whitespace-nowrap">
                  SCHOLAR
                </span>
                <span className="text-[8px] font-medium tracking-[0.2em] text-white/70 uppercase whitespace-nowrap">
                  powered by Atlas
                </span>
              </div>
            </>
          )}
        </div>

        {/* ── Navigation ──
            WCAG 1.3.1 / 2.4.1: <nav> landmark with aria-label on all states.
            Both collapsed and expanded render the <nav> tag — only the inner
            markup changes.
        */}
        <nav
          aria-label="Seitennavigation"
          className={[
            "flex-1 overflow-y-auto overflow-x-hidden py-2",
            expanded ? "px-2 bg-[#1a1a1a]" : "px-1.5",
          ].join(" ")}
        >
          {!expanded ? (
            /* Collapsed: dark pill container with icon buttons + hover tooltips
               WCAG 2.5.8: h-8 w-8 = 32px × 32px meets the 24px minimum ✓
                             (full 44px target is advisory; 32px exceeds WCAG 2.5.8) */
            <ul
              className="flex flex-col items-center rounded-2xl bg-[#1a1a1a] py-1.5 px-1 mx-auto list-none"
              style={{ width: 42 }}
              role="list"
            >
              {MAIN_NAV.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, item.exact);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-label={item.label}
                      aria-current={active ? "page" : undefined}
                      className={[
                        "group relative flex items-center justify-center",
                        "h-8 w-8 rounded-lg mb-0.5",
                        "transition-all duration-150",
                        // WCAG 2.4.7: focus-visible ring for keyboard users
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-[#1a1a1a]",
                        active
                          ? "bg-white/[0.12] text-white"
                          : "text-white/70 hover:text-white/80 hover:bg-white/[0.06]",
                      ].join(" ")}
                    >
                      <Icon
                        className="h-[15px] w-[15px]"
                        strokeWidth={active ? 2 : 1.5}
                        aria-hidden={true}
                      />
                      {/* Tooltip — decorative; aria-label on the link is the a11y name */}
                      <span
                        className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#1a1a1a] px-3 py-1.5 text-[11px] font-medium text-white/90 opacity-0 shadow-xl border border-white/10 transition-opacity duration-150 group-hover:opacity-100"
                        aria-hidden="true"
                      >
                        {item.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            /* Expanded: full text labels */
            <ul className="flex flex-col gap-0.5" role="list">
              {MAIN_NAV.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, item.exact);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={[
                        "flex items-center gap-3 h-9 px-3 rounded-xl whitespace-nowrap",
                        "transition-all duration-150",
                        // WCAG 2.4.7: focus-visible ring
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-[#1a1a1a]",
                        active
                          ? "bg-white/[0.12] text-white font-medium"
                          : "text-white/70 hover:text-white/80 hover:bg-white/[0.06]",
                      ].join(" ")}
                    >
                      <Icon
                        className="h-4 w-4 flex-shrink-0"
                        strokeWidth={active ? 2 : 1.5}
                        aria-hidden={true}
                      />
                      <span className="text-[12px] tracking-wide">
                        {item.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        {/* ── Bottom: sign-out ── */}
        <div
          className={[
            "flex flex-col flex-shrink-0 py-2",
            expanded
              ? "px-2 bg-[#1a1a1a] border-t border-white/[0.08]"
              : "px-1.5 border-t border-gray-200",
          ].join(" ")}
        >
          {!expanded ? (
            /* Collapsed: sign-out icon pill
               WCAG 2.5.8: h-9 w-9 = 36px × 36px > 24px ✓ */
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                aria-label="Abmelden"
                title="Abmelden"
                onClick={() => signOut({ callbackUrl: "/scholar-login" })}
                className="flex items-center justify-center h-9 w-9 rounded-xl bg-[#1a1a1a] text-white/70 hover:text-white hover:bg-[#2a2a2a] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-[#1a1a1a]"
              >
                <LogOut
                  className="h-[15px] w-[15px]"
                  strokeWidth={1.5}
                  aria-hidden={true}
                />
              </button>
            </div>
          ) : (
            /* Expanded: sign-out with label */
            <button
              type="button"
              aria-label="Abmelden"
              onClick={() => signOut({ callbackUrl: "/scholar-login" })}
              className="flex items-center gap-3 h-9 px-3 rounded-xl transition-all duration-150 whitespace-nowrap text-white/60 hover:text-white/70 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-[#1a1a1a]"
            >
              <LogOut
                className="h-4 w-4"
                strokeWidth={1.5}
                aria-hidden={true}
              />
              <span className="text-[12px] tracking-wide">Abmelden</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Main content — pushes right as sidebar expands ───
          WCAG 2.4.11: marginLeft tracks sidebar width so the sidebar
          never obscures focused content in the main area.
      */}
      <main
        className="h-full overflow-y-auto overflow-x-hidden"
        style={{
          marginLeft: sidebarWidth,
          transition: widthTransition,
          willChange: "margin-left",
        }}
      >
        <div className="min-h-full">{children}</div>
      </main>
    </div>
  );
}
