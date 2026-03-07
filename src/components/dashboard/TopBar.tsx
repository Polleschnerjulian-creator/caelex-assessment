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
    <header
      className="h-14 px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30"
      style={{
        background: "var(--sidebar-glass-bg)",
        backdropFilter: "blur(40px) saturate(1.8)",
        WebkitBackdropFilter: "blur(40px) saturate(1.8)",
        borderBottom: "1px solid var(--sidebar-glass-border)",
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
  );
}
