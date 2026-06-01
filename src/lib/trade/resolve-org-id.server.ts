import "server-only";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";

/**
 * Resolve the active Trade organization id for a signed-in user.
 *
 * Mirrors the helper inlined in `(trade)/trade/page.tsx`: a super-admin
 * resolves to the oldest active org (god-mode), an ordinary user to their
 * oldest active membership. Returns a sentinel ("no-org" / "super-admin-no-org")
 * rather than throwing, so callers can branch on it cheaply — every Trade
 * query is org-scoped, so a sentinel simply yields empty results.
 *
 * `import "server-only"` — never bundled to the client.
 */
export async function resolveTradeOrgId(
  userId: string,
  email: string | null | undefined,
): Promise<string> {
  if (isSuperAdmin(email)) {
    const anyOrg = await prisma.organization.findFirst({
      where: { isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    return anyOrg?.id ?? "super-admin-no-org";
  }
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organization: { isActive: true } },
    select: { organization: { select: { id: true } } },
    orderBy: { joinedAt: "asc" },
  });
  return membership?.organization.id ?? "no-org";
}
