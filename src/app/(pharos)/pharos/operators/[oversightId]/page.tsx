/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /pharos/operators/[oversightId] — operator detail with full
 * oversight metadata, MDF/VDF breakdown, and a live audit-log feed.
 *
 * Auth-gated to the authority that owns the oversight; mismatched
 * authorities are 404'd to avoid information leakage.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Lock, ShieldCheck, AlertTriangle } from "lucide-react";
import type { ScopeItem, ScopeCategory } from "@/lib/legal-network/scope";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<ScopeCategory, string> = {
  COMPLIANCE_ASSESSMENTS: "Compliance-Bewertungen",
  AUTHORIZATION_WORKFLOWS: "Genehmigungs-Workflows",
  DOCUMENTS: "Dokumente",
  TIMELINE_DEADLINES: "Fristen & Zeitleiste",
  INCIDENTS: "Vorfälle & NIS2-Phasen",
  SPACECRAFT_REGISTRY: "Satelliten-Registry",
  AUDIT_LOGS: "Audit-Logs",
};

export default async function PharosOperatorDetailPage({
  params,
}: {
  params: Promise<{ oversightId: string }>;
}) {
  const { oversightId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    select: { organizationId: true },
    orderBy: { joinedAt: "asc" },
  });
  if (!membership) redirect("/pharos-no-access");

  const profile = await prisma.authorityProfile.findUnique({
    where: { organizationId: membership.organizationId },
    select: { id: true },
  });
  if (!profile) redirect("/pharos/setup");

  const oversight = await prisma.oversightRelationship.findUnique({
    where: { id: oversightId },
    include: {
      operatorOrg: {
        select: { id: true, name: true, slug: true, logoUrl: true },
      },
      authorityProfile: {
        select: { id: true, authorityType: true, jurisdiction: true },
      },
    },
  });
  if (!oversight) notFound();
  if (oversight.authorityProfileId !== profile.id) notFound();

  const mdf = (oversight.mandatoryDisclosure as ScopeItem[]) ?? [];
  const vdf = (oversight.voluntaryDisclosure as ScopeItem[]) ?? [];

  // Latest 20 audit-log entries.
  const auditLog = await prisma.oversightAccessLog.findMany({
    where: { oversightId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div>
        <Link
          href="/pharos/operators"
          className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          ← Zurück zur Operatoren-Liste
        </Link>
        <div className="mt-2 flex items-start justify-between">
          <div className="min-w-0">
            <div className="text-[10px] tracking-[0.22em] uppercase text-slate-700 dark:text-slate-400/70 font-semibold">
              Aufsichts-Detail
            </div>
            <h1 className="pharos-display text-3xl font-semibold mt-1 truncate text-slate-900 dark:text-slate-100">
              {oversight.oversightTitle}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5">
              Operator:{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {oversight.operatorOrg.name}
              </strong>
              {oversight.oversightReference &&
                ` · Aktenzeichen: ${oversight.oversightReference}`}
            </p>
          </div>
          <StatusBadge status={oversight.status} />
        </div>
      </div>

      {/* Meta strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Meta label="Rechtsgrundlage" value={oversight.legalReference} mono />
        <Meta
          label="Initiiert"
          value={new Date(oversight.initiatedAt).toLocaleDateString("de-DE")}
        />
        <Meta
          label="Akzeptiert"
          value={
            oversight.acceptedAt
              ? new Date(oversight.acceptedAt).toLocaleDateString("de-DE")
              : "—"
          }
        />
        <Meta
          label="Wirksam bis"
          value={
            oversight.effectiveUntil
              ? new Date(oversight.effectiveUntil).toLocaleDateString("de-DE")
              : "—"
          }
        />
      </div>

      {/* MDF + VDF panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="pharos-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-3.5 h-3.5 text-slate-700 dark:text-slate-400" />
            <h2 className="pharos-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              MDF · Pflicht-Offenlegung
            </h2>
          </div>
          {mdf.length === 0 ? (
            <p className="text-xs text-slate-500">— keine —</p>
          ) : (
            <ul className="space-y-1.5">
              {mdf.map((item, i) => (
                <li key={i} className="text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span className="text-slate-800 dark:text-slate-200">
                    {CATEGORY_LABEL[item.category]}
                  </span>
                  <span className="text-[11px] text-slate-500 ml-auto tabular-nums">
                    {item.permissions.join(" / ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="pharos-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-700 dark:text-slate-400" />
            <h2 className="pharos-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              VDF · Freiwillige Erweiterung
            </h2>
          </div>
          {vdf.length === 0 ? (
            <p className="text-xs text-slate-500">
              — Operator hat keine zusätzlichen Bereiche freigegeben —
            </p>
          ) : (
            <ul className="space-y-1.5">
              {vdf.map((item, i) => (
                <li key={i} className="text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span className="text-slate-800 dark:text-slate-200">
                    {CATEGORY_LABEL[item.category]}
                  </span>
                  <span className="text-[11px] text-slate-500 ml-auto tabular-nums">
                    {item.permissions.join(" / ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Hash chain footer */}
      {oversight.handshakeHash && (
        <div className="pharos-card px-4 py-3">
          <div className="text-[10px] tracking-[0.18em] uppercase text-slate-500 font-semibold mb-1.5">
            Handshake-Hash · SHA-256
          </div>
          <code className="pharos-code block text-xs text-slate-700 dark:text-slate-300 break-all px-3 py-2 mt-1">
            {oversight.handshakeHash}
          </code>
          <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
            Wurzel der Audit-Chain — jeder Behörden-Zugriff verkettet sich an
            diesem Wert. Manipulationen brechen die Chain technisch erkennbar.
          </p>
        </div>
      )}

      {/* Dispute reason if applicable */}
      {oversight.status === "DISPUTED" && oversight.disputeReason && (
        <div className="pharos-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
            <h2 className="pharos-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Widerspruch des Operators
            </h2>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
            {oversight.disputeReason}
          </p>
          {oversight.disputedAt && (
            <p className="text-[11px] text-slate-500 mt-2 tabular-nums">
              Eingelegt am{" "}
              {new Date(oversight.disputedAt).toLocaleString("de-DE")}
            </p>
          )}
        </div>
      )}

      {/* Audit log */}
      <div className="pharos-card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200/60 dark:border-white/5">
          <h2 className="pharos-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            Audit-Log · letzte {auditLog.length} Einträge
          </h2>
        </div>
        {auditLog.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            Noch keine Audit-Einträge.
          </div>
        ) : (
          <ul className="divide-y divide-slate-200/60 dark:divide-white/5">
            {auditLog.map((entry) => (
              <li
                key={entry.id}
                className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors"
              >
                <div>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {entry.action}
                  </span>
                  <span className="text-slate-500 ml-2">
                    {entry.resourceType}
                    {entry.resourceId && ` · ${entry.resourceId.slice(0, 12)}…`}
                  </span>
                </div>
                <div className="text-slate-500 tabular-nums">
                  {new Date(entry.createdAt).toLocaleString("de-DE")}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Meta({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="pharos-stat px-3 py-2.5">
      <div className="text-[10px] tracking-[0.18em] uppercase text-slate-500 font-semibold">
        {label}
      </div>
      <div
        className={`text-sm text-slate-800 dark:text-slate-200 mt-0.5 truncate ${mono ? "font-mono" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string }> = {
    ACTIVE: { label: "Aktiv" },
    PENDING_OPERATOR_ACCEPT: { label: "Wartet auf Annahme" },
    DISPUTED: { label: "Streit" },
    CLOSED: { label: "Beendet" },
    REVOKED: { label: "Entzogen" },
    SUSPENDED: { label: "Pausiert" },
  };
  const v = variants[status] ?? { label: status };
  return (
    <span className="inline-flex items-center text-[10px] tracking-[0.16em] uppercase px-3 py-1 rounded-full bg-slate-100/70 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-white/10 backdrop-blur-md font-semibold">
      {v.label}
    </span>
  );
}
