/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /pharos/workflow/[caseId] — workflow case detail.
 *
 * Sachbearbeiter sieht:
 *   - aktuellen State + Zeit-im-State + SLA-Restzeit
 *   - vollständige Transition-Timeline (Hash-Chain) mit signature-snippets
 *   - Dispatch-Buttons für die im aktuellen State erlaubten Events
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCase } from "@/lib/pharos/workflow-service";
import {
  EU_SPACE_ACT_AUTH_FSM_DEF,
  NIS2_INCIDENT_FSM_DEF,
} from "@/lib/pharos/workflow-fsm";
import { ArrowLeft, CheckCircle2, Clock, GitBranch } from "lucide-react";
import { CaseDispatchPanel } from "./CaseDispatchPanel";

export const dynamic = "force-dynamic";

const FSM_DEFS: Record<
  string,
  typeof NIS2_INCIDENT_FSM_DEF | typeof EU_SPACE_ACT_AUTH_FSM_DEF
> = {
  "nis2-incident-v1": NIS2_INCIDENT_FSM_DEF,
  "eu-space-act-authorisation-v1": EU_SPACE_ACT_AUTH_FSM_DEF,
};

export default async function WorkflowCaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const session = await auth();
  if (!session?.user?.id)
    redirect(`/pharos-login?callbackUrl=%2Fpharos%2Fworkflow%2F${caseId}`);

  const c = await getCase(caseId);
  if (!c) notFound();

  // Authorize: caller must belong to authority OR operator side.
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
  const authorized =
    (c.authorityProfileId && profileIds.includes(c.authorityProfileId)) ||
    (c.operatorOrgId && orgIds.includes(c.operatorOrgId));
  if (!authorized) {
    return (
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Kein Zugriff auf diesen Vorgang.
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Dieser Workflow gehört zu einer Aufsicht, in der dein Account weder
          authority- noch operator-side Mitglied ist.
        </p>
        <Link
          href="/pharos/workflow"
          className="inline-flex items-center gap-1.5 text-sm text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Zurück zur Inbox
        </Link>
      </div>
    );
  }

  const fsmDef = FSM_DEFS[c.fsmId];
  const stateDef = fsmDef?.states[
    c.currentState as keyof typeof fsmDef.states
  ] as
    | {
        label: string;
        final?: boolean;
        on?: Record<string, string>;
        after?: { afterMs: number; reason: string; target: string };
      }
    | undefined;
  const enteredAt = new Date(c.enteredStateAt);
  const elapsedMs = Date.now() - enteredAt.getTime();
  const slaRemainingMs = stateDef?.after
    ? stateDef.after.afterMs - elapsedMs
    : null;

  const allowedEvents = stateDef?.on
    ? (Object.keys(stateDef.on) as string[])
    : [];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link
          href="/pharos/workflow"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-amber-700 dark:hover:text-amber-300"
        >
          <ArrowLeft className="w-3 h-3" /> Zurück zur Verfahrens-Inbox
        </Link>
        <h1 className="text-2xl font-semibold mt-2 text-slate-900 dark:text-slate-100">
          {c.caseRef}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {c.fsmId} · ID <code className="text-[11px]">{c.id}</code>
        </p>
      </div>

      {/* Current State Card */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-white/5 dark:bg-navy-900/30">
        <div className="flex items-center gap-2 mb-3">
          <GitBranch className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Aktueller State
          </h2>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {c.currentState}
          </span>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {stateDef?.label ?? "—"}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
          <Field label="Im State seit">{enteredAt.toLocaleString()}</Field>
          <Field label="Verstrichen">{formatDuration(elapsedMs)}</Field>
          <Field label="SLA-Rest">
            {slaRemainingMs === null ? (
              "kein SLA"
            ) : slaRemainingMs <= 0 ? (
              <span className="text-red-700 dark:text-red-300 font-semibold">
                Verletzt seit {formatDuration(-slaRemainingMs)}
              </span>
            ) : (
              <span
                className={
                  slaRemainingMs < 6 * 3600_000
                    ? "text-amber-700 dark:text-amber-300 font-semibold"
                    : "text-slate-700 dark:text-slate-300"
                }
              >
                {formatDuration(slaRemainingMs)} verbleibend
              </span>
            )}
          </Field>
        </div>
        {stateDef?.final && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded border border-slate-300 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300">
            <CheckCircle2 className="w-3 h-3" />
            Final State — keine Transitions mehr möglich
          </div>
        )}
      </div>

      {/* Dispatch Panel */}
      {allowedEvents.length > 0 && !stateDef?.final && (
        <CaseDispatchPanel
          caseId={c.id}
          allowedEvents={allowedEvents}
          fsmId={c.fsmId}
        />
      )}

      {/* Transition Timeline */}
      <div className="rounded-lg border border-slate-200 bg-white dark:border-white/5 dark:bg-navy-900/30">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-white/5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Transition-Hash-Chain ({c.transitions.length} Einträge)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Jede Transition ist Ed25519-signiert. Tampering bricht die Chain.
          </p>
        </div>
        {c.transitions.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            Genesis-State — noch keine Transitions.
          </div>
        ) : (
          <ol className="divide-y divide-slate-200 dark:divide-white/5">
            {c.transitions.map((t, i) => (
              <TransitionRow key={t.id} t={t} index={i} />
            ))}
          </ol>
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
      <div className="text-slate-700 dark:text-slate-300 mt-0.5">
        {children}
      </div>
    </div>
  );
}

interface TransitionRowData {
  id: string;
  fromState: string;
  toState: string;
  event: string;
  reason: string | null;
  actorUserId: string | null;
  occurredAt: Date;
  transitionHash: string;
  previousHash: string | null;
}

function TransitionRow({ t, index }: { t: TransitionRowData; index: number }) {
  const isAuto = t.event === "_AFTER";
  return (
    <li className="px-5 py-3 flex items-start gap-3">
      <div className="shrink-0 w-7 h-7 rounded-full bg-slate-100 dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 flex items-center justify-center text-[11px] font-semibold tabular-nums">
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <code className="text-[11px] font-mono text-slate-700 dark:text-slate-300">
            {t.fromState}
          </code>
          <span className="text-slate-400">→</span>
          <code className="text-[11px] font-mono font-semibold text-slate-900 dark:text-slate-100">
            {t.toState}
          </code>
          <span
            className={`text-[10px] tracking-wide uppercase px-1.5 py-0.5 rounded font-mono ${
              isAuto
                ? "bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
                : "bg-blue-50 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300"
            }`}
          >
            {t.event}
          </span>
        </div>
        {t.reason && (
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {t.reason}
          </div>
        )}
        <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-500 font-mono">
          <span>
            <Clock className="inline w-2.5 h-2.5 mr-0.5" />
            {new Date(t.occurredAt).toLocaleString()}
          </span>
          <span>
            actor: {t.actorUserId ? t.actorUserId.slice(0, 10) : "system"}
          </span>
          <span title={t.transitionHash}>
            hash: {t.transitionHash.slice(0, 12)}…
          </span>
        </div>
      </div>
    </li>
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
  if (mins > 0) return `${mins}m`;
  return `${sec}s`;
}
