import { Settings, User, Bell, Palette, Database, Shield } from "lucide-react";

const SETTINGS_SECTIONS = [
  {
    title: "Profile",
    icon: User,
    items: [
      { label: "Display Name", value: "—", type: "text" },
      { label: "Email", value: "—", type: "text" },
      { label: "Organization", value: "—", type: "text" },
    ],
  },
  {
    title: "Notifications",
    icon: Bell,
    items: [
      { label: "Regulatory Alerts", value: "Enabled", type: "toggle" },
      { label: "Compliance Deadlines", value: "Enabled", type: "toggle" },
      { label: "API Usage Alerts", value: "Disabled", type: "toggle" },
      { label: "Weekly Digest", value: "Enabled", type: "toggle" },
    ],
  },
  {
    title: "Appearance",
    icon: Palette,
    items: [
      { label: "Theme", value: "Dark (only)", type: "select" },
      { label: "Density", value: "Compact", type: "select" },
      { label: "Sidebar", value: "Collapsed by default", type: "select" },
    ],
  },
  {
    title: "Data & Privacy",
    icon: Database,
    items: [
      { label: "Data Export", value: "Request export", type: "action" },
      { label: "Cache", value: "Clear local cache", type: "action" },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full min-h-screen bg-[#0A0F1E] p-4 gap-3">
      <header className="flex items-center gap-3">
        <Settings className="h-5 w-5 text-emerald-400" strokeWidth={1.5} />
        <h1 className="text-[18px] font-semibold tracking-tight text-white/90">
          Settings
        </h1>
      </header>

      <div className="max-w-2xl space-y-3">
        {SETTINGS_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <div
              key={section.title}
              className="rounded-lg border border-white/[0.06] bg-[#0F172A]/40 glass-surface"
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
                <Icon
                  className="h-3.5 w-3.5 text-emerald-400/60"
                  strokeWidth={1.5}
                />
                <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                  {section.title}
                </span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {section.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between px-4 py-2.5"
                  >
                    <span className="text-[12px] text-slate-300">
                      {item.label}
                    </span>
                    {item.type === "toggle" ? (
                      <div
                        className={`h-5 w-9 rounded-full border transition-colors cursor-pointer ${
                          item.value === "Enabled"
                            ? "bg-emerald-500/20 border-emerald-500/30"
                            : "bg-white/[0.04] border-white/[0.08]"
                        }`}
                      >
                        <div
                          className={`h-3.5 w-3.5 rounded-full mt-[2.5px] transition-transform ${
                            item.value === "Enabled"
                              ? "bg-emerald-400 translate-x-[17px]"
                              : "bg-slate-500 translate-x-[3px]"
                          }`}
                        />
                      </div>
                    ) : item.type === "action" ? (
                      <button className="rounded-md bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 text-[10px] text-slate-400 hover:text-slate-200 transition-colors">
                        {item.value}
                      </button>
                    ) : (
                      <span className="text-[12px] text-slate-500 font-mono">
                        {item.value}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
