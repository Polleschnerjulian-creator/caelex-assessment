import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChecklistPreview from "@/components/results/ChecklistPreview";
import { ChecklistItem } from "@/lib/types";
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

const createMockChecklist = (count: number = 8): ChecklistItem[] => {
  const items: ChecklistItem[] = [
    {
      requirement: "Submit authorization application to national authority",
      articles: "6-8",
      module: "authorization",
    },
    {
      requirement: "Prepare Environmental Footprint Declaration",
      articles: "96-100",
      module: "environmental",
    },
    {
      requirement: "Implement cybersecurity risk assessment",
      articles: "74-80",
      module: "cybersecurity",
    },
    {
      requirement: "Establish debris mitigation plan",
      articles: "58-65",
      module: "debris",
    },
    {
      requirement: "Obtain third-party liability insurance",
      articles: "44-51",
      module: "insurance",
    },
    {
      requirement: "Register with EUSPA Union Register",
      articles: "24",
      module: "registration",
    },
    {
      requirement: "Set up incident reporting procedures",
      articles: "40-43",
      module: "supervision",
    },
    {
      requirement: "Prepare end-of-life disposal plan",
      articles: "72",
      module: "debris",
    },
  ];
  return items.slice(0, count);
};

describe("ChecklistPreview", () => {
  const defaultProps = {
    checklist: createMockChecklist(),
    onDownloadClick: vi.fn(),
  };

  it("renders the section header", () => {
    render(<ChecklistPreview {...defaultProps} />);
    expect(screen.getByText("Your Next Steps")).toBeInTheDocument();
  });

  it("renders first 5 items only", () => {
    render(<ChecklistPreview {...defaultProps} />);
    expect(
      screen.getByText(
        "Submit authorization application to national authority",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Prepare Environmental Footprint Declaration"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Implement cybersecurity risk assessment"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Establish debris mitigation plan"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Obtain third-party liability insurance"),
    ).toBeInTheDocument();

    // 6th item should NOT be visible
    expect(
      screen.queryByText("Register with EUSPA Union Register"),
    ).not.toBeInTheDocument();
  });

  it("displays top 5 of N label", () => {
    render(<ChecklistPreview {...defaultProps} />);
    expect(screen.getByText("Top 5 of 8 action items")).toBeInTheDocument();
  });

  it("displays article references", () => {
    render(<ChecklistPreview {...defaultProps} />);
    expect(screen.getByText("Art. 6-8")).toBeInTheDocument();
    expect(screen.getByText("Art. 96-100")).toBeInTheDocument();
  });

  it("displays module names formatted", () => {
    render(<ChecklistPreview {...defaultProps} />);
    expect(screen.getByText("authorization")).toBeInTheDocument();
    expect(screen.getByText("environmental")).toBeInTheDocument();
  });

  it("shows total action items count in footer", () => {
    render(<ChecklistPreview {...defaultProps} />);
    expect(screen.getByText("8 action items")).toBeInTheDocument();
  });

  it("renders download button", () => {
    render(<ChecklistPreview {...defaultProps} />);
    expect(screen.getByText("Download PDF Report")).toBeInTheDocument();
  });

  it("calls onDownloadClick when download button is clicked", async () => {
    const user = userEvent.setup();
    const onDownloadClick = vi.fn();
    render(
      <ChecklistPreview
        checklist={createMockChecklist()}
        onDownloadClick={onDownloadClick}
      />,
    );

    await user.click(screen.getByText("Download PDF Report"));
    expect(onDownloadClick).toHaveBeenCalledTimes(1);
  });

  it("handles exactly 5 items without remaining message", () => {
    render(
      <ChecklistPreview
        checklist={createMockChecklist(5)}
        onDownloadClick={vi.fn()}
      />,
    );
    expect(screen.getByText("Top 5 of 5 action items")).toBeInTheDocument();
    // No "remaining" indicator since 5 items shown out of 5
    expect(screen.queryByText(/action items across/)).not.toBeInTheDocument();
  });

  it("handles fewer than 5 items", () => {
    render(
      <ChecklistPreview
        checklist={createMockChecklist(3)}
        onDownloadClick={vi.fn()}
      />,
    );
    expect(screen.getByText("Top 5 of 3 action items")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Submit authorization application to national authority",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Prepare Environmental Footprint Declaration"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Implement cybersecurity risk assessment"),
    ).toBeInTheDocument();
  });

  it("handles empty checklist", () => {
    render(<ChecklistPreview checklist={[]} onDownloadClick={vi.fn()} />);
    expect(screen.getByText("Top 5 of 0 action items")).toBeInTheDocument();
  });
});
