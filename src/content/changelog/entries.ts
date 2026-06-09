// ============================================================================
// CHANGELOG ENTRIES — Single Source of Truth for the Public Changelog
// ============================================================================
//
// This file is the ONLY place changelog content lives. The changelog page
// renders directly from `changelogEntries` — no CMS, no markdown, no DB.
//
// How to add an entry:
//   1. An entry exists ONLY when there is something customer-visible to
//      announce. Quiet weeks are SKIPPED — never pad with internal work,
//      refactors, audits, or "progress" updates. In-progress or unshipped
//      work never gets an entry; a capability is announced the week users
//      can actually touch it.
//   2. Prepend the new entry at the TOP of the array (entries are sorted
//      newest first — keep it that way).
//   3. `week` is the ISO week (e.g. "2026-W25"); `date` is the ISO date of
//      that week's MONDAY (e.g. "2026-06-15").
//   4. Move `featured: true` to the new top entry and remove it from the
//      previous one (only the latest entry is featured).
//   5. Write like the best changelogs: the headline names the capability,
//      never the work performed. The summary leads with what the reader
//      can now do ("You can now…", "Passage now…"), then 2-4 punchy,
//      single-claim bullets. Sell the capability, hide the mechanism —
//      user-visible outcomes only, no architecture or internals.
//   6. PUBLIC PAGE — never include internal metrics, quality scores,
//      audits, customer names, commit hashes, branch names, file paths,
//      codenames, or internal finding IDs. No implementation detail a
//      competitor could copy. Phrase security work as a new user-facing
//      capability, never as a fixed vulnerability.
//   7. `link` is optional: at most one action link per entry, pointing at
//      a REAL public route (/demo, /platform, /modules). Never link to a
//      gated app route (/dashboard, /atlas, /trade, /scholar).
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
  highlights: string[]; // 2-4 bullets
  featured?: boolean;
  link?: { label: string; href: string }; // optional action link — public routes only
}

export const changelogEntries: ChangelogEntry[] = [
  {
    week: "2026-W24",
    date: "2026-06-08",
    title: "Passage: export control that explains itself",
    products: ["Passage"],
    summary:
      "Passage now covers the full export-control loop: classify, screen, license, ship — and every consequential result explains itself. Rounding out the release: four-eyes classification approvals and one-click “Why this?” dossiers for regulators.",
    highlights: [
      "The Explanation Envelope: every result explains itself — what was decided, why, and with what confidence, sources included.",
      "Fail-closed screening: shipments are held automatically while any sanctions match is unresolved, and every screening dataset shows a visible “current as of” date.",
      "Guided customs filings: draft documents for the German ATLAS customs system, US AES, and Destination Control Statements with live preview — missing identifiers are flagged before you file.",
      "An AI copilot that proposes, never imposes: every suggested change is a pending proposal that a named human reviews and applies.",
    ],
    featured: true,
    link: { label: "See it in action", href: "/demo" },
  },
  {
    week: "2026-W23",
    date: "2026-06-01",
    title:
      "Scholar goes live — and Atlas semantic search spans the entire case corpus",
    products: ["Atlas", "Scholar"],
    summary:
      "Scholar, our research surface for universities, is now live end to end: a distraction-free reading experience, search, an interactive research graph, faceted browsing, bookmarks, and reading lists. In Atlas, semantic search now spans the entire case corpus.",
    highlights: [
      "Planspiele are live in Scholar: scenario-driven regulatory simulations with two-track scoring and an instructor cohort view.",
      "Atlas cites the in-force German and Dutch statutes, competent authorities, and thresholds.",
      "Atlas settings now include a security activity log, notification controls, AI preferences, and saved firm letterhead and branding.",
    ],
    link: { label: "Explore the platform", href: "/platform" },
  },
  {
    week: "2026-W22",
    date: "2026-05-25",
    title: "Screening that follows the ownership chain",
    products: ["Passage"],
    summary:
      "Passage now flags entities majority-owned by sanctioned parties — even when they never appear on a list themselves. Classification got sharper too: items are now matched against control-list parameters on their actual technical attributes.",
    highlights: [
      "Ownership-cascade screening: entities 50% or more owned by sanctioned parties are flagged automatically, beyond the listed name.",
      "Attribute-aware classification: an item's technical parameters are checked directly against control-list entries for sharper, more defensible matches.",
      "Screening always reflects the current official lists.",
    ],
    link: { label: "Book a demo", href: "/demo" },
  },
  {
    week: "2026-W21",
    date: "2026-05-18",
    title: "Sanctions screening across consolidated official lists",
    products: ["Passage"],
    summary:
      "Sanctions screening in Passage now spans multiple official lists — one check covers them all. Items can now carry structured technical attributes, the same parameters control lists are written in, so classification starts from precise data instead of free text.",
    highlights: [
      "One screening check now covers multiple official sanctions lists at once.",
      "You can now record structured technical attributes on every item — the same parameters control-list entries specify.",
      "Every screening result stays checkable against the primary official lists.",
    ],
    link: { label: "Explore the platform", href: "/platform" },
  },
];
