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
    ArrowRight: i("ArrowRight"),
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

function emptyPayload(): DatasheetApplyPayload {
  return {
    attributes: [],
    suggestions: [],
  } as unknown as DatasheetApplyPayload;
}

describe("ClassifyConfirm B11 — honest inline manual code-entry (never a dead end)", () => {
  it("no usable proposal: renders an inline code-entry surface (no dead-end), disabled until a code is typed", () => {
    const onManualCode = vi.fn();
    render(
      <ClassifyConfirm
        payload={emptyPayload()}
        submitting={false}
        error={null}
        onConfirm={vi.fn()}
        onManual={vi.fn()}
        onManualCode={onManualCode}
      />,
    );
    const input = screen.getByTestId(
      "assess-manual-code-input",
    ) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    const submit = screen.getByTestId(
      "assess-manual-code-submit",
    ) as HTMLButtonElement;
    // Empty → cannot submit a blank "classification".
    expect(submit.disabled).toBe(true);
    fireEvent.click(submit);
    expect(onManualCode).not.toHaveBeenCalled();
  });

  it("typing a control code + submitting forwards the trimmed code (and optional regime) to onManualCode", () => {
    const onManualCode = vi.fn();
    render(
      <ClassifyConfirm
        payload={emptyPayload()}
        submitting={false}
        error={null}
        onConfirm={vi.fn()}
        onManual={vi.fn()}
        onManualCode={onManualCode}
      />,
    );
    fireEvent.change(screen.getByTestId("assess-manual-code-input"), {
      target: { value: "  EU:9A004  " },
    });
    fireEvent.change(screen.getByTestId("assess-manual-code-regime"), {
      target: { value: "EU-ANNEX-I" },
    });
    const submit = screen.getByTestId(
      "assess-manual-code-submit",
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);
    expect(onManualCode).toHaveBeenCalledTimes(1);
    expect(onManualCode).toHaveBeenCalledWith({
      code: "EU:9A004",
      regime: "EU-ANNEX-I",
    });
  });

  it("the inline code-entry surface is ALSO available alongside a (weak) suggestion — the operator can always override", () => {
    const onManualCode = vi.fn();
    render(
      <ClassifyConfirm
        payload={payloadWith({ confidence: "LOW" })}
        submitting={false}
        error={null}
        onConfirm={vi.fn()}
        onManual={vi.fn()}
        onManualCode={onManualCode}
      />,
    );
    fireEvent.change(screen.getByTestId("assess-manual-code-input"), {
      target: { value: "1.A.1" },
    });
    fireEvent.click(screen.getByTestId("assess-manual-code-submit"));
    // No regime field filled → regime omitted (undefined), code forwarded.
    expect(onManualCode).toHaveBeenCalledWith({ code: "1.A.1" });
  });
});

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
        onManualCode={vi.fn()}
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
        onManualCode={vi.fn()}
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
        onManualCode={vi.fn()}
      />,
    );
    const btn = screen.getByTestId("assess-confirm-btn") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
