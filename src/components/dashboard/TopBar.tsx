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
    <header className="h-16 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-transparent px-6 lg:px-8 flex items-center justify-between">
      {/* Left */}
      <div className="flex items-center gap-4">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          aria-expanded={false}
          aria-controls="sidebar-nav"
          className="lg:hidden text-slate-600 dark:text-white/60 hover:text-slate-800 dark:hover:text-white/60 transition-colors"
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        {/* Page title */}
        <h1 className="text-[18px] font-medium text-slate-900 dark:text-white">
          {title || t("sidebar.dashboard")}
        </h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <NotificationCenter />
        <Link
          href="/assessment"
          className="border border-slate-300 dark:border-white/[0.08] text-slate-700 dark:text-white/70 font-mono text-[12px] px-4 py-1.5 rounded-full hover:border-slate-400 dark:hover:border-white/[0.15] hover:text-slate-900 dark:hover:text-white/80 transition-all"
        >
          {t("topbar.runAssessment")}
        </Link>
      </div>
    </header>
  );
}
