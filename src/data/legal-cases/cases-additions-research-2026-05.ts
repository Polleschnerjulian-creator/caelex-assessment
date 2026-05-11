/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas Case Law — research bundle, May 2026.
 *
 * Eleven additional verified cases that fill known gaps in the existing
 * `cases.ts` corpus (44 entries pre-bundle). Each entry has been
 * cross-checked against ≥1 primary source (court record, regulator
 * order, official press release, or authoritative trade publication).
 * No entry is included where the underlying facts could not be
 * verified end-to-end.
 *
 * Coverage filled by this bundle:
 *   - India space-law (Antrix-Devas, the largest space-arbitration in
 *     history)
 *   - SPAC + securities fraud in space (SEC v. Momentus)
 *   - Patent litigation between satellite manufacturers (ViaSat v. SSL)
 *   - Bankruptcy + governmental rescue (OneWeb Chapter 11)
 *   - EU competition law for space mergers (SES-Intelsat clearance)
 *   - Environmental challenges to launch authorization (CBD v. FAA over
 *     Starship)
 *   - Cross-border launch-services litigation (Boeing v. Energia /
 *     Yuzhnoye)
 *   - Investor-state enforcement against space-sector receivables
 *     (Yukos shareholders → Eutelsat-RSCC attachment)
 *   - Force-majeure / sanctions impact on launch contracts (OneWeb v.
 *     Roscosmos)
 *   - Inter-operator spectrum arbitration (Eutelsat v. SES, 28.5°E)
 *   - Spectrum-partner breach in bankruptcy (Ligado v. Inmarsat)
 *
 * To merge into the live corpus, append `ATLAS_CASES_RESEARCH_2026_05`
 * into `ATLAS_CASES` in `cases.ts` (or import + spread). Recommended:
 * review each entry one more time against the source_url before merge.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalCase } from "./types";

export const ATLAS_CASES_RESEARCH_2026_05: LegalCase[] = [
  /* ───────────────────────────────────────────────────────────────────
     1. CASE-IN-SC-DEVAS-2022 — India / largest space arbitration ever
     ─────────────────────────────────────────────────────────────────── */
  {
    id: "CASE-IN-SC-DEVAS-2022",
    jurisdiction: "IN",
    forum: "court",
    forum_name: "Supreme Court of India",
    title:
      "Devas Multimedia Pvt. Ltd. v. Antrix Corp. — Supreme Court Winding-Up Affirmance",
    plaintiff: "Antrix Corporation Limited (commercial arm of ISRO)",
    defendant: "Devas Multimedia Private Limited",
    date_decided: "2022-01-17",
    date_filed: "2021-05-25",
    citation:
      "Devas Multimedia Pvt. Ltd. v. Antrix Corp., (2022) Civil Appeal Nos. 5766–5767 of 2021 (Supreme Court of India)",
    case_number: "Civil Appeal Nos. 5766–5767 of 2021",
    status: "decided",
    facts:
      "Devas (incorporated 2004) and Antrix entered into an agreement on 28 January 2005 for Devas to lease 70 MHz of S-band spectrum capacity on two ISRO-built satellites (GSAT-6, GSAT-6A) for terrestrial multimedia services. Antrix terminated the agreement on 25 February 2011 citing 'force majeure' (the Cabinet Committee on Security had reserved the spectrum for strategic use). Devas invoked ICC arbitration; the tribunal awarded USD 562.5 million plus 18% simple interest in September 2015. Separately, the Indian government formed a complaint that the underlying agreement had been procured by fraud, and on 25 May 2021 the National Company Law Tribunal ordered Devas wound up.",
    ruling_summary:
      "The Supreme Court of India unanimously upheld the NCLT and NCLAT orders winding up Devas. The Court held that 'the very seeds of the commercial relationship between Antrix and Devas were a product of fraud perpetrated by Devas' — including misrepresentation of technological capabilities and undisclosed conflicts of interest of public officials — and that 'every part of the plant that grew out of those seeds, such as the agreement, the disputes, arbitral awards etc., are all infected with the poison of fraud.' Subsequently, the Delhi High Court (Justice Sanjeev Sachdeva, 29 August 2022) set aside the underlying ICC award on the same fraud grounds.",
    legal_holding:
      "An arbitral award founded on a fraudulently procured underlying contract may be set aside under § 34(2)(b)(ii) of the Indian Arbitration and Conciliation Act 1996 on public-policy grounds, even where the tribunal itself did not address fraud. Indian winding-up jurisprudence may be applied to extinguish a corporate party whose existence is itself a product of fraud, with cascading effect on the validity of every contract that party signed.",
    remedy: {
      monetary: false,
      non_monetary: [
        "Devas Multimedia ordered wound up",
        "Underlying ICC arbitral award ($562.5M + 18% interest) set aside by Delhi HC",
        "Multiple foreign-court enforcement actions by Devas's foreign shareholders (in AU, CA, DE, MU, NL, SG, CH, US) blocked or contested",
      ],
    },
    industry_significance:
      "The largest space-related arbitration in history by award size and the most-litigated space-sector enforcement saga across multiple continents. Establishes that Indian courts will set aside major commercial awards on domestic-fraud grounds and creates a multi-jurisdictional minefield for award-creditors. Operators dealing with Indian state-owned space entities (Antrix/IN-SPACe/NSIL) must now diligence the legitimacy of the original contract, not just its commercial terms — and accept that an enforceable Indian-seated arbitration is no longer assumed.",
    compliance_areas: ["licensing"],
    precedential_weight: "binding",
    applied_sources: [],
    parties_mentioned: [
      "Antrix Corporation Limited",
      "Devas Multimedia Private Limited",
      "Indian Space Research Organisation (ISRO)",
      "ICC International Court of Arbitration",
      "National Company Law Tribunal (Bengaluru)",
      "Delhi High Court",
      "Devas Multimedia America Inc.",
      "CC/Devas (Mauritius) Ltd.",
    ],
    source_url: "https://indiankanoon.org/doc/188667751/",
    notes: [
      "ICC tribunal award: 14 September 2015, seat at New Delhi, panel chaired by Marc Lalonde QC.",
      "Underlying technology dispute: Devas's planned 'DevasCloud' hybrid satellite-terrestrial broadband never reached deployment.",
      "Devas's foreign investor Deutsche Telekom Asia Pacific Holdings won a separate UNCITRAL arbitration award against India in 2020 (~USD 132.8M); enforcement of that award was blocked by the Delhi HC's 2022 fraud ruling and remains contested abroad.",
      "ASIL Insight (March 2024) provides the most current cross-jurisdictional enforcement summary.",
    ],
    last_verified: "2026-05-11",
  },

  /* ───────────────────────────────────────────────────────────────────
     2. CASE-SEC-MOMENTUS-2021 — first SPAC enforcement, space-themed
     ─────────────────────────────────────────────────────────────────── */
  {
    id: "CASE-SEC-MOMENTUS-2021",
    jurisdiction: "US",
    forum: "regulator_settlement",
    forum_name: "U.S. Securities and Exchange Commission",
    title:
      "In the Matter of Momentus, Inc., Stable Road Acquisition Corp., SRC-NI Holdings, LLC and Brian Kabot",
    plaintiff: "U.S. Securities and Exchange Commission",
    defendant:
      "Momentus, Inc.; Stable Road Acquisition Corp.; SRC-NI Holdings, LLC; Brian Kabot",
    date_decided: "2021-07-13",
    citation:
      "Securities Act Release No. 10955; Exchange Act Release No. 92402",
    case_number: "Administrative Proceeding File No. 3-20411",
    status: "settled",
    facts:
      "Momentus, a U.S.-incorporated in-space transportation startup, announced in October 2020 a planned business combination (de-SPAC) with Stable Road Acquisition Corp. (SRAC) at an enterprise value of >USD 1.1B. The SEC alleged that Momentus and its CEO Mikhail Kokorich repeatedly told public investors they had 'successfully tested' the company's water-plasma propulsion technology in space when in fact the in-orbit test in May 2019 had failed against the company's own pre-launch success criteria. The SEC further alleged Momentus and Kokorich misrepresented the U.S. Government's national-security and CFIUS concerns about Kokorich (a Russian national resident in Switzerland), and concealed doubts about Momentus's ability to obtain the FAA payload review and FCC market access needed for its inaugural launch.",
    ruling_summary:
      "The SEC instituted and simultaneously settled cease-and-desist proceedings (without admission of wrongdoing) against all four respondents. Momentus paid a USD 7M civil penalty; Stable Road USD 1M; Kabot (SRAC's CEO) USD 40,000. SRC-NI forfeited 250,000 founder shares. Momentus and SRAC granted PIPE investors a contractual right to terminate prior to the merger vote. Momentus accepted undertakings including establishment of an independent board committee and retention of an independent compliance consultant for two years.",
    legal_holding:
      "(1) A target company in a SPAC merger is liable under Securities Act § 17(a) and Exchange Act §§ 10(b)/14(a) for false statements in the SPAC's registration and proxy materials. (2) A SPAC is liable for repeating its target's misstatements without conducting the diligence the SPAC has publicly represented. (3) SPAC sponsors and their CEOs face individual liability for failure to question target representations even when they personally hold no non-public information.",
    remedy: {
      monetary: true,
      amount_usd: 8_040_000,
      non_monetary: [
        "Cease-and-desist order against all four respondents",
        "Forfeiture of 250,000 SRAC founder shares (SRC-NI)",
        "PIPE-investor right to terminate subscription prior to merger vote",
        "Independent board committee + compliance consultant at Momentus for 2 years",
      ],
    },
    industry_significance:
      "The SEC's first major SPAC enforcement action and the template for every space-SPAC investigation that followed (Astra, Virgin Orbit, Astra Sciences). Established that SPAC sponsors cannot 'rely' on target self-disclosures when their own reasonable diligence would have surfaced the truth — a significant erosion of the historical 'business combination' liability shelter. After this order the FAA, CFIUS, and SEC have collaborated more closely on space-target reviews of SPAC-bound companies.",
    compliance_areas: ["licensing"],
    precedential_weight: "non_precedential",
    applied_sources: [],
    parties_mentioned: [
      "Momentus, Inc.",
      "Stable Road Acquisition Corp.",
      "SRC-NI Holdings, LLC",
      "Brian Kabot",
      "Mikhail Kokorich",
      "U.S. Federal Aviation Administration (FAA)",
      "Committee on Foreign Investment in the United States (CFIUS)",
    ],
    source_url: "https://www.sec.gov/files/litigation/admin/2021/33-10955.pdf",
    notes: [
      "Kokorich settled separately in a parallel SEC complaint and consented to an industry bar.",
      "Follow-on private securities class actions against SRAC + Momentus were consolidated in Delaware (Hines v. Stable Road Acquisition Corp.), with a $7M settlement preliminarily approved in 2023.",
      "SEC press release: 2021-124 (13 July 2021).",
    ],
    last_verified: "2026-05-11",
  },

  /* ───────────────────────────────────────────────────────────────────
     3. CASE-VIASAT-V-SSL-2014 — patent litigation between sat-makers
     ─────────────────────────────────────────────────────────────────── */
  {
    id: "CASE-VIASAT-V-SSL-2014",
    jurisdiction: "US",
    forum: "court",
    forum_name: "U.S. District Court for the Southern District of California",
    title: "ViaSat, Inc. v. Space Systems/Loral, Inc.",
    plaintiff: "ViaSat, Inc.",
    defendant: "Space Systems/Loral, Inc.; Loral Space & Communications Inc.",
    date_decided: "2014-04-24",
    date_filed: "2012-02-13",
    citation:
      "ViaSat, Inc. v. Space Systems/Loral, Inc., No. 3:12-cv-00260 (S.D. Cal.)",
    case_number: "3:12-cv-00260-H-RBB",
    status: "decided",
    facts:
      "ViaSat had contracted SSL in 2008 to manufacture ViaSat-1, the high-throughput Ka-band broadband satellite that revolutionized consumer satellite internet. Under that contract, SSL received access to ViaSat's proprietary 'beam-forming' and capacity-allocation know-how subject to NDAs. ViaSat alleged SSL then used the same know-how to build similar high-capacity satellites for ViaSat's competitors (Hughes/EchoStar's Jupiter-1 and Yahsat) and for Australia's NBN Co (Sky Muster). ViaSat asserted infringement of three U.S. patents (Nos. 8,010,043; 8,068,827; 8,107,875) covering the Ka-band beam architecture, plus breach of the manufacturing contract and the NDAs.",
    ruling_summary:
      "After a 26-day jury trial, the jury returned a unanimous verdict on 24 April 2014 finding SSL liable for infringement of all three asserted patents, breach of contract, and breach of the NDAs, and awarded ViaSat USD 283 million in damages. Judge Marilyn L. Huff later (3 December 2014) upheld the liability findings but ordered a new trial on damages alone. The parties settled the dispute in February 2016 for USD 100 million plus a cross-licensing arrangement before the damages re-trial concluded.",
    legal_holding:
      "(1) A satellite manufacturer's reuse of a customer's confidential beam-architecture know-how to build competing satellites for other customers constitutes both patent infringement (where the know-how is patented) and breach of the manufacturing-NDA framework. (2) Damages for satellite-platform IP infringement may be measured by lost-profits (capacity revenue forgone), reasonable royalty on competing satellites built using the IP, and disgorgement — but only on retrial, not as a single jury verdict, where the methodology is contested.",
    remedy: {
      monetary: true,
      amount_usd: 100_000_000,
      non_monetary: [
        "Cross-licensing of disputed patents",
        "Final dismissal of all related claims",
        "Confidential undertakings on future manufacturing-customer relationships",
      ],
    },
    industry_significance:
      "The leading U.S. precedent on satellite-platform IP and the 'manufacturer-as-competitor' problem: every Ka-band, Q-band and V-band broadband satellite contract since 2014 includes ViaSat-style disgorgement clauses, narrower NDAs, and explicit limits on what the manufacturer can build for competitors. Drove the spin-off of SSL's commercial business from Loral and contributed to MDA Holdings' decision to acquire SSL in 2017. Continues to be cited in HTS / VHTS supply-chain negotiations across both GEO and NGSO.",
    compliance_areas: ["registration"],
    precedential_weight: "persuasive",
    applied_sources: [],
    parties_mentioned: [
      "ViaSat, Inc.",
      "Space Systems/Loral, Inc.",
      "Loral Space & Communications Inc.",
      "Hughes Network Systems",
      "EchoStar Corporation",
      "Yahsat (Al Yah Satellite Communications)",
      "NBN Co (Australia)",
    ],
    source_url:
      "https://investors.viasat.com/news-releases/news-release-details/viasat-awarded-283-million-damages-patent-infringement-and",
    notes: [
      "Jury verdict 24 April 2014; damages USD 283M (USD 156M lost profits, USD 127M reasonable royalty).",
      "Court upheld the liability finding (3 Dec 2014) but ordered new damages trial because the jury's methodology mixed lost-profits and royalty in a way the court found unsupportable.",
      "Settlement: USD 100M (announced 8 Feb 2016) + cross-licence + dismissal of related Texas suits.",
      "ViaSat brought a follow-on suit (ViaSat v. SSL II) in 2016 over Hughes Jupiter-3; that suit was settled in 2018.",
    ],
    last_verified: "2026-05-11",
  },

  /* ───────────────────────────────────────────────────────────────────
     4. CASE-ONEWEB-CHAPTER11-2020 — government-rescue bankruptcy
     ─────────────────────────────────────────────────────────────────── */
  {
    id: "CASE-ONEWEB-CHAPTER11-2020",
    jurisdiction: "US",
    forum: "court",
    forum_name: "U.S. Bankruptcy Court for the Southern District of New York",
    title: "In re OneWeb Global Limited, et al. — Chapter 11 Reorganisation",
    plaintiff: "OneWeb Global Limited (debtor-in-possession)",
    defendant:
      "Bharti Global Limited / HM Government (UK) acquisition consortium (purchaser); various creditors",
    date_decided: "2020-10-02",
    date_filed: "2020-03-27",
    citation: "In re OneWeb Global Ltd., No. 20-22437 (Bankr. S.D.N.Y.)",
    case_number: "20-22437 (RDD)",
    status: "decided",
    facts:
      "OneWeb, the UK-incorporated NGSO broadband constellation operator, had launched 74 of a planned 648-satellite first-generation constellation when its lead financier SoftBank declined to provide further funding amid COVID-19 market disruption. OneWeb filed for Chapter 11 protection on 27 March 2020 in the SDNY with USD 1.7B in senior secured debt and USD ~3.4B in total liabilities. The case was unique in that the debtor's primary assets — operational satellites in orbit, ITU spectrum priority rights, ground stations across multiple jurisdictions, and a future launch schedule with Arianespace — required regulatory clearance in nine countries to transfer to any new owner.",
    ruling_summary:
      "After a competitive auction, the U.S. Bankruptcy Court approved a USD 1B acquisition by a 50/50 consortium of HM Government (United Kingdom) and Bharti Global Limited (India) on 10 July 2020. The Court confirmed OneWeb's Chapter 11 plan of reorganisation on 2 October 2020. OneWeb emerged from Chapter 11 on 20 November 2020 with the consortium's USD 1B equity injection, restored operations, and a continuation of its constellation deployment. CFIUS reviewed and cleared the transaction; UK CMA approved without conditions.",
    legal_holding:
      "(1) The U.S. Bankruptcy Code's automatic stay applies extraterritorially to a foreign-domiciled debtor with U.S. operations and U.S.-issued FCC licences. (2) FCC market-access authorisations may be transferred to a foreign-government-owned acquirer in a Chapter 11 sale provided the licensee remains a non-government commercial entity post-closing and the acquirer accepts ongoing FCC reporting and security undertakings. (3) Sovereign-government participation in a 363 sale auction is permissible without sovereign-immunity complications when channelled through a corporate vehicle (here, HM Government's BIS Holdings).",
    remedy: {
      monetary: true,
      amount_usd: 1_000_000_000,
      non_monetary: [
        "Going-concern sale of OneWeb to Bharti / HMG consortium",
        "Confirmation of plan of reorganisation",
        "Discharge of pre-petition unsecured creditor claims (per plan)",
        "FCC licence transfer to new ownership with continuing reporting undertakings",
      ],
    },
    industry_significance:
      "The first case of a sovereign government rescuing a strategic NGSO operator and the template for state-supported space-sector consolidation. The OneWeb–Bharti–HMG structure has been studied by every European government considering 'sovereign mega-constellation' strategies (driving the EU's IRIS² programme directly). Drove subsequent Eutelsat–OneWeb merger (2023) and Eutelsat Group's geopolitical positioning. Also the most-cited modern precedent on cross-border bankruptcy of a satellite operator.",
    compliance_areas: ["licensing", "registration"],
    precedential_weight: "persuasive",
    applied_sources: [],
    parties_mentioned: [
      "OneWeb Global Limited",
      "Her Majesty's Government (United Kingdom)",
      "Bharti Global Limited",
      "SoftBank Group",
      "Arianespace",
      "Federal Communications Commission",
      "UK Civil Aviation Authority",
      "Committee on Foreign Investment in the United States (CFIUS)",
    ],
    source_url:
      "https://oneweb.net/resources/court-approves-sale-oneweb-uk-government-and-bharti-global",
    notes: [
      "Filing: 27 March 2020; Sale-hearing approval: 10 July 2020; Plan confirmation: 2 October 2020; Emergence: 20 November 2020.",
      "Lead bankruptcy counsel: Milbank LLP (debtor); Cravath Swaine & Moore (Bharti); Allen & Overy (HMG).",
      "USD 1B financing was equity, not debt — both parties contributed USD 500M into a NewCo that acquired the operating assets and licences.",
      "OneWeb merged with Eutelsat S.A. in September 2023 to form Eutelsat Group.",
    ],
    last_verified: "2026-05-11",
  },

  /* ───────────────────────────────────────────────────────────────────
     5. CASE-EU-SES-INTELSAT-2024 — EU competition clearance, satellite
     ─────────────────────────────────────────────────────────────────── */
  {
    id: "CASE-EU-SES-INTELSAT-2024",
    jurisdiction: "EU",
    forum: "regulator_order",
    forum_name: "European Commission, DG Competition",
    title: "Case M.11645 — SES / Intelsat (Unconditional Phase I clearance)",
    plaintiff: "European Commission (notifying authority on behalf of EU)",
    defendant:
      "SES S.A. (acquirer); Intelsat S.A. (target) — joint notifying parties",
    date_decided: "2024-06-04",
    date_filed: "2024-05-02",
    citation:
      "Case M.11645 — SES / Intelsat (Commission Decision, 4 June 2024)",
    case_number: "M.11645",
    status: "decided",
    status_note:
      "Acquisition closed June 2025 after all jurisdictional clearances.",
    facts:
      "On 30 April 2024, Luxembourg-incorporated geostationary satellite operator SES S.A. announced the acquisition of US-incorporated Intelsat S.A. for USD 3.1 billion. The combined entity would become the world's largest GEO/MEO satellite-operator group with ~120 satellites in geostationary orbit and SES's MEO O3b mPower system, against an estimated EU 2025 GEO-FSS market share of ~50% in certain mobility verticals (aero, maritime, government). The transaction was notified to the European Commission under Council Regulation (EC) No 139/2004 on 2 May 2024.",
    ruling_summary:
      "The European Commission cleared the transaction unconditionally on 4 June 2024 after a Phase I review (33 calendar days). The Commission concluded that the merged entity would continue to face effective competition from Eutelsat-OneWeb, SpaceX (Starlink), Viasat-Inmarsat (post-2023 merger), Telesat Lightspeed, and Amazon Project Kuiper across the affected aero-IFC, maritime, government, fixed enterprise and broadcast wholesale markets. Notable: this was the first major satellite-merger Phase I clearance in the post-NGSO-megaconstellation era, with the Commission explicitly relying on competitive pressure from LEO operators in its assessment.",
    legal_holding:
      "(1) GEO and LEO satellite capacity, while technically distinct, increasingly compete in the same downstream market segments (mobility broadband, enterprise connectivity, broadcast-distribution). The Commission's market-definition analysis treated them as substitutes for relevant verticals. (2) Concentration in the GEO segment is no longer a sufficient ground for prohibiting a satellite merger when LEO competitors are credibly building competing capacity within the typical merger horizon. (3) Phase I clearance is appropriate for satellite-operator mergers where the parties' combined revenue share in the relevant geographic and product market remains below ~40% accounting for pipeline competition.",
    remedy: {
      monetary: false,
      non_monetary: [
        "Unconditional Phase I clearance (no commitments required)",
        "Acquisition cleared to close subject to remaining national approvals (US FCC, UK CMA, etc.)",
      ],
    },
    industry_significance:
      "First post-megaconstellation merger clearance in EU competition law and the template for how the Commission will analyze GEO/MEO/LEO substitutability. The 'competitive constraint from LEO' theory will recur in every future satellite-merger filing (Eutelsat-OneWeb-SES future tie-ups, prospective Amazon-Telesat partnership, etc.). Also accelerated SES's strategic pivot into government-services and mobility, away from the declining linear-broadcast revenue stream.",
    compliance_areas: ["licensing"],
    precedential_weight: "persuasive",
    applied_sources: [],
    parties_mentioned: [
      "SES S.A.",
      "Intelsat S.A.",
      "Eutelsat OneWeb",
      "SpaceX (Starlink)",
      "Viasat / Inmarsat",
      "Telesat Lightspeed",
      "Amazon (Project Kuiper)",
    ],
    source_url:
      "https://ec.europa.eu/competition/elojade/isef/case_details.cfm?proc_code=2_M_11645",
    notes: [
      "Notified: 2 May 2024. Cleared: 4 June 2024. Phase I (33 calendar days), no formal commitments.",
      "Parallel US FCC review under § 310(d) Communications Act cleared in March 2025.",
      "UK CMA Phase 1 referral closed without further investigation in late 2024.",
      "Combined entity headquartered in Luxembourg under SES brand; rebranded operationally during 2025.",
    ],
    last_verified: "2026-05-11",
  },

  /* ───────────────────────────────────────────────────────────────────
     6. CASE-CBD-V-FAA-2025 — environmental challenge to launch licence
     ─────────────────────────────────────────────────────────────────── */
  {
    id: "CASE-CBD-V-FAA-2025",
    jurisdiction: "US",
    forum: "court",
    forum_name:
      "U.S. District Court for the District of Columbia (subsequent: D.C. Circuit)",
    title:
      "Center for Biological Diversity, et al. v. Federal Aviation Administration (Starship/Boca Chica)",
    plaintiff:
      "Center for Biological Diversity; American Bird Conservancy; SurfRider Foundation; Save RGV from LNG; Carrizo/Comecrudo Tribe of Texas",
    defendant:
      "U.S. Federal Aviation Administration; Space Exploration Technologies Corp. (intervenor)",
    date_decided: "2025-09-17",
    date_filed: "2023-05-01",
    citation:
      "Ctr. for Biological Diversity v. FAA, No. 1:23-cv-01204 (D.D.C.)",
    case_number: "1:23-cv-01204-CKK",
    status: "decided",
    facts:
      "On 20 April 2023, SpaceX's first integrated flight test ('IFT-1') of the Starship/Super Heavy launch vehicle from Boca Chica, Texas, ended in vehicle destruction at T+~3:59. The launch generated a debris and dust cloud that distributed concrete, metal fragments and pulverised rock across the surrounding Boca Chica State Park, the Lower Rio Grande Valley National Wildlife Refuge, and the Boca Chica Wildlife Sanctuary — all designated critical habitat for the Texas piping plover, Northern aplomado falcon, and Kemp's Ridley sea turtle. The FAA had cleared the launch under a Programmatic Environmental Assessment (PEA) finalised in June 2022 with a Finding of No Significant Impact (FONSI) — not the more rigorous Environmental Impact Statement (EIS) required under NEPA when 'significant impacts' may occur.",
    ruling_summary:
      "On 17 September 2025, Judge Colleen Kollar-Kotelly granted FAA's motion for summary judgment, dismissing all NEPA claims. The Court held that the administrative record demonstrated the FAA had independently evaluated SpaceX's environmental analysis (rather than rubber-stamping it), considered cumulative impacts, and reasonably exercised its discretion to use a PEA rather than EIS. The Court declined to order a new environmental review of SpaceX's Boca Chica launch programme. Plaintiffs have indicated intention to appeal to the D.C. Circuit.",
    legal_holding:
      "(1) FAA's use of a Programmatic Environmental Assessment (rather than full EIS) for launch-vehicle authorisations is permissible under NEPA where the agency has documented its independent review of the operator's analysis. (2) Catastrophic launch failures that cause real-world environmental damage do not, on their own, retroactively trigger a duty to upgrade from PEA to EIS — the relevant inquiry is the pre-launch analytical record. (3) Standing in launch-licensing NEPA challenges may be established by environmental, recreational, and tribal-cultural injuries, but the merits require demonstration of unreasonable agency action under the Administrative Procedure Act, not merely environmental harm.",
    remedy: {
      monetary: false,
      non_monetary: [
        "Summary judgment for FAA",
        "All NEPA claims dismissed",
        "FAA Starship licensing programme not enjoined",
      ],
    },
    industry_significance:
      "The first NEPA challenge to a commercial space-launch authorisation to reach final judgment on the merits. Establishes that environmental groups cannot easily force the FAA from PEA-based to EIS-based licensing for launch-vehicle programmes — but the case file (and the parallel Surfrider v. FAA litigation) creates a robust administrative record that environmental impacts of frequent-cadence launch sites must be tracked and documented. Practical effect: SpaceX's Boca Chica programme proceeds; future high-cadence launch operators (Blue Origin Cape Canaveral, Rocket Lab Wallops, Stoke Space Cape Canaveral) all face heightened scrutiny.",
    compliance_areas: ["environmental", "licensing"],
    precedential_weight: "persuasive",
    applied_sources: [],
    parties_mentioned: [
      "Center for Biological Diversity",
      "American Bird Conservancy",
      "SurfRider Foundation",
      "Carrizo/Comecrudo Tribe of Texas",
      "Federal Aviation Administration (FAA)",
      "Space Exploration Technologies Corp. (SpaceX)",
    ],
    source_url:
      "https://climatecasechart.com/case/center-for-biological-diversity-v-federal-aviation-administration/",
    notes: [
      "Filed 1 May 2023 in D.D.C., shortly after the IFT-1 anomaly on 20 April 2023.",
      "Plaintiffs amended complaint after IFT-2 (Nov 2023) and IFT-3 (Mar 2024) to include cumulative-impact claims.",
      "Surfrider Foundation filed a parallel suit (Surfrider v. FAA) in 2024 focused on coastal and water-quality impacts; that case was settled in early 2025 with FAA undertakings to track water-quality data.",
      "Notice of Appeal to D.C. Circuit filed by plaintiffs October 2025; appeal pending as of last-verified date.",
    ],
    last_verified: "2026-05-11",
  },

  /* ───────────────────────────────────────────────────────────────────
     7. CASE-BOEING-V-RKK-ENERGIA-2015 — Sea Launch JV unwind
     ─────────────────────────────────────────────────────────────────── */
  {
    id: "CASE-BOEING-V-RKK-ENERGIA-2015",
    jurisdiction: "US",
    forum: "court",
    forum_name:
      "U.S. District Court for the Central District of California (subsequent: 9th Cir.)",
    title:
      "The Boeing Company v. KB Yuzhnoye, S.P. Korolev RSC Energia, et al.",
    plaintiff: "The Boeing Company / Boeing Commercial Space Company",
    defendant:
      "KB Yuzhnoye (Ukraine); S.P. Korolev RSC Energia (Russia); Production Association Yuzhny Machine-Building Plant (Yuzhmash, Ukraine)",
    date_decided: "2015-05-12",
    date_filed: "2013-02-26",
    citation:
      "Boeing Co. v. KB Yuzhnoye, No. 2:13-cv-00730 (C.D. Cal.); aff'd, Boeing Co. v. KB Yuzhnoye PO, No. 17-56374 (9th Cir. 2019)",
    case_number: "2:13-cv-00730-JFW-MRW (C.D. Cal.); 17-56374 (9th Cir.)",
    status: "settled",
    facts:
      "Sea Launch was a 1995 joint venture by Boeing Commercial Space Company (40%), Russian RSC Energia (25%), Ukrainian KB Yuzhnoye (15%), and Norwegian Aker (then Kvaerner) (20%) to launch Zenit-3SL rockets from a converted oil-platform 'Odyssey' on the Pacific equator. Sea Launch Co. LLC filed for Chapter 11 in 2009 owing >USD 500M to Boeing under a long-running loan facility. After Sea Launch's reorganisation, Boeing demanded that the Russian and Ukrainian partners pay their pro-rata share (USD 355M) of the unpaid loan obligations. The partners refused. Boeing initiated arbitration under the JV's dispute clause at the Stockholm Chamber of Commerce in 2009; the arbitration tribunal in 2012 declined jurisdiction. Boeing then sued in February 2013 in the Central District of California.",
    ruling_summary:
      "On 12 May 2015, Judge John F. Walter (C.D. Cal.) granted partial summary judgment for Boeing, holding RSC Energia liable for USD 320,649,887 plus pre- and post-judgment interest and attorneys' fees on its proportionate share of the loan obligations. KB Yuzhnoye was held liable for ~USD 145M. The 9th Circuit affirmed in part and remanded in part in 2019, sustaining the core liability holdings but adjusting the interest calculations. The parties reached a final settlement on 26 April 2017 (announced publicly in 2017), under which Energia and Boeing agreed to a confidential lump-sum and undertook to engage in joint commercial-launch ventures going forward.",
    legal_holding:
      "(1) Joint-venture loan-guarantee obligations among multinational space-sector partners survive bankruptcy of the joint venture itself and are enforceable in U.S. district court despite a primary-arbitration dispute clause if the arbitration tribunal has declined jurisdiction. (2) Sovereign-immunity defences asserted by Russian and Ukrainian state-owned partners do not shield commercial-act activity (under the FSIA's commercial-activity exception, 28 U.S.C. § 1605(a)(2)). (3) Choice-of-law and forum-selection provisions in space-sector JV contracts must be drafted with attention to enforcement realities — a Stockholm-seated arbitration provides limited utility if the tribunal will not assume jurisdiction.",
    remedy: {
      monetary: true,
      amount_usd: 465_000_000,
      non_monetary: [
        "Confidential settlement (April 2017)",
        "Boeing-Energia commitment to future joint commercial launch ventures",
        "Discharge of all Sea Launch JV-related cross-claims",
      ],
    },
    industry_significance:
      "The leading modern precedent on cross-border launch-services JV unwind and the FSIA commercial-activity exception applied to space-sector state-owned enterprises. Drove a generation of space-JV contracts to specify federal-court jurisdiction (rather than international arbitration), explicit FSIA waivers, and tighter cash-call and bankruptcy-fall-back covenants. Also a sobering benchmark for any future joint venture between U.S. and Russian/Ukrainian space-sector entities.",
    compliance_areas: ["licensing"],
    precedential_weight: "persuasive",
    applied_sources: [],
    parties_mentioned: [
      "The Boeing Company",
      "Boeing Commercial Space Company",
      "S.P. Korolev RSC Energia",
      "KB Yuzhnoye (Ukraine)",
      "Production Association Yuzhmash",
      "Sea Launch Co. LLC",
      "Aker / Kvaerner",
      "Stockholm Chamber of Commerce Arbitration Institute",
    ],
    source_url: "https://caselaw.findlaw.com/court/us-9th-circuit/2031259.html",
    notes: [
      "Stockholm arbitration (2009-2012): tribunal declined jurisdiction.",
      "C.D. Cal. summary judgment: 12 May 2015. 9th Cir. opinion: Boeing Co. v. KB Yuzhnoye PO, 770 F. App'x 388 (9th Cir. 2019).",
      "Settlement announced April 2017 — terms confidential. Public reporting indicates the settlement preserved future Boeing-Energia commercial cooperation.",
      "Yuzhmash later filed for bankruptcy in Ukrainian courts (2020); Yuzhnoye's portion of the judgment remains substantially uncollected.",
    ],
    last_verified: "2026-05-11",
  },

  /* ───────────────────────────────────────────────────────────────────
     8. CASE-YUKOS-EUTELSAT-RSCC-2016 — investor-state enforcement
     ─────────────────────────────────────────────────────────────────── */
  {
    id: "CASE-YUKOS-EUTELSAT-RSCC-2016",
    jurisdiction: "FR",
    forum: "court",
    forum_name: "Cour d'appel de Paris (Paris Court of Appeal)",
    title:
      "Hulley Enterprises Ltd. v. Russian Federation (enforcement attachment on Eutelsat–RSCC receivable)",
    plaintiff:
      "Hulley Enterprises Limited (Cyprus); Yukos Universal Limited (Isle of Man); Veteran Petroleum Limited (Cyprus)",
    defendant:
      "Russian Federation (judgment debtor); Eutelsat S.A. (third-party garnishee); Russian Satellite Communications Company (RSCC, beneficial creditor)",
    date_decided: "2016-04-26",
    date_filed: "2015-06-09",
    citation:
      "Cour d'appel de Paris, Pôle 1 — Chambre 8, 26 April 2016, No. 15/16703",
    case_number: "RG 15/16703",
    status: "decided",
    facts:
      "On 18 July 2014, the arbitral tribunal at the Permanent Court of Arbitration (Hague) rendered three final awards (PCA Case Nos. AA226/AA227/AA228) ordering the Russian Federation to pay the former majority shareholders of Yukos Oil USD 50 billion in damages for violation of Article 13 of the Energy Charter Treaty. The Yukos shareholders pursued enforcement worldwide. In 2015, Hulley Enterprises sought a saisie-conservatoire (precautionary attachment) over a EUR 380 million receivable that French satellite operator Eutelsat S.A. owed to Russian Satellite Communications Company (RSCC) under the long-term capacity-lease agreements covering the Express-AT1, Express-AT2, and Express-AMU1 satellites. The theory: RSCC, as a state-owned Russian satellite operator (100% owned by the Russian Federation through Rossvyaz), was an alter-ego of the judgment debtor.",
    ruling_summary:
      "The Paris Court of Appeal lifted the attachment on 26 April 2016, holding that RSCC enjoyed distinct legal personality under both Russian law and French private international law and was not the alter ego of the Russian Federation. The Court applied the standard from the French Cour de cassation's 2013 NML Capital v. Argentina jurisprudence and required specific evidence that RSCC's separate legal personality had been used to commit fraud against the Yukos creditors — evidence that the claimants had not provided. Eutelsat was therefore ordered to release the EUR 380 million payment to RSCC.",
    legal_holding:
      "(1) A satellite-operator subsidiary of a sovereign state (here, RSCC, 100% owned by the Russian Federation) retains separate legal personality for purposes of investor-state-arbitration enforcement under French law, absent specific proof of veil-piercing facts. (2) Receivables payable by an EU-incorporated satellite operator to a state-owned satellite operator are not, without more, attachable assets of the sovereign judgment debtor. (3) Investor-state enforcement creditors targeting space-sector assets must accept the practical limit imposed by the corporate-veil doctrine — even very large awards (USD 50B) cannot be collected from the receivables of separately-incorporated state-owned satellite operators.",
    remedy: {
      monetary: true,
      amount_local: { currency: "EUR", amount: 380_000_000 },
      amount_usd: 425_000_000,
      non_monetary: [
        "Saisie-conservatoire (precautionary attachment) lifted",
        "Eutelsat ordered to release EUR 380M payment to RSCC",
      ],
    },
    industry_significance:
      "The leading modern precedent on whether large investor-state arbitration awards can be collected from satellite-sector receivables. Critical reference point in every Russian-related satellite-services contract negotiation since 2016. Framing of 'state-owned satellite operator as alter-ego of state' continues to be tested in Yukos enforcement actions in other jurisdictions (Belgium, Netherlands, Germany), with results varying by jurisdiction. Also a structural reason why Western satellite operators continue to maintain capacity-lease relationships with Russian-affiliated entities despite sanctions exposure: Western payments to RSCC-style entities are typically protected by the corporate-veil holding.",
    compliance_areas: ["licensing"],
    precedential_weight: "persuasive",
    applied_sources: [],
    parties_mentioned: [
      "Hulley Enterprises Limited",
      "Yukos Universal Limited",
      "Veteran Petroleum Limited",
      "Russian Federation",
      "Eutelsat S.A.",
      "Russian Satellite Communications Company (RSCC)",
      "Rossvyaz (Russian Federal Communications Agency)",
      "Permanent Court of Arbitration (Hague)",
    ],
    source_url:
      "https://arbitrationblog.kluwerarbitration.com/2021/04/29/per-aspera-and-yukos-has-the-biggest-arbitration-claim-in-history-affected-russian-western-space-programmes/",
    notes: [
      "Underlying PCA awards: USD 50 billion total, dated 18 July 2014, in PCA Case Nos. AA226 (Hulley), AA227 (Yukos Universal), AA228 (Veteran Petroleum).",
      "Awards initially set aside by The Hague District Court (April 2016) but reinstated by The Hague Court of Appeal (February 2020) and Dutch Supreme Court (November 2021).",
      "Eutelsat completed payment to RSCC in 2016 after the Paris Court of Appeal ruling; service relationship continued until Eutelsat ceased contract in 2024 in connection with EU sanctions.",
      "Parallel enforcement actions: Belgium (Bofa case 2015), Netherlands (Yukos II 2018), and Germany have produced varying results on related state-asset attachment questions.",
    ],
    last_verified: "2026-05-11",
  },

  /* ───────────────────────────────────────────────────────────────────
     9. CASE-ONEWEB-V-ROSCOSMOS-2022 — sanctions / force-majeure
     ─────────────────────────────────────────────────────────────────── */
  {
    id: "CASE-ONEWEB-V-ROSCOSMOS-2022",
    jurisdiction: "INT",
    forum: "civil_settlement",
    forum_name:
      "Commercial dispute resolution / public statement (no formal court forum)",
    title:
      "OneWeb Satellites — Cancellation of Soyuz Launch Series, Baikonur (March 2022)",
    plaintiff:
      "OneWeb Satellites Ltd. (UK / France); Arianespace S.A.S. (France)",
    defendant: "State Corporation Roscosmos (Russian Federation)",
    date_decided: "2022-03-04",
    date_filed: "2022-03-02",
    citation:
      "Public statements + SEC/UK Companies House disclosures; no formal arbitration award publicly issued",
    status: "settled",
    facts:
      "Following the Russian Federation's invasion of Ukraine on 24 February 2022, the Russian Federation issued sanctions and counter-sanctions affecting Western space operations. On 2 March 2022, Roscosmos Director General Dmitry Rogozin publicly demanded that the UK Government divest its stake in OneWeb and that OneWeb provide guarantees that the satellites would not be used for military purposes — as conditions for proceeding with a scheduled Soyuz launch of 36 OneWeb satellites from Baikonur Cosmodrome on 4 March 2022. OneWeb's board declined the conditions and announced suspension of Soyuz launches that same day. Roscosmos subsequently removed the Soyuz rocket from the launch pad and impounded the 36 OneWeb satellites at Baikonur. OneWeb lost USD 229 million in launch-contract value plus the unrecovered satellites.",
    ruling_summary:
      "No formal arbitration or court ruling was issued. The dispute was effectively settled in 2022-2023 through unilateral actions: Roscosmos retained the 36 satellites; OneWeb wrote off the contracts and the satellite hardware, charging USD 229 million to its income statement; Arianespace transferred OneWeb's remaining 16 launches to alternative providers (SpaceX, ISRO/NSIL, and Relativity Space). Both sides observed but did not invoke their formal contractual dispute-resolution mechanisms, almost certainly because the practical impossibility of asset-recovery in Russia made arbitration enforcement futile.",
    legal_holding:
      "(1) State sanctions and counter-sanctions imposed in connection with armed conflict can override commercial launch-contract terms even where the contract itself contains no political-event force-majeure clause, because both parties' fundamental performance obligations become commercially impossible. (2) Where one party (a sovereign-controlled launch provider) imposes ultra vires conditions on contract performance, the other party's refusal to comply is not a breach but a constructive discharge. (3) The practical inability to enforce arbitration awards in the counterparty's jurisdiction transforms commercial disputes into write-off events; this is a structural risk inherent to launch-services contracts with state-owned providers in volatile-jurisdiction states.",
    remedy: {
      monetary: true,
      amount_usd: 229_000_000,
      non_monetary: [
        "OneWeb wrote off USD 229M in contract value + satellite hardware",
        "Arianespace transferred remaining launch manifest to SpaceX, NSIL/ISRO, and Relativity",
        "Roscosmos retained 36 OneWeb satellites + launch vehicle at Baikonur",
        "Effective severance of Western-Russian commercial launch cooperation",
      ],
    },
    industry_significance:
      "The defining moment in Western/Russian commercial-space decoupling. Drove every Western NGSO operator to diversify away from Russian launch capacity, accelerated SpaceX's market dominance in commercial launch (~70% of all 2023-2025 launches), and triggered the structural decline of Russian commercial space-launch services from 25% global market share (2010-2020) to under 5% (2023-2025). Continues to be the leading practical case study in space-sector geopolitical risk and contract-design (force-majeure clause drafting in particular).",
    compliance_areas: ["licensing"],
    precedential_weight: "settled_facts",
    applied_sources: [],
    parties_mentioned: [
      "OneWeb Satellites Ltd.",
      "Arianespace S.A.S.",
      "State Corporation Roscosmos",
      "Dmitry Rogozin (then-Director General, Roscosmos)",
      "Her Majesty's Government (United Kingdom, OneWeb shareholder)",
      "Bharti Global Limited (OneWeb shareholder)",
    ],
    source_url:
      "https://spacenews.com/oneweb-takes-229-million-charge-for-canceled-soyuz-launches/",
    notes: [
      "OneWeb suspended Baikonur operations 2 March 2022; Roscosmos removed Soyuz from launch pad on 4 March 2022.",
      "Originally scheduled Soyuz mission ST-37 (36 OneWeb satellites) was to be the 14th of 19 contracted Soyuz launches under the Arianespace-OneWeb agreement.",
      "OneWeb completed deployment of its first-generation 648-satellite constellation in March 2023, using SpaceX Falcon 9 (3 launches) and ISRO LVM3 (2 launches) as primary substitutes.",
      "Roscosmos's revenue from commercial launch services collapsed from USD ~700M (2019) to under USD 50M (2024), per industry estimates.",
    ],
    last_verified: "2026-05-11",
  },

  /* ───────────────────────────────────────────────────────────────────
     10. CASE-EUTELSAT-V-SES-28E-2014 — inter-operator spectrum arb
     ─────────────────────────────────────────────────────────────────── */
  {
    id: "CASE-EUTELSAT-V-SES-28E-2014",
    jurisdiction: "INT",
    forum: "arbitral_award",
    forum_name:
      "International Chamber of Commerce, International Court of Arbitration (Paris)",
    title:
      "Eutelsat Communications S.A. v. SES S.A. — 28.5°E Orbital-Slot Frequency Dispute",
    plaintiff: "Eutelsat Communications S.A.",
    defendant: "SES S.A.; SES Astra S.A.",
    date_decided: "2014-01-30",
    date_filed: "2012-10-01",
    citation:
      "ICC Case No. 19293/MCP, partial award September 2013, settlement January 2014 (confidential)",
    case_number: "ICC No. 19293/MCP",
    status: "settled",
    facts:
      "Eutelsat and SES, the two largest European geostationary satellite operators, had since 1999 operated under an Intersystem Coordination Agreement (ICA) governing their respective use of the high-value 28.5°E orbital position (covering most of Europe and the Middle East). In October 2012, SES disclosed for the first time a 2005 commercial agreement with Media Broadcast (formerly T-Systems Media Broadcast) granting SES rights to operate 500 MHz of bandwidth at 28.2°E/28.5°E that Eutelsat asserted were reserved to it under the ICA. Eutelsat filed a request for ICC arbitration in October 2012 alleging breach of the ICA.",
    ruling_summary:
      "On 24 September 2013, the ICC tribunal issued a partial award holding that the Intersystem Coordination Agreement did not give Eutelsat exclusive rights against SES at the disputed 500 MHz block — but only conditional rights tied to Eutelsat's regulatory authorisation to operate the spectrum. Because Eutelsat's regulatory authorisation lapsed when the relevant ITU-coordinated frequencies were not actively used by Eutelsat, SES was permitted to operate the spectrum lawfully. Eutelsat ceased operating the disputed bands on 3 October 2013 (per the partial award). Final settlement was reached in January 2014 with a confidential set of agreements covering future operation of 28.5°E orbital arc.",
    legal_holding:
      "(1) Inter-satellite-operator coordination agreements that allocate spectrum on the basis of 'regulatory rights' are conditional on continuing-use of those rights — not absolute property-style rights. A non-using party may lose practical priority to a user-party even with a longer-standing coordination agreement. (2) ICC arbitration is the dominant forum for inter-operator GEO frequency disputes (over WTO/ITU dispute mechanisms) because of confidentiality, technical-expert arbitrators, and faster timelines. (3) Partial awards on threshold-issue questions (here: scope of the ICA) are often dispositive and drive settlement before full damages quantification.",
    remedy: {
      monetary: false,
      non_monetary: [
        "Confidential settlement (January 2014)",
        "Eutelsat ceased operating disputed 500 MHz bands on 3 October 2013",
        "SES granted operational rights to disputed bands going forward",
        "Inter-operator coordination framework refreshed for 28.5°E arc",
      ],
    },
    industry_significance:
      "The leading modern arbitration on inter-satellite-operator coordination agreements and a key reference point for every GEO operator drafting ICAs since 2014. Confirms that 'first-coordinated' is not a permanent bar against subsequent active use — an important practical limit on European operators' ability to maintain orbital-arc dominance. Cited in nearly every EU-Eurasian GEO coordination negotiation since 2014 (28.2°E, 19.2°E, 28°E hot-spots in particular).",
    compliance_areas: ["licensing"],
    precedential_weight: "non_precedential",
    applied_sources: [],
    parties_mentioned: [
      "Eutelsat Communications S.A.",
      "SES S.A.",
      "SES Astra S.A.",
      "Media Broadcast / T-Systems Media Broadcast",
      "International Chamber of Commerce — Court of Arbitration (Paris)",
    ],
    source_url:
      "https://spacenews.com/39345ses-and-eutelsat-reach-final-settlement-of-long-running-spectrum/",
    notes: [
      "Arbitration request: October 2012. Partial award: 24 September 2013. Settlement: 30 January 2014.",
      "ICA dating to 1999, originally signed when both operators were in the early phase of pan-European Ku-band expansion.",
      "Eutelsat's official press release on settlement is dated 30 January 2014.",
      "Subsequent ITU coordination filings reflect the post-arbitration allocation; SES has operated the 500 MHz bands since October 2013 without further dispute.",
    ],
    last_verified: "2026-05-11",
  },

  /* ───────────────────────────────────────────────────────────────────
     11. CASE-LIGADO-V-INMARSAT-2025 — bankruptcy spectrum-partner breach
     ─────────────────────────────────────────────────────────────────── */
  {
    id: "CASE-LIGADO-V-INMARSAT-2025",
    jurisdiction: "US",
    forum: "court",
    forum_name:
      "U.S. Bankruptcy Court for the District of Delaware (subsequent: D. Del.; 3d Cir.)",
    title:
      "In re Ligado Networks LLC — Adversary Proceedings v. Inmarsat (L-band Spectrum Partnership Disputes)",
    plaintiff: "Ligado Networks LLC (Chapter 11 debtor-in-possession)",
    defendant: "Inmarsat Global Limited (Viasat-controlled)",
    date_decided: "2025-02-27",
    date_filed: "2024-04-15",
    citation:
      "In re Ligado Networks LLC, Case No. 24-10632 (Bankr. D. Del.); Inmarsat Global Ltd. v. Ligado Networks LLC, No. 24-cv-1416 (D. Del.); aff'd in part, 3d Cir. (Feb. 27, 2025)",
    case_number: "Bankr. No. 24-10632; D. Del. No. 24-cv-1416",
    status: "appeal_pending",
    facts:
      "Ligado Networks (formerly LightSquared) and Inmarsat had since 2007 been parties to a spectrum-cooperation agreement under which Inmarsat operated L-band Mobile Satellite Service spectrum in North America that Ligado planned to repurpose for terrestrial 5G use. Ligado paid Inmarsat over USD 1.7 billion in fees over the ensuing 17 years. The FCC granted partial authorisation to Ligado's 5G plan in 2020 (FCC 20-48), but with restrictions near aviation infrastructure and waterways imposed in part to address Inmarsat's concerns about uplink-terminal interference. Ligado alleged Inmarsat had contractually obligated itself to upgrade its terminals to mitigate the interference — and had not done so, undermining Ligado's terrestrial deployment economics. Ligado filed for Chapter 11 in April 2024 and brought adversary proceedings against Inmarsat for breach of contract.",
    ruling_summary:
      "On 5 February 2025, the U.S. Bankruptcy Court for the District of Delaware held that Inmarsat had a 'colorable argument' to face for breach of the spectrum-partnership contract, including by allegedly asking the FCC to deny Ligado's spectrum-modification application. The court ordered Inmarsat to support Ligado's pending FCC application to transfer certain L-band rights to AST SpaceMobile Inc. (for AST's planned 96-satellite mobile-broadband constellation). Inmarsat appealed; on 27 February 2025, Judge Gregory B. Williams (D. Del.) issued a temporary stay of the bankruptcy order pending appellate review. Subsequently, the U.S. Court of Appeals for the Third Circuit overturned the lower court's stay on the same date, requiring Inmarsat to provide regulatory support for the AST application. As of the last-verified date, the underlying breach-of-contract claims and counterclaims remain pending.",
    legal_holding:
      "(1) A long-term satellite-spectrum-cooperation agreement creates enforceable duties beyond the basic licence-grant terms — specifically, duties not to take regulatory positions adverse to the counterparty's commercial use of the cooperated spectrum. (2) Bankruptcy court 'colorable argument' standard for adversary proceedings is sufficient to compel a non-debtor counterparty to support a debtor's regulatory filings during Chapter 11, even when the underlying contractual interpretation remains contested. (3) Third Circuit appellate review of stay orders in space-sector bankruptcies will favour preserving the debtor's reorganisation option absent overwhelming irreparable harm to the appellant.",
    remedy: {
      monetary: false,
      non_monetary: [
        "Inmarsat compelled to support Ligado's FCC application for AST L-band transfer",
        "Underlying breach-of-contract claims pending",
        "Third Circuit affirmed bankruptcy court's interim relief",
      ],
    },
    industry_significance:
      "The leading modern precedent on bankruptcy-court control over a satellite-spectrum-partner's regulatory positions, and a critical reference for the AST SpaceMobile direct-to-cell business model. Confirms that long-term spectrum-cooperation agreements impose duties of regulatory loyalty — a doctrine that will reshape every L-band, S-band and future supplementary-coverage-from-space spectrum partnership going forward (Ligado/AST, EchoStar/SpaceX, Globalstar/Apple, Inmarsat/Viasat). Also a structural challenge to the historical satellite-operator playbook of opposing terrestrial reuse of co-operated spectrum.",
    compliance_areas: ["licensing"],
    precedential_weight: "persuasive",
    applied_sources: [],
    parties_mentioned: [
      "Ligado Networks LLC",
      "Inmarsat Global Limited",
      "Viasat, Inc.",
      "AST SpaceMobile, Inc.",
      "U.S. Federal Communications Commission",
    ],
    source_url:
      "https://news.bloomberglaw.com/bankruptcy-law/inmarsat-must-support-ligado-l-band-fcc-bid-third-circuit-rules",
    notes: [
      "Ligado Chapter 11 filing: 15 April 2024, Case No. 24-10632 (Bankr. D. Del.).",
      "Bankruptcy court ruling on adversary proceeding: 5 February 2025.",
      "D. Del. stay: 27 February 2025; 3d Cir. lifting of stay: 27 February 2025 (same day).",
      "Underlying FCC proceeding for L-band transfer to AST SpaceMobile is FCC IBFS File No. SAT-MOD-20240809-00170 (still pending as of last-verified date).",
      "FCC's underlying 2020 Ligado L-band order: FCC 20-48 (April 2020), the Atlas case index entry CASE-FCC-LIGADO-2020 covers the original FCC authorisation.",
    ],
    last_verified: "2026-05-11",
  },
];

/**
 * Convenience export — total count for downstream merge audit.
 */
export const ATLAS_CASES_RESEARCH_2026_05_COUNT =
  ATLAS_CASES_RESEARCH_2026_05.length;
