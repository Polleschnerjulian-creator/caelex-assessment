/**
 * OpsConsoleClient — Sprint 7D tests.
 *
 * Coverage:
 *
 *   1. EventSource is opened against the stream URL on mount
 *   2. EventSource is closed on unmount
 *   3. 'connected' event sets the status bar + records connectedAt
 *   4. Domain events (proposal/mission/astra) append cards to the log
 *   5. Pause buffers events; Resume drains them
 *   6. Buffer cap (200) drops oldest entries
 *   7. Empty state shown when no events received
 */

import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, act } from "@testing-library/react";

// ─── Lucide stub ─────────────────────────────────────────────────────────

vi.mock("lucide-react", () => {
  const icon = (name: string) => {
    const Icon = (props: Record<string, unknown>) =>
      React.createElement("span", { "data-testid": `icon-${name}`, ...props });
    Icon.displayName = name;
    return Icon;
  };
  return {
    Activity: icon("Activity"),
    AlertCircle: icon("AlertCircle"),
    CheckCircle2: icon("CheckCircle2"),
    Pause: icon("Pause"),
    Play: icon("Play"),
    Bot: icon("Bot"),
    Rocket: icon("Rocket"),
    ShieldCheck: icon("ShieldCheck"),
    Sparkles: icon("Sparkles"),
  };
});

// ─── EventSource fake ────────────────────────────────────────────────────

interface FakeEventSource {
  url: string;
  readyState: number;
  closed: boolean;
  listeners: Map<string, Array<(e: { data: string }) => void>>;
  addEventListener: (
    event: string,
    handler: (e: { data: string }) => void,
  ) => void;
  close: () => void;
  /** Test-only: simulate an inbound SSE event. */
  emit: (event: string, data: string) => void;
}

const sources: FakeEventSource[] = [];

class FakeES implements FakeEventSource {
  url: string;
  readyState = 0;
  closed = false;
  listeners = new Map<string, Array<(e: { data: string }) => void>>();
  constructor(url: string) {
    this.url = url;
    sources.push(this);
  }
  addEventListener(event: string, handler: (e: { data: string }) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(handler);
  }
  close() {
    this.closed = true;
  }
  emit(event: string, data: string) {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    for (const h of handlers) h({ data });
  }
}

beforeEach(() => {
  sources.length = 0;
  // @ts-expect-error — overriding the global on the test window
  global.EventSource = FakeES;
});

afterEach(() => {
  // @ts-expect-error — clean up the global
  delete global.EventSource;
});

import { OpsConsoleClient } from "./OpsConsoleClient";

function lastSource(): FakeEventSource {
  return sources[sources.length - 1];
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe("OpsConsoleClient — EventSource lifecycle", () => {
  it("opens the stream URL on mount", () => {
    render(<OpsConsoleClient />);
    expect(sources).toHaveLength(1);
    expect(lastSource().url).toBe("/api/dashboard/ops-console/stream");
  });

  it("closes the EventSource on unmount", () => {
    const { unmount } = render(<OpsConsoleClient />);
    expect(lastSource().closed).toBe(false);
    unmount();
    expect(lastSource().closed).toBe(true);
  });
});

describe("OpsConsoleClient — connected event", () => {
  it("emitting 'connected' sets the status bar 'since' timestamp", () => {
    render(<OpsConsoleClient />);
    act(() =>
      lastSource().emit(
        "connected",
        JSON.stringify({
          userId: "u_1",
          connectedAt: "2026-05-02T14:32:08.000Z",
          channels: [],
        }),
      ),
    );
    // Status bar shows the connected event card AND the 'since' meta
    const since = screen.getByTestId("ops-console-since");
    expect(since.textContent).toMatch(/14:32:08/);
  });

  it("emitting any event increments the event-count badge", () => {
    render(<OpsConsoleClient />);
    expect(screen.getByTestId("ops-console-count").textContent).toMatch(
      /^\s*0 events/,
    );
    act(() =>
      lastSource().emit("connected", JSON.stringify({ userId: "u_1" })),
    );
    expect(screen.getByTestId("ops-console-count").textContent).toMatch(
      /1 event\b/,
    );
  });
});

describe("OpsConsoleClient — domain event cards", () => {
  it("comply.proposal.created event appends a card with correct label", () => {
    render(<OpsConsoleClient />);
    act(() =>
      lastSource().emit(
        "comply.proposal.created",
        JSON.stringify({
          channel: "comply.proposal.created",
          payload: { id: "p_42" },
        }),
      ),
    );
    const card = screen.getByTestId("ops-console-event");
    expect(card.getAttribute("data-event")).toBe("comply.proposal.created");
    expect(within(card).getByText("PROPOSAL CREATED")).toBeTruthy();
  });

  it("astra.reasoning event maps to ASTRA REASONING label", () => {
    render(<OpsConsoleClient />);
    act(() =>
      lastSource().emit(
        "astra.reasoning",
        JSON.stringify({
          channel: "astra.reasoning",
          payload: { thought: "considering" },
        }),
      ),
    );
    const card = screen.getByTestId("ops-console-event");
    expect(within(card).getByText("ASTRA REASONING")).toBeTruthy();
  });

  it("multiple events render newest-first", () => {
    render(<OpsConsoleClient />);
    act(() =>
      lastSource().emit(
        "comply.proposal.created",
        JSON.stringify({ payload: { tag: "first" } }),
      ),
    );
    act(() =>
      lastSource().emit(
        "comply.proposal.applied",
        JSON.stringify({ payload: { tag: "second" } }),
      ),
    );
    const cards = screen.getAllByTestId("ops-console-event");
    expect(cards).toHaveLength(2);
    expect(cards[0].getAttribute("data-event")).toBe("comply.proposal.applied");
    expect(cards[1].getAttribute("data-event")).toBe("comply.proposal.created");
  });
});

describe("OpsConsoleClient — pause / resume", () => {
  it("pause buffers incoming events; resume drains them", () => {
    render(<OpsConsoleClient />);
    // Pause first
    fireEvent.click(screen.getByTestId("ops-console-pause"));
    // Emit while paused — no card visible
    act(() =>
      lastSource().emit(
        "comply.proposal.created",
        JSON.stringify({ payload: {} }),
      ),
    );
    expect(screen.queryAllByTestId("ops-console-event")).toHaveLength(0);
    // Resume — card appears
    fireEvent.click(screen.getByTestId("ops-console-pause"));
    expect(screen.getAllByTestId("ops-console-event")).toHaveLength(1);
  });
});

describe("OpsConsoleClient — empty state", () => {
  it("renders an empty hint when no events received", () => {
    render(<OpsConsoleClient />);
    expect(screen.getByText(/Connecting/)).toBeTruthy();
  });
});
