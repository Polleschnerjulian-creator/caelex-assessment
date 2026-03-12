import { prisma } from "@/lib/prisma";

/**
 * Get the user's organization ID from their membership.
 * Returns null if user has no organization.
 */
export async function getUserOrgId(userId: string): Promise<string | null> {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    select: { organizationId: true },
  });
  return membership?.organizationId ?? null;
}

/**
 * Check if a user is a member of a HUB project (or the owner).
 */
export async function isProjectMember(
  projectId: string,
  userId: string,
): Promise<boolean> {
  const project = await prisma.hubProject.findFirst({
    where: {
      id: projectId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    select: { id: true },
  });
  return !!project;
}

/**
 * Check if user is project owner or admin member.
 */
export async function isProjectAdmin(
  projectId: string,
  userId: string,
): Promise<boolean> {
  const project = await prisma.hubProject.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId, role: "ADMIN" } } },
      ],
    },
    select: { id: true },
  });
  return !!project;
}
