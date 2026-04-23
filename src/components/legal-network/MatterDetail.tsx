"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * MatterDetail — shared detail view for a LegalMatter. Shows scope
 * breakdown, timeline, status controls (revoke + suspend), and the
 * hash-chain-verified audit log.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ScopeItem, ScopeCategory } from "@/lib/legal-network/scope";

interface MatterDetailData {
  matter: {
    id: string;
    name: string;
    reference: string | null;
    description: string | null;
    scope: ScopeItem[];
    status: string;
    invitedFrom: "ATLAS" | "CAELEX";
    invitedAt: string;
    acceptedAt: string | null;
    effectiveFrom: string | null;
    effectiveUntil: string | null;
    handshakeHash: string;
    revokedAt: string | null;
    revocationReason: string | null;
    lawFirmOrgId: string;
    clientOrgId: string;
    lawFirmOrg: { id: string; name: string; logoUrl: string | null };
    clientOrg: { id: string; name: string; logoUrl: string | null };
    _count: { accessLogs: number; invitations: number };
  };
}

interface AuditData {
  entries: Array<{
    id: string;
    action: string;
    actorOrgId: string;
    actorSide: "ATLAS" | "CAELEX";
    resourceType: string;
    resourceId: string | null;
    matterScope: string;
    createdAt: string;
    previousHash: string | null;
    entryHash: string;
  }>;
  chainValid: boolean;
  verifications: Array<{ id: string; valid: boolean; reason?: string }>;
}

const CATEGORY_LABEL: Record<ScopeCategory, string> = {
  COMPLIANCE_ASSESSMENTS: "Compliance-Bewertungen",
  AUTHORIZATION_WORKFLOWS: "Genehmigungs-Workflows",
  DOCUMENTS: "Dokumenten-Vault",
  TIMELINE_DEADLINES: "Fristen & Zeitleiste",
  INCIDENTS: "Vorfälle",
  SPACECRAFT_REGISTRY: "Satelliten-Registry",
  AUDIT_LOGS: "Audit-Logs",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING_INVITE: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  PENDING_CONSENT: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  ACTIVE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  SUSPENDED: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  CLOSED: "bg-slate-500/10 text-slate-500",
  REVOKED: "bg-red-500/10 text-red-700 dark:text-red-400",
};

export function MatterDetail({
  matterId,
  viewerSide,
  returnHref,
}: {
  matterId: string;
  viewerSide: "ATLAS" | "CAELEX";
  returnHref: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<MatterDetailData | null>(null);
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"revoke" | "suspend" | "resume" | null>(
    null,
  );

  const load = useCallback(async () => {
    try {
      const [d, a] = await Promise.all([
        fetch(`/api/network/matter/${matterId}`).then((r) => r.json()),
        fetch(`/api/network/matter/${matterId}/access-log`).then((r) =>
          r.json(),
        ),
      ]);
      if (d.error) throw new Error(d.error);
      setData(d);
      if (!a.error) setAudit(a);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [matterId]);

  useEffect(() => {
    load();
  }, [load]);

  async function doRevoke() {
    const reason = prompt("Grund für Widerruf? (min. 3 Zeichen)");
    if (!reason || reason.length < 3) return;
    setBusy("revoke");
    try {
      const res = await fetch(`/api/network/matter/${matterId}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? "Widerruf fehlgeschlagen");
      } else {
        await load();
      }
    } finally {
      setBusy(null);
    }
  }

  async function setStatus(nextStatus: "ACTIVE" | "SUSPENDED") {
    setBusy(nextStatus === "SUSPENDED" ? "suspend" : "resume");
    try {
      const res = await fetch(`/api/network/matter/${matterId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextStatus }),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? "Status-Änderung fehlgeschlagen");
      } else {
        await load();
      }
    } finally {
      setBusy(null);
    }
  }

  if (error && !data) {
    return (
      <div className="p-8 text-sm text-red-600 dark:text-red-400">
        {error}
        <button
          onClick={() => router.push(returnHref)}
          className="ml-3 underline"
        >
          zurück
        </button>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="p-8 text-sm text-slate-400 animate-pulse">Lade…</div>
    );
  }

  const { matter } = data;
  const counterparty =
    viewerSide === "ATLAS" ? matter.clientOrg : matter.lawFirmOrg;

  const isOperator = viewerSide === "CAELEX";
  const canSuspend = isOperator && matter.status === "ACTIVE";
  const canResume = isOperator && matter.status === "SUSPENDED";
  const canRevoke = matter.status !== "REVOKED" && matter.status !== "CLOSED";

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div>
        <button
          onClick={() => router.push(returnHref)}
          className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-4"
        >
          ← Zurück
        </button>
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] tracking-[0.22em] uppercase text-slate-500">
                {counterparty.name}
              </span>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[matter.status] ?? ""}`}
              >
                {matter.status.toLowerCase().replace("_", " ")}
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              {matter.name}
            </h1>
            {matter.reference && (
              <p className="text-sm text-slate-500 mt-1">
                Ref. {matter.reference}
              </p>
            )}
            {matter.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-2xl">
                {matter.description}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            {/* Phase 2: full-screen matter workspace. Only from the
                Atlas (law-firm) side for now — operator-side workspace
                is a separate Phase-2b concern. Active matters only —
                a workspace on a PENDING/REVOKED matter has nothing
                meaningful to show. */}
            {viewerSide === "ATLAS" && matter.status === "ACTIVE" && (
              <button
                onClick={() =>
                  router.push(`/atlas/network/${matterId}/workspace`)
                }
                className="px-3 py-1.5 text-xs rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium hover:opacity-90"
              >
                → Zum Workspace
              </button>
            )}
            {canSuspend && (
              <button
                onClick={() => setStatus("SUSPENDED")}
                disabled={busy !== null}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {busy === "suspend" ? "…" : "Pausieren"}
              </button>
            )}
            {canResume && (
              <button
                onClick={() => setStatus("ACTIVE")}
                disabled={busy !== null}
                className="px-3 py-1.5 text-xs rounded-lg border border-emerald-300 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              >
                {busy === "resume" ? "…" : "Fortsetzen"}
              </button>
            )}
            {canRevoke && (
              <button
                onClick={doRevoke}
                disabled={busy !== null}
                className="px-3 py-1.5 text-xs rounded-lg border border-red-300 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                {busy === "revoke" ? "…" : "Widerrufen"}
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Scope */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <h2 className="text-[10px] font-semibold tracking-[0.22em] uppercase text-slate-500 mb-3">
          Scope · was die Kanzlei sehen darf
        </h2>
        <ul className="space-y-2">
          {matter.scope.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
              <div className="flex-1 text-sm">
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  {CATEGORY_LABEL[item.category]}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {item.permissions.join(" · ")}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Timeline + proof */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 grid grid-cols-2 gap-5">
        <div>
          <h2 className="text-[10px] font-semibold tracking-[0.22em] uppercase text-slate-500 mb-2">
            Zeitlinie
          </h2>
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between">
              <dt className="text-slate-500">Eingeladen</dt>
              <dd>{new Date(matter.invitedAt).toLocaleString("de-DE")}</dd>
            </div>
            {matter.acceptedAt && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Akzeptiert</dt>
                <dd>{new Date(matter.acceptedAt).toLocaleString("de-DE")}</dd>
              </div>
            )}
            {matter.effectiveUntil && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Gültig bis</dt>
                <dd>
                  {new Date(matter.effectiveUntil).toLocaleDateString("de-DE")}
                </dd>
              </div>
            )}
            {matter.revokedAt && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Widerrufen</dt>
                <dd className="text-red-600">
                  {new Date(matter.revokedAt).toLocaleString("de-DE")}
                </dd>
              </div>
            )}
          </dl>
        </div>
        <div>
          <h2 className="text-[10px] font-semibold tracking-[0.22em] uppercase text-slate-500 mb-2">
            Beweis
          </h2>
          <div className="text-[10px] text-slate-500">Handshake-Hash</div>
          <div className="text-[10px] break-all bg-slate-50 dark:bg-slate-800 p-2 rounded-lg mt-1">
            {matter.handshakeHash}
          </div>
          <div className="mt-2 text-[10px] text-slate-400">
            {matter._count.accessLogs} Audit-Einträge ·{" "}
            {matter._count.invitations} Einladungen
          </div>
        </div>
      </section>

      {/* Audit log */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-semibold tracking-[0.22em] uppercase text-slate-500">
            Audit-Log
          </h2>
          {audit && (
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                audit.chainValid
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "bg-red-500/10 text-red-700 dark:text-red-400"
              }`}
            >
              {audit.chainValid ? "Chain verified" : "Chain broken"}
            </span>
          )}
        </div>
        {!audit && (
          <div className="text-sm text-slate-400 animate-pulse">lade log…</div>
        )}
        {audit && audit.entries.length === 0 && (
          <div className="text-xs text-slate-500">
            Noch keine Einträge. Der erste Zugriff wird hier erscheinen.
          </div>
        )}
        {audit && audit.entries.length > 0 && (
          <ol className="space-y-1">
            {audit.entries.map((e) => (
              <li
                key={e.id}
                className="flex items-start gap-3 text-xs py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0"
              >
                <span className="text-slate-400 tabular-nums flex-shrink-0">
                  {new Date(e.createdAt).toLocaleTimeString("de-DE", {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </span>
                <span className="font-medium text-slate-700 dark:text-slate-300 flex-shrink-0">
                  {e.action}
                </span>
                <span className="text-slate-500 truncate flex-1">
                  {e.resourceType} · {e.actorSide}
                </span>
                <span className="text-[10px] text-slate-400 flex-shrink-0">
                  {e.entryHash.slice(0, 8)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
