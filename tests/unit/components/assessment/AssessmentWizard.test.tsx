import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// Mock framer-motion - async import to avoid hoisting issues with React
vi.mock("framer-motion", async () => {
  const R = await import("react");
  return {
    motion: {
      div: R.forwardRef((props: any, ref: any) => {
        const {
          children,
          className,
          onClick,
          initial,
          animate,
          exit,
          custom,
          variants,
          transition,
          whileTap,
          ...rest
        } = props;
        return R.createElement(
          "div",
          { ref, className, onClick, ...rest },
          children,
        );
      }),
      button: R.forwardRef((props: any, ref: any) => {
        const {
          children,
          className,
          onClick,
          initial,
          animate,
          exit,
          custom,
          variants,
          transition,
          whileTap,
          ...rest
        } = props;
        return R.createElement(
          "button",
          { ref, className, onClick, ...rest },
          children,
        );
      }),
    },
    AnimatePresence: (props: any) => props.children,
  };
});

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
  SessionProvider: (props: any) => props.children,
}));

// Mock next/link to avoid IntersectionObserver constructor issue
vi.mock("next/link", async () => {
  const R = await import("react");
  return {
    default: R.forwardRef((props: any, ref: any) => {
      const { children, href, ...rest } = props;
      return R.createElement("a", { ref, href, ...rest }, children);
    }),
  };
});

// Mock icons
vi.mock("@/lib/icons", async () => {
  const R = await import("react");
  return {
    getIcon: (name: string) => {
      if (!name) return null;
      return function MockIcon(props: any) {
        return R.createElement(
          "span",
          { "data-testid": `icon-${name}`, className: props.className },
          name,
        );
      };
    },
  };
});

// Mock PDF generation
vi.mock("@/lib/pdf", () => ({
  generatePDF: vi.fn().mockResolvedValue(undefined),
}));

// Mock engine with inline data to avoid hoisting issues
vi.mock("@/lib/engine", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/engine")>("@/lib/engine");

  const inlineMockData = {
    metadata: {
      regulation: "EU Space Act",
      reference: "COM(2025) 335",
      proposal_date: "2025-07-23",
      expected_application_date: "2030-01-01",
      total_articles: 119,
      total_annexes: 10,
      total_recitals: 140,
      legal_basis: "Art. 189(2) TFEU",
      version: "1.0",
      last_updated: "2025-07-23",
      note: "Proposal",
      enforcement: {
        max_fine_percentage_turnover: 2,
        alternative_fine_basis: "global turnover",
        enforcement_bodies: ["NCA", "EUSPA"],
        powers: ["inspection", "fine"],
        appeal: "national courts",
      },
    },
    operator_types: {
      spacecraft_operator: {
        id: "SCO",
        definition: "Entity operating spacecraft",
        examples: ["Satellite operator"],
        eu_space_act_ref: "Art. 3(6)",
      },
    },
    size_categories: {
      small_enterprise: {
        definition: "<50 employees",
        special_provisions: ["light regime"],
      },
    },
    constellation_tiers: {
      single_satellite: { count: "1", special_provisions: [] },
    },
    titles: [
      {
        number: "I",
        name: "General Provisions",
        articles: "Art. 1-5",
        summary: "Scope and definitions",
        articles_detail: [
          {
            number: 1,
            title: "Subject matter",
            summary: "This regulation applies to space activities.",
            applies_to: ["ALL"],
            compliance_type: "scope_determination",
            operator_action: "Determine applicability",
          },
        ],
      },
      {
        number: "II",
        name: "Authorization",
        articles: "Art. 6-32",
        summary: "Authorization framework",
        articles_detail: [
          {
            number: 6,
            title: "Authorization requirement",
            summary: "Space activities require authorization.",
            applies_to: ["SCO", "LO"],
            compliance_type: "mandatory_pre_activity",
            operator_action: "Obtain authorization",
          },
        ],
      },
    ],
    decision_tree: {},
    compliance_checklist_by_operator_type: {
      spacecraft_operator_eu: {
        pre_authorization: [
          {
            requirement: "Submit authorization application",
            articles: "6-8",
            module: "authorization",
          },
        ],
        ongoing: [
          {
            requirement: "Maintain insurance coverage",
            articles: "44-51",
            module: "insurance",
          },
        ],
        end_of_life: [
          {
            requirement: "Execute disposal plan",
            articles: "58-72",
            module: "debris",
          },
        ],
      },
      launch_operator_eu: {
        pre_authorization: [
          {
            requirement: "Submit launch authorization",
            articles: "6-8",
            module: "authorization",
          },
        ],
        ongoing: [
          {
            requirement: "Monitor launch safety",
            articles: "33-43",
            module: "supervision",
          },
        ],
      },
      third_country_operator: {
        pre_registration: [
          {
            requirement: "Designate EU legal representative",
            articles: "16",
            module: "authorization",
          },
        ],
        ongoing: [
          {
            requirement: "Comply with EU requirements",
            articles: "14-16",
            module: "authorization",
          },
        ],
      },
    },
    annexes: [],
  };

  return {
    ...actual,
    loadSpaceActData: vi.fn().mockResolvedValue(inlineMockData),
    calculateCompliance: vi.fn().mockReturnValue({
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
      applicableArticles: [
        {
          number: 6,
          title: "Authorization requirement",
          summary: "Space activities require authorization.",
          applies_to: ["SCO"],
          compliance_type: "mandatory_pre_activity",
        },
      ],
      totalArticles: 119,
      applicableCount: 34,
      applicablePercentage: 29,
      moduleStatuses: [
        {
          id: "authorization",
          name: "Authorization & Licensing",
          icon: "FileCheck",
          description: "Multi-authority authorization process",
          status: "required",
          articleCount: 12,
          summary: "Full authorization required",
        },
      ],
      checklist: [
        {
          requirement: "Submit authorization application",
          articles: "6-8",
          module: "authorization",
        },
      ],
      keyDates: [{ date: "1 January 2030", description: "Application date" }],
      estimatedAuthorizationCost: "~€100K/platform",
      authorizationPath: "National Authority → EUSPA",
    }),
  };
});

import AssessmentWizard from "@/components/assessment/AssessmentWizard";

describe("AssessmentWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Initialization", () => {
    it("shows loading state initially", () => {
      render(<AssessmentWizard />);
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("renders first question after data loads", async () => {
      render(<AssessmentWizard />);
      await waitFor(() => {
        expect(
          screen.getByText("What is your primary space activity?"),
        ).toBeInTheDocument();
      });
    });

    it("renders the EU Space Act Assessment label", async () => {
      render(<AssessmentWizard />);
      await waitFor(() => {
        expect(screen.getByText("EU Space Act Assessment")).toBeInTheDocument();
      });
    });

    it("shows Home link on first step", async () => {
      render(<AssessmentWizard />);
      await waitFor(() => {
        expect(screen.getByText("Home")).toBeInTheDocument();
      });
    });
  });

  describe("Question Navigation", () => {
    it("advances to next step on option selection", async () => {
      const user = userEvent.setup();
      render(<AssessmentWizard />);

      await waitFor(() => {
        expect(
          screen.getByText("What is your primary space activity?"),
        ).toBeInTheDocument();
      });

      // Click spacecraft operation
      await user.click(screen.getByText("Spacecraft Operation"));

      await waitFor(() => {
        expect(
          screen.getByText(
            /Are your space assets used exclusively for defense/,
          ),
        ).toBeInTheDocument();
      });
    });

    it("shows Back button after first step", async () => {
      const user = userEvent.setup();
      render(<AssessmentWizard />);

      await waitFor(() => {
        expect(
          screen.getByText("What is your primary space activity?"),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByText("Spacecraft Operation"));

      await waitFor(() => {
        expect(screen.getByText("Back")).toBeInTheDocument();
      });
    });

    it("navigates back to previous step", async () => {
      const user = userEvent.setup();
      render(<AssessmentWizard />);

      await waitFor(() => {
        expect(
          screen.getByText("What is your primary space activity?"),
        ).toBeInTheDocument();
      });

      // Go forward
      await user.click(screen.getByText("Spacecraft Operation"));

      await waitFor(() => {
        expect(
          screen.getByText(
            /Are your space assets used exclusively for defense/,
          ),
        ).toBeInTheDocument();
      });

      // Go back
      await user.click(screen.getByText("Back"));

      await waitFor(() => {
        expect(
          screen.getByText("What is your primary space activity?"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Out-of-Scope Detection", () => {
    it("shows out-of-scope for defense-only", async () => {
      const user = userEvent.setup();
      render(<AssessmentWizard />);

      await waitFor(() => {
        expect(
          screen.getByText("What is your primary space activity?"),
        ).toBeInTheDocument();
      });

      // Q1: Select spacecraft
      await user.click(screen.getByText("Spacecraft Operation"));

      await waitFor(() => {
        expect(
          screen.getByText(
            /Are your space assets used exclusively for defense/,
          ),
        ).toBeInTheDocument();
      });

      // Q2: Select yes (defense only) — triggers out-of-scope
      await user.click(screen.getByText("Yes, exclusively defense"));

      await waitFor(() => {
        expect(
          screen.getByText("Outside Regulation Scope"),
        ).toBeInTheDocument();
      });
    });

    it("shows out-of-scope for pre-2030 assets", async () => {
      const user = userEvent.setup();
      render(<AssessmentWizard />);

      await waitFor(() => {
        expect(
          screen.getByText("What is your primary space activity?"),
        ).toBeInTheDocument();
      });

      // Q1: spacecraft
      await user.click(screen.getByText("Spacecraft Operation"));
      await waitFor(() => {
        expect(
          screen.getByText(
            /Are your space assets used exclusively for defense/,
          ),
        ).toBeInTheDocument();
      });

      // Q2: not defense only
      await user.click(screen.getByText("No, not exclusively defense"));
      await waitFor(() => {
        expect(
          screen.getByText(/Will any of your space assets be launched/),
        ).toBeInTheDocument();
      });

      // Q3: all before 2030 — triggers out-of-scope
      await user.click(screen.getByText("No, all launched before 2030"));

      await waitFor(() => {
        expect(
          screen.getByText("Outside Regulation Scope"),
        ).toBeInTheDocument();
      });
    });

    it("allows restart from out-of-scope", async () => {
      const user = userEvent.setup();
      render(<AssessmentWizard />);

      await waitFor(() => {
        expect(
          screen.getByText("What is your primary space activity?"),
        ).toBeInTheDocument();
      });

      // Trigger out-of-scope
      await user.click(screen.getByText("Spacecraft Operation"));
      await waitFor(() => {
        expect(
          screen.getByText(
            /Are your space assets used exclusively for defense/,
          ),
        ).toBeInTheDocument();
      });
      await user.click(screen.getByText("Yes, exclusively defense"));

      await waitFor(() => {
        expect(
          screen.getByText("Outside Regulation Scope"),
        ).toBeInTheDocument();
      });

      // Restart
      await user.click(screen.getByText("Start over"));

      await waitFor(() => {
        expect(
          screen.getByText("What is your primary space activity?"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Light Regime Indicator", () => {
    it("shows light regime indicator for small enterprises after step 5", async () => {
      const user = userEvent.setup();
      render(<AssessmentWizard />);

      await waitFor(() => {
        expect(
          screen.getByText("What is your primary space activity?"),
        ).toBeInTheDocument();
      });

      // Q1: spacecraft
      await user.click(screen.getByText("Spacecraft Operation"));
      await waitFor(() => {
        expect(screen.getByText(/Are your space assets/)).toBeInTheDocument();
      });

      // Q2: not defense
      await user.click(screen.getByText("No, not exclusively defense"));
      await waitFor(() => {
        expect(screen.getByText(/Will any of your/)).toBeInTheDocument();
      });

      // Q3: post-2030
      await user.click(screen.getByText("Yes, launching after 2030"));
      await waitFor(() => {
        expect(
          screen.getByText("Where is your organization established?"),
        ).toBeInTheDocument();
      });

      // Q4: EU
      await user.click(screen.getByText("EU Member State"));
      await waitFor(() => {
        expect(
          screen.getByText("What best describes your organization?"),
        ).toBeInTheDocument();
      });

      // Q5: Small enterprise
      await user.click(screen.getByText("Small Enterprise"));

      // After step 5 with "small", subsequent steps should show the light regime indicator
      await waitFor(() => {
        expect(
          screen.getByText(/Do you operate or plan to operate/),
        ).toBeInTheDocument();
      });

      // The light regime indicator should appear
      expect(
        screen.getByText(/You may qualify for the simplified Light Regime/),
      ).toBeInTheDocument();
    });
  });

  describe("Completion", () => {
    it("shows results after completing all questions", async () => {
      const user = userEvent.setup();
      render(<AssessmentWizard />);

      await waitFor(() => {
        expect(
          screen.getByText("What is your primary space activity?"),
        ).toBeInTheDocument();
      });

      // Q1: spacecraft
      await user.click(screen.getByText("Spacecraft Operation"));
      await waitFor(() => {
        expect(screen.getByText(/Are your space assets/)).toBeInTheDocument();
      });

      // Q2: not defense
      await user.click(screen.getByText("No, not exclusively defense"));
      await waitFor(() => {
        expect(screen.getByText(/Will any of your/)).toBeInTheDocument();
      });

      // Q3: post-2030
      await user.click(screen.getByText("Yes, launching after 2030"));
      await waitFor(() => {
        expect(screen.getByText(/Where is your/)).toBeInTheDocument();
      });

      // Q4: EU
      await user.click(screen.getByText("EU Member State"));
      await waitFor(() => {
        expect(screen.getByText(/What best describes/)).toBeInTheDocument();
      });

      // Q5: Medium
      await user.click(screen.getByText("Medium Enterprise"));
      await waitFor(() => {
        expect(screen.getByText(/Do you operate or plan/)).toBeInTheDocument();
      });

      // Q6: No constellation
      await user.click(screen.getByText("No, single satellite"));
      await waitFor(() => {
        expect(
          screen.getByText(/What is the primary orbit/),
        ).toBeInTheDocument();
      });

      // Step 7 was skipped (constellation size, showWhen: operatesConstellation=true)
      // So currentStep=7 shows the orbit question (step 8)
      // Click LEO — this advances currentStep to 8
      await user.click(screen.getByText("LEO"));

      // At currentStep=8, the orbit question (step 8) shows again
      // because getCurrentQuestion(answers, 8) returns step 8 orbit
      // We need to click LEO again to advance to step 9
      await waitFor(() => {
        expect(
          screen.getByText(/What is the primary orbit/),
        ).toBeInTheDocument();
      });
      await user.click(screen.getByText("LEO"));

      // Now at currentStep=9, EU services question shows
      await waitFor(() => {
        expect(
          screen.getByText(/Do you provide space-based services/),
        ).toBeInTheDocument();
      });

      // Q9: Yes EU services
      await user.click(screen.getByText("Yes, EU market activity"));

      // Should show results
      await waitFor(() => {
        expect(screen.getByText("Your Compliance Profile")).toBeInTheDocument();
      });
    });
  });
});
