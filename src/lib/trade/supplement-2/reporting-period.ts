/**
 * 15 CFR Part 743 Supplement No. 2 — Reporting period helpers.
 *
 * Each calendar year is split into two halves with semi-annual filing:
 *
 *   H1 — Jan 1 .. Jun 30, due Jul 31 of the same year
 *   H2 — Jul 1 .. Dec 31, due Jan 31 of the FOLLOWING year
 *
 * Period IDs are stable strings of the form "YYYY-H1" / "YYYY-H2"
 * that can be persisted, compared, and rendered without further
 * parsing. The DB unique key is (organizationId, reportingPeriod) so
 * the cron can safely upsert without duplicating rows.
 *
 * All boundary dates are computed in UTC. The cron runs in UTC and
 * filing deadlines are referenced to UTC midnight — operators in the
 * US/East timezone get the deadline at 7-8pm local on the prior day,
 * but BIS-published deadlines are calendar-day deadlines so this is
 * conservative (operators get LESS time, never more).
 */

export type ReportingHalf = "H1" | "H2";

export interface ReportingPeriod {
  /** Stable id like "2026-H1". */
  id: string;
  /** Calendar year. */
  year: number;
  /** Which half of the year. */
  half: ReportingHalf;
  /** Inclusive start (Jan 1 00:00 UTC or Jul 1 00:00 UTC). */
  start: Date;
  /** Exclusive end (Jul 1 next half or Jan 1 of next year). */
  end: Date;
  /** Due-date for filing (Jul 31 same year or Jan 31 next year). */
  dueDate: Date;
}

/**
 * Build a period struct from a year + half. UTC throughout.
 */
export function makeReportingPeriod(
  year: number,
  half: ReportingHalf,
): ReportingPeriod {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error(`Invalid year for reporting period: ${year}`);
  }
  if (half === "H1") {
    return {
      id: `${year}-H1`,
      year,
      half,
      start: new Date(Date.UTC(year, 0, 1)),
      end: new Date(Date.UTC(year, 6, 1)),
      dueDate: new Date(Date.UTC(year, 6, 31)),
    };
  }
  return {
    id: `${year}-H2`,
    year,
    half,
    start: new Date(Date.UTC(year, 6, 1)),
    end: new Date(Date.UTC(year + 1, 0, 1)),
    dueDate: new Date(Date.UTC(year + 1, 0, 31)),
  };
}

/**
 * Parse a period id ("YYYY-H1" / "YYYY-H2") back into a struct.
 * Throws on malformed input — callers must validate before calling.
 */
export function parseReportingPeriod(periodId: string): ReportingPeriod {
  const match = /^(\d{4})-H([12])$/.exec(periodId);
  if (!match) {
    throw new Error(`Malformed reporting period id: "${periodId}"`);
  }
  const year = Number(match[1]);
  const half = match[2] === "1" ? "H1" : "H2";
  return makeReportingPeriod(year, half);
}

/**
 * Return the period that JUST CLOSED relative to the given date.
 * On Jan 1 returns the H2 of the previous calendar year. On Jul 1
 * returns the H1 of the current year. Used by the cron to figure
 * out which period to open a draft for.
 *
 * Boundary semantics: the period is "closed" on its `end` date —
 * Jul 1 closes H1; Jan 1 closes H2 of the prior year. Calling on
 * any non-boundary date returns the most recently closed period.
 */
export function getJustClosedPeriod(now: Date): ReportingPeriod {
  const month = now.getUTCMonth(); // 0-indexed: 0..11
  const year = now.getUTCFullYear();
  // Jan 1 — Jun 30 (months 0..5) — H2 of prior year just closed
  if (month <= 5) {
    return makeReportingPeriod(year - 1, "H2");
  }
  // Jul 1 — Dec 31 (months 6..11) — H1 of current year just closed
  return makeReportingPeriod(year, "H1");
}

/**
 * Return whether the given date sits within [period.start, period.end).
 * Used by the eligibility query to bin operations into the right
 * period. Half-open by design — the end boundary belongs to the next
 * period.
 */
export function dateIsInPeriod(date: Date, period: ReportingPeriod): boolean {
  const t = date.getTime();
  return t >= period.start.getTime() && t < period.end.getTime();
}

/**
 * Compute days remaining from `now` to the period's due date.
 * Returns a positive integer when before the deadline, 0 on the
 * deadline date itself, negative when overdue. Used by the reminder
 * service to bucket into T-14 / T-3 / OVERDUE.
 */
export function daysUntilDue(period: ReportingPeriod, now: Date): number {
  const diffMs = period.dueDate.getTime() - now.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
