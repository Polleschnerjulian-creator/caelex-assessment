import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock(
  "lucide-react",
  () =>
    new Proxy(
      {},
      {
        get: (_t, n: string) => {
          const I = (p: Record<string, unknown>) => (
            <span data-testid={`icon-${String(n)}`} {...p} />
          );
          I.displayName = String(n);
          return I;
        },
      },
    ),
);

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import {
  TradeCommandPalette,
  TRADE_COMMAND_EVENT,
} from "./TradeCommandPalette";

beforeEach(() => push.mockReset());

describe("TradeCommandPalette", () => {
  it("is closed initially (pill visible, list hidden)", () => {
    render(<TradeCommandPalette />);
    expect(screen.getByTestId("cmdk-pill")).toBeTruthy();
    expect(screen.queryByTestId("cmdk-list")).toBeNull();
  });

  it("opens on ⌘K and lists actions", () => {
    render(<TradeCommandPalette />);
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(screen.getByTestId("cmdk-list")).toBeTruthy();
    expect(screen.getByText(/Neuer Vorgang/i)).toBeTruthy();
  });

  it("filters by typed query", () => {
    render(<TradeCommandPalette />);
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    fireEvent.change(screen.getByTestId("cmdk-input"), {
      target: { value: "screen" },
    });
    expect(screen.getByText(/Partner screenen/i)).toBeTruthy();
    expect(screen.queryByText(/Neuer Vorgang/i)).toBeNull();
  });

  it("navigates on selecting an action", () => {
    render(<TradeCommandPalette />);
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    fireEvent.click(screen.getByText(/Neuer Vorgang/i));
    expect(push).toHaveBeenCalledWith("/trade/operations/new");
  });

  it("hides the pill but stays keyboard-driven when showPill=false (shell mount)", () => {
    render(<TradeCommandPalette showPill={false} />);
    expect(screen.queryByTestId("cmdk-pill")).toBeNull();
    // still opens on ⌘K
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(screen.getByTestId("cmdk-list")).toBeTruthy();
  });

  it("opens when the TRADE_COMMAND_EVENT window event is dispatched (header pill → shell palette)", () => {
    render(<TradeCommandPalette showPill={false} />);
    expect(screen.queryByTestId("cmdk-list")).toBeNull();
    fireEvent(window, new Event(TRADE_COMMAND_EVENT));
    expect(screen.getByTestId("cmdk-list")).toBeTruthy();
  });
});
