/**
 * Organization Service
 * Manages multi-tenant organizations, members, and invitations
 */

import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import crypto from "crypto";
import type {
  Organization,
  OrganizationMember,
  OrganizationInvitation,
  OrganizationPlan,
  OrganizationRole,
  Prisma,
} from "@prisma/client";

// ─── Types ───

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor?: string;
  timezone?: string;
  defaultLanguage?: string;
  billingEmail?: string;
  vatNumber?: string;
}

export interface UpdateOrganizationInput {
  name?: string;
  logoUrl?: string;
  primaryColor?: string;
  timezone?: string;
  defaultLanguage?: string;
  plan?: OrganizationPlan;
  planExpiresAt?: Date;
  maxUsers?: number;
  maxSpacecraft?: number;
  billingEmail?: string;
  vatNumber?: string;
  billingAddress?: Record<string, unknown>;
  isActive?: boolean;
}

export interface OrganizationWithMembers extends Organization {
  members: (OrganizationMember & {
    user: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
    };
  })[];
  _count: {
    members: number;
    spacecraft: number;
    invitations: number;
  };
}

export interface InviteMemberInput {
  email: string;
  role?: OrganizationRole;
}

// ─── Slug Utilities ───

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

export async function isSlugAvailable(slug: string): Promise<boolean> {
  const existing = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true },
  });
  return !existing;
}

export async function generateUniqueSlug(name: string): Promise<string> {
  let slug = generateSlug(name);
  let suffix = 0;

  while (!(await isSlugAvailable(slug))) {
    suffix++;
    slug = `${generateSlug(name)}-${suffix}`;
  }

  return slug;
}

// ─── Organization CRUD ───

export async function createOrganization(
  userId: string,
  input: CreateOrganizationInput,
): Promise<Organization> {
  // Check slug availability
  if (!(await isSlugAvailable(input.slug))) {
    throw new Error("Organization slug is already taken");
  }

  // Create organization and add creator as owner in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: input.name,
        slug: input.slug,
        logoUrl: input.logoUrl,
        primaryColor: input.primaryColor,
        timezone: input.timezone || "Europe/Berlin",
        defaultLanguage: input.defaultLanguage || "en",
        billingEmail: input.billingEmail,
        vatNumber: input.vatNumber,
      },
    });

    // Add creator as owner
    await tx.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId,
        role: "OWNER",
        permissions: ["*"], // Full permissions
      },
    });

    return organization;
  });

  // Log audit event
  await logAuditEvent({
    userId,
    action: "organization_created",
    entityType: "organization",
    entityId: result.id,
    description: `Created organization "${result.name}"`,
    newValue: { name: result.name, slug: result.slug },
  });

  return result;
}

export async function getOrganization(
  organizationId: string,
): Promise<OrganizationWithMembers | null> {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      },
      _count: {
        select: {
          members: true,
          spacecraft: true,
          invitations: true,
        },
      },
    },
  });
}

export async function getOrganizationBySlug(
  slug: string,
): Promise<OrganizationWithMembers | null> {
  return prisma.organization.findUnique({
    where: { slug },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      },
      _count: {
        select: {
          members: true,
          spacecraft: true,
          invitations: true,
        },
      },
    },
  });
}

export async function updateOrganization(
  organizationId: string,
  userId: string,
  input: UpdateOrganizationInput,
): Promise<Organization> {
  // Get previous state for audit
  const previous = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  const data: Prisma.OrganizationUpdateInput = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.logoUrl !== undefined) data.logoUrl = input.logoUrl;
  if (input.primaryColor !== undefined) data.primaryColor = input.primaryColor;
  if (input.timezone !== undefined) data.timezone = input.timezone;
  if (input.defaultLanguage !== undefined)
    data.defaultLanguage = input.defaultLanguage;
  if (input.plan !== undefined) data.plan = input.plan;
  if (input.planExpiresAt !== undefined)
    data.planExpiresAt = input.planExpiresAt;
  if (input.maxUsers !== undefined) data.maxUsers = input.maxUsers;
  if (input.maxSpacecraft !== undefined)
    data.maxSpacecraft = input.maxSpacecraft;
  if (input.billingEmail !== undefined) data.billingEmail = input.billingEmail;
  if (input.vatNumber !== undefined) data.vatNumber = input.vatNumber;
  if (input.billingAddress !== undefined)
    data.billingAddress = input.billingAddress as Prisma.InputJsonValue;
  if (input.isActive !== undefined) data.isActive = input.isActive;

  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data,
  });

  // Log audit event
  await logAuditEvent({
    userId,
    action: "organization_updated",
    entityType: "organization",
    entityId: organizationId,
    description: `Updated organization "${updated.name}"`,
    previousValue: previous,
    newValue: updated,
  });

  return updated;
}

export async function deleteOrganization(
  organizationId: string,
  userId: string,
): Promise<void> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true, slug: true },
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  // Soft delete by setting isActive to false
  await prisma.organization.update({
    where: { id: organizationId },
    data: { isActive: false },
  });

  // Log audit event
  await logAuditEvent({
    userId,
    action: "organization_deleted",
    entityType: "organization",
    entityId: organizationId,
    description: `Deleted organization "${organization.name}"`,
    previousValue: { name: organization.name, slug: organization.slug },
  });
}

// ─── User Organizations ───

export async function getUserOrganizations(userId: string): Promise<
  (OrganizationMember & {
    organization: Organization & {
      _count: { members: number; spacecraft: number };
    };
  })[]
> {
  return prisma.organizationMember.findMany({
    where: {
      userId,
      organization: { isActive: true },
    },
    include: {
      organization: {
        include: {
          _count: {
            select: {
              members: true,
              spacecraft: true,
            },
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });
}

export async function getUserRole(
  organizationId: string,
  userId: string,
): Promise<OrganizationRole | null> {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId, userId },
    },
    select: { role: true },
  });

  return membership?.role || null;
}

// ─── Member Management ───

export async function addMember(
  organizationId: string,
  userId: string,
  role: OrganizationRole,
  invitedBy?: string,
): Promise<OrganizationMember> {
  // Check organization limits
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      maxUsers: true,
      name: true,
      _count: { select: { members: true } },
    },
  });

  if (!org) {
    throw new Error("Organization not found");
  }

  if (org._count.members >= org.maxUsers) {
    throw new Error(
      `Organization has reached maximum user limit (${org.maxUsers})`,
    );
  }

  // Check if user is already a member
  const existing = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId, userId },
    },
  });

  if (existing) {
    throw new Error("User is already a member of this organization");
  }

  const member = await prisma.organizationMember.create({
    data: {
      organizationId,
      userId,
      role,
      invitedBy,
      permissions: getDefaultPermissionsForRole(role),
    },
  });

  // Log audit event
  if (invitedBy) {
    await logAuditEvent({
      userId: invitedBy,
      action: "member_added",
      entityType: "organization",
      entityId: organizationId,
      description: `Added member to organization "${org.name}" with role ${role}`,
      newValue: { userId, role },
    });
  }

  return member;
}

export async function updateMemberRole(
  organizationId: string,
  targetUserId: string,
  newRole: OrganizationRole,
  actingUserId: string,
): Promise<OrganizationMember> {
  // Get current membership
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId, userId: targetUserId },
    },
  });

  if (!membership) {
    throw new Error("User is not a member of this organization");
  }

  const previousRole = membership.role;

  // Prevent removing the last owner
  if (membership.role === "OWNER" && newRole !== "OWNER") {
    const ownerCount = await prisma.organizationMember.count({
      where: { organizationId, role: "OWNER" },
    });

    if (ownerCount <= 1) {
      throw new Error(
        "Cannot change role: organization must have at least one owner",
      );
    }
  }

  const updated = await prisma.organizationMember.update({
    where: {
      organizationId_userId: { organizationId, userId: targetUserId },
    },
    data: {
      role: newRole,
      permissions: getDefaultPermissionsForRole(newRole),
    },
  });

  // Log audit event
  await logAuditEvent({
    userId: actingUserId,
    action: "member_role_updated",
    entityType: "organization",
    entityId: organizationId,
    description: `Changed member role from ${previousRole} to ${newRole}`,
    previousValue: { userId: targetUserId, role: previousRole },
    newValue: { userId: targetUserId, role: newRole },
  });

  return updated;
}

export async function removeMember(
  organizationId: string,
  targetUserId: string,
  actingUserId: string,
): Promise<void> {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId, userId: targetUserId },
    },
    include: {
      organization: { select: { name: true } },
      user: { select: { name: true, email: true } },
    },
  });

  if (!membership) {
    throw new Error("User is not a member of this organization");
  }

  // Prevent removing the last owner
  if (membership.role === "OWNER") {
    const ownerCount = await prisma.organizationMember.count({
      where: { organizationId, role: "OWNER" },
    });

    if (ownerCount <= 1) {
      throw new Error(
        "Cannot remove: organization must have at least one owner",
      );
    }
  }

  await prisma.organizationMember.delete({
    where: {
      organizationId_userId: { organizationId, userId: targetUserId },
    },
  });

  // Log audit event
  await logAuditEvent({
    userId: actingUserId,
    action: "member_removed",
    entityType: "organization",
    entityId: organizationId,
    description: `Removed ${membership.user.name || membership.user.email} from organization "${membership.organization.name}"`,
    previousValue: {
      userId: targetUserId,
      role: membership.role,
      name: membership.user.name,
    },
  });
}

// ─── Invitations ───

export async function createInvitation(
  organizationId: string,
  input: InviteMemberInput,
  invitedBy: string,
): Promise<OrganizationInvitation> {
  // Check if email is already a member
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existingUser) {
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: existingUser.id,
        },
      },
    });

    if (existingMember) {
      throw new Error("User is already a member of this organization");
    }
  }

  // Check for existing pending invitation
  const existingInvitation = await prisma.organizationInvitation.findFirst({
    where: {
      organizationId,
      email: input.email,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (existingInvitation) {
    throw new Error("An invitation has already been sent to this email");
  }

  // Generate secure token
  const token = crypto.randomBytes(32).toString("hex");

  // Set expiration to 7 days from now
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invitation = await prisma.organizationInvitation.create({
    data: {
      organizationId,
      email: input.email,
      role: input.role || "MEMBER",
      token,
      invitedBy,
      expiresAt,
    },
    include: {
      organization: { select: { name: true } },
    },
  });

  // Log audit event
  await logAuditEvent({
    userId: invitedBy,
    action: "invitation_created",
    entityType: "organization",
    entityId: organizationId,
    description: `Invited ${input.email} to organization as ${input.role || "MEMBER"}`,
    newValue: { email: input.email, role: input.role || "MEMBER" },
  });

  return invitation;
}

export async function getInvitation(token: string): Promise<
  | (OrganizationInvitation & {
      organization: { id: string; name: string; logoUrl: string | null };
    })
  | null
> {
  return prisma.organizationInvitation.findUnique({
    where: { token },
    include: {
      organization: {
        select: { id: true, name: true, logoUrl: true },
      },
    },
  });
}

export async function getOrganizationInvitations(
  organizationId: string,
): Promise<OrganizationInvitation[]> {
  return prisma.organizationInvitation.findMany({
    where: {
      organizationId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function acceptInvitation(
  token: string,
  userId: string,
): Promise<OrganizationMember> {
  const invitation = await prisma.organizationInvitation.findUnique({
    where: { token },
    include: {
      organization: { select: { id: true, name: true } },
    },
  });

  if (!invitation) {
    throw new Error("Invalid invitation token");
  }

  if (invitation.acceptedAt) {
    throw new Error("Invitation has already been accepted");
  }

  if (invitation.expiresAt < new Date()) {
    throw new Error("Invitation has expired");
  }

  // Use transaction to accept invitation and add member
  const result = await prisma.$transaction(async (tx) => {
    // Mark invitation as accepted
    await tx.organizationInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    // Add user as member
    return tx.organizationMember.create({
      data: {
        organizationId: invitation.organizationId,
        userId,
        role: invitation.role,
        invitedBy: invitation.invitedBy,
        permissions: getDefaultPermissionsForRole(invitation.role),
      },
    });
  });

  // Log audit event
  await logAuditEvent({
    userId,
    action: "invitation_accepted",
    entityType: "organization",
    entityId: invitation.organizationId,
    description: `Accepted invitation to join "${invitation.organization.name}"`,
    newValue: { role: invitation.role },
  });

  return result;
}

export async function cancelInvitation(
  invitationId: string,
  actingUserId: string,
): Promise<void> {
  const invitation = await prisma.organizationInvitation.findUnique({
    where: { id: invitationId },
    include: {
      organization: { select: { id: true, name: true } },
    },
  });

  if (!invitation) {
    throw new Error("Invitation not found");
  }

  await prisma.organizationInvitation.delete({
    where: { id: invitationId },
  });

  // Log audit event
  await logAuditEvent({
    userId: actingUserId,
    action: "invitation_cancelled",
    entityType: "organization",
    entityId: invitation.organizationId,
    description: `Cancelled invitation for ${invitation.email}`,
    previousValue: { email: invitation.email, role: invitation.role },
  });
}

export async function resendInvitation(
  invitationId: string,
  actingUserId: string,
): Promise<OrganizationInvitation> {
  const invitation = await prisma.organizationInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    throw new Error("Invitation not found");
  }

  if (invitation.acceptedAt) {
    throw new Error("Invitation has already been accepted");
  }

  // Generate new token and extend expiration
  const newToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const updated = await prisma.organizationInvitation.update({
    where: { id: invitationId },
    data: {
      token: newToken,
      expiresAt,
    },
    include: {
      organization: { select: { name: true } },
    },
  });

  // Log audit event
  await logAuditEvent({
    userId: actingUserId,
    action: "invitation_resent",
    entityType: "organization",
    entityId: invitation.organizationId,
    description: `Resent invitation to ${invitation.email}`,
  });

  return updated;
}

// ─── Permission Helpers ───

export function getDefaultPermissionsForRole(role: OrganizationRole): string[] {
  const permissions: Record<OrganizationRole, string[]> = {
    OWNER: ["*"], // Full access
    ADMIN: [
      "org:read",
      "org:update",
      "org:billing",
      "members:read",
      "members:invite",
      "members:remove",
      "members:role",
      "compliance:read",
      "compliance:write",
      "compliance:delete",
      "reports:read",
      "reports:generate",
      "reports:submit",
      "audit:read",
      "audit:export",
      "settings:read",
      "settings:write",
      "spacecraft:read",
      "spacecraft:write",
      "spacecraft:delete",
    ],
    MANAGER: [
      "org:read",
      "members:read",
      "compliance:read",
      "compliance:write",
      "compliance:delete",
      "reports:read",
      "reports:generate",
      "reports:submit",
      "audit:read",
      "settings:read",
      "spacecraft:read",
      "spacecraft:write",
    ],
    MEMBER: [
      "org:read",
      "compliance:read",
      "compliance:write",
      "reports:read",
      "settings:read",
      "spacecraft:read",
    ],
    VIEWER: ["org:read", "compliance:read", "reports:read", "spacecraft:read"],
  };

  return permissions[role] || [];
}

export function hasPermission(
  userPermissions: string[],
  requiredPermission: string,
): boolean {
  // Full access check
  if (userPermissions.includes("*")) return true;

  // Direct permission check
  if (userPermissions.includes(requiredPermission)) return true;

  // Wildcard permission check (e.g., "compliance:*" for "compliance:read")
  const [category] = requiredPermission.split(":");
  if (userPermissions.includes(`${category}:*`)) return true;

  return false;
}

// ─── Plan Limits ───

export interface PlanLimits {
  maxUsers: number;
  maxSpacecraft: number;
  features: string[];
}

export function getPlanLimits(plan: OrganizationPlan): PlanLimits {
  const limits: Record<OrganizationPlan, PlanLimits> = {
    FREE: {
      maxUsers: 3,
      maxSpacecraft: 5,
      features: ["basic_compliance", "manual_reports"],
    },
    STARTER: {
      maxUsers: 10,
      maxSpacecraft: 20,
      features: [
        "basic_compliance",
        "manual_reports",
        "scheduled_reports",
        "document_storage",
      ],
    },
    PROFESSIONAL: {
      maxUsers: 50,
      maxSpacecraft: 100,
      features: [
        "basic_compliance",
        "manual_reports",
        "scheduled_reports",
        "document_storage",
        "api_access",
        "webhooks",
        "custom_branding",
      ],
    },
    ENTERPRISE: {
      maxUsers: -1, // Unlimited
      maxSpacecraft: -1, // Unlimited
      features: [
        "basic_compliance",
        "manual_reports",
        "scheduled_reports",
        "document_storage",
        "api_access",
        "webhooks",
        "custom_branding",
        "sso",
        "dedicated_support",
        "custom_integrations",
      ],
    },
  };

  return limits[plan];
}

// ─── Cleanup ───

export async function cleanupExpiredInvitations(): Promise<number> {
  const result = await prisma.organizationInvitation.deleteMany({
    where: {
      acceptedAt: null,
      expiresAt: { lt: new Date() },
    },
  });

  return result.count;
}
