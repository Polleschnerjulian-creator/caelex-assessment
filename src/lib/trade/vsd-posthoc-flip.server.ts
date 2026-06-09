import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Caelex Passage P2, Lane C — POST-HOC SANCTIONS-FLIP detection.
 *
 * THE SCENARIO this guards: a shipment already EXECUTED, then the daily
 * re-screen cron finds the counterparty NOW matches a sanctions list — the
 * lists moved after the goods left. That is the textbook trigger for a
 * Voluntary Self-Disclosure (VSD): you shipped to a party that is (now)
 * designated, and prompt self-disclosure is what preserves penalty mitigation.
 *
 * THE INVARIANT (fail-closed, never auto-file): when a re-screen flips an
 * ALREADY-EXECUTED operation's counterparty from a non-hit state to a hit, this
 * function CREATES a TradeVoluntaryDisclosure record (status DISCOVERED — the
 * model's fail-closed initial state; discoveredAt = the flip time, which starts
 * the OFAC 60-day clock per 31 CFR §501.805(c)) and raises a LOUD in-app
 * notification. It NEVER files the VSD (no portal API), NEVER suppresses or
 * auto-clears the post-hoc hit, and NEVER makes any determination more
 * permissive. Caelex PREPARES + INFORMS; a human decides, files, and is
 * recorded.
 *
 * Idempotent: a party can flip back and forth across daily runs, but we raise at
 * most ONE open VSD per (operation, party). If an open VSD already links that
 * operation + party, we skip — the existing 60-day clock stands; we do not reset
 * it or create duplicates.
 *
 * Called by the re-screen cron (api/cron/trade-rescreen-stale) AFTER each
 * screenParty() call, with the party's PRIOR screening status (captured before
 * the re-screen) and the fresh decision.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  NotificationSeverity,
  NotificationType,
  TradeScreeningStatus,
  TradeVSDAuthority,
  TradeVSDStatus,
  TradeVSDViolationType,
  type TradeScreeningDecision,
} from "@prisma/client";

// Operation statuses that count as "already shipped" for VSD purposes. EXECUTED
// is the shipment-complete state; VOLUNTARY_DISCLOSURE_FILED is included so a
// fresh post-hoc flip on an operation already in disclosure still gets surfaced
// (a second list could implicate it differently). BLOCKED-after-execution is
// NOT here: a blocked operation never shipped under this lifecycle path.
const SHIPPED_STATUSES = ["EXECUTED", "VOLUNTARY_DISCLOSURE_FILED"] as const;

// A "non-hit" prior state — the states from which a flip TO a hit is a genuine
// post-hoc designation (the party was previously clearable). CONFIRMED_HIT /
// POTENTIAL_MATCH are NOT here: a party already flagged didn't "flip", so a
// routine re-screen of a still-flagged party raises nothing new.
const NON_HIT_PRIOR: TradeScreeningStatus[] = [
  TradeScreeningStatus.NOT_SCREENED,
  TradeScreeningStatus.CLEAR,
  TradeScreeningStatus.STALE,
];

export interface PostHocFlipInput {
  partyId: string;
  /** The party's screeningStatus BEFORE the re-screen (captured by the cron). */
  priorStatus: TradeScreeningStatus;
  /** The decision the fresh screenParty() returned. */
  newDecision: TradeScreeningDecision;
  organizationId: string;
}

export interface PostHocFlipResult {
  flipped: boolean;
  /** Operations that received a NEW VSD this run. */
  vsdsCreated: Array<{
    operationId: string;
    operationRef: string;
    vsdId: string;
  }>;
  /** Operations already covered by an open VSD (idempotent skip). */
  skippedExisting: number;
}

/**
 * Detect a post-hoc CLEAR→hit flip for one re-screened party and, for every
 * ALREADY-SHIPPED operation whose counterparty is this party, raise a VSD +
 * notification. Returns a summary for the cron's response/logging.
 *
 * Best-effort per operation: a failure on one operation is logged and does not
 * abort the others (the cron must keep processing the batch).
 */
export async function raiseVsdForPostHocFlip(
  input: PostHocFlipInput,
  now: Date = new Date(),
): Promise<PostHocFlipResult> {
  const { partyId, priorStatus, newDecision, organizationId } = input;

  // A FLIP requires: prior state was a non-hit AND the new decision IS a hit.
  // POTENTIAL_MATCH + CONFIRMED_HIT are both "hit" decisions that demand human
  // review of an already-shipped operation. CLEAR / FALSE_POSITIVE_DISMISSED
  // are non-hits — no flip.
  const newIsHit =
    newDecision === "POTENTIAL_MATCH" || newDecision === "CONFIRMED_HIT";
  const priorWasNonHit = NON_HIT_PRIOR.includes(priorStatus);

  if (!newIsHit || !priorWasNonHit) {
    return { flipped: false, vsdsCreated: [], skippedExisting: 0 };
  }

  // Find ALREADY-SHIPPED operations whose counterparty is this flipped party.
  const shippedOps = await prisma.tradeOperation.findMany({
    where: {
      organizationId,
      counterpartyId: partyId,
      status: { in: [...SHIPPED_STATUSES] },
    },
    select: {
      id: true,
      reference: true,
      createdById: true,
      counterparty: { select: { canonicalName: true, countryCode: true } },
    },
  });

  if (shippedOps.length === 0) {
    // The party flipped, but no shipped operation depends on it — nothing to
    // disclose. (A flipped party with only DRAFT/SCREENING operations is
    // handled by the normal pre-ship gate, not a VSD.)
    return { flipped: true, vsdsCreated: [], skippedExisting: 0 };
  }

  const vsdsCreated: PostHocFlipResult["vsdsCreated"] = [];
  let skippedExisting = 0;

  for (const op of shippedOps) {
    try {
      // Idempotency: skip if an OPEN VSD already links this operation + party.
      const existing = await prisma.tradeVoluntaryDisclosure.findFirst({
        where: {
          organizationId,
          operationId: op.id,
          partyId,
          status: {
            in: [
              TradeVSDStatus.DISCOVERED,
              TradeVSDStatus.INVESTIGATING,
              TradeVSDStatus.DRAFTED,
              TradeVSDStatus.SUBMITTED,
              TradeVSDStatus.ACKNOWLEDGED,
            ],
          },
        },
        select: { id: true },
      });
      if (existing) {
        skippedExisting += 1;
        continue;
      }

      const partyName = op.counterparty?.canonicalName ?? "Gegenpartei";
      const partyCountry = op.counterparty?.countryCode
        ? ` (${op.counterparty.countryCode})`
        : "";

      // CREATE the VSD. status defaults to DISCOVERED (fail-closed initial
      // state); discoveredAt = the flip time, which starts the OFAC 60-day
      // clock. Authority OFAC + violationType PROHIBITED_PARTY (shipped to a
      // sanctioned end-user, post-screening miss). lastActionById is the
      // operation author — the human who owns the record, NOT "the system".
      const vsd = await prisma.tradeVoluntaryDisclosure.create({
        data: {
          organizationId,
          authority: TradeVSDAuthority.OFAC,
          violationType: TradeVSDViolationType.PROHIBITED_PARTY,
          status: TradeVSDStatus.DISCOVERED,
          title: `Nachträglicher Sanktionstreffer: ${partyName}${partyCountry} — Vorgang ${op.reference}`,
          description:
            `Bei einer routinemäßigen erneuten Sanktionslisten-Prüfung wurde die ` +
            `Gegenpartei "${partyName}"${partyCountry} als Treffer eingestuft, ` +
            `NACHDEM der Ausfuhrvorgang ${op.reference} bereits ausgeführt war. ` +
            `Die Listen haben sich nach dem Versand bewegt (Status vorher: ` +
            `${priorStatus} → jetzt: ${newDecision}). Mögliche Lieferung an eine ` +
            `(nun) designierte Partei — eine freiwillige Selbstanzeige ist zu ` +
            `prüfen, um Strafmilderung zu wahren. Dieser Entwurf wurde vom System ` +
            `vorbereitet; Bewertung, Einreichung und Verantwortung liegen beim ` +
            `benannten Ausfuhrverantwortlichen. Caelex reicht NICHTS ein.`,
          discoveredAt: now,
          operationId: op.id,
          partyId,
          lastActionById: op.createdById,
        },
      });

      vsdsCreated.push({
        operationId: op.id,
        operationRef: op.reference,
        vsdId: vsd.id,
      });

      // LOUD in-app notification to the org's OWNER/ADMIN/MANAGER members.
      await notifyPostHocVsd({
        organizationId,
        operationId: op.id,
        operationRef: op.reference,
        vsdId: vsd.id,
        partyName,
        partyCountry,
        discoveredAt: now,
      });

      logger.warn(
        "vsd-posthoc-flip: raised VSD for post-shipment sanctions flip",
        {
          organizationId,
          operationId: op.id,
          reference: op.reference,
          partyId,
          priorStatus,
          newDecision,
          vsdId: vsd.id,
        },
      );
    } catch (err) {
      logger.error(
        "vsd-posthoc-flip: failed to raise VSD for operation (continuing)",
        err,
        { organizationId, operationId: op.id, partyId },
      );
    }
  }

  return { flipped: true, vsdsCreated, skippedExisting };
}

/**
 * Raise an URGENT in-app notification for every OWNER/ADMIN/MANAGER of the org
 * when a post-hoc VSD is created. Best-effort — a notification failure must
 * never roll back the VSD itself (the obligation stands regardless).
 */
async function notifyPostHocVsd(args: {
  organizationId: string;
  operationId: string;
  operationRef: string;
  vsdId: string;
  partyName: string;
  partyCountry: string;
  discoveredAt: Date;
}): Promise<void> {
  const recipients = await prisma.organizationMember.findMany({
    where: {
      organizationId: args.organizationId,
      role: { in: ["OWNER", "ADMIN", "MANAGER"] },
    },
    select: { userId: true },
  });
  if (recipients.length === 0) return;

  const dueAt = new Date(
    args.discoveredAt.getTime() + 60 * 24 * 60 * 60 * 1000,
  );
  const dueLabel = dueAt.toLocaleDateString("de-DE");

  await prisma.notification.createMany({
    data: recipients.map((r) => ({
      userId: r.userId,
      organizationId: args.organizationId,
      type: NotificationType.COMPLIANCE_ACTION_REQUIRED,
      severity: NotificationSeverity.URGENT,
      title: `Nachträglicher Sanktionstreffer — VSD fällig: ${args.operationRef}`,
      message:
        `${args.partyName}${args.partyCountry} wurde NACH Ausführung von ` +
        `${args.operationRef} als Sanktionstreffer eingestuft. Freiwillige ` +
        `Selbstanzeige (VSD) prüfen — Frist bis ${dueLabel} (60 Tage, ` +
        `31 CFR §501.805(c) / 15 CFR §764.5 / 22 CFR §127.12). Caelex bereitet ` +
        `den Entwurf vor; einreichen muss ein Mensch.`,
      actionUrl: `/trade/operations/${args.operationId}`,
      entityType: "trade_operation",
      entityId: args.operationId,
    })),
  });
}
