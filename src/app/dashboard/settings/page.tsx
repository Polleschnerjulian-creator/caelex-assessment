"use client";

import { useState, useEffect, useCallback } from "react";
import { csrfHeaders } from "@/lib/csrf-client";
import { useSession } from "next-auth/react";
import {
  User,
  Shield,
  Monitor,
  Smartphone,
  Loader2,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  Globe,
  Clock,
} from "lucide-react";
import NotificationPreferencesCard from "@/components/settings/NotificationPreferencesCard";
import { ThemeSettingsCard } from "@/components/settings/ThemeSettingsCard";
import { OrganizationCard } from "@/components/settings/OrganizationCard";
import { MfaSetupCard } from "@/components/settings/MfaSetupCard";
import { PasskeyManagementCard } from "@/components/settings/PasskeyManagementCard";
import { useToast } from "@/components/ui/Toast";

// ─── Types ───

interface SessionInfo {
  id: string;
  deviceType: string;
  browser: string;
  browserVersion?: string;
  os: string;
  osVersion?: string;
  ipAddress?: string;
  city?: string;
  country?: string;
  countryCode?: string;
  authMethod?: string;
  lastActiveAt: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

// ─── Security Section ───

function SecurityCard() {
  const toast = useToast();

  // Sessions state
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingAll, setRevokingAll] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Determine if user is OAuth-only by checking sessions for authMethod
  const [isOAuthOnly, setIsOAuthOnly] = useState<boolean | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setSessionsLoading(true);
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);

        // Check if all sessions are OAuth (no credentials sessions)
        const allSessions: SessionInfo[] = data.sessions || [];
        if (allSessions.length > 0) {
          const hasCredentials = allSessions.some(
            (s) => s.authMethod === "credentials",
          );
          setIsOAuthOnly(!hasCredentials);
        } else {
          setIsOAuthOnly(false);
        }
      }
    } catch {
      toast.error("Failed to load sessions");
    } finally {
      setSessionsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRevokeAll = async () => {
    try {
      setRevokingAll(true);
      const res = await fetch("/api/sessions/revoke-all", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ exceptCurrent: true }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(
          "Sessions revoked",
          `${data.revokedCount || 0} session(s) have been revoked.`,
        );
        fetchSessions();
      } else {
        toast.error("Failed to revoke sessions");
      }
    } catch {
      toast.error("Failed to revoke sessions");
    } finally {
      setRevokingAll(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError("Current password is required.");
      return;
    }
    if (!newPassword) {
      setPasswordError("New password is required.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError(
        "New password must be different from your current password.",
      );
      return;
    }

    try {
      setChangingPassword(true);
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.ok) {
        toast.success(
          "Password changed",
          "Your password has been updated successfully.",
        );
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await res.json().catch(() => ({}));
        setPasswordError(
          data.error || "Failed to change password. Please try again.",
        );
      }
    } catch {
      toast.success(
        "Password changed",
        "Your password has been updated successfully.",
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setChangingPassword(false);
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getDeviceIcon = (deviceType: string) => {
    const lower = deviceType.toLowerCase();
    if (lower.includes("mobile") || lower.includes("phone")) {
      return <Smartphone className="w-4 h-4" />;
    }
    return <Monitor className="w-4 h-4" />;
  };

  return (
    <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6 mt-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-600 dark:text-white/70">
            SECURITY
          </h2>
          <p className="text-[13px] text-slate-500 dark:text-white/50 mt-0.5">
            Session management and password settings
          </p>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-medium text-slate-900 dark:text-white">
            Active Sessions
          </h3>
          {sessions.length > 0 && (
            <button
              onClick={handleRevokeAll}
              disabled={revokingAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {revokingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              Revoke All Sessions
            </button>
          )}
        </div>

        {sessionsLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 text-slate-400 dark:text-white/40 animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-[13px] text-slate-500 dark:text-white/40">
              No active sessions found.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/50">
                  {getDeviceIcon(s.deviceType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-slate-900 dark:text-white font-medium truncate">
                    {s.browser}
                    {s.browserVersion ? ` ${s.browserVersion}` : ""} on {s.os}
                    {s.osVersion ? ` ${s.osVersion}` : ""}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {s.ipAddress && (
                      <span className="text-[11px] text-slate-400 dark:text-white/30 flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {s.ipAddress}
                      </span>
                    )}
                    {s.city && s.country && (
                      <span className="text-[11px] text-slate-400 dark:text-white/30">
                        {s.city}, {s.country}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 dark:text-white/30 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(s.lastActiveAt)}
                    </span>
                  </div>
                </div>
                {s.isCurrent && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-[11px] font-medium flex-shrink-0">
                    Current
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-slate-200 dark:border-white/10 my-6" />

      {/* Password Section */}
      <div>
        <h3 className="text-[14px] font-medium text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-slate-500 dark:text-white/50" />
          Password
        </h3>

        {isOAuthOnly === null || sessionsLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 text-slate-400 dark:text-white/40 animate-spin" />
          </div>
        ) : isOAuthOnly ? (
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
            <p className="text-[13px] text-slate-600 dark:text-white/60">
              You&apos;re signed in with Google. Password management is handled
              by your Google account.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-[13px] text-slate-500 dark:text-white/60 mb-1.5">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  placeholder="Enter current password"
                  className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 pr-10 text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/50 transition-colors"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-[13px] text-slate-500 dark:text-white/60 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  placeholder="Enter new password"
                  className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 pr-10 text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/50 transition-colors"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-white/30 mt-1.5">
                Minimum 8 characters
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[13px] text-slate-500 dark:text-white/60 mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordError(null);
                }}
                placeholder="Confirm new password"
                className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              />
            </div>

            {/* Password Error */}
            {passwordError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-[13px] text-red-500 dark:text-red-400">
                  {passwordError}
                </p>
              </div>
            )}

            {/* Change Password Button */}
            <button
              onClick={handleChangePassword}
              disabled={changingPassword}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-medium transition-colors"
            >
              {changingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Changing...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  Change Password
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───

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

        {/* Organization */}
        <OrganizationCard />

        {/* Security */}
        <SecurityCard />

        {/* Two-Factor Authentication */}
        <MfaSetupCard />

        {/* Passkeys */}
        <PasskeyManagementCard />
      </div>
    </div>
  );
}
