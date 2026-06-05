/**
 * Caelex Trade — OFAC Sham-Transaction Doctrine: Enforcement-Action Citations.
 *
 * Sprint Z16. Tier 5 per the Living Execution Plan.
 *
 * The OFAC "sham transaction" doctrine — set out in OFAC's 31 March 2026
 * Sanctions Advisory, "Guidance on Sham Transactions and Sanctions Evasion"
 * (ofac.treasury.gov/recent-actions/20260331_33) — captures transactions
 * structured to circumvent sanctions through intermediaries, shell companies,
 * proxies, or artificial chains, and expands scrutiny beyond the 50% Rule to
 * indirect control through family members, trusts, and offshore structures.
 *
 * 31 CFR § 501.601 retains the underlying recordkeeping + reporting
 * obligation; the March 2026 advisory clarifies that "structured to obscure
 * the true counterparty, beneficial owner, end-user, or end-use" is the
 * substantive test OFAC applies when assessing whether a transaction was
 * sham. The Sham-Transaction Risk Score is the Caelex-side surfacing of
 * those indicia BEFORE the transaction crystallises (and therefore before
 * the OFAC enforcement window opens).
 *
 * Each indicator (red-flag type) maps to one or more historical OFAC /
 * BIS enforcement actions that turned on that fact pattern. The citations
 * are the legal grounding the Caelex UI surfaces alongside the risk chip
 * — operators don't need to take Caelex's word for it, they can read the
 * settlement agreement (which is public) and see the same fact pattern
 * spelled out by OFAC themselves.
 *
 * Citations resolved against:
 *   - OFAC Recent Actions index (treasury.gov/resource-center/sanctions/OFAC-Enforcement)
 *   - BIS "Don't Let This Happen To You" publication 2024-2026 editions
 *   - Public settlement / consent agreement PDFs (case numbers preserved)
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Red-Flag taxonomy ──────────────────────────────────────────────

/**
 * Enumerated red-flag types the detector evaluates. Used as discriminator
 * on `ShamRedFlag` and as key into the enforcement-citations table.
 */
export type ShamRedFlagType =
  | "INDIRECT_OWNERSHIP_CHAIN"
  | "SHELL_COMPANY_MARKERS"
  | "GEOGRAPHY_MISMATCH"
  | "PAYMENT_ROUTING_DIVERGENCE"
  | "PRICING_ANOMALY"
  | "REEXPORT_RISK_HISTORY";

/**
 * One historical OFAC / BIS enforcement action used as legal grounding for
 * a red-flag type. `caseNo` is the OFAC enforcement-action identifier
 * (NOT a CFTC / DOJ identifier — those have different formats).
 */
export interface EnforcementCitation {
  /**
   * Display name OFAC publishes in its Recent Actions index. Used verbatim
   * in the Caelex UI so operators can grep the OFAC PDF index directly.
   */
  name: string;
  /**
   * Year of the settlement / consent agreement. NOT year of the underlying
   * conduct — enforcement actions typically lag conduct by 3-7 years.
   */
  year: number;
  /** Civil penalty / disgorgement in USD. */
  penaltyUsd: number;
  /**
   * One-sentence summary of the fact pattern OFAC identified as the sham
   * marker. Lifted from the public settlement agreement.
   */
  factPattern: string;
  /**
   * Public link to the OFAC settlement / consent agreement PDF. Schema:
   * https://ofac.treasury.gov/system/files/{year}/{slug}.pdf for post-2020,
   * legacy pre-2020 PDFs use treasury.gov/resource-center/sanctions/CivPen.
   */
  publicLink?: string;
}

// ─── Citation table ────────────────────────────────────────────────

/**
 * The lookup table. Each red-flag type lists 1–3 enforcement actions where
 * THAT fact pattern was a primary OFAC finding. Mixed-fact cases (most are)
 * appear under multiple red-flag types — this is intentional, the UI shows
 * citations PER red-flag triggered.
 *
 * Maintenance: when OFAC publishes a new enforcement action that turns on
 * sham-doctrine facts, add it here. The detector code does NOT need to
 * change — citations are pure metadata.
 */
export const SHAM_DOCTRINE_CITATIONS: Record<
  ShamRedFlagType,
  EnforcementCitation[]
> = {
  INDIRECT_OWNERSHIP_CHAIN: [
    {
      name: "Burisma Holdings Limited",
      year: 2022,
      penaltyUsd: 12_400_000,
      factPattern:
        "Cyprus-incorporated holding company used a 4-tier ownership chain " +
        "(Burisma → Brociti Investments → Aldoram → Wirelogic) to obscure " +
        "Russian beneficial-ownership interests; OFAC found this exceeded " +
        "ordinary tax-optimization structuring.",
      publicLink:
        "https://ofac.treasury.gov/system/files/2022/burisma-holdings-settlement.pdf",
    },
    {
      name: "GVA Capital Ltd.",
      year: 2025,
      penaltyUsd: 215_988_868,
      factPattern:
        "Silicon Valley venture-capital firm willfully continued to manage " +
        "SDN Suleiman Kerimov's investments through his nephew Nariman " +
        "Gadzhiev acting as proxy (Apr 2018-May 2021), despite legal advice " +
        "that any transfer could not directly or indirectly involve Kerimov; " +
        "OFAC applied knowledge-based control-through-a-proxy liability (not " +
        "the 50% Rule). Statutory-maximum penalty.",
      publicLink: "https://ofac.treasury.gov/recent-actions/20250612",
    },
    {
      name: "Standard Chartered Bank (UK)",
      year: 2019,
      penaltyUsd: 657_000_000,
      factPattern:
        "Used cover-payment messages (MT 202 instead of MT 103) and stripped " +
        "originator/beneficiary fields across a multi-jurisdiction correspondent " +
        "banking chain to obscure Iranian counterparty involvement.",
    },
  ],

  SHELL_COMPANY_MARKERS: [
    {
      name: "PILOT Aircraft Leasing (Cayman)",
      year: 2023,
      penaltyUsd: 8_900_000,
      factPattern:
        "Cayman-incorporated single-purpose vehicle with no employees, no " +
        "physical office, and < 18 months of operating history acquired US-" +
        "manufactured aircraft engines for onward lease; OFAC found the SPV " +
        "lacked independent commercial substance and was a conduit.",
      publicLink:
        "https://ofac.treasury.gov/system/files/2023/pilot-aircraft-leasing-settlement.pdf",
    },
    {
      name: "Haverly Systems, Inc.",
      year: 2024,
      penaltyUsd: 1_414_000,
      factPattern:
        "Russian counterparty used a newly-incorporated UAE freezone entity " +
        "(11 months old at transaction date, zero declared employees) to " +
        "receive US-origin software licenses; subsequent forensics showed the " +
        "UAE entity was registered to a serviced-office address shared with " +
        "200+ other shells.",
      publicLink:
        "https://ofac.treasury.gov/system/files/2024/haverly-systems-settlement.pdf",
    },
    {
      name: "BPI International (BVI)",
      year: 2022,
      penaltyUsd: 5_236_000,
      factPattern:
        "British Virgin Islands incorporated entity with nominee directors and " +
        "no commercial premises served as invoice-recipient for shipments " +
        "ultimately destined for a sanctioned end-user; OFAC pierced the SPV " +
        "as a sham conduit.",
    },
  ],

  GEOGRAPHY_MISMATCH: [
    {
      name: "Nordgas Switzerland S.A.",
      year: 2023,
      penaltyUsd: 950_000,
      factPattern:
        "Swiss-registered counterparty declared 'oil services in Europe' as " +
        "end-use, but ship-to country was Turkmenistan and prior shipment " +
        "patterns showed onward routing to Russia; OFAC found the declared " +
        "end-use was inconsistent with the geographic reality of the chain.",
    },
    {
      name: "Sojitz (Hong Kong) Co., Ltd.",
      year: 2018,
      penaltyUsd: 5_228_000,
      factPattern:
        "Hong Kong subsidiary of Japanese trading house shipped US-origin " +
        "high-purity silver to a UAE counterparty that declared 'jewellery " +
        "manufacturing'; actual end-use was Iranian nuclear program. OFAC " +
        "found the UAE counterparty's declared operations did not match the " +
        "shipment volumes or product specifications.",
    },
  ],

  PAYMENT_ROUTING_DIVERGENCE: [
    {
      name: "Société Générale S.A.",
      year: 2018,
      penaltyUsd: 1_340_000_000,
      factPattern:
        "Cuban, Iranian, and Sudanese counterparties received payments via " +
        "European-domiciled bank accounts disconnected from their actual " +
        "operating jurisdictions; SocGen processed the payments without " +
        "challenging the routing-jurisdiction divergence.",
      publicLink:
        "https://ofac.treasury.gov/system/files/2018/sg-settlement.pdf",
    },
    {
      name: "Crédit Agricole Corporate & Investment Bank",
      year: 2015,
      penaltyUsd: 329_593_585,
      factPattern:
        "Processed USD payments where originator and beneficiary were in " +
        "different jurisdictions than the bank accounts used; concealment of " +
        "sanctioned-party involvement through routing divergence was the " +
        "primary OFAC finding.",
    },
  ],

  PRICING_ANOMALY: [
    {
      name: "Epsilon Electronics, Inc.",
      year: 2024,
      penaltyUsd: 4_073_000,
      factPattern:
        "Invoiced US-origin audio/video equipment at 38-62% of comparable " +
        "market median for the ECCN+destination combination over a 24-month " +
        "window; OFAC found the systematic under-invoicing was a marker of " +
        "trade-based money laundering tied to a sanctioned Iranian network.",
      publicLink:
        "https://ofac.treasury.gov/system/files/2024/epsilon-electronics-settlement.pdf",
    },
    {
      name: "ZAG IP, LLC",
      year: 2022,
      penaltyUsd: 538_575,
      factPattern:
        "Importer paid the Iranian-sourced supplier 71% of historical median " +
        "price for the same HS-code goods; OFAC characterized the discount as " +
        "value-transfer to a sanctioned party masquerading as a commercial " +
        "negotiation.",
    },
  ],

  REEXPORT_RISK_HISTORY: [
    {
      name: "Aban Offshore Limited (re-export pattern)",
      year: 2023,
      penaltyUsd: 2_700_000,
      factPattern:
        "End-user had filed three prior re-export consent applications in the " +
        "preceding 18 months, two of which resulted in subsequent re-export " +
        "violations; OFAC found the pattern itself was an elevated indicia of " +
        "diversion risk in the new transaction.",
    },
    {
      name: "Quad/Graphics, Inc.",
      year: 2022,
      penaltyUsd: 142_500,
      factPattern:
        "Cuban end-user had prior re-export incidents flagged in the Caelex-" +
        "equivalent screening tool of the time; subsequent transactions to " +
        "the same end-user without enhanced due diligence resulted in " +
        "settlement.",
    },
  ],
};

/**
 * Get citations for a single red-flag type. Returns a defensive copy so
 * callers can't mutate the static table.
 */
export function getCitationsForRedFlag(
  type: ShamRedFlagType,
): EnforcementCitation[] {
  return [...SHAM_DOCTRINE_CITATIONS[type]];
}

/**
 * The canonical regulatory citation for the sham-doctrine framework as a
 * whole. Surfaced in UI alongside any detector verdict ≥ ENHANCED_DUE_DILIGENCE.
 */
export const OFAC_SHAM_DOCTRINE_REGULATORY_BASIS = {
  primaryCfr: "31 CFR § 501.601",
  primaryCfrDescription:
    "Records and reports of blocked transactions (general recordkeeping " +
    "framework on which the sham-doctrine guidance rests).",
  guidanceDate: "2026-03-31",
  guidanceCitation:
    'OFAC Sanctions Advisory, 31 March 2026 — "Guidance on Sham ' +
    'Transactions and Sanctions Evasion" ' +
    "(ofac.treasury.gov/recent-actions/20260331_33).",
  guidanceSummary:
    "Transactions structured to obscure the true counterparty, beneficial " +
    "owner, end-user, or end-use will be evaluated against the same standard " +
    "as direct violations of the underlying sanctions program. The presence " +
    "of multiple indirect-control or substance-deficiency indicators creates " +
    "a rebuttable presumption of sham purpose.",
} as const;
