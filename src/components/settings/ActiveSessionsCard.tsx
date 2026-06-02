"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * ActiveSessionsCard — self-contained active-sessions UI.
 *
 * Extracted from the dashboard SecuritySection (src/app/dashboard/settings/page.tsx)
 * so it can be reused on the Atlas settings surface without any dashboard coupling.
 *
 * Features:
 *   - Lists all active user sessions (device, browser, OS, IP, location, last-seen)
 *   - Per-session "revoke" via DELETE /api/sessions/[sessionId]
 *   - "Revoke all others" via POST /api/sessions/revoke-all
 *   - Current session is flagged and cannot be revoked
 *
 * Requires: ToastProvider in the component tree (uses useToast).
 * Uses: csrfHeaders() for state-mutating requests.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState, useEffect, useCallback } from "react";
import { Loader2, LogOut, Monitor, Smartphone } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { csrfHeaders } from "@/lib/csrf-client";

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

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "Gerade eben";
  if (diffMins < 60) return `vor ${diffMins} Min.`;
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  if (diffDays < 7) return `vor ${diffDays} Tagen`;
  return date.toLocaleDateString("de-DE");
}

function DeviceIcon({ deviceType }: { deviceType: string }) {
  const lower = deviceType.toLowerCase();
  if (lower.includes("mobile") || lower.includes("phone")) {
    return <Smartphone className="w-4 h-4" />;
  }
  return <Monitor className="w-4 h-4" />;
}

export function ActiveSessionsCard() {
  const toast = useToast();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingAll, setRevokingAll] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch {
      toast.error("Sitzungen konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setRevokingId(sessionId);
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
        headers: csrfHeaders(),
      });
      if (res.ok) {
        toast.success("Sitzung beendet");
        void fetchSessions();
      } else {
        toast.error("Sitzung konnte nicht beendet werden");
      }
    } catch {
      toast.error("Sitzung konnte nicht beendet werden");
    } finally {
      setRevokingId(null);
    }
  };

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
          "Alle anderen Sitzungen beendet",
          `${data.revokedCount || 0} Sitzung(en) widerrufen`,
        );
        void fetchSessions();
      } else {
        toast.error("Sitzungen konnten nicht beendet werden");
      }
    } catch {
      toast.error("Sitzungen konnten nicht beendet werden");
    } finally {
      setRevokingAll(false);
    }
  };

  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <div className="space-y-8">
      {/* Header row */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider">
          Aktive Sitzungen
        </p>
        {otherSessions.length > 0 && (
          <button
            onClick={handleRevokeAll}
            disabled={revokingAll}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors disabled:opacity-50"
          >
            {revokingAll ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
            Alle anderen beenden
          </button>
        )}
      </div>

      {/* Session list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-slate-400 dark:text-white/30 animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] px-5 py-6 text-center">
          <p className="text-[15px] text-slate-500 dark:text-white/40">
            Keine aktiven Sitzungen
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] divide-y divide-black/[0.04] dark:divide-white/[0.06] overflow-hidden">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center gap-3.5 px-5 py-3.5">
              {/* Device icon */}
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center text-slate-500 dark:text-white/50 flex-shrink-0">
                <DeviceIcon deviceType={s.deviceType} />
              </div>

              {/* Session info */}
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

              {/* Current badge or revoke button */}
              {s.isCurrent ? (
                <span className="text-[12px] font-medium text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                  Aktuell
                </span>
              ) : (
                <button
                  onClick={() => handleRevokeSession(s.id)}
                  disabled={revokingId === s.id}
                  className="p-1.5 rounded-lg text-slate-400 dark:text-white/30 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50 flex-shrink-0"
                  title="Sitzung beenden"
                  aria-label={`Sitzung beenden: ${s.browser} on ${s.os}`}
                >
                  {revokingId === s.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
