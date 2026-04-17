import type { CategoryDeepDive } from "../types";

export const MARKET_ACCESS_DEEP_DIVES: CategoryDeepDive[] = [
  {
    jurisdiction: "IN",
    category: "market_access",
    title: "GMPCS + IN-SPACe + TRAI — the three-approval regime",
    summary:
      "India's commercial satcom market access requires parallel approvals from DoT (GMPCS licence), IN-SPACe (space-activity authorisation), and TRAI-recommended spectrum pricing, plus an MHA security clearance.",
    key_provisions: [
      {
        title: "DoT GMPCS licence",
        body: "Five-year licence under the Telecommunications Act 2023 with per-subscriber registration, geo-fencing, lawful intercept, and emergency-suspension capabilities.",
        citation: "DoT 2022 Guidelines; Telecommunications Act 2023 § 3",
      },
      {
        title: "IN-SPACe authorisation",
        body: "Five-year authorisation under the Indian Space Policy 2023 covering the space-activity aspect, separate from the DoT spectrum/commercial licence.",
        citation: "Indian Space Policy 2023",
      },
      {
        title: "TRAI spectrum recommendation",
        body: "October 2024 recommendation favours administrative allocation at 4% of AGR plus INR 500/subscriber/year urban surcharge over a five-year term.",
      },
    ],
    practical_notes:
      "End-to-end timeline observed at 24–48 months. Operators should treat MHA clearance as critical-path, not parallel.",
    last_verified: "2026-04-17",
  },
  {
    jurisdiction: "DE",
    category: "market_access",
    title: "BNetzA telecoms-only regime pending the WRG",
    summary:
      "Germany currently authorises satellite market access exclusively through BNetzA's spectrum licensing under TKG §§ 52, 55 — there is no dedicated space act. The Weltraumgesetz (WRG), in draft since September 2024, will introduce a separate space licence, liability and insurance regime alongside the telecoms track.",
    key_provisions: [
      {
        title: "TKG spectrum authorisation",
        body: "BNetzA issues frequency assignments under TKG §§ 52 and 55 for satellite networks seeking to serve German territory. Coordination status through the ITU is a pre-condition. Grants run 10 years and are renewable.",
        citation: "Telekommunikationsgesetz §§ 52, 55",
      },
      {
        title: "AWV FDI screening",
        body: "Aerospace is listed as a sensitive sector under the Außenwirtschaftsverordnung (AWV) as expanded in 2020/21. Acquisitions by non-EU entities exceeding a 10% stake trigger BMWK cross-sectoral screening with potential for prohibition or mitigation orders.",
        citation: "AWV §§ 55–57",
      },
      {
        title: "WRG draft (2024–26)",
        body: "The September 2024 Eckpunkte and follow-up 2025–26 draft introduce a licensing regime for operators established in Germany: liability caps, mandatory insurance, continuing-supervision duties, and decommissioning obligations. Enactment will re-paper existing Starlink, Kuiper and OneWeb authorisations.",
        citation: "Eckpunkte für ein Weltraumgesetz, BMWK 4 September 2024",
      },
    ],
    practical_notes:
      "Operators with existing BNetzA authorisations should monitor WRG consultation drafts quarterly — the transitional regime and grandfathering provisions are the commercially material questions.",
    last_verified: "2026-04-17",
  },
  {
    jurisdiction: "FR",
    category: "market_access",
    title: "ARCEP + CNES dual-track under LOS 2008-518",
    summary:
      "French market access requires a telecoms authorisation from ARCEP (spectrum) plus a separate space-operations authorisation from CNES/Ministère des Armées under the Loi sur les opérations spatiales (LOS). The €60M operator liability cap with unlimited state guarantee is the most commercially significant feature.",
    key_provisions: [
      {
        title: "ARCEP spectrum authorisation",
        body: "ARCEP grants electronic-communications authorisations under the Code des postes et des communications électroniques. Starlink was initially granted February 2021, quashed by the Conseil d'État in 2022, and re-granted — the case sets the procedural benchmark for French spectrum litigation.",
        citation: "Code des postes et des communications électroniques (CPCE)",
      },
      {
        title: "LOS 2008-518 space authorisation",
        body: "The Loi sur les opérations spatiales requires a separate licence for launch, operation, transfer-of-control and re-entry of space objects by French-established operators or operations from French territory. Arrêté 31 March 2011 details technical regulations including debris mitigation and end-of-life disposal.",
        citation: "Loi 2008-518; Arrêté 31 mars 2011",
      },
      {
        title: "€60M cap and state guarantee",
        body: "LOS Article 13–16 caps operator third-party liability at €60M per launch/operation. Above that cap, the French State guarantees the claim — subject to recourse against the operator where fault is established. Operators must maintain parallel insurance covering the €60M cap.",
        citation: "LOS 2008-518 Articles 13–16",
      },
    ],
    practical_notes:
      "The 2022 Conseil d'État Starlink quashing sits in the background: ARCEP authorisations are vulnerable to public-interest challenges when environmental or spectrum-congestion arguments are plausible.",
    last_verified: "2026-04-17",
  },
  {
    jurisdiction: "UK",
    category: "market_access",
    title: "Ofcom + CAA + NSI Act triple-track",
    summary:
      "The UK operates three parallel gatekeepers: Ofcom for spectrum under the Wireless Telegraphy Act 2006, the CAA for space-activity licensing under the Space Industry Act 2018 + SI 2021/792, and the Investment Security Unit for national-security review under NSI Act 2021 Schedule 14.",
    key_provisions: [
      {
        title: "Ofcom NGSO authorisation",
        body: "Ofcom authorises NGSO satellite networks to radiate over UK territory. Starlink was licensed in November 2020; Kuiper's NGSO authorisation is pending as of April 2026. Authorisations are renewable but Ofcom reserves spectrum-coexistence conditions.",
        citation: "Wireless Telegraphy Act 2006",
      },
      {
        title: "CAA space licence (SIA 2018)",
        body: "The Space Industry Act 2018 plus Space Industry Regulations 2021 (SI 2021/792) establish the CAA as the space licensing authority for launch, operator and range-control activities. Typical CAA licence process runs 12–18 months and includes a Modelled Insurance Requirement (MIR) sized per mission.",
        citation:
          "Space Industry Act 2018; Space Industry Regulations 2021 (SI 2021/792)",
      },
      {
        title: "NSI Act Schedule 14 notification",
        body: "Acquisitions of UK space-sector entities meeting Schedule 14 triggering criteria must be notified to the Investment Security Unit before completion. Non-notification carries criminal penalties including up to 5 years' imprisonment.",
        citation: "National Security and Investment Act 2021 Schedule 14",
      },
    ],
    practical_notes:
      "NSI Act notifications cluster quickly when GEO/LEO consolidation accelerates — budget 60–90 days of security review even for routine minority stake increases.",
    last_verified: "2026-04-17",
  },
  {
    jurisdiction: "US",
    category: "market_access",
    title: "FCC § 25.137 + EO 13913 Team Telecom + FAA Part 450",
    summary:
      "US market access separates three tracks: FCC market access under 47 CFR § 25.137 (Petition for Declaratory Ruling for foreign-licensed networks), national-security review via Team Telecom under EO 13913, and FAA Part 450 for launch/re-entry. The first formal FCC Team Telecom enforcement landed in January 2026 (Marlink).",
    key_provisions: [
      {
        title: "47 CFR § 25.137 market access",
        body: "A Petition for Declaratory Ruling under 47 CFR § 25.137 allows foreign-licensed satellite networks to serve US territory without a full US space-station licence, provided the network has been submitted for ITU coordination and meets FCC technical benchmarks. Grants typically run 15 years.",
        citation: "47 CFR § 25.137",
      },
      {
        title: "§ 310(b) foreign-ownership benchmarks",
        body: "Communications Act § 310(b) applies 20% direct / 25% indirect foreign-ownership benchmarks. Waivers are routinely granted with Team Telecom mitigation — the regulatory centre of gravity has shifted from ownership screening to conduct-based mitigation via Letters of Agreement.",
        citation: "Communications Act § 310(b)",
      },
      {
        title: "EO 13913 Team Telecom process",
        body: "Executive Order 13913 (April 2020) formalised the Committee for the Assessment of Foreign Participation (Team Telecom: DOJ, DoD, DHS, Commerce). 120-day initial review + possible 90-day extension. LOAs may require US-only infrastructure, foreign-personnel restrictions, and lawful-intercept cooperation.",
        citation: "Executive Order 13913 (April 2020)",
      },
    ],
    practical_notes:
      "The Marlink January 2026 enforcement is the first public Team Telecom compliance action — signal that LOAs are now actively audited, not just negotiated and filed.",
    last_verified: "2026-04-17",
  },
  {
    jurisdiction: "AU",
    category: "market_access",
    title: "ACMA apparatus licence + ASA space authorisation + FIRB",
    summary:
      "Australian market access requires an ACMA apparatus licence (AUD $35,956 new-sat fee) for spectrum, an ASA authorisation for space activities under the Space (Launches and Returns) Act 2018, and FIRB review for acquisitions above thresholds. SOCI Act critical-infrastructure obligations apply to designated operators.",
    key_provisions: [
      {
        title: "ACMA apparatus licence",
        body: "Each satellite seeking to serve Australian territory requires an ACMA apparatus licence under the Radiocommunications Act 1992. Fee is AUD $35,956 per new satellite. Licences are 10 years, renewable, with band-coexistence conditions where required.",
        citation: "Radiocommunications Act 1992",
      },
      {
        title: "Space (Launches and Returns) Act 2018",
        body: "ASA issues space-activity authorisations (launch, operator, overseas payload, return) under the SLR Act 2018. Minimum insurance A$100M with A$3B Commonwealth excess. Scientific/research missions may access reduced thresholds.",
        citation: "Space (Launches and Returns) Act 2018",
      },
      {
        title: "FIRB review threshold",
        body: "Foreign Investment Review Board review applies to acquisitions of Australian space-sector entities at AUD $275M+ (or lower for sensitive-business categories). SOCI Act designation adds mandatory cyber-incident reporting and critical-infrastructure obligations.",
        citation:
          "Foreign Acquisitions and Takeovers Act 1975; Security of Critical Infrastructure Act 2018",
      },
    ],
    practical_notes:
      "Kuiper's 2025 inclusion in the Foreign Space Objects Determination signals Australia's rapid expansion of the authorisation schedule — check FSOD quarterly for constellation changes.",
    last_verified: "2026-04-17",
  },
];
