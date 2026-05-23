/**
 * Tests for OpenSanctions FtM parser (Sprint Z9a).
 *
 * Synthetic fixtures only — no network calls to data.opensanctions.org.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  parseOpenSanctions,
  parseFtmEntity,
  extractOpenSanctionsVersion,
  openSanctionsParser,
} from "./opensanctions";

// ─── Fixture helpers ────────────────────────────────────────────────

/**
 * Realistic sanctioned-entity FtM record. Models a Russian aerospace
 * company that appears on OFAC SDN, EU FSF, and UK Sanctions List —
 * a common multi-source designation pattern.
 */
const SANCTIONED_COMPANY = {
  id: "ru-aero-12345",
  caption: "Sanktionierte Luftfahrt AG",
  schema: "Company",
  target: true,
  properties: {
    name: ["Sanktionierte Luftfahrt AG", "Sanctioned Aerospace JSC"],
    alias: ["RusAero"],
    weakAlias: ["RA"],
    topics: ["sanction", "export.control"],
    country: ["ru"],
    leiCode: ["549300DEADBEEF000000"],
    taxNumber: ["7711223344"],
    ogrnCode: ["1027700000000"],
    address: ["Moscow, Russia"],
    addressEntity: [
      {
        country: "ru",
        street: "ul. Krasnaya 12",
        city: "Moscow",
        region: "Moskva",
        postalCode: "101000",
      },
    ],
    sanctions: [
      {
        authority: "US Treasury OFAC",
        program: "RUSSIA-EO14024",
      },
      {
        authority: "EU Council",
        program: "EU 833/2014",
      },
    ],
  },
  datasets: ["us_ofac_sdn", "eu_fsf", "uk_sanctions_list"],
  referents: ["us-ofac-12345", "eu-eu-fsf-67890"],
  first_seen: "2024-04-12T00:00:00",
  last_seen: "2026-05-22T00:00:00",
  last_change: "2026-05-22T00:00:00",
};

const SANCTIONED_PERSON = {
  id: "pep-pol-001",
  caption: "Ivan Ivanovich Sanctioned",
  schema: "Person",
  target: true,
  properties: {
    name: ["Ivan Ivanovich Sanctioned"],
    alias: ["I. I. Sanctioned"],
    topics: ["sanction", "role.pep"],
    nationality: ["ru"],
    passportNumber: ["P-1234567"],
    idNumber: ["NID-987654"],
  },
  datasets: ["us_ofac_sdn"],
  referents: ["us-ofac-99999"],
};

const PEP_ONLY = {
  id: "pep-only-1",
  caption: "Just A PEP",
  schema: "Person",
  target: false,
  properties: {
    name: ["Just A PEP"],
    topics: ["role.pep"],
  },
  datasets: ["us_pep"],
};

const RCA_ONLY = {
  id: "rca-only-1",
  caption: "Relative Of PEP",
  schema: "Person",
  target: false,
  properties: {
    name: ["Relative Of PEP"],
    topics: ["role.rca"],
  },
};

const NON_TARGET_VEHICLE = {
  id: "vehicle-1",
  caption: "Some Ship",
  schema: "Vessel",
  properties: {
    name: ["Some Ship"],
    topics: ["sanction"],
  },
};

function ndjson(...records: unknown[]): string {
  return records.map((r) => JSON.stringify(r)).join("\n");
}

function jsonArray(...records: unknown[]): string {
  return JSON.stringify(records);
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("extractOpenSanctionsVersion", () => {
  it("returns undefined for empty input", () => {
    expect(extractOpenSanctionsVersion("")).toBeUndefined();
  });

  it("reads version from a leading Dataset entity", () => {
    const head =
      '{"id":"dataset","schema":"Dataset","properties":{"name":["default"]},"version":"2026-05-22"}\n';
    expect(extractOpenSanctionsVersion(head)).toBe("2026-05-22");
  });

  it("falls back to last_change on the metadata line", () => {
    const head =
      '{"id":"dataset","schema":"Dataset","last_change":"2026-05-22T10:00:00"}\n';
    expect(extractOpenSanctionsVersion(head)).toBe("2026-05-22T10:00:00");
  });

  it("returns undefined when neither field present", () => {
    expect(
      extractOpenSanctionsVersion('{"id":"x","schema":"Person"}\n'),
    ).toBeUndefined();
  });
});

describe("parseFtmEntity", () => {
  it("returns null for missing id", () => {
    expect(parseFtmEntity({ ...SANCTIONED_COMPANY, id: undefined })).toBeNull();
  });

  it("returns null for non-trade-relevant schema (Vessel)", () => {
    expect(parseFtmEntity(NON_TARGET_VEHICLE)).toBeNull();
  });

  it("returns null for PEP-only entries without sanction topic", () => {
    expect(parseFtmEntity(PEP_ONLY)).toBeNull();
  });

  it("returns null for RCA-only entries", () => {
    expect(parseFtmEntity(RCA_ONLY)).toBeNull();
  });

  it("accepts entity with target=true regardless of topic granularity", () => {
    const entry = parseFtmEntity({
      id: "x1",
      caption: "Some Entity",
      schema: "LegalEntity",
      target: true,
      properties: {
        name: ["Some Entity"],
        topics: [], // empty topics but target=true
      },
    });
    expect(entry).not.toBeNull();
    expect(entry?.entryId).toBe("OPENSANCTIONS-x1");
  });

  it("prefixes entryId with OPENSANCTIONS-", () => {
    const entry = parseFtmEntity(SANCTIONED_COMPANY);
    expect(entry?.entryId).toBe("OPENSANCTIONS-ru-aero-12345");
  });

  it("canonicalizes names + dedupes (caption + name + alias)", () => {
    const entry = parseFtmEntity(SANCTIONED_COMPANY);
    expect(entry?.names).toBeDefined();
    // GmbH/AG stripping should yield "sanktionierte luftfahrt"
    expect(entry?.names).toContain("sanktionierte luftfahrt");
    expect(entry?.names).toContain("rusaero");
    // weakAlias should NOT be in the canonical list
    expect(entry?.names).not.toContain("ra");
  });

  it("extracts addressEntity over flat address when both present", () => {
    const entry = parseFtmEntity(SANCTIONED_COMPANY);
    expect(entry?.addresses).toHaveLength(1);
    expect(entry?.addresses[0]).toMatchObject({
      country: "RU",
      lines: expect.arrayContaining(["ul. Krasnaya 12", "Moscow"]),
    });
  });

  it("falls back to flat address when no addressEntity", () => {
    const entity = {
      ...SANCTIONED_COMPANY,
      properties: {
        ...SANCTIONED_COMPANY.properties,
        addressEntity: undefined,
      },
    };
    const entry = parseFtmEntity(entity);
    expect(entry?.addresses).toHaveLength(1);
    expect(entry?.addresses[0]).toMatchObject({
      country: "XX",
      lines: ["Moscow, Russia"],
    });
  });

  it("maps FtM identifier keys to canonical identifier types", () => {
    const entry = parseFtmEntity(SANCTIONED_COMPANY);
    expect(entry?.identifiers).toContainEqual({
      type: "lei",
      value: "549300DEADBEEF000000",
    });
    expect(entry?.identifiers).toContainEqual({
      type: "tax_id",
      value: "7711223344",
    });
    expect(entry?.identifiers).toContainEqual({
      type: "registration_number",
      value: "1027700000000",
    });
  });

  it("extracts passport + national_id for Person schema", () => {
    const entry = parseFtmEntity(SANCTIONED_PERSON);
    expect(entry?.identifiers).toContainEqual({
      type: "passport",
      value: "P-1234567",
    });
    expect(entry?.identifiers).toContainEqual({
      type: "national_id",
      value: "NID-987654",
    });
  });

  it("preserves topics, datasets, referents in listMetadata for provenance", () => {
    const entry = parseFtmEntity(SANCTIONED_COMPANY);
    expect(entry?.listMetadata).toMatchObject({
      topics: ["sanction", "export.control"],
      datasets: ["us_ofac_sdn", "eu_fsf", "uk_sanctions_list"],
      referents: ["us-ofac-12345", "eu-eu-fsf-67890"],
      countries: ["ru"],
    });
  });

  it("extracts sanctions[].program into programs list", () => {
    const entry = parseFtmEntity(SANCTIONED_COMPANY);
    expect(entry?.listMetadata.programs).toContain("RUSSIA-EO14024");
    expect(entry?.listMetadata.programs).toContain("EU 833/2014");
  });

  it("classifies Person schema as subjectType=individual", () => {
    const entry = parseFtmEntity(SANCTIONED_PERSON);
    expect(entry?.listMetadata.subjectType).toBe("individual");
  });

  it("classifies Company/Organization as subjectType=entity", () => {
    const entry = parseFtmEntity(SANCTIONED_COMPANY);
    expect(entry?.listMetadata.subjectType).toBe("entity");
  });

  it("uppercases 2-letter country; XX for non-ISO", () => {
    const entity = {
      id: "test",
      caption: "Test",
      schema: "Company",
      target: true,
      properties: {
        name: ["Test"],
        addressEntity: [
          { country: "de", street: "X" },
          { country: "Germany", street: "Y" },
        ],
      },
    };
    const entry = parseFtmEntity(entity);
    expect(entry?.addresses[0].country).toBe("DE");
    expect(entry?.addresses[1].country).toBe("XX");
  });

  it("accepts terror entries via crime.terror topic", () => {
    const entity = {
      id: "terror-1",
      caption: "Terror Group",
      schema: "Organization",
      properties: {
        name: ["Terror Group"],
        topics: ["crime.terror"],
      },
    };
    const entry = parseFtmEntity(entity);
    expect(entry).not.toBeNull();
    expect(entry?.entryId).toBe("OPENSANCTIONS-terror-1");
  });

  it("accepts debarment entries", () => {
    const entity = {
      id: "deb-1",
      caption: "Debarred Inc",
      schema: "Company",
      properties: {
        name: ["Debarred Inc"],
        topics: ["debarment"],
      },
    };
    const entry = parseFtmEntity(entity);
    expect(entry).not.toBeNull();
  });

  it("returns null when canonical name is empty", () => {
    const entity = {
      id: "empty-name",
      caption: "",
      schema: "Company",
      target: true,
      properties: {
        name: [],
      },
    };
    expect(parseFtmEntity(entity)).toBeNull();
  });
});

describe("parseOpenSanctions", () => {
  it("returns empty array for empty input", () => {
    expect(parseOpenSanctions("")).toEqual([]);
  });

  it("returns empty array for whitespace input", () => {
    expect(parseOpenSanctions("   \n\n  ")).toEqual([]);
  });

  it("parses NDJSON with one entity per line", () => {
    const raw = ndjson(SANCTIONED_COMPANY, SANCTIONED_PERSON);
    const entries = parseOpenSanctions(raw);
    expect(entries).toHaveLength(2);
  });

  it("parses JSON array format", () => {
    const raw = jsonArray(SANCTIONED_COMPANY, SANCTIONED_PERSON);
    const entries = parseOpenSanctions(raw);
    expect(entries).toHaveLength(2);
  });

  it("filters out non-trade-relevant entries during bulk parse", () => {
    const raw = ndjson(
      SANCTIONED_COMPANY,
      PEP_ONLY,
      RCA_ONLY,
      NON_TARGET_VEHICLE,
      SANCTIONED_PERSON,
    );
    const entries = parseOpenSanctions(raw);
    expect(entries).toHaveLength(2);
    const ids = entries.map((e) => e.entryId);
    expect(ids).toContain("OPENSANCTIONS-ru-aero-12345");
    expect(ids).toContain("OPENSANCTIONS-pep-pol-001");
  });

  it("skips malformed NDJSON lines but processes valid ones", () => {
    const raw = `${JSON.stringify(SANCTIONED_COMPANY)}
not-valid-json{{{
${JSON.stringify(SANCTIONED_PERSON)}`;
    const entries = parseOpenSanctions(raw);
    expect(entries).toHaveLength(2);
  });

  it("returns empty array when JSON array is malformed", () => {
    expect(parseOpenSanctions("[ broken json")).toEqual([]);
  });

  it("handles trailing newlines + whitespace in NDJSON", () => {
    const raw = `\n${JSON.stringify(SANCTIONED_COMPANY)}\n\n  \n${JSON.stringify(SANCTIONED_PERSON)}\n`;
    const entries = parseOpenSanctions(raw);
    expect(entries).toHaveLength(2);
  });

  it("auto-detects format by leading character", () => {
    expect(parseOpenSanctions(jsonArray(SANCTIONED_COMPANY))).toHaveLength(1);
    expect(parseOpenSanctions(ndjson(SANCTIONED_COMPANY))).toHaveLength(1);
  });

  it("does not throw on entirely malformed input", () => {
    expect(() => parseOpenSanctions("random garbage")).not.toThrow();
    expect(parseOpenSanctions("random garbage")).toEqual([]);
  });

  it("preserves canonical-name de-dup across the full record set", () => {
    const dup = { ...SANCTIONED_COMPANY, id: "dup-1" };
    const entries = parseOpenSanctions(ndjson(SANCTIONED_COMPANY, dup));
    // Two records, same canonical name → still two entries (different IDs).
    // De-dup is on names WITHIN an entry, not across entries.
    expect(entries).toHaveLength(2);
    expect(entries[0].names).toEqual(entries[1].names);
  });

  it("is idempotent — second call produces the same result", () => {
    const raw = ndjson(SANCTIONED_COMPANY, SANCTIONED_PERSON);
    expect(parseOpenSanctions(raw)).toEqual(parseOpenSanctions(raw));
  });
});

describe("openSanctionsParser registration shape", () => {
  it("exposes the OPEN_SANCTIONS list value", () => {
    expect(openSanctionsParser.list).toBe("OPEN_SANCTIONS");
  });

  it("exposes a default URL pointing to data.opensanctions.org", () => {
    expect(openSanctionsParser.defaultSourceUrl).toContain(
      "data.opensanctions.org",
    );
  });

  it("exposes a parse + extractUpstreamVersion function pair", () => {
    expect(typeof openSanctionsParser.parse).toBe("function");
    expect(typeof openSanctionsParser.extractUpstreamVersion).toBe("function");
  });
});
