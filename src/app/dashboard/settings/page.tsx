"use client";

import { useState, useEffect, useCallback } from "react";
import { csrfHeaders } from "@/lib/csrf-client";
import { useSession } from "next-auth/react";
import Link from "next/link";
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
  Key,
  ChevronRight,
} from "lucide-react";
import NotificationPreferencesCard from "@/components/settings/NotificationPreferencesCard";
import { ThemeSettingsCard } from "@/components/settings/ThemeSettingsCard";
import { OrganizationCard } from "@/components/settings/OrganizationCard";
import { MfaSetupCard } from "@/components/settings/MfaSetupCard";
import { PasskeyManagementCard } from "@/components/settings/PasskeyManagementCard";
import { DeleteAccountCard } from "@/components/settings/DeleteAccountCard";
import { LanguageSettingsCard } from "@/components/settings/LanguageSettingsCard";
import { useToast } from "@/components/ui/Toast";
import { useLanguage } from "@/components/providers/LanguageProvider";

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
  const { t } = useLanguage();

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
      toast.error(t("settings.failedRevokeSessions"));
    } finally {
      setSessionsLoading(false);
    }
  }, [toast, t]);

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
          t("settings.sessionsRevoked"),
          t("settings.sessionsRevokedCount", { count: data.revokedCount || 0 }),
        );
        fetchSessions();
      } else {
        toast.error(t("settings.failedRevokeSessions"));
      }
    } catch {
      toast.error(t("settings.failedRevokeSessions"));
    } finally {
      setRevokingAll(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError(t("settings.currentPasswordRequired"));
      return;
    }
    if (!newPassword) {
      setPasswordError(t("settings.newPasswordRequired"));
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError(t("settings.passwordMinLength"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("settings.passwordMismatch"));
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError(t("settings.passwordSameAsCurrent"));
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
          t("settings.passwordChanged"),
          t("settings.passwordUpdatedSuccess"),
        );
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await res.json().catch(() => ({}));
        setPasswordError(data.error || t("settings.errorChangePassword"));
      }
    } catch {
      toast.success(
        t("settings.passwordChanged"),
        t("settings.passwordUpdatedSuccess"),
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

    if (diffMins < 1) return t("common.justNow");
    if (diffMins < 60) return t("common.minutesAgo", { count: diffMins });
    if (diffHours < 24) return t("common.hoursAgo", { count: diffHours });
    if (diffDays < 7) return t("common.daysAgo", { count: diffDays });
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
            {t("settings.security")}
          </h2>
          <p className="text-[13px] text-slate-500 dark:text-white/50 mt-0.5">
            {t("settings.sessionManagement")}
          </p>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-medium text-slate-900 dark:text-white">
            {t("settings.activeSessions")}
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
              {t("settings.revokeAllSessions")}
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
              {t("settings.noActiveSessions")}
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
                    {t("common.current")}
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
          {t("settings.password")}
        </h3>

        {isOAuthOnly === null || sessionsLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 text-slate-400 dark:text-white/40 animate-spin" />
          </div>
        ) : isOAuthOnly ? (
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
            <p className="text-[13px] text-slate-600 dark:text-white/60">
              {t("settings.oauthNotice")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-[13px] text-slate-500 dark:text-white/60 mb-1.5">
                {t("settings.currentPassword")}
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  placeholder={t("settings.enterCurrentPassword")}
                  className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 pr-10 text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  aria-label={
                    showCurrentPassword
                      ? "Hide current password"
                      : "Show current password"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/50 transition-colors"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-[13px] text-slate-500 dark:text-white/60 mb-1.5">
                {t("settings.newPassword")}
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  placeholder={t("settings.enterNewPassword")}
                  className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 pr-10 text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={
                    showNewPassword ? "Hide new password" : "Show new password"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/50 transition-colors"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-white/30 mt-1.5">
                {t("settings.minChars")}
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[13px] text-slate-500 dark:text-white/60 mb-1.5">
                {t("settings.confirmNewPassword")}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordError(null);
                }}
                placeholder={t("settings.confirmNewPasswordPlaceholder")}
                className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              />
            </div>

            {/* Password Error */}
            {passwordError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-red-500/10 border border-red-500/30"
              >
                <p className="text-[13px] text-red-500 dark:text-red-400">
                  {passwordError}
                </p>
              </div>
            )}

            {/* Change Password Button */}
            <button
              onClick={handleChangePassword}
              disabled={changingPassword}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-medium transition-colors"
            >
              {changingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("common.changing")}
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  {t("settings.changePassword")}
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
  const { t } = useLanguage();

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-[800px]">
        {/* Page Header */}
        <div className="mb-10">
          <h1 className="text-[24px] font-medium text-slate-900 dark:text-white mb-2">
            {t("settings.accountSettings")}
          </h1>
          <p className="text-[14px] text-slate-600 dark:text-white/70">
            {t("settings.manageAccount")}
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
                {t("settings.account")}
              </h2>
              <p className="text-[13px] text-slate-500 dark:text-white/50 mt-0.5">
                {t("settings.personalInfo")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-[13px] text-slate-500 dark:text-white/60 mb-1">
                {t("settings.name")}
              </p>
              <p className="text-[15px] text-slate-900 dark:text-white">
                {session?.user?.name || "—"}
              </p>
            </div>

            <div>
              <p className="text-[13px] text-slate-500 dark:text-white/60 mb-1">
                {t("settings.email")}
              </p>
              <p className="text-[15px] text-slate-900 dark:text-white">
                {session?.user?.email || "—"}
              </p>
            </div>

            <div>
              <p className="text-[13px] text-slate-500 dark:text-white/60 mb-1">
                {t("settings.role")}
              </p>
              <p className="text-[15px] text-slate-900 dark:text-white capitalize">
                {(session?.user as { role?: string })?.role || t("common.user")}
              </p>
            </div>

            <div>
              <p className="text-[13px] text-slate-500 dark:text-white/60 mb-1">
                {t("settings.accountStatus")}
              </p>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-[12px] font-medium">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400"
                  aria-hidden="true"
                />
                {t("settings.active")}
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

        {/* Language */}
        <LanguageSettingsCard />

        {/* API Keys */}
        <Link
          href="/dashboard/settings/api-keys"
          className="block bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6 mt-6 hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center">
                <Key className="w-5 h-5 text-slate-600 dark:text-white/70" />
              </div>
              <div>
                <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-600 dark:text-white/70">
                  {t("settings.apiKeys")}
                </h2>
                <p className="text-[13px] text-slate-500 dark:text-white/50 mt-0.5">
                  {t("settings.manageApiKeys")}
                </p>
              </div>
            </div>
            <ChevronRight
              className="w-5 h-5 text-slate-400 dark:text-white/30 group-hover:text-slate-600 dark:group-hover:text-white/50 transition-colors"
              aria-hidden="true"
            />
          </div>
        </Link>

        {/* Organization */}
        <OrganizationCard />

        {/* Security */}
        <SecurityCard />

        {/* Two-Factor Authentication */}
        <MfaSetupCard />

        {/* Passkeys */}
        <PasskeyManagementCard />

        {/* Delete Account (Art. 17 GDPR) */}
        <DeleteAccountCard />
      </div>
    </div>
  );
}
