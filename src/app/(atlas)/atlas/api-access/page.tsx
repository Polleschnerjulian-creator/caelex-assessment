import { Key, Copy, Eye, EyeOff, Plus } from "lucide-react";

export default function ApiAccessPage() {
  return (
    <div className="flex flex-col h-full min-h-screen bg-[#0A0F1E] p-4 gap-3">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Key className="h-5 w-5 text-emerald-400" strokeWidth={1.5} />
          <h1 className="text-[18px] font-semibold tracking-tight text-white/90">
            API Access
          </h1>
          <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium tracking-wider text-emerald-400 uppercase">
            Pilot
          </span>
        </div>
        <button className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-[11px] font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors">
          <Plus className="h-3 w-3" strokeWidth={2} />
          Generate Key
        </button>
      </header>

      {/* API Keys section */}
      <div className="rounded-lg border border-white/[0.06] bg-[#0F172A]/40 glass-surface">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            API Keys
          </span>
        </div>
        <div className="p-4">
          <div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[12px] text-slate-200 font-medium">
                  Production Key
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-[11px] text-slate-500 font-mono">
                    atlas_pk_••••••••••••••••••••
                  </code>
                  <button className="text-slate-600 hover:text-slate-400 transition-colors">
                    <Eye className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                  <button className="text-slate-600 hover:text-slate-400 transition-colors">
                    <Copy className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500">Created</span>
                <p className="text-[11px] text-slate-400 font-mono">—</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Endpoints documentation */}
      <div className="rounded-lg border border-white/[0.06] bg-[#0F172A]/40 glass-elevated flex-1">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Available Endpoints
          </span>
        </div>
        <div className="p-4 space-y-1.5">
          {[
            {
              method: "GET",
              path: "/v1/jurisdictions",
              desc: "List all tracked jurisdictions",
            },
            {
              method: "GET",
              path: "/v1/jurisdictions/:code",
              desc: "Jurisdiction detail",
            },
            {
              method: "GET",
              path: "/v1/regulations",
              desc: "Search regulations",
            },
            {
              method: "GET",
              path: "/v1/eu-space-act/articles",
              desc: "EU Space Act articles",
            },
            {
              method: "GET",
              path: "/v1/alerts",
              desc: "Regulatory alerts feed",
            },
            {
              method: "POST",
              path: "/v1/compare",
              desc: "Compare jurisdictions",
            },
          ].map((endpoint) => (
            <div
              key={endpoint.path}
              className="flex items-center h-9 rounded bg-white/[0.02] border border-white/[0.04] px-3 gap-3 group hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              <span
                className={`text-[10px] font-mono font-bold tracking-wider w-10 flex-shrink-0 ${
                  endpoint.method === "GET"
                    ? "text-emerald-400"
                    : "text-amber-400"
                }`}
              >
                {endpoint.method}
              </span>
              <code className="text-[11px] text-slate-300 font-mono flex-shrink-0">
                {endpoint.path}
              </code>
              <span className="text-[10px] text-slate-600 ml-auto">
                {endpoint.desc}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Usage stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Requests Today", value: "—" },
          { label: "Rate Limit", value: "1,000/hr" },
          { label: "Avg Latency", value: "—" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-white/[0.06] bg-[#0F172A]/40 glass-surface px-3 py-2.5"
          >
            <span className="text-[10px] font-medium tracking-wider text-slate-500 uppercase">
              {stat.label}
            </span>
            <div className="mt-1 text-[16px] font-semibold text-white/80 font-mono">
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
