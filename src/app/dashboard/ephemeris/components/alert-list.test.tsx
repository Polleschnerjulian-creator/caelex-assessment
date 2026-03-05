import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock GlassCard
vi.mock("@/components/ui/GlassCard", () => ({
  default: vi.fn(
    ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) =>
      React.createElement(
        "div",
        { className, "data-testid": "glass-card" },
        children,
      ),
  ),
}));

// Mock lucide-react with explicit named exports (Proxy-based mocks hang with static imports in Vitest 4)
vi.mock("lucide-react", () => ({
  AlertTriangle: (props: Record<string, unknown>) =>
    React.createElement("svg", {
      "data-testid": "icon-AlertTriangle",
      ...props,
    }),
  CheckCircle: (props: Record<string, unknown>) =>
    React.createElement("svg", { "data-testid": "icon-CheckCircle", ...props }),
}));

import AlertList from "./alert-list";

function makeAlert(
  overrides: Partial<{
    id: string;
    type: string;
    severity: string;
    title: string;
    message: string;
  }> = {},
) {
  return {
    id: overrides.id ?? "a1",
    type: overrides.type ?? "DRIFT",
    severity: overrides.severity ?? "MEDIUM",
    title: overrides.title ?? "Test alert",
    message: overrides.message ?? "Alert message",
  };
}

function makeSatellite(
  overrides: Partial<{
    noradId: string;
    satelliteName: string;
    activeAlerts: ReturnType<typeof makeAlert>[];
  }> = {},
) {
  return {
    noradId: overrides.noradId ?? "12345",
    satelliteName: overrides.satelliteName ?? "SAT-1",
    activeAlerts: overrides.activeAlerts ?? [],
  };
}

describe("AlertList", () => {
  it("renders empty state when fleet has no alerts", () => {
    render(<AlertList fleet={[makeSatellite()]} />);
    expect(screen.getByText("No active alerts")).toBeInTheDocument();
    expect(screen.getByTestId("icon-CheckCircle")).toBeInTheDocument();
  });

  it("renders empty state when fleet is empty array", () => {
    render(<AlertList fleet={[]} />);
    expect(screen.getByText("No active alerts")).toBeInTheDocument();
  });

  it("renders alert count in heading", () => {
    const fleet = [
      makeSatellite({
        activeAlerts: [
          makeAlert({ id: "a1", severity: "HIGH" }),
          makeAlert({ id: "a2", severity: "LOW" }),
        ],
      }),
    ];
    render(<AlertList fleet={fleet} />);
    expect(screen.getByText("Active Alerts (2)")).toBeInTheDocument();
  });

  it("flattens alerts from multiple satellites", () => {
    const fleet = [
      makeSatellite({
        noradId: "111",
        satelliteName: "Alpha",
        activeAlerts: [makeAlert({ id: "a1", title: "Alert Alpha" })],
      }),
      makeSatellite({
        noradId: "222",
        satelliteName: "Beta",
        activeAlerts: [makeAlert({ id: "a2", title: "Alert Beta" })],
      }),
    ];
    render(<AlertList fleet={fleet} />);
    expect(screen.getByText("Active Alerts (2)")).toBeInTheDocument();
    expect(screen.getByText("Alert Alpha")).toBeInTheDocument();
    expect(screen.getByText("Alert Beta")).toBeInTheDocument();
  });

  it("sorts alerts by severity: CRITICAL first, then HIGH, MEDIUM, LOW", () => {
    const fleet = [
      makeSatellite({
        activeAlerts: [
          makeAlert({ id: "low", severity: "LOW", title: "Low alert" }),
          makeAlert({
            id: "crit",
            severity: "CRITICAL",
            title: "Critical alert",
          }),
          makeAlert({ id: "med", severity: "MEDIUM", title: "Medium alert" }),
          makeAlert({ id: "high", severity: "HIGH", title: "High alert" }),
        ],
      }),
    ];
    render(<AlertList fleet={fleet} />);
    const severityLabels = screen.getAllByText(/^(CRITICAL|HIGH|MEDIUM|LOW)$/);
    expect(severityLabels.map((el) => el.textContent)).toEqual([
      "CRITICAL",
      "HIGH",
      "MEDIUM",
      "LOW",
    ]);
  });

  it("displays satellite name for each alert", () => {
    const fleet = [
      makeSatellite({
        satelliteName: "Starlink-42",
        activeAlerts: [makeAlert({ id: "a1" })],
      }),
    ];
    render(<AlertList fleet={fleet} />);
    expect(screen.getByText("Starlink-42")).toBeInTheDocument();
  });

  it("displays alert title and message", () => {
    const fleet = [
      makeSatellite({
        activeAlerts: [
          makeAlert({
            id: "a1",
            title: "Orbital decay detected",
            message: "Re-entry within 25 years threshold breached",
          }),
        ],
      }),
    ];
    render(<AlertList fleet={fleet} />);
    expect(screen.getByText("Orbital decay detected")).toBeInTheDocument();
    expect(
      screen.getByText("Re-entry within 25 years threshold breached"),
    ).toBeInTheDocument();
  });

  it("applies CRITICAL severity styling", () => {
    const fleet = [
      makeSatellite({
        activeAlerts: [makeAlert({ id: "a1", severity: "CRITICAL" })],
      }),
    ];
    render(<AlertList fleet={fleet} />);
    const severitySpan = screen.getByText("CRITICAL");
    expect(severitySpan.className).toContain("text-red-500");
  });

  it("handles satellite with undefined activeAlerts gracefully", () => {
    const fleet = [
      {
        noradId: "999",
        satelliteName: "Ghost",
        activeAlerts: undefined as unknown as Array<{
          id: string;
          type: string;
          severity: string;
          title: string;
          message: string;
        }>,
      },
    ];
    render(<AlertList fleet={fleet} />);
    expect(screen.getByText("No active alerts")).toBeInTheDocument();
  });

  it("renders AlertTriangle icon for each alert", () => {
    const fleet = [
      makeSatellite({
        activeAlerts: [makeAlert({ id: "a1" }), makeAlert({ id: "a2" })],
      }),
    ];
    render(<AlertList fleet={fleet} />);
    const icons = screen.getAllByTestId("icon-AlertTriangle");
    expect(icons.length).toBe(2);
  });
});
