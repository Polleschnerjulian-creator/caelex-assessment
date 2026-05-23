/**
 * Z14b — AES builder tests.
 *
 * Coverage:
 *   1. mapLicenseCode: BIS_EAR → C31
 *   2. mapLicenseCode: License Exception STA → C32
 *   3. mapLicenseCode: License Exception ENC / CSA → C33
 *   4. mapLicenseCode: DDTC_DSP5 → C36
 *   5. mapLicenseCode: BAFA_* and other fall back → C30 (NLR)
 *   6. mapExportInformationCode: TEMP_EXPORT → TP
 *   7. mapExportInformationCode: GOVERNMENT end-use → GP
 *   8. mapExportInformationCode: MILITARY end-use → GS
 *   9. mapExportInformationCode: default → OS
 *  10. mapConsigneeType: government keyword → G
 *  11. mapConsigneeType: reseller keyword → R
 *  12. mapConsigneeType: end-user keyword → D
 *  13. mapConsigneeType: nullish → O
 *  14. mapOriginIndicator: US → D, anything else → F
 *  15. buildAesPayload: pins SchemaVersion + Emitter
 *  16. buildAesPayload: USPPI populated with EIN-first preference
 *  17. buildAesPayload: per-line appliedLicense overrides operation stack
 *  18. buildAesPayload: HS code padded to 10 digits
 *  19. buildAesPayload: TotalValueUSD = sum of commodity values
 *  20. buildAesPayload: CountryOfDestination uses endUseCountry when set
 *  21. buildAesPayload: shipment ref clamped to 17 chars
 *  22. round-trip: builder → serializer emits valid XML
 *  23. round-trip: hazmat/routed booleans surface as Y/N
 */

import { describe, it, expect } from "vitest";
import {
  buildAesPayload,
  mapConsigneeType,
  mapExportInformationCode,
  mapLicenseCode,
  mapOriginIndicator,
  type AesBuilderInput,
} from "./aes-builder";
import { serializeAesXml } from "./aes-serializer";
import { AES_SCHEMA_VERSION } from "./aes-payload";

// ─── Fixture ──────────────────────────────────────────────────────

function fixtureInput(): AesBuilderInput {
  return {
    generatedAt: "2026-05-22T10:00:00.000Z",
    usppi: {
      legalName: "Caelex US Inc.",
      addressStreet: "1 Spacecraft Way",
      addressCity: "Los Angeles",
      addressState: "CA",
      addressZip: "90210",
      addressCountry: "US",
      einNumber: "981234567",
      contactName: "Jane Trade",
      contactPhone: "+13105550100",
      contactEmail: "trade@caelex.example",
    },
    operation: {
      id: "op_aes",
      reference: "AES-ISAR-2026-Q1-001",
      description: "Reaction wheel re-export",
      operationType: "EXPORT",
      shipFromCountry: "US",
      shipToCountry: "FR",
      endUseCountry: null,
      endUserName: null,
      endUserSector: "Aerospace prime",
      scheduledShipDate: "2026-06-15T00:00:00.000Z",
      createdAt: "2026-05-01T00:00:00.000Z",
      portOfExport: "2704",
      carrierName: "Lufthansa Cargo",
      carrierCode: "LH",
      transportMode: "40",
      hazardousMaterials: false,
      routedExportTransaction: false,
      counterparty: {
        legalName: "Eutelsat S.A.",
        countryCode: "FR",
        addressLines: ["70 rue Balard", "75015 Paris"],
      },
      lines: [
        {
          id: "line_1",
          quantity: 4,
          unitValue: 75000,
          unitCurrency: "USD",
          item: {
            name: "Reaction wheel HR16",
            description: "Honeywell HR16 momentum wheel, 100 Nms",
            countryOfOrigin: "US",
            eccnUS: "9A515.a",
            hsCode: "8412900080",
            netMassKg: 5.4,
          },
          appliedLicense: null,
        },
      ],
      licenses: [],
    },
  };
}

// ─── mapLicenseCode ────────────────────────────────────────────────

describe("Z14b — mapLicenseCode", () => {
  it("maps BIS_EAR → C31 (BIS license required)", () => {
    expect(mapLicenseCode("BIS_EAR")).toBe("C31");
  });

  it("maps License Exception STA → C32", () => {
    expect(mapLicenseCode("BIS_LICENSE_EXCEPTION_STA")).toBe("C32");
  });

  it("maps License Exception ENC / CSA → C33", () => {
    expect(mapLicenseCode("BIS_LICENSE_EXCEPTION_ENC")).toBe("C33");
    expect(mapLicenseCode("BIS_LICENSE_EXCEPTION_CSA")).toBe("C33");
  });

  it("maps DDTC_DSP5 / TAA → C36", () => {
    expect(mapLicenseCode("DDTC_DSP5")).toBe("C36");
    expect(mapLicenseCode("DDTC_TAA")).toBe("C36");
  });

  it("maps BAFA and other → C30 (NLR fallback)", () => {
    expect(mapLicenseCode("BAFA_EINZEL")).toBe("C30");
    expect(mapLicenseCode("BAFA_AGG_12")).toBe("C30");
    expect(mapLicenseCode("OTHER")).toBe("C30");
  });
});

// ─── mapExportInformationCode ──────────────────────────────────────

describe("Z14b — mapExportInformationCode", () => {
  it("maps TEMP_EXPORT → TP", () => {
    expect(mapExportInformationCode("TEMP_EXPORT", null)).toBe("TP");
  });

  it("maps GOVERNMENT end-use → GP", () => {
    expect(mapExportInformationCode("EXPORT", "GOVERNMENT")).toBe("GP");
    expect(mapExportInformationCode("EXPORT", "BEHOERDE")).toBe("GP");
  });

  it("maps MILITARY end-use → GS (FMS)", () => {
    expect(mapExportInformationCode("EXPORT", "MILITARY")).toBe("GS");
    expect(mapExportInformationCode("EXPORT", "MILITAERISCH")).toBe("GS");
  });

  it("defaults to OS for civilian / unknown", () => {
    expect(mapExportInformationCode("EXPORT", "CIVIL")).toBe("OS");
    expect(mapExportInformationCode("EXPORT", null)).toBe("OS");
  });
});

// ─── mapConsigneeType ──────────────────────────────────────────────

describe("Z14b — mapConsigneeType", () => {
  it("maps government keyword to G", () => {
    expect(mapConsigneeType("Government agency")).toBe("G");
    expect(mapConsigneeType("Public-sector buyer")).toBe("G");
  });

  it("maps reseller / distributor to R", () => {
    expect(mapConsigneeType("Authorized reseller")).toBe("R");
    expect(mapConsigneeType("Regional distributor")).toBe("R");
  });

  it("maps end-user / consumer to D", () => {
    expect(mapConsigneeType("End-user / operator")).toBe("D");
    expect(mapConsigneeType("Direct consumer")).toBe("D");
  });

  it("maps null/unknown to O", () => {
    expect(mapConsigneeType(null)).toBe("O");
    expect(mapConsigneeType(undefined)).toBe("O");
    expect(mapConsigneeType("Aerospace prime")).toBe("O");
  });
});

// ─── mapOriginIndicator ────────────────────────────────────────────

describe("Z14b — mapOriginIndicator", () => {
  it("returns D for US-origin", () => {
    expect(mapOriginIndicator("US")).toBe("D");
    expect(mapOriginIndicator("us")).toBe("D");
  });

  it("returns F for non-US origin", () => {
    expect(mapOriginIndicator("DE")).toBe("F");
    expect(mapOriginIndicator("FR")).toBe("F");
  });

  it("returns F for nullish", () => {
    expect(mapOriginIndicator(null)).toBe("F");
    expect(mapOriginIndicator(undefined)).toBe("F");
  });
});

// ─── buildAesPayload ───────────────────────────────────────────────

describe("Z14b — buildAesPayload", () => {
  it("pins SchemaVersion to AES_SCHEMA_VERSION and Emitter to Caelex", () => {
    const payload = buildAesPayload(fixtureInput());
    expect(payload.SchemaVersion).toBe(AES_SCHEMA_VERSION);
    expect(payload.Emitter).toBe("Caelex Comply Trade");
  });

  it("populates USPPI with EIN-first identifier preference", () => {
    const payload = buildAesPayload(fixtureInput());
    const u = payload.Filing.USPPI;
    expect(u.Name).toBe("Caelex US Inc.");
    expect(u.IdentifierType).toBe("EIN");
    expect(u.IdentifierValue).toBe("981234567");
    expect(u.Address.StateOrProvince).toBe("CA");
    expect(u.Address.PostalCode).toBe("90210");
  });

  it("falls back to DUNS when EIN absent", () => {
    const input = fixtureInput();
    input.usppi.einNumber = null;
    input.usppi.dunsNumber = "123456789";
    const payload = buildAesPayload(input);
    expect(payload.Filing.USPPI.IdentifierType).toBe("DUNS");
    expect(payload.Filing.USPPI.IdentifierValue).toBe("123456789");
  });

  it("falls back to placeholder identifier when EIN + DUNS both absent", () => {
    const input = fixtureInput();
    input.usppi.einNumber = null;
    input.usppi.dunsNumber = null;
    const payload = buildAesPayload(input);
    expect(payload.Filing.USPPI.IdentifierType).toBe("EIN");
    expect(payload.Filing.USPPI.IdentifierValue).toBe("000000000");
  });

  it("uses appliedLicense.LicenseCode when set on the line", () => {
    const input = fixtureInput();
    input.operation.lines[0]!.appliedLicense = {
      licenseType: "BIS_LICENSE_EXCEPTION_STA",
      licenseNumber: "STA-EAR-740.20",
    };
    input.operation.licenses = [
      {
        licenseType: "BIS_EAR",
        licenseNumber: "DIFFERENT-ONE",
      },
    ];
    const payload = buildAesPayload(input);
    const c = payload.Filing.Commodities[0]!;
    expect(c.LicenseCode).toBe("C32");
    expect(c.LicenseNumber).toBe("STA-EAR-740.20");
  });

  it("falls back to operation-stack BIS/DDTC license when applied is null", () => {
    const input = fixtureInput();
    input.operation.licenses = [
      { licenseType: "BIS_EAR", licenseNumber: "BIS-2026-007" },
    ];
    const payload = buildAesPayload(input);
    const c = payload.Filing.Commodities[0]!;
    expect(c.LicenseCode).toBe("C31");
    expect(c.LicenseNumber).toBe("BIS-2026-007");
  });

  it("defaults to NLR (C30) when no license is present", () => {
    const payload = buildAesPayload(fixtureInput());
    const c = payload.Filing.Commodities[0]!;
    expect(c.LicenseCode).toBe("C30");
    expect(c.LicenseNumber).toBeUndefined();
  });

  it("pads HS code shorter than 10 digits with trailing zeros", () => {
    const input = fixtureInput();
    input.operation.lines[0]!.item.hsCode = "841290";
    const payload = buildAesPayload(input);
    expect(payload.Filing.Commodities[0]!.ScheduleBOrHTS).toBe("8412900000");
  });

  it("strips dots/hyphens before padding HS code", () => {
    const input = fixtureInput();
    input.operation.lines[0]!.item.hsCode = "8412.90.0080";
    const payload = buildAesPayload(input);
    expect(payload.Filing.Commodities[0]!.ScheduleBOrHTS).toBe("8412900080");
  });

  it("computes TotalValueUSD as sum of commodity ValueUSD", () => {
    const input = fixtureInput();
    input.operation.lines.push({
      id: "line_2",
      quantity: 2,
      unitValue: 1500,
      unitCurrency: "USD",
      item: { name: "Power-conditioning unit", hsCode: "8504408400" },
      appliedLicense: null,
    });
    const payload = buildAesPayload(input);
    // line_1: 4 × 75000 = 300000; line_2: 2 × 1500 = 3000; total = 303000
    expect(payload.Filing.TotalValueUSD).toBe(303000);
  });

  it("CountryOfDestination uses endUseCountry when set", () => {
    const input = fixtureInput();
    input.operation.endUseCountry = "IL";
    input.operation.shipToCountry = "FR";
    const payload = buildAesPayload(input);
    expect(payload.Filing.CountryOfDestination).toBe("IL");
  });

  it("CountryOfDestination falls back to shipToCountry when endUseCountry null", () => {
    const payload = buildAesPayload(fixtureInput());
    expect(payload.Filing.CountryOfDestination).toBe("FR");
  });

  it("clamps shipment reference to 17 characters per AES limit", () => {
    const input = fixtureInput();
    input.operation.reference = "AES-VERY-LONG-OPERATION-REFERENCE-2026-Q1-001";
    const payload = buildAesPayload(input);
    expect(payload.Filing.ShipmentReferenceNumber.length).toBe(17);
    expect(payload.Filing.ShipmentReferenceNumber).toBe("AES-VERY-LONG-OPE");
  });

  it("maps OriginIndicator from item.countryOfOrigin", () => {
    const payload = buildAesPayload(fixtureInput());
    expect(payload.Filing.Commodities[0]!.OriginIndicator).toBe("D");

    const input = fixtureInput();
    input.operation.lines[0]!.item.countryOfOrigin = "DE";
    const payload2 = buildAesPayload(input);
    expect(payload2.Filing.Commodities[0]!.OriginIndicator).toBe("F");
  });

  it("uses endUserName for UltimateConsignee when supplied", () => {
    const input = fixtureInput();
    input.operation.endUserName = "Lockheed Martin Space";
    const payload = buildAesPayload(input);
    expect(payload.Filing.UltimateConsignee.Name).toBe("Lockheed Martin Space");
  });

  it("falls back to counterparty.legalName when endUserName is null", () => {
    const payload = buildAesPayload(fixtureInput());
    expect(payload.Filing.UltimateConsignee.Name).toBe("Eutelsat S.A.");
  });

  it("populates Carrier with name + SCAC/IATA code", () => {
    const payload = buildAesPayload(fixtureInput());
    expect(payload.Filing.Carrier.Name).toBe("Lufthansa Cargo");
    expect(payload.Filing.Carrier.SCACorIATA).toBe("LH");
  });

  it("falls back to placeholder carrier when not supplied", () => {
    const input = fixtureInput();
    input.operation.carrierName = null;
    input.operation.carrierCode = null;
    const payload = buildAesPayload(input);
    expect(payload.Filing.Carrier.Name).toBe("(pending carrier)");
    expect(payload.Filing.Carrier.SCACorIATA).toBe("ZZZZ");
  });
});

// ─── Round-trip ────────────────────────────────────────────────────

describe("Z14b — buildAesPayload → serializeAesXml round-trip", () => {
  it("produces valid XML for the canonical fixture", () => {
    const payload = buildAesPayload(fixtureInput());
    const xml = serializeAesXml(payload);
    expect(xml).toContain(`<?xml version="1.0" encoding="UTF-8"?>`);
    expect(xml).toContain(`<Filing FilingAction="ADD" FilerType="USPPI">`);
    // Reference clamped to 17 chars: "AES-ISAR-2026-Q1-" (trailing dash)
    expect(xml).toContain(
      "<ShipmentReferenceNumber>AES-ISAR-2026-Q1-</ShipmentReferenceNumber>",
    );
    expect(xml).toContain("Caelex US Inc.");
    expect(xml).toContain("Eutelsat S.A.");
    expect(xml).toContain("<ScheduleBOrHTS>8412900080</ScheduleBOrHTS>");
    expect(xml).toContain("<ECCN>9A515.a</ECCN>");
  });

  it("surfaces hazmat/routed booleans as Y/N (AES convention)", () => {
    const input = fixtureInput();
    input.operation.hazardousMaterials = true;
    input.operation.routedExportTransaction = true;
    const payload = buildAesPayload(input);
    const xml = serializeAesXml(payload);
    expect(xml).toContain("<HazardousMaterials>Y</HazardousMaterials>");
    expect(xml).toContain(
      "<RoutedExportTransaction>Y</RoutedExportTransaction>",
    );
  });

  it("emits per-commodity LicenseCode for ITAR / BIS license stack", () => {
    const input = fixtureInput();
    input.operation.lines[0]!.appliedLicense = {
      licenseType: "DDTC_DSP5",
      licenseNumber: "DSP-5-2026-007",
    };
    const payload = buildAesPayload(input);
    const xml = serializeAesXml(payload);
    expect(xml).toContain("<LicenseCode>C36</LicenseCode>");
    expect(xml).toContain("<LicenseNumber>DSP-5-2026-007</LicenseNumber>");
  });
});
