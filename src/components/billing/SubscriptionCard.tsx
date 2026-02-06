"use client";

import { CreditCard, Calendar, AlertTriangle, CheckCircle } from "lucide-react";
import { PRICING_TIERS, PlanType } from "@/lib/stripe/pricing";

interface SubscriptionCardProps {
  subscription: {
    plan: PlanType;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    trialEnd: string | null;
  } | null;
  onManageBilling: () => void;
  onCancelSubscription: () => void;
  onReactivateSubscription: () => void;
  isLoading?: boolean;
}

export default function SubscriptionCard({
  subscription,
  onManageBilling,
  onCancelSubscription,
  onReactivateSubscription,
  isLoading,
}: SubscriptionCardProps) {
  const plan = subscription?.plan || "FREE";
  const planConfig = PRICING_TIERS[plan];
  const isActive =
    subscription?.status === "ACTIVE" || subscription?.status === "TRIALING";
  const isTrial = subscription?.status === "TRIALING";
  const isPastDue = subscription?.status === "PAST_DUE";
  const isCanceled = subscription?.cancelAtPeriodEnd;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadge = () => {
    if (isPastDue) {
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 text-red-400 rounded-full text-xs font-medium">
          <AlertTriangle className="w-3.5 h-3.5" />
          Payment Failed
        </span>
      );
    }
    if (isCanceled) {
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-400 rounded-full text-xs font-medium">
          <AlertTriangle className="w-3.5 h-3.5" />
          Canceling
        </span>
      );
    }
    if (isTrial) {
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-medium">
          <Calendar className="w-3.5 h-3.5" />
          Trial
        </span>
      );
    }
    if (isActive) {
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 text-green-400 rounded-full text-xs font-medium">
          <CheckCircle className="w-3.5 h-3.5" />
          Active
        </span>
      );
    }
    return null;
  };

  return (
    <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">
            Current Subscription
          </h3>
          <p className="text-sm text-slate-400">
            Manage your subscription and billing
          </p>
        </div>
        {getStatusBadge()}
      </div>

      <div className="space-y-4">
        {/* Plan Info */}
        <div className="flex items-center justify-between py-3 border-b border-navy-700">
          <div>
            <p className="text-sm text-slate-400">Plan</p>
            <p className="text-lg font-semibold text-white">
              {planConfig.name}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400">Price</p>
            <p className="text-lg font-semibold text-white">
              {planConfig.price === null
                ? "Custom"
                : planConfig.price === 0
                  ? "Free"
                  : `€${planConfig.price}/mo`}
            </p>
          </div>
        </div>

        {/* Billing Period */}
        {subscription?.currentPeriodEnd && (
          <div className="flex items-center justify-between py-3 border-b border-navy-700">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-400">
                {isCanceled ? "Access until" : "Next billing date"}
              </span>
            </div>
            <span className="text-sm text-white">
              {formatDate(subscription.currentPeriodEnd)}
            </span>
          </div>
        )}

        {/* Trial End */}
        {isTrial && subscription?.trialEnd && (
          <div className="flex items-center justify-between py-3 border-b border-navy-700">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-slate-400">Trial ends</span>
            </div>
            <span className="text-sm text-white">
              {formatDate(subscription.trialEnd)}
            </span>
          </div>
        )}

        {/* Payment Method */}
        {plan !== "FREE" && (
          <div className="flex items-center justify-between py-3 border-b border-navy-700">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-400">Payment method</span>
            </div>
            <button
              onClick={onManageBilling}
              disabled={isLoading}
              className="text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50"
            >
              Manage
            </button>
          </div>
        )}

        {/* Warning Messages */}
        {isPastDue && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">
              Your payment failed. Please update your payment method to continue
              using premium features.
            </p>
          </div>
        )}

        {isCanceled && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-sm text-amber-400">
              Your subscription will be canceled at the end of your billing
              period. You can reactivate anytime before then.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          {plan !== "FREE" && !isCanceled && (
            <>
              <button
                onClick={onManageBilling}
                disabled={isLoading}
                className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isLoading ? "Loading..." : "Manage Billing"}
              </button>
              <button
                onClick={onCancelSubscription}
                disabled={isLoading}
                className="py-2 px-4 bg-navy-700 hover:bg-navy-600 text-slate-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          )}

          {isCanceled && (
            <button
              onClick={onReactivateSubscription}
              disabled={isLoading}
              className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? "Loading..." : "Reactivate Subscription"}
            </button>
          )}

          {isPastDue && (
            <button
              onClick={onManageBilling}
              disabled={isLoading}
              className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? "Loading..." : "Update Payment Method"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
