/**
 * Z14a — ATLAS builder tests.
 *
 * Coverage:
 *   1. mapDeclarationType: EXPORT → EXPORT (default)
 *   2. mapDeclarationType: REEXPORT / TRANSIT → REEXPORT
 *   3. mapDeclarationType: INTRA_EU → INTRA_EU_TRANSIT
 *   4. mapDeclarationType: unknown values → EXPORT
 *   5. mapLicenseTypeCode: BAFA_AGG_12 → X003 (Sammelausfuhrgenehmigung)
 *   6. mapLicenseTypeCode: BAFA_EINZEL → X002 (EZG)
 *   7. mapLicenseTypeCode: BAFA_EUGEA → Y901 (EU GEA)
 *   8. mapLicenseTypeCode: BIS_EAR → Y902 (US informational)
 *   9. mapLicenseTypeCode: DDTC_DSP5 → L116 (ITAR)
 *  10. buildAtlasPayload: pins SchemaVersion + Emitter
 *  11. buildAtlasPayload: populates Exporter from input
 *  12. buildAtlasPayload: splits counterparty addressLines into Address fields
 *  13. buildAtlasPayload: per-item appliedLicense overrides operation stack
 *  14. buildAtlasPayload: falls back to all-licenses when appliedLicense=null
 *  15. buildAtlasPayload: DestinationCountry uses endUseCountry when set
 *  16. buildAtlasPayload: DestinationCountry falls back to shipToCountry
 *  17. buildAtlasPayload: empty previousDocuments stays empty
 *  18. buildAtlasPayload: TotalInvoiceAmount = sum of line stat values
 *  19. round-trip: buildAtlasPayload → serializeAtlasXml emits valid XML
 */

import { describe, it, expect } from "vitest";
import {
  buildAtlasPayload,
  mapDeclarationType,
  mapLicenseTypeCode,
  type AtlasBuilderInput,
} from "./atlas-builder";
import { serializeAtlasXml } from "./atlas-serializer";
import { ATLAS_XSD_VERSION } from "./atlas-payload";

// ─── Fixture ──────────────────────────────────────────────────────

function fixtureInput(): AtlasBuilderInput {
  return {
    generatedAt: "2026-05-22T10:00:00.000Z",
    exporter: {
      legalName: "Caelex Aerospace GmbH",
      addressStreet: "Beispielstraße 1",
      addressZip: "80331",
      addressCity: "München",
      addressCountry: "DE",
      eoriNumber: "DE5300000012345",
      vatNumber: "DE123456789",
      contactEmail: "trade@caelex.example",
    },
    operation: {
      id: "op_abc",
      reference: "ATLAS-ISAR-2026-Q1-001",
      description: "Reaction wheel export",
      operationType: "EXPORT",
      shipFromCountry: "DE",
      shipToCountry: "US",
      endUseCountry: null,
      scheduledShipDate: "2026-06-15T00:00:00.000Z",
      createdAt: "2026-05-01T00:00:00.000Z",
      officeOfExportCode: "DE000891",
      officeOfExportName: "Zollamt Frankfurt am Main",
      transportDocType: "N740",
      transportDocReference: "AWB-235-12345678",
      transportModeBorder: "4",
      previousDocuments: [],
      counterparty: {
        legalName: "AeroJet Corp",
        countryCode: "US",
        addressLines: ["1 Rocket Way", "90210 Los Angeles"],
        vatNumber: "EIN98-1234567",
      },
      lines: [
        {
          id: "line_1",
          quantity: 4,
          unitValue: 75000,
          unitCurrency: "EUR",
          item: {
            name: "Reaction wheel HR16",
            description: "Honeywell HR16 momentum wheel, 100 Nms",
            countryOfOrigin: "DE",
            eccnEU: "9A515.a",
            eccnUS: "9A515.a",
            germanAlEntry: "0009b",
            hsCode: "84129080",
            netMassKg: 5.4,
          },
          appliedLicense: null,
        },
      ],
      licenses: [],
    },
  };
}

// ─── mapDeclarationType ────────────────────────────────────────────

describe("Z14a — mapDeclarationType", () => {
  it("maps EXPORT operation type to EXPORT", () => {
    expect(mapDeclarationType("EXPORT")).toBe("EXPORT");
  });

  it("maps REEXPORT and TRANSIT to REEXPORT", () => {
    expect(mapDeclarationType("REEXPORT")).toBe("REEXPORT");
    expect(mapDeclarationType("TRANSIT")).toBe("REEXPORT");
  });

  it("maps INTRA_EU to INTRA_EU_TRANSIT", () => {
    expect(mapDeclarationType("INTRA_EU")).toBe("INTRA_EU_TRANSIT");
  });

  it("falls back to EXPORT for unknown operation types", () => {
    expect(mapDeclarationType("TECH_TRANSFER")).toBe("EXPORT");
    expect(mapDeclarationType("DEEMED_EXPORT")).toBe("EXPORT");
    expect(mapDeclarationType("CLOUD_PROVISION")).toBe("EXPORT");
    expect(mapDeclarationType("MYSTERY_VALUE")).toBe("EXPORT");
  });
});

// ─── mapLicenseTypeCode ────────────────────────────────────────────

describe("Z14a — mapLicenseTypeCode", () => {
  it("maps BAFA AGG variants to X003 (Sammelausfuhrgenehmigung)", () => {
    expect(mapLicenseTypeCode("BAFA_AGG_12")).toBe("X003");
    expect(mapLicenseTypeCode("BAFA_AGG_16")).toBe("X003");
    expect(mapLicenseTypeCode("BAFA_AGG_47")).toBe("X003");
  });

  it("maps BAFA EINZEL to X002 (EZG)", () => {
    expect(mapLicenseTypeCode("BAFA_EINZEL")).toBe("X002");
  });

  it("maps BAFA EUGEA variants to Y901", () => {
    expect(mapLicenseTypeCode("BAFA_EUGEA_EU001")).toBe("Y901");
    expect(mapLicenseTypeCode("BAFA_EUGEA_EU002")).toBe("Y901");
  });

  it("maps BIS_* to Y902 (US informational)", () => {
    expect(mapLicenseTypeCode("BIS_EAR")).toBe("Y902");
    expect(mapLicenseTypeCode("BIS_LICENSE_EXCEPTION_STA")).toBe("Y902");
  });

  it("maps DDTC_* to L116 (ITAR)", () => {
    expect(mapLicenseTypeCode("DDTC_DSP5")).toBe("L116");
    expect(mapLicenseTypeCode("DDTC_TAA")).toBe("L116");
  });

  it("falls back to X002 for unknown license types", () => {
    expect(mapLicenseTypeCode("OTHER")).toBe("X002");
  });
});

// ─── buildAtlasPayload ─────────────────────────────────────────────

describe("Z14a — buildAtlasPayload", () => {
  it("pins SchemaVersion to ATLAS_XSD_VERSION and Emitter to Caelex", () => {
    const payload = buildAtlasPayload(fixtureInput());
    expect(payload.SchemaVersion).toBe(ATLAS_XSD_VERSION);
    expect(payload.Emitter).toBe("Caelex Comply Trade");
  });

  it("populates Exporter from input context", () => {
    const payload = buildAtlasPayload(fixtureInput());
    const e = payload.Declaration.Exporter;
    expect(e.Name).toBe("Caelex Aerospace GmbH");
    expect(e.EORI).toBe("DE5300000012345");
    expect(e.VATNumber).toBe("DE123456789");
    expect(e.Address.City).toBe("München");
    expect(e.Address.PostalCode).toBe("80331");
    expect(e.Address.CountryCode).toBe("DE");
  });

  it("falls back to placeholder EORI when input lacks one", () => {
    const input = fixtureInput();
    input.exporter.eoriNumber = null;
    const payload = buildAtlasPayload(input);
    expect(payload.Declaration.Exporter.EORI).toBe("DE000000000000000");
  });

  it("splits counterparty addressLines into Street/PostalCode/City", () => {
    const payload = buildAtlasPayload(fixtureInput());
    const addr = payload.Declaration.Consignee.Address;
    // Fixture: ["1 Rocket Way", "90210 Los Angeles"]
    expect(addr.Street).toBe("1 Rocket Way");
    expect(addr.PostalCode).toBe("90210");
    expect(addr.City).toBe("Los Angeles");
    expect(addr.CountryCode).toBe("US");
  });

  it("uses appliedLicense for per-item license-reference when set", () => {
    const input = fixtureInput();
    input.operation.lines[0]!.appliedLicense = {
      licenseType: "BAFA_AGG_12",
      licenseNumber: "AGG12-2026-007",
      validUntil: new Date("2027-12-31"),
    };
    input.operation.licenses = [
      {
        licenseType: "BAFA_EINZEL",
        licenseNumber: "DIFFERENT-ONE",
        validUntil: null,
      },
    ];
    const payload = buildAtlasPayload(input);
    const itemLics = payload.Declaration.Items[0]!.Licenses;
    expect(itemLics).toHaveLength(1);
    expect(itemLics[0]!.TypeCode).toBe("X003");
    expect(itemLics[0]!.Reference).toBe("AGG12-2026-007");
    expect(itemLics[0]!.IssuingAuthority).toBe("BAFA");
    expect(itemLics[0]!.ValidUntil).toBe("2027-12-31");
  });

  it("falls back to operation-stack licenses when appliedLicense is null", () => {
    const input = fixtureInput();
    input.operation.licenses = [
      {
        licenseType: "BAFA_EINZEL",
        licenseNumber: "EZG-2026-001",
        validUntil: new Date("2027-06-30"),
      },
    ];
    const payload = buildAtlasPayload(input);
    const itemLics = payload.Declaration.Items[0]!.Licenses;
    expect(itemLics).toHaveLength(1);
    expect(itemLics[0]!.TypeCode).toBe("X002");
    expect(itemLics[0]!.Reference).toBe("EZG-2026-001");
  });

  it("DestinationCountry uses endUseCountry when set", () => {
    const input = fixtureInput();
    input.operation.endUseCountry = "IL";
    input.operation.shipToCountry = "US";
    const payload = buildAtlasPayload(input);
    expect(payload.Declaration.DestinationCountry).toBe("IL");
  });

  it("DestinationCountry falls back to shipToCountry when endUseCountry is null", () => {
    const payload = buildAtlasPayload(fixtureInput());
    expect(payload.Declaration.DestinationCountry).toBe("US");
  });

  it("emits empty PreviousDocuments array for standard EXPORT", () => {
    const payload = buildAtlasPayload(fixtureInput());
    expect(payload.Declaration.PreviousDocuments).toEqual([]);
  });

  it("maps supplied previousDocuments into PreviousDocuments array", () => {
    const input = fixtureInput();
    input.operation.operationType = "REEXPORT";
    input.operation.previousDocuments = [
      { typeCode: "N830", reference: "26DE12345678901234" },
      { typeCode: "N820", reference: "ATA-2026-DE-007" },
    ];
    const payload = buildAtlasPayload(input);
    expect(payload.Declaration.DeclarationType).toBe("REEXPORT");
    expect(payload.Declaration.PreviousDocuments).toHaveLength(2);
    expect(payload.Declaration.PreviousDocuments[0]!.TypeCode).toBe("N830");
    expect(payload.Declaration.PreviousDocuments[1]!.Reference).toBe(
      "ATA-2026-DE-007",
    );
  });

  it("computes TotalInvoiceAmount as sum of line statistical values", () => {
    const input = fixtureInput();
    input.operation.lines.push({
      id: "line_2",
      quantity: 2,
      unitValue: 1500,
      unitCurrency: "EUR",
      item: { name: "Power-conditioning unit", hsCode: "85044084" },
      appliedLicense: null,
    });
    const payload = buildAtlasPayload(input);
    // line_1: 4 × 75000 = 300000; line_2: 2 × 1500 = 3000; total = 303000
    expect(payload.Declaration.TotalInvoiceAmount).toBe(303000);
    expect(payload.Declaration.TotalInvoiceCurrency).toBe("EUR");
  });

  it("populates Item.CNCode from item.hsCode when present", () => {
    const payload = buildAtlasPayload(fixtureInput());
    expect(payload.Declaration.Items[0]!.CNCode).toBe("84129080");
  });

  it("falls back to placeholder CNCode when item.hsCode missing", () => {
    const input = fixtureInput();
    input.operation.lines[0]!.item.hsCode = undefined;
    const payload = buildAtlasPayload(input);
    expect(payload.Declaration.Items[0]!.CNCode).toBe("00000000");
  });
});

// ─── Round-trip ────────────────────────────────────────────────────

describe("Z14a — buildAtlasPayload → serializeAtlasXml round-trip", () => {
  it("produces valid XML for the canonical fixture", () => {
    const payload = buildAtlasPayload(fixtureInput());
    const xml = serializeAtlasXml(payload);
    expect(xml).toContain(`<?xml version="1.0" encoding="UTF-8"?>`);
    expect(xml).toContain(`<Declaration DeclarationType="EXPORT">`);
    expect(xml).toContain("ATLAS-ISAR-2026-Q1-001");
    expect(xml).toContain("Caelex Aerospace GmbH");
    expect(xml).toContain("AeroJet Corp");
    expect(xml).toContain("<CNCode>84129080</CNCode>");
    expect(xml).toContain("<EUDualUseCode>9A515.a</EUDualUseCode>");
  });

  it("emits PreviousDocuments wrapper for a REEXPORT", () => {
    const input = fixtureInput();
    input.operation.operationType = "REEXPORT";
    input.operation.previousDocuments = [
      { typeCode: "N830", reference: "26DE12345678901234" },
    ];
    const payload = buildAtlasPayload(input);
    const xml = serializeAtlasXml(payload);
    expect(xml).toContain(`<Declaration DeclarationType="REEXPORT">`);
    expect(xml).toContain("<PreviousDocuments>");
    expect(xml).toContain("<Reference>26DE12345678901234</Reference>");
  });
});
