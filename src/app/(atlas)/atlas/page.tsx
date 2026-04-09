"use client";

import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import JurisdictionTable from "@/components/atlas/JurisdictionTable";
import LiveFeed from "@/components/atlas/LiveFeed";
import QuickStats from "@/components/atlas/QuickStats";

export default function CommandCenterPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#F7F8FA] p-4 gap-3">
      {/* ─── Header bar ─── */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
            <h1 className="text-[18px] font-semibold tracking-tight text-gray-900">
              Command Center
            </h1>
          </div>
          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-medium tracking-wider text-emerald-700 uppercase">
            Live
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          ATLAS v1.0 &mdash; Pilot
        </div>
      </header>

      {/* ─── Quick Stats ─── */}
      <QuickStats />

      {/* ─── Main grid: Jurisdiction Table + Feed ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0">
        {/* Jurisdiction Table */}
        <div className="lg:col-span-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col min-h-[500px]">
          <JurisdictionTable
            onCountryClick={(code) =>
              router.push(`/atlas/jurisdictions/${code}`)
            }
          />
        </div>

        {/* Feed area */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col min-h-[500px]">
          <LiveFeed />
        </div>
      </div>

      {/* ─── Legal Disclaimer ─── */}
      <footer className="text-[9px] text-gray-400 text-center px-8 leading-relaxed">
        ATLAS is an information tool, not legal advice. Caelex assumes no
        guarantee for completeness, accuracy, or timeliness. Usage does not
        replace individual legal advice from a qualified law firm.
      </footer>
    </div>
  );
}
