import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock the custom useInView hook
vi.mock("@/app/systems/ephemeris/lib/use-in-view", () => ({
  useInView: vi.fn(() => ({
    ref: { current: null },
    inView: false,
  })),
}));

import AnimatedCounter from "@/app/systems/ephemeris/components/animated-counter";
import { useInView } from "@/app/systems/ephemeris/lib/use-in-view";

describe("AnimatedCounter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useInView).mockReturnValue({
      ref: { current: null } as React.RefObject<HTMLDivElement>,
      inView: false,
    });
  });

  it("renders a span element", () => {
    const { container } = render(<AnimatedCounter target={100} />);
    const span = container.querySelector("span");
    expect(span).toBeTruthy();
  });

  it("starts with value 0 when not in view", () => {
    const { container } = render(<AnimatedCounter target={847} />);
    const span = container.querySelector("span");
    expect(span?.textContent).toBe("0");
  });

  it("applies tabular-nums font variant", () => {
    const { container } = render(<AnimatedCounter target={100} />);
    const span = container.querySelector("span");
    expect(span?.style.fontVariantNumeric).toBe("tabular-nums");
  });

  it("applies className prop", () => {
    const { container } = render(
      <AnimatedCounter target={100} className="test-class" />,
    );
    const span = container.querySelector("span");
    expect(span?.classList.contains("test-class")).toBe(true);
  });

  it("applies style prop merged with tabular-nums", () => {
    const { container } = render(
      <AnimatedCounter
        target={100}
        style={{ color: "red", fontSize: "48px" }}
      />,
    );
    const span = container.querySelector("span");
    expect(span?.style.fontVariantNumeric).toBe("tabular-nums");
    expect(span?.style.color).toBe("red");
    expect(span?.style.fontSize).toBe("48px");
  });

  it("calls useInView with threshold 0.5", () => {
    render(<AnimatedCounter target={100} />);
    expect(useInView).toHaveBeenCalledWith({ threshold: 0.5 });
  });

  it("renders with default duration", () => {
    // Just verify it renders without error when no duration provided
    const { container } = render(<AnimatedCounter target={500} />);
    expect(container.querySelector("span")).toBeTruthy();
  });

  it("renders with custom duration", () => {
    const { container } = render(
      <AnimatedCounter target={500} duration={3000} />,
    );
    expect(container.querySelector("span")).toBeTruthy();
  });

  it("renders with empty className", () => {
    const { container } = render(<AnimatedCounter target={100} className="" />);
    const span = container.querySelector("span");
    expect(span).toBeTruthy();
  });
});
