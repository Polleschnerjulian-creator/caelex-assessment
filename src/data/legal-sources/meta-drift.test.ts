/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas perf pass F3 — Meta Drift Test.
 *
 * The client-safe metadata modules (`meta.generated.ts`,
 * `source-meta.generated.ts`) are BAKED projections of the corpus
 * barrel, committed to the repo so client components never import the
 * ~3MB barrel for counts/labels. This test re-derives the projections
 * from the live corpus via the same builder the generator uses and
 * fails the build the moment the committed artifacts fall behind.
 *
 * If this test fails, regenerate and commit:
 *
 *   npx tsx scripts/generate-legal-sources-meta.ts
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import { buildLegalSourcesMeta, buildSourceMetaRecords } from "./meta-builder";
import {
  CORPUS_STATS,
  JURISDICTION_CODES,
  SOURCE_JURISDICTION_CODES,
  JURISDICTION_META,
  getJurisdictionMeta,
} from "./meta";
import { SOURCE_META, getSourceMetaById } from "./source-meta";

const REGEN_HINT =
  "Committed legal-sources meta is stale — run: npx tsx scripts/generate-legal-sources-meta.ts";

describe("legal-sources meta — generated artifacts match the corpus", () => {
  const fresh = buildLegalSourcesMeta();

  it(`CORPUS_STATS matches live corpus counts (${REGEN_HINT})`, () => {
    expect(CORPUS_STATS).toEqual(fresh.stats);
  });

  it("JURISDICTION_CODES matches getAvailableJurisdictions()", () => {
    expect([...JURISDICTION_CODES]).toEqual(fresh.jurisdictionCodes);
  });

  it("SOURCE_JURISDICTION_CODES matches distinct source jurisdictions", () => {
    expect([...SOURCE_JURISDICTION_CODES]).toEqual(
      fresh.sourceJurisdictionCodes,
    );
  });

  it(`JURISDICTION_META matches per-jurisdiction aggregates (${REGEN_HINT})`, () => {
    // toEqual on the full array gives an unreadable diff at this size;
    // compare per-code so a failure names the drifted jurisdiction.
    expect(JURISDICTION_META.length).toBe(fresh.jurisdictions.length);
    for (const expected of fresh.jurisdictions) {
      expect(getJurisdictionMeta(expected.code)).toEqual(expected);
    }
  });
});

describe("legal-sources source-meta — generated records match the corpus", () => {
  const fresh = buildSourceMetaRecords();

  it(`SOURCE_META has one record per corpus source, in order (${REGEN_HINT})`, () => {
    expect(SOURCE_META.length).toBe(fresh.length);
    const offenders: string[] = [];
    for (let i = 0; i < fresh.length; i++) {
      const a = SOURCE_META[i];
      const b = fresh[i];
      if (
        a.id !== b.id ||
        a.jurisdiction !== b.jurisdiction ||
        a.type !== b.type ||
        a.status !== b.status ||
        a.title_en !== b.title_en
      ) {
        offenders.push(`${b.id} (index ${i})`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("getSourceMetaById resolves every corpus id with light fields", () => {
    const offenders: string[] = [];
    for (const s of fresh) {
      const m = getSourceMetaById(s.id);
      if (!m || m.title_en !== s.title_en) offenders.push(s.id);
    }
    expect(offenders).toEqual([]);
    expect(getSourceMetaById("__does_not_exist__")).toBeUndefined();
  });
});
