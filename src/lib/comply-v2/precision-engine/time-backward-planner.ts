/**
 * Time-Backward Planner (Sprint A3)
 *
 * Given GeneratedComplianceItems and a planned launch date (or other anchor
 * deadline), computes:
 *   - targetDate: when the obligation must be satisfied
 *   - startDate: when work on it should begin
 *
 * Heuristics — keep simple and tunable. These mirror what counsel typically
 * recommends to operators preparing for an authorization filing.
 */

import "server-only";

import type { ApplicabilityContext, GeneratedComplianceItem } from "./types";

// ─── Heuristic offsets ─────────────────────────────────────────────────────

/**
 * Months before the planned launch date by which the obligation must be
 * complete. Larger = more upstream.
 */
interface OffsetRule {
  pattern: RegExp;
  /** How many months BEFORE launch must this be satisfied. */
  targetMonthsBeforeLaunch: number;
  /** How long does work typically take (months from start to satisfied). */
  workDurationMonths: number;
}

const OFFSET_RULES: OffsetRule[] = [
  {
    pattern: /AUTHORIZATION/i,
    targetMonthsBeforeLaunch: 12, // EU Space Act: ~12 months lead
    workDurationMonths: 6,
  },
  {
    pattern: /LAUNCH[-_ ]?LICENSE|LAUNCH[-_ ]?PERMIT/i,
    targetMonthsBeforeLaunch: 6,
    workDurationMonths: 3,
  },
  {
    pattern: /SPECTRUM[-_ ]?FILING|ITU[-_ ]?FILING/i,
    targetMonthsBeforeLaunch: 18, // ITU coordination is slow
    workDurationMonths: 9,
  },
  {
    pattern: /INSURANCE|LIABILITY/i,
    targetMonthsBeforeLaunch: 9,
    workDurationMonths: 3,
  },
  {
    pattern: /DEBRIS[-_ ]?MITIGATION/i,
    targetMonthsBeforeLaunch: 12,
    workDurationMonths: 4,
  },
  {
    pattern: /RISK[-_ ]?ASSESSMENT|ISMS/i,
    targetMonthsBeforeLaunch: 9,
    workDurationMonths: 3,
  },
  {
    pattern: /INCIDENT[-_ ]?RESPONSE|BREACH[-_ ]?NOTIFICATION/i,
    targetMonthsBeforeLaunch: 3,
    workDurationMonths: 2,
  },
  {
    pattern: /DPIA|DATA[-_ ]?PROTECTION[-_ ]?IMPACT/i,
    targetMonthsBeforeLaunch: 9,
    workDurationMonths: 2,
  },
];

/** Catch-all for obligations not matched by any rule above. */
const DEFAULT_TARGET_MONTHS_BEFORE_LAUNCH = 6;
const DEFAULT_WORK_DURATION_MONTHS = 2;

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Annotate every item with targetDate + startDate based on the planned launch
 * (or anchor date) and the offset rules. Items without a launch context get
 * a "rolling" 12-month plan: target = now + 6mo, start = now + 1mo.
 */
export function planTimeBackward(
  items: GeneratedComplianceItem[],
  context: ApplicabilityContext,
  options?: { now?: Date },
): GeneratedComplianceItem[] {
  const now = options?.now ?? new Date();
  const launch = context.plannedLaunchDate;

  return items.map((item) => {
    const rule = OFFSET_RULES.find((r) => r.pattern.test(item.id));
    const targetMonths =
      rule?.targetMonthsBeforeLaunch ?? DEFAULT_TARGET_MONTHS_BEFORE_LAUNCH;
    const workMonths = rule?.workDurationMonths ?? DEFAULT_WORK_DURATION_MONTHS;

    let targetDate: Date;
    let startDate: Date;

    if (launch && launch.getTime() > now.getTime()) {
      // Plan backward from launch.
      targetDate = subtractMonths(launch, targetMonths);
      startDate = subtractMonths(targetDate, workMonths);

      // Floor to "now" — we don't suggest start dates in the past.
      if (startDate.getTime() < now.getTime()) {
        startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // tomorrow
      }
      if (targetDate.getTime() < now.getTime()) {
        // Launch is so close the obligation is already overdue; mark target as
        // ASAP (= today) so the Today inbox surfaces it as URGENT.
        targetDate = now;
      }
    } else {
      // No launch context — rolling 12-month plan.
      targetDate = addMonths(now, Math.min(targetMonths, 6));
      startDate = addMonths(now, 1);
    }

    return { ...item, targetDate, startDate };
  });
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function addMonths(d: Date, months: number): Date {
  const out = new Date(d.getTime());
  out.setUTCMonth(out.getUTCMonth() + months);
  return out;
}

function subtractMonths(d: Date, months: number): Date {
  return addMonths(d, -months);
}
