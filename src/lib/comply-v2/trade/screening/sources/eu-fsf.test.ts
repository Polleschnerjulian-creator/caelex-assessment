/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Tests for the EU FSF parser.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import { parseEuFsf } from "./eu-fsf";

// ─── Fixtures ───────────────────────────────────────────────────────

const ROSNEFT_BLOCK = `
<sanctionEntity euReferenceNumber="EU.123" designationDate="2022-02-25">
  <subjectType code="E"/>
  <nameAlias firstName="" lastName="" wholeName="ROSNEFT OAO" regulationLanguage="EN"/>
  <nameAlias firstName="" lastName="" wholeName="OAO ROSNEFT" regulationLanguage="EN"/>
  <nameAlias firstName="" lastName="" wholeName="Open Joint Stock Company Rosneft Oil Company" regulationLanguage="EN"/>
  <address city="Moscow" countryCode="RU" countryDescription="Russia"/>
  <identification identificationTypeCode="OTH" number="1027700043502"/>
  <regulation numberTitle="Council Regulation (EU) 833/2014" publicationDateOfRegulation="2014-07-31"/>
</sanctionEntity>
`.trim();

const PERSON_BLOCK = `
<sanctionEntity euReferenceNumber="EU.456" designationDate="2022-03-15">
  <subjectType code="P"/>
  <nameAlias firstName="Vladimir" lastName="Putin" wholeName="Vladimir Vladimirovich Putin" regulationLanguage="EN"/>
  <birthdate date="1952-10-07" countryCode="RU"/>
  <citizenship countryCode="RU"/>
  <identification identificationTypeCode="PASSPORT" number="123456789" issuedBy="RU"/>
  <regulation numberTitle="Council Regulation 269/2014"/>
</sanctionEntity>
`.trim();

const FULL_DOC = `<?xml version="1.0" encoding="UTF-8"?>
<export>
${ROSNEFT_BLOCK}
${PERSON_BLOCK}
</export>`;

// ─── Tests ──────────────────────────────────────────────────────────

describe("parseEuFsf — input handling", () => {
  it("returns empty for empty input", () => {
    expect(parseEuFsf("")).toEqual([]);
  });

  it("returns empty for non-string input", () => {
    // @ts-expect-error — defensive null check
    expect(parseEuFsf(null)).toEqual([]);
  });

  it("returns empty for HTML error page (no sanctionEntity)", () => {
    const html = "<html><body>Service temporarily unavailable</body></html>";
    expect(parseEuFsf(html)).toEqual([]);
  });

  it("handles XML with no sanctionEntity blocks", () => {
    expect(parseEuFsf("<export></export>")).toEqual([]);
  });
});

describe("parseEuFsf — entity parsing", () => {
  it("parses Rosneft entity with multiple name aliases", () => {
    const entries = parseEuFsf(`<export>${ROSNEFT_BLOCK}</export>`);
    expect(entries).toHaveLength(1);
    const e = entries[0];
    expect(e.entryId).toBe("EU.123");
    expect(e.names.length).toBeGreaterThanOrEqual(2);
    // canonicalized + dedupe — "ROSNEFT OAO" → "rosneft" (OAO suffix stripped)
    expect(e.names).toContain("rosneft");
    // "Open Joint Stock Company Rosneft Oil Company" stays mostly intact
    expect(e.names.some((n) => n.includes("rosneft oil company"))).toBe(true);
  });

  it("captures sdnType from subjectType code (E → entity)", () => {
    const entries = parseEuFsf(`<export>${ROSNEFT_BLOCK}</export>`);
    expect(entries[0].listMetadata.sdnType).toBe("entity");
  });

  it("captures sdnType from subjectType code (P → individual)", () => {
    const entries = parseEuFsf(`<export>${PERSON_BLOCK}</export>`);
    expect(entries[0].listMetadata.sdnType).toBe("individual");
  });

  it("captures designationDate in metadata", () => {
    const entries = parseEuFsf(`<export>${ROSNEFT_BLOCK}</export>`);
    expect(entries[0].listMetadata.designationDate).toBe("2022-02-25");
  });

  it("captures regulation reference in programs", () => {
    const entries = parseEuFsf(`<export>${ROSNEFT_BLOCK}</export>`);
    const programs = entries[0].listMetadata.programs as string[];
    expect(programs).toContain("Council Regulation (EU) 833/2014");
  });
});

describe("parseEuFsf — addresses", () => {
  it("extracts country code from address", () => {
    const entries = parseEuFsf(`<export>${ROSNEFT_BLOCK}</export>`);
    expect(entries[0].addresses).toHaveLength(1);
    expect(entries[0].addresses[0].country).toBe("RU");
  });

  it("includes city in address lines", () => {
    const entries = parseEuFsf(`<export>${ROSNEFT_BLOCK}</export>`);
    expect(entries[0].addresses[0].lines).toContain("Moscow");
  });

  it("handles entity with no addresses (person without registered address)", () => {
    const entries = parseEuFsf(`<export>${PERSON_BLOCK}</export>`);
    expect(entries[0].addresses).toEqual([]);
  });
});

describe("parseEuFsf — identifiers", () => {
  it("extracts passport identifier with country", () => {
    const entries = parseEuFsf(`<export>${PERSON_BLOCK}</export>`);
    const identifiers = entries[0].identifiers;
    expect(identifiers).toContainEqual({
      type: "passport",
      value: "123456789",
      issuingCountry: "RU",
    });
  });

  it("normalizes 'OTH' identifier type to 'other'", () => {
    const entries = parseEuFsf(`<export>${ROSNEFT_BLOCK}</export>`);
    const identifiers = entries[0].identifiers;
    expect(identifiers).toContainEqual({
      type: "other",
      value: "1027700043502",
    });
  });
});

describe("parseEuFsf — multi-entity document", () => {
  it("parses both entities in a multi-entity export", () => {
    const entries = parseEuFsf(FULL_DOC);
    expect(entries).toHaveLength(2);
    const rosneft = entries.find((e) => e.entryId === "EU.123");
    const putin = entries.find((e) => e.entryId === "EU.456");
    expect(rosneft).toBeDefined();
    expect(putin).toBeDefined();
    expect(rosneft?.listMetadata.sdnType).toBe("entity");
    expect(putin?.listMetadata.sdnType).toBe("individual");
  });

  it("skips malformed blocks but keeps valid ones", () => {
    const malformedBlock = `<sanctionEntity><nameAlias wholeName=""/></sanctionEntity>`;
    const doc = `<export>${malformedBlock}${ROSNEFT_BLOCK}</export>`;
    const entries = parseEuFsf(doc);
    // Malformed block has no entryId → skipped; Rosneft remains
    expect(entries.find((e) => e.entryId === "EU.123")).toBeDefined();
  });
});

describe("parseEuFsf — XML entity decoding", () => {
  it("decodes &amp; in name to &", () => {
    const block = `<sanctionEntity euReferenceNumber="EU.X1">
      <subjectType code="E"/>
      <nameAlias wholeName="Smith &amp; Jones LLC" regulationLanguage="EN"/>
    </sanctionEntity>`;
    const entries = parseEuFsf(`<export>${block}</export>`);
    // "Smith & Jones LLC" → canonicalized "smith jones" (LLC stripped, & → space)
    expect(entries[0].names[0]).toContain("smith");
    expect(entries[0].names[0]).toContain("jones");
  });

  it("decodes &quot; in attributes", () => {
    const block = `<sanctionEntity euReferenceNumber="EU.X2">
      <subjectType code="E"/>
      <nameAlias wholeName="Acme &quot;Special&quot; Corp" regulationLanguage="EN"/>
    </sanctionEntity>`;
    const entries = parseEuFsf(`<export>${block}</export>`);
    expect(entries[0].names[0]).toBe("acme special");
  });
});

describe("parseEuFsf — real-world structural variations", () => {
  it("handles entity with logicalId fallback (no euReferenceNumber)", () => {
    const block = `<sanctionEntity logicalId="LOG-789">
      <subjectType code="E"/>
      <nameAlias wholeName="Some Entity" regulationLanguage="EN"/>
    </sanctionEntity>`;
    const entries = parseEuFsf(`<export>${block}</export>`);
    expect(entries).toHaveLength(1);
    expect(entries[0].entryId).toBe("LOG-789");
  });

  it("uses firstName + lastName fallback when wholeName missing", () => {
    const block = `<sanctionEntity euReferenceNumber="EU.X3">
      <subjectType code="P"/>
      <nameAlias firstName="John" lastName="Doe" regulationLanguage="EN"/>
    </sanctionEntity>`;
    const entries = parseEuFsf(`<export>${block}</export>`);
    expect(entries[0].names[0]).toBe("john doe");
  });
});
