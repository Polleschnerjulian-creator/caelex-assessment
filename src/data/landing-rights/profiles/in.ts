import type { LandingRightsProfile } from "../types";

export const PROFILE_IN: LandingRightsProfile = {
  jurisdiction: "IN",
  depth: "deep",
  last_verified: "2026-04-17",
  overview: {
    summary:
      "India operates a three-approval regime: DoT GMPCS licence under the Telecommunications Act 2023, IN-SPACe authorisation under the Indian Space Policy 2023, and TRAI recommendations on spectrum assignment. Plus a mandatory security clearance from MHA. Starlink illustrates the timeline: filed 2021, commercial authorisation July 2025.",
    regime_type: "two_track",
    in_force_date: "2023-12-24",
    last_major_change: "2025-07-08",
  },
  regulators: [
    {
      name: "Department of Telecommunications",
      abbreviation: "DoT",
      role: "primary",
    },
    {
      name: "Indian National Space Promotion and Authorization Centre",
      abbreviation: "IN-SPACe",
      role: "co_authority",
    },
    {
      name: "Telecom Regulatory Authority of India",
      abbreviation: "TRAI",
      role: "co_authority",
    },
    {
      name: "Ministry of Home Affairs",
      abbreviation: "MHA",
      role: "security_review",
    },
  ],
  legal_basis: [
    {
      source_id: "in-telecommunications-act-2023",
      title: "Telecommunications Act, 2023",
    },
    {
      source_id: "in-space-policy-2023",
      title: "Indian Space Policy 2023",
    },
    {
      source_id: "in-dot-gmpcs-2022",
      title: "DoT 2022 Guidelines for satcom GMPCS networks",
    },
  ],
  fees: {
    annual: {
      currency: "INR",
      note: "TRAI recommends 4% of AGR + INR 500/subscriber/year urban surcharge.",
    },
  },
  timeline: {
    typical_duration_months: { min: 24, max: 48 },
    note: "Starlink: 4 years end-to-end. OneWeb/Jio-SES ~2–3 years.",
  },
  foreign_ownership: {
    cap_percent: null,
    note: "100% automatic route for satellite manufacturing/operation since March 2024 (Press Note 1).",
  },
  renewal: { term_years: 5 },
  security_review: {
    required: true,
    authority: "MHA",
    framework:
      "Mandatory clearance + per-terminal registration, lawful intercept, geo-fencing.",
  },
  operator_snapshots: {
    starlink: { status: "licensed", since: "2025-07-08" },
    kuiper: { status: "pending" },
    oneweb: { status: "licensed", since: "2023-11" },
  },
};
