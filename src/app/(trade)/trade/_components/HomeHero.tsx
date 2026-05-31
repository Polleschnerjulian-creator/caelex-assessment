"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { HeroState } from "@/lib/trade/home-hero";

const SEVERITY_GLOW: Record<"critical" | "warning" | "info", string> = {
  critical:
    "from-red-600/90 to-rose-600/80 shadow-[0_8px_30px_rgba(220,38,38,0.35)]",
  warning:
    "from-amber-600/90 to-orange-600/80 shadow-[0_8px_30px_rgba(217,119,6,0.30)]",
  info: "from-indigo-600 to-indigo-500 shadow-[0_8px_30px_rgba(79,70,229,0.35)]",
};

export function HomeHero({ state }: { state: HeroState }) {
  // Onboarding is rendered by HomeOnboarding, not here.
  if (state.variant === "onboarding") return null;

  const gradient =
    state.variant === "action"
      ? SEVERITY_GLOW[state.severity]
      : "from-indigo-600 to-indigo-500 shadow-[0_8px_30px_rgba(79,70,229,0.35)]";

  const label = state.variant === "action" ? "Deine nächste Aktion" : "Status";

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${gradient} px-5 py-4`}
      data-testid="home-hero"
    >
      <div className="text-[10px] font-medium uppercase tracking-wide text-white/80">
        {label}
      </div>
      <div className="mt-1 text-base font-semibold text-white">
        {state.title}
      </div>
      <div className="text-xs text-white/90">{state.subtitle}</div>
      <Link
        href={state.cta.href}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-white/90"
      >
        {state.cta.label}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
