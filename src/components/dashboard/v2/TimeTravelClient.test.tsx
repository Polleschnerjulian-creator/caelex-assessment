/**
 * TimeTravelClient — Sprint 10F tests.
 *
 * Coverage:
 *
 *   1. Empty trend → empty-state hint, no slider rendered
 *   2. Default index = latest snapshot
 *   3. Slider change updates the displayed cards
 *   4. SkipBack jumps to index 0
 *   5. SkipForward jumps to last index
 *   6. Play autoplays (advances index every PLAYBACK_TICK_MS)
 *   7. Playback auto-pauses at the end
 *   8. Pause stops autoplay
 *   9. Day-over-day delta tone: improving score → emerald, regressing → red
 *  10. Inverted delta (open proposals): increase = bad (red), decrease = good (emerald)
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
    Play: icon("Play"),
    Pause: icon("Pause"),
    SkipBack: icon("SkipBack"),
    SkipForward: icon("SkipForward"),
    Gauge: icon("Gauge"),
    CheckCircle2: icon("CheckCircle2"),
    ShieldCheck: icon("ShieldCheck"),
    AlertTriangle: icon("AlertTriangle"),
    Clock: icon("Clock"),
  };
});

import { TimeTravelClient } from "./TimeTravelClient";
import type { PostureTrendPoint } from "@/lib/comply-v2/posture-snapshot.server";

function point(over: Partial<PostureTrendPoint> = {}): PostureTrendPoint {
  return {
    date: "2026-04-01T00:00:00.000Z",
    overallScore: 50,
    totalItems: 100,
    attestedItems: 50,
    openProposals: 2,
    openTriage: 3,
    activeSnoozes: 1,
    ...over,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── Empty path ──────────────────────────────────────────────────────────

describe("TimeTravelClient — empty trend", () => {
  it("renders the empty-state hint when trend is []", () => {
    render(<TimeTravelClient trend={[]} />);
    expect(screen.getByTestId("time-travel-empty")).toBeTruthy();
    expect(screen.queryByTestId("time-travel-slider")).toBeNull();
  });
});

// ─── Default + scrubbing ─────────────────────────────────────────────────

describe("TimeTravelClient — default cursor", () => {
  it("starts at the last index (most recent snapshot)", () => {
    render(
      <TimeTravelClient
        trend={[
          point({ date: "2026-04-01T00:00:00.000Z", overallScore: 30 }),
          point({ date: "2026-04-02T00:00:00.000Z", overallScore: 40 }),
          point({ date: "2026-04-03T00:00:00.000Z", overallScore: 60 }),
        ]}
      />,
    );
    const dateLabel = screen.getByTestId("current-date");
    expect(dateLabel.textContent).toContain("2026-04-03");
    expect(dateLabel.textContent).toContain("day 3/3");
  });

  it("slider input change updates the displayed score", () => {
    render(
      <TimeTravelClient
        trend={[
          point({ date: "2026-04-01T00:00:00.000Z", overallScore: 30 }),
          point({ date: "2026-04-02T00:00:00.000Z", overallScore: 40 }),
          point({ date: "2026-04-03T00:00:00.000Z", overallScore: 60 }),
        ]}
      />,
    );
    const slider = screen.getByTestId("time-travel-slider") as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "0" } });
    expect(screen.getByTestId("current-date").textContent).toContain(
      "2026-04-01",
    );
  });
});

// ─── Skip buttons ────────────────────────────────────────────────────────

describe("TimeTravelClient — skip buttons", () => {
  it("SkipBack jumps to index 0", () => {
    render(
      <TimeTravelClient
        trend={[
          point({ date: "2026-04-01T00:00:00.000Z" }),
          point({ date: "2026-04-02T00:00:00.000Z" }),
          point({ date: "2026-04-03T00:00:00.000Z" }),
        ]}
      />,
    );
    fireEvent.click(screen.getByTestId("skip-start"));
    expect(screen.getByTestId("current-date").textContent).toContain(
      "2026-04-01",
    );
  });

  it("SkipForward jumps to the last index", () => {
    render(
      <TimeTravelClient
        trend={[
          point({ date: "2026-04-01T00:00:00.000Z" }),
          point({ date: "2026-04-02T00:00:00.000Z" }),
        ]}
      />,
    );
    // Go back, then skip-end
    fireEvent.click(screen.getByTestId("skip-start"));
    fireEvent.click(screen.getByTestId("skip-end"));
    expect(screen.getByTestId("current-date").textContent).toContain(
      "2026-04-02",
    );
  });
});

// ─── Autoplay ────────────────────────────────────────────────────────────

describe("TimeTravelClient — autoplay", () => {
  it("Play advances the index every 200ms", () => {
    render(
      <TimeTravelClient
        trend={[
          point({ date: "2026-04-01T00:00:00.000Z" }),
          point({ date: "2026-04-02T00:00:00.000Z" }),
          point({ date: "2026-04-03T00:00:00.000Z" }),
        ]}
      />,
    );
    fireEvent.click(screen.getByTestId("skip-start"));
    fireEvent.click(screen.getByTestId("play-toggle"));
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByTestId("current-date").textContent).toContain(
      "2026-04-02",
    );
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByTestId("current-date").textContent).toContain(
      "2026-04-03",
    );
  });

  it("auto-pauses when reaching the end", () => {
    render(
      <TimeTravelClient
        trend={[
          point({ date: "2026-04-01T00:00:00.000Z" }),
          point({ date: "2026-04-02T00:00:00.000Z" }),
        ]}
      />,
    );
    fireEvent.click(screen.getByTestId("skip-start"));
    fireEvent.click(screen.getByTestId("play-toggle"));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    // Should be at end, button back to "Play"
    expect(screen.getByTestId("current-date").textContent).toContain(
      "2026-04-02",
    );
    expect(screen.getByTestId("play-toggle").textContent).toMatch(/Play/);
  });

  it("Pause stops autoplay", () => {
    render(
      <TimeTravelClient
        trend={[
          point({ date: "2026-04-01T00:00:00.000Z" }),
          point({ date: "2026-04-02T00:00:00.000Z" }),
          point({ date: "2026-04-03T00:00:00.000Z" }),
        ]}
      />,
    );
    fireEvent.click(screen.getByTestId("skip-start"));
    fireEvent.click(screen.getByTestId("play-toggle"));
    act(() => {
      vi.advanceTimersByTime(200);
    });
    // At index 1
    fireEvent.click(screen.getByTestId("play-toggle"));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId("current-date").textContent).toContain(
      "2026-04-02",
    );
  });
});

// ─── Day-over-day delta toning ──────────────────────────────────────────

describe("TimeTravelClient — delta toning", () => {
  it("score improvement (delta > 0, not inverted) → emerald", () => {
    render(
      <TimeTravelClient
        trend={[point({ overallScore: 40 }), point({ overallScore: 60 })]}
      />,
    );
    // Cards rendered at index=1 (last, default), delta = 60-40 = +20pts
    const cards = screen.getAllByTestId("posture-card");
    const scoreCard = cards[0]; // overall score is the first card
    expect(scoreCard.textContent).toContain("+20pts");
    expect(scoreCard.querySelector(".text-emerald-400")).not.toBeNull();
  });

  it("inverted delta (more open proposals) → red", () => {
    render(
      <TimeTravelClient
        trend={[point({ openProposals: 2 }), point({ openProposals: 5 })]}
      />,
    );
    const cards = screen.getAllByTestId("posture-card");
    const proposalsCard = cards[2]; // 3rd card = open proposals
    expect(proposalsCard.textContent).toContain("+3 vs prior day");
    expect(proposalsCard.querySelector(".text-red-400")).not.toBeNull();
  });

  it("delta=0 stays neutral slate (no improvement, no regression)", () => {
    render(
      <TimeTravelClient
        trend={[point({ overallScore: 50 }), point({ overallScore: 50 })]}
      />,
    );
    const cards = screen.getAllByTestId("posture-card");
    const scoreCard = cards[0];
    // Find the delta text specifically (the "+0pts vs prior day" line).
    // The card's icon is always tone-coloured regardless of delta, so we
    // can't assert "no emerald anywhere" — only the delta text.
    const deltaText = Array.from(scoreCard.querySelectorAll("div")).find((el) =>
      el.textContent?.includes("vs prior day"),
    );
    expect(deltaText).toBeTruthy();
    expect(deltaText?.className).toContain("text-slate-500");
    expect(deltaText?.className).not.toContain("text-emerald-400");
    expect(deltaText?.className).not.toContain("text-red-400");
  });
});
