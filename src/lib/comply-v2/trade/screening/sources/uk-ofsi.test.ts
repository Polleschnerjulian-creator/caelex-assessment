/**
 * Tests for UK OFSI ConList parser. Synthetic CSV fixtures only — no
 * network calls to ofsistorage.blob.core.windows.net.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import { parseUkOfsi, parseCsv, extractOfsiVersion } from "./uk-ofsi";

const HEADER =
  '"Name 6","Name 1","Name 2","Name 3","Name 4","Name 5","Title","DOB","POB","Nationality","Passport Details","National Identification Number","Position","Address 1","Address 2","Address 3","Address 4","Address 5","Address 6","Post/Zip Code","Country","Other Information","Group Type","Listed On","Last Updated","Group ID","Regime","UK Statement of Reasons"';

function row(values: Partial<Record<string, string>>): string {
  // Build a row matching the HEADER column order with defaults
  const cols = [
    values.name6 ?? "",
    values.name1 ?? "",
    values.name2 ?? "",
    values.name3 ?? "",
    values.name4 ?? "",
    values.name5 ?? "",
    values.title ?? "",
    values.dob ?? "",
    values.pob ?? "",
    values.nationality ?? "",
    values.passport ?? "",
    values.nationalId ?? "",
    values.position ?? "",
    values.address1 ?? "",
    values.address2 ?? "",
    values.address3 ?? "",
    values.address4 ?? "",
    values.address5 ?? "",
    values.address6 ?? "",
    values.postcode ?? "",
    values.country ?? "",
    values.otherInformation ?? "",
    values.groupType ?? "",
    values.listedOn ?? "",
    values.lastUpdated ?? "",
    values.groupId ?? "",
    values.regime ?? "",
    values.statementOfReasons ?? "",
  ];
  return cols
    .map((v) =>
      v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v,
    )
    .join(",");
}

describe("parseCsv (RFC 4180)", () => {
  it("parses simple comma-separated rows", () => {
    expect(parseCsv("a,b,c")).toEqual([["a", "b", "c"]]);
  });

  it("handles \\r\\n line endings", () => {
    expect(parseCsv("a,b\r\nc,d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("preserves commas inside quoted fields", () => {
    expect(parseCsv('"smith, john",x')).toEqual([["smith, john", "x"]]);
  });

  it("unescapes doubled quotes", () => {
    expect(parseCsv('"a""b",c')).toEqual([['a"b', "c"]]);
  });
});

describe("extractOfsiVersion", () => {
  it("extracts the last-updated date from the preamble", () => {
    const preamble = "Designations Last Updated: 05/05/2026\n";
    expect(extractOfsiVersion(preamble)).toBe("05/05/2026");
  });

  it("returns undefined when preamble is absent", () => {
    expect(extractOfsiVersion("Name 6,Group ID\n")).toBeUndefined();
  });

  it("matches case-insensitive 'Last Updated'", () => {
    const preamble = "last updated: 2026-05-22\n";
    expect(extractOfsiVersion(preamble)).toBe("2026-05-22");
  });
});

describe("parseUkOfsi", () => {
  it("returns empty array for empty input", () => {
    expect(parseUkOfsi("")).toEqual([]);
  });

  it("returns empty array if header cannot be detected", () => {
    // No "Group ID" / "Group Type" in the first 5 rows
    const csv = "foo,bar,baz\n1,2,3\n";
    expect(parseUkOfsi(csv)).toEqual([]);
  });

  it("parses a single individual with Group ID + Regime", () => {
    const csv = [
      HEADER,
      row({
        name6: "SMITH, JOHN A.",
        groupType: "Individual",
        groupId: "13579",
        regime: "Russia",
        listedOn: "08/06/2007",
        dob: "01/01/1970",
        nationality: "RU",
        passport: "P12345",
      }),
    ].join("\n");
    const entries = parseUkOfsi(csv);
    expect(entries).toHaveLength(1);
    expect(entries[0].entryId).toBe("13579");
    expect(entries[0].names).toEqual(["smith john a"]);
    expect(entries[0].listMetadata).toMatchObject({
      groupType: "individual",
      programs: ["Russia"],
      listedOn: "08/06/2007",
      dob: "01/01/1970",
      nationality: "RU",
    });
    expect(entries[0].identifiers).toContainEqual({
      type: "passport",
      value: "P12345",
    });
  });

  it("parses an entity with multi-line address + country", () => {
    const csv = [
      HEADER,
      row({
        name6: "BAD CORP LTD",
        groupType: "Entity",
        groupId: "42",
        regime: "Iran",
        address1: "Building 5",
        address2: "Main Street",
        postcode: "ABC 123",
        country: "IR",
      }),
    ].join("\n");
    const entries = parseUkOfsi(csv);
    expect(entries).toHaveLength(1);
    expect(entries[0].names).toEqual(["bad"]); // both LTD and CORP stripped by canonicalize
    expect(entries[0].addresses).toHaveLength(1);
    expect(entries[0].addresses[0]).toEqual({
      country: "IR",
      lines: ["Building 5", "Main Street", "ABC 123"],
    });
  });

  it("aggregates multiple rows with the same Group ID", () => {
    // OFSI duplicates rows for each alias / each address
    const csv = [
      HEADER,
      row({ name6: "Primary Name", groupType: "Individual", groupId: "99" }),
      row({ name6: "Alias One", groupType: "Individual", groupId: "99" }),
      row({ name6: "Alias Two", groupType: "Individual", groupId: "99" }),
    ].join("\n");
    const entries = parseUkOfsi(csv);
    // Should collapse into ONE entry with three names
    expect(entries).toHaveLength(1);
    expect(entries[0].entryId).toBe("99");
    expect(entries[0].names.sort()).toEqual([
      "alias one",
      "alias two",
      "primary name",
    ]);
  });

  it("aggregates addresses from duplicate Group ID rows", () => {
    const csv = [
      HEADER,
      row({
        name6: "Multi-Address Co",
        groupType: "Entity",
        groupId: "55",
        address1: "Office A",
        country: "GB",
      }),
      row({
        name6: "Multi-Address Co",
        groupType: "Entity",
        groupId: "55",
        address1: "Office B",
        country: "AE",
      }),
    ].join("\n");
    const entries = parseUkOfsi(csv);
    expect(entries).toHaveLength(1);
    expect(entries[0].addresses).toHaveLength(2);
    expect(entries[0].addresses.map((a) => a.country).sort()).toEqual([
      "AE",
      "GB",
    ]);
  });

  it("falls back to composite entryId when Group ID is absent", () => {
    const csv = [
      HEADER,
      row({ name6: "No ID Person", groupType: "Individual" }),
    ].join("\n");
    const entries = parseUkOfsi(csv);
    expect(entries).toHaveLength(1);
    expect(entries[0].entryId).toMatch(/^OFSI-/);
  });

  it("combines split Name 1..Name 5 columns when Name 6 is empty", () => {
    const csv = [
      HEADER,
      row({
        name1: "John",
        name2: "A.",
        name3: "Smith",
        groupType: "Individual",
        groupId: "21",
      }),
    ].join("\n");
    const entries = parseUkOfsi(csv);
    expect(entries).toHaveLength(1);
    expect(entries[0].names).toEqual(["john a smith"]);
  });

  it("tolerates a preamble row before the header", () => {
    const csv = [
      "Designations Last Updated: 05/05/2026,,,,,,,,,,,,,,,,,,,,,,,,,,,",
      ",,,,,,,,,,,,,,,,,,,,,,,,,,,",
      HEADER,
      row({
        name6: "Preamble Survivor",
        groupType: "Entity",
        groupId: "1",
      }),
    ].join("\n");
    const entries = parseUkOfsi(csv);
    expect(entries).toHaveLength(1);
    expect(entries[0].entryId).toBe("1");
  });

  it("captures national_id identifier alongside passport", () => {
    const csv = [
      HEADER,
      row({
        name6: "Documents Person",
        groupType: "Individual",
        groupId: "7",
        passport: "P777",
        nationalId: "NID-2024-0001",
      }),
    ].join("\n");
    const entries = parseUkOfsi(csv);
    expect(entries[0].identifiers).toEqual([
      { type: "passport", value: "P777" },
      { type: "national_id", value: "NID-2024-0001" },
    ]);
  });

  it("merges regime tags from duplicate rows into a deduped programs list", () => {
    const csv = [
      HEADER,
      row({ name6: "Dual Regime", groupId: "44", regime: "Russia" }),
      row({ name6: "Dual Regime", groupId: "44", regime: "Cyber" }),
      row({ name6: "Dual Regime", groupId: "44", regime: "Russia" }),
    ].join("\n");
    const entries = parseUkOfsi(csv);
    expect(entries[0].listMetadata.programs).toEqual(["Russia", "Cyber"]);
  });

  it("skips rows with no name", () => {
    const csv = [
      HEADER,
      row({ groupType: "Individual", groupId: "no-name" }),
    ].join("\n");
    expect(parseUkOfsi(csv)).toEqual([]);
  });

  it("normalizes 2-letter country to uppercase ISO; unknown to XX", () => {
    const csv = [
      HEADER,
      row({ name6: "X", groupId: "1", address1: "addr", country: "gb" }),
      row({
        name6: "Y",
        groupId: "2",
        address1: "addr",
        country: "United Kingdom",
      }),
    ].join("\n");
    const entries = parseUkOfsi(csv);
    const byId = new Map(entries.map((e) => [e.entryId, e]));
    expect(byId.get("1")?.addresses[0].country).toBe("GB");
    expect(byId.get("2")?.addresses[0].country).toBe("XX");
  });
});
