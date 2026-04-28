"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
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
import { LifecycleActionsPanel } from "./lifecycle/LifecycleActionsPanel";
import {
  MatterActivityTimeline,
  type AuditPayload,
} from "./MatterActivityTimeline";

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

// Audit payload shape now lives next to the timeline component that
// renders it (Phase AA). Aliasing keeps existing references inside
// MatterDetail readable.
type AuditData = AuditPayload;

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

  // Phase D' moved revoke + suspend/resume into LifecycleActionsPanel.
  // The panel owns submit + busy state; we just refresh on success.

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

  // Pick the most informative timestamp for the LifecycleActionsPanel
  // header. Schema doesn't track suspension, so SUSPENDED falls
  // through to whatever last firm point we know (acceptedAt).
  const lastStatusChange = formatGermanTimestamp(
    matter.status === "REVOKED"
      ? matter.revokedAt
      : matter.status === "ACTIVE"
        ? matter.acceptedAt
        : matter.status === "PENDING_INVITE"
          ? matter.invitedAt
          : null,
  );

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
            {/* Header now hosts only the workspace-launch button. The
                lifecycle controls (pause/resume/revoke) moved to the
                LifecycleActionsPanel at the bottom of the page so the
                destructive actions get a "danger zone" treatment with
                proper confirmation flow instead of a browser prompt. */}
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
          </div>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-lg p-3">
          {error}
        </div>
      )}

      {/* P2-Compliance · Operator-side AI-Disclosure-Banner. Persistent
          visible across all matter states; explains that the matter
          surface contains AI-generated content from the law firm's
          Atlas tooling. Helps the operator interpret the bilateral
          flow and provides a clear path to the AI transparency
          policy (KI-VO Art. 50). */}
      {viewerSide === "CAELEX" && (
        <div className="rounded-xl bg-amber-500/[0.04] dark:bg-amber-500/[0.06] border border-amber-500/20 dark:border-amber-500/25 px-4 py-3 flex items-start gap-3">
          <div className="text-[10px] tracking-[0.2em] uppercase font-semibold text-amber-700 dark:text-amber-300/80 flex-shrink-0 pt-0.5">
            KI
          </div>
          <div className="flex-1 text-xs text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
            Diese Mandatsoberfläche enthält KI-generierte Inhalte. Die Kanzlei
            nutzt Atlas (Anthropic Claude via EU-US DPF + Standardvertrags-
            klauseln + Zero-Retention) als Beratungsmittel. Atlas-generierte
            Memos und Vergleiche tragen ein „KI"-Badge.{" "}
            <a
              href="/legal/ai-disclosure"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-dotted hover:text-amber-700 dark:hover:text-amber-100"
            >
              KI-Transparenz-Erklärung
            </a>
            .
          </div>
        </div>
      )}

      {/* P2-Compliance · § 50 BRAO Notice (operator-seitig, nur nach
          Revoke). Erklärt dass die Anwaltskanzlei eigene Akten
          behalten darf — das ist die rechtliche Realität jeder
          Mandatsbeendigung in DE und sollte für Operator transparent
          sein. */}
      {viewerSide === "CAELEX" && matter.status === "REVOKED" && (
        <div className="rounded-xl bg-slate-100/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 px-4 py-3 flex items-start gap-3">
          <div className="text-[10px] tracking-[0.2em] uppercase font-semibold text-slate-500 flex-shrink-0 pt-0.5">
            § 50 BRAO
          </div>
          <div className="flex-1 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            Mandat ist widerrufen. Die Kanzlei kann gemäß § 50 BRAO eigene Akten
            und Werkergebnisse behalten — auch über das Mandatsende hinaus. Auf
            deinen Wunsch hin kann die Kanzlei den Mandats-Bezug ihrer privaten
            Bibliothekseinträge lösen (DSGVO Art. 17 ↔ § 50 BRAO Spannungsfeld).
            Wende dich an die Kanzlei oder an{" "}
            <a
              href="mailto:privacy@caelex.eu"
              className="underline decoration-dotted hover:text-slate-900 dark:hover:text-slate-100"
            >
              privacy@caelex.eu
            </a>
            .
          </div>
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

      {/* Activity timeline — Phase AA replaces the previously-flat
          audit list. Same data source (`/api/network/matter/:id/access-log`),
          same hash-chain verification, but rendered as a day-grouped
          human-readable feed with side-aware actor labels. The forensic
          chain badge still lives prominently in the timeline header. */}
      <MatterActivityTimeline audit={audit} viewerSide={viewerSide} />

      {/* Lifecycle / Danger zone — Phase D'.
          Last section so it doesn't compete with the data-rich scope
          and audit views above. The panel handles its own modal flow
          for revoke + manages busy state internally. */}
      <LifecycleActionsPanel
        matterId={matter.id}
        matterName={matter.name}
        status={matter.status}
        viewerSide={viewerSide}
        lastStatusChange={lastStatusChange}
        revocationReason={matter.revocationReason}
        onChanged={load}
      />
    </div>
  );
}

/** Renders an ISO date as a German localized string, or null if the
 *  input is null/invalid. Centralised so the lifecycle panel and
 *  any future timeline use the same format. */
function formatGermanTimestamp(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
