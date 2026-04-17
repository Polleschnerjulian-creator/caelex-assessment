import type { LandingRightsProfile } from "../types";

export const PROFILE_CA: LandingRightsProfile = {
  jurisdiction: "CA",
  depth: "standard",
  last_verified: "2026-04-17",
  overview: {
    summary:
      "Canada operates a two-track regime: Innovation, Science and Economic Development Canada (ISED) and the CRTC handle spectrum and telecoms; Global Affairs Canada governs remote-sensing and security review. Legal basis includes the Radiocommunication Act and the Remote Sensing Space Systems Act (S.C. 2005, c.45). Satellite-sector foreign ownership restrictions were removed in 2017. The RSSSA requires Canadian command-and-control.",
    regime_type: "two_track",
    last_major_change: "2017-06-22",
  },
  regulators: [
    {
      name: "Innovation, Science and Economic Development Canada",
      abbreviation: "ISED",
      role: "primary",
      url: "https://ised-isde.canada.ca/",
    },
    {
      name: "Canadian Radio-television and Telecommunications Commission",
      abbreviation: "CRTC",
      role: "co_authority",
      url: "https://www.crtc.gc.ca/",
    },
    {
      name: "Global Affairs Canada",
      abbreviation: "GAC",
      role: "security_review",
    },
  ],
  legal_basis: [
    {
      source_id: "ca-radiocommunication-act",
      title: "Radiocommunication Act",
    },
    {
      source_id: "ca-rsssa-2005",
      title: "Remote Sensing Space Systems Act",
      citation: "S.C. 2005, c.45",
    },
  ],
  fees: {
    application: {
      min: 5000,
      max: 50000,
      currency: "CAD",
    },
  },
  timeline: {
    typical_duration_months: { min: 9, max: 15 },
  },
  foreign_ownership: {
    cap_percent: null,
    note: "RSSSA requires Canadian command-control.",
    workaround:
      "Telecom foreign-ownership restrictions removed 2017 for satellite carriers.",
  },
  renewal: { term_years: 10 },
  security_review: {
    required: true,
    authority: "Global Affairs Canada",
    framework: "Remote Sensing Space Systems Act (RSSSA)",
  },
  operator_snapshots: {
    starlink: { status: "licensed", since: "2020-11" },
    kuiper: { status: "pending" },
    oneweb: { status: "licensed" },
  },
};
