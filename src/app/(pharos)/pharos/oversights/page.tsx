/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * /pharos/oversights — full oversight list across all statuses.
 * Roughly the same view as the operator-roster but grouped by
 * status rather than by operator. Useful for compliance officers
 * who want to monitor pending and disputed cases.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const STATUS_GROUPS = [
  { key: "PENDING_OPERATOR_ACCEPT", label: "Wartet auf Annahme" },
  { key: "DISPUTED", label: "In Streit" },
  { key: "ACTIVE", label: "Aktiv" },
  { key: "SUSPENDED", label: "Pausiert" },
  { key: "CLOSED", label: "Beendet" },
  { key: "REVOKED", label: "Entzogen" },
] as const;

export default async function PharosOversightsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fpharos");

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

  const oversights = await prisma.oversightRelationship.findMany({
    where: { authorityProfileId: profile.id },
    include: {
      operatorOrg: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { initiatedAt: "desc" },
  });

  const grouped = STATUS_GROUPS.map((g) => ({
    ...g,
    items: oversights.filter((ov) => ov.status === g.key),
  }));

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase text-amber-400/70 font-semibold">
            Aufsichten
          </div>
          <h1 className="text-2xl font-semibold mt-1">
            {oversights.length}{" "}
            {oversights.length === 1 ? "Aufsicht" : "Aufsichten"} insgesamt
          </h1>
        </div>
        <Link
          href="/pharos/oversights/new"
          className="inline-flex items-center h-9 px-4 rounded-md bg-amber-500 hover:bg-amber-400 text-amber-950 text-sm font-medium"
        >
          Neue Aufsicht
        </Link>
      </div>

      {grouped
        .filter((g) => g.items.length > 0)
        .map((g) => (
          <section key={g.key}>
            <h2 className="text-xs uppercase tracking-wider text-slate-500 mb-2">
              {g.label} · {g.items.length}
            </h2>
            <div className="rounded-lg border border-white/5 bg-navy-900/30 divide-y divide-white/5">
              {g.items.map((ov) => (
                <Link
                  key={ov.id}
                  href={`/pharos/operators/${ov.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.03]"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {ov.oversightTitle}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {ov.operatorOrg.name} · {ov.legalReference}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 ml-4 flex-shrink-0">
                    {new Date(ov.initiatedAt).toLocaleDateString("de-DE")}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}

      {oversights.length === 0 && (
        <div className="rounded-lg border border-white/5 bg-navy-900/30 px-6 py-10 text-center text-sm text-slate-500">
          Du hast noch keine Aufsichten. Klicke „Neue Aufsicht", um die erste
          anzulegen.
        </div>
      )}
    </div>
  );
}
