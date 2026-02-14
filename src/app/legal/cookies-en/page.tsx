import Link from "next/link";

export default function CookiePolicyEnPage() {
  return (
    <main className="dark-section min-h-screen bg-black text-white">
      {/* Content */}
      <div className="pt-32 pb-20 px-6 md:px-12">
        <div className="max-w-[800px] mx-auto">
          {/* Language Toggle */}
          <div className="flex justify-end mb-6">
            <Link
              href="/legal/cookies"
              className="text-[12px] text-white/40 hover:text-white/60 transition-colors border border-white/10 rounded-full px-3 py-1"
            >
              Deutsche Version
            </Link>
          </div>

          <h1 className="text-[32px] font-light tracking-[-0.02em] mb-4">
            Cookie Policy
          </h1>
          <p className="text-[13px] text-white/40 mb-8">
            Effective: February 2026 · Caelex, Berlin, Germany
          </p>

          <div className="prose prose-invert prose-sm max-w-none space-y-8">
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                What Are Cookies?
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Cookies are small text files stored on your computer or mobile
                device when you visit a website. They allow the website to
                remember your actions and preferences (such as login, language,
                font size, and other display settings) over a period of time, so
                you don't have to re-enter them each time you visit the site or
                navigate between pages.
              </p>
            </section>

            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                How We Use Cookies
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                We use different types of cookies for different purposes:
              </p>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                Strictly Necessary Cookies
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                These cookies are essential for the website to function and
                cannot be switched off. They are set in response to actions you
                take, such as logging in or filling out forms.
              </p>
              <div className="mt-4 p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-white/40">
                      <th className="pb-2">Cookie</th>
                      <th className="pb-2">Purpose</th>
                      <th className="pb-2">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/60">
                    <tr>
                      <td className="py-2 pr-4">authjs.session-token</td>
                      <td className="py-2 pr-4">
                        Authentication & session management
                      </td>
                      <td className="py-2">24 hours</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">authjs.csrf-token</td>
                      <td className="py-2 pr-4">CSRF protection</td>
                      <td className="py-2">Session</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">authjs.callback-url</td>
                      <td className="py-2 pr-4">OAuth redirect</td>
                      <td className="py-2">Session</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">__Secure-authjs.*</td>
                      <td className="py-2 pr-4">
                        Secure authentication tokens
                      </td>
                      <td className="py-2">Variable</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                Local Storage (Not Cookies)
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                We use localStorage (not cookies) for the following purposes:
              </p>
              <div className="mt-4 p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-white/40">
                      <th className="pb-2">Key</th>
                      <th className="pb-2">Purpose</th>
                      <th className="pb-2">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/60">
                    <tr>
                      <td className="py-2 pr-4">caelex-cookie-consent</td>
                      <td className="py-2 pr-4">
                        Storage of your cookie consent
                      </td>
                      <td className="py-2">Indefinite</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">caelex-theme</td>
                      <td className="py-2 pr-4">
                        Theme preference (light/dark)
                      </td>
                      <td className="py-2">Indefinite</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">caelex-onboarding-*</td>
                      <td className="py-2 pr-4">
                        Onboarding progress tracking
                      </td>
                      <td className="py-2">Indefinite</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">caelex-pending-assessment</td>
                      <td className="py-2 pr-4">
                        Temporary storage of assessment results before login
                      </td>
                      <td className="py-2">Until login</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">
                        caelex-pending-unified-assessment
                      </td>
                      <td className="py-2 pr-4">
                        Unified assessment data before login
                      </td>
                      <td className="py-2">Until login</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">
                        caelex-save-assessment-after-auth
                      </td>
                      <td className="py-2 pr-4">
                        Flag for automatic assessment import after login
                      </td>
                      <td className="py-2">Until login</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">currentOrgId</td>
                      <td className="py-2 pr-4">
                        Currently selected organization
                      </td>
                      <td className="py-2">Session</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">
                        exportControlDisclaimerAcknowledged
                      </td>
                      <td className="py-2 pr-4">
                        Export Control disclaimer acknowledgment
                      </td>
                      <td className="py-2">Indefinite</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-[14px] text-white/60 leading-relaxed mt-4">
                <strong className="text-white/80">Note:</strong> The following
                data is stored only locally in your browser and is never
                transmitted to our servers:
              </p>
              <div className="mt-4 p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-white/40">
                      <th className="pb-2">Key</th>
                      <th className="pb-2">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/60">
                    <tr>
                      <td className="py-2 pr-4">caelex-demo-requests</td>
                      <td className="py-2 pr-4">
                        Local storage of demo requests (debug purposes only)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">caelex-newsletter-signups</td>
                      <td className="py-2 pr-4">
                        Local storage of newsletter signups
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">caelex-assessment-leads</td>
                      <td className="py-2 pr-4">
                        Local storage of assessment lead data
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                Analytics & Error Tracking (Consent Required)
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                The following services are only activated if you select "Accept
                All" in the cookie banner:
              </p>
              <div className="mt-4 p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-white/40">
                      <th className="pb-2">Service</th>
                      <th className="pb-2">Purpose</th>
                      <th className="pb-2">Cookies</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/60">
                    <tr>
                      <td className="py-2 pr-4">Vercel Analytics</td>
                      <td className="py-2 pr-4">Anonymous usage statistics</td>
                      <td className="py-2">None (cookieless)</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">Vercel Speed Insights</td>
                      <td className="py-2 pr-4">Performance monitoring</td>
                      <td className="py-2">None</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">Sentry</td>
                      <td className="py-2 pr-4">
                        Error tracking & session replay
                      </td>
                      <td className="py-2">Yes (Sentry session)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                Third-Party Cookies
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                When using certain features, third-party services may set their
                own cookies:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 leading-relaxed mt-4 space-y-2">
                <li>
                  <strong className="text-white/80">Stripe</strong> (Payment
                  processing): Only activated when upgrading to a paid plan
                </li>
                <li>
                  <strong className="text-white/80">Google OAuth</strong>{" "}
                  (Login): Only activated when signing in with Google
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                Your Cookie Settings
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                On your first visit to our website, you will be asked for your
                consent via a banner. You have two options:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 leading-relaxed mt-4 space-y-2">
                <li>
                  <strong className="text-white/80">Accept All</strong> –
                  Necessary cookies + analytics services (Vercel Analytics,
                  Sentry)
                </li>
                <li>
                  <strong className="text-white/80">Necessary Only</strong> –
                  Only technically necessary cookies for authentication and
                  security
                </li>
              </ul>
              <p className="text-[14px] text-white/60 leading-relaxed mt-4">
                You can withdraw your consent at any time by deleting the
                "caelex-cookie-consent" entry in your browser's localStorage.
                Alternatively, you can delete all website data via your browser
                settings.
              </p>
            </section>

            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                Managing Cookies in Your Browser
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Most web browsers allow you to control cookies through the
                browser settings:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 leading-relaxed mt-4 space-y-2">
                <li>
                  <a
                    href="https://support.google.com/chrome/answer/95647"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300"
                  >
                    Google Chrome
                  </a>
                </li>
                <li>
                  <a
                    href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300"
                  >
                    Mozilla Firefox
                  </a>
                </li>
                <li>
                  <a
                    href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300"
                  >
                    Apple Safari
                  </a>
                </li>
                <li>
                  <a
                    href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300"
                  >
                    Microsoft Edge
                  </a>
                </li>
              </ul>
              <p className="text-[14px] text-white/60 leading-relaxed mt-4">
                Please note that blocking cookies may impair the functionality
                of our website, particularly login.
              </p>
            </section>

            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                Legal Basis
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                The legal basis for the use of strictly necessary cookies is
                Art. 6(1)(f) GDPR (legitimate interest). For analytics services
                (Vercel Analytics, Sentry), we obtain your explicit consent
                pursuant to Art. 6(1)(a) GDPR.
              </p>
            </section>

            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                Contact
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                If you have questions about our cookie policy, you can contact
                us:
                <br />
                <br />
                Caelex
                <br />
                Julian Polleschner
                <br />
                Am Maselakepark 37, 13587 Berlin, Germany
                <br />
                Email:{" "}
                <a
                  href="mailto:privacy@caelex.eu"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  privacy@caelex.eu
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                Changes to This Policy
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                We may update this cookie policy from time to time. Changes will
                be posted on this page.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-white/[0.06]">
            <p className="text-[12px] text-white/30">
              Last updated: February 2026 · Version 2.0
            </p>
            <div className="flex gap-4 mt-4">
              <Link
                href="/legal/cookies"
                className="text-[12px] text-emerald-400 hover:text-emerald-300"
              >
                Deutsche Version →
              </Link>
              <Link
                href="/legal/privacy-en"
                className="text-[12px] text-white/40 hover:text-white/60"
              >
                Privacy Policy
              </Link>
              <Link
                href="/legal/terms-en"
                className="text-[12px] text-white/40 hover:text-white/60"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
