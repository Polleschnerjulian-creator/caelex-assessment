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
    <div className="flex flex-col h-full min-h-screen bg-[#0A0F1E] p-4 gap-3">
      <header className="flex items-center gap-3">
        <Shield className="h-5 w-5 text-emerald-400" strokeWidth={1.5} />
        <h1 className="text-[18px] font-semibold tracking-tight text-white/90">
          Cyber Standards
        </h1>
        <span className="rounded bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 text-[10px] font-medium tracking-wider text-slate-500 uppercase">
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
                group relative overflow-hidden rounded-lg border border-white/[0.06]
                bg-[#0F172A]/40 p-4
                hover:border-emerald-500/20 hover:bg-emerald-500/[0.03]
                transition-all duration-200 cursor-pointer
                glass-surface glass-interactive
              "
            >
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/10 flex-shrink-0">
                  <Icon
                    className="h-4 w-4 text-emerald-400"
                    strokeWidth={1.5}
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[13px] font-medium text-slate-200">
                    {fw.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-slate-500">
                      {fw.scope}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
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
      <div className="flex-1 rounded-lg border border-white/[0.06] bg-[#0F172A]/40 glass-elevated p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Control Mapping Matrix
          </span>
          <span className="text-[10px] text-slate-600 font-mono">
            Cross-framework alignment
          </span>
        </div>

        <div className="space-y-1.5">
          {["Identify", "Protect", "Detect", "Respond", "Recover"].map((fn) => (
            <div
              key={fn}
              className="flex items-center h-9 rounded bg-white/[0.02] border border-white/[0.04] px-3 gap-3"
            >
              <span className="text-[11px] text-emerald-400/70 font-medium w-20 flex-shrink-0">
                {fn}
              </span>
              <div className="flex-1 flex items-center gap-1">
                {Array.from({ length: Math.floor(Math.random() * 8) + 3 }).map(
                  (_, i) => (
                    <div
                      key={i}
                      className="h-2 rounded-sm bg-emerald-500/20"
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
