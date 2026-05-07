/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * EU FSF (Financial Sanctions File) parser.
 *
 * Source: EuropeAid / EU Financial Sanctions Database
 * URL:    https://webgate.ec.europa.eu/europeaid/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content?token=dG9rZW4tMjAxNw
 *         (the token is part of the public URL — EU's "everyone has access"
 *         flow; not authenticated, not paid)
 * Format: XML, ~5-10 MB, updated weekly by the Commission.
 *
 * Format excerpt:
 *   <export>
 *     <sanctionEntity euReferenceNumber="EU.123" designationDate="2022-02-25">
 *       <subjectType code="E"/>
 *       <nameAlias firstName="" lastName="" wholeName="ROSNEFT OAO"
 *                  regulationLanguage="EN"/>
 *       <nameAlias firstName="" lastName="" wholeName="OAO ROSNEFT"
 *                  regulationLanguage="EN"/>
 *       <address city="Moscow" countryCode="RU" countryDescription="Russia"/>
 *       <identification identificationTypeCode="OTH" number="123456789"/>
 *       ...
 *     </sanctionEntity>
 *     <sanctionEntity ...>
 *     </sanctionEntity>
 *   </export>
 *
 * Implementation strategy:
 *   - Hand-written minimal XML extractor. EU FSF schema is well-known
 *     and stable; we don't need a general-purpose XML library.
 *   - Find each <sanctionEntity>...</sanctionEntity> block.
 *   - Within each block, extract the attributes/sub-elements we need
 *     using compact regex patterns.
 *   - This keeps the parser dependency-free (no fast-xml-parser, no
 *     jsdom DOM construction) and matches the pure-function pattern
 *     used by ofac-sdn.ts and trade-gov-consolidated.ts.
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
  "https://webgate.ec.europa.eu/europeaid/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content?token=dG9rZW4tMjAxNw";

// ─── Regex patterns ─────────────────────────────────────────────────

/** Find each <sanctionEntity ...>...</sanctionEntity> block. */
const ENTITY_BLOCK_RE = /<sanctionEntity\b[^>]*>([\s\S]*?)<\/sanctionEntity>/g;

/** Extract attributes from the <sanctionEntity> opening tag. */
const ENTITY_ATTR_RE = /<sanctionEntity\b([^>]*)>/;

/** Extract one attribute value: name="value" or name='value' */
function extractAttr(tagAttrs: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*"([^"]*)"`);
  const m = tagAttrs.match(re);
  if (m) return decodeXmlEntities(m[1]);
  const re2 = new RegExp(`${name}\\s*=\\s*'([^']*)'`);
  const m2 = tagAttrs.match(re2);
  return m2 ? decodeXmlEntities(m2[1]) : null;
}

/**
 * Find every self-closing or opening tag of a given name within a block.
 *
 * Earlier draft used `[^/>]*` which broke when an attribute value
 * contained a literal "/" (e.g. publicationDate="2014-07-31" or
 * regulation number "833/2014" — the / inside the attribute looked
 * like the self-closing slash). The non-greedy `[^>]*?` form stops at
 * the first un-quoted `>` and returns everything before it. Trailing
 * `/` (if self-closing) is harmless — extractAttr only matches
 * `name="value"` pairs.
 */
function findTags(block: string, tagName: string): string[] {
  const re = new RegExp(`<${tagName}\\b([^>]*?)/?>`, "g");
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    matches.push(m[1]);
  }
  return matches;
}

/** Decode the small set of XML entities we encounter. */
function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

// ─── Parser ─────────────────────────────────────────────────────────

/**
 * Parse one <sanctionEntity> block into a CanonicalSanctionsEntry.
 * Returns null if the block is malformed or has no usable name.
 */
function parseEntity(block: string): CanonicalSanctionsEntry | null {
  const headerMatch = block.match(ENTITY_ATTR_RE);
  if (!headerMatch) return null;
  const headerAttrs = headerMatch[1];

  // entryId — prefer euReferenceNumber, fall back to logicalId
  let entryId =
    extractAttr(headerAttrs, "euReferenceNumber") ??
    extractAttr(headerAttrs, "logicalId");
  // Some entries use only a numeric `id` attribute
  if (!entryId) entryId = extractAttr(headerAttrs, "id");
  if (!entryId) return null;

  const designationDate = extractAttr(headerAttrs, "designationDate");

  // ── Subject type (P = person, E = entity) ──
  const subjectTypeTags = findTags(block, "subjectType");
  const subjectType = subjectTypeTags.length
    ? (extractAttr(subjectTypeTags[0], "code") ?? "unknown")
    : "unknown";

  // ── Names ──
  // EU FSF puts names in <nameAlias> elements with wholeName attribute.
  // Multiple aliases per entity (regulation language variants).
  const nameTags = findTags(block, "nameAlias");
  const rawNames: string[] = [];
  for (const tagAttrs of nameTags) {
    const wholeName = extractAttr(tagAttrs, "wholeName");
    if (wholeName && wholeName.trim()) {
      rawNames.push(wholeName.trim());
      continue;
    }
    // Fallback: combine firstName + lastName
    const firstName = extractAttr(tagAttrs, "firstName") ?? "";
    const lastName = extractAttr(tagAttrs, "lastName") ?? "";
    const combined = `${firstName} ${lastName}`.trim();
    if (combined) rawNames.push(combined);
  }
  const names = Array.from(
    new Set(rawNames.map((n) => canonicalizeName(n)).filter(Boolean)),
  );
  if (names.length === 0) return null;

  // ── Addresses ──
  const addressTags = findTags(block, "address");
  const addresses: SanctionsAddress[] = [];
  for (const tagAttrs of addressTags) {
    const country = extractAttr(tagAttrs, "countryCode") ?? "XX";
    const lines: string[] = [];
    for (const k of ["street", "poBox", "zipCode", "city", "region"]) {
      const v = extractAttr(tagAttrs, k);
      if (v) lines.push(v);
    }
    addresses.push({
      country: country.length === 2 ? country.toUpperCase() : "XX",
      lines,
    });
  }

  // ── Identifications (passport / national ID / etc) ──
  const idTags = findTags(block, "identification");
  const identifiers: SanctionsIdentifier[] = [];
  for (const tagAttrs of idTags) {
    const number = extractAttr(tagAttrs, "number");
    if (!number) continue;
    const rawType =
      extractAttr(tagAttrs, "identificationTypeCode") ??
      extractAttr(tagAttrs, "identificationTypeDescription") ??
      "OTHER";
    const issuedBy = extractAttr(tagAttrs, "issuedBy");
    identifiers.push({
      type: normalizeIdType(rawType),
      value: number,
      ...(issuedBy && issuedBy.length === 2
        ? { issuingCountry: issuedBy.toUpperCase() }
        : {}),
    });
  }

  // ── Programmes / Regulation references (EU equivalent of OFAC programs) ──
  const regulationTags = findTags(block, "regulation");
  const regulations: string[] = [];
  for (const tagAttrs of regulationTags) {
    const ref =
      extractAttr(tagAttrs, "publicationDateOfRegulation") ??
      extractAttr(tagAttrs, "regulationType");
    const num = extractAttr(tagAttrs, "numberTitle");
    if (num) regulations.push(num);
    else if (ref) regulations.push(ref);
  }

  // ── Remarks ──
  const remarksMatch = block.match(/<remark>([\s\S]*?)<\/remark>/i);
  const remarks = remarksMatch
    ? decodeXmlEntities(remarksMatch[1].trim())
    : null;

  return {
    entryId,
    names,
    addresses,
    identifiers,
    listMetadata: {
      sdnType:
        subjectType === "E"
          ? "entity"
          : subjectType === "P"
            ? "individual"
            : subjectType,
      programs: regulations,
      ...(designationDate ? { designationDate } : {}),
      ...(remarks ? { remarks } : {}),
    },
  };
}

/**
 * Normalize EU FSF identification type codes. The schema uses 3-4
 * letter codes (PASSPORT, NATIONAL_ID, OTHER, etc.) which we map to
 * our stable enum values.
 */
function normalizeIdType(raw: string): string {
  const t = raw.toLowerCase();
  if (t.includes("passport") || t === "pass") return "passport";
  if (t.includes("national") || t === "nat" || t === "id_card")
    return "national_id";
  if (t.includes("vat")) return "vat";
  if (t.includes("lei")) return "lei";
  if (t.includes("duns")) return "duns";
  if (t.includes("imo")) return "imo";
  if (t.includes("swift") || t.includes("bic")) return "swift_bic";
  if (t.includes("tax")) return "tax_id";
  if (t.includes("registration") || t.includes("regist"))
    return "registration_number";
  return "other";
}

/**
 * Parse an EU FSF XML payload into canonical sanctions entries.
 *
 * Strategy: regex-find every <sanctionEntity> block, parse each
 * independently. One bad block doesn't poison the rest. Empty/null
 * input returns []; deeply-malformed XML throws (cron retries).
 */
export function parseEuFsf(raw: string): CanonicalSanctionsEntry[] {
  if (!raw || typeof raw !== "string") return [];

  // Fast-fail check: if the document doesn't even mention sanctionEntity,
  // it's not the FSF format we expect — likely an HTML error page.
  if (!raw.includes("<sanctionEntity")) {
    return [];
  }

  const entries: CanonicalSanctionsEntry[] = [];
  let m: RegExpExecArray | null;
  // Reset regex state in case it's been used elsewhere
  ENTITY_BLOCK_RE.lastIndex = 0;
  while ((m = ENTITY_BLOCK_RE.exec(raw)) !== null) {
    const entry = parseEntity(m[0]);
    if (entry) entries.push(entry);
  }

  return entries;
}

export const euFsfParser: SanctionsSourceParser = {
  list: TradeSanctionsList.EU_FSF,
  defaultSourceUrl: DEFAULT_URL,
  parse: parseEuFsf,
};
