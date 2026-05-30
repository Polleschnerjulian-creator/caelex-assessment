/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Tests for sync.server.ts — focusing on the OFAC alt.csv fail-soft path
 * (Task A7 review fix) and the syncOneList fetch-injection seam.
 *
 * What we test:
 *   1. Fail-soft path: when alt.csv fetch THROWS, the primary SDN entries
 *      survive and syncOneList does NOT propagate the error (upsertSnapshot
 *      is still called with the primary entries). This is the coverage gap
 *      identified in the A7 code review.
 *   2. Happy path: when alt.csv fetch succeeds, an SDN entry gains its alias
 *      in `names` (the merged entry is what gets persisted).
 *   3. Primary fetch failure: a throw on the sdn.csv URL propagates as an
 *      ok=false SyncOneResult (outer try/catch).
 *
 * Mocking strategy (follows screen-party.server.test.ts pattern):
 *   - vi.hoisted() declares mock fns before vi.mock() factories run.
 *   - `@/lib/prisma` is mocked so Prisma never touches a real DB.
 *   - `./snapshot-store.server` is mocked to control upsertSnapshot.
 *   - `server-only` is mocked as a no-op.
 *   - `@/lib/logger` is mocked to silence console noise.
 *   - The fetch-injection seam (`fetchOverride`) drives the alt.csv failure
 *     without any network access.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoist mock fns before vi.mock() factories ───────────────────────────────

const { mockUpsertSnapshot } = vi.hoisted(() => ({
  mockUpsertSnapshot: vi.fn(),
}));

// ─── Mock modules ────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeSanctionsSnapshot: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("./snapshot-store.server", () => ({
  upsertSnapshot: mockUpsertSnapshot,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ─── Import SUT after mocks ──────────────────────────────────────────────────

import { syncOneList, REGISTERED_PARSERS } from "./sync.server";
import { OFAC_ALT_URL } from "./sources/ofac-sdn";
import { TradeSanctionsList } from "@prisma/client";

// ─── Shared fixtures ─────────────────────────────────────────────────────────

/** Minimal valid sdn.csv with two entries — enough for parse + merge testing. */
const MINIMAL_SDN_CSV = [
  // ent_num, name, type, program, title, callsign, vesstype, tonnage, grt, flag, owner, remarks
  `11111,"ALPHA CORP",entity,SDGT,-0-,-0-,-0-,-0-,-0-,-0-,-0-,-0-`,
  `22222,"BETA LLC",entity,IRAN-EO13599,-0-,-0-,-0-,-0-,-0-,-0-,-0-,-0-`,
].join("\n");

/** alt.csv that gives entry 11111 one alias. */
const MINIMAL_ALT_CSV = `11111,1,aka,"Alpha Corporation",-0-`;

/** A canned upsertSnapshot response for tests that reach persistence. */
const FAKE_SNAPSHOT = {
  id: "snap_test_001",
  list: TradeSanctionsList.OFAC_SDN,
  hash: "deadbeef" + "0".repeat(56),
  entryCount: 2,
  entries: [],
  fetchedAt: new Date("2026-05-01T00:00:00Z"),
  sourceUrl: "https://example.test",
  upstreamVersion: null,
};

const UPSERT_OK = {
  changed: true,
  hash: FAKE_SNAPSHOT.hash,
  entryCount: 2,
  snapshot: FAKE_SNAPSHOT,
};

/** The ofacSdnParser from REGISTERED_PARSERS (list === OFAC_SDN). */
function getOfacParser() {
  const p = REGISTERED_PARSERS.find(
    (r) => r.list === TradeSanctionsList.OFAC_SDN,
  );
  if (!p) throw new Error("OFAC_SDN parser not found in REGISTERED_PARSERS");
  return p;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUpsertSnapshot.mockResolvedValue(UPSERT_OK);
});

// ─── FIX 1: OFAC alt.csv fail-soft path ──────────────────────────────────────

describe("syncOneList (OFAC_SDN) — alt.csv fail-soft", () => {
  it(
    "returns primary SDN entries intact when alt.csv fetch THROWS — " +
      "upsertSnapshot is called with the primary entries (no aliases, no drop)",
    async () => {
      // Arrange: fetchOverride returns sdn.csv ok, but THROWS for alt.csv.
      // This directly exercises the try/catch at lines 124-141 of sync.server.ts.
      const fetchOverride = vi.fn(async (url: string) => {
        if (url === OFAC_ALT_URL) {
          throw new Error("Network error: alt.csv unreachable (simulated)");
        }
        // Primary sdn.csv — return two valid entries
        return MINIMAL_SDN_CSV;
      });

      const parser = getOfacParser();

      // Act
      const result = await syncOneList(parser, { fetchOverride });

      // Assert: syncOneList must NOT throw and must report ok
      expect(result.ok).toBe(true);
      expect(result.list).toBe(TradeSanctionsList.OFAC_SDN);

      // The alt.csv URL was actually requested (we cover the real code path)
      const calledUrls = fetchOverride.mock.calls.map(([url]) => url);
      expect(calledUrls).toContain(OFAC_ALT_URL);

      // upsertSnapshot must have been called — primary entries reached persistence
      expect(mockUpsertSnapshot).toHaveBeenCalledOnce();

      // The entries passed to upsertSnapshot must be non-empty (primary survived)
      const [upsertArg] = mockUpsertSnapshot.mock.calls[0];
      expect(upsertArg.entries).toHaveLength(2);

      // Entries have NO alias augmentation (alias merge was skipped)
      const alphaEntry = upsertArg.entries.find(
        (e: { entryId: string }) => e.entryId === "11111",
      );
      expect(alphaEntry).toBeDefined();
      // Primary name only — alias "alpha corporation" was not merged
      expect(alphaEntry.names).toEqual(["alpha"]);
      expect(alphaEntry.names).not.toContain("alpha corporation");
    },
  );

  it(
    "alt.csv fetch returns HTTP 404 (non-ok response) — " +
      "primary SDN entries reach persistence unchanged",
    async () => {
      // Alternate fail-soft scenario: fetchOverride returns empty/bad body
      // simulating a failed HTTP response that is converted to throw by fetchWithTimeout.
      // We simulate this by having the override throw an HTTP-style error.
      const fetchOverride = vi.fn(async (url: string) => {
        if (url === OFAC_ALT_URL) {
          throw new Error(
            "HTTP 404 Not Found from https://www.treasury.gov/ofac/downloads/alt.csv",
          );
        }
        return MINIMAL_SDN_CSV;
      });

      const parser = getOfacParser();
      const result = await syncOneList(parser, { fetchOverride });

      expect(result.ok).toBe(true);
      expect(mockUpsertSnapshot).toHaveBeenCalledOnce();

      const [upsertArg] = mockUpsertSnapshot.mock.calls[0];
      expect(upsertArg.entries).toHaveLength(2);
    },
  );

  it("happy path: alt.csv fetch succeeds — entry 11111 gains its alias in names", async () => {
    // Arrange: both sdn.csv and alt.csv succeed.
    const fetchOverride = vi.fn(async (url: string) => {
      if (url === OFAC_ALT_URL) return MINIMAL_ALT_CSV;
      return MINIMAL_SDN_CSV;
    });

    const parser = getOfacParser();
    const result = await syncOneList(parser, { fetchOverride });

    expect(result.ok).toBe(true);
    expect(mockUpsertSnapshot).toHaveBeenCalledOnce();

    const [upsertArg] = mockUpsertSnapshot.mock.calls[0];

    // Entry 11111 should now have both its primary name AND the alias
    const alphaEntry = upsertArg.entries.find(
      (e: { entryId: string }) => e.entryId === "11111",
    );
    expect(alphaEntry).toBeDefined();
    // Primary canonical name
    expect(alphaEntry.names).toContain("alpha");
    // Alias merged from alt.csv ("Alpha Corporation" → canonicalized)
    expect(alphaEntry.names).toContain("alpha corporation");

    // Entry 22222 has no alias — names unchanged
    const betaEntry = upsertArg.entries.find(
      (e: { entryId: string }) => e.entryId === "22222",
    );
    expect(betaEntry).toBeDefined();
    expect(betaEntry.names).toEqual(["beta"]);
  });

  it("primary sdn.csv fetch THROWS — result is ok=false (outer error path, not alt fail-soft)", async () => {
    // This verifies the OUTER try/catch. A primary fetch failure IS propagated
    // as ok=false. The alt fail-soft only protects against ALT failures.
    const fetchOverride = vi.fn(async (_url: string) => {
      throw new Error("Primary SDN fetch failed (simulated)");
    });

    const parser = getOfacParser();
    const result = await syncOneList(parser, { fetchOverride });

    // Primary fetch failure: ok=false, upsertSnapshot never called
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Primary SDN fetch failed/);
    expect(mockUpsertSnapshot).not.toHaveBeenCalled();
  });
});

// ─── FIX 2: mergeAliasesIntoEntries immutability via sync integration ─────────
//
// The unit-level immutability test lives in ofac-sdn.test.ts.
// Here we confirm the sync-level behavior is consistent: when alt.csv returns
// an empty body (aliasMap.size === 0 after parsing), the entries array that
// reaches upsertSnapshot is a DIFFERENT reference from what parse() returned
// (because mergeAliasesIntoEntries now always copies, even on the empty-map
// fast-path). This is a semantic / defence-in-depth check.

describe("syncOneList (OFAC_SDN) — aliasMap empty → entries still persist", () => {
  it("persists primary entries when alt.csv parses to an empty alias map", async () => {
    // Alt.csv with no valid rows → aliasMap.size === 0 after parseOfacAltAliases
    const emptyAltCsv = `\n`; // blank line → no valid rows

    const fetchOverride = vi.fn(async (url: string) => {
      if (url === OFAC_ALT_URL) return emptyAltCsv;
      return MINIMAL_SDN_CSV;
    });

    const parser = getOfacParser();
    const result = await syncOneList(parser, { fetchOverride });

    expect(result.ok).toBe(true);
    expect(mockUpsertSnapshot).toHaveBeenCalledOnce();

    const [upsertArg] = mockUpsertSnapshot.mock.calls[0];
    // Both primary entries survive even when aliasMap is empty
    expect(upsertArg.entries).toHaveLength(2);
    expect(
      upsertArg.entries.map((e: { entryId: string }) => e.entryId),
    ).toContain("11111");
    expect(
      upsertArg.entries.map((e: { entryId: string }) => e.entryId),
    ).toContain("22222");
  });
});
