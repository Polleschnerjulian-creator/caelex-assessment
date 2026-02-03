"use client";

import { useSession } from "next-auth/react";

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-[1200px]">
        <div className="mb-10">
          <h1 className="text-[24px] font-medium text-white mb-2">
            Account Settings
          </h1>
          <p className="text-[14px] text-white/70">
            Manage your account, organization, and preferences
          </p>
        </div>

        {/* Account Info */}
        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-6 mb-6">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/70 mb-4">
            ACCOUNT
          </h2>

          <div className="space-y-4">
            <div>
              <p className="text-[13px] text-white/60 mb-1">Name</p>
              <p className="text-[15px] text-white">
                {session?.user?.name || "—"}
              </p>
            </div>

            <div>
              <p className="text-[13px] text-white/60 mb-1">Email</p>
              <p className="text-[15px] text-white">
                {session?.user?.email || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Coming Soon */}
        <div className="bg-white/[0.015] border border-dashed border-white/10 rounded-xl p-12 text-center">
          <p className="text-[15px] text-white/60 mb-2">
            More settings coming soon
          </p>
          <p className="text-[13px] text-white/[0.1] max-w-[400px] mx-auto">
            Organization settings, notification preferences, and team management
            will be available in a future update.
          </p>
        </div>
      </div>
    </div>
  );
}
