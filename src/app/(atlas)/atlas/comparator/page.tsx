"use client";

import { useState } from "react";
import { BarChart3, Layers } from "lucide-react";
import type { SpaceLawCountryCode } from "@/lib/space-law-types";
import CountrySelector from "@/components/atlas/CountrySelector";
import ComparisonTable from "@/components/atlas/ComparisonTable";

// ─── Dimension tabs ───

const DIMENSIONS = [
  { key: "all", label: "All Dimensions" },
  { key: "authorization", label: "Authorization & Licensing" },
  { key: "liability", label: "Liability & Insurance" },
  { key: "debris", label: "Debris Mitigation" },
  { key: "registration", label: "Registration" },
  { key: "timeline", label: "Timeline & Costs" },
  { key: "eu_readiness", label: "EU Space Act Readiness" },
] as const;

const DEFAULT_COUNTRIES: SpaceLawCountryCode[] = ["FR", "DE", "UK"];

export default function ComparatorPage() {
  const [selected, setSelected] =
    useState<SpaceLawCountryCode[]>(DEFAULT_COUNTRIES);
  const [dimension, setDimension] = useState<string>("all");

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#0A0F1E] p-4 gap-3">
      {/* ─── Header ─── */}
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-emerald-400" strokeWidth={1.5} />
          <h1 className="text-[18px] font-semibold tracking-tight text-white/90">
            Regulatory Comparator
          </h1>
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-medium tracking-wider text-emerald-400 uppercase">
            19 Jurisdictions
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
          <Layers className="h-3 w-3" strokeWidth={1.5} />
          <span>{selected.length} selected</span>
          <span className="text-slate-700">|</span>
          <span>
            {DIMENSIONS.find((d) => d.key === dimension)?.label || "All"}
          </span>
        </div>
      </header>

      {/* ─── Country Selector Bar ─── */}
      <div className="rounded-lg border border-white/[0.06] bg-[#0F172A]/60 p-3 glass-surface">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
            Jurisdictions
          </span>
        </div>
        <CountrySelector selected={selected} onChange={setSelected} />
      </div>

      {/* ─── Dimension Tabs ─── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5 -mx-1 px-1">
        {DIMENSIONS.map((dim) => (
          <button
            key={dim.key}
            onClick={() => setDimension(dim.key)}
            className={`
              flex-shrink-0 rounded-md px-3 py-1.5 text-[11px] font-medium
              border transition-all duration-150
              ${
                dimension === dim.key
                  ? "bg-emerald-500/[0.12] border-emerald-500/25 text-emerald-400"
                  : "bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-slate-200 hover:border-white/[0.10] hover:bg-white/[0.04]"
              }
            `}
          >
            {dim.label}
          </button>
        ))}
      </div>

      {/* ─── Comparison Table ─── */}
      <div className="flex-1 rounded-lg border border-white/[0.06] bg-[#0F172A]/40 glass-elevated overflow-hidden">
        <ComparisonTable countries={selected} dimension={dimension} />
      </div>
    </div>
  );
}
