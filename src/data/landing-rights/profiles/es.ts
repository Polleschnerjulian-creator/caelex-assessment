import type { LandingRightsProfile } from "../types";

export const PROFILE_ES: LandingRightsProfile = {
  jurisdiction: "ES",
  depth: "standard",
  last_verified: "2026-04-17",
  overview: {
    summary:
      "Spain currently operates a telecoms-only regime: CNMC (competition and markets authority) and SETID (Secretariat for Telecommunications and Digital Infrastructure) govern spectrum and market access. No comprehensive national space act has been enacted. Primary legal basis is Ley 11/2022 General de Telecomunicaciones. Concessions can run 20–40 years.",
    regime_type: "telecoms_only",
    in_force_date: "2022-06-30",
  },
  regulators: [
    {
      name: "Comisión Nacional de los Mercados y la Competencia",
      abbreviation: "CNMC",
      role: "primary",
      url: "https://www.cnmc.es/",
    },
    {
      name: "Secretaría de Estado de Telecomunicaciones e Infraestructuras Digitales",
      abbreviation: "SETID",
      role: "co_authority",
    },
    {
      name: "Centro Nacional de Inteligencia",
      abbreviation: "CNI",
      role: "security_review",
    },
  ],
  legal_basis: [
    {
      source_id: "es-ley-11-2022",
      title: "Ley 11/2022 General de Telecomunicaciones",
    },
    {
      source_id: "es-telecomunicaciones-ley-general",
      title: "Ley General de Telecomunicaciones",
    },
  ],
  fees: {
    application: {
      min: 5000,
      max: 30000,
      currency: "EUR",
    },
  },
  timeline: {
    typical_duration_months: { min: 8, max: 14 },
  },
  foreign_ownership: {
    cap_percent: null,
    note: "FDI screening above 10% stake under Real Decreto-Ley 8/2020.",
  },
  renewal: { term_years: 20, note: "20–40 year concessions possible." },
  security_review: {
    required: true,
    authority: "Centro Nacional de Inteligencia",
    framework: "FDI screening (Real Decreto-Ley 8/2020)",
  },
  operator_snapshots: {
    starlink: {
      status: "licensed",
      since: "2022-01",
      note: "Mainland operational.",
    },
    kuiper: { status: "pending" },
    oneweb: { status: "licensed" },
  },
};
