/**
 * CSV item import — pure parser pins (ILA review #8).
 */
import { describe, it, expect } from "vitest";
import { parseCsv, parseCsvItems, CSV_IMPORT_MAX_ROWS } from "./csv-import";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, CRLF and semicolon auto-detection", () => {
    const grid = parseCsv('a;b\r\n"x;y";"He said ""hi"""\r\n');
    expect(grid).toEqual([
      ["a", "b"],
      ["x;y", 'He said "hi"'],
    ]);
  });

  it("comma stays the default when commas dominate", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("parseCsvItems", () => {
  it("maps German ERP headers and skips invalid rows with reasons", () => {
    const csv = [
      "Artikelname;Beschreibung;Artikelnummer;Hersteller;Ursprungsland",
      "RW-250 Reaction Wheel;Drallrad für Satelliten-Lageregelung;RW-250;Acme;DE",
      ";Beschreibung ohne Name;X;Y;DE",
      "Nur Name ohne Beschreibung;;Z;W;DE",
    ].join("\n");
    const result = parseCsvItems(csv);
    expect(result.error).toBeUndefined();
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      name: "RW-250 Reaction Wheel",
      internalSku: "RW-250",
      manufacturerName: "Acme",
      countryOfOrigin: "DE",
    });
    expect(result.skipped).toHaveLength(2);
    expect(result.skipped[0].reason).toContain("Name");
    expect(result.skipped[1].reason).toContain("Beschreibung");
  });

  it("requires name+description columns and reports found headers", () => {
    const result = parseCsvItems("foo,bar\n1,2");
    expect(result.error).toContain("Name");
    expect(result.error).toContain("foo, bar");
    expect(result.rows).toHaveLength(0);
  });

  it("caps at the import limit and reports the overflow honestly", () => {
    const lines = ["name,description"];
    for (let i = 0; i < CSV_IMPORT_MAX_ROWS + 5; i++) {
      lines.push(`Item ${i},Desc ${i}`);
    }
    const result = parseCsvItems(lines.join("\n"));
    expect(result.rows).toHaveLength(CSV_IMPORT_MAX_ROWS);
    expect(result.skipped).toHaveLength(5);
    expect(result.skipped[0].reason).toContain("Limit");
  });
});
