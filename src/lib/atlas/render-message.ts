/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas message renderer — splits a streamed Astra answer into typed
 * tokens so the chat UI can render Atlas-IDs as clickable deep-links
 * to the source page.
 *
 * The renderer is intentionally pure and synchronous: regex-only, no
 * DB lookup at parse time. A given ID may not actually resolve in the
 * catalogue (e.g. Astra hallucinated it despite the system-prompt
 * citation rule), in which case the deep-link still navigates to the
 * source page and the page itself renders "not found". That trade-off
 * keeps the renderer cheap during streaming.
 *
 * Output is an ordered list of tokens — the React renderer maps each
 * to either a plain text span or an anchor element. Splitting at
 * parse time rather than during render lets us test the segmentation
 * deterministically without touching React.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export type AtlasMessageToken =
  | { kind: "text"; value: string }
  | { kind: "atlas-id"; id: string; raw: string }
  | { kind: "case-id"; id: string; raw: string };

/**
 * Atlas-ID match — uppercase-prefix + hyphen-separated uppercase-alphanumeric
 * segments. Examples:
 *   - INT-OST-1967
 *   - DE-VVG
 *   - EU-NIS2-2022
 *   - UK-INSURANCE-ACT-2015
 *
 * First segment 2-3 uppercase letters (jurisdiction or INT/EU). Each
 * subsequent segment one or more uppercase letters or digits. At least
 * two segments — bare prefixes like "[DE]" stay as plain text.
 *
 * IMPORTANT: this pattern excludes "CASE" as a prefix so that case-IDs
 * don't accidentally match here. They are handled separately via
 * CASE_ID_PATTERN below.
 */
const ATLAS_ID_PATTERN = /\[(?!CASE-)([A-Z]{2,3}(?:-[A-Z0-9]+)+)\]/g;

/**
 * Case-ID match — always starts with the literal "CASE-" prefix,
 * followed by uppercase-alphanumeric segments. Examples:
 *   - CASE-COSMOS-954-1981
 *   - CASE-FCC-SWARM-2018
 *   - CASE-ITT-ITAR-2007
 *   - CASE-VEGA-VV15-2019
 *
 * Routes to /atlas/cases/[id] rather than /atlas/sources/[id].
 */
const CASE_ID_PATTERN = /\[(CASE-[A-Z0-9-]+)\]/g;

export function tokenizeAtlasMessage(text: string): AtlasMessageToken[] {
  if (!text) return [{ kind: "text", value: "" }];

  // Single-pass tokenizer: scan for either pattern, take the earliest
  // match, advance cursor. Handling both regexes in one pass keeps the
  // output token order stable when both kinds appear in the same
  // sentence (common in case law citations).
  const tokens: AtlasMessageToken[] = [];
  let cursor = 0;
  const atlasRe = new RegExp(ATLAS_ID_PATTERN.source, "g");
  const caseRe = new RegExp(CASE_ID_PATTERN.source, "g");

  while (cursor < text.length) {
    atlasRe.lastIndex = cursor;
    caseRe.lastIndex = cursor;
    const atlasMatch = atlasRe.exec(text);
    const caseMatch = caseRe.exec(text);

    // Pick the earliest match (or break out if none).
    let next: RegExpExecArray | null = null;
    let kind: "atlas-id" | "case-id" | null = null;
    if (atlasMatch && (!caseMatch || atlasMatch.index < caseMatch.index)) {
      next = atlasMatch;
      kind = "atlas-id";
    } else if (caseMatch) {
      next = caseMatch;
      kind = "case-id";
    }
    if (!next || !kind) break;

    if (next.index > cursor) {
      tokens.push({ kind: "text", value: text.slice(cursor, next.index) });
    }
    tokens.push({
      kind,
      id: next[1],
      raw: next[0],
    });
    cursor = next.index + next[0].length;
  }

  if (cursor < text.length) {
    tokens.push({ kind: "text", value: text.slice(cursor) });
  }

  if (tokens.length === 0) {
    tokens.push({ kind: "text", value: text });
  }
  return tokens;
}

/**
 * Build the deep-link URL for an Atlas-ID. Returns null for IDs that
 * don't fit the expected shape — the caller falls back to plain text.
 *
 * The URL points at the canonical jurisdiction-detail or source-detail
 * route. Today every catalogue ID renders on /atlas/sources/[id] (the
 * source-detail page handles every type), so we route uniformly there.
 */
export function atlasIdToHref(id: string): string | null {
  if (!/^[A-Z]{2,3}(?:-[A-Z0-9]+)+$/.test(id)) return null;
  return `/atlas/sources/${encodeURIComponent(id)}`;
}

/**
 * Build the deep-link URL for a Case-ID. Returns null if the shape is
 * wrong — caller falls back to plain text.
 */
export function caseIdToHref(id: string): string | null {
  if (!/^CASE-[A-Z0-9-]+$/.test(id)) return null;
  return `/atlas/cases/${encodeURIComponent(id)}`;
}
