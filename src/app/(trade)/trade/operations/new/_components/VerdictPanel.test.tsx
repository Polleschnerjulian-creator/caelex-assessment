import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// next/link must be stubbed (tests/setup.tsx mocks next/navigation + next/image
// but not next/link). VerdictPanel renders <Link>; the real App-Router next/link
// runs a `useIntersection` prefetch effect that calls `new IntersectionObserver`,
// which throws against the jsdom IntersectionObserver stub. Same children-only
// stub the sibling new/page.test.tsx uses — these tests never assert on a link.
vi.mock("next/link", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// lucide-react stub. Two vitest-4 constraints rule out the catch-all `Proxy`
// pattern used elsewhere in the trade tests, so we enumerate the icons
// VerdictPanel imports explicitly — the same shape the passing sibling tests use
// (e.g. src/app/verify/VerifyAnchorClient.test.tsx):
//   1. A Proxy get-trap returns a truthy function for EVERY key — including
//      `then` — which makes the mocked module's namespace look like a thenable.
//      Vitest's module runner awaits that namespace while resolving the import
//      and calls its `then`, but the icon stub ignores the resolve/reject
//      callbacks, so the promise never settles: the whole FILE hangs at
//      COLLECTION (0% CPU, no test ever runs), on both node 20 and node 24.
//   2. Vitest 4 validates named imports against a mock's enumerable exports; a
//      Proxy reports none, so `import { Loader2 }` throws "No Loader2 export".
// An explicit object has real keys and no `then`, sidestepping both. Only the
// icons VerdictPanel itself imports are needed — its icon-using children
// (ClassificationPanel/ExplainedPanel/WasJetztPanel) are stubbed below.
vi.mock("lucide-react", () => {
  const icon = (name: string) => {
    const I = (p: Record<string, unknown>) => (
      <span data-testid={`icon-${name}`} {...p} />
    );
    I.displayName = name;
    return I;
  };
  return {
    CheckCircle2: icon("CheckCircle2"),
    AlertTriangle: icon("AlertTriangle"),
    XCircle: icon("XCircle"),
    Loader2: icon("Loader2"),
    RefreshCw: icon("RefreshCw"),
    ShieldCheck: icon("ShieldCheck"),
    ShieldAlert: icon("ShieldAlert"),
    Info: icon("Info"),
  };
});
vi.mock("@/components/trade/ClassificationPanel", () => ({
  ClassificationPanel: () => <div data-testid="classification-panel" />,
}));
// Isolate VerdictPanel from its heavy children: WasJetztPanel (renders for
// non-GO with a non-empty licenseDetermination and does its own async work) and
// ExplainedPanel. Without these stubs a REVIEW fixture carrying real lines wedges
// the jsdom runner on an unmocked child effect. The origin-licence line under
// test lives in VerdictPanel itself, so stubbing the children is sound.
vi.mock("./WasJetztPanel", () => ({
  WasJetztPanel: () => <div data-testid="was-jetzt-panel" />,
}));
vi.mock("@/components/trade/ExplainedPanel", () => ({
  ExplainedPanel: () => <div data-testid="explained-panel" />,
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
    // Match the headline specifically: the GO liability note (LIABILITY_COPY
    // .goNote) also begins with "Darf liefern", so a bare /Darf liefern/ is
    // ambiguous. The "— keine Genehmigung" tail is unique to the headline.
    await waitFor(() =>
      expect(screen.getByText(/Darf liefern — keine Genehmigung/)).toBeTruthy(),
    );
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
    // Match the pendenz label specifically: the "form" step summary also
    // contains "BAFA-Antrag" ("BAFA-Antrag vorbereiten"), so scope to the
    // "(ELAN-K2)" that is unique to the pendenz.
    expect(screen.getByText(/BAFA-Antrag \(ELAN-K2\)/)).toBeTruthy();
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

  // W2 — origin licence detail (Spec §4.6). The engine folds the origin verdict
  // into a per-line requirement with an ORIGIN_* triggerCode; the panel surfaces
  // WHICH licence governs, including a GO under a named general licence.
  it("renders the origin general-licence detail (id + conditions) for a GO", async () => {
    const goUnderEu001 = {
      assessment: {
        ...GO.assessment,
        assessedUnder: "EU_ANNEX_I",
        lines: [
          {
            lineId: "l1",
            itemId: "i1",
            itemName: "Star tracker",
            classification: {
              licenseDetermination: {
                requirements: [
                  {
                    jurisdiction:
                      "Exporteur-Sitz (EU national competent authority — BAFA)",
                    triggerCode: "ORIGIN_GENERAL_LICENCE",
                    applicableException: {
                      code: "EU001",
                      label:
                        "EUGEA EU001 — Union General Export Authorisation (friendly destinations)",
                      citation: "Reg (EU) 2021/821 Annex II",
                      conditions: [
                        "Vor erster Nutzung bei der NCA registrieren",
                        "Zollanmeldung EU001 angeben",
                      ],
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => goUnderEu001,
    });
    render(<VerdictPanel operationId="op1" />);
    await waitFor(() =>
      expect(screen.getByTestId("origin-licence-line")).toBeTruthy(),
    );
    const line = screen.getByTestId("origin-licence-line");
    expect(line.textContent).toContain("EUGEA EU001");
    expect(line.textContent).toContain("Auflagen");
    expect(line.textContent).toContain("registrieren");
  });

  it("renders the individual-at-NCA origin detail for a review", async () => {
    const reviewSiel = {
      assessment: {
        ...REVIEW.assessment,
        lines: [
          {
            lineId: "l1",
            itemId: "i1",
            itemName: "Sat bus 9A004",
            classification: {
              licenseDetermination: {
                requirements: [
                  {
                    jurisdiction: "Exporteur-Sitz (ECJU)",
                    triggerCode: "ORIGIN_INDIVIDUAL_LICENCE",
                  },
                ],
              },
            },
          },
        ],
      },
    };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => reviewSiel,
    });
    render(<VerdictPanel operationId="op1" />);
    await waitFor(() =>
      expect(screen.getByTestId("origin-licence-line")).toBeTruthy(),
    );
    expect(screen.getByText(/Einzelgenehmigung bei ECJU/)).toBeTruthy();
  });
});
