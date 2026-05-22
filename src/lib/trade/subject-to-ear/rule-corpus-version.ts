/**
 * Caelex Trade — EAR rule-corpus version manifest with stay tracking.
 *
 * Sprint Z21. Tier 1 per the Living Execution Plan.
 *
 * 15 CFR § 734.9 (FDPR) and Supp. 3 to Part 732 (red flags) have
 * **stays** — rules adopted by BIS but suspended for a defined
 * window before enforcement begins. The engine must distinguish
 * between text "in force vs. stayed vs. proposed" per Blueprint 2 §
 * Caveat #4.
 *
 * The most-cited example: the September 30, 2025 "Affiliates Rule"
 * (90 FR 47201) introduced 50%-owned-affiliate look-through for
 * Entity-List entities under § 744.11 and § 734.9(e)/(g). It was
 * stayed by 90 FR 50857 (November 12, 2025) until **November 9, 2026**.
 *
 * The cascade (Z18) consults this module to gate FDPR/red-flag
 * behavior on rule status. Operators rely on the surfaced warnings
 * when stays approach expiry — a stay's 9-November-2026 expiration
 * is a discrete cliff where the engine's behavior changes overnight.
 *
 * Source: Blueprint 2 § Caveat #4. 90 FR 47201; 90 FR 50857.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Types ──────────────────────────────────────────────────────────

/** Stable identifier for a corpus rule with stay-eligible state. */
export type CorpusRuleId =
  | "affiliates-rule-744.11"
  | "affiliates-rule-734.9-e"
  | "affiliates-rule-734.9-g"
  | "red-flag-29"
  | "fdpr-734.9-b-ns"
  | "fdpr-734.9-c-9x515"
  | "fdpr-734.9-d-600-series"
  | "fdpr-734.9-e-entity-list"
  | "fdpr-734.9-f-russia-belarus"
  | "fdpr-734.9-g-meu-procurement"
  | "fdpr-734.9-h-advanced-computing"
  | "fdpr-734.9-i-supercomputer";

export interface RuleStatus {
  /** Stable id. */
  ruleId: CorpusRuleId;
  /** Plain-language title for operator UI. */
  title: string;
  /** Verbatim CFR / Federal Register citation. */
  citation: string;
  /** True if the rule is currently in force AND not stayed. */
  inForce: boolean;
  /**
   * ISO date when the rule itself took (or takes) effect. Some rules
   * have multiple effective dates — this is the most recent codified
   * effective date.
   */
  effectiveAt: string;
  /**
   * If non-null: the rule has been STAYED. Stay applies through this
   * date inclusive. After this date (unless extended), the rule
   * becomes inForce.
   */
  stayedUntil: string | null;
  /** Source of the stay (Federal Register citation), if any. */
  stayCitation: string | null;
  /**
   * Plain-language explanation for the operator. Tells them why the
   * rule is in its current state and what triggers a transition.
   */
  rationale: string;
}

export interface CorpusWarning {
  ruleId: CorpusRuleId;
  title: string;
  /** Number of days until the stay expires (negative = already expired). */
  daysUntilStayExpiry: number;
  /**
   * Severity: "info" (>= 30 days), "warning" (7-30), "critical" (<=7).
   */
  severity: "info" | "warning" | "critical";
  message: string;
}

// ─── Manifest ──────────────────────────────────────────────────────

/**
 * Authoritative manifest of stay-eligible EAR rules. Update on every
 * Federal Register notice that touches stay status.
 *
 * Convention: dates use ISO 8601 (YYYY-MM-DD) at midnight UTC. The
 * resolver compares against a Date passed in by the caller — we don't
 * read `new Date()` here so the module stays pure / time-mockable.
 */
const RULE_MANIFEST: Record<CorpusRuleId, Omit<RuleStatus, "inForce">> = {
  // The September 30, 2025 Affiliates Rule (90 FR 47201).
  // Stayed by 90 FR 50857 until 2026-11-09.
  "affiliates-rule-744.11": {
    ruleId: "affiliates-rule-744.11",
    title: "Entity List affiliates rule — 50%-owned look-through (§ 744.11)",
    citation: "15 CFR § 744.11(b) — added by 90 FR 47201, Sept 30 2025",
    effectiveAt: "2025-09-30",
    stayedUntil: "2026-11-09",
    stayCitation: "90 FR 50857 (Nov 12, 2025) — stays enforcement",
    rationale:
      "The Affiliates Rule extends Entity List restrictions to entities owned ≥50% by listed parties. BIS stayed enforcement to allow industry adjustment. Until 2026-11-09, treat the 50% look-through as best practice but NOT a positive-knowledge trigger for FDPR § 734.9(e)/(g).",
  },
  "affiliates-rule-734.9-e": {
    ruleId: "affiliates-rule-734.9-e",
    title: "FDPR § 734.9(e) — three sentences re: 50% affiliate look-through",
    citation: "15 CFR § 734.9(e) introductory text — added by 90 FR 47201",
    effectiveAt: "2025-09-30",
    stayedUntil: "2026-11-09",
    stayCitation: "90 FR 50857 (Nov 12, 2025)",
    rationale:
      "The three sentences at the end of § 734.9(e) introductory text implement the 50%-owned-affiliate look-through for Entity List FDPR (footnote 1/4/5). Stay tracks the underlying § 744.11 stay.",
  },
  "affiliates-rule-734.9-g": {
    ruleId: "affiliates-rule-734.9-g",
    title: "FDPR § 734.9(g) — two sentences re: 50% affiliate look-through",
    citation: "15 CFR § 734.9(g) introductory text — added by 90 FR 47201",
    effectiveAt: "2025-09-30",
    stayedUntil: "2026-11-09",
    stayCitation: "90 FR 50857 (Nov 12, 2025)",
    rationale:
      "The two sentences at the end of § 734.9(g) introductory text apply the 50%-affiliate look-through to footnote-3 Russian/Belarusian MEU and Procurement entities. Stay tracks the underlying § 744.11 stay.",
  },
  "red-flag-29": {
    ruleId: "red-flag-29",
    title: "Red Flag 29 — ownership-uncertainty affiliate red flag",
    citation: "15 CFR Supp. 3 to Part 732, Red Flag 29 — added by 90 FR 47201",
    effectiveAt: "2025-09-30",
    stayedUntil: "2026-11-09",
    stayCitation: "90 FR 50857 (Nov 12, 2025)",
    rationale:
      "Red Flag 29 instructs exporters to investigate ownership-uncertainty signals (e.g. an end-user with parent in Country Group D:5 or with Entity List affiliates). Stayed in lockstep with the Affiliates Rule.",
  },
  // Core FDPR rules — all in force as of 2026-05-22.
  "fdpr-734.9-b-ns": {
    ruleId: "fdpr-734.9-b-ns",
    title: "National Security FDPR (§ 734.9(b))",
    citation: "15 CFR § 734.9(b)",
    effectiveAt: "1995-03-25",
    stayedUntil: null,
    stayCitation: null,
    rationale: "In force; no stay.",
  },
  "fdpr-734.9-c-9x515": {
    ruleId: "fdpr-734.9-c-9x515",
    title: "9x515 FDPR (§ 734.9(c))",
    citation: "15 CFR § 734.9(c)",
    effectiveAt: "2014-06-27",
    stayedUntil: null,
    stayCitation: null,
    rationale:
      "In force; codifies the foreign-direct-product capture for 9x515 commercial space items destined for D:5 / E:1 / E:2.",
  },
  "fdpr-734.9-d-600-series": {
    ruleId: "fdpr-734.9-d-600-series",
    title: "600-series FDPR (§ 734.9(d))",
    citation: "15 CFR § 734.9(d)",
    effectiveAt: "2013-10-15",
    stayedUntil: null,
    stayCitation: null,
    rationale: "In force; covers 600-series foreign-direct-products.",
  },
  "fdpr-734.9-e-entity-list": {
    ruleId: "fdpr-734.9-e-entity-list",
    title: "Entity List FDPR (§ 734.9(e)) — footnotes 1, 4, 5",
    citation: "15 CFR § 734.9(e)",
    effectiveAt: "2020-08-17",
    stayedUntil: null,
    stayCitation: null,
    rationale:
      "In force; the Huawei (footnote 1), HikVision (footnote 4), and advanced-node-IC (footnote 5) FDPR scenarios. The 50%-affiliate sub-portion is separately stayed — see affiliates-rule-734.9-e.",
  },
  "fdpr-734.9-f-russia-belarus": {
    ruleId: "fdpr-734.9-f-russia-belarus",
    title: "Russia / Belarus / Crimea FDPR (§ 734.9(f))",
    citation: "15 CFR § 734.9(f)",
    effectiveAt: "2022-02-24",
    stayedUntil: null,
    stayCitation: null,
    rationale:
      "In force; covers all foreign-direct-products in product groups D or E destined for Russia, Belarus, or temporarily occupied Crimea. Carve-out: Supp. 3 to Part 746 (37 partner countries) excluded.",
  },
  "fdpr-734.9-g-meu-procurement": {
    ruleId: "fdpr-734.9-g-meu-procurement",
    title: "Russia / Belarus MEU & Procurement FDPR (§ 734.9(g)) — footnote 3",
    citation: "15 CFR § 734.9(g)",
    effectiveAt: "2022-02-24",
    stayedUntil: null,
    stayCitation: null,
    rationale:
      "In force; foreign-direct-products in any D/E ECCN destined for Russian/Belarusian MEU or Procurement Entity (footnote-3) anywhere worldwide. The 50%-affiliate sub-portion is separately stayed.",
  },
  "fdpr-734.9-h-advanced-computing": {
    ruleId: "fdpr-734.9-h-advanced-computing",
    title: "Advanced Computing FDPR (§ 734.9(h))",
    citation: "15 CFR § 734.9(h)",
    effectiveAt: "2022-10-07",
    stayedUntil: null,
    stayCitation: null,
    rationale:
      "In force; covers 3A090, 4A090, and .z items of 3A001/4A003/4A004/4A005/5A002/5A004/5A992 to D:1/D:4/D:5 (excl. A:5/A:6).",
  },
  "fdpr-734.9-i-supercomputer": {
    ruleId: "fdpr-734.9-i-supercomputer",
    title: "Supercomputer FDPR (§ 734.9(i))",
    citation: "15 CFR § 734.9(i)",
    effectiveAt: "2022-10-07",
    stayedUntil: null,
    stayCitation: null,
    rationale:
      "In force; sub-rule of Advanced Computing FDPR triggered on knowledge of supercomputer use in D:1/D:4/D:5.",
  },
};

// ─── Resolver functions ────────────────────────────────────────────

/**
 * Get the current status of a rule for a given evaluation date.
 *
 * Pure function — caller passes the evaluation date so the module
 * stays mockable for tests. In production, callers pass `new Date()`.
 */
export function getRuleStatus(
  ruleId: CorpusRuleId,
  evaluatedAt: Date = new Date(),
): RuleStatus {
  const manifest = RULE_MANIFEST[ruleId];
  if (!manifest) {
    throw new Error(`Unknown corpus rule id: ${ruleId}`);
  }

  const effectiveDate = parseIso(manifest.effectiveAt);
  const stayedUntilDate = manifest.stayedUntil
    ? parseIso(manifest.stayedUntil)
    : null;

  // A rule is "in force" iff:
  //   - the evaluation date is on or after the effective date, AND
  //   - there is NO stay OR the stay has expired
  const afterEffective = evaluatedAt >= effectiveDate;
  const stayInProgress =
    stayedUntilDate !== null && evaluatedAt < stayedUntilDate;
  const inForce = afterEffective && !stayInProgress;

  return {
    ...manifest,
    inForce,
  };
}

/**
 * Get warnings for all rules whose stays are approaching expiry.
 *
 * The cascade UI should surface these prominently — a stay's expiry
 * date is a discrete cliff where engine behavior changes overnight.
 *
 * Severity bands:
 *   - "info"     — ≥ 30 days until stay expiry
 *   - "warning"  — 7-30 days
 *   - "critical" — ≤ 7 days (or already past)
 */
export function getRuleWarnings(
  evaluatedAt: Date = new Date(),
): CorpusWarning[] {
  const warnings: CorpusWarning[] = [];
  for (const ruleId of Object.keys(RULE_MANIFEST) as CorpusRuleId[]) {
    const status = getRuleStatus(ruleId, evaluatedAt);
    if (!status.stayedUntil) continue;

    const stayDate = parseIso(status.stayedUntil);
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysUntilStayExpiry = Math.ceil(
      (stayDate.getTime() - evaluatedAt.getTime()) / msPerDay,
    );

    let severity: CorpusWarning["severity"];
    let message: string;
    if (daysUntilStayExpiry <= 7) {
      severity = "critical";
      message =
        daysUntilStayExpiry <= 0
          ? `Stay on ${status.title} has expired. Rule is now in force per ${status.citation}; FDPR cascade behavior has changed.`
          : `Stay on ${status.title} expires in ${daysUntilStayExpiry} day(s) on ${status.stayedUntil}. FDPR cascade behavior will change.`;
    } else if (daysUntilStayExpiry <= 30) {
      severity = "warning";
      message = `Stay on ${status.title} expires on ${status.stayedUntil} (${daysUntilStayExpiry} days). Prepare compliance program for the rule taking effect.`;
    } else {
      severity = "info";
      message = `Stay on ${status.title} is in effect through ${status.stayedUntil} (${daysUntilStayExpiry} days remaining).`;
    }

    warnings.push({
      ruleId,
      title: status.title,
      daysUntilStayExpiry,
      severity,
      message,
    });
  }
  // Most-urgent first.
  warnings.sort((a, b) => a.daysUntilStayExpiry - b.daysUntilStayExpiry);
  return warnings;
}

/**
 * Convenience: is a specific rule currently in force on this date?
 */
export function isRuleInForce(
  ruleId: CorpusRuleId,
  evaluatedAt: Date = new Date(),
): boolean {
  return getRuleStatus(ruleId, evaluatedAt).inForce;
}

// ─── Helpers ────────────────────────────────────────────────────────

function parseIso(date: string): Date {
  // Treat as midnight UTC so we get deterministic timezone-stable
  // comparisons. ISO strings without time portion are parsed as
  // local-midnight by default in some JS engines.
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ISO date in rule manifest: ${date}`);
  }
  return parsed;
}
