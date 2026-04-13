"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Globe,
  BarChart3,
  Map,
  ScrollText,
  Shield,
  Leaf,
  Bell,
  Key,
  Settings,
  ArrowLeft,
} from "lucide-react";

const MAIN_NAV = [
  { label: "Command Center", href: "/atlas", icon: Globe, exact: true },
  { label: "Comparator", href: "/atlas/comparator", icon: BarChart3 },
  { label: "Jurisdictions", href: "/atlas/jurisdictions", icon: Map },
  { label: "EU Space Act", href: "/atlas/eu-space-act", icon: ScrollText },
  { label: "Cyber Standards", href: "/atlas/cyber-standards", icon: Shield },
  { label: "Sustainability", href: "/atlas/sustainability", icon: Leaf },
  { label: "Alerts", href: "/atlas/alerts", icon: Bell },
  { label: "API", href: "/atlas/api-access", icon: Key },
] as const;

const COLLAPSED_W = 72;
const EXPANDED_W = 260;

export default function AtlasShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [hovered, setHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const sidebarWidth = hovered ? EXPANDED_W : COLLAPSED_W;
  const collapsed = !hovered;

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Transition config matching dashboard sidebar
  const widthTransition = mounted
    ? `width ${collapsed ? "250ms cubic-bezier(0.25,0.46,0.45,0.94)" : "300ms cubic-bezier(0.34,1.56,0.64,1)"}`
    : "none";

  return (
    <div
      className="landing-light h-screen w-screen overflow-hidden bg-[#F7F8FA]"
      style={{ colorScheme: "light" }}
    >
      {/* ─── Sidebar ─── */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`
          fixed z-40 flex flex-col
          transition-opacity duration-300
          ${!mounted ? "opacity-0" : "opacity-100"}
        `}
        style={{
          width: sidebarWidth,
          height: "calc(100vh - 24px)",
          left: 12,
          top: 12,
          background: "#1a1a1a",
          borderRadius: 20,
          overflow: "hidden",
          transition: widthTransition,
          willChange: "width",
        }}
      >
        {/* ── Logo ── */}
        <div
          className={`
            flex items-center flex-shrink-0 border-b border-white/[0.08]
            ${collapsed ? "h-14 justify-center" : "h-14 px-5 gap-3"}
          `}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/caelex-logo-white.png"
            alt="Caelex"
            className="h-8 w-8 object-contain flex-shrink-0"
          />
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-[13px] font-semibold tracking-[0.15em] text-white/90 whitespace-nowrap">
                ATLAS
              </span>
              <span className="text-[8px] font-medium tracking-[0.2em] text-white/40 uppercase whitespace-nowrap">
                Regulatory Intelligence
              </span>
            </div>
          )}
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2">
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
                    title={collapsed ? item.label : undefined}
                    className={`
                      group relative flex items-center rounded-xl
                      transition-all duration-200
                      ${collapsed ? "h-10 w-10 justify-center mx-auto" : "h-10 gap-3 px-3"}
                      ${
                        active
                          ? "bg-white/[0.12] text-white"
                          : "text-white/35 hover:text-white/80 hover:bg-white/[0.06]"
                      }
                    `}
                  >
                    <Icon
                      className={`flex-shrink-0 ${collapsed ? "h-[17px] w-[17px]" : "h-4 w-4"}`}
                      strokeWidth={active ? 2 : 1.5}
                    />

                    {!collapsed && (
                      <span className="truncate text-[12px] font-medium tracking-wide whitespace-nowrap">
                        {item.label}
                      </span>
                    )}

                    {/* Tooltip collapsed mode */}
                    {collapsed && (
                      <span
                        className="
                          pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2
                          whitespace-nowrap rounded-lg bg-[#1a1a1a] px-3 py-1.5
                          text-[11px] font-medium text-white/90 opacity-0
                          shadow-xl border border-white/10
                          transition-opacity duration-150
                          group-hover:opacity-100
                        "
                      >
                        {item.label}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ── Bottom ── */}
        <div className="flex flex-col border-t border-white/[0.08] py-2 px-2 gap-0.5">
          <Link
            href="/dashboard"
            title={collapsed ? "Back to Caelex" : undefined}
            className={`
              group relative flex items-center rounded-xl
              text-white/25 hover:text-white/60 hover:bg-white/[0.06]
              transition-all duration-200
              ${collapsed ? "h-10 w-10 justify-center mx-auto" : "h-10 gap-3 px-3"}
            `}
          >
            <ArrowLeft
              className={`flex-shrink-0 ${collapsed ? "h-[17px] w-[17px]" : "h-4 w-4"}`}
              strokeWidth={1.5}
            />
            {!collapsed && (
              <span className="truncate text-[12px] font-medium tracking-wide whitespace-nowrap">
                Back to Caelex
              </span>
            )}
            {collapsed && (
              <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#1a1a1a] px-3 py-1.5 text-[11px] font-medium text-white/90 opacity-0 shadow-xl border border-white/10 transition-opacity duration-150 group-hover:opacity-100">
                Back to Caelex
              </span>
            )}
          </Link>

          <Link
            href="/atlas/settings"
            title={collapsed ? "Settings" : undefined}
            className={`
              group relative flex items-center rounded-xl
              transition-all duration-200
              ${collapsed ? "h-10 w-10 justify-center mx-auto" : "h-10 gap-3 px-3"}
              ${
                isActive("/atlas/settings")
                  ? "bg-white/[0.12] text-white"
                  : "text-white/25 hover:text-white/60 hover:bg-white/[0.06]"
              }
            `}
          >
            <Settings
              className={`flex-shrink-0 ${collapsed ? "h-[17px] w-[17px]" : "h-4 w-4"}`}
              strokeWidth={1.5}
            />
            {!collapsed && (
              <span className="truncate text-[12px] font-medium tracking-wide whitespace-nowrap">
                Settings
              </span>
            )}
            {collapsed && (
              <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#1a1a1a] px-3 py-1.5 text-[11px] font-medium text-white/90 opacity-0 shadow-xl border border-white/10 transition-opacity duration-150 group-hover:opacity-100">
                Settings
              </span>
            )}
          </Link>
        </div>
      </aside>

      {/* ─── Main Content (reacts to sidebar width) ─── */}
      <main
        className="h-full overflow-y-auto overflow-x-hidden"
        style={{
          marginLeft: sidebarWidth + 24,
          transition: widthTransition,
          willChange: "margin-left",
        }}
      >
        <div className="min-h-full">{children}</div>
      </main>
    </div>
  );
}
