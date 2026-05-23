/**
 * Smoke tests for AuthorizationPanel.
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
  AuthorizationPanel,
  type AuthorizationStatusView,
} from "./AuthorizationPanel";

const approvedFixture: AuthorizationStatusView = {
  spacecraft: {
    spacecraftId: "sc_1",
    spacecraftName: "ICEYE-X42",
    cosparId: "2026-001A",
    noradId: "60001",
    orbitType: "LEO",
    missionRefId: "m_1",
    missionName: "ICEYE-FY26",
  },
  nationalAuthorizationStatus: "approved",
  primaryNcaName: "Bundesnetzagentur (DE)",
  euSpaceActPathway: "national_authorization",
  nis2Classification: "essential",
  status: "compliant",
};

describe("AuthorizationPanel", () => {
  it("renders empty state when no spacecraft linked", () => {
    render(<AuthorizationPanel data={null} />);
    expect(screen.getByText(/Caelex Comply Spacecraft/i)).toBeInTheDocument();
  });

  it("renders loading state", () => {
    render(<AuthorizationPanel data={null} loading />);
    expect(
      screen.getByText(/Loading authorization status/i),
    ).toBeInTheDocument();
  });

  it("renders the approved state with NCA, pathway, and NIS2", () => {
    render(<AuthorizationPanel data={approvedFixture} />);
    expect(screen.getAllByText("Approved").length).toBeGreaterThan(0);
    expect(screen.getByText(/Bundesnetzagentur \(DE\)/)).toBeInTheDocument();
    expect(
      screen.getByText(/National authorisation \(national space act\)/),
    ).toBeInTheDocument();
    expect(screen.getByText("Essential entity")).toBeInTheDocument();
    const link = screen.getByRole("link", {
      name: /open authorization module/i,
    });
    expect(link).toHaveAttribute("href", "/dashboard/modules/authorization");
  });

  it("renders rejected state correctly", () => {
    render(
      <AuthorizationPanel
        data={{
          ...approvedFixture,
          status: "non_compliant",
          nationalAuthorizationStatus: "rejected",
        }}
      />,
    );
    expect(screen.getAllByText("Rejected").length).toBeGreaterThan(0);
  });

  it("renders unknown state when nothing is set", () => {
    render(
      <AuthorizationPanel
        data={{
          ...approvedFixture,
          nationalAuthorizationStatus: null,
          primaryNcaName: null,
          euSpaceActPathway: null,
          nis2Classification: null,
          status: "unknown",
        }}
      />,
    );
    expect(screen.getByText("Not Started")).toBeInTheDocument();
    expect(screen.getByText(/Not assessed/)).toBeInTheDocument();
    expect(screen.getByText(/Not determined/)).toBeInTheDocument();
  });
});
