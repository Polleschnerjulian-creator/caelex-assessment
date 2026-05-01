/**
 * /pulse page tests — Sprint 4B
 *
 * Coverage:
 *
 *   1. Renders hero + form + source list initially
 *   2. Form validation: button is disabled without legalName + email
 *   3. Submit calls /api/public/pulse/detect with the right body
 *   4. Loading state shows during fetch
 *   5. Successful response renders the result panel with merged fields
 *   6. T2_SOURCE_VERIFIED renders the green "Source-verified" badge
 *   7. T0_UNVERIFIED renders the amber "manual setup needed" badge
 *   8. Failed-source rows render the errorKind
 *   9. 429 response renders the rate-limit message
 *  10. 400 with field issues renders the validation messages
 *  11. Network error renders the network-error message
 *  12. "Run another check" button resets the result + form
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";

// Mock framer-motion to avoid animation-related test flakiness — render
// children straight through so assertions still see the DOM.
//
// Note: framer-motion's special props (initial / animate / exit / layout
// etc.) are stripped before passing to the underlying DOM tag — otherwise
// React warns about unknown DOM attributes.
const FRAMER_MOTION_PROPS = new Set([
  "initial",
  "animate",
  "exit",
  "transition",
  "layout",
  "layoutId",
  "variants",
  "whileHover",
  "whileTap",
  "whileFocus",
  "whileInView",
  "drag",
  "dragConstraints",
]);
vi.mock("framer-motion", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const passthrough = (tag: string) => {
    const Comp = (props: any) => {
      const cleaned: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(props)) {
        if (!FRAMER_MOTION_PROPS.has(k)) cleaned[k] = v;
      }
      return React.createElement(tag, cleaned, props.children);
    };
    Comp.displayName = `motion.${tag}`;
    return Comp;
  };
  const AnimatePresence = ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);
  AnimatePresence.displayName = "AnimatePresence";
  return {
    motion: new Proxy(
      {},
      {
        get: (_target, key: string) => passthrough(key),
      },
    ),
    AnimatePresence,
  };
});

// Mock lucide icons as simple span placeholders
vi.mock("lucide-react", () => {
  const icon = (name: string) => {
    const Icon = (props: Record<string, unknown>) =>
      React.createElement("span", { "data-testid": `icon-${name}`, ...props });
    Icon.displayName = name;
    return Icon;
  };
  return {
    ArrowRight: icon("ArrowRight"),
    CheckCircle2: icon("CheckCircle2"),
    Loader2: icon("Loader2"),
    AlertTriangle: icon("AlertTriangle"),
    Shield: icon("Shield"),
    Sparkles: icon("Sparkles"),
    Database: icon("Database"),
    Globe2: icon("Globe2"),
    Satellite: icon("Satellite"),
    Building2: icon("Building2"),
    RefreshCw: icon("RefreshCw"),
    FileDown: icon("FileDown"),
  };
});

// Mock next/link to render plain anchors
vi.mock("next/link", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ children, href, ...rest }: any) =>
    React.createElement("a", { href, ...rest }, children),
}));

import PulsePage from "./page";

const HAPPY_RESPONSE = {
  leadId: "lead_xyz",
  receivedAt: "2026-04-30T10:00:00.000Z",
  successfulSources: ["vies-eu-vat", "gleif-lei"],
  failedSources: [
    {
      source: "celestrak-satcat",
      errorKind: "remote-error",
      message: "CelesTrak returned HTTP 503",
    },
  ],
  mergedFields: [
    {
      fieldName: "establishment",
      value: "DE",
      agreementCount: 2,
      contributingAdapters: ["vies-eu-vat", "gleif-lei"],
    },
  ],
  warnings: ["DE VAT regulations forbid name-disclosure via VIES"],
  bestPossibleTier: "T2_SOURCE_VERIFIED",
};

const T0_RESPONSE = {
  ...HAPPY_RESPONSE,
  successfulSources: [],
  mergedFields: [],
  warnings: [],
  bestPossibleTier: "T0_UNVERIFIED",
};

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

// ─── SSE stream helpers ────────────────────────────────────────────────────
//
// Sprint 4C: the submit handler hits /api/public/pulse/stream which
// returns SSE. Tests must mock the response with a real ReadableStream
// containing the event sequence the page expects.
//
// `makeStreamResponse([...events])` returns an object compatible with
// the mocked `fetch` — `ok: true`, `status: 200`, `body: ReadableStream`.

interface SseEvent {
  event: string;
  data: Record<string, unknown>;
}

function makeStreamResponse(events: SseEvent[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const e of events) {
        controller.enqueue(
          encoder.encode(
            `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`,
          ),
        );
      }
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

/** Default happy-path SSE stream for tests: lead → 2 source-results → complete. */
function happyStreamResponse(): Response {
  return makeStreamResponse([
    {
      event: "lead",
      data: {
        leadId: "lead_xyz",
        receivedAt: "2026-04-30T10:00:00.000Z",
        sources: ["vies-eu-vat", "gleif-lei"],
      },
    },
    { event: "source-checking", data: { source: "vies-eu-vat" } },
    {
      event: "source-result",
      data: {
        source: "vies-eu-vat",
        ok: true,
        fields: [{ fieldName: "establishment", value: "DE" }],
        warnings: ["DE VAT regulations forbid name-disclosure via VIES"],
      },
    },
    { event: "source-checking", data: { source: "gleif-lei" } },
    {
      event: "source-result",
      data: {
        source: "gleif-lei",
        ok: true,
        fields: [{ fieldName: "establishment", value: "DE" }],
        warnings: [],
      },
    },
    {
      event: "complete",
      data: {
        mergedFields: [
          {
            fieldName: "establishment",
            value: "DE",
            agreementCount: 2,
            contributingAdapters: ["vies-eu-vat", "gleif-lei"],
          },
        ],
        warnings: ["DE VAT regulations forbid name-disclosure via VIES"],
        bestPossibleTier: "T2_SOURCE_VERIFIED",
      },
    },
  ]);
}

/** Mixed stream — one success + one failure, for testing failed-source UI. */
function mixedStreamResponse(): Response {
  return makeStreamResponse([
    {
      event: "lead",
      data: {
        leadId: "lead_xyz",
        receivedAt: "2026-04-30T10:00:00.000Z",
        sources: ["vies-eu-vat", "celestrak-satcat"],
      },
    },
    {
      event: "source-result",
      data: {
        source: "vies-eu-vat",
        ok: true,
        fields: [{ fieldName: "establishment", value: "DE" }],
        warnings: [],
      },
    },
    {
      event: "source-result",
      data: {
        source: "celestrak-satcat",
        ok: false,
        errorKind: "remote-error",
        message: "CelesTrak returned HTTP 503",
      },
    },
    {
      event: "complete",
      data: {
        mergedFields: [
          {
            fieldName: "establishment",
            value: "DE",
            agreementCount: 1,
            contributingAdapters: ["vies-eu-vat"],
          },
        ],
        warnings: [],
        bestPossibleTier: "T2_SOURCE_VERIFIED",
      },
    },
  ]);
}

/** T0 stream — adapters didn't find anything. */
function t0StreamResponse(): Response {
  return makeStreamResponse([
    {
      event: "lead",
      data: {
        leadId: "lead_xyz",
        receivedAt: "2026-04-30T10:00:00.000Z",
        sources: ["vies-eu-vat"],
      },
    },
    {
      event: "source-result",
      data: {
        source: "vies-eu-vat",
        ok: false,
        errorKind: "missing-input",
        message: "no vatId",
      },
    },
    {
      event: "complete",
      data: {
        mergedFields: [],
        warnings: [],
        bestPossibleTier: "T0_UNVERIFIED",
      },
    },
  ]);
}

// ─── Initial render ────────────────────────────────────────────────────────

describe("PulsePage — initial render", () => {
  it("renders the hero, form, and source list", () => {
    render(<PulsePage />);
    expect(screen.getByText(/Pulse — your compliance posture/i)).toBeTruthy();
    expect(screen.getByLabelText(/Legal name/i)).toBeTruthy();
    expect(screen.getByLabelText(/EU VAT-ID/i)).toBeTruthy();
    expect(screen.getByLabelText(/Work email/i)).toBeTruthy();
    // All four sources listed before submission
    expect(screen.getAllByText(/VIES/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/GLEIF/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/UNOOSA/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/CelesTrak/).length).toBeGreaterThan(0);
  });

  it("disables the submit button when legalName + email are blank", () => {
    render(<PulsePage />);
    const button = screen.getByRole("button", {
      name: /Run pulse check/i,
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("enables the submit button once legalName + email are filled", () => {
    render(<PulsePage />);
    fireEvent.change(screen.getByLabelText(/Legal name/i), {
      target: { value: "OneWeb" },
    });
    fireEvent.change(screen.getByLabelText(/Work email/i), {
      target: { value: "anna@example.com" },
    });
    const button = screen.getByRole("button", {
      name: /Run pulse check/i,
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });
});

// ─── Submit flow ───────────────────────────────────────────────────────────

describe("PulsePage — submit flow", () => {
  it("POSTs the form data to /api/public/pulse/detect with the right body", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      happyStreamResponse(),
    );

    render(<PulsePage />);
    fireEvent.change(screen.getByLabelText(/Legal name/i), {
      target: { value: "OneWeb Limited" },
    });
    fireEvent.change(screen.getByLabelText(/EU VAT-ID/i), {
      target: { value: "DE123456789" },
    });
    fireEvent.change(screen.getByLabelText(/Work email/i), {
      target: { value: "anna@example.com" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Run pulse check/i }));
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/public/pulse/stream",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
        }),
      }),
    );
    const init = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
    const body = JSON.parse(init.body);
    expect(body).toEqual({
      legalName: "OneWeb Limited",
      email: "anna@example.com",
      vatId: "DE123456789",
    });
  });

  it("omits vatId from the body when blank", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      happyStreamResponse(),
    );

    render(<PulsePage />);
    fireEvent.change(screen.getByLabelText(/Legal name/i), {
      target: { value: "OneWeb" },
    });
    fireEvent.change(screen.getByLabelText(/Work email/i), {
      target: { value: "x@y.com" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Run pulse check/i }));
    });
    const init = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
    const body = JSON.parse(init.body);
    expect(body.vatId).toBeUndefined();
  });
});

// ─── Result rendering ──────────────────────────────────────────────────────

describe("PulsePage — successful result", () => {
  it("renders the source-verified badge for T2_SOURCE_VERIFIED", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      happyStreamResponse(),
    );

    render(<PulsePage />);
    await submitForm();

    await waitFor(() => {
      expect(screen.getByText(/Source-verified data available/i)).toBeTruthy();
    });
    expect(screen.getByText(/Verification result/i)).toBeTruthy();
  });

  it("renders the manual-setup badge for T0_UNVERIFIED", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      t0StreamResponse(),
    );

    render(<PulsePage />);
    await submitForm();

    await waitFor(() => {
      expect(screen.getByText(/manual setup needed/i)).toBeTruthy();
    });
  });

  it("renders the merged fields with agreement count", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      happyStreamResponse(),
    );
    render(<PulsePage />);
    await submitForm();

    await waitFor(() => {
      expect(screen.getByText(/Country of establishment/i)).toBeTruthy();
    });
    expect(screen.getByText(/2\/2 sources confirmed/i)).toBeTruthy();
    expect(screen.getByText("DE")).toBeTruthy();
  });

  it("renders the failed-source errorKind", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mixedStreamResponse(),
    );
    render(<PulsePage />);
    await submitForm();

    await waitFor(() => {
      expect(screen.getAllByText(/remote-error/i).length).toBeGreaterThan(0);
    });
  });

  it("renders the warnings list", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      happyStreamResponse(),
    );
    render(<PulsePage />);
    await submitForm();

    await waitFor(() => {
      expect(
        screen.getByText(/DE VAT regulations forbid name-disclosure/i),
      ).toBeTruthy();
    });
  });

  it("renders the lead ID", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      happyStreamResponse(),
    );
    render(<PulsePage />);
    await submitForm();

    await waitFor(() => {
      expect(screen.getByText(/lead_xyz/)).toBeTruthy();
    });
  });
});

// ─── Error paths ───────────────────────────────────────────────────────────

describe("PulsePage — error handling", () => {
  it("renders the rate-limit message on HTTP 429", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({}),
    });

    render(<PulsePage />);
    await submitForm();

    await waitFor(() => {
      expect(screen.getByText(/per-hour rate limit/i)).toBeTruthy();
    });
  });

  it("renders the validation issues on HTTP 400", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: "Validation failed",
        issues: [
          { path: "vatId", message: "vatId must look like an EU VAT-ID" },
        ],
      }),
    });

    render(<PulsePage />);
    await submitForm();

    await waitFor(() => {
      expect(
        screen.getByText(/vatId must look like an EU VAT-ID/i),
      ).toBeTruthy();
    });
  });

  it("renders the network-error message on fetch reject", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("network down"),
    );

    render(<PulsePage />);
    await submitForm();

    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeTruthy();
    });
  });
});

// ─── Sprint 4D: Download PDF button ────────────────────────────────────────

describe("PulsePage — download PDF button (Sprint 4D)", () => {
  it("renders a download link to /api/public/pulse/report/[leadId] after success", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      happyStreamResponse(),
    );
    render(<PulsePage />);
    await submitForm();

    await waitFor(() => {
      expect(screen.getByText(/Verification result/i)).toBeTruthy();
    });

    const link = screen.getByRole("link", {
      name: /Download 15-page PDF report/i,
    }) as HTMLAnchorElement;
    expect(link.href).toContain("/api/public/pulse/report/lead_xyz");
    expect(link.target).toBe("_blank");
  });
});

// ─── Reset flow ────────────────────────────────────────────────────────────

describe("PulsePage — reset flow", () => {
  it("returns to the form when 'Run another check' is clicked", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      happyStreamResponse(),
    );

    render(<PulsePage />);
    await submitForm();

    await waitFor(() => {
      expect(screen.getByText(/Verification result/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /Run another check/i }));

    await waitFor(() => {
      // Form is back
      expect(screen.getByLabelText(/Legal name/i)).toBeTruthy();
    });
  });
});

// ─── helpers ───────────────────────────────────────────────────────────────

async function submitForm() {
  fireEvent.change(screen.getByLabelText(/Legal name/i), {
    target: { value: "OneWeb Limited" },
  });
  fireEvent.change(screen.getByLabelText(/Work email/i), {
    target: { value: "anna@example.com" },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Run pulse check/i }));
  });
}
