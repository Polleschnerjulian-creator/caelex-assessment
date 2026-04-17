import type { LandingRightsProfile } from "../types";

export const PROFILE_DE: LandingRightsProfile = {
  jurisdiction: "DE",
  depth: "standard",
  last_verified: "2026-04-17",
  overview: {
    summary:
      "Germany currently operates a telecoms-only regime for satellite market access. BNetzA licenses spectrum and ITU filings; a dedicated Space Act (Weltraumgesetz, WRG) has been in draft since September 2024. Once enacted, it will introduce a licensing, liability, and insurance regime applicable to German-established operators.",
    regime_type: "emerging",
    last_major_change: "2024-09-04",
  },
  regulators: [
    {
      name: "Bundesnetzagentur",
      abbreviation: "BNetzA",
      role: "primary",
      url: "https://www.bundesnetzagentur.de/",
    },
    {
      name: "Bundesministerium für Wirtschaft und Klimaschutz",
      abbreviation: "BMWK",
      role: "co_authority",
    },
  ],
  legal_basis: [
    {
      source_id: "de-telekommunikationsgesetz",
      title: "Telekommunikationsgesetz (TKG)",
      citation: "§§ 52, 55 TKG (spectrum authorisation)",
    },
    {
      source_id: "de-awv",
      title: "Außenwirtschaftsverordnung (AWV)",
      citation: "§§ 55–57 AWV (FDI screening)",
    },
  ],
  fees: {
    application: {
      currency: "EUR",
      note: "BNetzA schedule, typically €1k–€10k depending on band",
    },
    note: "No space-licence fee until WRG enactment.",
  },
  timeline: {
    typical_duration_months: { min: 4, max: 9 },
    note: "Driven by ITU coordination status and BNetzA queue.",
  },
  foreign_ownership: {
    cap_percent: null,
    note: "No sector-specific cap; AWV screening triggers at ≥10% stake for sensitive sectors including aerospace.",
  },
  renewal: { term_years: 10 },
  security_review: {
    required: true,
    authority: "BMWK",
    framework: "AWV cross-sectoral FDI screening (expanded 2020/21)",
  },
  operator_snapshots: {
    starlink: {
      status: "licensed",
      since: "2020-12",
      note: "BNetzA market authorisation granted December 2020.",
    },
    kuiper: { status: "pending" },
    oneweb: { status: "licensed" },
  },
};
