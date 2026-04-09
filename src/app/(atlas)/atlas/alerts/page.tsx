import { Bell, AlertTriangle, Info, CheckCircle2 } from "lucide-react";

const SAMPLE_ALERTS = [
  {
    id: 1,
    severity: "critical",
    title:
      "EU Space Act Article 42 amendment — public consultation closes in 3 days",
    source: "European Commission",
    time: "2h ago",
    read: false,
  },
  {
    id: 2,
    severity: "high",
    title:
      "NIS2 implementing act deadline approaching — space sector obligations",
    source: "ENISA",
    time: "6h ago",
    read: false,
  },
  {
    id: 3,
    severity: "medium",
    title: "Luxembourg updates space resource utilization framework",
    source: "Luxembourg Space Agency",
    time: "1d ago",
    read: true,
  },
  {
    id: 4,
    severity: "low",
    title: "COPUOS guidelines on long-term sustainability — new working paper",
    source: "UN COPUOS",
    time: "2d ago",
    read: true,
  },
  {
    id: 5,
    severity: "medium",
    title: "UK CAA publishes updated orbital licensing guidance",
    source: "UK Civil Aviation Authority",
    time: "3d ago",
    read: true,
  },
];

const SEVERITY_CONFIG = {
  critical: {
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    icon: AlertTriangle,
  },
  high: {
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    icon: AlertTriangle,
  },
  medium: {
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    icon: Info,
  },
  low: {
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
    icon: CheckCircle2,
  },
} as const;

export default function AlertsPage() {
  return (
    <div className="flex flex-col h-full min-h-screen bg-[#0A0F1E] p-4 gap-3">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-emerald-400" strokeWidth={1.5} />
          <h1 className="text-[18px] font-semibold tracking-tight text-white/90">
            Alerts
          </h1>
          <span className="rounded-full bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-400 tabular-nums">
            2 unread
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-md bg-white/[0.04] border border-white/[0.06] px-2.5 py-1.5 text-[11px] text-slate-400 hover:text-slate-200 transition-colors">
            Mark all read
          </button>
          <button className="rounded-md bg-white/[0.04] border border-white/[0.06] px-2.5 py-1.5 text-[11px] text-slate-400 hover:text-slate-200 transition-colors">
            Preferences
          </button>
        </div>
      </header>

      {/* Alert list */}
      <div className="flex-1 space-y-1.5">
        {SAMPLE_ALERTS.map((alert) => {
          const config =
            SEVERITY_CONFIG[alert.severity as keyof typeof SEVERITY_CONFIG];
          const Icon = config.icon;
          return (
            <div
              key={alert.id}
              className={`
                group relative overflow-hidden rounded-lg border px-4 py-3
                transition-all duration-200 cursor-pointer
                ${
                  alert.read
                    ? "border-white/[0.04] bg-[#0F172A]/30"
                    : "border-white/[0.08] bg-[#0F172A]/60"
                }
                hover:bg-white/[0.04]
              `}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex items-center justify-center h-7 w-7 rounded-md ${config.bg} ${config.border} border flex-shrink-0 mt-0.5`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 ${config.color}`}
                    strokeWidth={1.5}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className={`text-[9px] font-semibold tracking-wider uppercase ${config.color}`}
                    >
                      {alert.severity}
                    </span>
                    {!alert.read && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    )}
                  </div>
                  <p
                    className={`text-[12px] leading-relaxed ${alert.read ? "text-slate-400" : "text-slate-200"}`}
                  >
                    {alert.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-slate-600">
                      {alert.source}
                    </span>
                    <span className="text-[10px] text-slate-600 font-mono">
                      {alert.time}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
