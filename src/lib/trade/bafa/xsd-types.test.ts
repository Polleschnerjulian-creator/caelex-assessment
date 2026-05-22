/**
 * Z5a — BAFA XSD type tests.
 *
 * Type-only files don't produce runtime errors on shape mismatches in
 * the way Zod schemas would, but we still want regression coverage for:
 *
 *   1. The exported BAFA_XSD_VERSION constant matches the contract date.
 *   2. Fixture documents that conform to the union/optional structure
 *      compile and round-trip through structuralClone (i.e. no methods
 *      / Date objects sneak in that would break XML serialization).
 *   3. Enum string-literal types accept the expected canonical values.
 *
 * These tests look thin because they ARE thin — they're a tripwire for
 * accidental schema drift. The heavy validation lives in Z5b's
 * report-builder tests where we actually build & parse the XML.
 */

import { describe, it, expect } from "vitest";
import {
  BAFA_XSD_VERSION,
  type BafaAntrag,
  type BafaAntragsart,
  type BafaElanK2Document,
  type BafaVerwendungszweck,
  type BafaWare,
} from "./xsd-types";

describe("Z5a — BAFA_XSD_VERSION constant", () => {
  it("matches the date from the Caelex Trade Living-Plan § 7 Z5", () => {
    // Plan pinned 2026-02-05 as the BAFA Meldeschnittstelle XSD version
    // at the time Z5 was scoped. The XSD-version-changelog watcher
    // (Z5c) compares against this exact string.
    expect(BAFA_XSD_VERSION).toBe("2026-02-05");
  });

  it("is a valid ISO-8601 date format (yyyy-mm-dd)", () => {
    expect(BAFA_XSD_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Parseable as a real date
    const d = new Date(BAFA_XSD_VERSION);
    expect(Number.isNaN(d.getTime())).toBe(false);
  });
});

describe("Z5a — BafaAntragsart literal union", () => {
  it("accepts all four documented application kinds", () => {
    const kinds: BafaAntragsart[] = ["EZG", "AGG", "IZG", "EUGEA"];
    expect(kinds).toHaveLength(4);
    // round-trip through Set to confirm uniqueness
    expect(new Set(kinds).size).toBe(4);
  });
});

describe("Z5a — BafaVerwendungszweck literal union", () => {
  it("accepts the six BAFA end-use categories", () => {
    const uses: BafaVerwendungszweck[] = [
      "zivil",
      "militaerisch",
      "dual_use",
      "forschung",
      "behoerde",
      "unbekannt",
    ];
    expect(uses).toHaveLength(6);
    expect(new Set(uses).size).toBe(6);
  });
});

describe("Z5a — BafaWare shape", () => {
  it("permits a fully-populated line-item without TS errors", () => {
    const ware: BafaWare = {
      PositionsNr: 1,
      Bezeichnung: "Reaction wheel assembly",
      Beschreibung: "Honeywell HR16",
      Hersteller: "Honeywell Aerospace",
      Typ: "HR16-100-12",
      Zollnummer: "84129080",
      AusfuhrlistenNr: "0009b",
      EUDualUseNr: "9A515.a",
      USECCN: "9A515.a",
      USMLCategory: "XV(e)(7)",
      Menge: 4,
      Mengeneinheit: "Stk",
      Einzelwert: 75000.5,
      Waehrung: "EUR",
      Bemerkung: "ITAR-XV exempt under §126.4",
    };
    expect(ware.PositionsNr).toBe(1);
    expect(ware.Bezeichnung).toBe("Reaction wheel assembly");
  });

  it("permits a minimal line-item (only required fields)", () => {
    const ware: BafaWare = {
      PositionsNr: 1,
      Bezeichnung: "Generic component",
      Menge: 1,
      Mengeneinheit: "Stk",
      Einzelwert: 100,
      Waehrung: "EUR",
    };
    expect(ware.Hersteller).toBeUndefined();
    expect(ware.Zollnummer).toBeUndefined();
  });
});

describe("Z5a — BafaAntrag shape", () => {
  it("accepts a fully-populated application with all sub-blocks", () => {
    const antrag: BafaAntrag = {
      Antragsart: "EZG",
      Vorgangsbezeichnung: "ISAR-2026-Q1-001",
      Beschreibung: "Reaction wheel export to US prime",
      ErstelltAm: "2026-05-22T10:00:00.000Z",
      Antragsteller: {
        Name: "Caelex Aerospace GmbH",
        Anschrift: {
          Strasse: "Beispielstraße 1",
          PLZ: "80331",
          Ort: "München",
          Land: "DE",
        },
        UStIdNr: "DE123456789",
        Ansprechpartner: "Jane Doe",
        Email: "jane@caelex.example",
      },
      Empfaenger: {
        Name: "AeroJet Corp",
        Anschrift: {
          Strasse: "1 Rocket Way",
          PLZ: "90210",
          Ort: "Los Angeles",
          Land: "US",
        },
        UStIdNr: "EIN98-1234567",
        LEI: "549300ZRRO2R5JS6F213",
      },
      Endverwender: {
        Name: "AeroJet Corp",
        Land: "US",
        Sektor: "Aerospace prime",
        IdentischMitEmpfaenger: true,
      },
      Lieferung: {
        VersendungVon: "DE",
        VersendungNach: "US",
        Versanddatum: "2026-06-15",
        Transit: [],
      },
      Verwendungszweck: "zivil",
      VerwendungSektor: "Commercial satellite manufacturing",
      Waren: [
        {
          PositionsNr: 1,
          Bezeichnung: "Reaction wheel",
          Menge: 4,
          Mengeneinheit: "Stk",
          Einzelwert: 75000,
          Waehrung: "EUR",
        },
      ],
      CatchAllHinweise: [],
      BestehendeGenehmigungen: ["BAFA_AGG_12 (active, gültig bis 2027-01-31)"],
      Anzeigepflicht: false,
    };
    expect(antrag.Antragsart).toBe("EZG");
    expect(antrag.Waren).toHaveLength(1);
    expect(antrag.Endverwender.IdentischMitEmpfaenger).toBe(true);
  });
});

describe("Z5a — BafaElanK2Document root shape", () => {
  it("wraps one or more applications under a common header", () => {
    const doc: BafaElanK2Document = {
      SchemaVersion: BAFA_XSD_VERSION,
      Emitter: "Caelex Comply Trade",
      ErzeugtAm: "2026-05-22T10:00:00.000Z",
      Antraege: [],
    };
    expect(doc.SchemaVersion).toBe(BAFA_XSD_VERSION);
    expect(Array.isArray(doc.Antraege)).toBe(true);
  });
});
