/**
 * Smoke tests for SpectrumCoordinationPanel.
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
  SpectrumCoordinationPanel,
  type SpectrumStatusView,
} from "./SpectrumCoordinationPanel";

const operationalFixture: SpectrumStatusView = {
  spacecraft: {
    spacecraftId: "sc_1",
    spacecraftName: "ICEYE-X42",
    cosparId: "2026-001A",
    noradId: "60001",
    orbitType: "LEO",
    missionRefId: "m_1",
    missionName: "ICEYE-FY26",
  },
  operatingFrequenciesMhz: [11700, 14000],
  ituStatus: "OPERATIONAL",
  filingReference: "MFRN-2026-DE-001",
  nationalAdministration: "BNetzA (DE)",
  status: "compliant",
};

describe("SpectrumCoordinationPanel", () => {
  it("renders empty state when no spacecraft linked", () => {
    render(<SpectrumCoordinationPanel data={null} />);
    expect(screen.getByText(/Caelex Comply Spacecraft/i)).toBeInTheDocument();
  });

  it("renders loading state", () => {
    render(<SpectrumCoordinationPanel data={null} loading />);
    expect(screen.getByText(/Loading spectrum status/i)).toBeInTheDocument();
  });

  it("renders the operational state with frequencies + ITU phase + admin", () => {
    render(<SpectrumCoordinationPanel data={operationalFixture} />);
    expect(screen.getByText("Operational")).toBeInTheDocument();
    expect(screen.getByText("OPERATIONAL")).toBeInTheDocument();
    expect(screen.getByText("11700, 14000")).toBeInTheDocument();
    expect(screen.getByText("MFRN-2026-DE-001")).toBeInTheDocument();
    expect(screen.getByText("BNetzA (DE)")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /open spectrum module/i });
    expect(link).toHaveAttribute("href", "/dashboard/modules/spectrum");
  });

  it("renders unknown state when nothing has been filed", () => {
    render(
      <SpectrumCoordinationPanel
        data={{
          ...operationalFixture,
          ituStatus: null,
          operatingFrequenciesMhz: [],
          filingReference: null,
          nationalAdministration: null,
          status: "unknown",
        }}
      />,
    );
    expect(screen.getByText("Unknown")).toBeInTheDocument();
    expect(screen.getByText(/none declared/i)).toBeInTheDocument();
    expect(screen.getByText(/Not filed/i)).toBeInTheDocument();
  });
});
