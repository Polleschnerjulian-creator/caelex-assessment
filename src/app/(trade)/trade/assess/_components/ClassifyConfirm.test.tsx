// ClassifyConfirm.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ClassifyConfirm,
  type ClassifyConfirmSuggestion,
} from "./ClassifyConfirm";
import type { DatasheetApplyPayload } from "../../_components/DatasheetDropzone";

vi.mock("lucide-react", () => {
  const i = (n: string) => {
    const I = (p: Record<string, unknown>) => (
      <span data-testid={`icon-${n}`} {...p} />
    );
    I.displayName = n;
    return I;
  };
  return {
    Check: i("Check"),
    AlertTriangle: i("AlertTriangle"),
    Sparkles: i("Sparkles"),
    Pencil: i("Pencil"),
  };
});

function payloadWith(
  top: Partial<ClassifyConfirmSuggestion>,
): DatasheetApplyPayload {
  const suggestion: ClassifyConfirmSuggestion = {
    code: "9A001",
    canonicalId: "ECCN:9A001",
    regime: "EU-DUAL-USE",
    title: "Aero gas turbine engine",
    confidence: "HIGH",
    rationale: "matched",
    ...top,
  };
  return {
    attributes: [],
    suggestions: [suggestion],
  } as unknown as DatasheetApplyPayload;
}

describe("ClassifyConfirm B5 — no one-click confirm for LOW", () => {
  it("enables Bestätigen immediately for a HIGH top suggestion (no affirm gate)", () => {
    const onConfirm = vi.fn();
    render(
      <ClassifyConfirm
        payload={payloadWith({ confidence: "HIGH" })}
        submitting={false}
        error={null}
        onConfirm={onConfirm}
        onManual={vi.fn()}
      />,
    );
    const btn = screen.getByTestId("assess-confirm-btn") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("disables Bestätigen for a LOW top suggestion until the operator affirms 'fachlich geprüft'", () => {
    const onConfirm = vi.fn();
    render(
      <ClassifyConfirm
        payload={payloadWith({ confidence: "LOW" })}
        submitting={false}
        error={null}
        onConfirm={onConfirm}
        onManual={vi.fn()}
      />,
    );
    const btn = screen.getByTestId("assess-confirm-btn") as HTMLButtonElement;
    // Disabled by default for a LOW match — no one-click confirm.
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(onConfirm).not.toHaveBeenCalled();

    // Operator affirms manual review → button enables.
    const affirm = screen.getByTestId("assess-low-affirm") as HTMLInputElement;
    fireEvent.click(affirm);
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("keeps the LOW affirm gate independent of the submitting flag", () => {
    render(
      <ClassifyConfirm
        payload={payloadWith({ confidence: "LOW" })}
        submitting={true}
        error={null}
        onConfirm={vi.fn()}
        onManual={vi.fn()}
      />,
    );
    const btn = screen.getByTestId("assess-confirm-btn") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
