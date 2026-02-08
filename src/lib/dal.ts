/**
 * Data Access Layer (DAL)
 *
 * CRITICAL SECURITY COMPONENT
 *
 * This module implements the DAL pattern to mitigate CVE-2025-29927 and similar
 * middleware bypass vulnerabilities. ALL database access must go through this layer
 * to ensure authentication is verified at the data layer, not just middleware.
 *
 * @see https://nextjs.org/docs/app/building-your-application/authentication#data-access-layer
 */

import { auth } from "@/lib/auth";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

// ─── Types ───

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
}

export class UnauthorizedError extends Error {
  constructor(message = "UNAUTHORIZED") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "FORBIDDEN") {
    super(message);
    this.name = "ForbiddenError";
  }
}

// ─── Core Authentication ───

/**
 * Get the authenticated user for the current request.
 * Uses React cache() to ensure single execution per request.
 *
 * CRITICAL: Call this at the start of EVERY data access function.
 */
export const getAuthenticatedUser = cache(
  async (): Promise<AuthenticatedUser> => {
    const session = await auth();

    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError("Account deactivated or not found");
    }

    return user as AuthenticatedUser;
  },
);

/**
 * Verify user has required role.
 * Call after getAuthenticatedUser() when role-specific access is needed.
 */
export async function requireRole(
  allowedRoles: string[],
): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();

  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError(`Required role: ${allowedRoles.join(" or ")}`);
  }

  return user;
}

// ─── User Data Access ───

export async function getCurrentUserProfile() {
  const user = await getAuthenticatedUser();

  return prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      organization: true,
      operatorType: true,
      establishmentCountry: true,
      isThirdCountry: true,
      createdAt: true,
      // NEVER expose: password, role (unless admin context), isActive
    },
  });
}

// ─── Article Status Access ───

export async function getUserArticleStatuses() {
  const user = await getAuthenticatedUser();

  return prisma.articleStatus.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      articleId: true,
      status: true,
      notes: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function updateArticleStatus(
  articleId: string,
  data: { status: string; notes?: string | null },
) {
  const user = await getAuthenticatedUser();

  return prisma.articleStatus.upsert({
    where: {
      userId_articleId: {
        userId: user.id,
        articleId,
      },
    },
    create: {
      userId: user.id,
      articleId,
      status: data.status,
      notes: data.notes,
    },
    update: {
      status: data.status,
      notes: data.notes,
    },
    select: {
      id: true,
      articleId: true,
      status: true,
      notes: true,
      updatedAt: true,
    },
  });
}

// ─── Checklist Access ───

export async function getUserChecklistStatuses() {
  const user = await getAuthenticatedUser();

  return prisma.checklistStatus.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      checklistId: true,
      completed: true,
      notes: true,
      updatedAt: true,
    },
  });
}

export async function updateChecklistStatus(
  checklistId: string,
  data: { completed: boolean; notes?: string | null },
) {
  const user = await getAuthenticatedUser();

  return prisma.checklistStatus.upsert({
    where: {
      userId_checklistId: {
        userId: user.id,
        checklistId,
      },
    },
    create: {
      userId: user.id,
      checklistId,
      completed: data.completed,
      notes: data.notes,
    },
    update: {
      completed: data.completed,
      notes: data.notes,
    },
  });
}

// ─── Authorization Workflow Access ───

export async function getUserAuthorizationWorkflows() {
  const user = await getAuthenticatedUser();

  return prisma.authorizationWorkflow.findMany({
    where: { userId: user.id },
    include: {
      documents: {
        select: {
          id: true,
          documentType: true,
          name: true,
          status: true,
          dueDate: true,
          completedAt: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getAuthorizationWorkflowById(workflowId: string) {
  const user = await getAuthenticatedUser();

  const workflow = await prisma.authorizationWorkflow.findUnique({
    where: { id: workflowId },
    include: {
      documents: true,
    },
  });

  // Verify ownership
  if (!workflow || workflow.userId !== user.id) {
    throw new ForbiddenError("Workflow not found or access denied");
  }

  return workflow;
}

// ─── Assessment Access ───

export async function getUserDebrisAssessments() {
  const user = await getAuthenticatedUser();

  return prisma.debrisAssessment.findMany({
    where: { userId: user.id },
    include: {
      requirements: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getUserCybersecurityAssessments() {
  const user = await getAuthenticatedUser();

  return prisma.cybersecurityAssessment.findMany({
    where: { userId: user.id },
    include: {
      requirements: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getUserInsuranceAssessments() {
  const user = await getAuthenticatedUser();

  return prisma.insuranceAssessment.findMany({
    where: { userId: user.id },
    include: {
      policies: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getUserEnvironmentalAssessments() {
  const user = await getAuthenticatedUser();

  return prisma.environmentalAssessment.findMany({
    where: { userId: user.id },
    include: {
      impactResults: true,
      supplierRequests: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

// ─── Audit Log Access (Admin Only) ───

export async function getAuditLogs(options?: {
  userId?: string;
  entityType?: string;
  action?: string;
  limit?: number;
  offset?: number;
}) {
  await requireRole(["admin", "auditor"]);

  const { userId, entityType, action, limit = 100, offset = 0 } = options || {};

  return prisma.auditLog.findMany({
    where: {
      ...(userId && { userId }),
      ...(entityType && { entityType }),
      ...(action && { action }),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { timestamp: "desc" },
    take: Math.min(limit, 1000), // Cap at 1000
    skip: offset,
  });
}

// ─── Security Events (Admin Only) ───

export async function getSecurityEvents(options?: {
  severity?: string;
  type?: string;
  resolved?: boolean;
  limit?: number;
}) {
  await requireRole(["admin"]);

  const { severity, type, resolved, limit = 100 } = options || {};

  return prisma.securityEvent.findMany({
    where: {
      ...(severity && { severity }),
      ...(type && { type }),
      ...(typeof resolved === "boolean" && { resolved }),
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 1000),
  });
}

// ─── DTO Transformers ───

/**
 * Transform database objects to safe DTOs
 * Use these to ensure sensitive fields are never exposed
 */

export interface UserProfileDTO {
  id: string;
  name: string | null;
  email: string | null;
  organization: string | null;
  operatorType: string | null;
}

export function toUserProfileDTO(user: {
  id: string;
  name: string | null;
  email: string | null;
  organization: string | null;
  operatorType: string | null;
}): UserProfileDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    organization: user.organization,
    operatorType: user.operatorType,
  };
}

export interface ArticleStatusDTO {
  articleId: string;
  status: string;
  notes: string | null;
  updatedAt: Date;
}

export function toArticleStatusDTO(status: {
  articleId: string;
  status: string;
  notes: string | null;
  updatedAt: Date;
}): ArticleStatusDTO {
  return {
    articleId: status.articleId,
    status: status.status,
    notes: status.notes,
    updatedAt: status.updatedAt,
  };
}
