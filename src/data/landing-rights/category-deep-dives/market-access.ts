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
];
