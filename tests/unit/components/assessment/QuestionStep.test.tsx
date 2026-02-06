import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuestionStep from "@/components/assessment/QuestionStep";
import { Question } from "@/lib/questions";
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
      custom?: unknown;
      variants?: unknown;
      transition?: unknown;
    }) => (
      <div className={className} data-testid="motion-div">
        {children}
      </div>
    ),
  },
  AnimatePresence: ({
    children,
  }: {
    children: React.ReactNode;
    mode?: string;
    custom?: unknown;
  }) => <>{children}</>,
}));

// Mock OptionCard
vi.mock("@/components/assessment/OptionCard", () => ({
  default: ({
    label,
    description,
    icon,
    isSelected,
    onClick,
  }: {
    label: string;
    description: string;
    icon?: string;
    isSelected: boolean;
    onClick: () => void;
  }) => (
    <button
      data-testid={`option-${label}`}
      data-selected={isSelected}
      onClick={onClick}
    >
      {label} - {description}
    </button>
  ),
}));

const mockQuestion: Question = {
  id: "activityType",
  step: 1,
  title: "What is your primary space activity?",
  subtitle: "Select the category that best describes your main operations",
  options: [
    {
      id: "spacecraft",
      label: "Spacecraft Operation",
      description: "Design, manufacture, launch, or operate satellites",
      icon: "Satellite",
      value: "spacecraft",
    },
    {
      id: "launch_vehicle",
      label: "Launch Vehicle Services",
      description: "Operate launch vehicles to deploy space objects",
      icon: "Rocket",
      value: "launch_vehicle",
    },
    {
      id: "isos",
      label: "In-Space Services",
      description: "Refueling, repair, debris removal, or inspection",
      icon: "Wrench",
      value: "isos",
    },
  ],
};

describe("QuestionStep", () => {
  const defaultProps = {
    question: mockQuestion,
    questionNumber: 1,
    selectedValue: null,
    onSelect: vi.fn(),
    direction: 1,
  };

  it("renders the question title", () => {
    render(<QuestionStep {...defaultProps} />);
    expect(
      screen.getByText("What is your primary space activity?"),
    ).toBeInTheDocument();
  });

  it("renders the question subtitle", () => {
    render(<QuestionStep {...defaultProps} />);
    expect(
      screen.getByText(
        "Select the category that best describes your main operations",
      ),
    ).toBeInTheDocument();
  });

  it("renders the question number", () => {
    render(<QuestionStep {...defaultProps} questionNumber={3} />);
    expect(screen.getByText("Question 03")).toBeInTheDocument();
  });

  it("renders zero-padded question number", () => {
    render(<QuestionStep {...defaultProps} questionNumber={1} />);
    expect(screen.getByText("Question 01")).toBeInTheDocument();
  });

  it("renders all options as clickable cards", () => {
    render(<QuestionStep {...defaultProps} />);
    expect(
      screen.getByTestId("option-Spacecraft Operation"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("option-Launch Vehicle Services"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("option-In-Space Services")).toBeInTheDocument();
  });

  it("calls onSelect with correct value when option is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<QuestionStep {...defaultProps} onSelect={onSelect} />);

    await user.click(screen.getByTestId("option-Spacecraft Operation"));
    expect(onSelect).toHaveBeenCalledWith("spacecraft");
  });

  it("calls onSelect with correct value for second option", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<QuestionStep {...defaultProps} onSelect={onSelect} />);

    await user.click(screen.getByTestId("option-Launch Vehicle Services"));
    expect(onSelect).toHaveBeenCalledWith("launch_vehicle");
  });

  it("marks the selected option as selected", () => {
    render(<QuestionStep {...defaultProps} selectedValue="spacecraft" />);
    const option = screen.getByTestId("option-Spacecraft Operation");
    expect(option).toHaveAttribute("data-selected", "true");
  });

  it("marks non-selected options as not selected", () => {
    render(<QuestionStep {...defaultProps} selectedValue="spacecraft" />);
    const option = screen.getByTestId("option-Launch Vehicle Services");
    expect(option).toHaveAttribute("data-selected", "false");
  });

  it("does not render subtitle when not provided", () => {
    const questionNoSubtitle: Question = {
      ...mockQuestion,
      subtitle: undefined,
    };
    render(<QuestionStep {...defaultProps} question={questionNoSubtitle} />);
    expect(
      screen.queryByText(
        "Select the category that best describes your main operations",
      ),
    ).not.toBeInTheDocument();
  });

  it("handles boolean option values", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const booleanQuestion: Question = {
      id: "isDefenseOnly",
      step: 2,
      title: "Are your space assets used exclusively for defense?",
      options: [
        {
          id: "yes",
          label: "Yes",
          description: "All assets are military",
          value: true,
        },
        {
          id: "no",
          label: "No",
          description: "Assets are commercial",
          value: false,
        },
      ],
    };

    render(
      <QuestionStep
        {...defaultProps}
        question={booleanQuestion}
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByTestId("option-Yes"));
    expect(onSelect).toHaveBeenCalledWith(true);
  });

  it("handles numeric option values", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const numericQuestion: Question = {
      id: "constellationSize",
      step: 7,
      title: "How many satellites?",
      options: [
        {
          id: "small",
          label: "2-9 satellites",
          description: "Small constellation",
          value: 5,
        },
        {
          id: "mega",
          label: "1,000+ satellites",
          description: "Mega constellation",
          value: 1000,
        },
      ],
    };

    render(
      <QuestionStep
        {...defaultProps}
        question={numericQuestion}
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByTestId("option-1,000+ satellites"));
    expect(onSelect).toHaveBeenCalledWith(1000);
  });
});
