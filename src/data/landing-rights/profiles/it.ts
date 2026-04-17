import type { LandingRightsProfile } from "../types";

export const PROFILE_IT: LandingRightsProfile = {
  jurisdiction: "IT",
  depth: "standard",
  last_verified: "2026-04-17",
  overview: {
    summary:
      "Italy operates a two-track regime: AGCOM (spectrum/market authorisation), MIMIT (ministry supervision), and ASI (space agency oversight). Law 89/2025, in force since 25 June 2025, is the major milestone — establishing a €100M insurance cap per claim (€20M for startups and scientific missions). Starlink has been operational since September 2021; the €1.5B Meloni-era deal collapsed in March 2025. Statutory review windows are 60 days, with a +120-day extension.",
    regime_type: "two_track",
    in_force_date: "2025-06-25",
    last_major_change: "2025-06-25",
  },
  regulators: [
    {
      name: "Autorità per le Garanzie nelle Comunicazioni",
      abbreviation: "AGCOM",
      role: "primary",
      url: "https://www.agcom.it/",
    },
    {
      name: "Ministero delle Imprese e del Made in Italy",
      abbreviation: "MIMIT",
      role: "co_authority",
    },
    {
      name: "Agenzia Spaziale Italiana",
      abbreviation: "ASI",
      role: "co_authority",
      url: "https://www.asi.it/",
    },
    {
      name: "Comitato parlamentare per la sicurezza della Repubblica",
      abbreviation: "COPASIR",
      role: "security_review",
    },
  ],
  legal_basis: [
    {
      source_id: "it-law-89-2025",
      title: "Legge n. 89/2025 (Italian Space Law)",
      citation: "In force 25 June 2025",
    },
    {
      source_id: "it-codice-comunicazioni-elettroniche",
      title: "Codice delle comunicazioni elettroniche",
    },
  ],
  fees: {
    application: {
      min: 5000,
      max: 50000,
      currency: "EUR",
    },
    note: "Insurance cap €100M per claim (€20M for startups/scientific missions).",
  },
  timeline: {
    typical_duration_months: { min: 6, max: 10 },
    statutory_window_days: 60,
    note: "60-day statutory window with +120-day extension.",
  },
  foreign_ownership: {
    cap_percent: null,
    note: "Golden Power review applies to strategic acquisitions.",
  },
  renewal: { term_years: 10 },
  security_review: {
    required: true,
    authority: "Presidenza del Consiglio dei Ministri (Golden Power)",
    framework: "Decreto-Legge n. 21/2012 (Golden Power) + Law 89/2025",
  },
  operator_snapshots: {
    starlink: { status: "licensed", since: "2021-09" },
    kuiper: { status: "pending" },
    oneweb: { status: "licensed" },
  },
};
