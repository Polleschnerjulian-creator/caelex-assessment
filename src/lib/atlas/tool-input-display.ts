/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Humanises Atlas tool inputs into short, lawyer-readable strings
 * for the tool-chip display in AIMode. We deliberately keep this
 * client-safe (no `server-only`) — the formatter is also useful for
 * server-side logging + telemetry, but the primary consumer is the
 * AIMode SSE handler.
 *
 * Each tool has a small `format*` function that picks the most
 * informative fields and renders them as a short status line.
 * Falls back to a generic JSON-truncate if the schema doesn't match.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { AtlasToolName } from "./atlas-tools";

const SCOPE_LABEL: Record<string, string> = {
  advisory: "L1 Advisory",
  active_counsel: "L2 Active Counsel",
  full_counsel: "L3 Full Counsel",
};

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

export function formatAtlasToolInput(
  name: AtlasToolName | string,
  input: unknown,
): string {
  const args = asRecord(input);

  switch (name) {
    case "find_or_open_matter": {
      const query = asString(args.query);
      const action = asString(args.action, "search");
      const verb = action === "open" ? "Öffne" : "Suche";
      return `${verb}: ${quote(query)}`;
    }

    case "find_operator_organization": {
      const query = asString(args.query);
      return `Verzeichnis: ${quote(query)}`;
    }

    case "create_matter_invite": {
      const action = asString(args.action, "preview");
      const matter = asString(args.matter_name, "Mandat");
      const scope = asString(args.scope_level, "active_counsel");
      const months = asNumber(args.duration_months, 12);
      const verb = action === "create" ? "Erstellt" : "Vorschau";
      const scopeLabel = SCOPE_LABEL[scope] ?? scope;
      return `${verb}: ${quote(matter)} · ${scopeLabel} · ${months}M`;
    }

    case "search_legal_sources": {
      const query = asString(args.query);
      const filters: string[] = [];
      const jur = asString(args.jurisdiction);
      if (jur) filters.push(jur);
      const type = asString(args.type);
      if (type) filters.push(type.replace(/_/g, " "));
      const area = asString(args.compliance_area);
      if (area) filters.push(area.replace(/_/g, " "));
      const filterStr = filters.length ? ` · ${filters.join(", ")}` : "";
      return `Atlas-Suche: ${quote(query)}${filterStr}`;
    }

    case "get_legal_source_by_id": {
      const sid = asString(args.source_id, "?");
      return `Quelle: ${sid}`;
    }

    case "list_workspace_templates": {
      return "Workspace-Vorlagen abrufen";
    }

    case "list_jurisdiction_authorities": {
      const jur = asString(args.jurisdiction, "?").toUpperCase();
      return `Behörden: ${jur}`;
    }

    default: {
      // Unknown tool — show a truncated JSON of the input as a
      // last-resort fallback. Better than blank.
      try {
        const json = JSON.stringify(args);
        return json.length > 60 ? json.slice(0, 60) + "…" : json;
      } catch {
        return "";
      }
    }
  }
}
