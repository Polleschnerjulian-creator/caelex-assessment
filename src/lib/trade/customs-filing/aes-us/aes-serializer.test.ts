/**
 * Z14b — AES US XML serializer tests.
 *
 * Coverage:
 *   1. escapeText: escapes ampersand and lt/gt
 *   2. escapeText: nullish returns ""
 *   3. escapeAttr: encodes all five XML entities including quotes
 *   4. Output begins with XML 1.0 declaration
 *   5. Root tag is AES_ExportFiling with SchemaVersion attribute
 *   6. Filing element exposes FilingAction + FilerType attributes
 *   7. USPPI block contains EIN, ContactName, ContactPhone
 *   8. UltimateConsignee block contains Name + Type
 *   9. Carrier block contains SCAC/IATA code
 *  10. Booleans emit Y/N (AES convention) — NOT true/false
 *  11. Decimal ValueUSD / ShippingWeightKg preserved locale-independent
 *  12. Optional leaves skipped when undefined
 *  13. IntermediateConsignee rendered only when supplied
 *  14. Commodity LineNumber attribute round-trips
 *  15. <script> injection in Description fully escaped
 *  16. Sanity check — balanced open/close tags
 */

import { describe, it, expect } from "vitest";
import { escapeText, escapeAttr, serializeAesXml } from "./aes-serializer";
import { AES_SCHEMA_VERSION, type AesPayload } from "./aes-payload";

// ─── Fixture ──────────────────────────────────────────────────────

function minimalPayload(): AesPayload {
  return {
    SchemaVersion: AES_SCHEMA_VERSION,
    Emitter: "Caelex Comply Trade",
    GeneratedAt: "2026-05-22T10:00:00.000Z",
    Filing: {
      ShipmentReferenceNumber: "AES-TEST-001",
      FilingAction: "ADD",
      FilerType: "USPPI",
      ExportDate: "2026-06-15",
      USPPI: {
        Name: "Caelex US Inc.",
        Address: {
          Street: "1 Spacecraft Way",
          City: "Los Angeles",
          StateOrProvince: "CA",
          PostalCode: "90210",
          CountryCode: "US",
        },
        IdentifierType: "EIN",
        IdentifierValue: "981234567",
        ContactName: "Jane Trade",
        ContactPhone: "+13105550100",
        ContactEmail: "trade@caelex.example",
      },
      UltimateConsignee: {
        Name: "Eutelsat S.A.",
        Address: {
          Street: "70 rue Balard",
          City: "Paris",
          PostalCode: "75015",
          CountryCode: "FR",
        },
        Type: "D",
      },
      Carrier: {
        Name: "Lufthansa Cargo",
        SCACorIATA: "LH",
      },
      TransportMode: "40",
      PortOfExport: "2704",
      CountryOfDestination: "FR",
      Commodities: [
        {
          LineNumber: 1,
          Description: "Reaction wheel HR16",
          ScheduleBOrHTS: "8412900080",
          ECCN: "9A515.a",
          LicenseCode: "C31",
          LicenseNumber: "BIS-2026-12345",
          Quantity: 4,
          UnitOfMeasure: "NO",
          ValueUSD: 300000.5,
          ShippingWeightKg: 21.6,
          CountryOfOrigin: "US",
          OriginIndicator: "D",
          ExportInformationCode: "OS",
        },
      ],
      HazardousMaterials: false,
      RoutedExportTransaction: false,
      TotalValueUSD: 300000.5,
    },
  };
}

// ─── Escape helpers ───────────────────────────────────────────────

describe("Z14b — AES escapeText", () => {
  it("escapes ampersand and lt/gt", () => {
    expect(escapeText("Lockheed & Martin <CO>")).toBe(
      "Lockheed &amp; Martin &lt;CO&gt;",
    );
  });

  it("returns empty string for null/undefined", () => {
    expect(escapeText(null)).toBe("");
    expect(escapeText(undefined)).toBe("");
  });

  it("never double-encodes — escapes & FIRST", () => {
    expect(escapeText("&amp;")).toBe("&amp;amp;");
  });
});

describe("Z14b — AES escapeAttr", () => {
  it("escapes all five XML 1.0 entities including quotes", () => {
    expect(escapeAttr(`a & b < c > d " e ' f`)).toBe(
      "a &amp; b &lt; c &gt; d &quot; e &apos; f",
    );
  });
});

// ─── Full document serialization ──────────────────────────────────

describe("Z14b — serializeAesXml output", () => {
  it("begins with the XML 1.0 declaration", () => {
    const xml = serializeAesXml(minimalPayload());
    expect(xml.startsWith(`<?xml version="1.0" encoding="UTF-8"?>`)).toBe(true);
  });

  it("wraps in AES_ExportFiling with SchemaVersion attribute", () => {
    const xml = serializeAesXml(minimalPayload());
    expect(xml).toContain(
      `<AES_ExportFiling SchemaVersion="${AES_SCHEMA_VERSION}"`,
    );
    expect(xml.trimEnd().endsWith("</AES_ExportFiling>")).toBe(true);
  });

  it("emits Filing with FilingAction and FilerType attributes", () => {
    const xml = serializeAesXml(minimalPayload());
    expect(xml).toContain(`<Filing FilingAction="ADD" FilerType="USPPI">`);
    expect(xml).toContain(
      "<ShipmentReferenceNumber>AES-TEST-001</ShipmentReferenceNumber>",
    );
  });

  it("emits USPPI block with EIN and contact details", () => {
    const xml = serializeAesXml(minimalPayload());
    expect(xml).toContain("<USPPI>");
    expect(xml).toContain("<Name>Caelex US Inc.</Name>");
    expect(xml).toContain("<IdentifierType>EIN</IdentifierType>");
    expect(xml).toContain("<IdentifierValue>981234567</IdentifierValue>");
    expect(xml).toContain("<ContactName>Jane Trade</ContactName>");
    expect(xml).toContain("<StateOrProvince>CA</StateOrProvince>");
  });

  it("emits UltimateConsignee with Type and country", () => {
    const xml = serializeAesXml(minimalPayload());
    expect(xml).toContain("<UltimateConsignee>");
    expect(xml).toContain("<Name>Eutelsat S.A.</Name>");
    expect(xml).toContain("<Type>D</Type>");
    expect(xml).toContain("<CountryCode>FR</CountryCode>");
  });

  it("emits Carrier with SCAC/IATA code", () => {
    const xml = serializeAesXml(minimalPayload());
    expect(xml).toContain("<Carrier>");
    expect(xml).toContain("<SCACorIATA>LH</SCACorIATA>");
  });

  it("emits HazardousMaterials and RoutedExportTransaction as Y/N (AES convention)", () => {
    const xml = serializeAesXml(minimalPayload());
    expect(xml).toContain("<HazardousMaterials>N</HazardousMaterials>");
    expect(xml).toContain(
      "<RoutedExportTransaction>N</RoutedExportTransaction>",
    );
    // And NOT the lowercase booleans
    expect(xml).not.toContain("<HazardousMaterials>false</HazardousMaterials>");
  });

  it("emits Y for hazmat / routed when set true", () => {
    const payload = minimalPayload();
    payload.Filing.HazardousMaterials = true;
    payload.Filing.RoutedExportTransaction = true;
    const xml = serializeAesXml(payload);
    expect(xml).toContain("<HazardousMaterials>Y</HazardousMaterials>");
    expect(xml).toContain(
      "<RoutedExportTransaction>Y</RoutedExportTransaction>",
    );
  });

  it("preserves decimal ValueUSD / ShippingWeightKg without locale-comma", () => {
    const xml = serializeAesXml(minimalPayload());
    expect(xml).toContain("<ValueUSD>300000.5</ValueUSD>");
    expect(xml).toContain("<ShippingWeightKg>21.6</ShippingWeightKg>");
    expect(xml).not.toContain("<ValueUSD>300000,5</ValueUSD>");
    expect(xml).not.toContain("<ShippingWeightKg>21,6</ShippingWeightKg>");
  });

  it("skips optional leaves when undefined (no empty tags)", () => {
    const payload = minimalPayload();
    delete payload.Filing.USPPI.ContactEmail;
    payload.Filing.Commodities[0]!.USML = undefined;
    const xml = serializeAesXml(payload);
    expect(xml).not.toContain("<ContactEmail>");
    expect(xml).not.toContain("<USML>");
    expect(xml).not.toContain("<IntermediateConsignee>");
  });

  it("renders IntermediateConsignee only when supplied", () => {
    const payloadOmit = minimalPayload();
    const xmlOmit = serializeAesXml(payloadOmit);
    expect(xmlOmit).not.toContain("<IntermediateConsignee>");

    const payload = minimalPayload();
    payload.Filing.IntermediateConsignee = {
      Name: "Air Logistics GmbH",
      Address: {
        Street: "Flughafenring 8",
        City: "Frankfurt",
        PostalCode: "60549",
        CountryCode: "DE",
      },
    };
    const xml = serializeAesXml(payload);
    expect(xml).toContain("<IntermediateConsignee>");
    expect(xml).toContain("<Name>Air Logistics GmbH</Name>");
  });

  it("preserves LineNumber attribute on each Commodity element", () => {
    const payload = minimalPayload();
    payload.Filing.Commodities.push({
      LineNumber: 2,
      Description: "Power-conditioning unit",
      ScheduleBOrHTS: "8504408400",
      LicenseCode: "C30",
      Quantity: 2,
      UnitOfMeasure: "NO",
      ValueUSD: 15000,
      ShippingWeightKg: 4.2,
      CountryOfOrigin: "US",
      OriginIndicator: "D",
      ExportInformationCode: "OS",
    });
    const xml = serializeAesXml(payload);
    expect(xml).toContain(`<Commodity LineNumber="1">`);
    expect(xml).toContain(`<Commodity LineNumber="2">`);
  });

  it("escapes a <script> injection attempt in commodity Description", () => {
    const payload = minimalPayload();
    payload.Filing.Commodities[0]!.Description = `<script>alert("xss")</script>`;
    const xml = serializeAesXml(payload);
    expect(xml).not.toContain(`<script>alert`);
    expect(xml).toContain(
      `<Description>&lt;script&gt;alert("xss")&lt;/script&gt;</Description>`,
    );
  });

  it("escapes ampersand in USPPI / consignee names", () => {
    const payload = minimalPayload();
    payload.Filing.UltimateConsignee.Name = "Smith & Jones Aerospace";
    const xml = serializeAesXml(payload);
    expect(xml).toContain("<Name>Smith &amp; Jones Aerospace</Name>");
  });

  it("output passes a basic well-formedness sanity check", () => {
    const xml = serializeAesXml(minimalPayload());
    const opens = (xml.match(/<[A-Za-z_][^/>\s]*[\s>]/g) ?? []).filter(
      (s) => !s.startsWith("<?xml"),
    );
    const closes = xml.match(/<\/[A-Za-z_][^>]*>/g) ?? [];
    expect(opens.length).toBe(closes.length);
  });
});
