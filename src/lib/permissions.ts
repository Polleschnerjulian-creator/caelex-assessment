/**
 * Permission System
 * Centralized permission definitions and checking utilities
 */

import type { OrganizationRole } from "@prisma/client";

// ─── Permission Categories ───

export type PermissionCategory =
  | "org"
  | "members"
  | "compliance"
  | "reports"
  | "audit"
  | "settings"
  | "spacecraft"
  | "documents"
  | "incidents"
  | "api";

export type PermissionAction =
  | "read"
  | "write"
  | "delete"
  | "invite"
  | "remove"
  | "role"
  | "update"
  | "billing"
  | "generate"
  | "submit"
  | "export"
  | "manage";

export type Permission = string;

// ─── Permission Definitions ───

/**
 * Complete list of all permissions in the system
 */
export const ALL_PERMISSIONS: string[] = [
  // Organization
  "org:read",
  "org:update",
  "org:delete",
  "org:billing",

  // Members
  "members:read",
  "members:invite",
  "members:remove",
  "members:role",

  // Compliance
  "compliance:read",
  "compliance:write",
  "compliance:delete",

  // Reports
  "reports:read",
  "reports:generate",
  "reports:submit",
  "reports:delete",

  // Audit
  "audit:read",
  "audit:export",

  // Settings
  "settings:read",
  "settings:write",

  // Spacecraft
  "spacecraft:read",
  "spacecraft:write",
  "spacecraft:delete",

  // Documents
  "documents:read",
  "documents:write",
  "documents:delete",

  // Incidents
  "incidents:read",
  "incidents:write",
  "incidents:manage",

  // API
  "api:read",
  "api:manage",
];

// ─── Role Permission Matrix ───

/**
 * Default permissions for each organization role
 */
export const ROLE_PERMISSIONS: Record<OrganizationRole, string[]> = {
  OWNER: ["*"], // Full access to everything

  ADMIN: [
    // Organization
    "org:read",
    "org:update",
    "org:billing",
    // Members
    "members:read",
    "members:invite",
    "members:remove",
    "members:role",
    // Compliance
    "compliance:read",
    "compliance:write",
    "compliance:delete",
    // Reports
    "reports:read",
    "reports:generate",
    "reports:submit",
    "reports:delete",
    // Audit
    "audit:read",
    "audit:export",
    // Settings
    "settings:read",
    "settings:write",
    // Spacecraft
    "spacecraft:read",
    "spacecraft:write",
    "spacecraft:delete",
    // Documents
    "documents:read",
    "documents:write",
    "documents:delete",
    // Incidents
    "incidents:read",
    "incidents:write",
    "incidents:manage",
    // API
    "api:read",
    "api:manage",
  ],

  MANAGER: [
    // Organization
    "org:read",
    // Members
    "members:read",
    // Compliance
    "compliance:read",
    "compliance:write",
    "compliance:delete",
    // Reports
    "reports:read",
    "reports:generate",
    "reports:submit",
    // Audit
    "audit:read",
    // Settings
    "settings:read",
    // Spacecraft
    "spacecraft:read",
    "spacecraft:write",
    // Documents
    "documents:read",
    "documents:write",
    // Incidents
    "incidents:read",
    "incidents:write",
  ],

  MEMBER: [
    // Organization
    "org:read",
    // Compliance
    "compliance:read",
    "compliance:write",
    // Reports
    "reports:read",
    // Settings
    "settings:read",
    // Spacecraft
    "spacecraft:read",
    // Documents
    "documents:read",
    "documents:write",
    // Incidents
    "incidents:read",
    "incidents:write",
  ],

  VIEWER: [
    // Organization
    "org:read",
    // Compliance
    "compliance:read",
    // Reports
    "reports:read",
    // Spacecraft
    "spacecraft:read",
    // Documents
    "documents:read",
    // Incidents
    "incidents:read",
  ],
};

// ─── Permission Checking ───

/**
 * Check if a user has a specific permission
 */
export function hasPermission(
  userPermissions: string[],
  requiredPermission: string,
): boolean {
  // Full access check
  if (userPermissions.includes("*")) {
    return true;
  }

  // Direct permission check
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Wildcard category check (e.g., "compliance:*" for "compliance:read")
  const [category] = requiredPermission.split(":");
  if (userPermissions.includes(`${category}:*`)) {
    return true;
  }

  return false;
}

/**
 * Check if a user has ALL of the specified permissions
 */
export function hasAllPermissions(
  userPermissions: string[],
  requiredPermissions: string[],
): boolean {
  return requiredPermissions.every((perm) =>
    hasPermission(userPermissions, perm),
  );
}

/**
 * Check if a user has ANY of the specified permissions
 */
export function hasAnyPermission(
  userPermissions: string[],
  requiredPermissions: string[],
): boolean {
  return requiredPermissions.some((perm) =>
    hasPermission(userPermissions, perm),
  );
}

/**
 * Get permissions for a role
 */
export function getPermissionsForRole(role: OrganizationRole): string[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(
  role: OrganizationRole,
  permission: string,
): boolean {
  const permissions = getPermissionsForRole(role);
  return hasPermission(permissions, permission);
}

// ─── Permission Descriptions ───

/**
 * Human-readable descriptions for permissions
 */
export const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  "*": "Full access to all features",

  // Organization
  "org:read": "View organization details",
  "org:update": "Update organization settings",
  "org:delete": "Delete the organization",
  "org:billing": "Manage billing and subscription",

  // Members
  "members:read": "View team members",
  "members:invite": "Invite new members",
  "members:remove": "Remove members from team",
  "members:role": "Change member roles",

  // Compliance
  "compliance:read": "View compliance status",
  "compliance:write": "Update compliance data",
  "compliance:delete": "Delete compliance records",

  // Reports
  "reports:read": "View reports",
  "reports:generate": "Generate new reports",
  "reports:submit": "Submit reports to authorities",
  "reports:delete": "Delete reports",

  // Audit
  "audit:read": "View audit logs",
  "audit:export": "Export audit data",

  // Settings
  "settings:read": "View settings",
  "settings:write": "Modify settings",

  // Spacecraft
  "spacecraft:read": "View spacecraft/assets",
  "spacecraft:write": "Add or edit spacecraft",
  "spacecraft:delete": "Delete spacecraft",

  // Documents
  "documents:read": "View documents",
  "documents:write": "Upload or edit documents",
  "documents:delete": "Delete documents",

  // Incidents
  "incidents:read": "View incidents",
  "incidents:write": "Create or update incidents",
  "incidents:manage": "Manage incident lifecycle",

  // API
  "api:read": "View API keys",
  "api:manage": "Create and manage API keys",
};

// ─── Role Descriptions ───

export const ROLE_DESCRIPTIONS: Record<
  OrganizationRole,
  { label: string; description: string; level: number }
> = {
  OWNER: {
    label: "Owner",
    description: "Full access to all features including deletion",
    level: 0,
  },
  ADMIN: {
    label: "Administrator",
    description: "Manage members, settings, and all compliance features",
    level: 1,
  },
  MANAGER: {
    label: "Manager",
    description: "Manage compliance workflows, reports, and spacecraft",
    level: 2,
  },
  MEMBER: {
    label: "Member",
    description: "Work on compliance tasks and view reports",
    level: 3,
  },
  VIEWER: {
    label: "Viewer",
    description: "Read-only access to compliance data",
    level: 4,
  },
};

/**
 * Check if a role can manage another role
 * (Higher level roles can manage lower level roles)
 */
export function canManageRole(
  actingRole: OrganizationRole,
  targetRole: OrganizationRole,
): boolean {
  const actingLevel = ROLE_DESCRIPTIONS[actingRole].level;
  const targetLevel = ROLE_DESCRIPTIONS[targetRole].level;

  // Only OWNER can manage other OWNERs
  if (targetRole === "OWNER") {
    return actingRole === "OWNER";
  }

  // Can manage roles at same level or below
  return actingLevel <= targetLevel;
}

// ─── Permission Groups ───

/**
 * Group permissions by category for UI display
 */
export function groupPermissionsByCategory(): Record<
  PermissionCategory,
  string[]
> {
  const groups: Partial<Record<PermissionCategory, string[]>> = {};

  for (const permission of ALL_PERMISSIONS) {
    const [category] = permission.split(":") as [PermissionCategory, string];
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category]!.push(permission);
  }

  return groups as Record<PermissionCategory, string[]>;
}

/**
 * Category labels for UI
 */
export const CATEGORY_LABELS: Record<PermissionCategory, string> = {
  org: "Organization",
  members: "Team Members",
  compliance: "Compliance",
  reports: "Reports",
  audit: "Audit Trail",
  settings: "Settings",
  spacecraft: "Spacecraft",
  documents: "Documents",
  incidents: "Incidents",
  api: "API Access",
};
