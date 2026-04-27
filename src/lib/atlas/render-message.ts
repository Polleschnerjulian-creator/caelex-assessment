/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
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
  | { kind: "atlas-id"; id: string; raw: string };

/**
 * Match shape: an opening square bracket, then an Atlas-ID, then a
 * closing bracket. Atlas-IDs are uppercase-prefix + hyphen-separated
 * uppercase-alphanumeric segments. Examples:
 *   - INT-OST-1967
 *   - DE-VVG
 *   - EU-NIS2-2022
 *   - INT-EU-SANCTIONS-RU-833
 *   - UK-INSURANCE-ACT-2015
 *
 * The first segment is 2-3 uppercase letters (jurisdiction code or
 * INT/EU). Each subsequent segment is one or more uppercase letters
 * or digits. At least two segments — bare prefixes like "[DE]" are
 * not citations and stay as plain text.
 */
const ATLAS_ID_PATTERN = /\[([A-Z]{2,3}(?:-[A-Z0-9]+)+)\]/g;

export function tokenizeAtlasMessage(text: string): AtlasMessageToken[] {
  if (!text) return [{ kind: "text", value: "" }];

  const tokens: AtlasMessageToken[] = [];
  let cursor = 0;
  // Use exec in a loop rather than matchAll so we keep precise indices
  // across iterations.
  const re = new RegExp(ATLAS_ID_PATTERN.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const start = match.index;
    if (start > cursor) {
      tokens.push({ kind: "text", value: text.slice(cursor, start) });
    }
    tokens.push({
      kind: "atlas-id",
      id: match[1],
      raw: match[0],
    });
    cursor = start + match[0].length;
  }
  if (cursor < text.length) {
    tokens.push({ kind: "text", value: text.slice(cursor) });
  }

  // If nothing matched, return the whole input as one text token so
  // callers get a stable shape.
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
