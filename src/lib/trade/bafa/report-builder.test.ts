/**
 * Z5b — report-builder tests.
 *
 * Coverage (12 cases):
 *   1.   Antragsart mapping: INTRA_EU → IZG
 *   2.   Antragsart mapping: BAFA_AGG_12 license → AGG
 *   3.   Antragsart mapping: EUGEA license → EUGEA
 *   4.   Antragsart mapping: fallback → EZG
 *   5.   Verwendungszweck: CIVIL → zivil
 *   6.   Verwendungszweck: unknown value → unbekannt
 *   7.   Catch-all hints: all four EU + DE articles produce 4 hints
 *   8.   Catch-all hints: no hits → empty array
 *   9.   IdentischMitEmpfaenger: true when endUserName == null
 *  10.   IdentischMitEmpfaenger: false when endUserName != counterparty name
 *  11.   Round-trip: builder output is consumed by serializer without throwing
 *  12.   Address-line splitter: 3-line address with "<plz> <city>" tail extracts PLZ+Ort
 */

import { describe, it, expect } from "vitest";
import {
  buildBafaReport,
  mapAntragsart,
  mapVerwendungszweck,
} from "./report-builder";
import { serializeBafaXml } from "./xml-serializer";
import { BAFA_XSD_VERSION } from "./xsd-types";
import type { BafaReportInput } from "./report-builder";

// ─── Fixture ──────────────────────────────────────────────────────

function fixtureInput(): BafaReportInput {
  return {
    generatedAt: "2026-05-22T10:00:00.000Z",
    applicant: {
      legalName: "Caelex Aerospace GmbH",
      addressStreet: "Beispielstraße 1",
      addressZip: "80331",
      addressCity: "München",
      addressCountry: "DE",
      vatNumber: "DE123456789",
      contactPerson: "Jane Doe",
      contactEmail: "jane@caelex.example",
    },
    operation: {
      id: "op_abc",
      reference: "ISAR-2026-Q1-001",
      description: "Reaction wheel export",
      operationType: "EXPORT",
      status: "AWAITING_LICENSE",
      shipFromCountry: "DE",
      shipToCountry: "US",
      endUseCountry: null,
      routeStops: [],
      declaredEndUse: "CIVIL",
      endUserName: null,
      endUserSector: "Aerospace prime",
      catchAllArt4Hit: false,
      catchAllArt5Hit: false,
      catchAllArt9Hit: false,
      catchAllArt10Hit: false,
      notificationDuty: false,
      scheduledShipDate: "2026-06-15T00:00:00.000Z",
      createdAt: "2026-05-01T00:00:00.000Z",
      counterparty: {
        legalName: "AeroJet Corp",
        countryCode: "US",
        addressLines: ["1 Rocket Way", "90210 Los Angeles"],
        vatNumber: "EIN98-1234567",
        leiCode: "549300ZRRO2R5JS6F213",
      },
      lines: [
        {
          id: "line_1",
          quantity: 4,
          unitValue: 75000,
          unitCurrency: "EUR",
          item: {
            name: "Reaction wheel HR16",
            manufacturerName: "Honeywell",
            manufacturerPartNo: "HR16-100",
            eccnEU: "9A515.a",
            eccnUS: "9A515.a",
            usmlCategory: "XV(e)(7)",
            germanAlEntry: "0009b",
            hsCode: "84129080",
          },
          appliedLicense: null,
        },
      ],
      licenses: [],
    },
  };
}

// ─── Antragsart mapping ───────────────────────────────────────────

describe("Z5b — mapAntragsart", () => {
  it("maps INTRA_EU operation type to IZG", () => {
    expect(mapAntragsart("INTRA_EU", null)).toBe("IZG");
  });

  it("maps BAFA_AGG_* license to AGG", () => {
    expect(mapAntragsart("EXPORT", "BAFA_AGG_12")).toBe("AGG");
    expect(mapAntragsart("EXPORT", "BAFA_AGG_27")).toBe("AGG");
  });

  it("maps EUGEA / EU_GEA license to EUGEA", () => {
    expect(mapAntragsart("EXPORT", "EU_GEA_001")).toBe("EUGEA");
    expect(mapAntragsart("EXPORT", "EUGEA_005")).toBe("EUGEA");
  });

  it("falls back to EZG for unknown / single-export", () => {
    expect(mapAntragsart("EXPORT", null)).toBe("EZG");
    expect(mapAntragsart("EXPORT", "BAFA_EINZEL")).toBe("EZG");
  });
});

describe("Z5b — mapVerwendungszweck", () => {
  it("maps Caelex CIVIL to zivil", () => {
    expect(mapVerwendungszweck("CIVIL")).toBe("zivil");
  });

  it("maps Caelex DUAL_USE to dual_use", () => {
    expect(mapVerwendungszweck("DUAL_USE")).toBe("dual_use");
  });

  it("maps unknown enum value to unbekannt", () => {
    expect(mapVerwendungszweck("SOMETHING_WEIRD")).toBe("unbekannt");
  });
});

// ─── Builder output ───────────────────────────────────────────────

describe("Z5b — buildBafaReport", () => {
  it("populates Antragsteller from applicant context", () => {
    const doc = buildBafaReport(fixtureInput());
    expect(doc.Antraege).toHaveLength(1);
    const a = doc.Antraege[0]!;
    expect(a.Antragsteller.Name).toBe("Caelex Aerospace GmbH");
    expect(a.Antragsteller.UStIdNr).toBe("DE123456789");
    expect(a.Antragsteller.Anschrift.PLZ).toBe("80331");
  });

  it("sets IdentischMitEmpfaenger=true when operation has no endUserName", () => {
    const doc = buildBafaReport(fixtureInput());
    expect(doc.Antraege[0]!.Endverwender.IdentischMitEmpfaenger).toBe(true);
    // Name falls back to counterparty
    expect(doc.Antraege[0]!.Endverwender.Name).toBe("AeroJet Corp");
  });

  it("sets IdentischMitEmpfaenger=false when endUserName differs from counterparty", () => {
    const input = fixtureInput();
    input.operation.endUserName = "Lockheed Martin (final user)";
    const doc = buildBafaReport(input);
    expect(doc.Antraege[0]!.Endverwender.IdentischMitEmpfaenger).toBe(false);
    expect(doc.Antraege[0]!.Endverwender.Name).toBe(
      "Lockheed Martin (final user)",
    );
  });

  it("populates CatchAllHinweise from each triggered article", () => {
    const input = fixtureInput();
    input.operation.catchAllArt4Hit = true;
    input.operation.catchAllArt5Hit = true;
    input.operation.catchAllArt9Hit = true;
    input.operation.catchAllArt10Hit = true;
    const doc = buildBafaReport(input);
    expect(doc.Antraege[0]!.CatchAllHinweise).toHaveLength(4);
    expect(doc.Antraege[0]!.CatchAllHinweise[0]).toContain(
      "Art. 4 EU 2021/821",
    );
    expect(doc.Antraege[0]!.CatchAllHinweise[2]).toContain("§ 8 AWV");
  });

  it("emits empty CatchAllHinweise array when no catch-alls hit", () => {
    const doc = buildBafaReport(fixtureInput());
    expect(doc.Antraege[0]!.CatchAllHinweise).toEqual([]);
  });

  it("splits counterparty addressLines into Strasse/PLZ/Ort", () => {
    const doc = buildBafaReport(fixtureInput());
    const ans = doc.Antraege[0]!.Empfaenger.Anschrift;
    // Fixture has ["1 Rocket Way", "90210 Los Angeles"] → Strasse=1 Rocket Way, PLZ=90210, Ort=Los Angeles
    expect(ans.Strasse).toBe("1 Rocket Way");
    expect(ans.PLZ).toBe("90210");
    expect(ans.Ort).toBe("Los Angeles");
    expect(ans.Land).toBe("US");
  });

  it("falls back to shipToCountry when endUseCountry is null", () => {
    const doc = buildBafaReport(fixtureInput());
    expect(doc.Antraege[0]!.Endverwender.Land).toBe("US");
  });

  it("derives Antragsart from the first license on the stack", () => {
    const input = fixtureInput();
    input.operation.licenses = [
      {
        licenseType: "BAFA_AGG_12",
        licenseNumber: "AGG-12-001",
        issuedAt: new Date("2025-01-01"),
        validUntil: new Date("2027-12-31"),
        status: "ACTIVE",
      },
    ];
    const doc = buildBafaReport(input);
    expect(doc.Antraege[0]!.Antragsart).toBe("AGG");
    expect(doc.Antraege[0]!.BestehendeGenehmigungen).toHaveLength(1);
    expect(doc.Antraege[0]!.BestehendeGenehmigungen[0]).toContain(
      "BAFA AGG 12",
    );
  });

  it("pins SchemaVersion to BAFA_XSD_VERSION constant", () => {
    const doc = buildBafaReport(fixtureInput());
    expect(doc.SchemaVersion).toBe(BAFA_XSD_VERSION);
  });
});

// ─── Round-trip ───────────────────────────────────────────────────

describe("Z5b — buildBafaReport → serializeBafaXml round-trip", () => {
  it("produces valid XML for the canonical fixture", () => {
    const doc = buildBafaReport(fixtureInput());
    const xml = serializeBafaXml(doc);
    expect(xml).toContain(`<?xml version="1.0" encoding="UTF-8"?>`);
    expect(xml).toContain("<Antrag");
    expect(xml).toContain("ISAR-2026-Q1-001");
    expect(xml).toContain("Caelex Aerospace GmbH");
    expect(xml).toContain("AeroJet Corp");
    expect(xml).toContain("9A515.a");
  });

  it("preserves item PositionsNr attribute on each Ware element", () => {
    const input = fixtureInput();
    input.operation.lines.push({
      id: "line_2",
      quantity: 2,
      unitValue: 1500,
      unitCurrency: "EUR",
      item: { name: "Power-conditioning unit" },
      appliedLicense: null,
    });
    const doc = buildBafaReport(input);
    const xml = serializeBafaXml(doc);
    expect(xml).toContain(`<Ware PositionsNr="1">`);
    expect(xml).toContain(`<Ware PositionsNr="2">`);
  });
});
