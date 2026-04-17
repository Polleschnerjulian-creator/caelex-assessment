import type { CaseStudy } from "./types";

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: "starlink-india-gmpcs-2021-2025",
    title: "Starlink India — the 4-year benchmark for regulatory friction",
    jurisdiction: "IN",
    operator: "Starlink",
    categories: ["market_access"],
    date_range: { from: "2021-11", to: "2025-07-08" },
    narrative:
      "Starlink opened India pre-orders in November 2021 and was immediately reprimanded by DoT, prompting refunds. A GMPCS application followed in 2022; the 2022 DoT Guidelines and March 2024 FDI liberalisation (100% auto route) progressively unlocked structural barriers. TRAI's October 2024 recommendation favoured administrative allocation. DoT Letter of Intent arrived May 2025; GMPCS Licence June 2025; IN-SPACe 5-year authorisation 8 July 2025 — third operator cleared after Eutelsat OneWeb (Nov 2023) and Jio-SES (June 2024). Security conditions require per-terminal registration, geo-fencing, traffic metadata logging, lawful interception gateways, 50-km border/coastal special monitoring, 20% indigenous ground-segment content, NavIC support by 2029, and service-suspension capability during emergencies.",
    takeaways: [
      "End-to-end timeline: ~44 months from first marketing to operational authorisation.",
      "Conduct-based conditionality imposes tens of millions of USD in operator-specific compliance CAPEX beyond headline licensing fees.",
      "20% indigenisation requirement is a novel quasi-trade barrier likely to be replicated across BRICS.",
    ],
    outcome: "licensed",
    last_verified: "2026-04-17",
  },
  {
    id: "oneweb-russia-launch-seizure-2022",
    title: "OneWeb–Russia — the launching-state risk benchmark",
    jurisdiction: "UK",
    operator: "OneWeb",
    categories: ["market_access", "itu_coordination"],
    date_range: { from: "2022-03-04", to: "2023-03" },
    narrative:
      "On 4 March 2022, Roscosmos cancelled the scheduled Soyuz launch of 36 OneWeb satellites and demanded UK government divestment from OneWeb as a condition of release. OneWeb refused; the 36 satellites were seized at Baikonur. OneWeb booked a $229.2M impairment and reported a $389.8M net loss on $9.6M revenue for the affected fiscal period. The company pivoted to SpaceX Falcon 9 (first launch December 2022) and ISRO LVM3, reaching 652 operational satellites by October 2024. The $3.4B Eutelsat–OneWeb merger closed in 2023, partly validated by the demonstrated resilience of the recovery plan.",
    takeaways: [
      "Launching-state risk can produce $200M+ writedowns overnight",
      "Diversifying launch providers is now table-stakes for global LEO operators",
      "Geopolitical shifts in launching-state relations can strand constellations",
    ],
    outcome: "compromise",
    last_verified: "2026-04-17",
  },
  {
    id: "italy-1-5b-starlink-deal-collapse-2025",
    title: "Italy — the sovereignty backlash that killed a €1.5B deal",
    jurisdiction: "IT",
    operator: "Starlink",
    categories: ["market_access"],
    date_range: { from: "2025-01", to: "2025-03" },
    narrative:
      "A €1.5B ($1.6B) five-year contract for encrypted communications serving Italian diplomats and military was championed by PM Meloni following her January 2025 Mar-a-Lago visit. The deal collapsed politically in March 2025 after Musk's X post on Ukraine; Forza Italia publicly distanced, President Mattarella reportedly preferred OneWeb, and Eutelsat CEO Eva Berneke confirmed alternative discussions were underway. The case crystallised EU sovereignty concerns about critical-communications dependence on a single US operator and catalysed political momentum behind accelerated IRIS² deployment.",
    takeaways: [
      "Political reputation of operator management can void signed-letter-of-intent deals",
      "Sovereignty concerns now competitively weighted in government-scale contracts",
      "EU buyers increasingly prefer IRIS² consortium over US operators",
    ],
    outcome: "denied",
    last_verified: "2026-04-17",
  },
  {
    id: "starlink-south-africa-eeip-2025",
    title: "Starlink South Africa — the BEE impasse and the EEIP workaround",
    jurisdiction: "ZA",
    operator: "Starlink",
    categories: ["market_access"],
    date_range: { from: "2021", to: "2026-03" },
    narrative:
      "Electronic Communications Act §9(2)(b) mandates 30% Historically Disadvantaged Group (HDG) equity for I-ECNS/I-ECS licensees — incompatible with SpaceX's global no-local-shareholding policy. Following Ramaphosa–Trump–Musk meetings in Washington (May 2025), Minister Solly Malatsi's Government Gazette No. 53855 directive of 12 December 2025 instructed ICASA to accept Equity Equivalent Investment Programs (EEIPs) at 30% of SA-operation valuation OR 4% of SA revenue. Starlink pledged R500M (~$27.6M), later inflated to R2B (~$110M). Finalisation targeted March 2026 but formal ICASA rule amendment may slip to 2027; ANC, EFF and MK Party oppose EEIP as BEE circumvention.",
    takeaways: [
      "Investment-for-licence trades can replace formal ownership requirements in emerging markets",
      "Political pressure can override long-standing local-content regulations",
      "Pledge inflation risk: initial R500M ballooned to R2B under domestic scrutiny",
    ],
    outcome: "compromise",
    last_verified: "2026-04-17",
  },
  {
    id: "viasat-inmarsat-merger-2023",
    title: "Viasat–Inmarsat — creating the largest landing-rights portfolio",
    jurisdiction: "UK",
    operator: "Viasat-Inmarsat",
    categories: ["market_access", "itu_coordination", "earth_station"],
    date_range: { from: "2021-11-08", to: "2023-05-31" },
    narrative:
      "The Viasat–Inmarsat merger closed 30–31 May 2023 at a $7.3B headline value ($551M cash + ~46.4M shares + $3.4B debt assumption). Unconditional global clearances landed in quick succession: UK CMA on 9 May, FCC on 19 May, and European Commission in late May. The merged entity operates 19 satellites across Ka-, L- and S-bands and claims landing rights in approximately 170 countries — the largest single portfolio in the industry and the current benchmark for multi-band GEO scale.",
    takeaways: [
      "170-country portfolio is the current benchmark for scale",
      "Multi-band (Ka/L/S) license stacks multiply compliance complexity linearly",
      "Clean antitrust clearance path when combining GEO operators with non-overlapping spectrum",
    ],
    outcome: "licensed",
    last_verified: "2026-04-17",
  },
  {
    id: "kuiper-fcc-milestones-2020-2029",
    title: "Amazon Kuiper — the Resolution 35 milestone race",
    jurisdiction: "US",
    operator: "Kuiper",
    categories: ["market_access"],
    date_range: { from: "2020-07-30", to: "2029-07-30" },
    narrative:
      "The FCC unanimously authorised 3,236 Ka-band NGSO satellites on 30 July 2020. A February 2023 orbital-debris conditional approval permitted deployment, and the first operational batch launched on Atlas V in 2025. Deployment milestones are binding: 50% launched by 30 July 2026; 100% by 30 July 2029. Kuiper's landing-rights strategy consistently lags Starlink by 6–18 months in most markets — a pattern that translates to material revenue deferral and, under Resolution 35 (Rev.WRC-23) milestone logic, genuine spectrum-retention risk.",
    takeaways: [
      "Resolution 35 milestones discipline deployment schedules with real spectrum loss at risk",
      "6–18 month landing-rights lag vs Starlink = measurable revenue deferral",
      "Orbital-debris conditional approvals are the new norm for NGSO FCC authorisations",
    ],
    outcome: "pending",
    last_verified: "2026-04-17",
  },
  {
    id: "saudi-2025-starlink-sector-limited-approval",
    title: "Saudi Arabia — sector-limited Starlink approval 13 May 2025",
    jurisdiction: "SA",
    operator: "Starlink",
    categories: ["market_access"],
    date_range: { from: "2020", to: "2025-05-13" },
    narrative:
      "Under the CST Draft Registration Regulation v.2 of October 2025, Saudi Arabia approved Starlink on 13 May 2025 — but only for aviation and maritime uses, NOT residential. MISA investment approval is required, plus Vision 2030 alignment. Residential launch is not yet granted. The distinction is frequently mis-reported in trade press and is material for accurate portfolio tracking: sector-limited approvals are a distinct license class from full market access.",
    takeaways: [
      "Sector-limited approvals are a distinct license class from full market access",
      "Saudi's Draft Registration Regulation (CST) is setting the template for Gulf regulation",
      "Portfolio tracking must disaggregate use-case-specific vs general-purpose grants",
    ],
    outcome: "licensed",
    last_verified: "2026-04-17",
  },
];
