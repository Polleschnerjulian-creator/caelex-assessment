/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /pharos/briefing — tagesaktuelles Briefing für Behörden-Sachbearbeiter.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateBriefing } from "@/lib/pharos/daily-briefing";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Info,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BriefingPage() {
  const session = await auth();
  if (!session?.user?.id)
    redirect("/pharos-login?callbackUrl=%2Fpharos%2Fbriefing");

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    select: { organizationId: true },
  });
  const orgIds = memberships.map((m) => m.organizationId);
  const profiles = await prisma.authorityProfile.findMany({
    where: { organizationId: { in: orgIds } },
    include: { organization: { select: { name: true } } },
  });
  if (profiles.length === 0) {
    return (
      <div className="space-y-4 max-w-2xl">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Briefing nur für Behörden-Mitglieder
        </h1>
      </div>
    );
  }

  const briefings = await Promise.all(
    profiles.map(async (p) => ({
      profile: p,
      briefing: await generateBriefing(p.id),
    })),
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <div className="text-[10px] tracking-[0.22em] uppercase text-slate-700 dark:text-slate-400/70 font-semibold">
          Tagesbriefing · Pharos
        </div>
        <h1 className="text-2xl font-semibold mt-1 text-slate-900 dark:text-slate-100">
          Heute auf dem Tisch
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Generiert täglich um 06:00 UTC. Frist-kritische Vorgänge zuerst —
          jeder Eintrag kryptografisch hash-versioniert.
        </p>
      </div>

      {briefings.map(({ profile, briefing }) => (
        <BriefingCard
          key={profile.id}
          authorityProfileId={profile.id}
          authorityName={profile.organization.name}
          authorityType={profile.authorityType}
          briefing={briefing}
        />
      ))}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-[11px] text-slate-600 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-500 leading-relaxed">
        Briefing wird täglich um 06:00 UTC per E-Mail (Resend) an alle aktiven
        Mitglieder der Behörde verschickt — sofern <code>RESEND_API_KEY</code>{" "}
        konfiguriert ist. Die exakte HTML- Vorschau bekommst du über den
        "Vorschau"-Link auf jeder Card.
      </div>
    </div>
  );
}

interface BriefingCardData {
  briefingHash: string;
  generatedAt: string;
  summary: {
    workflowsTotal: number;
    workflowsBreached: number;
    workflowsCritical: number;
    approvalsOpen: number;
    approvalsUrgent: number;
    webhookInvocations24h: number;
    webhookRejectionRate: number;
    newDriftAlerts: number;
  };
  topPriorities: {
    kind: string;
    message: string;
    href?: string;
    severity: "critical" | "warn" | "info";
  }[];
}

function BriefingCard({
  authorityProfileId,
  authorityName,
  authorityType,
  briefing,
}: {
  authorityProfileId: string;
  authorityName: string;
  authorityType: string;
  briefing: BriefingCardData;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white dark:border-white/5 dark:bg-slate-900/30">
      <header className="px-5 py-3 border-b border-slate-200 dark:border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {authorityName}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {authorityType.replace("_", " ")} · generiert{" "}
              {new Date(briefing.generatedAt).toLocaleString()}
            </div>
          </div>
          <Calendar className="w-4 h-4 text-slate-700 dark:text-slate-400" />
        </div>
      </header>

      <div className="px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-3 border-b border-slate-200 dark:border-white/5">
        <Stat label="Workflows offen" value={briefing.summary.workflowsTotal} />
        <Stat
          label="Frist verletzt"
          value={briefing.summary.workflowsBreached}
          tone={briefing.summary.workflowsBreached > 0 ? "alert" : "default"}
        />
        <Stat
          label="< 6h kritisch"
          value={briefing.summary.workflowsCritical}
          tone={briefing.summary.workflowsCritical > 0 ? "warn" : "default"}
        />
        <Stat
          label="Approvals < 24h"
          value={briefing.summary.approvalsUrgent}
          tone={briefing.summary.approvalsUrgent > 0 ? "warn" : "default"}
        />
      </div>

      <div className="px-5 py-4">
        <div className="text-[10px] tracking-wider uppercase text-slate-500 font-medium mb-3">
          Top Prioritäten
        </div>
        {briefing.topPriorities.length === 0 ? (
          <div className="text-sm text-slate-500 dark:text-slate-400 inline-flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-slate-700 dark:text-slate-400" />
            Keine kritischen Vorgänge — saubere Lage.
          </div>
        ) : (
          <ul className="space-y-2">
            {briefing.topPriorities.map((p, i) => (
              <PriorityRow key={i} p={p} />
            ))}
          </ul>
        )}
      </div>

      <footer className="px-5 py-2 border-t border-slate-200 dark:border-white/5 flex items-center justify-between gap-3">
        <code className="text-[10px] font-mono text-slate-500">
          briefingHash: {briefing.briefingHash.slice(0, 32)}…
        </code>
        <a
          href={`/api/pharos/briefing/preview?authorityProfileId=${authorityProfileId}`}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] text-slate-700 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-300 inline-flex items-center gap-1"
        >
          E-Mail-Vorschau
          <ArrowRight className="w-3 h-3" />
        </a>
      </footer>
    </div>
  );
}

function Stat({
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
      ? "text-slate-900 dark:text-slate-300"
      : tone === "warn"
        ? "text-slate-700 dark:text-slate-300"
        : "text-slate-900 dark:text-slate-100";
  return (
    <div>
      <div className="text-[10px] tracking-wider uppercase text-slate-500 font-medium">
        {label}
      </div>
      <div className={`text-xl font-semibold mt-0.5 tabular-nums ${cls}`}>
        {value}
      </div>
    </div>
  );
}

function PriorityRow({
  p,
}: {
  p: {
    kind: string;
    message: string;
    href?: string;
    severity: "critical" | "warn" | "info";
  };
}) {
  const tone = {
    critical:
      "border-slate-300 bg-slate-50 text-slate-900 dark:border-white/15 dark:bg-white/[0.04] dark:text-slate-300",
    warn: "border-slate-200 bg-slate-50 text-slate-800 dark:border-white/15 dark:bg-white/[0.04] dark:text-slate-300",
    info: "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-300",
  }[p.severity];

  const Icon =
    p.severity === "critical"
      ? AlertTriangle
      : p.severity === "warn"
        ? AlertTriangle
        : Info;

  const Wrap = ({ children }: { children: React.ReactNode }) =>
    p.href ? (
      <Link
        href={p.href}
        className={`flex items-center justify-between gap-3 rounded border px-3 py-2 ${tone} hover:opacity-90 transition-opacity`}
      >
        {children}
      </Link>
    ) : (
      <div
        className={`flex items-center justify-between gap-3 rounded border px-3 py-2 ${tone}`}
      >
        {children}
      </div>
    );

  return (
    <li>
      <Wrap>
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-3.5 h-3.5 shrink-0" />
          <span className="text-[12px] truncate">{p.message}</span>
        </div>
        {p.href && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
      </Wrap>
    </li>
  );
}
