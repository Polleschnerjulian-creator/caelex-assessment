"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, BarChart3, Map, Settings } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import AtlasAstraChat from "@/components/atlas/AtlasAstraChat";

const MAIN_NAV = [
  {
    labelKey: "atlas.search",
    href: "/atlas",
    icon: Search,
    exact: true,
  },
  { labelKey: "atlas.comparator", href: "/atlas/comparator", icon: BarChart3 },
  { labelKey: "atlas.jurisdictions", href: "/atlas/jurisdictions", icon: Map },
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
  const [hovered, setHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const expanded = hovered;
  const sidebarWidth = expanded ? EXPANDED_W : COLLAPSED_W;

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const widthTransition = mounted
    ? `all ${expanded ? "300ms cubic-bezier(0.34,1.56,0.64,1)" : "250ms cubic-bezier(0.25,0.46,0.45,0.94)"}`
    : "none";

  return (
    <div
      className="landing-light h-screen w-screen overflow-hidden bg-[#F7F8FA]"
      style={{ colorScheme: "light" }}
    >
      {/* ─── Sidebar zone ─── */}
      <div
        className={`
          fixed z-40 top-0 left-0 bottom-0
          bg-white border-r border-gray-200
          flex flex-col
          transition-opacity duration-300
          ${!mounted ? "opacity-0" : "opacity-100"}
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
          {!expanded ? (
            <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-[#1a1a1a]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/caelex-logo-white.png"
                alt="Caelex"
                className="h-5 w-5 object-contain"
              />
            </div>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/caelex-logo-white.png"
                alt="Caelex"
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
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={t(item.labelKey)}
                    aria-label={t(item.labelKey)}
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
                    <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#1a1a1a] px-3 py-1.5 text-[11px] font-medium text-white/90 opacity-0 shadow-xl border border-white/10 transition-opacity duration-150 group-hover:opacity-100">
                      {t(item.labelKey)}
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
                      <span className="text-[12px] tracking-wide">
                        {t(item.labelKey)}
                      </span>
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
            ${expanded ? "px-2 bg-[#1a1a1a] border-t border-white/[0.08]" : "px-1.5 border-t border-gray-200"}
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
                      ? "bg-white text-[#1a1a1a]"
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

      {/* ─── Astra Chat (floating on all ATLAS pages) ─── */}
      <AtlasAstraChat />
    </div>
  );
}
