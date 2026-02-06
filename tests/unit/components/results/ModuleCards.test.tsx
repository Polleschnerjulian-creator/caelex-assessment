import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ModuleCards from "@/components/results/ModuleCards";
import { ModuleStatus } from "@/lib/types";
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
      variants?: unknown;
    }) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

// Mock icons
vi.mock("@/lib/icons", () => ({
  getIcon: (name: string) => {
    if (!name) return null;
    return function MockIcon({ className }: { className?: string }) {
      return (
        <span data-testid={`icon-${name}`} className={className}>
          {name}
        </span>
      );
    };
  },
}));

const createMockModules = (): ModuleStatus[] => [
  {
    id: "authorization",
    name: "Authorization & Licensing",
    icon: "FileCheck",
    description: "Multi-authority authorization process",
    status: "required",
    articleCount: 12,
    summary: "Full authorization required before operations",
  },
  {
    id: "environmental",
    name: "Environmental Footprint",
    icon: "Leaf",
    description: "Environmental Footprint Declaration",
    status: "simplified",
    articleCount: 5,
    summary: "Simplified EFD with delayed deadline",
  },
  {
    id: "cybersecurity",
    name: "Cybersecurity",
    icon: "Shield",
    description: "NIS2-compliant risk analysis",
    status: "recommended",
    articleCount: 8,
    summary: "Recommended cybersecurity measures",
  },
  {
    id: "insurance",
    name: "Insurance & Liability",
    icon: "Shield",
    description: "Third-party liability insurance",
    status: "not_applicable",
    articleCount: 0,
    summary: "Not applicable for this operator type",
  },
];

describe("ModuleCards", () => {
  it("renders the section header", () => {
    render(<ModuleCards modules={createMockModules()} />);
    expect(screen.getByText("Compliance Modules")).toBeInTheDocument();
  });

  it("renders the module count", () => {
    render(<ModuleCards modules={createMockModules()} />);
    expect(screen.getByText("4 modules analyzed")).toBeInTheDocument();
  });

  it("renders all module names", () => {
    render(<ModuleCards modules={createMockModules()} />);
    expect(screen.getByText("Authorization & Licensing")).toBeInTheDocument();
    expect(screen.getByText("Environmental Footprint")).toBeInTheDocument();
    expect(screen.getByText("Cybersecurity")).toBeInTheDocument();
    expect(screen.getByText("Insurance & Liability")).toBeInTheDocument();
  });

  it("renders status badges for each module", () => {
    render(<ModuleCards modules={createMockModules()} />);
    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(screen.getByText("Simplified")).toBeInTheDocument();
    expect(screen.getByText("Recommended")).toBeInTheDocument();
    expect(screen.getByText("Not Applicable")).toBeInTheDocument();
  });

  it("renders module descriptions", () => {
    render(<ModuleCards modules={createMockModules()} />);
    expect(
      screen.getByText("Multi-authority authorization process"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Environmental Footprint Declaration"),
    ).toBeInTheDocument();
  });

  it("renders article counts", () => {
    render(<ModuleCards modules={createMockModules()} />);
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders summary for applicable modules", () => {
    render(<ModuleCards modules={createMockModules()} />);
    expect(
      screen.getByText("Full authorization required before operations"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Simplified EFD with delayed deadline"),
    ).toBeInTheDocument();
  });

  it("does not render summary for not_applicable modules", () => {
    render(<ModuleCards modules={createMockModules()} />);
    expect(
      screen.queryByText("Not applicable for this operator type"),
    ).not.toBeInTheDocument();
  });

  it("renders module icons", () => {
    render(<ModuleCards modules={createMockModules()} />);
    expect(screen.getByTestId("icon-FileCheck")).toBeInTheDocument();
    expect(screen.getByTestId("icon-Leaf")).toBeInTheDocument();
  });

  it("renders Relevant articles label for each module", () => {
    render(<ModuleCards modules={createMockModules()} />);
    const labels = screen.getAllByText("Relevant articles");
    expect(labels.length).toBe(4);
  });

  it("handles empty modules array", () => {
    render(<ModuleCards modules={[]} />);
    expect(screen.getByText("0 modules analyzed")).toBeInTheDocument();
  });

  it("handles single module", () => {
    render(<ModuleCards modules={[createMockModules()[0]]} />);
    expect(screen.getByText("1 modules analyzed")).toBeInTheDocument();
    expect(screen.getByText("Authorization & Licensing")).toBeInTheDocument();
  });
});
