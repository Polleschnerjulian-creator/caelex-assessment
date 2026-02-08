/**
 * Pricing Configuration
 *
 * Defines subscription tiers and their features.
 */

export type PlanType = "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

export interface PlanFeatures {
  users: number | "unlimited";
  spacecraft: number | "unlimited";
  modules: string[] | "all";
  storage: number | "unlimited"; // GB
  support: "community" | "email" | "priority" | "dedicated";
  api: boolean;
  sso: boolean;
}

export interface PricingTier {
  name: string;
  price: number | null; // EUR/month, null for custom pricing
  yearlyPrice: number | null; // EUR/year (with discount)
  priceId: string | null; // Stripe Price ID
  yearlyPriceId: string | null; // Stripe yearly Price ID
  features: PlanFeatures;
  description: string;
  popular?: boolean;
}

export const PRICING_TIERS: Record<PlanType, PricingTier> = {
  FREE: {
    name: "Free",
    price: 0,
    yearlyPrice: 0,
    priceId: null,
    yearlyPriceId: null,
    description: "Get started with basic compliance assessment",
    features: {
      users: 1,
      spacecraft: 1,
      modules: ["assessment"],
      storage: 0,
      support: "community",
      api: false,
      sso: false,
    },
  },
  STARTER: {
    name: "Starter",
    price: 299,
    yearlyPrice: 2990, // ~17% discount
    priceId:
      process.env.STRIPE_PRICE_STARTER_MONTHLY || "price_starter_monthly",
    yearlyPriceId:
      process.env.STRIPE_PRICE_STARTER_YEARLY || "price_starter_yearly",
    description: "For small operators and startups",
    features: {
      users: 3,
      spacecraft: 5,
      modules: ["assessment", "authorization", "registration", "documents"],
      storage: 5,
      support: "email",
      api: false,
      sso: false,
    },
  },
  PROFESSIONAL: {
    name: "Professional",
    price: 799,
    yearlyPrice: 7990, // ~17% discount
    priceId:
      process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY ||
      "price_professional_monthly",
    yearlyPriceId:
      process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY ||
      "price_professional_yearly",
    description: "For growing space companies",
    popular: true,
    features: {
      users: 10,
      spacecraft: 25,
      modules: "all",
      storage: 25,
      support: "priority",
      api: true,
      sso: false,
    },
  },
  ENTERPRISE: {
    name: "Enterprise",
    price: null,
    yearlyPrice: null,
    priceId: null,
    yearlyPriceId: null,
    description: "For large organizations with custom needs",
    features: {
      users: "unlimited",
      spacecraft: "unlimited",
      modules: "all",
      storage: "unlimited",
      support: "dedicated",
      api: true,
      sso: true,
    },
  },
};

// Module access list
export const ALL_MODULES = [
  "assessment",
  "authorization",
  "registration",
  "documents",
  "cybersecurity",
  "debris",
  "environmental",
  "supervision",
  "timeline",
  "insurance",
  "audit-center",
];

/**
 * Check if a plan has access to a specific module
 */
export function hasModuleAccess(plan: PlanType, module: string): boolean {
  const features = PRICING_TIERS[plan].features;
  if (features.modules === "all") return true;
  return features.modules.includes(module);
}

/**
 * Get the next upgrade plan
 */
export function getUpgradePlan(currentPlan: PlanType): PlanType | null {
  const upgradePath: Record<PlanType, PlanType | null> = {
    FREE: "STARTER",
    STARTER: "PROFESSIONAL",
    PROFESSIONAL: "ENTERPRISE",
    ENTERPRISE: null,
  };
  return upgradePath[currentPlan];
}

/**
 * Check if a limit is exceeded for a plan
 */
export function isLimitExceeded(
  plan: PlanType,
  resource: "users" | "spacecraft" | "storage",
  currentUsage: number,
): boolean {
  const limit = PRICING_TIERS[plan].features[resource];
  if (limit === "unlimited") return false;
  return currentUsage >= limit;
}

/**
 * Get the minimum required plan for a module
 */
export function getRequiredPlan(module: string): PlanType {
  // Check FREE plan first
  if (hasModuleAccess("FREE", module)) return "FREE";
  // Check STARTER plan
  if (hasModuleAccess("STARTER", module)) return "STARTER";
  // Default to PROFESSIONAL
  return "PROFESSIONAL";
}
