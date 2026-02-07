"use client";

import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { ArrowLeft } from "lucide-react";

export default function TermsEnPage() {
  return (
    <main className="dark-section min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/"
              className="transition-opacity duration-300 hover:opacity-70"
            >
              <Logo size={24} className="text-white" />
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 text-[13px] text-white/50 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-32 pb-20 px-6 md:px-12">
        <div className="max-w-[700px] mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-[32px] font-light tracking-[-0.02em]">
              Terms of Service
            </h1>
            <Link
              href="/legal/terms"
              className="text-[12px] text-white/40 hover:text-white/60 transition-colors border border-white/10 rounded-full px-3 py-1"
            >
              Deutsche Version
            </Link>
          </div>

          <p className="text-[13px] text-white/40 mb-8">
            Effective: February 2026 · Caelex GmbH, Berlin, Germany
          </p>

          <div className="prose prose-invert prose-sm max-w-none space-y-8">
            {/* Section 1 */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                1. Scope
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) These Terms of Service (&quot;Terms&quot;) govern all
                contracts between Caelex GmbH (&quot;Caelex&quot;,
                &quot;we&quot;, &quot;us&quot;) and the user (&quot;you&quot;,
                &quot;Customer&quot;) regarding the use of the Caelex platform
                and associated services, including the free EU Space Act
                Compliance Assessment tool, the compliance dashboard, and any
                future paid modules.
                <br />
                <br />
                (2) Deviating terms of the Customer are not recognized unless
                Caelex expressly agrees to their applicability in writing.
                <br />
                <br />
                (3) These Terms apply to both consumers and business users
                unless a specific clause provides otherwise.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                2. Subject Matter
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) The subject of the contract is the provision of the Caelex
                platform for support in complying with the EU Space Act
                (COM(2025) 335) and related European space regulation.
                <br />
                <br />
                (2) The platform provides the following services:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 leading-relaxed mt-2 space-y-1">
                <li>
                  Compliance Assessment to determine applicability of the EU
                  Space Act
                </li>
                <li>Dashboard for managing compliance requirements</li>
                <li>Document management and audit trail</li>
                <li>Regulatory intelligence and information resources</li>
              </ul>
              <p className="text-[14px] text-white/60 leading-relaxed mt-4">
                (3) The platform does not constitute legal advice. For binding
                legal assessments, qualified legal counsel must be obtained.
              </p>
            </section>

            {/* Section 3 - IP Ownership */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                3. Intellectual Property
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) All content on the platform, including but not limited to
                source code, regulatory mappings, compliance algorithms,
                assessment logic, data structures, user interface designs, text,
                graphics, logos, and documentation, is the exclusive property of
                Caelex GmbH or its licensors and is protected by copyright,
                trade secret, and other intellectual property laws.
                <br />
                <br />
                (2) The regulatory mapping data, compliance checklists, decision
                trees, and assessment algorithms contained in the platform
                represent significant research and development investment and
                constitute proprietary trade secrets of Caelex GmbH.
                <br />
                <br />
                (3) The Customer receives a limited, non-exclusive,
                non-transferable, revocable right to use the platform for its
                intended purpose during the term of the contract. This license
                does not include any right to sublicense, distribute, or create
                derivative works.
                <br />
                <br />
                (4) The content of the platform may not be reproduced,
                distributed, modified, publicly displayed, or otherwise
                exploited without the prior written consent of Caelex GmbH.
              </p>
            </section>

            {/* Section 4 - Anti-Scraping / Reverse Engineering */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                4. Prohibited Activities
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                The following activities are strictly prohibited and constitute
                a material breach of these Terms:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 leading-relaxed mt-2 space-y-2">
                <li>
                  <strong className="text-white/80">
                    Reverse engineering:
                  </strong>{" "}
                  Decompilation, disassembly, or any attempt to derive the
                  source code, algorithms, data structures, or business logic of
                  the platform.
                </li>
                <li>
                  <strong className="text-white/80">
                    Automated data extraction:
                  </strong>{" "}
                  Scraping, crawling, spidering, or any automated or systematic
                  downloading of data, regulatory mappings, or content from the
                  platform.
                </li>
                <li>
                  <strong className="text-white/80">Competitive use:</strong>{" "}
                  Using any data, content, algorithms, or know-how obtained from
                  the platform, directly or indirectly, to build, improve,
                  train, or develop competing products or services.
                </li>
                <li>
                  <strong className="text-white/80">
                    Unauthorized access:
                  </strong>{" "}
                  Attempting to access, probe, or test the vulnerability of any
                  system or network related to the platform, or breaching any
                  security or authentication measures.
                </li>
                <li>
                  <strong className="text-white/80">API abuse:</strong> Making
                  excessive or automated API requests, circumventing rate
                  limits, or using the API in any manner not expressly
                  authorized by Caelex.
                </li>
                <li>
                  <strong className="text-white/80">
                    Content republication:
                  </strong>{" "}
                  Republishing, redistributing, or making available any
                  substantial portion of the regulatory data, compliance
                  assessments, or platform content to third parties.
                </li>
              </ul>
              <p className="text-[14px] text-white/60 leading-relaxed mt-4">
                Caelex reserves the right to immediately terminate access and
                pursue all available legal remedies, including injunctive relief
                and damages, against any person or entity engaging in prohibited
                activities.
              </p>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                5. Free Assessment Tool
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) The EU Space Act Compliance Assessment tool is provided free
                of charge for individual use. It is designed to give space
                operators an initial understanding of how the EU Space Act may
                apply to their operations.
                <br />
                <br />
                (2) The assessment results are generated based on the regulatory
                proposal (COM(2025) 335) and may change as the legislative
                process progresses. Results do not constitute a definitive
                determination of regulatory obligations.
                <br />
                <br />
                (3) Generated compliance reports are for the personal use of the
                requesting user only. Reports contain unique identifiers and
                watermarks. Redistribution of reports without authorization is
                prohibited.
              </p>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                6. Paid Services
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Current pricing is available on the website or through
                individual proposals.
                <br />
                <br />
                (2) All prices are exclusive of applicable value-added tax
                (VAT).
                <br />
                <br />
                (3) Payment is processed via SEPA direct debit, credit card, or
                invoice, depending on the chosen plan and agreement.
                <br />
                <br />
                (4) In case of payment default, Caelex is entitled to suspend
                access to the platform.
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                7. Availability
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Caelex strives for platform availability of 99.5% on an
                annual average. This excludes downtime caused by circumstances
                beyond our reasonable control.
                <br />
                <br />
                (2) Caelex is entitled to temporarily suspend the platform for
                maintenance. Scheduled maintenance will be announced in advance.
              </p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                8. Liability
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Caelex is liable without limitation for intent and gross
                negligence.
                <br />
                <br />
                (2) In cases of ordinary negligence, Caelex is liable only for
                breach of material contractual obligations (cardinal
                obligations) and only up to the foreseeable, contract-typical
                damage.
                <br />
                <br />
                (3) Liability for indirect damages, particularly lost profits,
                is excluded to the extent permitted by law.
                <br />
                <br />
                (4) The above limitations do not apply to damages resulting from
                injury to life, body, or health, or to claims under the Product
                Liability Act.
                <br />
                <br />
                (5) The platform does not replace professional legal advice.
                Caelex assumes no liability for decisions made based on the
                information provided by the platform.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                9. Data Protection
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                The collection and processing of personal data is governed by
                our{" "}
                <Link
                  href="/legal/privacy"
                  className="text-white/80 hover:text-white underline"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                10. Term and Termination
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Free accounts may be terminated at any time without cause.
                <br />
                <br />
                (2) Paid plans have a minimum term corresponding to the chosen
                billing period (monthly or annual) and are automatically renewed
                unless canceled in time.
                <br />
                <br />
                (3) Termination requires text form (email is sufficient).
                <br />
                <br />
                (4) The right to extraordinary termination for good cause
                remains unaffected.
                <br />
                <br />
                (5) Upon termination, all rights granted under these Terms
                immediately cease. The Customer must destroy or delete all
                copies of platform content in their possession.
              </p>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                11. Amendments to Terms
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Caelex reserves the right to amend these Terms at any time.
                <br />
                <br />
                (2) Changes will be communicated to the Customer at least 30
                days before taking effect via email.
                <br />
                <br />
                (3) If the Customer does not object within 30 days of receiving
                the notification, the amended Terms are deemed accepted.
              </p>
            </section>

            {/* Section 12 */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                12. Governing Law and Jurisdiction
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) These Terms are governed by the laws of the Federal Republic
                of Germany, excluding the UN Convention on Contracts for the
                International Sale of Goods (CISG).
                <br />
                <br />
                (2) If the Customer is a merchant, a legal entity under public
                law, or a special fund under public law, the exclusive place of
                jurisdiction for all disputes arising from these Terms is the
                registered office of Caelex GmbH (Berlin, Germany).
                <br />
                <br />
                (3) Should any provision of these Terms be or become invalid,
                the validity of the remaining provisions shall remain
                unaffected.
              </p>
            </section>

            {/* Section 13 */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                13. Contact
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Caelex GmbH
                <br />
                Berlin, Germany
                <br />
                <br />
                General inquiries:{" "}
                <a
                  href="mailto:cs@caelex.eu"
                  className="text-white/80 hover:text-white underline"
                >
                  cs@caelex.eu
                </a>
                <br />
                Legal inquiries:{" "}
                <a
                  href="mailto:legal@caelex.eu"
                  className="text-white/80 hover:text-white underline"
                >
                  legal@caelex.eu
                </a>
                <br />
                Security reports:{" "}
                <a
                  href="mailto:security@caelex.eu"
                  className="text-white/80 hover:text-white underline"
                >
                  security@caelex.eu
                </a>
              </p>
            </section>
          </div>

          <p className="text-[12px] text-white/30 mt-12">
            Last updated: February 2026
          </p>
        </div>
      </div>
    </main>
  );
}
