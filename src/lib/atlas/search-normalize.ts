/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Atlas search text normalization.
 *
 * `foldText` makes the command-center search diacritic-insensitive and
 * locale-independent: a user typing "weltraumgesetz" matches "Weltraumgesetz",
 * "osterreich" matches "Österreich", "strasse" matches "Straße". Without
 * this, any query that misses a German umlaut, a French accent, or the ß
 * sharp-s silently drops matches that a layperson expected to see.
 *
 * NFD-decomposes (é → e + ◌́), strips combining marks, unfolds ß → ss,
 * lowercases. Cheap enough to run on every keystroke.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

const COMBINING_MARKS = /[\u0300-\u036f]/g;

export function foldText(input: string): string {
  return input
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/ß/g, "ss")
    .toLowerCase();
}

/**
 * Escapes regex metacharacters so a user-typed token (including things
 * like "§" or ".") can safely be embedded in a \b...\b word-boundary
 * expression without blowing up.
 */
export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
