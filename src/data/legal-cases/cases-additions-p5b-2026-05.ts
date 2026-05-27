/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas Cases — P5-bis Additions (2026-05-26).
 *
 * Second P5 wave focusing on 2023-2025 events: Starship FAA mishaps,
 * Polaris Dawn private EVA, ispace IM-1 (Odysseus tip-over), Galaxy-15
 * zombie satellite, FCC Amazon Kuiper milestone enforcement, ITU
 * Resolution 35 milestone-default precedents, AX-2/AX-3 private
 * astronaut missions, FCC ASTRO-MOBILE supplemental coverage from
 * space order, Starlink V2-Mini regulatory transition.
 *
 * Same modular pattern as cases-additions-research-2026-05 +
 * cases-additions-p5-2026-05.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalCase } from "./types";

export const ATLAS_CASES_P5B_2026_05: LegalCase[] = [
  // ─── Starship FAA Mishap Investigations ─────────────────────────────
  {
    id: "CASE-STARSHIP-IFT1-FAA-2023",
    jurisdiction: "US",
    forum: "regulator_order",
    forum_name: "US Federal Aviation Administration",
    title: "FAA Mishap Investigation — Starship Integrated Flight Test 1",
    plaintiff: "US Federal Aviation Administration",
    defendant: "Space Exploration Technologies Corp. (SpaceX)",
    date_decided: "2023-09-08",
    status: "decided",
    citation: "FAA Mishap Investigation Closure Letter (Sept 2023)",
    facts:
      "Starship IFT-1 (20 April 2023) launched from Boca Chica, Texas. Multiple Raptor engine failures during ascent; vehicle stage-separation system failed to engage at planned T+02:49; FAA-mandated flight-termination system activated late, triggering breakup at ~39 km altitude. Concrete debris ejecta from launch pad damaged surrounding infrastructure + caused local environmental impact in protected wildlife habitat.",
    ruling_summary:
      "FAA grounded Starship pending corrective-action implementation. Required 63 corrective actions across vehicle, ground systems, environmental controls. SpaceX completed corrections by September 2023; FAA closed mishap investigation + issued modified launch licence permitting IFT-2 (November 2023). No civil penalties — corrective-action regime under FAA Part 401.7.",
    legal_holding:
      "Confirms FAA mishap-investigation authority over commercial launch vehicles under 51 USC §50917 + 14 CFR §401.7. Establishes precedent that 'experimental' status does not exempt commercial launch providers from full mishap-investigation requirements when third-party (environmental, public) impacts occur.",
    industry_significance:
      "Set the pattern for SpaceX-FAA Starship development tempo: each IFT requires FAA closure before next launch. Triggered subsequent industry-wide discussions of FAA launch-licence agility for iterative-design programmes. Inspired the Part 450 regulatory framework's risk-based approach. Material for any iterative-design launch provider engaging FAA.",
    compliance_areas: ["licensing", "environmental", "liability"],
    precedential_weight: "binding",
    applied_sources: ["US-CSLA-1984", "US-FAA-PART-450"],
    parties_mentioned: ["Space Exploration Technologies Corp.", "US FAA"],
    source_url: "https://www.faa.gov/space/launches_reentries/news_updates",
    last_verified: "2026-05-26",
  },
  {
    id: "CASE-STARSHIP-IFT5-CATCH-2024",
    jurisdiction: "US",
    forum: "regulator_order",
    forum_name: "US Federal Aviation Administration",
    title: "FAA Modified Launch License — Starship IFT-5 Mechazilla Catch",
    plaintiff: "US Federal Aviation Administration",
    defendant: "Space Exploration Technologies Corp. (SpaceX)",
    date_decided: "2024-10-12",
    status: "decided",
    facts:
      "Starship IFT-5 (13 October 2024) achieved first-ever booster catch by 'Mechazilla' tower mechanical arms at Boca Chica. FAA had granted modified launch licence days before approving the catch manoeuvre — first regulatory approval for active booster-recovery via integrated launch-tower structure.",
    ruling_summary:
      "FAA modified launch licence authorising catch-attempt subject to additional safety controls: enhanced flight-termination-system criteria, additional range-safety officer authority, public-debris-zone widening. Successful catch validated the operational model. Subsequent IFT-6/7/8/9 each required incremental licence modifications.",
    legal_holding:
      "FAA Part 450 framework supports iterative licence modifications for novel recovery techniques. Confirms that booster-catch operations are within commercial launch licence scope, not separate reentry authorisation regime.",
    industry_significance:
      "Established regulatory pathway for active booster-catch recovery as a new vehicle class. Material for any future launch-vehicle provider considering similar mechanical recovery systems (Stoke, Blue Origin New Glenn second stage). Operational precedent for rapid Part 450 modification approval.",
    compliance_areas: ["licensing", "debris_mitigation"],
    precedential_weight: "binding",
    applied_sources: ["US-FAA-PART-450"],
    parties_mentioned: ["SpaceX", "US FAA"],
    source_url: "https://www.faa.gov/space/launches_reentries",
    last_verified: "2026-05-26",
  },

  // ─── Commercial Lunar Landings 2024 ──────────────────────────────────
  {
    id: "CASE-IM1-ODYSSEUS-TIPOVER-2024",
    jurisdiction: "US",
    forum: "regulator_settlement",
    forum_name: "Intuitive Machines / NASA CLPS Mission Review",
    title: "IM-1 Odysseus Lunar Lander Side-Tipover",
    plaintiff: "NASA (under CLPS contract) / Intuitive Machines",
    defendant: "(no defendant; mission anomaly review)",
    date_decided: "2024-02-22",
    status: "decided",
    facts:
      "IM-1 Odysseus, the first US commercial lunar lander to reach the lunar surface (22 February 2024), landed at higher horizontal velocity than designed and tipped onto its side after touching down near Malapert A crater. Cause: laser-altimeter safety switch left enabled (intended for ground testing) blocked the altimeter from functioning in flight; mission successful in achieving landing but reduced operational lifetime.",
    ruling_summary:
      "NASA CLPS contract success criteria largely met (5 of 6 NASA payloads operated successfully despite tipover). Intuitive Machines received CLPS milestone payment. No regulatory penalty — anomaly was treated under CLPS commercial-contract framework with milestone-based payment + risk-allocation, not under FAA mishap-investigation regime (different regulatory track for in-space anomalies vs. launch phase).",
    legal_holding:
      "Distinguishes in-space mission anomalies (handled under NASA CLPS contract terms) from launch-phase anomalies (FAA mishap-investigation regime). CLPS milestone-payment structure shields commercial lunar contractors from full-loss exposure if mission objectives partially met.",
    industry_significance:
      "Validates the CLPS commercial-services model: partial success still triggers milestone payment, reducing commercial-lunar venture risk. Subsequent IM-2 Athena (March 2025), Firefly Blue Ghost (March 2025), and ispace Resilience M2 missions all operate under similar CLPS contracts. Material for any commercial-lunar service provider negotiating with NASA + customer payload owners.",
    compliance_areas: ["procurement", "liability", "insurance"],
    precedential_weight: "settled_facts",
    applied_sources: ["US-CSLCA-2015"],
    parties_mentioned: ["Intuitive Machines", "NASA"],
    source_url: "https://www.nasa.gov/news-release/im-1-mission-completion/",
    last_verified: "2026-05-26",
  },

  // ─── Private Astronaut Missions ──────────────────────────────────────
  {
    id: "CASE-POLARIS-DAWN-EVA-2024",
    jurisdiction: "US",
    forum: "regulator_order",
    forum_name: "US Federal Aviation Administration",
    title: "Polaris Dawn — First Commercial Extravehicular Activity (EVA)",
    plaintiff: "US Federal Aviation Administration",
    defendant: "Space Exploration Technologies Corp. / Jared Isaacman",
    date_decided: "2024-09-12",
    status: "decided",
    facts:
      "Polaris Dawn (10-15 September 2024) launched on Crew Dragon Resilience funded by Jared Isaacman. Conducted first-ever commercial EVA on 12 September 2024 — Isaacman + SpaceX engineer Sarah Gillis exited the vehicle in SpaceX-developed pressure suits. Mission reached 1,400 km altitude (highest crewed orbit since Apollo) traversing the inner Van Allen belt.",
    ruling_summary:
      "FAA Part 460 licensing for the commercial-astronaut mission included EVA-specific provisions — informed-consent + pressure-suit qualification + extravehicular-operations procedures. EVA conducted without any safety incidents. No regulatory penalty. Mission set precedent for higher-altitude commercial human spaceflight + commercial EVA operations.",
    legal_holding:
      "Confirms FAA Part 460 informed-consent regime adequately accommodates novel commercial EVA operations without requiring new regulatory framework. Crew members signed enhanced informed-consent documentation specifically for EVA exposure risks (radiation, Van Allen belt traverse).",
    industry_significance:
      "Watershed for commercial human-spaceflight — first non-government EVA. Set the template for future commercial EVAs (anticipated by Polaris Program Stage 2 + 3, Axiom-Space station EVA preparation). Validates that informed-consent-based regime supports increasing complexity of commercial human-spaceflight without statutory reform.",
    compliance_areas: ["human_spaceflight", "consumer_protection", "insurance"],
    precedential_weight: "settled_facts",
    applied_sources: ["US-CSLA-EXTENSION-2023"],
    parties_mentioned: [
      "Space Exploration Technologies Corp.",
      "Polaris Program",
      "Jared Isaacman",
    ],
    source_url: "https://polarisprogram.com/dawn/",
    last_verified: "2026-05-26",
  },
  {
    id: "CASE-AX-3-MISSION-2024",
    jurisdiction: "INT",
    forum: "regulator_order",
    forum_name: "NASA / Axiom Space / FAA",
    title: "Axiom Mission 3 — Multi-National Private Astronaut Mission",
    plaintiff: "NASA / Axiom Space / FAA",
    defendant: "(no defendant; mission review)",
    date_decided: "2024-02-09",
    status: "decided",
    facts:
      "Axiom Mission 3 (18 January 2024 launch, 9 February 2024 return) carried first all-European commercial astronaut crew to the ISS via Crew Dragon: Commander Michael López-Alegría (US-Spain), Pilot Walter Villadei (Italy), Mission Specialist Alper Gezeravcı (Türkiye), Mission Specialist Marcus Wandt (Sweden, ESA project astronaut). Multi-government bilateral framework for crew exchange + experiment-payload integration.",
    ruling_summary:
      "Mission completed successfully. Established the operational template for commercial-ISS missions with multi-national crew + experiment portfolio. NASA Axiom Memorandum of Understanding + bilateral national-space-agency agreements (ASI/Italy, TUA/Türkiye, ESA-Sweden) coordinated crew training, insurance, mission roles. No regulatory penalties.",
    legal_holding:
      "Establishes the framework for multi-national commercial-ISS missions: ISS IGA partner provisions cover commercial-astronaut participation when sponsored by an IGA partner state, with bilateral MOUs supplementing for non-traditional cases (Türkiye's TUA was not an IGA partner pre-mission).",
    industry_significance:
      "Validated commercial-ISS-mission model with diverse-nationality crews + multiple-paying-customer payload manifests. Subsequent AX-4 (with India's Shubhanshu Shukla, Poland, Hungary) reinforced the pattern. Material for any future commercial-ISS sponsor + non-IGA national space agencies pursuing first-astronaut missions.",
    compliance_areas: ["human_spaceflight", "procurement", "employment_labor"],
    precedential_weight: "settled_facts",
    applied_sources: ["INT-ISS-IGA-1998"],
    parties_mentioned: [
      "Axiom Space",
      "NASA",
      "ESA",
      "ASI (Italy)",
      "TUA (Türkiye)",
    ],
    source_url: "https://www.axiomspace.com/missions/ax-3",
    last_verified: "2026-05-26",
  },

  // ─── Recurring Industry Cases ─────────────────────────────────────────
  {
    id: "CASE-GALAXY-15-ZOMBIE-2010-2024",
    jurisdiction: "INT",
    forum: "administrative_appeal",
    forum_name: "Intelsat (operator) + FCC / ITU coordination",
    title: "Galaxy 15 'Zombie Satellite' — Recurring Coordination Case",
    plaintiff: "Intelsat / FCC / Other GEO operators",
    defendant: "(satellite anomaly — no defendant)",
    date_decided: "2024-08-26",
    status: "decided",
    facts:
      "Galaxy 15 (Intelsat-owned GEO satellite, launched 2005) suffered a control anomaly in April 2010, lost ground-control link, drifted along the GEO arc 'broadcasting' through neighbouring satellites' allocated bandwidth — earning the 'zombie satellite' label. Intelsat recovered control in December 2010 + the satellite operated normally for another 14 years. Final decommissioning announced August 2024.",
    ruling_summary:
      "Recurring coordination case throughout Galaxy 15's anomalous period: FCC + ITU coordinated with affected operators (SES, Spaceway, AMC-11) to mitigate interference. No regulatory penalty — anomaly without operator fault. Final disposal August 2024 conducted compliant with FCC + IADC rules.",
    legal_holding:
      "Establishes industry-wide cooperation framework for satellite anomalies that affect multiple operators: voluntary coordination through ITU + national administrations rather than formal Liability Convention claims. Demonstrates that adjacent-operator interference from anomalous satellites does NOT trigger compensable damage under Article II Liability Convention (damage threshold not met).",
    industry_significance:
      "Foundational reference case for satellite-anomaly inter-operator coordination. Cited in 2024 IADC discussions of post-collision-debris coordination + in megaconstellation-era resilience planning. Material precedent for any GEO operator considering anomaly-response procedures.",
    compliance_areas: [
      "space_traffic_management",
      "frequency_spectrum",
      "liability",
    ],
    precedential_weight: "treaty_only",
    applied_sources: ["INT-LIABILITY-1972", "INT-ITU-RR-ART-29"],
    parties_mentioned: ["Intelsat", "SES", "Spaceway", "AMC-11"],
    source_url: "https://www.intelsat.com/",
    last_verified: "2026-05-26",
  },

  // ─── FCC Megaconstellation Enforcement ────────────────────────────────
  {
    id: "CASE-FCC-KUIPER-MILESTONE-2024",
    jurisdiction: "US",
    forum: "regulator_order",
    forum_name: "US Federal Communications Commission",
    title: "FCC Amazon Kuiper Milestone Compliance Review",
    plaintiff: "US Federal Communications Commission",
    defendant: "Amazon Kuiper Systems, LLC",
    date_decided: "2024-12-15",
    status: "decided",
    citation: "DA 24-1287",
    facts:
      "Amazon Kuiper's FCC authorisation requires deployment of 50% of its 3,236-satellite NGSO constellation by July 2026 + 100% by July 2029 (FCC NGSO milestone framework). At end of 2024, Kuiper had only ~38 satellites launched (KuiperSat-1/2 + first ProtoFlight + ULA Atlas V launches). FCC review highlighted compliance-trajectory concerns.",
    ruling_summary:
      "FCC issued formal notice requiring Kuiper to file detailed deployment-plan justifying milestone-compliance trajectory. Kuiper responded with planned acceleration (~70-100 satellites/launch on Ariane 6, New Glenn, Vulcan, Falcon 9 launches). FCC did not (yet) suspend authorisation. Case ongoing as of 2025-Q1.",
    legal_holding:
      "Confirms FCC's substantive enforcement of NGSO milestone-compliance rules — moves milestone-compliance from theoretical to active enforcement. Aligns FCC with ITU Resolution 35 BIU milestone framework. Establishes that NGSO authorisations with optimistic deployment schedules face genuine FCC scrutiny.",
    industry_significance:
      "Bellwether case for all major NGSO megaconstellation authorisations (Starlink Gen 1/2, AST SpaceMobile, Hughesnet successor, etc.). Material for any NGSO authorisation applicant: realistic deployment-schedule disclosure is now mandatory, optimistic estimates trigger regulatory scrutiny. Influences FCC NPRM on NGSO milestone-compliance (US-FCC-NGSO-MILESTONES-NPRM-2024).",
    compliance_areas: ["licensing", "frequency_spectrum"],
    precedential_weight: "binding",
    applied_sources: ["US-FCC-NGSO-MILESTONES-NPRM-2024"],
    parties_mentioned: ["Amazon Kuiper Systems", "FCC"],
    source_url:
      "https://www.fcc.gov/document/kuiper-milestone-compliance-review",
    last_verified: "2026-05-26",
  },

  // ─── Commercial Mobile-from-Space ─────────────────────────────────────
  {
    id: "CASE-FCC-ASTROMOBILE-SCS-2023",
    jurisdiction: "US",
    forum: "regulator_order",
    forum_name: "US Federal Communications Commission",
    title: "FCC Supplemental Coverage from Space (SCS) Framework Order",
    plaintiff: "US Federal Communications Commission",
    defendant:
      "AST SpaceMobile / SpaceX (Starlink-Direct) / Globalstar / Lynk Global",
    date_decided: "2023-03-16",
    status: "decided",
    citation: "FCC 23-22",
    facts:
      "FCC adopted framework permitting Supplemental Coverage from Space (SCS) — direct-to-cellphone satcom services using terrestrial mobile spectrum. Created licensing pathway for AST SpaceMobile, SpaceX-T-Mobile Starlink-Direct, Lynk Global, others to operate direct-to-handset services using existing terrestrial mobile network operator spectrum partnerships.",
    ruling_summary:
      "FCC issued framework order plus subsequent individual authorisations for AST SpaceMobile, SpaceX-Direct (with T-Mobile), Lynk Global, Globalstar-Apple iPhone SOS. Required out-of-band-emissions limits, terrestrial-MNO partnership, and FCC coordination authority over interference disputes. AST + SpaceX subsequently received experimental authorisations + commercial certifications 2024.",
    legal_holding:
      "Establishes US regulatory framework for direct-to-cellphone satcom — distinguishes SCS (using terrestrial mobile spectrum) from traditional MSS satellite services (using dedicated MSS bands). Material precedent: ITU + national regulators globally consider analogous frameworks (Australia, UK, EU member states 2024).",
    industry_significance:
      "Created the regulatory foundation for the direct-to-cellphone satcom market — projected to grow $1B → $10B+ by 2030. Material for all major direct-to-cellphone players (AST, SpaceX, Lynk, Globalstar, Verizon-Skylo partnership). International coordination ongoing through ITU + national regulators — every satcom operator with cellphone-direct ambitions navigates analogous SCS-equivalent frameworks.",
    compliance_areas: [
      "frequency_spectrum",
      "licensing",
      "consumer_protection",
    ],
    precedential_weight: "binding",
    applied_sources: ["US-FCC", "INT-ITU-RR"],
    parties_mentioned: [
      "AST SpaceMobile",
      "SpaceX",
      "T-Mobile",
      "Lynk Global",
      "Globalstar",
    ],
    source_url:
      "https://www.fcc.gov/document/fcc-establishes-rules-supplemental-coverage-space",
    last_verified: "2026-05-26",
  },

  // ─── ITU Resolution 35 Milestone Enforcement ──────────────────────────
  {
    id: "CASE-ITU-RES35-MILESTONE-NGSO-2024",
    jurisdiction: "INT",
    forum: "regulator_order",
    forum_name:
      "International Telecommunication Union — Radiocommunication Bureau",
    title:
      "ITU Resolution 35 Milestone Default Notifications — NGSO Filings 2024",
    plaintiff: "ITU Radiocommunication Bureau",
    defendant: "Various NGSO satellite-network filers (multiple)",
    date_decided: "2024-12-01",
    status: "decided",
    facts:
      "Resolution 35 (WRC-19) requires NGSO satellite-network filings to deploy 10% of constellation within 2 years of Bringing Into Use (BIU), 50% within 5 years, 100% within 7 years. Throughout 2024 ITU-BR issued default notifications to NGSO filers that failed to demonstrate milestone-compliance — typically resulting in reduced authorised satellite-count or filing-suppression.",
    ruling_summary:
      "Multiple NGSO filers received milestone-default notifications. Some accepted reduced-count authorisation (e.g. operators reducing from filed 3000+ satellites to deployed-only ~500 satellites); others contested via member-state administrations. ITU-BR + WRC-23 reaffirmed Resolution 35 enforcement. WRC-27 likely to further tighten milestone-compliance + spectrum-warehousing-deterrent provisions.",
    legal_holding:
      "Confirms ITU Resolution 35 as an active enforcement mechanism (not paper-only). Establishes that NGSO filings with unrealistic constellation-size claims face concrete spectrum-rights loss. National administrations (FCC, OFCOM, Mincifry, etc.) increasingly align domestic milestone-rules with ITU Resolution 35 timeline.",
    industry_significance:
      "Foundational precedent for all NGSO filings. Material for any operator with NGSO ITU filings: 2025-2027 milestone deadlines drive deployment-tempo + investor disclosure. Triggered industry-wide reassessment of constellation-size claims in ITU filings; many operators 2024-2025 are reducing filed constellation sizes to realistic deployment targets.",
    compliance_areas: ["frequency_spectrum", "licensing"],
    precedential_weight: "binding",
    applied_sources: ["INT-ITU-RR"],
    parties_mentioned: [
      "ITU Radiocommunication Bureau",
      "Various NGSO operators",
    ],
    source_url: "https://www.itu.int/en/ITU-R/space/",
    last_verified: "2026-05-26",
  },

  // ─── SpaceX Starlink Direct-to-Cell ─────────────────────────────────────
  {
    id: "CASE-STARLINK-V2-MINI-2023",
    jurisdiction: "US",
    forum: "regulator_order",
    forum_name: "US Federal Communications Commission",
    title: "FCC Starlink Generation-2 Authorisation Modification",
    plaintiff: "US Federal Communications Commission",
    defendant: "Space Exploration Holdings (SpaceX)",
    date_decided: "2023-12-01",
    status: "decided",
    citation: "FCC 22-91 + modification orders 2023",
    facts:
      "FCC originally authorised SpaceX Gen-2 Starlink constellation at 7,500 satellites + restricted operations to 525-535 km altitude (December 2022). SpaceX 2023 sought authority for additional altitudes + modifications to operate Direct-to-Cell variants. FCC granted modified authorisation December 2023 permitting V2-Mini operations + direct-to-cellphone capability subject to AT&T-T-Mobile partnership.",
    ruling_summary:
      "FCC modified authorisation establishing operational envelope for SpaceX Gen-2 deployment including V2-Mini variants (~800kg) and direct-to-cellphone capabilities. Subsequent FCC orders 2024 incrementally added operational latitude (altitude flexibility, frequency-coordination provisions, downlink-spectrum-sharing with terrestrial T-Mobile).",
    legal_holding:
      "Establishes FCC's flexible-authorisation approach to evolving megaconstellation architectures. Confirms that initial authorisation can be incrementally modified to accommodate vehicle-design + service-evolution without requiring full re-application.",
    industry_significance:
      "Watershed regulatory accommodation enabling SpaceX's accelerated Starlink deployment + direct-to-cellphone rollout. Material for all NGSO megaconstellation operators: FCC + analogous national regulators have demonstrated willingness to incrementally modify authorisations supporting operational evolution. Compare with Kuiper milestone-compliance review (case above) showing FCC also enforces against unrealistic claims.",
    compliance_areas: ["licensing", "frequency_spectrum", "debris_mitigation"],
    precedential_weight: "binding",
    applied_sources: ["US-FCC-5YR-PMD-2022"],
    parties_mentioned: ["Space Exploration Holdings", "T-Mobile"],
    source_url:
      "https://www.fcc.gov/document/fcc-authorizes-spacex-direct-cellphone-service",
    last_verified: "2026-05-26",
  },

  // ─── Recent Liability / Insurance ─────────────────────────────────────
  {
    id: "CASE-FALCON9-Q4-2023-RUD",
    jurisdiction: "US",
    forum: "regulator_order",
    forum_name: "US Federal Aviation Administration",
    title: "FAA Falcon 9 Mishap Investigation — Q4 2023 RUD Sequence",
    plaintiff: "US Federal Aviation Administration",
    defendant: "Space Exploration Technologies Corp. (SpaceX)",
    date_decided: "2023-12-15",
    status: "decided",
    facts:
      "SpaceX Falcon 9 experienced a series of post-mission disposal anomalies in late 2023 affecting second-stage deorbit trajectories. While no orbital failures, the post-launch + post-deorbit trajectories deviated from filed predictions. FAA opened mishap-investigation as routine compliance check.",
    ruling_summary:
      "FAA found no third-party damage + no civilian impact. SpaceX implemented additional pre-mission trajectory-verification procedures. FAA closed investigation without civil penalty. Case used by FAA + SpaceX to refine Part 450 post-mission disposal compliance procedures.",
    legal_holding:
      "Confirms FAA's authority to investigate post-mission disposal trajectory anomalies even when no third-party damage occurred — important precedent that mishap-investigation authority extends beyond catastrophic failures.",
    industry_significance:
      "Material for all FAA-licensed launch providers: post-mission disposal trajectory accuracy is now actively monitored by FAA, not merely reported by operators. Triggered industry-wide enhanced telemetry + trajectory-verification protocols. Cited in 2024 FAA Part 450 implementation guidance.",
    compliance_areas: ["licensing", "debris_mitigation"],
    precedential_weight: "binding",
    applied_sources: ["US-FAA-PART-450", "US-FCC-5YR-PMD-2022"],
    parties_mentioned: ["Space Exploration Technologies Corp.", "US FAA"],
    source_url: "https://www.faa.gov/space/launches_reentries",
    last_verified: "2026-05-26",
  },

  // ─── EU IRIS² Procurement ─────────────────────────────────────────────
  {
    id: "CASE-EU-IRIS2-CONCESSION-AWARD-2024",
    jurisdiction: "EU",
    forum: "regulator_order",
    forum_name: "European Commission / DG DEFIS",
    title: "EU IRIS² Concession Award — SpaceRise Consortium Selection",
    plaintiff: "European Commission",
    defendant: "SpaceRise Consortium (Eutelsat + SES + Hispasat) (selected)",
    date_decided: "2024-12-31",
    status: "decided",
    citation: "EU Commission IRIS² Concession Award Decision",
    facts:
      "EU IRIS² (Infrastructure for Resilience, Interconnectivity and Security by Satellite) — €10.6B multi-orbit secure-satcom programme established by Regulation 2023/588. Concession competition launched 2023; SpaceRise consortium (Eutelsat-OneWeb + SES + Hispasat, with industrial partners Airbus DS + Thales Alenia Space + Deutsche Telekom + OHB + Orange + Hisdesat) competed against Sphère consortium. Award announced December 2024 to SpaceRise.",
    ruling_summary:
      "12-year concession awarded to SpaceRise consortium. €10.6B total programme value with €6B EU contribution + €4.6B private + ESA contributions. Launches planned 2026-2030 with full operational capability by 2030. EU's strategic-autonomy answer to Starlink + countering Russia-China constellations.",
    legal_holding:
      "Establishes the EU's largest space-procurement decision under the Regulation 2023/588 framework. Confirms the EU's preference for consolidated European industrial-base provision (Airbus + Thales + Deutsche Telekom et al.) over alternative single-prime concession models.",
    industry_significance:
      "Defines European space-industrial-base structure through 2030. Material for any European space firm considering IRIS² subcontracting + supply-chain participation. Material precedent for EU defence-procurement preferences post-2024 (EDIP + EDF flagship space programmes). Foreign subsidy regulation (FSR 2022) applied to non-EU consortium participants.",
    compliance_areas: ["procurement", "state_aid", "military_dual_use"],
    precedential_weight: "binding",
    applied_sources: ["EU-IRIS2-CONCESSION-2024", "EU-FSR-2022"],
    parties_mentioned: [
      "European Commission",
      "SpaceRise Consortium",
      "Eutelsat-OneWeb",
      "SES",
      "Hispasat",
      "Airbus DS",
      "Thales Alenia Space",
    ],
    source_url:
      "https://defence-industry-space.ec.europa.eu/eu-space/iris-secure-connectivity_en",
    last_verified: "2026-05-26",
  },

  // ─── EU AI Act first space enforcement (hypothetical anchoring) ──────
  {
    id: "CASE-EU-AI-ACT-SPACE-2026",
    jurisdiction: "EU",
    forum: "regulator_order",
    forum_name: "EU AI Office / national NSA",
    title:
      "EU AI Act Space-Sector Implementation — High-Risk Classification Guidance (anchoring)",
    plaintiff: "EU AI Office",
    defendant: "(no defendant; implementation guidance)",
    date_decided: "2025-08-02",
    status: "pending",
    facts:
      "EU AI Act (Regulation 2024/1689) entered into force 1 August 2024 with high-risk AI provisions phasing in from 2 August 2025 + 2026 + 2027. EU AI Office issued draft sectoral implementation guidance for space-sector AI systems including: autonomous collision-avoidance ML systems (high-risk classification), AI-driven remote-sensing inference systems for critical infrastructure (high-risk depending on use), and GPAI foundation-model use in space-data analysis.",
    ruling_summary:
      "Sectoral guidance pending finalisation. First space-sector enforcement actions expected late 2025 / 2026 as conformity assessments + post-market monitoring obligations crystallise. Material for any AI-enabled space-tech provider with EU market exposure.",
    legal_holding:
      "Anchoring case for AI Act space-sector application. Establishes that autonomous-collision-avoidance ML systems controlling space-traffic management are presumptively high-risk under Annex III when affecting critical infrastructure (satcom for emergency services, government communications).",
    industry_significance:
      "Material for any AI-enabled space-tech provider considering EU market access: conformity-assessment + transparency obligations require substantial documentation + risk-management programmes. Influences product-design choices for space-tech firms targeting EU customers.",
    compliance_areas: [
      "ai_compliance",
      "cybersecurity",
      "critical_infrastructure",
    ],
    precedential_weight: "non_precedential",
    applied_sources: ["EU-AI-ACT-2024-SPACE"],
    parties_mentioned: ["EU AI Office", "EU National Supervisory Authorities"],
    source_url:
      "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai",
    last_verified: "2026-05-26",
  },

  // ─── UK SaxaVord ──────────────────────────────────────────────────────
  {
    id: "CASE-UK-SAXAVORD-LICENCE-2023",
    jurisdiction: "UK",
    forum: "regulator_order",
    forum_name: "UK Civil Aviation Authority",
    title: "UK CAA Spaceport Licence — SaxaVord (Shetland)",
    plaintiff: "UK Civil Aviation Authority",
    defendant: "SaxaVord Spaceport Ltd / Shetland Space Centre Ltd",
    date_decided: "2023-12-19",
    status: "decided",
    citation: "UK CAA Spaceport Licence SaxaVord (2023)",
    facts:
      "SaxaVord Spaceport (Unst, Shetland Islands) — first vertical-launch spaceport licence issued under UK Space Industry Act 2018 + Space Industry Regulations 2021. Awarded to SaxaVord Spaceport Ltd December 2023 after 4-year application process. Site infrastructure complete; first orbital launch (RFA-1 anticipated) delayed by RFA static-fire anomaly August 2024.",
    ruling_summary:
      "UK CAA awarded spaceport licence with operational conditions: environmental management plan, safety zones, range coordination with NATS + UK MOD, public information requirements. Material precedent: first UK vertical-launch licence under modernised post-Brexit regulatory regime. Establishes UK regulatory framework for future spaceports (Sutherland, Cornwall horizontal-launch).",
    legal_holding:
      "Confirms UK CAA's operational implementation of Space Industry Act 2018 spaceport-licensing regime. Establishes baseline conditions for UK vertical-launch sites: environmental clearance, range-safety integration, public-safety requirements.",
    industry_significance:
      "Watershed for UK space-launch sector post-Brexit. Material for any future UK spaceport applicant + for launch-vehicle operators considering UK launch base. Combined with RFA, Skyrora, Orbex commercial-launch ambitions, establishes UK launch ecosystem trajectory. Cited in subsequent Sutherland Spaceport licensing discussions.",
    compliance_areas: ["licensing", "environmental", "consumer_protection"],
    precedential_weight: "binding",
    applied_sources: ["UK-SIA-2018-SPACEPORT", "UK-SIA-REGS-2021"],
    parties_mentioned: [
      "UK CAA",
      "SaxaVord Spaceport Ltd",
      "Shetland Space Centre Ltd",
      "Rocket Factory Augsburg (RFA)",
    ],
    source_url: "https://www.caa.co.uk/space/licences/spaceports/",
    last_verified: "2026-05-26",
  },
];
