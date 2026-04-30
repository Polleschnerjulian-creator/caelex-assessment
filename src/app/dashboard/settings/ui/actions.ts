"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  COMPLY_UI_COOKIE_NAME,
  type ComplyUiVersion,
} from "@/lib/comply-ui-version.server";
import { DENSITY_COOKIE_NAME, isDensity } from "@/lib/comply-v2/density.server";

/**
 * Server Action: switch the current user between Comply v1 and v2.
 *
 * Persistence:
 *  - Writes `User.complyUiVersion` so the choice survives sign-out / device.
 *  - Mirrors the same value into a cookie for instant resolution on the
 *    next request (avoids waiting for a DB roundtrip in the layout).
 *
 * Authorization: any authenticated user can toggle their own UI. There is
 * no risk surface — both V1 and V2 read the same data, just render
 * differently.
 */
export async function setComplyUiVersion(formData: FormData): Promise<void> {
  const raw = formData.get("version");
  const version =
    raw === "v1" || raw === "v2" ? (raw as ComplyUiVersion) : null;

  if (!version) {
    throw new Error("Invalid version");
  }

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/settings/ui");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { complyUiVersion: version },
  });

  const cookieStore = await cookies();
  cookieStore.set(COMPLY_UI_COOKIE_NAME, version, {
    httpOnly: false, // readable client-side for analytics; non-sensitive
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });

  // TODO(comply-v2): once we add a typed `preferences_changed` audit
  // action (src/lib/audit.ts), log this toggle to AuditLog. Skipped
  // for now to avoid expanding the audit-action union in Phase 0.

  // Re-render the dashboard tree with the new shell.
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/settings/ui?changed=1");
}

/**
 * Server Action: set the user's density preference.
 *
 * Cookie-only (no DB write) since density is a personal-display
 * preference with no audit relevance. Survives across devices that
 * share the same browser/cookie store.
 */
export async function setDensity(formData: FormData): Promise<void> {
  const raw = formData.get("density");
  if (!isDensity(raw)) {
    throw new Error("Invalid density");
  }

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/settings/ui");
  }

  const cookieStore = await cookies();
  cookieStore.set(DENSITY_COOKIE_NAME, raw, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/settings/ui?density=1");
}
