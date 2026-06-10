/**
 * DOM tests for QuickResultPanel (plan Task 2.4).
 *
 * Plan-mandated assertions:
 *   - scope verdict renders;
 *   - regime DIRECTION renders ("likely light regime — verify group
 *     structure" style);
 *   - NIS2 gateway badge renders, INCLUDING an explicit needs_clarification
 *     rendering — never "does not apply" / "out of scope" for that state;
 *   - per-cluster counts + the ONE top finding (headlines only — the second
 *     cluster finding's body is NOT in the DOM);
 *   - unknowns COUNT with the full-tier CTA ("your N unknowns and M
 *     unassessed obligations", §6b conversion);
 *   - contested findings render the COLLAPSED "contested — conservative
 *     reading shown" chip and expand on click (founder §11.4);
 *   - NO numeric overall score anywhere in the DOM (no /\b\d{1,3}\s*\/\s*100\b/
 *     and no "compliance score" text);
 *   - the isFindingComplete withhold guard at the render boundary;
 *   - the rulebook as-of stamp;
 *   - the PDF download is email-gated through the EXISTING EmailGate.
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import QuickResultPanel from "./QuickResultPanel";
import { projectQuickResult, type QuickResultView } from "./quick-projection";
import {
  buildFullQuickResultFixture,
  incompleteFinding,
} from "./quick-result.fixtures";
import type { AssessmentFinding } from "@/lib/assessment/finding";

function fixtureView(): QuickResultView {
  const view = projectQuickResult(buildFullQuickResultFixture());
  if (!view) throw new Error("fixture must project");
  return view;
}

function renderPanel(view: QuickResultView = fixtureView()) {
  return render(<QuickResultPanel view={view} profileId="prof_1" />);
}

describe("QuickResultPanel — verdict header", () => {
  it("renders the scope determination finding", () => {
    renderPanel();
    expect(
      screen.getByText(
        /Dual-use export-control rules can apply to your spacecraft/i,
      ),
    ).toBeInTheDocument();
  });

  it("renders the regime DIRECTION headline", () => {
    renderPanel();
    expect(
      screen.getByText("Likely light regime — verify group structure"),
    ).toBeInTheDocument();
  });

  it("renders the NIS2 needs_clarification state EXPLICITLY — never as 'does not apply'", () => {
    const { container } = renderPanel();
    expect(screen.getByText("NIS2: needs clarification")).toBeInTheDocument();
    // The open state must never read as a negative.
    expect(container.textContent).not.toMatch(/does not apply/i);
    expect(container.textContent).not.toMatch(/out of scope on your answers/i);
    // And the open-question explanation is shown.
    expect(
      screen.getByText(/an OPEN question, not a negative/i),
    ).toBeInTheDocument();
  });

  it("renders the rulebook as-of stamp", () => {
    renderPanel();
    expect(
      screen.getByText(/Assessed against Caelex Rulebook v1\.0\.0/),
    ).toBeInTheDocument();
  });

  it("expands the rulebook stamp into the source list with as-of dates", () => {
    renderPanel();
    fireEvent.click(
      screen.getByText(/Assessed against Caelex Rulebook v1\.0\.0/),
    );
    expect(
      screen.getByText(/COM\(2025\) 335 \(as of 2025-06-25\)/),
    ).toBeInTheDocument();
  });
});

describe("QuickResultPanel — obligation clusters (counts + headlines)", () => {
  it("renders per-cluster counts and ONLY the top finding body", () => {
    renderPanel();
    const auth = screen.getByRole("region", {
      name: "Authorisation & registration",
    });
    expect(auth.textContent).toMatch(/2\s*applicable/);
    // Top finding shown…
    expect(
      within(auth).getByText(
        "Operator authorisation is required before launch or operation.",
      ),
    ).toBeInTheDocument();
    // …the second finding's body is NOT (headlines only, §6b).
    expect(
      screen.queryByText(
        "Space-object registration duties attach to each spacecraft.",
      ),
    ).not.toBeInTheDocument();
    // The remainder is pointed at the full tier, honestly counted.
    expect(
      within(auth).getByText(/1 more obligation identified in this cluster/i),
    ).toBeInTheDocument();
  });

  it("renders the finding envelope: why-trace, legal basis with as-of date, confidence", () => {
    renderPanel();
    const auth = screen.getByRole("region", {
      name: "Authorisation & registration",
    });
    expect(
      within(auth).getByText(/Because you answered:/i),
    ).toBeInTheDocument();
    expect(
      within(auth).getByText(/COM\(2025\) 335 Art\. 6.*as of 2025-06-25/i),
    ).toBeInTheDocument();
    expect(within(auth).getByText(/Confidence:/i)).toBeInTheDocument();
  });
});

describe("QuickResultPanel — flux flag (founder §11.4: collapsed-conservative)", () => {
  it("renders the collapsed chip and expands the positions on click", () => {
    renderPanel();
    const chip = screen.getByText("contested — conservative reading shown");
    expect(chip).toBeInTheDocument();
    // Collapsed: the legislative positions are NOT in the DOM yet.
    expect(screen.queryByText(/lex specialis/)).not.toBeInTheDocument();

    fireEvent.click(chip);

    expect(screen.getByText(/lex specialis/)).toBeInTheDocument();
    expect(
      screen.getByText(/resilience chapter deleted; NIS2 extended instead/),
    ).toBeInTheDocument();
  });
});

describe("QuickResultPanel — unknowns + full-tier CTA (§6b conversion)", () => {
  it("renders the unknowns COUNT and the N/M CTA copy", () => {
    renderPanel();
    const section = screen.getByRole("region", {
      name: "Unknowns to resolve",
    });
    expect(
      within(section).getByText("2 unknowns to resolve"),
    ).toBeInTheDocument();
    expect(section.textContent).toMatch(
      /Your 2 unknowns and 1 unassessed obligation/i,
    );
    const cta = within(section).getByRole("link", {
      name: /Run the full assessment/i,
    });
    expect(cta).toHaveAttribute("href", "/assessment/full");
  });

  it("renders the Task 3.6 conversion framing: gap from REAL counts + the free-account pitch", () => {
    renderPanel();
    const section = screen.getByRole("region", {
      name: "Unknowns to resolve",
    });
    // The gap framing comes from the projection's real counts (2 unknowns,
    // 1 unassessed obligation in the fixture) — never invented copy.
    expect(section.textContent).toMatch(
      /Your 2 unknowns and 1 unassessed obligation — create a free\s*account to resolve them/i,
    );
    // …and the conversion path is the full tier.
    expect(
      within(section).getByRole("link", { name: /Run the full assessment/i }),
    ).toHaveAttribute("href", "/assessment/full");
  });
});

describe("QuickResultPanel — NO overall score (honesty invariant #6)", () => {
  it("contains no N/100 figure and no 'compliance score' text anywhere in the DOM", () => {
    const { container } = renderPanel();
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/\b\d{1,3}\s*\/\s*100\b/);
    expect(text).not.toMatch(/compliance score/i);
    expect(text).not.toMatch(/overall score/i);
  });
});

describe("QuickResultPanel — withhold guard at the render boundary (invariant #5)", () => {
  it("withholds an incomplete envelope smuggled into the view, never partially renders it", () => {
    const view = fixtureView();
    const tampered: QuickResultView = {
      ...view,
      clusters: [
        {
          id: "debris_safety",
          label: "Debris mitigation & space safety",
          counts: { applicable: 1, conditional: 0, contested: 0, advisory: 0 },
          totalFindings: 1,
          // Bypasses the projection on purpose — the RENDER boundary must
          // still refuse it.
          topFinding: incompleteFinding() as unknown as AssessmentFinding,
          withheldCount: 0,
        },
      ],
    };
    renderPanel(tampered);
    expect(
      screen.queryByText(/Half-baked obligation that must never render/),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText(/withheld/i).length).toBeGreaterThan(0);
  });

  it("shows the withheld notice when a cluster's findings were all withheld by the projection", () => {
    const fixture = buildFullQuickResultFixture();
    (fixture.clusters as Record<string, unknown>[])[1].findings = [
      incompleteFinding(),
    ];
    const view = projectQuickResult(fixture);
    if (!view) throw new Error("fixture must project");
    renderPanel(view);
    const cyber = screen.getByRole("region", {
      name: "Resilience & cybersecurity",
    });
    expect(within(cyber).getByText(/withheld/i)).toBeInTheDocument();
  });
});

describe("QuickResultPanel — email-gated PDF (founder §11.2)", () => {
  it("opens the EXISTING EmailGate on download click — the on-screen result needed no email", () => {
    renderPanel();
    // No dialog before the click.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Download the PDF summary/i }),
    );

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText(/Get Your Compliance Report/i),
    ).toBeInTheDocument();
    // GDPR Art. 7: the newsletter consent checkbox is UNCHECKED by default.
    expect(within(dialog).getByRole("checkbox")).not.toBeChecked();
  });
});
