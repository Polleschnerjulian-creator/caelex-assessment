import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import React from "react";

// Mock @sentry/nextjs
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

// Mock lucide-react with explicit named exports (Proxy-based mocks hang with static imports in Vitest 4)
vi.mock("lucide-react", () => ({
  AlertTriangle: (props: any) =>
    React.createElement("svg", {
      "data-testid": "icon-AlertTriangle",
      ...props,
    }),
  RefreshCw: (props: any) =>
    React.createElement("svg", { "data-testid": "icon-RefreshCw", ...props }),
}));

import GlobalError from "@/app/global-error";
import * as Sentry from "@sentry/nextjs";

describe("GlobalError", () => {
  const mockReset = vi.fn();
  const mockError = new Error("Test error") as Error & { digest?: string };

  it("renders without crashing", () => {
    const { container } = render(
      <GlobalError error={mockError} reset={mockReset} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("displays error message text", () => {
    const { container } = render(
      <GlobalError error={mockError} reset={mockReset} />,
    );
    expect(container.textContent).toContain("Something went wrong");
  });

  it("displays recovery instructions", () => {
    const { container } = render(
      <GlobalError error={mockError} reset={mockReset} />,
    );
    expect(container.textContent).toContain(
      "A critical error occurred. Please refresh the page.",
    );
  });

  it("renders try again button", () => {
    const { container } = render(
      <GlobalError error={mockError} reset={mockReset} />,
    );
    const button = container.querySelector("button");
    expect(button).toBeTruthy();
    expect(button?.textContent).toContain("Try again");
  });

  it("calls reset when try again button is clicked", () => {
    const { container } = render(
      <GlobalError error={mockError} reset={mockReset} />,
    );
    const button = container.querySelector("button")!;
    fireEvent.click(button);
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("reports error to Sentry on mount", () => {
    render(<GlobalError error={mockError} reset={mockReset} />);
    expect(Sentry.captureException).toHaveBeenCalledWith(mockError);
  });

  it("renders AlertTriangle icon", () => {
    const { container } = render(
      <GlobalError error={mockError} reset={mockReset} />,
    );
    const icon = container.querySelector('[data-testid="icon-AlertTriangle"]');
    expect(icon).toBeTruthy();
  });

  it("renders RefreshCw icon in button", () => {
    const { container } = render(
      <GlobalError error={mockError} reset={mockReset} />,
    );
    const icon = container.querySelector('[data-testid="icon-RefreshCw"]');
    expect(icon).toBeTruthy();
  });
});
