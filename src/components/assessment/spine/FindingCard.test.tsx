/**
 * DOM tests for FindingCard (plan Task 3.3).
 *
 * Plan-mandated assertions:
 *   - the card REFUSES a finding failing `isFindingComplete` and renders the
 *     NAMED-missing-fields fallback (the ExplainedPanel refusal pattern) —
 *     no part of the incomplete finding's body reaches the DOM;
 *   - a complete envelope renders the verdict badge, the one-line obligation,
 *     the citation + as-of date, and the why-trace ("Because you answered:");
 *   - the flux chip renders COLLAPSED by default (the legislative positions
 *     are NOT in the DOM) and expands on click (founder §11.4);
 *   - the `evidenceExamples` list renders as "Evidence a supervisor would
 *     accept" when present, and is absent otherwise (§6 (2), full tier);
 *   - `nis2TranspositionSuffix` derives the §6 verdict-header suffix from
 *     MSTransposition DATA only: in_force → the act name, unverified →
 *     "transposition status unverified", empty → no suffix — NEVER a
 *     hardcoded member-state string, NEVER an invented act name.
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FindingCard, { FluxChip } from "./FindingCard";
import { nis2TranspositionSuffix } from "./nis2-suffix";
import {
  authorizationFinding,
  contestedCyberFinding,
  incompleteFinding,
} from "./quick-result.fixtures";
import {
  evidenceFinding,
  unverifiedSourceFinding,
  TRANSPOSITION_DE_IN_FORCE,
  TRANSPOSITION_FR_UNVERIFIED,
} from "./full-result.fixtures";
import type { AssessmentFinding } from "@/lib/assessment/finding";
import type { MSTransposition } from "@/lib/assessment/nis2-gateway.server";

describe("FindingCard — the refusal pattern (invariant #5)", () => {
  it("refuses an incomplete envelope and NAMES the missing fields", () => {
    render(
      <FindingCard
        finding={incompleteFinding() as unknown as AssessmentFinding}
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/Finding withheld/i);
    // The named-missing-fields fallback (isFindingComplete order):
    expect(alert).toHaveTextContent(
      "why, wherefore, confidence, sources, whyTrace, cluster",
    );
  });

  it("renders NO part of the incomplete finding's body", () => {
    render(
      <FindingCard
        finding={incompleteFinding() as unknown as AssessmentFinding}
      />,
    );
    expect(
      screen.queryByText(/Half-baked obligation that must never render/),
    ).not.toBeInTheDocument();
    // No verdict badge either — refusal is total, never partial.
    expect(screen.queryByText("Applicable")).not.toBeInTheDocument();
  });
});

describe("FindingCard — complete envelope rendering", () => {
  it("renders the verdict badge and the one-line obligation", () => {
    render(<FindingCard finding={authorizationFinding()} />);
    expect(screen.getByText("Applicable")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Operator authorisation is required before launch or operation.",
      ),
    ).toBeInTheDocument();
  });

  it("renders the citation with its as-of date", () => {
    render(<FindingCard finding={authorizationFinding()} />);
    expect(
      screen.getByText(/COM\(2025\) 335 Art\. 6.*\(as of 2025-06-25\)/i),
    ).toBeInTheDocument();
  });

  it("renders the why-trace ('Because you answered: …')", () => {
    render(<FindingCard finding={authorizationFinding()} />);
    expect(
      screen.getByText(
        /Because you answered:.*q1_1_roles — Spacecraft operator/i,
      ),
    ).toBeInTheDocument();
  });

  it("renders the confidence band", () => {
    render(<FindingCard finding={authorizationFinding()} />);
    expect(screen.getByText(/Confidence: Determined/i)).toBeInTheDocument();
  });

  it("marks an unverified source as 'legal basis pending verification'", () => {
    render(<FindingCard finding={unverifiedSourceFinding()} />);
    expect(
      screen.getByText(/legal basis pending verification/i),
    ).toBeInTheDocument();
  });
});

describe("FindingCard — flux chip (founder §11.4: collapsed-conservative)", () => {
  it("renders the chip collapsed: positions NOT in the DOM until expanded", () => {
    render(<FindingCard finding={contestedCyberFinding()} />);
    const chip = screen.getByText("contested — conservative reading shown");
    expect(chip).toBeInTheDocument();
    expect(screen.queryByText(/lex specialis/)).not.toBeInTheDocument();

    fireEvent.click(chip);

    expect(screen.getByText(/lex specialis/)).toBeInTheDocument();
    expect(
      screen.getByText(/resilience chapter deleted; NIS2 extended instead/),
    ).toBeInTheDocument();
  });

  it("FluxChip is reusable standalone (roadmap contested items)", () => {
    render(
      <FluxChip
        flux={{
          summary: "contested — conservative reading shown",
          conservativeReading: "Plan against the earliest plausible window.",
          positions: [
            { source: "com-2025-335", position: "1 January 2030" },
            {
              source: "presidency-compromise",
              position: "36 months after entry into force",
            },
          ],
        }}
      />,
    );
    expect(
      screen.getByText("contested — conservative reading shown"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/1 January 2030/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(/1 January 2030/)).toBeInTheDocument();
  });
});

describe("FindingCard — evidence examples (§6 (2), full tier)", () => {
  it("renders the 'evidence a supervisor would accept' list when present", () => {
    render(<FindingCard finding={evidenceFinding()} />);
    expect(
      screen.getByText(/Evidence a supervisor would accept/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Debris-mitigation plan submitted\/approved/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Casualty-risk assessment/)).toBeInTheDocument();
  });

  it("renders NO evidence section when the finding carries none", () => {
    render(<FindingCard finding={authorizationFinding()} />);
    expect(
      screen.queryByText(/Evidence a supervisor would accept/i),
    ).not.toBeInTheDocument();
  });
});

describe("nis2TranspositionSuffix — the §6 verdict-header suffix (Task 3.3)", () => {
  it("returns null for an empty transposition list (no suffix)", () => {
    expect(nis2TranspositionSuffix([])).toBeNull();
  });

  it("renders the verified act name for an in_force member state", () => {
    expect(nis2TranspositionSuffix([TRANSPOSITION_DE_IN_FORCE])).toBe(
      "(DE transposition — NIS2UmsuCG)",
    );
  });

  it("renders 'transposition status unverified' for an unverified state", () => {
    expect(nis2TranspositionSuffix([TRANSPOSITION_FR_UNVERIFIED])).toBe(
      "(FR transposition status unverified)",
    );
  });

  it("joins mixed states — every part derived from the data, never hardcoded", () => {
    expect(
      nis2TranspositionSuffix([
        TRANSPOSITION_DE_IN_FORCE,
        TRANSPOSITION_FR_UNVERIFIED,
      ]),
    ).toBe(
      "(DE transposition — NIS2UmsuCG · FR transposition status unverified)",
    );
  });

  it("NEVER invents an act name: a malformed in_force entry without one falls back to the unverified wording", () => {
    const malformed: MSTransposition = {
      state: "nl",
      actName: null,
      inForce: "2026-01-01",
      status: "in_force",
    };
    expect(nis2TranspositionSuffix([malformed])).toBe(
      "(NL transposition status unverified)",
    );
  });

  it("derives the member-state code from the input, not from any fixed list", () => {
    const exotic: MSTransposition = {
      state: "lv",
      actName: null,
      inForce: null,
      status: "unverified",
    };
    expect(nis2TranspositionSuffix([exotic])).toBe(
      "(LV transposition status unverified)",
    );
  });
});
