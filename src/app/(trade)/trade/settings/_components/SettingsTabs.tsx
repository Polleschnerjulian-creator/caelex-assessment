import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export type TabKey = "profile" | "notifications" | "api-keys" | "audit";

interface Tab {
  key: TabKey;
  label: string;
  icon: LucideIcon;
}

interface Props {
  active: TabKey;
  tabs: Tab[];
}

/**
 * Caelex Trade — Settings tab nav (Sprint T-Settings).
 *
 * Pure server component. Each tab is a `<Link>` to /trade/settings?tab=…
 * so the URL is shareable + back/forward works without client state.
 * The active tab gets the indigo accent underline; inactive tabs show
 * a hover transition.
 */
export function SettingsTabs({ active, tabs }: Props) {
  return (
    <nav
      role="tablist"
      aria-label="Settings sections"
      className="flex items-center gap-1 border-b border-trade-border-subtle"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.key}
            href={`/trade/settings?tab=${tab.key}`}
            role="tab"
            aria-selected={isActive}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors ${
              isActive
                ? "border-trade-accent text-trade-text-primary"
                : "border-transparent text-trade-text-secondary hover:border-trade-border-strong hover:text-trade-text-primary"
            }`}
          >
            <Icon size={14} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
