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
  Code2,
  ChevronRight,
  Bell,
  Palette,
  Languages,
  Building2,
  Fingerprint,
  Trash2,
  Settings,
  Sparkles,
  Webhook,
  Calendar,
  Puzzle,
  Download,
  LockKeyhole,
} from "lucide-react";
import NotificationPreferencesCard from "@/components/settings/NotificationPreferencesCard";
import { ThemeSettingsCard } from "@/components/settings/ThemeSettingsCard";
import { OrganizationCard } from "@/components/settings/OrganizationCard";
import { MfaSetupCard } from "@/components/settings/MfaSetupCard";
import { PasskeyManagementCard } from "@/components/settings/PasskeyManagementCard";
import { DeleteAccountCard } from "@/components/settings/DeleteAccountCard";
import { LanguageSettingsCard } from "@/components/settings/LanguageSettingsCard";
import { AstraPreferencesCard } from "@/components/settings/AstraPreferencesCard";
import { DataExportCard } from "@/components/settings/DataExportCard";
import { CalendarSyncCard } from "@/components/settings/CalendarSyncCard";
import { IntegrationsCard } from "@/components/settings/IntegrationsCard";
import { SsoSettingsCard } from "@/components/settings/SsoSettingsCard";
import { WebhookSettingsCard } from "@/components/settings/WebhookSettingsCard";
import { useToast } from "@/components/ui/Toast";
import { useLanguage } from "@/components/providers/LanguageProvider";

// ─── Glass Panel Styles ───

const glassPanel: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.55)",
  backdropFilter: "blur(24px) saturate(1.4)",
  WebkitBackdropFilter: "blur(24px) saturate(1.4)",
  border: "1px solid rgba(255, 255, 255, 0.45)",
  borderRadius: 20,
  boxShadow:
    "0 8px 40px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
  overflow: "hidden",
};

const glassPanelDark: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.04)",
  backdropFilter: "blur(40px) saturate(1.4)",
  WebkitBackdropFilter: "blur(40px) saturate(1.4)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: 20,
  boxShadow:
    "0 8px 40px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
  overflow: "hidden",
};

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

// ─── Navigation Items ───

type SectionId =
  | "account"
  | "notifications"
  | "appearance"
  | "language"
  | "astra-ai"
  | "api-keys"
  | "widget"
  | "webhooks"
  | "calendar"
  | "integrations"
  | "organization"
  | "sso"
  | "security"
  | "mfa"
  | "passkeys"
  | "data-export"
  | "danger";

interface NavItem {
  id: SectionId;
  label: string;
  labelKey: string;
  icon: React.ElementType;
  isLink?: boolean;
  href?: string;
  isDanger?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "account", label: "Account", labelKey: "settings.account", icon: User },
  {
    id: "notifications",
    label: "Notifications",
    labelKey: "settings.notifications",
    icon: Bell,
  },
  {
    id: "appearance",
    label: "Appearance",
    labelKey: "settings.appearance",
    icon: Palette,
  },
  {
    id: "language",
    label: "Language",
    labelKey: "settings.language",
    icon: Languages,
  },
  {
    id: "astra-ai",
    label: "Astra AI",
    labelKey: "settings.astraAi",
    icon: Sparkles,
  },
  {
    id: "api-keys",
    label: "API Keys",
    labelKey: "settings.apiKeys",
    icon: Key,
    isLink: true,
    href: "/dashboard/settings/api-keys",
  },
  {
    id: "widget",
    label: "Widget",
    labelKey: "sidebar.widget",
    icon: Code2,
    isLink: true,
    href: "/dashboard/settings/widget",
  },
  {
    id: "webhooks",
    label: "Webhooks",
    labelKey: "settings.webhooks",
    icon: Webhook,
  },
  {
    id: "calendar",
    label: "Calendar Sync",
    labelKey: "settings.calendarSync",
    icon: Calendar,
  },
  {
    id: "integrations",
    label: "Integrations",
    labelKey: "settings.integrations",
    icon: Puzzle,
  },
  {
    id: "organization",
    label: "Organization",
    labelKey: "settings.organization",
    icon: Building2,
  },
  {
    id: "sso",
    label: "Single Sign-On",
    labelKey: "settings.sso",
    icon: LockKeyhole,
  },
  {
    id: "security",
    label: "Security",
    labelKey: "settings.security",
    icon: Shield,
  },
  {
    id: "mfa",
    label: "Two-Factor Auth",
    labelKey: "settings.twoFactorAuth",
    icon: KeyRound,
  },
  {
    id: "passkeys",
    label: "Passkeys",
    labelKey: "settings.passkeys",
    icon: Fingerprint,
  },
  {
    id: "data-export",
    label: "Data Export",
    labelKey: "settings.dataExport",
    icon: Download,
  },
  {
    id: "danger",
    label: "Delete Account",
    labelKey: "settings.deleteAccount",
    icon: Trash2,
    isDanger: true,
  },
];

// ─── Security Section ───

function SecuritySection() {
  const toast = useToast();
  const { t } = useLanguage();

  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingAll, setRevokingAll] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isOAuthOnly, setIsOAuthOnly] = useState<boolean | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setSessionsLoading(true);
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
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
    <div className="space-y-8">
      {/* Active Sessions */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider">
            {t("settings.activeSessions")}
          </p>
          {sessions.length > 0 && (
            <button
              onClick={handleRevokeAll}
              disabled={revokingAll}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
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
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] px-5 py-6 text-center">
            <p className="text-[15px] text-slate-500 dark:text-slate-400">
              {t("settings.noActiveSessions")}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] divide-y divide-black/[0.04] dark:divide-white/[0.06] overflow-hidden">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center gap-3.5 px-5 py-3.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center text-slate-500 dark:text-slate-400">
                  {getDeviceIcon(s.deviceType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] text-slate-900 dark:text-white truncate">
                    {s.browser}
                    {s.browserVersion ? ` ${s.browserVersion}` : ""} on {s.os}
                    {s.osVersion ? ` ${s.osVersion}` : ""}
                  </p>
                  <p className="text-[13px] text-slate-400 dark:text-white/35 mt-0.5">
                    {s.ipAddress && `${s.ipAddress} · `}
                    {s.city && s.country && `${s.city}, ${s.country} · `}
                    {formatRelativeTime(s.lastActiveAt)}
                  </p>
                </div>
                {s.isCurrent && (
                  <span className="text-[12px] font-medium text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                    {t("common.current")}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Password Section */}
      <div>
        <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1">
          {t("settings.password")}
        </p>

        {isOAuthOnly === null || sessionsLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
          </div>
        ) : isOAuthOnly ? (
          <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] px-5 py-4">
            <p className="text-[15px] text-slate-500 dark:text-slate-400">
              {t("settings.oauthNotice")}
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] divide-y divide-black/[0.04] dark:divide-white/[0.06] overflow-hidden">
              <div className="px-5 py-4">
                <label className="block text-[13px] text-slate-500 dark:text-white/40 mb-2">
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
                    className="w-full bg-white/80 dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-4 py-2.5 pr-10 text-[15px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/25 focus:border-slate-400 dark:focus:border-white/25 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="px-5 py-4">
                <label className="block text-[13px] text-slate-500 dark:text-white/40 mb-2">
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
                    className="w-full bg-white/80 dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-4 py-2.5 pr-10 text-[15px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/25 focus:border-slate-400 dark:focus:border-white/25 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[13px] text-slate-400 dark:text-white/30 mt-1.5">
                  {t("settings.minChars")}
                </p>
              </div>

              <div className="px-5 py-4">
                <label className="block text-[13px] text-slate-500 dark:text-white/40 mb-2">
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
                  className="w-full bg-white/80 dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-4 py-2.5 text-[15px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/25 focus:border-slate-400 dark:focus:border-white/25 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {passwordError && (
              <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-[14px] text-red-600 dark:text-red-400">
                  {passwordError}
                </p>
              </div>
            )}

            <button
              onClick={handleChangePassword}
              disabled={changingPassword}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 dark:bg-white hover:bg-slate-700 dark:hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-slate-900 text-[15px] font-medium transition-colors"
            >
              {changingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("common.changing")}
                </>
              ) : (
                t("settings.changePassword")
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Account Info Section ───

function AccountSection() {
  const { data: session } = useSession();
  const { t } = useLanguage();

  const fields = [
    {
      label: t("settings.name"),
      value: session?.user?.name || "\u2014",
    },
    {
      label: t("settings.email"),
      value: session?.user?.email || "\u2014",
    },
    {
      label: t("settings.role"),
      value: (session?.user as { role?: string })?.role || t("common.user"),
      capitalize: true,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] divide-y divide-black/[0.04] dark:divide-white/[0.06] overflow-hidden">
        {fields.map((field) => (
          <div
            key={field.label}
            className="flex items-center justify-between px-5 py-3.5"
          >
            <span className="text-[15px] text-slate-900 dark:text-white">
              {field.label}
            </span>
            <span
              className={`text-[15px] text-slate-500 dark:text-white/45 ${field.capitalize ? "capitalize" : ""}`}
            >
              {field.value}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between px-5 py-3.5">
          <span className="text-[15px] text-slate-900 dark:text-white">
            {t("settings.accountStatus")}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="w-[6px] h-[6px] rounded-full bg-emerald-500" />
            {t("settings.active")}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───

export default function SettingsPage() {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState<SectionId>("account");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const panelStyle = isDark ? glassPanelDark : glassPanel;

  const renderSection = () => {
    switch (activeSection) {
      case "account":
        return <AccountSection />;
      case "notifications":
        return <NotificationPreferencesCard userEmail={session?.user?.email} />;
      case "appearance":
        return <ThemeSettingsCard />;
      case "language":
        return <LanguageSettingsCard />;
      case "organization":
        return <OrganizationCard />;
      case "security":
        return <SecuritySection />;
      case "mfa":
        return <MfaSetupCard />;
      case "passkeys":
        return <PasskeyManagementCard />;
      case "astra-ai":
        return <AstraPreferencesCard />;
      case "webhooks":
        return <WebhookSettingsCard />;
      case "calendar":
        return <CalendarSyncCard />;
      case "integrations":
        return <IntegrationsCard />;
      case "sso":
        return <SsoSettingsCard />;
      case "data-export":
        return <DataExportCard />;
      case "danger":
        return <DeleteAccountCard />;
      default:
        return null;
    }
  };

  const currentNav = NAV_ITEMS.find((item) => item.id === activeSection);

  // Group nav items for visual separation
  const generalItems = NAV_ITEMS.filter((i) =>
    ["account", "notifications", "appearance", "language", "astra-ai"].includes(
      i.id,
    ),
  );
  const integrationsItems = NAV_ITEMS.filter((i) =>
    ["api-keys", "widget", "webhooks", "calendar", "integrations"].includes(
      i.id,
    ),
  );
  const orgItems = NAV_ITEMS.filter((i) =>
    ["organization", "sso"].includes(i.id),
  );
  const securityItems = NAV_ITEMS.filter((i) =>
    ["security", "mfa", "passkeys"].includes(i.id),
  );
  const dataItems = NAV_ITEMS.filter((i) => ["data-export"].includes(i.id));
  const dangerItems = NAV_ITEMS.filter((i) => i.isDanger);

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const label =
      t(item.labelKey) !== item.labelKey ? t(item.labelKey) : item.label;

    if (item.isLink && item.href) {
      return (
        <Link
          key={item.id}
          href={item.href}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150 group hover:bg-white/50 dark:hover:bg-white/[0.04]"
        >
          <Icon
            size={15}
            className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white/70 transition-colors shrink-0"
          />
          <span className="text-[13px] text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white transition-colors flex-1">
            {label}
          </span>
          <ChevronRight
            size={13}
            className="text-slate-300 dark:text-slate-600 group-hover:text-slate-400 transition-colors"
          />
        </Link>
      );
    }

    const isActive = activeSection === item.id;
    return (
      <button
        key={item.id}
        onClick={() => setActiveSection(item.id)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150 ${
          isActive
            ? item.isDanger
              ? "bg-red-500/10 dark:bg-red-500/8"
              : "bg-white/70 dark:bg-white/[0.06] shadow-sm"
            : "hover:bg-white/50 dark:hover:bg-white/[0.04]"
        }`}
      >
        <Icon
          size={15}
          className={`shrink-0 transition-colors ${
            isActive
              ? item.isDanger
                ? "text-red-500"
                : "text-slate-800 dark:text-white"
              : "text-slate-400"
          }`}
        />
        <span
          className={`text-[13px] transition-colors ${
            isActive
              ? item.isDanger
                ? "text-red-600 dark:text-red-400 font-medium"
                : "text-slate-800 dark:text-white font-medium"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {label}
        </span>
      </button>
    );
  };

  const sectionLabel =
    currentNav &&
    (t(currentNav.labelKey) !== currentNav.labelKey
      ? t(currentNav.labelKey)
      : currentNav.label);

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 dark:from-[#0f1729] dark:via-[#111d35] dark:to-[#0c1322]">
      {/* ── Left Sidebar ── */}
      <div
        className="w-[272px] shrink-0 flex flex-col border-r border-black/[0.06] dark:border-white/[0.06]"
        style={{
          ...panelStyle,
          borderRadius: 0,
          borderRight: "none",
        }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-800 to-slate-700 dark:from-white/10 dark:to-white/5 flex items-center justify-center shadow-sm">
              <Settings size={15} className="text-white dark:text-white/80" />
            </div>
            <div>
              <h1 className="text-[14px] font-semibold text-slate-800 dark:text-white leading-tight">
                {t("settings.accountSettings")}
              </h1>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                {t("settings.manageAccount")}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {/* General */}
          <div className="mb-1">
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400/70 dark:text-slate-500/70">
              General
            </p>
            <div className="space-y-0.5">{generalItems.map(renderNavItem)}</div>
          </div>

          {/* Integrations */}
          <div className="mb-1 mt-2">
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400/70 dark:text-slate-500/70">
              Integrations
            </p>
            <div className="space-y-0.5">
              {integrationsItems.map(renderNavItem)}
            </div>
          </div>

          {/* Organization */}
          <div className="mb-1 mt-2">
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400/70 dark:text-slate-500/70">
              Organization
            </p>
            <div className="space-y-0.5">{orgItems.map(renderNavItem)}</div>
          </div>

          {/* Security */}
          <div className="mb-1 mt-2">
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400/70 dark:text-slate-500/70">
              Security
            </p>
            <div className="space-y-0.5">
              {securityItems.map(renderNavItem)}
            </div>
          </div>

          {/* Data & Privacy */}
          <div className="mt-3 pt-3 border-t border-black/[0.04] dark:border-white/[0.04]">
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400/70 dark:text-slate-500/70">
              Data & Privacy
            </p>
            <div className="space-y-0.5">
              {dataItems.map(renderNavItem)}
              {dangerItems.map(renderNavItem)}
            </div>
          </div>
        </div>

        {/* Footer — user */}
        <div className="px-4 py-3 border-t border-black/[0.06] dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-white/[0.08] dark:to-white/[0.04] flex items-center justify-center text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              {session?.user?.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-slate-700 dark:text-slate-300 truncate">
                {session?.user?.name || "User"}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                {session?.user?.email || ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Section header */}
        <div className="px-10 pt-10 pb-1">
          <h2
            className={`text-[28px] font-bold tracking-tight leading-tight ${
              currentNav?.isDanger
                ? "text-red-600 dark:text-red-400"
                : "text-slate-900 dark:text-white"
            }`}
          >
            {sectionLabel}
          </h2>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-10 py-6">
          <div className="max-w-[640px]">{renderSection()}</div>
        </div>
      </div>
    </div>
  );
}
