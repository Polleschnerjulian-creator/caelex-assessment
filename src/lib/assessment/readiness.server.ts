/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Readiness bands — Ultimate Assessment rebuild (Task 3.2).
 *
 * Aggregates the Q6.6 cybersecurity battery and the Q7.x debris/environment
 * statuses into PER-CLUSTER evidence bands ({ evidenced: n, total: m } style).
 *
 * HONESTY INVARIANT 6 (founder §11.3): this module exports NO single overall
 * number — readiness is per-cluster, N-of-M, never a "compliance score". The
 * result page and PDF render bands; nothing here can be summed into a headline
 * percentage without deliberately writing new code (and the result-page DOM
 * test forbids rendering one).
 *
 * Battery answer encoding (owned here + by the full-tier wizard, evaluator is
 * deliberately shape-agnostic): the q6_6_battery answer value is an array of
 * `"<itemId>:<status>"` strings. The 4-state evidence scale is
 * evidenced | partial | undocumented | missing, plus the per-item "unsure"
 * status (the node's unsureMode is "none" — uncertainty lives PER ITEM).
 * An unsure item counts as a GAP here AND is emitted into the pipeline's
 * unknowns list at wiring time (§5 stage 5 — unknown rounds up, invariant 2).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import type { ClusterId } from "@/lib/assessment/finding";
import { answeredValue, type AnswerMap } from "@/lib/assessment/answers";

// ─── Contract (plan Task 3.2) ────────────────────────────────────────────────

export interface ClusterReadiness {
  clusterId: ClusterId;
  evidenced: number;
  undocumented: number;
  partial: number;
  missing: number;
  unsure: number;
  total: number;
}

/** The battery's 4-state evidence scale + per-item unsure. */
export type BatteryStatus =
  | "evidenced"
  | "partial"
  | "undocumented"
  | "missing"
  | "unsure";

const BATTERY_STATUSES: ReadonlySet<string> = new Set([
  "evidenced",
  "partial",
  "undocumented",
  "missing",
  "unsure",
]);

const Q_BATTERY = "q6_6_battery";
const Q_DEBRIS_PLAN = "q7_1_debris_plan"; // approved | drafted | none
const Q_PASSIVATION = "q7_2_passivation"; // yes | no
const Q_ENV_DATA = "q7_3_env_data"; // yes | partially | no
const Q_AEE = "q7_4_aee"; // yes | no (UK launch-site only)

/** Parse `"<itemId>:<status>"` battery entries; malformed entries are ignored
 *  (the wizard cannot produce them; a crafted payload gains nothing — an
 *  ignored entry can only LOWER evidenced counts, never raise them). */
export function parseBatteryEntries(
  value: unknown,
): { itemId: string; status: BatteryStatus }[] {
  if (!Array.isArray(value)) return [];
  const out: { itemId: string; status: BatteryStatus }[] = [];
  for (const raw of value) {
    if (typeof raw !== "string") continue;
    const sep = raw.lastIndexOf(":");
    if (sep <= 0 || sep === raw.length - 1) continue;
    const itemId = raw.slice(0, sep);
    const status = raw.slice(sep + 1);
    if (!BATTERY_STATUSES.has(status)) continue;
    out.push({ itemId, status: status as BatteryStatus });
  }
  return out;
}

function emptyBand(clusterId: ClusterId): ClusterReadiness {
  return {
    clusterId,
    evidenced: 0,
    undocumented: 0,
    partial: 0,
    missing: 0,
    unsure: 0,
    total: 0,
  };
}

function bump(band: ClusterReadiness, status: BatteryStatus): void {
  band[status] += 1;
  band.total += 1;
}

/** Map a single-choice debris/environment answer onto the evidence scale.
 *  An explicit {state:"unsure"} answer (answeredValue → undefined while the
 *  tri-state is "unsure") is handled by the caller via `unsureOf`. */
function statusFromChoice(
  value: unknown,
  mapping: Record<string, BatteryStatus>,
): BatteryStatus | null {
  if (typeof value !== "string") return null;
  return mapping[value] ?? null;
}

function isUnsure(answers: AnswerMap, id: string): boolean {
  const a = answers[id];
  return a !== undefined && a.state === "unsure";
}

/**
 * Per-cluster readiness bands from the answers. Only clusters present in
 * `clusterIds` are returned (the pipeline passes the clusters it actually
 * built, so readiness never claims a cluster the verdict does not carry).
 * Questions that are `not_asked` (hidden branch / other tier) contribute
 * NOTHING — unasked is not a gap (it is not evidence either).
 */
export function computeReadiness(
  answers: AnswerMap,
  clusterIds: readonly ClusterId[],
): ClusterReadiness[] {
  const wanted = new Set<ClusterId>(clusterIds);
  const bands = new Map<ClusterId, ClusterReadiness>();
  const band = (id: ClusterId): ClusterReadiness => {
    let b = bands.get(id);
    if (!b) {
      b = emptyBand(id);
      bands.set(id, b);
    }
    return b;
  };

  // ── resilience_cyber ← the Q6.6 battery ──
  if (wanted.has("resilience_cyber")) {
    const entries = parseBatteryEntries(answeredValue(answers, Q_BATTERY));
    for (const e of entries) bump(band("resilience_cyber"), e.status);
  }

  // ── debris_safety ← Q7.1 (plan status) + Q7.2 (passivation) ──
  if (wanted.has("debris_safety")) {
    const plan = statusFromChoice(answeredValue(answers, Q_DEBRIS_PLAN), {
      approved: "evidenced",
      drafted: "partial",
      none: "missing",
    });
    if (plan) bump(band("debris_safety"), plan);
    else if (isUnsure(answers, Q_DEBRIS_PLAN))
      bump(band("debris_safety"), "unsure");

    const passivation = statusFromChoice(
      answeredValue(answers, Q_PASSIVATION),
      { yes: "evidenced", no: "missing" },
    );
    if (passivation) bump(band("debris_safety"), passivation);
    else if (isUnsure(answers, Q_PASSIVATION))
      bump(band("debris_safety"), "unsure");
  }

  // ── environment ← Q7.3 (lifecycle env data) + Q7.4 (AEE, when asked) ──
  if (wanted.has("environment")) {
    const envData = statusFromChoice(answeredValue(answers, Q_ENV_DATA), {
      yes: "evidenced",
      partially: "partial",
      no: "missing",
    });
    if (envData) bump(band("environment"), envData);
    else if (isUnsure(answers, Q_ENV_DATA)) bump(band("environment"), "unsure");

    const aee = statusFromChoice(answeredValue(answers, Q_AEE), {
      yes: "evidenced",
      no: "missing",
    });
    if (aee) bump(band("environment"), aee);
    else if (isUnsure(answers, Q_AEE)) bump(band("environment"), "unsure");
  }

  // Stable order: follow the caller's cluster order; only non-empty bands.
  const out: ClusterReadiness[] = [];
  for (const id of clusterIds) {
    const b = bands.get(id);
    if (b && b.total > 0) out.push(b);
  }
  return out;
}

/** The question ids whose per-item/answer "unsure" states the pipeline must
 *  ALSO surface in the unknowns list (§5 stage 5 — gap AND unknown). */
export function readinessUnsureQuestionIds(answers: AnswerMap): string[] {
  const ids: string[] = [];
  const entries = parseBatteryEntries(answeredValue(answers, Q_BATTERY));
  if (entries.some((e) => e.status === "unsure")) ids.push(Q_BATTERY);
  for (const q of [Q_DEBRIS_PLAN, Q_PASSIVATION, Q_ENV_DATA, Q_AEE]) {
    if (isUnsure(answers, q)) ids.push(q);
  }
  return ids;
}
