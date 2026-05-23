/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * OpenSanctions parser (Sprint Z9a, Tier 5).
 *
 * Source: OpenSanctions.org — free aggregated sanctions / PEP /
 *         criminal-watch dataset published as JSON.
 * URL:    https://data.opensanctions.org/datasets/latest/default/entities.ftm.json
 * Format: NDJSON (newline-delimited JSON) — each line is one FtM
 *         (Follow-the-Money) entity record. ~200 MB uncompressed,
 *         ~20K-50K entities depending on dataset slice. Update cadence:
 *         daily (full dataset) + hourly (delta endpoint).
 * Docs:   https://www.opensanctions.org/docs/api/
 *         https://followthemoney.tech/docs/model/
 *
 * FtM (Follow-the-Money) entity model:
 *   {
 *     "id": "ofac-12345",                  // primary key (NOT stable
 *                                          //   across re-imports — see
 *                                          //   `referents[]` for stable
 *                                          //   source-derived IDs)
 *     "caption": "John Doe",               // display name
 *     "schema": "Person" | "Company" | "Organization" | "LegalEntity",
 *     "properties": {
 *       "name": ["John Doe", "Jonathan Doe"],
 *       "alias": ["Johnny D"],
 *       "weakAlias": ["JD"],
 *       "birthDate": ["1965-04-12"],
 *       "nationality": ["us"],
 *       "country": ["us", "ru"],
 *       "passportNumber": ["P-123456"],
 *       "taxNumber": ["TIN-789"],
 *       "leiCode": ["549300ABCDE1234567XY"],
 *       "address": ["123 Main St, NYC"],
 *       "addressEntity": [{ "country": "us", "street": "...", ... }],
 *       "topics": ["sanction", "pep", "crime", "debarment"],
 *       "sanctions": [{ "authority": "...", "program": "..." }],
 *       "notes": ["..."]
 *     },
 *     "datasets": ["us_ofac_sdn", "eu_fsf", "un_sc_sanctions", ...],
 *     "referents": ["us-ofac-12345", "eu-eu-fsf-67890"],
 *     "first_seen": "2024-01-15T...",
 *     "last_seen": "2026-05-22T...",
 *     "last_change": "2026-05-22T..."
 *   }
 *
 * Topic taxonomy (subset that matters to trade-compliance):
 *   - "sanction"          — direct sanctions designation
 *   - "sanction.linked"   — entity linked to a sanctioned party
 *   - "sanction.counter"  — counter-sanctions (e.g. Russian list of US officials)
 *   - "debarment"         — debarred from public procurement / export
 *   - "export.control"    — export-control-relevant listing
 *   - "asset.frozen"      — frozen-assets order
 *   - "crime"             — criminal-investigation watch list
 *   - "crime.terror"      — terrorism-financing list
 *   - "role.pep"          — Politically Exposed Person
 *   - "role.rca"          — Relatives & Close Associates of PEP
 *   - "wanted"            — Interpol / national wanted lists
 *
 * For trade screening we accept entries whose topics include any of:
 *   sanction, sanction.linked, debarment, export.control, asset.frozen,
 *   crime.terror. PEP-only topics are routed to a separate enhanced-DD
 *   flag rather than blocking — that's a Z9b concern, not Z9a.
 *
 * Implementation note — we accept TWO input formats:
 *   1. NDJSON (one entity per line) — the streaming endpoint
 *   2. JSON array (everything wrapped in []) — the bulk-download endpoint
 *
 * Either way we end up with the same canonical entries.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { TradeSanctionsList } from "@prisma/client";
import {
  type CanonicalSanctionsEntry,
  type SanctionsAddress,
  type SanctionsIdentifier,
  type SanctionsSourceParser,
  canonicalizeName,
} from "./types";

const DEFAULT_URL =
  "https://data.opensanctions.org/datasets/latest/default/entities.ftm.json";

/**
 * FtM entity schemas we care about. Other schemas exist in OpenSanctions
 * (Vehicle, Address, Document, ...) but they're not direct trade-party
 * subjects — they're sub-records linked to a parent entity.
 */
const TRADE_RELEVANT_SCHEMAS = new Set([
  "Person",
  "Company",
  "Organization",
  "LegalEntity",
  "PublicBody",
  "Group",
]);

/**
 * Topics that escalate an entry to "include in canonical screening corpus".
 * Anything outside this set is filtered out — OpenSanctions includes
 * informational lists (e.g. "rca" relatives of PEPs) that we do not want
 * to block trade on.
 */
const TRADE_RELEVANT_TOPICS = new Set([
  "sanction",
  "sanction.linked",
  "sanction.counter",
  "debarment",
  "export.control",
  "asset.frozen",
  "crime.terror",
  "wanted",
]);

/**
 * Minimal shape of an FtM entity as published by OpenSanctions. We
 * intentionally do NOT use Zod here — sanctions data is too messy and
 * non-conforming to fit a strict schema. We hand-roll defensive accessors
 * and skip records whose required fields are missing.
 *
 * Exported for the test fixture loader; not consumed elsewhere.
 */
export interface FtmEntity {
  id?: unknown;
  caption?: unknown;
  schema?: unknown;
  properties?: Record<string, unknown> | unknown;
  datasets?: unknown;
  referents?: unknown;
  first_seen?: unknown;
  last_seen?: unknown;
  last_change?: unknown;
  target?: unknown;
}

// ─── Internal helpers ───────────────────────────────────────────────

/**
 * Read an FtM property as a string array. FtM stores ALL property values
 * as arrays (even single-valued), so we always normalize to string[].
 * Returns [] for missing / non-array / non-string-array properties.
 */
function readStrings(
  properties: Record<string, unknown> | undefined,
  key: string,
): string[] {
  if (!properties) return [];
  const value = properties[key];
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );
}

/**
 * Read FtM `addressEntity` as a structured address. The bulk export
 * sometimes inlines addresses; sometimes it stores them as separate
 * entities (referenced by ID). We handle the inline case here — the
 * separate-entity case requires a 2-pass parse which is out of scope
 * for Z9a (OpenSanctions provides a pre-resolved enrichment endpoint
 * that does the join for us).
 */
function readAddressEntities(
  properties: Record<string, unknown> | undefined,
): SanctionsAddress[] {
  if (!properties) return [];
  const entities = properties["addressEntity"];
  if (!Array.isArray(entities)) return [];

  const addresses: SanctionsAddress[] = [];
  for (const entry of entities) {
    if (!entry || typeof entry !== "object") continue;
    const obj = entry as Record<string, unknown>;
    const country =
      typeof obj["country"] === "string"
        ? (obj["country"] as string).trim()
        : "";
    const street =
      typeof obj["street"] === "string" ? (obj["street"] as string).trim() : "";
    const city =
      typeof obj["city"] === "string" ? (obj["city"] as string).trim() : "";
    const region =
      typeof obj["region"] === "string" ? (obj["region"] as string).trim() : "";
    const postalCode =
      typeof obj["postalCode"] === "string"
        ? (obj["postalCode"] as string).trim()
        : "";

    const lines = [street, city, region, postalCode].filter(Boolean);
    if (lines.length === 0 && !country) continue;

    addresses.push({
      country: country.length === 2 ? country.toUpperCase() : "XX",
      lines,
    });
  }
  return addresses;
}

/**
 * Build addresses from the flat `address` string array (more common in
 * the lite ftm export). We don't try to parse a country out of these —
 * they're free-form one-liners.
 */
function readFlatAddresses(
  properties: Record<string, unknown> | undefined,
): SanctionsAddress[] {
  const raw = readStrings(properties, "address");
  if (raw.length === 0) return [];
  return raw.map((line) => ({
    country: "XX",
    lines: [line],
  }));
}

/**
 * Extract every identifier from FtM properties. FtM uses dedicated keys
 * for the common types (passportNumber, taxNumber, leiCode, ...) so we
 * map each key to its canonical identifier type.
 */
function readIdentifiers(
  properties: Record<string, unknown> | undefined,
): SanctionsIdentifier[] {
  const ids: SanctionsIdentifier[] = [];
  const mappings: Array<[string, string]> = [
    ["passportNumber", "passport"],
    ["idNumber", "national_id"],
    ["taxNumber", "tax_id"],
    ["vatCode", "vat"],
    ["leiCode", "lei"],
    ["dunsCode", "duns"],
    ["registrationNumber", "registration_number"],
    ["imoNumber", "imo"],
    ["swiftBic", "swift_bic"],
    ["ogrnCode", "registration_number"],
    ["innCode", "tax_id"],
  ];
  for (const [ftmKey, canonicalType] of mappings) {
    for (const value of readStrings(properties, ftmKey)) {
      ids.push({ type: canonicalType, value });
    }
  }
  return ids;
}

/**
 * Decide whether an FtM entity qualifies as a trade-relevant sanctions
 * subject. Requires BOTH:
 *   - schema in TRADE_RELEVANT_SCHEMAS
 *   - at least one topic in TRADE_RELEVANT_TOPICS (OR target === true,
 *     which OpenSanctions sets for confirmed designations regardless
 *     of topic granularity)
 */
function isTradeRelevant(entity: FtmEntity): boolean {
  const schema = typeof entity.schema === "string" ? entity.schema : "";
  if (!TRADE_RELEVANT_SCHEMAS.has(schema)) return false;

  // The `target` field on FtM is a boolean that signals "this entity is
  // the subject of a designation" (vs. being a referent/sub-record).
  // We trust this signal even when topics are missing — OpenSanctions
  // sometimes omits topics on records inherited from sources that don't
  // tag them.
  if (entity.target === true) return true;

  const properties = isPropertyMap(entity.properties)
    ? entity.properties
    : undefined;
  const topics = readStrings(properties, "topics");
  for (const t of topics) {
    if (TRADE_RELEVANT_TOPICS.has(t)) return true;
  }
  return false;
}

function isPropertyMap(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Build the canonical name list from FtM properties. Primary is
 * `caption`; supplemented with `name` and `alias` (NOT `weakAlias` —
 * those are noisy partial-matches that would bloat the index).
 */
function buildNameList(entity: FtmEntity): string[] {
  const properties = isPropertyMap(entity.properties)
    ? entity.properties
    : undefined;

  const names: string[] = [];
  const seen = new Set<string>();

  function add(raw: string): void {
    const canonical = canonicalizeName(raw);
    if (!canonical) return;
    if (seen.has(canonical)) return;
    seen.add(canonical);
    names.push(canonical);
  }

  const caption =
    typeof entity.caption === "string" ? entity.caption.trim() : "";
  if (caption) add(caption);

  for (const n of readStrings(properties, "name")) {
    add(n);
  }
  for (const n of readStrings(properties, "alias")) {
    add(n);
  }

  return names;
}

/**
 * Parse one FtM entity into a canonical sanctions entry. Returns null if
 * the entity is not trade-relevant, lacks an ID, or has no valid name.
 */
export function parseFtmEntity(
  entity: FtmEntity,
): CanonicalSanctionsEntry | null {
  const id = typeof entity.id === "string" ? entity.id.trim() : "";
  if (!id) return null;

  if (!isTradeRelevant(entity)) return null;

  const names = buildNameList(entity);
  if (names.length === 0) return null;

  const properties = isPropertyMap(entity.properties)
    ? entity.properties
    : undefined;

  const addressesFromEntity = readAddressEntities(properties);
  const addresses =
    addressesFromEntity.length > 0
      ? addressesFromEntity
      : readFlatAddresses(properties);

  const identifiers = readIdentifiers(properties);

  // Topics + datasets + schemas drive downstream UI ("OpenSanctions
  // says this is on OFAC SDN + EU FSF"). Stored as listMetadata so
  // the screening UI can render provenance chips.
  const topics = readStrings(properties, "topics");
  const datasets = Array.isArray(entity.datasets)
    ? entity.datasets.filter((d): d is string => typeof d === "string")
    : [];
  const referents = Array.isArray(entity.referents)
    ? entity.referents.filter((r): r is string => typeof r === "string")
    : [];
  const programsFromSanctions = readSanctionsPrograms(properties);
  const countries = readStrings(properties, "country");
  const nationalities = readStrings(properties, "nationality");
  const firstSeen =
    typeof entity.first_seen === "string" ? entity.first_seen : undefined;
  const lastSeen =
    typeof entity.last_seen === "string" ? entity.last_seen : undefined;
  const lastChange =
    typeof entity.last_change === "string" ? entity.last_change : undefined;
  const schema =
    typeof entity.schema === "string" ? entity.schema : "LegalEntity";

  return {
    entryId: `OPENSANCTIONS-${id}`,
    names,
    addresses,
    identifiers,
    listMetadata: {
      subjectType: schemaToSubjectType(schema),
      programs: programsFromSanctions,
      topics,
      datasets,
      referents,
      ...(countries.length > 0 ? { countries } : {}),
      ...(nationalities.length > 0 ? { nationalities } : {}),
      ...(firstSeen ? { firstSeen } : {}),
      ...(lastSeen ? { lastSeen } : {}),
      ...(lastChange ? { lastChange } : {}),
    },
  };
}

/**
 * Pull the `authority`/`program` pair from each `sanctions[]` sub-record.
 * These look like:
 *   { "authority": "US Treasury OFAC", "program": "SDGT", ... }
 */
function readSanctionsPrograms(
  properties: Record<string, unknown> | undefined,
): string[] {
  if (!properties) return [];
  const sanctions = properties["sanctions"];
  if (!Array.isArray(sanctions)) return [];

  const programs = new Set<string>();
  for (const s of sanctions) {
    if (!s || typeof s !== "object") continue;
    const obj = s as Record<string, unknown>;
    const program =
      typeof obj["program"] === "string"
        ? (obj["program"] as string).trim()
        : "";
    if (program) programs.add(program);
  }
  return Array.from(programs);
}

function schemaToSubjectType(schema: string): string {
  if (schema === "Person") return "individual";
  return "entity";
}

/**
 * Parse a full OpenSanctions feed. Accepts BOTH:
 *   - NDJSON: one entity per line (separated by \n or \r\n)
 *   - JSON array: `[ {...}, {...}, ... ]`
 *
 * Auto-detects format from the first non-whitespace character. Robust to
 * a trailing empty line in NDJSON and to lines containing pure whitespace.
 *
 * Skips malformed entities silently — the orchestrator already records
 * the snapshot count, so missing rows surface as a count drop on the
 * audit row.
 */
export function parseOpenSanctions(raw: string): CanonicalSanctionsEntry[] {
  if (!raw || typeof raw !== "string") return [];

  const trimmed = raw.trim();
  if (!trimmed) return [];

  const entities: FtmEntity[] = [];

  if (trimmed.startsWith("[")) {
    // JSON array format
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === "object") {
            entities.push(item as FtmEntity);
          }
        }
      }
    } catch {
      // Malformed JSON array — return empty rather than throw so the
      // orchestrator logs zero and moves on.
      return [];
    }
  } else {
    // NDJSON format
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      try {
        const parsed = JSON.parse(t) as unknown;
        if (parsed && typeof parsed === "object") {
          entities.push(parsed as FtmEntity);
        }
      } catch {
        // Skip malformed lines silently.
        continue;
      }
    }
  }

  const entries: CanonicalSanctionsEntry[] = [];
  for (const entity of entities) {
    const entry = parseFtmEntity(entity);
    if (entry) entries.push(entry);
  }

  return entries;
}

/**
 * Extract OpenSanctions' version from a leading metadata record. The
 * OpenSanctions bulk export sometimes prepends a metadata entity with
 * `schema: "Dataset"` carrying a `version` property — when present we
 * use it as the upstreamVersion. Otherwise undefined.
 */
export function extractOpenSanctionsVersion(raw: string): string | undefined {
  if (!raw) return undefined;
  // Read just the first 4 KB to avoid scanning a 200 MB file.
  const head = raw.slice(0, 4096);

  // Look for `"schema": "Dataset"` followed by a version field. We
  // intentionally accept either a quoted string `"version": "..."` or
  // an ISO timestamp value — both happen in the wild.
  const m = head.match(
    /"schema"\s*:\s*"Dataset"[\s\S]{0,500}?"version"\s*:\s*"([^"]+)"/,
  );
  if (m) return m[1];

  // Fallback: the bulk export filenames carry a date; the dataset itself
  // often surfaces a top-level `last_change` on the metadata line.
  const lc = head.match(/"last_change"\s*:\s*"([^"]+)"/);
  return lc?.[1];
}

export const openSanctionsParser: SanctionsSourceParser = {
  list: TradeSanctionsList.OPEN_SANCTIONS,
  defaultSourceUrl: DEFAULT_URL,
  parse: parseOpenSanctions,
  extractUpstreamVersion: extractOpenSanctionsVersion,
};
