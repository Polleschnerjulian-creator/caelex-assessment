/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /pharos/webhooks — Behörden-Verwaltung externer Operator-Webhooks.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Activity, Globe, ShieldCheck } from "lucide-react";
import { WebhookManager } from "./WebhookManager";

export const dynamic = "force-dynamic";

export default async function WebhooksPage() {
  const session = await auth();
  if (!session?.user?.id)
    redirect("/pharos-login?callbackUrl=%2Fpharos%2Fwebhooks");

  // Resolve caller's authority-profile + their active oversights.
  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    select: { organizationId: true },
  });
  const orgIds = memberships.map((m) => m.organizationId);
  const profiles = await prisma.authorityProfile.findMany({
    where: { organizationId: { in: orgIds } },
    select: { id: true, authorityType: true },
  });
  if (profiles.length === 0) {
    return (
      <div className="space-y-4 max-w-2xl">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Keine Behörden-Mitgliedschaft
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Webhook-Management ist nur für AUTHORITY-Organisationen sichtbar.
        </p>
      </div>
    );
  }

  const profileIds = profiles.map((p) => p.id);

  const oversights = await prisma.oversightRelationship.findMany({
    where: {
      authorityProfileId: { in: profileIds },
      status: "ACTIVE",
    },
    select: {
      id: true,
      oversightTitle: true,
      oversightReference: true,
      operatorOrg: { select: { name: true } },
    },
    orderBy: { initiatedAt: "desc" },
  });

  const totalEndpoints = await prisma.pharosWebhookEndpoint.count({
    where: { authorityProfileId: { in: profileIds } },
  });
  const activeEndpoints = await prisma.pharosWebhookEndpoint.count({
    where: { authorityProfileId: { in: profileIds }, status: "ACTIVE" },
  });
  const totalInvocations = await prisma.pharosWebhookInvocation.count({
    where: { endpoint: { authorityProfileId: { in: profileIds } } },
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <div className="text-[10px] tracking-[0.22em] uppercase text-slate-700 dark:text-slate-400/70 font-semibold">
          External Operator Webhooks · Pharos
        </div>
        <h1 className="pharos-display text-3xl font-semibold mt-1 text-slate-900 dark:text-slate-100">
          Webhook-Endpoints
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed max-w-3xl">
          Externe Operatoren (= keine Caelex-User) können NIS2-Vorfälle und
          Compliance-Events per HMAC-signiertem Webhook an Pharos schicken. Pro
          Aufsicht ein Endpoint pro Operator. Anti-Replay via Nonce + ±5min
          Timestamp-Window.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Kpi label="Endpoints gesamt" value={totalEndpoints} Icon={Globe} />
        <Kpi
          label="Aktiv"
          value={activeEndpoints}
          Icon={ShieldCheck}
          tone="ok"
        />
        <Kpi
          label="Invocations gesamt"
          value={totalInvocations}
          Icon={Activity}
        />
      </div>

      <WebhookManager
        oversights={oversights.map((o) => ({
          id: o.id,
          title: o.oversightTitle,
          reference: o.oversightReference,
          operatorName: o.operatorOrg.name,
        }))}
      />

      <div className="pharos-card p-5 text-[11px] text-slate-600 leading-relaxed dark:text-slate-400">
        <div className="pharos-display font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Signing-Recipe für externe Operatoren
        </div>
        <pre className="bg-gradient-to-br from-slate-900 to-slate-950 text-slate-300 p-3 rounded-xl overflow-x-auto text-[11px] border border-slate-800 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
          {`HMAC-SHA256(secret, timestamp + nonce + sha256(body))`}
        </pre>
        <p className="mt-3">
          Header pro Request:{" "}
          <span className="pharos-code">x-pharos-timestamp</span> ·{" "}
          <span className="pharos-code">x-pharos-nonce</span> ·{" "}
          <span className="pharos-code">x-pharos-signature</span>. Body: JSON
          mit Pflicht-Feld <span className="pharos-code">eventType</span>.
          Erlaubte Events:{" "}
          <span className="pharos-code">nis2.early_warning</span>,{" "}
          <span className="pharos-code">nis2.notification</span>,{" "}
          <span className="pharos-code">nis2.final_report</span>.
        </p>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  Icon,
  tone,
}: {
  label: string;
  value: number;
  Icon: typeof Activity;
  tone?: "ok";
}) {
  const valueCls =
    tone === "ok"
      ? "text-slate-800 dark:text-slate-200"
      : "text-slate-900 dark:text-slate-100";
  return (
    <div className="pharos-stat px-4 py-3.5">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-slate-500" />
        <div className="text-[10px] tracking-[0.18em] uppercase text-slate-500 font-semibold">
          {label}
        </div>
      </div>
      <div
        className={`pharos-display text-2xl font-semibold mt-1 tabular-nums ${valueCls}`}
      >
        {value}
      </div>
    </div>
  );
}
