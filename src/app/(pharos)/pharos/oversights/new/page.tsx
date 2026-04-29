/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /pharos/oversights/new — initiate a new oversight relationship.
 * The form posts to /api/pharos/oversight (POST) and on success
 * shows the rawAcceptToken + acceptUrl, which the authority then
 * pastes into an email to the operator-side compliance officer.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { InitiateForm } from "./InitiateForm";

export const dynamic = "force-dynamic";

export default async function PharosNewOversightPage() {
  const session = await auth();
  if (!session?.user?.id)
    redirect("/pharos-login?callbackUrl=%2Fpharos%2Foversights%2Fnew");

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    select: {
      role: true,
      organizationId: true,
      organization: { select: { orgType: true } },
    },
    orderBy: { joinedAt: "asc" },
  });
  if (!membership) redirect("/pharos-no-access");
  if (membership.organization.orgType !== "AUTHORITY")
    redirect("/pharos-no-access");

  const profile = await prisma.authorityProfile.findUnique({
    where: { organizationId: membership.organizationId },
  });
  if (!profile) redirect("/pharos/setup");

  // Pre-fetch a slim list of OPERATOR-type orgs the authority can
  // pick from. We restrict to active operator-orgs only — the
  // authority is responsible for verifying jurisdictional eligibility.
  const operators = await prisma.organization.findMany({
    where: {
      orgType: "OPERATOR",
      isActive: true,
    },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
    take: 200,
  });

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <div className="text-[10px] tracking-[0.22em] uppercase text-slate-700 dark:text-slate-400/70 font-semibold">
          Neue Aufsicht
        </div>
        <h1 className="pharos-display text-3xl font-semibold mt-1 text-slate-900 dark:text-slate-100">
          Aufsichts-Beziehung initiieren
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
          Du erstellst hiermit eine Aufsicht im Status „Wartet auf Annahme". Der
          Operator bekommt einen einmaligen Token-Link, mit dem er die Aufsicht
          prüfen und annehmen oder anfechten kann.
        </p>
      </div>

      <InitiateForm
        operators={operators}
        defaultLegalReference={profile.legalReference ?? ""}
      />
    </div>
  );
}
