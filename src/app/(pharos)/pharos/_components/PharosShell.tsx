"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * PharosShell — workspace chrome for the authority-side UI.
 *
 * Light-Mode-First: amber accent stays the same, but the surfaces are
 * now slate-50/white in light and navy in dark. Toggle in the top-right
 * corner persists to localStorage via PharosThemeProvider.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  Eye,
  Gavel,
  GitBranch,
  Globe,
  LayoutDashboard,
  Lightbulb,
  Monitor,
  Moon,
  Plus,
  Scale,
  Settings,
  Sparkles,
  Sun,
  Users,
} from "lucide-react";
import {
  PharosThemeProvider,
  usePharosTheme,
  type PharosTheme,
} from "./PharosThemeProvider";

interface PharosShellProps {
  children: React.ReactNode;
  org: { id: string; name: string };
  role: string;
  profile: {
    id: string;
    authorityType: string;
    jurisdiction: string;
  } | null;
}

const NAV_ITEMS = [
  { href: "/pharos", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pharos/briefing", label: "Tagesbriefing", icon: Calendar },
  { href: "/pharos/operators", label: "Operatoren", icon: Users },
  { href: "/pharos/oversights", label: "Aufsichten", icon: Gavel },
  { href: "/pharos/workflow", label: "Workflows & Fristen", icon: GitBranch },
  { href: "/pharos/approvals", label: "Mitzeichnungen", icon: Scale },
  { href: "/pharos/webhooks", label: "Externe Webhooks", icon: Globe },
  { href: "/pharos/astra", label: "Astra · KI-Assistent", icon: Sparkles },
  { href: "/pharos/transparency", label: "Glass-Box · Live", icon: Eye },
  { href: "/pharos/setup", label: "Profil & Einstellungen", icon: Settings },
];

export default function PharosShell(props: PharosShellProps) {
  return (
    <PharosThemeProvider>
      <PharosShellInner {...props} />
    </PharosThemeProvider>
  );
}

function PharosShellInner({ children, org, role, profile }: PharosShellProps) {
  const pathname = usePathname();
  const needsSetup = profile === null;

  return (
    <div className="pharos-canvas min-h-screen text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top strip */}
      <header className="pharos-header">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950 flex items-center justify-center shadow-[0_4px_12px_-2px_rgba(15,23,42,0.4),inset_0_1px_0_0_rgba(255,255,255,0.12)]">
              <Lightbulb className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="pharos-display text-sm font-semibold">PHAROS</div>
              <div className="text-[10px] tracking-[0.22em] uppercase text-slate-500 dark:text-slate-500 font-medium">
                Aufsichtsplattform
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="text-right">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {org.name}
              </div>
              {profile && (
                <div className="text-[11px] text-slate-500 tracking-wide">
                  {profile.authorityType.replace("_", " ")} ·{" "}
                  {profile.jurisdiction} · {role}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Nav rail */}
        <aside className="pharos-sidebar w-60 min-h-[calc(100vh-57px)] py-4 px-3">
          <nav className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href ||
                (item.href !== "/pharos" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 h-9 rounded-lg text-sm transition-all ${
                    active
                      ? "pharos-nav-active text-slate-900 dark:text-slate-100 font-medium"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}

            {profile && (
              <Link
                href="/pharos/oversights/new"
                className="pharos-btn-primary mt-3 flex items-center gap-2 px-3 h-9 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Aufsicht initiieren
              </Link>
            )}
          </nav>

          <div className="mt-8 pt-4 border-t border-slate-200/60 dark:border-white/5 px-3 text-[10px] tracking-[0.22em] uppercase text-slate-500 dark:text-slate-600 font-semibold">
            Audit · Hash-Chain
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-500 px-3 mt-2 leading-relaxed">
            Jeder Zugriff wird kryptografisch signiert. Operatoren sehen jede
            Abfrage live im eigenen Audit-Log.
          </p>
        </aside>

        {/* Content */}
        <main className="flex-1 px-6 py-6">
          {needsSetup && !pathname.startsWith("/pharos/setup") && (
            <div className="pharos-card mb-5 px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-200">
                  Behörden-Profil nicht konfiguriert
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Lege Aufsichts-Bereich, Jurisdiktion und Kontakt fest, bevor
                  du Aufsichten initiierst.
                </p>
              </div>
              <Link
                href="/pharos/setup"
                className="pharos-btn-primary text-sm px-4 h-8 font-medium inline-flex items-center"
              >
                Profil einrichten
              </Link>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

// ─── Theme Toggle ─────────────────────────────────────────────────────

function ThemeToggle() {
  const { theme, setTheme } = usePharosTheme();
  const options: Array<{
    value: PharosTheme;
    label: string;
    Icon: typeof Sun;
  }> = [
    { value: "light", label: "Hell", Icon: Sun },
    { value: "dark", label: "Dunkel", Icon: Moon },
    { value: "system", label: "System", Icon: Monitor },
  ];
  return (
    <div className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 p-0.5 dark:border-white/10 dark:bg-slate-900/40">
      {options.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            title={label}
            aria-label={`Theme ${label}`}
            aria-pressed={active}
            className={`flex items-center justify-center w-7 h-7 rounded transition-colors ${
              active
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        );
      })}
    </div>
  );
}
