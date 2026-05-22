/**
 * Tests for UN Consolidated XML parser. Synthetic XML fixtures only —
 * no network calls to scsanctions.un.org.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import { parseUnConsolidated, extractUnVersion } from "./un-consolidated";

const INDIVIDUAL_BASIC = `
<INDIVIDUAL>
  <DATAID>6908555</DATAID>
  <FIRST_NAME>Osama</FIRST_NAME>
  <SECOND_NAME>Bin</SECOND_NAME>
  <THIRD_NAME>Laden</THIRD_NAME>
  <UN_LIST_TYPE>Al-Qaida</UN_LIST_TYPE>
  <REFERENCE_NUMBER>QDi.001</REFERENCE_NUMBER>
  <LISTED_ON>2001-01-25</LISTED_ON>
  <LAST_DAY_UPDATED>2011-05-02</LAST_DAY_UPDATED>
  <INDIVIDUAL_ALIAS>
    <QUALITY>Good</QUALITY>
    <ALIAS_NAME>Usama bin Muhammad bin Awad bin Ladin</ALIAS_NAME>
  </INDIVIDUAL_ALIAS>
  <INDIVIDUAL_ALIAS>
    <QUALITY>Good</QUALITY>
    <ALIAS_NAME>Shaykh Usama bin Ladin</ALIAS_NAME>
  </INDIVIDUAL_ALIAS>
  <INDIVIDUAL_ADDRESS>
    <COUNTRY>AF</COUNTRY>
  </INDIVIDUAL_ADDRESS>
  <INDIVIDUAL_DOCUMENT>
    <TYPE_OF_DOCUMENT>Passport</TYPE_OF_DOCUMENT>
    <NUMBER>P-001</NUMBER>
    <ISSUING_COUNTRY>SA</ISSUING_COUNTRY>
  </INDIVIDUAL_DOCUMENT>
</INDIVIDUAL>
`;

const ENTITY_BASIC = `
<ENTITY>
  <DATAID>17777</DATAID>
  <FIRST_NAME>Bad Co</FIRST_NAME>
  <UN_LIST_TYPE>ISIL (Da'esh) and Al-Qaida</UN_LIST_TYPE>
  <REFERENCE_NUMBER>QDe.123</REFERENCE_NUMBER>
  <LISTED_ON>2014-09-23</LISTED_ON>
  <ENTITY_ALIAS>
    <ALIAS_NAME>Bad Holdings</ALIAS_NAME>
  </ENTITY_ALIAS>
  <ENTITY_ADDRESS>
    <CITY>Mosul</CITY>
    <STATE_PROVINCE>Nineveh</STATE_PROVINCE>
    <COUNTRY>IQ</COUNTRY>
  </ENTITY_ADDRESS>
</ENTITY>
`;

function wrap(...blocks: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<CONSOLIDATED_LIST dateGenerated="2026-05-22T07:00:00Z">
  <INDIVIDUALS>
    ${blocks.filter((b) => b.includes("<INDIVIDUAL>")).join("\n")}
  </INDIVIDUALS>
  <ENTITIES>
    ${blocks.filter((b) => b.includes("<ENTITY>")).join("\n")}
  </ENTITIES>
</CONSOLIDATED_LIST>`;
}

describe("extractUnVersion", () => {
  it("reads dateGenerated from the CONSOLIDATED_LIST root", () => {
    const xml = `<CONSOLIDATED_LIST dateGenerated="2026-05-22T07:00:00Z">
      <INDIVIDUALS/></CONSOLIDATED_LIST>`;
    expect(extractUnVersion(xml)).toBe("2026-05-22T07:00:00Z");
  });

  it("returns undefined when attribute is missing", () => {
    expect(
      extractUnVersion("<CONSOLIDATED_LIST></CONSOLIDATED_LIST>"),
    ).toBeUndefined();
  });

  it("returns undefined for empty input", () => {
    expect(extractUnVersion("")).toBeUndefined();
  });
});

describe("parseUnConsolidated", () => {
  it("returns empty array for empty input", () => {
    expect(parseUnConsolidated("")).toEqual([]);
  });

  it("parses a single individual with name parts joined", () => {
    const entries = parseUnConsolidated(wrap(INDIVIDUAL_BASIC));
    expect(entries).toHaveLength(1);
    expect(entries[0].entryId).toBe("UN-6908555");
    expect(entries[0].names[0]).toBe("osama bin laden");
    expect(entries[0].listMetadata).toMatchObject({
      subjectType: "individual",
      programs: ["Al-Qaida"],
      referenceNumber: "QDi.001",
      listedOn: "2001-01-25",
      lastDayUpdated: "2011-05-02",
    });
  });

  it("captures aliases as canonical name entries", () => {
    const entries = parseUnConsolidated(wrap(INDIVIDUAL_BASIC));
    expect(entries[0].names).toHaveLength(3); // primary + 2 aliases
    expect(entries[0].names).toContain("shaykh usama bin ladin");
  });

  it("dedups when an alias canonicalizes to the same value as primary", () => {
    const xml = wrap(`
      <INDIVIDUAL>
        <DATAID>1</DATAID>
        <FIRST_NAME>Same Name</FIRST_NAME>
        <UN_LIST_TYPE>Test</UN_LIST_TYPE>
        <INDIVIDUAL_ALIAS>
          <ALIAS_NAME>Same Name</ALIAS_NAME>
        </INDIVIDUAL_ALIAS>
      </INDIVIDUAL>
    `);
    const entries = parseUnConsolidated(xml);
    expect(entries[0].names).toEqual(["same name"]);
  });

  it("captures passport identifier with issuing country", () => {
    const entries = parseUnConsolidated(wrap(INDIVIDUAL_BASIC));
    expect(entries[0].identifiers).toContainEqual({
      type: "passport",
      value: "P-001",
      issuingCountry: "SA",
    });
  });

  it("maps document types to canonical identifier enum", () => {
    const xml = wrap(`
      <INDIVIDUAL>
        <DATAID>99</DATAID>
        <FIRST_NAME>Docs</FIRST_NAME>
        <INDIVIDUAL_DOCUMENT>
          <TYPE_OF_DOCUMENT>National identification card</TYPE_OF_DOCUMENT>
          <NUMBER>NID-1</NUMBER>
        </INDIVIDUAL_DOCUMENT>
        <INDIVIDUAL_DOCUMENT>
          <TYPE_OF_DOCUMENT>Tax identification number</TYPE_OF_DOCUMENT>
          <NUMBER>TAX-1</NUMBER>
        </INDIVIDUAL_DOCUMENT>
        <INDIVIDUAL_DOCUMENT>
          <TYPE_OF_DOCUMENT>Driver's licence</TYPE_OF_DOCUMENT>
          <NUMBER>DL-1</NUMBER>
        </INDIVIDUAL_DOCUMENT>
      </INDIVIDUAL>
    `);
    const entries = parseUnConsolidated(xml);
    expect(entries[0].identifiers).toEqual([
      { type: "national_id", value: "NID-1" },
      { type: "tax_id", value: "TAX-1" },
      { type: "other", value: "DL-1" },
    ]);
  });

  it("parses an entity with alias + address", () => {
    const entries = parseUnConsolidated(wrap(ENTITY_BASIC));
    expect(entries).toHaveLength(1);
    expect(entries[0].entryId).toBe("UN-17777");
    expect(entries[0].listMetadata.subjectType).toBe("entity");
    expect(entries[0].names).toContain("bad co"); // "Co" alone not stripped (only "Co. Ltd")
    expect(entries[0].names).toContain("bad holdings");
    expect(entries[0].addresses).toHaveLength(1);
    expect(entries[0].addresses[0]).toMatchObject({
      country: "IQ",
      lines: ["Mosul", "Nineveh"],
    });
  });

  it("normalizes 2-letter country to uppercase; non-ISO to XX", () => {
    const xml = wrap(`
      <ENTITY>
        <DATAID>1</DATAID>
        <FIRST_NAME>Test One</FIRST_NAME>
        <ENTITY_ADDRESS>
          <CITY>X</CITY>
          <COUNTRY>de</COUNTRY>
        </ENTITY_ADDRESS>
      </ENTITY>
      <ENTITY>
        <DATAID>2</DATAID>
        <FIRST_NAME>Test Two</FIRST_NAME>
        <ENTITY_ADDRESS>
          <CITY>X</CITY>
          <COUNTRY>Germany</COUNTRY>
        </ENTITY_ADDRESS>
      </ENTITY>
    `);
    const entries = parseUnConsolidated(xml);
    const byId = new Map(entries.map((e) => [e.entryId, e]));
    expect(byId.get("UN-1")?.addresses[0].country).toBe("DE");
    expect(byId.get("UN-2")?.addresses[0].country).toBe("XX");
  });

  it("decodes XML entities in names and aliases", () => {
    const xml = wrap(`
      <ENTITY>
        <DATAID>1</DATAID>
        <FIRST_NAME>R&amp;D Ltd</FIRST_NAME>
        <ENTITY_ALIAS>
          <ALIAS_NAME>Bla &quot;Inner&quot; Bla</ALIAS_NAME>
        </ENTITY_ALIAS>
      </ENTITY>
    `);
    const entries = parseUnConsolidated(xml);
    expect(entries[0].names[0]).toBe("r d"); // & → space via canonicalize, LTD stripped
    expect(entries[0].names).toContain("bla inner bla");
  });

  it("skips individuals without DATAID", () => {
    const xml = wrap(`
      <INDIVIDUAL>
        <FIRST_NAME>Has No ID</FIRST_NAME>
        <UN_LIST_TYPE>Test</UN_LIST_TYPE>
      </INDIVIDUAL>
    `);
    expect(parseUnConsolidated(xml)).toEqual([]);
  });

  it("skips entities without FIRST_NAME", () => {
    const xml = wrap(`
      <ENTITY>
        <DATAID>1</DATAID>
        <UN_LIST_TYPE>Test</UN_LIST_TYPE>
      </ENTITY>
    `);
    expect(parseUnConsolidated(xml)).toEqual([]);
  });

  it("processes multiple individuals + entities independently", () => {
    const xml = wrap(INDIVIDUAL_BASIC, ENTITY_BASIC);
    const entries = parseUnConsolidated(xml);
    expect(entries).toHaveLength(2);
    const ids = entries.map((e) => e.entryId).sort();
    expect(ids).toEqual(["UN-17777", "UN-6908555"]);
  });

  it("global regex state does not leak between invocations", () => {
    const xml = wrap(INDIVIDUAL_BASIC);
    const first = parseUnConsolidated(xml);
    const second = parseUnConsolidated(xml);
    expect(first).toEqual(second);
    expect(second).toHaveLength(1);
  });
});
