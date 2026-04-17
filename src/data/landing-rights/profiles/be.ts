import type { LandingRightsProfile } from "../types";

export const PROFILE_BE: LandingRightsProfile = {
  jurisdiction: "BE",
  depth: "standard",
  last_verified: "2026-04-17",
  overview: {
    summary:
      "Belgium operates a two-track regime: BIPT/IBPT (Belgisch Instituut voor postdiensten en telecommunicatie) handles spectrum, while BELSPO (Federal Science Policy) supervises space activities. Legal basis is the Law of 17 September 2005 (revised 2013) and the Royal Decree of 15 March 2022. Application fee is exactly €1,000. Operator liability is capped at 10% of operator turnover.",
    regime_type: "two_track",
    in_force_date: "2005-09-17",
    last_major_change: "2022-03-15",
  },
  regulators: [
    {
      name: "Belgisch Instituut voor postdiensten en telecommunicatie",
      abbreviation: "BIPT",
      role: "primary",
      url: "https://www.bipt.be/",
    },
    {
      name: "Federaal Wetenschapsbeleid (Belgian Science Policy Office)",
      abbreviation: "BELSPO",
      role: "co_authority",
      url: "https://www.belspo.be/",
    },
    {
      name: "Federal Ministry of Economy",
      abbreviation: "FPS Economy",
      role: "security_review",
    },
  ],
  legal_basis: [
    {
      source_id: "be-law-17-september-2005",
      title: "Law of 17 September 2005 on space activities (revised 2013)",
    },
    {
      source_id: "be-royal-decree-15-march-2022",
      title: "Royal Decree of 15 March 2022",
    },
  ],
  fees: {
    application: {
      min: 1000,
      max: 1000,
      currency: "EUR",
      note: "Fixed application fee €1,000.",
    },
    note: "Liability capped at 10% of operator turnover.",
  },
  timeline: {
    typical_duration_months: { min: 6, max: 12 },
  },
  foreign_ownership: {
    cap_percent: null,
    note: "Liability capped at 10% of operator turnover.",
  },
  renewal: { term_years: 10 },
  security_review: {
    required: true,
    authority: "Federal Ministry of Economy",
    framework: "Law of 17 September 2005",
  },
  operator_snapshots: {
    starlink: { status: "licensed", since: "2021-04" },
    kuiper: { status: "pending" },
    oneweb: { status: "licensed" },
  },
};
