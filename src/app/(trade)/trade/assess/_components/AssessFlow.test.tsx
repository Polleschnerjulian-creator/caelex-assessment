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
    CheckCircle2: icon("CheckCircle2"),
    Ban: icon("Ban"),
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

// Task 7 — isolate the verdict step from its heavy children:
//   - PartyPicker does its own async /api/trade/parties search (AsyncSearchPicker
//     debounce/effect). We stub it to expose `onSelect` so the test can pick a
//     buyer without exercising that machinery.
//   - VerdictPanel fetches /[id]/assess on mount (its own effect). We stub it to
//     a marker that echoes the operationId it was mounted with, so the test can
//     assert the wizard created the operation and handed VerdictPanel the right
//     id WITHOUT running VerdictPanel's own fetch (which would otherwise wedge
//     the runner on an unmocked GET). The real VerdictPanel is pinned by its own
//     sibling test (VerdictPanel.test.tsx).
let capturedOnParty: ((p: { id: string }) => void) | null = null;
vi.mock("../../operations/new/_components/PartyPicker", () => ({
  PartyPicker: ({ onSelect }: { onSelect: (p: { id: string }) => void }) => {
    capturedOnParty = onSelect;
    return <div data-testid="party-picker" />;
  },
}));
vi.mock("../../operations/new/_components/VerdictPanel", () => ({
  VerdictPanel: ({ operationId }: { operationId: string }) => (
    <div data-testid="verdict-panel" data-operation-id={operationId} />
  ),
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
  fileName: "Star-Tracker_ST400.pdf",
};

/** A star-tracker payload whose top suggestion is a MISLEADING code title. */
const STAR_TRACKER_PAYLOAD: DatasheetApplyPayload = {
  attributes: [{ attribute: "isRadHardened", value: true, confidence: "low" }],
  suggestions: [
    {
      code: "Item-1.A.1",
      canonicalId: "MTCR:Item-1.A.1",
      regime: "MTCR-ANNEX",
      // The bug: this CODE title used to become the item name.
      title: "Complete rocket systems (incl. ballistic, SLV, sounding rockets)",
      confidence: "LOW",
      rationale: "0 predicate(s) matched but 2 require additional data.",
    },
  ],
  fileName: "Sodern-Auriga-StarTracker.pdf",
};

const EMPTY_PAYLOAD: DatasheetApplyPayload = {
  attributes: [],
  suggestions: [],
};

beforeEach(() => {
  capturedOnApply = null;
  capturedOnParty = null;
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

  it("Screen 2: defaults the Artikelname to the datasheet product (file name), NEVER the matched code title", async () => {
    render(<AssessFlow />);
    expect(capturedOnApply).toBeTruthy();
    act(() => capturedOnApply?.(STAR_TRACKER_PAYLOAD));

    const nameInput = (await screen.findByPlaceholderText(
      /Reaction Wheel/i,
    )) as HTMLInputElement;
    // The name comes from the PRODUCT (file name, sans extension, tidied),
    // not from the misleading "Complete rocket systems…" code title.
    expect(nameInput.value).toBe("Sodern Auriga StarTracker");
    expect(nameInput.value).not.toContain("Complete rocket systems");
    expect(nameInput.value).not.toContain("Item-1.A.1");
  });

  it("Screen 2: leaves the Artikelname EMPTY (placeholder) when the payload carries no file name", async () => {
    render(<AssessFlow />);
    // Same misleading suggestion title, but no fileName on the payload.
    const noFileName: DatasheetApplyPayload = {
      ...STAR_TRACKER_PAYLOAD,
      fileName: undefined,
    };
    act(() => capturedOnApply?.(noFileName));

    const nameInput = (await screen.findByPlaceholderText(
      /Reaction Wheel/i,
    )) as HTMLInputElement;
    // Empty so the operator types the real name — NEVER the code title.
    expect(nameInput.value).toBe("");
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
    (fetch as ReturnType<typeof vi.fn>)
      // 1st POST = from-datasheet persistence.
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ itemId: "item-new" }),
      })
      // 2nd POST = landscape buckets (loaded on entering the step).
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => LANDSCAPE_RESULT,
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

  // ── Task 6: Screen 3 — Liefer-Landkarte ────────────────────────────────
  const LANDSCAPE_RESULT = {
    go: [
      {
        country: "US",
        verdict: "GO",
        detail: "Keine Genehmigung erforderlich.",
      },
      {
        country: "JP",
        verdict: "GO",
        detail: "Keine Genehmigung erforderlich.",
      },
    ],
    review: [
      { country: "IN", verdict: "REVIEW", detail: "Einzelfallprüfung nötig." },
    ],
    blocked: [
      {
        country: "RU",
        verdict: "BLOCKED",
        detail: "EU-Embargo (VO 833/2014).",
      },
    ],
    caption:
      "Annahme: sauberer Endkunde — im nächsten Schritt mit dem echten Käufer verschärft.",
  };

  /** Drive the wizard from upload → confirm → landscape, with the two POSTs mocked. */
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
    act(() => capturedOnApply?.(HIGH_PAYLOAD));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Bestätigen/i })).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: /Bestätigen/i }));
    await waitFor(() =>
      expect(screen.getByTestId("assess-landscape-step")).toBeTruthy(),
    );
  }

  it("Screen 3: POSTs the landscape, renders the three buckets + the mandatory caption", async () => {
    await advanceToLandscape();

    // The landscape endpoint is called with the confirmed item + a seat.
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/trade/assess/landscape",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    const landscapeCall = (fetch as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => c[0] === "/api/trade/assess/landscape",
    );
    expect(landscapeCall).toBeTruthy();
    const body = JSON.parse((landscapeCall![1] as RequestInit).body as string);
    expect(body.item.name).toBeTruthy();
    expect(body.exporterSeat).toBeTruthy();

    // The three buckets render their destinations + cited details.
    await waitFor(() => expect(screen.getByText("US")).toBeTruthy());
    expect(screen.getByText("JP")).toBeTruthy();
    expect(screen.getByText("IN")).toBeTruthy();
    expect(screen.getByText("RU")).toBeTruthy();
    expect(screen.getByText(/EU-Embargo/)).toBeTruthy();

    // The mandatory clean-buyer caption is present, verbatim.
    expect(screen.getByText(/sauberer Endkunde/)).toBeTruthy();
  });

  it("Screen 3: clicking a destination advances to the verdict step with that country", async () => {
    await advanceToLandscape();
    await waitFor(() => expect(screen.getByText("US")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: /US/ }));

    await waitFor(() =>
      expect(screen.getByTestId("assess-verdict-step")).toBeTruthy(),
    );
  });

  it("Screen 3: a free-text 'anderes Ziel' destination also advances to the verdict step", async () => {
    await advanceToLandscape();
    await waitFor(() => expect(screen.getByText("US")).toBeTruthy());

    const other = screen.getByPlaceholderText(/anderes Ziel/i);
    fireEvent.change(other, { target: { value: "br" } });
    fireEvent.click(screen.getByRole("button", { name: /Prüfen/i }));

    await waitFor(() =>
      expect(screen.getByTestId("assess-verdict-step")).toBeTruthy(),
    );
  });

  // ── Task 7: Screen 4 — single verdict ───────────────────────────────────
  /** Drive upload → confirm → landscape → choose `country` → verdict step. */
  async function advanceToVerdict(country = "US") {
    await advanceToLandscape();
    await waitFor(() => expect(screen.getByText(country)).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: new RegExp(country) }));
    await waitFor(() =>
      expect(screen.getByTestId("assess-verdict-step")).toBeTruthy(),
    );
  }

  it("Screen 4: a buyer + 'Prüfen' creates the operation (ship-to = chosen) + a line, then mounts VerdictPanel", async () => {
    await advanceToVerdict("US");

    // Pick the screened buyer via the (stubbed) PartyPicker.
    expect(screen.getByTestId("party-picker")).toBeTruthy();
    expect(capturedOnParty).toBeTruthy();
    act(() => capturedOnParty?.({ id: "party-1" }));

    // The next two POSTs: create-operation → create-line.
    const f = fetch as ReturnType<typeof vi.fn>;
    f.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ operation: { id: "op-new" } }),
    }).mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({}) });

    fireEvent.click(screen.getByRole("button", { name: /Darf ich liefern/i }));

    // Operation created with the chosen destination as ship-to.
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

    // A line is added for the persisted item under the new operation id.
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

    // The existing VerdictPanel is mounted with the new operation id — no
    // verdict is synthesised here; it fetches /[id]/assess itself.
    await waitFor(() =>
      expect(screen.getByTestId("verdict-panel")).toBeTruthy(),
    );
    expect(
      screen.getByTestId("verdict-panel").getAttribute("data-operation-id"),
    ).toBe("op-new");
  });

  it("Screen 4: the assess button is disabled until a buyer is chosen", async () => {
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
