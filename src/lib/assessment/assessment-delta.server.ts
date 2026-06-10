/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Living-tier delta re-assessment + changed-findings diff
 * (plan: docs/superpowers/plans/2026-06-10-ultimate-assessment-rebuild.md, Task 4.3).
 *
 * Three responsibilities:
 *
 *   1. `diffVerdicts(prev, next)` — pure diff of two ObligationMapResults,
 *      keyed by `(cluster, citation, what)` where `citation` is the finding's
 *      primary legal basis (`sources[0].citation`; "" for an INDETERMINATE
 *      finding with no sources). Returns `{ added, removed, changed }`.
 *
 *   2. `affectedQuestions(graph, changedAnswerIds)` — pure walk of the
 *      question graph's `showIf` dependents (transitive fixpoint). This is
 *      the exception-based delta (Vanta pattern, §6b): only the affected
 *      SECTIONS conceptually re-run. The pipeline itself always recomputes
 *      the WHOLE verdict — the delta lives in the DIFF, never in a partial
 *      verdict (a partially recomputed verdict could silently keep stale
 *      findings alive, which honesty invariant 4 forbids).
 *
 *   3. `reassessProfile(profileId, reason)` — runs the REAL verdict pipeline
 *      against the profile's STORED answers, writes a NEW
 *      AssessmentVerdictSnapshot (same shape the quick/full calculate routes
 *      write), and returns the diff vs the previous latest snapshot.
 *
 * HONESTY INVARIANTS (Task 4.3 bullet 5):
 *   - The delta NEVER fabricates: findings whose substance is unchanged are
 *     excluded from the delta entirely. "Substance" is the envelope minus
 *     the `rulebookVersion` stamp and the `whyTrace` answer-label provenance
 *     — a pure rulebook re-stamp (or an answer re-wording that leaves the
 *     obligation identical) is NOT a changed finding.
 *   - The new snapshot IS the verdict: the pipeline result is persisted
 *     verbatim, never merged with the previous snapshot.
 *   - The reason is recorded: the changed-findings notification message
 *     carries the literal reason value ("answer_change" | "rulebook_bump").
 *     No notification is written when nothing changed (a "0 findings
 *     changed" alert would be noise, and the route response still carries
 *     the reason) or when the profile is anonymous (no user to notify).
 *   - Notifications ride the EXISTING `Notification` model — no new
 *     notification infrastructure (Task 4.3 bullet 4).
 *
 * Rulebook staleness: `isVerdictStale(snapshotRulebookVersion)` is the pure
 * helper the result pages (Task 4.4 RulebookStamp banner) use to flag a
 * profile for re-assessment after a rulebook bump.
 */

import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { RULEBOOK } from "@/data/assessment/rulebook";
import type { AssessmentFinding } from "@/lib/assessment/finding";
import type {
  Condition,
  QuestionNode,
} from "@/data/assessment/question-graph-types";
import type { AnswerMap } from "@/lib/assessment/answers";
import {
  runVerdictPipeline,
  type ObligationMapResult,
} from "@/lib/assessment/verdict-pipeline.server";

// ─── Public contract (plan Task 4.3) ─────────────────────────────────────────

export type ReassessReason = "answer_change" | "rulebook_bump";

export interface VerdictDelta {
  added: AssessmentFinding[];
  removed: AssessmentFinding[];
  changed: { before: AssessmentFinding; after: AssessmentFinding }[];
}

/**
 * Pure staleness check for the result pages (Task 4.4): a stored snapshot
 * whose rulebookVersion differs from the CURRENT RULEBOOK.version was
 * computed against a rulebook that has since changed — the profile is
 * flagged for re-assessment.
 */
export function isVerdictStale(snapshotRulebookVersion: string): boolean {
  return snapshotRulebookVersion !== RULEBOOK.version;
}

// ─── Finding collection (defensive against stored-JSON shapes) ───────────────

/**
 * Every finding an ObligationMapResult carries, in result order:
 * scope gates → NIS2 gateway → regime → cluster findings. Defensive against
 * deserialized snapshot JSON (missing arrays on older snapshots never throw).
 */
export function collectFindings(
  result: ObligationMapResult,
): AssessmentFinding[] {
  const out: AssessmentFinding[] = [];
  if (Array.isArray(result?.scope)) out.push(...result.scope);
  if (result?.nis2Gateway) out.push(result.nis2Gateway);
  if (result?.regime) out.push(result.regime);
  const clusters = Array.isArray(result?.clusters) ? result.clusters : [];
  for (const cluster of clusters) {
    if (Array.isArray(cluster?.findings)) out.push(...cluster.findings);
  }
  return out;
}

// ─── Diff (pure) ─────────────────────────────────────────────────────────────

/** Unit separator — cannot collide with citation/what content. */
const KEY_SEP = "␟";

function findingKey(f: AssessmentFinding): string {
  const citation = f.sources?.[0]?.citation ?? "";
  return `${f.cluster}${KEY_SEP}${citation}${KEY_SEP}${f.what}`;
}

/** Deterministic JSON with recursively sorted object keys — stored snapshot
 *  JSON gives no key-order guarantee, so naive stringify would fabricate
 *  "changes" out of key reordering. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
    return `{${entries.join(",")}}`;
  }
  if (value === undefined) return "null";
  return JSON.stringify(value);
}

/**
 * The comparable SUBSTANCE of a finding. Deliberately excluded:
 *   - `rulebookVersion` — a version STAMP; a rulebook bump that re-stamps an
 *     otherwise identical finding is not a changed obligation.
 *   - `whyTrace` — answer-label provenance; a re-worded answer label with an
 *     identical resulting obligation is not a changed obligation.
 * Everything consequential (value payload incl. e.g. jurisdiction fidelity,
 * verdict, confidence band, reasoning, next action, legal sources, flux flag,
 * evidence examples) participates.
 */
function findingSubstance(f: AssessmentFinding): unknown {
  return {
    value: f.value ?? null,
    verdict: f.verdict,
    confidence: f.confidence,
    why: f.why,
    wherefore: f.wherefore,
    sources: (f.sources ?? []).map((s) => ({
      label: s.label,
      citation: s.citation,
      asOf: s.asOf,
      verified: s.verified,
      url: s.url ?? null,
    })),
    fluxFlag: f.fluxFlag ?? null,
    evidenceExamples: f.evidenceExamples ?? null,
  };
}

function groupByKey(
  findings: AssessmentFinding[],
): Map<string, AssessmentFinding[]> {
  const map = new Map<string, AssessmentFinding[]>();
  for (const f of findings) {
    const key = findingKey(f);
    const list = map.get(key);
    if (list) list.push(f);
    else map.set(key, [f]);
  }
  return map;
}

/**
 * Diff two obligation maps, keyed by `(cluster, citation, what)`.
 *
 *   - added:   key present only in `next`
 *   - removed: key present only in `prev`
 *   - changed: key present in both but the finding SUBSTANCE differs
 *              (see findingSubstance — stamps and provenance excluded)
 *
 * Findings with identical substance are excluded from the delta entirely
 * (honesty: the delta never fabricates). Duplicate keys within one result are
 * paired positionally; leftovers become added/removed — a finding is never
 * silently dropped from the diff.
 */
export function diffVerdicts(
  prev: ObligationMapResult,
  next: ObligationMapResult,
): VerdictDelta {
  const prevByKey = groupByKey(collectFindings(prev));
  const nextByKey = groupByKey(collectFindings(next));

  const added: AssessmentFinding[] = [];
  const removed: AssessmentFinding[] = [];
  const changed: { before: AssessmentFinding; after: AssessmentFinding }[] = [];

  const keys = new Set([...prevByKey.keys(), ...nextByKey.keys()]);
  for (const key of keys) {
    const before = prevByKey.get(key) ?? [];
    const after = nextByKey.get(key) ?? [];
    const paired = Math.min(before.length, after.length);
    for (let i = 0; i < paired; i++) {
      const beforeSubstance = stableStringify(findingSubstance(before[i]));
      const afterSubstance = stableStringify(findingSubstance(after[i]));
      if (beforeSubstance !== afterSubstance) {
        changed.push({ before: before[i], after: after[i] });
      }
      // identical substance → excluded from the delta entirely (invariant 5)
    }
    removed.push(...before.slice(paired));
    added.push(...after.slice(paired));
  }

  return { added, removed, changed };
}

// ─── Affected-question walk (pure — exception-based delta, §6b) ──────────────

function conditionRefs(condition: Condition): string[] {
  if ("all" in condition) return condition.all.flatMap(conditionRefs);
  if ("any" in condition) return condition.any.flatMap(conditionRefs);
  if ("not" in condition) return conditionRefs(condition.not);
  return [condition.q];
}

/**
 * The question ids AFFECTED by a set of changed answers: the changed
 * questions themselves plus every question whose `showIf` references an
 * affected question, transitively (fixpoint — a visibility flip can cascade).
 *
 * Returned in graph order; ids not present in the graph influence the walk
 * (their dependents are affected) but never appear in the output.
 */
export function affectedQuestions(
  graph: readonly QuestionNode[],
  changedAnswerIds: string[],
): string[] {
  const affected = new Set(changedAnswerIds);
  let grew = true;
  while (grew) {
    grew = false;
    for (const node of graph) {
      if (affected.has(node.id) || !node.showIf) continue;
      if (conditionRefs(node.showIf).some((q) => affected.has(q))) {
        affected.add(node.id);
        grew = true;
      }
    }
  }
  return graph.filter((n) => affected.has(n.id)).map((n) => n.id);
}

// ─── Changed-findings message (plan format: "N findings changed") ────────────

/**
 * The notification message — plan-pinned format `"N findings changed"`,
 * with the per-bucket counts and the literal reason recorded (honesty:
 * the reason is recorded on the notification).
 */
export function formatDeltaMessage(
  delta: VerdictDelta,
  reason: ReassessReason,
): string {
  const total =
    delta.added.length + delta.removed.length + delta.changed.length;
  return `${total} findings changed (${delta.added.length} added, ${delta.removed.length} removed, ${delta.changed.length} changed) — reason: ${reason}`;
}

// ─── Re-assessment (the REAL pipeline; a new snapshot IS the verdict) ────────

/**
 * Re-assess a profile against its STORED answers:
 *
 *   1. Load the profile (throws when missing — never a silent no-op).
 *   2. Run the REAL verdict pipeline (`runVerdictPipeline`) at the profile's
 *      stored tier. SubmissionInvalidError / ContradictionError propagate to
 *      the caller — a partial or contradictory answer set is never a verdict
 *      (honesty invariant 3), and no snapshot is written on that path.
 *   3. Persist a NEW AssessmentVerdictSnapshot — the same shape the
 *      quick/full calculate routes write — with the pipeline result
 *      verbatim (the snapshot IS the verdict; no merging).
 *   4. Diff vs the previous latest snapshot. With no previous snapshot,
 *      every finding is `added` (a first verdict is all-new — nothing is
 *      fabricated as "changed").
 *   5. When findings changed and the profile belongs to a user, write one
 *      row through the EXISTING Notification model ("N findings changed",
 *      reason recorded). A notification failure is logged and does NOT fail
 *      the re-assessment — the verdict snapshot is already persisted.
 */
export async function reassessProfile(
  profileId: string,
  reason: ReassessReason,
): Promise<{ snapshotId: string; delta: VerdictDelta }> {
  const profile = await prisma.operatorAssessmentProfile.findUnique({
    where: { id: profileId },
  });
  if (!profile) {
    throw new Error(`reassessProfile: profile not found: ${profileId}`);
  }

  const previous = await prisma.assessmentVerdictSnapshot.findFirst({
    where: { profileId: profile.id },
    orderBy: { createdAt: "desc" },
  });

  // Stored-tier mapping (DB enum → pipeline tier). The diff must be
  // apples-to-apples with the previous snapshot of the same profile.
  const tier =
    profile.tier === "QUICK" ? ("quick" as const) : ("full" as const);
  const answers = (profile.answers ?? {}) as AnswerMap;

  // The REAL pipeline — validation/contradiction errors propagate (never a verdict).
  const result = await runVerdictPipeline({ answers, tier });

  // Same snapshot shape the quick/full calculate routes write.
  const snapshot = await prisma.assessmentVerdictSnapshot.create({
    data: {
      profileId: profile.id,
      profileVersion: profile.version,
      tier: profile.tier,
      rulebookVersion: result.rulebookVersion,
      result: result as unknown as Prisma.InputJsonValue,
      unknownsCount: result.unknowns.length,
    },
  });

  const delta: VerdictDelta = previous
    ? diffVerdicts(previous.result as unknown as ObligationMapResult, result)
    : { added: collectFindings(result), removed: [], changed: [] };

  const totalChanges =
    delta.added.length + delta.removed.length + delta.changed.length;

  if (profile.userId && totalChanges > 0) {
    try {
      await prisma.notification.create({
        data: {
          userId: profile.userId,
          organizationId: profile.organizationId,
          type: "COMPLIANCE_UPDATED",
          title: "Assessment findings changed",
          message: formatDeltaMessage(delta, reason),
          actionUrl: "/assessment/full/results",
          entityType: "assessment-profile",
          entityId: profile.id,
        },
      });
    } catch (error) {
      // The snapshot (the verdict) is already persisted — the notification is
      // best-effort and its failure must not turn a real verdict into a 500.
      logger.warn("reassess changed-findings notification write failed", {
        profileId: profile.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { snapshotId: snapshot.id, delta };
}
