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
    <div className="flex flex-col h-full min-h-screen bg-[#F7F8FA] p-4 gap-3">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Map className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
          <h1 className="text-[18px] font-semibold tracking-tight text-gray-900">
            Jurisdictions
          </h1>
          <span className="text-[11px] text-gray-400 font-mono">
            {JURISDICTIONS.length} tracked
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Active
            <span className="h-2 w-2 rounded-full bg-amber-500 ml-2" />
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
              group relative overflow-hidden rounded-xl border border-gray-200
              bg-white p-3.5 shadow-sm
              hover:border-emerald-300 hover:shadow-md
              transition-all duration-200 cursor-pointer
            "
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[14px] font-mono font-bold text-gray-900 tracking-wider">
                {j.code}
              </span>
              <span
                className={`h-2 w-2 rounded-full ${
                  j.status === "active" ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
            </div>
            <p className="text-[12px] text-gray-700 mb-2">{j.name}</p>
            <div className="flex items-center justify-between text-[10px] text-gray-400">
              <span>{j.regulations} regulations</span>
              <span className="font-mono">{j.lastUpdate}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
