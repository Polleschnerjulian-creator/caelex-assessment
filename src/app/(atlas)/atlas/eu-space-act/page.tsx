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
    <div className="flex flex-col h-full min-h-screen bg-[#F7F8FA] p-4 gap-3">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ScrollText className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
          <h1 className="text-[18px] font-semibold tracking-tight text-gray-900">
            EU Space Act
          </h1>
          <span className="text-[11px] text-gray-400 font-mono">
            COM(2025) 335
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md bg-white border border-gray-200 px-2.5 py-1.5 shadow-sm">
            <Search className="h-3 w-3 text-gray-400" strokeWidth={1.5} />
            <span className="text-[11px] text-gray-400">
              Search articles...
            </span>
          </div>
          <button className="flex items-center gap-1.5 rounded-md bg-white border border-gray-200 px-2.5 py-1.5 text-gray-500 hover:text-gray-700 transition-colors shadow-sm">
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
              group relative overflow-hidden rounded-xl border border-gray-200
              bg-white p-4 shadow-sm
              hover:border-emerald-300 hover:shadow-md
              transition-all duration-200 cursor-pointer
            "
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-bold text-emerald-600 tracking-wider">
                Chapter {ch.num}
              </span>
              <span
                className={`rounded px-1.5 py-0.5 text-[9px] font-medium tracking-wider uppercase ${
                  ch.status === "final"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {ch.status}
              </span>
            </div>
            <h3 className="text-[13px] font-medium text-gray-900 mb-1">
              {ch.title}
            </h3>
            <span className="text-[10px] text-gray-400 font-mono">
              Articles {ch.articles}
            </span>
          </div>
        ))}
      </div>

      {/* Article browser skeleton */}
      <div className="flex-1 rounded-xl border border-gray-200 bg-white shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
            Article Browser
          </span>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <ScrollText
              className="h-8 w-8 text-emerald-200 mx-auto mb-3"
              strokeWidth={1}
            />
            <p className="text-[12px] text-gray-500">
              Select a chapter to browse its articles.
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              Full-text article viewer with compliance mapping and
              cross-references.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
