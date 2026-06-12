import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock(
  "lucide-react",
  () =>
    new Proxy(
      {},
      {
        get: (_t, n: string) => {
          const I = (p: Record<string, unknown>) => (
            <span data-testid={`icon-${n}`} {...p} />
          );
          I.displayName = n;
          return I;
        },
      },
    ),
);
vi.mock("@/components/trade/ClassificationPanel", () => ({
  ClassificationPanel: () => <div data-testid="classification-panel" />,
}));

import { VerdictPanel } from "./VerdictPanel";

const GO = {
  assessment: {
    operationId: "op1",
    counterpartyId: "tp1",
    verdict: "GO",
    headline: "🟢 Darf liefern — keine Genehmigung erforderlich",
    steps: [
      {
        step: "classify",
        status: "done",
        summary: "Alle Artikel klassifiziert",
        why: "",
      },
      { step: "screen", status: "done", summary: "Acme: sauber", why: "" },
      {
        step: "jurisdiction",
        status: "done",
        summary: "Keine US-Anteile",
        why: "",
      },
      {
        step: "license",
        status: "done",
        summary: "Keine Genehmigung",
        why: "",
      },
      { step: "form", status: "done", summary: "Kein Antrag nötig", why: "" },
    ],
    pendenzen: [],
    lines: [],
  },
};
const REVIEW = {
  assessment: {
    ...GO.assessment,
    verdict: "REVIEW",
    headline: "🟡 Genehmigung nötig",
    steps: [
      { step: "classify", status: "done", summary: "ok", why: "" },
      {
        step: "screen",
        status: "gap",
        summary: "noch nicht gescreent",
        why: "",
      },
      { step: "jurisdiction", status: "done", summary: "ok", why: "" },
      {
        step: "license",
        status: "gap",
        summary: "Genehmigung erforderlich",
        why: "",
      },
      {
        step: "form",
        status: "gap",
        summary: "BAFA-Antrag vorbereiten",
        why: "",
      },
    ],
    pendenzen: [{ label: "BAFA-Antrag (ELAN-K2) erstellen" }],
  },
};

beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => vi.unstubAllGlobals());

describe("VerdictPanel", () => {
  it("renders the green verdict headline after fetching", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => GO,
    });
    render(<VerdictPanel operationId="op1" />);
    await waitFor(() => expect(screen.getByText(/Darf liefern/)).toBeTruthy());
    expect(fetch).toHaveBeenCalledWith("/api/trade/operations/op1/assess");
  });
  it("renders pendenzen + an inline screen action for a review verdict", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => REVIEW,
    });
    render(<VerdictPanel operationId="op1" />);
    await waitFor(() =>
      expect(screen.getByText(/Genehmigung nötig/)).toBeTruthy(),
    );
    expect(screen.getByText(/BAFA-Antrag/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /screenen/i })).toBeTruthy();
  });
  it("renders 'Bewertet unter' line with assessedUnder value when present", async () => {
    const withSeat = {
      assessment: { ...GO.assessment, assessedUnder: "EU_ANNEX_I" },
    };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => withSeat,
    });
    render(<VerdictPanel operationId="op1" />);
    await waitFor(() =>
      expect(screen.getByTestId("assessed-under-line")).toBeTruthy(),
    );
    expect(screen.getByText("EU_ANNEX_I")).toBeTruthy();
  });
  it("renders 'EU (Standard)' fallback when assessedUnder is absent", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => GO,
    });
    render(<VerdictPanel operationId="op1" />);
    await waitFor(() =>
      expect(screen.getByTestId("assessed-under-line")).toBeTruthy(),
    );
    expect(screen.getByText("EU (Standard)")).toBeTruthy();
  });
  it("renders originNotice when set", async () => {
    const withNotice = {
      assessment: {
        ...GO.assessment,
        originNotice:
          "Exporteur-Sitz im Org-Profil nicht gesetzt — Bewertung nimmt EU-Standard an",
      },
    };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => withNotice,
    });
    render(<VerdictPanel operationId="op1" />);
    await waitFor(() =>
      expect(screen.getByText(/EU-Standard an/)).toBeTruthy(),
    );
  });
});
