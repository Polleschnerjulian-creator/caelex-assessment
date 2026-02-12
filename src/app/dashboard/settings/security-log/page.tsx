"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Shield,
  Loader2,
  ChevronLeft,
  AlertTriangle,
  CheckCircle,
  Info,
  AlertCircle,
  Globe,
  Clock,
  Monitor,
  Smartphone,
  RefreshCw,
  Filter,
} from "lucide-react";

// ─── Types ───

interface SecurityLog {
  id: string;
  event: string;
  description: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  ipAddress?: string;
  userAgent?: string;
  city?: string;
  country?: string;
  countryCode?: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ─── Constants ───

const EVENT_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: "Successful Login",
  LOGIN_FAILED: "Failed Login",
  LOGIN_BLOCKED: "Login Blocked",
  LOGOUT: "Logged Out",
  SESSION_CREATED: "Session Created",
  SESSION_REVOKED: "Session Revoked",
  PASSWORD_CHANGED: "Password Changed",
  PASSWORD_RESET_REQUESTED: "Password Reset Requested",
  MFA_ENABLED: "MFA Enabled",
  MFA_DISABLED: "MFA Disabled",
  MFA_CHALLENGE_SUCCESS: "MFA Challenge Passed",
  MFA_CHALLENGE_FAILED: "MFA Challenge Failed",
  API_KEY_CREATED: "API Key Created",
  API_KEY_REVOKED: "API Key Revoked",
  SUSPICIOUS_ACTIVITY: "Suspicious Activity",
  UNUSUAL_LOCATION: "Unusual Location",
  BRUTE_FORCE_DETECTED: "Brute Force Detected",
  RATE_LIMIT_EXCEEDED: "Rate Limit Exceeded",
  ACCOUNT_CREATED: "Account Created",
  ACCOUNT_LOCKED: "Account Locked",
  EMAIL_VERIFIED: "Email Verified",
  EMAIL_CHANGED: "Email Changed",
  SSO_LOGIN: "SSO Login",
  PASSKEY_REGISTERED: "Passkey Registered",
  PASSKEY_REMOVED: "Passkey Removed",
  PASSKEY_LOGIN: "Passkey Login",
  HONEY_TOKEN_TRIGGERED: "Honey Token Triggered",
};

const RISK_LEVEL_CONFIG: Record<
  string,
  { color: string; bg: string; icon: React.ReactNode; label: string }
> = {
  LOW: {
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-500/10",
    icon: <CheckCircle className="w-4 h-4" />,
    label: "Low",
  },
  MEDIUM: {
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-500/10",
    icon: <Info className="w-4 h-4" />,
    label: "Medium",
  },
  HIGH: {
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-500/10",
    icon: <AlertCircle className="w-4 h-4" />,
    label: "High",
  },
  CRITICAL: {
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-500/10",
    icon: <AlertTriangle className="w-4 h-4" />,
    label: "Critical",
  },
};

// ─── Helpers ───

function formatRelativeTime(dateStr: string) {
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
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function formatFullDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getDeviceFromUserAgent(userAgent?: string): {
  type: string;
  name: string;
} {
  if (!userAgent) return { type: "unknown", name: "Unknown Device" };

  const ua = userAgent.toLowerCase();
  const isMobile = /mobile|android|iphone|ipad|tablet/i.test(ua);

  let browser = "Unknown Browser";
  if (ua.includes("chrome") && !ua.includes("edge")) browser = "Chrome";
  else if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("safari") && !ua.includes("chrome")) browser = "Safari";
  else if (ua.includes("edge")) browser = "Edge";
  else if (ua.includes("opera")) browser = "Opera";

  let os = "Unknown OS";
  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("mac")) os = "macOS";
  else if (ua.includes("linux")) os = "Linux";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";

  return {
    type: isMobile ? "mobile" : "desktop",
    name: `${browser} on ${os}`,
  };
}

// ─── Components ───

function SecurityLogItem({ log }: { log: SecurityLog }) {
  const [expanded, setExpanded] = useState(false);
  const riskConfig = RISK_LEVEL_CONFIG[log.riskLevel] || RISK_LEVEL_CONFIG.LOW;
  const device = getDeviceFromUserAgent(log.userAgent);
  const eventLabel = EVENT_LABELS[log.event] || log.event.replace(/_/g, " ");

  return (
    <div className="border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden transition-all">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-start gap-3">
          {/* Risk Level Icon */}
          <div
            className={`w-8 h-8 rounded-lg ${riskConfig.bg} flex items-center justify-center ${riskConfig.color} flex-shrink-0`}
          >
            {riskConfig.icon}
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-medium text-slate-900 dark:text-white">
                {eventLabel}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${riskConfig.bg} ${riskConfig.color}`}
              >
                {riskConfig.label}
              </span>
            </div>
            <p className="text-[13px] text-slate-600 dark:text-white/60 mt-1 line-clamp-1">
              {log.description}
            </p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {log.ipAddress && (
                <span className="text-[11px] text-slate-400 dark:text-white/30 flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  {log.ipAddress}
                </span>
              )}
              {log.city && log.country && (
                <span className="text-[11px] text-slate-400 dark:text-white/30">
                  {log.city}, {log.country}
                </span>
              )}
              <span className="text-[11px] text-slate-400 dark:text-white/30 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatRelativeTime(log.createdAt)}
              </span>
            </div>
          </div>

          {/* Device Icon */}
          <div className="flex-shrink-0 text-slate-400 dark:text-white/30">
            {device.type === "mobile" ? (
              <Smartphone className="w-5 h-5" />
            ) : (
              <Monitor className="w-5 h-5" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-white/30 mb-1">
                Date & Time
              </p>
              <p className="text-[13px] text-slate-700 dark:text-white/70">
                {formatFullDate(log.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-white/30 mb-1">
                Device
              </p>
              <p className="text-[13px] text-slate-700 dark:text-white/70">
                {device.name}
              </p>
            </div>
            {log.ipAddress && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-white/30 mb-1">
                  IP Address
                </p>
                <p className="text-[13px] text-slate-700 dark:text-white/70 font-mono">
                  {log.ipAddress}
                </p>
              </div>
            )}
            {log.city && log.country && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-white/30 mb-1">
                  Location
                </p>
                <p className="text-[13px] text-slate-700 dark:text-white/70">
                  {log.city}, {log.country}
                  {log.countryCode && ` (${log.countryCode})`}
                </p>
              </div>
            )}
            {log.targetType && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-white/30 mb-1">
                  Target
                </p>
                <p className="text-[13px] text-slate-700 dark:text-white/70">
                  {log.targetType}
                  {log.targetId && (
                    <span className="text-slate-400 dark:text-white/40">
                      {" "}
                      ({log.targetId.slice(0, 8)}...)
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
              <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-white/30 mb-2">
                Additional Details
              </p>
              <pre className="text-[12px] text-slate-600 dark:text-white/50 bg-white dark:bg-white/[0.04] p-3 rounded-lg overflow-x-auto">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───

export default function SecurityLogPage() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [riskFilter, setRiskFilter] = useState<string>("all");

  const fetchLogs = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const res = await fetch("/api/security/logs?view=user&limit=100");
      if (!res.ok) {
        throw new Error("Failed to fetch security logs");
      }

      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load security logs",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs =
    riskFilter === "all"
      ? logs
      : logs.filter((log) => log.riskLevel === riskFilter);

  const riskCounts = {
    all: logs.length,
    CRITICAL: logs.filter((l) => l.riskLevel === "CRITICAL").length,
    HIGH: logs.filter((l) => l.riskLevel === "HIGH").length,
    MEDIUM: logs.filter((l) => l.riskLevel === "MEDIUM").length,
    LOW: logs.filter((l) => l.riskLevel === "LOW").length,
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-[900px]">
        {/* Back Link */}
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 dark:text-white/50 hover:text-slate-700 dark:hover:text-white/70 transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Settings
        </Link>

        {/* Page Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-[24px] font-medium text-slate-900 dark:text-white">
                Security Log
              </h1>
              <p className="text-[14px] text-slate-600 dark:text-white/70 mt-0.5">
                Review your account security activity
              </p>
            </div>
          </div>

          <button
            onClick={() => fetchLogs(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium text-slate-600 dark:text-white/70 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {/* Risk Level Filters */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-white/50 mr-2">
            <Filter className="w-4 h-4" />
            <span className="text-[13px]">Filter:</span>
          </div>
          {[
            { key: "all", label: "All" },
            {
              key: "CRITICAL",
              label: "Critical",
              color: "text-red-600 dark:text-red-400",
            },
            {
              key: "HIGH",
              label: "High",
              color: "text-amber-600 dark:text-amber-400",
            },
            {
              key: "MEDIUM",
              label: "Medium",
              color: "text-blue-600 dark:text-blue-400",
            },
            {
              key: "LOW",
              label: "Low",
              color: "text-green-600 dark:text-green-400",
            },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setRiskFilter(filter.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                riskFilter === filter.key
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                  : "bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/[0.06]"
              }`}
            >
              <span className={riskFilter !== filter.key ? filter.color : ""}>
                {filter.label}
              </span>
              <span
                className={`tabular-nums ${riskFilter === filter.key ? "text-white/70 dark:text-slate-900/70" : "text-slate-400 dark:text-white/40"}`}
              >
                {riskCounts[filter.key as keyof typeof riskCounts]}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-slate-400 dark:text-white/40 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <p className="text-[14px] text-red-600 dark:text-red-400">
              {error}
            </p>
            <button
              onClick={() => fetchLogs()}
              className="mt-4 px-4 py-2 rounded-lg bg-red-500 text-white text-[13px] font-medium hover:bg-red-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-8 text-center">
            <Shield className="w-10 h-10 text-slate-300 dark:text-white/20 mx-auto mb-4" />
            <h3 className="text-[16px] font-medium text-slate-900 dark:text-white mb-2">
              {riskFilter === "all"
                ? "No Security Events"
                : `No ${riskFilter.toLowerCase()} risk events`}
            </h3>
            <p className="text-[13px] text-slate-500 dark:text-white/50">
              {riskFilter === "all"
                ? "Your security log is empty. Activity will appear here as you use your account."
                : "No events match the selected risk level filter."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <SecurityLogItem key={log.id} log={log} />
            ))}
          </div>
        )}

        {/* Footer Note */}
        {!loading && !error && logs.length > 0 && (
          <div className="mt-8 p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg">
            <p className="text-[12px] text-slate-500 dark:text-white/50">
              Security logs are retained for 365 days. If you notice any
              suspicious activity, please change your password immediately and
              contact support.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
