/**
 * Caelex Trade — Action Inbox Aggregator (U-HIGH-1).
 *
 * Pure functions that turn raw cohort data fetched by /trade/page.tsx
 * into a unified, severity-sorted `ActionItem[]` for the new
 * ActionInboxPanel.
 *
 * Why pure functions:
 *   - The welcome page already fetches the data it needs (BLOCKED ops,
 *     expiring licenses, etc.). Re-querying inside this module would
 *     duplicate DB work.
 *   - Pure functions are trivially testable — see the co-located
 *     `.test.ts` for the severity-ordering + cohort-transformation
 *     coverage.
 *   - No `import "server-only"` because nothing here touches Prisma,
 *     fs, or env. The aggregator could in principle run on the client
 *     too, though today it's only used inside an RSC.
 *
 * Severity model:
 *   critical — operator action is blocked or a legal deadline is
 *              within 14 days (red, sort-first).
 *   warning  — operator action recommended; deadline 15-30 days,
 *              license expiring 15-30 days, etc. (amber, sort-second).
 *   info     — nothing actively burning but operator might want to
 *              know (sort-last; not currently used in MVP).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LucideIcon } from "lucide-react";

export type ActionSeverity = "critical" | "warning" | "info";

export type ActionKind =
  | "operation-blocked"
  | "license-expiring"
  | "euc-awaiting"
  | "party-needs-screening"
  | "vsd-deadline-approaching"
  | "vsd-needs-investigation"
  | "sag-utilization-high";

export interface ActionItem {
  /** Stable id — `kind:sourceId` so React reconciles correctly. */
  id: string;
  kind: ActionKind;
  severity: ActionSeverity;
  /** Primary one-line title. */
  title: string;
  /** Optional one-line secondary text (entity ref, deadline, etc.). */
  subtitle?: string;
  /** Deep-link to the relevant detail or list page. */
  href: string;
  /** Optional countdown phrase ("in 5 days", "12 days overdue"). */
  countdown?: string;
}

// ─── Inputs ───────────────────────────────────────────────────────────
//
// Shapes match what /trade/page.tsx already fetches today; we name them
// here so callers don't accidentally pass mismatched cohorts.

export interface AggregatorInput {
  /** TradeOperation rows with status = BLOCKED. */
  blockedOperations: ReadonlyArray<{
    id: string;
    reference: string;
    counterpartyName?: string | null;
  }>;
  /** TradeLicense rows in the next-90-day expiry window (already filtered). */
  licensesExpiringSoon: ReadonlyArray<{
    id: string;
    licenseNumber: string | null;
    licenseType: string;
    validUntil: Date | string;
  }>;
  /** TradeEUCRequest rows in SENT_TO_PARTY status (awaiting counter-sign). */
  eucsAwaitingAction: ReadonlyArray<{
    id: string;
    sentAt: Date | string | null;
    partyName: string;
  }>;
  /** TradeParty rows whose screeningStatus needs operator triage. */
  partiesNeedingReview: ReadonlyArray<{
    id: string;
    legalName: string;
    screeningStatus: "POTENTIAL_MATCH" | "CONFIRMED_HIT" | "STALE";
  }>;
  /** VSDs whose authority window deadline is within the next 30 days. */
  vsdDeadlinesNear: ReadonlyArray<{
    id: string;
    title: string;
    authority: string;
    deadlineAt: Date | string;
  }>;
  /** VSDs sitting in DISCOVERED with no investigation start logged. */
  vsdsNeedingInvestigation: ReadonlyArray<{
    id: string;
    title: string;
    discoveredAt: Date | string;
  }>;
  /**
   * ACTIVE Sammelgenehmigungen whose value draw-down crossed the
   * attention threshold (caller computes the percentage from the BigInt
   * cap/drawn cents — the aggregator stays BigInt-free).
   */
  sagsHighUtilization?: ReadonlyArray<{
    id: string;
    title: string;
    bafaReference: string | null;
    utilizationPct: number;
  }>;
  /** Reference time — pass `new Date()` in prod, fixed in tests. */
  now: Date;
}

// ─── Aggregator ───────────────────────────────────────────────────────

/**
 * Build the action-inbox feed. Returns a flat severity-sorted list.
 *
 * Sorting:
 *   1. Severity descending (critical, warning, info).
 *   2. Within a severity, items with the soonest deadline first.
 *      Items without a concrete deadline sort to the end of their
 *      severity bucket.
 */
export function aggregateActionItems(input: AggregatorInput): ActionItem[] {
  const items: ActionItem[] = [];
  const { now } = input;

  // ── BLOCKED operations — always critical. Operator action explicitly
  //    required to either file a self-disclosure or release the block.
  for (const op of input.blockedOperations) {
    items.push({
      id: `operation-blocked:${op.id}`,
      kind: "operation-blocked",
      severity: "critical",
      title: `Operation ${op.reference} blocked`,
      subtitle: op.counterpartyName
        ? `Counterparty: ${op.counterpartyName} — release or file self-disclosure`
        : "Release the block or file a self-disclosure to close the operation",
      href: `/trade/operations/${op.id}`,
    });
  }

  // ── Licenses expiring. Critical if ≤14d, warning if 15-30d. Beyond
  //    that we drop — the UpcomingDeadlinesStrip handles longer-range
  //    forecasting; the inbox is specifically "needs action right now".
  for (const lic of input.licensesExpiringSoon) {
    const validUntil = new Date(lic.validUntil);
    const daysLeft = daysBetween(now, validUntil);
    if (daysLeft > 30) continue;
    items.push({
      id: `license-expiring:${lic.id}`,
      kind: "license-expiring",
      severity: daysLeft <= 14 ? "critical" : "warning",
      title: `License ${lic.licenseNumber ?? lic.licenseType} expires soon`,
      subtitle: `Expires ${validUntil.toLocaleDateString("en-GB")} — start renewal`,
      countdown: formatCountdown(daysLeft),
      href: `/trade/licenses`,
    });
  }

  // ── EUCs sitting in "SENT_TO_PARTY" for >7d — counterparty hasn't
  //    returned signature, operator should chase. Critical if >21d.
  for (const euc of input.eucsAwaitingAction) {
    if (!euc.sentAt) continue;
    const sentAt = new Date(euc.sentAt);
    const daysSince = daysBetween(sentAt, now);
    if (daysSince < 7) continue;
    items.push({
      id: `euc-awaiting:${euc.id}`,
      kind: "euc-awaiting",
      severity: daysSince > 21 ? "critical" : "warning",
      title: `EUC awaiting signature from ${euc.partyName}`,
      subtitle: `Sent ${daysSince} days ago — follow up`,
      countdown: `sent ${daysSince}d ago`,
      href: `/trade/euc`,
    });
  }

  // ── Parties needing screening review. POTENTIAL_MATCH is critical
  //    (we have a hit that could be the sanctioned party). STALE +
  //    CONFIRMED_HIT are warning — CONFIRMED_HIT was a deliberate
  //    operator decision and is already a known blocker on operations.
  for (const party of input.partiesNeedingReview) {
    const severity: ActionSeverity =
      party.screeningStatus === "POTENTIAL_MATCH" ? "critical" : "warning";
    const reason =
      party.screeningStatus === "POTENTIAL_MATCH"
        ? "potential sanctions match — needs triage"
        : party.screeningStatus === "CONFIRMED_HIT"
          ? "confirmed sanctions hit on file"
          : "screening data is stale — refresh";
    items.push({
      id: `party-needs-screening:${party.id}`,
      kind: "party-needs-screening",
      severity,
      title: `${party.legalName}: ${reason}`,
      href: `/trade/parties/${party.id}`,
    });
  }

  // ── VSDs whose authority deadline is closing in. ≤14d = critical,
  //    15-30d = warning. The aggregator caller already pre-filtered
  //    these to the 30d window so we don't drop any here.
  for (const vsd of input.vsdDeadlinesNear) {
    const deadline = new Date(vsd.deadlineAt);
    const daysLeft = daysBetween(now, deadline);
    items.push({
      id: `vsd-deadline-approaching:${vsd.id}`,
      kind: "vsd-deadline-approaching",
      severity: daysLeft <= 14 ? "critical" : "warning",
      title: `VSD ${vsd.title}: ${vsd.authority} deadline closing`,
      subtitle: `Filing window ends ${deadline.toLocaleDateString("en-GB")}`,
      countdown: formatCountdown(daysLeft),
      href: `/trade/vsd/${vsd.id}`,
    });
  }

  // ── VSDs still in DISCOVERED (no investigation started). These don't
  //    have a hard deadline yet but every day they sit in DISCOVERED is
  //    a day burned off the authority clock — warning severity.
  for (const vsd of input.vsdsNeedingInvestigation) {
    const discoveredAt = new Date(vsd.discoveredAt);
    const daysSince = daysBetween(discoveredAt, now);
    items.push({
      id: `vsd-needs-investigation:${vsd.id}`,
      kind: "vsd-needs-investigation",
      severity: daysSince > 14 ? "critical" : "warning",
      title: `VSD ${vsd.title}: needs investigation`,
      subtitle: `Discovered ${daysSince} days ago — start investigation`,
      countdown: `discovered ${daysSince}d ago`,
      href: `/trade/vsd/${vsd.id}`,
    });
  }

  // ── Sammelgenehmigungen close to their value cap. ≥95% is critical
  //    (the next shipment may be blocked by the atomic draw-down guard),
  //    80–94% is a warning to start the follow-up authorization early —
  //    BAFA processing times make late filings expensive.
  for (const sag of input.sagsHighUtilization ?? []) {
    const pct = Math.round(sag.utilizationPct);
    items.push({
      id: `sag-utilization-high:${sag.id}`,
      kind: "sag-utilization-high",
      severity: pct >= 95 ? "critical" : "warning",
      title: `SAG ${sag.bafaReference ?? sag.title} at ${pct}% of its value cap`,
      subtitle:
        pct >= 95
          ? "Next draw-down may be blocked — file the follow-up authorization now"
          : "Start the follow-up authorization before the cap blocks shipments",
      href: `/trade/sammelgenehmigungen/${sag.id}`,
    });
  }

  return items.sort(compareActionItems);
}

// ─── Helpers ──────────────────────────────────────────────────────────

const SEVERITY_RANK: Record<ActionSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

function compareActionItems(a: ActionItem, b: ActionItem): number {
  const sevDelta = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (sevDelta !== 0) return sevDelta;
  // Within a severity, items that mention "in N days" sort by urgency
  // (smallest days-left first). We approximate by extracting the
  // countdown number; items without a countdown sort last.
  const aDays = countdownToDays(a.countdown);
  const bDays = countdownToDays(b.countdown);
  if (aDays === null && bDays === null) return 0;
  if (aDays === null) return 1;
  if (bDays === null) return -1;
  return aDays - bDays;
}

/** Whole days between two Dates (a → b). Negative if b < a. */
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function formatCountdown(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "due today";
  if (days === 1) return "due tomorrow";
  return `in ${days}d`;
}

function countdownToDays(countdown: string | undefined): number | null {
  if (!countdown) return null;
  if (countdown === "due today") return 0;
  if (countdown === "due tomorrow") return 1;
  const matchIn = countdown.match(/^in (\d+)d$/);
  if (matchIn) return Number(matchIn[1]);
  const matchOverdue = countdown.match(/^(\d+)d overdue$/);
  if (matchOverdue) return -Number(matchOverdue[1]);
  // For "sent Nd ago" / "discovered Nd ago" the days-since reads
  // opposite-direction; we sort larger-N-first inside the same
  // severity (older = more urgent). Return -N so it sorts BEFORE
  // smaller values.
  const matchAgo = countdown.match(/(\d+)d ago/);
  if (matchAgo) return -Number(matchAgo[1]);
  return null;
}

// ─── Severity → presentation helpers (for the panel) ──────────────────

/** Tailwind text-class for the row-leading severity dot/icon. */
export function severityToneClass(severity: ActionSeverity): string {
  switch (severity) {
    case "critical":
      return "text-red-600";
    case "warning":
      return "text-amber-600";
    case "info":
      return "text-blue-600";
  }
}

/** Background tint for the leading icon chip. */
export function severityChipBg(severity: ActionSeverity): string {
  switch (severity) {
    case "critical":
      return "bg-red-50";
    case "warning":
      return "bg-amber-50";
    case "info":
      return "bg-blue-50";
  }
}

/** Short human label for the severity (used by aria-label). */
export function severityLabel(severity: ActionSeverity): string {
  switch (severity) {
    case "critical":
      return "Critical";
    case "warning":
      return "Warning";
    case "info":
      return "Info";
  }
}

// LucideIcon type re-export so consumers don't need to import twice.
export type { LucideIcon };
