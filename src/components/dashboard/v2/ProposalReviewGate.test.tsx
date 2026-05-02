/**
 * ProposalReviewGate — Sprint 6D tests.
 *
 * Coverage:
 *
 *   1. Approve disabled on initial mount (timer + checkbox both off)
 *   2. Approve disabled after timer elapses if checkbox not checked
 *   3. Approve disabled after checkbox checked if timer not elapsed
 *   4. Approve enables when BOTH timer elapsed AND checkbox checked
 *   5. Countdown text updates each second
 *   6. Hint text changes by gate state
 *   7. Custom reviewSeconds respected
 *   8. Bypass via __caelex_disable_review_gate window flag
 */

import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

vi.mock("lucide-react", () => {
  const icon = (name: string) => {
    const Icon = (props: Record<string, unknown>) =>
      React.createElement("span", { "data-testid": `icon-${name}`, ...props });
    Icon.displayName = name;
    return Icon;
  };
  return {
    CheckCircle2: icon("CheckCircle2"),
    ShieldCheck: icon("ShieldCheck"),
    Loader2: icon("Loader2"),
  };
});

vi.mock("@/components/ui/v2/button", () => ({
  Button: ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement("button", props, children),
}));

vi.mock("@/app/dashboard/proposals/server-actions", () => ({
  applyProposalAction: vi.fn(),
}));

import { ProposalReviewGate } from "./ProposalReviewGate";

beforeEach(() => {
  vi.useFakeTimers();
  // Reset the bypass flag — each test sets its own state.
  (
    window as Window & { __caelex_disable_review_gate?: boolean }
  ).__caelex_disable_review_gate = false;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ProposalReviewGate — initial state", () => {
  it("disables Approve on mount", () => {
    render(<ProposalReviewGate proposalId="p_1" />);
    const button = screen.getByTestId(
      "review-approve-button",
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("Approve label shows the countdown initially", () => {
    render(<ProposalReviewGate proposalId="p_1" reviewSeconds={5} />);
    const button = screen.getByTestId("review-approve-button");
    expect(button.textContent).toContain("Approve in 5s");
  });

  it("hint text reads 'review window in progress' initially", () => {
    render(<ProposalReviewGate proposalId="p_1" />);
    expect(screen.getByTestId("review-gate-hint").textContent).toMatch(
      /review window in progress/i,
    );
  });
});

/** Tick the timer one second at a time so React effects can
 *  reschedule between each tick. advanceTimersByTimeAsync(3000)
 *  only fires the FIRST timeout because the next ones are scheduled
 *  by the effect that runs after the state update. */
async function tickSeconds(n: number) {
  for (let i = 0; i < n; i++) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
  }
}

describe("ProposalReviewGate — gate transitions", () => {
  it("after timer elapses, Approve still disabled until checkbox checked", async () => {
    render(<ProposalReviewGate proposalId="p_1" reviewSeconds={3} />);
    await tickSeconds(3);
    const button = screen.getByTestId(
      "review-approve-button",
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(screen.getByTestId("review-gate-hint").textContent).toMatch(
      /tick the review checkbox/i,
    );
  });

  it("after checkbox checked, Approve still disabled until timer elapses", () => {
    render(<ProposalReviewGate proposalId="p_1" reviewSeconds={5} />);
    const cb = screen.getByTestId("review-acknowledge-checkbox");
    fireEvent.click(cb);
    const button = screen.getByTestId(
      "review-approve-button",
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    // Hint still says review window in progress
    expect(screen.getByTestId("review-gate-hint").textContent).toMatch(
      /review window in progress/i,
    );
  });

  it("Approve enables when BOTH timer elapsed AND checkbox checked", async () => {
    render(<ProposalReviewGate proposalId="p_1" reviewSeconds={3} />);
    const cb = screen.getByTestId("review-acknowledge-checkbox");
    fireEvent.click(cb);
    await tickSeconds(3);
    const button = screen.getByTestId(
      "review-approve-button",
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(button.textContent).toContain("Approve");
    // Hint disappears entirely once gate passes
    expect(screen.queryByTestId("review-gate-hint")).toBeNull();
  });
});

describe("ProposalReviewGate — countdown ticker", () => {
  it("updates the visible countdown each second", async () => {
    render(<ProposalReviewGate proposalId="p_1" reviewSeconds={3} />);
    expect(screen.getByTestId("review-approve-button").textContent).toContain(
      "Approve in 3s",
    );
    await tickSeconds(1);
    expect(screen.getByTestId("review-approve-button").textContent).toContain(
      "Approve in 2s",
    );
    await tickSeconds(1);
    expect(screen.getByTestId("review-approve-button").textContent).toContain(
      "Approve in 1s",
    );
  });

  it("respects custom reviewSeconds prop", () => {
    render(<ProposalReviewGate proposalId="p_1" reviewSeconds={30} />);
    expect(screen.getByTestId("review-approve-button").textContent).toContain(
      "Approve in 30s",
    );
  });
});

describe("ProposalReviewGate — test bypass", () => {
  it("when __caelex_disable_review_gate is true, timer skipped", () => {
    (
      window as Window & { __caelex_disable_review_gate?: boolean }
    ).__caelex_disable_review_gate = true;
    render(<ProposalReviewGate proposalId="p_1" reviewSeconds={30} />);
    // Timer is bypassed; only the checkbox gate remains.
    const button = screen.getByTestId(
      "review-approve-button",
    ) as HTMLButtonElement;
    expect(button.textContent).toContain("Approve");
    expect(button.textContent).not.toContain("30s");
    expect(button.disabled).toBe(true); // checkbox still required
    fireEvent.click(screen.getByTestId("review-acknowledge-checkbox"));
    expect(button.disabled).toBe(false);
  });
});

describe("ProposalReviewGate — accessibility", () => {
  it("hint has aria-live polite for screenreader announcements", () => {
    render(<ProposalReviewGate proposalId="p_1" />);
    const hint = screen.getByTestId("review-gate-hint");
    expect(hint.getAttribute("aria-live")).toBe("polite");
  });

  it("checkbox is reachable by its label text", () => {
    render(<ProposalReviewGate proposalId="p_1" />);
    expect(screen.getByText(/I have reviewed the rationale/i)).toBeTruthy();
  });
});
