import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResultsDashboard from "@/components/results/ResultsDashboard";
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
      exit?: unknown;
      transition?: unknown;
    }) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
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

// Mock PDF generation
vi.mock("@/lib/pdf", () => ({
  generatePDF: vi.fn().mockResolvedValue(undefined),
}));

// Mock sub-components to isolate testing
vi.mock("@/components/results/ComplianceProfile", () => ({
  default: () => <div data-testid="compliance-profile">ComplianceProfile</div>,
}));

vi.mock("@/components/results/ModuleCards", () => ({
  default: () => <div data-testid="module-cards">ModuleCards</div>,
}));

vi.mock("@/components/results/ChecklistPreview", () => ({
  default: ({
    onDownloadClick,
  }: {
    onDownloadClick: () => void;
    checklist: unknown[];
  }) => (
    <div data-testid="checklist-preview">
      <button onClick={onDownloadClick} data-testid="download-trigger">
        Download PDF Report
      </button>
    </div>
  ),
}));

vi.mock("@/components/results/ArticleBreakdown", () => ({
  default: () => <div data-testid="article-breakdown">ArticleBreakdown</div>,
}));

vi.mock("@/components/results/EmailGate", () => ({
  default: ({
    isOpen,
    onClose,
    onSubmit,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (
      email: string,
      company?: string,
      role?: string,
      subscribe?: boolean,
    ) => void;
  }) =>
    isOpen ? (
      <div data-testid="email-gate">
        <button
          onClick={() => onSubmit("test@test.com")}
          data-testid="email-submit"
        >
          Submit Email
        </button>
        <button onClick={onClose} data-testid="email-close">
          Close
        </button>
      </div>
    ) : null,
}));

vi.mock("@/components/assessment/SaveToDashboardCTA", () => ({
  default: () => <div data-testid="save-to-dashboard">SaveToDashboardCTA</div>,
}));

const createMockResult = (): ComplianceResult => ({
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
});

describe("ResultsDashboard", () => {
  const defaultProps = {
    result: createMockResult(),
    onRestart: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the results title", () => {
    render(<ResultsDashboard {...defaultProps} />);
    expect(screen.getByText("Your Compliance Profile")).toBeInTheDocument();
  });

  it("renders the assessment complete label", () => {
    render(<ResultsDashboard {...defaultProps} />);
    expect(screen.getByText("Assessment Complete")).toBeInTheDocument();
  });

  it("renders the description", () => {
    render(<ResultsDashboard {...defaultProps} />);
    expect(
      screen.getByText(/Based on your answers, here's how/),
    ).toBeInTheDocument();
  });

  it("renders the Home link", () => {
    render(<ResultsDashboard {...defaultProps} />);
    const homeLink = screen.getByText("Home");
    expect(homeLink.closest("a")).toHaveAttribute("href", "/");
  });

  it("renders the Start over button", () => {
    render(<ResultsDashboard {...defaultProps} />);
    expect(screen.getByText("Start over")).toBeInTheDocument();
  });

  it("calls onRestart when Start over is clicked", async () => {
    const user = userEvent.setup();
    const onRestart = vi.fn();
    render(
      <ResultsDashboard result={createMockResult()} onRestart={onRestart} />,
    );

    await user.click(screen.getByText("Start over"));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it("renders ComplianceProfile component", () => {
    render(<ResultsDashboard {...defaultProps} />);
    expect(screen.getByTestId("compliance-profile")).toBeInTheDocument();
  });

  it("renders ModuleCards component", () => {
    render(<ResultsDashboard {...defaultProps} />);
    expect(screen.getByTestId("module-cards")).toBeInTheDocument();
  });

  it("renders ChecklistPreview component", () => {
    render(<ResultsDashboard {...defaultProps} />);
    expect(screen.getByTestId("checklist-preview")).toBeInTheDocument();
  });

  it("renders ArticleBreakdown component", () => {
    render(<ResultsDashboard {...defaultProps} />);
    expect(screen.getByTestId("article-breakdown")).toBeInTheDocument();
  });

  it("renders SaveToDashboardCTA component", () => {
    render(<ResultsDashboard {...defaultProps} />);
    expect(screen.getByTestId("save-to-dashboard")).toBeInTheDocument();
  });

  it("opens EmailGate when download is clicked", async () => {
    const user = userEvent.setup();
    render(<ResultsDashboard {...defaultProps} />);

    // Initially, email gate should not be visible
    expect(screen.queryByTestId("email-gate")).not.toBeInTheDocument();

    // Click download in checklist preview
    await user.click(screen.getByTestId("download-trigger"));

    // Email gate should now be visible
    expect(screen.getByTestId("email-gate")).toBeInTheDocument();
  });

  it("closes EmailGate when close is clicked", async () => {
    const user = userEvent.setup();
    render(<ResultsDashboard {...defaultProps} />);

    // Open email gate
    await user.click(screen.getByTestId("download-trigger"));
    expect(screen.getByTestId("email-gate")).toBeInTheDocument();

    // Close email gate
    await user.click(screen.getByTestId("email-close"));
    expect(screen.queryByTestId("email-gate")).not.toBeInTheDocument();
  });

  it("triggers PDF generation on email submit", async () => {
    const user = userEvent.setup();
    const { generatePDF } = await import("@/lib/pdf");
    render(<ResultsDashboard {...defaultProps} />);

    // Open email gate
    await user.click(screen.getByTestId("download-trigger"));

    // Submit email
    await user.click(screen.getByTestId("email-submit"));

    // PDF should be generated
    await vi.waitFor(() => {
      expect(generatePDF).toHaveBeenCalled();
    });
  });

  it("renders the disclaimer text", () => {
    render(<ResultsDashboard {...defaultProps} />);
    expect(
      screen.getByText(/This assessment is based on the EU Space Act/),
    ).toBeInTheDocument();
  });

  it("renders the help CTA section", () => {
    render(<ResultsDashboard {...defaultProps} />);
    expect(screen.getByText("Need help with compliance?")).toBeInTheDocument();
  });

  it("renders Get the Full Report button in CTA", () => {
    render(<ResultsDashboard {...defaultProps} />);
    expect(screen.getByText("Get the Full Report")).toBeInTheDocument();
  });
});
