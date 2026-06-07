/**
 * Caelex Scholar — Einstellungen (Settings) page.
 *
 * Server Component: reads session + org data server-side. Read-only account
 * info — no dead toggles. Language/theme controls are intentionally omitted
 * (not wired). The sign-out action lives in the sidebar.
 *
 * WCAG 2.2 AA:
 *   - <dl> for key/value rows (WCAG 1.3.1 — meaningful structure)
 *   - lang="de" via ScholarPage wrapper (WCAG 3.1.1)
 *   - Text contrast: gray-900 on white ≥15:1 ✓; gray-600 on white ≥5.7:1 ✓
 *   - External links have visible focus ring (WCAG 2.4.7)
 *   - Link targets ≥ 24px via py-1 (WCAG 2.5.8)
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import Link from "next/link";
import { Settings, Building2, User, Info } from "lucide-react";
import { auth } from "@/lib/auth";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { isSuperAdmin } from "@/lib/super-admin";
import { ScholarPage } from "../_components/ScholarPage";
import { PageHeader } from "../_components/PageHeader";

export default async function SettingsPage() {
  const session = await auth();
  // Layout already redirects unauthenticated visitors; session is always set here.
  const user = session?.user;

  // Determine access mode (mirrors layout.tsx logic)
  const superAdmin = isSuperAdmin(user?.email);
  let orgName: string | null = null;
  if (!superAdmin && user?.id) {
    const org = await getCurrentOrganization(user.id);
    orgName = org?.organization?.name ?? null;
  }

  return (
    <ScholarPage>
      <PageHeader
        eyebrow="Caelex Scholar"
        title="Einstellungen"
        subtitle="Konto- und Zugangsdetails für deine Scholar-Sitzung."
        icon={Settings}
      />

      <div className="space-y-6 max-w-2xl">
        {/* ── Konto ──────────────────────────────────────────────────── */}
        <section aria-labelledby="section-konto">
          <h2
            id="section-konto"
            className="flex items-center gap-2 text-[11px] font-semibold text-gray-500 tracking-[0.18em] uppercase mb-3"
          >
            <User size={13} className="text-gray-400" aria-hidden="true" />
            Konto
          </h2>

          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            <dl className="divide-y divide-gray-100">
              <div className="flex items-baseline gap-4 px-5 py-4">
                <dt className="w-32 flex-shrink-0 text-[12px] text-gray-500">
                  Name
                </dt>
                <dd className="text-[13px] text-gray-900 font-medium">
                  {user?.name ?? (
                    <span className="text-gray-400 font-normal">—</span>
                  )}
                </dd>
              </div>
              <div className="flex items-baseline gap-4 px-5 py-4">
                <dt className="w-32 flex-shrink-0 text-[12px] text-gray-500">
                  E-Mail
                </dt>
                <dd className="text-[13px] text-gray-900">
                  {user?.email ?? <span className="text-gray-400">—</span>}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* ── Zugang ─────────────────────────────────────────────────── */}
        <section aria-labelledby="section-zugang">
          <h2
            id="section-zugang"
            className="flex items-center gap-2 text-[11px] font-semibold text-gray-500 tracking-[0.18em] uppercase mb-3"
          >
            <Building2 size={13} className="text-gray-400" aria-hidden="true" />
            Zugang
          </h2>

          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            <dl className="divide-y divide-gray-100">
              {superAdmin ? (
                <div className="flex items-baseline gap-4 px-5 py-4">
                  <dt className="w-32 flex-shrink-0 text-[12px] text-gray-500">
                    Rolle
                  </dt>
                  <dd className="text-[13px] text-gray-900 font-medium">
                    Plattform-Administrator · Vollzugriff
                  </dd>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline gap-4 px-5 py-4">
                    <dt className="w-32 flex-shrink-0 text-[12px] text-gray-500">
                      Organisation
                    </dt>
                    <dd className="text-[13px] text-gray-900 font-medium">
                      {orgName ?? (
                        <span className="text-gray-400 font-normal">—</span>
                      )}
                    </dd>
                  </div>
                  <div className="flex items-baseline gap-4 px-5 py-4">
                    <dt className="w-32 flex-shrink-0 text-[12px] text-gray-500">
                      Lizenz
                    </dt>
                    <dd className="text-[13px] text-gray-600">
                      Lizenziert über deine Hochschule
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>
        </section>

        {/* ── Über Caelex Scholar ────────────────────────────────────── */}
        <section aria-labelledby="section-about">
          <h2
            id="section-about"
            className="flex items-center gap-2 text-[11px] font-semibold text-gray-500 tracking-[0.18em] uppercase mb-3"
          >
            <Info size={13} className="text-gray-400" aria-hidden="true" />
            Über Caelex Scholar
          </h2>

          <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-5 py-4 space-y-3">
            <p className="text-[13px] text-gray-700 leading-relaxed">
              Caelex Scholar ist powered by{" "}
              <span className="font-medium text-gray-900">Atlas</span> — der
              Rechtsrecherche-Engine von Caelex.
            </p>

            {/* Legal links — /legal/privacy, /legal/terms, /legal/impressum exist (verified) */}
            <nav
              aria-label="Rechtliche Informationen"
              className="flex flex-wrap gap-x-4 gap-y-1 pt-1"
            >
              <Link
                href="/legal/privacy"
                className="inline-block py-1 text-[12px] text-gray-600 hover:text-gray-900 underline underline-offset-2 decoration-gray-300 hover:decoration-gray-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 rounded"
              >
                Datenschutz
              </Link>
              <Link
                href="/legal/terms"
                className="inline-block py-1 text-[12px] text-gray-600 hover:text-gray-900 underline underline-offset-2 decoration-gray-300 hover:decoration-gray-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 rounded"
              >
                AGB
              </Link>
              <Link
                href="/legal/impressum"
                className="inline-block py-1 text-[12px] text-gray-600 hover:text-gray-900 underline underline-offset-2 decoration-gray-300 hover:decoration-gray-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 rounded"
              >
                Impressum
              </Link>
            </nav>
          </div>
        </section>
      </div>

      {/* Footer — mirrors the pattern used on other Scholar pages */}
      <footer className="mt-20 pt-8 border-t border-gray-100 pb-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-gray-600 tracking-wider">
              SCHOLAR
            </span>
            <span className="text-[9px] text-gray-600">by Caelex</span>
          </div>
          <span className="text-[9px] text-gray-600">
            © {new Date().getFullYear()} Caelex
          </span>
        </div>
      </footer>
    </ScholarPage>
  );
}
