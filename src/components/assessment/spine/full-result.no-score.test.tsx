/**
 * The plan-mandated NO-OVERALL-SCORE test for the FULL result surface
 * (plan Task 3.3: "NO overall score anywhere (no /score/i in types or DOM —
 * write the DOM test)"; honesty invariant #6 / founder §11.3).
 *
 * Composes every full-result section component with rich fixtures — the
 * verdict-header pieces (FindingCards incl. flux + evidence examples),
 * ClusterSection with a readiness band, UnknownsList, JurisdictionMatrix —
 * and asserts the rendered DOM carries:
 *   - NO occurrence of /score/i at all,
 *   - NO "N / 100" aggregate,
 *   - NO percentage-style overall figure wording ("overall", "favorability").
 *
 * Readiness renders as "N of M" bands by design — "of", never a slash — so
 * the per-cluster evidence bands stay structurally incapable of reading as
 * a score.
 *
 * Plus the TYPES half of the invariant: a deep key-scan over a representative
 * stored full result asserting no key matches /score/i.
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import FindingCard from "./FindingCard";
import ClusterSection from "./ClusterSection";
import UnknownsList from "./UnknownsList";
import JurisdictionMatrix from "./JurisdictionMatrix";
import {
  authorizationFinding,
  contestedCyberFinding,
  nis2NeedsClarificationFinding,
  regimeLikelyEligibleFinding,
  registrationFinding,
  scopeNoteFinding,
  buildFullQuickResultFixture,
} from "./quick-result.fixtures";
import {
  evidenceFinding,
  readinessBandFixture,
  unknownsFixture,
} from "./full-result.fixtures";

function renderFullSurface() {
  return render(
    <div>
      {/* (1) verdict-header pieces */}
      <FindingCard finding={scopeNoteFinding()} />
      <FindingCard finding={regimeLikelyEligibleFinding()} />
      <FindingCard finding={nis2NeedsClarificationFinding()} />
      {/* (2) obligation map by cluster — full envelopes + readiness band */}
      <ClusterSection
        cluster={{
          id: "resilience_cyber",
          label: "Resilience & cybersecurity",
          counts: { applicable: 1, conditional: 0, contested: 1, advisory: 0 },
          findings: [contestedCyberFinding(), evidenceFinding()],
        }}
        readiness={readinessBandFixture()}
      />
      <ClusterSection
        cluster={{
          id: "authorization_registration",
          label: "Authorisation & registration",
          counts: { applicable: 2, conditional: 0, contested: 0, advisory: 0 },
          findings: [authorizationFinding(), registrationFinding()],
        }}
      />
      {/* (3) unknowns */}
      <UnknownsList unknowns={unknownsFixture()} />
      {/* (6) jurisdiction comparison */}
      <JurisdictionMatrix codes={["fr", "it", "de"]} />
    </div>,
  );
}

describe("Full result surface — NO overall score (invariant #6)", () => {
  it("renders no /score/i, no N/100 aggregate and no favorability figure anywhere in the DOM", () => {
    const { container } = renderFullSurface();
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/score/i);
    expect(text).not.toMatch(/\b\d{1,3}\s*\/\s*100\b/);
    expect(text).not.toMatch(/favorab/i);
    expect(text).not.toMatch(/overall\s+(rating|figure|number)/i);
  });

  it("renders the readiness band as an 'N of M' band — 'of', never a slash", () => {
    const { getByTestId } = renderFullSurface();
    const band = getByTestId("readiness-band");
    expect(band.textContent).toMatch(/3 of 8/);
    expect(band.textContent).not.toMatch(/\d\s*\/\s*\d/);
  });
});

describe("Full result types — no key matches /score/i (invariant #6)", () => {
  function collectKeys(value: unknown, out: Set<string>): void {
    if (Array.isArray(value)) {
      for (const v of value) collectKeys(v, out);
      return;
    }
    if (value !== null && typeof value === "object") {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out.add(k);
        collectKeys(v, out);
      }
    }
  }

  it("a representative stored result carries no score-like key at any depth", () => {
    const keys = new Set<string>();
    collectKeys(
      {
        ...buildFullQuickResultFixture(),
        tier: "full",
        readiness: [readinessBandFixture()],
        unknowns: unknownsFixture(),
      },
      keys,
    );
    const offending = [...keys].filter((k) => /score/i.test(k));
    expect(offending).toEqual([]);
  });
});
