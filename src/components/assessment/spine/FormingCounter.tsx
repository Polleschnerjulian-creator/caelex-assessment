"use client";

/**
 * FormingCounter — the TurboTax live-outcome pattern (spec §6; plan Task 2.3):
 * "obligations identified so far: N", updating at section boundaries.
 *
 * HONESTY CONTRACT (binding): the count is sourced EXCLUSIVELY from interim
 * quick-calculate responses computed by the server-side verdict pipeline —
 * never invented client-side. When no server-confirmed count exists (interim
 * call failed, was rate-limited, or rejected an incomplete submission with a
 * 422), the counter renders NOTHING rather than a fabricated number.
 *
 * `extractFormingCount` reads the quick projection's per-cluster counts and
 * sums the obligation verdicts (applicable + conditional + contested).
 * Advisories are deliberately excluded — they are advisories, not identified
 * obligations. There is NO overall score here and never will be (honesty
 * invariant 6): this is a count of findings, not a 0–100 aggregate.
 */

import { motion } from "framer-motion";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonNegativeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

/**
 * Extract the obligation count from a quick-calculate response payload.
 *
 * Tolerates both the bare quick projection and a `{ result: ... }` envelope,
 * and clusters shaped either `{ counts: { applicable, conditional, contested } }`
 * (the ObligationMapResult/projection cluster shape) or flat count objects.
 * Returns null when the payload carries no parseable server-computed counts —
 * the caller must then leave the counter unchanged (never invent).
 */
export function extractFormingCount(payload: unknown): number | null {
  if (!isRecord(payload)) return null;
  const root = isRecord(payload.result) ? payload.result : payload;
  const clusters = root["clusters"];
  if (!Array.isArray(clusters)) return null;

  let total = 0;
  let found = false;
  for (const cluster of clusters) {
    if (!isRecord(cluster)) continue;
    const counts = isRecord(cluster.counts) ? cluster.counts : cluster;
    for (const key of ["applicable", "conditional", "contested"] as const) {
      const n = nonNegativeNumber(counts[key]);
      if (n !== null) {
        total += n;
        found = true;
      }
    }
  }
  return found ? total : null;
}

interface FormingCounterProps {
  /** Server-confirmed count, or null when no interim result exists yet. */
  count: number | null;
}

export default function FormingCounter({ count }: FormingCounterProps) {
  if (count === null) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/[0.08] backdrop-blur-[10px] border border-emerald-500/20"
      style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.2)" }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full bg-emerald-400"
        aria-hidden="true"
      />
      <span className="text-small text-white/70">
        Obligations identified so far:{" "}
        <span className="text-emerald-400 font-medium">{count}</span>
      </span>
    </motion.div>
  );
}
