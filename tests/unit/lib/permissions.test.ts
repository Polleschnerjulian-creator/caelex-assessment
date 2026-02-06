import { describe, it, expect } from "vitest";
import {
  ALL_PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getPermissionsForRole,
  roleHasPermission,
  canManageRole,
  groupPermissionsByCategory,
  PERMISSION_DESCRIPTIONS,
  ROLE_DESCRIPTIONS,
  CATEGORY_LABELS,
} from "@/lib/permissions";

describe("Permission System", () => {
  describe("ALL_PERMISSIONS", () => {
    it("should contain organization permissions", () => {
      expect(ALL_PERMISSIONS).toContain("org:read");
      expect(ALL_PERMISSIONS).toContain("org:update");
      expect(ALL_PERMISSIONS).toContain("org:delete");
      expect(ALL_PERMISSIONS).toContain("org:billing");
    });

    it("should contain member permissions", () => {
      expect(ALL_PERMISSIONS).toContain("members:read");
      expect(ALL_PERMISSIONS).toContain("members:invite");
      expect(ALL_PERMISSIONS).toContain("members:remove");
      expect(ALL_PERMISSIONS).toContain("members:role");
    });

    it("should contain compliance permissions", () => {
      expect(ALL_PERMISSIONS).toContain("compliance:read");
      expect(ALL_PERMISSIONS).toContain("compliance:write");
      expect(ALL_PERMISSIONS).toContain("compliance:delete");
    });

    it("should contain report permissions", () => {
      expect(ALL_PERMISSIONS).toContain("reports:read");
      expect(ALL_PERMISSIONS).toContain("reports:generate");
      expect(ALL_PERMISSIONS).toContain("reports:submit");
      expect(ALL_PERMISSIONS).toContain("reports:delete");
    });

    it("should contain audit permissions", () => {
      expect(ALL_PERMISSIONS).toContain("audit:read");
      expect(ALL_PERMISSIONS).toContain("audit:export");
    });

    it("should contain spacecraft permissions", () => {
      expect(ALL_PERMISSIONS).toContain("spacecraft:read");
      expect(ALL_PERMISSIONS).toContain("spacecraft:write");
      expect(ALL_PERMISSIONS).toContain("spacecraft:delete");
    });

    it("should contain document permissions", () => {
      expect(ALL_PERMISSIONS).toContain("documents:read");
      expect(ALL_PERMISSIONS).toContain("documents:write");
      expect(ALL_PERMISSIONS).toContain("documents:delete");
    });

    it("should contain incident permissions", () => {
      expect(ALL_PERMISSIONS).toContain("incidents:read");
      expect(ALL_PERMISSIONS).toContain("incidents:write");
      expect(ALL_PERMISSIONS).toContain("incidents:manage");
    });

    it("should contain API permissions", () => {
      expect(ALL_PERMISSIONS).toContain("api:read");
      expect(ALL_PERMISSIONS).toContain("api:manage");
    });
  });

  describe("ROLE_PERMISSIONS", () => {
    it("should give OWNER full access", () => {
      expect(ROLE_PERMISSIONS.OWNER).toContain("*");
    });

    it("should give ADMIN most permissions except org:delete", () => {
      expect(ROLE_PERMISSIONS.ADMIN).toContain("org:read");
      expect(ROLE_PERMISSIONS.ADMIN).toContain("org:update");
      expect(ROLE_PERMISSIONS.ADMIN).toContain("org:billing");
      expect(ROLE_PERMISSIONS.ADMIN).not.toContain("org:delete");
    });

    it("should give MANAGER compliance and report permissions", () => {
      expect(ROLE_PERMISSIONS.MANAGER).toContain("compliance:read");
      expect(ROLE_PERMISSIONS.MANAGER).toContain("compliance:write");
      expect(ROLE_PERMISSIONS.MANAGER).toContain("reports:read");
      expect(ROLE_PERMISSIONS.MANAGER).toContain("reports:generate");
    });

    it("should give MEMBER limited write permissions", () => {
      expect(ROLE_PERMISSIONS.MEMBER).toContain("compliance:read");
      expect(ROLE_PERMISSIONS.MEMBER).toContain("compliance:write");
      expect(ROLE_PERMISSIONS.MEMBER).toContain("documents:write");
      expect(ROLE_PERMISSIONS.MEMBER).not.toContain("members:invite");
    });

    it("should give VIEWER read-only permissions", () => {
      expect(ROLE_PERMISSIONS.VIEWER).toContain("org:read");
      expect(ROLE_PERMISSIONS.VIEWER).toContain("compliance:read");
      expect(ROLE_PERMISSIONS.VIEWER).toContain("reports:read");
      expect(ROLE_PERMISSIONS.VIEWER).not.toContain("compliance:write");
      expect(ROLE_PERMISSIONS.VIEWER).not.toContain("reports:generate");
    });
  });

  describe("hasPermission", () => {
    it("should return true for wildcard permission", () => {
      expect(hasPermission(["*"], "org:read")).toBe(true);
      expect(hasPermission(["*"], "any:permission")).toBe(true);
    });

    it("should return true for direct permission match", () => {
      expect(hasPermission(["org:read", "org:update"], "org:read")).toBe(true);
    });

    it("should return false for missing permission", () => {
      expect(hasPermission(["org:read"], "org:update")).toBe(false);
    });

    it("should return true for category wildcard", () => {
      expect(hasPermission(["org:*"], "org:read")).toBe(true);
      expect(hasPermission(["org:*"], "org:update")).toBe(true);
      expect(hasPermission(["org:*"], "org:delete")).toBe(true);
    });

    it("should return false for non-matching category wildcard", () => {
      expect(hasPermission(["org:*"], "members:read")).toBe(false);
    });

    it("should handle empty permissions array", () => {
      expect(hasPermission([], "org:read")).toBe(false);
    });
  });

  describe("hasAllPermissions", () => {
    it("should return true when all permissions are present", () => {
      const userPermissions = ["org:read", "org:update", "members:read"];
      expect(
        hasAllPermissions(userPermissions, ["org:read", "org:update"]),
      ).toBe(true);
    });

    it("should return false when some permissions are missing", () => {
      const userPermissions = ["org:read"];
      expect(
        hasAllPermissions(userPermissions, ["org:read", "org:update"]),
      ).toBe(false);
    });

    it("should return true for empty required permissions", () => {
      expect(hasAllPermissions(["org:read"], [])).toBe(true);
    });

    it("should work with wildcard permission", () => {
      expect(hasAllPermissions(["*"], ["org:read", "members:invite"])).toBe(
        true,
      );
    });
  });

  describe("hasAnyPermission", () => {
    it("should return true when at least one permission is present", () => {
      const userPermissions = ["org:read"];
      expect(
        hasAnyPermission(userPermissions, ["org:read", "org:update"]),
      ).toBe(true);
    });

    it("should return false when no permissions match", () => {
      const userPermissions = ["members:read"];
      expect(
        hasAnyPermission(userPermissions, ["org:read", "org:update"]),
      ).toBe(false);
    });

    it("should return false for empty required permissions", () => {
      expect(hasAnyPermission(["org:read"], [])).toBe(false);
    });

    it("should work with wildcard permission", () => {
      expect(hasAnyPermission(["*"], ["org:read"])).toBe(true);
    });
  });

  describe("getPermissionsForRole", () => {
    it("should return OWNER permissions", () => {
      const perms = getPermissionsForRole("OWNER");
      expect(perms).toContain("*");
    });

    it("should return ADMIN permissions", () => {
      const perms = getPermissionsForRole("ADMIN");
      expect(perms).toContain("org:read");
      expect(perms).toContain("members:invite");
    });

    it("should return VIEWER permissions", () => {
      const perms = getPermissionsForRole("VIEWER");
      expect(perms).toContain("compliance:read");
      expect(perms).not.toContain("compliance:write");
    });

    it("should return empty array for unknown role", () => {
      const perms = getPermissionsForRole("UNKNOWN" as any);
      expect(perms).toEqual([]);
    });
  });

  describe("roleHasPermission", () => {
    it("should return true for OWNER with any permission", () => {
      expect(roleHasPermission("OWNER", "org:delete")).toBe(true);
      expect(roleHasPermission("OWNER", "random:permission")).toBe(true);
    });

    it("should return true for role with specific permission", () => {
      expect(roleHasPermission("ADMIN", "members:invite")).toBe(true);
    });

    it("should return false for role without permission", () => {
      expect(roleHasPermission("VIEWER", "compliance:write")).toBe(false);
    });
  });

  describe("canManageRole", () => {
    it("should allow OWNER to manage any role", () => {
      expect(canManageRole("OWNER", "OWNER")).toBe(true);
      expect(canManageRole("OWNER", "ADMIN")).toBe(true);
      expect(canManageRole("OWNER", "MEMBER")).toBe(true);
      expect(canManageRole("OWNER", "VIEWER")).toBe(true);
    });

    it("should not allow non-OWNER to manage OWNER", () => {
      expect(canManageRole("ADMIN", "OWNER")).toBe(false);
      expect(canManageRole("MANAGER", "OWNER")).toBe(false);
      expect(canManageRole("MEMBER", "OWNER")).toBe(false);
    });

    it("should allow ADMIN to manage lower roles", () => {
      expect(canManageRole("ADMIN", "ADMIN")).toBe(true);
      expect(canManageRole("ADMIN", "MANAGER")).toBe(true);
      expect(canManageRole("ADMIN", "MEMBER")).toBe(true);
      expect(canManageRole("ADMIN", "VIEWER")).toBe(true);
    });

    it("should allow MANAGER to manage same level and below", () => {
      expect(canManageRole("MANAGER", "MANAGER")).toBe(true);
      expect(canManageRole("MANAGER", "MEMBER")).toBe(true);
      expect(canManageRole("MANAGER", "VIEWER")).toBe(true);
    });

    it("should not allow lower roles to manage higher roles", () => {
      expect(canManageRole("MEMBER", "ADMIN")).toBe(false);
      expect(canManageRole("VIEWER", "MEMBER")).toBe(false);
    });
  });

  describe("groupPermissionsByCategory", () => {
    it("should group permissions correctly", () => {
      const groups = groupPermissionsByCategory();

      expect(groups.org).toContain("org:read");
      expect(groups.org).toContain("org:update");
      expect(groups.members).toContain("members:invite");
      expect(groups.compliance).toContain("compliance:write");
      expect(groups.reports).toContain("reports:generate");
    });

    it("should have all categories", () => {
      const groups = groupPermissionsByCategory();

      expect(groups).toHaveProperty("org");
      expect(groups).toHaveProperty("members");
      expect(groups).toHaveProperty("compliance");
      expect(groups).toHaveProperty("reports");
      expect(groups).toHaveProperty("audit");
      expect(groups).toHaveProperty("settings");
      expect(groups).toHaveProperty("spacecraft");
      expect(groups).toHaveProperty("documents");
      expect(groups).toHaveProperty("incidents");
      expect(groups).toHaveProperty("api");
    });
  });

  describe("PERMISSION_DESCRIPTIONS", () => {
    it("should have descriptions for all permissions", () => {
      for (const permission of ALL_PERMISSIONS) {
        expect(PERMISSION_DESCRIPTIONS[permission]).toBeDefined();
        expect(typeof PERMISSION_DESCRIPTIONS[permission]).toBe("string");
      }
    });

    it("should have wildcard description", () => {
      expect(PERMISSION_DESCRIPTIONS["*"]).toBe("Full access to all features");
    });
  });

  describe("ROLE_DESCRIPTIONS", () => {
    it("should have descriptions for all roles", () => {
      const roles = ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"];

      for (const role of roles) {
        expect(
          ROLE_DESCRIPTIONS[role as keyof typeof ROLE_DESCRIPTIONS],
        ).toBeDefined();
        expect(
          ROLE_DESCRIPTIONS[role as keyof typeof ROLE_DESCRIPTIONS].label,
        ).toBeDefined();
        expect(
          ROLE_DESCRIPTIONS[role as keyof typeof ROLE_DESCRIPTIONS].description,
        ).toBeDefined();
        expect(
          typeof ROLE_DESCRIPTIONS[role as keyof typeof ROLE_DESCRIPTIONS]
            .level,
        ).toBe("number");
      }
    });

    it("should have correct role hierarchy levels", () => {
      expect(ROLE_DESCRIPTIONS.OWNER.level).toBeLessThan(
        ROLE_DESCRIPTIONS.ADMIN.level,
      );
      expect(ROLE_DESCRIPTIONS.ADMIN.level).toBeLessThan(
        ROLE_DESCRIPTIONS.MANAGER.level,
      );
      expect(ROLE_DESCRIPTIONS.MANAGER.level).toBeLessThan(
        ROLE_DESCRIPTIONS.MEMBER.level,
      );
      expect(ROLE_DESCRIPTIONS.MEMBER.level).toBeLessThan(
        ROLE_DESCRIPTIONS.VIEWER.level,
      );
    });
  });

  describe("CATEGORY_LABELS", () => {
    it("should have labels for all categories", () => {
      expect(CATEGORY_LABELS.org).toBe("Organization");
      expect(CATEGORY_LABELS.members).toBe("Team Members");
      expect(CATEGORY_LABELS.compliance).toBe("Compliance");
      expect(CATEGORY_LABELS.reports).toBe("Reports");
      expect(CATEGORY_LABELS.audit).toBe("Audit Trail");
      expect(CATEGORY_LABELS.settings).toBe("Settings");
      expect(CATEGORY_LABELS.spacecraft).toBe("Spacecraft");
      expect(CATEGORY_LABELS.documents).toBe("Documents");
      expect(CATEGORY_LABELS.incidents).toBe("Incidents");
      expect(CATEGORY_LABELS.api).toBe("API Access");
    });
  });
});
