import "server-only";
import { prisma } from "@/lib/prisma";
import {
  type ComplianceItem,
  type ComplianceItemFilter,
  type ComplianceStatus,
  type Priority,
  type RegulationKey,
  normalizeStatus,
} from "./types";

/**
 * Comply v2 Ontology Fetcher
 *
 * Reads from all 8 `*RequirementStatus` Prisma tables and projects each
 * row into a unified `ComplianceItem`. This is what every V2 surface
 * (Today, Triage, Review-Queue, Lineage) consumes — they never touch
 * the legacy tables directly.
 *
 * Performance notes (Phase 0):
 *  - 8 parallel queries (Promise.all) — each table indexed on
 *    (assessmentId), so per-user lookup hits the index path.
 *  - For an org with ~1000 RequirementStatus rows total, this should
 *    return in <100ms on Neon serverless.
 *  - If we ever exceed ~10k items per user, we'll add a materialized
 *    `ComplianceItemView` table refreshed on RequirementStatus changes.
 *    For now: pure projection, no caching, no materialization.
 *
 * Scope: only consumed from /dashboard/* routes.
 */

/**
 * Compute Today-inbox priority from status + due-date + regulation.
 *
 * Heuristic (Phase 0):
 *  - URGENT: status === EVIDENCE_REQUIRED OR targetDate <= now+7d
 *  - HIGH: targetDate <= now+30d OR (status === DRAFT AND no targetDate)
 *  - MEDIUM: status === UNDER_REVIEW OR PENDING with targetDate
 *  - LOW: ATTESTED, NOT_APPLICABLE, or no signal
 */
function computePriority(
  status: ComplianceStatus,
  targetDate: Date | null,
): Priority {
  const now = Date.now();
  const inDays = (n: number) => now + n * 24 * 60 * 60 * 1000;

  if (status === "EVIDENCE_REQUIRED") return "URGENT";
  if (targetDate && targetDate.getTime() <= inDays(7)) return "URGENT";
  if (targetDate && targetDate.getTime() <= inDays(30)) return "HIGH";
  if (status === "DRAFT") return "HIGH";
  if (status === "UNDER_REVIEW") return "MEDIUM";
  if (status === "PENDING") return "MEDIUM";
  return "LOW";
}

interface BaseRow {
  id: string;
  requirementId: string;
  status: string | null;
  notes: string | null;
  evidenceNotes: string | null;
  updatedAt: Date;
  targetDate?: Date | null;
}

function toItem(
  regulation: RegulationKey,
  userId: string,
  row: BaseRow,
): ComplianceItem {
  const status = normalizeStatus(row.status);
  const targetDate = row.targetDate ?? null;
  return {
    id: `${regulation}:${row.id}`,
    rowId: row.id,
    regulation,
    userId,
    requirementId: row.requirementId,
    status,
    notes: row.notes,
    evidenceNotes: row.evidenceNotes,
    targetDate,
    updatedAt: row.updatedAt,
    priority: computePriority(status, targetDate),
  };
}

/**
 * Fetch every ComplianceItem belonging to the given user, normalized
 * across all 8 regimes. Apply the provided filter; return at most
 * `filter.limit` items (default 200).
 *
 * The query strategy: we run 8 parallel `findMany` calls scoped via
 * the assessment-side relation (`assessment: { userId }`). Each Prisma
 * model has a `userId` on its parent assessment; there's no direct FK
 * from RequirementStatus → User, so we hop through the assessment.
 */
export async function getComplianceItemsForUser(
  userId: string,
  filter: ComplianceItemFilter = {},
): Promise<ComplianceItem[]> {
  const wantsRegulation = (key: RegulationKey) =>
    !filter.regulations || filter.regulations.includes(key);

  const queries: Promise<ComplianceItem[]>[] = [];

  if (wantsRegulation("DEBRIS")) {
    queries.push(
      prisma.debrisRequirementStatus
        .findMany({
          where: { assessment: { userId } },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            requirementId: true,
            status: true,
            notes: true,
            evidenceNotes: true,
            updatedAt: true,
          },
        })
        .then((rows) => rows.map((r) => toItem("DEBRIS", userId, r))),
    );
  }

  if (wantsRegulation("CYBERSECURITY")) {
    queries.push(
      prisma.cybersecurityRequirementStatus
        .findMany({
          where: { assessment: { userId } },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            requirementId: true,
            status: true,
            notes: true,
            evidenceNotes: true,
            targetDate: true,
            updatedAt: true,
          },
        })
        .then((rows) => rows.map((r) => toItem("CYBERSECURITY", userId, r))),
    );
  }

  if (wantsRegulation("NIS2")) {
    queries.push(
      prisma.nIS2RequirementStatus
        .findMany({
          where: { assessment: { userId } },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            requirementId: true,
            status: true,
            notes: true,
            evidenceNotes: true,
            targetDate: true,
            updatedAt: true,
          },
        })
        .then((rows) => rows.map((r) => toItem("NIS2", userId, r))),
    );
  }

  if (wantsRegulation("CRA")) {
    // CRA model doesn't track targetDate (see prisma/schema.prisma).
    queries.push(
      prisma.cRARequirementStatus
        .findMany({
          where: { assessment: { userId } },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            requirementId: true,
            status: true,
            notes: true,
            evidenceNotes: true,
            updatedAt: true,
          },
        })
        .then((rows) => rows.map((r) => toItem("CRA", userId, r))),
    );
  }

  if (wantsRegulation("UK_SPACE_ACT")) {
    queries.push(
      prisma.ukRequirementStatus
        .findMany({
          where: { assessment: { userId } },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            requirementId: true,
            status: true,
            notes: true,
            evidenceNotes: true,
            updatedAt: true,
          },
        })
        .then((rows) => rows.map((r) => toItem("UK_SPACE_ACT", userId, r))),
    );
  }

  if (wantsRegulation("US_REGULATORY")) {
    queries.push(
      prisma.usRequirementStatus
        .findMany({
          where: { assessment: { userId } },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            requirementId: true,
            status: true,
            notes: true,
            evidenceNotes: true,
            updatedAt: true,
          },
        })
        .then((rows) => rows.map((r) => toItem("US_REGULATORY", userId, r))),
    );
  }

  if (wantsRegulation("EXPORT_CONTROL")) {
    queries.push(
      prisma.exportControlRequirementStatus
        .findMany({
          where: { assessment: { userId } },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            requirementId: true,
            status: true,
            notes: true,
            evidenceNotes: true,
            updatedAt: true,
          },
        })
        .then((rows) => rows.map((r) => toItem("EXPORT_CONTROL", userId, r))),
    );
  }

  if (wantsRegulation("SPECTRUM")) {
    queries.push(
      prisma.spectrumRequirementStatus
        .findMany({
          where: { assessment: { userId } },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            requirementId: true,
            status: true,
            notes: true,
            evidenceNotes: true,
            updatedAt: true,
          },
        })
        .then((rows) => rows.map((r) => toItem("SPECTRUM", userId, r))),
    );
  }

  const results = await Promise.all(queries);
  let items = results.flat();

  // Apply post-filter (status, dueWithinDays, search) in memory.
  if (filter.statuses && filter.statuses.length > 0) {
    const set = new Set(filter.statuses);
    items = items.filter((i) => set.has(i.status));
  }

  if (typeof filter.dueWithinDays === "number") {
    const cutoff = Date.now() + filter.dueWithinDays * 24 * 60 * 60 * 1000;
    items = items.filter(
      (i) => i.targetDate !== null && i.targetDate.getTime() <= cutoff,
    );
  }

  if (filter.search && filter.search.trim().length > 0) {
    const needle = filter.search.toLowerCase();
    items = items.filter(
      (i) =>
        i.requirementId.toLowerCase().includes(needle) ||
        i.notes?.toLowerCase().includes(needle) ||
        i.evidenceNotes?.toLowerCase().includes(needle),
    );
  }

  // Default ordering: priority desc, then updatedAt desc.
  const priorityRank: Record<Priority, number> = {
    URGENT: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };
  items.sort((a, b) => {
    const p = priorityRank[a.priority] - priorityRank[b.priority];
    if (p !== 0) return p;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  const limit = filter.limit ?? 200;
  return items.slice(0, limit);
}

/**
 * Fetch a single ComplianceItem by regulation + row ID. Auth-checked
 * via assessment-side userId match. Returns null if not found or
 * not owned by `userId` — defense in depth, never leak another
 * user's items by ID guess.
 *
 * Used by the Per-Item detail page (/dashboard/items/[reg]/[id]).
 */
export async function getComplianceItemById(
  regulation: RegulationKey,
  rowId: string,
  userId: string,
): Promise<ComplianceItem | null> {
  type Row = {
    id: string;
    requirementId: string;
    status: string | null;
    notes: string | null;
    evidenceNotes: string | null;
    updatedAt: Date;
    targetDate?: Date | null;
    assessment: { userId: string };
  };
  let row: Row | null = null;

  switch (regulation) {
    case "DEBRIS":
      row = await prisma.debrisRequirementStatus.findUnique({
        where: { id: rowId },
        select: {
          id: true,
          requirementId: true,
          status: true,
          notes: true,
          evidenceNotes: true,
          updatedAt: true,
          assessment: { select: { userId: true } },
        },
      });
      break;
    case "CYBERSECURITY":
      row = await prisma.cybersecurityRequirementStatus.findUnique({
        where: { id: rowId },
        select: {
          id: true,
          requirementId: true,
          status: true,
          notes: true,
          evidenceNotes: true,
          targetDate: true,
          updatedAt: true,
          assessment: { select: { userId: true } },
        },
      });
      break;
    case "NIS2":
      row = await prisma.nIS2RequirementStatus.findUnique({
        where: { id: rowId },
        select: {
          id: true,
          requirementId: true,
          status: true,
          notes: true,
          evidenceNotes: true,
          targetDate: true,
          updatedAt: true,
          assessment: { select: { userId: true } },
        },
      });
      break;
    case "CRA":
      row = await prisma.cRARequirementStatus.findUnique({
        where: { id: rowId },
        select: {
          id: true,
          requirementId: true,
          status: true,
          notes: true,
          evidenceNotes: true,
          updatedAt: true,
          assessment: { select: { userId: true } },
        },
      });
      break;
    case "UK_SPACE_ACT":
      row = await prisma.ukRequirementStatus.findUnique({
        where: { id: rowId },
        select: {
          id: true,
          requirementId: true,
          status: true,
          notes: true,
          evidenceNotes: true,
          updatedAt: true,
          assessment: { select: { userId: true } },
        },
      });
      break;
    case "US_REGULATORY":
      row = await prisma.usRequirementStatus.findUnique({
        where: { id: rowId },
        select: {
          id: true,
          requirementId: true,
          status: true,
          notes: true,
          evidenceNotes: true,
          updatedAt: true,
          assessment: { select: { userId: true } },
        },
      });
      break;
    case "EXPORT_CONTROL":
      row = await prisma.exportControlRequirementStatus.findUnique({
        where: { id: rowId },
        select: {
          id: true,
          requirementId: true,
          status: true,
          notes: true,
          evidenceNotes: true,
          updatedAt: true,
          assessment: { select: { userId: true } },
        },
      });
      break;
    case "SPECTRUM":
      row = await prisma.spectrumRequirementStatus.findUnique({
        where: { id: rowId },
        select: {
          id: true,
          requirementId: true,
          status: true,
          notes: true,
          evidenceNotes: true,
          updatedAt: true,
          assessment: { select: { userId: true } },
        },
      });
      break;
    default: {
      const exhaustive: never = regulation;
      throw new Error(`Unhandled regulation: ${exhaustive as string}`);
    }
  }

  if (!row || row.assessment.userId !== userId) return null;

  return toItem(regulation, userId, row);
}

/**
 * Fetch the V2 notes timeline for an item (newest first), plus
 * active snooze metadata. Used by the detail page.
 */
export async function getItemDetailExtras(
  itemId: string,
  userId: string,
): Promise<{
  notes: Array<{
    id: string;
    body: string;
    createdAt: Date;
    authorId: string;
    authorEmail: string | null;
    authorName: string | null;
  }>;
  snoozedUntil: Date | null;
  snoozeReason: string | null;
}> {
  const [notes, snooze] = await Promise.all([
    prisma.complianceItemNote.findMany({
      where: { itemId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        body: true,
        createdAt: true,
        userId: true,
        user: { select: { email: true, name: true } },
      },
    }),
    prisma.complianceItemSnooze.findUnique({
      where: { itemId_userId: { itemId, userId } },
      select: { snoozedUntil: true, reason: true },
    }),
  ]);

  return {
    notes: notes.map((n) => ({
      id: n.id,
      body: n.body,
      createdAt: n.createdAt,
      authorId: n.userId,
      authorEmail: n.user.email,
      authorName: n.user.name,
    })),
    snoozedUntil:
      snooze && snooze.snoozedUntil.getTime() > Date.now()
        ? snooze.snoozedUntil
        : null,
    snoozeReason:
      snooze && snooze.snoozedUntil.getTime() > Date.now()
        ? snooze.reason
        : null,
  };
}

/**
 * Look up active snoozes for a user. Returns a Map keyed by
 * cross-regime itemId → Date when the snooze ends. Expired snoozes
 * are filtered at query time.
 */
async function getActiveSnoozes(userId: string): Promise<Map<string, Date>> {
  const rows = await prisma.complianceItemSnooze.findMany({
    where: { userId, snoozedUntil: { gt: new Date() } },
    select: { itemId: true, snoozedUntil: true },
  });
  const map = new Map<string, Date>();
  for (const r of rows) map.set(r.itemId, r.snoozedUntil);
  return map;
}

/**
 * Convenience wrapper for the Today inbox: items that need attention
 * this week, plus snooze metadata so the UI can render snoozed-state
 * pills. Encapsulates the filter so every page renders the same
 * shape.
 *
 * Snoozed items are pulled OUT of `urgent` and `thisWeek` (the user
 * explicitly deferred them) but appear in `watching` so they don't
 * vanish completely — the user can wake them from there.
 */
export async function getTodayInboxForUser(userId: string): Promise<{
  urgent: ComplianceItem[];
  thisWeek: ComplianceItem[];
  watching: ComplianceItem[];
  snoozedUntilByItemId: Record<string, string>;
}> {
  const [all, snoozes] = await Promise.all([
    getComplianceItemsForUser(userId, { limit: 500 }),
    getActiveSnoozes(userId),
  ]);

  const isSnoozed = (id: string) => snoozes.has(id);
  const snoozedUntilByItemId: Record<string, string> = {};
  for (const [id, date] of snoozes) {
    snoozedUntilByItemId[id] = date.toISOString();
  }

  return {
    urgent: all
      .filter((i) => i.priority === "URGENT" && !isSnoozed(i.id))
      .slice(0, 25),
    thisWeek: all
      .filter((i) => i.priority === "HIGH" && !isSnoozed(i.id))
      .slice(0, 25),
    watching: all
      .filter(
        (i) =>
          (i.priority === "MEDIUM" &&
            (i.status === "UNDER_REVIEW" || i.status === "DRAFT")) ||
          isSnoozed(i.id),
      )
      .slice(0, 25),
    snoozedUntilByItemId,
  };
}
