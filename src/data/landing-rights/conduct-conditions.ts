import type { ConductCondition } from "./types";

export const CONDUCT_CONDITIONS: ConductCondition[] = [
  {
    id: "in-lawful-intercept-gateway",
    jurisdiction: "IN",
    type: "lawful_intercept",
    title: "Lawful interception gateway",
    requirement:
      "Operators must deploy gateways that enable DoT-ordered lawful interception of traffic metadata and content, including service-suspension capability for national emergencies.",
    legal_source_id: "in-dot-gmpcs-2022",
    applies_to: "all_operators",
    operators_affected: ["Starlink", "OneWeb", "Jio-SES"],
    last_verified: "2026-04-17",
  },
  {
    id: "in-20-percent-indigenisation",
    jurisdiction: "IN",
    type: "indigenization",
    title: "20% indigenous ground-segment content",
    requirement:
      "Minimum 20% of ground-segment infrastructure (gateways, user terminals, control systems) must be sourced from Indian suppliers.",
    legal_source_id: "in-dot-gmpcs-2022",
    applies_to: "all_operators",
    last_verified: "2026-04-17",
  },
];
