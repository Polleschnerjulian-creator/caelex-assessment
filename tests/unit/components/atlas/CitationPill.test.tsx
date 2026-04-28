/**
 * Smoke + behaviour tests for CitationPill — the hover-preview pill
 * Astra renders inline for [ATLAS-…] and [CASE-…] tokens. The pill is
 * heavily used (every Astra answer that cites a source) so a regression
 * here is immediately visible to BHO Legal.
 *
 * Coverage focus:
 *   - Renders the id as the visible label inside a <Link>
 *   - Source pill gets emerald palette, case pill gets violet palette
 *   - Hover triggers /api/atlas/{source|case}-preview/[id] fetch
 *   - Preview cache prevents duplicate fetches across mounts
 *   - Escape key closes an open tooltip
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/providers/LanguageProvider", () => ({
  useLanguage: () => ({
    language: "en" as const,
    t: (k: string) => k,
  }),
}));

import { CitationPill } from "@/components/atlas/CitationPill";

beforeEach(() => {
  vi.restoreAllMocks();
  global.fetch = vi.fn() as unknown as typeof fetch;
});

describe("CitationPill — basic rendering", () => {
  it("renders the id as the visible label inside the link", () => {
    render(<CitationPill id="DE-VVG" href="/atlas/sources/DE-VVG" />);
    const link = screen.getByRole("link", { name: "DE-VVG" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/atlas/sources/DE-VVG");
  });

  it("source kind uses emerald palette classes", () => {
    render(<CitationPill id="DE-VVG" href="/x" kind="source" />);
    const link = screen.getByRole("link", { name: "DE-VVG" });
    expect(link.className).toMatch(/emerald/);
    expect(link.className).not.toMatch(/violet/);
  });

  it("case kind uses violet palette classes", () => {
    render(
      <CitationPill
        id="CASE-COSMOS-954-1981"
        href="/atlas/cases/CASE-COSMOS-954-1981"
        kind="case"
      />,
    );
    const link = screen.getByRole("link", { name: "CASE-COSMOS-954-1981" });
    expect(link.className).toMatch(/violet/);
    expect(link.className).not.toMatch(/emerald/);
  });

  it("does not render a tooltip until hover/focus", () => {
    render(<CitationPill id="DE-VVG" href="/x" />);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});

describe("CitationPill — hover-fetch behaviour", () => {
  it("hover triggers a fetch to the source-preview endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          title: "Test Title",
          scope_description: "Test scope",
          jurisdiction: "DE",
          type: "federal_law",
          status: "in_force",
        }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<CitationPill id="DE-UNIQUE-1" href="/x" />);
    const link = screen.getByRole("link", { name: "DE-UNIQUE-1" });
    fireEvent.mouseEnter(link.parentElement!);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/atlas/source-preview/DE-UNIQUE-1",
        expect.objectContaining({ cache: "force-cache" }),
      );
    });
  });

  it("hover triggers a fetch to the case-preview endpoint for case kind", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          title: "Test Case",
          forum: "ICJ",
          plaintiff: "P",
          defendant: "D",
          ruling_summary: "X",
          precedential_weight: "high",
          date_decided: "2020-01-01",
        }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <CitationPill
        id="CASE-UNIQUE-9"
        href="/atlas/cases/CASE-UNIQUE-9"
        kind="case"
      />,
    );
    const link = screen.getByRole("link", { name: "CASE-UNIQUE-9" });
    fireEvent.mouseEnter(link.parentElement!);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/atlas/case-preview/CASE-UNIQUE-9",
        expect.anything(),
      );
    });
  });

  it("encodes the id in the URL path (defence vs special chars)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<CitationPill id="X#1" href="/x" />);
    const link = screen.getByRole("link", { name: "X#1" });
    fireEvent.mouseEnter(link.parentElement!);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const callUrl = fetchMock.mock.calls[0][0] as string;
    // URL-encoded form of "#"
    expect(callUrl).toContain("X%231");
  });

  it("does not double-fetch on a second hover (in-memory cache hit)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          title: "Cache Test",
          scope_description: "S",
          jurisdiction: "DE",
          type: "federal_law",
          status: "in_force",
        }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<CitationPill id="DE-CACHE-2" href="/x" />);
    const link = screen.getByRole("link", { name: "DE-CACHE-2" });
    const wrapper = link.parentElement!;
    fireEvent.mouseEnter(wrapper);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fireEvent.mouseLeave(wrapper);
    fireEvent.mouseEnter(wrapper);
    // Still only one fetch — the second hover hit the cache
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it("renders nothing under role=tooltip on mouseLeave (keeps DOM clean)", () => {
    render(<CitationPill id="DE-VVG-3" href="/x" />);
    const link = screen.getByRole("link", { name: "DE-VVG-3" });
    const wrapper = link.parentElement!;
    fireEvent.mouseEnter(wrapper);
    fireEvent.mouseLeave(wrapper);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});

describe("CitationPill — error tolerance", () => {
  it("renders the link and silently swallows a 404 preview response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<CitationPill id="DE-MISSING-1" href="/x" />);
    const link = screen.getByRole("link", { name: "DE-MISSING-1" });
    fireEvent.mouseEnter(link.parentElement!);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    // Component should not throw; link still navigable
    expect(link).toBeInTheDocument();
  });

  it("renders the link when fetch itself rejects (network error)", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("Network down"));
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<CitationPill id="DE-NETERR-1" href="/x" />);
    const link = screen.getByRole("link", { name: "DE-NETERR-1" });
    // Should not throw on render
    fireEvent.mouseEnter(link.parentElement!);
    await act(async () => {
      // Wait for the async fetch failure to settle
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(link).toBeInTheDocument();
  });
});

describe("CitationPill — keyboard support", () => {
  it("Escape key closes an open tooltip", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          title: "Esc Test",
          scope_description: "S",
          jurisdiction: "DE",
          type: "federal_law",
          status: "in_force",
        }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<CitationPill id="DE-ESC-1" href="/x" />);
    const link = screen.getByRole("link", { name: "DE-ESC-1" });
    fireEvent.mouseEnter(link.parentElement!);

    // Tooltip should appear after the wrapper hover
    await waitFor(() =>
      expect(screen.queryByRole("tooltip")).toBeInTheDocument(),
    );

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument(),
    );
  });
});
