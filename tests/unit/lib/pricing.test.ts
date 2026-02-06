import { describe, it, expect } from "vitest";
import {
  PRICING_TIERS,
  PlanType,
  hasModuleAccess,
  getRequiredPlan,
  getUpgradePlan,
  isLimitExceeded,
  ALL_MODULES,
} from "@/lib/stripe/pricing";

describe("Pricing Module", () => {
  describe("PRICING_TIERS", () => {
    it("should have all plan types defined", () => {
      const planTypes: PlanType[] = [
        "FREE",
        "STARTER",
        "PROFESSIONAL",
        "ENTERPRISE",
      ];
      planTypes.forEach((plan) => {
        expect(PRICING_TIERS[plan]).toBeDefined();
      });
    });

    it("should have FREE plan with zero price", () => {
      expect(PRICING_TIERS.FREE.price).toBe(0);
      expect(PRICING_TIERS.FREE.name).toBe("Free");
    });

    it("should have STARTER plan with correct price", () => {
      expect(PRICING_TIERS.STARTER.price).toBe(299);
      expect(PRICING_TIERS.STARTER.name).toBe("Starter");
    });

    it("should have PROFESSIONAL plan with correct price", () => {
      expect(PRICING_TIERS.PROFESSIONAL.price).toBe(799);
      expect(PRICING_TIERS.PROFESSIONAL.name).toBe("Professional");
      expect(PRICING_TIERS.PROFESSIONAL.popular).toBe(true);
    });

    it("should have ENTERPRISE plan with null price (custom)", () => {
      expect(PRICING_TIERS.ENTERPRISE.price).toBeNull();
      expect(PRICING_TIERS.ENTERPRISE.name).toBe("Enterprise");
    });

    it("should have yearly discounts on paid plans", () => {
      expect(PRICING_TIERS.STARTER.yearlyPrice).toBeDefined();
      expect(PRICING_TIERS.STARTER.yearlyPrice).toBeLessThan(
        PRICING_TIERS.STARTER.price! * 12,
      );

      expect(PRICING_TIERS.PROFESSIONAL.yearlyPrice).toBeDefined();
      expect(PRICING_TIERS.PROFESSIONAL.yearlyPrice).toBeLessThan(
        PRICING_TIERS.PROFESSIONAL.price! * 12,
      );
    });

    describe("FREE plan features", () => {
      const features = PRICING_TIERS.FREE.features;

      it("should have limited users", () => {
        expect(features.users).toBe(1);
      });

      it("should have limited spacecraft", () => {
        expect(features.spacecraft).toBe(1);
      });

      it("should have limited modules", () => {
        expect(features.modules).toContain("assessment");
        expect(features.modules).not.toBe("all");
      });

      it("should not have API access", () => {
        expect(features.api).toBe(false);
      });

      it("should not have SSO", () => {
        expect(features.sso).toBe(false);
      });

      it("should have community support", () => {
        expect(features.support).toBe("community");
      });
    });

    describe("STARTER plan features", () => {
      const features = PRICING_TIERS.STARTER.features;

      it("should have more users than FREE", () => {
        expect(features.users).toBeGreaterThan(
          PRICING_TIERS.FREE.features.users,
        );
      });

      it("should have more spacecraft than FREE", () => {
        expect(features.spacecraft).toBeGreaterThan(
          PRICING_TIERS.FREE.features.spacecraft,
        );
      });

      it("should have more modules than FREE", () => {
        expect(
          Array.isArray(features.modules) ? features.modules.length : 0,
        ).toBeGreaterThan(
          Array.isArray(PRICING_TIERS.FREE.features.modules)
            ? PRICING_TIERS.FREE.features.modules.length
            : 0,
        );
      });

      it("should have email support", () => {
        expect(features.support).toBe("email");
      });
    });

    describe("PROFESSIONAL plan features", () => {
      const features = PRICING_TIERS.PROFESSIONAL.features;

      it("should have all modules", () => {
        expect(features.modules).toBe("all");
      });

      it("should have API access", () => {
        expect(features.api).toBe(true);
      });

      it("should have priority support", () => {
        expect(features.support).toBe("priority");
      });
    });

    describe("ENTERPRISE plan features", () => {
      const features = PRICING_TIERS.ENTERPRISE.features;

      it("should have unlimited users", () => {
        expect(features.users).toBe("unlimited");
      });

      it("should have unlimited spacecraft", () => {
        expect(features.spacecraft).toBe("unlimited");
      });

      it("should have all modules", () => {
        expect(features.modules).toBe("all");
      });

      it("should have API access", () => {
        expect(features.api).toBe(true);
      });

      it("should have SSO", () => {
        expect(features.sso).toBe(true);
      });

      it("should have dedicated support", () => {
        expect(features.support).toBe("dedicated");
      });

      it("should have unlimited storage", () => {
        expect(features.storage).toBe("unlimited");
      });
    });
  });

  describe("hasModuleAccess", () => {
    it("should allow assessment module for FREE plan", () => {
      expect(hasModuleAccess("FREE", "assessment")).toBe(true);
    });

    it("should deny authorization module for FREE plan", () => {
      expect(hasModuleAccess("FREE", "authorization")).toBe(false);
    });

    it("should allow authorization module for STARTER plan", () => {
      expect(hasModuleAccess("STARTER", "authorization")).toBe(true);
    });

    it("should allow all modules for PROFESSIONAL plan", () => {
      const modules = [
        "assessment",
        "authorization",
        "registration",
        "documents",
        "cybersecurity",
        "debris",
        "environmental",
      ];
      modules.forEach((module) => {
        expect(hasModuleAccess("PROFESSIONAL", module)).toBe(true);
      });
    });

    it("should allow all modules for ENTERPRISE plan", () => {
      const modules = [
        "assessment",
        "authorization",
        "registration",
        "documents",
        "cybersecurity",
        "debris",
        "environmental",
      ];
      modules.forEach((module) => {
        expect(hasModuleAccess("ENTERPRISE", module)).toBe(true);
      });
    });
  });

  describe("getRequiredPlan", () => {
    it("should return FREE for assessment module", () => {
      expect(getRequiredPlan("assessment")).toBe("FREE");
    });

    it("should return STARTER for authorization module", () => {
      expect(getRequiredPlan("authorization")).toBe("STARTER");
    });

    it("should return PROFESSIONAL for advanced modules", () => {
      expect(getRequiredPlan("cybersecurity")).toBe("PROFESSIONAL");
      expect(getRequiredPlan("debris")).toBe("PROFESSIONAL");
    });
  });

  describe("getUpgradePlan", () => {
    it("should return STARTER for FREE plan", () => {
      expect(getUpgradePlan("FREE")).toBe("STARTER");
    });

    it("should return PROFESSIONAL for STARTER plan", () => {
      expect(getUpgradePlan("STARTER")).toBe("PROFESSIONAL");
    });

    it("should return ENTERPRISE for PROFESSIONAL plan", () => {
      expect(getUpgradePlan("PROFESSIONAL")).toBe("ENTERPRISE");
    });

    it("should return null for ENTERPRISE plan (no upgrade available)", () => {
      expect(getUpgradePlan("ENTERPRISE")).toBeNull();
    });
  });

  describe("isLimitExceeded", () => {
    it("should return false when under the limit", () => {
      expect(isLimitExceeded("FREE", "users", 0)).toBe(false);
      expect(isLimitExceeded("STARTER", "users", 2)).toBe(false);
      expect(isLimitExceeded("PROFESSIONAL", "spacecraft", 10)).toBe(false);
    });

    it("should return true when at the limit", () => {
      expect(isLimitExceeded("FREE", "users", 1)).toBe(true);
      expect(isLimitExceeded("STARTER", "users", 3)).toBe(true);
      expect(isLimitExceeded("PROFESSIONAL", "spacecraft", 25)).toBe(true);
    });

    it("should return true when over the limit", () => {
      expect(isLimitExceeded("FREE", "users", 5)).toBe(true);
      expect(isLimitExceeded("STARTER", "spacecraft", 10)).toBe(true);
    });

    it("should return false for unlimited resources", () => {
      expect(isLimitExceeded("ENTERPRISE", "users", 1000)).toBe(false);
      expect(isLimitExceeded("ENTERPRISE", "spacecraft", 500)).toBe(false);
      expect(isLimitExceeded("ENTERPRISE", "storage", 10000)).toBe(false);
    });
  });

  describe("ALL_MODULES", () => {
    it("should contain all expected modules", () => {
      expect(ALL_MODULES).toContain("assessment");
      expect(ALL_MODULES).toContain("authorization");
      expect(ALL_MODULES).toContain("registration");
      expect(ALL_MODULES).toContain("documents");
      expect(ALL_MODULES).toContain("cybersecurity");
      expect(ALL_MODULES).toContain("debris");
      expect(ALL_MODULES).toContain("environmental");
      expect(ALL_MODULES).toContain("supervision");
    });

    it("should have a reasonable number of modules", () => {
      expect(ALL_MODULES.length).toBeGreaterThanOrEqual(8);
    });
  });
});
