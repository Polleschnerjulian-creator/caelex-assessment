"use client";

import { Menu } from "lucide-react";
import NotificationCenter from "./NotificationCenter";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface TopBarProps {
  title?: string;
  onMenuClick?: () => void;
}

export default function TopBar({ title, onMenuClick }: TopBarProps) {
  const { t } = useLanguage();

  return (
    <div className="sticky top-0 z-30 px-3 lg:px-0 pt-3 lg:pt-0">
      <header
        className="h-14 px-6 lg:px-8 flex items-center justify-between lg:mt-3 lg:mr-3"
        style={{
          background: "rgba(255, 255, 255, 0.03)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          borderRadius: 0,
        }}
      >
        {/* Left */}
        <div className="flex items-center gap-4">
          {/* Mobile hamburger */}
          <button
            onClick={onMenuClick}
            aria-label="Open navigation menu"
            aria-expanded={false}
            aria-controls="sidebar-nav"
            className="lg:hidden w-9 h-9 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--fill-light)] rounded-[var(--radius-sm)] transition-all duration-[var(--duration-fast)]"
          >
            <Menu size={20} aria-hidden="true" />
          </button>

          {/* Page title */}
          <h1 className="text-[18px] font-semibold text-[var(--text-primary)] tracking-[-0.01em]">
            {title || t("sidebar.dashboard")}
          </h1>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <NotificationCenter />
        </div>
      </header>
    </div>
  );
}
