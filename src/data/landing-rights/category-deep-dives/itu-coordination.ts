import type { CategoryDeepDive } from "../types";

export const ITU_COORDINATION_DEEP_DIVES: CategoryDeepDive[] = [
  {
    jurisdiction: "DE",
    category: "itu_coordination",
    title: "ITU coordination as the prerequisite for BNetzA authorisation",
    summary:
      "BNetzA requires satellite networks seeking German market access to have completed or substantially advanced ITU Radio Regulations coordination. The API → CR/C → Notification → BIU sequence structures the entire timeline, with Resolution 35 milestones now disciplining NGSO deployment.",
    key_provisions: [
      {
        title: "API → CR/C filing sequence",
        body: "Advance Publication Information (Nos. 9.1/9.1A) triggers the 7-year bring-into-use clock. Coordination Request (Nos. 9.6 et seq.) must be filed 6–24 months later under No. 9.5D. Notification (Nos. 11.2/11.15) triggers MIFR examination.",
        citation: "ITU Radio Regulations Nos. 9.1, 9.5D, 11.2, 11.15",
      },
      {
        title: "Bring-into-use (BIU) under No. 11.44",
        body: "BIU requires a satellite maintained at the notified position for 90 continuous days (GSO) or one NGSO satellite per plane for 90 days (Nos. 11.44C–E). Failure to BIU within 7 years of API cancels the filing.",
        citation: "ITU Radio Regulations No. 11.44, 11.44C–E",
      },
      {
        title: "Resolution 35 NGSO milestones",
        body: "Resolution 35 (Rev.WRC-23) imposes NGSO deployment milestones: 10% within 2 years, 50% within 5 years, 100% within 7 years of BIU. These milestones now discipline Starlink Gen-2, Kuiper and Qianfan deployment schedules.",
        citation: "Resolution 35 (Rev.WRC-23)",
      },
    ],
    practical_notes:
      "Article 22 EPFD limits on NGSO FSS protect GSO networks in Ku/Ka bands — WRC-23 deferred meaningful change to WRC-31. Expect GSO protection to remain the baseline through 2031.",
    last_verified: "2026-04-17",
  },
];
