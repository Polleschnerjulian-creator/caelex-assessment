// ============================================================================
// CHANGELOG ENTRIES — Single Source of Truth for the Public Changelog
// ============================================================================
//
// This file is the ONLY place changelog content lives. The changelog page
// renders directly from `changelogEntries` — no CMS, no markdown, no DB.
//
// How to add a new week:
//   1. Prepend a new entry at the TOP of the array (entries are sorted
//      newest first — keep it that way).
//   2. `week` is the ISO week (e.g. "2026-W25"); `date` is the ISO date of
//      that week's MONDAY (e.g. "2026-06-15").
//   3. Move `featured: true` to the new top entry and remove it from the
//      previous one (only the latest week is featured).
//   4. Write 2-4 summary sentences and 3-5 highlight bullets. Every claim
//      must trace to work that actually shipped that week.
//   5. PUBLIC PAGE — never include internal metrics, customer names, commit
//      hashes, branch names, file paths, or internal finding IDs. Phrase
//      security work as proactive hardening, never as a fixed vulnerability.
//
// ============================================================================

export type ChangelogProduct =
  | "Atlas"
  | "Comply"
  | "Passage"
  | "Scholar"
  | "Academy"
  | "Platform";

export interface ChangelogEntry {
  week: string; // ISO week, e.g. "2026-W23"
  date: string; // ISO date of the Monday of that week, e.g. "2026-06-01"
  title: string; // the week's headline
  products: ChangelogProduct[];
  summary: string; // 2-4 sentences
  highlights: string[]; // 3-5 bullets
  featured?: boolean;
}

export const changelogEntries: ChangelogEntry[] = [
  {
    week: "2026-W24",
    date: "2026-06-08",
    title: "Passage: export control that explains itself",
    products: ["Passage", "Platform"],
    summary:
      "Passage now covers the full export-control loop: classify, screen, license, ship. The centerpiece is the Explanation Envelope, a structural guarantee that no consequential result can appear without saying what was decided, why it was decided, and what to do next. Around it, Passage gained fail-closed screening, a server-side shipment gate, four-eyes approvals, regulator-ready dossiers, a guided customs stage, voluntary self-disclosure alerting on a visible 60-day clock, and an AI copilot that drafts while humans decide. Beyond Passage, the public landing page was redesigned end to end, and new product analytics are aggregate-only and privacy-first by design.",
    highlights: [
      "Explanation Envelope, enforced structurally: classification, screening, and license results cannot render without their what, why, and what-next, plus a confidence level and sources.",
      "Fail-closed screening: three-valued sanctions matching and a server-side pre-shipment gate that holds a shipment while any match is unresolved.",
      "Every screening reference dataset shows a visible “current as of” date.",
      "Accountability as a feature: four-eyes classification approval, a tamper-evident audit-trail viewer, and one-click regulator-ready “Why this?” dossiers with full provenance and a content hash.",
      "A guided customs stage in the six-stage shipment workflow: German customs (ATLAS), US AES, and Destination Control Statement drafts with live preview and honest flagging of missing identifiers.",
      "An AI copilot that proposes, never imposes: every suggested change becomes a pending proposal that a named human reviews and applies.",
    ],
    featured: true,
  },
  {
    week: "2026-W23",
    date: "2026-06-01",
    title: "Atlas, sharpened — and Scholar's research experience arrives",
    products: ["Atlas", "Scholar"],
    summary:
      "Atlas got faster and more precise this week with a focused quality and performance pass across the legal research workflow: semantic search now spans the entire case corpus, and the heaviest research surfaces load noticeably faster. Scholar, our research surface for universities, shipped its complete reading and research experience in one sweep and introduced Planspiele, scenario-driven regulatory simulations.",
    highlights: [
      "Atlas semantic search now covers the full case corpus, with embeddings regenerated against freshly verified source data.",
      "German and Dutch space-law datasets were verified line by line against primary legal sources: statutes, competent authorities, thresholds, and treaty status.",
      "A rebuilt Atlas settings area: security activity log, notification controls, AI-context preferences, and server-persisted letterhead and branding, with hardened input handling throughout.",
      "Heavy Atlas surfaces now load on demand and large source collections render virtualized, so the workspace opens faster and scrolls instantly.",
      "Scholar shipped end to end: a distraction-free reading shell, search with typed result bands, case detail pages, an interactive research graph, faceted browsing, bookmarks, and reading lists.",
      "Planspiele arrived in Scholar: scenario-driven regulatory simulations with two-track scoring (a deterministic answer key plus an AI coach) and an instructor cohort view.",
    ],
  },
  {
    week: "2026-W22",
    date: "2026-05-25",
    title: "Screening that follows the ownership chain",
    products: ["Passage"],
    summary:
      "Sanctions screening in Passage got stronger on two fronts: list synchronization verifies the integrity of every update, and ownership analysis follows the 50-percent rule down the chain, flagging entities majority-owned by sanctioned parties even when they never appear on a list themselves. Classification got smarter too, with parametric attribute matching against machine-readable control lists.",
    highlights: [
      "Sanctions-list synchronization verifies the integrity of every list update with content-addressed snapshots.",
      "Ownership-cascade screening: entities majority-owned (50% or more) by sanctioned parties are flagged automatically, following ownership chains beyond the listed name.",
      "Parametric attribute matching: item classification cross-walks machine-readable control-list parameters against an item's technical attributes for sharper, more defensible matches.",
    ],
  },
  {
    week: "2026-W21",
    date: "2026-05-18",
    title: "Classification gets a parametric backbone",
    products: ["Passage", "Comply"],
    summary:
      "Export-control classification lives and dies on precise technical parameters, so this week we built them into the data model. Items in Passage now carry structured, machine-readable technical attributes aligned with control-list parameter definitions. Comply's v2 rebuild moved ahead in parallel.",
    highlights: [
      "Every item in Passage can now carry machine-readable technical attributes — the data backbone for parameter-aware classification.",
      "Control-list entries modeled with machine-readable parameters, enabling exact attribute-to-control cross-walks.",
    ],
  },
  {
    week: "2026-W20",
    date: "2026-05-11",
    title: "Open sanctions data, wired in",
    products: ["Passage", "Comply"],
    summary:
      "Trustworthy screening starts with trustworthy data. This week Passage integrated consolidated open sanctions data as the foundation of its screening layer, unifying multiple official lists behind a single matching pipeline. Work on the classification data layer began alongside it, and the Comply v2 redesign continued in the background.",
    highlights: [
      "Screening now builds on consolidated open sanctions data, bringing multiple official sanctions lists into one matching layer.",
      "Groundwork laid for parametric item classification alongside the new screening data foundation.",
    ],
  },
  {
    week: "2026-W19",
    date: "2026-05-04",
    title: "Comply v2 takes shape",
    products: ["Comply"],
    summary:
      "A full week on the redesign of Comply, our guided compliance surface — rethinking the experience screen by screen.",
    highlights: [
      "A cleaner, faster compliance workspace taking shape, iteration by iteration.",
    ],
  },
  {
    week: "2026-W18",
    date: "2026-04-27",
    title: "Comply v2 begins",
    products: ["Comply"],
    summary:
      "Work began on Comply v2, a ground-up redesign of our guided compliance experience.",
    highlights: [
      "Comply v2 underway: rethinking what a guided compliance workspace should be, from the ground up.",
    ],
  },
];
