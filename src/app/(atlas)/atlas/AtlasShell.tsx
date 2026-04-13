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

const COLLAPSED_W = 68; // px — dark strip + margin
const EXPANDED_W = 240; // px — full sidebar with labels

export default function AtlasShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [hovered, setHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const collapsed = !hovered;
  const sidebarWidth = collapsed ? COLLAPSED_W : EXPANDED_W;

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div
      className="landing-light flex h-screen w-screen overflow-hidden bg-[#F7F8FA]"
      style={{ colorScheme: "light" }}
    >
      {/* ─── Sidebar Area ─── */}
      <div
        className="relative z-40 flex-shrink-0 h-full"
        style={{
          width: sidebarWidth,
          transition: "width 300ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Dark icon strip — floats, NOT full height */}
        <div
          className={`
            absolute top-2 left-2 bottom-auto
            flex flex-col items-center
            rounded-2xl bg-[#1a1a1a]
            w-[52px] overflow-hidden
            transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
            ${!mounted ? "opacity-0" : "opacity-100"}
          `}
          style={{
            height: collapsed ? "auto" : "calc(100% - 16px)",
          }}
        >
          {/* Logo */}
          <div className="flex items-center justify-center h-12 w-full flex-shrink-0">
            <span className="text-[13px] font-bold tracking-[0.15em] text-white/80">
              C
            </span>
          </div>

          {/* Main nav icons */}
          <nav className="flex flex-col items-center gap-0.5 py-1 px-1.5 flex-shrink-0">
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
                  className={`
                    flex items-center justify-center
                    h-9 w-9 rounded-xl transition-all duration-200
                    ${
                      active
                        ? "bg-white/15 text-white"
                        : "text-white/40 hover:text-white/80 hover:bg-white/8"
                    }
                  `}
                >
                  <Icon
                    className="h-[17px] w-[17px]"
                    strokeWidth={active ? 2 : 1.5}
                  />
                </Link>
              );
            })}
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Bottom: Back + Settings */}
          <div className="flex flex-col items-center gap-0.5 pb-3 px-1.5 flex-shrink-0">
            <Link
              href="/dashboard"
              className="flex items-center justify-center h-9 w-9 rounded-xl text-white/25 hover:text-white/60 hover:bg-white/8 transition-all duration-200"
            >
              <ArrowLeft className="h-[17px] w-[17px]" strokeWidth={1.5} />
            </Link>
            <Link
              href="/atlas/settings"
              className={`
                flex items-center justify-center h-9 w-9 rounded-xl transition-all duration-200
                ${
                  isActive("/atlas/settings")
                    ? "bg-white/15 text-white"
                    : "text-white/25 hover:text-white/60 hover:bg-white/8"
                }
              `}
            >
              <Settings className="h-[17px] w-[17px]" strokeWidth={1.5} />
            </Link>
          </div>
        </div>

        {/* White expanded panel — slides in on hover */}
        <div
          className={`
            absolute top-0 left-[56px] bottom-0
            bg-white border-r border-gray-200
            overflow-hidden
            transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
          `}
          style={{
            width: collapsed ? 0 : EXPANDED_W - 56,
            opacity: collapsed ? 0 : 1,
          }}
        >
          {/* Header */}
          <div className="h-14 flex items-center px-4 border-b border-gray-100">
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-semibold tracking-[0.12em] text-gray-900 whitespace-nowrap">
                ATLAS
              </span>
              <span className="text-[9px] font-medium tracking-widest text-emerald-600 uppercase whitespace-nowrap">
                Regulatory Intelligence
              </span>
            </div>
          </div>

          {/* Nav labels */}
          <nav className="py-2 px-2">
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
                        flex items-center gap-3 h-9 px-3 rounded-lg
                        transition-all duration-150 whitespace-nowrap
                        ${
                          active
                            ? "bg-gray-100 text-gray-900 font-medium"
                            : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                        }
                      `}
                    >
                      <Icon
                        className="h-4 w-4 flex-shrink-0"
                        strokeWidth={active ? 2 : 1.5}
                      />
                      <span className="text-[12px] tracking-wide">
                        {item.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Bottom */}
          <div className="absolute bottom-0 left-0 right-0 border-t border-gray-100 py-2 px-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 h-9 px-3 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all duration-150 whitespace-nowrap"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
              <span className="text-[12px] tracking-wide">Back to Caelex</span>
            </Link>
            <Link
              href="/atlas/settings"
              className={`
                flex items-center gap-3 h-9 px-3 rounded-lg transition-all duration-150 whitespace-nowrap
                ${
                  isActive("/atlas/settings")
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"
                }
              `}
            >
              <Settings className="h-4 w-4" strokeWidth={1.5} />
              <span className="text-[12px] tracking-wide">Settings</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <main
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{
          transition: "margin-left 300ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div className="min-h-full">{children}</div>
      </main>
    </div>
  );
}
