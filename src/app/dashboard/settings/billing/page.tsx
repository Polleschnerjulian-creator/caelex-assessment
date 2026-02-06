"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CreditCard, CheckCircle, XCircle, Loader2 } from "lucide-react";
import PricingTable from "@/components/billing/PricingTable";
import SubscriptionCard from "@/components/billing/SubscriptionCard";
import UsageMetrics from "@/components/billing/UsageMetrics";
import { PlanType } from "@/lib/stripe/pricing";
import { useOrganization } from "@/components/providers/OrganizationProvider";

interface SubscriptionData {
  subscription: {
    id: string;
    plan: PlanType;
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    trialEnd: string | null;
  } | null;
  planDetails: {
    name: string;
    price: number | null;
    features: Record<string, unknown>;
  };
  usage: {
    users: {
      current: number;
      limit: number | "unlimited";
      exceeded: boolean;
      percentage: number;
    };
    spacecraft: {
      current: number;
      limit: number | "unlimited";
      exceeded: boolean;
      percentage: number;
    };
  };
}

function BillingContent() {
  const searchParams = useSearchParams();
  const { organization } = useOrganization();
  const orgId = organization?.id || "";
  const [subscriptionData, setSubscriptionData] =
    useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Check URL params for success/cancel
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");

    if (success === "true") {
      setMessage({
        type: "success",
        text: "Your subscription has been updated successfully!",
      });
    } else if (canceled === "true") {
      setMessage({
        type: "error",
        text: "Checkout was canceled. No changes were made.",
      });
    }
  }, [searchParams]);

  // Fetch subscription data
  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await fetch(
        `/api/stripe/subscription?organizationId=${orgId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setSubscriptionData(data);
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlan = async (
    plan: PlanType,
    priceId: string,
    isYearly: boolean,
  ) => {
    setActionLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          organizationId: orgId,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setMessage({ type: "error", text: data.error });
        return;
      }

      // Redirect to Stripe Checkout URL
      if (data.url) {
        window.location.href = data.url;
      } else {
        setMessage({ type: "error", text: "No checkout URL returned" });
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      setMessage({ type: "error", text: "Failed to start checkout" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setActionLoading(true);

    try {
      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      });

      const data = await response.json();

      if (data.error) {
        setMessage({ type: "error", text: data.error });
        return;
      }

      // Redirect to Customer Portal
      window.location.href = data.url;
    } catch (error) {
      console.error("Error creating portal session:", error);
      setMessage({ type: "error", text: "Failed to open billing portal" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (
      !confirm(
        "Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.",
      )
    ) {
      return;
    }

    setActionLoading(true);

    try {
      const response = await fetch("/api/stripe/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: orgId,
          action: "cancel",
        }),
      });

      const data = await response.json();

      if (data.error) {
        setMessage({ type: "error", text: data.error });
        return;
      }

      setMessage({ type: "success", text: data.message });
      fetchSubscription();
    } catch (error) {
      console.error("Error canceling subscription:", error);
      setMessage({ type: "error", text: "Failed to cancel subscription" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setActionLoading(true);

    try {
      const response = await fetch("/api/stripe/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: orgId,
          action: "reactivate",
        }),
      });

      const data = await response.json();

      if (data.error) {
        setMessage({ type: "error", text: data.error });
        return;
      }

      setMessage({ type: "success", text: data.message });
      fetchSubscription();
    } catch (error) {
      console.error("Error reactivating subscription:", error);
      setMessage({ type: "error", text: "Failed to reactivate subscription" });
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 text-slate-400 dark:text-white/40 animate-spin" />
      </div>
    );
  }

  const currentPlan = (subscriptionData?.subscription?.plan ||
    "FREE") as PlanType;

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-[1200px]">
        {/* Page Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-slate-600 dark:text-white/70" />
            </div>
            <div>
              <h1 className="text-[24px] font-medium text-slate-900 dark:text-white">
                Billing & Subscription
              </h1>
              <p className="text-[14px] text-slate-600 dark:text-white/70">
                Manage your subscription plan and billing information
              </p>
            </div>
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`p-4 rounded-xl flex items-center gap-3 mb-8 ${
              message.type === "success"
                ? "bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400"
                : "bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <p className="text-[14px]">{message.text}</p>
            <button
              onClick={() => setMessage(null)}
              className="ml-auto text-current hover:opacity-70"
            >
              &times;
            </button>
          </div>
        )}

        {/* Current Subscription & Usage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          <SubscriptionCard
            subscription={subscriptionData?.subscription || null}
            onManageBilling={handleManageBilling}
            onCancelSubscription={handleCancelSubscription}
            onReactivateSubscription={handleReactivateSubscription}
            isLoading={actionLoading}
          />

          {subscriptionData?.usage && (
            <UsageMetrics
              users={subscriptionData.usage.users}
              spacecraft={subscriptionData.usage.spacecraft}
            />
          )}
        </div>

        {/* Pricing Table */}
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-white/30 mb-6">
            AVAILABLE PLANS
          </p>
          <PricingTable
            currentPlan={currentPlan}
            onSelectPlan={handleSelectPlan}
            isLoading={actionLoading}
          />
        </div>

        {/* FAQ */}
        <div className="mt-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-white/30 mb-6">
            FREQUENTLY ASKED QUESTIONS
          </p>
          <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
            <div className="space-y-6">
              <div>
                <p className="text-[14px] font-medium text-slate-900 dark:text-white">
                  What happens when I upgrade?
                </p>
                <p className="text-[13px] text-slate-500 dark:text-white/50 mt-1">
                  You&apos;ll be charged the prorated amount for the remainder
                  of your current billing period. Your new plan features will be
                  available immediately.
                </p>
              </div>
              <div>
                <p className="text-[14px] font-medium text-slate-900 dark:text-white">
                  Can I cancel anytime?
                </p>
                <p className="text-[13px] text-slate-500 dark:text-white/50 mt-1">
                  Yes, you can cancel your subscription at any time. You&apos;ll
                  retain access to your current plan until the end of your
                  billing period.
                </p>
              </div>
              <div>
                <p className="text-[14px] font-medium text-slate-900 dark:text-white">
                  What payment methods do you accept?
                </p>
                <p className="text-[13px] text-slate-500 dark:text-white/50 mt-1">
                  We accept all major credit cards (Visa, Mastercard, American
                  Express) and SEPA Direct Debit for EU customers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BillingFallback() {
  return (
    <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-6 h-6 text-slate-400 dark:text-white/40 animate-spin" />
    </div>
  );
}

export default function BillingSettingsPage() {
  return (
    <Suspense fallback={<BillingFallback />}>
      <BillingContent />
    </Suspense>
  );
}
