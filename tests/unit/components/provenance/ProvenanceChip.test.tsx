/**
 * ProvenanceChip — render + accessibility tests.
 *
 * Focus on behaviors that matter: correct label per origin, confidence
 * only for ai-inferred, button vs span based on onClick, aria-label
 * composes origin + description + confidence + stale state.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProvenanceChip } from "@/components/provenance";

// Mock useLanguage so the chip's t() calls return predictable keys.
// Returning the key itself makes assertions trivial and deterministic.
vi.mock("@/components/providers/LanguageProvider", () => ({
  useLanguage: () => ({
    language: "en",
    setLanguage: () => {},
    t: (key: string) => key,
  }),
}));

describe("ProvenanceChip", () => {
  describe("rendering by origin", () => {
    it("renders the origin label in full density", () => {
      render(<ProvenanceChip origin="deterministic" />);
      expect(
        screen.getByText("provenance.origin_deterministic"),
      ).toBeInTheDocument();
    });

    it("renders for all five origins", () => {
      const origins = [
        "deterministic",
        "source-backed",
        "assessment",
        "user-asserted",
        "ai-inferred",
      ] as const;
      for (const o of origins) {
        const { unmount } = render(<ProvenanceChip origin={o} />);
        // Each origin maps to a distinct label key.
        const expectedKey = `provenance.origin_${o.replace("-", "_")}`;
        expect(screen.getByText(expectedKey)).toBeInTheDocument();
        unmount();
      }
    });

    it("falls back to deterministic for unknown origin", () => {
      render(<ProvenanceChip origin="nonsense-future-value" />);
      expect(
        screen.getByText("provenance.origin_deterministic"),
      ).toBeInTheDocument();
    });
  });

  describe("density modes", () => {
    it("compact density truncates long labels with ellipsis", () => {
      render(<ProvenanceChip origin="user-asserted" density="compact" />);
      // "provenance.origin_user_asserted" is >10 chars → gets truncated
      // to 9 chars + "…"
      const text = screen.getByLabelText(/origin_user_asserted/i);
      expect(text.textContent).toMatch(/…/);
    });

    it("icon density shows no text label", () => {
      render(<ProvenanceChip origin="deterministic" density="icon" />);
      // The label text should NOT appear as visible text — only in aria.
      expect(
        screen.queryByText("provenance.origin_deterministic"),
      ).not.toBeInTheDocument();
      // But the element is still accessible.
      expect(
        screen.getByLabelText(/origin_deterministic/i),
      ).toBeInTheDocument();
    });
  });

  describe("confidence display", () => {
    it("renders confidence % for ai-inferred", () => {
      render(<ProvenanceChip origin="ai-inferred" confidence={0.82} />);
      expect(screen.getByText("82%")).toBeInTheDocument();
    });

    it("does not render confidence for non-ai origins", () => {
      render(<ProvenanceChip origin="deterministic" confidence={0.82} />);
      expect(screen.queryByText("82%")).not.toBeInTheDocument();
    });

    it("hides confidence if value is null", () => {
      render(<ProvenanceChip origin="ai-inferred" confidence={null} />);
      expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    });

    it("hides confidence in compact density", () => {
      render(
        <ProvenanceChip
          origin="ai-inferred"
          confidence={0.82}
          density="compact"
        />,
      );
      // Rendered in DOM but class hides it visually in compact mode.
      const conf = screen.getByText("82%");
      expect(conf.className).toContain("hidden");
    });
  });

  describe("stale indicator", () => {
    it("adds stale ring + clock icon when stale=true", () => {
      const { container } = render(
        <ProvenanceChip origin="assessment" stale />,
      );
      const chip = container.querySelector("span,button");
      expect(chip?.className).toContain("ring");
      // The Clock icon from lucide renders as an SVG — two SVGs in the
      // stale case (origin icon + clock).
      expect(container.querySelectorAll("svg").length).toBe(2);
    });

    it("omits stale chrome when stale=false", () => {
      const { container } = render(
        <ProvenanceChip origin="assessment" stale={false} />,
      );
      expect(container.querySelectorAll("svg").length).toBe(1);
    });
  });

  describe("interactivity", () => {
    it("renders as span when no onClick", () => {
      const { container } = render(<ProvenanceChip origin="deterministic" />);
      expect(container.querySelector("button")).toBeNull();
      expect(container.querySelector("span")).toBeTruthy();
    });

    it("renders as button and fires onClick", () => {
      const fn = vi.fn();
      render(<ProvenanceChip origin="deterministic" onClick={fn} />);
      const btn = screen.getByRole("button");
      fireEvent.click(btn);
      expect(fn).toHaveBeenCalledOnce();
    });
  });

  describe("accessibility", () => {
    it("aria-label includes origin label AND description", () => {
      render(<ProvenanceChip origin="source-backed" />);
      const label = screen
        .getByLabelText(/origin_source_backed/i)
        .getAttribute("aria-label");
      expect(label).toContain("provenance.origin_source_backed");
      expect(label).toContain("provenance.origin_source_backed_desc");
    });

    it("aria-label includes confidence for ai-inferred", () => {
      render(<ProvenanceChip origin="ai-inferred" confidence={0.55} />);
      const label = screen
        .getByLabelText(/origin_ai_inferred/i)
        .getAttribute("aria-label");
      expect(label).toContain("55%");
    });

    it("aria-label includes stale state", () => {
      render(<ProvenanceChip origin="assessment" stale />);
      const label = screen
        .getByLabelText(/origin_assessment/i)
        .getAttribute("aria-label");
      expect(label).toContain("provenance.stale");
    });

    it("icon mode exposes label via title for hover tooltip", () => {
      const { container } = render(
        <ProvenanceChip origin="deterministic" density="icon" />,
      );
      const chip = container.querySelector("[title]");
      expect(chip?.getAttribute("title")).toContain(
        "provenance.origin_deterministic",
      );
    });
  });
});
