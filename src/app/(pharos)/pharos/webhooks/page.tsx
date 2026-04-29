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
        <h1 className="text-2xl font-semibold mt-1 text-slate-900 dark:text-slate-100">
          Webhook-Endpoints
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
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

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-[11px] text-slate-600 leading-relaxed dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-500">
        <div className="font-medium text-slate-700 dark:text-slate-300 mb-1">
          Signing-Recipe für externe Operatoren
        </div>
        <pre className="bg-slate-900 text-slate-300 p-3 rounded overflow-x-auto text-[10px]">
          {`HMAC-SHA256(secret, timestamp + nonce + sha256(body))`}
        </pre>
        Header pro Request: <code>x-pharos-timestamp</code> ·{" "}
        <code>x-pharos-nonce</code> · <code>x-pharos-signature</code>. Body:
        JSON mit Pflicht-Feld <code>eventType</code>. Erlaubte Events:{" "}
        <code>nis2.early_warning</code>, <code>nis2.notification</code>,{" "}
        <code>nis2.final_report</code>.
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
      ? "text-slate-800 dark:text-slate-300"
      : "text-slate-900 dark:text-slate-100";
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-white/5 dark:bg-slate-900/30">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-slate-500" />
        <div className="text-[11px] tracking-wider uppercase text-slate-500 font-medium">
          {label}
        </div>
      </div>
      <div className={`text-2xl font-semibold mt-1 tabular-nums ${valueCls}`}>
        {value}
      </div>
    </div>
  );
}
