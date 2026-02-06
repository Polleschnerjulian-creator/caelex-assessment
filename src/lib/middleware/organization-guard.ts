/**
 * Organization Guard Middleware
 * Protects organization routes and verifies membership/permissions
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { OrganizationRole } from "@prisma/client";
import { hasPermission, type Permission } from "@/lib/permissions";

// ─── Types ───

export interface OrganizationContext {
  userId: string;
  organizationId: string;
  role: OrganizationRole;
  permissions: string[];
  organization: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    isActive: boolean;
  };
}

export interface GuardOptions {
  requiredPermissions?: Permission[];
  requireAny?: boolean; // If true, only one permission is required
  allowInactive?: boolean; // Allow access to inactive organizations
}

type ApiHandler<T = unknown> = (
  request: Request,
  context: { params: Promise<T>; org: OrganizationContext },
) => Promise<NextResponse>;

// ─── Helper Functions ───

/**
 * Get organization membership for a user
 */
export async function getOrganizationMembership(
  organizationId: string,
  userId: string,
): Promise<OrganizationContext | null> {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId, userId },
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          isActive: true,
        },
      },
    },
  });

  if (!membership) {
    return null;
  }

  return {
    userId,
    organizationId,
    role: membership.role,
    permissions: membership.permissions,
    organization: membership.organization,
  };
}

/**
 * Verify user has access to an organization with required permissions
 */
export async function verifyOrganizationAccess(
  organizationId: string,
  userId: string,
  options: GuardOptions = {},
): Promise<
  | { success: true; context: OrganizationContext }
  | { success: false; error: string; status: number }
> {
  const membership = await getOrganizationMembership(organizationId, userId);

  if (!membership) {
    return {
      success: false,
      error: "You are not a member of this organization",
      status: 403,
    };
  }

  // Check if organization is active
  if (!membership.organization.isActive && !options.allowInactive) {
    return {
      success: false,
      error: "This organization has been deactivated",
      status: 403,
    };
  }

  // Check permissions if required
  if (options.requiredPermissions && options.requiredPermissions.length > 0) {
    const hasAccess = options.requireAny
      ? options.requiredPermissions.some((perm) =>
          hasPermission(membership.permissions, perm),
        )
      : options.requiredPermissions.every((perm) =>
          hasPermission(membership.permissions, perm),
        );

    if (!hasAccess) {
      return {
        success: false,
        error: "You don't have permission to perform this action",
        status: 403,
      };
    }
  }

  return { success: true, context: membership };
}

// ─── Route Handler Wrappers ───

/**
 * Wrap an API route handler with organization guard
 */
export function withOrganizationGuard<P extends { orgId: string }>(
  handler: ApiHandler<P>,
  options: GuardOptions = {},
) {
  return async (
    request: Request,
    { params }: { params: Promise<P> },
  ): Promise<NextResponse> => {
    try {
      // Authenticate user
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Get organization ID from params
      const resolvedParams = await params;
      const organizationId = resolvedParams.orgId;

      if (!organizationId) {
        return NextResponse.json(
          { error: "Organization ID is required" },
          { status: 400 },
        );
      }

      // Verify access
      const result = await verifyOrganizationAccess(
        organizationId,
        session.user.id,
        options,
      );

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status },
        );
      }

      // Call the handler with organization context
      return handler(request, {
        params: Promise.resolve(resolvedParams),
        org: result.context,
      });
    } catch (error) {
      console.error("Organization guard error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}

/**
 * Create a permission-checking middleware for specific permissions
 */
export function requirePermissions(...permissions: Permission[]) {
  return <P extends { orgId: string }>(handler: ApiHandler<P>) =>
    withOrganizationGuard(handler, { requiredPermissions: permissions });
}

/**
 * Create a middleware that requires any of the specified permissions
 */
export function requireAnyPermission(...permissions: Permission[]) {
  return <P extends { orgId: string }>(handler: ApiHandler<P>) =>
    withOrganizationGuard(handler, {
      requiredPermissions: permissions,
      requireAny: true,
    });
}

// ─── Role-Based Guards ───

/**
 * Require specific roles (convenience wrapper)
 */
export function requireRole(...roles: OrganizationRole[]) {
  return <P extends { orgId: string }>(
    handler: ApiHandler<P>,
    options: GuardOptions = {},
  ) => {
    return async (
      request: Request,
      { params }: { params: Promise<P> },
    ): Promise<NextResponse> => {
      try {
        const session = await auth();
        if (!session?.user?.id) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const organizationId = resolvedParams.orgId;

        if (!organizationId) {
          return NextResponse.json(
            { error: "Organization ID is required" },
            { status: 400 },
          );
        }

        const result = await verifyOrganizationAccess(
          organizationId,
          session.user.id,
          options,
        );

        if (!result.success) {
          return NextResponse.json(
            { error: result.error },
            { status: result.status },
          );
        }

        // Check role
        if (!roles.includes(result.context.role)) {
          return NextResponse.json(
            {
              error: `This action requires one of these roles: ${roles.join(", ")}`,
            },
            { status: 403 },
          );
        }

        return handler(request, {
          params: Promise.resolve(resolvedParams),
          org: result.context,
        });
      } catch (error) {
        console.error("Role guard error:", error);
        return NextResponse.json(
          { error: "Internal server error" },
          { status: 500 },
        );
      }
    };
  };
}

// ─── Utility Functions ───

/**
 * Get the current user's organization context from a request
 * Useful for client-side context
 */
export async function getCurrentOrganization(
  userId: string,
  preferredOrgId?: string,
): Promise<OrganizationContext | null> {
  // If preferred org ID is provided, try to get that
  if (preferredOrgId) {
    const membership = await getOrganizationMembership(preferredOrgId, userId);
    if (membership && membership.organization.isActive) {
      return membership;
    }
  }

  // Otherwise, get the first active organization
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId,
      organization: { isActive: true },
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          isActive: true,
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  if (!membership) {
    return null;
  }

  return {
    userId,
    organizationId: membership.organizationId,
    role: membership.role,
    permissions: membership.permissions,
    organization: membership.organization,
  };
}

/**
 * Check if user is owner of organization
 */
export async function isOrganizationOwner(
  organizationId: string,
  userId: string,
): Promise<boolean> {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId, userId },
    },
    select: { role: true },
  });

  return membership?.role === "OWNER";
}

/**
 * Check if user has any membership in the organization
 */
export async function isOrganizationMember(
  organizationId: string,
  userId: string,
): Promise<boolean> {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId, userId },
    },
    select: { id: true },
  });

  return !!membership;
}
