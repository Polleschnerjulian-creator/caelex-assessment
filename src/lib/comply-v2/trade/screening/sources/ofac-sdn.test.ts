/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Tests for OFAC SDN parser. Uses synthetic CSV fixtures that mirror
 * the real format. We deliberately do NOT hit treasury.gov in tests.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  parseOfacSdn,
  parseCsv,
  parseOfacAltAliases,
  mergeAliasesIntoEntries,
} from "./ofac-sdn";
import type { CanonicalSanctionsEntry } from "./types";

describe("parseCsv (RFC 4180)", () => {
  it("parses a simple comma-separated row", () => {
    expect(parseCsv("a,b,c")).toEqual([["a", "b", "c"]]);
  });

  it("handles multiple rows separated by \\n", () => {
    expect(parseCsv("a,b\nc,d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("handles \\r\\n line endings (OFAC uses these)", () => {
    expect(parseCsv("a,b\r\nc,d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("preserves commas inside quoted fields", () => {
    expect(parseCsv('"a,b",c')).toEqual([["a,b", "c"]]);
  });

  it("unescapes doubled quotes inside quoted fields", () => {
    expect(parseCsv('"he said ""hi""",ok')).toEqual([['he said "hi"', "ok"]]);
  });

  it("handles trailing newline gracefully", () => {
    expect(parseCsv("a,b\n")).toEqual([["a", "b"]]);
  });

  it("returns empty for empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("preserves empty fields", () => {
    expect(parseCsv("a,,c")).toEqual([["a", "", "c"]]);
  });

  it("preserves quoted empty fields", () => {
    expect(parseCsv('a,"",c')).toEqual([["a", "", "c"]]);
  });
});

describe("parseOfacSdn", () => {
  it("returns empty array for empty input", () => {
    expect(parseOfacSdn("")).toEqual([]);
  });

  it("returns empty array for non-string input", () => {
    // @ts-expect-error — defensive null check
    expect(parseOfacSdn(null)).toEqual([]);
  });

  it("parses a single individual row into a canonical entry", () => {
    // Real OFAC format: 12 fields, "-0-" as null sentinel
    const csv = `12345,"SMITH, JOHN",individual,SDGT,"President of XYZ",-0-,-0-,-0-,-0-,-0-,-0-,"DOB 1970-01-01"`;
    const entries = parseOfacSdn(csv);
    expect(entries).toHaveLength(1);
    expect(entries[0].entryId).toBe("12345");
    expect(entries[0].names).toEqual(["smith john"]);
    expect(entries[0].listMetadata).toMatchObject({
      sdnType: "individual",
      programs: ["SDGT"],
      title: "President of XYZ",
      remarks: "DOB 1970-01-01",
    });
  });

  it("parses an entity row with semicolon-separated programs", () => {
    const csv = `99999,"BAD ENTITY LLC",entity,"SDGT; IRAN-EO13599; CYBER2",-0-,-0-,-0-,-0-,-0-,-0-,-0-,-0-`;
    const entries = parseOfacSdn(csv);
    expect(entries).toHaveLength(1);
    expect(entries[0].listMetadata.programs).toEqual([
      "SDGT",
      "IRAN-EO13599",
      "CYBER2",
    ]);
    expect(entries[0].names).toEqual(["bad entity"]); // LLC stripped by canonicalize
  });

  it("parses a vessel row and captures vessel-specific fields", () => {
    const csv = `7777,"SHIP NAME",vessel,SDGT,-0-,"CALL123","Container ship",-0-,-0-,"PA",-0-,-0-`;
    const entries = parseOfacSdn(csv);
    expect(entries).toHaveLength(1);
    expect(entries[0].listMetadata).toMatchObject({
      sdnType: "vessel",
      callSign: "CALL123",
      type: "Container ship",
      flag: "PA",
    });
  });

  it("skips rows without entryId or name", () => {
    // Missing entryId
    const noId = `,"NAME",individual,SDGT,-0-,-0-,-0-,-0-,-0-,-0-,-0-,-0-`;
    expect(parseOfacSdn(noId)).toEqual([]);

    // Missing name (sentinel)
    const noName = `1,"-0-",individual,SDGT,-0-,-0-,-0-,-0-,-0-,-0-,-0-,-0-`;
    expect(parseOfacSdn(noName)).toEqual([]);
  });

  it("skips truncated rows (fewer than 4 fields)", () => {
    expect(parseOfacSdn("1,2,3")).toEqual([]);
  });

  it("processes multiple rows independently", () => {
    const csv = [
      `1,"ALPHA CORP",entity,SDGT,-0-,-0-,-0-,-0-,-0-,-0-,-0-,-0-`,
      `2,"BETA LLC",entity,IRAN-EO13599,-0-,-0-,-0-,-0-,-0-,-0-,-0-,-0-`,
      `3,"GAMMA GMBH",entity,CYBER2,-0-,-0-,-0-,-0-,-0-,-0-,-0-,-0-`,
    ].join("\n");
    const entries = parseOfacSdn(csv);
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.entryId)).toEqual(["1", "2", "3"]);
    // Verify each name was canonicalized (suffix stripped)
    expect(entries[0].names[0]).toBe("alpha");
    expect(entries[1].names[0]).toBe("beta");
    expect(entries[2].names[0]).toBe("gamma");
  });

  it("survives quoted fields containing embedded commas", () => {
    const csv = `42,"SMITH, JOHN A.",individual,SDGT,-0-,-0-,-0-,-0-,-0-,-0-,-0-,-0-`;
    const entries = parseOfacSdn(csv);
    expect(entries).toHaveLength(1);
    expect(entries[0].names[0]).toBe("smith john a");
  });

  it("normalizes -0- programs to empty array (no programs)", () => {
    const csv = `1,"NAME",entity,-0-,-0-,-0-,-0-,-0-,-0-,-0-,-0-,-0-`;
    const entries = parseOfacSdn(csv);
    expect(entries[0].listMetadata.programs).toEqual([]);
  });
});

// ─── alt.csv alias helpers ───────────────────────────────────────────────────
// Real alt.csv columns (no header row):
//   0: ent_num, 1: alt_num, 2: alt_type (aka/fka/nka), 3: alt_name, 4: alt_remarks

describe("parseOfacAltAliases", () => {
  it("parses a single alias row into uid → [canonicalized alias]", () => {
    // ent_num=12345, alt_num=1, alt_type=aka, alt_name="Smith, John A.", remarks=-0-
    const altCsv = `12345,1,"aka","Smith, John A.",-0-`;
    const map = parseOfacAltAliases(altCsv);
    expect(map.get("12345")).toEqual(["smith john a"]);
  });

  it("groups multiple alias rows for the same ent_num", () => {
    const altCsv = [
      `12345,1,aka,"Alias One",-0-`,
      `12345,2,fka,"Alias Two",-0-`,
    ].join("\n");
    const map = parseOfacAltAliases(altCsv);
    const aliases = map.get("12345");
    expect(aliases).toHaveLength(2);
    expect(aliases).toContain("alias one");
    expect(aliases).toContain("alias two");
  });

  it("handles multiple distinct uids", () => {
    const altCsv = [
      `111,1,aka,"First AKA",-0-`,
      `222,1,aka,"Second AKA",-0-`,
    ].join("\n");
    const map = parseOfacAltAliases(altCsv);
    expect(map.get("111")).toEqual(["first aka"]);
    expect(map.get("222")).toEqual(["second aka"]);
  });

  it("drops rows with empty alt_name after canonicalization", () => {
    // A name that canonicalizes to empty (e.g. only suffix tokens)
    const altCsv = `12345,1,aka,"",-0-`;
    const map = parseOfacAltAliases(altCsv);
    expect(map.has("12345")).toBe(false);
  });

  it("drops rows with -0- as alt_name sentinel", () => {
    const altCsv = `12345,1,aka,-0-,-0-`;
    const map = parseOfacAltAliases(altCsv);
    expect(map.has("12345")).toBe(false);
  });

  it("deduplicates identical aliases for the same uid", () => {
    const altCsv = [
      `12345,1,aka,"Alias Dupe",-0-`,
      `12345,2,fka,"Alias Dupe",-0-`, // same canonical form → one entry
    ].join("\n");
    const map = parseOfacAltAliases(altCsv);
    expect(map.get("12345")).toHaveLength(1);
    expect(map.get("12345")).toEqual(["alias dupe"]);
  });

  it("returns empty map for empty input", () => {
    expect(parseOfacAltAliases("").size).toBe(0);
  });

  it("skips truncated rows (fewer than 4 fields)", () => {
    const altCsv = `12345,1,aka`; // only 3 fields
    const map = parseOfacAltAliases(altCsv);
    expect(map.has("12345")).toBe(false);
  });

  it("handles quoted alt_name with embedded comma", () => {
    const altCsv = `12345,1,aka,"Lastname, Firstname",-0-`;
    const map = parseOfacAltAliases(altCsv);
    expect(map.get("12345")).toEqual(["lastname firstname"]);
  });
});

describe("mergeAliasesIntoEntries", () => {
  function makeEntry(
    entryId: string,
    primaryName: string,
  ): CanonicalSanctionsEntry {
    return {
      entryId,
      names: [primaryName],
      addresses: [],
      identifiers: [],
      listMetadata: { programs: [] },
    };
  }

  it("appends aliases to names for a matching entryId (primary first)", () => {
    const entries = [makeEntry("12345", "primary co")];
    const aliasMap = new Map([["12345", ["alias one", "alias two"]]]);
    const merged = mergeAliasesIntoEntries(entries, aliasMap);
    expect(merged[0].names).toEqual(["primary co", "alias one", "alias two"]);
  });

  it("ignores aliases for uids not present in entries", () => {
    const entries = [makeEntry("12345", "primary co")];
    const aliasMap = new Map([["99999", ["unknown alias"]]]);
    const merged = mergeAliasesIntoEntries(entries, aliasMap);
    expect(merged[0].names).toEqual(["primary co"]);
    expect(merged).toHaveLength(1);
  });

  it("deduplicates: does not add an alias that equals the primary name", () => {
    const entries = [makeEntry("12345", "primary co")];
    const aliasMap = new Map([["12345", ["primary co", "alias one"]]]);
    const merged = mergeAliasesIntoEntries(entries, aliasMap);
    // "primary co" already in names → deduped; "alias one" appended
    expect(merged[0].names).toEqual(["primary co", "alias one"]);
  });

  it("returns a new array (immutable — original entries unchanged)", () => {
    const entries = [makeEntry("12345", "primary co")];
    const aliasMap = new Map([["12345", ["alias"]]]);
    const merged = mergeAliasesIntoEntries(entries, aliasMap);
    // Original entry's names array must not be mutated
    expect(entries[0].names).toEqual(["primary co"]);
    expect(merged[0].names).toEqual(["primary co", "alias"]);
  });

  it("leaves entries with no alias map entry untouched", () => {
    const entries = [
      makeEntry("12345", "primary co"),
      makeEntry("99999", "other entity"),
    ];
    const aliasMap = new Map([["12345", ["alias"]]]);
    const merged = mergeAliasesIntoEntries(entries, aliasMap);
    expect(merged[0].names).toEqual(["primary co", "alias"]);
    expect(merged[1].names).toEqual(["other entity"]);
  });

  it("works with an empty entries array", () => {
    const aliasMap = new Map([["12345", ["alias"]]]);
    expect(mergeAliasesIntoEntries([], aliasMap)).toEqual([]);
  });

  it("works with an empty alias map", () => {
    const entries = [makeEntry("12345", "primary co")];
    const merged = mergeAliasesIntoEntries(entries, new Map());
    expect(merged[0].names).toEqual(["primary co"]);
  });

  it("empty alias map fast-path returns a NEW array reference (reference consistency)", () => {
    // Fix 2: the empty-map fast-path must return a copy, not the same array.
    // Before the fix, `return entries` shared identity with the input; after,
    // `return [...entries]` always returns a fresh array.
    const entries = [makeEntry("12345", "primary co")];
    const merged = mergeAliasesIntoEntries(entries, new Map());
    // Content is equal ...
    expect(merged).toEqual(entries);
    // ... but not the SAME array reference.
    expect(merged).not.toBe(entries);
  });
});
