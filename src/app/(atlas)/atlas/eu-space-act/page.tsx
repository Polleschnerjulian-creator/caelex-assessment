import { ScrollText, Search, Filter } from "lucide-react";

const CHAPTERS = [
  { num: "I", title: "General Provisions", articles: "1-5", status: "final" },
  {
    num: "II",
    title: "Authorization & Supervision",
    articles: "6-25",
    status: "final",
  },
  { num: "III", title: "Registration", articles: "26-35", status: "final" },
  {
    num: "IV",
    title: "Safety & Sustainability",
    articles: "36-55",
    status: "final",
  },
  {
    num: "V",
    title: "Insurance & Liability",
    articles: "56-70",
    status: "final",
  },
  { num: "VI", title: "Cybersecurity", articles: "71-85", status: "draft" },
  {
    num: "VII",
    title: "Space Traffic Management",
    articles: "86-100",
    status: "draft",
  },
  {
    num: "VIII",
    title: "Institutional Framework",
    articles: "101-110",
    status: "final",
  },
  {
    num: "IX",
    title: "Final Provisions",
    articles: "111-119",
    status: "final",
  },
];

export default function EUSpaceActPage() {
  return (
    <div className="flex flex-col h-full min-h-screen bg-[#0A0F1E] p-4 gap-3">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ScrollText className="h-5 w-5 text-emerald-400" strokeWidth={1.5} />
          <h1 className="text-[18px] font-semibold tracking-tight text-white/90">
            EU Space Act
          </h1>
          <span className="text-[11px] text-slate-500 font-mono">
            COM(2025) 335
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md bg-white/[0.04] border border-white/[0.06] px-2.5 py-1.5">
            <Search className="h-3 w-3 text-slate-500" strokeWidth={1.5} />
            <span className="text-[11px] text-slate-600">
              Search articles...
            </span>
          </div>
          <button className="flex items-center gap-1.5 rounded-md bg-white/[0.04] border border-white/[0.06] px-2.5 py-1.5 text-slate-500 hover:text-slate-300 transition-colors">
            <Filter className="h-3 w-3" strokeWidth={1.5} />
            <span className="text-[11px]">Filter</span>
          </button>
        </div>
      </header>

      {/* Chapter grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {CHAPTERS.map((ch) => (
          <div
            key={ch.num}
            className="
              group relative overflow-hidden rounded-lg border border-white/[0.06]
              bg-[#0F172A]/40 p-4
              hover:border-emerald-500/20 hover:bg-emerald-500/[0.03]
              transition-all duration-200 cursor-pointer
              glass-surface glass-interactive
            "
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-bold text-emerald-500/60 tracking-wider">
                Chapter {ch.num}
              </span>
              <span
                className={`rounded px-1.5 py-0.5 text-[9px] font-medium tracking-wider uppercase ${
                  ch.status === "final"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }`}
              >
                {ch.status}
              </span>
            </div>
            <h3 className="text-[13px] font-medium text-slate-200 mb-1">
              {ch.title}
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">
              Articles {ch.articles}
            </span>
          </div>
        ))}
      </div>

      {/* Article browser skeleton */}
      <div className="flex-1 rounded-lg border border-white/[0.06] bg-[#0F172A]/40 glass-elevated p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Article Browser
          </span>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <ScrollText
              className="h-8 w-8 text-emerald-500/15 mx-auto mb-3"
              strokeWidth={1}
            />
            <p className="text-[12px] text-slate-500">
              Select a chapter to browse its articles.
            </p>
            <p className="text-[11px] text-slate-600 mt-1">
              Full-text article viewer with compliance mapping and
              cross-references.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
