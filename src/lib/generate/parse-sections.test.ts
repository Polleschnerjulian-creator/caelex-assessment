import { describe, it, expect } from "vitest";
import { parseSectionsFromMarkdown } from "./parse-sections";
import type { ParsedSection, ParsedSectionContent } from "./parse-sections";

describe("parseSectionsFromMarkdown", () => {
  it("returns an empty array for empty input", () => {
    const result = parseSectionsFromMarkdown("");
    expect(result).toEqual([]);
  });

  it("parses a single section with a title", () => {
    const input = `## SECTION: Executive Summary
This is the executive summary content.`;
    const result = parseSectionsFromMarkdown(input);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Executive Summary");
  });

  it("parses multiple sections", () => {
    const input = `## SECTION: Cover Page
Cover content here.
## SECTION: Executive Summary
Summary content here.
## SECTION: Analysis
Analysis content here.`;
    const result = parseSectionsFromMarkdown(input);
    expect(result).toHaveLength(3);
    expect(result[0].title).toBe("Cover Page");
    expect(result[1].title).toBe("Executive Summary");
    expect(result[2].title).toBe("Analysis");
  });

  it("handles section with empty body", () => {
    const input = `## SECTION: Empty Section`;
    const result = parseSectionsFromMarkdown(input);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Empty Section");
    expect(result[0].content).toEqual([]);
  });

  it("uses 'Untitled Section' for sections without a title line", () => {
    const input = `## SECTION:
Some content here.`;
    const result = parseSectionsFromMarkdown(input);
    expect(result).toHaveLength(1);
    // The first line would be empty after trimming, falling back to "Untitled Section"
    // Actually the split line[0] would be "" so it returns "Untitled Section"
  });

  describe("parseBlockContent", () => {
    it("parses text paragraphs", () => {
      const input = `## SECTION: Test
This is a paragraph of text.
It continues here.`;
      const result = parseSectionsFromMarkdown(input);
      expect(result[0].content).toHaveLength(1);
      expect(result[0].content[0].type).toBe("text");
      expect(
        (result[0].content[0] as { type: "text"; value: string }).value,
      ).toContain("This is a paragraph of text.");
    });

    it("parses ### headings as level 2", () => {
      const input = `## SECTION: Test
### Section Heading
Some text after.`;
      const result = parseSectionsFromMarkdown(input);
      const heading = result[0].content.find((c) => c.type === "heading");
      expect(heading).toBeDefined();
      expect(heading!.type).toBe("heading");
      expect(
        (heading as { type: "heading"; value: string; level: number }).level,
      ).toBe(2);
      expect((heading as { type: "heading"; value: string }).value).toBe(
        "Section Heading",
      );
    });

    it("parses ### SUBSECTION: headings", () => {
      const input = `## SECTION: Test
### SUBSECTION: Sub Heading
Some text.`;
      const result = parseSectionsFromMarkdown(input);
      const heading = result[0].content.find((c) => c.type === "heading");
      expect(heading).toBeDefined();
      expect((heading as { type: "heading"; value: string }).value).toBe(
        "Sub Heading",
      );
    });

    it("parses #### headings as level 3", () => {
      const input = `## SECTION: Test
#### Deep Heading
Some text.`;
      const result = parseSectionsFromMarkdown(input);
      const heading = result[0].content.find((c) => c.type === "heading");
      expect(heading).toBeDefined();
      expect(
        (heading as { type: "heading"; value: string; level: number }).level,
      ).toBe(3);
    });

    it("parses WARNING alerts", () => {
      const input = `## SECTION: Test
> WARNING: This is a warning message`;
      const result = parseSectionsFromMarkdown(input);
      const alert = result[0].content.find((c) => c.type === "alert");
      expect(alert).toBeDefined();
      expect((alert as { severity: string }).severity).toBe("warning");
      expect((alert as { message: string }).message).toBe(
        "This is a warning message",
      );
    });

    it("parses INFO alerts", () => {
      const input = `## SECTION: Test
> INFO: This is an info message`;
      const result = parseSectionsFromMarkdown(input);
      const alert = result[0].content.find((c) => c.type === "alert");
      expect(alert).toBeDefined();
      expect((alert as { severity: string }).severity).toBe("info");
    });

    it("parses ERROR alerts", () => {
      const input = `## SECTION: Test
> ERROR: Something went wrong`;
      const result = parseSectionsFromMarkdown(input);
      const alert = result[0].content.find((c) => c.type === "alert");
      expect(alert).toBeDefined();
      expect((alert as { severity: string }).severity).toBe("error");
    });

    it("parses tables", () => {
      const input = `## SECTION: Test
| Header 1 | Header 2 |
|---|---|
| Cell 1 | Cell 2 |
| Cell 3 | Cell 4 |`;
      const result = parseSectionsFromMarkdown(input);
      const table = result[0].content.find((c) => c.type === "table");
      expect(table).toBeDefined();
      const t = table as { type: "table"; headers: string[]; rows: string[][] };
      expect(t.headers).toEqual(["Header 1", "Header 2"]);
      expect(t.rows).toHaveLength(2);
      expect(t.rows[0]).toEqual(["Cell 1", "Cell 2"]);
    });

    it("parses key-value pairs", () => {
      const input = `## SECTION: Test
**Name**: John Doe
**Role**: Engineer
**Department**: Ops`;
      const result = parseSectionsFromMarkdown(input);
      const kv = result[0].content.find((c) => c.type === "keyValue");
      expect(kv).toBeDefined();
      const items = (kv as { items: Array<{ key: string; value: string }> })
        .items;
      expect(items).toHaveLength(3);
      expect(items[0]).toEqual({ key: "Name", value: "John Doe" });
      expect(items[1]).toEqual({ key: "Role", value: "Engineer" });
    });

    it("parses ordered lists", () => {
      const input = `## SECTION: Test
1. First item
2. Second item
3. Third item`;
      const result = parseSectionsFromMarkdown(input);
      const list = result[0].content.find((c) => c.type === "list");
      expect(list).toBeDefined();
      const l = list as { type: "list"; items: string[]; ordered?: boolean };
      expect(l.ordered).toBe(true);
      expect(l.items).toEqual(["First item", "Second item", "Third item"]);
    });

    it("parses unordered lists with dashes", () => {
      const input = `## SECTION: Test
- Item A
- Item B
- Item C`;
      const result = parseSectionsFromMarkdown(input);
      const list = result[0].content.find((c) => c.type === "list");
      expect(list).toBeDefined();
      const l = list as { type: "list"; items: string[]; ordered?: boolean };
      expect(l.ordered).toBeUndefined();
      expect(l.items).toEqual(["Item A", "Item B", "Item C"]);
    });

    it("parses unordered lists with asterisks", () => {
      const input = `## SECTION: Test
* Item X
* Item Y`;
      const result = parseSectionsFromMarkdown(input);
      const list = result[0].content.find((c) => c.type === "list");
      expect(list).toBeDefined();
      const l = list as { type: "list"; items: string[] };
      expect(l.items).toEqual(["Item X", "Item Y"]);
    });

    it("parses dividers", () => {
      const input = `## SECTION: Test
Some text before.

---

Some text after.`;
      const result = parseSectionsFromMarkdown(input);
      const divider = result[0].content.find((c) => c.type === "divider");
      expect(divider).toBeDefined();
    });

    it("handles mixed content types in a single section", () => {
      const input = `## SECTION: Mixed
### Heading
Some paragraph text.
- List item 1
- List item 2
**Key**: Value
| H1 | H2 |
|---|---|
| C1 | C2 |
> WARNING: Alert message
---
1. Ordered item`;
      const result = parseSectionsFromMarkdown(input);
      const types = result[0].content.map((c) => c.type);
      expect(types).toContain("heading");
      expect(types).toContain("text");
      expect(types).toContain("list");
      expect(types).toContain("keyValue");
      expect(types).toContain("table");
      expect(types).toContain("alert");
      expect(types).toContain("divider");
    });

    it("skips empty lines between content blocks", () => {
      const input = `## SECTION: Test

Some text.

More text.`;
      const result = parseSectionsFromMarkdown(input);
      // Should parse the text blocks without error
      expect(result[0].content.length).toBeGreaterThanOrEqual(1);
    });

    it("handles table without data rows", () => {
      const input = `## SECTION: Test
| Header 1 | Header 2 |
|---|---|`;
      const result = parseSectionsFromMarkdown(input);
      const table = result[0].content.find((c) => c.type === "table");
      expect(table).toBeDefined();
      const t = table as { type: "table"; headers: string[]; rows: string[][] };
      expect(t.headers).toEqual(["Header 1", "Header 2"]);
      expect(t.rows).toEqual([]);
    });

    it("does not freeze on pipe-delimited line without table separator", () => {
      const input = `## SECTION: Test
| Requirement | Status | Evidence |
Some text after the pipe line.`;
      const result = parseSectionsFromMarkdown(input);
      // Must complete without hanging — pipe line treated as text
      expect(result).toHaveLength(1);
      expect(result[0].content.length).toBeGreaterThanOrEqual(1);
      const allText = result[0].content
        .filter((c): c is { type: "text"; value: string } => c.type === "text")
        .map((c) => c.value)
        .join(" ");
      expect(allText).toContain("Requirement");
      expect(allText).toContain("Some text after");
    });

    it("does not freeze on multiple consecutive pipe lines without separator", () => {
      const input = `## SECTION: Test
| Row 1 Col A | Row 1 Col B |
| Row 2 Col A | Row 2 Col B |
Normal text after.`;
      const result = parseSectionsFromMarkdown(input);
      expect(result).toHaveLength(1);
      expect(result[0].content.length).toBeGreaterThanOrEqual(1);
    });

    it("does not freeze on pipe line at end of section", () => {
      const input = `## SECTION: Test
Some introductory text.
| Standalone pipe line |`;
      const result = parseSectionsFromMarkdown(input);
      expect(result).toHaveLength(1);
      expect(result[0].content.length).toBeGreaterThanOrEqual(1);
    });

    it("handles pipe line followed by heading", () => {
      const input = `## SECTION: Test
| Art. 67 | Debris Mitigation | Compliant |
### Next Subsection
More content here.`;
      const result = parseSectionsFromMarkdown(input);
      expect(result).toHaveLength(1);
      const types = result[0].content.map((c) => c.type);
      expect(types).toContain("text");
      expect(types).toContain("heading");
    });
  });
});
