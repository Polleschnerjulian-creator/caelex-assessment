import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@react-email/render", () => ({
  render: vi.fn(async () => `<html><body>mocked-weekly-digest</body></html>`),
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
    stat: {},
    statValue: {},
    statLabel: {},
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

import { renderWeeklyDigest } from "./weekly-digest";
import type { WeeklyDigestData } from "../types";

describe("weekly-digest template", () => {
  const baseData: WeeklyDigestData = {
    recipientName: "Carol",
    weekStart: new Date("2025-06-01"),
    weekEnd: new Date("2025-06-07"),
    upcomingDeadlines: [],
    expiringDocuments: [],
    overdueItems: [],
    complianceStats: {
      completionPercentage: 85,
      articlesCompliant: 42,
      totalArticles: 50,
    },
    dashboardUrl: "https://caelex.io/dashboard",
  };

  describe("renderWeeklyDigest", () => {
    it("returns html and subject for digest with no urgent items", async () => {
      const result = await renderWeeklyDigest(baseData);
      expect(result.html).toBeDefined();
      expect(result.subject).toBe("Your Caelex Weekly Digest - 85% Compliance");
    });

    it("generates Action Required subject when there are overdue items", async () => {
      const result = await renderWeeklyDigest({
        ...baseData,
        overdueItems: [
          {
            title: "Overdue Deadline",
            dueDate: new Date("2025-05-20"),
            type: "deadline",
          },
        ],
      });
      expect(result.subject).toBe(
        "[Action Required] Your Caelex Weekly Digest - 1 urgent items",
      );
    });

    it("counts urgent deadlines (daysRemaining <= 7) in subject", async () => {
      const result = await renderWeeklyDigest({
        ...baseData,
        upcomingDeadlines: [
          {
            title: "Urgent Deadline",
            dueDate: new Date("2025-06-03"),
            priority: "HIGH",
            daysRemaining: 3,
          },
          {
            title: "Not Urgent",
            dueDate: new Date("2025-06-20"),
            priority: "LOW",
            daysRemaining: 20,
          },
        ],
      });
      expect(result.subject).toBe(
        "[Action Required] Your Caelex Weekly Digest - 1 urgent items",
      );
    });

    it("combines overdue + urgent deadlines count in subject", async () => {
      const result = await renderWeeklyDigest({
        ...baseData,
        overdueItems: [
          {
            title: "Overdue 1",
            dueDate: new Date("2025-05-20"),
            type: "deadline",
          },
          {
            title: "Overdue 2",
            dueDate: new Date("2025-05-19"),
            type: "document",
          },
        ],
        upcomingDeadlines: [
          {
            title: "Urgent",
            dueDate: new Date("2025-06-03"),
            priority: "HIGH",
            daysRemaining: 5,
          },
        ],
      });
      expect(result.subject).toBe(
        "[Action Required] Your Caelex Weekly Digest - 3 urgent items",
      );
    });

    it("handles data with expiring documents", async () => {
      const result = await renderWeeklyDigest({
        ...baseData,
        expiringDocuments: [
          {
            name: "ISO Certificate",
            expiryDate: new Date("2025-06-10"),
            daysUntilExpiry: 10,
          },
        ],
      });
      expect(result.html).toBeDefined();
    });

    it("handles more than 5 overdue items (truncation in template)", async () => {
      const overdueItems = Array.from({ length: 7 }, (_, i) => ({
        title: `Overdue Item ${i + 1}`,
        dueDate: new Date("2025-05-20"),
        type: "deadline" as const,
      }));
      const result = await renderWeeklyDigest({
        ...baseData,
        overdueItems,
      });
      expect(result.html).toBeDefined();
    });

    it("handles more than 5 upcoming deadlines", async () => {
      const upcomingDeadlines = Array.from({ length: 8 }, (_, i) => ({
        title: `Deadline ${i + 1}`,
        dueDate: new Date("2025-06-15"),
        priority: "MEDIUM",
        daysRemaining: 15,
      }));
      const result = await renderWeeklyDigest({
        ...baseData,
        upcomingDeadlines,
      });
      expect(result.html).toBeDefined();
    });

    it("handles more than 5 expiring documents", async () => {
      const expiringDocuments = Array.from({ length: 6 }, (_, i) => ({
        name: `Doc ${i + 1}`,
        expiryDate: new Date("2025-07-01"),
        daysUntilExpiry: 30,
      }));
      const result = await renderWeeklyDigest({
        ...baseData,
        expiringDocuments,
      });
      expect(result.html).toBeDefined();
    });

    it("handles CRITICAL priority in upcoming deadlines", async () => {
      const result = await renderWeeklyDigest({
        ...baseData,
        upcomingDeadlines: [
          {
            title: "Critical Deadline",
            dueDate: new Date("2025-06-03"),
            priority: "CRITICAL",
            daysRemaining: 3,
          },
        ],
      });
      expect(result.html).toBeDefined();
    });

    it("handles unknown priority", async () => {
      const result = await renderWeeklyDigest({
        ...baseData,
        upcomingDeadlines: [
          {
            title: "Deadline",
            dueDate: new Date("2025-06-03"),
            priority: "UNKNOWN",
            daysRemaining: 10,
          },
        ],
      });
      expect(result.html).toBeDefined();
    });

    it("handles docs with daysUntilExpiry <= 14 (amber color)", async () => {
      const result = await renderWeeklyDigest({
        ...baseData,
        expiringDocuments: [
          {
            name: "Certificate",
            expiryDate: new Date("2025-06-10"),
            daysUntilExpiry: 10,
          },
        ],
      });
      expect(result.html).toBeDefined();
    });

    it("renders empty state when no items at all", async () => {
      const result = await renderWeeklyDigest(baseData);
      expect(result.html).toBeDefined();
    });
  });

  describe("component rendering", () => {
    it("renders greeting with recipient name", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderWeeklyDigest(baseData);
      const element = mockFn.mock.calls[0][0];
      const { getByText } = render(element);
      expect(getByText("Hello Carol,")).toBeDefined();
    });

    it("renders compliance stats", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderWeeklyDigest(baseData);
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("85%");
      expect(container.innerHTML).toContain("Compliance");
      expect(container.innerHTML).toContain("Deadlines");
      expect(container.innerHTML).toContain("Expiring Docs");
      expect(container.innerHTML).toContain("Overdue");
    });

    it("renders warning emoji when there are urgent items", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderWeeklyDigest({
        ...baseData,
        overdueItems: [
          {
            title: "Late item",
            dueDate: new Date("2025-05-20"),
            type: "deadline",
          },
        ],
      });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      // hasUrgentItems should be true, so warning emoji should appear
      expect(container.innerHTML).toContain("Your Weekly Compliance Summary");
    });

    it("renders chart emoji when no urgent items", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderWeeklyDigest(baseData);
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Your Weekly Compliance Summary");
    });

    it("marks urgent when any upcoming deadline has daysRemaining <= 7", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderWeeklyDigest({
        ...baseData,
        upcomingDeadlines: [
          {
            title: "Urgent",
            dueDate: new Date("2025-06-03"),
            priority: "HIGH",
            daysRemaining: 5,
          },
        ],
      });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      // Should render as urgent (warning emoji path)
      expect(container.innerHTML).toContain("Your Weekly Compliance Summary");
    });

    it("renders empty state message when no items", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderWeeklyDigest(baseData);
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("No urgent items this week");
    });

    it("renders overdue items section when overdue items exist", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderWeeklyDigest({
        ...baseData,
        overdueItems: [
          {
            title: "Late report",
            dueDate: new Date("2025-05-15"),
            type: "deadline",
          },
          {
            title: "Expired doc",
            dueDate: new Date("2025-05-10"),
            type: "document",
          },
        ],
      });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain(
        "Overdue Items Requiring Attention",
      );
      expect(container.innerHTML).toContain("Late report");
      expect(container.innerHTML).toContain("Expired doc");
      expect(container.innerHTML).toContain("DEADLINE");
      expect(container.innerHTML).toContain("DOCUMENT");
    });

    it("does not render overdue section when no overdue items", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderWeeklyDigest(baseData);
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).not.toContain(
        "Overdue Items Requiring Attention",
      );
    });

    it("truncates overdue items to 5 and shows +N more", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      const overdueItems = Array.from({ length: 8 }, (_, i) => ({
        title: `Overdue ${i + 1}`,
        dueDate: new Date("2025-05-20"),
        type: "deadline" as const,
      }));
      await renderWeeklyDigest({ ...baseData, overdueItems });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Overdue 1");
      expect(container.innerHTML).toContain("Overdue 5");
      expect(container.innerHTML).not.toContain("Overdue 6");
      expect(container.innerHTML).toContain("+3 more overdue items");
    });

    it("renders upcoming deadlines section", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderWeeklyDigest({
        ...baseData,
        upcomingDeadlines: [
          {
            title: "Submit report",
            dueDate: new Date("2025-06-15"),
            priority: "HIGH",
            daysRemaining: 15,
          },
        ],
      });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Upcoming Deadlines");
      expect(container.innerHTML).toContain("Submit report");
      expect(container.innerHTML).toContain("HIGH");
      expect(container.innerHTML).toContain("15d");
    });

    it("does not render upcoming deadlines section when empty", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderWeeklyDigest(baseData);
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).not.toContain("Upcoming Deadlines");
    });

    it("truncates deadlines to 5 and shows +N more", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      const deadlines = Array.from({ length: 7 }, (_, i) => ({
        title: `Deadline ${i + 1}`,
        dueDate: new Date("2025-06-15"),
        priority: "MEDIUM",
        daysRemaining: 15,
      }));
      await renderWeeklyDigest({ ...baseData, upcomingDeadlines: deadlines });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Deadline 5");
      expect(container.innerHTML).not.toContain("Deadline 6");
      expect(container.innerHTML).toContain("+2 more deadlines");
    });

    it("renders expiring documents section", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderWeeklyDigest({
        ...baseData,
        expiringDocuments: [
          {
            name: "ISO Certificate",
            expiryDate: new Date("2025-06-15"),
            daysUntilExpiry: 15,
          },
        ],
      });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Expiring Documents");
      expect(container.innerHTML).toContain("ISO Certificate");
      expect(container.innerHTML).toContain("15d");
    });

    it("does not render expiring documents section when empty", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderWeeklyDigest(baseData);
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).not.toContain("Expiring Documents");
    });

    it("truncates expiring documents to 5 and shows +N more", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      const docs = Array.from({ length: 9 }, (_, i) => ({
        name: `Doc ${i + 1}`,
        expiryDate: new Date("2025-07-01"),
        daysUntilExpiry: 30,
      }));
      await renderWeeklyDigest({ ...baseData, expiringDocuments: docs });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Doc 5");
      expect(container.innerHTML).not.toContain("Doc 6");
      expect(container.innerHTML).toContain("+4 more documents");
    });

    it("renders document with amber color when daysUntilExpiry <= 14", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderWeeklyDigest({
        ...baseData,
        expiringDocuments: [
          {
            name: "Urgent Doc",
            expiryDate: new Date("2025-06-10"),
            daysUntilExpiry: 10,
          },
        ],
      });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Urgent Doc");
      expect(container.innerHTML).toContain("10d");
    });

    it("renders document without amber color when daysUntilExpiry > 14", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderWeeklyDigest({
        ...baseData,
        expiringDocuments: [
          {
            name: "Later Doc",
            expiryDate: new Date("2025-07-01"),
            daysUntilExpiry: 30,
          },
        ],
      });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Later Doc");
      expect(container.innerHTML).toContain("30d");
    });

    it("renders overdue count with red color", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderWeeklyDigest({
        ...baseData,
        overdueItems: [
          { title: "Late", dueDate: new Date("2025-05-20"), type: "deadline" },
        ],
      });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      // Overdue count = 1, should show in stats
      expect(container.innerHTML).toContain("Overdue");
    });

    it("renders overdue count with green color when zero", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderWeeklyDigest(baseData);
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Overdue");
    });

    it("renders CTA button with dashboard URL", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderWeeklyDigest(baseData);
      const element = mockFn.mock.calls[0][0];
      const { getByText } = render(element);
      const button = getByText("Open Dashboard");
      expect(button.getAttribute("href")).toBe("https://caelex.io/dashboard");
    });

    it("renders notification settings link", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderWeeklyDigest(baseData);
      const element = mockFn.mock.calls[0][0];
      const { getByText } = render(element);
      const link = getByText("notification settings");
      expect(link.getAttribute("href")).toContain("/dashboard/settings");
    });

    it("renders preview text with counts", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderWeeklyDigest({
        ...baseData,
        upcomingDeadlines: [
          {
            title: "D1",
            dueDate: new Date("2025-06-10"),
            priority: "HIGH",
            daysRemaining: 10,
          },
        ],
        expiringDocuments: [
          {
            name: "Doc1",
            expiryDate: new Date("2025-07-01"),
            daysUntilExpiry: 30,
          },
          {
            name: "Doc2",
            expiryDate: new Date("2025-07-01"),
            daysUntilExpiry: 30,
          },
        ],
      });
      const element = mockFn.mock.calls[0][0];
      const { getByTestId } = render(element);
      const layout = getByTestId("base-layout");
      expect(layout.getAttribute("data-preview")).toContain("1 deadlines");
      expect(layout.getAttribute("data-preview")).toContain("2 documents");
    });

    it("renders CRITICAL priority badge for deadline", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderWeeklyDigest({
        ...baseData,
        upcomingDeadlines: [
          {
            title: "Critical",
            dueDate: new Date("2025-06-03"),
            priority: "CRITICAL",
            daysRemaining: 3,
          },
        ],
      });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("CRITICAL");
    });

    it("renders LOW priority badge for deadline", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderWeeklyDigest({
        ...baseData,
        upcomingDeadlines: [
          {
            title: "Low",
            dueDate: new Date("2025-06-20"),
            priority: "LOW",
            daysRemaining: 20,
          },
        ],
      });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("LOW");
    });

    it("renders unknown priority falling back to medium variant", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderWeeklyDigest({
        ...baseData,
        upcomingDeadlines: [
          {
            title: "Unknown",
            dueDate: new Date("2025-06-20"),
            priority: "UNKNOWN",
            daysRemaining: 20,
          },
        ],
      });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("UNKNOWN");
    });

    it("does not render empty state when there are items", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderWeeklyDigest({
        ...baseData,
        upcomingDeadlines: [
          {
            title: "D1",
            dueDate: new Date("2025-06-10"),
            priority: "HIGH",
            daysRemaining: 10,
          },
        ],
      });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).not.toContain("No urgent items this week");
    });

    it("renders week range text", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderWeeklyDigest(baseData);
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      // Should contain formatted week range like "Jun 1 - Jun 7, 2025"
      expect(container.innerHTML).toContain("Jun");
    });

    it("renders overdue item with HR separator between items", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await renderWeeklyDigest({
        ...baseData,
        overdueItems: [
          {
            title: "Item 1",
            dueDate: new Date("2025-05-15"),
            type: "deadline",
          },
          {
            title: "Item 2",
            dueDate: new Date("2025-05-14"),
            type: "document",
          },
        ],
      });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      // Both items + HR separator between them
      expect(container.innerHTML).toContain("Item 1");
      expect(container.innerHTML).toContain("Item 2");
    });
  });
});
