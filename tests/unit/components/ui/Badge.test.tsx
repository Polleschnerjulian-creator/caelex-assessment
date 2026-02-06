import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge, StatusBadge } from "@/components/ui/Badge";

describe("Badge Component", () => {
  describe("Badge", () => {
    it("should render children", () => {
      render(<Badge>Test Badge</Badge>);
      expect(screen.getByText("Test Badge")).toBeInTheDocument();
    });

    it("should apply default variant styles", () => {
      render(<Badge>Default</Badge>);
      const badge = screen.getByText("Default");
      expect(badge.className).toContain("bg-white/10");
    });

    it("should apply success variant styles", () => {
      render(<Badge variant="success">Success</Badge>);
      const badge = screen.getByText("Success");
      expect(badge.className).toContain("bg-emerald-500/15");
      expect(badge.className).toContain("text-emerald-400");
    });

    it("should apply warning variant styles", () => {
      render(<Badge variant="warning">Warning</Badge>);
      const badge = screen.getByText("Warning");
      expect(badge.className).toContain("bg-amber-500/15");
      expect(badge.className).toContain("text-amber-400");
    });

    it("should apply error variant styles", () => {
      render(<Badge variant="error">Error</Badge>);
      const badge = screen.getByText("Error");
      expect(badge.className).toContain("bg-red-500/15");
      expect(badge.className).toContain("text-red-400");
    });

    it("should apply info variant styles", () => {
      render(<Badge variant="info">Info</Badge>);
      const badge = screen.getByText("Info");
      expect(badge.className).toContain("bg-blue-500/15");
      expect(badge.className).toContain("text-blue-400");
    });

    it("should apply outline variant styles", () => {
      render(<Badge variant="outline">Outline</Badge>);
      const badge = screen.getByText("Outline");
      expect(badge.className).toContain("bg-transparent");
      expect(badge.className).toContain("border-white/20");
    });

    it("should apply small size", () => {
      render(<Badge size="sm">Small</Badge>);
      const badge = screen.getByText("Small");
      expect(badge.className).toContain("px-1.5");
      expect(badge.className).toContain("text-[10px]");
    });

    it("should apply medium size by default", () => {
      render(<Badge>Medium</Badge>);
      const badge = screen.getByText("Medium");
      expect(badge.className).toContain("px-2.5");
      expect(badge.className).toContain("text-[11px]");
    });

    it("should render dot when dot prop is true", () => {
      const { container } = render(<Badge dot>With Dot</Badge>);
      const dot = container.querySelector(".rounded-full");
      expect(dot).toBeInTheDocument();
    });

    it("should not render dot when dot prop is false", () => {
      const { container } = render(<Badge dot={false}>Without Dot</Badge>);
      const dot = container.querySelector(".w-1\\.5");
      expect(dot).not.toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(<Badge className="custom-class">Custom</Badge>);
      const badge = screen.getByText("Custom");
      expect(badge.className).toContain("custom-class");
    });
  });

  describe("StatusBadge", () => {
    it("should render compliant status", () => {
      render(<StatusBadge status="compliant" />);
      expect(screen.getByText("Compliant")).toBeInTheDocument();
    });

    it("should render in_progress status", () => {
      render(<StatusBadge status="in_progress" />);
      expect(screen.getByText("In Progress")).toBeInTheDocument();
    });

    it("should render not_started status", () => {
      render(<StatusBadge status="not_started" />);
      expect(screen.getByText("Not Started")).toBeInTheDocument();
    });

    it("should render under_review status", () => {
      render(<StatusBadge status="under_review" />);
      expect(screen.getByText("Under Review")).toBeInTheDocument();
    });

    it("should render not_applicable status", () => {
      render(<StatusBadge status="not_applicable" />);
      expect(screen.getByText("N/A")).toBeInTheDocument();
    });

    it("should apply success variant for compliant", () => {
      const { container } = render(<StatusBadge status="compliant" />);
      const badge = container.querySelector("span");
      expect(badge?.className).toContain("bg-emerald-500/15");
    });

    it("should apply warning variant for in_progress", () => {
      const { container } = render(<StatusBadge status="in_progress" />);
      const badge = container.querySelector("span");
      expect(badge?.className).toContain("bg-amber-500/15");
    });

    it("should apply info variant for under_review", () => {
      const { container } = render(<StatusBadge status="under_review" />);
      const badge = container.querySelector("span");
      expect(badge?.className).toContain("bg-blue-500/15");
    });

    it("should apply custom className", () => {
      const { container } = render(
        <StatusBadge status="compliant" className="my-class" />,
      );
      const badge = container.querySelector("span");
      expect(badge?.className).toContain("my-class");
    });

    it("should always show dot for status badges", () => {
      const { container } = render(<StatusBadge status="compliant" />);
      const dot = container.querySelector(".rounded-full");
      expect(dot).toBeInTheDocument();
    });
  });
});
