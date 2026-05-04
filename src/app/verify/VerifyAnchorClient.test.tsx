/**
 * VerifyAnchorClient — Sprint 8C tests.
 *
 * Coverage:
 *
 *   1. Form rejects empty / non-hex / wrong-length input client-side
 *   2. Form posts to /api/public/verify-anchor with the lowercase hash
 *   3. Found result renders status badges + calendar hostname + size
 *   4. Not-found result shows the amber XCircle panel
 *   5. 429 rate-limit response shows a friendly retry message
 *   6. Server validation errors surface with message
 *   7. Network errors caught + shown
 */

import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ─── Lucide stubs ────────────────────────────────────────────────────────

vi.mock("lucide-react", () => {
  const icon = (name: string) => {
    const Icon = (props: Record<string, unknown>) =>
      React.createElement("span", { "data-testid": `icon-${name}`, ...props });
    Icon.displayName = name;
    return Icon;
  };
  return {
    Search: icon("Search"),
    Download: icon("Download"),
    CheckCircle2: icon("CheckCircle2"),
    XCircle: icon("XCircle"),
    Clock: icon("Clock"),
    AlertTriangle: icon("AlertTriangle"),
  };
});

import VerifyAnchorClient from "./VerifyAnchorClient";

const VALID_HASH =
  "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  // Use vi.stubGlobal so vi.unstubAllGlobals() restores MSW's
  // original fetch in afterEach — `delete global.fetch` would break
  // MSW's tests/setup.tsx teardown.
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function fillAndSubmit(hash: string) {
  const input = screen.getByTestId("anchor-hash-input") as HTMLInputElement;
  fireEvent.change(input, { target: { value: hash } });
  fireEvent.click(screen.getByTestId("verify-submit"));
}

// ─── Client-side validation ──────────────────────────────────────────────

describe("VerifyAnchorClient — client validation", () => {
  it("shows error for empty input on submit", () => {
    render(<VerifyAnchorClient />);
    fireEvent.click(screen.getByTestId("verify-submit"));
    expect(screen.getByTestId("verify-error").textContent).toMatch(
      /64-character hexadecimal/i,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows error for non-hex input", () => {
    render(<VerifyAnchorClient />);
    fillAndSubmit("not-hex-not-hex-not-hex");
    expect(screen.getByTestId("verify-error")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows error for too-short hex input", () => {
    render(<VerifyAnchorClient />);
    fillAndSubmit("abc123");
    expect(screen.getByTestId("verify-error")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ─── API call ───────────────────────────────────────────────────────────

describe("VerifyAnchorClient — API request shape", () => {
  it("posts to /api/public/verify-anchor with the lowercase anchorHash", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ found: false, anchorHash: VALID_HASH }),
    });
    render(<VerifyAnchorClient />);
    fillAndSubmit(VALID_HASH.toUpperCase());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/public/verify-anchor");
    expect((init as RequestInit).method).toBe("POST");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      anchorHash: VALID_HASH,
    });
  });
});

// ─── Found path ─────────────────────────────────────────────────────────

describe("VerifyAnchorClient — found result", () => {
  it("renders an UPGRADED anchor row with calendar + block height", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        found: true,
        anchorHash: VALID_HASH,
        anchors: [
          {
            status: "UPGRADED",
            calendarUrl: "https://a.pool.opentimestamps.org",
            submittedAt: "2026-01-01T00:00:00Z",
            upgradedAt: "2026-01-01T06:00:00Z",
            blockHeight: 850000,
            proofBase64: "AQID",
            proofBytes: 3,
          },
        ],
      }),
    });
    render(<VerifyAnchorClient />);
    fillAndSubmit(VALID_HASH);
    await waitFor(() =>
      expect(screen.getByTestId("verify-found")).toBeTruthy(),
    );
    const row = screen.getByTestId("verify-anchor-row");
    expect(row.getAttribute("data-status")).toBe("UPGRADED");
    expect(row.textContent).toContain("a.pool.opentimestamps.org");
    expect(row.textContent).toContain("850000");
    expect(row.textContent).toContain("3 bytes");
  });

  it("renders a PENDING anchor row without block height / upgradedAt", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        found: true,
        anchorHash: VALID_HASH,
        anchors: [
          {
            status: "PENDING",
            calendarUrl: "https://b.pool.opentimestamps.org",
            submittedAt: "2026-01-01T00:00:00Z",
            upgradedAt: null,
            blockHeight: null,
            proofBase64: "Aw==",
            proofBytes: 1,
          },
        ],
      }),
    });
    render(<VerifyAnchorClient />);
    fillAndSubmit(VALID_HASH);
    await waitFor(() =>
      expect(screen.getByTestId("verify-found")).toBeTruthy(),
    );
    const row = screen.getByTestId("verify-anchor-row");
    expect(row.getAttribute("data-status")).toBe("PENDING");
    expect(row.textContent).not.toMatch(/Confirmed/i);
    expect(row.textContent).not.toMatch(/BTC block/i);
  });

  it("singular vs plural in the proof-count headline", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        found: true,
        anchorHash: VALID_HASH,
        anchors: [
          {
            status: "PENDING",
            calendarUrl: "https://x.test",
            submittedAt: "2026-01-01T00:00:00Z",
            upgradedAt: null,
            blockHeight: null,
            proofBase64: "AQ==",
            proofBytes: 1,
          },
          {
            status: "UPGRADED",
            calendarUrl: "https://y.test",
            submittedAt: "2026-01-01T00:00:00Z",
            upgradedAt: "2026-01-01T06:00:00Z",
            blockHeight: 1,
            proofBase64: "AQ==",
            proofBytes: 1,
          },
        ],
      }),
    });
    render(<VerifyAnchorClient />);
    fillAndSubmit(VALID_HASH);
    await waitFor(() =>
      expect(screen.getByTestId("verify-found")).toBeTruthy(),
    );
    expect(screen.getByTestId("verify-found").textContent).toMatch(/2 proofs/);
  });
});

// ─── Not-found ──────────────────────────────────────────────────────────

describe("VerifyAnchorClient — not-found result", () => {
  it("renders the not-found panel with the looked-up hash", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ found: false, anchorHash: VALID_HASH }),
    });
    render(<VerifyAnchorClient />);
    fillAndSubmit(VALID_HASH);
    await waitFor(() =>
      expect(screen.getByTestId("verify-not-found")).toBeTruthy(),
    );
    expect(screen.getByTestId("verify-not-found").textContent).toContain(
      VALID_HASH,
    );
  });
});

// ─── Server-side errors ─────────────────────────────────────────────────

describe("VerifyAnchorClient — server errors", () => {
  it("shows rate-limit hint on 429", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: "Too many requests" }),
    });
    render(<VerifyAnchorClient />);
    fillAndSubmit(VALID_HASH);
    await waitFor(() => screen.getByTestId("verify-error"));
    expect(screen.getByTestId("verify-error").textContent).toMatch(
      /Rate limit/i,
    );
  });

  it("shows server-side validation issues", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: "Validation failed",
        issues: [{ path: "anchorHash", message: "must be hex" }],
      }),
    });
    render(<VerifyAnchorClient />);
    fillAndSubmit(VALID_HASH);
    await waitFor(() => screen.getByTestId("verify-error"));
    expect(screen.getByTestId("verify-error").textContent).toMatch(
      /Validation/,
    );
    expect(screen.getByTestId("verify-error").textContent).toMatch(
      /must be hex/,
    );
  });

  it("catches network errors", async () => {
    fetchMock.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    render(<VerifyAnchorClient />);
    fillAndSubmit(VALID_HASH);
    await waitFor(() => screen.getByTestId("verify-error"));
    expect(screen.getByTestId("verify-error").textContent).toMatch(
      /ECONNREFUSED/,
    );
  });
});
