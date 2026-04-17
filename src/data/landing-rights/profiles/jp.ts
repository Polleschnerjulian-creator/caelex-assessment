import type { LandingRightsProfile } from "../types";

export const PROFILE_JP: LandingRightsProfile = {
  jurisdiction: "JP",
  depth: "standard",
  last_verified: "2026-04-17",
  overview: {
    summary:
      "Japan operates a two-track regime under the Ministry of Internal Affairs and Communications (MIC), with co-authority from the Ministry of Defense and METI (security review). Legal bases include the Radio Act (Law 131/1950), the Telecommunications Business Act, and the Space Activities Act 2016. A 1/3 foreign-ownership bar applies, but the carrier-radio exemption unlocks market access — Starlink is operational via KDDI partnership.",
    regime_type: "two_track",
    in_force_date: "2016-11-16",
  },
  regulators: [
    {
      name: "Ministry of Internal Affairs and Communications",
      abbreviation: "MIC",
      role: "primary",
      url: "https://www.soumu.go.jp/english/",
    },
    {
      name: "Ministry of Defense",
      abbreviation: "MOD",
      role: "co_authority",
    },
    {
      name: "Ministry of Economy, Trade and Industry",
      abbreviation: "METI",
      role: "security_review",
    },
  ],
  legal_basis: [
    {
      source_id: "jp-radio-act-1950",
      title: "Radio Act",
      citation: "Law No. 131 of 1950",
    },
    {
      source_id: "jp-telecom-business-act",
      title: "Telecommunications Business Act",
    },
    {
      source_id: "jp-space-activities-act-2016",
      title:
        "Act on Launching of Spacecraft, etc. and Control of Spacecraft (Space Activities Act)",
      citation: "Act No. 76 of 2016",
    },
  ],
  fees: {
    application: {
      min: 500000,
      max: 5000000,
      currency: "JPY",
    },
  },
  timeline: {
    typical_duration_months: { min: 9, max: 18 },
  },
  foreign_ownership: {
    cap_percent: 33,
    workaround: "Carrier-radio exemption (via domestic carrier like KDDI).",
  },
  renewal: { term_years: 5 },
  security_review: {
    required: true,
    authority: "METI + Ministry of Defense",
    framework: "Foreign Exchange and Foreign Trade Act (FEFTA)",
  },
  operator_snapshots: {
    starlink: {
      status: "licensed",
      since: "2022-10",
      note: "Live via KDDI partnership.",
    },
    kuiper: { status: "pending" },
    oneweb: { status: "licensed" },
  },
};
