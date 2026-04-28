"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * RevokeMatterModal — confirmation flow for the destructive revoke
 * action. Replaces the previous `prompt()`-based flow with a proper
 * modal that requires:
 *
 *   1. A reason (3-500 chars, sent to the audit log + counter-party
 *      notification).
 *   2. Type-to-confirm — user must type the matter name verbatim.
 *      Same pattern Stripe / GitHub use for destructive ops; prevents
 *      accidental clicks while keeping the modal modal-less for
 *      power users (no extra "are you sure?" round trip).
 *
 * The modal owns its own state (open/close, fields, submit). The
 * parent passes a callback that hits /api/network/matter/:id/revoke
 * — the modal doesn't know the URL, so it can be re-used for any
 * revoke-like flow later.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, X, Loader2 } from "lucide-react";

interface RevokeMatterModalProps {
  open: boolean;
  matterName: string;
  /** Called with the user-entered reason once both gates are passed. */
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}

const MIN_REASON = 3;
const MAX_REASON = 500;

export function RevokeMatterModal({
  open,
  matterName,
  onConfirm,
  onClose,
}: RevokeMatterModalProps) {
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  // Reset every time the modal opens — prevents leaked state if a
  // user opens, types, cancels, and re-opens for a different matter.
  useEffect(() => {
    if (open) {
      setReason("");
      setConfirmText("");
      setSubmitting(false);
      setError(null);
      // Focus the reason field after the open animation
      const t = setTimeout(() => reasonRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  // ESC closes when not submitting
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const reasonValid =
    reason.trim().length >= MIN_REASON && reason.trim().length <= MAX_REASON;
  const confirmValid = confirmText.trim() === matterName.trim();
  const canSubmit = reasonValid && confirmValid && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
    // On success, parent unmounts the modal — no need to reset here.
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="revoke-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
    >
      {/* Backdrop */}
      <div
        onClick={() => !submitting && onClose()}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Card */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-950/40 flex items-center justify-center flex-shrink-0 text-red-600 dark:text-red-400">
            <AlertTriangle size={18} strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <h2
              id="revoke-modal-title"
              className="text-base font-semibold text-slate-900 dark:text-white"
            >
              Mandat beenden
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Permanente Aktion — kann nicht rückgängig gemacht werden.
            </p>
          </div>
          <button
            onClick={() => !submitting && onClose()}
            disabled={submitting}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-30 transition"
            aria-label="Schließen"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            Sobald beendet werden alle aktiven Zugriffe gesperrt. Der{" "}
            <span className="font-medium">
              Hash-Chain Audit-Log bleibt unverändert
            </span>{" "}
            — frühere Zugriffe sind weiterhin verifizierbar. Neue Datennutzung
            durch die andere Seite ist ab sofort nicht mehr möglich.
          </p>

          {/* Reason */}
          <div>
            <label
              htmlFor="revoke-reason"
              className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-500 mb-1.5"
            >
              Grund · wird im Audit-Log und der Benachrichtigung gezeigt
            </label>
            <textarea
              id="revoke-reason"
              ref={reasonRef}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={MAX_REASON}
              placeholder="z.B. Mandat abgeschlossen, Konflikt of interest, …"
              disabled={submitting}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 resize-none focus:outline-none focus:border-slate-500 dark:focus:border-slate-500 disabled:opacity-50"
            />
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span
                className={
                  reason.trim().length > 0 && !reasonValid
                    ? "text-red-600 dark:text-red-400"
                    : "text-slate-400"
                }
              >
                Mindestens {MIN_REASON} Zeichen
              </span>
              <span className="text-slate-400 tabular-nums">
                {reason.length}/{MAX_REASON}
              </span>
            </div>
          </div>

          {/* Type-to-confirm */}
          <div>
            <label
              htmlFor="revoke-confirm"
              className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-500 mb-1.5"
            >
              Bestätigung · tippen Sie den Mandatsnamen
            </label>
            <div className="text-xs text-slate-600 dark:text-slate-400 mb-2 font-mono bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700/50 select-all">
              {matterName}
            </div>
            <input
              id="revoke-confirm"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Mandatsname hier eintippen"
              disabled={submitting}
              autoComplete="off"
              spellCheck={false}
              className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none disabled:opacity-50 ${
                confirmText.length > 0 && !confirmValid
                  ? "border-red-300 dark:border-red-900/60"
                  : "border-slate-300 dark:border-slate-700 focus:border-slate-500"
              } ${confirmValid ? "border-emerald-400 dark:border-emerald-700/60" : ""}`}
            />
            {confirmText.length > 0 && !confirmValid && (
              <div className="text-[11px] text-red-600 dark:text-red-400 mt-1">
                Stimmt nicht überein — kopieren Sie genau den Namen oben.
              </div>
            )}
          </div>

          {error && (
            <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-md px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 h-9 rounded-md border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`px-4 h-9 rounded-md text-sm font-medium inline-flex items-center gap-2 transition ${
              canSubmit
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-red-200 text-red-50 dark:bg-red-900/30 dark:text-red-300/50 cursor-not-allowed"
            }`}
          >
            {submitting && (
              <Loader2 size={12} strokeWidth={2.2} className="animate-spin" />
            )}
            {submitting ? "Beende…" : "Mandat beenden"}
          </button>
        </div>
      </div>
    </div>
  );
}
