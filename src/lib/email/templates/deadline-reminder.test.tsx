import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// Mock react-email render for the renderDeadlineReminder export function
vi.mock("@react-email/render", () => ({
  render: vi.fn(async () => `<html><body>mocked-deadline-email</body></html>`),
}));

// Mock react-email components to simple HTML elements for RTL rendering
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

// Mock base layout to pass through children so we can test the component rendering
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

import { renderDeadlineReminder } from "./deadline-reminder";
import type { DeadlineReminderData } from "../types";

// We need to access the internal component for direct rendering tests.
// Since DeadlineReminderEmail is not exported, we test it indirectly through
// renderDeadlineReminder for subject line tests, and we also re-import the module
// to get the component rendered via the mocked render function.

describe("deadline-reminder template", () => {
  const baseData: DeadlineReminderData = {
    recipientName: "Alice",
    deadlineTitle: "DORA Compliance Report",
    dueDate: new Date("2025-06-15"),
    daysRemaining: 10,
    priority: "HIGH",
    category: "cybersecurity",
    dashboardUrl: "https://caelex.io/dashboard",
  };

  describe("renderDeadlineReminder", () => {
    it("returns html and subject for a standard deadline", async () => {
      const result = await renderDeadlineReminder(baseData);
      expect(result.html).toBeDefined();
      expect(result.subject).toBe(
        "Reminder: DORA Compliance Report - Due in 10 days",
      );
    });

    it("generates OVERDUE subject when daysRemaining <= 0", async () => {
      const result = await renderDeadlineReminder({
        ...baseData,
        daysRemaining: 0,
      });
      expect(result.subject).toBe("[OVERDUE] DORA Compliance Report");
    });

    it("generates OVERDUE subject for negative daysRemaining", async () => {
      const result = await renderDeadlineReminder({
        ...baseData,
        daysRemaining: -3,
      });
      expect(result.subject).toBe("[OVERDUE] DORA Compliance Report");
    });

    it("generates URGENT subject when daysRemaining is 1", async () => {
      const result = await renderDeadlineReminder({
        ...baseData,
        daysRemaining: 1,
      });
      expect(result.subject).toBe(
        "[URGENT] DORA Compliance Report - Due in 1 days",
      );
    });

    it("generates URGENT subject when daysRemaining is 3", async () => {
      const result = await renderDeadlineReminder({
        ...baseData,
        daysRemaining: 3,
      });
      expect(result.subject).toBe(
        "[URGENT] DORA Compliance Report - Due in 3 days",
      );
    });

    it("generates Reminder subject when daysRemaining > 3", async () => {
      const result = await renderDeadlineReminder({
        ...baseData,
        daysRemaining: 7,
      });
      expect(result.subject).toBe(
        "Reminder: DORA Compliance Report - Due in 7 days",
      );
    });

    it("handles data with optional regulatoryRef", async () => {
      const result = await renderDeadlineReminder({
        ...baseData,
        regulatoryRef: "Art. 10(3) EU Space Act",
      });
      expect(result.html).toBeDefined();
    });

    it("handles data with penaltyInfo and daysRemaining <= 7", async () => {
      const result = await renderDeadlineReminder({
        ...baseData,
        daysRemaining: 5,
        penaltyInfo: "Non-compliance fine up to EUR 10M",
      });
      expect(result.html).toBeDefined();
    });

    it("handles data with description", async () => {
      const result = await renderDeadlineReminder({
        ...baseData,
        description: "This is a description for the deadline.",
      });
      expect(result.html).toBeDefined();
    });

    it("handles long description (>150 chars)", async () => {
      const result = await renderDeadlineReminder({
        ...baseData,
        description: "A".repeat(200),
      });
      expect(result.html).toBeDefined();
    });

    it("handles CRITICAL priority", async () => {
      const result = await renderDeadlineReminder({
        ...baseData,
        priority: "CRITICAL",
      });
      expect(result.html).toBeDefined();
    });

    it("handles LOW priority", async () => {
      const result = await renderDeadlineReminder({
        ...baseData,
        priority: "LOW",
      });
      expect(result.html).toBeDefined();
    });

    it("handles unknown priority (falls back to medium)", async () => {
      const result = await renderDeadlineReminder({
        ...baseData,
        priority: "UNKNOWN",
      });
      expect(result.html).toBeDefined();
    });

    it("handles daysRemaining = 14 (two week notice)", async () => {
      const result = await renderDeadlineReminder({
        ...baseData,
        daysRemaining: 14,
      });
      expect(result.subject).toContain("Reminder");
    });

    it("handles daysRemaining > 14 (advance notice)", async () => {
      const result = await renderDeadlineReminder({
        ...baseData,
        daysRemaining: 30,
      });
      expect(result.subject).toContain("Reminder");
    });

    it("handles category formatting with underscores", async () => {
      const result = await renderDeadlineReminder({
        ...baseData,
        category: "cyber_security_audit",
      });
      expect(result.html).toBeDefined();
    });
  });

  describe("component rendering", () => {
    // We access the component by importing and calling renderDeadlineReminder
    // which invokes the component. But since render is mocked, we need a
    // different approach to test the JSX. We'll capture what was passed to
    // the mocked render function.

    it("renders the component with the mocked render capturing JSX", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDeadlineReminder(baseData);

      // The mock was called with a React element
      expect(mockFn).toHaveBeenCalledTimes(1);
      const element = mockFn.mock.calls[0][0];

      // Now render this element with RTL to test the actual JSX output
      const { container, getByText } = render(element);
      expect(getByText("Hello Alice,")).toBeDefined();
      expect(getByText("DORA Compliance Report")).toBeDefined();
      expect(container.innerHTML).toContain("Cybersecurity");
    });

    it("renders greeting with recipientName", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDeadlineReminder(baseData);
      const element = mockFn.mock.calls[0][0];
      const { getByText } = render(element);
      expect(getByText("Hello Alice,")).toBeDefined();
    });

    it("renders overdue urgency message when daysRemaining <= 0", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDeadlineReminder({ ...baseData, daysRemaining: 0 });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Deadline Overdue");
      expect(container.innerHTML).toContain("immediate action");
    });

    it("renders tomorrow urgency message when daysRemaining is 1", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDeadlineReminder({ ...baseData, daysRemaining: 1 });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Deadline Tomorrow");
    });

    it("renders 3-day urgency when daysRemaining is 2-3", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDeadlineReminder({ ...baseData, daysRemaining: 2 });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Deadline in 2 Days");
      expect(container.innerHTML).toContain("urgent attention");
    });

    it("renders weekly urgency when daysRemaining is 4-7", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDeadlineReminder({ ...baseData, daysRemaining: 5 });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Deadline in 5 Days");
      expect(container.innerHTML).toContain("approaching this week");
    });

    it("renders two-week urgency when daysRemaining is 8-14", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDeadlineReminder({ ...baseData, daysRemaining: 12 });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Deadline in 12 Days");
      expect(container.innerHTML).toContain("next two weeks");
    });

    it("renders advance notice when daysRemaining > 14", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDeadlineReminder({ ...baseData, daysRemaining: 30 });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Deadline in 30 Days");
      expect(container.innerHTML).toContain("advance notice");
    });

    it("renders description when provided", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDeadlineReminder({
        ...baseData,
        description: "Review compliance status",
      });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Review compliance status");
    });

    it("truncates long description to 150 chars with ellipsis", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      const longDesc = "A".repeat(200);
      await renderDeadlineReminder({
        ...baseData,
        description: longDesc,
      });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("A".repeat(150) + "...");
      expect(container.innerHTML).not.toContain("A".repeat(200));
    });

    it("does not render description section when not provided", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDeadlineReminder(baseData);
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      // There should be no description text (just deadline title, date, etc.)
      expect(container.innerHTML).not.toContain("...");
    });

    it("renders regulatoryRef when provided", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDeadlineReminder({
        ...baseData,
        regulatoryRef: "Art. 10(3) EU Space Act",
      });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Regulatory Reference");
      expect(container.innerHTML).toContain("Art. 10(3) EU Space Act");
    });

    it("does not render regulatoryRef when not provided", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDeadlineReminder(baseData);
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).not.toContain("Regulatory Reference");
    });

    it("renders penalty warning when penaltyInfo provided and daysRemaining <= 7", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDeadlineReminder({
        ...baseData,
        daysRemaining: 5,
        penaltyInfo: "Non-compliance fine up to EUR 10M",
      });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain(
        "Non-compliance fine up to EUR 10M",
      );
    });

    it("does not render penalty warning when daysRemaining > 7 even with penaltyInfo", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDeadlineReminder({
        ...baseData,
        daysRemaining: 10,
        penaltyInfo: "Non-compliance fine up to EUR 10M",
      });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).not.toContain("Non-compliance fine");
    });

    it("does not render penalty warning when penaltyInfo is not provided", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDeadlineReminder({
        ...baseData,
        daysRemaining: 3,
      });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).not.toContain("Important:");
    });

    it("formats multi-word category with underscores correctly", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDeadlineReminder({
        ...baseData,
        category: "space_debris",
      });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Space Debris");
    });

    it("renders CTA button linking to dashboardUrl", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDeadlineReminder(baseData);
      const element = mockFn.mock.calls[0][0];
      const { getByText } = render(element);
      const button = getByText("View Deadline Details");
      expect(button).toBeDefined();
      expect(button.getAttribute("href")).toBe("https://caelex.io/dashboard");
    });

    it("renders preview text with deadline info", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDeadlineReminder(baseData);
      const element = mockFn.mock.calls[0][0];
      const { getByTestId } = render(element);
      const layout = getByTestId("base-layout");
      expect(layout.getAttribute("data-preview")).toContain(
        "DORA Compliance Report",
      );
      expect(layout.getAttribute("data-preview")).toContain("10 days");
    });

    it("renders MEDIUM priority badge for MEDIUM priority", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDeadlineReminder({ ...baseData, priority: "MEDIUM" });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("MEDIUM");
    });

    it("renders settings link from dashboardUrl", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderDeadlineReminder(baseData);
      const element = mockFn.mock.calls[0][0];
      const { getByText } = render(element);
      const settingsLink = getByText("account settings");
      expect(settingsLink.getAttribute("href")).toContain(
        "/dashboard/settings",
      );
    });
  });
});
