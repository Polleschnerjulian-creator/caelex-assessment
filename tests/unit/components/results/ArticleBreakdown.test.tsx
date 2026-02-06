import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ArticleBreakdown from "@/components/results/ArticleBreakdown";
import { Article } from "@/lib/types";
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
  AnimatePresence: ({
    children,
  }: {
    children: React.ReactNode;
    mode?: string;
  }) => <>{children}</>,
}));

const createMockArticles = (count: number = 8): Article[] => {
  const articles: Article[] = [
    {
      number: 6,
      title: "Authorization requirement",
      summary: "Space activities in the Union shall require authorization.",
      applies_to: ["SCO", "LO"],
      compliance_type: "mandatory_pre_activity",
      operator_action: "Obtain authorization",
    },
    {
      number: 7,
      title: "Authorization application",
      summary: "Operators shall submit applications to national authorities.",
      applies_to: ["SCO"],
      compliance_type: "mandatory_pre_activity",
      operator_action: "Submit application",
    },
    {
      number: 33,
      title: "Supervision framework",
      summary: "National authorities shall supervise authorized activities.",
      applies_to: ["ALL"],
      compliance_type: "mandatory_ongoing",
      operator_action: "Cooperate with supervisors",
    },
    {
      number: 58,
      title: "Debris mitigation",
      summary: "Operators shall implement debris mitigation measures.",
      applies_to: ["SCO"],
      compliance_type: "design_requirement",
      operator_action: "Implement debris plan",
    },
    {
      number: 10,
      title: "Light regime",
      summary: "Simplified requirements for small enterprises.",
      applies_to: ["SCO"],
      compliance_type: "conditional_simplification",
      operator_action: "Apply for simplified regime",
    },
    {
      number: 105,
      title: "Delegated acts",
      summary: "Commission may adopt delegated acts.",
      applies_to: ["ALL"],
      compliance_type: "informational",
      operator_action: "none",
    },
    {
      number: 74,
      title: "Cybersecurity requirements",
      summary: "Operators shall implement cybersecurity measures.",
      applies_to: ["SCO"],
      compliance_type: "mandatory_ongoing",
      operator_action: "Implement NIS2 compliance",
    },
    {
      number: 96,
      title: "Environmental footprint",
      summary: "Environmental Footprint Declaration required.",
      applies_to: ["SCO"],
      compliance_type: "design_requirement",
      operator_action: "Prepare EFD",
    },
  ];
  return articles.slice(0, count);
};

describe("ArticleBreakdown", () => {
  it("renders the section header", () => {
    render(<ArticleBreakdown articles={createMockArticles()} />);
    expect(screen.getByText("Applicable Articles")).toBeInTheDocument();
  });

  it("renders article count", () => {
    render(<ArticleBreakdown articles={createMockArticles()} />);
    expect(screen.getByText("8 articles")).toBeInTheDocument();
  });

  it("renders category summary badges", () => {
    render(<ArticleBreakdown articles={createMockArticles()} />);
    expect(screen.getByText(/Pre-Activity: 2/)).toBeInTheDocument();
    expect(screen.getByText(/Ongoing: 2/)).toBeInTheDocument();
    expect(screen.getByText(/Technical: 2/)).toBeInTheDocument();
    expect(screen.getByText(/Conditional: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Info: 1/)).toBeInTheDocument();
  });

  it("renders first 5 articles when collapsed", () => {
    render(<ArticleBreakdown articles={createMockArticles()} />);
    expect(screen.getByText("Authorization requirement")).toBeInTheDocument();
    expect(screen.getByText("Authorization application")).toBeInTheDocument();
    expect(screen.getByText("Supervision framework")).toBeInTheDocument();
    expect(screen.getByText("Debris mitigation")).toBeInTheDocument();
    expect(screen.getByText("Light regime")).toBeInTheDocument();

    // 6th article should NOT be visible
    expect(screen.queryByText("Delegated acts")).not.toBeInTheDocument();
  });

  it("renders article numbers with Art. prefix", () => {
    render(<ArticleBreakdown articles={createMockArticles()} />);
    expect(screen.getByText("Art. 6")).toBeInTheDocument();
    expect(screen.getByText("Art. 7")).toBeInTheDocument();
  });

  it("renders article summaries", () => {
    render(<ArticleBreakdown articles={createMockArticles()} />);
    expect(
      screen.getByText(
        "Space activities in the Union shall require authorization.",
      ),
    ).toBeInTheDocument();
  });

  it("renders operator actions", () => {
    render(<ArticleBreakdown articles={createMockArticles()} />);
    expect(
      screen.getByText("Action: Obtain authorization"),
    ).toBeInTheDocument();
  });

  it("does not render action when it is 'none'", () => {
    render(<ArticleBreakdown articles={createMockArticles()} />);
    // "Delegated acts" article has operator_action: "none" but it's not visible in collapsed view
    // Expand first, then check
    expect(screen.queryByText("Action: none")).not.toBeInTheDocument();
  });

  it("shows expand button when more than 5 articles", () => {
    render(<ArticleBreakdown articles={createMockArticles()} />);
    expect(screen.getByText("Show all 8 articles")).toBeInTheDocument();
  });

  it("expands to show all articles when clicked", async () => {
    const user = userEvent.setup();
    render(<ArticleBreakdown articles={createMockArticles()} />);

    await user.click(screen.getByText("Show all 8 articles"));

    // All 8 articles should now be visible
    expect(screen.getByText("Delegated acts")).toBeInTheDocument();
    expect(screen.getByText("Cybersecurity requirements")).toBeInTheDocument();
    expect(screen.getByText("Environmental footprint")).toBeInTheDocument();
  });

  it("shows collapse button after expanding", async () => {
    const user = userEvent.setup();
    render(<ArticleBreakdown articles={createMockArticles()} />);

    await user.click(screen.getByText("Show all 8 articles"));

    expect(screen.getByText("Show less")).toBeInTheDocument();
  });

  it("collapses back to 5 articles", async () => {
    const user = userEvent.setup();
    render(<ArticleBreakdown articles={createMockArticles()} />);

    await user.click(screen.getByText("Show all 8 articles"));
    expect(screen.getByText("Delegated acts")).toBeInTheDocument();

    await user.click(screen.getByText("Show less"));
    expect(screen.queryByText("Delegated acts")).not.toBeInTheDocument();
  });

  it("does not show expand button for 5 or fewer articles", () => {
    render(<ArticleBreakdown articles={createMockArticles(5)} />);
    expect(screen.queryByText(/Show all/)).not.toBeInTheDocument();
  });

  it("renders EUR-Lex link", () => {
    render(<ArticleBreakdown articles={createMockArticles()} />);
    const link = screen.getByText("View full regulation on EUR-Lex");
    expect(link.closest("a")).toHaveAttribute(
      "href",
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=COM:2025:335:FIN",
    );
  });

  it("handles empty articles array", () => {
    render(<ArticleBreakdown articles={[]} />);
    expect(screen.getByText("0 articles")).toBeInTheDocument();
  });
});
