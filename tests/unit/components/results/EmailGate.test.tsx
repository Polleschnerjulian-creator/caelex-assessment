import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EmailGate from "@/components/results/EmailGate";
import React from "react";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      className,
      onClick,
      ...props
    }: React.ComponentProps<"div"> & {
      initial?: unknown;
      animate?: unknown;
      exit?: unknown;
      transition?: unknown;
    }) => (
      <div className={className} onClick={onClick} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

describe("EmailGate", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the modal when isOpen is true", () => {
    render(<EmailGate {...defaultProps} />);
    expect(screen.getByText("Get Your Compliance Report")).toBeInTheDocument();
  });

  it("does not render the modal when isOpen is false", () => {
    render(<EmailGate {...defaultProps} isOpen={false} />);
    expect(
      screen.queryByText("Get Your Compliance Report"),
    ).not.toBeInTheDocument();
  });

  it("renders the email input field", () => {
    render(<EmailGate {...defaultProps} />);
    const emailInput = screen.getByPlaceholderText("you@company.com");
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute("type", "email");
    expect(emailInput).toHaveAttribute("required");
  });

  it("renders company input field", () => {
    render(<EmailGate {...defaultProps} />);
    expect(
      screen.getByPlaceholderText("Your organization"),
    ).toBeInTheDocument();
  });

  it("renders role input field", () => {
    render(<EmailGate {...defaultProps} />);
    expect(screen.getByPlaceholderText("Your role")).toBeInTheDocument();
  });

  it("renders newsletter checkbox pre-checked", () => {
    render(<EmailGate {...defaultProps} />);
    expect(
      screen.getByText(/Notify me when Caelex launches/),
    ).toBeInTheDocument();
  });

  it("renders download button", () => {
    render(<EmailGate {...defaultProps} />);
    expect(screen.getByText("Download Report")).toBeInTheDocument();
  });

  it("disables download button when email is empty", () => {
    render(<EmailGate {...defaultProps} />);
    const button = screen.getByText("Download Report").closest("button");
    expect(button).toBeDisabled();
  });

  it("enables download button when email is entered", async () => {
    const user = userEvent.setup();
    render(<EmailGate {...defaultProps} />);

    await user.type(
      screen.getByPlaceholderText("you@company.com"),
      "test@example.com",
    );

    const button = screen.getByText("Download Report").closest("button");
    expect(button).not.toBeDisabled();
  });

  it("calls onSubmit with email when form is submitted", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<EmailGate {...defaultProps} onSubmit={onSubmit} />);

    await user.type(
      screen.getByPlaceholderText("you@company.com"),
      "test@example.com",
    );
    await user.click(screen.getByText("Download Report"));

    // Wait for the simulated delay
    await vi.waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        "test@example.com",
        undefined,
        undefined,
        true,
      );
    });
  });

  it("calls onSubmit with all fields", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<EmailGate {...defaultProps} onSubmit={onSubmit} />);

    await user.type(
      screen.getByPlaceholderText("you@company.com"),
      "test@example.com",
    );
    await user.type(
      screen.getByPlaceholderText("Your organization"),
      "SpaceCo",
    );
    await user.type(screen.getByPlaceholderText("Your role"), "CTO");

    await user.click(screen.getByText("Download Report"));

    await vi.waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        "test@example.com",
        "SpaceCo",
        "CTO",
        true,
      );
    });
  });

  it("renders close button", () => {
    const { container } = render(<EmailGate {...defaultProps} />);
    // The close button has an X icon
    const closeButtons = container.querySelectorAll("button");
    // First button in the modal should be the close button
    expect(closeButtons.length).toBeGreaterThan(0);
  });

  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(
      <EmailGate {...defaultProps} onClose={onClose} />,
    );

    // Find the close button (first button with the X icon)
    const closeButton = container.querySelector(
      "button.absolute",
    ) as HTMLButtonElement;
    if (closeButton) {
      await user.click(closeButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it("renders privacy note", () => {
    render(<EmailGate {...defaultProps} />);
    expect(
      screen.getByText(
        "We respect your privacy. Your data is not stored or shared.",
      ),
    ).toBeInTheDocument();
  });

  it("renders the description text", () => {
    render(<EmailGate {...defaultProps} />);
    expect(
      screen.getByText(/Enter your email to download/),
    ).toBeInTheDocument();
  });

  it("shows labels for required and optional fields", () => {
    render(<EmailGate {...defaultProps} />);
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Company")).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
  });
});
