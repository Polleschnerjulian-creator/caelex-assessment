import type { LandingRightsProfile } from "../types";

export const PROFILE_AU: LandingRightsProfile = {
  jurisdiction: "AU",
  depth: "standard",
  last_verified: "2026-04-17",
  overview: {
    summary:
      "Australia operates a two-track regime: ACMA is the primary telecoms regulator, and the Australian Space Agency (ASA) supervises space activities. Legal basis includes the Radiocommunications Act 1992 and the Space (Launches and Returns) Act 2018. New-satellite apparatus fee is AUD $35,956. The SOCI Act and FIRB review govern security considerations. Minimum insurance is A$100M (with A$3B state excess).",
    regime_type: "two_track",
    in_force_date: "2018-08-27",
  },
  regulators: [
    {
      name: "Australian Communications and Media Authority",
      abbreviation: "ACMA",
      role: "primary",
      url: "https://www.acma.gov.au/",
    },
    {
      name: "Australian Space Agency",
      abbreviation: "ASA",
      role: "co_authority",
      url: "https://www.space.gov.au/",
    },
    {
      name: "Foreign Investment Review Board",
      abbreviation: "FIRB",
      role: "security_review",
      url: "https://firb.gov.au/",
    },
  ],
  legal_basis: [
    {
      source_id: "au-radiocommunications-act-1992",
      title: "Radiocommunications Act 1992",
    },
    {
      source_id: "au-space-launches-returns-act-2018",
      title: "Space (Launches and Returns) Act 2018",
    },
    {
      source_id: "au-soci-act",
      title: "Security of Critical Infrastructure Act 2018 (SOCI)",
    },
  ],
  fees: {
    application: {
      min: 35956,
      max: 35956,
      currency: "AUD",
      note: "New-sat apparatus fee.",
    },
    note: "Minimum insurance A$100M (with A$3B state excess).",
  },
  timeline: {
    typical_duration_months: { min: 6, max: 12 },
  },
  foreign_ownership: {
    cap_percent: null,
    note: "FIRB review for $275M+ acquisitions.",
  },
  renewal: { term_years: 10 },
  security_review: {
    required: true,
    authority: "Foreign Investment Review Board",
    framework: "SOCI Act 2018 + FIRB review",
  },
  operator_snapshots: {
    starlink: { status: "licensed", since: "2021-04" },
    kuiper: {
      status: "pending",
      note: "Listed in 2025 Foreign Space Objects Determination.",
    },
    oneweb: { status: "licensed" },
  },
};
