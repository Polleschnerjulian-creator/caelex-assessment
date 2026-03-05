import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

// Mock sendEmail before importing the module
const mockSendEmail = vi.fn().mockResolvedValue({ success: true });
vi.mock("./index", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

// Mock react-email render to capture the React element
vi.mock("@react-email/render", () => ({
  render: vi.fn().mockResolvedValue("<html>rendered email</html>"),
}));

// Mock react-email components
vi.mock("@react-email/components", () => ({
  Body: ({ children, ...props }: any) => (
    <div data-testid="body" {...props}>
      {children}
    </div>
  ),
  Container: ({ children, ...props }: any) => (
    <div data-testid="container" {...props}>
      {children}
    </div>
  ),
  Head: () => <div data-testid="head" />,
  Heading: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
  Html: ({ children }: any) => <div data-testid="html">{children}</div>,
  Link: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  Preview: ({ children }: any) => <div data-testid="preview">{children}</div>,
  Section: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Text: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  Hr: (props: any) => <hr {...props} />,
  Row: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Column: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

import { sendSuspiciousLoginEmail } from "./suspicious-login";

describe("suspicious-login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseProps = {
    email: "user@example.com",
    name: "Alice",
    device: "Chrome on macOS",
    location: "Berlin, Germany",
    ipAddress: "192.168.1.1",
    time: new Date("2025-06-01T12:00:00Z"),
    reasons: ["New device", "New location"],
  };

  describe("sendSuspiciousLoginEmail", () => {
    it("renders the email and calls sendEmail with correct parameters", async () => {
      await sendSuspiciousLoginEmail(baseProps);

      expect(mockSendEmail).toHaveBeenCalledWith({
        to: "user@example.com",
        subject: "Security Alert: New login to your Caelex account",
        html: expect.any(String),
      });
    });

    it("sends email without name (uses 'there' fallback)", async () => {
      await sendSuspiciousLoginEmail({
        ...baseProps,
        name: undefined,
      });

      expect(mockSendEmail).toHaveBeenCalledTimes(1);
    });

    it("handles empty reasons array", async () => {
      await sendSuspiciousLoginEmail({
        ...baseProps,
        reasons: [],
      });

      expect(mockSendEmail).toHaveBeenCalledTimes(1);
    });

    it("handles multiple reasons", async () => {
      await sendSuspiciousLoginEmail({
        ...baseProps,
        reasons: [
          "New device detected",
          "Unusual location",
          "Suspicious IP address",
        ],
      });

      expect(mockSendEmail).toHaveBeenCalledTimes(1);
    });
  });

  describe("component rendering", () => {
    it("renders greeting with name", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await sendSuspiciousLoginEmail(baseProps);
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Hi Alice,");
    });

    it("renders 'there' when name is not provided", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await sendSuspiciousLoginEmail({ ...baseProps, name: undefined });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Hi there,");
    });

    it("renders Security Alert heading", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await sendSuspiciousLoginEmail(baseProps);
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Security Alert");
    });

    it("renders device info", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await sendSuspiciousLoginEmail(baseProps);
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Device:");
      expect(container.innerHTML).toContain("Chrome on macOS");
    });

    it("renders location info", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await sendSuspiciousLoginEmail(baseProps);
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Location:");
      expect(container.innerHTML).toContain("Berlin, Germany");
    });

    it("renders IP address", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await sendSuspiciousLoginEmail(baseProps);
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("IP Address:");
      expect(container.innerHTML).toContain("192.168.1.1");
    });

    it("renders formatted time", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await sendSuspiciousLoginEmail(baseProps);
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Time:");
      // The formatted date should contain 2025
      expect(container.innerHTML).toContain("2025");
    });

    it("renders reasons section when reasons are non-empty", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await sendSuspiciousLoginEmail(baseProps);
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Why this is flagged:");
      expect(container.innerHTML).toContain("New device");
      expect(container.innerHTML).toContain("New location");
    });

    it("does not render reasons section when reasons array is empty", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await sendSuspiciousLoginEmail({ ...baseProps, reasons: [] });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).not.toContain("Why this is flagged:");
    });

    it("renders multiple reasons as list items", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await sendSuspiciousLoginEmail({
        ...baseProps,
        reasons: ["Reason 1", "Reason 2", "Reason 3"],
      });
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("Reason 1");
      expect(container.innerHTML).toContain("Reason 2");
      expect(container.innerHTML).toContain("Reason 3");
    });

    it("renders password reset link", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await sendSuspiciousLoginEmail(baseProps);
      const element = mockFn.mock.calls[0][0];
      const { getByText } = render(element);
      const link = getByText("Change your password");
      expect(link.getAttribute("href")).toBe(
        "https://caelex.app/auth/reset-password",
      );
    });

    it("renders review sessions link", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await sendSuspiciousLoginEmail(baseProps);
      const element = mockFn.mock.calls[0][0];
      const { getByText } = render(element);
      const link = getByText("Review your active sessions");
      expect(link.getAttribute("href")).toBe(
        "https://caelex.app/dashboard/settings",
      );
    });

    it("renders 2FA link", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await sendSuspiciousLoginEmail(baseProps);
      const element = mockFn.mock.calls[0][0];
      const { getByText } = render(element);
      const link = getByText("Enable two-factor authentication");
      expect(link.getAttribute("href")).toBe(
        "https://caelex.app/dashboard/settings",
      );
    });

    it("renders notification preferences link", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await sendSuspiciousLoginEmail(baseProps);
      const element = mockFn.mock.calls[0][0];
      const { getByText } = render(element);
      const link = getByText("Manage notification preferences");
      expect(link.getAttribute("href")).toBe(
        "https://caelex.app/dashboard/settings",
      );
    });

    it("renders new login detected text", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await sendSuspiciousLoginEmail(baseProps);
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("New login detected");
    });

    it("renders automated security alert footer", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await sendSuspiciousLoginEmail(baseProps);
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain(
        "automated security alert from Caelex",
      );
    });

    it("renders unauthorized access warning", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await sendSuspiciousLoginEmail(baseProps);
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain("someone else may have");
    });

    it("renders preview text with device and location", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await sendSuspiciousLoginEmail(baseProps);
      const element = mockFn.mock.calls[0][0];
      const { getByTestId } = render(element);
      const preview = getByTestId("preview");
      expect(preview.textContent).toContain("Chrome on macOS");
      expect(preview.textContent).toContain("Berlin, Germany");
    });

    it("renders the sign-in explanation text", async () => {
      const { render: mockRender } = await import("@react-email/render");
      const mockFn = mockRender as ReturnType<typeof vi.fn>;
      mockFn.mockClear();

      await sendSuspiciousLoginEmail(baseProps);
      const element = mockFn.mock.calls[0][0];
      const { container } = render(element);
      expect(container.innerHTML).toContain(
        "We detected a new sign-in to your Caelex account",
      );
    });
  });
});
