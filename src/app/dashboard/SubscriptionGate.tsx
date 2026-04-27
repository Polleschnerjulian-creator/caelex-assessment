import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

/**
 * Server-side subscription gate for the dashboard.
 *
 * Blocks /dashboard access for users on the FREE plan, inactive orgs, or
 * suspended/canceled subscriptions — those land on `/get-started` to contact
 * sales. Allows everyone else through.
 *
 * Bypasses:
 *   - `User.role === "admin"` — internal staff (HUB, analytics, support)
 *     never need a paid subscription on their own user record.
 *   - Org has paid plan but no `Subscription` row — manually provisioned
 *     accounts (early customers, partners) pre-Stripe.
 *
 * Server component — no "use client". Single `prisma.user.findUnique`
 * fetches role + first membership in one round-trip; the previous version
 * issued two queries (auth() + organizationMember.findFirst).
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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      organizationMemberships: {
        take: 1,
        orderBy: { joinedAt: "asc" },
        select: {
          organization: {
            select: {
              plan: true,
              isActive: true,
              subscription: { select: { status: true } },
            },
          },
        },
      },
    },
  });

  // Internal staff bypass — admins manage the platform itself, not their
  // own subscription. Without this, seeded admin users (no paid plan)
  // were trapped on /get-started forever.
  if (user?.role === "admin") {
    return <>{children}</>;
  }

  const org = user?.organizationMemberships[0]?.organization;
  const subStatus = org?.subscription?.status;
  const hasAccess =
    org?.isActive &&
    org.plan &&
    org.plan !== "FREE" &&
    (!subStatus || ["ACTIVE", "TRIALING"].includes(subStatus));

  if (!hasAccess) {
    redirect("/get-started?reason=no-subscription");
  }

  return <>{children}</>;
}
