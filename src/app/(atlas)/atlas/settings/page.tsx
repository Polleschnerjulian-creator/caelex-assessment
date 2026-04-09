import { Settings, User, Bell, Palette, Database, Shield } from "lucide-react";

const SETTINGS_SECTIONS = [
  {
    title: "Profile",
    icon: User,
    items: [
      { label: "Display Name", value: "\u2014", type: "text" },
      { label: "Email", value: "\u2014", type: "text" },
      { label: "Organization", value: "\u2014", type: "text" },
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
      { label: "Theme", value: "Light", type: "select" },
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
    <div className="flex flex-col h-full min-h-screen bg-[#F7F8FA] p-4 gap-3">
      <header className="flex items-center gap-3">
        <Settings className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
        <h1 className="text-[18px] font-semibold tracking-tight text-gray-900">
          Settings
        </h1>
      </header>

      <div className="max-w-2xl space-y-3">
        {SETTINGS_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <div
              key={section.title}
              className="rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
                <Icon
                  className="h-3.5 w-3.5 text-emerald-600"
                  strokeWidth={1.5}
                />
                <span className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                  {section.title}
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {section.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between px-4 py-2.5"
                  >
                    <span className="text-[12px] text-gray-700">
                      {item.label}
                    </span>
                    {item.type === "toggle" ? (
                      <div
                        className={`h-5 w-9 rounded-full border transition-colors cursor-pointer ${
                          item.value === "Enabled"
                            ? "bg-emerald-100 border-emerald-300"
                            : "bg-gray-100 border-gray-200"
                        }`}
                      >
                        <div
                          className={`h-3.5 w-3.5 rounded-full mt-[2.5px] transition-transform ${
                            item.value === "Enabled"
                              ? "bg-emerald-500 translate-x-[17px]"
                              : "bg-gray-400 translate-x-[3px]"
                          }`}
                        />
                      </div>
                    ) : item.type === "action" ? (
                      <button className="rounded-md bg-gray-50 border border-gray-200 px-2.5 py-1 text-[10px] text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                        {item.value}
                      </button>
                    ) : (
                      <span className="text-[12px] text-gray-400 font-mono">
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
