/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Tests for OFAC SDN parser. Uses synthetic CSV fixtures that mirror
 * the real format. We deliberately do NOT hit treasury.gov in tests.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import { parseOfacSdn, parseCsv } from "./ofac-sdn";

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
