import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

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

import { ItemPicker } from "./ItemPicker";
import { PartyPicker } from "./PartyPicker";

beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => vi.unstubAllGlobals());

describe("ItemPicker", () => {
  it("fetches /api/trade/items?q= and renders a classified status pill", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "i1",
            name: "TTC Transceiver",
            internalSku: "TTC-1",
            eccnEU: "9A515.a",
            status: "CLASSIFIED",
          },
        ],
      }),
    });
    const onSelect = vi.fn();
    render(<ItemPicker onSelect={onSelect} />);
    fireEvent.change(screen.getByTestId("picker-input"), {
      target: { value: "ttc" },
    });
    await waitFor(() =>
      expect(screen.getByText(/TTC Transceiver/)).toBeTruthy(),
    );
    expect(screen.getByText(/klassifiziert/i)).toBeTruthy();
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("/api/trade/items?q=ttc");
  });
});

describe("PartyPicker", () => {
  it("fetches /api/trade/parties?q= and renders a screening pill", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        parties: [
          {
            id: "p1",
            legalName: "Acme Space SAS",
            countryCode: "FR",
            status: "ACTIVE",
            screeningStatus: "CLEAR",
          },
        ],
      }),
    });
    render(<PartyPicker onSelect={vi.fn()} />);
    fireEvent.change(screen.getByTestId("picker-input"), {
      target: { value: "acme" },
    });
    await waitFor(() =>
      expect(screen.getByText(/Acme Space SAS/)).toBeTruthy(),
    );
    expect(screen.getByText(/FR/)).toBeTruthy();
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("/api/trade/parties?q=acme");
  });
});
