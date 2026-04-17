import type { LandingRightsProfile } from "../types";

export const PROFILE_FR: LandingRightsProfile = {
  jurisdiction: "FR",
  depth: "standard",
  last_verified: "2026-04-17",
  overview: {
    summary:
      "France operates a two-track regime under ARCEP (spectrum), ANFR (frequency coordination), CNES (space operations oversight), and the Ministère des Armées (security review). Primary legal bases: Loi sur les opérations spatiales (LOS) 2008-518 and the Arrêté of 31 March 2011. ARCEP granted Starlink authorisation in February 2021; it was briefly quashed by the Conseil d'État in 2022 before being re-granted. France provides a state guarantee above the €60M operator liability cap.",
    regime_type: "two_track",
  },
  regulators: [
    {
      name: "Autorité de régulation des communications électroniques, des postes et de la distribution de la presse",
      abbreviation: "ARCEP",
      role: "primary",
      url: "https://www.arcep.fr/",
    },
    {
      name: "Agence nationale des fréquences",
      abbreviation: "ANFR",
      role: "co_authority",
      url: "https://www.anfr.fr/",
    },
    {
      name: "Centre national d'études spatiales",
      abbreviation: "CNES",
      role: "co_authority",
      url: "https://cnes.fr/",
    },
    {
      name: "Ministère des Armées",
      abbreviation: "MinArm",
      role: "security_review",
    },
  ],
  legal_basis: [
    {
      source_id: "fr-los-2008-518",
      title: "Loi sur les opérations spatiales (LOS) n° 2008-518",
    },
    {
      source_id: "fr-arrete-31-march-2011",
      title: "Arrêté du 31 mars 2011",
    },
    {
      source_id: "fr-code-postes-communications-electroniques",
      title: "Code des postes et des communications électroniques",
    },
  ],
  fees: {
    application: {
      min: 1000,
      max: 15000,
      currency: "EUR",
    },
    note: "State guarantee above €60M operator liability cap.",
  },
  timeline: {
    typical_duration_months: { min: 6, max: 12 },
  },
  foreign_ownership: {
    cap_percent: null,
    note: "No cap per se; AMF review applies for strategic sectors.",
  },
  renewal: { term_years: 10 },
  security_review: {
    required: true,
    authority: "Ministère des Armées",
    framework: "LOS 2008-518 strategic-sector review",
  },
  operator_snapshots: {
    starlink: {
      status: "licensed",
      since: "2021-02",
      note: "Conseil d'État quashed 2022, re-granted.",
    },
    kuiper: { status: "pending" },
    oneweb: { status: "licensed" },
  },
};
