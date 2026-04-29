/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /pharos/approvals — k-of-n Approval-Inbox.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listOpenApprovals } from "@/lib/pharos/approval-service";
import { DEFAULT_PROFILES } from "@/lib/pharos/multi-party-approval";
import {
  AlertTriangle,
  ArrowRight,
  CheckCheck,
  Clock,
  Scale,
} from "lucide-react";

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

export default async function ApprovalsInboxPage() {
  const session = await auth();
  if (!session?.user?.id)
    redirect("/pharos-login?callbackUrl=%2Fpharos%2Fapprovals");

  // Resolve caller's authority profile.
  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    select: { organizationId: true },
  });
  const orgIds = memberships.map((m) => m.organizationId);
  const profiles = await prisma.authorityProfile.findMany({
    where: { organizationId: { in: orgIds } },
    select: { id: true, authorityType: true, jurisdiction: true },
  });

  if (profiles.length === 0) {
    return (
      <div className="space-y-4 max-w-2xl">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Keine Behörden-Mitgliedschaft
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Approvals sind nur für AUTHORITY-Organisationen sichtbar.
        </p>
      </div>
    );
  }

  // Aggregate open approvals across all authority-profiles the caller belongs to.
  const allOpen = await Promise.all(
    profiles.map((p) => listOpenApprovals(p.id)),
  );
  const open = allOpen.flat();

  // Bucket by urgency: <2h, <24h, >24h until expiry.
  const now = Date.now();
  const urgent = open.filter((r) => r.expiresAt.getTime() - now < 2 * 3600_000);
  const soon = open.filter((r) => {
    const ms = r.expiresAt.getTime() - now;
    return ms >= 2 * 3600_000 && ms < 24 * 3600_000;
  });
  const later = open.filter(
    (r) => r.expiresAt.getTime() - now >= 24 * 3600_000,
  );

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <div className="text-[10px] tracking-[0.22em] uppercase text-amber-700 dark:text-amber-400/70 font-semibold">
          Multi-Party-Approval · Pharos
        </div>
        <h1 className="text-2xl font-semibold mt-1 text-slate-900 dark:text-slate-100">
          Offene Mitzeichnungen
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Substanzielle Behörden-Entscheidungen erfordern Ed25519-Signaturen von
          mehreren Approvern (k-of-n) mit Pflicht-Rollen. Jede Signatur deckt
          den unveränderten Payload ab — Manipulation invalidiert die
          Quorum-Aggregation.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Offen gesamt" value={open.length} />
        <Kpi label="< 2h Frist" value={urgent.length} tone="alert" />
        <Kpi label="< 24h Frist" value={soon.length} tone="warn" />
        <Kpi label="Behörden-Profile" value={profiles.length} />
      </div>

      {urgent.length > 0 && (
        <Section title="Kritisch — < 2h Frist" tone="alert">
          {urgent.map((r) => (
            <RequestRow key={r.id} r={r} />
          ))}
        </Section>
      )}
      {soon.length > 0 && (
        <Section title="Heute — < 24h Frist" tone="warn">
          {soon.map((r) => (
            <RequestRow key={r.id} r={r} />
          ))}
        </Section>
      )}
      {later.length > 0 && (
        <Section title="Längerfristig" tone="ok">
          {later.map((r) => (
            <RequestRow key={r.id} r={r} />
          ))}
        </Section>
      )}
      {open.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500 dark:border-white/5 dark:bg-navy-900/30">
          Keine offenen Approval-Requests.
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-[11px] text-slate-600 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-500 leading-relaxed">
        <div className="flex items-center gap-2 mb-1 text-slate-700 dark:text-slate-400 font-medium">
          <Clock className="w-3.5 h-3.5" />
          Auto-Expiry
        </div>
        Stündlich läuft <code>/api/cron/pharos-approval-expiry</code> und
        markiert nicht-abgeschlossene Requests nach Ablauf der ttl als EXPIRED.
        Default-TTLs sind je ApprovalKind unterschiedlich (z.B. SANCTION_ORDER
        240h, MDF_AMENDMENT 72h).
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "alert" | "warn";
}) {
  const cls =
    tone === "alert"
      ? "text-red-700 dark:text-red-300"
      : tone === "warn"
        ? "text-amber-700 dark:text-amber-300"
        : "text-slate-900 dark:text-slate-100";
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-white/5 dark:bg-navy-900/30">
      <div className="text-[11px] tracking-wider uppercase text-slate-500 font-medium">
        {label}
      </div>
      <div className={`text-2xl font-semibold mt-1 tabular-nums ${cls}`}>
        {value}
      </div>
    </div>
  );
}

function Section({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "ok" | "warn" | "alert";
  children: React.ReactNode;
}) {
  const headerCls = {
    ok: "text-slate-900 dark:text-slate-100",
    warn: "text-amber-700 dark:text-amber-300",
    alert: "text-red-700 dark:text-red-300",
  }[tone];
  return (
    <div className="rounded-lg border border-slate-200 bg-white dark:border-white/5 dark:bg-navy-900/30">
      <div className="px-5 py-3 border-b border-slate-200 dark:border-white/5 flex items-center gap-2">
        {tone === "alert" && (
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
        )}
        {tone === "warn" && (
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        )}
        {tone === "ok" && (
          <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        )}
        <h2 className={`text-sm font-semibold ${headerCls}`}>{title}</h2>
      </div>
      <ul className="divide-y divide-slate-200 dark:divide-white/5">
        {children}
      </ul>
    </div>
  );
}

interface ApprovalRowData {
  id: string;
  kind: string;
  oversightId: string | null;
  initiatedBy: string;
  initiatedAt: Date;
  expiresAt: Date;
  signatures: { approverRole: string }[];
}

function RequestRow({ r }: { r: ApprovalRowData }) {
  const profile = DEFAULT_PROFILES[r.kind as keyof typeof DEFAULT_PROFILES];
  const have = r.signatures.length;
  const need = profile?.k ?? 2;
  const rolesPresent = new Set(r.signatures.map((s) => s.approverRole));
  const rolesMissing = (profile?.requiredRoles ?? []).filter(
    (r) => !rolesPresent.has(r),
  );
  const remainingMs = r.expiresAt.getTime() - Date.now();

  return (
    <li className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/[0.03]">
      <div className="min-w-0 flex items-center gap-3">
        <Scale className="w-4 h-4 text-slate-500 shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {KIND_LABELS[r.kind] ?? r.kind}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            ID <code>{r.id.slice(0, 12)}…</code>
            {r.oversightId && ` · Aufsicht ${r.oversightId.slice(0, 12)}…`} ·
            initiiert von {r.initiatedBy.slice(0, 10)}…
          </div>
          {rolesMissing.length > 0 && (
            <div className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
              Fehlende Pflicht-Rollen: {rolesMissing.join(", ")}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono tabular-nums">
          {have}/{need}
        </span>
        <span
          className={`text-[10px] tracking-wide uppercase px-2 py-0.5 rounded-full border ${
            remainingMs < 2 * 3600_000
              ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30"
              : remainingMs < 24 * 3600_000
                ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30"
                : "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/30"
          }`}
        >
          {formatDuration(remainingMs)}
        </span>
        <Link
          href={`/pharos/approvals/${r.id}`}
          className="text-xs text-slate-600 hover:text-amber-700 dark:text-slate-400 dark:hover:text-amber-300 inline-flex items-center gap-1"
        >
          Öffnen
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </li>
  );
}

function formatDuration(ms: number): string {
  if (ms < 0) return "abgelaufen";
  const sec = Math.floor(ms / 1000);
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
