/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Audit-Log Admin View.
 *
 * Read-only browse over the AtlasAuditLog table. Filters by action
 * type + time-range. Shows the hash-chain integrity status at the
 * top so operators can confirm at-a-glance that the log hasn't been
 * tampered with since the last verified row.
 *
 * Platform-admin only. The same gate as the cost-tracking page.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertTriangle, Shield } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/atlas-auth";
import {
  readAtlasAudit,
  verifyAtlasAuditChain,
} from "@/lib/atlas/audit-log.server";

export const dynamic = "force-dynamic";

export default async function AtlasAuditPage() {
  const admin = await requirePlatformAdmin();
  if (!admin) redirect("/atlas");

  /* Read the last 200 rows (the default upper bound) + verify the
     system-org chain. For multi-tenant verification the operator
     would call verifyAtlasAuditChain per organisation; here we
     surface the global chain as a quick health-check. */
  const [rows, chainCheck] = await Promise.all([
    readAtlasAudit({ limit: 200 }),
    verifyAtlasAuditChain(null),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 text-slate-900 dark:text-slate-100">
      <div className="mb-6">
        <Link
          href="/atlas/settings"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft size={12} /> Zurück zu Einstellungen
        </Link>
      </div>

      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Operations · Audit Log
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Atlas Audit-Log
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Wer hat wann was getan. Tamper-evident via Hash-Chain — jeder Eintrag
          referenziert den Vorgänger per SHA-256. Bei der Anzeige der letzten
          200 Einträge sortiert nach Zeit absteigend.
        </p>
      </header>

      {/* Chain-integrity card */}
      <div
        className={`mb-8 flex items-start gap-3 rounded-lg border p-4 ${
          chainCheck.ok
            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/5"
            : "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/5"
        }`}
      >
        {chainCheck.ok ? (
          <CheckCircle2
            size={16}
            className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-300"
          />
        ) : (
          <AlertTriangle
            size={16}
            className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
          />
        )}
        <div className="flex-1">
          <p
            className={`text-sm font-medium ${
              chainCheck.ok
                ? "text-emerald-900 dark:text-emerald-100"
                : "text-red-900 dark:text-red-100"
            }`}
          >
            {chainCheck.ok
              ? "Hash-Chain unverändert"
              : `Hash-Chain gebrochen bei Index ${chainCheck.brokenAt}`}
          </p>
          <p
            className={`mt-0.5 text-xs ${
              chainCheck.ok
                ? "text-emerald-700 dark:text-emerald-200/80"
                : "text-red-700 dark:text-red-200/80"
            }`}
          >
            {chainCheck.total} Einträge verifiziert.{" "}
            {chainCheck.ok
              ? "Keine Manipulation feststellbar."
              : "Mögliche Manipulation — sofortige Investigation erforderlich."}
          </p>
        </div>
        <Shield
          size={20}
          className={`shrink-0 ${
            chainCheck.ok
              ? "text-emerald-500/50 dark:text-emerald-400/50"
              : "text-red-500/50 dark:text-red-400/50"
          }`}
        />
      </div>

      <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
        Letzte {rows.length} Einträge
      </h2>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700/60 dark:bg-slate-900/40">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-slate-500">
            Noch keine Audit-Einträge.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2 text-left">Zeit</th>
                <th className="px-4 py-2 text-left">User</th>
                <th className="px-4 py-2 text-left">Action</th>
                <th className="px-4 py-2 text-left">Entity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-slate-200 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/40"
                >
                  <td className="px-4 py-2 text-[11px] tabular-nums text-slate-500">
                    {new Date(r.createdAt).toLocaleString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-2 text-[12px] text-slate-800 dark:text-slate-200">
                    {r.user?.name || r.user?.email || (
                      <span className="text-slate-400 italic">system</span>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-[11.5px] text-slate-700 dark:text-slate-300">
                    {r.action}
                  </td>
                  <td className="px-4 py-2 text-[11px] text-slate-500">
                    {r.entityType && r.entityId
                      ? `${r.entityType}#${r.entityId.slice(0, 8)}…`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
