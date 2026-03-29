import Link from "next/link";
import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  ...genMeta({
    title: "Content Moderation Policy",
    description:
      "Caelex Content Moderation Policy pursuant to the Digital Services Act (EU 2022/2065) and the German Network Enforcement Act (NetzDG). Reporting procedures, response times, and transparency obligations.",
    path: "/legal/content-policy",
    keywords: [
      "content moderation policy",
      "DSA",
      "Digital Services Act",
      "NetzDG",
      "content reporting",
      "Caelex legal",
    ],
  }),
  alternates: {
    canonical: "https://caelex.eu/legal/content-policy",
  },
};

export default function ContentPolicyPage() {
  return (
    <main className="landing-light min-h-screen bg-[#F7F8FA] text-[#111827]">
      {/* Content */}
      <div className="pt-32 pb-20 px-6 md:px-12">
        <div className="max-w-[800px] mx-auto">
          <h1 className="text-display font-light tracking-[-0.02em] mb-4">
            Content Moderation Policy
          </h1>
          <p className="text-body text-[#4B5563] mb-8">
            Effective Date: March 29, 2026 · Last Updated: March 29, 2026
          </p>

          <p className="text-body-lg text-[#4B5563] leading-relaxed mb-8">
            This policy is provided pursuant to the Digital Services Act (EU
            2022/2065) and the German Network Enforcement Act (NetzDG, BGBl. I
            2017, S. 3352).
          </p>

          <div className="prose prose-sm max-w-none space-y-8">
            {/* Section 1 */}
            <section>
              <h2 className="text-heading font-medium text-[#111827] mb-4">
                1. Scope
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                This policy applies to all user-generated content on the Caelex
                platform, including:
              </p>
              <ul className="list-disc list-inside text-body-lg text-[#4B5563] mt-2 space-y-1">
                <li>Compliance assessment data and uploaded documents</li>
                <li>AI assistant (ASTRA) conversations</li>
                <li>Evidence vault documents</li>
                <li>Comments and annotations</li>
                <li>NCA submission materials</li>
              </ul>
              <p className="text-body-lg text-[#4B5563] leading-relaxed mt-3">
                Caelex is a business-to-business (B2B) regulatory compliance
                platform. User-generated content is not publicly visible and is
                accessible only to authorized users within an organization.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-heading font-medium text-[#111827] mb-4">
                2. Prohibited Content
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                The following content is prohibited on Caelex:
              </p>
              <ul className="list-disc list-inside text-body-lg text-[#4B5563] mt-2 space-y-1">
                <li>
                  Content that violates applicable laws (German, EU, or
                  international)
                </li>
                <li>Defamatory, discriminatory, or hateful content</li>
                <li>Content that infringes intellectual property rights</li>
                <li>Malware, phishing attempts, or malicious code</li>
                <li>
                  Fraudulent regulatory submissions or falsified compliance data
                </li>
                <li>
                  Content that violates export control regulations (ITAR, EAR)
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-heading font-medium text-[#111827] mb-4">
                3. Reporting Illegal Content
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                If you believe content on Caelex violates German or EU law, you
                may report it to:
              </p>
              <p className="text-body-lg text-[#4B5563] leading-relaxed mt-3">
                Email:{" "}
                <a
                  href="mailto:legal@caelex.eu"
                  className="text-[#111827] hover:text-[#111827]"
                >
                  legal@caelex.eu
                </a>
                <br />
                Subject line: &quot;Content Report — [brief description]&quot;
              </p>
              <p className="text-body-lg text-[#4B5563] leading-relaxed mt-3">
                Your report should include:
              </p>
              <ul className="list-disc list-inside text-body-lg text-[#4B5563] mt-2 space-y-1">
                <li>
                  Description of the content and why you believe it is illegal
                </li>
                <li>
                  Location of the content (URL, screenshot, or document
                  reference)
                </li>
                <li>Your contact information for follow-up</li>
                <li>
                  Legal basis for the claim (applicable law or regulation)
                </li>
              </ul>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-heading font-medium text-[#111827] mb-4">
                4. Response Procedure
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                Upon receiving a report:
              </p>
              <ul className="list-disc list-inside text-body-lg text-[#4B5563] mt-2 space-y-1">
                <li>
                  <strong className="text-[#4B5563]">Acknowledgment:</strong>{" "}
                  Within 24 hours of receipt
                </li>
                <li>
                  <strong className="text-[#4B5563]">
                    Initial assessment:
                  </strong>{" "}
                  Within 48 hours
                </li>
                <li>
                  <strong className="text-[#4B5563]">
                    Action on manifestly illegal content:
                  </strong>{" "}
                  Within 24 hours (per NetzDG &sect; 3(2)(2))
                </li>
                <li>
                  <strong className="text-[#4B5563]">
                    Action on other illegal content:
                  </strong>{" "}
                  Within 7 days (per NetzDG &sect; 3(2)(3))
                </li>
                <li>
                  <strong className="text-[#4B5563]">
                    Notification to reporter:
                  </strong>{" "}
                  Within 7 days of final decision
                </li>
              </ul>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-heading font-medium text-[#111827] mb-4">
                5. Actions Taken
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                Depending on the nature and severity of the content:
              </p>
              <ul className="list-disc list-inside text-body-lg text-[#4B5563] mt-2 space-y-1">
                <li>Removal of the content</li>
                <li>Restriction of access to the content</li>
                <li>Suspension of the user account</li>
                <li>
                  Notification to relevant authorities (if legally required)
                </li>
                <li>
                  Preservation of evidence for law enforcement (if applicable)
                </li>
              </ul>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-heading font-medium text-[#111827] mb-4">
                6. Appeals
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                Users affected by content moderation decisions may appeal within
                30 days:
              </p>
              <p className="text-body-lg text-[#4B5563] leading-relaxed mt-3">
                Email:{" "}
                <a
                  href="mailto:legal@caelex.eu"
                  className="text-[#111827] hover:text-[#111827]"
                >
                  legal@caelex.eu
                </a>
                <br />
                Subject line: &quot;Content Decision Appeal — [reference
                number]&quot;
              </p>
              <p className="text-body-lg text-[#4B5563] leading-relaxed mt-3">
                Appeals are reviewed by a different staff member than the
                original decision maker. We will respond with a detailed written
                decision within 14 days.
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-heading font-medium text-[#111827] mb-4">
                7. Transparency
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                Caelex publishes a semi-annual transparency report covering:
              </p>
              <ul className="list-disc list-inside text-body-lg text-[#4B5563] mt-2 space-y-1">
                <li>Number of content reports received</li>
                <li>Categories of reported content</li>
                <li>Actions taken (removal, restriction, no action)</li>
                <li>Average response times</li>
                <li>Number of appeals and outcomes</li>
              </ul>
              <p className="text-body-lg text-[#4B5563] leading-relaxed mt-3">
                Reports are available at:{" "}
                <Link
                  href="/legal/transparency-reports"
                  className="text-[#111827] hover:text-[#111827]"
                >
                  /legal/transparency-reports
                </Link>
              </p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-heading font-medium text-[#111827] mb-4">
                8. Designated Contact Person
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                Per NetzDG &sect; 5, the designated contact person for content
                complaints is:
              </p>
              <p className="text-body-lg text-[#4B5563] leading-relaxed mt-3">
                Julian Polleschner
                <br />
                Am Maselakepark 37
                <br />
                13587 Berlin, Germany
                <br />
                Email:{" "}
                <a
                  href="mailto:legal@caelex.eu"
                  className="text-[#111827] hover:text-[#111827]"
                >
                  legal@caelex.eu
                </a>
                <br />
                Phone:{" "}
                <a
                  href="tel:+491636726480"
                  className="text-[#111827] hover:text-[#111827]"
                >
                  +49 1636726480
                </a>
              </p>
              <p className="text-body-lg text-[#4B5563] leading-relaxed mt-3">
                Response time for law enforcement requests: Within 48 hours.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-heading font-medium text-[#111827] mb-4">
                9. Contact
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                For general inquiries about this policy:{" "}
                <a
                  href="mailto:legal@caelex.eu"
                  className="text-[#111827] hover:text-[#111827]"
                >
                  legal@caelex.eu
                </a>
                <br />
                For privacy-related concerns:{" "}
                <a
                  href="mailto:privacy@caelex.eu"
                  className="text-[#111827] hover:text-[#111827]"
                >
                  privacy@caelex.eu
                </a>
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-[#E5E7EB]">
            <p className="text-small text-[#9CA3AF]">
              Last updated: March 29, 2026 · Version 1.0
            </p>
            <div className="flex gap-4 mt-4">
              <Link
                href="/legal/terms-en"
                className="text-small text-[#4B5563] hover:text-[#4B5563]"
              >
                Terms of Service
              </Link>
              <Link
                href="/legal/privacy-en"
                className="text-small text-[#4B5563] hover:text-[#4B5563]"
              >
                Privacy Policy
              </Link>
              <Link
                href="/legal/cookies-en"
                className="text-small text-[#4B5563] hover:text-[#4B5563]"
              >
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
