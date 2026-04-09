"use client";

import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import RegulatoryMap from "@/components/atlas/RegulatoryMap";
import LiveFeed from "@/components/atlas/LiveFeed";
import QuickStats from "@/components/atlas/QuickStats";

export default function CommandCenterPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#0A0F1E] p-4 gap-3">
      {/* ─── Header bar ─── */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-emerald-400" strokeWidth={1.5} />
            <h1 className="text-[18px] font-semibold tracking-tight text-white/90">
              Command Center
            </h1>
          </div>
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-medium tracking-wider text-emerald-400 uppercase">
            Live
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          ATLAS v1.0 &mdash; Pilot
        </div>
      </header>

      {/* ─── Quick Stats ─── */}
      <QuickStats />

      {/* ─── Main grid: Map + Feed ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0">
        {/* Map area */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-lg border border-white/[0.06] bg-[#0F172A]/40 backdrop-blur-sm glass-elevated">
          <div className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                European Regulatory Map
              </span>
              <span className="text-[10px] text-slate-600 font-mono">
                19 Jurisdictions Tracked
              </span>
            </div>
            <div className="flex-1 min-h-[400px]">
              <RegulatoryMap
                onCountryClick={(code) =>
                  router.push(`/atlas/jurisdictions/${code}`)
                }
              />
            </div>
          </div>
        </div>

        {/* Feed area */}
        <div className="relative overflow-hidden rounded-lg border border-white/[0.06] bg-[#0F172A]/40 backdrop-blur-sm glass-surface flex flex-col min-h-[500px]">
          <LiveFeed />
        </div>
      </div>

      {/* ─── Legal Disclaimer ─── */}
      <footer className="text-[9px] text-slate-600 text-center px-8 leading-relaxed">
        ATLAS is an information tool, not legal advice. Caelex assumes no
        guarantee for completeness, accuracy, or timeliness. Usage does not
        replace individual legal advice from a qualified law firm.
      </footer>
    </div>
  );
}
