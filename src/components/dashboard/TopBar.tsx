"use client";

import Link from "next/link";
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
      className="h-14 border-b border-[var(--separator)] px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30"
      style={{
        backgroundColor: "var(--topbar-bg)",
        backdropFilter: "blur(16px) saturate(1.4)",
        WebkitBackdropFilter: "blur(16px) saturate(1.4)",
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
        <Link
          href="/assessment"
          className="
            bg-[var(--accent-500)] text-white text-[14px] font-medium
            px-5 py-2 rounded-[var(--radius-sm)]
            shadow-[0_2px_8px_rgba(74,98,232,0.25),0_0_0_1px_rgba(74,98,232,0.3)]
            hover:bg-[var(--accent-400)] hover:shadow-[0_4px_12px_rgba(74,98,232,0.35),0_0_0_1px_rgba(74,98,232,0.4)] hover:-translate-y-px
            active:bg-[var(--accent-600)] active:shadow-[0_1px_4px_rgba(74,98,232,0.2)] active:translate-y-0
            transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]
          "
        >
          {t("topbar.runAssessment")}
        </Link>
      </div>
    </header>
  );
}
