/**
 * Caelex Trade — Knowledge-Facts catalog for FDPR.
 *
 * Sprint Z20b. Tier 1 per the Living Execution Plan.
 *
 * 15 CFR § 772.1 defines "knowledge" as positive knowledge, awareness
 * of a high probability of existence/future occurrence, conscious
 * disregard, or willful avoidance. Several FDPR scenarios (§ 734.9(e)
 * (f)(g)(h)(i)) trigger on knowledge of an end-user, end-use, or
 * transaction-party characteristic — NOT on destination alone.
 *
 * This module encodes the typed catalog of knowledge facts the
 * cascade consumes. The upstream sanctions-screening pipeline
 * (B1/B2/D2 — OFSI/UN/BIS Affiliate Rule + Entity List parsers)
 * already determines entity-list membership; Z20b reuses that data,
 * doesn't re-derive it.
 *
 * Per Blueprint 2 § 9.4, the catalog covers:
 *
 *   - kf_destination_explicit              (the bill-of-lading signal)
 *   - kf_end_user_in_entity_list           (with footnote 1/3/4/5)
 *   - kf_owner_50pct_entity_list           (Affiliates Rule — stayed Z21)
 *   - kf_red_flag_customer_inconsistency   (Supp. 3 to Part 732)
 *   - kf_red_flag_29_affiliate             (Red Flag 29 — stayed Z21)
 *   - kf_advanced_node_ic_facility         (footnote-5 facility)
 *   - kf_meu_procurement_footnote3         (Russia/Belarus MEU)
 *
 * Source: Blueprint 2 § 9.4. 15 CFR § 772.1; Supp. 3 to Part 732;
 *         Supp. 4 to Part 744 (Entity List with footnotes).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Types ──────────────────────────────────────────────────────────

/**
 * Entity-List footnote designation. Each footnote tracks a distinct
 * FDPR scope:
 *
 *   - **1** — Huawei-style: triggers § 734.9(e)(1) FDPR for Cat 3/4/5
 *             D/E direct products. Policy of denial above 5G.
 *   - **3** — Russian/Belarusian Military End-User (MEU) or
 *             Procurement Entity: triggers § 734.9(g) FDPR worldwide.
 *   - **4** — HikVision-style: adds 5D002/5E002 (encryption) to the
 *             (e)(1) product scope. Triggers § 734.9(e)(2). Policy
 *             of denial.
 *   - **5** — Advanced-node IC facility: triggers § 734.9(e)(3) for
 *             3B equipment + 3D/3E tech to footnote-5 entities OR
 *             any Macau/D:5 facility producing logic or DRAM
 *             advanced-node ICs (≥ 50 billion transistors with HBM
 *             trigger per Red Flag 26).
 */
export type EntityListFootnote = 1 | 3 | 4 | 5;

/**
 * Entity-list membership status for a single transaction party.
 * The sanctions-screening pipeline populates this; Z20b consumes it.
 */
export interface PartyEntityListMembership {
  /** True if the party is on Supp. 4 to Part 744 (BIS Entity List). */
  entityListed: boolean;
  /**
   * Which footnote(s) the listing carries. Most entities have NO
   * footnote (the standard Entity-List listing). The footnoted
   * entities are the FDPR triggers.
   */
  footnote?: EntityListFootnote;
}

/**
 * Knowledge facts attached to a transaction. The cascade gates Gate
 * 2 (FDPR) on these — none of them affect Gate 1 (ITAR see-through)
 * or Gate 3 (de minimis).
 *
 * All fields are optional: a missing field means "no positive
 * knowledge" (NOT "negative knowledge"). The conservative rule is
 * to fire FDPR only on POSITIVE knowledge; conscious-disregard /
 * willful-avoidance signals (Red Flags) require human judgment and
 * are surfaced separately for compliance-officer review.
 */
export interface KnowledgeFacts {
  // ── Transaction-party entity-list status ─────────────────────────
  /** End-user (the ultimate operator of the item). */
  endUser?: PartyEntityListMembership;
  /** Purchaser (the contracting entity). */
  purchaser?: PartyEntityListMembership;
  /**
   * Intermediate consignee (the freight-forwarder or in-country
   * agent). Listed because FDPR § 734.9(e) cares about ANY
   * transaction party.
   */
  intermediateConsignee?: PartyEntityListMembership;
  /** Ultimate consignee. */
  ultimateConsignee?: PartyEntityListMembership;
  /** Incorporator (a third party that integrates the item). */
  incorporator?: PartyEntityListMembership;

  // ── Affiliate-rule (stayed until 2026-11-09 — see Z21) ───────────
  /**
   * 50%-or-more ownership by one or more Entity-List entities. Per
   * the September 2025 Affiliates Rule (90 FR 47201) — STAYED until
   * 2026-11-09 by 90 FR 50857. Z21 tracks the stay; the cascade
   * consults Z21 to decide whether to fire FDPR on this signal.
   */
  ownerOver50PctEntityListed?: boolean;

  // ── End-use signals ──────────────────────────────────────────────
  /**
   * True if the destination's end-use is at a facility in Macau or
   * D:5 producing logic or DRAM advanced-node ICs (≥ 50 billion
   * transistors, per Red Flag 26 + the FDPR (e)(3) scope).
   */
  advancedNodeIcFacility?: boolean;
  /**
   * True if the destination is in a temporarily occupied Ukrainian
   * region — the Crimea region or the Donetsk, Luhansk, Kherson, or
   * Zaporizhzhia regions of Ukraine. ISO 3166 does not have a code
   * for these, so the operator must flag it via this knowledge fact.
   *
   * Per 15 CFR § 734.9(f)(2), the country scope of the Russia/Belarus
   * FDPR includes RU, BY, AND these occupied regions. Z20c consumes
   * this signal to fire (f).
   */
  destinationIsOccupiedUkraineRegion?: boolean;

  // ── Red Flags (Supp. 3 to Part 732) ──────────────────────────────
  /**
   * Customer-inconsistency red flag: order pattern inconsistent with
   * stated end-use, requested equipment configuration incompatible
   * with destination infrastructure, declined installation/training,
   * etc. INFORMATIONAL — does NOT itself trigger FDPR, surfaces for
   * human review.
   */
  redFlagCustomerInconsistency?: boolean;
  /**
   * Red Flag 29 — ownership-uncertainty affiliate red flag. STAYED
   * (tracked by Z21). Surfaces a warning until 2026-11-09; becomes a
   * positive-knowledge trigger thereafter.
   */
  redFlag29Affiliate?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * True if ANY transaction party on the input has the specified
 * Entity-List footnote.
 *
 * Per § 734.9(e), the FDPR fires when ANY of (incorporator, purchaser,
 * intermediate consignee, ultimate consignee, end-user) carries the
 * footnote. The trigger is broad — the operator can be at arm's
 * length from the footnoted party and still trip the rule.
 */
export function anyPartyHasFootnote(
  facts: KnowledgeFacts | undefined,
  footnote: EntityListFootnote,
): boolean {
  if (!facts) return false;
  const parties: Array<PartyEntityListMembership | undefined> = [
    facts.endUser,
    facts.purchaser,
    facts.intermediateConsignee,
    facts.ultimateConsignee,
    facts.incorporator,
  ];
  return parties.some(
    (p) => p?.entityListed === true && p?.footnote === footnote,
  );
}

/**
 * True if ANY transaction party is entity-listed (regardless of
 * footnote). Used by the cascade UI to flag "this transaction has
 * an Entity-List party — escalate to compliance officer" even when
 * the party doesn't carry an FDPR-triggering footnote.
 */
export function anyPartyIsEntityListed(
  facts: KnowledgeFacts | undefined,
): boolean {
  if (!facts) return false;
  const parties: Array<PartyEntityListMembership | undefined> = [
    facts.endUser,
    facts.purchaser,
    facts.intermediateConsignee,
    facts.ultimateConsignee,
    facts.incorporator,
  ];
  return parties.some((p) => p?.entityListed === true);
}

/**
 * Convenience: list of transaction-party role names that are
 * entity-listed with the specified footnote. Used by the FDPR engine
 * to build operator-facing rationale strings.
 */
export function partyRolesWithFootnote(
  facts: KnowledgeFacts | undefined,
  footnote: EntityListFootnote,
): string[] {
  if (!facts) return [];
  const roles: string[] = [];
  if (
    facts.endUser?.entityListed === true &&
    facts.endUser?.footnote === footnote
  ) {
    roles.push("end-user");
  }
  if (
    facts.purchaser?.entityListed === true &&
    facts.purchaser?.footnote === footnote
  ) {
    roles.push("purchaser");
  }
  if (
    facts.intermediateConsignee?.entityListed === true &&
    facts.intermediateConsignee?.footnote === footnote
  ) {
    roles.push("intermediate consignee");
  }
  if (
    facts.ultimateConsignee?.entityListed === true &&
    facts.ultimateConsignee?.footnote === footnote
  ) {
    roles.push("ultimate consignee");
  }
  if (
    facts.incorporator?.entityListed === true &&
    facts.incorporator?.footnote === footnote
  ) {
    roles.push("incorporator");
  }
  return roles;
}
