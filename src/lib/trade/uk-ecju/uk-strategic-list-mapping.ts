/**
 * UK Strategic Export Control List ↔ EU Annex I prefix mapping.
 *
 * The UK strategic export control list mostly mirrors EU Annex I
 * (Regulation (EU) 2021/821) with the addition of the UK Strategic
 * Defence List (UKSDL) for military goods. UK-specific prefixes (PLxxx,
 * MLxx) need to map back to EU/Wassenaar codes so operators can search
 * the same item across both control lists.
 *
 * Sources:
 *   - UK Strategic Export Control Lists (Mar 2024)
 *   - Council Regulation (EU) 2021/821, Annex I (current consolidated)
 *   - Wassenaar Arrangement List of Dual-Use Goods and Technologies
 *
 * Coverage is INTENTIONALLY narrow at MVP: the prefixes most often
 * encountered by space-sector exporters (PL5xxx category 5
 * cryptography, PL9xxx aerospace, ML10/ML15/ML17 military space &
 * imaging). Operators can extend the table from the UKSDL annex page
 * as new mappings are added.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

/**
 * UK-prefix → EU/Wassenaar code mapping. Keys are uppercase UK codes
 * (the canonical form on UK ECJU's SPIRE portal); values are the
 * `EU:<code>` or `WA:<code>` cross-reference the operator would use
 * to look the item up in the EU Annex I or Wassenaar list.
 */
export const UK_STRATEGIC_LIST_PREFIX_MAPPING: Record<string, string> = {
  // ─── Dual-use (PL prefix = "Parallel List" — UK-specific code that
  // mirrors an EU Annex I or Wassenaar item) ───
  PL5001A: "EU:5A001.a", // Telecommunications equipment
  PL5001B: "EU:5A001.b",
  PL5001C: "EU:5A001.c",
  PL5002A: "EU:5A002.a", // Information security / cryptography
  PL5002B: "EU:5A002.b",
  PL5003: "EU:5A003", // Defeating IT security
  PL5004: "EU:5A004", // Cryptanalytic items
  PL9001: "EU:9A001", // Aerospace & propulsion
  PL9002: "EU:9A002",
  PL9003: "EU:9A003", // Spacecraft & subsystems
  PL9004: "EU:9A004",
  PL9005: "EU:9A005",
  PL9006: "EU:9A006",
  PL9007: "EU:9A007",
  PL9008: "EU:9A008",
  PL9009: "EU:9A009",
  PL9010: "EU:9A010", // Launch vehicles
  PL9011: "EU:9A011",
  PL9012: "EU:9A012",
  PL9101: "EU:9B001", // Test, inspection equipment for aerospace
  PL9201: "EU:9C001", // Aerospace materials
  PL9301: "EU:9D001", // Aerospace software
  PL9401: "EU:9E001", // Aerospace technology

  // ─── Military (ML prefix — UK Military List, mirrors EU Common
  // Military List 2024/C 116/01) ───
  ML4: "EU:ML4", // Bombs, torpedoes, rockets, missiles
  ML10: "EU:ML10", // Aircraft, including UAVs & helicopters
  ML11: "EU:ML11", // Military electronics
  ML12: "EU:ML12", // High velocity kinetic energy weapon systems
  ML15: "EU:ML15", // Imaging or counter-measure equipment
  ML17: "EU:ML17", // Miscellaneous military equipment
  ML18: "EU:ML18", // Production of military goods
  ML21: "EU:ML21", // Military software
  ML22: "EU:ML22", // Military technology
};

/**
 * Look up the EU/Wassenaar cross-reference for a UK control list
 * entry. Returns the mapped code string (`EU:<code>` or `WA:<code>`)
 * or null when the prefix isn't in the mapping table.
 *
 * Matching is case-insensitive and ignores the trailing subentries
 * (e.g. "pl5002a.1" matches the "PL5002A" entry).
 */
export function lookupEuCrossReference(ukEntry: string): string | null {
  if (!ukEntry) return null;
  const normalised = ukEntry
    .trim()
    .toUpperCase()
    .replace(/[.\s].*$/, "");
  return UK_STRATEGIC_LIST_PREFIX_MAPPING[normalised] ?? null;
}

/**
 * Reverse lookup — given an EU Annex I code or Wassenaar code, return
 * the canonical UK prefix that mirrors it. Returns null when no UK
 * counterpart is listed.
 */
export function lookupUkPrefixForEuCode(euCode: string): string | null {
  if (!euCode) return null;
  const target = euCode.trim().toUpperCase();
  for (const [ukPrefix, mapped] of Object.entries(
    UK_STRATEGIC_LIST_PREFIX_MAPPING,
  )) {
    if (mapped.toUpperCase() === target) return ukPrefix;
  }
  return null;
}
