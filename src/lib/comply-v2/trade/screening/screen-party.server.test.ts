/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Tests for screen-party.server.ts — specifically the fail-closed behaviour
 * when a critical sanctions list snapshot is unavailable (T-H3 / Sprint A4).
 *
 * Design:
 *   - A party with zero fuzzy/identifier/cascade hits that is screened when
 *     a CRITICAL list snapshot is MISSING must NOT return CLEAR. Instead it
 *     must return POTENTIAL_MATCH (decision + status) so a human reviews it.
 *   - When ALL critical lists ARE present (even without non-critical ones)
 *     and there are no hits, the result MUST still be CLEAR (no false
 *     escalation).
 *
 * Mocking strategy (follows the `stakeholder-graph.test.ts` pattern):
 *   - vi.hoisted() declares the mock fns before vi.mock() factories run.
 *   - `@/lib/prisma` is mocked so Prisma never touches a real DB.
 *   - `./snapshot-store.server` is mocked to control which list snapshots
 *     are "available".
 *   - `./cascade-50pct.server` is mocked to return a null cascade (no
 *     ownership graph) so the test isolates the critical-list logic only.
 *   - `server-only` is mocked as a no-op so Vitest doesn't throw.
 *   - `@/lib/email` and `@/lib/logger` are mocked to prevent side effects.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoist mock fns before vi.mock() factories ───────────────────────────────

const {
  mockPartyFindUnique,
  mockScreeningResultCreate,
  mockPartyUpdate,
  mockTransaction,
  mockAllLatestSnapshots,
  mockRunCascadeForParty,
  mockOrgMemberFindMany,
} = vi.hoisted(() => ({
  mockPartyFindUnique: vi.fn(),
  mockScreeningResultCreate: vi.fn(),
  mockPartyUpdate: vi.fn(),
  mockTransaction: vi.fn(),
  mockAllLatestSnapshots: vi.fn(),
  mockRunCascadeForParty: vi.fn(),
  mockOrgMemberFindMany: vi.fn(),
}));

// ─── Mock modules ────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeParty: {
      findUnique: mockPartyFindUnique,
      update: mockPartyUpdate,
    },
    tradeScreeningResult: {
      create: mockScreeningResultCreate,
    },
    organizationMember: {
      findMany: mockOrgMemberFindMany,
    },
    $transaction: mockTransaction,
  },
}));

vi.mock("./snapshot-store.server", () => ({
  allLatestSnapshots: mockAllLatestSnapshots,
}));

vi.mock("./cascade-50pct.server", () => ({
  runCascadeForParty: mockRunCascadeForParty,
}));

vi.mock("@/lib/email", () => ({
  sendTradeSanctionsHit: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ─── Import SUT after mocks ──────────────────────────────────────────────────

import { screenParty } from "./screen-party.server";
import {
  TradeScreeningDecision,
  TradeScreeningStatus,
  TradeSanctionsList,
} from "@prisma/client";

// ─── Shared fixtures ─────────────────────────────────────────────────────────

/** A TradeParty with no identifiers, generic German entity, no hits expected. */
const CLEAN_PARTY = {
  id: "party_clean_001",
  organizationId: "org_001",
  canonicalName: "XYZ GmbH Musterstadt",
  leiCode: null,
  vatNumber: null,
  ducnsNumber: null,
  cageCode: null,
  screeningStatus: "NOT_SCREENED" as TradeScreeningStatus,
  lastScreenedAt: null,
  screeningHits: null,
};

/** A snapshot row shape — only the fields screenParty reads. */
function makeSnapshot(list: TradeSanctionsList, hash = "abc123") {
  return {
    id: `snap_${list}`,
    list,
    hash,
    entries: [], // empty → no name hits against "XYZ GmbH Musterstadt"
    fetchedAt: new Date("2026-05-01T00:00:00Z"),
    entryCount: 0,
    sourceUrl: "https://example.test/source",
    upstreamVersion: null,
  };
}

/** A Map containing ALL four critical lists — should result in CLEAR. */
function allCriticalSnapshots(): Map<TradeSanctionsList, object> {
  const m = new Map<TradeSanctionsList, object>();
  m.set(TradeSanctionsList.OFAC_SDN, makeSnapshot(TradeSanctionsList.OFAC_SDN));
  m.set(TradeSanctionsList.EU_FSF, makeSnapshot(TradeSanctionsList.EU_FSF));
  m.set(
    TradeSanctionsList.UN_CONSOLIDATED,
    makeSnapshot(TradeSanctionsList.UN_CONSOLIDATED),
  );
  m.set(
    TradeSanctionsList.BIS_ENTITY,
    makeSnapshot(TradeSanctionsList.BIS_ENTITY),
  );
  return m;
}

/** Screening result + party returned by the mocked $transaction. */
function mockTransactionReturn(
  decision: TradeScreeningDecision,
  status: TradeScreeningStatus,
) {
  const screeningResult = {
    id: "sr_001",
    partyId: CLEAN_PARTY.id,
    decision,
    hits: [],
    snapshotHash: "combinedhash",
    decidedById: decision === TradeScreeningDecision.CLEAR ? null : null,
    decidedAt: decision === TradeScreeningDecision.CLEAR ? new Date() : null,
    cascade: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const updatedParty = { ...CLEAN_PARTY, screeningStatus: status };
  return [screeningResult, updatedParty];
}

// ─── Shared beforeEach ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  mockPartyFindUnique.mockResolvedValue(CLEAN_PARTY);
  mockRunCascadeForParty.mockResolvedValue(null); // no ownership graph
  mockOrgMemberFindMany.mockResolvedValue([]); // no email recipients

  // Default: $transaction resolves with what the two inner calls would return.
  // Each test overrides this per expected decision.
  mockTransaction.mockImplementation(async (ops: unknown[]) => {
    // Execute the Prisma operation promises so the create/update mocks fire.
    return Promise.all(ops);
  });
});

// ─── Tests: T-H3 fail-closed behaviour ───────────────────────────────────────

describe("screenParty — T-H3: fail-closed on missing critical sanctions list", () => {
  it(
    "escalates to POTENTIAL_MATCH when OFAC_SDN snapshot is missing " +
      "(party has no hits, would otherwise be CLEAR)",
    async () => {
      // Arrange: snapshots contain only a non-critical list — OFAC_SDN absent.
      const snapshots = new Map<TradeSanctionsList, object>();
      snapshots.set(
        TradeSanctionsList.UK_OFSI,
        makeSnapshot(TradeSanctionsList.UK_OFSI),
      );
      // EU_FSF, UN_CONSOLIDATED, BIS_ENTITY also absent in this fixture.
      mockAllLatestSnapshots.mockResolvedValue(snapshots);

      // $transaction should produce a POTENTIAL_MATCH result.
      mockScreeningResultCreate.mockResolvedValue(
        mockTransactionReturn(
          TradeScreeningDecision.POTENTIAL_MATCH,
          TradeScreeningStatus.POTENTIAL_MATCH,
        )[0],
      );
      mockPartyUpdate.mockResolvedValue(
        mockTransactionReturn(
          TradeScreeningDecision.POTENTIAL_MATCH,
          TradeScreeningStatus.POTENTIAL_MATCH,
        )[1],
      );

      // Act
      const result = await screenParty(CLEAN_PARTY.id);

      // Assert: decision must NOT be CLEAR when a critical list is missing.
      expect(result.summary.decision).toBe(
        TradeScreeningDecision.POTENTIAL_MATCH,
      );
      expect(result.party.screeningStatus).toBe(
        TradeScreeningStatus.POTENTIAL_MATCH,
      );

      // The missing critical lists must appear in summary.snapshotsMissing.
      expect(result.summary.snapshotsMissing).toContain(
        TradeSanctionsList.OFAC_SDN,
      );
    },
  );

  it(
    "escalates to POTENTIAL_MATCH when ALL critical lists are missing " +
      "(zero snapshots available)",
    async () => {
      // Arrange: no snapshots at all.
      mockAllLatestSnapshots.mockResolvedValue(new Map());

      mockScreeningResultCreate.mockResolvedValue(
        mockTransactionReturn(
          TradeScreeningDecision.POTENTIAL_MATCH,
          TradeScreeningStatus.POTENTIAL_MATCH,
        )[0],
      );
      mockPartyUpdate.mockResolvedValue(
        mockTransactionReturn(
          TradeScreeningDecision.POTENTIAL_MATCH,
          TradeScreeningStatus.POTENTIAL_MATCH,
        )[1],
      );

      // Act
      const result = await screenParty(CLEAN_PARTY.id);

      // Assert
      expect(result.summary.decision).toBe(
        TradeScreeningDecision.POTENTIAL_MATCH,
      );
      expect(result.party.screeningStatus).toBe(
        TradeScreeningStatus.POTENTIAL_MATCH,
      );
      expect(result.summary.snapshotsMissing.length).toBeGreaterThanOrEqual(4);
    },
  );

  it("stays CLEAR when ALL critical lists are present and there are no hits", async () => {
    // Arrange: all four critical lists present, empty entries → no hits.
    mockAllLatestSnapshots.mockResolvedValue(allCriticalSnapshots());

    mockScreeningResultCreate.mockResolvedValue(
      mockTransactionReturn(
        TradeScreeningDecision.CLEAR,
        TradeScreeningStatus.CLEAR,
      )[0],
    );
    mockPartyUpdate.mockResolvedValue(
      mockTransactionReturn(
        TradeScreeningDecision.CLEAR,
        TradeScreeningStatus.CLEAR,
      )[1],
    );

    // Act
    const result = await screenParty(CLEAN_PARTY.id);

    // Assert: no false escalation when all critical lists consulted.
    expect(result.summary.decision).toBe(TradeScreeningDecision.CLEAR);
    expect(result.party.screeningStatus).toBe(TradeScreeningStatus.CLEAR);
    // Critical lists are all present — none of them should appear as missing.
    // (DDTC_DEBARRED may appear in snapshotsMissing — that's non-critical.)
    const missingCritical = result.summary.snapshotsMissing.filter((l) =>
      [
        TradeSanctionsList.OFAC_SDN,
        TradeSanctionsList.EU_FSF,
        TradeSanctionsList.UN_CONSOLIDATED,
        TradeSanctionsList.BIS_ENTITY,
      ].includes(l),
    );
    expect(missingCritical).toHaveLength(0);
  });

  it(
    "stays POTENTIAL_MATCH (hit path) even when critical lists are present — " +
      "a real hit is not affected by the critical-list gate",
    async () => {
      // This test uses a party name that would produce a name hit.
      // We verify the hit path is not broken by the new critical-list check.
      const partyWithHit = {
        ...CLEAN_PARTY,
        canonicalName: "Definitely Sanctioned Corp",
      };
      mockPartyFindUnique.mockResolvedValue(partyWithHit);
      mockAllLatestSnapshots.mockResolvedValue(allCriticalSnapshots());

      // Mock cascade with a hit to trigger POTENTIAL_MATCH via the hit path.
      mockRunCascadeForParty.mockResolvedValue({
        cascadeHit: true,
        sanctionedAncestorCount: 1,
        aggregateSanctionedOwnership: 0.6,
        ancestors: [],
      });

      mockScreeningResultCreate.mockResolvedValue(
        mockTransactionReturn(
          TradeScreeningDecision.POTENTIAL_MATCH,
          TradeScreeningStatus.POTENTIAL_MATCH,
        )[0],
      );
      mockPartyUpdate.mockResolvedValue(
        mockTransactionReturn(
          TradeScreeningDecision.POTENTIAL_MATCH,
          TradeScreeningStatus.POTENTIAL_MATCH,
        )[1],
      );

      const result = await screenParty(partyWithHit.id);

      // Hit path must still produce POTENTIAL_MATCH.
      expect(result.summary.decision).toBe(
        TradeScreeningDecision.POTENTIAL_MATCH,
      );
      expect(result.summary.cascadeHit).toBe(true);
    },
  );
});

// ─── CRITICAL_LISTS constant (exported for testing) ──────────────────────────

describe("CRITICAL_LISTS constant", () => {
  it("contains exactly the four primary designated-party lists", async () => {
    const { CRITICAL_LISTS } = await import("./screen-party.server");
    expect(CRITICAL_LISTS).toContain(TradeSanctionsList.OFAC_SDN);
    expect(CRITICAL_LISTS).toContain(TradeSanctionsList.EU_FSF);
    expect(CRITICAL_LISTS).toContain(TradeSanctionsList.UN_CONSOLIDATED);
    expect(CRITICAL_LISTS).toContain(TradeSanctionsList.BIS_ENTITY);
    expect(CRITICAL_LISTS).toHaveLength(4);
  });
});

// ─── T-M12: missingLists covers ALL 8 registered sources ─────────────────────
//
// Before this fix, missingLists() only expected 4 lists (OFAC_SDN, BIS_ENTITY,
// DDTC_DEBARRED, EU_FSF). The screening engine registers 8 parsers, so a
// never-synced UK_OFSI / UN_CONSOLIDATED / EU_ANNEX_IV / OPEN_SANCTIONS was
// silently omitted from the coverage-gap report (present-by-omission bug).

describe("missingLists — T-M12: all 8 registered sources covered", () => {
  it("includes UK_OFSI and UN_CONSOLIDATED when only OFAC_SDN is consulted", async () => {
    const { missingLists } = await import("./screen-party.server");
    const missing = missingLists([TradeSanctionsList.OFAC_SDN]);
    expect(missing).toContain(TradeSanctionsList.UK_OFSI);
    expect(missing).toContain(TradeSanctionsList.UN_CONSOLIDATED);
  });

  it("includes EU_ANNEX_IV and OPEN_SANCTIONS when only OFAC_SDN is consulted", async () => {
    const { missingLists } = await import("./screen-party.server");
    const missing = missingLists([TradeSanctionsList.OFAC_SDN]);
    expect(missing).toContain(TradeSanctionsList.EU_ANNEX_IV);
    expect(missing).toContain(TradeSanctionsList.OPEN_SANCTIONS);
  });

  it("returns empty array when all 8 registered lists are consulted", async () => {
    const { missingLists } = await import("./screen-party.server");
    const allEight = [
      TradeSanctionsList.OFAC_SDN,
      TradeSanctionsList.BIS_ENTITY,
      TradeSanctionsList.DDTC_DEBARRED,
      TradeSanctionsList.EU_FSF,
      TradeSanctionsList.UK_OFSI,
      TradeSanctionsList.UN_CONSOLIDATED,
      TradeSanctionsList.EU_ANNEX_IV,
      TradeSanctionsList.OPEN_SANCTIONS,
    ];
    expect(missingLists(allEight)).toHaveLength(0);
  });

  it("snapshotsMissing on result includes UK_OFSI when only OFAC_SDN snapshot is present", async () => {
    // Integration: verify missingLists is wired into the result's snapshotsMissing field.
    // We already have a screenParty test that uses only UK_OFSI; this one uses only
    // OFAC_SDN to confirm the previously-omitted lists now surface.
    const snapshots = new Map<TradeSanctionsList, object>();
    snapshots.set(
      TradeSanctionsList.OFAC_SDN,
      makeSnapshot(TradeSanctionsList.OFAC_SDN),
    );
    mockAllLatestSnapshots.mockResolvedValue(snapshots);

    // OFAC_SDN is present but EU_FSF / UN_CONSOLIDATED / BIS_ENTITY are missing
    // → fail-closed POTENTIAL_MATCH (critical lists missing).
    mockScreeningResultCreate.mockResolvedValue(
      mockTransactionReturn(
        TradeScreeningDecision.POTENTIAL_MATCH,
        TradeScreeningStatus.POTENTIAL_MATCH,
      )[0],
    );
    mockPartyUpdate.mockResolvedValue(
      mockTransactionReturn(
        TradeScreeningDecision.POTENTIAL_MATCH,
        TradeScreeningStatus.POTENTIAL_MATCH,
      )[1],
    );

    const result = await screenParty(CLEAN_PARTY.id);

    // UK_OFSI, EU_ANNEX_IV, OPEN_SANCTIONS must now appear in snapshotsMissing.
    expect(result.summary.snapshotsMissing).toContain(
      TradeSanctionsList.UK_OFSI,
    );
    expect(result.summary.snapshotsMissing).toContain(
      TradeSanctionsList.EU_ANNEX_IV,
    );
    expect(result.summary.snapshotsMissing).toContain(
      TradeSanctionsList.OPEN_SANCTIONS,
    );
  });
});
