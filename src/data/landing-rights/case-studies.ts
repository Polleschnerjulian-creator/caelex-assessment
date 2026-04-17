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
];
