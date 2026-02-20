"use client";

import Image from "next/image";
import { Shield } from "lucide-react";

interface StakeholderPortalLayoutProps {
  children: React.ReactNode;
  organizationName: string;
  organizationLogo?: string | null;
  stakeholderName: string;
}

export default function StakeholderPortalLayout({
  children,
  organizationName,
  organizationLogo,
  stakeholderName,
}: StakeholderPortalLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Left: Organization branding */}
            <div className="flex items-center gap-3">
              {organizationLogo ? (
                <Image
                  src={organizationLogo}
                  alt={`${organizationName} logo`}
                  width={32}
                  height={32}
                  className="rounded-lg object-contain"
                  unoptimized
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Shield size={16} className="text-emerald-500" />
                </div>
              )}
              <div>
                <h1 className="text-body-lg font-semibold text-slate-900 dark:text-white leading-tight">
                  {organizationName}
                </h1>
                <p className="text-micro text-slate-500 dark:text-white/40">
                  Compliance Portal
                </p>
              </div>
            </div>

            {/* Right: Stakeholder info */}
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-small font-medium text-slate-700 dark:text-white/70">
                  {stakeholderName}
                </p>
                <p className="text-micro text-slate-400 dark:text-white/30">
                  External Stakeholder
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/[0.06] flex items-center justify-center">
                <span className="text-small font-medium text-slate-600 dark:text-white/60">
                  {stakeholderName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <p className="text-micro text-slate-400 dark:text-white/30">
              Powered by Caelex &middot; Multi-Stakeholder Compliance Network
            </p>
            <div className="flex items-center gap-4">
              <a
                href="#"
                className="text-micro text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/50 transition-colors"
              >
                Privacy
              </a>
              <a
                href="#"
                className="text-micro text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/50 transition-colors"
              >
                Terms
              </a>
              <a
                href="#"
                className="text-micro text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/50 transition-colors"
              >
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
