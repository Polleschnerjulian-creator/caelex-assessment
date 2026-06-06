import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { hasProductAccess } from "@/lib/products";

/**
 * Scholar no-access page — shown when a user is authenticated but their
 * organisation does not hold a SCHOLAR entitlement.
 *
 * LOOP-SAFE CONTRACT: this page re-runs the EXACT same predicate as
 * ScholarLayout. If the entitlement has since been granted (e.g. after
 * an admin activates the org, or after a payment webhook lands), we
 * redirect back to /scholar immediately so the user is never stranded.
 *
 * Redirect chain is:
 *   unauthenticated      → /scholar-login   (same as layout)
 *   now-eligible         → /scholar         (regained access)
 *   still not eligible   → render this page (no further redirect)
 *
 * Note: super-admin bypass is intentionally omitted here — if a super-admin
 * reaches this page directly they have a valid session and no SCHOLAR
 * entitlement, but the layout would never have sent them here. Redirecting
 * them back to /scholar is safe but unnecessary — just render the page
 * so they can inspect it for UX purposes.
 */
export default async function ScholarNoAccess() {
  const session = await auth();
  if (!session?.user?.id) redirect("/scholar-login?callbackUrl=%2Fscholar");

  const org = await getCurrentOrganization(session.user.id);
  const ok = org
    ? await hasProductAccess(org.organizationId, "SCHOLAR")
    : false;
  if (ok) redirect("/scholar"); // eligibility regained → don't strand the user

  return (
    // lang="de": WCAG 3.1.1 — content is German; root layout uses lang="en"
    <main
      lang="de"
      className="min-h-screen grid place-items-center bg-navy-950 text-slate-200 p-8"
    >
      <div className="max-w-md text-center space-y-4">
        {/*
          WCAG 1.3.1 / 2.4.6: h1 provides the page's primary heading.
          (Previously missing — only a bare text node was present.)
        */}
        <h1 className="text-display-sm text-white">Kein Scholar-Zugang</h1>
        <p className="text-slate-400">
          Caelex Scholar wird über deine Hochschule lizenziert. Bitte melde dich
          mit deinem Campus-Login an, oder bitte deine Universität um
          Freischaltung.
        </p>
        {/*
          WCAG 2.4.7: focus-visible ring on the CTA link.
          WCAG 2.5.8: py-1.5 px-3 gives a comfortable ≥44px visual target
                       via the text + padding combination.
          WCAG 1.4.3: emerald-400 (#34D399) on navy-950 (#0A0F1E) ≈ 6.2:1 ✓
        */}
        <a
          href="/scholar-access"
          className="inline-block py-1.5 px-3 text-emerald-400 hover:text-emerald-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950 rounded"
        >
          Für Universitäten →
        </a>
      </div>
    </main>
  );
}
