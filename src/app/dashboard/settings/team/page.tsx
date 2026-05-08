import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import { prisma } from "@/lib/prisma";
import {
  getUserRole,
  getDefaultPermissionsForRole,
  hasPermission,
} from "@/lib/services/organization-service";
import {
  PageContainer,
  PageHeader,
  Card,
  EmptyState,
} from "@/components/dashboard/v2/ui/PageChrome";
import { TeamManagementClient } from "./TeamManagementClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Team — Caelex Comply",
  description:
    "Invite teammates, change their roles, and manage organization membership.",
};

/**
 * Team management — invite / role-change / remove members of the
 * caller's primary organization. Server-renders the initial member +
 * invitation lists; delegates interactive state to TeamManagementClient.
 *
 * Permissions are enforced both server-side (the API routes check
 * via getUserRole + hasPermission) and client-side (we hide controls
 * the caller can't use). Belt + braces.
 */
export default async function TeamPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/settings/team");
  }
  const ui = await resolveComplyUiVersion();
  if (ui === "v1") redirect("/dashboard");

  // Resolve primary org — same convention as /dashboard/missions etc.
  const member = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { joinedAt: "asc" },
    select: { organizationId: true },
  });
  const orgId = member?.organizationId ?? null;

  if (!orgId) {
    return (
      <PageContainer>
        <PageHeader
          eyebrow="Team"
          eyebrowIcon={Users}
          title="Team management"
          description="Invite teammates, change their roles, and manage organization membership."
        />
        <Card className="max-w-xl">
          <EmptyState
            icon={Users}
            title="You don't have an organization yet"
            description="Set up your organization first — team management opens up automatically once you're a member."
            cta={{ label: "Set up organization", href: "/onboarding" }}
          />
        </Card>
      </PageContainer>
    );
  }

  const userRole = await getUserRole(orgId, session.user.id);
  if (!userRole) {
    redirect("/dashboard");
  }

  const permissions = getDefaultPermissionsForRole(userRole);
  const canInvite = hasPermission(permissions, "members:invite");
  const canRead = hasPermission(permissions, "members:read");

  if (!canRead) {
    return (
      <PageContainer>
        <PageHeader
          eyebrow="Team"
          eyebrowIcon={Users}
          title="Team management"
        />
        <Card className="max-w-xl">
          <EmptyState
            icon={Users}
            title="No permission to view team"
            description="Your role doesn't allow viewing the member list. Contact an organization owner if you need access."
          />
        </Card>
      </PageContainer>
    );
  }

  const [organization, members, invitations] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, slug: true, maxUsers: true, plan: true },
    }),
    prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    }),
    canInvite
      ? prisma.organizationInvitation.findMany({
          where: {
            organizationId: orgId,
            acceptedAt: null,
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Team"
        eyebrowIcon={Users}
        title={organization?.name ?? "Team management"}
        description={
          <>
            Invite teammates, change their roles, and manage membership. Roles:
            <strong className="text-slate-300"> OWNER</strong> (full control),
            <strong className="text-slate-300"> ADMIN</strong> (manage members +
            settings),
            <strong className="text-slate-300"> MANAGER</strong> (manage
            compliance work),
            <strong className="text-slate-300"> MEMBER</strong> (operate),
            <strong className="text-slate-300"> VIEWER</strong> (read-only).
          </>
        }
      />

      <TeamManagementClient
        orgId={orgId}
        callerUserId={session.user.id}
        callerRole={userRole}
        canInvite={canInvite}
        organization={
          organization
            ? {
                id: organization.id,
                name: organization.name,
                slug: organization.slug,
                maxUsers: organization.maxUsers,
                plan: organization.plan,
              }
            : null
        }
        initialMembers={members.map((m) => ({
          id: m.id,
          userId: m.userId,
          name: m.user.name,
          email: m.user.email,
          image: m.user.image,
          role: m.role,
          joinedAt: m.joinedAt.toISOString(),
        }))}
        initialInvitations={invitations.map((inv) => ({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          expiresAt: inv.expiresAt.toISOString(),
          createdAt: inv.createdAt.toISOString(),
        }))}
      />
    </PageContainer>
  );
}
