"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

interface TopBarProps {
  title?: string;
  onMenuClick?: () => void;
}

export default function TopBar({
  title = "Dashboard",
  onMenuClick,
}: TopBarProps) {
  return (
    <header className="h-16 border-b border-white/10 px-6 lg:px-8 flex items-center justify-between">
      {/* Left */}
      <div className="flex items-center gap-4">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuClick}
          className="lg:hidden text-white/60 hover:text-white/60 transition-colors"
        >
          <Menu size={20} />
        </button>

        {/* Page title */}
        <h1 className="text-[18px] font-medium text-white">{title}</h1>
      </div>

      {/* Right */}
      <Link
        href="/assessment"
        className="border border-white/[0.08] text-white/70 font-mono text-[12px] px-4 py-1.5 rounded-full hover:border-white/[0.15] hover:text-white/80 transition-all"
      >
        Run Assessment
      </Link>
    </header>
  );
}
