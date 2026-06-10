/**
 * Ultimate Operator Assessment — Rulebook version dataset (Task 1.1).
 *
 * THE single source of "which legal texts, as of when" every verdict is
 * computed against. Each `AssessmentFinding` pins `RULEBOOK.version`
 * (semver) so a stored verdict snapshot can always be traced back to the
 * exact rulebook state it was computed from.
 *
 * §7.1 corrections are BAKED IN here (and locked by rulebook.test.ts):
 *   #1 — the 5 Dec 2025 Council-track text is a Danish PRESIDENCY compromise.
 *        As of June 2026 the Council has adopted NO position at all (the
 *        29 May 2026 COMPET took only a progress report and passed the file
 *        to the Irish presidency). No label may say "general approach".
 *   #2 — "Art 75a" is unverified / likely invented and must not appear in
 *        any label or citation. The contested cyber-architecture positions
 *        are encoded machine-readably in CONTESTED_POSITIONS instead.
 *   #7 — the application date is contested THREE ways (Commission 2030
 *        prong, Commission 2032 second prong, Council/EP 36 months).
 *
 * Pure data — importable client+server (no `server-only`, no React).
 */

export interface RulebookSource {
  id: string; // "com-2025-335" | "presidency-compromise" | ...
  label: string; // human label — §7.1-corrected wording
  citation: string;
  asOf: string; // ISO date
  verified: boolean; // false = could not be verified against primary text
  note?: string;
}

export const RULEBOOK = {
  version: "1.0.0",
  sources: [
    {
      id: "com-2025-335",
      label: "EU Space Act proposal — Commission text",
      citation: "COM(2025) 335",
      asOf: "2025-06-25",
      verified: true,
    },
    // §7.1 #1: NOT "Council general approach". As of June 2026 the Council has
    // adopted NO position (29 May 2026 COMPET: progress report only, file passed
    // to the Irish presidency).
    {
      id: "presidency-compromise",
      label:
        "Danish Presidency compromise text (Council track — no Council position adopted as of June 2026)",
      citation: "Council doc., Presidency compromise",
      asOf: "2025-12-05",
      verified: true,
    },
    {
      id: "ep-itre-draft",
      label: "EP ITRE draft report",
      citation: "ITRE draft report on COM(2025) 335",
      asOf: "2026-03-03",
      verified: true,
    },
    {
      id: "nis2",
      label: "NIS2 Directive",
      citation: "Directive (EU) 2022/2555",
      asOf: "2022-12-27",
      verified: true,
    },
    {
      id: "nis2umsucg-de",
      label: "German NIS2 transposition (in force, BSI competent)",
      citation: "NIS2UmsuCG",
      asOf: "2025-12-06",
      verified: true,
    },
    {
      id: "dual-use-update",
      label: "Dual-Use Annex I update (spacecraft 'mission equipment' rework)",
      citation: "Delegated Reg. (EU) 2025/2003, OJ 14 Nov 2025",
      asOf: "2025-09-08",
      verified: true,
    },
    // National space laws — one entry each (dates grounded in the verified
    // jurisdiction dataset, src/data/national-space-laws.ts).
    {
      id: "fr-los",
      label: "French Space Operations Act (LOS)",
      citation: "Loi n° 2008-518 du 3 juin 2008 (FSOA/LOS)",
      asOf: "2008-06-03",
      verified: true,
    },
    {
      id: "it-law-89-2025",
      label: "Italian Space Economy Act",
      citation:
        "Legge 13 giugno 2025, n. 89 (approved 11 June 2025; GU Serie Generale n. 144, 24 June 2025)",
      asOf: "2025-06-11",
      verified: true,
    },
    {
      id: "uk-sia-osa",
      label: "UK Space Industry Act 2018 / Outer Space Act 1986",
      citation: "Space Industry Act 2018 c. 5; Outer Space Act 1986 c. 38",
      asOf: "2018-03-15",
      verified: true,
    },
    {
      id: "lu-space-acts",
      label: "Luxembourg space legislation",
      citation:
        "Loi du 15 décembre 2020 sur les activités spatiales; Space Resources Act 2017",
      asOf: "2020-12-15",
      verified: true,
    },
    {
      id: "nl-space-activities-act",
      label: "Dutch Space Activities Act",
      citation: "Wet ruimtevaartactiviteiten (Wet van 24 januari 2007)",
      asOf: "2007-01-24",
      verified: true,
    },
    {
      id: "de-satdsig",
      label: "German Satellite Data Security Act (BAFA competent)",
      citation: "SatDSiG (Satellitendatensicherheitsgesetz, 23 Nov 2007)",
      asOf: "2007-11-23",
      verified: true,
    },
  ] as const satisfies readonly RulebookSource[],
} as const;

/** §7.1 #2 + #7: machine-readable contested positions for flux flags. */
export const CONTESTED_POSITIONS = {
  applicationDate: [
    { source: "com-2025-335", position: "1 January 2030" },
    {
      source: "com-2025-335",
      position: "1 January 2032 for certain assets (second prong)",
    },
    {
      source: "presidency-compromise",
      position: "36 months after entry into force",
    }, // EP ITRE same
  ],
  cyberArchitecture: [
    {
      source: "com-2025-335",
      position: "Space Act resilience chapter (Arts 74–95) as lex specialis",
    },
    {
      source: "presidency-compromise",
      position:
        "synchronisation — 'without prejudice to NIS2'; Art 75 et seq. only for operators below NIS2 Art 3 thresholds + third-country operators",
    },
    {
      source: "ep-itre-draft",
      position: "resilience chapter deleted; NIS2 extended via new Art 117a",
    },
  ],
  cdrWindow: [
    {
      source: "com-2025-335",
      position: "CDR within 12 months of entry into force",
    },
    { source: "presidency-compromise", position: "CDR within 24 months" },
  ],
} as const;
