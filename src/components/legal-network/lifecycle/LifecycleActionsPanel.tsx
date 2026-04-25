"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * LifecycleActionsPanel — bottom-of-MatterDetail "danger zone" for
 * lifecycle actions. Mirrors the Stripe/GitHub pattern: a quiet
 * "Lifecycle" section for the reversible suspend/resume, then a
 * visually-distinct red-bordered "Gefahrenzone" for the irreversible
 * revoke.
 *
 * Visibility rules:
 *   - Pause/Resume: operator-side only (the client controls whether
 *     they want the firm reading their data; the firm doesn't pause
 *     itself).
 *   - Revoke: either party can revoke when the matter is in any
 *     non-terminal state (PENDING_INVITE, PENDING_CONSENT, ACTIVE,
 *     SUSPENDED).
 *   - REVOKED / CLOSED: panel renders a status-only view, no buttons.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useState } from "react";
import { PauseCircle, PlayCircle, AlertTriangle, Clock } from "lucide-react";
import { RevokeMatterModal } from "./RevokeMatterModal";

interface LifecycleActionsPanelProps {
  matterId: string;
  matterName: string;
  status: string;
  viewerSide: "ATLAS" | "CAELEX";
  /** Last status-change moment, formatted for display.
   *  null while loading or never-active. */
  lastStatusChange: string | null;
  /** Reason supplied if the matter was revoked. */
  revocationReason: string | null;
  /** Called by parent after a successful action so it re-fetches state. */
  onChanged: () => Promise<void>;
}

export function LifecycleActionsPanel({
  matterId,
  matterName,
  status,
  viewerSide,
  lastStatusChange,
  revocationReason,
  onChanged,
}: LifecycleActionsPanelProps) {
  const [busy, setBusy] = useState<"suspend" | "resume" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revokeOpen, setRevokeOpen] = useState(false);

  const isOperator = viewerSide === "CAELEX";
  const canSuspend = isOperator && status === "ACTIVE";
  const canResume = isOperator && status === "SUSPENDED";
  const canRevoke =
    status !== "REVOKED" && status !== "CLOSED" && status !== "PENDING_INVITE";
  const isTerminal = status === "REVOKED" || status === "CLOSED";

  const setStatus = useCallback(
    async (nextStatus: "ACTIVE" | "SUSPENDED") => {
      setBusy(nextStatus === "SUSPENDED" ? "suspend" : "resume");
      setError(null);
      try {
        const res = await fetch(`/api/network/matter/${matterId}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nextStatus }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? "Status-Änderung fehlgeschlagen");
        }
        await onChanged();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(null);
      }
    },
    [matterId, onChanged],
  );

  const submitRevoke = useCallback(
    async (reason: string) => {
      const res = await fetch(`/api/network/matter/${matterId}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Widerruf fehlgeschlagen");
      }
      await onChanged();
      setRevokeOpen(false);
    },
    [matterId, onChanged],
  );

  // Terminal state (REVOKED/CLOSED): render an informational card only
  if (isTerminal) {
    return (
      <section className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-slate-500">
            <Clock size={16} strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold tracking-[0.18em] uppercase text-slate-500 mb-1">
              Lifecycle
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Mandat ist {status === "REVOKED" ? "widerrufen" : "geschlossen"}.
              Audit-Log bleibt einsehbar.
            </p>
            {revocationReason && (
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 italic">
                „{revocationReason}"
              </p>
            )}
            {lastStatusChange && (
              <p className="text-[11px] text-slate-400 mt-2">
                Beendet am {lastStatusChange}
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {/* Lifecycle (reversible) */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex items-center justify-between gap-4 mb-1">
          <h3 className="text-[10px] font-semibold tracking-[0.22em] uppercase text-slate-500">
            Lifecycle
          </h3>
          <span className="text-[11px] text-slate-400">
            {status === "ACTIVE" && "aktiv"}
            {status === "SUSPENDED" && "pausiert"}
            {status === "PENDING_INVITE" && "wartet auf Annahme"}
            {status === "PENDING_CONSENT" && "wartet auf Gegenzeichnung"}
          </span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          {status === "ACTIVE" && isOperator
            ? "Sie können den Zugriff der Kanzlei jederzeit pausieren — Daten bleiben verfügbar, aber neue Zugriffe sind blockiert. Pausen können später wieder aufgehoben werden."
            : status === "SUSPENDED" && isOperator
              ? "Mandat ist pausiert. Bei Wiederaufnahme erhält die Kanzlei sofort wieder Zugriff im ursprünglichen Scope."
              : status === "ACTIVE"
                ? "Mandat ist aktiv. Pausieren ist nur durch den Mandanten möglich."
                : "Mandat hat noch keinen aktiven Zustand — keine Pause/Resume möglich."}
        </p>

        {(canSuspend || canResume) && (
          <div className="flex items-center gap-2">
            {canSuspend && (
              <button
                onClick={() => setStatus("SUSPENDED")}
                disabled={busy !== null}
                className="inline-flex items-center gap-2 px-3.5 h-9 rounded-md border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                <PauseCircle size={13} strokeWidth={1.8} />
                {busy === "suspend" ? "Pausiere…" : "Pausieren"}
              </button>
            )}
            {canResume && (
              <button
                onClick={() => setStatus("ACTIVE")}
                disabled={busy !== null}
                className="inline-flex items-center gap-2 px-3.5 h-9 rounded-md border border-emerald-300 dark:border-emerald-800 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 disabled:opacity-50"
              >
                <PlayCircle size={13} strokeWidth={1.8} />
                {busy === "resume" ? "Aktiviere…" : "Wieder aktivieren"}
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="mt-3 text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {lastStatusChange && (
          <p className="text-[11px] text-slate-400 mt-3">
            Letzter Wechsel: {lastStatusChange}
          </p>
        )}
      </section>

      {/* Danger Zone */}
      {canRevoke && (
        <section className="bg-red-50/30 dark:bg-red-950/10 rounded-2xl border border-red-200 dark:border-red-900/40 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle
                  size={11}
                  strokeWidth={1.8}
                  className="text-red-600 dark:text-red-400"
                />
                <h3 className="text-[10px] font-semibold tracking-[0.22em] uppercase text-red-700 dark:text-red-400">
                  Gefahrenzone
                </h3>
              </div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
                Mandat dauerhaft beenden
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Sperrt alle weitere Datennutzung sofort. Hash-Chain bleibt
                erhalten und der Audit-Log ist weiterhin einsehbar — die Aktion
                ist aber unumkehrbar.
              </p>
            </div>
            <button
              onClick={() => setRevokeOpen(true)}
              className="flex-shrink-0 inline-flex items-center gap-2 px-3.5 h-9 rounded-md border border-red-300 dark:border-red-900/70 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/40"
            >
              Mandat beenden
            </button>
          </div>
        </section>
      )}

      <RevokeMatterModal
        open={revokeOpen}
        matterName={matterName}
        onClose={() => setRevokeOpen(false)}
        onConfirm={submitRevoke}
      />
    </div>
  );
}
