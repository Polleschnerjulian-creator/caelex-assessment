"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * ApprovalSignPanel — User picks role + signs.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, CheckCircle2, PenSquare } from "lucide-react";

const ALL_ROLES = [
  "SACHBEARBEITER",
  "REFERATSLEITER",
  "DATENSCHUTZBEAUFTRAGTER",
  "RECHTSREFERENT",
  "INSPEKTOR",
  "BEHOERDENLEITER",
] as const;

const ROLE_LABELS: Record<string, string> = {
  SACHBEARBEITER: "Sachbearbeiter",
  REFERATSLEITER: "Referatsleiter",
  DATENSCHUTZBEAUFTRAGTER: "Datenschutzbeauftragter",
  RECHTSREFERENT: "Rechtsreferent",
  INSPEKTOR: "Inspektor",
  BEHOERDENLEITER: "Behördenleiter",
};

export function ApprovalSignPanel({
  requestId,
  requiredRoles,
  rolesPresent,
}: {
  requestId: string;
  requiredRoles: string[];
  rolesPresent: string[];
}) {
  const router = useRouter();
  const [role, setRole] = useState<string>(
    requiredRoles.find((r) => !rolesPresent.includes(r)) ?? "SACHBEARBEITER",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function sign() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/pharos/approvals/${requestId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approverRole: role }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Sign fehlgeschlagen");
      } else {
        setSuccess(
          json.finalized
            ? "Quorum erreicht — Approval ist final."
            : "Signatur eingetragen. Quorum noch unvollständig.",
        );
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-white/5 dark:bg-navy-900/30">
      <div className="flex items-center gap-2 mb-3">
        <PenSquare className="w-4 h-4 text-amber-700 dark:text-amber-400" />
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Mitzeichnen
        </h2>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
        Deine Ed25519-Signatur wird unwiderruflich in die Hash-Chain
        eingetragen. Wähle die Rolle, in der du diesen Vorgang signierst.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={submitting}
          className="text-xs px-3 py-2 rounded border border-slate-300 bg-white text-slate-800 dark:bg-navy-900/40 dark:border-white/10 dark:text-slate-200"
        >
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
              {requiredRoles.includes(r) && !rolesPresent.includes(r)
                ? "  (Pflicht-Rolle, fehlt)"
                : ""}
              {rolesPresent.includes(r) ? "  (bereits signiert)" : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={submitting}
          onClick={sign}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded border border-emerald-600 bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50"
        >
          {submitting ? (
            <span className="inline-block w-3 h-3 rounded-full bg-current opacity-60 animate-pulse" />
          ) : (
            <PenSquare className="w-3.5 h-3.5" />
          )}
          Signieren
        </button>
      </div>

      {error && (
        <div className="mt-3 inline-flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5" />
          {error}
        </div>
      )}
      {success && (
        <div className="mt-3 inline-flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 mt-0.5" />
          {success}
        </div>
      )}
    </div>
  );
}
