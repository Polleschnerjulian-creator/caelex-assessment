/**
 * BeneficialOwnersPanel — per-row delete confirmation guard (F5a)
 *
 * Tests:
 *  (a) Clicking the trash button does NOT immediately call fetch;
 *      instead, a confirm affordance ("Remove?" label) appears.
 *  (b) Clicking the confirm button calls fetch with DELETE to the owners endpoint.
 *  (c) Clicking cancel hides the confirm affordance without calling DELETE.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

// Stub lucide-react icons with lightweight span proxies (mirrors VerdictPanel.test.tsx pattern)
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

// Import AFTER vi.mock hoisting is complete
import { BeneficialOwnersPanel } from "./BeneficialOwnersPanel";

// ── Fixture data ───────────────────────────────────────────────────────
const EDGE_ID = "edge-abc-123";
const PARTY_ID = "party-xyz-456";

const OWNERS_RESPONSE = {
  owners: [
    {
      id: EDGE_ID,
      percent: 0.6,
      controlType: "economic",
      notes: null,
      createdAt: "2026-01-01T00:00:00Z",
      owner: {
        id: "owner-001",
        legalName: "Acme Holdings GmbH",
        countryCode: "DE",
        screeningStatus: "CLEAR",
        status: "ACTIVE",
        isHighRiskCountry: false,
      },
    },
  ],
};

// ── Helpers ────────────────────────────────────────────────────────────
function makeFetchMock(overrides?: { deleteOk?: boolean }) {
  return vi.fn((url: string, opts?: RequestInit) => {
    if (!opts || opts.method !== "DELETE") {
      // GET /owners — return fixture
      return Promise.resolve({
        ok: true,
        json: async () => OWNERS_RESPONSE,
      });
    }
    // DELETE call
    if (overrides?.deleteOk === false) {
      return Promise.resolve({
        ok: false,
        json: async () => ({ error: "Not found" }),
      });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
}

beforeEach(() => vi.stubGlobal("fetch", makeFetchMock()));
afterEach(() => vi.unstubAllGlobals());

// ── Tests ──────────────────────────────────────────────────────────────
describe("BeneficialOwnersPanel delete confirmation guard", () => {
  it("(a) clicking the trash button shows confirm affordance but does NOT call DELETE", async () => {
    render(<BeneficialOwnersPanel partyId={PARTY_ID} partyName="Test Party" />);

    // Wait for the owner row to load
    await waitFor(() =>
      expect(screen.getByText("Acme Holdings GmbH")).toBeTruthy(),
    );

    // The confirm affordance should NOT be visible yet
    expect(screen.queryByRole("button", { name: /confirm/i })).toBeNull();
    expect(screen.queryByText(/remove\?/i)).toBeNull();

    // Click the trash button (title = "Remove ownership edge")
    const trashBtn = screen.getByTitle("Remove ownership edge");
    fireEvent.click(trashBtn);

    // Confirm affordance should now appear
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /confirm/i }) ||
          screen.queryByText(/remove\?/i),
      ).toBeTruthy(),
    );

    // No DELETE should have been issued — only the initial GET
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    const deleteCalls = fetchMock.mock.calls.filter(
      ([, opts]) => opts?.method === "DELETE",
    );
    expect(deleteCalls).toHaveLength(0);
  });

  it("(b) clicking the confirm button calls DELETE on the correct endpoint", async () => {
    render(<BeneficialOwnersPanel partyId={PARTY_ID} partyName="Test Party" />);

    await waitFor(() =>
      expect(screen.getByText("Acme Holdings GmbH")).toBeTruthy(),
    );

    // Open confirm state
    fireEvent.click(screen.getByTitle("Remove ownership edge"));

    // Wait for confirm button to appear, then click it
    const confirmBtn = await screen.findByRole("button", { name: /confirm/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      const fetchMock = fetch as ReturnType<typeof vi.fn>;
      const deleteCalls = fetchMock.mock.calls.filter(
        ([, opts]) => opts?.method === "DELETE",
      );
      expect(deleteCalls).toHaveLength(1);
      expect(deleteCalls[0][0]).toBe(
        `/api/trade/parties/${PARTY_ID}/owners/${EDGE_ID}`,
      );
    });
  });

  it("(c) clicking cancel hides the confirm affordance and does NOT call DELETE", async () => {
    render(<BeneficialOwnersPanel partyId={PARTY_ID} partyName="Test Party" />);

    await waitFor(() =>
      expect(screen.getByText("Acme Holdings GmbH")).toBeTruthy(),
    );

    // Open confirm state
    fireEvent.click(screen.getByTitle("Remove ownership edge"));

    // Wait for the cancel button to appear
    const cancelBtn = await screen.findByRole("button", { name: /cancel/i });

    // Click cancel
    fireEvent.click(cancelBtn);

    // Confirm affordance should disappear
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /confirm/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /cancel/i })).toBeNull();
    });

    // No DELETE should have been issued
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    const deleteCalls = fetchMock.mock.calls.filter(
      ([, opts]) => opts?.method === "DELETE",
    );
    expect(deleteCalls).toHaveLength(0);
  });
});
