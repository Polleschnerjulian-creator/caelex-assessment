/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /pharos/operators — full operator roster with live compliance
 * heatmap. Server-side fetches the same dataset as
 * /api/pharos/operators (re-uses the count-aware logic). Each row is
 * a deep-link to the operator detail page.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Tier = "good" | "drift" | "alert";

interface OperatorRow {
  oversightId: string;
  operator: { id: string; name: string; slug: string };
  oversightTitle: string;
  legalReference: string;
  status: string;
  complianceScore: number;
  complianceTier: Tier;
  openIncidents: number;
  overdueDeadlines: number;
  acceptedAt: Date | null;
  initiatedAt: Date;
}

async function loadRoster(authorityProfileId: string): Promise<OperatorRow[]> {
  const oversights = await prisma.oversightRelationship.findMany({
    where: {
      authorityProfileId,
      status: { in: ["ACTIVE", "PENDING_OPERATOR_ACCEPT", "DISPUTED"] },
    },
    include: {
      operatorOrg: {
        select: { id: true, name: true, slug: true },
      },
    },
    orderBy: { initiatedAt: "desc" },
  });

  // Same compliance-summary logic as /api/pharos/operators — kept
  // in sync with that endpoint. Org → member-userIds → Incidents +
  // Deadlines counts.
  const rows = await Promise.all(
    oversights.map(async (ov) => {
      const members = await prisma.organizationMember
        .findMany({
          where: { organizationId: ov.operatorOrgId },
          select: { userId: true },
        })
        .catch(() => [] as { userId: string }[]);
      const userIds = members.map((m) => m.userId);

      const [openIncidents, overdueDeadlines] = await Promise.all([
        userIds.length === 0
          ? Promise.resolve(0)
          : prisma.incident
              .count({
                where: {
                  supervision: { userId: { in: userIds } },
                  status: { in: ["detected", "investigating", "contained"] },
                },
              })
              .catch(() => 0),
        userIds.length === 0
          ? Promise.resolve(0)
          : prisma.deadline
              .count({
                where: {
                  userId: { in: userIds },
                  dueDate: { lt: new Date() },
                  completedAt: null,
                  status: { notIn: ["COMPLETED", "CANCELLED"] },
                },
              })
              .catch(() => 0),
      ]);

      const score = Math.max(
        0,
        100 - openIncidents * 10 - overdueDeadlines * 5,
      );
      const tier: Tier = score >= 90 ? "good" : score >= 70 ? "drift" : "alert";

      return {
        oversightId: ov.id,
        operator: ov.operatorOrg,
        oversightTitle: ov.oversightTitle,
        legalReference: ov.legalReference,
        status: ov.status,
        complianceScore: score,
        complianceTier: tier,
        openIncidents,
        overdueDeadlines,
        acceptedAt: ov.acceptedAt,
        initiatedAt: ov.initiatedAt,
      };
    }),
  );

  return rows;
}

export default async function PharosOperatorsPage() {
  const session = await auth();
  if (!session?.user?.id)
    redirect("/pharos-login?callbackUrl=%2Fpharos%2Foperators");

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

  const rows = await loadRoster(profile.id);

  // Group counts by tier for the summary strip
  const tierCounts = rows.reduce(
    (acc, r) => {
      if (r.status === "ACTIVE") acc[r.complianceTier]++;
      return acc;
    },
    { good: 0, drift: 0, alert: 0 } as Record<Tier, number>,
  );

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <div className="text-[10px] tracking-[0.22em] uppercase text-amber-400/70 font-semibold">
          Operatoren
        </div>
        <h1 className="text-2xl font-semibold mt-1">
          {rows.length}{" "}
          {rows.length === 1 ? "Aufsichts-Beziehung" : "Aufsichts-Beziehungen"}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Live-Compliance-Heatmap, basierend auf offenen Vorfällen und
          überfälligen Fristen.
        </p>
      </div>

      {/* Tier summary */}
      <div className="grid grid-cols-3 gap-3">
        <TierTile label="Gut (≥90)" count={tierCounts.good} tone="emerald" />
        <TierTile label="Drift (70–89)" count={tierCounts.drift} tone="amber" />
        <TierTile label="Alarm (<70)" count={tierCounts.alert} tone="red" />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-slate-200 dark:border-white/5 bg-white dark:bg-navy-900/30 px-6 py-10 text-center text-sm text-slate-500">
          Du hast noch keine Aufsichts-Beziehungen. Über „Aufsicht initiieren"
          (oben links im Nav-Rail) lädst du den ersten Operator ein.
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 dark:border-white/5 bg-white dark:bg-navy-900/30 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-navy-900/60 text-[10px] tracking-wider uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Operator</th>
                <th className="px-4 py-2.5 text-left font-medium">Aufsicht</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Compliance
                </th>
                <th className="px-4 py-2.5 text-right font-medium">Vorfälle</th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Fristen überfällig
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {rows.map((r) => (
                <tr
                  key={r.oversightId}
                  className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/pharos/operators/${r.oversightId}`}
                      className="font-medium text-slate-900 dark:text-slate-100 hover:text-amber-300"
                    >
                      {r.operator.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-700 dark:text-slate-300 truncate max-w-[20ch]">
                      {r.oversightTitle}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {r.legalReference}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.status === "ACTIVE" ? (
                      <ScoreCell
                        score={r.complianceScore}
                        tier={r.complianceTier}
                      />
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                    {r.openIncidents}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                    {r.overdueDeadlines}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TierTile({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "emerald" | "amber" | "red";
}) {
  const tones = {
    emerald: "border-emerald-500/30 text-emerald-300",
    amber: "border-amber-500/30 text-amber-300",
    red: "border-red-500/30 text-red-300",
  };
  return (
    <div
      className={`rounded-lg border ${tones[tone]} bg-white dark:bg-navy-900/30 px-4 py-3`}
    >
      <div className="text-[11px] tracking-wider uppercase text-slate-500 font-medium">
        {label}
      </div>
      <div className="text-2xl font-semibold mt-1 tabular-nums">{count}</div>
    </div>
  );
}

function ScoreCell({ score, tier }: { score: number; tier: Tier }) {
  const tones = {
    good: "text-emerald-300",
    drift: "text-amber-300",
    alert: "text-red-300",
  };
  return (
    <span className={`font-semibold tabular-nums ${tones[tier]}`}>{score}</span>
  );
}

function StatusPill({ status }: { status: string }) {
  const variants: Record<string, { label: string; classes: string }> = {
    ACTIVE: {
      label: "Aktiv",
      classes: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    },
    PENDING_OPERATOR_ACCEPT: {
      label: "Wartet",
      classes: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    },
    DISPUTED: {
      label: "Streit",
      classes: "bg-red-500/15 text-red-300 border-red-500/30",
    },
  };
  const v = variants[status] ?? {
    label: status,
    classes:
      "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] tracking-wide uppercase px-2 py-0.5 rounded-full border ${v.classes}`}
    >
      {v.label}
    </span>
  );
}
