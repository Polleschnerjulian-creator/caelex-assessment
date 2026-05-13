/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Mandate-Index page.
 *
 * Cards-Übersicht aller Mandate des Users (active by default; Filter
 * erlaubt switch zu archived/closed). Search + Sort + Filter sind
 * client-side über die initial geladene Liste — bei <500 Mandaten
 * (Lawyer-Realität) ist das schnell genug. Skalierung auf server-
 * side filtering ist M2-Aufgabe wenn Bedarf entsteht.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { MandateIndexClient } from "./_components/MandateIndexClient";

export const dynamic = "force-dynamic";

export default async function AtlasMandateIndexPage() {
  const atlas = await getAtlasAuth();
  if (!atlas) redirect("/atlas/sign-in");

  /* Lade alle Mandate (active + archived + closed), client-seitig
     gefiltert. Default-Filter ist 'active'. */
  const mandates = await prisma.atlasMandate.findMany({
    where: {
      organizationId: atlas.organizationId,
      OR: [
        { ownerUserId: atlas.userId },
        { members: { some: { userId: atlas.userId } } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      clientName: true,
      jurisdiction: true,
      operatorType: true,
      primaryAuthority: true,
      status: true,
      updatedAt: true,
      createdAt: true,
      _count: {
        select: { chats: true, files: true, deadlines: true },
      },
      deadlines: {
        where: { status: "open" },
        orderBy: { dueAt: "asc" },
        take: 1,
        select: { id: true, title: true, dueAt: true },
      },
    },
  });

  return <MandateIndexClient mandates={mandates} />;
}
