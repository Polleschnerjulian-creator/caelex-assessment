/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/atlas/mandate/[id]/full
 *
 * PERF-T1-1 aggregator: returns ALL mandate-detail data in a single
 * Promise.all round-trip so MandateDetailView can render with one
 * network round-trip instead of 9 (1 parent + 8 sub-component
 * fetches: activity, files, deadlines, time-entries, parties,
 * members, agent-runs, deadline-suggestions).
 *
 * Authz: standard org+owner-OR-member membership gate.
 *
 * Decryption: mandate PII fields (clientName, clientContact,
 * customInstructions) are encrypted at rest (SEC-T0-1) and decrypted
 * before return.
 *
 * Payload shape mirrors the union of what each subcomponent's existing
 * endpoint returns, with bounded per-source counts so the worst-case
 * payload stays under ~500KB even for chatty mandates:
 *   chats           ≤ 50   (matching loadChatForUser cap)
 *   files           ≤ 50
 *   deadlines       ≤ 25
 *   timeEntries     ≤ 25
 *   parties         ≤ 25
 *   members         ≤ 25
 *   agentRuns       ≤ 25
 *   deadlineSuggs   ≤ 25
 *
 * NOT included (subcomponents still fetch these themselves):
 *   - background-agent live status (websocket-style, not a snapshot)
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { logger } from "@/lib/logger";
import { maskId } from "@/lib/atlas/log-masking";
import { decryptAtlasField } from "@/lib/atlas/atlas-encryption";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MANDATE_ID = z.string().cuid();
const PER_SOURCE_LIMIT = 25;
const CHATS_LIMIT = 50;
const FILES_LIMIT = 50;

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: rawId } = await context.params;
  const parsed = MANDATE_ID.safeParse(rawId);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const mandateId = parsed.data;

  /* Membership gate first — bail fast if caller has no access. */
  const access = await prisma.atlasMandate.findFirst({
    where: {
      id: mandateId,
      organizationId: atlas.organizationId,
      OR: [
        { ownerUserId: atlas.userId },
        { members: { some: { userId: atlas.userId } } },
      ],
    },
    select: { id: true },
  });
  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    /* Single Promise.all bundles every subresource. Replaces 9
       sequential client fetches. Each query is bounded so the
       aggregate payload stays predictable even for chatty mandates. */
    const [
      mandate,
      chats,
      files,
      deadlines,
      timeEntries,
      parties,
      members,
      agentRuns,
      deadlineSuggestions,
    ] = await Promise.all([
      prisma.atlasMandate.findUnique({
        where: { id: mandateId },
        select: {
          id: true,
          name: true,
          clientName: true,
          clientContact: true,
          customInstructions: true,
          jurisdiction: true,
          operatorType: true,
          primaryAuthority: true,
          status: true,
          archivedAt: true,
          closedAt: true,
          createdAt: true,
          updatedAt: true,
          ownerUserId: true,
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { chats: true, files: true, members: true } },
        },
      }),
      prisma.atlasChat.findMany({
        where: { mandateId, archivedAt: null },
        orderBy: { updatedAt: "desc" },
        take: CHATS_LIMIT,
        select: { id: true, title: true, updatedAt: true, createdAt: true },
      }),
      prisma.atlasMandateFile.findMany({
        where: { mandateId },
        orderBy: { createdAt: "desc" },
        take: FILES_LIMIT,
        select: {
          id: true,
          filename: true,
          mimeType: true,
          sizeBytes: true,
          documentType: true,
          createdAt: true,
          uploadedBy: { select: { id: true, name: true, email: true } },
        },
      }),
      /* WAVE 11D step 2: selects mirror what each subcomponent's
         own endpoint returns so the slice can be consumed as
         `initialData` directly with no field-mapping. Any field the
         subcomponent reads MUST be selected here, otherwise the
         seeded first paint shows an incomplete row. */
      prisma.atlasMandateDeadline.findMany({
        where: { mandateId },
        orderBy: { dueAt: "asc" },
        take: PER_SOURCE_LIMIT,
        select: {
          id: true,
          title: true,
          description: true,
          dueAt: true,
          /* `warnDays` drives the amber-pill warning state in
             MandateDeadlines — without it the warning never fires. */
          warnDays: true,
          status: true,
          /* `url` is the Portal-link affordance on each row. */
          url: true,
          createdAt: true,
        },
      }),
      prisma.atlasTimeEntry.findMany({
        where: { mandateId },
        orderBy: { createdAt: "desc" },
        take: PER_SOURCE_LIMIT,
        select: {
          id: true,
          description: true,
          minutes: true,
          /* `billable` + `hourlyRateEur` drive the €-totals strip and
             the "nicht abrechenbar" pill. Both must be present so the
             totals computed client-side match what the server would
             return. */
          billable: true,
          hourlyRateEur: true,
          /* `workedOn` is the display date on each row (different from
             createdAt — workedOn is the date the work was performed). */
          workedOn: true,
          /* `chatId` toggles the "Chat" link affordance per row. */
          chatId: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.atlasMandateParty.findMany({
        where: { mandateId },
        orderBy: { createdAt: "asc" },
        take: PER_SOURCE_LIMIT,
        select: {
          id: true,
          type: true,
          name: true,
          /* MandateParties renders role, address, reference, notes,
             and updatedAt — all must be in the slice. */
          role: true,
          contact: true,
          address: true,
          reference: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.atlasMandateMember.findMany({
        where: { mandateId },
        orderBy: { addedAt: "asc" },
        take: PER_SOURCE_LIMIT,
        select: {
          id: true,
          role: true,
          addedAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.atlasAgentRun.findMany({
        where: { mandateId },
        orderBy: { startedAt: "desc" },
        take: PER_SOURCE_LIMIT,
        select: {
          id: true,
          goal: true,
          status: true,
          startedAt: true,
          completedAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      /* WAVE 11D FIX (2026-05-19): was querying atlasMandateDeadline with
         a `status: "pending"` filter, which is wrong on two counts: (a)
         AtlasMandateDeadline.status uses "open"/"done", not "pending"; (b)
         the actual surface (MandateDeadlineSuggestions) consumes from a
         separate model AtlasMandateDeadlineSuggestion that carries
         confidence + suggestedAt + sourceFile.filename. The bug would
         have caused the deadline-suggestions slice to render empty
         (never matching) and the lawyer would see a useless "no
         suggestions" state even when the model had pending rows. Query
         shape must mirror /api/atlas/mandate/[id]/deadline-suggestions
         exactly so the consuming component can use the slice as
         initialData with no field-mapping. */
      prisma.atlasMandateDeadlineSuggestion.findMany({
        where: { mandateId, status: "pending" },
        orderBy: [{ confidence: "desc" }, { dueAt: "asc" }],
        take: PER_SOURCE_LIMIT,
        select: {
          id: true,
          title: true,
          description: true,
          dueAt: true,
          confidence: true,
          suggestedAt: true,
          sourceFile: { select: { id: true, filename: true } },
        },
      }),
    ]);

    if (!mandate) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    /* SEC-T0-1: decrypt the 3 PII fields on the mandate row. */
    const [clientName, clientContact, customInstructions] = await Promise.all([
      decryptAtlasField(mandate.clientName),
      decryptAtlasField(mandate.clientContact),
      decryptAtlasField(mandate.customInstructions),
    ]);

    return NextResponse.json({
      mandate: { ...mandate, clientName, clientContact, customInstructions },
      chats,
      files,
      deadlines,
      timeEntries,
      parties,
      members,
      agentRuns,
      deadlineSuggestions,
    });
  } catch (err) {
    logger.error("[atlas/mandate/full] failed", {
      userId: maskId(atlas.userId),
      mandateId: maskId(mandateId),
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Mandate detail fetch failed" },
      { status: 500 },
    );
  }
}
