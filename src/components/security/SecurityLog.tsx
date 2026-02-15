"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  AlertTriangle,
  AlertCircle,
  Info,
  Clock,
  Globe,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  Download,
} from "lucide-react";

interface SecurityLog {
  id: string;
  event: string;
  description: string;
  userId?: string;
  organizationId?: string;
  ipAddress?: string;
  userAgent?: string;
  city?: string;
  country?: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  riskLevel: string;
  createdAt: string;
}

interface SecurityStats {
  totalEvents: number;
  byRiskLevel: Record<string, number>;
  byEventType: Record<string, number>;
  failedLogins: number;
  suspiciousActivity: number;
}

interface SecurityLogProps {
  userId?: string;
  organizationId?: string;
}

const RISK_LEVEL_CONFIG: Record<
  string,
  { icon: typeof Info; color: string; bgColor: string; label: string }
> = {
  LOW: {
    icon: Info,
    color: "text-slate-400",
    bgColor: "bg-slate-500/20",
    label: "Low",
  },
  MEDIUM: {
    icon: AlertCircle,
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
    label: "Medium",
  },
  HIGH: {
    icon: AlertTriangle,
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
    label: "High",
  },
  CRITICAL: {
    icon: AlertTriangle,
    color: "text-red-400",
    bgColor: "bg-red-500/20",
    label: "Critical",
  },
};

const EVENT_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: "Successful Login",
  LOGIN_FAILED: "Failed Login",
  LOGIN_BLOCKED: "Blocked Login",
  LOGOUT: "Logout",
  SESSION_CREATED: "Session Created",
  SESSION_REVOKED: "Session Revoked",
  SESSION_EXPIRED: "Session Expired",
  PASSWORD_CHANGED: "Password Changed",
  PASSWORD_RESET_REQUESTED: "Password Reset Requested",
  PASSWORD_RESET_COMPLETED: "Password Reset Completed",
  MFA_ENABLED: "2FA Enabled",
  MFA_DISABLED: "2FA Disabled",
  MFA_CHALLENGE_SUCCESS: "2FA Verified",
  MFA_CHALLENGE_FAILED: "2FA Failed",
  SSO_LOGIN: "SSO Login",
  SSO_CONFIGURED: "SSO Configured",
  SSO_UPDATED: "SSO Updated",
  SSO_DISABLED: "SSO Disabled",
  API_KEY_CREATED: "API Key Created",
  API_KEY_USED: "API Key Used",
  API_KEY_REVOKED: "API Key Revoked",
  SUSPICIOUS_ACTIVITY: "Suspicious Activity",
  BRUTE_FORCE_DETECTED: "Brute Force Detected",
  UNUSUAL_LOCATION: "Unusual Location",
};

export function SecurityLog({ userId, organizationId }: SecurityLogProps) {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    riskLevel: "",
    event: "",
    search: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  const pageSize = 20;

  useEffect(() => {
    fetchLogs();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filter, userId, organizationId]);

  async function fetchLogs() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("pageSize", pageSize.toString());
      if (userId) params.append("userId", userId);
      if (organizationId) params.append("organizationId", organizationId);
      if (filter.riskLevel) params.append("riskLevel", filter.riskLevel);
      if (filter.event) params.append("event", filter.event);
      if (filter.search) params.append("search", filter.search);

      const response = await fetch(`/api/security/logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch security logs:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const params = new URLSearchParams({ view: "stats" });
      if (organizationId) params.append("organizationId", organizationId);

      const response = await fetch(`/api/security/logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats || null);
      }
    } catch (err) {
      console.error("Failed to fetch security stats:", err);
    }
  }

  function formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleString();
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Shield size={20} className="text-blue-400" />
            Security Log
          </h2>
          <p className="text-sm text-white/60 mt-1">
            View security events and activity for your account
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              showFilters
                ? "text-white bg-white/10"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            <Filter size={14} />
            Filters
          </button>
          <button
            onClick={() => {
              fetchLogs();
              fetchStats();
            }}
            className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Refresh"
            aria-label="Refresh security logs"
          >
            <RefreshCw size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-semibold text-white">
              {stats.totalEvents}
            </div>
            <div className="text-sm text-white/50">Total Events (30d)</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-semibold text-red-400">
              {stats.failedLogins}
            </div>
            <div className="text-sm text-white/50">Failed Logins</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-semibold text-amber-400">
              {stats.suspiciousActivity}
            </div>
            <div className="text-sm text-white/50">Suspicious Activity</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-semibold text-white">
              {(stats.byRiskLevel["HIGH"] || 0) +
                (stats.byRiskLevel["CRITICAL"] || 0)}
            </div>
            <div className="text-sm text-white/50">High Risk Events</div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="bg-white/5 rounded-xl border border-white/10 p-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="seclog-search"
                className="block text-xs text-white/50 mb-1.5"
              >
                Search
              </label>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
                  aria-hidden="true"
                />
                <input
                  id="seclog-search"
                  type="text"
                  value={filter.search}
                  onChange={(e) =>
                    setFilter({ ...filter, search: e.target.value })
                  }
                  placeholder="Search events..."
                  className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="seclog-risk-level"
                className="block text-xs text-white/50 mb-1.5"
              >
                Risk Level
              </label>
              <select
                id="seclog-risk-level"
                value={filter.riskLevel}
                onChange={(e) =>
                  setFilter({ ...filter, riskLevel: e.target.value })
                }
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
              >
                <option value="" className="bg-slate-800">
                  All Levels
                </option>
                <option value="LOW" className="bg-slate-800">
                  Low
                </option>
                <option value="MEDIUM" className="bg-slate-800">
                  Medium
                </option>
                <option value="HIGH" className="bg-slate-800">
                  High
                </option>
                <option value="CRITICAL" className="bg-slate-800">
                  Critical
                </option>
              </select>
            </div>
            <div>
              <label
                htmlFor="seclog-event-type"
                className="block text-xs text-white/50 mb-1.5"
              >
                Event Type
              </label>
              <select
                id="seclog-event-type"
                value={filter.event}
                onChange={(e) =>
                  setFilter({ ...filter, event: e.target.value })
                }
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
              >
                <option value="" className="bg-slate-800">
                  All Events
                </option>
                {Object.entries(EVENT_LABELS).map(([value, label]) => (
                  <option key={value} value={value} className="bg-slate-800">
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Log List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-white/40" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
            <Shield size={24} className="text-white/30" />
          </div>
          <h3 className="text-lg font-medium text-white mb-1">
            No Security Events
          </h3>
          <p className="text-sm text-white/50">
            Security events will appear here as they occur
          </p>
        </div>
      ) : (
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <div className="divide-y divide-white/5">
            {logs.map((log) => {
              const riskConfig =
                RISK_LEVEL_CONFIG[log.riskLevel] || RISK_LEVEL_CONFIG.LOW;
              const RiskIcon = riskConfig.icon;
              const isExpanded = expandedLog === log.id;

              return (
                <div key={log.id} className="p-4">
                  <div
                    className="flex items-start gap-3 cursor-pointer"
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    aria-label={`${EVENT_LABELS[log.event] || log.event}: ${log.description}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setExpandedLog(isExpanded ? null : log.id);
                      }
                    }}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${riskConfig.bgColor}`}
                    >
                      <RiskIcon size={16} className={riskConfig.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">
                          {EVENT_LABELS[log.event] || log.event}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${riskConfig.bgColor} ${riskConfig.color}`}
                        >
                          {riskConfig.label}
                        </span>
                      </div>
                      <p className="text-sm text-white/60 truncate mt-0.5">
                        {log.description}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-white/40">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {formatTime(log.createdAt)}
                        </span>
                        {log.ipAddress && (
                          <span className="font-mono">{log.ipAddress}</span>
                        )}
                        {log.city && log.country && (
                          <span className="flex items-center gap-1">
                            <Globe size={10} />
                            {log.city}, {log.country}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronDown size={16} className="text-white/30" />
                      ) : (
                        <ChevronRight size={16} className="text-white/30" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-4 ml-11 p-3 bg-white/5 rounded-lg space-y-2 text-sm">
                      {log.targetType && (
                        <div className="flex justify-between">
                          <span className="text-white/50">Target</span>
                          <span className="text-white font-mono text-xs">
                            {log.targetType}
                            {log.targetId && `: ${log.targetId}`}
                          </span>
                        </div>
                      )}
                      {log.userAgent && (
                        <div className="flex justify-between">
                          <span className="text-white/50">User Agent</span>
                          <span className="text-white/70 text-xs truncate max-w-xs">
                            {log.userAgent}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-white/50">Timestamp</span>
                        <span className="text-white/70">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="pt-2 border-t border-white/5">
                          <span className="text-white/50 text-xs">
                            Additional Data
                          </span>
                          <pre className="mt-1 p-2 bg-black/20 rounded text-[10px] text-white/60 overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-white/50">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default SecurityLog;
