/**
 * workflow-queue — ranks applicable controls into an orchestrated
 * "today's focus" queue. Pure function, deterministic, no DB.
 *
 * Ranking priorities (highest first):
 *   1. Status == "not_assessed" before anything else — the operator
 *      can't even have an opinion on these yet.
 *   2. Within not-assessed: severity critical > major > minor.
 *   3. Then partial + non_compliant controls, ranked by severity.
 *   4. Compliant controls go to the bottom (they're "done").
 *   5. Stable tiebreaker: the requirement id (deterministic order).
 *
 * The queue also surfaces "blocked" items — controls marked partial /
 * non_compliant where the operator has some context set. Interpreted
 * as "waiting on evidence" by the UI.
 *
 * Estimated time: each severity has a rough hours-of-work estimate
 * (critical=2h, major=1h, minor=0.5h) — the queue sums the top N
 * items so the header can read "~2h today".
 */

import type {
  CybersecurityRequirement,
  RequirementStatus,
} from "@/data/cybersecurity-requirements";

// ─── Types ──────────────────────────────────────────────────────────────

export interface QueueItem {
  req: CybersecurityRequirement;
  status: RequirementStatus;
  score: number;
}

export interface WorkflowQueue {
  /** Top N items the operator should focus on right now. */
  focus: QueueItem[];
  /** Items waiting on evidence / 3rd-party action. */
  blocked: QueueItem[];
  /** All items ordered by priority (incl. already-compliant). */
  all: QueueItem[];
  /** Estimated hours to complete `focus`. */
  estimatedHoursToday: number;
  /** Aggregate counts for the progress strip. */
  counts: {
    total: number;
    compliant: number;
    partial: number;
    nonCompliant: number;
    notAssessed: number;
    criticalOpen: number;
  };
}

// ─── Scoring ────────────────────────────────────────────────────────────

const STATUS_PRIORITY: Record<RequirementStatus, number> = {
  not_assessed: 100,
  non_compliant: 80,
  partial: 60,
  compliant: 0,
};

const SEVERITY_WEIGHT: Record<"critical" | "major" | "minor", number> = {
  critical: 30,
  major: 20,
  minor: 10,
};

const SEVERITY_HOURS: Record<"critical" | "major" | "minor", number> = {
  critical: 2,
  major: 1,
  minor: 0.5,
};

function scoreItem(
  req: CybersecurityRequirement,
  status: RequirementStatus,
): number {
  const statusBase = STATUS_PRIORITY[status] ?? 0;
  const severityBoost = SEVERITY_WEIGHT[req.severity] ?? 0;
  return statusBase + severityBoost;
}

// ─── Public API ────────────────────────────────────────────────────────

/**
 * Build a workflow queue for the current set of applicable requirements
 * + their statuses.
 *
 * @param requirements  The already-filtered (profile-applicable) list.
 * @param statusLookup  Map of requirement.id → current RequirementStatus.
 *                      Missing entries default to "not_assessed".
 * @param focusSize     How many items to surface as "today's focus".
 *                      Default 3 — matches the visual hero slot.
 */
export function buildWorkflowQueue(args: {
  requirements: CybersecurityRequirement[];
  statusLookup: Record<string, RequirementStatus>;
  focusSize?: number;
}): WorkflowQueue {
  const { requirements, statusLookup, focusSize = 3 } = args;

  const items: QueueItem[] = requirements.map((req) => {
    const status: RequirementStatus = statusLookup[req.id] ?? "not_assessed";
    return {
      req,
      status,
      score: scoreItem(req, status),
    };
  });

  // Sort descending by score; stable tiebreaker by requirement id.
  items.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.req.id.localeCompare(b.req.id);
  });

  const focus = items
    .filter((i) => i.status === "not_assessed" || i.status === "non_compliant")
    .slice(0, focusSize);

  const blocked = items.filter((i) => i.status === "partial");

  const counts = {
    total: items.length,
    compliant: items.filter((i) => i.status === "compliant").length,
    partial: items.filter((i) => i.status === "partial").length,
    nonCompliant: items.filter((i) => i.status === "non_compliant").length,
    notAssessed: items.filter((i) => i.status === "not_assessed").length,
    criticalOpen: items.filter(
      (i) => i.req.severity === "critical" && i.status !== "compliant",
    ).length,
  };

  const estimatedHoursToday = focus.reduce(
    (sum, item) => sum + (SEVERITY_HOURS[item.req.severity] ?? 0.5),
    0,
  );

  return {
    focus,
    blocked,
    all: items,
    estimatedHoursToday,
    counts,
  };
}

/**
 * One-liner describing the queue state — feeds the header subtitle.
 *   - "All 15 controls compliant." (best)
 *   - "12 of 15 assessed · 3 critical open"
 *   - "Nothing started yet · 4 critical to assess"
 */
export function describeQueueState(queue: WorkflowQueue): string {
  const { counts } = queue;
  if (counts.total === 0) return "No controls apply to your profile yet.";
  if (counts.compliant === counts.total) {
    return `All ${counts.total} controls compliant — nothing to do today.`;
  }
  if (counts.notAssessed === counts.total) {
    return `Nothing started yet · ${counts.criticalOpen} critical to assess`;
  }
  const assessed = counts.total - counts.notAssessed;
  const criticalTail =
    counts.criticalOpen > 0 ? ` · ${counts.criticalOpen} critical open` : "";
  return `${assessed} of ${counts.total} assessed${criticalTail}`;
}
