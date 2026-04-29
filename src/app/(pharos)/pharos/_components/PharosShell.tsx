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
  Eye,
  Gavel,
  GitBranch,
  LayoutDashboard,
  Lightbulb,
  Monitor,
  Moon,
  Plus,
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
  { href: "/pharos/operators", label: "Operatoren", icon: Users },
  { href: "/pharos/oversights", label: "Aufsichten", icon: Gavel },
  { href: "/pharos/workflow", label: "Workflows & Fristen", icon: GitBranch },
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
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-navy-950 dark:text-slate-100 transition-colors">
      {/* Top strip */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm dark:border-white/5 dark:bg-navy-900/40">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-sm">
              <Lightbulb className="w-4 h-4 text-amber-950" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">PHAROS</div>
              <div className="text-[10px] tracking-[0.2em] uppercase text-slate-500 dark:text-slate-500">
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
                <div className="text-[11px] text-slate-500">
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
        <aside className="w-60 border-r border-slate-200 bg-white min-h-[calc(100vh-57px)] py-4 px-3 dark:border-white/5 dark:bg-navy-900/30">
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
                  className={`flex items-center gap-2.5 px-3 h-9 rounded-md text-sm transition-colors ${
                    active
                      ? "bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/20"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/[0.04]"
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
                className="mt-3 flex items-center gap-2 px-3 h-9 rounded-md bg-amber-500 hover:bg-amber-400 text-amber-950 text-sm font-medium transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Aufsicht initiieren
              </Link>
            )}
          </nav>

          <div className="mt-8 pt-4 border-t border-slate-200 dark:border-white/5 px-3 text-[10px] tracking-[0.18em] uppercase text-slate-500 dark:text-slate-600">
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
            <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-center justify-between dark:border-amber-500/30 dark:bg-amber-500/10">
              <div>
                <div className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  Behörden-Profil nicht konfiguriert
                </div>
                <p className="text-xs text-amber-800/80 dark:text-amber-100/70 mt-0.5">
                  Lege Aufsichts-Bereich, Jurisdiktion und Kontakt fest, bevor
                  du Aufsichten initiierst.
                </p>
              </div>
              <Link
                href="/pharos/setup"
                className="text-sm px-3 h-8 rounded-md bg-amber-500 hover:bg-amber-400 text-amber-950 font-medium inline-flex items-center"
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
    <div className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 p-0.5 dark:border-white/10 dark:bg-navy-900/40">
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
                ? "bg-white text-slate-900 shadow-sm dark:bg-navy-700 dark:text-slate-100"
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
