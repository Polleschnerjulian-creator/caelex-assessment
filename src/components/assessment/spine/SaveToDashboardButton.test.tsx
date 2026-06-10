/**
 * DOM tests for SaveToDashboardButton (plan Task 3.6).
 *
 * The button consumes the Task 3.5 snapshot-import contract:
 *   POST /api/tracker/import-assessment  { verdictSnapshotId }
 *   → 200 { imported: true, articles, deadlines } | 4xx { error }
 *
 * Plan-mandated assertions:
 *   - posts the snapshot id to the import endpoint;
 *   - the SAVED state is reflected with the server's REAL counts;
 *   - error states render honestly (the server's own message on 4xx; a
 *     connection message on network failure; a 2xx WITHOUT `imported: true`
 *     is an error, never an assumed success).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SaveToDashboardButton from "./SaveToDashboardButton";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  // vi.stubGlobal so vi.unstubAllGlobals() restores MSW's original fetch
  // (tests/setup.tsx) — `delete global.fetch` would break its teardown.
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe("SaveToDashboardButton — the Task 3.5 import contract", () => {
  it("POSTs the verdict snapshot id to /api/tracker/import-assessment", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { imported: true, articles: 12, deadlines: 3 }),
    );
    render(<SaveToDashboardButton verdictSnapshotId="snap_42" />);

    fireEvent.click(screen.getByRole("button", { name: /Save to dashboard/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/tracker/import-assessment");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ verdictSnapshotId: "snap_42" });
  });

  it("reflects the saved state with the server's REAL counts", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { imported: true, articles: 12, deadlines: 3 }),
    );
    render(<SaveToDashboardButton verdictSnapshotId="snap_42" />);

    fireEvent.click(screen.getByRole("button", { name: /Save to dashboard/i }));

    const status = await screen.findByRole("status");
    expect(status.textContent).toMatch(/Saved to your dashboard/i);
    expect(status.textContent).toMatch(/12 article\s*statuses/i);
    expect(status.textContent).toMatch(/3 deadlines/i);
    // The action is done — no second click possible.
    expect(
      screen.queryByRole("button", { name: /Save to dashboard/i }),
    ).not.toBeInTheDocument();
  });

  it("disables the button while the request is in flight", async () => {
    let resolveFetch: (v: unknown) => void = () => {};
    fetchMock.mockImplementation(
      () => new Promise((resolve) => (resolveFetch = resolve)),
    );
    render(<SaveToDashboardButton verdictSnapshotId="snap_42" />);

    fireEvent.click(screen.getByRole("button", { name: /Save to dashboard/i }));

    const busy = await screen.findByRole("button", { name: /Saving/i });
    expect(busy).toBeDisabled();

    resolveFetch(
      jsonResponse(200, { imported: true, articles: 1, deadlines: 0 }),
    );
    await screen.findByRole("status");
  });

  it("renders the server's own error message on a 4xx — and allows retry", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(403, { error: "Forbidden — this snapshot is not yours" }),
    );
    render(<SaveToDashboardButton verdictSnapshotId="snap_42" />);

    fireEvent.click(screen.getByRole("button", { name: /Save to dashboard/i }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/Forbidden — this snapshot is not yours/);
    // Honest failure: nothing claims to be saved, the button stays usable.
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Save to dashboard/i }),
    ).toBeEnabled();
  });

  it("treats a 2xx WITHOUT `imported: true` as an error — success is never assumed", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));
    render(<SaveToDashboardButton verdictSnapshotId="snap_42" />);

    fireEvent.click(screen.getByRole("button", { name: /Save to dashboard/i }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/did not confirm the import/i);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders the connection error on network failure", async () => {
    fetchMock.mockRejectedValue(new TypeError("network down"));
    render(<SaveToDashboardButton verdictSnapshotId="snap_42" />);

    fireEvent.click(screen.getByRole("button", { name: /Save to dashboard/i }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/couldn't reach the server/i);
  });
});
