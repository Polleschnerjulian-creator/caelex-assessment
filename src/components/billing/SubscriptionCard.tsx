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
        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-full text-[11px] font-medium">
          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
          Payment Failed
        </span>
      );
    }
    if (isCanceled) {
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full text-[11px] font-medium">
          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
          Canceling
        </span>
      );
    }
    if (isTrial) {
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full text-[11px] font-medium">
          <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
          Trial
        </span>
      );
    }
    if (isActive) {
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-600 dark:text-green-400 rounded-full text-[11px] font-medium">
          <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
          Active
        </span>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-600 dark:text-white/70 mb-1">
            Current Subscription
          </h3>
          <p className="text-[13px] text-slate-500 dark:text-white/50">
            Manage your subscription and billing
          </p>
        </div>
        {getStatusBadge()}
      </div>

      <div className="space-y-4">
        {/* Plan Info */}
        <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-white/[0.06]">
          <div>
            <p className="text-[12px] text-slate-500 dark:text-white/50 mb-0.5">
              Plan
            </p>
            <p className="text-[16px] font-medium text-slate-900 dark:text-white">
              {planConfig.name}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[12px] text-slate-500 dark:text-white/50 mb-0.5">
              Price
            </p>
            <p className="text-[16px] font-medium text-slate-900 dark:text-white">
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
          <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400 dark:text-white/40" />
              <span className="text-[13px] text-slate-500 dark:text-white/50">
                {isCanceled ? "Access until" : "Next billing date"}
              </span>
            </div>
            <span className="text-[13px] font-medium text-slate-900 dark:text-white">
              {formatDate(subscription.currentPeriodEnd)}
            </span>
          </div>
        )}

        {/* Trial End */}
        {isTrial && subscription?.trialEnd && (
          <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              <span className="text-[13px] text-slate-500 dark:text-white/50">
                Trial ends
              </span>
            </div>
            <span className="text-[13px] font-medium text-slate-900 dark:text-white">
              {formatDate(subscription.trialEnd)}
            </span>
          </div>
        )}

        {/* Payment Method */}
        {plan !== "FREE" && (
          <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-slate-400 dark:text-white/40" />
              <span className="text-[13px] text-slate-500 dark:text-white/50">
                Payment method
              </span>
            </div>
            <button
              onClick={onManageBilling}
              disabled={isLoading}
              className="text-[13px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 disabled:opacity-50 transition-colors"
            >
              Manage
            </button>
          </div>
        )}

        {/* Warning Messages */}
        {isPastDue && (
          <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
            <p className="text-[13px] text-red-600 dark:text-red-400">
              Your payment failed. Please update your payment method to continue
              using premium features.
            </p>
          </div>
        )}

        {isCanceled && (
          <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg">
            <p className="text-[13px] text-amber-600 dark:text-amber-400">
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
                className="flex-1 py-2.5 px-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-[13px] font-medium hover:bg-slate-800 dark:hover:bg-white/90 transition-all disabled:opacity-50"
              >
                {isLoading ? "Loading..." : "Manage Billing"}
              </button>
              <button
                onClick={onCancelSubscription}
                disabled={isLoading}
                className="py-2.5 px-4 border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-white/60 rounded-lg text-[13px] font-medium hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          )}

          {isCanceled && (
            <button
              onClick={onReactivateSubscription}
              disabled={isLoading}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[13px] font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? "Loading..." : "Reactivate Subscription"}
            </button>
          )}

          {isPastDue && (
            <button
              onClick={onManageBilling}
              disabled={isLoading}
              className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[13px] font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? "Loading..." : "Update Payment Method"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
