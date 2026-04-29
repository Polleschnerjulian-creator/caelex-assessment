/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /pharos/workflow — workflow case inbox.
 *
 * Behörden-Sachbearbeiter sehen alle laufenden FSMs (NIS2-Incidents,
 * EU-Space-Act-Authorisations) ihrer Behörde mit aktuellem State,
 * SLA-Status (grün / gelb / rot) und Click-through zum Detail.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listOpenCases } from "@/lib/pharos/workflow-service";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  GitBranch,
  Plus,
} from "lucide-react";

export const dynamic = "force-dynamic";

const FSM_LABELS: Record<string, string> = {
  "nis2-incident-v1": "NIS2-Incident",
  "eu-space-act-authorisation-v1": "EU-Space-Act-Genehmigung",
};

const STATE_LABELS: Record<string, string> = {
  AwaitingEarlyWarning: "Wartet auf Early Warning (24h)",
  AwaitingNotification: "Wartet auf Notification (72h)",
  AwaitingFinalReport: "Wartet auf Final Report (30d)",
  UnderReview: "Behörden-Review",
  Closed: "Beendet",
  Breached24h: "24h-Frist verletzt",
  Breached72h: "72h-Frist verletzt",
  Breached30d: "30d-Frist verletzt",
  Submitted: "Eingegangen",
  Triage: "Vorprüfung",
  RequiresAdditionalInfo: "Wartet auf Nachreichung",
  InReview: "Sachbearbeiter-Prüfung",
  AwaitingApproval: "Wartet auf k-of-n",
  Approved: "Genehmigt",
  Rejected: "Abgelehnt",
  Withdrawn: "Zurückgezogen",
};

function slaTone(state: string): "ok" | "warn" | "alert" | "neutral" {
  if (state.startsWith("Breached")) return "alert";
  if (state.startsWith("Awaiting")) return "warn";
  if (["Closed", "Approved", "Rejected", "Withdrawn"].includes(state))
    return "neutral";
  return "ok";
}

export default async function WorkflowInboxPage() {
  const session = await auth();
  if (!session?.user?.id)
    redirect("/pharos-login?callbackUrl=%2Fpharos%2Fworkflow");

  // Resolve caller's authority profile.
  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    select: { organizationId: true },
  });
  const orgIds = memberships.map((m) => m.organizationId);
  const profiles = await prisma.authorityProfile.findMany({
    where: { organizationId: { in: orgIds } },
    select: { id: true },
  });
  const authorityProfileIds = profiles.map((p) => p.id);

  const cases = await listOpenCases({});
  const accessible = cases.filter(
    (c) =>
      (c.authorityProfileId &&
        authorityProfileIds.includes(c.authorityProfileId)) ||
      (c.operatorOrgId && orgIds.includes(c.operatorOrgId)),
  );

  const grouped = {
    nis2: accessible.filter((c) => c.fsmId === "nis2-incident-v1"),
    auth: accessible.filter((c) => c.fsmId === "eu-space-act-authorisation-v1"),
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase text-slate-700 dark:text-slate-400/70 font-semibold">
            Verfahrens-Inbox · Pharos
          </div>
          <h1 className="text-2xl font-semibold mt-1 text-slate-900 dark:text-slate-100">
            Workflows & Fristen
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Alle laufenden NIS2-Incident- und EU-Space-Act-Authorisations-
            Verfahren. SLA-Fristen werden automatisch alle 5 Min. geprüft;
            Breach-Transitions sind Ed25519-signiert in der Hash-Chain.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="NIS2-Vorfälle offen" value={grouped.nis2.length} />
        <Kpi label="Genehmigungen offen" value={grouped.auth.length} />
        <Kpi
          label="Frist verletzt"
          value={
            accessible.filter((c) => c.currentState.startsWith("Breached"))
              .length
          }
          tone="alert"
        />
        <Kpi label="Gesamt offen" value={accessible.length} />
      </div>

      {/* NIS2 List */}
      <Section
        title="NIS2-Incidents"
        subtitle="24h-Early-Warning · 72h-Notification · 30d-Final-Report"
      >
        {grouped.nis2.length === 0 ? (
          <Empty msg="Keine offenen NIS2-Vorfälle." />
        ) : (
          grouped.nis2.map((c) => <CaseRow key={c.id} c={c} />)
        )}
      </Section>

      {/* Auth List */}
      <Section
        title="EU-Space-Act-Genehmigungen"
        subtitle="Antrag · Triage · Review · k-of-n-Approval · Final"
      >
        {grouped.auth.length === 0 ? (
          <Empty msg="Keine offenen Genehmigungs-Verfahren." />
        ) : (
          grouped.auth.map((c) => <CaseRow key={c.id} c={c} />)
        )}
      </Section>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-[11px] text-slate-600 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-500 leading-relaxed">
        <div className="flex items-center gap-2 mb-1 text-slate-700 dark:text-slate-400 font-medium">
          <Clock className="w-3.5 h-3.5" />
          SLA-Watchdog
        </div>
        Cron <code>/api/cron/pharos-workflow-sla</code> läuft alle 5 Min. und
        erzeugt automatische <code>_AFTER</code>-Transitions wenn Fristen
        verstrichen sind. Jede Auto-Transition wird mit dem System-Schlüssel
        signiert und in <code>WorkflowTransition</code> persistiert.
      </div>
    </div>
  );
}

// ─── UI primitives ────────────────────────────────────────────────────

function Kpi({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "alert";
}) {
  const valueClass =
    tone === "alert"
      ? "text-slate-900 dark:text-slate-300"
      : "text-slate-900 dark:text-slate-100";
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-white/5 dark:bg-slate-900/30">
      <div className="text-[11px] tracking-wider uppercase text-slate-500 font-medium">
        {label}
      </div>
      <div className={`text-2xl font-semibold mt-1 tabular-nums ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white dark:border-white/5 dark:bg-slate-900/30">
      <div className="px-5 py-3 border-b border-slate-200 dark:border-white/5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
      <ul className="divide-y divide-slate-200 dark:divide-white/5">
        {children}
      </ul>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <li className="px-5 py-8 text-center text-sm text-slate-500">{msg}</li>
  );
}

interface CaseRowData {
  id: string;
  fsmId: string;
  caseRef: string;
  currentState: string;
  enteredStateAt: Date;
}

function CaseRow({ c }: { c: CaseRowData }) {
  const tone = slaTone(c.currentState);
  const enteredAt = new Date(c.enteredStateAt).toLocaleString();
  const stateLabel = STATE_LABELS[c.currentState] ?? c.currentState;
  const fsmLabel = FSM_LABELS[c.fsmId] ?? c.fsmId;

  const toneClasses = {
    ok: "bg-slate-50 text-slate-800 border-slate-300 dark:bg-white/[0.06] dark:text-slate-300 dark:border-white/15",
    warn: "bg-slate-100 text-slate-900 border-slate-300 dark:bg-white/[0.06] dark:text-slate-200 dark:border-white/15",
    alert:
      "bg-slate-50 text-slate-900 border-slate-300 dark:bg-white/[0.06] dark:text-slate-300 dark:border-white/15",
    neutral:
      "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/30",
  }[tone];

  return (
    <li className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
      <div className="min-w-0 flex items-center gap-3">
        <GitBranch className="w-4 h-4 text-slate-500 shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
            {c.caseRef}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {fsmLabel} · seit {enteredAt}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {tone === "alert" && (
          <AlertTriangle className="w-4 h-4 text-slate-800 dark:text-slate-500" />
        )}
        <span
          className={`inline-flex items-center gap-1 text-[10px] tracking-wide uppercase px-2 py-0.5 rounded-full border ${toneClasses}`}
        >
          {stateLabel}
        </span>
        <Link
          href={`/pharos/workflow/${c.id}`}
          className="text-xs text-slate-600 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 inline-flex items-center gap-1"
        >
          Öffnen
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </li>
  );
}
