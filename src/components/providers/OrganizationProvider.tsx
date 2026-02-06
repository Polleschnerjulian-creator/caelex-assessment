"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  hasModuleAccess as checkModuleAccess,
  getRequiredPlan,
  type PlanType,
} from "@/lib/stripe/pricing";

// ─── Types ───

interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  plan: PlanType;
  maxUsers: number;
  maxSpacecraft: number;
  isActive: boolean;
}

interface SubscriptionData {
  id: string;
  plan: PlanType;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

interface OrganizationContextType {
  organization: OrganizationData | null;
  subscription: SubscriptionData | null;
  plan: PlanType;
  role: string | null;
  permissions: string[];
  isLoading: boolean;
  error: string | null;
  hasModuleAccess: (module: string) => boolean;
  requiredPlanForModule: (module: string) => PlanType;
  refetch: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType>({
  organization: null,
  subscription: null,
  plan: "FREE",
  role: null,
  permissions: [],
  isLoading: true,
  error: null,
  hasModuleAccess: () => false,
  requiredPlanForModule: () => "PROFESSIONAL",
  refetch: async () => {},
});

// ─── Provider ───

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organization, setOrganization] = useState<OrganizationData | null>(
    null,
  );
  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null,
  );
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const plan: PlanType = organization?.plan || "FREE";

  const fetchOrganization = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch("/api/organization/current");

      if (res.status === 404) {
        // Legacy user without organization — treat as FREE
        setOrganization(null);
        setSubscription(null);
        setRole(null);
        setPermissions([]);
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to fetch organization");
      }

      const data = await res.json();
      setOrganization(data.organization);
      setSubscription(data.subscription);
      setRole(data.role);
      setPermissions(data.permissions || []);
    } catch (err) {
      console.error("OrganizationProvider error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasModuleAccess = useCallback(
    (module: string) => {
      return checkModuleAccess(plan, module);
    },
    [plan],
  );

  const requiredPlanForModule = useCallback((module: string) => {
    return getRequiredPlan(module);
  }, []);

  return (
    <OrganizationContext.Provider
      value={{
        organization,
        subscription,
        plan,
        role,
        permissions,
        isLoading,
        error,
        hasModuleAccess,
        requiredPlanForModule,
        refetch: fetchOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

// ─── Hook ───

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error(
      "useOrganization must be used within an OrganizationProvider",
    );
  }
  return context;
}
