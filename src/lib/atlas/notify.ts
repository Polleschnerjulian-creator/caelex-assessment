import "server-only";
import { prisma } from "@/lib/prisma";
import { AtlasAlertTargetType, AtlasNotificationKind } from "@prisma/client";
import { getLegalSourceById } from "@/data/legal-sources";
import { logger } from "@/lib/logger";

/**
 * Atlas alerts — dispatch helpers.
 *
 * Called from admin-side flows (amendment approval, AtlasUpdate
 * publish) when something has happened that subscribers asked to be
 * notified about. The helpers fan out a row per subscriber into
 * AtlasNotification; the UI at /atlas/alerts reads directly from
 * that table.
 *
 * Design notes:
 *
 * 1. Fan-out at write time.
 *    We denormalise: when 1 source is amended and 100 users are
 *    subscribed, we write 100 AtlasNotification rows. The
 *    alternative — storing 1 event and joining to subscriptions at
 *    read time — would make the unread-count query O(total-events ×
 *    subscriptions) per user. The write-time fan-out makes
 *    unread-count a cheap indexed lookup. Worth the 100x storage
 *    amplification because notifications are small text rows and
 *    get pruned after ~90 days.
 *
 * 2. Deduplication of subscribers.
 *    A user subscribed to both a specific source AND its containing
 *    jurisdiction would otherwise receive two notifications for the
 *    same amendment. We dedupe on userId before writing.
 *
 * 3. Non-blocking by convention.
 *    Callers invoke these helpers via `void dispatch...()` — a
 *    dispatch failure never blocks the admin-side action that
 *    triggered it. The helpers log warnings on failure so ops can
 *    investigate, but the amendment approval / update publish is
 *    considered complete regardless.
 */

/** Subscribers who should receive a notification, deduplicated. */
interface Subscriber {
  userId: string;
  organizationId: string;
}

/**
 * Enumerate subscribers interested in changes to a given source.
 * Union of: direct subscribers to the source + subscribers to its
 * jurisdiction. Dedupes on userId (same user subscribed to both
 * gets one notification, not two).
 */
async function subscribersForSource(sourceId: string): Promise<Subscriber[]> {
  const source = getLegalSourceById(sourceId);
  const jurisdiction = source?.jurisdiction;

  const subs = await prisma.atlasAlertSubscription.findMany({
    where: {
      OR: [
        { targetType: AtlasAlertTargetType.SOURCE, targetId: sourceId },
        ...(jurisdiction
          ? [
              {
                targetType: AtlasAlertTargetType.JURISDICTION,
                targetId: jurisdiction,
              },
            ]
          : []),
      ],
    },
    select: { userId: true, organizationId: true },
  });

  // Dedupe on userId. A single user subscribed to both SOURCE + its
  // JURISDICTION should receive exactly one notification for a
  // source amendment, not two.
  const seen = new Set<string>();
  const out: Subscriber[] = [];
  for (const s of subs) {
    if (seen.has(s.userId)) continue;
    seen.add(s.userId);
    out.push(s);
  }
  return out;
}

/**
 * Enumerate subscribers interested in any update for a given
 * jurisdiction. Used when an admin publishes a JURISDICTION-scoped
 * AtlasUpdate. No source-level fan-in here — a jurisdiction update
 * that isn't tied to a specific source only reaches
 * jurisdiction-level subscribers.
 */
async function subscribersForJurisdiction(
  jurisdiction: string,
): Promise<Subscriber[]> {
  const subs = await prisma.atlasAlertSubscription.findMany({
    where: {
      targetType: AtlasAlertTargetType.JURISDICTION,
      targetId: jurisdiction,
    },
    select: { userId: true, organizationId: true },
  });
  // No dedupe needed — unique key on (userId, targetType, targetId)
  // already prevents duplicates at this fan-in level.
  return subs;
}

/**
 * Fan out a SOURCE_AMENDED notification to every subscriber of the
 * given source OR its containing jurisdiction. Called from the
 * admin amendment-approval PATCH in /api/admin/atlas-updates.
 *
 * sourceId  : the source that was amended (AtlasSourceCheck.sourceId)
 * title     : short headline for the notification list
 * summary   : 1-3 sentences describing what changed
 */
export async function dispatchSourceAmendment(params: {
  sourceId: string;
  title: string;
  summary: string;
}): Promise<{ recipientCount: number }> {
  try {
    const subscribers = await subscribersForSource(params.sourceId);
    if (subscribers.length === 0) {
      return { recipientCount: 0 };
    }

    const source = getLegalSourceById(params.sourceId);
    const targetType = "SOURCE";

    await prisma.atlasNotification.createMany({
      data: subscribers.map((sub) => ({
        userId: sub.userId,
        organizationId: sub.organizationId,
        kind: AtlasNotificationKind.SOURCE_AMENDED,
        title: params.title,
        summary: params.summary,
        targetType,
        targetId: params.sourceId,
        sourceId: params.sourceId,
      })),
      skipDuplicates: false,
    });

    logger.info("Atlas notification fan-out complete", {
      kind: "SOURCE_AMENDED",
      sourceId: params.sourceId,
      jurisdiction: source?.jurisdiction,
      recipients: subscribers.length,
    });

    return { recipientCount: subscribers.length };
  } catch (err) {
    logger.warn("Atlas notification dispatch failed (non-blocking)", {
      kind: "SOURCE_AMENDED",
      sourceId: params.sourceId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { recipientCount: 0 };
  }
}

/**
 * Fan out a JURISDICTION_UPDATE notification to subscribers of the
 * given jurisdiction. Called when an admin publishes an AtlasUpdate
 * scoped to a specific jurisdiction.
 */
export async function dispatchJurisdictionUpdate(params: {
  jurisdiction: string;
  sourceId?: string | null;
  title: string;
  summary: string;
}): Promise<{ recipientCount: number }> {
  try {
    const subscribers = await subscribersForJurisdiction(params.jurisdiction);
    if (subscribers.length === 0) {
      return { recipientCount: 0 };
    }

    await prisma.atlasNotification.createMany({
      data: subscribers.map((sub) => ({
        userId: sub.userId,
        organizationId: sub.organizationId,
        kind: AtlasNotificationKind.JURISDICTION_UPDATE,
        title: params.title,
        summary: params.summary,
        targetType: "JURISDICTION",
        targetId: params.jurisdiction,
        sourceId: params.sourceId ?? null,
      })),
      skipDuplicates: false,
    });

    logger.info("Atlas notification fan-out complete", {
      kind: "JURISDICTION_UPDATE",
      jurisdiction: params.jurisdiction,
      recipients: subscribers.length,
    });

    return { recipientCount: subscribers.length };
  } catch (err) {
    logger.warn("Atlas notification dispatch failed (non-blocking)", {
      kind: "JURISDICTION_UPDATE",
      jurisdiction: params.jurisdiction,
      error: err instanceof Error ? err.message : String(err),
    });
    return { recipientCount: 0 };
  }
}
