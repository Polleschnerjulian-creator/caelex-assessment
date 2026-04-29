/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /pharos/approvals/[requestId] — Approval-Detail mit Sign-Panel.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getApprovalRequest } from "@/lib/pharos/approval-service";
import { DEFAULT_PROFILES } from "@/lib/pharos/multi-party-approval";
import { ArrowLeft, CheckCircle2, Clock, Scale } from "lucide-react";
import { ApprovalSignPanel } from "./ApprovalSignPanel";

export const dynamic = "force-dynamic";

const KIND_LABELS: Record<string, string> = {
  OVERSIGHT_INITIATION: "Aufsicht initiieren",
  OVERSIGHT_REVOCATION: "Aufsicht widerrufen",
  MDF_AMENDMENT: "MDF-Erweiterung",
  CROSS_BORDER_SHARING: "Cross-Border-Datenfreigabe",
  SANCTION_ORDER: "Sanktions-Anordnung",
  AUTHORIZATION_DECISION: "Genehmigungs-Entscheidung",
  GENERIC: "Allgemeine Entscheidung",
};

export default async function ApprovalDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const session = await auth();
  if (!session?.user?.id)
    redirect(`/pharos-login?callbackUrl=%2Fpharos%2Fapprovals%2F${requestId}`);

  const r = await getApprovalRequest(requestId);
  if (!r) notFound();

  // Authorize: caller's org must own this approval's authority profile.
  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    select: { organizationId: true },
  });
  const orgIds = memberships.map((m) => m.organizationId);
  const profiles = await prisma.authorityProfile.findMany({
    where: { organizationId: { in: orgIds } },
    select: { id: true },
  });
  const profileIds = profiles.map((p) => p.id);
  if (!profileIds.includes(r.authorityProfileId)) {
    return (
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Kein Zugriff auf diese Mitzeichnung.
        </h1>
        <Link
          href="/pharos/approvals"
          className="inline-flex items-center gap-1.5 text-sm text-slate-700 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-300"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Zurück zur Inbox
        </Link>
      </div>
    );
  }

  const profile = DEFAULT_PROFILES[r.kind as keyof typeof DEFAULT_PROFILES];
  const have = r.signatures.length;
  const need = profile?.k ?? 2;
  const rolesPresent = new Set(r.signatures.map((s) => s.approverRole));
  const rolesMissing = (profile?.requiredRoles ?? []).filter(
    (r) => !rolesPresent.has(r),
  );
  const remainingMs = r.expiresAt.getTime() - Date.now();
  const expired = r.status !== "OPEN" || remainingMs <= 0;
  const alreadySigned = r.signatures.some(
    (s) => s.approverUserId === session.user!.id,
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link
          href="/pharos/approvals"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        >
          <ArrowLeft className="w-3 h-3" /> Zurück zur Approval-Inbox
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <Scale className="w-5 h-5 text-slate-700 dark:text-slate-400" />
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {KIND_LABELS[r.kind] ?? r.kind}
          </h1>
          <span
            className={`text-[10px] tracking-wider uppercase px-2 py-0.5 rounded border font-semibold ${
              r.status === "APPROVED"
                ? "bg-slate-50 text-slate-800 border-slate-300 dark:bg-white/[0.06] dark:text-slate-300 dark:border-white/15"
                : r.status === "OPEN" && !expired
                  ? "bg-slate-100 text-slate-900 border-slate-300 dark:bg-white/[0.06] dark:text-slate-200 dark:border-white/15"
                  : "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/30"
            }`}
          >
            {r.status}
          </span>
        </div>
        <div className="text-[11px] text-slate-500 mt-1 font-mono">
          ID {r.id} · payloadHash {r.payloadHash.slice(0, 16)}…
        </div>
      </div>

      {/* Quorum-Status */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-white/5 dark:bg-slate-900/30">
        <h2 className="text-sm font-semibold mb-3 text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-slate-700 dark:text-slate-400" />
          Quorum-Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
          <Field label="Signaturen">
            <span className="text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {have}/{need}
            </span>
          </Field>
          <Field label="Pflicht-Rollen">
            {rolesMissing.length === 0 ? (
              <span className="text-slate-800 dark:text-slate-300">
                vollständig
              </span>
            ) : (
              <span className="text-slate-700 dark:text-slate-300">
                fehlt: {rolesMissing.join(", ")}
              </span>
            )}
          </Field>
          <Field label="Frist">
            {remainingMs <= 0 ? (
              <span className="text-slate-900 dark:text-slate-300">
                abgelaufen
              </span>
            ) : (
              <span className="text-slate-700 dark:text-slate-300">
                {formatDuration(remainingMs)}
              </span>
            )}
          </Field>
        </div>
        {r.aggregateHash && (
          <div className="mt-4 text-[11px] text-slate-600 dark:text-slate-400 font-mono break-all">
            <strong>aggregateHash:</strong> {r.aggregateHash}
          </div>
        )}
      </div>

      {/* Sign-Panel */}
      {!expired && r.status === "OPEN" && !alreadySigned && (
        <ApprovalSignPanel
          requestId={r.id}
          requiredRoles={profile?.requiredRoles ?? []}
          rolesPresent={Array.from(rolesPresent)}
        />
      )}
      {alreadySigned && (
        <div className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-900 dark:border-white/15 dark:bg-white/[0.04] dark:text-slate-300">
          Du hast bereits signiert. Eine erneute Signatur ist nicht möglich
          (Constraint @@unique([requestId, approverUserId])).
        </div>
      )}

      {/* Payload */}
      <div className="rounded-lg border border-slate-200 bg-white dark:border-white/5 dark:bg-slate-900/30">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-white/5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Inhalt der Mitzeichnung
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Jede Signatur deckt diesen Payload-Hash ab. Änderungen invalidieren
            alle bisherigen Signaturen.
          </p>
        </div>
        <pre className="p-4 text-[11px] font-mono whitespace-pre-wrap break-words text-slate-700 dark:text-slate-300 overflow-x-auto">
          {JSON.stringify(r.payload, null, 2)}
        </pre>
      </div>

      {/* Signatures */}
      <div className="rounded-lg border border-slate-200 bg-white dark:border-white/5 dark:bg-slate-900/30">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-white/5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Signaturen ({r.signatures.length})
          </h2>
        </div>
        {r.signatures.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-500">
            Noch keine Signaturen.
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-white/5">
            {r.signatures.map((s) => (
              <li
                key={s.id}
                className="px-5 py-3 flex items-center justify-between"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {s.approverRole}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    user {s.approverUserId.slice(0, 16)}… · sig{" "}
                    {s.signature.slice(0, 24)}… ·{" "}
                    {new Date(s.signedAt).toLocaleString()}
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-slate-700 dark:text-slate-400 shrink-0" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] tracking-wider uppercase text-slate-500 font-medium">
        {label}
      </div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 0) ms = -ms;
  const sec = Math.floor(ms / 1000);
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
