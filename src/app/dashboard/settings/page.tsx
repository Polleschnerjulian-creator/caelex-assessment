"use client";

import { useSession } from "next-auth/react";
import { User, Shield, Building2 } from "lucide-react";
import NotificationPreferencesCard from "@/components/settings/NotificationPreferencesCard";
import { ThemeSettingsCard } from "@/components/settings/ThemeSettingsCard";

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-[800px]">
        {/* Page Header */}
        <div className="mb-10">
          <h1 className="text-[24px] font-medium text-slate-900 dark:text-white mb-2">
            Account Settings
          </h1>
          <p className="text-[14px] text-slate-600 dark:text-white/70">
            Manage your account, organization, and notification preferences
          </p>
        </div>

        {/* Account Info */}
        <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center">
              <User className="w-5 h-5 text-slate-600 dark:text-white/70" />
            </div>
            <div>
              <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-600 dark:text-white/70">
                ACCOUNT
              </h2>
              <p className="text-[13px] text-slate-500 dark:text-white/50 mt-0.5">
                Your personal account information
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-[13px] text-slate-500 dark:text-white/60 mb-1">
                Name
              </p>
              <p className="text-[15px] text-slate-900 dark:text-white">
                {session?.user?.name || "—"}
              </p>
            </div>

            <div>
              <p className="text-[13px] text-slate-500 dark:text-white/60 mb-1">
                Email
              </p>
              <p className="text-[15px] text-slate-900 dark:text-white">
                {session?.user?.email || "—"}
              </p>
            </div>

            <div>
              <p className="text-[13px] text-slate-500 dark:text-white/60 mb-1">
                Role
              </p>
              <p className="text-[15px] text-slate-900 dark:text-white capitalize">
                {(session?.user as { role?: string })?.role || "User"}
              </p>
            </div>

            <div>
              <p className="text-[13px] text-slate-500 dark:text-white/60 mb-1">
                Account Status
              </p>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-[12px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400" />
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <NotificationPreferencesCard userEmail={session?.user?.email} />

        {/* Appearance / Theme Settings */}
        <div className="mt-6">
          <ThemeSettingsCard />
        </div>

        {/* Organization - Coming Soon */}
        <div className="bg-slate-50 dark:bg-white/[0.02] border border-dashed border-slate-300 dark:border-white/10 rounded-xl p-6 mt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-slate-400 dark:text-white/30" />
            </div>
            <div>
              <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-white/40">
                ORGANIZATION
              </h2>
              <p className="text-[13px] text-slate-400 dark:text-white/30 mt-0.5">
                Coming soon
              </p>
            </div>
          </div>
          <p className="text-[13px] text-slate-500 dark:text-white/30">
            Organization settings, team management, and role permissions will be
            available in a future update.
          </p>
        </div>

        {/* Security - Coming Soon */}
        <div className="bg-slate-50 dark:bg-white/[0.02] border border-dashed border-slate-300 dark:border-white/10 rounded-xl p-6 mt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center">
              <Shield className="w-5 h-5 text-slate-400 dark:text-white/30" />
            </div>
            <div>
              <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-white/40">
                SECURITY
              </h2>
              <p className="text-[13px] text-slate-400 dark:text-white/30 mt-0.5">
                Coming soon
              </p>
            </div>
          </div>
          <p className="text-[13px] text-slate-500 dark:text-white/30">
            Two-factor authentication, session management, and security logs
            will be available in a future update.
          </p>
        </div>
      </div>
    </div>
  );
}
