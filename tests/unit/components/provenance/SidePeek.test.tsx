/**
 * SidePeek — tests focused on the render paths that DON'T depend on
 * network. We exercise the `initialData` path (no fetch) across closed,
 * open-with-data, and upstream-navigation scenarios.
 *
 * Keyboard (ESC) handling + backdrop click are DOM-only and covered too.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SidePeek, type TraceDTO } from "@/components/provenance";

// Mock LanguageProvider to avoid pulling i18n JSON into the test.
vi.mock("@/components/providers/LanguageProvider", () => ({
  useLanguage: () => ({
    language: "en",
    setLanguage: () => {},
    t: (key: string) => key,
  }),
}));

// ─── Fixtures ──────────────────────────────────────────────────────────

const TRACE_A: TraceDTO = {
  id: "t_a",
  entityType: "operator_profile",
  entityId: "op_1",
  fieldName: "operatorType",
  value: "satellite_operator",
  origin: "assessment",
  sourceRef: {
    kind: "assessment",
    assessmentId: "assess_1",
    questionId: "q_3",
  },
  confidence: null,
  modelVersion: null,
  derivedAt: "2026-01-15T12:00:00Z",
  expiresAt: "2027-01-15T12:00:00Z",
  upstreamTraceIds: ["t_b"],
};

const TRACE_B: TraceDTO = {
  id: "t_b",
  entityType: "assessment",
  entityId: "assess_1",
  fieldName: "q_3",
  value: "satellite_operator",
  origin: "user-asserted",
  sourceRef: {
    kind: "user-edit",
    userId: "u_1",
    editedAt: "2026-01-14T10:00:00Z",
  },
  confidence: null,
  modelVersion: null,
  derivedAt: "2026-01-14T10:00:00Z",
  expiresAt: null,
  upstreamTraceIds: [],
};

// ─── Closed state ──────────────────────────────────────────────────────

describe("SidePeek closed state", () => {
  it("renders nothing when traceId is null", () => {
    const { container } = render(
      <SidePeek
        traceId={null}
        onClose={() => {}}
        initialData={{ trace: TRACE_A, upstream: [TRACE_A, TRACE_B] }}
      />,
    );
    // AnimatePresence renders nothing when children are absent.
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });
});

// ─── Open with data ────────────────────────────────────────────────────

describe("SidePeek open with initialData", () => {
  it("renders the dialog when traceId is non-null", () => {
    render(
      <SidePeek
        traceId="t_a"
        onClose={() => {}}
        initialData={{ trace: TRACE_A, upstream: [TRACE_A, TRACE_B] }}
      />,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renders the field identity", () => {
    render(
      <SidePeek
        traceId="t_a"
        onClose={() => {}}
        initialData={{ trace: TRACE_A, upstream: [TRACE_A, TRACE_B] }}
      />,
    );
    expect(
      screen.getByText("operator_profile.operatorType"),
    ).toBeInTheDocument();
    expect(screen.getByText("satellite_operator")).toBeInTheDocument();
  });

  it("renders the origin label (from the trust-tokens i18n key)", () => {
    render(
      <SidePeek
        traceId="t_a"
        onClose={() => {}}
        initialData={{ trace: TRACE_A, upstream: [TRACE_A, TRACE_B] }}
      />,
    );
    expect(
      screen.getByText("provenance.origin_assessment"),
    ).toBeInTheDocument();
  });

  it("renders sourceRef keys + values", () => {
    render(
      <SidePeek
        traceId="t_a"
        onClose={() => {}}
        initialData={{ trace: TRACE_A, upstream: [TRACE_A, TRACE_B] }}
      />,
    );
    expect(screen.getByText("assessmentId")).toBeInTheDocument();
    expect(screen.getByText("assess_1")).toBeInTheDocument();
    expect(screen.getByText("questionId")).toBeInTheDocument();
    // q_3 is the value for the questionId row — multiple elements may
    // contain "q_3" since it also appears in the upstream fieldName, so
    // query for all and assert there's at least one.
    expect(screen.getAllByText("q_3").length).toBeGreaterThan(0);
  });

  it("lists the upstream trace (excluding self)", () => {
    render(
      <SidePeek
        traceId="t_a"
        onClose={() => {}}
        initialData={{ trace: TRACE_A, upstream: [TRACE_A, TRACE_B] }}
      />,
    );
    // Upstream section shows count (1 — self was filtered out).
    expect(screen.getByText(/Upstream \(1\)/)).toBeInTheDocument();
    // The upstream fieldName appears in the list. There may be multiple
    // matches ("q_3" appears in the sourceRef too), so just verify presence.
    expect(screen.getAllByText("q_3").length).toBeGreaterThan(0);
  });

  it("shows confidence + model for ai-inferred traces", () => {
    const aiTrace: TraceDTO = {
      ...TRACE_A,
      origin: "ai-inferred",
      confidence: 0.82,
      modelVersion: "claude-sonnet-4-6",
    };
    render(
      <SidePeek
        traceId="t_a"
        onClose={() => {}}
        initialData={{ trace: aiTrace, upstream: [aiTrace] }}
      />,
    );
    expect(screen.getByText("82%")).toBeInTheDocument();
    expect(screen.getByText("claude-sonnet-4-6")).toBeInTheDocument();
  });

  it("shows 'No source ref attached' when sourceRef is null", () => {
    const bareTrace: TraceDTO = { ...TRACE_A, sourceRef: null };
    render(
      <SidePeek
        traceId="t_a"
        onClose={() => {}}
        initialData={{ trace: bareTrace, upstream: [bareTrace] }}
      />,
    );
    expect(screen.getByText(/No source ref attached/i)).toBeInTheDocument();
  });
});

// ─── Interactions ──────────────────────────────────────────────────────

describe("SidePeek interactions", () => {
  it("fires onClose when the X button is clicked", () => {
    const onClose = vi.fn();
    render(
      <SidePeek
        traceId="t_a"
        onClose={onClose}
        initialData={{ trace: TRACE_A, upstream: [TRACE_A] }}
      />,
    );
    fireEvent.click(screen.getByLabelText(/common\.close/i));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("fires onClose when ESC is pressed", () => {
    const onClose = vi.fn();
    render(
      <SidePeek
        traceId="t_a"
        onClose={onClose}
        initialData={{ trace: TRACE_A, upstream: [TRACE_A] }}
      />,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does NOT fire onClose for other keys", () => {
    const onClose = vi.fn();
    render(
      <SidePeek
        traceId="t_a"
        onClose={onClose}
        initialData={{ trace: TRACE_A, upstream: [TRACE_A] }}
      />,
    );
    fireEvent.keyDown(window, { key: "Enter" });
    fireEvent.keyDown(window, { key: "a" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("fires onNavigate with upstream trace id when clicked", () => {
    const onNavigate = vi.fn();
    render(
      <SidePeek
        traceId="t_a"
        onClose={() => {}}
        onNavigate={onNavigate}
        initialData={{ trace: TRACE_A, upstream: [TRACE_A, TRACE_B] }}
      />,
    );
    // Upstream section renders a button per upstream item when onNavigate
    // is set. Click it.
    const buttons = screen.getAllByRole("button");
    // Filter to the one that contains the upstream fieldName.
    const upstreamButton = buttons.find((b) => b.textContent?.includes("q_3"));
    expect(upstreamButton).toBeTruthy();
    fireEvent.click(upstreamButton!);
    expect(onNavigate).toHaveBeenCalledWith("t_b");
  });

  it("renders upstream items as non-clickable divs when onNavigate is absent", () => {
    const { container } = render(
      <SidePeek
        traceId="t_a"
        onClose={() => {}}
        initialData={{ trace: TRACE_A, upstream: [TRACE_A, TRACE_B] }}
      />,
    );
    // The upstream item should be a <div>, not a <button>, when onNavigate is absent.
    const upstreamList = container.querySelector("ol");
    expect(upstreamList).toBeTruthy();
    expect(upstreamList!.querySelector("button")).toBeNull();
  });
});
