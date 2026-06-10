/**
 * DOM tests for JurisdictionMatrix (plan Task 3.3).
 *
 * Plan-mandated assertions:
 *   - the matrix is the FACTUAL 10-criterion comparison from the verified
 *     national-space-laws dataset (timeline, insurance requirement as stated
 *     in law, indemnification, fees, …);
 *   - NO 0–100 favorability number and NO "recommended jurisdiction" line
 *     (founder default — the legacy favorability score is replaced);
 *   - honest cells: a jurisdiction without a comprehensive law / without a
 *     mandatory-insurance rule renders the honest negative, never an
 *     invented value;
 *   - unknown jurisdiction codes never produce a column; duplicates are
 *     deduped; an all-unknown selection renders the honest empty note.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import JurisdictionMatrix, { MATRIX_CRITERIA } from "./JurisdictionMatrix";

describe("JurisdictionMatrix — the factual 10-criterion comparison", () => {
  it("exposes exactly 10 criteria", () => {
    expect(MATRIX_CRITERIA).toHaveLength(10);
  });

  it("renders one rowheader per criterion (10 factual rows)", () => {
    render(<JurisdictionMatrix codes={["fr", "de"]} />);
    expect(screen.getAllByRole("rowheader")).toHaveLength(10);
    // The §6 (6) headline criteria are all present.
    expect(screen.getByText("Typical processing time")).toBeInTheDocument();
    expect(
      screen.getByText("Insurance requirement (as stated in law)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Government indemnification")).toBeInTheDocument();
    expect(screen.getByText("Application fee")).toBeInTheDocument();
  });

  it("renders a column per selected jurisdiction with the dataset facts", () => {
    render(<JurisdictionMatrix codes={["fr", "de"]} />);
    expect(
      screen.getByRole("columnheader", { name: /France/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /Germany/ }),
    ).toBeInTheDocument();
    // FR insurance requirement AS STATED IN LAW (€60M minimum, LOS).
    expect(
      screen.getByText(/Mandatory — minimum €60,000,000/),
    ).toBeInTheDocument();
    // FR processing timeline from the dataset (12–26 weeks).
    expect(screen.getByText("12–26 weeks")).toBeInTheDocument();
  });

  it("renders honest negatives for a jurisdiction without the relevant rule (DE)", () => {
    render(<JurisdictionMatrix codes={["de"]} />);
    // No comprehensive national space law — stated, not papered over.
    expect(
      screen.getByText(/no comprehensive national space law/i),
    ).toBeInTheDocument();
    // No general mandatory-insurance requirement — never an invented amount.
    expect(
      screen.getByText(/No general mandatory-insurance requirement stated/i),
    ).toBeInTheDocument();
  });

  it("contains NO favorability number, NO score and NO recommended-jurisdiction line", () => {
    const { container } = render(
      <JurisdictionMatrix codes={["fr", "it", "de", "uk", "lu"]} />,
    );
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/favorab/i);
    expect(text).not.toMatch(/\bscore\b/i);
    expect(text).not.toMatch(/\b\d{1,3}\s*\/\s*100\b/);
    expect(text).not.toMatch(/recommended jurisdiction/i);
    // The factual framing is stated instead.
    expect(screen.getByText(/This table ranks nothing/i)).toBeInTheDocument();
  });

  it("skips unknown codes — a comparison column is never invented", () => {
    render(<JurisdictionMatrix codes={["fr", "zz"]} />);
    // 1 criterion column + 1 jurisdiction column only.
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
    expect(
      screen.getByRole("columnheader", { name: /France/ }),
    ).toBeInTheDocument();
  });

  it("dedupes repeated codes regardless of case", () => {
    render(<JurisdictionMatrix codes={["fr", "FR", "Fr"]} />);
    expect(
      screen.getAllByRole("columnheader", { name: /France/ }),
    ).toHaveLength(1);
  });

  it("renders the honest empty note when nothing matches the dataset", () => {
    render(<JurisdictionMatrix codes={["zz", "xx"]} />);
    expect(
      screen.getByText(/No comparison data is available/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
