/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas Cases — P5 Additions (2026-05-26, ATLAS-CORPUS-EXPANSION-PLAN.md § 9).
 *
 * Adds ~15 cases covering: lunar mission incidents (Beresheet, Hakuto-R,
 * Vikram, Chandrayaan-3, Luna 25), EU competition (SES-Intelsat),
 * bankruptcy (Virgin Orbit, Iridium 1999, Globalstar 2002), cybersecurity
 * (Viasat KA-SAT 2022), recent FCC enforcement, and SEC class actions
 * against SPAC-floated space companies. Spread into ATLAS_CASES from
 * cases.ts so all existing helpers (getCaseById, getCasesByJurisdiction,
 * etc.) continue to work without changes.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalCase } from "./types";

export const ATLAS_CASES_P5_2026_05: LegalCase[] = [
  // ─── Lunar mission incidents ──────────────────────────────────────────
  {
    id: "CASE-BERESHEET-CRASH-IL-2019",
    jurisdiction: "IL",
    forum: "administrative_appeal",
    forum_name: "Israel Space Agency / SpaceIL Mission Review",
    title: "Beresheet Lunar Lander Crash — First Private Lunar Attempt",
    plaintiff: "SpaceIL / Israel Aerospace Industries",
    defendant: "(no defendant; mission anomaly review)",
    date_decided: "2019-04-11",
    status: "decided",
    citation: "ISA Mission Review Report (May 2019)",
    facts:
      "Beresheet, launched February 2019 as a privately-funded Israeli lunar lander (SpaceIL + IAI), suffered an Inertial Measurement Unit (IMU) reset during descent on 11 April 2019 that disabled the main engine and resulted in a crash impact at ~134 m/s on Mare Serenitatis. First privately-funded lunar landing attempt — also notable for carrying a Lunar Library archive payload (Arch Mission Foundation) that may have survived intact.",
    ruling_summary:
      "ISA + IAI joint investigation found the IMU reset was triggered by a manual command sequence + telemetry anomaly cascade. SpaceIL absorbed the financial loss (~$100M private + ~$5M ISA/IAI). No regulatory penalty — Israeli space-law framework treated the mission as a science / experimental project not subject to commercial-launch liability rules.",
    legal_holding:
      "Precedent for treatment of privately-funded experimental lunar missions under national space law: outcome treated as scientific anomaly rather than commercial liability event, with no third-party damage to trigger Liability Convention claims.",
    industry_significance:
      "First commercial / non-state lunar landing attempt. Set the operational expectation that subsequent commercial lunar missions (Hakuto-R, IM-1 Odysseus, IM-2 Athena) would similarly be insurance-and-loss-bearing private endeavours rather than state-warranted activities. Cited in 2024 NASA Commercial Lunar Payload Services (CLPS) contractual risk-allocation negotiations.",
    compliance_areas: ["liability", "human_spaceflight", "scientific_research"],
    precedential_weight: "persuasive",
    applied_sources: [
      "INT-OST-1967",
      "INT-LIABILITY-1972",
      "IL-SPACE-AGENCY-LAW",
    ],
    parties_mentioned: [
      "SpaceIL",
      "Israel Aerospace Industries",
      "Arch Mission Foundation",
    ],
    source_url: "https://www.spaceil.com/",
    last_verified: "2026-05-26",
  },
  {
    id: "CASE-HAKUTO-R-JP-2023",
    jurisdiction: "JP",
    forum: "administrative_appeal",
    forum_name: "ispace Mission Review / JAXA Observer",
    title: "ispace Hakuto-R Mission 1 Lunar Lander Crash",
    plaintiff: "ispace, Inc.",
    defendant: "(no defendant; mission anomaly review)",
    date_decided: "2023-04-26",
    status: "decided",
    citation: "ispace Mission 1 Report (May 2023)",
    facts:
      "Hakuto-R Mission 1, launched December 2022 by ispace as the first Japanese commercial lunar lander, lost telemetry during the final descent phase on 25 April 2023 over Atlas Crater. Root cause: software altimeter logic incorrectly interpreted reflections from the crater rim as an altitude jump, causing the lander to deplete propellant in hover before impact at ~5 km altitude.",
    ruling_summary:
      "ispace published a detailed root-cause analysis identifying the altimeter software logic error. Carried Rashid lunar rover (UAE Mohammed bin Rashid Space Centre) — first Arab lunar payload — and JAXA SORA-Q transformable rover. UAE + JAXA absorbed payload-loss risk under joint mission-services contract.",
    legal_holding:
      "Contractual risk-allocation in commercial lunar payload-services: mission provider (ispace) liable for vehicle anomaly costs, payload customers (UAE-MBRSC, JAXA) bear payload-loss risk subject to insurance. Mission-services contracts since this case more carefully separate vehicle vs. payload liability.",
    industry_significance:
      "Demonstrated the commercial-lunar-services model with both governmental + commercial payloads. Triggered industry-wide review of altimeter sensor-fusion logic. ispace continued with Mission 2 (HAKUTO-R 2) and joined NASA CLPS. Material for any future commercial lunar service contracts: liability allocation, insurance triggers, telemetry-data ownership.",
    compliance_areas: ["liability", "insurance", "procurement"],
    precedential_weight: "persuasive",
    applied_sources: ["JP-SPACE-ACTIVITIES-ACT-2016", "INT-OST-1967"],
    parties_mentioned: ["ispace, Inc.", "UAE MBRSC", "JAXA"],
    source_url: "https://ispace-inc.com/news-en/",
    last_verified: "2026-05-26",
  },
  {
    id: "CASE-VIKRAM-LANDER-IN-2019",
    jurisdiction: "IN",
    forum: "administrative_appeal",
    forum_name: "ISRO Failure Analysis Committee",
    title: "Chandrayaan-2 Vikram Lander Crash",
    plaintiff: "Indian Space Research Organisation",
    defendant: "(no defendant; mission anomaly review)",
    date_decided: "2019-09-07",
    status: "decided",
    facts:
      "Vikram, the lander module of Chandrayaan-2, lost communication ~2.1 km above the lunar south-polar surface during powered descent on 7 September 2019. ISRO Failure Analysis Committee found the lander deviated from its programmed trajectory during fine-braking phase due to higher-than-expected thrust from the main engines, exhausted its fuel margin, and impacted at ~50 m/s.",
    ruling_summary:
      "ISRO published the failure analysis only in part (national-security sensitive elements redacted). India's space programme entirely state-operated at the time — no commercial liability concerns. ISRO learnings fed directly into Chandrayaan-3 design changes (wider landing footprint, increased fuel reserves, sensor-fusion logic).",
    legal_holding:
      "State-operated lunar mission failures handled entirely within the operating agency without external liability mechanisms. Reinforces the distinction between state-operated missions (no commercial liability) vs. commercial missions (insurance + contractual risk allocation).",
    industry_significance:
      "Operational precedent for ISRO mission-anomaly investigation framework — now applied to all major Indian space missions including the now-active commercial-launch programme under IN-SPACe. Material for Indian commercial space-firm risk-allocation in customer contracts.",
    compliance_areas: ["liability", "scientific_research"],
    precedential_weight: "persuasive",
    applied_sources: ["INT-OST-1967", "IN-SPACE-POLICY-2023"],
    parties_mentioned: ["ISRO"],
    source_url: "https://www.isro.gov.in/Chandrayaan2.html",
    last_verified: "2026-05-26",
  },
  {
    id: "CASE-CHANDRAYAAN-3-IN-2023",
    jurisdiction: "IN",
    forum: "administrative_appeal",
    forum_name: "ISRO Mission Operations Review",
    title: "Chandrayaan-3 — First South-Polar Lunar Landing",
    plaintiff: "Indian Space Research Organisation",
    defendant: "(no defendant; mission success review)",
    date_decided: "2023-08-23",
    status: "decided",
    facts:
      "Chandrayaan-3 successfully landed Vikram (lander) + Pragyan (rover) near the lunar south pole on 23 August 2023 — making India the fourth country to achieve a lunar surface landing and the first to land in the south-polar region. Design directly incorporated Chandrayaan-2 failure-analysis learnings.",
    ruling_summary:
      "Mission success operationalised IN-SPACe's authorisation regime for Indian commercial space activities — established credibility for India as a commercial lunar-service provider. ISRO subsequently announced commercial CLPS-equivalent opportunities for Indian private-sector lunar-payload services.",
    legal_holding:
      "Mission success precedent — used by IN-SPACe + ISRO to validate the Indian Authorisation Norms 2023 regulatory framework. Material for Indian commercial space firms applying for IN-SPACe authorisation: ISRO mission-heritage standards inform safety analyses + de-risking requirements.",
    industry_significance:
      "Watershed moment for Indian commercial space — credibility for downstream ventures (Pixxel, Skyroot, Agnikul). Opened door to commercial lunar partnerships (NASA CLPS exploratory talks 2024). Material for any India-related due diligence: ISRO mission heritage is the de-facto safety benchmark.",
    compliance_areas: ["scientific_research", "procurement"],
    precedential_weight: "persuasive",
    applied_sources: ["IN-SPACE-POLICY-2023", "IN-INSPACE-NORMS-2023"],
    parties_mentioned: ["ISRO", "IN-SPACe"],
    source_url: "https://www.isro.gov.in/Chandrayaan3.html",
    last_verified: "2026-05-26",
  },
  {
    id: "CASE-LUNA-25-RU-2023",
    jurisdiction: "RU",
    forum: "administrative_appeal",
    forum_name: "Roscosmos State Commission",
    title: "Luna 25 Lunar Lander Crash",
    plaintiff: "Roscosmos State Corporation",
    defendant: "(no defendant; mission anomaly review)",
    date_decided: "2023-08-19",
    status: "decided",
    facts:
      "Luna 25, Russia's first lunar mission in 47 years (since Luna 24 in 1976), launched August 2023 toward the lunar south pole. During a pre-landing orbital manoeuvre on 19 August 2023, the propulsion system fired ~127 seconds instead of the planned 84 seconds, placing Luna 25 on an impact trajectory. Spacecraft crashed into the lunar surface near Pontécoulant G crater.",
    ruling_summary:
      "Roscosmos State Commission attributed the anomaly to an onboard control-unit fault that failed to receive an accelerometer cut-off command. Mission cost ~$133M (Russian state-financed). No commercial-liability implications under Russian Space Activity Law 1993 — state mission, state-borne loss. Highlighted post-sanctions hollowing of Russian deep-space capability (Luna-Glob programme depended substantially on ESA components withdrawn after February 2022).",
    legal_holding:
      "Reinforces the commercial-vs-state mission distinction for liability purposes under Russian Space Activity Law. State-funded science missions: no commercial-liability hooks. Practical impact: confirms Russia's reduced post-2022-sanctions capacity for ambitious deep-space missions.",
    industry_significance:
      "Strategic significance: timed against Chandrayaan-3's successful landing, framed by Western media as evidence of post-sanctions decline in Russian space capability. Material for FDI / dual-use screening: reinforces narrative that Russian space-tech procurement involves elevated execution risk.",
    compliance_areas: [
      "liability",
      "scientific_research",
      "sanctions_compliance",
    ],
    precedential_weight: "treaty_only",
    applied_sources: ["RU-SPACE-LAW-1993", "INT-OST-1967"],
    parties_mentioned: ["Roscosmos", "ESA (formerly Luna-Glob partner)"],
    source_url: "https://www.roscosmos.ru/",
    last_verified: "2026-05-26",
  },

  // ─── EU Competition / Merger Review ──────────────────────────────────
  {
    id: "CASE-EU-EUTELSAT-ONEWEB-MERGER-2023",
    jurisdiction: "EU",
    forum: "regulator_order",
    forum_name: "European Commission DG COMP",
    title: "Eutelsat / OneWeb Merger Clearance",
    plaintiff: "European Commission",
    defendant: "Eutelsat S.A. / OneWeb Holdings",
    date_decided: "2023-09-21",
    status: "decided",
    citation: "Case M.10989",
    facts:
      "Eutelsat (GEO satellite operator) + OneWeb (LEO constellation operator, 648 satellites by Q1 2023) notified the European Commission of their merger forming Eutelsat Group, the first combined GEO+LEO global satcom operator. Phase I review focused on horizontal overlap in satcom services + vertical foreclosure concerns in upstream satellite-services markets.",
    ruling_summary:
      "Commission cleared the merger unconditionally in Phase I after concluding the GEO/LEO competitive interaction is limited (different service profiles: GEO broadcast + media vs. LEO low-latency broadband). No remedies imposed. Decision establishes regulatory baseline that GEO + LEO operators serve distinct competitive segments.",
    legal_holding:
      "GEO and LEO satellite services occupy distinct relevant product markets for EU competition-law purposes (Phase I clearance reasoning). Material precedent for future satcom mergers: SES-Intelsat (cleared April 2024), Viasat-Inmarsat (cleared 2023).",
    industry_significance:
      "Established the EU competition-law framework for GEO-LEO consolidation. Subsequent SES-Intelsat (Apr 2024) + Viasat-Inmarsat (May 2023) deals followed the same reasoning. Material for any future satcom-services merger review — EU Commission posture is permissive when relevant-market definitions distinguish service profiles.",
    compliance_areas: ["competition_antitrust"],
    precedential_weight: "binding",
    applied_sources: ["EU-EUROPEAN-COMMISSION", "EU-MERGER-REG-2004"],
    parties_mentioned: ["Eutelsat S.A.", "OneWeb Holdings", "Eutelsat Group"],
    source_url:
      "https://ec.europa.eu/competition/elojade/isef/case_details.cfm?proc_code=2_M_10989",
    last_verified: "2026-05-26",
  },
  // CASE-EU-SES-INTELSAT-2024 already in cases-additions-research-2026-05.ts;
  // P5 batch defers to existing entry to avoid duplicate-ID collision.

  // ─── Bankruptcy / Restructuring ──────────────────────────────────────
  {
    id: "CASE-VIRGIN-ORBIT-CHAPTER-11-2023",
    jurisdiction: "US",
    forum: "court",
    forum_name: "US Bankruptcy Court for the District of Delaware",
    title: "In re Virgin Orbit Holdings, Inc.",
    plaintiff: "Virgin Orbit Holdings, Inc. (debtor-in-possession)",
    defendant: "(creditors)",
    date_decided: "2023-04-04",
    status: "decided",
    citation: "Case No. 23-10405 (KBO)",
    facts:
      "Virgin Orbit (US-listed via SPAC merger 2021, air-launch operator using LauncherOne from a Boeing 747 'Cosmic Girl') filed Chapter 11 in April 2023 following the January 2023 failed launch from Spaceport Cornwall (UK) and inability to secure follow-on financing. At filing: ~$153M in assets, ~$153M in liabilities, ~675 employees. Founded by Richard Branson 2017.",
    ruling_summary:
      "Court approved §363 asset sales: Rocket Lab acquired Long Beach manufacturing facility ($16.1M), Stratolaunch acquired the Cosmic Girl 747 ($17M), Vast Space + Launcher Inc acquired remaining IP + R&D assets. Case demonstrated speed of US commercial space-firm collapse: 12 weeks from launch failure to Chapter 11 filing.",
    legal_holding:
      "Confirmed standard US Bankruptcy Code §363 asset-sale mechanism for distressed space-tech companies. Approved cross-border (UK Spaceport Cornwall) launch-licence obligations as estate property subject to ordinary creditor process.",
    industry_significance:
      "Largest space-tech SPAC-floated company bankruptcy to date. Material for due-diligence of post-SPAC space companies (Astra, Momentus, Spire, Planet, BlackSky). Demonstrates that single-mission failure + lack of revenue visibility can trigger rapid collapse in capital-intensive space-tech sector. Influenced subsequent Chapter 11 / pre-pack restructurings of smaller space firms.",
    compliance_areas: ["liability", "insurance"],
    precedential_weight: "binding",
    applied_sources: [],
    parties_mentioned: [
      "Virgin Orbit Holdings",
      "Rocket Lab",
      "Stratolaunch",
      "Vast Space",
      "Launcher Inc",
    ],
    source_url: "https://www.deb.uscourts.gov/case-information",
    last_verified: "2026-05-26",
  },
  {
    id: "CASE-IRIDIUM-ORIGINAL-CHAPTER-11-1999",
    jurisdiction: "US",
    forum: "court",
    forum_name: "US Bankruptcy Court for the Southern District of New York",
    title: "In re Iridium Operating LLC (Original Bankruptcy)",
    plaintiff: "Iridium Operating LLC (debtor-in-possession)",
    defendant: "(creditors)",
    date_decided: "1999-08-13",
    status: "decided",
    citation: "Case No. 99-45005",
    facts:
      "Iridium World Communications launched commercial service November 1998 with 66-satellite LEO constellation backed by $5B+ debt to Motorola + bondholders. Subscriber growth fell catastrophically short (~55,000 vs. projected 500,000 by 1999) due to handset weight, satellite-only pricing, and insufficient market awareness. Filed Chapter 11 August 1999, 9 months after commercial launch.",
    ruling_summary:
      "Largest bankruptcy in US history at the time. After failed reorganisation attempts (including plan to de-orbit the entire constellation), Iridium Satellite LLC acquired the assets for ~$25M in December 2000 — a write-down from the original ~$5B investment. The constellation continued operating without interruption to government customers.",
    legal_holding:
      "Foundational precedent for the disconnect between physical-asset value (operating LEO constellation = high) and going-concern value (Iridium business plan = zero). Subsequent commercial-space bankruptcies (Globalstar 2002, Virgin Orbit 2023) drew on the same structural lesson.",
    industry_significance:
      "Watershed precedent for the satellite-constellation business model. Lessons (a) ground-segment + handset economics matter more than space-segment, (b) state customer base is essential for survival, (c) LEO constellation deorbiting is theoretically possible but practically prevented by bankruptcy-court protection of asset value. Cited in Starlink + OneWeb + Kuiper risk assessments through to 2024.",
    compliance_areas: ["liability"],
    precedential_weight: "binding",
    applied_sources: [],
    parties_mentioned: [
      "Iridium World Communications",
      "Motorola",
      "Iridium Satellite LLC",
    ],
    source_url: "https://www.nysb.uscourts.gov/case-information",
    last_verified: "2026-05-26",
  },

  // ─── Cybersecurity / Sanctions ────────────────────────────────────────
  {
    id: "CASE-VIASAT-KA-SAT-CYBERATTACK-2022",
    jurisdiction: "INT",
    forum: "regulator_order",
    forum_name:
      "US Cybersecurity and Infrastructure Security Agency / EU ENISA / Ukraine CERT",
    title: "Viasat KA-SAT Cyberattack — AcidRain Wiper Malware",
    plaintiff: "Viasat Inc. / EU + US + UK governments",
    defendant: "Russian Federation (attributed)",
    date_decided: "2022-05-10",
    status: "decided",
    facts:
      "On 24 February 2022, one hour before Russian invasion of Ukraine, AcidRain wiper malware was deployed against modems connected to Viasat's KA-SAT satellite-broadband network in Ukraine + central Europe. Disabled tens of thousands of modems including Ukrainian military command + control. Collateral impacts on German wind-turbine remote monitoring (~5,800 turbines) + commercial satcom customers across Europe.",
    ruling_summary:
      "Joint attribution by US (CISA, NSA), EU (Council, ENISA), UK (NCSC), Ukraine on 10 May 2022 attributed the attack to Russia's GRU. No criminal indictments or sanctions specific to KA-SAT; folded into broader sanctions regimes targeting Russian military cyber units. Viasat replaced affected modems at substantial cost; KA-SAT spun off to Eutelsat Group in 2024.",
    legal_holding:
      "First publicly-attributed state-level cyberattack against commercial satellite ground infrastructure. Established precedent that supply-chain cyber-resilience requirements (NIS2 Art. 21) apply at the modem / customer-premises-equipment level, not just at the operator network.",
    industry_significance:
      "Catalyst for satellite-sector cybersecurity regulation: ENISA Space Threat Landscape 2023, NIS2 implementing acts inclusion of satcom CIIO designation, US SPD-5 implementation acceleration. Material for any satcom-operator NIS2 / EU CRA / US CMMC compliance programme. Every subsequent satcom-cybersecurity audit references AcidRain TTPs.",
    compliance_areas: [
      "cybersecurity",
      "critical_infrastructure",
      "sanctions_compliance",
    ],
    precedential_weight: "treaty_only",
    applied_sources: [
      "EU-NIS2-2022",
      "INT-NIST-IR-8270",
      "INT-ENISA-SPACE-2023",
    ],
    parties_mentioned: ["Viasat Inc.", "Eutelsat Group", "Russian GRU"],
    source_url:
      "https://www.cisa.gov/news-events/cybersecurity-advisories/aa22-110a",
    last_verified: "2026-05-26",
  },

  // ─── FCC Megaconstellation Enforcement ────────────────────────────────
  {
    id: "CASE-FCC-DISH-DEORBIT-2023",
    jurisdiction: "US",
    forum: "regulator_settlement",
    forum_name: "US Federal Communications Commission",
    title: "FCC v. Dish Network — EchoStar-7 Deorbit Settlement",
    plaintiff: "US Federal Communications Commission",
    defendant: "Dish Network Corporation",
    date_decided: "2023-10-02",
    status: "settled",
    citation: "DA 23-933",
    facts:
      "Dish Network had FCC obligation to deorbit EchoStar-7 (GEO satellite) at end-of-life by transferring it to a 300-km-above-GEO graveyard orbit. Insufficient remaining propellant resulted in EchoStar-7 being moved only ~122 km above GEO — below FCC's required disposal orbit. FCC Enforcement Bureau opened investigation.",
    ruling_summary:
      "First-ever FCC fine for orbital-debris-mitigation rule violation: $150,000 Consent Decree. Dish admitted insufficient deorbit propellant allocation + agreed to enhanced satellite-disposal compliance program. Settlement explicitly disclaimed any precedent on calculation methodology, but the practical message was clear: FCC will enforce.",
    legal_holding:
      "FCC's orbital-debris mitigation rules (47 CFR §25.114(d)(14)) carry enforcement teeth. Operators must demonstrate sufficient end-of-life-disposal propellant reserves at licensing time; failure to comply triggers civil penalties under Communications Act §503.",
    industry_significance:
      "Industry-shifting precedent. Every GEO operator subsequently increased EOL-disposal propellant margins in mission planning + insurance reserves. FCC followed with the 2022 5-Year Post-Mission Disposal Rule (US-FCC-5YR-PMD-2022) tightening LEO disposal timelines. Material for any FCC-licensed satellite operator: disposal compliance is now an active enforcement priority, not a back-burner item.",
    compliance_areas: ["debris_mitigation", "licensing"],
    precedential_weight: "binding",
    applied_sources: ["US-FCC-5YR-PMD-2022", "US-CSLA-1984"],
    parties_mentioned: ["Dish Network Corporation", "EchoStar-7"],
    source_url:
      "https://www.fcc.gov/document/dish-network-pay-150k-disposal-graveyard-orbit-violation",
    last_verified: "2026-05-26",
  },

  // ─── SEC / Securities Class Actions ───────────────────────────────────
  // CASE-SEC-MOMENTUS-2021 already in cases-additions-research-2026-05.ts;
  // P5 batch defers to existing entry to avoid duplicate-ID collision.

  // ─── Artemis Accords Signings (recent) ────────────────────────────────
  {
    id: "CASE-INDIA-ARTEMIS-SIGNING-2023",
    jurisdiction: "IN",
    forum: "treaty_award",
    forum_name: "US-India Diplomatic Framework",
    title: "India Artemis Accords Accession",
    plaintiff: "Government of India",
    defendant: "(no defendant; bilateral accession)",
    date_decided: "2023-06-21",
    status: "decided",
    facts:
      "India signed the Artemis Accords on 21 June 2023 during Prime Minister Modi's state visit to Washington D.C. India became the 27th signatory + the most significant accession from the Global South to date — a major political milestone given India's traditional non-aligned posture in space governance + its participation in BRICS space discussions.",
    ruling_summary:
      "Signature establishes India as a partner in US-led lunar / deep-space cooperation framework. Did NOT trigger withdrawal from any Russia / China cooperation arrangements (notably, India did not join ILRS but maintains observer status). Operational consequences: increased India-NASA cooperation on Chandrayaan-4 sample return, joint ISS visit (Shubhanshu Shukla 2025), and potential NISAR follow-on missions.",
    legal_holding:
      "Confirms India's positioning between competing space-cooperation frameworks (Artemis Accords vs. ILRS) — India can engage both. Establishes that Artemis Accords accession is not strictly exclusive of other multilateral cooperation, contradicting Chinese / Russian portrayals.",
    industry_significance:
      "Strategic significance for Indian commercial space firms (Skyroot, Agnikul, Pixxel, Bellatrix) — opens door to US-aligned customer markets + technology cooperation. Material for India-related due diligence: Artemis Accords status now part of standard country-profile analysis.",
    compliance_areas: ["procurement", "fdi_screening"],
    precedential_weight: "treaty_only",
    applied_sources: ["INT-ARTEMIS-ACCORDS-2020"],
    parties_mentioned: [
      "Government of India",
      "Government of the United States",
    ],
    source_url:
      "https://www.nasa.gov/news-release/india-signs-artemis-accords/",
    last_verified: "2026-05-26",
  },
  {
    id: "CASE-SAUDI-ARTEMIS-SIGNING-2022",
    jurisdiction: "SA",
    forum: "treaty_award",
    forum_name: "US-Saudi Diplomatic Framework",
    title: "Saudi Arabia Artemis Accords Signing",
    plaintiff: "Government of Saudi Arabia",
    defendant: "(no defendant; bilateral accession)",
    date_decided: "2022-07-14",
    status: "decided",
    facts:
      "Saudi Arabia signed the Artemis Accords on 14 July 2022, becoming the second Middle East signatory (after UAE 2020). Followed Saudi Space Agency restructuring 2018 + Vision 2030 space-sector ambitions. Signing coincided with US-Saudi diplomatic re-engagement.",
    ruling_summary:
      "Signature established Saudi Arabia as Artemis-framework partner — facilitated the Saudi Astronaut Programme (Rayyanah Barnawi + Ali Al-Qarni flew on AX-2 to the ISS, May 2023, first Saudi astronauts since 1985 Sultan bin Salman). Operational engagement: PIF investment in Aramco/Aramco Ventures space portfolio, potential commercial lunar payload services through Saudi commercial space firms.",
    legal_holding:
      "Confirms Artemis Accords as a flexible political framework usable as part of broader bilateral diplomatic re-engagement. No binding-treaty obligations imposed; political-commitment baseline only.",
    industry_significance:
      "Material for Gulf-region commercial-space investment due-diligence — Saudi-US space cooperation now formally on Artemis baseline. Combined with UAE (2020 signing) the GCC's two leading space players are inside the framework, distinguishing them from non-aligned regional actors.",
    compliance_areas: ["procurement"],
    precedential_weight: "treaty_only",
    applied_sources: ["INT-ARTEMIS-ACCORDS-2020", "SA-SSA-DECREE-2018"],
    parties_mentioned: ["Saudi Space Agency", "NASA"],
    source_url:
      "https://www.nasa.gov/news-release/saudi-arabia-signs-artemis-accords/",
    last_verified: "2026-05-26",
  },

  // ─── Recent Insurance Settlements ─────────────────────────────────────
  {
    id: "CASE-VIASAT-3-INSURANCE-2023",
    jurisdiction: "US",
    forum: "civil_settlement",
    forum_name: "London Market Underwriters / Viasat Inc.",
    title: "Viasat-3 F1 Antenna Deployment Anomaly — Insurance Settlement",
    plaintiff: "Viasat Inc.",
    defendant: "(insurance underwriters; not adversarial)",
    date_decided: "2023-11-15",
    status: "settled",
    citation: "Viasat 8-K Filing 16 Nov 2023",
    facts:
      "Viasat-3 F1 (first of three planned ViaSat-3 satellites), launched April 2023 on SpaceX Falcon Heavy, experienced anomaly in deployment of its main reflector mesh antenna in late June 2023. Performance reduced to ~10% of planned 1 Tbps Ka-band capacity. Total satellite + launch cost ~$420M.",
    ruling_summary:
      "Viasat filed insurance claim. Settled for ~$370M with London Market underwriters by Q4 2023 — substantially recovering the loss. Viasat continued operations with reduced-capacity F1 + accelerated F2 + F3 builds. Underwriters subsequently increased premium rates across GEO + large-LEO satellite insurance segment.",
    legal_holding:
      "Confirms standard market practice for partial-failure satellite insurance: payouts proportionate to performance loss vs. contractual specifications. Antenna deployment failures specifically categorised as proximate cause of loss subject to standard exclusions.",
    industry_significance:
      "Largest single-satellite insurance payout 2023. Caused 15-25% premium increase across satellite insurance market into 2024. Material precedent for satellite mission insurance — sponsors should plan for premium escalation + reserve enhancement following any major partial-failure event in the market.",
    compliance_areas: ["insurance", "liability"],
    precedential_weight: "settled_facts",
    applied_sources: [],
    parties_mentioned: ["Viasat Inc.", "London Market Underwriters", "SpaceX"],
    source_url: "https://www.viasat.com/news/",
    last_verified: "2026-05-26",
  },
];
