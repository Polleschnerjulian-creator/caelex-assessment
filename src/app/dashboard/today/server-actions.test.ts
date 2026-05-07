/**
 * Sprint 10F2 — Tests for the today/server-actions wrappers.
 *
 * These wrappers are thin: each forwards to the matching defineAction
 * `serverAction` and logs failures via `logger.warn` if the result is
 * `{ ok: false }`. The contract under test:
 *
 *   1. Each wrapper calls the underlying action's serverAction once
 *   2. On `{ ok: false }`, logger.warn is invoked with a descriptive
 *      tag + the error message
 *   3. On `{ ok: true }`, logger.warn is NOT called (no spurious noise)
 *   4. The wrapper always returns void (so React's form action accepts it)
 *
 * Why this matters: silent failure modes are a UX bug (user posts a
 * note, the action fails auth, but the page just refreshes with no
 * feedback). The logger.warn line is the diagnostic trail an operator
 * uses to find broken paths in production.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockSnoozeServer,
  mockUnsnoozeServer,
  mockAddNoteServer,
  mockMarkAttestedServer,
  mockLoggerWarn,
} = vi.hoisted(() => ({
  mockSnoozeServer: vi.fn(),
  mockUnsnoozeServer: vi.fn(),
  mockAddNoteServer: vi.fn(),
  mockMarkAttestedServer: vi.fn(),
  mockLoggerWarn: vi.fn(),
}));

vi.mock("@/lib/comply-v2/actions/compliance-item-actions", () => ({
  snoozeComplianceItem: { serverAction: mockSnoozeServer },
  unsnoozeComplianceItem: { serverAction: mockUnsnoozeServer },
  addComplianceItemNote: { serverAction: mockAddNoteServer },
  markAsAttested: { serverAction: mockMarkAttestedServer },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: mockLoggerWarn,
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import {
  snoozeAction,
  unsnoozeAction,
  addNoteAction,
  markAttestedAction,
} from "./server-actions";

const fd = (entries: Record<string, string>): FormData => {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.append(k, v);
  return f;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("snoozeAction", () => {
  it("forwards FormData to the underlying serverAction", async () => {
    mockSnoozeServer.mockResolvedValue({ ok: true, result: {} });
    const formData = fd({ itemId: "DEBRIS:abc", days: "7" });
    await snoozeAction(formData);
    expect(mockSnoozeServer).toHaveBeenCalledWith(formData);
    expect(mockLoggerWarn).not.toHaveBeenCalled();
  });

  it("logs a warning when the underlying action returns ok=false", async () => {
    mockSnoozeServer.mockResolvedValue({ ok: false, error: "Unauthenticated" });
    await snoozeAction(fd({ itemId: "DEBRIS:abc", days: "7" }));
    expect(mockLoggerWarn).toHaveBeenCalledTimes(1);
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "[comply-v2] snooze action failed",
      { error: "Unauthenticated" },
    );
  });

  it("returns undefined (form-action contract)", async () => {
    mockSnoozeServer.mockResolvedValue({ ok: true, result: {} });
    const r = await snoozeAction(fd({ itemId: "DEBRIS:abc", days: "1" }));
    expect(r).toBeUndefined();
  });
});

describe("unsnoozeAction", () => {
  it("logs warning on failure with unique tag", async () => {
    mockUnsnoozeServer.mockResolvedValue({
      ok: false,
      error: "Rate limit exceeded",
    });
    await unsnoozeAction(fd({ itemId: "DEBRIS:abc" }));
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "[comply-v2] unsnooze action failed",
      { error: "Rate limit exceeded" },
    );
  });
});

describe("addNoteAction", () => {
  it("forwards FormData and stays silent on success", async () => {
    mockAddNoteServer.mockResolvedValue({ ok: true, result: {} });
    await addNoteAction(fd({ itemId: "NIS2:xyz", body: "First note" }));
    expect(mockAddNoteServer).toHaveBeenCalledTimes(1);
    expect(mockLoggerWarn).not.toHaveBeenCalled();
  });

  it("logs warning with add-note tag on failure", async () => {
    mockAddNoteServer.mockResolvedValue({ ok: false, error: "Body too long" });
    await addNoteAction(fd({ itemId: "NIS2:xyz", body: "x" }));
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "[comply-v2] add-note action failed",
      { error: "Body too long" },
    );
  });
});

describe("markAttestedAction (requiresApproval)", () => {
  it("treats {ok:true, result: ProposalDeferral} as success (no warning)", async () => {
    // markAsAttested has requiresApproval=true → defineAction returns
    // {ok:true, result: { status: 'PROPOSED', proposalId, expiresAt }}.
    // The wrapper still considers this success because the proposal
    // was successfully written.
    mockMarkAttestedServer.mockResolvedValue({
      ok: true,
      result: {
        status: "PROPOSED",
        proposalId: "prop_123",
        expiresAt: new Date(),
      },
    });
    await markAttestedAction(
      fd({
        itemId: "DEBRIS:abc",
        evidenceSummary: "Evidence summary that is at least 10 characters long",
      }),
    );
    expect(mockLoggerWarn).not.toHaveBeenCalled();
  });

  it("logs warning with mark-attested tag on failure", async () => {
    mockMarkAttestedServer.mockResolvedValue({
      ok: false,
      error: "Validation failed",
    });
    await markAttestedAction(
      fd({ itemId: "DEBRIS:abc", evidenceSummary: "short" }),
    );
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "[comply-v2] mark-attested action failed",
      { error: "Validation failed" },
    );
  });
});
