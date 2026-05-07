/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Tests for the trade.gov consolidated CSV parser. Uses synthetic
 * fixtures matching the real format (header row + 27 columns).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import { TradeSanctionsList } from "@prisma/client";
import { parseConsolidatedCsv } from "./trade-gov-consolidated";

// Real trade.gov header (positional reference, never changes in practice)
const HEADER = [
  "source",
  "entity_number",
  "type",
  "programs",
  "name",
  "title",
  "addresses",
  "federal_register_notice",
  "start_date",
  "end_date",
  "standard_order",
  "license_requirement",
  "license_policy",
  "call_sign",
  "vessel_type",
  "gross_tonnage",
  "gross_registered_tonnage",
  "vessel_flag",
  "vessel_owner",
  "remarks",
  "source_list_url",
  "alt_names",
  "citizenships",
  "dates_of_birth",
  "nationalities",
  "places_of_birth",
  "ids",
].join(",");

/** Build a CSV row matching the real consolidated format. */
function row(overrides: Partial<Record<string, string>>): string {
  const base: Record<string, string> = {
    source: "",
    entity_number: "",
    type: "",
    programs: "",
    name: "",
    title: "",
    addresses: "",
    federal_register_notice: "",
    start_date: "",
    end_date: "",
    standard_order: "",
    license_requirement: "",
    license_policy: "",
    call_sign: "",
    vessel_type: "",
    gross_tonnage: "",
    gross_registered_tonnage: "",
    vessel_flag: "",
    vessel_owner: "",
    remarks: "",
    source_list_url: "",
    alt_names: "",
    citizenships: "",
    dates_of_birth: "",
    nationalities: "",
    places_of_birth: "",
    ids: "",
    ...overrides,
  };
  return [
    base.source,
    base.entity_number,
    base.type,
    base.programs,
    base.name,
    base.title,
    base.addresses,
    base.federal_register_notice,
    base.start_date,
    base.end_date,
    base.standard_order,
    base.license_requirement,
    base.license_policy,
    base.call_sign,
    base.vessel_type,
    base.gross_tonnage,
    base.gross_registered_tonnage,
    base.vessel_flag,
    base.vessel_owner,
    base.remarks,
    base.source_list_url,
    base.alt_names,
    base.citizenships,
    base.dates_of_birth,
    base.nationalities,
    base.places_of_birth,
    base.ids,
  ]
    .map((v) =>
      v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v,
    )
    .join(",");
}

describe("parseConsolidatedCsv", () => {
  describe("input handling", () => {
    it("returns empty result for empty input", () => {
      const result = parseConsolidatedCsv("");
      expect(result.byList.size).toBe(0);
      expect(result.totalRows).toBe(0);
    });

    it("returns empty result for non-string input", () => {
      // @ts-expect-error — defensive null check
      const result = parseConsolidatedCsv(null);
      expect(result.byList.size).toBe(0);
    });

    it("returns empty result for header-only CSV", () => {
      const result = parseConsolidatedCsv(HEADER);
      expect(result.byList.size).toBe(0);
      expect(result.totalRows).toBe(0);
    });

    it("throws if required columns are missing", () => {
      const malformedHeader = "source,name"; // missing entity_number
      const csv = `${malformedHeader}\nOFAC,smith`;
      expect(() => parseConsolidatedCsv(csv)).toThrow(
        /required columns missing/i,
      );
    });
  });

  describe("source mapping", () => {
    it("maps OFAC SDN entries to OFAC_SDN bucket", () => {
      const csv = [
        HEADER,
        row({
          source: "Specially Designated Nationals (SDN) - Treasury Department",
          entity_number: "12345",
          type: "Individual",
          name: "John Smith",
          programs: "SDGT",
        }),
      ].join("\n");
      const result = parseConsolidatedCsv(csv);
      const ofac = result.byList.get(TradeSanctionsList.OFAC_SDN);
      expect(ofac).toHaveLength(1);
      expect(ofac![0].entryId).toBe("12345");
      expect(ofac![0].names).toEqual(["john smith"]);
    });

    it("maps BIS Entity List entries to BIS_ENTITY bucket", () => {
      const csv = [
        HEADER,
        row({
          source: "Entity List (EL) - Bureau of Industry and Security",
          entity_number: "ENT-001",
          type: "Entity",
          name: "Huawei Technologies Co., Ltd.",
        }),
      ].join("\n");
      const result = parseConsolidatedCsv(csv);
      const bis = result.byList.get(TradeSanctionsList.BIS_ENTITY);
      expect(bis).toHaveLength(1);
      expect(bis![0].entryId).toBe("ENT-001");
      // Name canonicalized — "Ltd" stripped, standalone "Co" retained
      // (matches canonicalizeName documented behavior: only "Co. Ltd"
      // combined is stripped, fuzzy match handles the rest)
      expect(bis![0].names[0]).toBe("huawei technologies co");
    });

    it("maps DDTC Debarred entries to DDTC_DEBARRED bucket", () => {
      const csv = [
        HEADER,
        row({
          source: "ITAR Debarred (DTC) - Bureau of Political Military Affairs",
          entity_number: "DTC-123",
          type: "Individual",
          name: "Acme Defense Corp",
        }),
      ].join("\n");
      const result = parseConsolidatedCsv(csv);
      const ddtc = result.byList.get(TradeSanctionsList.DDTC_DEBARRED);
      expect(ddtc).toHaveLength(1);
    });

    it("counts unmapped sources without dropping them silently", () => {
      const csv = [
        HEADER,
        row({
          source: "Unknown Future Source - Dept of Mystery",
          entity_number: "X1",
          name: "Mystery Entity",
        }),
        row({
          source: "Specially Designated Nationals (SDN) - Treasury Department",
          entity_number: "Y1",
          name: "Known Entity",
        }),
      ].join("\n");
      const result = parseConsolidatedCsv(csv);
      expect(result.byList.get(TradeSanctionsList.OFAC_SDN)).toHaveLength(1);
      expect(
        result.unmappedSources.get("Unknown Future Source - Dept of Mystery"),
      ).toBe(1);
    });
  });

  describe("alt_names handling", () => {
    it("includes primary name + AKAs in canonical form", () => {
      const csv = [
        HEADER,
        row({
          source: "Specially Designated Nationals (SDN) - Treasury Department",
          entity_number: "1",
          type: "Individual",
          name: "Smith, John",
          alt_names: "Smith, Jonathan; Smith, J.; J Smith",
        }),
      ].join("\n");
      const result = parseConsolidatedCsv(csv);
      const ofac = result.byList.get(TradeSanctionsList.OFAC_SDN)!;
      expect(ofac[0].names.length).toBeGreaterThan(1);
      // All names should be canonicalized
      expect(ofac[0].names[0]).toBe("smith john"); // primary
      expect(ofac[0].names).toContain("smith jonathan");
      expect(ofac[0].names).toContain("j smith");
    });

    it("dedupes identical canonicalized names", () => {
      const csv = [
        HEADER,
        row({
          source: "Specially Designated Nationals (SDN) - Treasury Department",
          entity_number: "1",
          name: "Smith John",
          // Both alt_names canonicalize to "smith john"
          alt_names: "Smith, John; SMITH JOHN",
        }),
      ].join("\n");
      const result = parseConsolidatedCsv(csv);
      const ofac = result.byList.get(TradeSanctionsList.OFAC_SDN)!;
      expect(ofac[0].names).toEqual(["smith john"]);
    });
  });

  describe("programs handling", () => {
    it("splits semicolon-separated programs", () => {
      const csv = [
        HEADER,
        row({
          source: "Specially Designated Nationals (SDN) - Treasury Department",
          entity_number: "1",
          name: "BadEntity",
          programs: "SDGT; IRAN-EO13599; CYBER2",
        }),
      ].join("\n");
      const result = parseConsolidatedCsv(csv);
      const entry = result.byList.get(TradeSanctionsList.OFAC_SDN)![0];
      expect(entry.listMetadata.programs).toEqual([
        "SDGT",
        "IRAN-EO13599",
        "CYBER2",
      ]);
    });

    it("handles -0- legacy null sentinel as empty programs", () => {
      const csv = [
        HEADER,
        row({
          source: "Specially Designated Nationals (SDN) - Treasury Department",
          entity_number: "1",
          name: "Entity X",
          programs: "-0-",
        }),
      ].join("\n");
      const result = parseConsolidatedCsv(csv);
      const entry = result.byList.get(TradeSanctionsList.OFAC_SDN)![0];
      expect(entry.listMetadata.programs).toEqual([]);
    });
  });

  describe("identifier extraction", () => {
    it("normalizes identifier types to stable enum values", () => {
      const csv = [
        HEADER,
        row({
          source: "Specially Designated Nationals (SDN) - Treasury Department",
          entity_number: "1",
          name: "John Smith",
          ids: "Passport|AB123456|||US; National ID|987654|||US",
        }),
      ].join("\n");
      const result = parseConsolidatedCsv(csv);
      const entry = result.byList.get(TradeSanctionsList.OFAC_SDN)![0];
      expect(entry.identifiers).toContainEqual({
        type: "passport",
        value: "AB123456",
        issuingCountry: "US",
      });
      expect(entry.identifiers).toContainEqual({
        type: "national_id",
        value: "987654",
        issuingCountry: "US",
      });
    });

    it("falls back to 'other' for unknown id types", () => {
      const csv = [
        HEADER,
        row({
          source: "Specially Designated Nationals (SDN) - Treasury Department",
          entity_number: "1",
          name: "Entity",
          ids: "Mystery Id Type|XYZ",
        }),
      ].join("\n");
      const result = parseConsolidatedCsv(csv);
      const entry = result.byList.get(TradeSanctionsList.OFAC_SDN)![0];
      expect(entry.identifiers[0].type).toBe("other");
    });
  });

  describe("multi-list end-to-end", () => {
    it("produces three separate buckets from one mixed CSV", () => {
      const csv = [
        HEADER,
        row({
          source: "Specially Designated Nationals (SDN) - Treasury Department",
          entity_number: "OFAC-1",
          name: "Sanctioned Person",
        }),
        row({
          source: "Entity List (EL) - Bureau of Industry and Security",
          entity_number: "BIS-1",
          name: "Restricted Entity",
        }),
        row({
          source: "ITAR Debarred (DTC) - Bureau of Political Military Affairs",
          entity_number: "DTC-1",
          name: "Debarred Defense Co",
        }),
        // Same individual on two lists — should appear in both
        row({
          source: "Specially Designated Nationals (SDN) - Treasury Department",
          entity_number: "OFAC-2",
          name: "Crossover Person",
        }),
        row({
          source: "Entity List (EL) - Bureau of Industry and Security",
          entity_number: "BIS-2",
          name: "Crossover Person", // same name, different list
        }),
      ].join("\n");
      const result = parseConsolidatedCsv(csv);
      expect(result.byList.size).toBe(3);
      expect(result.byList.get(TradeSanctionsList.OFAC_SDN)).toHaveLength(2);
      expect(result.byList.get(TradeSanctionsList.BIS_ENTITY)).toHaveLength(2);
      expect(result.byList.get(TradeSanctionsList.DDTC_DEBARRED)).toHaveLength(
        1,
      );
      expect(result.totalRows).toBe(5);
    });
  });

  describe("edge cases", () => {
    it("skips rows missing entity_number", () => {
      const csv = [
        HEADER,
        row({
          source: "Specially Designated Nationals (SDN) - Treasury Department",
          entity_number: "",
          name: "No ID",
        }),
        row({
          source: "Specially Designated Nationals (SDN) - Treasury Department",
          entity_number: "1",
          name: "Has ID",
        }),
      ].join("\n");
      const result = parseConsolidatedCsv(csv);
      expect(result.byList.get(TradeSanctionsList.OFAC_SDN)).toHaveLength(1);
    });

    it("skips rows missing name", () => {
      const csv = [
        HEADER,
        row({
          source: "Specially Designated Nationals (SDN) - Treasury Department",
          entity_number: "1",
          name: "",
        }),
      ].join("\n");
      const result = parseConsolidatedCsv(csv);
      expect(result.byList.get(TradeSanctionsList.OFAC_SDN) ?? []).toHaveLength(
        0,
      );
    });

    it("preserves names with embedded commas via CSV quoting", () => {
      const csv = [
        HEADER,
        row({
          source: "Specially Designated Nationals (SDN) - Treasury Department",
          entity_number: "1",
          name: "Smith, John A.",
        }),
      ].join("\n");
      const result = parseConsolidatedCsv(csv);
      const entry = result.byList.get(TradeSanctionsList.OFAC_SDN)![0];
      expect(entry.names[0]).toBe("smith john a");
    });
  });
});
