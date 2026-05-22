/**
 * UN Security Council Consolidated Sanctions List parser.
 *
 * Source: United Nations Security Council 1267/1989/2253 + 1988 + 1718 +
 *         2231 + … (all UN sanctions regimes consolidated into one XML)
 * URL:    https://scsanctions.un.org/resources/xml/en/consolidated.xml
 * Format: XML, ~3-5 MB, updated daily.
 * Docs:   https://www.un.org/securitycouncil/content/un-sc-consolidated-list
 *
 * XML structure (simplified):
 *   <CONSOLIDATED_LIST dateGenerated="2026-05-22T07:00:00Z">
 *     <INDIVIDUALS>
 *       <INDIVIDUAL>
 *         <DATAID>6908555</DATAID>                  stable across snapshots
 *         <FIRST_NAME>…</FIRST_NAME>
 *         <SECOND_NAME>…</SECOND_NAME>
 *         <THIRD_NAME>…</THIRD_NAME>
 *         <FOURTH_NAME>…</FOURTH_NAME>
 *         <UN_LIST_TYPE>Al-Qaida</UN_LIST_TYPE>     regime
 *         <REFERENCE_NUMBER>QDi.001</REFERENCE_NUMBER>
 *         <LISTED_ON>2001-01-25</LISTED_ON>
 *         <LAST_DAY_UPDATED>…</LAST_DAY_UPDATED>
 *         <NATIONALITY><VALUE>…</VALUE></NATIONALITY>
 *         <INDIVIDUAL_ALIAS>
 *           <QUALITY>Good</QUALITY>
 *           <ALIAS_NAME>…</ALIAS_NAME>
 *         </INDIVIDUAL_ALIAS>
 *         <INDIVIDUAL_ADDRESS>
 *           <STREET>…</STREET>
 *           <CITY>…</CITY>
 *           <STATE_PROVINCE>…</STATE_PROVINCE>
 *           <COUNTRY>…</COUNTRY>
 *           <NOTE>…</NOTE>
 *         </INDIVIDUAL_ADDRESS>
 *         <INDIVIDUAL_DOCUMENT>
 *           <TYPE_OF_DOCUMENT>Passport</TYPE_OF_DOCUMENT>
 *           <NUMBER>…</NUMBER>
 *           <ISSUING_COUNTRY>…</ISSUING_COUNTRY>
 *         </INDIVIDUAL_DOCUMENT>
 *       </INDIVIDUAL>
 *     </INDIVIDUALS>
 *     <ENTITIES>
 *       <ENTITY>
 *         <DATAID>…</DATAID>
 *         <FIRST_NAME>…</FIRST_NAME>            (entity legal name)
 *         <UN_LIST_TYPE>…</UN_LIST_TYPE>
 *         <REFERENCE_NUMBER>QDe.001</REFERENCE_NUMBER>
 *         <ENTITY_ALIAS><ALIAS_NAME>…</ALIAS_NAME></ENTITY_ALIAS>
 *         <ENTITY_ADDRESS>…</ENTITY_ADDRESS>
 *       </ENTITY>
 *     </ENTITIES>
 *   </CONSOLIDATED_LIST>
 *
 * Implementation: hand-written regex-based extractor matching the
 * eu-fsf.ts pattern — keeps the parser dependency-free.
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
  "https://scsanctions.un.org/resources/xml/en/consolidated.xml";

// ─── Regex patterns ─────────────────────────────────────────────────

const INDIVIDUAL_BLOCK_RE = /<INDIVIDUAL>([\s\S]*?)<\/INDIVIDUAL>/g;
const ENTITY_BLOCK_RE = /<ENTITY>([\s\S]*?)<\/ENTITY>/g;

const ALIAS_BLOCK_RE_INDIVIDUAL =
  /<INDIVIDUAL_ALIAS>([\s\S]*?)<\/INDIVIDUAL_ALIAS>/g;
const ALIAS_BLOCK_RE_ENTITY = /<ENTITY_ALIAS>([\s\S]*?)<\/ENTITY_ALIAS>/g;

const ADDRESS_BLOCK_RE_INDIVIDUAL =
  /<INDIVIDUAL_ADDRESS>([\s\S]*?)<\/INDIVIDUAL_ADDRESS>/g;
const ADDRESS_BLOCK_RE_ENTITY = /<ENTITY_ADDRESS>([\s\S]*?)<\/ENTITY_ADDRESS>/g;

const DOCUMENT_BLOCK_RE =
  /<INDIVIDUAL_DOCUMENT>([\s\S]*?)<\/INDIVIDUAL_DOCUMENT>/g;

// ─── Helpers ────────────────────────────────────────────────────────

/** Extract the text content of the first occurrence of `<TAG>…</TAG>`. */
function extractText(block: string, tagName: string): string {
  const re = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`);
  const m = block.match(re);
  if (!m) return "";
  return decodeXmlEntities(m[1].trim());
}

/** Decode the small set of XML entities the UN feed uses. */
function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

function iterMatches(re: RegExp, source: string): string[] {
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    results.push(m[1]);
  }
  return results;
}

// ─── Per-block parsers ──────────────────────────────────────────────

function parseAddresses(block: string, re: RegExp): SanctionsAddress[] {
  const addresses: SanctionsAddress[] = [];
  for (const addrBlock of iterMatches(re, block)) {
    const street = extractText(addrBlock, "STREET");
    const city = extractText(addrBlock, "CITY");
    const stateProvince = extractText(addrBlock, "STATE_PROVINCE");
    const country = extractText(addrBlock, "COUNTRY");
    const note = extractText(addrBlock, "NOTE");
    const lines = [street, city, stateProvince, note].filter(Boolean);
    if (lines.length === 0 && !country) continue;
    addresses.push({
      country: country.length === 2 ? country.toUpperCase() : "XX",
      lines,
    });
  }
  return addresses;
}

function parseAliases(block: string, re: RegExp): string[] {
  const aliases: string[] = [];
  for (const aliasBlock of iterMatches(re, block)) {
    const aliasName = extractText(aliasBlock, "ALIAS_NAME");
    if (!aliasName) continue;
    const canonical = canonicalizeName(aliasName);
    if (canonical) aliases.push(canonical);
  }
  return aliases;
}

function parseIdentifiers(block: string): SanctionsIdentifier[] {
  const ids: SanctionsIdentifier[] = [];
  for (const docBlock of iterMatches(DOCUMENT_BLOCK_RE, block)) {
    const docType = extractText(docBlock, "TYPE_OF_DOCUMENT").toLowerCase();
    const number = extractText(docBlock, "NUMBER");
    const issuingCountry = extractText(docBlock, "ISSUING_COUNTRY");
    if (!number) continue;
    const type = mapDocumentType(docType);
    ids.push({
      type,
      value: number,
      ...(issuingCountry ? { issuingCountry } : {}),
    });
  }
  return ids;
}

/** Map UN's free-text document type strings to our canonical enum values. */
function mapDocumentType(docType: string): string {
  if (docType.includes("passport")) return "passport";
  if (docType.includes("national")) return "national_id";
  if (docType.includes("tax")) return "tax_id";
  if (docType.includes("driv")) return "other"; // driver's licence — bucketed
  return "other";
}

function parseIndividual(block: string): CanonicalSanctionsEntry | null {
  const dataId = extractText(block, "DATAID");
  if (!dataId) return null;

  const first = extractText(block, "FIRST_NAME");
  const second = extractText(block, "SECOND_NAME");
  const third = extractText(block, "THIRD_NAME");
  const fourth = extractText(block, "FOURTH_NAME");
  const fullName = [first, second, third, fourth].filter(Boolean).join(" ");
  if (!fullName) return null;

  const canonicalName = canonicalizeName(fullName);
  if (!canonicalName) return null;

  const aliasCanonicals = parseAliases(block, ALIAS_BLOCK_RE_INDIVIDUAL);
  const names = Array.from(new Set([canonicalName, ...aliasCanonicals]));

  const addresses = parseAddresses(block, ADDRESS_BLOCK_RE_INDIVIDUAL);
  const identifiers = parseIdentifiers(block);

  const unListType = extractText(block, "UN_LIST_TYPE");
  const referenceNumber = extractText(block, "REFERENCE_NUMBER");
  const listedOn = extractText(block, "LISTED_ON");
  const lastDayUpdated = extractText(block, "LAST_DAY_UPDATED");

  return {
    entryId: `UN-${dataId}`,
    names,
    addresses,
    identifiers,
    listMetadata: {
      subjectType: "individual",
      programs: unListType ? [unListType] : [],
      ...(referenceNumber ? { referenceNumber } : {}),
      ...(listedOn ? { listedOn } : {}),
      ...(lastDayUpdated ? { lastDayUpdated } : {}),
    },
  };
}

function parseEntity(block: string): CanonicalSanctionsEntry | null {
  const dataId = extractText(block, "DATAID");
  if (!dataId) return null;

  const firstName = extractText(block, "FIRST_NAME");
  if (!firstName) return null;

  const canonicalName = canonicalizeName(firstName);
  if (!canonicalName) return null;

  const aliasCanonicals = parseAliases(block, ALIAS_BLOCK_RE_ENTITY);
  const names = Array.from(new Set([canonicalName, ...aliasCanonicals]));

  const addresses = parseAddresses(block, ADDRESS_BLOCK_RE_ENTITY);

  const unListType = extractText(block, "UN_LIST_TYPE");
  const referenceNumber = extractText(block, "REFERENCE_NUMBER");
  const listedOn = extractText(block, "LISTED_ON");
  const lastDayUpdated = extractText(block, "LAST_DAY_UPDATED");

  return {
    entryId: `UN-${dataId}`,
    names,
    addresses,
    identifiers: [],
    listMetadata: {
      subjectType: "entity",
      programs: unListType ? [unListType] : [],
      ...(referenceNumber ? { referenceNumber } : {}),
      ...(listedOn ? { listedOn } : {}),
      ...(lastDayUpdated ? { lastDayUpdated } : {}),
    },
  };
}

/**
 * Parse the UN Consolidated XML into canonical entries.
 *
 * The XML has two top-level blocks: <INDIVIDUALS> and <ENTITIES>. Each
 * contains many <INDIVIDUAL>/<ENTITY> sub-blocks. We extract both and
 * union them into the canonical list.
 */
export function parseUnConsolidated(raw: string): CanonicalSanctionsEntry[] {
  if (!raw || typeof raw !== "string") return [];

  const entries: CanonicalSanctionsEntry[] = [];

  // Reset regex lastIndex (global flag carries state across calls)
  INDIVIDUAL_BLOCK_RE.lastIndex = 0;
  ENTITY_BLOCK_RE.lastIndex = 0;

  for (const block of iterMatches(INDIVIDUAL_BLOCK_RE, raw)) {
    const entry = parseIndividual(block);
    if (entry) entries.push(entry);
  }
  for (const block of iterMatches(ENTITY_BLOCK_RE, raw)) {
    const entry = parseEntity(block);
    if (entry) entries.push(entry);
  }

  return entries;
}

/**
 * Extract upstream version from the `dateGenerated` attribute on the
 * root `<CONSOLIDATED_LIST>` element. Returns undefined if absent.
 */
export function extractUnVersion(raw: string): string | undefined {
  if (!raw) return undefined;
  const head = raw.slice(0, 1024);
  const m = head.match(
    /<CONSOLIDATED_LIST[^>]*\sdateGenerated\s*=\s*"([^"]+)"/,
  );
  return m?.[1];
}

export const unConsolidatedParser: SanctionsSourceParser = {
  list: TradeSanctionsList.UN_CONSOLIDATED,
  defaultSourceUrl: DEFAULT_URL,
  parse: parseUnConsolidated,
  extractUpstreamVersion: extractUnVersion,
};
