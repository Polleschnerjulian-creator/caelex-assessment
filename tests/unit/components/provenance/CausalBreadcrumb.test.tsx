/**
 * CausalBreadcrumb — render + accessibility tests.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CausalBreadcrumb } from "@/components/provenance";

vi.mock("@/components/providers/LanguageProvider", () => ({
  useLanguage: () => ({
    language: "en",
    setLanguage: () => {},
    t: (key: string) => key,
  }),
}));

describe("CausalBreadcrumb", () => {
  it("renders the leading arrow and 'because' keyword", () => {
    render(<CausalBreadcrumb origin="deterministic" reason="size ≥250" />);
    expect(screen.getByText("⟵")).toBeInTheDocument();
    expect(screen.getByText("provenance.causal_because")).toBeInTheDocument();
  });

  it("renders the reason text", () => {
    render(
      <CausalBreadcrumb origin="assessment" reason="Assessment Q7 answer" />,
    );
    expect(screen.getByText("Assessment Q7 answer")).toBeInTheDocument();
  });

  it("renders optional ref when provided", () => {
    render(
      <CausalBreadcrumb
        origin="deterministic"
        reason="size ≥250"
        citation="NIS2 Art. 3"
      />,
    );
    expect(screen.getByText("NIS2 Art. 3")).toBeInTheDocument();
  });

  it("omits citation section entirely when not provided", () => {
    render(<CausalBreadcrumb origin="deterministic" reason="foo" />);
    // No "·" middle-dot because there's only one piece after "weil foo".
    // (If citation was provided, there'd be a · before it.)
    const container = screen.getByText("foo").parentElement!;
    const dots = container.querySelectorAll("span");
    const dotTexts = Array.from(dots).map((s) => s.textContent);
    expect(dotTexts.filter((t) => t === "·").length).toBe(0);
  });

  it("formats a Date object with locale", () => {
    render(
      <CausalBreadcrumb
        origin="source-backed"
        reason="NIS2 Art. 21"
        date={new Date("2026-04-21T00:00:00Z")}
      />,
    );
    // Intl format varies by locale. Looking for month short + year.
    const container = screen.getByLabelText(/NIS2 Art. 21/i);
    expect(container.textContent).toMatch(/2026/);
  });

  it("formats an ISO string date", () => {
    render(
      <CausalBreadcrumb
        origin="assessment"
        reason="Answer"
        date="2026-01-15"
      />,
    );
    const container = screen.getByLabelText(/Answer/i);
    expect(container.textContent).toMatch(/2026/);
  });

  it("silently omits date if invalid", () => {
    render(
      <CausalBreadcrumb
        origin="assessment"
        reason="Answer"
        date="not-a-date"
      />,
    );
    // No year appears; component renders but without date block.
    const container = screen.getByLabelText(/Answer/i);
    expect(container.textContent).not.toMatch(/\d{4}/);
  });

  it("renders as span without onClick", () => {
    const { container } = render(
      <CausalBreadcrumb origin="deterministic" reason="foo" />,
    );
    expect(container.querySelector("button")).toBeNull();
  });

  it("renders as button with onClick + fires handler", () => {
    const fn = vi.fn();
    render(
      <CausalBreadcrumb origin="deterministic" reason="foo" onClick={fn} />,
    );
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("aria-label composes reason + citation + date + origin label", () => {
    render(
      <CausalBreadcrumb
        origin="source-backed"
        reason="NIS2 Art. 21(2)(d)"
        citation="essential entities"
        date="2026-02-02"
      />,
    );
    const label = screen
      .getByLabelText(/NIS2 Art\. 21/i)
      .getAttribute("aria-label");
    expect(label).toContain("NIS2 Art. 21(2)(d)");
    expect(label).toContain("essential entities");
    expect(label).toContain("2026");
    expect(label).toContain("provenance.origin_source_backed");
  });
});
