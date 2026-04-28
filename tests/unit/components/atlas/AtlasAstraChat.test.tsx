/**
 * Smoke + behaviour tests for AtlasAstraChat — the floating Astra chat
 * panel that BHO Legal pilot users see on every Atlas page. The
 * component went through two rapid refactors today (theme-aware → no
 * dark-disc backings); this test pins the post-refactor surface so a
 * future regression doesn't reintroduce the "schwarze Flecke" the user
 * called out.
 *
 * Coverage focus:
 *   - Closed state renders the orb-button only
 *   - Click opens the panel with welcome content + suggestion buttons
 *   - Suggestion button click prefills the textarea
 *   - Sending a message calls /api/astra/chat with sanitised text
 *   - Panel close button dismisses the panel
 *
 * @see src/components/atlas/AtlasAstraChat.tsx (refactored 2026-04-28)
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement Element.scrollIntoView — polyfill it once
// per test run so the chat panel's auto-scroll-to-bottom hook doesn't
// throw on mount.
beforeAll(() => {
  if (
    typeof Element !== "undefined" &&
    !(Element.prototype as unknown as { scrollIntoView?: unknown })
      .scrollIntoView
  ) {
    (
      Element.prototype as unknown as { scrollIntoView: () => void }
    ).scrollIntoView = () => {};
  }
});

// next/navigation: usePathname returns a stable mock value
vi.mock("next/navigation", () => ({
  usePathname: () => "/atlas",
}));

// LanguageProvider: minimal stub returning the key as the translation
vi.mock("@/components/providers/LanguageProvider", () => ({
  useLanguage: () => ({
    language: "en" as const,
    t: (k: string) => k,
  }),
}));

// AtlasEntityMini: the brand orb is a heavy WebGL component; replace
// with a static <div> for tests so the test runner doesn't need a GPU.
vi.mock("@/components/atlas/AtlasEntityMini", () => ({
  AtlasEntityMini: ({ ariaLabel }: { ariaLabel?: string }) => (
    <div data-testid="astra-orb" aria-label={ariaLabel ?? "Astra"} />
  ),
}));

// AtlasMessageRenderer: render the citation-rich content as plain
// text — the renderer's behaviour has its own dedicated tests.
vi.mock("@/components/atlas/AtlasMessageRenderer", () => ({
  default: ({ content }: { content: string }) => (
    <span data-testid="astra-message">{content}</span>
  ),
}));

import AtlasAstraChat from "@/components/atlas/AtlasAstraChat";

beforeEach(() => {
  vi.restoreAllMocks();
  // Stub fetch — most tests mock it per-test.
  global.fetch = vi.fn() as unknown as typeof fetch;
});

describe("AtlasAstraChat — closed state (orb only)", () => {
  it("renders the floating Astra orb button when closed", () => {
    render(<AtlasAstraChat />);
    // The closed state renders only the orb-button. The aria-label
    // ("atlas.astra_open") is stubbed to its key by our t() mock.
    const button = screen.getByRole("button", { name: "atlas.astra_open" });
    expect(button).toBeInTheDocument();
    // The brand orb is rendered inside the button
    expect(screen.getByTestId("astra-orb")).toBeInTheDocument();
  });

  it("does not render the chat panel content while closed", () => {
    render(<AtlasAstraChat />);
    // The welcome string ("atlas.astra_ask_space_law") should not be
    // present until the panel opens.
    expect(
      screen.queryByText("atlas.astra_ask_space_law"),
    ).not.toBeInTheDocument();
  });
});

describe("AtlasAstraChat — opening flow", () => {
  it("clicking the orb-button opens the panel with welcome content", () => {
    render(<AtlasAstraChat />);
    fireEvent.click(screen.getByRole("button", { name: "atlas.astra_open" }));
    // The welcome heading appears
    expect(screen.getByText("atlas.astra_ask_space_law")).toBeInTheDocument();
    // The stats line appears
    expect(screen.getByText("atlas.astra_stats_line")).toBeInTheDocument();
  });

  it("opens with default English suggestion buttons", () => {
    render(<AtlasAstraChat />);
    fireEvent.click(screen.getByRole("button", { name: "atlas.astra_open" }));
    expect(
      screen.getByText("Which countries ratified the Moon Agreement?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Compare liability regimes DE vs FR"),
    ).toBeInTheDocument();
  });

  it("renders the input textarea with placeholder", () => {
    render(<AtlasAstraChat />);
    fireEvent.click(screen.getByRole("button", { name: "atlas.astra_open" }));
    const textarea = screen.getByLabelText("atlas.astra_input_aria");
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe("TEXTAREA");
  });

  it("renders a close button in the panel header", () => {
    render(<AtlasAstraChat />);
    fireEvent.click(screen.getByRole("button", { name: "atlas.astra_open" }));
    const closeBtn = screen.getByRole("button", { name: "common.close" });
    expect(closeBtn).toBeInTheDocument();
  });
});

describe("AtlasAstraChat — suggestion button prefill", () => {
  it("clicking a suggestion fills the textarea with that text", () => {
    render(<AtlasAstraChat />);
    fireEvent.click(screen.getByRole("button", { name: "atlas.astra_open" }));
    fireEvent.click(
      screen.getByText("Which countries ratified the Moon Agreement?"),
    );
    const textarea = screen.getByLabelText(
      "atlas.astra_input_aria",
    ) as HTMLTextAreaElement;
    expect(textarea.value).toBe("Which countries ratified the Moon Agreement?");
  });
});

describe("AtlasAstraChat — sending a message", () => {
  it("send button click POSTs to /api/astra/chat with the entered text", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          conversationId: "conv-1",
          response: { text: "Mock answer" },
        }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<AtlasAstraChat />);
    fireEvent.click(screen.getByRole("button", { name: "atlas.astra_open" }));
    const textarea = screen.getByLabelText("atlas.astra_input_aria");
    fireEvent.change(textarea, { target: { value: "Test question" } });
    fireEvent.click(screen.getByRole("button", { name: "common.send" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/astra/chat",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    const call = fetchMock.mock.calls[0];
    const body = JSON.parse((call[1] as { body: string }).body) as {
      message: string;
      stream: boolean;
      context: { mode: string };
    };
    expect(body.message).toBe("Test question");
    expect(body.context.mode).toBe("general");
    expect(body.stream).toBe(false);
  });

  it("Enter (without shift) submits the message", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          conversationId: "c",
          response: { text: "ok" },
        }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<AtlasAstraChat />);
    fireEvent.click(screen.getByRole("button", { name: "atlas.astra_open" }));
    const textarea = screen.getByLabelText("atlas.astra_input_aria");
    fireEvent.change(textarea, { target: { value: "Quick Q" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("Shift+Enter does NOT submit (allows multi-line input)", () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<AtlasAstraChat />);
    fireEvent.click(screen.getByRole("button", { name: "atlas.astra_open" }));
    const textarea = screen.getByLabelText("atlas.astra_input_aria");
    fireEvent.change(textarea, { target: { value: "First line" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("control characters in the input are stripped before sending (HIGH-3 sanitisation)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          conversationId: "c",
          response: { text: "ok" },
        }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<AtlasAstraChat />);
    fireEvent.click(screen.getByRole("button", { name: "atlas.astra_open" }));
    const textarea = screen.getByLabelText("atlas.astra_input_aria");
    // Insert NUL + BEL + DEL — should be stripped, plus normal text kept
    fireEvent.change(textarea, {
      target: { value: "Hello\x00\x07\x7Fworld" },
    });
    fireEvent.click(screen.getByRole("button", { name: "common.send" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as { body: string }).body,
    ) as { message: string };
    expect(body.message).not.toMatch(/[\x00\x07\x7F]/);
    expect(body.message).toContain("Hello");
    expect(body.message).toContain("world");
  });

  it("renders the user's message and the assistant response on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          conversationId: "c",
          response: { text: "Astra's reply" },
        }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<AtlasAstraChat />);
    fireEvent.click(screen.getByRole("button", { name: "atlas.astra_open" }));
    const textarea = screen.getByLabelText("atlas.astra_input_aria");
    fireEvent.change(textarea, { target: { value: "Hello Astra" } });
    fireEvent.click(screen.getByRole("button", { name: "common.send" }));

    // The user message bubble shows the typed text
    await waitFor(() =>
      expect(screen.getByText("Hello Astra")).toBeInTheDocument(),
    );
    // The assistant message comes through AtlasMessageRenderer (mocked)
    await waitFor(() =>
      expect(screen.getByText("Astra's reply")).toBeInTheDocument(),
    );
  });

  it("falls back to a localised error message when /api/astra/chat fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<AtlasAstraChat />);
    fireEvent.click(screen.getByRole("button", { name: "atlas.astra_open" }));
    const textarea = screen.getByLabelText("atlas.astra_input_aria");
    fireEvent.change(textarea, { target: { value: "Will fail" } });
    fireEvent.click(screen.getByRole("button", { name: "common.send" }));

    // The component sends "atlas.astra_error" via the t() mock as the
    // assistant reply on error.
    await waitFor(() =>
      expect(
        screen
          .getAllByTestId("astra-message")
          .some((el) => el.textContent?.includes("atlas.astra_error")),
      ).toBe(true),
    );
  });
});

describe("AtlasAstraChat — closing flow", () => {
  it("clicking the close button hides the panel content", async () => {
    render(<AtlasAstraChat />);
    fireEvent.click(screen.getByRole("button", { name: "atlas.astra_open" }));
    expect(screen.getByText("atlas.astra_ask_space_law")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "common.close" }));
    // Panel close has a 250ms transition before unmount; wait for the
    // welcome heading to disappear.
    await waitFor(
      () =>
        expect(
          screen.queryByText("atlas.astra_ask_space_law"),
        ).not.toBeInTheDocument(),
      { timeout: 1000 },
    );
  });
});
