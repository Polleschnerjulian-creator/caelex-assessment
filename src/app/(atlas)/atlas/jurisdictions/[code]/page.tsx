import { Map, ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

interface JurisdictionDetailPageProps {
  params: Promise<{ code: string }>;
}

export default async function JurisdictionDetailPage({
  params,
}: JurisdictionDetailPageProps) {
  const { code } = await params;
  const displayCode = code.toUpperCase();

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#0A0F1E] p-4 gap-3">
      <header className="flex items-center gap-3">
        <Link
          href="/atlas/jurisdictions"
          className="flex items-center justify-center h-7 w-7 rounded-md bg-white/[0.04] border border-white/[0.06] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
        </Link>
        <Map className="h-5 w-5 text-emerald-400" strokeWidth={1.5} />
        <h1 className="text-[18px] font-semibold tracking-tight text-white/90">
          {displayCode}
        </h1>
        <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium tracking-wider text-emerald-400 uppercase">
          Active
        </span>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0">
        {/* Regulatory overview */}
        <div className="lg:col-span-2 rounded-lg border border-white/[0.06] bg-[#0F172A]/40 glass-elevated flex flex-col">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Regulatory Framework
            </span>
            <ExternalLink
              className="h-3 w-3 text-slate-600"
              strokeWidth={1.5}
            />
          </div>
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <span className="text-[48px] font-mono font-bold text-white/[0.06]">
                {displayCode}
              </span>
              <p className="text-[12px] text-slate-500 mt-2">
                Detailed regulatory framework analysis for {displayCode} will be
                populated from the data layer.
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar info */}
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-white/[0.06] bg-[#0F172A]/40 glass-surface p-4">
            <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
              Quick Facts
            </span>
            <div className="mt-3 space-y-2">
              {[
                { label: "Regime Type", value: "Licensing" },
                { label: "National Authority", value: "TBD" },
                { label: "Space Treaty", value: "Ratified" },
                { label: "Liability Convention", value: "Ratified" },
                { label: "Registration Convention", value: "Ratified" },
              ].map((fact) => (
                <div
                  key={fact.label}
                  className="flex items-center justify-between"
                >
                  <span className="text-[11px] text-slate-500">
                    {fact.label}
                  </span>
                  <span className="text-[11px] text-slate-300 font-medium">
                    {fact.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-[#0F172A]/40 glass-surface p-4">
            <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
              Recent Changes
            </span>
            <div className="mt-3 text-center py-4">
              <p className="text-[11px] text-slate-600">
                No recent changes tracked.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
