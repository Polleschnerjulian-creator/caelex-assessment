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
  // ═══════════════════════════════════════════════════════════════
  // ALL_PERMISSIONS — Exhaustive Category Checks
  // ═══════════════════════════════════════════════════════════════

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

    it("should contain settings permissions", () => {
      expect(ALL_PERMISSIONS).toContain("settings:read");
      expect(ALL_PERMISSIONS).toContain("settings:write");
    });

    it("should contain network permissions", () => {
      expect(ALL_PERMISSIONS).toContain("network:read");
      expect(ALL_PERMISSIONS).toContain("network:write");
      expect(ALL_PERMISSIONS).toContain("network:manage");
      expect(ALL_PERMISSIONS).toContain("network:attest");
    });

    it("should have a reasonable total count", () => {
      // Ensure we have at least 25 permissions across all categories
      expect(ALL_PERMISSIONS.length).toBeGreaterThanOrEqual(25);
    });

    it("should have unique permission strings", () => {
      const unique = new Set(ALL_PERMISSIONS);
      expect(unique.size).toBe(ALL_PERMISSIONS.length);
    });

    it("should follow category:action naming convention", () => {
      for (const perm of ALL_PERMISSIONS) {
        expect(perm).toMatch(/^[a-z]+:[a-z]+$/);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ROLE_PERMISSIONS — All 5 Roles
  // ═══════════════════════════════════════════════════════════════

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

    it("should give ADMIN member management permissions", () => {
      expect(ROLE_PERMISSIONS.ADMIN).toContain("members:read");
      expect(ROLE_PERMISSIONS.ADMIN).toContain("members:invite");
      expect(ROLE_PERMISSIONS.ADMIN).toContain("members:remove");
      expect(ROLE_PERMISSIONS.ADMIN).toContain("members:role");
    });

    it("should give ADMIN full network permissions", () => {
      expect(ROLE_PERMISSIONS.ADMIN).toContain("network:read");
      expect(ROLE_PERMISSIONS.ADMIN).toContain("network:write");
      expect(ROLE_PERMISSIONS.ADMIN).toContain("network:manage");
      expect(ROLE_PERMISSIONS.ADMIN).toContain("network:attest");
    });

    it("should give MANAGER compliance and report permissions", () => {
      expect(ROLE_PERMISSIONS.MANAGER).toContain("compliance:read");
      expect(ROLE_PERMISSIONS.MANAGER).toContain("compliance:write");
      expect(ROLE_PERMISSIONS.MANAGER).toContain("reports:read");
      expect(ROLE_PERMISSIONS.MANAGER).toContain("reports:generate");
    });

    it("should give MANAGER network read, write, and attest but not manage", () => {
      expect(ROLE_PERMISSIONS.MANAGER).toContain("network:read");
      expect(ROLE_PERMISSIONS.MANAGER).toContain("network:write");
      expect(ROLE_PERMISSIONS.MANAGER).toContain("network:attest");
      expect(ROLE_PERMISSIONS.MANAGER).not.toContain("network:manage");
    });

    it("should give MEMBER limited write permissions", () => {
      expect(ROLE_PERMISSIONS.MEMBER).toContain("compliance:read");
      expect(ROLE_PERMISSIONS.MEMBER).toContain("compliance:write");
      expect(ROLE_PERMISSIONS.MEMBER).toContain("documents:write");
      expect(ROLE_PERMISSIONS.MEMBER).not.toContain("members:invite");
    });

    it("should give MEMBER network:read only", () => {
      expect(ROLE_PERMISSIONS.MEMBER).toContain("network:read");
      expect(ROLE_PERMISSIONS.MEMBER).not.toContain("network:write");
      expect(ROLE_PERMISSIONS.MEMBER).not.toContain("network:manage");
    });

    it("should give VIEWER read-only permissions", () => {
      expect(ROLE_PERMISSIONS.VIEWER).toContain("org:read");
      expect(ROLE_PERMISSIONS.VIEWER).toContain("compliance:read");
      expect(ROLE_PERMISSIONS.VIEWER).toContain("reports:read");
      expect(ROLE_PERMISSIONS.VIEWER).not.toContain("compliance:write");
      expect(ROLE_PERMISSIONS.VIEWER).not.toContain("reports:generate");
    });

    it("should give VIEWER network:read only", () => {
      expect(ROLE_PERMISSIONS.VIEWER).toContain("network:read");
      expect(ROLE_PERMISSIONS.VIEWER).not.toContain("network:write");
      expect(ROLE_PERMISSIONS.VIEWER).not.toContain("network:manage");
      expect(ROLE_PERMISSIONS.VIEWER).not.toContain("network:attest");
    });

    it("should not give VIEWER any settings permissions", () => {
      const viewerPerms = ROLE_PERMISSIONS.VIEWER;
      const settingsPerms = viewerPerms.filter((p) =>
        p.startsWith("settings:"),
      );
      expect(settingsPerms).toHaveLength(0);
    });

    it("should have monotonically decreasing permission counts (OWNER excluded)", () => {
      // OWNER has wildcard, so compare ADMIN, MANAGER, MEMBER, VIEWER
      const adminCount = ROLE_PERMISSIONS.ADMIN.length;
      const managerCount = ROLE_PERMISSIONS.MANAGER.length;
      const memberCount = ROLE_PERMISSIONS.MEMBER.length;
      const viewerCount = ROLE_PERMISSIONS.VIEWER.length;

      expect(adminCount).toBeGreaterThanOrEqual(managerCount);
      expect(managerCount).toBeGreaterThanOrEqual(memberCount);
      expect(memberCount).toBeGreaterThanOrEqual(viewerCount);
    });

    it("should not give VIEWER any write or delete permissions", () => {
      for (const perm of ROLE_PERMISSIONS.VIEWER) {
        expect(perm).not.toMatch(/:write$/);
        expect(perm).not.toMatch(/:delete$/);
        expect(perm).not.toMatch(/:manage$/);
        expect(perm).not.toMatch(/:invite$/);
        expect(perm).not.toMatch(/:remove$/);
      }
    });

    it("should not give MEMBER any delete permissions", () => {
      for (const perm of ROLE_PERMISSIONS.MEMBER) {
        expect(perm).not.toMatch(/:delete$/);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // hasPermission
  // ═══════════════════════════════════════════════════════════════

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

    it("should handle network permissions specifically", () => {
      expect(hasPermission(["network:read"], "network:read")).toBe(true);
      expect(hasPermission(["network:read"], "network:write")).toBe(false);
      expect(hasPermission(["network:*"], "network:attest")).toBe(true);
    });

    it("should handle multiple matching permissions", () => {
      expect(
        hasPermission(["org:read", "org:update", "org:delete"], "org:update"),
      ).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // hasAllPermissions
  // ═══════════════════════════════════════════════════════════════

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

    it("should return true for single required permission present", () => {
      expect(hasAllPermissions(["org:read"], ["org:read"])).toBe(true);
    });

    it("should return false when user has empty permissions and required is not empty", () => {
      expect(hasAllPermissions([], ["org:read"])).toBe(false);
    });

    it("should return true when both empty", () => {
      expect(hasAllPermissions([], [])).toBe(true);
    });

    it("should handle network permissions", () => {
      expect(
        hasAllPermissions(
          ["network:read", "network:write", "network:attest"],
          ["network:read", "network:attest"],
        ),
      ).toBe(true);

      expect(
        hasAllPermissions(["network:read"], ["network:read", "network:manage"]),
      ).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // hasAnyPermission
  // ═══════════════════════════════════════════════════════════════

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

    it("should return false when user has empty permissions", () => {
      expect(hasAnyPermission([], ["org:read"])).toBe(false);
    });

    it("should match last permission in required list", () => {
      expect(
        hasAnyPermission(
          ["network:attest"],
          ["org:read", "members:invite", "network:attest"],
        ),
      ).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getPermissionsForRole
  // ═══════════════════════════════════════════════════════════════

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

    it("should return MANAGER permissions", () => {
      const perms = getPermissionsForRole("MANAGER");
      expect(perms).toContain("compliance:write");
      expect(perms).toContain("reports:generate");
    });

    it("should return MEMBER permissions", () => {
      const perms = getPermissionsForRole("MEMBER");
      expect(perms).toContain("compliance:read");
      expect(perms).toContain("compliance:write");
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

    it("should return empty array for null role", () => {
      const perms = getPermissionsForRole(null as any);
      expect(perms).toEqual([]);
    });

    it("should return empty array for undefined role", () => {
      const perms = getPermissionsForRole(undefined as any);
      expect(perms).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // roleHasPermission
  // ═══════════════════════════════════════════════════════════════

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

    it("should return true for ADMIN with network:manage", () => {
      expect(roleHasPermission("ADMIN", "network:manage")).toBe(true);
    });

    it("should return false for MANAGER with network:manage", () => {
      expect(roleHasPermission("MANAGER", "network:manage")).toBe(false);
    });

    it("should return true for MANAGER with network:attest", () => {
      expect(roleHasPermission("MANAGER", "network:attest")).toBe(true);
    });

    it("should return false for unknown role", () => {
      expect(roleHasPermission("UNKNOWN" as any, "org:read")).toBe(false);
    });

    it("should handle all network permissions for all roles", () => {
      // ADMIN has all network perms
      expect(roleHasPermission("ADMIN", "network:read")).toBe(true);
      expect(roleHasPermission("ADMIN", "network:write")).toBe(true);
      expect(roleHasPermission("ADMIN", "network:manage")).toBe(true);
      expect(roleHasPermission("ADMIN", "network:attest")).toBe(true);

      // MANAGER has read, write, attest but not manage
      expect(roleHasPermission("MANAGER", "network:read")).toBe(true);
      expect(roleHasPermission("MANAGER", "network:write")).toBe(true);
      expect(roleHasPermission("MANAGER", "network:manage")).toBe(false);
      expect(roleHasPermission("MANAGER", "network:attest")).toBe(true);

      // MEMBER has read only
      expect(roleHasPermission("MEMBER", "network:read")).toBe(true);
      expect(roleHasPermission("MEMBER", "network:write")).toBe(false);
      expect(roleHasPermission("MEMBER", "network:manage")).toBe(false);

      // VIEWER has read only
      expect(roleHasPermission("VIEWER", "network:read")).toBe(true);
      expect(roleHasPermission("VIEWER", "network:write")).toBe(false);
      expect(roleHasPermission("VIEWER", "network:manage")).toBe(false);
      expect(roleHasPermission("VIEWER", "network:attest")).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // canManageRole
  // ═══════════════════════════════════════════════════════════════

  describe("canManageRole", () => {
    it("should allow OWNER to manage any role", () => {
      expect(canManageRole("OWNER", "OWNER")).toBe(true);
      expect(canManageRole("OWNER", "ADMIN")).toBe(true);
      expect(canManageRole("OWNER", "MANAGER")).toBe(true);
      expect(canManageRole("OWNER", "MEMBER")).toBe(true);
      expect(canManageRole("OWNER", "VIEWER")).toBe(true);
    });

    it("should not allow non-OWNER to manage OWNER", () => {
      expect(canManageRole("ADMIN", "OWNER")).toBe(false);
      expect(canManageRole("MANAGER", "OWNER")).toBe(false);
      expect(canManageRole("MEMBER", "OWNER")).toBe(false);
      expect(canManageRole("VIEWER", "OWNER")).toBe(false);
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

    it("should not allow MANAGER to manage ADMIN", () => {
      expect(canManageRole("MANAGER", "ADMIN")).toBe(false);
    });

    it("should not allow lower roles to manage higher roles", () => {
      expect(canManageRole("MEMBER", "ADMIN")).toBe(false);
      expect(canManageRole("MEMBER", "MANAGER")).toBe(false);
      expect(canManageRole("VIEWER", "MEMBER")).toBe(false);
      expect(canManageRole("VIEWER", "ADMIN")).toBe(false);
    });

    it("should allow MEMBER to manage same level and VIEWER", () => {
      expect(canManageRole("MEMBER", "MEMBER")).toBe(true);
      expect(canManageRole("MEMBER", "VIEWER")).toBe(true);
    });

    it("should allow VIEWER to manage VIEWER", () => {
      expect(canManageRole("VIEWER", "VIEWER")).toBe(true);
    });

    it("should throw for unknown roles", () => {
      expect(() => canManageRole("UNKNOWN" as any, "VIEWER")).toThrow();
      expect(() => canManageRole("ADMIN", "UNKNOWN" as any)).toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // groupPermissionsByCategory
  // ═══════════════════════════════════════════════════════════════

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
      expect(groups).toHaveProperty("network");
    });

    it("should have network category with all network permissions", () => {
      const groups = groupPermissionsByCategory();

      expect(groups.network).toContain("network:read");
      expect(groups.network).toContain("network:write");
      expect(groups.network).toContain("network:manage");
      expect(groups.network).toContain("network:attest");
    });

    it("should include all permissions across categories", () => {
      const groups = groupPermissionsByCategory();
      const allGrouped = Object.values(groups).flat();

      for (const perm of ALL_PERMISSIONS) {
        expect(allGrouped).toContain(perm);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PERMISSION_DESCRIPTIONS
  // ═══════════════════════════════════════════════════════════════

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

    it("should have network permission descriptions", () => {
      expect(PERMISSION_DESCRIPTIONS["network:read"]).toBeDefined();
      expect(PERMISSION_DESCRIPTIONS["network:write"]).toBeDefined();
      expect(PERMISSION_DESCRIPTIONS["network:manage"]).toBeDefined();
      expect(PERMISSION_DESCRIPTIONS["network:attest"]).toBeDefined();
    });

    it("should have non-empty descriptions for all entries", () => {
      for (const [key, desc] of Object.entries(PERMISSION_DESCRIPTIONS)) {
        expect(
          desc.length,
          `Description for ${key} should be non-empty`,
        ).toBeGreaterThan(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ROLE_DESCRIPTIONS
  // ═══════════════════════════════════════════════════════════════

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

    it("should have non-empty labels and descriptions", () => {
      const roles = ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"] as const;
      for (const role of roles) {
        expect(ROLE_DESCRIPTIONS[role].label.length).toBeGreaterThan(0);
        expect(ROLE_DESCRIPTIONS[role].description.length).toBeGreaterThan(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CATEGORY_LABELS
  // ═══════════════════════════════════════════════════════════════

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

    it("should have network category label", () => {
      expect(CATEGORY_LABELS.network).toBe("Compliance Network");
    });

    it("should have labels for all categories in groupPermissionsByCategory", () => {
      const groups = groupPermissionsByCategory();
      for (const category of Object.keys(groups)) {
        expect(
          CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS],
          `Missing label for category: ${category}`,
        ).toBeDefined();
      }
    });
  });
});
