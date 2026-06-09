/**
 * ExplainedPanel — enforcement tests.
 *
 * THE LOAD-BEARING PROOF: the panel REFUSES to render an incomplete
 * explanation envelope and renders a loud "Explanation missing — result
 * withheld" block instead of the value. This is the structural enforcement
 * that an un-explained export-control verdict cannot ship.
 *
 * Also pins:
 *   - the verdict layer (WHAT + WHEREFORE + confidence) is always visible;
 *   - WHY + sources are hidden until "Show reasoning";
 *   - UNVERIFIED renders as not-green and explains its empty-source state;
 *   - the override affordance surfaces and AI-proposed vs human-reviewed shows.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Lightweight lucide-react stub (mirrors the BeneficialOwnersPanel pattern).
vi.mock(
  "lucide-react",
  () =>
    new Proxy(
      {},
      {
        get: (_t, n: string) => {
          const I = (p: Record<string, unknown>) => (
            <span data-testid={`icon-${n}`} {...p} />
          );
          I.displayName = n;
          return I;
        },
      },
    ),
);

import { ExplainedPanel } from "./ExplainedPanel";
import {
  type ExplainedResult,
  unverifiedResult,
} from "@/lib/comply-v2/trade/explained-result";

function complete(
  overrides: Partial<ExplainedResult<{ code: string }>> = {},
): ExplainedResult<{ code: string }> {
  return {
    value: { code: "ECCN:9A515.a.1" },
    what: "Item classifies as ECCN 9A515.a.1.",
    why: "Aperture 0.55 m ≥ 0.50 m; matched 15 CFR 774 Supp.1 ECCN 9A515.a.1.",
    wherefore: "Licence likely required. Next: confirm de-minimis content.",
    confidence: "HIGH",
    sources: [
      {
        label: "EAR CCL Category 9",
        citation: "15 CFR 774 Supp.1 ECCN 9A515.a.1",
        listVersion: "2026-01-15",
      },
    ],
    override: { allowed: true },
    ...overrides,
  };
}

describe("ExplainedPanel — enforcement (refuses incomplete envelopes)", () => {
  it("renders the value when the envelope is complete", () => {
    render(<ExplainedPanel result={complete()} kind="Classification" />);
    expect(screen.getByTestId("explained-panel")).toBeTruthy();
    expect(screen.queryByTestId("explained-missing")).toBeNull();
    expect(screen.getByTestId("explained-what").textContent).toContain(
      "9A515.a.1",
    );
  });

  it("REFUSES to render and withholds the result when `why` is missing", () => {
    const broken = complete({ why: "" });
    render(<ExplainedPanel result={broken} />);
    expect(screen.getByTestId("explained-missing")).toBeTruthy();
    // The value/WHAT is NOT shown — it is withheld.
    expect(screen.queryByTestId("explained-panel")).toBeNull();
    expect(screen.queryByTestId("explained-what")).toBeNull();
    expect(screen.getByTestId("explained-missing").textContent).toContain(
      "why",
    );
  });

  it("REFUSES when a determined result has zero sources", () => {
    const broken = complete({ confidence: "HIGH", sources: [] });
    render(<ExplainedPanel result={broken} />);
    expect(screen.getByTestId("explained-missing")).toBeTruthy();
    expect(screen.getByTestId("explained-missing").textContent).toContain(
      "sources",
    );
  });

  it("lists ALL missing fields in the withheld block", () => {
    // deliberately mangle several fields
    const broken = {
      value: null,
      what: "",
      why: "",
      wherefore: "",
      confidence: "HIGH",
      sources: [],
    } as unknown as ExplainedResult<unknown>;
    render(<ExplainedPanel result={broken} />);
    const txt = screen.getByTestId("explained-missing").textContent ?? "";
    expect(txt).toContain("what");
    expect(txt).toContain("why");
    expect(txt).toContain("wherefore");
    expect(txt).toContain("sources");
  });
});

describe("ExplainedPanel — progressive disclosure", () => {
  it("shows WHAT + WHEREFORE up front but hides WHY until expanded", () => {
    render(<ExplainedPanel result={complete()} />);
    expect(screen.getByTestId("explained-what")).toBeTruthy();
    expect(screen.getByTestId("explained-wherefore")).toBeTruthy();
    // WHY/sources hidden until the toggle is pressed.
    expect(screen.queryByTestId("explained-why")).toBeNull();

    fireEvent.click(screen.getByTestId("explained-toggle"));
    expect(screen.getByTestId("explained-why")).toBeTruthy();
    expect(screen.getByTestId("explained-sources")).toBeTruthy();
  });

  it("can default the reasoning open (teaching mode)", () => {
    render(<ExplainedPanel result={complete()} defaultOpen />);
    expect(screen.getByTestId("explained-why")).toBeTruthy();
  });
});

describe("ExplainedPanel — confidence honesty", () => {
  it("renders UNVERIFIED as not-green and explains the empty-source state", () => {
    const r = unverifiedResult({
      value: null,
      what: "No classification could be determined.",
      why: "No control-list entry matched — absence is NOT a clearance.",
      wherefore: "Populate technical attributes or request a BAFA AzG.",
    });
    render(<ExplainedPanel result={r} defaultOpen />);
    const badge = screen.getByTestId("explained-confidence");
    expect(badge.getAttribute("data-confidence")).toBe("UNVERIFIED");
    // It is rendered — UNVERIFIED with [] sources is a valid envelope —
    // but the empty-source notice fires instead of a source list.
    expect(screen.queryByTestId("explained-missing")).toBeNull();
    expect(screen.getByTestId("explained-no-sources")).toBeTruthy();
    expect(screen.queryByTestId("explained-sources")).toBeNull();
  });
});

describe("ExplainedPanel — override (decision-of-record)", () => {
  it("shows AI-proposed status + an override affordance when allowed", () => {
    const onOverride = vi.fn();
    render(
      <ExplainedPanel
        result={complete()}
        defaultOpen
        onOverride={onOverride}
      />,
    );
    expect(
      screen
        .getByTestId("explained-override-status")
        .getAttribute("data-reviewed"),
    ).toBe("false");
    fireEvent.click(screen.getByTestId("explained-override-action"));
    expect(onOverride).toHaveBeenCalledTimes(1);
  });

  it("shows the human decision-of-record once recorded", () => {
    const decided = complete({
      override: {
        allowed: true,
        by: "officer@firm.de",
        at: "2026-06-09T10:00:00Z",
        justification: "Concur with 9A515.a.1.",
      },
    });
    render(<ExplainedPanel result={decided} defaultOpen />);
    expect(
      screen
        .getByTestId("explained-override-status")
        .getAttribute("data-reviewed"),
    ).toBe("true");
    expect(
      screen.getByTestId("explained-override-record").textContent,
    ).toContain("officer@firm.de");
    // No re-trigger affordance once decided.
    expect(screen.queryByTestId("explained-override-action")).toBeNull();
  });
});

describe("ExplainedPanel — un-collapsible hard banner", () => {
  it("renders a high-stakes banner above the verdict", () => {
    render(
      <ExplainedPanel
        result={complete()}
        hardBanner="ITAR §123.1(b) see-through: do not proceed on engine output alone."
      />,
    );
    expect(screen.getByTestId("explained-hard-banner").textContent).toContain(
      "see-through",
    );
  });
});
