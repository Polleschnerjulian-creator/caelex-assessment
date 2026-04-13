"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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

// ─── Navigation items (Settings separated to bottom) ───

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

// ─── AtlasShell ───

export default function AtlasShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div
      className="landing-light flex h-screen w-screen overflow-hidden bg-[#F7F8FA]"
      style={{ colorScheme: "light" }}
    >
      {/* ─── Dark Icon Strip (always visible) ─── */}
      <div
        className={`
          relative z-40 flex flex-col items-center
          m-2 rounded-2xl bg-[#1a1a1a]
          w-[52px] flex-shrink-0
          transition-opacity duration-300
          ${!mounted ? "opacity-0" : "opacity-100"}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-center h-14 w-full">
          <Image
            src="/caelex-logo-icon.svg"
            alt="Caelex"
            width={24}
            height={24}
            className="opacity-90"
            onError={(e) => {
              // Fallback if logo doesn't exist
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              target.parentElement!.innerHTML =
                '<span class="text-[11px] font-bold tracking-wider text-white/80">C</span>';
            }}
          />
        </div>

        {/* Main nav icons */}
        <nav className="flex-1 flex flex-col items-center gap-0.5 py-1 w-full px-1.5">
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
                title={item.label}
                className={`
                  group relative flex items-center justify-center
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

                {/* Tooltip */}
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
              </Link>
            );
          })}
        </nav>

        {/* Bottom icons: Back + Settings */}
        <div className="flex flex-col items-center gap-0.5 pb-3 px-1.5">
          <Link
            href="/dashboard"
            title="Back to Caelex"
            className="
              group relative flex items-center justify-center
              h-9 w-9 rounded-xl text-white/30
              hover:text-white/70 hover:bg-white/8
              transition-all duration-200
            "
          >
            <ArrowLeft className="h-[17px] w-[17px]" strokeWidth={1.5} />
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
              Back to Caelex
            </span>
          </Link>

          <Link
            href="/atlas/settings"
            title="Settings"
            className={`
              group relative flex items-center justify-center
              h-9 w-9 rounded-xl transition-all duration-200
              ${
                isActive("/atlas/settings")
                  ? "bg-white/15 text-white"
                  : "text-white/30 hover:text-white/70 hover:bg-white/8"
              }
            `}
          >
            <Settings className="h-[17px] w-[17px]" strokeWidth={1.5} />
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
              Settings
            </span>
          </Link>
        </div>
      </div>

      {/* ─── Expanded Panel (white, slides out when hovered/toggled) ─── */}
      {expanded && (
        <aside
          className="
            relative z-30 w-[220px] flex-shrink-0
            bg-white border-r border-gray-200 shadow-sm
            animate-in slide-in-from-left-2 duration-200
          "
        >
          {/* Panel content would go here for future expansion */}
        </aside>
      )}

      {/* ─── Main Content ─── */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="min-h-full">{children}</div>
      </main>
    </div>
  );
}
