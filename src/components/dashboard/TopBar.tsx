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
    <header className="h-16 border-b border-[#E5E7EB] bg-white px-6 lg:px-8 flex items-center justify-between">
      {/* Left */}
      <div className="flex items-center gap-4">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          aria-expanded={false}
          aria-controls="sidebar-nav"
          className="lg:hidden text-[#6B7280] hover:text-[#111827] transition-colors"
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        {/* Page title */}
        <h1 className="text-heading font-medium text-[#111827]">
          {title || t("sidebar.dashboard")}
        </h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <NotificationCenter />
        <Link
          href="/assessment"
          className="border border-[#D1D5DB] text-[#4B5563] text-small px-4 py-1.5 rounded-full hover:border-[#9CA3AF] hover:text-[#111827] transition-all"
        >
          {t("topbar.runAssessment")}
        </Link>
      </div>
    </header>
  );
}
