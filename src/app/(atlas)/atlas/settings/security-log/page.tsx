/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Per-User Sicherheitsprotokoll.
 *
 * Shows the CALLER'S OWN security events via /api/security/logs?view=user.
 * Scoped to the authenticated user — NOT platform-admin-only (unlike audit/cost).
 * Every Atlas user sees their own login history, MFA changes, session events, etc.
 *
 * Auth: getAtlasAuth() — any authenticated Atlas user.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

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
  FileText,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Labels (German) ──────────────────────────────────────────────────────────

const EVENT_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: "Anmeldung erfolgreich",
  LOGIN_FAILED: "Anmeldung fehlgeschlagen",
  LOGIN_BLOCKED: "Anmeldung blockiert",
  LOGOUT: "Abgemeldet",
  SESSION_CREATED: "Sitzung erstellt",
  SESSION_REVOKED: "Sitzung widerrufen",
  PASSWORD_CHANGED: "Passwort geändert",
  PASSWORD_RESET_REQUESTED: "Passwort-Reset angefordert",
  MFA_ENABLED: "2FA aktiviert",
  MFA_DISABLED: "2FA deaktiviert",
  MFA_CHALLENGE_SUCCESS: "2FA-Prüfung bestanden",
  MFA_CHALLENGE_FAILED: "2FA-Prüfung fehlgeschlagen",
  API_KEY_CREATED: "API-Schlüssel erstellt",
  API_KEY_REVOKED: "API-Schlüssel widerrufen",
  SUSPICIOUS_ACTIVITY: "Verdächtige Aktivität",
  UNUSUAL_LOCATION: "Ungewöhnlicher Standort",
  BRUTE_FORCE_DETECTED: "Brute-Force erkannt",
  RATE_LIMIT_EXCEEDED: "Rate-Limit überschritten",
  ACCOUNT_CREATED: "Account erstellt",
  ACCOUNT_LOCKED: "Account gesperrt",
  EMAIL_VERIFIED: "E-Mail verifiziert",
  EMAIL_CHANGED: "E-Mail geändert",
  SSO_LOGIN: "SSO-Anmeldung",
  PASSKEY_REGISTERED: "Passkey registriert",
  PASSKEY_REMOVED: "Passkey entfernt",
  PASSKEY_LOGIN: "Passkey-Anmeldung",
  HONEY_TOKEN_TRIGGERED: "Honey Token ausgelöst",
};

// ─── Risk level config ────────────────────────────────────────────────────────

const RISK_CONFIG: Record<
  string,
  { badge: string; icon: React.ReactNode; label: string }
> = {
  LOW: {
    badge:
      "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    icon: <CheckCircle className="w-4 h-4" />,
    label: "Niedrig",
  },
  MEDIUM: {
    badge: "bg-sky-500/10 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
    icon: <Info className="w-4 h-4" />,
    label: "Mittel",
  },
  HIGH: {
    badge:
      "bg-amber-500/10 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    icon: <AlertCircle className="w-4 h-4" />,
    label: "Hoch",
  },
  CRITICAL: {
    badge: "bg-red-500/10 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    icon: <AlertTriangle className="w-4 h-4" />,
    label: "Kritisch",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Gerade eben";
  if (diffMins < 60) return `vor ${diffMins} Min.`;
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  if (diffDays < 7) return `vor ${diffDays} Tagen`;
  return date.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseUserAgent(ua?: string): { isMobile: boolean; label: string } {
  if (!ua) return { isMobile: false, label: "Unbekanntes Gerät" };
  const lower = ua.toLowerCase();
  const isMobile = /mobile|android|iphone|ipad|tablet/i.test(lower);

  let browser = "Unbekannter Browser";
  if (lower.includes("chrome") && !lower.includes("edge")) browser = "Chrome";
  else if (lower.includes("firefox")) browser = "Firefox";
  else if (lower.includes("safari") && !lower.includes("chrome"))
    browser = "Safari";
  else if (lower.includes("edge")) browser = "Edge";

  let os = "Unbekanntes OS";
  if (lower.includes("windows")) os = "Windows";
  else if (lower.includes("mac")) os = "macOS";
  else if (lower.includes("linux")) os = "Linux";
  else if (lower.includes("android")) os = "Android";
  else if (lower.includes("iphone") || lower.includes("ipad")) os = "iOS";

  return { isMobile, label: `${browser} auf ${os}` };
}

// ─── SecurityLogItem ──────────────────────────────────────────────────────────

function SecurityLogItem({ log }: { log: SecurityLog }) {
  const [expanded, setExpanded] = useState(false);
  const risk = RISK_CONFIG[log.riskLevel] ?? RISK_CONFIG.LOW;
  const device = parseUserAgent(log.userAgent);
  const eventLabel = EVENT_LABELS[log.event] ?? log.event.replace(/_/g, " ");

  return (
    <div className="overflow-hidden rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-white/[0.025] transition-all">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 text-left hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-start gap-3">
          {/* Risk icon */}
          <div
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${risk.badge}`}
          >
            {risk.icon}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[14px] font-medium text-slate-900 dark:text-white">
                {eventLabel}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${risk.badge}`}
              >
                {risk.label}
              </span>
            </div>
            <p className="mt-1 line-clamp-1 text-[12px] text-slate-500 dark:text-white/40">
              {log.description}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {log.ipAddress && (
                <span className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-white/30">
                  <Globe className="h-3 w-3" />
                  {log.ipAddress}
                </span>
              )}
              {log.city && log.country && (
                <span className="text-[11px] text-slate-400 dark:text-white/30">
                  {log.city}, {log.country}
                </span>
              )}
              <span className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-white/30">
                <Clock className="h-3 w-3" />
                {formatRelative(log.createdAt)}
              </span>
            </div>
          </div>

          {/* Device icon */}
          <div className="shrink-0 text-slate-300 dark:text-white/20">
            {device.isMobile ? (
              <Smartphone className="h-5 w-5" />
            ) : (
              <Monitor className="h-5 w-5" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-black/[0.04] dark:border-white/[0.06] bg-slate-50/60 dark:bg-white/[0.015] px-5 pb-4 pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-400 dark:text-white/30">
                Datum &amp; Zeit
              </p>
              <p className="text-[13px] text-slate-700 dark:text-white/70">
                {formatFullDate(log.createdAt)}
              </p>
            </div>
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-400 dark:text-white/30">
                Gerät
              </p>
              <p className="text-[13px] text-slate-700 dark:text-white/70">
                {device.label}
              </p>
            </div>
            {log.ipAddress && (
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-400 dark:text-white/30">
                  IP-Adresse
                </p>
                <p className="font-mono text-[13px] text-slate-700 dark:text-white/70">
                  {log.ipAddress}
                </p>
              </div>
            )}
            {log.city && log.country && (
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-400 dark:text-white/30">
                  Standort
                </p>
                <p className="text-[13px] text-slate-700 dark:text-white/70">
                  {log.city}, {log.country}
                  {log.countryCode ? ` (${log.countryCode})` : ""}
                </p>
              </div>
            )}
            {log.targetType && (
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-400 dark:text-white/30">
                  Ziel
                </p>
                <p className="text-[13px] text-slate-700 dark:text-white/70">
                  {log.targetType}
                  {log.targetId && (
                    <span className="text-slate-400 dark:text-white/30">
                      {" "}
                      ({log.targetId.slice(0, 8)}…)
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div className="mt-4 border-t border-black/[0.04] dark:border-white/[0.05] pt-4">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-slate-400 dark:text-white/30">
                Weitere Details
              </p>
              <pre className="overflow-x-auto rounded-lg bg-slate-100 dark:bg-white/[0.04] p-3 text-[11px] text-slate-600 dark:text-white/50">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Filter pill ──────────────────────────────────────────────────────────────

function FilterPill({
  label,
  count,
  active,
  onClick,
  color,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-medium transition-colors ${
        active
          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
          : "border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-slate-600 dark:text-white/50 hover:bg-slate-50 dark:hover:bg-white/[0.07]"
      }`}
    >
      <span className={active ? "" : color}>{label}</span>
      <span
        className={
          active
            ? "text-white/60 dark:text-slate-900/60"
            : "text-slate-400 dark:text-white/25"
        }
      >
        {count}
      </span>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * Per-user security log page for Atlas.
 * Auth: requires authenticated Atlas session (getAtlasAuth).
 * Data: /api/security/logs?view=user — always scoped to the CALLER's own events.
 */
export default function AtlasSecurityLogPage() {
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
      if (!res.ok) throw new Error("Protokoll konnte nicht geladen werden");

      const data = (await res.json()) as { logs?: SecurityLog[] };
      setLogs(data.logs ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Sicherheitsprotokoll konnte nicht geladen werden",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const filtered =
    riskFilter === "all"
      ? logs
      : logs.filter((l) => l.riskLevel === riskFilter);

  const counts = {
    all: logs.length,
    CRITICAL: logs.filter((l) => l.riskLevel === "CRITICAL").length,
    HIGH: logs.filter((l) => l.riskLevel === "HIGH").length,
    MEDIUM: logs.filter((l) => l.riskLevel === "MEDIUM").length,
    LOW: logs.filter((l) => l.riskLevel === "LOW").length,
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 text-slate-900 dark:text-slate-100">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/atlas/settings"
          className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-700 dark:text-white/30 dark:hover:text-white/70 transition-colors"
        >
          <ChevronLeft className="h-3 w-3" />
          Zurück zu Einstellungen
        </Link>
      </div>

      {/* Header */}
      <header className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 dark:bg-red-500/10">
            <FileText className="h-5 w-5 text-red-500 dark:text-red-400" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/30">
              Sicherheit
            </p>
            <h1 className="text-[22px] font-semibold tracking-tight text-slate-900 dark:text-white">
              Sicherheitsprotokoll
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchLogs(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.06] dark:border-white/[0.07] bg-white dark:bg-white/[0.04] px-3 py-2 text-[12px] font-medium text-slate-500 dark:text-white/50 hover:bg-slate-50 dark:hover:bg-white/[0.07] transition-colors disabled:opacity-40"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
          Aktualisieren
        </button>
      </header>

      {/* Description */}
      <p className="mb-6 text-[13px] leading-relaxed text-slate-500 dark:text-white/40">
        Alle Sicherheitsereignisse deines Accounts — Anmeldungen,
        2FA-Änderungen, Passkey-Verwaltung und erkannte Bedrohungen. Nur deine
        eigenen Ereignisse werden angezeigt.
      </p>

      {/* Risk filters */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="mr-1 flex items-center gap-1 text-[11px] text-slate-400 dark:text-white/30">
          <Filter className="h-3.5 w-3.5" />
          <span>Filter:</span>
        </div>
        <FilterPill
          label="Alle"
          count={counts.all}
          active={riskFilter === "all"}
          onClick={() => setRiskFilter("all")}
        />
        <FilterPill
          label="Kritisch"
          count={counts.CRITICAL}
          active={riskFilter === "CRITICAL"}
          onClick={() => setRiskFilter("CRITICAL")}
          color="text-red-500 dark:text-red-400"
        />
        <FilterPill
          label="Hoch"
          count={counts.HIGH}
          active={riskFilter === "HIGH"}
          onClick={() => setRiskFilter("HIGH")}
          color="text-amber-500 dark:text-amber-400"
        />
        <FilterPill
          label="Mittel"
          count={counts.MEDIUM}
          active={riskFilter === "MEDIUM"}
          onClick={() => setRiskFilter("MEDIUM")}
          color="text-sky-500 dark:text-sky-400"
        />
        <FilterPill
          label="Niedrig"
          count={counts.LOW}
          active={riskFilter === "LOW"}
          onClick={() => setRiskFilter("LOW")}
          color="text-emerald-500 dark:text-emerald-400"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-slate-300 dark:text-white/20" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/5 p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-7 w-7 text-red-500 dark:text-red-400" />
          <p className="mb-4 text-[13px] text-red-600 dark:text-red-400">
            {error}
          </p>
          <button
            type="button"
            onClick={() => void fetchLogs()}
            className="rounded-lg bg-red-500 px-4 py-2 text-[12px] font-medium text-white hover:bg-red-600 transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-black/[0.05] dark:border-white/[0.06] bg-white dark:bg-white/[0.025] p-10 text-center">
          <Shield className="mx-auto mb-4 h-9 w-9 text-slate-200 dark:text-white/10" />
          <h3 className="mb-1.5 text-[14px] font-medium text-slate-700 dark:text-white/60">
            {riskFilter === "all"
              ? "Noch keine Ereignisse"
              : `Keine ${RISK_CONFIG[riskFilter]?.label ?? riskFilter}-Ereignisse`}
          </h3>
          <p className="text-[12px] text-slate-400 dark:text-white/30">
            {riskFilter === "all"
              ? "Sicherheitsereignisse erscheinen hier, sobald du deinen Account nutzt."
              : "Keine Ereignisse mit diesem Risikolevel gefunden."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((log) => (
            <SecurityLogItem key={log.id} log={log} />
          ))}
        </div>
      )}

      {/* Footer note */}
      {!loading && !error && logs.length > 0 && (
        <div className="mt-8 rounded-lg border border-black/[0.04] dark:border-white/[0.05] bg-slate-50/60 dark:bg-white/[0.02] px-4 py-3">
          <p className="text-[11.5px] leading-relaxed text-slate-400 dark:text-white/30">
            Sicherheitsprotokolle werden 365 Tage aufbewahrt. Bei verdächtiger
            Aktivität bitte sofort das Passwort ändern und den Support
            kontaktieren.
          </p>
        </div>
      )}
    </div>
  );
}
