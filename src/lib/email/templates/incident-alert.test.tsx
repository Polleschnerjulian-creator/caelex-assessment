import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@react-email/render", () => ({
  render: vi.fn(async () => `<html><body>mocked-incident-alert</body></html>`),
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
      green500: "#22C55E",
      slate200: "#E2E8F0",
      white: "#F8FAFC",
    },
  },
}));

import { renderIncidentAlert } from "./incident-alert";
import type { IncidentAlertData } from "../types";

describe("incident-alert template", () => {
  const baseData: IncidentAlertData = {
    recipientName: "Dave",
    incidentNumber: "INC-001",
    title: "Data Breach Detected",
    severity: "medium",
    category: "cybersecurity",
    detectedAt: new Date("2025-06-01T10:00:00Z"),
    description: "A potential data breach was detected in the system.",
    dashboardUrl: "https://caelex.io/dashboard",
  };

  describe("renderIncidentAlert", () => {
    it("returns html and subject for medium severity (no prefix)", async () => {
      const result = await renderIncidentAlert(baseData);
      expect(result.html).toBeDefined();
      expect(result.subject).toBe(
        "Incident Alert: Data Breach Detected (INC-001)",
      );
    });

    it("generates CRITICAL prefix in subject for critical severity", async () => {
      const result = await renderIncidentAlert({
        ...baseData,
        severity: "critical",
      });
      expect(result.subject).toBe(
        "[CRITICAL] Incident Alert: Data Breach Detected (INC-001)",
      );
    });

    it("generates HIGH prefix in subject for high severity", async () => {
      const result = await renderIncidentAlert({
        ...baseData,
        severity: "high",
      });
      expect(result.subject).toBe(
        "[HIGH] Incident Alert: Data Breach Detected (INC-001)",
      );
    });

    it("generates no prefix for low severity", async () => {
      const result = await renderIncidentAlert({
        ...baseData,
        severity: "low",
      });
      expect(result.subject).toBe(
        "Incident Alert: Data Breach Detected (INC-001)",
      );
    });

    it("generates no prefix for unknown severity", async () => {
      const result = await renderIncidentAlert({
        ...baseData,
        severity: "unknown",
      });
      expect(result.subject).toBe(
        "Incident Alert: Data Breach Detected (INC-001)",
      );
    });

    it("handles optional ncaReportingDeadline", async () => {
      const result = await renderIncidentAlert({
        ...baseData,
        ncaReportingDeadline: new Date("2025-06-02T10:00:00Z"),
      });
      expect(result.html).toBeDefined();
    });

    it("handles no ncaReportingDeadline", async () => {
      const result = await renderIncidentAlert({
        ...baseData,
        ncaReportingDeadline: undefined,
      });
      expect(result.html).toBeDefined();
    });

    it("handles long description (>300 chars truncation in template)", async () => {
      const result = await renderIncidentAlert({
        ...baseData,
        description: "X".repeat(400),
      });
      expect(result.html).toBeDefined();
    });

    it("handles empty description", async () => {
      const result = await renderIncidentAlert({
        ...baseData,
        description: "",
      });
      expect(result.html).toBeDefined();
    });

    it("handles category formatting", async () => {
      const result = await renderIncidentAlert({
        ...baseData,
        category: "data_breach_alert",
      });
      expect(result.html).toBeDefined();
    });
  });

  describe("component rendering", () => {
    it("renders greeting with recipient name", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderIncidentAlert(baseData);
      const element = mockFn.mock.calls[0][0];
      const { getByText } = render(element);
      expect(getByText("Hello Dave,")).toBeDefined();
    });

    it("renders incident title and number", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderIncidentAlert(baseData);
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Data Breach Detected");
      expect(container.innerHTML).toContain("INC-001");
    });

    it("renders Incident Detected heading", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderIncidentAlert(baseData);
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Incident Detected");
    });

    it("renders critical severity emoji", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderIncidentAlert({ ...baseData, severity: "critical" });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("CRITICAL");
    });

    it("renders high severity badge", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderIncidentAlert({ ...baseData, severity: "high" });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("HIGH");
    });

    it("renders low severity badge", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderIncidentAlert({ ...baseData, severity: "low" });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("LOW");
    });

    it("renders unknown severity with fallback medium variant", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderIncidentAlert({ ...baseData, severity: "unknown" });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("UNKNOWN");
    });

    it("renders description when provided", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderIncidentAlert(baseData);
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Description");
      expect(container.innerHTML).toContain("potential data breach");
    });

    it("truncates long description to 300 chars", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      const longDesc = "B".repeat(400);
      await renderIncidentAlert({ ...baseData, description: longDesc });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("B".repeat(300) + "...");
      expect(container.innerHTML).not.toContain("B".repeat(400));
    });

    it("does not render description section when description is empty", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderIncidentAlert({ ...baseData, description: "" });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      // The "Description" label should not appear for empty description
      // Note: the component checks `description &&` so empty string is falsy
      expect(container.innerHTML).not.toContain(">Description<");
    });

    it("renders NCA reporting deadline when provided", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderIncidentAlert({
        ...baseData,
        ncaReportingDeadline: new Date("2025-06-02T10:00:00Z"),
      });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("NCA Reporting Deadline");
      expect(container.innerHTML).toContain("National Competent Authority");
    });

    it("does not render NCA deadline section when not provided", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderIncidentAlert({
        ...baseData,
        ncaReportingDeadline: undefined,
      });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).not.toContain("NCA Reporting Deadline");
    });

    it("renders NCA report action item for critical severity", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderIncidentAlert({ ...baseData, severity: "critical" });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Prepare NCA incident report");
    });

    it("renders NCA report action item for high severity", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderIncidentAlert({ ...baseData, severity: "high" });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Prepare NCA incident report");
    });

    it("does not render NCA report action for medium severity", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderIncidentAlert({ ...baseData, severity: "medium" });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).not.toContain("Prepare NCA incident report");
    });

    it("does not render NCA report action for low severity", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderIncidentAlert({ ...baseData, severity: "low" });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).not.toContain("Prepare NCA incident report");
    });

    it("renders formatted category", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderIncidentAlert({
        ...baseData,
        category: "data_breach_alert",
      });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Data Breach Alert");
    });

    it("renders regulatory reference text", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderIncidentAlert(baseData);
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("EU Space Act");
      expect(container.innerHTML).toContain("Art. 77-79");
    });

    it("renders CTA button with incidents URL", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderIncidentAlert(baseData);
      const element = mockFn.mock.calls[0][0];
      const { getByText } = render(element);
      const button = getByText("Manage Incident");
      expect(button.getAttribute("href")).toBe(
        "https://caelex.io/dashboard/modules/supervision/incidents",
      );
    });

    it("renders notification settings link", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderIncidentAlert(baseData);
      const element = mockFn.mock.calls[0][0];
      const { getByText } = render(element);
      const link = getByText("notification settings");
      expect(link.getAttribute("href")).toContain("/dashboard/settings");
    });

    it("renders preview text with severity and title", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderIncidentAlert(baseData);
      const element = mockFn.mock.calls[0][0];
      const { getByTestId } = render(element);
      const layout = getByTestId("base-layout");
      expect(layout.getAttribute("data-preview")).toContain("MEDIUM");
      expect(layout.getAttribute("data-preview")).toContain(
        "Data Breach Detected",
      );
    });

    it("renders immediate actions required section", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderIncidentAlert(baseData);
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Immediate Actions Required");
      expect(container.innerHTML).toContain("Review the incident details");
    });
  });
});
