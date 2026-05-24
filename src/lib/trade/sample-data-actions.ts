"use server";

/**
 * Server-action wrapper around `seedSampleTradeData` (U-CRIT-2 MVP).
 *
 * Auth → org-resolution → role-check → seeder call → revalidate
 * the /trade welcome page so the freshly-inserted rows appear without
 * a hard refresh.
 */

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import { seedSampleTradeData } from "@/lib/trade/sample-data-seeder.server";

export type SeedSampleResult =
  | {
      ok: true;
      seeded: boolean;
      counts: { items: number; parties: number; operations: number };
    }
  | { ok: false; error: string };

const EDITOR_ROLES = ["OWNER", "ADMIN", "MANAGER"] as const;

export async function seedSampleTradeDataAction(): Promise<SeedSampleResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "Not signed in" };
    }
    const userId = session.user.id;

    let orgId: string;
    let role: string;

    if (isSuperAdmin(session.user.email)) {
      const anyOrg = await prisma.organization.findFirst({
        where: { isActive: true },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });
      if (!anyOrg) {
        return { ok: false, error: "No active organisation found" };
      }
      orgId = anyOrg.id;
      role = "OWNER";
    } else {
      const membership = await prisma.organizationMember.findFirst({
        where: { userId, organization: { isActive: true } },
        select: { organizationId: true, role: true },
        orderBy: { joinedAt: "asc" },
      });
      if (!membership) {
        return { ok: false, error: "No active organisation membership" };
      }
      orgId = membership.organizationId;
      role = membership.role;
    }

    if (!(EDITOR_ROLES as readonly string[]).includes(role)) {
      return {
        ok: false,
        error:
          "Insufficient role — MANAGER or higher required to seed sample data",
      };
    }

    const result = await seedSampleTradeData(orgId, userId);

    // Revalidate so the freshly-seeded rows appear on the welcome page
    // (KPI counts, deadlines, action inbox) and the list pages without
    // a hard refresh.
    revalidatePath("/trade");
    revalidatePath("/trade/items");
    revalidatePath("/trade/parties");
    revalidatePath("/trade/operations");

    return {
      ok: true,
      seeded: result.seeded,
      counts: result.inserted,
    };
  } catch (err) {
    // Don't leak stack traces to the client. The server log captures
    // the full error for triage.
    console.error("[seedSampleTradeDataAction] failed:", err);
    return {
      ok: false,
      error: "Sample-data seed failed. Check server logs.",
    };
  }
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
