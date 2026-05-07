/**
 * Sprint B2 — Classification lookup engine.
 *
 * Multi-jurisdiction lookup functions used by:
 *   - Sprint B3 (Property-Trigger Engine) — to find entries matching
 *     a TradeItem's physical/technical properties
 *   - Sprint B4 (Astra tool) — to fetch related entries for a code
 *   - Sprint B6 (License-Determination) — to find MTCR Cat. I gate
 *   - Sprint B7 (UI) — to populate the classification detail panel
 *
 * All functions are pure (no side-effects, no DB calls). They operate
 * entirely on the static classification data imported from `@/data/trade`.
 * No async — suitable for use in both server and client contexts.
 */

import type {
  ClassificationEntry,
  ClassificationJurisdiction,
  CrossReferenceTopic,
} from "@/data/trade/schema";

import {
  EU_ANNEX_I_ENTRIES,
  US_CCL_ENTRIES,
  USML_ENTRIES,
  MTCR_ANNEX_ENTRIES,
  DE_ANLAGE_AL_ENTRIES,
  CROSS_REFERENCE_TOPICS,
  CROSS_REFERENCE_TOPICS_BY_SLUG,
} from "@/data/trade";

// ─── Flat all-entry index ─────────────────────────────────────────────

/**
 * All entries from all jurisdictions in a single flat array.
 * Built once at module load (small static data — safe).
 */
export const ALL_CLASSIFICATION_ENTRIES: ClassificationEntry[] = [
  ...EU_ANNEX_I_ENTRIES,
  ...US_CCL_ENTRIES,
  ...USML_ENTRIES,
  ...MTCR_ANNEX_ENTRIES,
  ...DE_ANLAGE_AL_ENTRIES,
];

// ─── Lookup by exact code + jurisdiction ──────────────────────────────

/**
 * Find a single entry by its exact code within a given jurisdiction.
 *
 * @example
 * findEntry("9A515.a", "US_CCL")  // → ClassificationEntry | undefined
 */
export function findEntry(
  code: string,
  jurisdiction: ClassificationJurisdiction,
): ClassificationEntry | undefined {
  return ALL_CLASSIFICATION_ENTRIES.find(
    (e) => e.code === code && e.jurisdiction === jurisdiction,
  );
}

/**
 * Find all entries matching a code across ALL jurisdictions.
 * Returns multiple entries when the same code appears in multiple lists
 * (e.g. "9A004" appears in both EU_ANNEX_I and US_CCL).
 */
export function findEntriesAllJurisdictions(
  code: string,
): ClassificationEntry[] {
  return ALL_CLASSIFICATION_ENTRIES.filter((e) => e.code === code);
}

// ─── Cross-reference traversal ────────────────────────────────────────

/**
 * Given an entry, return all related entries across jurisdictions that
 * share the same cross-reference topic slug.
 *
 * Returns an empty array if the entry has no crossReferenceTopic.
 */
export function findRelatedClassifications(
  entry: ClassificationEntry,
): ClassificationEntry[] {
  if (!entry.crossReferenceTopic) return [];
  return ALL_CLASSIFICATION_ENTRIES.filter(
    (e) =>
      e.crossReferenceTopic === entry.crossReferenceTopic &&
      !(e.code === entry.code && e.jurisdiction === entry.jurisdiction),
  );
}

/**
 * Given a cross-reference topic slug, return all entries across all
 * jurisdictions that belong to that topic.
 */
export function findEntriesByTopic(slug: string): ClassificationEntry[] {
  return ALL_CLASSIFICATION_ENTRIES.filter(
    (e) => e.crossReferenceTopic === slug,
  );
}

/**
 * Given a cross-reference topic slug, return all entries grouped by
 * jurisdiction. Useful for the multi-jurisdiction classification panel.
 */
export function findEntriesByTopicGrouped(
  slug: string,
): Partial<Record<ClassificationJurisdiction, ClassificationEntry[]>> {
  const entries = findEntriesByTopic(slug);
  return entries.reduce<
    Partial<Record<ClassificationJurisdiction, ClassificationEntry[]>>
  >((acc, entry) => {
    const group = acc[entry.jurisdiction] ?? [];
    group.push(entry);
    acc[entry.jurisdiction] = group;
    return acc;
  }, {});
}

// ─── Topic lookup ─────────────────────────────────────────────────────

/**
 * Get a cross-reference topic by slug. Returns undefined if not found.
 */
export function getTopic(slug: string): CrossReferenceTopic | undefined {
  return CROSS_REFERENCE_TOPICS_BY_SLUG[slug];
}

/**
 * Get all cross-reference topics.
 */
export function getAllTopics(): CrossReferenceTopic[] {
  return CROSS_REFERENCE_TOPICS;
}

// ─── Jurisdiction filters ─────────────────────────────────────────────

/**
 * Get all entries for a specific jurisdiction.
 */
export function getEntriesForJurisdiction(
  jurisdiction: ClassificationJurisdiction,
): ClassificationEntry[] {
  return ALL_CLASSIFICATION_ENTRIES.filter(
    (e) => e.jurisdiction === jurisdiction,
  );
}

// ─── MTCR gates ───────────────────────────────────────────────────────

/**
 * Returns true if ANY entry in the given cross-reference topic is
 * MTCR Category I. Used by Sprint B6 license-determination to apply
 * the "strong presumption of denial" gate.
 */
export function isTopicMtcrCategoryI(slug: string): boolean {
  return findEntriesByTopic(slug).some((e) => e.mtcrCategory === "I");
}

/**
 * Get all MTCR Category I entries across all jurisdictions.
 * Used to build the "presumption-of-denial" deny-list in Sprint B6.
 */
export function getAllMtcrCategoryIEntries(): ClassificationEntry[] {
  return ALL_CLASSIFICATION_ENTRIES.filter((e) => e.mtcrCategory === "I");
}

// ─── ITAR detection ───────────────────────────────────────────────────

/**
 * Returns true if the entry is ITAR-controlled (i.e. in USML jurisdiction).
 * ITAR jurisdiction means:
 *   - De-minimis rule does NOT apply
 *   - Re-export requires DDTC license (DSP-5 / TAA)
 *   - Foreign-produced items incorporating USML items need ITAR auth
 */
export function isItarControlled(entry: ClassificationEntry): boolean {
  return entry.jurisdiction === "USML";
}

/**
 * Returns true if the topic has ANY ITAR-controlled entry.
 */
export function hasItarEntry(slug: string): boolean {
  return findEntriesByTopic(slug).some(isItarControlled);
}

// ─── Control reason helpers ───────────────────────────────────────────

/**
 * Returns true if the entry is controlled for Missile Technology (MT)
 * reasons — used to trigger MTCR cross-check in Sprint B3.
 */
export function isMtControlled(entry: ClassificationEntry): boolean {
  return entry.controlReasons.includes("MT");
}

/**
 * Returns true if the entry is controlled for National Security (NS)
 * reasons — the most common control reason for aerospace items.
 */
export function isNsControlled(entry: ClassificationEntry): boolean {
  return entry.controlReasons.includes("NS");
}

// ─── Search ───────────────────────────────────────────────────────────

/**
 * Simple text search across titles and descriptions. Case-insensitive.
 * Returns up to `limit` results (default 20).
 *
 * For Sprint B7 UI — server-side search before Astra LLM is called.
 */
export function searchEntries(
  query: string,
  limit = 20,
): ClassificationEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  return ALL_CLASSIFICATION_ENTRIES.filter(
    (e) =>
      e.code.toLowerCase().includes(q) ||
      e.title.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q),
  ).slice(0, limit);
}

/**
 * Get entries for specific code prefix (e.g. "9A" → all 9A* entries).
 * Useful for category-level navigation in Sprint B7.
 */
export function findEntriesByCodePrefix(
  prefix: string,
  jurisdiction?: ClassificationJurisdiction,
): ClassificationEntry[] {
  return ALL_CLASSIFICATION_ENTRIES.filter(
    (e) =>
      e.code.startsWith(prefix) &&
      (jurisdiction === undefined || e.jurisdiction === jurisdiction),
  );
}
