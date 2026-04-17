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
  {
    id: "in-per-terminal-registration",
    jurisdiction: "IN",
    type: "other",
    title: "Per-terminal registration",
    requirement:
      "Each user terminal must be individually registered with DoT under the GMPCS licence. Operators must maintain a real-time registry accessible for lawful inspection.",
    legal_source_id: "in-dot-gmpcs-2022",
    applies_to: "all_operators",
    last_verified: "2026-04-17",
  },
  {
    id: "in-navic-mandate-2029",
    jurisdiction: "IN",
    type: "local_content",
    title: "NavIC support in user terminals by 2029",
    requirement:
      "All satellite-based user terminals operated in India must support NavIC (Indian Regional Navigation Satellite System) positioning by 1 January 2029.",
    legal_source_id: "in-dot-gmpcs-2022",
    effective_date: "2029-01-01",
    applies_to: "all_operators",
    last_verified: "2026-04-17",
  },
  {
    id: "in-geo-fencing-50km-border",
    jurisdiction: "IN",
    type: "geo_fencing",
    title: "50-km border/coastal monitoring zones",
    requirement:
      "Enhanced traffic monitoring required within 50 km of international borders and coastlines. Operators must deploy dedicated surveillance gateways for traffic originating or terminating in these zones.",
    legal_source_id: "in-dot-gmpcs-2022",
    applies_to: "all_operators",
    last_verified: "2026-04-17",
  },
  {
    id: "us-team-telecom-mitigation",
    jurisdiction: "US",
    type: "lawful_intercept",
    title: "Team Telecom mitigation agreements",
    requirement:
      "Foreign-owned operators exceeding §310(b) benchmarks must sign Letters of Agreement (LOAs) with DOJ/DoD/DHS covering lawful intercept access, infrastructure location, foreign personnel restrictions, and compliance reporting.",
    legal_source_id: "us-eo-13913",
    applies_to: "all_operators",
    operators_affected: ["Marlink"],
    last_verified: "2026-04-17",
  },
  {
    id: "uk-nsia-schedule-14-notification",
    jurisdiction: "UK",
    type: "other",
    title: "NSI Act Schedule 14 mandatory notification",
    requirement:
      "Acquisitions of space-sector entities meeting Schedule 14 criteria must be notified to the Investment Security Unit before completion. Non-notification carries criminal penalties including up to 5 years imprisonment.",
    legal_source_id: "uk-nsi-act-2021",
    applies_to: "all_operators",
    last_verified: "2026-04-17",
  },
  {
    id: "au-soci-critical-infrastructure",
    jurisdiction: "AU",
    type: "data_localization",
    title: "SOCI Act critical infrastructure obligations",
    requirement:
      "Space-sector operators designated as critical infrastructure must register assets, implement risk management plans, maintain mandatory cyber incident reporting (6-hour initial notification), and allow ASD cybersecurity assistance.",
    legal_source_id: "au-soci-act",
    applies_to: "all_operators",
    last_verified: "2026-04-17",
  },
  {
    id: "it-golden-power-review",
    jurisdiction: "IT",
    type: "other",
    title: "Golden Power review for strategic assets",
    requirement:
      "Acquisitions and contracts involving Italian space-sector assets classified as strategic require Golden Power authorisation from the Council of Ministers. 45-day review window.",
    legal_source_id: "it-law-89-2025",
    applies_to: "all_operators",
    last_verified: "2026-04-17",
  },
  {
    id: "fr-los-conseil-etat-recourse",
    jurisdiction: "FR",
    type: "other",
    title: "State guarantee above €60M operator cap (LOS)",
    requirement:
      "Operators licensed under LOS 2008-518 carry a €60M liability cap per claim. Beyond €60M, the French State provides a guarantee — subject to recourse if operator negligence established. Operators must maintain parallel €60M minimum insurance.",
    legal_source_id: "fr-los-2008-518",
    applies_to: "all_operators",
    last_verified: "2026-04-17",
  },
  {
    id: "sa-cst-registration-sector-limit",
    jurisdiction: "SA",
    type: "other",
    title: "Sector-limited grants under CST Draft Registration",
    requirement:
      "Registration of Telecommunication Space Stations may be granted for specific sectors (aviation, maritime, fixed) with explicit prohibition on other uses. Expansion requires new application.",
    applies_to: "all_operators",
    operators_affected: ["Starlink"],
    last_verified: "2026-04-17",
  },
  {
    id: "jp-carrier-radio-exemption",
    jurisdiction: "JP",
    type: "local_content",
    title: "Carrier-radio exemption for foreign operators",
    requirement:
      "The 33% foreign-ownership bar under the Radio Act is waived when satellite service is provided via a domestic Type-I carrier partnership (e.g., KDDI). The foreign operator does not hold the radio licence directly.",
    legal_source_id: "jp-radio-act-1950",
    applies_to: "all_operators",
    operators_affected: ["Starlink"],
    last_verified: "2026-04-17",
  },
];
