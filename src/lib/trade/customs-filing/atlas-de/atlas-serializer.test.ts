/**
 * Z14a — ATLAS-DE XML serializer tests.
 *
 * Coverage:
 *   1. escapeText: escapes ampersand, lt/gt
 *   2. escapeText: passes through UTF-8 / umlauts
 *   3. escapeText: nullish returns ""
 *   4. escapeAttr: encodes all five XML entities
 *   5. Output begins with XML 1.0 declaration
 *   6. Root tag is ATLAS_Ausfuhranmeldung with SchemaVersion attribute
 *   7. Exporter block contains all required leaves (Name, EORI, City, CountryCode)
 *   8. Optional leaves skipped when undefined (no empty tags)
 *   9. Decimal NetMassKg / StatisticalValue preserved locale-independent
 *  10. <script> injection in Description is fully escaped
 *  11. PreviousDocuments rendered only when array non-empty
 *  12. TransportDocument rendered only when supplied
 *  13. Licenses wrapper only when item has licenses
 *  14. Item PositionsNr (ItemNumber) attribute round-trips
 *  15. Sanity check — balanced open/close tags
 */

import { describe, it, expect } from "vitest";
import { escapeText, escapeAttr, serializeAtlasXml } from "./atlas-serializer";
import { ATLAS_XSD_VERSION, type AtlasPayload } from "./atlas-payload";

// ─── Fixture ──────────────────────────────────────────────────────

function minimalPayload(): AtlasPayload {
  return {
    SchemaVersion: ATLAS_XSD_VERSION,
    Emitter: "Caelex Comply Trade",
    GeneratedAt: "2026-05-22T10:00:00.000Z",
    Declaration: {
      LocalReferenceNumber: "ATLAS-TEST-001",
      DeclarationType: "EXPORT",
      DeclarationDate: "2026-06-15",
      Exporter: {
        Name: "Caelex Aerospace GmbH",
        Address: {
          Street: "Beispielstr. 1",
          PostalCode: "80331",
          City: "München",
          CountryCode: "DE",
        },
        EORI: "DE5300000012345",
        VATNumber: "DE123456789",
      },
      Consignee: {
        Name: "AeroJet Corp",
        Address: {
          Street: "1 Rocket Way",
          PostalCode: "90210",
          City: "Los Angeles",
          CountryCode: "US",
        },
      },
      OfficeOfExport: {
        ReferenceNumber: "DE000891",
        Name: "Zollamt Frankfurt am Main",
      },
      DispatchCountry: "DE",
      DestinationCountry: "US",
      TransportModeBorder: "4",
      PreviousDocuments: [],
      Items: [
        {
          ItemNumber: 1,
          Description: "Reaction wheel HR16",
          CNCode: "84129080",
          CountryOfOrigin: "DE",
          NetMassKg: 5.4,
          SupplementaryUnit: "NAR",
          SupplementaryQuantity: 4,
          StatisticalValue: 300000.5,
          Currency: "EUR",
          Licenses: [],
        },
      ],
      TotalInvoiceAmount: 300000.5,
      TotalInvoiceCurrency: "EUR",
    },
  };
}

// ─── Escape helpers ───────────────────────────────────────────────

describe("Z14a — ATLAS escapeText", () => {
  it("escapes ampersand, less-than, greater-than", () => {
    expect(escapeText("a & b < c > d")).toBe("a &amp; b &lt; c &gt; d");
  });

  it("passes through UTF-8 / German umlauts unchanged", () => {
    expect(escapeText("Düsseldorf & Köln")).toBe("Düsseldorf &amp; Köln");
  });

  it("returns empty string for null/undefined", () => {
    expect(escapeText(null)).toBe("");
    expect(escapeText(undefined)).toBe("");
  });

  it("never double-encodes — escapes & FIRST", () => {
    expect(escapeText("&amp;")).toBe("&amp;amp;");
  });
});

describe("Z14a — ATLAS escapeAttr", () => {
  it("escapes all five XML 1.0 entities including quotes", () => {
    expect(escapeAttr(`a & b < c > d " e ' f`)).toBe(
      "a &amp; b &lt; c &gt; d &quot; e &apos; f",
    );
  });
});

// ─── Full document serialization ──────────────────────────────────

describe("Z14a — serializeAtlasXml output", () => {
  it("begins with the XML 1.0 declaration", () => {
    const xml = serializeAtlasXml(minimalPayload());
    expect(xml.startsWith(`<?xml version="1.0" encoding="UTF-8"?>`)).toBe(true);
  });

  it("wraps in ATLAS_Ausfuhranmeldung with SchemaVersion attribute", () => {
    const xml = serializeAtlasXml(minimalPayload());
    expect(xml).toContain(
      `<ATLAS_Ausfuhranmeldung SchemaVersion="${ATLAS_XSD_VERSION}"`,
    );
    expect(xml.trimEnd().endsWith("</ATLAS_Ausfuhranmeldung>")).toBe(true);
  });

  it("emits Declaration with DeclarationType attribute", () => {
    const xml = serializeAtlasXml(minimalPayload());
    expect(xml).toContain(`<Declaration DeclarationType="EXPORT">`);
    expect(xml).toContain(
      "<LocalReferenceNumber>ATLAS-TEST-001</LocalReferenceNumber>",
    );
  });

  it("emits Exporter with all required leaves", () => {
    const xml = serializeAtlasXml(minimalPayload());
    expect(xml).toContain("<Exporter>");
    expect(xml).toContain("<Name>Caelex Aerospace GmbH</Name>");
    expect(xml).toContain("<EORI>DE5300000012345</EORI>");
    expect(xml).toContain("<City>München</City>");
    expect(xml).toContain("<CountryCode>DE</CountryCode>");
  });

  it("emits Consignee with address block", () => {
    const xml = serializeAtlasXml(minimalPayload());
    expect(xml).toContain("<Consignee>");
    expect(xml).toContain("<Name>AeroJet Corp</Name>");
    expect(xml).toContain("<PostalCode>90210</PostalCode>");
  });

  it("emits OfficeOfExport with ReferenceNumber", () => {
    const xml = serializeAtlasXml(minimalPayload());
    expect(xml).toContain("<OfficeOfExport>");
    expect(xml).toContain("<ReferenceNumber>DE000891</ReferenceNumber>");
  });

  it("skips optional leaves when undefined (no empty tags)", () => {
    const xml = serializeAtlasXml(minimalPayload());
    expect(xml).not.toContain("<ContactEmail>");
    expect(xml).not.toContain("<TradeName>");
    expect(xml).not.toContain("<TransportDocument>");
  });

  it("preserves decimal NetMassKg / StatisticalValue without locale-comma", () => {
    const xml = serializeAtlasXml(minimalPayload());
    expect(xml).toContain("<NetMassKg>5.4</NetMassKg>");
    expect(xml).toContain("<StatisticalValue>300000.5</StatisticalValue>");
    expect(xml).not.toContain("<NetMassKg>5,4</NetMassKg>");
    expect(xml).not.toContain("<StatisticalValue>300000,5</StatisticalValue>");
  });

  it("escapes a <script> injection attempt in item Description", () => {
    const payload = minimalPayload();
    payload.Declaration.Items[0]!.Description = `<script>alert("xss")</script>`;
    const xml = serializeAtlasXml(payload);
    expect(xml).not.toContain(`<script>alert`);
    expect(xml).toContain(
      `<Description>&lt;script&gt;alert("xss")&lt;/script&gt;</Description>`,
    );
  });

  it("escapes ampersand in consignee name", () => {
    const payload = minimalPayload();
    payload.Declaration.Consignee.Name = "Smith & Jones Ltd.";
    const xml = serializeAtlasXml(payload);
    expect(xml).toContain("<Name>Smith &amp; Jones Ltd.</Name>");
  });

  it("renders PreviousDocuments only when array non-empty", () => {
    const payloadEmpty = minimalPayload();
    const xmlEmpty = serializeAtlasXml(payloadEmpty);
    expect(xmlEmpty).not.toContain("<PreviousDocuments>");

    const payload = minimalPayload();
    payload.Declaration.DeclarationType = "REEXPORT";
    payload.Declaration.PreviousDocuments = [
      { TypeCode: "N830", Reference: "26DE12345678901234" },
    ];
    const xml = serializeAtlasXml(payload);
    expect(xml).toContain("<PreviousDocuments>");
    expect(xml).toContain("<PreviousDocument>");
    expect(xml).toContain("<TypeCode>N830</TypeCode>");
    expect(xml).toContain("<Reference>26DE12345678901234</Reference>");
  });

  it("renders TransportDocument only when supplied", () => {
    const payload = minimalPayload();
    payload.Declaration.TransportDocument = {
      TypeCode: "N740",
      Reference: "AWB-235-12345678",
    };
    const xml = serializeAtlasXml(payload);
    expect(xml).toContain("<TransportDocument>");
    expect(xml).toContain("<TypeCode>N740</TypeCode>");
    expect(xml).toContain("<Reference>AWB-235-12345678</Reference>");
  });

  it("renders Licenses wrapper only when item has licenses", () => {
    const payloadNoLic = minimalPayload();
    const xmlNoLic = serializeAtlasXml(payloadNoLic);
    expect(xmlNoLic).not.toContain("<Licenses>");

    const payload = minimalPayload();
    payload.Declaration.Items[0]!.Licenses = [
      {
        TypeCode: "X002",
        Reference: "EZG-2026-007",
        IssuingAuthority: "BAFA",
        ValidUntil: "2027-12-31",
      },
    ];
    const xml = serializeAtlasXml(payload);
    expect(xml).toContain("<Licenses>");
    expect(xml).toContain("<LicenseReference>");
    expect(xml).toContain("<TypeCode>X002</TypeCode>");
    expect(xml).toContain("<Reference>EZG-2026-007</Reference>");
    expect(xml).toContain("<IssuingAuthority>BAFA</IssuingAuthority>");
    expect(xml).toContain("<ValidUntil>2027-12-31</ValidUntil>");
  });

  it("preserves ItemNumber attribute on each Item element", () => {
    const payload = minimalPayload();
    payload.Declaration.Items.push({
      ItemNumber: 2,
      Description: "Power-conditioning unit",
      CNCode: "85044084",
      CountryOfOrigin: "DE",
      NetMassKg: 2.1,
      StatisticalValue: 15000,
      Currency: "EUR",
      Licenses: [],
    });
    const xml = serializeAtlasXml(payload);
    expect(xml).toContain(`<Item ItemNumber="1">`);
    expect(xml).toContain(`<Item ItemNumber="2">`);
  });

  it("output passes a basic well-formedness sanity check", () => {
    const xml = serializeAtlasXml(minimalPayload());
    // Every opening tag (not self-closing, ignoring xml decl) has a
    // matching close. Cheap parser-free integrity test.
    const opens = (xml.match(/<[A-Za-zÄÖÜäöü_][^/>\s]*[\s>]/g) ?? []).filter(
      (s) => !s.startsWith("<?xml"),
    );
    const closes = xml.match(/<\/[A-Za-zÄÖÜäöü_][^>]*>/g) ?? [];
    expect(opens.length).toBe(closes.length);
  });
});
