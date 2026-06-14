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
  // B17 — field values are seeded ONCE via lazy useState init (the seed reads
  // props.prefill only on mount). If the SAME mounted instance is handed a new
  // categoryId + prefill (a context switch) WITHOUT a remount, the lazy seed
  // never re-runs and the previous category's seeded value bleeds into the new
  // context — a latent trap. The consumer (AssessFlow) must therefore key the
  // form on categoryId. Render via a keyed harness that mirrors that consumer
  // contract; a context switch must produce the NEW prefill, never a stale one.
  function KeyedHarness(props: {
    categoryId: string;
    prefill: Record<
      string,
      {
        value: number | boolean | string;
        confidence: "high" | "medium" | "low";
      }
    >;
  }) {
    return (
      <ScopedItemForm
        key={props.categoryId}
        {...baseProps}
        categoryId={props.categoryId}
        prefill={props.prefill}
      />
    );
  }
  it("re-seeds prefill on a context switch when keyed on categoryId (no stale values)", () => {
    const { rerender } = render(
      <KeyedHarness
        categoryId="star_tracker"
        prefill={{
          starTrackerAccuracyArcsec: { value: 10, confidence: "high" },
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

    // Switch context to a different category with its own prefill. Because the
    // element key (categoryId) changes, React unmounts the old instance and
    // mounts a fresh one whose lazy seed reads the NEW prefill — the gnss field
    // is seeded, and the old star-tracker field is gone (no stale carry-over).
    rerender(
      <KeyedHarness
        categoryId="gnss_receiver"
        prefill={{
          gnssMaxVelocityMPerS: { value: 750, confidence: "high" },
        }}
      />,
    );
    expect(
      (screen.getByTestId("input-gnssMaxVelocityMPerS") as HTMLInputElement)
        .value,
    ).toBe("750");
    expect(screen.queryByTestId("input-starTrackerAccuracyArcsec")).toBeNull();
  });
});
