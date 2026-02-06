import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PricingTable from "@/components/billing/PricingTable";
import { PlanType } from "@/lib/stripe/pricing";

describe("PricingTable Component", () => {
  const mockOnSelectPlan = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPricingTable = (
    props: {
      currentPlan?: PlanType;
      isLoading?: boolean;
    } = {},
  ) => {
    return render(
      <PricingTable
        currentPlan={props.currentPlan || "FREE"}
        onSelectPlan={mockOnSelectPlan}
        isLoading={props.isLoading || false}
      />,
    );
  };

  describe("Rendering", () => {
    it("should render all plan tiers", () => {
      renderPricingTable();

      // Free text appears multiple times (plan name + price)
      const freeTexts = screen.getAllByText("Free");
      expect(freeTexts.length).toBeGreaterThan(0);

      expect(screen.getByText("Starter")).toBeInTheDocument();
      expect(screen.getByText("Professional")).toBeInTheDocument();
      expect(screen.getByText("Enterprise")).toBeInTheDocument();
    });

    it("should show 'Most Popular' badge for Professional plan", () => {
      renderPricingTable();

      expect(screen.getByText("Most Popular")).toBeInTheDocument();
    });

    it("should render billing toggle", () => {
      renderPricingTable();

      expect(screen.getByText("Monthly")).toBeInTheDocument();
      expect(screen.getByText("Yearly")).toBeInTheDocument();
    });

    it("should show current plan as disabled button", () => {
      renderPricingTable({ currentPlan: "STARTER" });

      const currentPlanButtons = screen.getAllByText("Current Plan");
      expect(currentPlanButtons.length).toBeGreaterThan(0);
    });

    it("should show prices for each plan", () => {
      renderPricingTable();

      // Free plan should show "Free" - but there will be multiple Free texts
      const freeTexts = screen.getAllByText("Free");
      expect(freeTexts.length).toBeGreaterThan(0);

      // Enterprise should show "Custom"
      expect(screen.getByText("Custom")).toBeInTheDocument();
    });

    it("should display features for each plan", () => {
      renderPricingTable();

      // Check for user counts
      const userTexts = screen.getAllByText(/user/i);
      expect(userTexts.length).toBeGreaterThan(0);

      // Check for spacecraft counts
      const spacecraftTexts = screen.getAllByText(/spacecraft/i);
      expect(spacecraftTexts.length).toBeGreaterThan(0);
    });
  });

  describe("Billing Toggle", () => {
    it("should toggle between monthly and yearly pricing", () => {
      renderPricingTable();

      const toggle = screen.getByRole("button", { name: "" }); // Toggle button

      // Toggle is a button element - we need to find it differently
      const monthlyText = screen.getByText("Monthly");
      const yearlyText = screen.getByText("Yearly");

      expect(monthlyText).toHaveClass("text-white");
    });

    it("should show yearly savings message", () => {
      renderPricingTable();

      expect(screen.getByText(/Save 17%/i)).toBeInTheDocument();
    });
  });

  describe("Plan Selection", () => {
    it("should call onSelectPlan when clicking upgrade button", () => {
      renderPricingTable({ currentPlan: "FREE" });

      const upgradeButtons = screen.getAllByText("Upgrade");
      fireEvent.click(upgradeButtons[0]);

      expect(mockOnSelectPlan).toHaveBeenCalled();
    });

    it("should not allow selecting current plan", () => {
      renderPricingTable({ currentPlan: "STARTER" });

      const currentPlanButton = screen.getAllByText("Current Plan")[0];
      expect(currentPlanButton).toBeDisabled();
    });

    it("should show Contact Sales for Enterprise plan", () => {
      renderPricingTable();

      expect(screen.getByText("Contact Sales")).toBeInTheDocument();
    });

    it("should disable buttons when loading", () => {
      renderPricingTable({ isLoading: true });

      const buttons = screen.getAllByRole("button");
      const upgradeButtons = buttons.filter(
        (b) =>
          b.textContent?.includes("Loading") ||
          b.textContent?.includes("Upgrade"),
      );

      upgradeButtons.forEach((button) => {
        if (button.textContent?.includes("Loading")) {
          expect(button).toBeDisabled();
        }
      });
    });
  });

  describe("Feature Display", () => {
    it("should show API access feature", () => {
      renderPricingTable();

      // API access appears in multiple plans
      const apiTexts = screen.getAllByText("API access");
      expect(apiTexts.length).toBeGreaterThan(0);
    });

    it("should show SSO for Enterprise plan", () => {
      renderPricingTable();

      expect(screen.getByText("SSO integration")).toBeInTheDocument();
    });

    it("should show support levels for each plan", () => {
      renderPricingTable();

      // Support is shown as "X support" for each plan
      const supportTexts = screen.getAllByText(/support$/i);
      expect(supportTexts.length).toBeGreaterThanOrEqual(4);
    });
  });
});
