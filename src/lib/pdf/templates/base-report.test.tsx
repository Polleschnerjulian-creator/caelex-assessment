import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render } from "@testing-library/react";

vi.mock("@react-pdf/renderer", () => ({
  Document: ({ children }: any) => <div data-testid="document">{children}</div>,
  Page: ({ children }: any) => <div data-testid="page">{children}</div>,
  Text: ({ children, render: renderFn }: any) => (
    <span>
      {typeof renderFn === "function"
        ? renderFn({ pageNumber: 1, totalPages: 3 })
        : children}
    </span>
  ),
  View: ({ children }: any) => <div>{children}</div>,
  StyleSheet: { create: (styles: any) => styles },
  Font: { register: vi.fn() },
}));

import { BaseReport, styles } from "./base-report";
import type { ReportConfig } from "../types";

function makeConfig(overrides: Partial<ReportConfig> = {}): ReportConfig {
  return {
    metadata: {
      reportId: "RPT-001",
      reportType: "annual_compliance",
      title: "Test Report",
      generatedAt: new Date("2025-06-01"),
      generatedBy: "admin@test.eu",
      organization: "TestCo",
    },
    header: {
      title: "Test Report Title",
      subtitle: "Test Subtitle",
      reportNumber: "RPT-001",
      date: new Date("2025-06-01"),
      logo: true,
    },
    footer: {
      pageNumbers: true,
      confidentialityNotice: "CONFIDENTIAL",
      disclaimer: "This is a test disclaimer.",
    },
    sections: [
      {
        title: "Section 1",
        content: [
          { type: "text", value: "Some text content" },
          { type: "heading", value: "Heading Level 1", level: 1 },
          { type: "heading", value: "Heading Level 2", level: 2 },
          { type: "heading", value: "Heading Level 3", level: 3 },
          {
            type: "list",
            items: ["Item A", "Item B"],
            ordered: false,
          },
          {
            type: "list",
            items: ["First", "Second"],
            ordered: true,
          },
          {
            type: "table",
            headers: ["Col A", "Col B"],
            rows: [
              ["Row 1 A", "Row 1 B"],
              ["Row 2 A", "Row 2 B"],
            ],
          },
          {
            type: "keyValue",
            items: [
              { key: "Key1", value: "Value1" },
              { key: "Key2", value: "Value2" },
            ],
          },
          { type: "spacer", height: 10 },
          { type: "spacer" },
          { type: "divider" },
          { type: "alert", severity: "info", message: "Info alert" },
          { type: "alert", severity: "warning", message: "Warning alert" },
          { type: "alert", severity: "error", message: "Error alert" },
        ],
      },
    ],
    ...overrides,
  };
}

describe("BaseReport component", () => {
  it("renders without errors", () => {
    const { container } = render(<BaseReport config={makeConfig()} />);
    expect(container).toBeTruthy();
  });

  it("renders the report title", () => {
    const { container } = render(<BaseReport config={makeConfig()} />);
    expect(container.textContent).toContain("Test Report Title");
  });

  it("renders the subtitle", () => {
    const { container } = render(<BaseReport config={makeConfig()} />);
    expect(container.textContent).toContain("Test Subtitle");
  });

  it("renders the report number", () => {
    const { container } = render(<BaseReport config={makeConfig()} />);
    expect(container.textContent).toContain("RPT-001");
  });

  it("renders organization name", () => {
    const { container } = render(<BaseReport config={makeConfig()} />);
    expect(container.textContent).toContain("TestCo");
  });

  it("renders CAELEX logo when logo is true", () => {
    const { container } = render(<BaseReport config={makeConfig()} />);
    expect(container.textContent).toContain("CAELEX");
  });

  it("does not render CAELEX logo when logo is false", () => {
    const config = makeConfig({
      header: { ...makeConfig().header, logo: false },
    });
    const { container } = render(<BaseReport config={config} />);
    // CAELEX should not appear in the header-related section
    // Note: it will still appear in footer
    const logoCount = (container.textContent?.match(/CAELEX/g) || []).length;
    expect(logoCount).toBe(0);
  });

  it("renders without subtitle when not provided", () => {
    const config = makeConfig({
      header: { title: "Title", date: new Date(), logo: true },
    });
    const { container } = render(<BaseReport config={config} />);
    expect(container.textContent).toContain("Title");
  });

  it("renders without reportNumber when not provided", () => {
    const config = makeConfig({
      header: { title: "Title", date: new Date(), logo: true },
    });
    const { container } = render(<BaseReport config={config} />);
    expect(container.textContent).not.toContain("Reference:");
  });

  it("renders text content", () => {
    const { container } = render(<BaseReport config={makeConfig()} />);
    expect(container.textContent).toContain("Some text content");
  });

  it("renders all heading levels", () => {
    const { container } = render(<BaseReport config={makeConfig()} />);
    expect(container.textContent).toContain("Heading Level 1");
    expect(container.textContent).toContain("Heading Level 2");
    expect(container.textContent).toContain("Heading Level 3");
  });

  it("renders unordered list with bullets", () => {
    const { container } = render(<BaseReport config={makeConfig()} />);
    expect(container.textContent).toContain("Item A");
    expect(container.textContent).toContain("Item B");
  });

  it("renders ordered list with numbers", () => {
    const { container } = render(<BaseReport config={makeConfig()} />);
    expect(container.textContent).toContain("1.");
    expect(container.textContent).toContain("First");
    expect(container.textContent).toContain("2.");
    expect(container.textContent).toContain("Second");
  });

  it("renders table with headers and rows", () => {
    const { container } = render(<BaseReport config={makeConfig()} />);
    expect(container.textContent).toContain("Col A");
    expect(container.textContent).toContain("Row 1 A");
    expect(container.textContent).toContain("Row 2 B");
  });

  it("renders key-value pairs", () => {
    const { container } = render(<BaseReport config={makeConfig()} />);
    expect(container.textContent).toContain("Key1");
    expect(container.textContent).toContain("Value1");
  });

  it("renders alert messages", () => {
    const { container } = render(<BaseReport config={makeConfig()} />);
    expect(container.textContent).toContain("Info alert");
    expect(container.textContent).toContain("Warning alert");
    expect(container.textContent).toContain("Error alert");
  });

  it("renders confidentiality notice", () => {
    const { container } = render(<BaseReport config={makeConfig()} />);
    expect(container.textContent).toContain("CONFIDENTIAL");
  });

  it("renders disclaimer", () => {
    const { container } = render(<BaseReport config={makeConfig()} />);
    expect(container.textContent).toContain("test disclaimer");
  });

  it("renders page numbers", () => {
    const { container } = render(<BaseReport config={makeConfig()} />);
    expect(container.textContent).toContain("Page 1 of 3");
  });

  it("renders without confidentiality notice when not provided", () => {
    const config = makeConfig({
      footer: { pageNumbers: true },
    });
    const { container } = render(<BaseReport config={config} />);
    expect(container).toBeTruthy();
  });

  it("renders without disclaimer when not provided", () => {
    const config = makeConfig({
      footer: { pageNumbers: false },
    });
    const { container } = render(<BaseReport config={config} />);
    expect(container).toBeTruthy();
  });

  it("renders without organization when not provided", () => {
    const config = makeConfig({
      metadata: {
        ...makeConfig().metadata,
        organization: undefined,
      },
    });
    const { container } = render(<BaseReport config={config} />);
    expect(container).toBeTruthy();
  });

  it("renders multiple sections", () => {
    const config = makeConfig({
      sections: [
        { title: "First Section", content: [{ type: "text", value: "A" }] },
        { title: "Second Section", content: [{ type: "text", value: "B" }] },
      ],
    });
    const { container } = render(<BaseReport config={config} />);
    expect(container.textContent).toContain("First Section");
    expect(container.textContent).toContain("Second Section");
  });

  it("renders the legal header notice", () => {
    const { container } = render(<BaseReport config={makeConfig()} />);
    expect(container.textContent).toContain("For informational purposes only");
  });
});

describe("styles export", () => {
  it("exports styles object", () => {
    expect(styles).toBeDefined();
    expect(styles.page).toBeDefined();
    expect(styles.header).toBeDefined();
    expect(styles.text).toBeDefined();
    expect(styles.table).toBeDefined();
    expect(styles.alertInfo).toBeDefined();
    expect(styles.alertWarning).toBeDefined();
    expect(styles.alertError).toBeDefined();
  });
});
