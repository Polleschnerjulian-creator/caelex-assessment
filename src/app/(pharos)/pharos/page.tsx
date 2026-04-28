/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /pharos — authority-side dashboard. Server-rendered overview with
 * KPI strip and a compliance-heatmap preview of the operator roster.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ArrowRight, Plus, ShieldCheck, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

async function loadDashboard(authorityProfileId: string) {
  // Aggregate counters in parallel — keeps server-side load fast
  // even at 100s of operators, since each query is indexed.
  const [
    activeOversights,
    pendingOversights,
    disputedOversights,
    closedOversights,
    recentOversights,
  ] = await Promise.all([
    prisma.oversightRelationship.count({
      where: { authorityProfileId, status: "ACTIVE" },
    }),
    prisma.oversightRelationship.count({
      where: { authorityProfileId, status: "PENDING_OPERATOR_ACCEPT" },
    }),
    prisma.oversightRelationship.count({
      where: { authorityProfileId, status: "DISPUTED" },
    }),
    prisma.oversightRelationship.count({
      where: {
        authorityProfileId,
        status: { in: ["CLOSED", "REVOKED", "SUSPENDED"] },
      },
    }),
    prisma.oversightRelationship.findMany({
      where: {
        authorityProfileId,
        status: { in: ["ACTIVE", "PENDING_OPERATOR_ACCEPT", "DISPUTED"] },
      },
      include: {
        operatorOrg: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { initiatedAt: "desc" },
      take: 6,
    }),
  ]);

  return {
    activeOversights,
    pendingOversights,
    disputedOversights,
    closedOversights,
    recentOversights,
  };
}

export default async function PharosDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pharos-login?callbackUrl=%2Fpharos");

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    select: { organizationId: true },
    orderBy: { joinedAt: "asc" },
  });
  if (!membership) redirect("/pharos-no-access");

  const profile = await prisma.authorityProfile.findUnique({
    where: { organizationId: membership.organizationId },
  });
  if (!profile) redirect("/pharos/setup");

  const data = await loadDashboard(profile.id);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase text-amber-400/70 font-semibold">
            Aufsichts-Dashboard
          </div>
          <h1 className="text-2xl font-semibold mt-1">Willkommen zurück.</h1>
          <p className="text-sm text-slate-400 mt-1">
            {profile.authorityType.replace("_", " ")} · Zuständigkeit{" "}
            {profile.jurisdiction}
          </p>
        </div>
        <Link
          href="/pharos/oversights/new"
          className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-amber-500 hover:bg-amber-400 text-amber-950 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Aufsicht initiieren
        </Link>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Aktive Aufsichten"
          value={data.activeOversights}
          tone="emerald"
        />
        <KpiCard
          label="Wartet auf Annahme"
          value={data.pendingOversights}
          tone="amber"
        />
        <KpiCard label="In Streit" value={data.disputedOversights} tone="red" />
        <KpiCard
          label="Beendet / Pausiert"
          value={data.closedOversights}
          tone="slate"
        />
      </div>

      {/* Recent oversights */}
      <div className="rounded-lg border border-white/5 bg-navy-900/30">
        <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Aktuelle Aufsichten</h2>
          <Link
            href="/pharos/oversights"
            className="text-xs text-amber-400 hover:text-amber-300 inline-flex items-center gap-1"
          >
            Alle anzeigen
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {data.recentOversights.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            Noch keine Aufsichten. Klicke „Aufsicht initiieren" oben rechts, um
            die erste Beziehung zu einem Operator anzulegen.
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {data.recentOversights.map((ov) => (
              <li
                key={ov.id}
                className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {ov.oversightTitle}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {ov.operatorOrg.name} · {ov.legalReference}
                    {ov.oversightReference && ` · ${ov.oversightReference}`}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill status={ov.status} />
                  <Link
                    href={`/pharos/operators/${ov.id}`}
                    className="text-xs text-slate-400 hover:text-amber-300"
                  >
                    Öffnen →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "red" | "slate";
}) {
  const toneClasses = {
    emerald: "text-emerald-300",
    amber: "text-amber-300",
    red: "text-red-300",
    slate: "text-slate-300",
  };
  return (
    <div className="rounded-lg border border-white/5 bg-navy-900/30 px-4 py-3">
      <div className="text-[11px] tracking-wider uppercase text-slate-500 font-medium">
        {label}
      </div>
      <div
        className={`text-2xl font-semibold mt-1 tabular-nums ${toneClasses[tone]}`}
      >
        {value}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const variants: Record<
    string,
    { label: string; classes: string; Icon?: typeof ShieldCheck }
  > = {
    ACTIVE: {
      label: "Aktiv",
      classes: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      Icon: ShieldCheck,
    },
    PENDING_OPERATOR_ACCEPT: {
      label: "Wartet auf Annahme",
      classes: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    },
    DISPUTED: {
      label: "Streit",
      classes: "bg-red-500/15 text-red-300 border-red-500/30",
      Icon: AlertTriangle,
    },
    CLOSED: {
      label: "Beendet",
      classes: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    },
    REVOKED: {
      label: "Entzogen",
      classes: "bg-red-500/10 text-red-300 border-red-500/20",
    },
    SUSPENDED: {
      label: "Pausiert",
      classes: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    },
  };
  const v = variants[status] ?? {
    label: status,
    classes: "bg-slate-500/10 text-slate-300 border-slate-500/20",
  };
  const Icon = v.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] tracking-wide uppercase px-2 py-0.5 rounded-full border ${v.classes}`}
    >
      {Icon && <Icon className="w-2.5 h-2.5" />}
      {v.label}
    </span>
  );
}
