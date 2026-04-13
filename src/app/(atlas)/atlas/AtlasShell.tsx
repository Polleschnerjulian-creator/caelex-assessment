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

export default function AtlasShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [hovered, setHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div
      className="landing-light relative h-screen w-screen overflow-hidden bg-[#F7F8FA]"
      style={{ colorScheme: "light" }}
    >
      {/* ─── Fixed sidebar zone (hover target) ─── */}
      <div
        className={`
          fixed top-0 left-0 bottom-0 z-50
          flex flex-col items-start
          transition-opacity duration-300
          ${!mounted ? "opacity-0" : "opacity-100"}
        `}
        style={{ width: hovered ? 260 : 72 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* ── Logo pill (top) ── */}
        <div className="ml-3 mt-3 flex items-center justify-center h-10 w-[46px] rounded-xl bg-[#1a1a1a]">
          <span className="text-[12px] font-bold tracking-[0.15em] text-white/80">
            C
          </span>
        </div>

        {/* ── Main nav pill (floating, NOT full height) ── */}
        <div className="ml-3 mt-2 flex flex-col items-center rounded-2xl bg-[#1a1a1a] w-[46px] py-2 px-1">
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
                  h-9 w-9 rounded-xl transition-all duration-200 mb-0.5
                  ${
                    active
                      ? "bg-white/15 text-white"
                      : "text-white/35 hover:text-white/80 hover:bg-white/8"
                  }
                `}
              >
                <Icon
                  className="h-[16px] w-[16px]"
                  strokeWidth={active ? 2 : 1.5}
                />
              </Link>
            );
          })}
        </div>

        {/* ── Bottom pills (separate: Back + Settings) ── */}
        <div className="mt-auto ml-3 mb-3 flex flex-col gap-2">
          <Link
            href="/dashboard"
            className="flex items-center justify-center h-10 w-[46px] rounded-xl bg-[#1a1a1a] text-white/25 hover:text-white/60 transition-all duration-200"
          >
            <ArrowLeft className="h-[16px] w-[16px]" strokeWidth={1.5} />
          </Link>
          <Link
            href="/atlas/settings"
            className={`
              flex items-center justify-center h-10 w-[46px] rounded-xl bg-[#1a1a1a] transition-all duration-200
              ${isActive("/atlas/settings") ? "text-white" : "text-white/25 hover:text-white/60"}
            `}
          >
            <Settings className="h-[16px] w-[16px]" strokeWidth={1.5} />
          </Link>
        </div>

        {/* ── Expanded white overlay panel ── */}
        <div
          className={`
            absolute top-0 left-[62px] bottom-0
            bg-white/95 backdrop-blur-xl border-r border-gray-200 shadow-xl
            overflow-hidden
            transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
          `}
          style={{
            width: hovered ? 198 : 0,
            opacity: hovered ? 1 : 0,
            pointerEvents: hovered ? "auto" : "none",
          }}
        >
          {/* Header */}
          <div className="h-[52px] flex items-center px-4 border-b border-gray-100 ml-0">
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-semibold tracking-[0.1em] text-gray-900 whitespace-nowrap">
                ATLAS
              </span>
              <span className="text-[8px] font-medium tracking-[0.2em] text-emerald-600 uppercase whitespace-nowrap">
                Regulatory Intelligence
              </span>
            </div>
          </div>

          {/* Nav labels */}
          <nav className="py-2 px-2">
            <ul className="flex flex-col gap-px">
              {MAIN_NAV.map((item) => {
                const active = isActive(
                  item.href,
                  "exact" in item ? item.exact : undefined,
                );
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`
                        flex items-center h-9 px-3 rounded-lg whitespace-nowrap
                        transition-all duration-150
                        ${
                          active
                            ? "bg-gray-100 text-gray-900 font-medium"
                            : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                        }
                      `}
                    >
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
              className="flex items-center h-8 px-3 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all duration-150 whitespace-nowrap"
            >
              <span className="text-[11px] tracking-wide">Back to Caelex</span>
            </Link>
            <Link
              href="/atlas/settings"
              className={`
                flex items-center h-8 px-3 rounded-lg transition-all duration-150 whitespace-nowrap
                ${isActive("/atlas/settings") ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"}
              `}
            >
              <span className="text-[11px] tracking-wide">Settings</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Main Content (fixed margin, never pushed) ─── */}
      <main className="ml-[72px] h-full overflow-y-auto overflow-x-hidden">
        <div className="min-h-full">{children}</div>
      </main>
    </div>
  );
}
