import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@react-email/render", () => ({
  render: vi.fn(async () => `<html><body>mocked-document-expiry</body></html>`),
}));

vi.mock("@react-email/components", () => ({
  Html: ({ children, ...props }: any) => <html {...props}>{children}</html>,
  Head: ({ children }: any) => <head>{children}</head>,
  Body: ({ children, ...props }: any) => (
    <div data-testid="body" {...props}>
      {children}
    </div>
  ),
  Container: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Text: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  Button: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  Section: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Row: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Column: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Hr: (props: any) => <hr {...props} />,
  Link: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  Preview: ({ children }: any) => <div data-testid="preview">{children}</div>,
  Heading: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
  Img: (props: any) => <img {...props} />,
}));

vi.mock("./base-layout", () => ({
  BaseLayout: ({ children, previewText }: any) => (
    <div data-testid="base-layout" data-preview={previewText}>
      {children}
    </div>
  ),
  styles: {
    text: {},
    heading: {},
    mutedText: {},
    subheading: {},
    card: {},
    hr: {},
    button: {},
    link: {},
    listItem: {},
    badge: (variant: string) => ({ backgroundColor: variant }),
    colors: {
      red500: "#EF4444",
      amber500: "#F59E0B",
      blue500: "#3B82F6",
      blue400: "#60A5FA",
      slate400: "#94A3B8",
      navy700: "#334155",
      navy800: "#1E293B",
      green500: "#22C55E",
      slate200: "#E2E8F0",
      white: "#F8FAFC",
    },
  },
}));

import { renderDocumentExpiry } from "./document-expiry";
import type { DocumentExpiryData } from "../types";

describe("document-expiry template", () => {
  const baseData: DocumentExpiryData = {
    recipientName: "Bob",
    documentName: "ISO 27001 Certificate",
    expiryDate: new Date("2025-07-01"),
    daysUntilExpiry: 20,
    category: "cybersecurity",
    dashboardUrl: "https://caelex.io/dashboard",
  };

  describe("renderDocumentExpiry", () => {
    it("returns html and subject for a document expiring in >7 days", async () => {
      const result = await renderDocumentExpiry(baseData);
      expect(result.html).toBeDefined();
      expect(result.subject).toBe(
        "Document Expiry Notice: ISO 27001 Certificate",
      );
    });

    it("generates EXPIRED subject when daysUntilExpiry <= 0", async () => {
      const result = await renderDocumentExpiry({
        ...baseData,
        daysUntilExpiry: 0,
      });
      expect(result.subject).toBe(
        "[EXPIRED] ISO 27001 Certificate - Action Required",
      );
    });

    it("generates EXPIRED subject for negative daysUntilExpiry", async () => {
      const result = await renderDocumentExpiry({
        ...baseData,
        daysUntilExpiry: -5,
      });
      expect(result.subject).toBe(
        "[EXPIRED] ISO 27001 Certificate - Action Required",
      );
    });

    it("generates URGENT subject when daysUntilExpiry is 1-7", async () => {
      const result = await renderDocumentExpiry({
        ...baseData,
        daysUntilExpiry: 5,
      });
      expect(result.subject).toBe(
        "[URGENT] ISO 27001 Certificate expires in 5 days",
      );
    });

    it("generates URGENT subject when daysUntilExpiry is exactly 7", async () => {
      const result = await renderDocumentExpiry({
        ...baseData,
        daysUntilExpiry: 7,
      });
      expect(result.subject).toBe(
        "[URGENT] ISO 27001 Certificate expires in 7 days",
      );
    });

    it("generates standard notice subject when daysUntilExpiry > 7", async () => {
      const result = await renderDocumentExpiry({
        ...baseData,
        daysUntilExpiry: 14,
      });
      expect(result.subject).toBe(
        "Document Expiry Notice: ISO 27001 Certificate",
      );
    });

    it("handles daysUntilExpiry = 30 (advance notice)", async () => {
      const result = await renderDocumentExpiry({
        ...baseData,
        daysUntilExpiry: 30,
      });
      expect(result.subject).toContain("Document Expiry Notice");
    });

    it("handles daysUntilExpiry > 30 (far future)", async () => {
      const result = await renderDocumentExpiry({
        ...baseData,
        daysUntilExpiry: 60,
      });
      expect(result.html).toBeDefined();
    });

    it("handles optional moduleType", async () => {
      const result = await renderDocumentExpiry({
        ...baseData,
        moduleType: "authorization",
      });
      expect(result.html).toBeDefined();
    });

    it("handles optional regulatoryRef", async () => {
      const result = await renderDocumentExpiry({
        ...baseData,
        regulatoryRef: "Art. 15(2) EU Space Act",
      });
      expect(result.html).toBeDefined();
    });

    it("handles category formatting", async () => {
      const result = await renderDocumentExpiry({
        ...baseData,
        category: "space_debris_plan",
      });
      expect(result.html).toBeDefined();
    });
  });

  describe("component rendering", () => {
    it("renders greeting with recipient name", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDocumentExpiry(baseData);
      const element = mockFn.mock.calls[0][0];
      const { getByText } = render(element);
      expect(getByText("Hello Bob,")).toBeDefined();
    });

    it("renders document name in the card", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDocumentExpiry(baseData);
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("ISO 27001 Certificate");
    });

    it("renders EXPIRED badge when daysUntilExpiry <= 0", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDocumentExpiry({ ...baseData, daysUntilExpiry: 0 });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("EXPIRED");
      expect(container.innerHTML).toContain("Document Has Expired");
      expect(container.innerHTML).toContain("Expired");
    });

    it("renders days badge when daysUntilExpiry > 0", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDocumentExpiry({ ...baseData, daysUntilExpiry: 15 });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("15 DAYS");
      expect(container.innerHTML).toContain("Expiring Soon");
    });

    it("renders urgent message for daysUntilExpiry <= 7 and > 0", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDocumentExpiry({ ...baseData, daysUntilExpiry: 5 });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Document Expires in 5 Days");
      expect(container.innerHTML).toContain("urgent attention");
    });

    it("renders 14-day message for daysUntilExpiry 8-14", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDocumentExpiry({ ...baseData, daysUntilExpiry: 10 });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Document Expires in 10 Days");
      expect(container.innerHTML).toContain("expiring soon");
    });

    it("renders 30-day message for daysUntilExpiry 15-30", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDocumentExpiry({ ...baseData, daysUntilExpiry: 25 });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Document Expires in 25 Days");
      expect(container.innerHTML).toContain("advance notice");
    });

    it("renders far future message for daysUntilExpiry > 30", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDocumentExpiry({ ...baseData, daysUntilExpiry: 60 });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Document Expires in 60 Days");
      expect(container.innerHTML).toContain("early reminder");
    });

    it("renders moduleType when provided", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDocumentExpiry({
        ...baseData,
        moduleType: "authorization",
      });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Authorization Module");
    });

    it("does not render moduleType when not provided", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDocumentExpiry(baseData);
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).not.toContain("Module");
    });

    it("renders regulatoryRef when provided", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDocumentExpiry({
        ...baseData,
        regulatoryRef: "Art. 15(2) EU Space Act",
      });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Regulatory Reference");
      expect(container.innerHTML).toContain("Art. 15(2) EU Space Act");
    });

    it("does not render regulatoryRef when not provided", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDocumentExpiry(baseData);
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).not.toContain("Regulatory Reference");
    });

    it("renders recommended actions list", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDocumentExpiry(baseData);
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Recommended Actions");
      expect(container.innerHTML).toContain("Review the document");
    });

    it("renders CTA button with documents URL", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDocumentExpiry(baseData);
      const element = mockFn.mock.calls[0][0];
      const { getByText } = render(element);
      const button = getByText("View Document");
      expect(button.getAttribute("href")).toBe(
        "https://caelex.io/dashboard/documents",
      );
    });

    it("renders notification settings link", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDocumentExpiry(baseData);
      const element = mockFn.mock.calls[0][0];
      const { getByText } = render(element);
      const link = getByText("notification settings");
      expect(link.getAttribute("href")).toContain("/dashboard/settings");
    });

    it("formats category with underscores", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDocumentExpiry({
        ...baseData,
        category: "space_debris_plan",
      });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Space Debris Plan");
    });

    it("renders preview text with document info", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDocumentExpiry(baseData);
      const element = mockFn.mock.calls[0][0];
      const { getByTestId } = render(element);
      const layout = getByTestId("base-layout");
      expect(layout.getAttribute("data-preview")).toContain(
        "ISO 27001 Certificate",
      );
      expect(layout.getAttribute("data-preview")).toContain("20 days");
    });
  });
});
