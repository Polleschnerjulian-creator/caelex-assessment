import { Map } from "lucide-react";

const JURISDICTIONS = [
  {
    code: "EU",
    name: "European Union",
    status: "active",
    regulations: 14,
    lastUpdate: "2d ago",
  },
  {
    code: "DE",
    name: "Germany",
    status: "active",
    regulations: 8,
    lastUpdate: "5d ago",
  },
  {
    code: "FR",
    name: "France",
    status: "active",
    regulations: 11,
    lastUpdate: "1w ago",
  },
  {
    code: "UK",
    name: "United Kingdom",
    status: "active",
    regulations: 9,
    lastUpdate: "3d ago",
  },
  {
    code: "LU",
    name: "Luxembourg",
    status: "active",
    regulations: 6,
    lastUpdate: "2w ago",
  },
  {
    code: "NL",
    name: "Netherlands",
    status: "active",
    regulations: 5,
    lastUpdate: "1w ago",
  },
  {
    code: "IT",
    name: "Italy",
    status: "partial",
    regulations: 7,
    lastUpdate: "3w ago",
  },
  {
    code: "US",
    name: "United States",
    status: "active",
    regulations: 18,
    lastUpdate: "1d ago",
  },
  {
    code: "JP",
    name: "Japan",
    status: "partial",
    regulations: 4,
    lastUpdate: "1m ago",
  },
  {
    code: "AU",
    name: "Australia",
    status: "active",
    regulations: 6,
    lastUpdate: "2w ago",
  },
  {
    code: "NO",
    name: "Norway",
    status: "partial",
    regulations: 3,
    lastUpdate: "1m ago",
  },
  {
    code: "SE",
    name: "Sweden",
    status: "partial",
    regulations: 3,
    lastUpdate: "1m ago",
  },
];

export default function JurisdictionsPage() {
  return (
    <div className="flex flex-col h-full min-h-screen bg-[#0A0F1E] p-4 gap-3">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Map className="h-5 w-5 text-emerald-400" strokeWidth={1.5} />
          <h1 className="text-[18px] font-semibold tracking-tight text-white/90">
            Jurisdictions
          </h1>
          <span className="text-[11px] text-slate-500 font-mono">
            {JURISDICTIONS.length} tracked
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-400/60" />
            Active
            <span className="h-2 w-2 rounded-full bg-amber-400/60 ml-2" />
            Partial
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {JURISDICTIONS.map((j) => (
          <a
            key={j.code}
            href={`/atlas/jurisdictions/${j.code.toLowerCase()}`}
            className="
              group relative overflow-hidden rounded-lg border border-white/[0.06]
              bg-[#0F172A]/40 p-3.5
              hover:border-emerald-500/20 hover:bg-emerald-500/[0.03]
              transition-all duration-200 cursor-pointer
              glass-surface glass-interactive
            "
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[14px] font-mono font-bold text-white/80 tracking-wider">
                {j.code}
              </span>
              <span
                className={`h-2 w-2 rounded-full ${
                  j.status === "active" ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
            </div>
            <p className="text-[12px] text-slate-300 mb-2">{j.name}</p>
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>{j.regulations} regulations</span>
              <span className="font-mono">{j.lastUpdate}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
