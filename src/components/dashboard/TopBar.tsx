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
    <header className="h-12 border-b border-[var(--border-default)] bg-[var(--surface-raised)] px-6 lg:px-8 flex items-center justify-between">
      {/* Left */}
      <div className="flex items-center gap-4">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          aria-expanded={false}
          aria-controls="sidebar-nav"
          className="lg:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-[180ms]"
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        {/* Page title */}
        <h1 className="text-[16px] font-semibold text-[var(--text-primary)]">
          {title || t("sidebar.dashboard")}
        </h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <NotificationCenter />
        <Link
          href="/assessment"
          className="border border-[var(--border-default)] text-[var(--text-secondary)] text-small px-4 py-1.5 rounded-full hover:border-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-all duration-[180ms]"
        >
          {t("topbar.runAssessment")}
        </Link>
      </div>
    </header>
  );
}
