/**
 * AIDisclosureBanner — Sprint 6C tests.
 *
 * Coverage:
 *
 *   1. Renders by default when no dismissal stored
 *   2. Hidden when dismissal is fresh (< 24h)
 *   3. Re-renders when dismissal is stale (≥ 24h)
 *   4. Hidden when localStorage throws (still safe — defaults to show)
 *   5. Dismiss button writes ISO timestamp to localStorage and hides
 *   6. Custom message override propagates
 *   7. Custom storageKey isolates dismissal between surfaces
 *   8. Mandatory disclosure language present (Art. 50)
 */

import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("lucide-react", () => {
  const icon = (name: string) => {
    const Icon = (props: Record<string, unknown>) =>
      React.createElement("span", { "data-testid": `icon-${name}`, ...props });
    Icon.displayName = name;
    return Icon;
  };
  return { Bot: icon("Bot"), X: icon("X") };
});

import { AIDisclosureBanner } from "./AIDisclosureBanner";

const STORAGE_KEY = "caelex-ai-disclosure-dismissed";

beforeEach(() => {
  window.localStorage.clear();
  vi.useRealTimers();
});

describe("AIDisclosureBanner — visibility", () => {
  it("renders by default when no dismissal stored", () => {
    render(<AIDisclosureBanner />);
    expect(screen.getByTestId("ai-disclosure-banner")).toBeTruthy();
    expect(
      screen.getByText("You're interacting with an AI system"),
    ).toBeTruthy();
  });

  it("hides when a fresh dismissal is stored (< 24h)", () => {
    const fresh = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(); // 1h ago
    window.localStorage.setItem(STORAGE_KEY, fresh);
    render(<AIDisclosureBanner />);
    expect(screen.queryByTestId("ai-disclosure-banner")).toBeNull();
  });

  it("re-shows when a stale dismissal is stored (>= 24h)", () => {
    const stale = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    window.localStorage.setItem(STORAGE_KEY, stale);
    render(<AIDisclosureBanner />);
    expect(screen.getByTestId("ai-disclosure-banner")).toBeTruthy();
  });

  it("re-shows when stored value is unparseable", () => {
    window.localStorage.setItem(STORAGE_KEY, "not-a-date");
    render(<AIDisclosureBanner />);
    expect(screen.getByTestId("ai-disclosure-banner")).toBeTruthy();
  });
});

describe("AIDisclosureBanner — dismiss", () => {
  it("writes ISO timestamp to localStorage on dismiss", () => {
    render(<AIDisclosureBanner />);
    const button = screen.getByRole("button", { name: /Dismiss/i });
    fireEvent.click(button);
    const stored = window.localStorage.getItem(STORAGE_KEY);
    expect(stored).not.toBeNull();
    expect(Number.isFinite(Date.parse(stored ?? ""))).toBe(true);
  });

  it("hides the banner after dismiss", () => {
    render(<AIDisclosureBanner />);
    const button = screen.getByRole("button", { name: /Dismiss/i });
    fireEvent.click(button);
    expect(screen.queryByTestId("ai-disclosure-banner")).toBeNull();
  });
});

describe("AIDisclosureBanner — customisation", () => {
  it("uses the message prop when provided", () => {
    render(<AIDisclosureBanner message="Custom regulator-specific copy." />);
    expect(screen.getByText("Custom regulator-specific copy.")).toBeTruthy();
  });

  it("uses a custom storageKey to isolate dismissal between surfaces", () => {
    const fresh = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    window.localStorage.setItem(STORAGE_KEY, fresh);
    // Different surface — should still show
    render(<AIDisclosureBanner storageKey="caelex-ai-disclosure-pulse" />);
    expect(screen.getByTestId("ai-disclosure-banner")).toBeTruthy();
  });
});

describe("AIDisclosureBanner — Art. 50 compliance language", () => {
  it("default copy contains an EU AI Act reference", () => {
    render(<AIDisclosureBanner />);
    expect(screen.getByText(/EU AI Act/)).toBeTruthy();
  });

  it("default copy explicitly states the system is an AI", () => {
    render(<AIDisclosureBanner />);
    // Heading text — narrower assertion since the body also contains
    // multiple "AI"-substring matches.
    expect(
      screen.getByText("You're interacting with an AI system"),
    ).toBeTruthy();
  });

  it("default copy advises verification with primary sources", () => {
    render(<AIDisclosureBanner />);
    expect(screen.getByText(/Verify regulatory references/)).toBeTruthy();
  });
});
