/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /dashboard/network/oversight — operator-side overview of all
 * authorities holding active oversight over this organisation.
 *
 * Pharos is transparent by design: operators have a built-in right
 * to see WHICH authorities have oversight, with WHAT scope, and
 * HOW MANY times they've accessed data (accessLogCount). This page
 * is the operator's mirror of the Pharos workspace dashboard.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { listOversightsByOperator } from "@/lib/pharos/oversight-service";
import { Lightbulb, Shield, AlertTriangle, FileSearch } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OperatorOversightPage() {
  const session = await auth();
  if (!session?.user?.id)
    redirect("/login?callbackUrl=%2Fdashboard%2Fnetwork%2Foversight");

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    select: { organizationId: true },
    orderBy: { joinedAt: "asc" },
  });
  if (!membership) redirect("/dashboard");

  const oversights = await listOversightsByOperator(membership.organizationId);

  // Group by status — Active first (most relevant), then Pending +
  // Disputed, finally closed/revoked at the bottom.
  const active = oversights.filter((o) => o.status === "ACTIVE");
  const pending = oversights.filter(
    (o) => o.status === "PENDING_OPERATOR_ACCEPT",
  );
  const disputed = oversights.filter((o) => o.status === "DISPUTED");
  const archived = oversights.filter((o) =>
    ["CLOSED", "REVOKED", "SUSPENDED"].includes(o.status),
  );

  return (
    <div className="px-6 py-6 max-w-5xl space-y-6">
      <div>
        <Link
          href="/dashboard/network"
          className="text-xs text-slate-500 hover:text-slate-300"
        >
          ← Zurück zum Netzwerk
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-amber-950" />
          </div>
          <div>
            <div className="text-[10px] tracking-[0.22em] uppercase text-amber-500/80 font-semibold">
              Behördliche Aufsicht · Pharos
            </div>
            <h1 className="text-2xl font-semibold">
              Wer hat Zugriff auf eure Compliance-Daten
            </h1>
          </div>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Pharos macht jede behördliche Aufsicht transparent. Hier siehst du
          alle aktiven Aufsichten, die zugewiesenen Datenkategorien (MDF + VDF)
          und wie oft die Behörde bisher zugegriffen hat.
        </p>
      </div>

      {/* Pending — needs action */}
      {pending.length > 0 && (
        <Section
          title="Ausstehende Aufsichts-Einladungen"
          subtitle="Eine Behörde wartet auf deine Annahme oder deinen Widerspruch."
          tone="amber"
        >
          {pending.map((ov) => (
            <PendingCard key={ov.id} oversight={ov} />
          ))}
        </Section>
      )}

      {/* Disputed */}
      {disputed.length > 0 && (
        <Section
          title="Widersprüche in Klärung"
          subtitle="Du hast eine Aufsicht angefochten — die Behörde muss sich dazu äußern."
          tone="red"
        >
          {disputed.map((ov) => (
            <ActiveCard key={ov.id} oversight={ov} />
          ))}
        </Section>
      )}

      {/* Active */}
      <Section
        title={`Aktive Aufsichten · ${active.length}`}
        subtitle={
          active.length === 0
            ? "Aktuell hat keine Behörde laufende Aufsicht über euch."
            : "Diese Behörden haben aktiven Lese-Zugriff auf die unten aufgeführten Datenkategorien."
        }
        tone="emerald"
      >
        {active.length === 0 ? (
          <div className="rounded-lg border border-white/5 bg-navy-900/30 px-6 py-10 text-center text-sm text-slate-500">
            Keine aktiven behördlichen Aufsichten.
          </div>
        ) : (
          active.map((ov) => <ActiveCard key={ov.id} oversight={ov} />)
        )}
      </Section>

      {/* Archived */}
      {archived.length > 0 && (
        <Section
          title="Beendet / Pausiert / Entzogen"
          subtitle="Historische Aufsichten — Daten sind nicht mehr abrufbar."
          tone="slate"
        >
          {archived.map((ov) => (
            <ActiveCard key={ov.id} oversight={ov} />
          ))}
        </Section>
      )}
    </div>
  );
}

// ─── Sections ───────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  tone,
  children,
}: {
  title: string;
  subtitle: string;
  tone: "amber" | "emerald" | "red" | "slate";
  children: React.ReactNode;
}) {
  const tones: Record<typeof tone, string> = {
    amber: "text-amber-700 dark:text-amber-300",
    emerald: "text-emerald-700 dark:text-emerald-300",
    red: "text-red-700 dark:text-red-300",
    slate: "text-slate-500 dark:text-slate-400",
  };
  return (
    <section className="space-y-3">
      <div>
        <h2 className={`text-sm font-semibold ${tones[tone]}`}>{title}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {subtitle}
        </p>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

// ─── Pending invitation card ────────────────────────────────────────

function PendingCard({
  oversight,
}: {
  oversight: Awaited<ReturnType<typeof listOversightsByOperator>>[number];
}) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5 p-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold">
            {oversight.authorityProfile.organization.name}
          </span>
          <span className="text-[10px] tracking-wide uppercase px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-700 dark:text-amber-300">
            {oversight.authorityProfile.authorityType.replace("_", " ")}
          </span>
        </div>
        <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
          {oversight.oversightTitle}
        </div>
        <div className="text-xs text-slate-500 mt-0.5 truncate">
          {oversight.legalReference}
          {oversight.oversightReference && ` · ${oversight.oversightReference}`}
        </div>
      </div>
      <div className="text-right text-[11px] text-slate-500 flex-shrink-0">
        {/* Pending oversights are always token-based; the operator
            should have received the link by email. We don't surface
            it here — only the token holder may accept. */}
        Einladung per E-Mail
        <br />
        empfangen
      </div>
    </div>
  );
}

// ─── Active oversight card ──────────────────────────────────────────

function ActiveCard({
  oversight,
}: {
  oversight: Awaited<ReturnType<typeof listOversightsByOperator>>[number];
}) {
  const mdfSize = Array.isArray(oversight.mandatoryDisclosure)
    ? (oversight.mandatoryDisclosure as unknown[]).length
    : 0;
  const vdfSize = Array.isArray(oversight.voluntaryDisclosure)
    ? (oversight.voluntaryDisclosure as unknown[]).length
    : 0;

  return (
    <div className="rounded-lg border border-slate-200/60 dark:border-white/5 bg-white/40 dark:bg-navy-900/30 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-semibold">
              {oversight.authorityProfile.organization.name}
            </span>
            <span className="text-[10px] tracking-wide uppercase px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
              {oversight.authorityProfile.authorityType.replace("_", " ")} ·{" "}
              {oversight.authorityProfile.jurisdiction}
            </span>
            {oversight.status === "DISPUTED" && (
              <span className="text-[10px] tracking-wide uppercase px-2 py-0.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300 inline-flex items-center gap-1">
                <AlertTriangle className="w-2.5 h-2.5" />
                Streit
              </span>
            )}
          </div>
          <div className="text-sm text-slate-700 dark:text-slate-200">
            {oversight.oversightTitle}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {oversight.legalReference}
            {oversight.oversightReference &&
              ` · ${oversight.oversightReference}`}
          </div>
        </div>
        <div className="text-[11px] text-slate-500 flex-shrink-0 text-right space-y-0.5">
          {oversight.acceptedAt && (
            <div>
              Aktiv seit{" "}
              <span className="text-slate-300">
                {new Date(oversight.acceptedAt).toLocaleDateString("de-DE")}
              </span>
            </div>
          )}
          {oversight.effectiveUntil && (
            <div>
              Bis{" "}
              <span className="text-slate-300">
                {new Date(oversight.effectiveUntil).toLocaleDateString("de-DE")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-white/5 grid grid-cols-3 gap-3 text-xs">
        <Stat
          label="MDF (Pflicht)"
          value={`${mdfSize} ${mdfSize === 1 ? "Kategorie" : "Kategorien"}`}
          icon={Shield}
        />
        <Stat
          label="VDF (freiwillig)"
          value={`${vdfSize} ${vdfSize === 1 ? "Kategorie" : "Kategorien"}`}
          icon={Shield}
        />
        <Stat
          label="Behörden-Zugriffe"
          value={String(oversight._count.accessLogs)}
          icon={FileSearch}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Shield;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 mt-0.5 text-slate-400" />
      <div className="min-w-0">
        <div className="text-[10px] tracking-wider uppercase text-slate-500">
          {label}
        </div>
        <div className="text-slate-700 dark:text-slate-200 mt-0.5 truncate">
          {value}
        </div>
      </div>
    </div>
  );
}
