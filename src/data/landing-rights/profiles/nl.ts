import type { LandingRightsProfile } from "../types";

export const PROFILE_NL: LandingRightsProfile = {
  jurisdiction: "NL",
  depth: "standard",
  last_verified: "2026-04-17",
  overview: {
    summary:
      "The Netherlands operates a two-track regime: RDI (formerly Agentschap Telecom) handles spectrum and the Ministry of Economic Affairs and Climate (EZK) supervises space activities. The Space Activities Act 2007 and the 2015 Unguided Objects Decree provide the legal basis. Licences require 6-month advance filing and are non-transferable.",
    regime_type: "two_track",
    in_force_date: "2008-01-01",
  },
  regulators: [
    {
      name: "Rijksinspectie Digitale Infrastructuur",
      abbreviation: "RDI",
      role: "primary",
      url: "https://www.rdi.nl/",
    },
    {
      name: "Ministerie van Economische Zaken en Klimaat",
      abbreviation: "EZK",
      role: "co_authority",
    },
    {
      name: "Netherlands Space Office",
      abbreviation: "NSO",
      role: "security_review",
      url: "https://www.spaceoffice.nl/",
    },
  ],
  legal_basis: [
    {
      source_id: "nl-space-activities-act-2007",
      title: "Wet ruimtevaartactiviteiten (Space Activities Act 2007)",
    },
    {
      source_id: "nl-unguided-decree-2015",
      title: "Besluit ongeleide satellieten (Unguided Objects Decree 2015)",
    },
  ],
  fees: {
    application: {
      min: 2000,
      max: 20000,
      currency: "EUR",
    },
    note: "Licences non-transferable.",
  },
  timeline: {
    typical_duration_months: { min: 6, max: 10 },
    note: "6-month advance filing requirement.",
  },
  foreign_ownership: {
    cap_percent: null,
  },
  renewal: { term_years: 10 },
  security_review: {
    required: true,
    authority: "Netherlands Space Office / EZK",
    framework: "Space Activities Act 2007",
  },
  operator_snapshots: {
    starlink: { status: "licensed", since: "2021-03" },
    kuiper: { status: "pending" },
    oneweb: { status: "licensed" },
  },
};
