"use client";

import Link from "next/link";
import { Package, Users, Rocket, ArrowRight } from "lucide-react";

const STEPS = [
  {
    icon: Package,
    title: "① Was lieferst du?",
    body: "Artikel anlegen — wird automatisch klassifiziert (ECCN/USML).",
    href: "/trade/items",
  },
  {
    icon: Users,
    title: "② An wen?",
    body: "Partner anlegen — wird automatisch gegen Sanktionslisten gescreent.",
    href: "/trade/parties",
  },
  {
    icon: Rocket,
    title: "③ Darf ich liefern?",
    body: "Geführten Vorgang starten → 🟢 / 🟡 / 🔴 Urteil in einem Flow.",
    href: "/trade/operations/new",
  },
] as const;

export function HomeOnboarding() {
  return (
    <section data-testid="home-onboarding" className="space-y-5">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-500 px-6 py-5 shadow-[0_8px_30px_rgba(79,70,229,0.35)]">
        <div className="text-[10px] font-medium uppercase tracking-wide text-white/80">
          Erste Schritte
        </div>
        <div className="mt-1 text-lg font-semibold text-white">
          Willkommen bei Caelex Trade 👋
        </div>
        <div className="text-sm text-white/90">
          Lass uns deinen ersten Ausfuhrvorgang prüfen — in drei Schritten.
        </div>
      </div>

      <ol className="space-y-2">
        {STEPS.map((s) => (
          <li key={s.title}>
            <Link
              href={s.href}
              className="flex items-center gap-3 rounded-lg border border-trade-border bg-trade-bg-panel px-4 py-3 transition hover:bg-trade-hover"
            >
              <s.icon className="h-5 w-5 text-trade-accent" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-trade-text-primary">
                  {s.title}
                </div>
                <div className="text-xs text-trade-text-muted">{s.body}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-trade-text-muted" />
            </Link>
          </li>
        ))}
      </ol>

      <Link
        href="/trade/operations/new"
        className="inline-flex items-center gap-2 rounded-lg bg-trade-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-trade-accent-strong"
      >
        Ersten Vorgang starten
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
