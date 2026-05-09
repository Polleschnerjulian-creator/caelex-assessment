"use client";

/**
 * Atlas DSGVO Self-Service Card — Lawyer-UX-Audit DSGVO-2 Stage-1.
 *
 * Renders the two GDPR rights that Atlas surfaces in-app:
 *   - Art. 20 Data Portability (request data export)
 *   - Art. 17 Right to Erasure (request account deletion, 30d grace)
 *
 * Both submit to /api/atlas/compliance/{data-export,data-deletion}
 * which currently send confirmation+DPO emails and write an audit-log
 * entry. Stage-2 will add per-request DB tracking + a cron-processor
 * that auto-generates the export bundle and auto-executes the deletion
 * after the grace-period.
 *
 * Why a client island: the card needs interactive state (loading,
 * success, error, confirmation modal for deletion). The parent
 * settings page is a client component too, so this just keeps the
 * interaction logic isolated in one focused file.
 */

import { useState } from "react";
import {
  Download,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface Props {
  userEmail: string;
}

type ExportState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; receivedAt: string }
  | { kind: "error"; message: string };

type DeletionState =
  | { kind: "idle" }
  | { kind: "confirming" }
  | { kind: "submitting" }
  | { kind: "success"; scheduledDeletionAt: string }
  | { kind: "error"; message: string };

export function AtlasDataRightsCard({ userEmail }: Props) {
  const { t } = useLanguage();
  const [exportState, setExportState] = useState<ExportState>({ kind: "idle" });
  const [deletionState, setDeletionState] = useState<DeletionState>({
    kind: "idle",
  });
  const [confirmInput, setConfirmInput] = useState("");
  const [reason, setReason] = useState("");

  async function submitExport() {
    setExportState({ kind: "submitting" });
    try {
      const res = await fetch("/api/atlas/compliance/data-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Anfrage fehlgeschlagen");
      setExportState({ kind: "success", receivedAt: data.receivedAt });
    } catch (e) {
      setExportState({
        kind: "error",
        message: e instanceof Error ? e.message : "Unbekannter Fehler",
      });
    }
  }

  async function submitDeletion() {
    setDeletionState({ kind: "submitting" });
    try {
      const res = await fetch("/api/atlas/compliance/data-deletion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmEmail: confirmInput,
          reason: reason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Anfrage fehlgeschlagen");
      setDeletionState({
        kind: "success",
        scheduledDeletionAt: data.scheduledDeletionAt,
      });
    } catch (e) {
      setDeletionState({
        kind: "error",
        message: e instanceof Error ? e.message : "Unbekannter Fehler",
      });
    }
  }

  return (
    <section className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] p-5">
      <h3 className="text-[14px] font-semibold text-[var(--atlas-text-primary)] mb-1">
        {t("atlas.settings_compliance_rights_title")}
      </h3>
      <p className="text-[12.5px] text-[var(--atlas-text-secondary)] leading-relaxed mb-4">
        {t("atlas.settings_compliance_rights_intro")}
      </p>

      {/* ── Data Export (Art. 20 DSGVO) ── */}
      <div className="rounded-lg border border-[var(--atlas-border-subtle)] bg-[var(--atlas-bg-inset)] p-4 mb-3">
        <div className="flex items-start gap-3 mb-3">
          <div className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            <Download size={14} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-[var(--atlas-text-primary)] mb-1">
              {t("atlas.settings_compliance_export_title")}{" "}
              <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                Art. 20 DSGVO
              </span>
            </p>
            <p className="text-[12px] text-[var(--atlas-text-muted)] leading-relaxed">
              {t("atlas.settings_compliance_export_body")}
            </p>
          </div>
        </div>

        {exportState.kind === "idle" && (
          <button
            type="button"
            onClick={submitExport}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[var(--atlas-action-bg)] text-[var(--atlas-action-text)] text-[12.5px] font-medium hover:bg-[var(--atlas-action-bg-hover)] transition-colors"
          >
            <Download size={13} aria-hidden="true" />
            {t("atlas.settings_compliance_export_button")}
          </button>
        )}
        {exportState.kind === "submitting" && (
          <div className="inline-flex items-center gap-2 text-[12px] text-[var(--atlas-text-muted)]">
            <Loader2 size={13} className="animate-spin" aria-hidden="true" />
            {t("atlas.settings_compliance_submitting")}
          </div>
        )}
        {exportState.kind === "success" && (
          <div
            className="flex items-start gap-2 p-3 rounded-md bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20"
            role="status"
          >
            <CheckCircle2
              size={14}
              className="shrink-0 mt-0.5 text-emerald-700 dark:text-emerald-300"
              aria-hidden="true"
            />
            <p className="text-[12px] text-emerald-800 dark:text-emerald-200 leading-relaxed">
              {t("atlas.settings_compliance_export_success")}
            </p>
          </div>
        )}
        {exportState.kind === "error" && (
          <div
            className="flex items-start gap-2 p-3 rounded-md bg-rose-50 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20"
            role="alert"
          >
            <AlertTriangle
              size={14}
              className="shrink-0 mt-0.5 text-rose-700 dark:text-rose-300"
              aria-hidden="true"
            />
            <div className="text-[12px] text-rose-800 dark:text-rose-200 leading-relaxed">
              <strong>{t("atlas.settings_compliance_error_title")}:</strong>{" "}
              {exportState.message}
              <button
                type="button"
                onClick={() => setExportState({ kind: "idle" })}
                className="ml-2 underline hover:no-underline"
              >
                {t("atlas.settings_compliance_retry")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Account Deletion (Art. 17 DSGVO) ── */}
      <div className="rounded-lg border border-rose-200/70 bg-rose-50/30 p-4 dark:border-rose-500/20 dark:bg-rose-500/[0.04]">
        <div className="flex items-start gap-3 mb-3">
          <div className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-md bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            <Trash2 size={14} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-[var(--atlas-text-primary)] mb-1">
              {t("atlas.settings_compliance_deletion_title")}{" "}
              <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20">
                Art. 17 DSGVO · 30d Grace
              </span>
            </p>
            <p className="text-[12px] text-[var(--atlas-text-muted)] leading-relaxed">
              {t("atlas.settings_compliance_deletion_body")}
            </p>
          </div>
        </div>

        {deletionState.kind === "idle" && (
          <button
            type="button"
            onClick={() => setDeletionState({ kind: "confirming" })}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-rose-300 bg-white text-rose-700 text-[12.5px] font-medium hover:bg-rose-50 transition-colors dark:border-rose-500/30 dark:bg-transparent dark:text-rose-300 dark:hover:bg-rose-500/10"
          >
            <Trash2 size={13} aria-hidden="true" />
            {t("atlas.settings_compliance_deletion_button")}
          </button>
        )}

        {deletionState.kind === "confirming" && (
          <div className="space-y-3">
            <div className="text-[12px] text-[var(--atlas-text-secondary)] leading-relaxed">
              <strong>
                {t("atlas.settings_compliance_deletion_confirm_label")}
              </strong>
              <span className="font-mono ml-2 px-1.5 py-0.5 rounded bg-[var(--atlas-bg-inset)] text-[var(--atlas-text-primary)]">
                {userEmail}
              </span>
            </div>
            <input
              type="email"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={userEmail}
              autoComplete="off"
              aria-label={t("atlas.settings_compliance_deletion_confirm_label")}
              className="w-full max-w-md px-3 py-2 rounded-lg border border-[var(--atlas-border)] bg-white text-[13px] text-[var(--atlas-text-primary)] placeholder:text-[var(--atlas-text-faint)] focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400 dark:bg-[var(--atlas-bg-inset)]"
            />
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t(
                "atlas.settings_compliance_deletion_reason_placeholder",
              )}
              maxLength={2000}
              rows={3}
              aria-label={t(
                "atlas.settings_compliance_deletion_reason_placeholder",
              )}
              className="w-full max-w-md px-3 py-2 rounded-lg border border-[var(--atlas-border)] bg-white text-[12.5px] text-[var(--atlas-text-primary)] placeholder:text-[var(--atlas-text-faint)] focus:border-[var(--atlas-border-strong)] focus:outline-none resize-y dark:bg-[var(--atlas-bg-inset)]"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={submitDeletion}
                disabled={
                  confirmInput.trim().toLowerCase() !== userEmail.toLowerCase()
                }
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-rose-600 text-white text-[12.5px] font-medium hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 size={13} aria-hidden="true" />
                {t("atlas.settings_compliance_deletion_confirm_button")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeletionState({ kind: "idle" });
                  setConfirmInput("");
                  setReason("");
                }}
                className="px-3 py-1.5 rounded-lg text-[12.5px] text-[var(--atlas-text-secondary)] hover:bg-[var(--atlas-bg-inset)] transition-colors"
              >
                {t("atlas.settings_compliance_cancel")}
              </button>
            </div>
          </div>
        )}

        {deletionState.kind === "submitting" && (
          <div className="inline-flex items-center gap-2 text-[12px] text-[var(--atlas-text-muted)]">
            <Loader2 size={13} className="animate-spin" aria-hidden="true" />
            {t("atlas.settings_compliance_submitting")}
          </div>
        )}
        {deletionState.kind === "success" && (
          <div
            className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-300 dark:bg-amber-500/10 dark:border-amber-500/30"
            role="status"
          >
            <AlertTriangle
              size={14}
              className="shrink-0 mt-0.5 text-amber-700 dark:text-amber-300"
              aria-hidden="true"
            />
            <p className="text-[12px] text-amber-900 dark:text-amber-200 leading-relaxed">
              {t("atlas.settings_compliance_deletion_success_prefix")}{" "}
              <strong>
                {new Date(deletionState.scheduledDeletionAt).toLocaleDateString(
                  "de-DE",
                  {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  },
                )}
              </strong>
              . {t("atlas.settings_compliance_deletion_success_suffix")}
            </p>
          </div>
        )}
        {deletionState.kind === "error" && (
          <div
            className="flex items-start gap-2 p-3 rounded-md bg-rose-50 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20"
            role="alert"
          >
            <AlertTriangle
              size={14}
              className="shrink-0 mt-0.5 text-rose-700 dark:text-rose-300"
              aria-hidden="true"
            />
            <div className="text-[12px] text-rose-800 dark:text-rose-200 leading-relaxed">
              <strong>{t("atlas.settings_compliance_error_title")}:</strong>{" "}
              {deletionState.message}
              <button
                type="button"
                onClick={() => setDeletionState({ kind: "confirming" })}
                className="ml-2 underline hover:no-underline"
              >
                {t("atlas.settings_compliance_retry")}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
