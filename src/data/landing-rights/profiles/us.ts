import type { LandingRightsProfile } from "../types";

export const PROFILE_US: LandingRightsProfile = {
  jurisdiction: "US",
  depth: "standard",
  last_verified: "2026-04-17",
  overview: {
    summary:
      "The US separates three regulatory tracks: FCC market access under 47 CFR § 25.137 (PDR for foreign-licensed networks), FAA Part 450 for launch/re-entry, and Executive Order 13913 Team Telecom review for foreign-ownership risk. First formal FCC Team Telecom enforcement landed in January 2026 (Marlink).",
    regime_type: "two_track",
    in_force_date: "1934-06-19",
    last_major_change: "2026-01",
  },
  regulators: [
    {
      name: "Federal Communications Commission",
      abbreviation: "FCC",
      role: "primary",
      url: "https://www.fcc.gov/space",
    },
    {
      name: "Federal Aviation Administration — Office of Commercial Space Transportation",
      abbreviation: "FAA AST",
      role: "co_authority",
    },
    {
      name: "Committee for the Assessment of Foreign Participation",
      abbreviation: "Team Telecom",
      role: "security_review",
    },
  ],
  legal_basis: [
    {
      source_id: "us-communications-act-310b",
      title: "Communications Act § 310(b) (foreign ownership)",
    },
    {
      source_id: "us-cfr-25-137",
      title: "47 CFR § 25.137 — foreign-licensed satellite networks",
    },
    {
      source_id: "us-eo-13913",
      title: "Executive Order 13913 (April 2020)",
    },
    {
      source_id: "us-cfr-14-450",
      title: "14 CFR Part 450 — launch & reentry",
    },
  ],
  fees: {
    application: {
      min: 525,
      max: 471575,
      currency: "USD",
      note: "FCC fee schedule; major NGSO filings top range.",
    },
    annual: {
      currency: "USD",
      note: "Regulatory fees per FCC Report & Order.",
    },
  },
  timeline: {
    typical_duration_months: { min: 9, max: 24 },
    statutory_window_days: 120,
    note: "Team Telecom initial review 120 days + possible 90-day extension.",
  },
  foreign_ownership: {
    cap_percent: 20,
    note: "§ 310(b) benchmarks: 20% direct / 25% indirect; routinely waived with Team Telecom mitigation.",
  },
  renewal: { term_years: 15 },
  security_review: {
    required: true,
    authority: "Team Telecom (DOJ / DoD / DHS)",
    framework: "Executive Order 13913",
  },
  operator_snapshots: {
    starlink: {
      status: "licensed",
      since: "2019-03",
      note: "Gen-1 and Gen-2 authorised.",
    },
    kuiper: {
      status: "licensed",
      since: "2020-07",
      note: "3,236 satellites; milestone deadlines 2026-07-30 (50%) and 2029-07-30 (100%).",
    },
    oneweb: { status: "licensed" },
  },
};
