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
  it("stays 'kann nicht ausgeschlossen werden' while a decisive field is blank", () => {
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
    expect(
      screen.getByText(/kann nicht ausgeschlossen werden|nicht ausschließbar/i),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("certainty-enough")).not.toBeInTheDocument();
  });
});
