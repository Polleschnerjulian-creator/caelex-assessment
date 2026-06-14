// ClassificationPreview.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClassificationPreview } from "./ClassificationPreview";

vi.mock("lucide-react", () => {
  const i = (n: string) => {
    const I = (p: Record<string, unknown>) => (
      <span data-testid={`icon-${n}`} {...p} />
    );
    I.displayName = n;
    return I;
  };
  return {
    Sparkles: i("Sparkles"),
    AlertTriangle: i("AlertTriangle"),
    CheckCircle2: i("CheckCircle2"),
  };
});

describe("ClassificationPreview", () => {
  it("shows a determinate candidate for a complete star tracker", () => {
    render(
      <ClassificationPreview
        categoryId="star_tracker"
        text=""
        attributes={[
          {
            attribute: "itemClass",
            value: "spacecraft.adcs.star_tracker",
            source: "operator",
            confidence: "high",
          },
          {
            attribute: "starTrackerAccuracyArcsec",
            value: 0.5,
            source: "operator",
            confidence: "high",
          },
          {
            attribute: "starTrackerSlewRateDegPerS",
            value: 4,
            source: "operator",
            confidence: "high",
          },
        ]}
      />,
    );
    expect(screen.getByTestId("preview-code").textContent).toMatch(
      /XV\(e\)\(16\)/,
    );
  });
  it("B18 — a LOW-only candidate shows 'kann nicht ausgeschlossen werden: <code>' (agrees with ClassifyConfirm)", () => {
    render(
      <ClassificationPreview
        categoryId="star_tracker"
        text=""
        attributes={[
          {
            attribute: "itemClass",
            value: "spacecraft.adcs.star_tracker",
            source: "operator",
            confidence: "high",
          },
        ]}
      />,
    );
    // The LOW candidate code is surfaced (not hidden) but framed as
    // "kann nicht ausgeschlossen werden" — never a green determination.
    expect(
      screen.getByText(/kann nicht ausgeschlossen werden/i),
    ).toBeInTheDocument();
    // The candidate code (itemClass-prefix-only top suggestion) is shown.
    expect(screen.getByTestId("preview-low-code").textContent).toMatch(/9A004/);
    // Never the green success check / "genug" framing for a LOW match.
    expect(screen.queryByTestId("certainty-enough")).not.toBeInTheDocument();
    expect(screen.queryByTestId("icon-CheckCircle2")).not.toBeInTheDocument();
  });

  it("renders a boundary-MEDIUM match with a distinct caveat, NOT the green success check", () => {
    render(
      <ClassificationPreview
        categoryId="eo_imager"
        text=""
        attributes={[
          {
            attribute: "itemClass",
            value: "spacecraft.remote_sensing.eo",
            source: "operator",
            confidence: "high",
          },
          {
            attribute: "apertureMeters",
            value: 0.495,
            source: "operator",
            confidence: "high",
          },
        ]}
      />,
    );
    // Boundary-MEDIUM must NOT present as a confident determination.
    expect(screen.queryByTestId("certainty-enough")).not.toBeInTheDocument();
    expect(screen.queryByTestId("icon-CheckCircle2")).not.toBeInTheDocument();
    // It surfaces the candidate code with a boundary caveat.
    expect(screen.getByTestId("preview-boundary")).toBeInTheDocument();
    expect(screen.getByTestId("preview-boundary").textContent).toMatch(
      /XV\(a\)\(7\)\(i\)/,
    );
    expect(screen.getByText(/Grenzwert/i)).toBeInTheDocument();
  });
});
