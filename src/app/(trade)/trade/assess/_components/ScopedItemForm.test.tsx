// ScopedItemForm.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ScopedItemForm } from "./ScopedItemForm";

vi.mock("lucide-react", () => {
  const icon = (n: string) => {
    const I = (p: Record<string, unknown>) => (
      <span data-testid={`icon-${n}`} {...p} />
    );
    I.displayName = n;
    return I;
  };
  return {
    Check: icon("Check"),
    AlertTriangle: icon("AlertTriangle"),
    ArrowRight: icon("ArrowRight"),
    Pencil: icon("Pencil"),
  };
});

const baseProps = {
  categoryId: "star_tracker",
  name: "AstroSense ST-300",
  onNameChange: vi.fn(),
  onChangeCategory: vi.fn(),
  onAttributesChange: vi.fn(),
  onStart: vi.fn(),
  submitting: false,
};

describe("ScopedItemForm", () => {
  it("renders the decisive star-tracker fields, accuracy before a non-decisive field", () => {
    render(<ScopedItemForm {...baseProps} prefill={{}} />);
    const labels = screen
      .getAllByTestId(/^field-/)
      .map((n) => n.getAttribute("data-testid"));
    expect(labels).toContain("field-starTrackerAccuracyArcsec");
    expect(labels).toContain("field-thermalCycleCount");
    // decisive accuracy threshold must rank ahead of the non-decisive thermal field
    expect(labels.indexOf("field-starTrackerAccuracyArcsec")).toBeLessThan(
      labels.indexOf("field-thermalCycleCount"),
    );
  });
  it("does NOT render isSpeciallyDesigned as a generic field — the sd-tristate owns it (fail-closed)", () => {
    render(<ScopedItemForm {...baseProps} prefill={{}} />);
    // a duplicate generic boolean select would give a parallel assert-a-negative
    // path and emit conflicting isSpeciallyDesigned entries — must not exist.
    expect(screen.queryByTestId("field-isSpeciallyDesigned")).toBeNull();
    expect(screen.queryByTestId("input-isSpeciallyDesigned")).toBeNull();
    expect(screen.getByTestId("sd-tristate")).toBeInTheDocument();
  });
  it("prefills a high-confidence value with an evidence quote badge", () => {
    render(
      <ScopedItemForm
        {...baseProps}
        prefill={{
          starTrackerAccuracyArcsec: {
            value: 10,
            confidence: "high",
            quote: "Cross-boresight accuracy 10 arcsec",
          },
        }}
      />,
    );
    expect(
      (
        screen.getByTestId(
          "input-starTrackerAccuracyArcsec",
        ) as HTMLInputElement
      ).value,
    ).toBe("10");
    expect(
      screen.getByText(/Cross-boresight accuracy 10 arcsec/),
    ).toBeInTheDocument();
  });
  it("B12: a LOW-confidence prefill value is badged 'niedrige Lesesicherheit' (never silently trusted)", () => {
    render(
      <ScopedItemForm
        {...baseProps}
        prefill={{
          starTrackerAccuracyArcsec: {
            value: 5,
            confidence: "low",
            quote: "schwer lesbar",
          },
        }}
      />,
    );
    // The value is shown (the operator may keep it), but explicitly flagged as a
    // low-reliability read so it is never mistaken for a confident extraction.
    expect(
      screen.getByTestId("low-read-starTrackerAccuracyArcsec"),
    ).toBeTruthy();
    expect(screen.getByText(/niedrige Lesesicherheit/i)).toBeInTheDocument();
  });
  it("does NOT badge a high-confidence prefill value", () => {
    render(
      <ScopedItemForm
        {...baseProps}
        prefill={{
          starTrackerAccuracyArcsec: { value: 10, confidence: "high" },
        }}
      />,
    );
    expect(
      screen.queryByTestId("low-read-starTrackerAccuracyArcsec"),
    ).toBeNull();
  });
  it("shows the specially-designed tri-state with an 'unbekannt' default", () => {
    render(<ScopedItemForm {...baseProps} prefill={{}} />);
    expect(screen.getByTestId("sd-tristate")).toBeInTheDocument();
  });
  it("renders the end-use + no-clearance standing prompts", () => {
    render(<ScopedItemForm {...baseProps} prefill={{}} />);
    expect(screen.getByText(/keine Endverwendung/i)).toBeInTheDocument();
    expect(screen.getByText(/keine Freigabe/i)).toBeInTheDocument();
  });
  it("allows start (category + name present) and fires onStart", () => {
    const onStart = vi.fn();
    render(<ScopedItemForm {...baseProps} prefill={{}} onStart={onStart} />);
    fireEvent.click(screen.getByTestId("start-vorgang"));
    expect(onStart).toHaveBeenCalledOnce();
  });
});
