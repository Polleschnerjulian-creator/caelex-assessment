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
import type { OrganizationRole } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import {
  ensurePharosPreviewSetup,
  isPharosPreviewOpen,
} from "@/lib/pharos/preview-mode";
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
    // Preview-mode skips the login page entirely — auto-signin route
    // provisions a demo guest user and signs them in programmatically.
    if (isPharosPreviewOpen()) {
      redirect("/pharos-auto-signin?callbackUrl=%2Fpharos");
    }
    redirect("/pharos-login?callbackUrl=%2Fpharos");
  }

  // Preview-Mode hook — auto-attaches the visitor to a demo AUTHORITY
  // org so they can poke around the workspace without a manual seed
  // step. Idempotent + no-op when PREVIEW_OPEN is false, so this
  // line is safe to leave in until prod.
  await ensurePharosPreviewSetup(session.user.id);

  // Get caller's org and role. Pharos is gated to AUTHORITY orgs.
  // Super-admin: pick the first AUTHORITY org we can find (any user's),
  // so platform owners can debug Pharos UIs without first being added
  // as a member of one. Falls back to a synthetic shell context if
  // no AUTHORITY org exists at all (fresh deploy).
  const isSuperAdminUser = isSuperAdmin(session.user.email);

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

  let orgId: string;
  let orgName: string;
  let role: OrganizationRole;

  if (
    membership?.organization.isActive &&
    membership.organization.orgType === "AUTHORITY"
  ) {
    orgId = membership.organization.id;
    orgName = membership.organization.name;
    role = membership.role;
  } else if (isSuperAdminUser) {
    // Super-admin fallback — find ANY active AUTHORITY org and scope
    // to it. Platform owners need to be able to load Pharos for
    // debugging even without their own AUTHORITY membership.
    const anyAuthorityOrg = await prisma.organization.findFirst({
      where: { orgType: "AUTHORITY", isActive: true },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    });
    if (!anyAuthorityOrg) {
      // No AUTHORITY org exists at all — render the shell with a
      // synthetic placeholder so the super-admin sees the UI scaffold
      // and can finish setup.
      orgId = "super-admin-no-authority-org";
      orgName = "Super-Admin (no AUTHORITY org yet)";
      role = "OWNER";
    } else {
      orgId = anyAuthorityOrg.id;
      orgName = anyAuthorityOrg.name;
      role = "OWNER";
    }
  } else if (!membership || !membership.organization.isActive) {
    redirect("/pharos-login?callbackUrl=%2Fpharos");
  } else {
    // Wrong orgType (not AUTHORITY) and not a super-admin
    redirect("/pharos-no-access");
  }

  // Resolve profile status — drives whether shell shows a setup banner.
  const profile = await prisma.authorityProfile.findUnique({
    where: { organizationId: orgId },
    select: { id: true, authorityType: true, jurisdiction: true },
  });

  return (
    <PharosShell
      org={{
        id: orgId,
        name: orgName,
      }}
      role={role}
      profile={profile}
    >
      {children}
    </PharosShell>
  );
}
