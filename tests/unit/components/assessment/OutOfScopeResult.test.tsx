import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OutOfScopeResult from "@/components/assessment/OutOfScopeResult";
import React from "react";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      className,
      ...props
    }: React.ComponentProps<"div"> & {
      initial?: unknown;
      animate?: unknown;
      transition?: unknown;
    }) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

describe("OutOfScopeResult", () => {
  const defaultProps = {
    message: "Your assets are excluded under Art. 2(3)(a)",
    detail:
      "Space objects used exclusively for defense or national security purposes are excluded.",
    onRestart: vi.fn(),
  };

  it("renders the out-of-scope title", () => {
    render(<OutOfScopeResult {...defaultProps} />);
    expect(screen.getByText("Outside Regulation Scope")).toBeInTheDocument();
  });

  it("renders the message text", () => {
    render(<OutOfScopeResult {...defaultProps} />);
    expect(
      screen.getByText("Your assets are excluded under Art. 2(3)(a)"),
    ).toBeInTheDocument();
  });

  it("renders the detail text", () => {
    render(<OutOfScopeResult {...defaultProps} />);
    expect(
      screen.getByText(/Space objects used exclusively for defense/),
    ).toBeInTheDocument();
  });

  it("renders the restart button", () => {
    render(<OutOfScopeResult {...defaultProps} />);
    expect(screen.getByText("Start over")).toBeInTheDocument();
  });

  it("calls onRestart when restart button is clicked", async () => {
    const user = userEvent.setup();
    const onRestart = vi.fn();
    render(<OutOfScopeResult {...defaultProps} onRestart={onRestart} />);

    await user.click(screen.getByText("Start over"));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it("renders the EUR-Lex link", () => {
    render(<OutOfScopeResult {...defaultProps} />);
    const link = screen.getByText("Read the EU Space Act");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute(
      "href",
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=COM:2025:335:FIN",
    );
  });

  it("opens EUR-Lex link in new tab", () => {
    render(<OutOfScopeResult {...defaultProps} />);
    const link = screen.getByText("Read the EU Space Act").closest("a");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders the Caelex CTA section", () => {
    render(<OutOfScopeResult {...defaultProps} />);
    expect(
      screen.getByText("Planning future missions that might be in scope?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Caelex helps space operators/),
    ).toBeInTheDocument();
  });

  it("does not render detail box when detail is empty", () => {
    render(<OutOfScopeResult {...defaultProps} detail="" />);
    // The detail box has a specific class
    const { container } = render(
      <OutOfScopeResult {...defaultProps} detail="" />,
    );
    const detailBoxes = container.querySelectorAll(
      ".bg-white\\/\\[0\\.05\\].border",
    );
    // Should only have the CTA border, not the detail box
    expect(
      screen.queryByText(/Space objects used exclusively for defense/),
    ).not.toBeInTheDocument();
  });

  it("renders the alert icon", () => {
    const { container } = render(<OutOfScopeResult {...defaultProps} />);
    // The icon wrapper
    const iconWrapper = container.querySelector(".w-16.h-16.rounded-full");
    expect(iconWrapper).toBeInTheDocument();
  });
});
