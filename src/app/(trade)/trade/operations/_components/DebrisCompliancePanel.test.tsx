/**
 * Smoke tests for DebrisCompliancePanel.
 *
 * Covers:
 *   - Empty state when no Spacecraft is linked
 *   - Loading state
 *   - Compliant render
 *   - Non-compliant render
 *   - Deep-link to /dashboard/modules/debris
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & Record<string, unknown>) =>
    React.createElement("a", { href, ...rest }, children),
}));

import {
  DebrisCompliancePanel,
  type DebrisStatusView,
} from "./DebrisCompliancePanel";

const compliantFixture: DebrisStatusView = {
  spacecraft: {
    spacecraftId: "sc_1",
    spacecraftName: "ICEYE-X42",
    cosparId: "2026-001A",
    noradId: "60001",
    orbitType: "LEO",
    missionRefId: "m_1",
    missionName: "ICEYE-FY26",
  },
  iadcCompliant: true,
  deorbit25Year: "yes",
  fccOdmpStatus: "yes",
  lastReviewDate: new Date("2026-04-01"),
  complianceScore: 92,
  status: "compliant",
};

describe("DebrisCompliancePanel", () => {
  it("renders empty state when data is null", () => {
    render(<DebrisCompliancePanel data={null} />);
    expect(screen.getByText(/Caelex Comply Spacecraft/i)).toBeInTheDocument();
    expect(screen.getByText(/edit the operation/i)).toBeInTheDocument();
  });

  it("renders loading state", () => {
    render(<DebrisCompliancePanel data={null} loading />);
    expect(screen.getByText(/Loading debris status/i)).toBeInTheDocument();
  });

  it("renders compliant state with spacecraft + deep link", () => {
    render(<DebrisCompliancePanel data={compliantFixture} />);
    expect(screen.getByText("Compliant")).toBeInTheDocument();
    expect(screen.getByText("ICEYE-X42")).toBeInTheDocument();
    expect(screen.getByText(/COSPAR 2026-001A/)).toBeInTheDocument();
    expect(screen.getByText(/score 92/i)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /open debris module/i });
    expect(link).toHaveAttribute("href", "/dashboard/modules/debris");
  });

  it("renders non-compliant state when assessment fails", () => {
    render(
      <DebrisCompliancePanel
        data={{
          ...compliantFixture,
          status: "non_compliant",
          deorbit25Year: "no",
        }}
      />,
    );
    expect(screen.getByText("Non-Compliant")).toBeInTheDocument();
  });

  it("renders unknown state with no review date", () => {
    render(
      <DebrisCompliancePanel
        data={{
          ...compliantFixture,
          status: "unknown",
          iadcCompliant: null,
          deorbit25Year: null,
          fccOdmpStatus: null,
          lastReviewDate: null,
          complianceScore: null,
        }}
      />,
    );
    expect(screen.getAllByText("Unknown").length).toBeGreaterThan(0);
    expect(screen.getByText(/No review recorded/i)).toBeInTheDocument();
  });
});
