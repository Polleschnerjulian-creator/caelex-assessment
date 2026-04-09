import { Key, Copy, Eye, EyeOff, Plus } from "lucide-react";

export default function ApiAccessPage() {
  return (
    <div className="flex flex-col h-full min-h-screen bg-[#F7F8FA] p-4 gap-3">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Key className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
          <h1 className="text-[18px] font-semibold tracking-tight text-gray-900">
            API Access
          </h1>
          <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-medium tracking-wider text-emerald-700 uppercase">
            Pilot
          </span>
        </div>
        <button className="flex items-center gap-1.5 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 transition-colors">
          <Plus className="h-3 w-3" strokeWidth={2} />
          Generate Key
        </button>
      </header>

      {/* API Keys section */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200">
          <span className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
            API Keys
          </span>
        </div>
        <div className="p-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[12px] text-gray-900 font-medium">
                  Production Key
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-[11px] text-gray-400 font-mono">
                    atlas_pk_••••••••••••••••••••
                  </code>
                  <button className="text-gray-400 hover:text-gray-600 transition-colors">
                    <Eye className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                  <button className="text-gray-400 hover:text-gray-600 transition-colors">
                    <Copy className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-400">Created</span>
                <p className="text-[11px] text-gray-500 font-mono">&mdash;</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Endpoints documentation */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm flex-1">
        <div className="px-4 py-3 border-b border-gray-200">
          <span className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
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
              className="flex items-center h-9 rounded-lg bg-gray-50 border border-gray-100 px-3 gap-3 group hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <span
                className={`text-[10px] font-mono font-bold tracking-wider w-10 flex-shrink-0 ${
                  endpoint.method === "GET"
                    ? "text-emerald-600"
                    : "text-amber-600"
                }`}
              >
                {endpoint.method}
              </span>
              <code className="text-[11px] text-gray-700 font-mono flex-shrink-0">
                {endpoint.path}
              </code>
              <span className="text-[10px] text-gray-400 ml-auto">
                {endpoint.desc}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Usage stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Requests Today", value: "\u2014" },
          { label: "Rate Limit", value: "1,000/hr" },
          { label: "Avg Latency", value: "\u2014" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white shadow-sm px-3 py-2.5"
          >
            <span className="text-[10px] font-medium tracking-wider text-gray-400 uppercase">
              {stat.label}
            </span>
            <div className="mt-1 text-[16px] font-semibold text-gray-900 font-mono">
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
