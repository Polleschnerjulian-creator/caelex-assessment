import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import type { DatasheetApplyPayload } from "../../_components/DatasheetDropzone";

// next/link must be stubbed: the real App-Router next/link runs a
// `useIntersection` prefetch effect that calls `new IntersectionObserver`,
// which throws against the jsdom stub. Children-only stub — these tests
// never assert on a link target. (See VerdictPanel.test.tsx, commit 27fd2f84.)
vi.mock("next/link", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// lucide-react stub. An explicit named-exports object (NOT a Proxy): a Proxy's
// truthy `then` makes the module a thenable the vitest runner awaits forever
// (hang at COLLECTION), and vitest-4 rejects named imports from a Proxy. Only
// the icons AssessFlow + ClassifyConfirm import are listed.
vi.mock("lucide-react", () => {
  const icon = (name: string) => {
    const I = (p: Record<string, unknown>) => (
      <span data-testid={`icon-${name}`} {...p} />
    );
    I.displayName = name;
    return I;
  };
  return {
    ArrowLeft: icon("ArrowLeft"),
    ArrowRight: icon("ArrowRight"),
    Check: icon("Check"),
    Loader2: icon("Loader2"),
    AlertTriangle: icon("AlertTriangle"),
    Sparkles: icon("Sparkles"),
    Pencil: icon("Pencil"),
    FileText: icon("FileText"),
  };
});

// Mock the heavy upload child: DatasheetDropzone does its own fetch/upload
// work. We expose its `onApply` callback via a button so the test can fire a
// mocked extraction. (Mirrors the VerdictPanel.test.tsx child-stub pattern.)
let capturedOnApply: ((p: DatasheetApplyPayload) => void) | null = null;
vi.mock("../../_components/DatasheetDropzone", () => ({
  DatasheetDropzone: ({
    onApply,
  }: {
    onApply: (p: DatasheetApplyPayload) => void;
  }) => {
    capturedOnApply = onApply;
    return <div data-testid="datasheet-dropzone" />;
  },
}));

import { AssessFlow } from "./AssessFlow";

const HIGH_PAYLOAD: DatasheetApplyPayload = {
  attributes: [
    { attribute: "apertureMeters", value: 0.7, confidence: "high" },
    { attribute: "isRadHardened", value: true, confidence: "high" },
  ],
  suggestions: [
    {
      code: "9A515.a.1",
      canonicalId: "ECCN:9A515.a.1",
      regime: "EAR-CCL",
      title: "Spacecraft and related commodities",
      confidence: "HIGH",
      rationale: "Optical aperture ≥ 0.50 m — meets USML XV threshold.",
    },
    {
      code: "9A004",
      canonicalId: "ECCN:9A004",
      regime: "MTCR",
      title: "Space launch vehicles / sat bus",
      confidence: "MEDIUM",
      rationale: "Rad-hardened bus components.",
    },
  ],
};

const EMPTY_PAYLOAD: DatasheetApplyPayload = {
  attributes: [],
  suggestions: [],
};

beforeEach(() => {
  capturedOnApply = null;
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

describe("AssessFlow", () => {
  it("Screen 1: renders the datasheet dropzone first", () => {
    render(<AssessFlow />);
    expect(screen.getByTestId("datasheet-dropzone")).toBeTruthy();
    // No verdict, no classification before an extraction arrives.
    expect(screen.queryByRole("button", { name: /Bestätigen/i })).toBeNull();
  });

  it("Screen 2: after an extraction shows the top classification + evidence + a Bestätigen button", async () => {
    render(<AssessFlow />);
    expect(capturedOnApply).toBeTruthy();
    act(() => capturedOnApply?.(HIGH_PAYLOAD));
    // Top proposal, its evidence (rationale), and an alternative are surfaced.
    await waitFor(() => expect(screen.getByText("9A515.a.1")).toBeTruthy());
    expect(screen.getByText(/Optical aperture/)).toBeTruthy();
    expect(screen.getByText("9A004")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Bestätigen/i })).toBeTruthy();
  });

  it("Screen 2 honesty fallback: empty extraction shows a manual-code prompt, no guessed Bestätigen", async () => {
    render(<AssessFlow />);
    act(() => capturedOnApply?.(EMPTY_PAYLOAD));
    // No suggestion → never a one-click confirm of a guessed code.
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Code manuell wählen/i }),
      ).toBeTruthy(),
    );
    expect(screen.queryByRole("button", { name: /Bestätigen/i })).toBeNull();
  });

  it("Confirm advances to the landscape step (POSTs from-datasheet, then renders the landscape placeholder)", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ itemId: "item-new" }),
    });
    render(<AssessFlow />);
    act(() => capturedOnApply?.(HIGH_PAYLOAD));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Bestätigen/i })).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: /Bestätigen/i }));

    // The confirmed classification is persisted via Task 4's route…
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/trade/assess/from-datasheet",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    // …and never synthesises a verdict: the confirmed code is exactly what the
    // human picked (the top suggestion).
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.confirmedCode.canonicalId).toBe("ECCN:9A515.a.1");

    // The flow advances to the landscape step.
    await waitFor(() =>
      expect(screen.getByTestId("assess-landscape-step")).toBeTruthy(),
    );
  });
});
