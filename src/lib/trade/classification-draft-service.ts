/**
 * Caelex Trade — Classification Draft Service (Sprint Z4c).
 *
 * CRUD layer around `TradeItemClassificationDraft`. The Z4d UI calls
 * this from server actions; the Astra `classify_from_datasheet` tool
 * does NOT persist (it only returns the draft) so the operator
 * preview-then-save flow stays explicit.
 *
 * Architecture:
 *   - Pure functions that take an `OrgScope` (organizationId +
 *     userId) and return Prisma-shaped rows. The org gate is the
 *     load-bearing security boundary — every query is scoped.
 *   - `createDraft` persists the JSON proposal blob *unmodified* so
 *     the audit trail tells the operator exactly what was generated.
 *     The accepted snapshot (with operator edits) lands in
 *     `acceptedSnapshot` only when the decision is ACCEPTED or
 *     MODIFIED.
 *   - The service intentionally does NOT mutate the parent
 *     `TradeItem` row when a draft is accepted — that's a separate
 *     concern handled by the Z4d UI server action, which knows
 *     whether the operator wants the proposal to propagate to the
 *     item's eccnEU / eccnUS / usmlCategory cells.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import { Prisma } from "@prisma/client";
import type {
  ClassificationDraftDecision,
  TradeItemClassificationDraft,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type { ClassificationDraft } from "./classification-draft-builder";

// ─── Public input/output types ──────────────────────────────────────

export interface DraftOrgScope {
  organizationId: string;
  userId: string;
}

export interface CreateDraftInput {
  /** Optional FK to the TradeItem the draft applies to. */
  tradeItemId?: string | null;
  /** Pure-function output from `buildClassificationDraft`. */
  draft: ClassificationDraft;
  /** Original filename when the source was a PDF upload. */
  sourceFilename?: string | null;
  /** Optional raw extracted text (capped to 64 kB). */
  rawTextSnapshot?: string | null;
}

export interface RecordDecisionInput {
  draftId: string;
  decision: Exclude<ClassificationDraftDecision, "PENDING">;
  reviewNote?: string | null;
  /**
   * The (possibly modified) accepted proposal snapshot. Required when
   * decision is ACCEPTED or MODIFIED; ignored when REJECTED.
   */
  acceptedSnapshot?: ClassificationDraft["primary"] | null;
}

// Cap raw text snapshots to 64 kB to keep the row small while still
// being useful for the audit trail. Anything bigger is almost
// certainly an entire vendor catalogue rather than a single
// datasheet.
export const RAW_TEXT_SNAPSHOT_CAP = 64 * 1024;

// ─── Mutations ──────────────────────────────────────────────────────

/**
 * Persist a fresh AI-generated draft. Always lands in PENDING state.
 * Caller is responsible for having computed the draft via the Z4b
 * `buildClassificationDraft` pipeline.
 */
export async function createDraft(
  scope: DraftOrgScope,
  input: CreateDraftInput,
): Promise<TradeItemClassificationDraft> {
  // If a tradeItemId is provided, verify it belongs to the org. We
  // can't trust the caller — this is the security boundary that keeps
  // cross-org reads from being trivial via API replay.
  if (input.tradeItemId) {
    const exists = await prisma.tradeItem.findFirst({
      where: {
        id: input.tradeItemId,
        organizationId: scope.organizationId,
      },
      select: { id: true },
    });
    if (!exists) {
      throw new Error(
        `TradeItem ${input.tradeItemId} not found in organization ${scope.organizationId}.`,
      );
    }
  }

  const truncatedRaw = truncateRawText(input.rawTextSnapshot ?? null);

  return prisma.tradeItemClassificationDraft.create({
    data: {
      organizationId: scope.organizationId,
      tradeItemId: input.tradeItemId ?? null,
      createdById: scope.userId,
      proposedEccn: input.draft.primary?.canonicalId ?? null,
      proposedRegime: input.draft.primary?.regime ?? null,
      confidence: input.draft.primary?.confidence ?? null,
      evidence: serialiseDraft(input.draft),
      sourceFilename: input.sourceFilename ?? null,
      rawTextSnapshot: truncatedRaw,
      decision: "PENDING",
      disclaimerAtReview: null,
      acceptedSnapshot: Prisma.JsonNull,
    },
  });
}

/**
 * Record an operator decision on a draft. Stamps the reviewer, the
 * timestamp, the disclaimer text that was visible at review (for
 * evidentiary value if the disclaimer wording later changes), and
 * the accepted snapshot when relevant.
 */
export async function recordDecision(
  scope: DraftOrgScope,
  input: RecordDecisionInput,
): Promise<TradeItemClassificationDraft> {
  // Fetch + scope-guard. We can't update by id alone because that
  // would let a caller in org A flip a draft owned by org B.
  const existing = await prisma.tradeItemClassificationDraft.findFirst({
    where: {
      id: input.draftId,
      organizationId: scope.organizationId,
    },
    select: { id: true, decision: true, evidence: true },
  });
  if (!existing) {
    throw new Error(
      `Classification draft ${input.draftId} not found in organization ${scope.organizationId}.`,
    );
  }
  if (existing.decision !== "PENDING") {
    throw new Error(
      `Draft ${input.draftId} already has a recorded decision (${existing.decision}). Reviews are immutable.`,
    );
  }

  // Carry the disclaimer from the persisted draft payload so the
  // record reflects what the operator actually saw.
  const disclaimerAtReview = extractDisclaimer(existing.evidence);

  const acceptedSnapshot =
    input.decision === "ACCEPTED" || input.decision === "MODIFIED"
      ? ((input.acceptedSnapshot as Prisma.InputJsonValue | null) ??
        Prisma.JsonNull)
      : Prisma.JsonNull;

  return prisma.tradeItemClassificationDraft.update({
    where: { id: input.draftId },
    data: {
      decision: input.decision,
      reviewedById: scope.userId,
      reviewedAt: new Date(),
      reviewNote: input.reviewNote ?? null,
      disclaimerAtReview,
      acceptedSnapshot,
    },
  });
}

// ─── Queries ────────────────────────────────────────────────────────

/**
 * List drafts for an org. Defaults to the most-recent-first ordering
 * the Z4d UI uses; callers can override with `take` for pagination.
 */
export async function listDrafts(
  scope: DraftOrgScope,
  options: {
    decision?: ClassificationDraftDecision;
    tradeItemId?: string;
    take?: number;
  } = {},
): Promise<TradeItemClassificationDraft[]> {
  return prisma.tradeItemClassificationDraft.findMany({
    where: {
      organizationId: scope.organizationId,
      ...(options.decision ? { decision: options.decision } : {}),
      ...(options.tradeItemId ? { tradeItemId: options.tradeItemId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: options.take ?? 50,
  });
}

/**
 * Load a single draft (org-scoped). Returns `null` when the draft
 * doesn't exist or belongs to another org — callers should NOT
 * surface the distinction.
 */
export async function getDraft(
  scope: DraftOrgScope,
  draftId: string,
): Promise<TradeItemClassificationDraft | null> {
  return prisma.tradeItemClassificationDraft.findFirst({
    where: {
      id: draftId,
      organizationId: scope.organizationId,
    },
  });
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Best-effort JSON serialisation of a `ClassificationDraft`. The
 * builder's output is plain data (no Date / Map / Set) so a straight
 * structured clone via JSON round-trip is safe.
 */
function serialiseDraft(draft: ClassificationDraft): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(draft)) as Prisma.InputJsonValue;
}

/**
 * Pull the disclaimer text from a persisted draft JSON blob. We have
 * to be defensive — the JSON shape is owned by the application
 * layer, so future versions might rename or move the field.
 */
function extractDisclaimer(evidence: Prisma.JsonValue): string | null {
  if (
    evidence &&
    typeof evidence === "object" &&
    !Array.isArray(evidence) &&
    "disclaimer" in evidence &&
    typeof (evidence as { disclaimer: unknown }).disclaimer === "string"
  ) {
    return (evidence as { disclaimer: string }).disclaimer;
  }
  return null;
}

/**
 * Truncate a raw-text snapshot to `RAW_TEXT_SNAPSHOT_CAP` bytes,
 * counted using UTF-16 code units. Strict-cap semantics: returns
 * null on null input, the unmodified string when already short
 * enough, and a `[truncated]` suffix otherwise.
 */
export function truncateRawText(input: string | null): string | null {
  if (input === null) return null;
  if (input.length <= RAW_TEXT_SNAPSHOT_CAP) return input;
  return `${input.slice(0, RAW_TEXT_SNAPSHOT_CAP - 13)}…[truncated]`;
}
