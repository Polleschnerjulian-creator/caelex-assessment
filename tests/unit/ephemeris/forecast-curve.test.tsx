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

import ForecastCurve from "@/app/systems/ephemeris/components/forecast-curve";
import { useInView } from "@/app/systems/ephemeris/lib/use-in-view";

describe("ForecastCurve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useInView).mockReturnValue({
      ref: { current: null } as React.RefObject<HTMLDivElement>,
      inView: false,
    });
  });

  it("renders SVG element", () => {
    const { container } = render(<ForecastCurve />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("renders with correct viewBox", () => {
    const { container } = render(<ForecastCurve />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("viewBox")).toBe("0 0 800 420");
  });

  it("renders grid lines for 0%, 25%, 50%, 75%", () => {
    const { container } = render(<ForecastCurve />);
    // Grid text labels
    const texts = container.querySelectorAll("text");
    const textContents = Array.from(texts).map((t) => t.textContent);
    expect(textContents).toContain("0%");
    expect(textContents).toContain("25%");
    expect(textContents).toContain("50%");
    expect(textContents).toContain("75%");
  });

  it("renders x-axis year marks", () => {
    const { container } = render(<ForecastCurve />);
    const texts = container.querySelectorAll("text");
    const textContents = Array.from(texts).map((t) => t.textContent);
    expect(textContents).toContain("Today");
    expect(textContents).toContain("Y1");
    expect(textContents).toContain("Y2");
    expect(textContents).toContain("Y3");
    expect(textContents).toContain("Y4");
    expect(textContents).toContain("Y5");
  });

  it("renders Art. 70 threshold label", () => {
    const { container } = render(<ForecastCurve />);
    const texts = container.querySelectorAll("text");
    const textContents = Array.from(texts).map((t) => t.textContent);
    expect(textContents).toContain("Art. 70 Threshold");
  });

  it("renders dashed threshold line", () => {
    const { container } = render(<ForecastCurve />);
    const lines = container.querySelectorAll("line");
    const dashedLines = Array.from(lines).filter(
      (l) =>
        l.getAttribute("stroke-dasharray") === "6,4" ||
        l.getAttribute("strokeDasharray") === "6,4",
    );
    // The threshold line has strokeDasharray="6,4"
    expect(dashedLines.length).toBeGreaterThan(0);
  });

  it("renders the confidence band path", () => {
    const { container } = render(<ForecastCurve />);
    const paths = container.querySelectorAll("path");
    // Should have at least the confidence band and the main curve path
    expect(paths.length).toBeGreaterThanOrEqual(2);
  });

  it("renders the main curve path", () => {
    const { container } = render(<ForecastCurve />);
    const paths = container.querySelectorAll("path");
    // One of the paths should have stroke="url(#curveGrad)"
    const curvePath = Array.from(paths).find(
      (p) => p.getAttribute("stroke") === "url(#curveGrad)",
    );
    expect(curvePath).toBeTruthy();
  });

  it("does not show crossing point when not in view (progress=0)", () => {
    const { container } = render(<ForecastCurve />);
    const texts = container.querySelectorAll("text");
    const textContents = Array.from(texts).map((t) => t.textContent);
    // Crossing label should NOT be present when progress is 0
    expect(textContents).not.toContain("Day 533: Non-Compliant");
  });

  it("does not show 58% label when progress is 0", () => {
    const { container } = render(<ForecastCurve />);
    const texts = container.querySelectorAll("text");
    const textContents = Array.from(texts).map((t) => t.textContent);
    expect(textContents).not.toContain("58%");
  });

  it("renders defs with gradient and filter", () => {
    const { container } = render(<ForecastCurve />);
    const defs = container.querySelector("defs");
    expect(defs).toBeTruthy();

    // Check for gradient
    const gradient = container.querySelector("#curveGrad");
    expect(gradient).toBeTruthy();

    // Check for glow filter
    const filter = container.querySelector("#curveGlow");
    expect(filter).toBeTruthy();

    // Check for clip path
    const clipPath = container.querySelector("#progressClip");
    expect(clipPath).toBeTruthy();
  });

  it("renders background rect", () => {
    const { container } = render(<ForecastCurve />);
    const rects = container.querySelectorAll("rect");
    // Background rect + possibly clip rect
    expect(rects.length).toBeGreaterThanOrEqual(1);
  });

  it("calls useInView with threshold 0.3", () => {
    render(<ForecastCurve />);
    expect(useInView).toHaveBeenCalledWith({ threshold: 0.3 });
  });
});
