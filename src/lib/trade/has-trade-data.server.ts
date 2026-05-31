import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * True if the org has ANY trade master/operational data — drives the
 * cockpit-vs-onboarding switch on the Home page. Three cheap counts in
 * parallel; org-scoped.
 */
export async function hasAnyTradeData(
  organizationId: string,
): Promise<boolean> {
  const [items, parties, operations] = await Promise.all([
    prisma.tradeItem.count({ where: { organizationId } }),
    prisma.tradeParty.count({ where: { organizationId } }),
    prisma.tradeOperation.count({ where: { organizationId } }),
  ]);
  return items > 0 || parties > 0 || operations > 0;
}
