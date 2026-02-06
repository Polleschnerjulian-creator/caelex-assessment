import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SubscriptionCard from "@/components/billing/SubscriptionCard";
import { PlanType } from "@/lib/stripe/pricing";

describe("SubscriptionCard Component", () => {
  const mockOnManageBilling = vi.fn();
  const mockOnCancelSubscription = vi.fn();
  const mockOnReactivateSubscription = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderSubscriptionCard = (
    subscription: {
      plan: PlanType;
      status: string;
      currentPeriodEnd: string | null;
      cancelAtPeriodEnd: boolean;
      trialEnd: string | null;
    } | null = null,
    isLoading = false,
  ) => {
    return render(
      <SubscriptionCard
        subscription={subscription}
        onManageBilling={mockOnManageBilling}
        onCancelSubscription={mockOnCancelSubscription}
        onReactivateSubscription={mockOnReactivateSubscription}
        isLoading={isLoading}
      />,
    );
  };

  describe("Rendering", () => {
    it("should render title", () => {
      renderSubscriptionCard();

      expect(screen.getByText("Current Subscription")).toBeInTheDocument();
    });

    it("should render description", () => {
      renderSubscriptionCard();

      expect(
        screen.getByText("Manage your subscription and billing"),
      ).toBeInTheDocument();
    });

    it("should show FREE plan when no subscription", () => {
      renderSubscriptionCard(null);

      // Check that the Free plan name is displayed
      const freeTexts = screen.getAllByText("Free");
      expect(freeTexts.length).toBeGreaterThan(0);
    });

    it("should show plan name for active subscription", () => {
      renderSubscriptionCard({
        plan: "PROFESSIONAL",
        status: "ACTIVE",
        currentPeriodEnd: "2024-12-31",
        cancelAtPeriodEnd: false,
        trialEnd: null,
      });

      expect(screen.getByText("Professional")).toBeInTheDocument();
    });

    it("should show price for paid plans", () => {
      renderSubscriptionCard({
        plan: "STARTER",
        status: "ACTIVE",
        currentPeriodEnd: "2024-12-31",
        cancelAtPeriodEnd: false,
        trialEnd: null,
      });

      expect(screen.getByText("€299/mo")).toBeInTheDocument();
    });
  });

  describe("Status Badges", () => {
    it("should show Active badge for active subscription", () => {
      renderSubscriptionCard({
        plan: "PROFESSIONAL",
        status: "ACTIVE",
        currentPeriodEnd: "2024-12-31",
        cancelAtPeriodEnd: false,
        trialEnd: null,
      });

      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("should show Trial badge for trial subscription", () => {
      renderSubscriptionCard({
        plan: "PROFESSIONAL",
        status: "TRIALING",
        currentPeriodEnd: "2024-12-31",
        cancelAtPeriodEnd: false,
        trialEnd: "2024-01-15",
      });

      expect(screen.getByText("Trial")).toBeInTheDocument();
    });

    it("should show Payment Failed badge for past due subscription", () => {
      renderSubscriptionCard({
        plan: "PROFESSIONAL",
        status: "PAST_DUE",
        currentPeriodEnd: "2024-12-31",
        cancelAtPeriodEnd: false,
        trialEnd: null,
      });

      expect(screen.getByText("Payment Failed")).toBeInTheDocument();
    });

    it("should show Canceling badge for canceled subscription", () => {
      renderSubscriptionCard({
        plan: "PROFESSIONAL",
        status: "ACTIVE",
        currentPeriodEnd: "2024-12-31",
        cancelAtPeriodEnd: true,
        trialEnd: null,
      });

      expect(screen.getByText("Canceling")).toBeInTheDocument();
    });
  });

  describe("Billing Information", () => {
    it("should show next billing date for active subscription", () => {
      renderSubscriptionCard({
        plan: "PROFESSIONAL",
        status: "ACTIVE",
        currentPeriodEnd: "2024-12-31",
        cancelAtPeriodEnd: false,
        trialEnd: null,
      });

      expect(screen.getByText("Next billing date")).toBeInTheDocument();
      expect(screen.getByText("December 31, 2024")).toBeInTheDocument();
    });

    it("should show access until date for canceling subscription", () => {
      renderSubscriptionCard({
        plan: "PROFESSIONAL",
        status: "ACTIVE",
        currentPeriodEnd: "2024-12-31",
        cancelAtPeriodEnd: true,
        trialEnd: null,
      });

      expect(screen.getByText("Access until")).toBeInTheDocument();
    });

    it("should show trial end date for trial subscription", () => {
      renderSubscriptionCard({
        plan: "PROFESSIONAL",
        status: "TRIALING",
        currentPeriodEnd: "2024-12-31",
        cancelAtPeriodEnd: false,
        trialEnd: "2024-01-15",
      });

      expect(screen.getByText("Trial ends")).toBeInTheDocument();
      expect(screen.getByText("January 15, 2024")).toBeInTheDocument();
    });

    it("should show payment method option for paid plans", () => {
      renderSubscriptionCard({
        plan: "PROFESSIONAL",
        status: "ACTIVE",
        currentPeriodEnd: "2024-12-31",
        cancelAtPeriodEnd: false,
        trialEnd: null,
      });

      expect(screen.getByText("Payment method")).toBeInTheDocument();
      expect(screen.getByText("Manage")).toBeInTheDocument();
    });

    it("should not show payment method for FREE plan", () => {
      renderSubscriptionCard(null);

      expect(screen.queryByText("Payment method")).not.toBeInTheDocument();
    });
  });

  describe("Warning Messages", () => {
    it("should show payment failed warning for past due", () => {
      renderSubscriptionCard({
        plan: "PROFESSIONAL",
        status: "PAST_DUE",
        currentPeriodEnd: "2024-12-31",
        cancelAtPeriodEnd: false,
        trialEnd: null,
      });

      expect(screen.getByText(/Your payment failed/)).toBeInTheDocument();
    });

    it("should show cancellation warning for canceling subscription", () => {
      renderSubscriptionCard({
        plan: "PROFESSIONAL",
        status: "ACTIVE",
        currentPeriodEnd: "2024-12-31",
        cancelAtPeriodEnd: true,
        trialEnd: null,
      });

      expect(
        screen.getByText(/Your subscription will be canceled/),
      ).toBeInTheDocument();
    });
  });

  describe("Action Buttons", () => {
    it("should show Manage Billing and Cancel buttons for active paid subscription", () => {
      renderSubscriptionCard({
        plan: "PROFESSIONAL",
        status: "ACTIVE",
        currentPeriodEnd: "2024-12-31",
        cancelAtPeriodEnd: false,
        trialEnd: null,
      });

      expect(screen.getByText("Manage Billing")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("should show Reactivate button for canceling subscription", () => {
      renderSubscriptionCard({
        plan: "PROFESSIONAL",
        status: "ACTIVE",
        currentPeriodEnd: "2024-12-31",
        cancelAtPeriodEnd: true,
        trialEnd: null,
      });

      expect(screen.getByText("Reactivate Subscription")).toBeInTheDocument();
    });

    it("should show Update Payment Method button for past due", () => {
      renderSubscriptionCard({
        plan: "PROFESSIONAL",
        status: "PAST_DUE",
        currentPeriodEnd: "2024-12-31",
        cancelAtPeriodEnd: false,
        trialEnd: null,
      });

      expect(screen.getByText("Update Payment Method")).toBeInTheDocument();
    });

    it("should not show action buttons for FREE plan", () => {
      renderSubscriptionCard(null);

      expect(screen.queryByText("Manage Billing")).not.toBeInTheDocument();
      expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
    });
  });

  describe("Button Actions", () => {
    it("should call onManageBilling when clicking Manage Billing", () => {
      renderSubscriptionCard({
        plan: "PROFESSIONAL",
        status: "ACTIVE",
        currentPeriodEnd: "2024-12-31",
        cancelAtPeriodEnd: false,
        trialEnd: null,
      });

      fireEvent.click(screen.getByText("Manage Billing"));

      expect(mockOnManageBilling).toHaveBeenCalled();
    });

    it("should call onCancelSubscription when clicking Cancel", () => {
      renderSubscriptionCard({
        plan: "PROFESSIONAL",
        status: "ACTIVE",
        currentPeriodEnd: "2024-12-31",
        cancelAtPeriodEnd: false,
        trialEnd: null,
      });

      fireEvent.click(screen.getByText("Cancel"));

      expect(mockOnCancelSubscription).toHaveBeenCalled();
    });

    it("should call onReactivateSubscription when clicking Reactivate", () => {
      renderSubscriptionCard({
        plan: "PROFESSIONAL",
        status: "ACTIVE",
        currentPeriodEnd: "2024-12-31",
        cancelAtPeriodEnd: true,
        trialEnd: null,
      });

      fireEvent.click(screen.getByText("Reactivate Subscription"));

      expect(mockOnReactivateSubscription).toHaveBeenCalled();
    });

    it("should call onManageBilling when clicking Manage link", () => {
      renderSubscriptionCard({
        plan: "PROFESSIONAL",
        status: "ACTIVE",
        currentPeriodEnd: "2024-12-31",
        cancelAtPeriodEnd: false,
        trialEnd: null,
      });

      fireEvent.click(screen.getByText("Manage"));

      expect(mockOnManageBilling).toHaveBeenCalled();
    });
  });

  describe("Loading State", () => {
    it("should show Loading text on buttons when loading", () => {
      renderSubscriptionCard(
        {
          plan: "PROFESSIONAL",
          status: "ACTIVE",
          currentPeriodEnd: "2024-12-31",
          cancelAtPeriodEnd: false,
          trialEnd: null,
        },
        true,
      );

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("should disable buttons when loading", () => {
      renderSubscriptionCard(
        {
          plan: "PROFESSIONAL",
          status: "ACTIVE",
          currentPeriodEnd: "2024-12-31",
          cancelAtPeriodEnd: false,
          trialEnd: null,
        },
        true,
      );

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });
});
