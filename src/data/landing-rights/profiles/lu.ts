import type { LandingRightsProfile } from "../types";

export const PROFILE_LU: LandingRightsProfile = {
  jurisdiction: "LU",
  depth: "deep",
  last_verified: "2026-04-17",
  overview: {
    summary:
      "Luxembourg operates a two-track regime via ILR (spectrum/market access), the Satellite Monitoring Centre (SMC), the Ministry of Economy, and the Luxembourg Space Agency (LSA). Foundational legal bases are the Law of 15 December 2020 on space activities and the 2017 Space Resources Act (the first national framework in Europe for asteroid and space resource use). Home to SES. Fines range from €1,250 to €500,000 for non-compliance, up to €1M per day for continuing violations.",
    regime_type: "two_track",
    in_force_date: "2020-12-15",
  },
  regulators: [
    {
      name: "Institut Luxembourgeois de Régulation",
      abbreviation: "ILR",
      role: "primary",
      url: "https://www.ilr.lu/",
    },
    {
      name: "Satellite Monitoring Centre",
      abbreviation: "SMC",
      role: "co_authority",
    },
    {
      name: "Ministry of the Economy",
      abbreviation: "MECO",
      role: "co_authority",
    },
    {
      name: "Luxembourg Space Agency",
      abbreviation: "LSA",
      role: "security_review",
      url: "https://space-agency.public.lu/",
    },
  ],
  legal_basis: [
    {
      source_id: "lu-law-15-december-2020",
      title: "Law of 15 December 2020 on space activities",
    },
    {
      source_id: "lu-space-resources-act-2017",
      title:
        "Law of 20 July 2017 on the exploration and use of space resources",
    },
  ],
  fees: {
    application: {
      min: 1250,
      max: 10000,
      currency: "EUR",
    },
    note: "Non-compliance fines €1,250–€500,000 (up to €1M per day for continuing violations).",
  },
  timeline: {
    typical_duration_months: { min: 4, max: 8 },
  },
  foreign_ownership: {
    cap_percent: null,
  },
  renewal: { term_years: 10 },
  security_review: {
    required: true,
    authority: "Luxembourg Space Agency",
    framework: "Law of 15 December 2020",
  },
  operator_snapshots: {
    starlink: { status: "licensed", since: "2022-06" },
    kuiper: { status: "pending" },
    oneweb: { status: "licensed" },
  },
};
