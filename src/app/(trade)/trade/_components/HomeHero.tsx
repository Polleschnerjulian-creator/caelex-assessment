"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { HeroState } from "@/lib/trade/home-hero";

/** Severity → status-dot colour (Neon style: colour is a small signal, not a
 *  full-bleed gradient). */
const SEVERITY_DOT: Record<"critical" | "warning" | "info", string> = {
  critical: "var(--trade-accent-danger)",
  warning: "var(--trade-accent-warn)",
  info: "var(--trade-accent-success)",
};

export function HomeHero({ state }: { state: HeroState }) {
  // Onboarding is rendered by HomeOnboarding, not here.
  if (state.variant === "onboarding") return null;

  const severity = state.variant === "action" ? state.severity : "info";
  const dot = SEVERITY_DOT[severity];
  const label = state.variant === "action" ? "Nächste Aktion" : "Status";

  return (
    <div
      data-testid="home-hero"
      className="rounded-xl border border-trade-border bg-trade-bg-panel px-5 py-4 shadow-[var(--trade-shadow-card)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-trade-text-muted">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: dot }}
              aria-hidden="true"
            />
            {label}
          </div>
          <div className="mt-1.5 text-[15px] font-semibold text-trade-text-primary">
            {state.title}
          </div>
          <div className="mt-0.5 text-[13px] text-trade-text-muted">
            {state.subtitle}
          </div>
        </div>
        <Link
          href={state.cta.href}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-trade-text-primary px-4 text-[13px] font-medium text-trade-bg-panel transition hover:opacity-90"
        >
          {state.cta.label}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
