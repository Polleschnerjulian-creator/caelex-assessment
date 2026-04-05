import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

/**
 * Server-side subscription gate for the dashboard.
 *
 * Checks that the authenticated user belongs to an organization with an active,
 * paid subscription. Users on the FREE plan or without any organization are
 * redirected to /get-started so they can contact sales.
 *
 * This component wraps the client-side DashboardLayout and runs entirely on the
 * server -- no "use client" directive.
 */
export default async function SubscriptionGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/get-started");
  }

  // Check if user has an active subscription via their organization
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    include: {
      organization: {
        select: {
          plan: true,
          isActive: true,
          subscription: {
            select: { status: true },
          },
        },
      },
    },
  });

  const plan = membership?.organization?.plan;
  const isActive = membership?.organization?.isActive;
  const subStatus = membership?.organization?.subscription?.status;

  // Block access if no org, no plan, FREE plan, or inactive
  // Allow "ACTIVE" and "TRIALING" subscription statuses
  // If there is no Subscription record at all but the org has a paid plan and is
  // active (e.g. manually provisioned), still allow access.
  const hasAccess =
    isActive &&
    plan &&
    plan !== "FREE" &&
    (!subStatus || ["ACTIVE", "TRIALING"].includes(subStatus));

  if (!hasAccess) {
    redirect("/get-started?reason=no-subscription");
  }

  return <>{children}</>;
}
