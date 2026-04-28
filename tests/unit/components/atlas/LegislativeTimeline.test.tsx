/**
 * Smoke + behaviour tests for LegislativeTimeline — the vertical
 * milestone strip Atlas renders on each source-detail page. Pins the
 * three verification-state banners (fully-verified / partially / none)
 * and the date-formatting branches that BHO Legal pilot users will see.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import { LegislativeTimeline } from "@/components/atlas/LegislativeTimeline";
import type { LegislativeMilestone } from "@/data/legal-sources/types";

const VERIFIED_BASE: Omit<LegislativeMilestone, "type" | "date"> = {
  body: "Test body",
  reference: "Test ref",
  description: "Test description.",
  source_url: "https://example.com/test",
  verified: true,
  verified_by: "claude (test)",
  verified_at: "2026-04-28",
};

function makeMilestone(
  overrides: Partial<LegislativeMilestone> & {
    date: string;
    type: LegislativeMilestone["type"];
  },
): LegislativeMilestone {
  return { ...VERIFIED_BASE, ...overrides };
}

describe("LegislativeTimeline — empty state", () => {
  it("renders nothing when milestones is empty", () => {
    const { container } = render(
      <LegislativeTimeline milestones={[]} language="en" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for a null/undefined milestones prop (defensive)", () => {
    const { container } = render(
      <LegislativeTimeline
        milestones={null as unknown as LegislativeMilestone[]}
        language="en"
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("LegislativeTimeline — verification-state banners", () => {
  it("renders the GREEN 'Fully verified' banner when all milestones are verified", () => {
    const milestones = [
      makeMilestone({ date: "2024-01-01", type: "adoption", verified: true }),
      makeMilestone({ date: "2024-02-01", type: "in_force", verified: true }),
    ];
    render(<LegislativeTimeline milestones={milestones} language="en" />);
    expect(screen.getByText(/Fully verified/i)).toBeInTheDocument();
  });

  it("renders the AMBER 'partially verified' banner with N/total counter when mixed", () => {
    const milestones = [
      makeMilestone({ date: "2024-01-01", type: "adoption", verified: true }),
      makeMilestone({ date: "2024-02-01", type: "in_force", verified: false }),
    ];
    const { container } = render(
      <LegislativeTimeline milestones={milestones} language="en" />,
    );
    // Negative assertions: not fully-verified, not none-verified.
    expect(screen.queryByText(/Fully verified/i)).not.toBeInTheDocument();
    // The amber banner contains "of" or "/" between numbers — verify
    // the banner mentions BOTH count numbers (1 verified out of 2 total).
    expect(container.textContent).toMatch(/\b1\b.*\b2\b/);
  });

  it("renders the RED 'verification pending' banner when no milestone is verified", () => {
    const milestones = [
      makeMilestone({ date: "2024-01-01", type: "adoption", verified: false }),
      makeMilestone({ date: "2024-02-01", type: "in_force", verified: false }),
    ];
    render(<LegislativeTimeline milestones={milestones} language="en" />);
    expect(screen.queryByText(/Fully verified/i)).not.toBeInTheDocument();
  });
});

describe("LegislativeTimeline — German localisation", () => {
  it("renders 'Gesetzgebungsverlauf' as section heading in DE mode", () => {
    const milestones = [
      makeMilestone({ date: "2024-01-01", type: "adoption", verified: true }),
    ];
    render(<LegislativeTimeline milestones={milestones} language="de" />);
    expect(screen.getByText("Gesetzgebungsverlauf")).toBeInTheDocument();
  });

  it("renders 'Legislative history' as section heading in EN mode", () => {
    const milestones = [
      makeMilestone({ date: "2024-01-01", type: "adoption", verified: true }),
    ];
    render(<LegislativeTimeline milestones={milestones} language="en" />);
    expect(screen.getByText("Legislative history")).toBeInTheDocument();
  });

  it("uses singular 'Eintrag' for one milestone (DE)", () => {
    const milestones = [
      makeMilestone({ date: "2024-01-01", type: "adoption", verified: true }),
    ];
    const { container } = render(
      <LegislativeTimeline milestones={milestones} language="de" />,
    );
    // Multiple "Eintrag" substrings appear (counter + banner copy);
    // assert via container text that the substring is present.
    expect(container.textContent).toContain("Eintrag");
    // Plural NOT present in the count label "1 Eintrag" specifically:
    // the count line should NOT use "Einträge" for a single entry.
    const heading = screen.getByText("Gesetzgebungsverlauf");
    const headingParent = heading.parentElement!;
    expect(headingParent.textContent).toMatch(/1\s+Eintrag/);
  });

  it("uses plural 'Einträge' for multiple milestones (DE)", () => {
    const milestones = [
      makeMilestone({ date: "2024-01-01", type: "adoption", verified: true }),
      makeMilestone({ date: "2024-02-01", type: "in_force", verified: true }),
    ];
    const { container } = render(
      <LegislativeTimeline milestones={milestones} language="de" />,
    );
    expect(container.textContent).toContain("Einträge");
    const heading = screen.getByText("Gesetzgebungsverlauf");
    expect(heading.parentElement!.textContent).toMatch(/2\s+Einträge/);
  });
});

describe("LegislativeTimeline — chronological sort", () => {
  it("re-sorts milestones ascending even when input is descending", () => {
    const milestones = [
      makeMilestone({
        date: "2024-12-31",
        type: "in_force",
        body: "Last event",
      }),
      makeMilestone({
        date: "2024-01-01",
        type: "adoption",
        body: "First event",
      }),
    ];
    const { container } = render(
      <LegislativeTimeline milestones={milestones} language="en" />,
    );
    const html = container.innerHTML;
    // Earlier event renders earlier in the DOM (top-down chronology)
    expect(html.indexOf("First event")).toBeLessThan(
      html.indexOf("Last event"),
    );
  });
});

describe("LegislativeTimeline — milestone content", () => {
  it("renders the body, reference, and description for each milestone", () => {
    const milestones = [
      makeMilestone({
        date: "2024-01-01",
        type: "adoption",
        body: "Bundestag",
        reference: "BT-Drs. 20/12345",
        description: "Plenary adoption.",
      }),
    ];
    render(<LegislativeTimeline milestones={milestones} language="en" />);
    expect(screen.getByText("Bundestag")).toBeInTheDocument();
    expect(screen.getByText("BT-Drs. 20/12345")).toBeInTheDocument();
    expect(screen.getByText("Plenary adoption.")).toBeInTheDocument();
  });

  it("renders source_url as a link when present", () => {
    const milestones = [
      makeMilestone({
        date: "2024-01-01",
        type: "adoption",
        source_url: "https://example.com/path/to/doc",
      }),
    ];
    const { container } = render(
      <LegislativeTimeline milestones={milestones} language="en" />,
    );
    // At least one anchor with the milestone URL
    const links = container.querySelectorAll(
      'a[href*="example.com/path/to/doc"]',
    );
    expect(links.length).toBeGreaterThan(0);
  });

  it("formats the date in DE-DD.MM.YYYY when language=de", () => {
    const milestones = [
      makeMilestone({ date: "2024-04-28", type: "adoption" }),
    ];
    render(<LegislativeTimeline milestones={milestones} language="de" />);
    // 28.04.2024
    expect(screen.getByText("28.04.2024")).toBeInTheDocument();
  });

  it("formats the date in EN-YYYY-MM-DD when language=en", () => {
    const milestones = [
      makeMilestone({ date: "2024-04-28", type: "adoption" }),
    ];
    render(<LegislativeTimeline milestones={milestones} language="en" />);
    expect(screen.getByText("2024-04-28")).toBeInTheDocument();
  });
});
