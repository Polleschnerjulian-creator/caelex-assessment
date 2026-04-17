import type { LandingRightsProfile } from "../types";

export const PROFILE_UK: LandingRightsProfile = {
  jurisdiction: "UK",
  depth: "standard",
  last_verified: "2026-04-17",
  overview: {
    summary:
      "The United Kingdom operates a two-track regime: Ofcom licenses spectrum under the Wireless Telegraphy Act 2006, while the Civil Aviation Authority (CAA) licenses space activities under the Outer Space Act 1986 and the Space Industry Act 2018 (with SI 2021/792 regulations). The NSI Act 2021 Schedule 14 triggers mandatory notification for space-sector investments. CAA licence timelines typically run 12–18 months.",
    regime_type: "two_track",
  },
  regulators: [
    {
      name: "Office of Communications",
      abbreviation: "Ofcom",
      role: "primary",
      url: "https://www.ofcom.org.uk/",
    },
    {
      name: "Civil Aviation Authority",
      abbreviation: "CAA",
      role: "co_authority",
      url: "https://www.caa.co.uk/",
    },
    {
      name: "UK Space Agency",
      abbreviation: "UKSA",
      role: "co_authority",
      url: "https://www.gov.uk/government/organisations/uk-space-agency",
    },
    {
      name: "Investment Security Unit",
      abbreviation: "ISU",
      role: "security_review",
    },
  ],
  legal_basis: [
    {
      source_id: "uk-wireless-telegraphy-act-2006",
      title: "Wireless Telegraphy Act 2006",
    },
    {
      source_id: "uk-outer-space-act-1986",
      title: "Outer Space Act 1986",
    },
    {
      source_id: "uk-space-industry-act-2018",
      title: "Space Industry Act 2018",
      citation: "SI 2021/792 (Space Industry Regulations 2021)",
    },
    {
      source_id: "uk-nsi-act-2021",
      title: "National Security and Investment Act 2021",
      citation: "Schedule 14 (mandatory notification — space sector)",
    },
  ],
  fees: {
    application: {
      min: 1000,
      max: 10000,
      currency: "GBP",
      note: "Modelled Insurance Requirement (MIR) determined per mission; no fixed cap.",
    },
    note: "MIR replaces the previous fixed £60M cap on liability insurance.",
  },
  timeline: {
    typical_duration_months: { min: 12, max: 18 },
    note: "CAA licence under Space Industry Act 2018 drives the long tail.",
  },
  foreign_ownership: {
    cap_percent: null,
    workaround:
      "NSI Act Schedule 14 triggers mandatory notification but does not cap ownership.",
  },
  renewal: { term_years: 10 },
  security_review: {
    required: true,
    authority: "Investment Security Unit (Cabinet Office)",
    framework: "National Security and Investment Act 2021 — Schedule 14",
  },
  operator_snapshots: {
    starlink: { status: "licensed", since: "2020-11" },
    kuiper: {
      status: "pending",
      note: "Ofcom NGSO auth pending.",
    },
    oneweb: { status: "licensed", since: "2019-03" },
  },
};
