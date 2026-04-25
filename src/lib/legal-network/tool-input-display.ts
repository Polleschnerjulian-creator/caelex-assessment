/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Humaniser for matter-scoped tool inputs (chat in workspace).
 * Mirrors src/lib/atlas/tool-input-display.ts but for the three
 * matter-tools (load_compliance_overview, search_legal_sources,
 * draft_memo_to_note).
 *
 * Why a separate file from the atlas one: the tool sets are distinct
 * (atlas tools navigate the workspace; matter tools read scoped data).
 * Keeping the formatters next to their tool definitions makes the
 * lookup obvious when extending either set.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { MatterToolName } from "./matter-tools";

interface ToolInputRecord {
  [key: string]: unknown;
}

function asRecord(input: unknown): ToolInputRecord {
  return typeof input === "object" && input !== null
    ? (input as ToolInputRecord)
    : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" ? value : fallback;
}

function quote(s: string, max = 40): string {
  const t = s.length > max ? s.slice(0, max) + "…" : s;
  return `„${t}"`;
}

export function formatMatterToolInput(
  name: MatterToolName | string,
  input: unknown,
): string {
  const args = asRecord(input);

  switch (name) {
    case "load_compliance_overview": {
      const detail = asString(args.detail_level, "summary");
      return detail === "full" ? "Detail: alle Assessments" : "Übersicht";
    }

    case "search_legal_sources": {
      const query = asString(args.query);
      const limit = asNumber(args.limit, 5);
      return `${quote(query)} · max ${limit} Quellen`;
    }

    case "draft_memo_to_note": {
      const title = asString(args.title);
      const contentLength = asString(args.content).length;
      return `${quote(title, 50)} · ${contentLength.toLocaleString("de-DE")} Zeichen`;
    }

    case "compare_jurisdictions": {
      const codes = Array.isArray(args.jurisdictions)
        ? (args.jurisdictions as unknown[])
            .filter((c): c is string => typeof c === "string")
            .map((c) => c.toUpperCase())
        : [];
      const topic = asString(args.topic);
      const codeStr = codes.join(" vs. ");
      return topic ? `${codeStr} · ${topic}` : codeStr;
    }

    default: {
      try {
        const json = JSON.stringify(args);
        return json.length > 60 ? json.slice(0, 60) + "…" : json;
      } catch {
        return "";
      }
    }
  }
}
