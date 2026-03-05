import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

// Mock lucide-react with explicit named exports (Proxy-based mocks hang with static imports in Vitest 4)
vi.mock("lucide-react", () => ({
  Clock: (props: any) =>
    React.createElement("svg", { "data-testid": "icon-Clock", ...props }),
  Shield: (props: any) =>
    React.createElement("svg", { "data-testid": "icon-Shield", ...props }),
  AlertTriangle: (props: any) =>
    React.createElement("svg", {
      "data-testid": "icon-AlertTriangle",
      ...props,
    }),
}));

import ComplianceHorizonDisplay from "@/app/dashboard/ephemeris/components/compliance-horizon-display";

describe("ComplianceHorizonDisplay", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <ComplianceHorizonDisplay
        horizon={{
          daysUntilFirstBreach: 500,
          firstBreachRegulation: "Art. 70",
          confidence: "High",
        }}
      />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("displays day count", () => {
    const { container } = render(
      <ComplianceHorizonDisplay
        horizon={{
          daysUntilFirstBreach: 500,
          firstBreachRegulation: "Art. 70",
          confidence: "High",
        }}
      />,
    );
    expect(container.textContent).toContain("500");
    expect(container.textContent).toContain("days until first breach");
  });

  it("displays infinity symbol when days is null", () => {
    const { container } = render(
      <ComplianceHorizonDisplay
        horizon={{
          daysUntilFirstBreach: null,
          firstBreachRegulation: null,
          confidence: "High",
        }}
      />,
    );
    // \u221E = infinity
    expect(container.textContent).toContain("\u221E");
    expect(container.textContent).toContain("No breach forecasted");
  });

  it("applies urgent styling when days < 90", () => {
    const { container } = render(
      <ComplianceHorizonDisplay
        horizon={{
          daysUntilFirstBreach: 45,
          firstBreachRegulation: "Art. 70",
          confidence: "Medium",
        }}
      />,
    );
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.className).toContain("bg-red-50");
    expect(outerDiv.className).toContain("border-red-200");
  });

  it("applies warning styling when days < 365 and >= 90", () => {
    const { container } = render(
      <ComplianceHorizonDisplay
        horizon={{
          daysUntilFirstBreach: 200,
          firstBreachRegulation: "Art. 70",
          confidence: "Medium",
        }}
      />,
    );
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.className).toContain("bg-amber-50");
    expect(outerDiv.className).toContain("border-amber-200");
  });

  it("applies normal styling when days >= 365", () => {
    const { container } = render(
      <ComplianceHorizonDisplay
        horizon={{
          daysUntilFirstBreach: 500,
          firstBreachRegulation: "Art. 70",
          confidence: "High",
        }}
      />,
    );
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.className).toContain("bg-[#F7F8FA]");
    expect(outerDiv.className).toContain("border-[#E5E7EB]");
  });

  it("displays breach regulation info when available", () => {
    const { container } = render(
      <ComplianceHorizonDisplay
        horizon={{
          daysUntilFirstBreach: 200,
          firstBreachRegulation: "Art. 70 EU Space Act",
          confidence: "High",
        }}
      />,
    );
    expect(container.textContent).toContain("First breach");
    expect(container.textContent).toContain("Art. 70 EU Space Act");
    expect(container.textContent).toContain("Confidence: High");
  });

  it("does not display breach info when days is null", () => {
    const { container } = render(
      <ComplianceHorizonDisplay
        horizon={{
          daysUntilFirstBreach: null,
          firstBreachRegulation: null,
          confidence: "High",
        }}
      />,
    );
    expect(container.textContent).not.toContain("First breach");
  });

  it("shows AlertTriangle icon for urgent breaches", () => {
    const { container } = render(
      <ComplianceHorizonDisplay
        horizon={{
          daysUntilFirstBreach: 30,
          firstBreachRegulation: "NIS2 Art. 21",
          confidence: "High",
        }}
      />,
    );
    const alertIcon = container.querySelector(
      '[data-testid="icon-AlertTriangle"]',
    );
    expect(alertIcon).toBeTruthy();
  });

  it("shows Shield icon for non-urgent breaches", () => {
    const { container } = render(
      <ComplianceHorizonDisplay
        horizon={{
          daysUntilFirstBreach: 200,
          firstBreachRegulation: "Art. 70",
          confidence: "Medium",
        }}
      />,
    );
    const shieldIcon = container.querySelector('[data-testid="icon-Shield"]');
    expect(shieldIcon).toBeTruthy();
  });

  it("renders Compliance Horizon label", () => {
    const { container } = render(
      <ComplianceHorizonDisplay
        horizon={{
          daysUntilFirstBreach: 500,
          firstBreachRegulation: "Art. 70",
          confidence: "High",
        }}
      />,
    );
    expect(container.textContent).toContain("Compliance Horizon");
  });
});
