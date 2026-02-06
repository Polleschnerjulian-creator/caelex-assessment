import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// Mock framer-motion - must not reference React directly in factory (hoisted)
vi.mock("framer-motion", async () => {
  const R = await import("react");
  return {
    motion: {
      button: R.forwardRef((props: any, ref: any) => {
        const { children, className, onClick, whileTap, ...rest } = props;
        return R.createElement(
          "button",
          { ref, className, onClick, ...rest },
          children,
        );
      }),
      div: (props: any) => {
        const { children, className, initial, animate, ...rest } = props;
        return R.createElement("div", { className, ...rest }, children);
      },
    },
    AnimatePresence: (props: any) => props.children,
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

import OptionCard from "@/components/assessment/OptionCard";

describe("OptionCard", () => {
  const defaultProps = {
    label: "Spacecraft Operation",
    description: "Design, manufacture, launch, or operate satellites",
    onClick: vi.fn(),
  };

  it("renders the label text", () => {
    render(<OptionCard {...defaultProps} />);
    expect(screen.getByText("Spacecraft Operation")).toBeInTheDocument();
  });

  it("renders the description text", () => {
    render(<OptionCard {...defaultProps} />);
    expect(
      screen.getByText("Design, manufacture, launch, or operate satellites"),
    ).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<OptionCard {...defaultProps} onClick={onClick} />);

    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders icon when provided", () => {
    render(<OptionCard {...defaultProps} icon="Satellite" />);
    expect(screen.getByTestId("icon-Satellite")).toBeInTheDocument();
  });

  it("does not render icon when not provided", () => {
    render(<OptionCard {...defaultProps} />);
    expect(screen.queryByTestId(/icon-/)).not.toBeInTheDocument();
  });

  it("applies selected styling when isSelected is true", () => {
    const { container } = render(
      <OptionCard {...defaultProps} isSelected={true} />,
    );
    const button = container.querySelector("button");
    expect(button?.className).toContain("bg-white/[0.08]");
  });

  it("applies default styling when isSelected is false", () => {
    const { container } = render(
      <OptionCard {...defaultProps} isSelected={false} />,
    );
    const button = container.querySelector("button");
    expect(button?.className).toContain("bg-white/[0.04]");
  });

  it("shows check indicator when selected", () => {
    render(<OptionCard {...defaultProps} isSelected={true} />);
    // The check indicator div should have bg-white class when selected
    const { container } = render(
      <OptionCard {...defaultProps} isSelected={true} />,
    );
    const checkCircle = container.querySelector(".bg-white");
    expect(checkCircle).toBeInTheDocument();
  });

  it("shows empty circle when not selected", () => {
    const { container } = render(
      <OptionCard {...defaultProps} isSelected={false} />,
    );
    const emptyCircle = container.querySelector(".border-white\\/\\[0\\.30\\]");
    expect(emptyCircle).toBeInTheDocument();
  });

  it("renders as a button element", () => {
    render(<OptionCard {...defaultProps} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
