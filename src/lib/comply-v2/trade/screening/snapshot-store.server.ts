/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Persistence layer for sanctions-list snapshots.
 *
 * Idempotent upsert: if the SHA-256 of the canonicalized entries matches
 * the latest snapshot of the same list, skip the write entirely. This
 * keeps the daily cron cheap when upstream hasn't changed (typical case
 * — OFAC publishes daily but content changes only on actual updates).
 *
 * Snapshots are insert-only (no UPDATE). The `(list, hash)` unique key
 * means duplicates of the same content land on the existing row instead
 * of creating a new one. The `latestSnapshotFor` query reads the most
 * recent row per list — that's what the screening engine consumes.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type {
  TradeSanctionsList,
  TradeSanctionsSnapshot,
} from "@prisma/client";
import type { CanonicalSanctionsEntry } from "./sources/types";

/**
 * Compute the canonical SHA-256 of an entry array. Uses sorted,
 * deterministic JSON to ensure two semantically-identical entry sets
 * produce the same hash regardless of upstream ordering quirks.
 */
export function hashEntries(entries: CanonicalSanctionsEntry[]): string {
  // Sort by entryId for deterministic hashing across upstream re-orderings.
  const sorted = [...entries].sort((a, b) =>
    a.entryId.localeCompare(b.entryId),
  );
  // Canonical JSON: sorted keys per object handled by JSON.stringify
  // since entries are well-shaped CanonicalSanctionsEntry. Keys are in
  // insertion order which is consistent across all parsers.
  const json = JSON.stringify(sorted);
  return createHash("sha256").update(json).digest("hex");
}

export interface UpsertSnapshotInput {
  list: TradeSanctionsList;
  entries: CanonicalSanctionsEntry[];
  sourceUrl: string;
  upstreamVersion?: string;
}

export interface UpsertSnapshotResult {
  /** True if a new snapshot row was inserted. False if hash matched existing. */
  changed: boolean;
  hash: string;
  entryCount: number;
  snapshot: TradeSanctionsSnapshot;
}

/**
 * Insert a new snapshot if its hash differs from the latest existing
 * snapshot of the same list. Otherwise return the existing one.
 *
 * Race condition note: if two cron runs land simultaneously and both
 * compute the same new hash, the `(list, hash)` unique constraint
 * gates inserts — second one will hit the unique-violation path and
 * return the snapshot from the first.
 */
export async function upsertSnapshot(
  input: UpsertSnapshotInput,
): Promise<UpsertSnapshotResult> {
  const hash = hashEntries(input.entries);
  const entryCount = input.entries.length;

  // Check for existing snapshot with same hash (idempotent path).
  const existing = await prisma.tradeSanctionsSnapshot.findUnique({
    where: { list_hash: { list: input.list, hash } },
  });

  if (existing) {
    return { changed: false, hash, entryCount, snapshot: existing };
  }

  // Hash differs — insert new snapshot.
  const snapshot = await prisma.tradeSanctionsSnapshot.create({
    data: {
      list: input.list,
      hash,
      entryCount,
      entries: input.entries as object[], // Prisma JSON column
      sourceUrl: input.sourceUrl,
      upstreamVersion: input.upstreamVersion,
    },
  });

  return { changed: true, hash, entryCount, snapshot };
}

/**
 * Read the most recent snapshot for a given list. Returns null if no
 * snapshot has ever been ingested (cron hasn't run yet for this list).
 */
export async function latestSnapshotFor(
  list: TradeSanctionsList,
): Promise<TradeSanctionsSnapshot | null> {
  return prisma.tradeSanctionsSnapshot.findFirst({
    where: { list },
    orderBy: { fetchedAt: "desc" },
  });
}

/**
 * Read the most recent snapshot of EVERY known list. Used by the screening
 * engine (Sprint A5) to assemble the full corpus before fuzzy matching.
 *
 * Returns a map keyed by list — missing entries mean that list has no
 * snapshot yet (cron hasn't completed a successful sync for it).
 */
export async function allLatestSnapshots(): Promise<
  Map<TradeSanctionsList, TradeSanctionsSnapshot>
> {
  // Postgres distinct-on equivalent via groupBy + lookup. We could use
  // a raw query for true `DISTINCT ON (list) ... ORDER BY fetchedAt DESC`
  // but the JS-side reduction is fine for our small list count (~6).
  const all = await prisma.tradeSanctionsSnapshot.findMany({
    orderBy: { fetchedAt: "desc" },
  });
  const map = new Map<TradeSanctionsList, TradeSanctionsSnapshot>();
  for (const s of all) {
    if (!map.has(s.list)) map.set(s.list, s);
  }
  return map;
}
