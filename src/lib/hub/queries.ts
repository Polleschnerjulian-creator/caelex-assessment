import { prisma } from "@/lib/prisma";

/**
 * Get the user's organization ID from their membership.
 * Uses orderBy to ensure deterministic result for multi-org users.
 * Returns null if user has no organization.
 */
export async function getUserOrgId(userId: string): Promise<string | null> {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { organizationId: true },
  });
  return membership?.organizationId ?? null;
}

/**
 * Check if a user is a member of a HUB project (or the owner).
 * Also verifies the project belongs to the given organization.
 */
export async function isProjectMember(
  projectId: string,
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const project = await prisma.hubProject.findFirst({
    where: {
      id: projectId,
      organizationId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    select: { id: true },
  });
  return !!project;
}

/**
 * Check if user is project owner or admin member.
 * Also verifies the project belongs to the given organization.
 */
export async function isProjectAdmin(
  projectId: string,
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const project = await prisma.hubProject.findFirst({
    where: {
      id: projectId,
      organizationId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId, role: "ADMIN" } } },
      ],
    },
    select: { id: true },
  });
  return !!project;
}

/**
 * Get the projectId for a task, verifying it belongs to the given org.
 * Returns null if the task is not found or not in the org.
 */
export async function getTaskProjectId(
  taskId: string,
  organizationId: string,
): Promise<string | null> {
  const task = await prisma.hubTask.findFirst({
    where: { id: taskId, project: { organizationId } },
    select: { projectId: true },
  });
  return task?.projectId ?? null;
}
