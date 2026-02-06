import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Button from "@/components/ui/Button";

describe("Button Component", () => {
  describe("Rendering", () => {
    it("should render children", () => {
      render(<Button>Click Me</Button>);
      expect(screen.getByText("Click Me")).toBeInTheDocument();
    });

    it("should render as a button element", () => {
      render(<Button>Button</Button>);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("should be a motion button for animations", () => {
      const { container } = render(<Button>Motion Button</Button>);
      const button = container.querySelector("button");
      expect(button).toBeInTheDocument();
    });
  });

  describe("Variants", () => {
    it("should apply primary variant styles by default", () => {
      render(<Button>Primary</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("bg-emerald-500");
    });

    it("should apply secondary variant styles", () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("bg-white/[0.06]");
      expect(button.className).toContain("border-white/10");
    });

    it("should apply ghost variant styles", () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("text-white/70");
    });

    it("should apply danger variant styles", () => {
      render(<Button variant="danger">Danger</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("bg-red-500/10");
      expect(button.className).toContain("text-red-400");
    });

    it("should apply dark variant styles", () => {
      render(<Button variant="dark">Dark</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("bg-[#0A0B10]");
      expect(button.className).toContain("rounded-full");
    });
  });

  describe("Sizes", () => {
    it("should apply small size", () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("px-3");
      expect(button.className).toContain("text-[12px]");
    });

    it("should apply medium size by default", () => {
      render(<Button>Medium</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("px-4");
      expect(button.className).toContain("text-[13px]");
    });

    it("should apply large size", () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("px-6");
      expect(button.className).toContain("text-[14px]");
    });
  });

  describe("Loading State", () => {
    it("should show loading spinner when loading", () => {
      const { container } = render(<Button loading>Loading</Button>);
      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    it("should disable button when loading", () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("should not show icon when loading", () => {
      const icon = <span data-testid="icon">★</span>;
      const { container } = render(
        <Button loading icon={icon}>
          Loading
        </Button>,
      );
      expect(
        container.querySelector("[data-testid='icon']"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Icon", () => {
    it("should render icon when provided", () => {
      const icon = <span data-testid="icon">★</span>;
      render(<Button icon={icon}>With Icon</Button>);
      expect(screen.getByTestId("icon")).toBeInTheDocument();
    });

    it("should not render icon wrapper when no icon", () => {
      const { container } = render(<Button>No Icon</Button>);
      const iconWrapper = container.querySelector(".flex-shrink-0");
      expect(iconWrapper).not.toBeInTheDocument();
    });
  });

  describe("Disabled State", () => {
    it("should be disabled when disabled prop is true", () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("should apply disabled cursor", () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("disabled:cursor-not-allowed");
    });
  });

  describe("Interactions", () => {
    it("should call onClick when clicked", () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);
      fireEvent.click(screen.getByRole("button"));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("should not call onClick when disabled", () => {
      const handleClick = vi.fn();
      render(
        <Button onClick={handleClick} disabled>
          Disabled
        </Button>,
      );
      fireEvent.click(screen.getByRole("button"));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it("should not call onClick when loading", () => {
      const handleClick = vi.fn();
      render(
        <Button onClick={handleClick} loading>
          Loading
        </Button>,
      );
      fireEvent.click(screen.getByRole("button"));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("Custom className", () => {
    it("should apply custom className", () => {
      render(<Button className="custom-class">Custom</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("custom-class");
    });
  });
});
