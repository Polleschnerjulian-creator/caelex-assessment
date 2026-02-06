import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ComplianceProfile from "@/components/results/ComplianceProfile";
import { ComplianceResult } from "@/lib/types";
import React from "react";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      className,
      ...props
    }: React.ComponentProps<"div"> & {
      initial?: unknown;
      animate?: unknown;
      transition?: unknown;
    }) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

const createMockResult = (
  overrides?: Partial<ComplianceResult>,
): ComplianceResult => ({
  operatorType: "spacecraft_operator",
  operatorTypeLabel: "Spacecraft Operator (EU)",
  operatorAbbreviation: "SCO",
  isEU: true,
  isThirdCountry: false,
  regime: "standard",
  regimeLabel: "Standard (Full Requirements)",
  regimeReason: "Standard regime applies",
  entitySize: "medium",
  entitySizeLabel: "Medium Enterprise",
  constellationTier: null,
  constellationTierLabel: "N/A",
  orbit: "LEO",
  orbitLabel: "Low Earth Orbit (LEO)",
  offersEUServices: true,
  applicableArticles: [],
  totalArticles: 119,
  applicableCount: 34,
  applicablePercentage: 29,
  moduleStatuses: [],
  checklist: [],
  keyDates: [],
  estimatedAuthorizationCost: "~€100K/platform",
  authorizationPath: "National Authority → EUSPA",
  ...overrides,
});

describe("ComplianceProfile", () => {
  it("displays the profile header", () => {
    render(<ComplianceProfile result={createMockResult()} />);
    expect(
      screen.getByText("EU Space Act Compliance Profile"),
    ).toBeInTheDocument();
  });

  it("displays operator type label", () => {
    render(<ComplianceProfile result={createMockResult()} />);
    expect(screen.getByText("Operator Type")).toBeInTheDocument();
    expect(screen.getByText("Spacecraft Operator (EU)")).toBeInTheDocument();
  });

  it("displays regime label", () => {
    render(<ComplianceProfile result={createMockResult()} />);
    expect(screen.getByText("Regime")).toBeInTheDocument();
    expect(
      screen.getByText("Standard (Full Requirements)"),
    ).toBeInTheDocument();
  });

  it("displays entity size", () => {
    render(<ComplianceProfile result={createMockResult()} />);
    expect(screen.getByText("Entity Size")).toBeInTheDocument();
    expect(screen.getByText("Medium Enterprise")).toBeInTheDocument();
  });

  it("displays constellation tier", () => {
    render(
      <ComplianceProfile
        result={createMockResult({
          constellationTierLabel: "Small (8 satellites)",
        })}
      />,
    );
    expect(screen.getByText("Constellation")).toBeInTheDocument();
    expect(screen.getByText("Small (8 satellites)")).toBeInTheDocument();
  });

  it("displays N/A for no constellation", () => {
    render(<ComplianceProfile result={createMockResult()} />);
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("displays orbit label", () => {
    render(<ComplianceProfile result={createMockResult()} />);
    expect(screen.getByText("Primary Orbit")).toBeInTheDocument();
    expect(screen.getByText("Low Earth Orbit (LEO)")).toBeInTheDocument();
  });

  it("displays EU Services as Yes", () => {
    render(<ComplianceProfile result={createMockResult()} />);
    expect(screen.getByText("EU Services")).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument();
  });

  it("displays EU Services as No", () => {
    render(
      <ComplianceProfile
        result={createMockResult({ offersEUServices: false })}
      />,
    );
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("displays article count and total", () => {
    render(<ComplianceProfile result={createMockResult()} />);
    expect(screen.getByText("34 of 119")).toBeInTheDocument();
    expect(screen.getByText("29%")).toBeInTheDocument();
  });

  it("displays authorization path", () => {
    render(<ComplianceProfile result={createMockResult()} />);
    expect(screen.getByText("Authorization Path")).toBeInTheDocument();
    expect(screen.getByText("National Authority → EUSPA")).toBeInTheDocument();
  });

  it("displays estimated authorization cost", () => {
    render(<ComplianceProfile result={createMockResult()} />);
    expect(
      screen.getByText("Estimated Authorization Cost"),
    ).toBeInTheDocument();
    expect(screen.getByText("~€100K/platform")).toBeInTheDocument();
  });

  it("displays key deadline", () => {
    render(<ComplianceProfile result={createMockResult()} />);
    expect(screen.getByText("1 Jan 2030")).toBeInTheDocument();
  });

  it("shows Light Regime note when regime is light", () => {
    render(
      <ComplianceProfile
        result={createMockResult({
          regime: "light",
          regimeReason:
            "Small enterprise qualifies for simplified requirements",
        })}
      />,
    );
    expect(screen.getByText("Light Regime Eligible")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Small enterprise qualifies for simplified requirements",
      ),
    ).toBeInTheDocument();
  });

  it("does not show Light Regime note for standard regime", () => {
    render(<ComplianceProfile result={createMockResult()} />);
    expect(screen.queryByText("Light Regime Eligible")).not.toBeInTheDocument();
  });

  it("shows Third Country note when applicable", () => {
    render(
      <ComplianceProfile result={createMockResult({ isThirdCountry: true })} />,
    );
    expect(
      screen.getByText("Third Country Operator Requirements"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/designate an EU legal representative/),
    ).toBeInTheDocument();
  });

  it("does not show Third Country note for EU operators", () => {
    render(<ComplianceProfile result={createMockResult()} />);
    expect(
      screen.queryByText("Third Country Operator Requirements"),
    ).not.toBeInTheDocument();
  });
});
