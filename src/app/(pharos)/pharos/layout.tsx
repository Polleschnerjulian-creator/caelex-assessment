/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * /pharos route-group layout. Auth-gated to AUTHORITY-type orgs only.
 * A user belonging to multiple orgs uses the first ACTIVE membership;
 * if none of their orgs is an AUTHORITY, they're redirected to
 * /pharos-no-access with a friendly explainer.
 *
 * Design language: navy/glass-elevated like the operator dashboard,
 * but with a distinct accent — Pharos uses amber as the regulatory
 * "guidance light" color to set it apart from operator-emerald and
 * Atlas-cyan.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensurePharosPreviewSetup } from "@/lib/pharos/preview-mode";
import PharosShell from "./_components/PharosShell";

export const metadata = {
  title: "PHAROS — Behördlicher Aufsichts-Workspace",
  description:
    "Pharos ist die Aufsichtsplattform für Behörden im Weltraum-Sektor. Operator-Compliance live einsehen, Aufsichten initiieren, Hash-Chain-Audit-Logs.",
};

export default async function PharosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/pharos-login?callbackUrl=%2Fpharos");
  }

  // Preview-Mode hook (env: PHAROS_OPEN_PREVIEW=1) — auto-attaches
  // the visitor to a demo AUTHORITY org so they can poke around the
  // workspace without a manual seed step. Idempotent + no-op when
  // the flag is unset, so this line is safe to leave in until prod.
  // See src/lib/pharos/preview-mode.ts for what this provisions.
  await ensurePharosPreviewSetup(session.user.id);

  // Get caller's org and role. Pharos is gated to AUTHORITY orgs.
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    select: {
      role: true,
      organization: {
        select: {
          id: true,
          name: true,
          orgType: true,
          isActive: true,
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  if (!membership || !membership.organization.isActive) {
    redirect("/pharos-login?callbackUrl=%2Fpharos");
  }

  if (membership.organization.orgType !== "AUTHORITY") {
    redirect("/pharos-no-access");
  }

  // Resolve profile status — drives whether shell shows a setup banner.
  const profile = await prisma.authorityProfile.findUnique({
    where: { organizationId: membership.organization.id },
    select: { id: true, authorityType: true, jurisdiction: true },
  });

  return (
    <PharosShell
      org={{
        id: membership.organization.id,
        name: membership.organization.name,
      }}
      role={membership.role}
      profile={profile}
    >
      {children}
    </PharosShell>
  );
}
