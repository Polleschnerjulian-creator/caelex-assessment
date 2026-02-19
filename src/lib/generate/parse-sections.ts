/**
 * Client-safe markdown section parser for Generate 2.0
 *
 * Parses AI-generated markdown (with ## SECTION: markers) into
 * ReportSection[] format. No server-only dependencies — safe for
 * "use client" components.
 */

export interface ParsedSection {
  title: string;
  content: ParsedSectionContent[];
}

export type ParsedSectionContent =
  | { type: "text"; value: string }
  | { type: "heading"; value: string; level: 1 | 2 | 3 }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "keyValue"; items: Array<{ key: string; value: string }> }
  | { type: "spacer"; height?: number }
  | { type: "divider" }
  | {
      type: "alert";
      severity: "info" | "warning" | "error";
      message: string;
    };

export function parseSectionsFromMarkdown(rawContent: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  const sectionBlocks = rawContent.split(/^## SECTION:\s*/m).filter(Boolean);

  for (const block of sectionBlocks) {
    const lines = block.split("\n");
    const title = lines[0]?.trim() || "Untitled Section";
    const body = lines.slice(1).join("\n").trim();

    if (!body) {
      sections.push({ title, content: [] });
      continue;
    }

    const content = parseBlockContent(body);
    sections.push({ title, content });
  }

  return sections;
}

function parseBlockContent(body: string): ParsedSectionContent[] {
  const content: ParsedSectionContent[] = [];
  const lines = body.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Empty line — skip
    if (!line.trim()) {
      i++;
      continue;
    }

    // Subsection heading: ### SUBSECTION: Title or ### Title
    if (line.match(/^###\s+(SUBSECTION:\s+)?/)) {
      const value = line.replace(/^###\s+(SUBSECTION:\s+)?/, "").trim();
      content.push({ type: "heading", value, level: 2 });
      i++;
      continue;
    }

    // Heading level 3: #### Title
    if (line.match(/^####\s+/)) {
      const value = line.replace(/^####\s+/, "").trim();
      content.push({ type: "heading", value, level: 3 });
      i++;
      continue;
    }

    // Alert: > WARNING: ... or > INFO: ...
    if (line.match(/^>\s*(WARNING|INFO|ERROR):\s*/)) {
      const match = line.match(/^>\s*(WARNING|INFO|ERROR):\s*(.*)/);
      if (match) {
        const severity = match[1].toLowerCase() as "warning" | "info" | "error";
        const message = match[2].trim();
        content.push({ type: "alert", severity, message });
      }
      i++;
      continue;
    }

    // Table: starts with | Header |
    if (
      line.match(/^\|.*\|/) &&
      i + 1 < lines.length &&
      lines[i + 1]?.match(/^\|[\s\-:|]+\|/)
    ) {
      const tableResult = parseTable(lines, i);
      if (tableResult.table) {
        content.push(tableResult.table);
      }
      i = tableResult.nextIndex;
      continue;
    }

    // Key-Value pair: **Key**: Value
    if (line.match(/^\*\*[^*]+\*\*:\s*.+/)) {
      const kvItems: Array<{ key: string; value: string }> = [];
      while (i < lines.length && lines[i]?.match(/^\*\*[^*]+\*\*:\s*.+/)) {
        const kvMatch = lines[i].match(/^\*\*([^*]+)\*\*:\s*(.+)/);
        if (kvMatch) {
          kvItems.push({ key: kvMatch[1].trim(), value: kvMatch[2].trim() });
        }
        i++;
      }
      content.push({ type: "keyValue", items: kvItems });
      continue;
    }

    // Ordered list: 1. Item
    if (line.match(/^\d+\.\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i]?.match(/^\d+\.\s+/)) {
        items.push(lines[i].replace(/^\d+\.\s+/, "").trim());
        i++;
      }
      content.push({ type: "list", items, ordered: true });
      continue;
    }

    // Unordered list: - Item or * Item
    if (line.match(/^[-*]\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i]?.match(/^[-*]\s+/)) {
        items.push(lines[i].replace(/^[-*]\s+/, "").trim());
        i++;
      }
      content.push({ type: "list", items });
      continue;
    }

    // Divider: ---
    if (line.match(/^-{3,}$/)) {
      content.push({ type: "divider" });
      i++;
      continue;
    }

    // Default: text paragraph
    const textLines: string[] = [];
    while (
      i < lines.length &&
      lines[i]?.trim() &&
      !lines[i].match(
        /^(#{2,4}\s|>\s*(WARNING|INFO|ERROR):|^\|.*\||^\*\*[^*]+\*\*:\s|^\d+\.\s|^[-*]\s|^-{3,}$)/,
      )
    ) {
      textLines.push(lines[i].trim());
      i++;
    }
    if (textLines.length > 0) {
      content.push({ type: "text", value: textLines.join(" ") });
    }
  }

  return content;
}

function parseTable(
  lines: string[],
  startIndex: number,
): { table: ParsedSectionContent | null; nextIndex: number } {
  const headerLine = lines[startIndex];
  if (!headerLine) return { table: null, nextIndex: startIndex + 1 };

  const headers = headerLine
    .split("|")
    .map((h) => h.trim())
    .filter(Boolean);

  // Skip separator line
  let i = startIndex + 2;

  const rows: string[][] = [];
  while (i < lines.length && lines[i]?.match(/^\|.*\|/)) {
    const row = lines[i]
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    rows.push(row);
    i++;
  }

  return {
    table: { type: "table", headers, rows },
    nextIndex: i,
  };
}
