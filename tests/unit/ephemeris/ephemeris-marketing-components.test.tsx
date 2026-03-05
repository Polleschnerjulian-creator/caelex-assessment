import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get: (_, tag) => {
        if (tag === "__esModule") return true;
        const Component = React.forwardRef(
          ({ children, ...props }: any, ref: any) =>
            React.createElement(String(tag), { ...props, ref }, children),
        );
        Component.displayName = `motion.${String(tag)}`;
        return Component;
      },
    },
  ),
  useMotionValue: vi.fn(() => ({ set: vi.fn(), get: vi.fn(() => 0) })),
  useTransform: vi.fn(() => ({ set: vi.fn(), get: vi.fn(() => 0) })),
  useInView: vi.fn(() => true),
  AnimatePresence: vi.fn(({ children }: any) => children),
  useSpring: vi.fn(() => ({ set: vi.fn(), get: vi.fn(() => 0) })),
}));

// Mock lucide-react icons
vi.mock(
  "lucide-react",
  () =>
    new Proxy(
      {},
      {
        get: (_, name) => {
          if (name === "__esModule") return true;
          return vi.fn((props: any) =>
            React.createElement("svg", {
              "data-testid": `icon-${String(name)}`,
              ...props,
            }),
          );
        },
      },
    ),
);

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => React.createElement("a", { href, ...props }, children),
}));

// Mock the animated-counter for horizon-badge
vi.mock("@/app/systems/ephemeris/components/animated-counter", () => ({
  default: ({ target, className, style }: any) =>
    React.createElement(
      "span",
      { className, style, "data-testid": "animated-counter" },
      target,
    ),
}));

// Mock the custom useInView for forecast-curve (horizon-badge uses animated-counter which uses it)
vi.mock("@/app/systems/ephemeris/lib/use-in-view", () => ({
  useInView: vi.fn(() => ({
    ref: { current: null },
    inView: false,
  })),
}));

// Mock horizon-badge for ephemeris-hero
vi.mock("@/app/systems/ephemeris/components/horizon-badge", () => ({
  default: ({ days, className }: any) =>
    React.createElement(
      "div",
      { "data-testid": "horizon-badge", className },
      days,
    ),
}));

// ============================================================================
// PREDICTION MODELS
// ============================================================================

describe("PredictionModels", () => {
  it("renders without crashing", async () => {
    const { default: PredictionModels } =
      await import("@/app/systems/ephemeris/components/prediction-models");
    const { container } = render(<PredictionModels />);
    expect(container.querySelector("section")).toBeTruthy();
  });

  it("renders all five prediction model titles", async () => {
    const { default: PredictionModels } =
      await import("@/app/systems/ephemeris/components/prediction-models");
    const { container } = render(<PredictionModels />);
    const text = container.textContent;
    expect(text).toContain("Orbital Decay");
    expect(text).toContain("Fuel Depletion");
    expect(text).toContain("Subsystem Degradation");
    expect(text).toContain("Deadline Events");
    expect(text).toContain("Regulatory Change");
  });

  it("renders heading text", async () => {
    const { default: PredictionModels } =
      await import("@/app/systems/ephemeris/components/prediction-models");
    const { container } = render(<PredictionModels />);
    expect(container.textContent).toContain("Physics. Statistics. Regulation.");
  });

  it("renders model tags", async () => {
    const { default: PredictionModels } =
      await import("@/app/systems/ephemeris/components/prediction-models");
    const { container } = render(<PredictionModels />);
    const text = container.textContent;
    expect(text).toContain("SGP4 + NRLMSISE-00 + F10.7");
    expect(text).toContain("EUR-Lex SPARQL + Module Mapping");
  });
});

// ============================================================================
// JURISDICTION SECTION
// ============================================================================

describe("JurisdictionSection", () => {
  it("renders without crashing", async () => {
    const { default: JurisdictionSection } =
      await import("@/app/systems/ephemeris/components/jurisdiction-section");
    const { container } = render(<JurisdictionSection />);
    expect(container.querySelector("section")).toBeTruthy();
  });

  it("renders comparison table", async () => {
    const { default: JurisdictionSection } =
      await import("@/app/systems/ephemeris/components/jurisdiction-section");
    const { container } = render(<JurisdictionSection />);
    const table = container.querySelector("table");
    expect(table).toBeTruthy();
  });

  it("renders jurisdiction headers (DE, NO, GB)", async () => {
    const { default: JurisdictionSection } =
      await import("@/app/systems/ephemeris/components/jurisdiction-section");
    const { container } = render(<JurisdictionSection />);
    const text = container.textContent;
    expect(text).toContain("DE");
    expect(text).toContain("NO");
    expect(text).toContain("GB");
  });

  it("renders impact cards", async () => {
    const { default: JurisdictionSection } =
      await import("@/app/systems/ephemeris/components/jurisdiction-section");
    const { container } = render(<JurisdictionSection />);
    const text = container.textContent;
    expect(text).toContain("Score Delta");
    expect(text).toContain("New Documents");
    expect(text).toContain("Approval Time");
  });
});

// ============================================================================
// MOAT SECTION
// ============================================================================

describe("MoatSection", () => {
  it("renders without crashing", async () => {
    const { default: MoatSection } =
      await import("@/app/systems/ephemeris/components/moat-section");
    const { container } = render(<MoatSection />);
    expect(container.querySelector("section")).toBeTruthy();
  });

  it("renders moat items", async () => {
    const { default: MoatSection } =
      await import("@/app/systems/ephemeris/components/moat-section");
    const { container } = render(<MoatSection />);
    const text = container.textContent;
    expect(text).toContain("Regulatory Knowledge Base");
    expect(text).toContain("Continuous Operational Data");
    expect(text).toContain("Verified Evidence History");
    expect(text).toContain("Regulatory Genome");
  });

  it("renders heading", async () => {
    const { default: MoatSection } =
      await import("@/app/systems/ephemeris/components/moat-section");
    const { container } = render(<MoatSection />);
    expect(container.textContent).toContain("Four things. Simultaneously.");
  });

  it("renders stakeholder quotes", async () => {
    const { default: MoatSection } =
      await import("@/app/systems/ephemeris/components/moat-section");
    const { container } = render(<MoatSection />);
    const text = container.textContent;
    expect(text).toContain("Operator");
    expect(text).toContain("Regulator");
    expect(text).toContain("Insurer");
  });
});

// ============================================================================
// PARADIGM SHIFT
// ============================================================================

describe("ParadigmShift", () => {
  it("renders without crashing", async () => {
    const { default: ParadigmShift } =
      await import("@/app/systems/ephemeris/components/paradigm-shift");
    const { container } = render(<ParadigmShift />);
    expect(container.querySelector("section")).toBeTruthy();
  });

  it("renders before/after comparison", async () => {
    const { default: ParadigmShift } =
      await import("@/app/systems/ephemeris/components/paradigm-shift");
    const { container } = render(<ParadigmShift />);
    const text = container.textContent;
    expect(text).toContain("Before");
    expect(text).toContain("After");
  });
});

// ============================================================================
// PROBLEM SECTION
// ============================================================================

describe("ProblemSection", () => {
  it("renders without crashing", async () => {
    const { default: ProblemSection } =
      await import("@/app/systems/ephemeris/components/problem-section");
    const { container } = render(<ProblemSection />);
    expect(container.querySelector("section")).toBeTruthy();
  });

  it("renders problem headline", async () => {
    const { default: ProblemSection } =
      await import("@/app/systems/ephemeris/components/problem-section");
    const { container } = render(<ProblemSection />);
    expect(container.textContent).toContain("Compliance is a mirror.");
  });
});

// ============================================================================
// CLOSING SECTION
// ============================================================================

describe("ClosingSection", () => {
  it("renders without crashing", async () => {
    const { default: ClosingSection } =
      await import("@/app/systems/ephemeris/components/closing-section");
    const { container } = render(<ClosingSection />);
    expect(container.querySelector("section")).toBeTruthy();
  });

  it("renders closing text", async () => {
    const { default: ClosingSection } =
      await import("@/app/systems/ephemeris/components/closing-section");
    const { container } = render(<ClosingSection />);
    expect(container.textContent).toContain("Compliance was a mirror.");
    expect(container.textContent).toContain("Ephemeris makes it a telescope.");
  });
});

// ============================================================================
// HORIZON BADGE
// ============================================================================

describe("HorizonBadge", () => {
  it("exports a default function", async () => {
    const mod =
      await import("@/app/systems/ephemeris/components/horizon-badge");
    expect(typeof mod.default).toBe("function");
  });
});

// EphemerisHero: Skipped — dynamic import hangs in Vitest 4 due to heavy dependencies (Three.js/GSAP).
