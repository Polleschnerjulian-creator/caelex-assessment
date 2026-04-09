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
  ChevronLeft,
  ChevronRight,
  Hexagon,
} from "lucide-react";

// ─── Sidebar navigation items ───

const NAV_ITEMS = [
  { label: "Command Center", href: "/atlas", icon: Globe, exact: true },
  { label: "Comparator", href: "/atlas/comparator", icon: BarChart3 },
  { label: "Jurisdictions", href: "/atlas/jurisdictions", icon: Map },
  { label: "EU Space Act", href: "/atlas/eu-space-act", icon: ScrollText },
  { label: "Cyber Standards", href: "/atlas/cyber-standards", icon: Shield },
  { label: "Sustainability", href: "/atlas/sustainability", icon: Leaf },
  { label: "Alerts", href: "/atlas/alerts", icon: Bell },
  { label: "API", href: "/atlas/api-access", icon: Key },
  { label: "Settings", href: "/atlas/settings", icon: Settings },
] as const;

// ─── AtlasShell ───

export default function AtlasShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("atlas-sidebar-collapsed");
    if (stored === "false") setCollapsed(false);
    setMounted(true);
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("atlas-sidebar-collapsed", String(next));
  };

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div
      className="landing-light flex h-screen w-screen overflow-hidden bg-[#F7F8FA]"
      style={{ colorScheme: "light" }}
    >
      {/* ─── Sidebar ─── */}
      <aside
        className={`
          relative z-30 flex flex-col border-r border-gray-200
          bg-white/80 backdrop-blur-xl
          transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${collapsed ? "w-[56px]" : "w-[240px]"}
          ${!mounted ? "opacity-0" : "opacity-100"}
        `}
        style={{ willChange: "width" }}
      >
        {/* ─ Logo ─ */}
        <div
          className={`
            flex items-center border-b border-gray-200 px-3
            ${collapsed ? "h-[56px] justify-center" : "h-[56px] gap-3"}
          `}
        >
          <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center">
            <Hexagon className="h-8 w-8 text-emerald-500" strokeWidth={1.5} />
            <span className="absolute text-[9px] font-bold tracking-wider text-emerald-600">
              A
            </span>
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-[13px] font-semibold tracking-[0.2em] text-gray-900">
                ATLAS
              </span>
              <span className="text-[9px] font-medium tracking-widest text-emerald-600 uppercase">
                Space Law Intel
              </span>
            </div>
          )}
        </div>

        {/* ─ Navigation ─ */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-1.5">
          <ul className="flex flex-col gap-0.5">
            {NAV_ITEMS.map((item) => {
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
                      group relative flex items-center rounded-lg
                      transition-all duration-200
                      ${collapsed ? "h-10 w-10 justify-center mx-auto" : "h-9 gap-3 px-3"}
                      ${
                        active
                          ? "bg-emerald-50 text-emerald-700 border-l-2 border-emerald-500"
                          : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                      }
                    `}
                  >
                    <Icon
                      className={`flex-shrink-0 ${collapsed ? "h-[18px] w-[18px]" : "h-4 w-4"}`}
                      strokeWidth={active ? 2 : 1.5}
                    />

                    {!collapsed && (
                      <span className="truncate text-[12px] font-medium tracking-wide">
                        {item.label}
                      </span>
                    )}

                    {/* Tooltip for collapsed mode */}
                    {collapsed && (
                      <span
                        className="
                          pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2
                          whitespace-nowrap rounded-md bg-white px-2.5 py-1.5
                          text-[11px] font-medium text-gray-700 opacity-0
                          shadow-lg border border-gray-200
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

        {/* ─ Bottom section ─ */}
        <div className="flex flex-col border-t border-gray-200 py-2 px-1.5 gap-0.5">
          {/* Back to Caelex */}
          <Link
            href="/dashboard"
            title={collapsed ? "Back to Caelex" : undefined}
            className={`
              group relative flex items-center rounded-lg text-gray-400
              hover:text-gray-700 hover:bg-gray-50
              transition-all duration-200
              ${collapsed ? "h-10 w-10 justify-center mx-auto" : "h-9 gap-3 px-3"}
            `}
          >
            <ArrowLeft
              className={`flex-shrink-0 ${collapsed ? "h-[18px] w-[18px]" : "h-4 w-4"}`}
              strokeWidth={1.5}
            />
            {!collapsed && (
              <span className="truncate text-[12px] font-medium tracking-wide">
                Back to Caelex
              </span>
            )}
            {collapsed && (
              <span
                className="
                  pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2
                  whitespace-nowrap rounded-md bg-white px-2.5 py-1.5
                  text-[11px] font-medium text-gray-700 opacity-0
                  shadow-lg border border-gray-200
                  transition-opacity duration-150
                  group-hover:opacity-100
                "
              >
                Back to Caelex
              </span>
            )}
          </Link>

          {/* Collapse toggle */}
          <button
            onClick={toggleCollapsed}
            className={`
              flex items-center rounded-lg text-gray-400 hover:text-gray-700
              hover:bg-gray-50 transition-all duration-200
              ${collapsed ? "h-10 w-10 justify-center mx-auto" : "h-9 gap-3 px-3"}
            `}
          >
            {collapsed ? (
              <ChevronRight
                className="h-4 w-4 flex-shrink-0"
                strokeWidth={1.5}
              />
            ) : (
              <ChevronLeft
                className="h-4 w-4 flex-shrink-0"
                strokeWidth={1.5}
              />
            )}
            {!collapsed && (
              <span className="truncate text-[12px] font-medium tracking-wide">
                Collapse
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="min-h-full">{children}</div>
      </main>
    </div>
  );
}
