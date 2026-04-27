import Link from "next/link";
import { redirect } from "next/navigation";
import { Shield, LogOut } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * /atlas-no-access — fallback for authenticated users who don't (yet)
 * belong to an active Atlas organisation. Reached via the auth guard
 * in /atlas/layout.tsx when the session is valid but membership is
 * missing or the org is deactivated.
 *
 * Two user paths land here:
 *   1. Someone signed up standalone but their org was later deactivated
 *   2. Someone was removed from their only org
 *
 * In both cases the honest answer is "an admin needs to invite you".
 * We show who they're signed in as and offer a clean sign-out if they
 * meant to use a different account.
 */

export const metadata = {
  title: "Kein Zugang zu ATLAS",
};

export default async function NoAccessPage() {
  const session = await auth();
  // Defensive: if they somehow ended up here without a session, send
  // them to login with a callback to try Atlas again.
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Fatlas");
  }

  // Re-check active-membership so a user who got invited between the
  // redirect and the page load is bounced straight into Atlas.
  //
  // CRITICAL: must mirror the layout's gate (orgType IN LAW_FIRM/BOTH).
  // Earlier this only checked `isActive`, which let an OPERATOR-org
  // user pass — they then bounced back to /atlas-no-access from the
  // layout, creating an infinite redirect loop.
  const atlasMembership = await prisma.organizationMember.findFirst({
    where: {
      userId: session.user.id,
      organization: {
        isActive: true,
        orgType: { in: ["LAW_FIRM", "BOTH"] },
      },
    },
  });
  if (atlasMembership) {
    redirect("/atlas");
  }

  const email = session.user.email || "";

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-2xl bg-gray-900 text-white mb-6">
          <Shield size={24} strokeWidth={1.5} />
        </div>

        <h1 className="text-[22px] font-semibold text-gray-900 mb-2">
          Kein Zugang zu ATLAS
        </h1>
        <p className="text-[14px] text-gray-600 leading-relaxed mb-6">
          Ihr Konto ({email || "ohne E-Mail"}) ist derzeit keiner aktiven
          Organisation auf Caelex ATLAS zugeordnet. ATLAS ist nur für
          eingeladene Teams verfügbar — bitten Sie eine:n Organisations-
          Owner:in, Ihnen eine Einladung zu schicken.
        </p>

        <div className="rounded-xl border border-gray-200 bg-white p-4 text-left mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Angemeldet als
          </p>
          <p className="text-[13px] text-gray-900 truncate">
            {session.user.name || email}
          </p>
          {email && session.user.name && (
            <p className="text-[11px] text-gray-500 truncate">{email}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="w-full px-5 py-2.5 rounded-xl bg-gray-900 text-white text-[13px] font-medium hover:bg-black transition-colors"
          >
            Zur Startseite
          </Link>
          {/* Signout is an API route, not a page — Next's app-router
              Link won't route through it correctly, and the lint rule
              can't tell API routes from pages. Plain anchor is right.
              callbackUrl points back at /atlas-login so the brand
              context is preserved (the previous /login target dropped
              the user back into the Caelex compliance funnel). */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/api/auth/signout?callbackUrl=%2Fatlas-login"
            className="inline-flex items-center justify-center gap-1.5 text-[12px] text-gray-500 hover:text-gray-700 transition-colors py-2"
          >
            <LogOut size={12} strokeWidth={1.5} />
            Mit anderem Konto anmelden
          </a>
        </div>

        <p className="mt-8 text-[11px] text-gray-400 leading-relaxed">
          Falls Sie eine Einladungs-E-Mail erhalten haben, klicken Sie einfach
          auf den Link — die Einladung öffnet sich automatisch auf der
          Accept-Seite.
        </p>
      </div>
    </div>
  );
}
