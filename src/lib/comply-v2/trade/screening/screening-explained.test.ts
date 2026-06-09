/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Tests for screening-explained.ts — the three-valued verification + the
 * Explanation Envelope builder + the persisted-row derivation.
 *
 * Invariants under test (the lane's whole point):
 *   - UNVERIFIED carries confidence "UNVERIFIED" and a non-empty WHY naming the
 *     missing/stale critical list, with that list as a SOURCE (listVersion).
 *   - A determined result (CLEAR / POTENTIAL_MATCH) ALWAYS has >=1 source — so
 *     the <ExplainedPanel> renderer (which refuses an un-sourced determined
 *     result) can never reject it.
 *   - deriveVerificationFromPersistedRow NEVER upgrades to CLEAR: a no-evidence
 *     POTENTIAL_MATCH resolves to UNVERIFIED (fail-closed), never green.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import { TradeSanctionsList } from "@prisma/client";
import {
  buildScreeningExplained,
  deriveVerificationFromPersistedRow,
  type ScreeningVerdict,
} from "./screening-explained";

// ─── Fixtures ────────────────────────────────────────────────────────────────

function freshCriticalConsulted() {
  return [
    {
      list: TradeSanctionsList.OFAC_SDN,
      snapshotHash: "aaaaaaaaaaaa1111",
      upstreamVersion: "2026-06-09",
      fetchedAt: new Date().toISOString(),
    },
    {
      list: TradeSanctionsList.EU_FSF,
      snapshotHash: "bbbbbbbbbbbb2222",
      upstreamVersion: undefined,
      fetchedAt: new Date().toISOString(),
    },
  ];
}

const CLEAR_VERDICT: ScreeningVerdict = {
  verification: "CLEAR",
  decision: "CLEAR",
  topScore: 0,
  hitCount: 0,
  cascadeHit: false,
  gap: { missing: [], stale: [], maxAgeHours: 48 },
};

const MATCH_VERDICT: ScreeningVerdict = {
  verification: "POTENTIAL_MATCH",
  decision: "POTENTIAL_MATCH",
  topScore: 0.91,
  hitCount: 2,
  cascadeHit: false,
  gap: { missing: [], stale: [], maxAgeHours: 48 },
};

const UNVERIFIED_MISSING_VERDICT: ScreeningVerdict = {
  verification: "UNVERIFIED",
  decision: "POTENTIAL_MATCH",
  topScore: 0,
  hitCount: 0,
  cascadeHit: false,
  gap: {
    missing: [TradeSanctionsList.OFAC_SDN, TradeSanctionsList.BIS_ENTITY],
    stale: [],
    maxAgeHours: 48,
  },
};

const UNVERIFIED_STALE_VERDICT: ScreeningVerdict = {
  verification: "UNVERIFIED",
  decision: "POTENTIAL_MATCH",
  topScore: 0,
  hitCount: 0,
  cascadeHit: false,
  gap: {
    missing: [],
    stale: [
      {
        list: TradeSanctionsList.UN_CONSOLIDATED,
        snapshotHash: "cccccccccccc3333",
        upstreamVersion: "2026-06-01",
        fetchedAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
        ageHours: 72,
      },
    ],
    maxAgeHours: 48,
  },
};

// ─── buildScreeningExplained — envelope completeness ─────────────────────────

describe("buildScreeningExplained — the Explanation Envelope is always complete", () => {
  it("CLEAR ⇒ HIGH confidence with WHAT/WHY/WHEREFORE + >=1 cited source", () => {
    const e = buildScreeningExplained(CLEAR_VERDICT, {
      partyName: "XYZ GmbH",
      criticalConsulted: freshCriticalConsulted(),
    });
    expect(e.confidence).toBe("HIGH");
    expect(e.what).toMatch(/CLEAR/i);
    expect(e.why.length).toBeGreaterThan(0);
    expect(e.wherefore.length).toBeGreaterThan(0);
    // Determined result ⇒ sources MUST be non-empty (renderer requirement).
    expect(e.sources.length).toBeGreaterThan(0);
    expect(e.value.verification).toBe("CLEAR");
  });

  it("POTENTIAL_MATCH ⇒ MEDIUM confidence with >=1 source (renderer-safe)", () => {
    const e = buildScreeningExplained(MATCH_VERDICT, {
      partyName: "Sanctioned Corp",
      criticalConsulted: freshCriticalConsulted(),
      hitLists: [TradeSanctionsList.OFAC_SDN],
    });
    expect(e.confidence).toBe("MEDIUM");
    expect(e.what).toMatch(/POTENTIAL/i);
    expect(e.sources.length).toBeGreaterThan(0);
    expect(e.value.verification).toBe("POTENTIAL_MATCH");
  });

  it("MEDIUM result with NO hit lists + NO critical consulted still has a fallback source", () => {
    const e = buildScreeningExplained(MATCH_VERDICT, {
      partyName: "Edge Corp",
      criticalConsulted: [],
      hitLists: [],
    });
    // Must never emit an empty source array for a determined (non-UNVERIFIED)
    // result — the renderer would refuse it.
    expect(e.sources.length).toBeGreaterThan(0);
  });
});

// ─── UNVERIFIED — the lane invariant ─────────────────────────────────────────

describe("buildScreeningExplained — UNVERIFIED is never green and always explains the gap", () => {
  it("MISSING critical list ⇒ confidence UNVERIFIED, list named in WHY, cited as MISSING source", () => {
    const e = buildScreeningExplained(UNVERIFIED_MISSING_VERDICT, {
      partyName: "XYZ GmbH",
      criticalConsulted: [],
    });
    expect(e.confidence).toBe("UNVERIFIED");
    expect(e.value.verification).toBe("UNVERIFIED");
    // WHY must name the missing list family + be non-empty.
    expect(e.why.length).toBeGreaterThan(0);
    expect(e.why).toMatch(/OFAC|missing/i);
    expect(e.wherefore).toMatch(/re-?sync|re-?screen|not.*transact/i);
    // The missing list is a SOURCE carrying its (un)version.
    expect(e.sources.length).toBe(2);
    expect(e.sources.every((s) => /MISSING/i.test(s.listVersion ?? ""))).toBe(
      true,
    );
    // It is NOT a CLEAR or a GO.
    expect(e.what).not.toMatch(/\bCLEAR\b/);
  });

  it("STALE critical list ⇒ UNVERIFIED, age + version carried in the source listVersion", () => {
    const e = buildScreeningExplained(UNVERIFIED_STALE_VERDICT, {
      partyName: "XYZ GmbH",
      criticalConsulted: [],
    });
    expect(e.confidence).toBe("UNVERIFIED");
    expect(e.sources).toHaveLength(1);
    const src = e.sources[0];
    expect(src.listVersion).toMatch(/STALE/i);
    expect(src.listVersion).toMatch(/72h/); // the age we passed
    expect(src.listVersion).toMatch(/2026-06-01/); // the upstream version
  });

  it("override defaults to not-allowed (a human override is a recorded affordance, not auto)", () => {
    const e = buildScreeningExplained(UNVERIFIED_MISSING_VERDICT, {
      partyName: "XYZ GmbH",
      criticalConsulted: [],
    });
    expect(e.override.allowed).toBe(false);
  });
});

// ─── deriveVerificationFromPersistedRow — fail-closed reconstruction ─────────

describe("deriveVerificationFromPersistedRow — never upgrades to CLEAR", () => {
  it("CLEAR decision ⇒ CLEAR", () => {
    expect(
      deriveVerificationFromPersistedRow({
        decision: "CLEAR",
        hits: [],
        cascade: null,
      }),
    ).toBe("CLEAR");
  });

  it("POTENTIAL_MATCH with NO hits / NO cascade ⇒ UNVERIFIED (the gap path)", () => {
    expect(
      deriveVerificationFromPersistedRow({
        decision: "POTENTIAL_MATCH",
        hits: [],
        cascade: null,
      }),
    ).toBe("UNVERIFIED");
  });

  it("POTENTIAL_MATCH with hits ⇒ POTENTIAL_MATCH (a real signal)", () => {
    expect(
      deriveVerificationFromPersistedRow({
        decision: "POTENTIAL_MATCH",
        hits: [{ list: "OFAC_SDN", entryId: "1", score: 0.9 }],
        cascade: null,
      }),
    ).toBe("POTENTIAL_MATCH");
  });

  it("POTENTIAL_MATCH with a cascade hit (but 0 hits) ⇒ POTENTIAL_MATCH", () => {
    expect(
      deriveVerificationFromPersistedRow({
        decision: "POTENTIAL_MATCH",
        hits: [],
        cascade: { cascadeHit: true, sanctionedAncestorCount: 1 },
      }),
    ).toBe("POTENTIAL_MATCH");
  });

  it("POTENTIAL_MATCH with a control-only sanctioned owner (0 hits, no equity cascade) ⇒ POTENTIAL_MATCH", () => {
    expect(
      deriveVerificationFromPersistedRow({
        decision: "POTENTIAL_MATCH",
        hits: [],
        cascade: {
          cascadeHit: false,
          sanctionedAncestorCount: 0,
          sanctionedControlOnlyCount: 1,
        },
      }),
    ).toBe("POTENTIAL_MATCH");
  });

  it("malformed/lost hits array on a POTENTIAL_MATCH ⇒ UNVERIFIED, never CLEAR (fail-closed)", () => {
    expect(
      deriveVerificationFromPersistedRow({
        decision: "POTENTIAL_MATCH",
        hits: null,
        cascade: undefined,
      }),
    ).toBe("UNVERIFIED");
  });

  it("terminal human decisions are not UNVERIFIED (null ⇒ own UI treatment)", () => {
    expect(
      deriveVerificationFromPersistedRow({
        decision: "CONFIRMED_HIT",
        hits: [],
        cascade: null,
      }),
    ).toBeNull();
    expect(
      deriveVerificationFromPersistedRow({
        decision: "FALSE_POSITIVE_DISMISSED",
        hits: [],
        cascade: null,
      }),
    ).toBeNull();
  });
});
