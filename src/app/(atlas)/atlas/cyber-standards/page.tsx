import { Shield, Lock, Server, Wifi } from "lucide-react";

const FRAMEWORKS = [
  { name: "NIS2 Directive", scope: "EU-wide", controls: 51, icon: "shield" },
  {
    name: "ENISA Space Threat Landscape",
    scope: "Advisory",
    controls: 34,
    icon: "lock",
  },
  { name: "IEC 62443", scope: "Industrial", controls: 62, icon: "server" },
  { name: "NIST CSF 2.0", scope: "US / Int'l", controls: 108, icon: "wifi" },
];

const ICON_MAP = {
  shield: Shield,
  lock: Lock,
  server: Server,
  wifi: Wifi,
} as const;

export default function CyberStandardsPage() {
  return (
    <div className="flex flex-col h-full min-h-screen bg-[#F7F8FA] p-4 gap-3">
      <header className="flex items-center gap-3">
        <Shield className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
        <h1 className="text-[18px] font-semibold tracking-tight text-gray-900">
          Cyber Standards
        </h1>
        <span className="rounded bg-gray-100 border border-gray-200 px-2 py-0.5 text-[10px] font-medium tracking-wider text-gray-500 uppercase">
          4 Frameworks
        </span>
      </header>

      {/* Framework cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {FRAMEWORKS.map((fw) => {
          const Icon = ICON_MAP[fw.icon as keyof typeof ICON_MAP];
          return (
            <div
              key={fw.name}
              className="
                group relative overflow-hidden rounded-xl border border-gray-200
                bg-white p-4 shadow-sm
                hover:border-emerald-300 hover:shadow-md
                transition-all duration-200 cursor-pointer
              "
            >
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-emerald-50 border border-emerald-200 flex-shrink-0">
                  <Icon
                    className="h-4 w-4 text-emerald-600"
                    strokeWidth={1.5}
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[13px] font-medium text-gray-900">
                    {fw.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-gray-400">
                      {fw.scope}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {fw.controls} controls
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Control matrix skeleton */}
      <div className="flex-1 rounded-xl border border-gray-200 bg-white shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
            Control Mapping Matrix
          </span>
          <span className="text-[10px] text-gray-400 font-mono">
            Cross-framework alignment
          </span>
        </div>

        <div className="space-y-1.5">
          {["Identify", "Protect", "Detect", "Respond", "Recover"].map((fn) => (
            <div
              key={fn}
              className="flex items-center h-9 rounded-lg bg-gray-50 border border-gray-100 px-3 gap-3"
            >
              <span className="text-[11px] text-emerald-600 font-medium w-20 flex-shrink-0">
                {fn}
              </span>
              <div className="flex-1 flex items-center gap-1">
                {Array.from({ length: Math.floor(Math.random() * 8) + 3 }).map(
                  (_, i) => (
                    <div
                      key={i}
                      className="h-2 rounded-sm bg-emerald-200"
                      style={{ width: `${Math.random() * 40 + 10}px` }}
                    />
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
