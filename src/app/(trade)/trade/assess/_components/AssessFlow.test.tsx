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
import type { ClassifyConfirmSuggestion } from "./ClassifyConfirm";
import type { ScopedFieldValue } from "./ScopedItemForm";

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
// the icons AssessFlow itself imports are listed (its children are stubbed).
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
    Loader2: icon("Loader2"),
  };
});

// ── Heavy children stubbed so the test isolates the step machine. ──────────

// EntryChoice — the two-path entry screen (Task 10). The test drives both
// paths via the rendered buttons below.
vi.mock("./EntryChoice", () => ({
  EntryChoice: ({
    onUpload,
    onManual,
  }: {
    onUpload: () => void;
    onManual: () => void;
  }) => (
    <div data-testid="entry-choice">
      <button data-testid="m-upload" onClick={onUpload} />
      <button data-testid="m-manual" onClick={onManual} />
    </div>
  ),
}));

// CategoryPicker — manual category selection (Task 11). Picks star_tracker.
vi.mock("./CategoryPicker", () => ({
  CategoryPicker: ({
    onSelect,
  }: {
    onSelect: (categoryId: string) => void;
  }) => (
    <button data-testid="m-pick" onClick={() => onSelect("star_tracker")} />
  ),
}));

// ScopedItemForm — decisive scoped fields (Task 12). Expose onStart +
// onAttributesChange + onChangeCategory so the test can drive the form step.
let capturedOnStart: (() => void) | null = null;
let capturedOnAttributesChange: ((attrs: ScopedFieldValue[]) => void) | null =
  null;
let capturedOnChangeCategory: (() => void) | null = null;
let lastFormCategoryId: string | null = null;
vi.mock("./ScopedItemForm", () => ({
  ScopedItemForm: ({
    categoryId,
    onStart,
    onAttributesChange,
    onChangeCategory,
  }: {
    categoryId: string;
    onStart: () => void;
    onAttributesChange: (attrs: ScopedFieldValue[]) => void;
    onChangeCategory: () => void;
  }) => {
    capturedOnStart = onStart;
    capturedOnAttributesChange = onAttributesChange;
    capturedOnChangeCategory = onChangeCategory;
    lastFormCategoryId = categoryId;
    return (
      <button data-testid="m-start" onClick={onStart}>
        {categoryId}
      </button>
    );
  },
}));

// ClassificationPreview — live preview (Task 13). Marker only.
vi.mock("./ClassificationPreview", () => ({
  ClassificationPreview: ({ categoryId }: { categoryId: string }) => (
    <div data-testid="m-preview" data-category={categoryId} />
  ),
}));

// DatasheetDropzone does its own fetch/upload work. Expose `onApply` via a
// button so the test can fire a mocked extraction (mirrors the prior pattern).
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

// ClassifyConfirm — the human sign-off (spec §7.4). The test drives the
// fail-closed confirm → landscape tail via the rendered button with a fixed
// code (so the persisted confirmedCode is deterministic).
const FIXED_CODE: ClassifyConfirmSuggestion = {
  code: "9A515.a.1",
  canonicalId: "ECCN:9A515.a.1",
  regime: "EAR-CCL",
  title: "Spacecraft and related commodities",
  confidence: "HIGH",
  rationale: "Optical aperture ≥ 0.50 m.",
};
vi.mock("./ClassifyConfirm", () => ({
  ClassifyConfirm: ({
    onConfirm,
  }: {
    onConfirm: (s: ClassifyConfirmSuggestion) => void;
  }) => (
    <button data-testid="m-confirm" onClick={() => onConfirm(FIXED_CODE)} />
  ),
}));

// PartyPicker does its own async /api/trade/parties search. Expose onSelect.
let capturedOnParty: ((p: { id: string }) => void) | null = null;
vi.mock("../../operations/new/_components/PartyPicker", () => ({
  PartyPicker: ({ onSelect }: { onSelect: (p: { id: string }) => void }) => {
    capturedOnParty = onSelect;
    return <div data-testid="party-picker" />;
  },
}));

// VerdictPanel fetches /[id]/assess on mount. Stub to a marker echoing the id.
vi.mock("../../operations/new/_components/VerdictPanel", () => ({
  VerdictPanel: ({ operationId }: { operationId: string }) => (
    <div data-testid="verdict-panel" data-operation-id={operationId} />
  ),
}));

// LandscapeView — render destinations as choosable buttons so the test can
// advance to the verdict step (mirrors the real onChoose contract).
vi.mock("./LandscapeView", () => ({
  LandscapeView: ({
    result,
    onChoose,
  }: {
    result: { go: { country: string }[]; caption: string };
    onChoose: (country: string) => void;
  }) => (
    <div data-testid="landscape-view">
      <span>{result.caption}</span>
      {result.go.map((g) => (
        <button key={g.country} onClick={() => onChoose(g.country)}>
          {g.country}
        </button>
      ))}
    </div>
  ),
}));

import { AssessFlow } from "./AssessFlow";

const HIGH_PAYLOAD: DatasheetApplyPayload = {
  attributes: [
    {
      attribute: "itemClass",
      value: "spacecraft.adcs.star_tracker",
      confidence: "high",
    },
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
  ],
  fileName: "Star-Tracker_ST400.pdf",
};

const LANDSCAPE_RESULT = {
  go: [
    { country: "US", verdict: "GO", detail: "Keine Genehmigung erforderlich." },
    { country: "JP", verdict: "GO", detail: "Keine Genehmigung erforderlich." },
  ],
  review: [
    { country: "IN", verdict: "REVIEW", detail: "Einzelfallprüfung nötig." },
  ],
  blocked: [
    { country: "RU", verdict: "BLOCKED", detail: "EU-Embargo (VO 833/2014)." },
  ],
  caption:
    "Annahme: sauberer Endkunde — im nächsten Schritt mit dem echten Käufer verschärft.",
};

beforeEach(() => {
  capturedOnApply = null;
  capturedOnStart = null;
  capturedOnAttributesChange = null;
  capturedOnChangeCategory = null;
  capturedOnParty = null;
  lastFormCategoryId = null;
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

describe("AssessFlow", () => {
  it("Step machine: starts on the two-path entry screen", () => {
    render(<AssessFlow />);
    expect(screen.getByTestId("entry-choice")).toBeInTheDocument();
    // No dropzone, no classification, no verdict before a path is chosen.
    expect(screen.queryByTestId("datasheet-dropzone")).not.toBeInTheDocument();
    expect(screen.queryByTestId("assess-form-step")).not.toBeInTheDocument();
  });

  it("manual path: entry → category → form (mounts ScopedItemForm + preview)", () => {
    render(<AssessFlow />);
    fireEvent.click(screen.getByTestId("m-manual"));
    // Manual path goes to the category picker.
    expect(screen.getByTestId("m-pick")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("m-pick"));
    // Choosing a category lands on the scoped form step.
    expect(screen.getByTestId("assess-form-step")).toBeInTheDocument();
    expect(screen.getByTestId("m-start")).toBeInTheDocument();
    expect(screen.getByTestId("m-preview")).toBeInTheDocument();
    // The chosen category flows into both the form and the live preview.
    expect(lastFormCategoryId).toBe("star_tracker");
  });

  it("upload path: entry → upload shows the dropzone, then routes the extraction into the form", () => {
    render(<AssessFlow />);
    fireEvent.click(screen.getByTestId("m-upload"));
    // Upload path shows the dropzone first.
    expect(screen.getByTestId("datasheet-dropzone")).toBeInTheDocument();
    expect(capturedOnApply).toBeTruthy();
    // The extraction routes into the (pre-filled) form step — NOT straight to
    // classify.
    act(() => capturedOnApply?.(HIGH_PAYLOAD));
    expect(screen.getByTestId("assess-form-step")).toBeInTheDocument();
    expect(screen.getByTestId("m-start")).toBeInTheDocument();
    // The detected category (from the itemClass extraction) pre-selects.
    expect(lastFormCategoryId).toBe("star_tracker");
  });

  it("'Vorgang starten' advances the form to the classify (human sign-off) step", () => {
    render(<AssessFlow />);
    fireEvent.click(screen.getByTestId("m-manual"));
    fireEvent.click(screen.getByTestId("m-pick"));
    expect(capturedOnStart).toBeTruthy();
    fireEvent.click(screen.getByTestId("m-start"));
    // The classify step (ClassifyConfirm) mounts — no verdict synthesised yet.
    expect(screen.getByTestId("m-confirm")).toBeInTheDocument();
    expect(screen.queryByTestId("verdict-panel")).not.toBeInTheDocument();
  });

  it("'Falsche Klasse? Ändern' returns the form to the category picker", () => {
    render(<AssessFlow />);
    fireEvent.click(screen.getByTestId("m-manual"));
    fireEvent.click(screen.getByTestId("m-pick"));
    expect(screen.getByTestId("assess-form-step")).toBeInTheDocument();
    expect(capturedOnChangeCategory).toBeTruthy();
    act(() => capturedOnChangeCategory?.());
    // Back to the category picker, off the form.
    expect(screen.getByTestId("m-pick")).toBeInTheDocument();
    expect(screen.queryByTestId("assess-form-step")).not.toBeInTheDocument();
  });

  /** Drive entry → manual → category → form → start → confirm → landscape. */
  async function advanceToLandscape() {
    const f = fetch as ReturnType<typeof vi.fn>;
    // 1st POST = from-datasheet persistence; 2nd POST = landscape buckets.
    f.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ itemId: "item-new" }),
    }).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => LANDSCAPE_RESULT,
    });
    render(<AssessFlow />);
    fireEvent.click(screen.getByTestId("m-manual"));
    fireEvent.click(screen.getByTestId("m-pick"));
    // Supply a scoped attribute so the persisted item is non-empty.
    act(() =>
      capturedOnAttributesChange?.([
        {
          attribute: "starTrackerAccuracyArcsec",
          value: 10,
          source: "operator",
          confidence: "high",
        },
      ]),
    );
    fireEvent.click(screen.getByTestId("m-start"));
    // Human confirms the classification (fail-closed sign-off).
    fireEvent.click(screen.getByTestId("m-confirm"));
    await waitFor(() =>
      expect(screen.getByTestId("landscape-view")).toBeTruthy(),
    );
  }

  it("Confirm persists EXACTLY the human-picked code, then advances to landscape (no synthesised verdict)", async () => {
    await advanceToLandscape();

    // The confirmed classification is persisted via Task 4's route…
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/trade/assess/from-datasheet",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    const persistCall = (fetch as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => c[0] === "/api/trade/assess/from-datasheet",
    );
    const body = JSON.parse((persistCall![1] as RequestInit).body as string);
    // …and never synthesises a verdict: the confirmed code is exactly what the
    // human picked.
    expect(body.confirmedCode.canonicalId).toBe("ECCN:9A515.a.1");
    // The scoped attribute bag rides along into parametricAttributes (Task 15).
    expect(body.item.parametricAttributes.starTrackerAccuracyArcsec).toBe(10);
  });

  it("Landscape: POSTs the buckets + renders the mandatory clean-buyer caption", async () => {
    await advanceToLandscape();
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/trade/assess/landscape",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    expect(screen.getByText(/sauberer Endkunde/)).toBeTruthy();
    expect(screen.getByText("US")).toBeTruthy();
  });

  /** Drive entry → … → landscape → choose `country` → verdict step. */
  async function advanceToVerdict(country = "US") {
    await advanceToLandscape();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(country) }));
    await waitFor(() =>
      expect(screen.getByTestId("assess-verdict-step")).toBeTruthy(),
    );
  }

  it("Verdict: a buyer + 'Prüfen' creates the operation + line, then mounts VerdictPanel", async () => {
    await advanceToVerdict("US");

    expect(screen.getByTestId("party-picker")).toBeTruthy();
    expect(capturedOnParty).toBeTruthy();
    act(() => capturedOnParty?.({ id: "party-1" }));

    const f = fetch as ReturnType<typeof vi.fn>;
    f.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ operation: { id: "op-new" } }),
    }).mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({}) });

    fireEvent.click(screen.getByRole("button", { name: /Darf ich liefern/i }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/trade/operations",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    const opCall = f.mock.calls.find((c) => c[0] === "/api/trade/operations");
    const opBody = JSON.parse((opCall![1] as RequestInit).body as string);
    expect(opBody.shipToCountry).toBe("US");
    expect(opBody.counterpartyId).toBe("party-1");

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/trade/operations/op-new/lines",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    const lineCall = f.mock.calls.find(
      (c) => c[0] === "/api/trade/operations/op-new/lines",
    );
    const lineBody = JSON.parse((lineCall![1] as RequestInit).body as string);
    expect(lineBody.itemId).toBe("item-new");

    await waitFor(() =>
      expect(screen.getByTestId("verdict-panel")).toBeTruthy(),
    );
    expect(
      screen.getByTestId("verdict-panel").getAttribute("data-operation-id"),
    ).toBe("op-new");
  });

  it("Verdict: the assess button is disabled until a buyer is chosen", async () => {
    await advanceToVerdict("US");
    const btn = screen.getByRole("button", {
      name: /Darf ich liefern/i,
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    act(() => capturedOnParty?.({ id: "party-1" }));
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: /Darf ich liefern/i,
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
  });
});
