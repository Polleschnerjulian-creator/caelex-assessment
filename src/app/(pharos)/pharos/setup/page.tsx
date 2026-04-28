/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /pharos/setup — first-run profile configuration AND ongoing
 * profile editing. The form pulls existing profile (if any) on
 * mount and POSTs/PATCHes /api/pharos/authority/profile.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SetupForm } from "./SetupForm";

export const dynamic = "force-dynamic";

export default async function PharosSetupPage() {
  const session = await auth();
  if (!session?.user?.id)
    redirect("/pharos-login?callbackUrl=%2Fpharos%2Fsetup");

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    select: {
      role: true,
      organizationId: true,
    },
    orderBy: { joinedAt: "asc" },
  });
  if (!membership) redirect("/pharos-no-access");

  const profile = await prisma.authorityProfile.findUnique({
    where: { organizationId: membership.organizationId },
  });

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <div className="text-[10px] tracking-[0.22em] uppercase text-amber-400/70 font-semibold">
          {profile ? "Profil bearbeiten" : "Erst-Konfiguration"}
        </div>
        <h1 className="text-2xl font-semibold mt-1">Behörden-Profil</h1>
        <p className="text-sm text-slate-400 mt-1">
          Hier konfigurierst du Aufsichts-Bereich, Jurisdiktion und Kontakt.
          Operatoren sehen diese Angaben in jeder Aufsichts-Einladung.
        </p>
      </div>

      <SetupForm
        existing={
          profile
            ? {
                authorityType: profile.authorityType,
                jurisdiction: profile.jurisdiction,
                oversightCategories: profile.oversightCategories as string[],
                contactEmail: profile.contactEmail,
                publicWebsite: profile.publicWebsite,
                legalReference: profile.legalReference,
              }
            : null
        }
        canEdit={membership.role === "OWNER" || membership.role === "ADMIN"}
      />
    </div>
  );
}
