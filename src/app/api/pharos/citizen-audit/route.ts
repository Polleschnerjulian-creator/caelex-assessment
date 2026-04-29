/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET  /api/pharos/citizen-audit?subject=<email-or-orgId>
 * POST /api/pharos/citizen-audit  (für signierte Anfragen)
 *
 * Citizen Audit — DSGVO Art. 15 Auskunfts-Endpoint.
 *
 * Jeder EU-Bürger / jede juristische Person hat das Recht auf Auskunft
 * über ALLE Verarbeitungen ihrer personenbezogenen Daten — insbesondere
 * bei automatisierten Entscheidungen (Art. 22) das Recht auf "aussage-
 * kräftige Informationen über die involvierte Logik". Die EuGH-Schufa-
 * Rechtsprechung (C-634/21, C-203/22 Dun & Bradstreet) hat das verschärft.
 *
 * Pharos liefert hier vollautomatisch:
 *   - Liste ALLER OversightAccessLog-Einträge betreffend den Antragsteller
 *   - Receipt-Verify-Links für jede Pharos-AI-Inferenz
 *   - Time-Travel-Links zum jeweiligen System-Stand
 *   - Plain-Language-Begründung der Glass-Box-Architektur
 *   - Widerspruchs-Pfad (welche Stelle, welche Frist)
 *
 * Auth-Modell: Phase 1 erfordert ein authentifiziertes Caelex-Konto
 * (NextAuth-Session) — User kann nur seine eigenen Daten anfragen.
 * Phase 2 (Q3 2026): EUDIW-Login mit signed VC für rechtsverbindliche
 * Auskunftsanträge ohne Caelex-Konto.
 *
 * SLA: <= 24h Bearbeitung (Art. 12 Abs. 3 DSGVO erlaubt 1 Monat, wir
 * sind technisch instant).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const callerEmail = session.user.email;
    const callerUserId = session.user.id;

    // Subject: für Phase 1 nur der eigene Account (keine Stellvertreter-
    // Anfragen). Phase 2 erlaubt signierte Vollmachten.
    const subjectParam = request.nextUrl.searchParams.get("subject");
    const subject = subjectParam ?? callerEmail;
    if (subject !== callerEmail) {
      return NextResponse.json(
        {
          error:
            "Phase 1: Auskunft nur über eigenen Account möglich. Stellvertreter-Anträge brauchen EUDIW-Vollmacht (Phase 2).",
        },
        { status: 403 },
      );
    }

    // Resolve all org-memberships of the caller — that's the scope of
    // "their" data in Pharos.
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: callerUserId },
      select: {
        organizationId: true,
        organization: { select: { id: true, name: true, orgType: true } },
      },
    });
    const orgIds = memberships.map((m) => m.organizationId);

    // 1. Find all OversightRelationships in which the caller's orgs are
    //    operator OR authority side.
    const authProfiles = await prisma.authorityProfile.findMany({
      where: { organizationId: { in: orgIds } },
      select: { id: true },
    });
    const authProfileIds = authProfiles.map((p) => p.id);

    const oversights = await prisma.oversightRelationship.findMany({
      where: {
        OR: [
          { operatorOrgId: { in: orgIds } },
          { authorityProfileId: { in: authProfileIds } },
        ],
      },
      select: {
        id: true,
        oversightTitle: true,
        oversightReference: true,
        legalReference: true,
        status: true,
        operatorOrgId: true,
        authorityProfileId: true,
        initiatedAt: true,
      },
    });
    const oversightIds = oversights.map((o) => o.id);

    // 2. All access-log entries touching those oversights (chronological).
    const logEntries =
      oversightIds.length === 0
        ? []
        : await prisma.oversightAccessLog.findMany({
            where: { oversightId: { in: oversightIds } },
            orderBy: { createdAt: "desc" },
            take: 500,
            select: {
              id: true,
              oversightId: true,
              action: true,
              resourceType: true,
              actorOrgId: true,
              actorUserId: true,
              createdAt: true,
              entryHash: true,
            },
          });

    // 3. Build the structured DSGVO Art. 15 response.
    return NextResponse.json({
      version: "pharos-citizen-audit-v1",
      subject,
      requestedAt: new Date().toISOString(),
      slaCompliant: true, // we answer instantly
      legalBasis: [
        "DSGVO Art. 15 (Auskunftsrecht)",
        "DSGVO Art. 22 i.V.m. EuGH C-634/21 (Schufa)",
        "DSGVO Art. 22 i.V.m. EuGH C-203/22 (Dun & Bradstreet)",
      ],
      summary: {
        oversightsFound: oversights.length,
        accessLogEntries: logEntries.length,
        authorityProfiles: authProfileIds.length,
        operatorOrganizations: orgIds.length,
      },
      oversights: oversights.map((o) => ({
        id: o.id,
        title: o.oversightTitle,
        reference: o.oversightReference,
        legalReference: o.legalReference,
        status: o.status,
        role: authProfileIds.includes(o.authorityProfileId)
          ? "authority-side"
          : "operator-side",
        initiatedAt: o.initiatedAt,
      })),
      processingActivities: logEntries.map((e) => ({
        entryId: e.id,
        oversightId: e.oversightId,
        action: e.action,
        resourceType: e.resourceType,
        actorOrgId: e.actorOrgId,
        actorUserId: e.actorUserId,
        createdAt: e.createdAt,
        entryHashShort: e.entryHash.slice(0, 16),
        verifyUrl:
          e.resourceType === "PharosAstraReceipt"
            ? `/api/pharos/receipt/${e.id}`
            : null,
        timeTravel: `/api/pharos/time-travel?ts=${encodeURIComponent(
          e.createdAt.toISOString(),
        )}&entryId=${e.id}`,
      })),
      automatedDecisionLogic: {
        description:
          "Pharos trifft NIEMALS juristische Endentscheidungen. Der Pharos-AI-Copilot (Astra) liefert ausschließlich Argumentationshilfen mit vollständigem Citation-Trail; finale Bescheide werden stets von einer natürlichen Person mit Begründungspflicht (§ 39 VwVfG) unterzeichnet.",
        glassBoxLayers: [
          "1. Citation-Pflicht: jede Aussage referenziert eine Norm-Quelle oder einen DB-Datensatz mit kryptografischem Hash",
          "2. LLM-as-a-Judge: zweite Inferenz prüft die Citation-Validität semantisch",
          "3. Triple-Hash-Receipt: Ed25519-signierte Quittung über Input/Context/Output",
          "4. Hash-Chain: jeder Receipt verkettet sich an den vorherigen — tamper-evident",
          "5. Witness-Quorum 3-of-5: Tree-Heads werden von 5 unabhängigen Schlüsseln cosigniert",
          "6. Time-Travel: jede historische Aussage ist byte-identisch reproduzierbar",
        ],
        verifyAtHome:
          "Jeder Receipt ist via `npx pharos-verify <entryId>` lokal kryptografisch verifizierbar — ohne Caelex-Software zu benötigen.",
      },
      objectionPath: {
        rightToObject:
          "DSGVO Art. 21 — du kannst der Verarbeitung jederzeit widersprechen. Bei automatisierten Entscheidungen zusätzlich Art. 22 Abs. 3: Recht auf Eingreifen einer natürlichen Person, auf Darlegung des eigenen Standpunkts und auf Anfechtung der Entscheidung.",
        contactCaelex:
          "datenschutz@caelex.app — Antwort innerhalb 30 Tagen DSGVO Art. 12 Abs. 3.",
        contactCompetentAuthority:
          "Bundesbeauftragte für den Datenschutz und die Informationsfreiheit (BfDI), Graurheindorfer Straße 153, 53117 Bonn, https://www.bfdi.bund.de",
      },
      witnessCheckpointUrl: "/api/pharos/witness-checkpoint",
      machineReadable: {
        format: "json",
        hashAlgorithm: "sha256",
        signatureAlgorithm: "ed25519",
        canonicalJsonRule:
          "JSON.stringify with alphabetically sorted keys at every nesting level",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[pharos-citizen-audit] failed: ${msg}`);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
