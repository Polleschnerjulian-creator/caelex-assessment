// tests/unit/data/legal-sources-audit-invariants.test.ts

/**
 * Audit-derived invariants for the legal-sources catalogue.
 *
 * These tests are the permanent CI firewall for the regressions caught in
 * the 2026-04-28 Atlas catalogue-consistency audit (see
 * docs/legal-templates/legislative-history-verification.md §5.1.1 for the
 * full corrections diary). Each `describe` block in this file maps 1:1 to
 * a class of bug surfaced during that audit:
 *
 *  1. ID uniqueness (raw, not de-duplicated) — catches the
 *     EU-DORA-2022-was-defined-twice corruption
 *  2. Cross-reference resolution — catches the EE-CYBERSEC-2018.implements
 *     → EU-NIS-2016 broken-reference bug
 *  3. Date-field internal coherence — catches the IT-LEGGE-89-2025 / 7-2018 /
 *     185-1990 / DLgs-128-2003 / treaty-ratifika EIF mismatches
 *  4. `legislative_history` milestone integrity — catches the UK-CA-2003
 *     cross-contamination bug (lh described WTA-2006 instead)
 *  5. Source URL deep-linking — catches the 16 register-homepage URLs that
 *     T17 augmented to deeplinks
 *  6. Type/jurisdiction coherence — catches misclassified jurisdiction:"INT"
 *     entries (T18 fix: INT-UK-RUSSIA-REGS-2019 → UK)
 *  7. official_reference uniqueness within jurisdiction — catches the
 *     UK-SIR-2021 / UK-SI-2021-792 duplicate and FR Décret triple
 *  8. legislative_history chronology — catches type-vs-date order
 *     violations (e.g. promulgation milestone with date earlier than
 *     adoption milestone, except for the documented retroactivity case
 *     EU-SPACE-PROG-2021)
 *
 * The tests are dataset-driven: adding a new jurisdiction or new source
 * inherits all 8 invariants automatically.
 *
 * @see docs/legal-templates/legislative-history-verification.md §5.1.1
 */

import { describe, it, expect } from "vitest";
import { ALL_SOURCES } from "@/data/legal-sources";
import type { LegalSource } from "@/data/legal-sources";

// ─── Build the global ID index once for cross-ref resolution ────────
// Authority ids are referenced by `competent_authorities[]` (already
// covered by the existing legal-sources-invariants.test.ts) and by
// nothing else, so we don't need to load them here.
const SOURCE_IDS = new Set(ALL_SOURCES.map((s) => s.id));

// Helper — flag a value as "this source-block has the field" so
// optional fields don't trip false positives in coverage assertions.
function hasField<T>(v: T | null | undefined): v is T {
  return v !== null && v !== undefined;
}

// ─── 1. Raw ID uniqueness ──────────────────────────────────────────
// The existing legal-sources-invariants.test.ts already deduplicates
// before checking, which would HIDE a duplicate definition (e.g. the
// EU-DORA-2022-was-defined-twice corruption). This invariant uses the
// raw ALL_SOURCES array — duplicates surface immediately.
describe("Audit invariant 1 — raw LegalSource ID uniqueness", () => {
  it("no LegalSource id is defined twice across the catalogue", () => {
    const counts = new Map<string, number>();
    for (const s of ALL_SOURCES) {
      counts.set(s.id, (counts.get(s.id) ?? 0) + 1);
    }
    const duplicates = [...counts.entries()].filter(([, n]) => n > 1);
    expect(
      duplicates.map(([id, n]) => `${id} (defined ${n}×)`),
      "Duplicate id definitions break ID-based lookup silently — second one wins",
    ).toEqual([]);
  });
});

// ─── 2. Cross-reference resolution ──────────────────────────────────
// `related_sources`, `amends`, `amended_by`, `implements`,
// `superseded_by` must point at IDs that actually exist in the
// catalogue (or be Authority ids in the case of competent_authorities,
// which is covered elsewhere). T17 caught EE-CYBERSEC-2018.implements
// → EU-NIS-2016 (target didn't exist).
describe("Audit invariant 2 — cross-reference resolution", () => {
  it("every related_sources[] entry resolves to a real LegalSource id", () => {
    const broken: string[] = [];
    for (const s of ALL_SOURCES) {
      for (const r of s.related_sources ?? []) {
        if (!SOURCE_IDS.has(r)) broken.push(`${s.id}.related_sources → ${r}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("every amends target resolves to a real LegalSource id", () => {
    const broken: string[] = [];
    for (const s of ALL_SOURCES) {
      if (hasField(s.amends) && !SOURCE_IDS.has(s.amends)) {
        broken.push(`${s.id}.amends → ${s.amends}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("every amended_by[] target resolves to a real LegalSource id", () => {
    const broken: string[] = [];
    for (const s of ALL_SOURCES) {
      for (const r of s.amended_by ?? []) {
        if (!SOURCE_IDS.has(r)) broken.push(`${s.id}.amended_by → ${r}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("every implements target resolves to a real LegalSource id", () => {
    const broken: string[] = [];
    for (const s of ALL_SOURCES) {
      if (hasField(s.implements) && !SOURCE_IDS.has(s.implements)) {
        broken.push(`${s.id}.implements → ${s.implements}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("every superseded_by target resolves to a real LegalSource id", () => {
    const broken: string[] = [];
    for (const s of ALL_SOURCES) {
      if (hasField(s.superseded_by) && !SOURCE_IDS.has(s.superseded_by)) {
        broken.push(`${s.id}.superseded_by → ${s.superseded_by}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("no LegalSource references itself in any cross-reference field", () => {
    const selfRefs: string[] = [];
    for (const s of ALL_SOURCES) {
      for (const r of s.related_sources ?? []) {
        if (r === s.id) selfRefs.push(`${s.id}.related_sources → self`);
      }
      if (s.amends === s.id) selfRefs.push(`${s.id}.amends → self`);
      for (const r of s.amended_by ?? []) {
        if (r === s.id) selfRefs.push(`${s.id}.amended_by → self`);
      }
      if (s.implements === s.id) selfRefs.push(`${s.id}.implements → self`);
      if (s.superseded_by === s.id)
        selfRefs.push(`${s.id}.superseded_by → self`);
    }
    expect(selfRefs).toEqual([]);
  });
});

// ─── 3. Date-field internal coherence ──────────────────────────────
// Dates must be in legal/chronological order:
//   date_enacted ≤ date_in_force ≤ date_last_amended (when all present).
// Treaty/special edge cases: applies_to_jurisdictions can shift the
// semantics of date_in_force (treaty-general EIF vs state-specific
// binding date), so we exempt international_treaty entries from the
// date_in_force-vs-enacted check. The Moon Agreement entries are the
// canonical example of this.
describe("Audit invariant 3 — date-field coherence", () => {
  function parseISO(d: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
    const t = Date.parse(d);
    return isNaN(t) ? null : new Date(t);
  }

  it("every ISO-date field parses as a real calendar date", () => {
    const invalid: string[] = [];
    for (const s of ALL_SOURCES) {
      for (const [field, value] of [
        ["date_enacted", s.date_enacted],
        ["date_in_force", s.date_in_force],
        ["date_last_amended", s.date_last_amended],
        ["date_published", s.date_published],
      ] as const) {
        if (hasField(value) && !parseISO(value)) {
          invalid.push(`${s.id}.${field} = "${value}" is not a valid ISO date`);
        }
      }
    }
    expect(invalid).toEqual([]);
  });

  it("date_in_force ≥ date_enacted (no time-travelling EIFs)", () => {
    const inversions: string[] = [];
    for (const s of ALL_SOURCES) {
      if (s.type === "international_treaty") continue;
      const enacted = parseISO(s.date_enacted ?? "");
      const eif = parseISO(s.date_in_force ?? "");
      if (enacted && eif && eif < enacted) {
        inversions.push(
          `${s.id}: date_in_force ${s.date_in_force} is BEFORE date_enacted ${s.date_enacted}`,
        );
      }
    }
    expect(inversions).toEqual([]);
  });

  it("date_last_amended ≥ date_enacted (amendments cannot precede the enactment)", () => {
    const inversions: string[] = [];
    for (const s of ALL_SOURCES) {
      const enacted = parseISO(s.date_enacted ?? "");
      const amended = parseISO(s.date_last_amended ?? "");
      if (enacted && amended && amended < enacted) {
        inversions.push(
          `${s.id}: date_last_amended ${s.date_last_amended} is BEFORE date_enacted ${s.date_enacted}`,
        );
      }
    }
    expect(inversions).toEqual([]);
  });
});

// ─── 4. legislative_history milestone integrity ─────────────────────
// Each lh block: every milestone has a date, type, body, and ideally
// a source_url. Top-level date_in_force should match the lh's
// `in_force` milestone date if both are present (catches the IT-LEGGE-
// 89-2025 / 7-2018 / 185-1990 / treaty-ratifika EIF inconsistencies).
//
// Exemption: EU-SPACE-PROG-2021 has a documented retroactive
// applicability (date_in_force=2021-05-12 = EIF, but lh has a
// transition_phase milestone for 2021-01-01 = applicable_from). The
// in_force milestone's date matches the top-level field — only the
// transition_phase precedes it.
describe("Audit invariant 4 — legislative_history milestone integrity", () => {
  it("every lh milestone has a non-empty body string", () => {
    const offenders: string[] = [];
    for (const s of ALL_SOURCES) {
      const lh = s.legislative_history ?? [];
      lh.forEach((ms, i) => {
        if (!ms.body || ms.body.trim().length === 0) {
          offenders.push(
            `${s.id} lh[${i}] (${ms.type} ${ms.date}) has empty body`,
          );
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it("every lh milestone date parses as a real calendar date", () => {
    const invalid: string[] = [];
    for (const s of ALL_SOURCES) {
      const lh = s.legislative_history ?? [];
      lh.forEach((ms, i) => {
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(ms.date) ||
          isNaN(Date.parse(ms.date))
        ) {
          invalid.push(`${s.id} lh[${i}] date "${ms.date}" is not valid ISO`);
        }
      });
    }
    expect(invalid).toEqual([]);
  });

  it("verified=true milestones have verified_by + verified_at stamps", () => {
    const offenders: string[] = [];
    for (const s of ALL_SOURCES) {
      const lh = s.legislative_history ?? [];
      lh.forEach((ms, i) => {
        if (ms.verified === true) {
          if (!ms.verified_by) {
            offenders.push(
              `${s.id} lh[${i}] verified=true missing verified_by`,
            );
          }
          if (!ms.verified_at) {
            offenders.push(
              `${s.id} lh[${i}] verified=true missing verified_at`,
            );
          }
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it("top-level date_in_force matches at least ONE lh milestone of a relevant type", () => {
    // Semantic: the top-level date_in_force is the "operational effect"
    // date a compliance officer should care about. The lh `in_force`
    // milestone is the "technical EIF" (e.g. 20 days after OJ publication
    // for EU regulations). Most laws collapse these to the same date,
    // but some legitimately differ:
    //
    //   - EU regulations with delayed application (GDPR EIF 2016 /
    //     applicable 2018; DORA EIF 2023 / applicable 2025; Solvency
    //     II EIF 2010 / applicable 2016; IDD EIF 2016 / applicable 2018)
    //   - UK acts with phased commencement via Commencement SI (SIA
    //     2018: Royal Assent 2018, fully commenced 29 July 2021 via
    //     SI 2021/817)
    //   - EU-SPACE-PROG-2021: published 12 May 2021 but applicable
    //     retroactively from 1 January 2021 (Art. 111(2))
    //
    // The catch: the top-level date_in_force MUST match SOME lh
    // milestone date — `in_force`, `transition_phase`, OR `amendment`
    // (the latter for laws whose canonical "in force" date is the
    // commencement-SI date).
    //
    // This catches genuine bugs (IT-LEGGE-7-2018 off by 10 days, where
    // the top-level didn't match ANY lh date) without flagging the
    // legitimate EIF-vs-application split.
    const drifts: string[] = [];
    for (const s of ALL_SOURCES) {
      if (!s.date_in_force) continue;
      const lh = s.legislative_history ?? [];
      // Only check when the lh has at least one in_force milestone — a
      // source with NO in_force milestone is in the "verification
      // pending" backlog, not a coherence-bug candidate.
      const hasInForce = lh.some((ms) => ms.type === "in_force");
      if (!hasInForce) continue;
      const allRelevantDates = lh
        .filter(
          (ms) =>
            ms.type === "in_force" ||
            ms.type === "transition_phase" ||
            ms.type === "amendment",
        )
        .map((ms) => ms.date);
      if (!allRelevantDates.includes(s.date_in_force)) {
        drifts.push(
          `${s.id}: top date_in_force=${s.date_in_force} matches no lh in_force/transition_phase/amendment milestone (have: ${allRelevantDates.join(", ")})`,
        );
      }
    }
    expect(drifts).toEqual([]);
  });
});

// ─── 5. Source URL deep-linking ────────────────────────────────────
// Bare register-homepage URLs are catalogued bugs — they make every
// source-detail page fall through to the same primary register without
// addressing the specific document. T17 caught 16 of these and replaced
// them with deeplinks. This test prevents regressions.
describe("Audit invariant 5 — source URL deep-linking", () => {
  // Known register homepages — a source_url that exactly matches one of
  // these is a bug. The trailing slash is normalised away in the check.
  const REGISTER_HOMEPAGES = new Set([
    "https://www.boe.es",
    "https://www.legislation.gov.uk",
    "https://www.legifrance.gouv.fr",
    "https://www.gazzettaufficiale.it",
    "https://www.bgbl.de",
    "https://eur-lex.europa.eu",
    "https://www.normattiva.it",
    "https://www.ris.bka.gv.at",
    "https://lovdata.no",
    "https://www.retsinformation.dk",
    "https://www.finlex.fi",
    "https://www.riksdagen.se",
    "https://wetten.overheid.nl",
    "https://www.belspo.be",
  ]);

  it("no source_url is the bare register homepage", () => {
    const offenders: string[] = [];
    for (const s of ALL_SOURCES) {
      const normalised = s.source_url.replace(/\/+$/, "");
      if (REGISTER_HOMEPAGES.has(normalised)) {
        offenders.push(
          `${s.id}: source_url "${s.source_url}" is a bare register homepage`,
        );
      }
    }
    expect(offenders).toEqual([]);
  });

  it("every source_url is a syntactically valid http(s) URL", () => {
    const invalid: string[] = [];
    for (const s of ALL_SOURCES) {
      try {
        const u = new URL(s.source_url);
        if (u.protocol !== "https:" && u.protocol !== "http:") {
          invalid.push(`${s.id}: protocol "${u.protocol}" not http(s)`);
        }
      } catch {
        invalid.push(
          `${s.id}: source_url "${s.source_url}" is not a valid URL`,
        );
      }
    }
    expect(invalid).toEqual([]);
  });
});

// ─── 6. Type / jurisdiction coherence ──────────────────────────────
// Misclassified jurisdiction values were caught in T18:
//   - INT-UK-RUSSIA-REGS-2019 had jurisdiction:"INT" + type:"federal_regulation"
//     but it's a UK SI — should be jurisdiction:"UK".
//   - INT-CN-EXPORT-LAW-2020 had jurisdiction:"INT" + type:"federal_law"
//     but it's a Chinese national law — should be jurisdiction:"CN".
// Rule: if jurisdiction:"INT", type must be one of the international
// types (international_treaty, etc.). National types require a national
// jurisdiction code.
describe("Audit invariant 6 — type/jurisdiction coherence", () => {
  it('jurisdiction:"INT" sources have an international type', () => {
    const offenders: string[] = [];
    const NATIONAL_TYPES: ReadonlyArray<LegalSource["type"]> = [
      "federal_law",
      "federal_regulation",
      "state_law",
      "draft_legislation",
    ];
    for (const s of ALL_SOURCES) {
      if (s.jurisdiction !== "INT") continue;
      if (NATIONAL_TYPES.includes(s.type)) {
        offenders.push(
          `${s.id}: jurisdiction:"INT" but type:"${s.type}" — should be reclassified to its national jurisdiction or use type:"international_treaty"/"policy_document"`,
        );
      }
    }
    expect(offenders).toEqual([]);
  });
});

// ─── 7. official_reference uniqueness within jurisdiction ──────────
// Two distinct LegalSource entries within the same jurisdiction must
// not share the same official_reference. T17 caught:
//   - UK-SIR-2021 + UK-SI-2021-792 both with "SI 2021/792"
//   - 3× FR Décrets all with "JORF n° 0133 du 10 juin 2009"
// The fix was to disambiguate the FR refs by adding the Décret number,
// and to consolidate the UK duplicate.
describe("Audit invariant 7 — official_reference uniqueness within jurisdiction", () => {
  it("no two sources in the same jurisdiction share an official_reference", () => {
    type Key = string; // `${jurisdiction}|${official_reference}`
    const refs = new Map<Key, string[]>();
    for (const s of ALL_SOURCES) {
      if (!s.official_reference) continue;
      const key = `${s.jurisdiction}|${s.official_reference}`;
      const arr = refs.get(key) ?? [];
      arr.push(s.id);
      refs.set(key, arr);
    }
    const collisions: string[] = [];
    for (const [key, ids] of refs.entries()) {
      if (ids.length > 1) {
        collisions.push(`${key} → ${ids.join(", ")}`);
      }
    }
    expect(collisions).toEqual([]);
  });
});

// ─── 8. legislative_history chronology ──────────────────────────────
// Within a single legislative_history block, milestones of "earlier"
// types must have earlier dates than milestones of "later" types,
// EXCEPT for the documented retroactive applicability case (treated
// as transition_phase, not in_force).
describe("Audit invariant 8 — legislative_history chronology", () => {
  // Logical ordering of milestone types within a single law's lifecycle.
  // Lower index = earlier in lifecycle. Amendment / consolidation /
  // implementation_act / transition_phase are post-EIF and can occur at
  // any time after, so they're given a high index (no upper-bound check).
  const LIFECYCLE_ORDER: Record<string, number> = {
    proposal: 0,
    consultation: 1,
    interservice: 1,
    first_reading: 2,
    committee_review: 3,
    council_position: 4,
    second_reading: 5,
    trilogue: 6,
    adoption: 7,
    presidential_signature: 8,
    promulgation: 9,
    in_force: 10,
    signed: 7, // treaty
    ratification: 8, // treaty
    deposit: 9, // treaty
    entry_into_force_treaty: 10, // treaty
  };

  it("core-lifecycle milestones (proposal → in_force) appear in chronological order", () => {
    const violations: string[] = [];
    for (const s of ALL_SOURCES) {
      const lh = s.legislative_history ?? [];
      const core = lh
        .filter((ms) => LIFECYCLE_ORDER[ms.type] !== undefined)
        .map((ms) => ({ ...ms, order: LIFECYCLE_ORDER[ms.type] }));
      // For each adjacent pair where order strictly increases, dates
      // must not decrease (allow same-day transitions for DLs etc.).
      for (let i = 0; i < core.length - 1; i++) {
        const a = core[i];
        const b = core[i + 1];
        if (b.order > a.order && b.date < a.date) {
          violations.push(
            `${s.id}: ${a.type} (${a.date}) → ${b.type} (${b.date}) — date goes backwards across lifecycle progression`,
          );
        }
      }
    }
    expect(violations).toEqual([]);
  });
});

// ─── Summary header ─────────────────────────────────────────────────
// Print a one-line marker so test reports show this file's intent at a
// glance. Doesn't run any assertion — just metadata.
describe("Audit-derived invariants summary", () => {
  it("reports total catalogue size for the audit firewall", () => {
    expect(ALL_SOURCES.length).toBeGreaterThan(500);
    // 2026-04-28 audit close-out left the catalogue at 617 sources after
    // dedup (UK-SIR-2021 + EU-DORA-2022 duplicate removed). The lower
    // bound of 500 leaves headroom for future additions while still
    // catching catastrophic data-loss regressions.
  });
});
