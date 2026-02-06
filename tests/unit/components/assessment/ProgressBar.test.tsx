import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ProgressBar from "@/components/assessment/ProgressBar";

// Mock framer-motion to render children directly
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      className,
      style,
      ...props
    }: React.ComponentProps<"div"> & {
      initial?: unknown;
      animate?: unknown;
      transition?: unknown;
    }) => (
      <div className={className} style={style} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

import { vi } from "vitest";
import React from "react";

describe("ProgressBar", () => {
  it("renders the step count with zero-padded numbers", () => {
    render(<ProgressBar currentStep={3} totalSteps={8} />);
    expect(screen.getByText(/03/)).toBeInTheDocument();
    expect(screen.getByText(/08/)).toBeInTheDocument();
  });

  it("renders step 1 of 8 correctly", () => {
    render(<ProgressBar currentStep={1} totalSteps={8} />);
    expect(screen.getByText(/01/)).toBeInTheDocument();
    expect(screen.getByText("13%")).toBeInTheDocument();
  });

  it("renders correct percentage at step 4 of 8", () => {
    render(<ProgressBar currentStep={4} totalSteps={8} />);
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("renders 100% at the last step", () => {
    render(<ProgressBar currentStep={8} totalSteps={8} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("renders the progress bar track", () => {
    const { container } = render(
      <ProgressBar currentStep={3} totalSteps={8} />,
    );
    // The outer track div
    const track = container.querySelector(".h-\\[3px\\]");
    expect(track).toBeInTheDocument();
  });

  it("handles single-step assessment", () => {
    render(<ProgressBar currentStep={1} totalSteps={1} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("renders with large step numbers", () => {
    render(<ProgressBar currentStep={12} totalSteps={15} />);
    expect(screen.getByText("80%")).toBeInTheDocument();
  });
});
