import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import UsageMetrics from "@/components/billing/UsageMetrics";

describe("UsageMetrics Component", () => {
  const defaultProps = {
    users: {
      current: 3,
      limit: 10 as number | "unlimited",
      exceeded: false,
      percentage: 30,
    },
    spacecraft: {
      current: 5,
      limit: 25 as number | "unlimited",
      exceeded: false,
      percentage: 20,
    },
  };

  describe("Rendering", () => {
    it("should render usage title", () => {
      render(<UsageMetrics {...defaultProps} />);

      expect(screen.getByText("Usage")).toBeInTheDocument();
    });

    it("should render team members metric", () => {
      render(<UsageMetrics {...defaultProps} />);

      expect(screen.getByText("Team Members")).toBeInTheDocument();
    });

    it("should render spacecraft metric", () => {
      render(<UsageMetrics {...defaultProps} />);

      expect(screen.getByText("Spacecraft")).toBeInTheDocument();
    });

    it("should display current/limit values for users", () => {
      render(<UsageMetrics {...defaultProps} />);

      expect(screen.getByText(/3.*\/.*10/)).toBeInTheDocument();
    });

    it("should display current/limit values for spacecraft", () => {
      render(<UsageMetrics {...defaultProps} />);

      expect(screen.getByText(/5.*\/.*25/)).toBeInTheDocument();
    });

    it("should render storage metric when provided", () => {
      render(
        <UsageMetrics
          {...defaultProps}
          storage={{
            current: 2,
            limit: 10,
            exceeded: false,
            percentage: 20,
          }}
        />,
      );

      expect(screen.getByText("Storage")).toBeInTheDocument();
    });
  });

  describe("Limit Display", () => {
    it("should display infinity symbol for unlimited limits", () => {
      render(
        <UsageMetrics
          users={{
            current: 50,
            limit: "unlimited",
            exceeded: false,
            percentage: 0,
          }}
          spacecraft={defaultProps.spacecraft}
        />,
      );

      expect(screen.getByText(/∞/)).toBeInTheDocument();
    });

    it("should display numeric limits correctly", () => {
      render(<UsageMetrics {...defaultProps} />);

      expect(screen.getByText(/10/)).toBeInTheDocument();
      expect(screen.getByText(/25/)).toBeInTheDocument();
    });
  });

  describe("Exceeded Limits", () => {
    it("should show warning icon when limit is exceeded", () => {
      render(
        <UsageMetrics
          users={{
            current: 15,
            limit: 10,
            exceeded: true,
            percentage: 150,
          }}
          spacecraft={defaultProps.spacecraft}
        />,
      );

      // Warning message should be present
      expect(
        screen.getByText(/You've reached your limit/i),
      ).toBeInTheDocument();
    });

    it("should not show warning when under limit", () => {
      render(<UsageMetrics {...defaultProps} />);

      expect(
        screen.queryByText(/You've reached your limit/i),
      ).not.toBeInTheDocument();
    });

    it("should style exceeded metrics differently", () => {
      render(
        <UsageMetrics
          users={{
            current: 15,
            limit: 10,
            exceeded: true,
            percentage: 150,
          }}
          spacecraft={defaultProps.spacecraft}
        />,
      );

      // The exceeded value should have amber color class
      const exceededText = screen.getByText(/15.*\/.*10/);
      expect(exceededText).toHaveClass("text-amber-400");
    });
  });

  describe("Progress Bars", () => {
    it("should render progress bars for numeric limits", () => {
      const { container } = render(<UsageMetrics {...defaultProps} />);

      // Progress bars should exist
      const progressBars = container.querySelectorAll(
        ".bg-navy-700.rounded-full",
      );
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it("should show appropriate color based on percentage", () => {
      const { container } = render(
        <UsageMetrics
          users={{
            current: 9,
            limit: 10,
            exceeded: false,
            percentage: 90,
          }}
          spacecraft={defaultProps.spacecraft}
        />,
      );

      // High percentage should show red
      const redBar = container.querySelector(".bg-red-500");
      expect(redBar).toBeInTheDocument();
    });

    it("should show amber color for medium percentage", () => {
      const { container } = render(
        <UsageMetrics
          users={{
            current: 7,
            limit: 10,
            exceeded: false,
            percentage: 70,
          }}
          spacecraft={defaultProps.spacecraft}
        />,
      );

      const amberBar = container.querySelector(".bg-amber-500");
      expect(amberBar).toBeInTheDocument();
    });

    it("should show blue color for low percentage", () => {
      const { container } = render(<UsageMetrics {...defaultProps} />);

      const blueBar = container.querySelector(".bg-blue-500");
      expect(blueBar).toBeInTheDocument();
    });
  });

  describe("Storage Display", () => {
    it("should display storage with GB suffix", () => {
      render(
        <UsageMetrics
          {...defaultProps}
          storage={{
            current: 5,
            limit: 25,
            exceeded: false,
            percentage: 20,
          }}
        />,
      );

      expect(screen.getByText(/5 GB.*\/.*25 GB/)).toBeInTheDocument();
    });

    it("should not display storage when not provided", () => {
      render(<UsageMetrics {...defaultProps} />);

      expect(screen.queryByText("Storage")).not.toBeInTheDocument();
    });
  });
});
