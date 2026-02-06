"use client";

import { useState, useEffect } from "react";
import {
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Clock,
  LogOut,
  Loader2,
  AlertTriangle,
  Check,
  RefreshCw,
  Shield,
} from "lucide-react";

interface Session {
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
  authMethod: string;
  lastActiveAt: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

interface SessionStats {
  activeSessions: number;
  totalSessions: number;
  deviceBreakdown: Record<string, number>;
  lastActivity: string | null;
}

export function SessionList() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevoking, setIsRevoking] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  async function fetchSessions() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/sessions?stats=true");
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
        setStats(data.stats || null);
      }
    } catch (err) {
      setError("Failed to load sessions");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRevoke(sessionId: string) {
    setIsRevoking(sessionId);
    setError(null);

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (stats) {
          setStats({ ...stats, activeSessions: stats.activeSessions - 1 });
        }
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to revoke session");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke session");
    } finally {
      setIsRevoking(null);
    }
  }

  async function handleRevokeAll() {
    if (
      !confirm(
        "Are you sure you want to sign out of all other devices? You will remain signed in on this device.",
      )
    ) {
      return;
    }

    setIsRevokingAll(true);
    setError(null);

    try {
      const response = await fetch("/api/sessions/revoke-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exceptCurrent: true }),
      });

      if (response.ok) {
        await fetchSessions();
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to revoke sessions");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to revoke sessions",
      );
    } finally {
      setIsRevokingAll(false);
    }
  }

  function getDeviceIcon(deviceType: string) {
    switch (deviceType?.toLowerCase()) {
      case "mobile":
        return <Smartphone size={18} className="text-white/50" />;
      case "tablet":
        return <Tablet size={18} className="text-white/50" />;
      default:
        return <Monitor size={18} className="text-white/50" />;
    }
  }

  function getAuthMethodBadge(method: string) {
    const configs: Record<string, { label: string; color: string }> = {
      PASSWORD: { label: "Password", color: "text-blue-400 bg-blue-500/20" },
      OAUTH_GOOGLE: { label: "Google", color: "text-red-400 bg-red-500/20" },
      OAUTH_GITHUB: {
        label: "GitHub",
        color: "text-purple-400 bg-purple-500/20",
      },
      SAML: { label: "SAML SSO", color: "text-emerald-400 bg-emerald-500/20" },
      OIDC: { label: "OIDC SSO", color: "text-amber-400 bg-amber-500/20" },
      API_KEY: { label: "API Key", color: "text-slate-400 bg-slate-500/20" },
    };

    const config = configs[method] || {
      label: method,
      color: "text-white/50 bg-white/5",
    };

    return (
      <span
        className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${config.color}`}
      >
        {config.label}
      </span>
    );
  }

  function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Shield size={20} className="text-blue-400" />
            Active Sessions
          </h2>
          <p className="text-sm text-white/60 mt-1">
            Manage your active sessions and sign out from other devices
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSessions}
            className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          {sessions.length > 1 && (
            <button
              onClick={handleRevokeAll}
              disabled={isRevokingAll}
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
            >
              {isRevokingAll ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <LogOut size={14} />
              )}
              Sign out all other devices
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-semibold text-white">
              {stats.activeSessions}
            </div>
            <div className="text-sm text-white/50">Active Sessions</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-semibold text-white">
              {Object.keys(stats.deviceBreakdown).length}
            </div>
            <div className="text-sm text-white/50">Device Types</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-semibold text-white">
              {stats.lastActivity
                ? formatRelativeTime(stats.lastActivity)
                : "N/A"}
            </div>
            <div className="text-sm text-white/50">Last Activity</div>
          </div>
        </div>
      )}

      {/* Session List */}
      {sessions.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
            <Monitor size={24} className="text-white/30" />
          </div>
          <h3 className="text-lg font-medium text-white mb-1">
            No Active Sessions
          </h3>
          <p className="text-sm text-white/50">
            Your session history will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`bg-white/5 rounded-xl border p-4 ${
                session.isCurrent ? "border-blue-500/30" : "border-white/10"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                    {getDeviceIcon(session.deviceType)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">
                        {session.browser}{" "}
                        {session.browserVersion && `${session.browserVersion}`}
                      </span>
                      <span className="text-white/30">on</span>
                      <span className="text-white/70">
                        {session.os}{" "}
                        {session.osVersion && `${session.osVersion}`}
                      </span>
                      {session.isCurrent && (
                        <span className="px-2 py-0.5 text-[10px] font-medium text-emerald-400 bg-emerald-500/20 rounded-full">
                          Current Session
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm">
                      {session.city && session.country && (
                        <span className="flex items-center gap-1 text-white/50">
                          <Globe size={12} />
                          {session.city}, {session.country}
                        </span>
                      )}
                      {session.ipAddress && (
                        <span className="text-white/40 font-mono text-xs">
                          {session.ipAddress}
                        </span>
                      )}
                      {getAuthMethodBadge(session.authMethod)}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        Last active: {formatRelativeTime(session.lastActiveAt)}
                      </span>
                      <span>
                        Created:{" "}
                        {new Date(session.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {!session.isCurrent && (
                  <button
                    onClick={() => handleRevoke(session.id)}
                    disabled={isRevoking === session.id}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isRevoking === session.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <LogOut size={14} />
                    )}
                    Sign out
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Security Notice */}
      <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <AlertTriangle
          size={18}
          className="text-amber-400 flex-shrink-0 mt-0.5"
        />
        <div>
          <h4 className="text-sm font-medium text-amber-400">Security Tip</h4>
          <p className="text-sm text-white/60 mt-1">
            If you see any sessions you don&apos;t recognize, sign out of them
            immediately and change your password. Consider enabling two-factor
            authentication for additional security.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SessionList;
