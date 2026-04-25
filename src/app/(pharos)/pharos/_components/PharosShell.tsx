"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PharosShell — workspace chrome for the authority-side UI.
 *
 * Layout: 240px nav rail on the left, content fills the rest. Top
 * strip carries the org name + role badge. A persistent "Setup"
 * banner appears if the AuthorityProfile hasn't been created yet
 * (drives compliance officers to /pharos/setup before anything else).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Gavel,
  Settings,
  Plus,
  Lightbulb,
  Sparkles,
} from "lucide-react";

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
  {
    href: "/pharos",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/pharos/operators",
    label: "Operatoren",
    icon: Users,
  },
  {
    href: "/pharos/oversights",
    label: "Aufsichten",
    icon: Gavel,
  },
  {
    href: "/pharos/astra",
    label: "Astra · KI-Assistent",
    icon: Sparkles,
  },
  {
    href: "/pharos/setup",
    label: "Profil & Einstellungen",
    icon: Settings,
  },
];

export default function PharosShell({
  children,
  org,
  role,
  profile,
}: PharosShellProps) {
  const pathname = usePathname();
  const needsSetup = profile === null;

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100">
      {/* Top strip */}
      <header className="border-b border-white/5 bg-navy-900/40 backdrop-blur-sm">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-amber-950" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">PHAROS</div>
              <div className="text-[10px] tracking-[0.2em] uppercase text-slate-500">
                Aufsichtsplattform
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium text-slate-200">
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
        <aside className="w-60 border-r border-white/5 bg-navy-900/30 min-h-[calc(100vh-57px)] py-4 px-3">
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
                      ? "bg-amber-500/15 text-amber-200 border border-amber-500/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
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
                className="mt-3 flex items-center gap-2 px-3 h-9 rounded-md bg-amber-500 hover:bg-amber-400 text-amber-950 text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Aufsicht initiieren
              </Link>
            )}
          </nav>

          <div className="mt-8 pt-4 border-t border-white/5 px-3 text-[10px] tracking-[0.18em] uppercase text-slate-600">
            Audit · Hash-Chain
          </div>
          <p className="text-[11px] text-slate-500 px-3 mt-2 leading-relaxed">
            Jeder Zugriff wird kryptografisch signiert. Operatoren sehen jede
            Abfrage live im eigenen Audit-Log.
          </p>
        </aside>

        {/* Content */}
        <main className="flex-1 px-6 py-6">
          {needsSetup && !pathname.startsWith("/pharos/setup") && (
            <div className="mb-5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-amber-200">
                  Behörden-Profil nicht konfiguriert
                </div>
                <p className="text-xs text-amber-100/70 mt-0.5">
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
