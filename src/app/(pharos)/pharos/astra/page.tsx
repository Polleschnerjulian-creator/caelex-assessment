/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /pharos/astra — Behörden-AI Chat-Page.
 *
 * Server component: renders the page chrome and example prompts,
 * delegates the chat itself to PharosAstraChat (client) which manages
 * the message history + streams replies through /api/pharos/astra/chat.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PharosAstraChat } from "./PharosAstraChat";

export const dynamic = "force-dynamic";

export default async function PharosAstraPage() {
  const session = await auth();
  if (!session?.user?.id)
    redirect("/pharos-login?callbackUrl=%2Fpharos%2Fastra");

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

  // Pre-load a few oversight IDs so we can suggest example prompts
  // anchored to real data (instead of dummy "abc123" stubs).
  const recentOversights = await prisma.oversightRelationship.findMany({
    where: {
      authorityProfileId: profile.id,
      status: { in: ["ACTIVE", "DISPUTED"] },
    },
    include: {
      operatorOrg: { select: { name: true } },
    },
    orderBy: { initiatedAt: "desc" },
    take: 3,
  });

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <div className="text-[10px] tracking-[0.22em] uppercase text-slate-400/70 font-semibold">
          Pharos-Astra
        </div>
        <h1 className="text-2xl font-semibold mt-1">
          KI-Assistent für regulatorische Aufsicht
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Stelle Fragen zu Operatoren, Audit-Logs oder Compliance-Trends. Der
          Assistent ruft scope-gegated Tools auf — fremde Aufsichten sind
          unsichtbar. Jeder Tool-Call wird transparent angezeigt.
        </p>
      </div>

      <PharosAstraChat
        suggestions={recentOversights.map((ov) => ({
          oversightId: ov.id,
          operatorName: ov.operatorOrg.name,
          oversightTitle: ov.oversightTitle,
        }))}
      />
    </div>
  );
}
