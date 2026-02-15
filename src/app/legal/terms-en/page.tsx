import Link from "next/link";

export default function TermsEnPage() {
  return (
    <main className="dark-section min-h-screen bg-black text-white">
      {/* Content */}
      <div className="pt-32 pb-20 px-6 md:px-12">
        <div className="max-w-[800px] mx-auto">
          {/* Language Toggle */}
          <div className="flex justify-end mb-6">
            <Link
              href="/legal/terms"
              className="text-[12px] text-white/40 hover:text-white/60 transition-colors border border-white/10 rounded-full px-3 py-1"
            >
              Deutsche Version
            </Link>
          </div>

          <h1 className="text-[32px] font-light tracking-[-0.02em] mb-4">
            Terms of Service
          </h1>
          <p className="text-[13px] text-white/40 mb-8">
            Effective: February 2026 · Caelex, Berlin, Germany
          </p>

          <div className="prose prose-invert prose-sm max-w-none space-y-8">
            {/* Section 1 */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                1. Scope
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) These Terms of Service ("Terms") govern all contracts
                between Caelex, represented by Julian Polleschner, Am
                Maselakepark 37, 13587 Berlin, Germany ("Caelex", "we", "us")
                and the user ("you", "Customer") regarding the use of the Caelex
                platform and associated services, including the free EU Space
                Act Compliance Assessment tool, the compliance dashboard, and
                any future paid modules.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) Deviating terms of the Customer are not recognized unless
                Caelex expressly agrees to their applicability in writing.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
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
                (COM(2025) 335), the NIS2 Directive (EU 2022/2555), and national
                space laws.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) The platform provides the following services:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 mt-2 space-y-1">
                <li>
                  Compliance assessments to determine applicability of
                  regulatory requirements
                </li>
                <li>Dashboard for managing compliance requirements</li>
                <li>Document management and audit trail</li>
                <li>ASTRA AI assistant for regulatory questions</li>
                <li>Information resources on EU Space Act and NIS2</li>
              </ul>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
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
                Caelex or its licensors and is protected by copyright, trade
                secret, and other intellectual property laws.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) The regulatory mapping data, compliance checklists, decision
                trees, and assessment algorithms contained in the platform
                represent significant research and development investment and
                constitute proprietary trade secrets of Caelex.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (3) The Customer receives a limited, non-exclusive,
                non-transferable, revocable right to use the platform for its
                intended purpose during the term of the contract. This license
                does not include any right to sublicense, distribute, or create
                derivative works.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (4) The content of the platform may not be reproduced,
                distributed, modified, publicly displayed, or otherwise
                exploited without the prior written consent of Caelex.
              </p>
            </section>

            {/* Section 4 - Prohibited Activities */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                4. Prohibited Activities
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                The following activities are strictly prohibited and constitute
                a material breach of these Terms:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 mt-3 space-y-3">
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

            {/* Section 5 - Free Assessment Tool */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                5. Free Assessment Tool
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) The EU Space Act Compliance Assessment tool is provided free
                of charge for individual use. It is designed to give space
                operators an initial understanding of how the EU Space Act may
                apply to their operations.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) The assessment results are generated based on the regulatory
                proposal (COM(2025) 335) and may change as the legislative
                process progresses. Results do not constitute a definitive
                determination of regulatory obligations.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (3) Generated compliance reports are for the personal use of the
                requesting user only. Reports contain unique identifiers and
                watermarks. Redistribution of reports without authorization is
                prohibited.
              </p>
            </section>

            {/* Section 6 - Paid Services */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                6. Paid Services
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Current pricing is available on the website or through
                individual proposals.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) All prices are exclusive of applicable value-added tax
                (VAT).
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (3) Payment is processed via SEPA direct debit, credit card, or
                invoice through our payment processor Stripe, depending on the
                chosen plan and agreement.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (4) In case of payment default, Caelex is entitled to suspend
                access to the platform.
              </p>
            </section>

            {/* § 6a */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                § 6a Right of Withdrawal and Exceptions
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Consumers are generally entitled to a 14-day right of
                withdrawal pursuant to §§ 312g, 355 BGB (German Civil Code).
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) The right of withdrawal expires pursuant to § 356(5) BGB for
                contracts for the supply of digital content not supplied on a
                tangible medium, if the provider has begun performance of the
                contract after the consumer has expressly consented to the
                provider beginning performance before expiry of the withdrawal
                period, and the consumer has confirmed awareness that such
                consent results in loss of the right of withdrawal.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (3) Paid subscriptions and API access are activated immediately
                upon payment. By registering for a paid service, the consumer
                expressly consents to the immediate commencement of the service
                and confirms awareness of the resulting loss of the right of
                withdrawal.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (4) The free assessment tool may be discontinued at any time
                without reason. There is no entitlement to continued provision
                of free services.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (5) The right to ordinary termination pursuant to § 12 of these
                Terms remains unaffected.
              </p>
            </section>

            {/* Section 7 - Availability and SLA */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                7. Availability and SLA
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Caelex strives for platform availability of 99.5% on an
                annual average. This excludes downtime caused by circumstances
                beyond our reasonable control (force majeure, maintenance).
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) Caelex is entitled to temporarily suspend the platform for
                maintenance. Scheduled maintenance will be announced at least 48
                hours in advance via email or in-app notification.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (3) If the guaranteed availability falls below the target in
                Enterprise plans, service credits will be granted in accordance
                with the individual Service Level Agreement.
              </p>
            </section>

            {/* Section 8 - Force Majeure */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                8. Force Majeure
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Neither party shall be liable for any delay or failure to
                perform its obligations where such delay or failure results from
                circumstances beyond its reasonable control, including but not
                limited to:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 mt-2 space-y-1">
                <li>Natural disasters, epidemics, or pandemics</li>
                <li>War, terrorism, insurrection, or civil unrest</li>
                <li>Strikes, lockouts, or other labor disputes</li>
                <li>Governmental actions, laws, regulations, or embargoes</li>
                <li>
                  Power outages, internet failures, or third-party service
                  failures
                </li>
                <li>
                  Cyberattacks occurring despite reasonable security measures
                </li>
              </ul>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) The affected party must notify the other party without undue
                delay of the occurrence and expected duration of the force
                majeure event.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (3) If a force majeure event continues for more than 90 days,
                either party may terminate the contract with 30 days' notice.
              </p>
            </section>

            {/* Section 9 - Liability */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                9. Liability
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Caelex is liable without limitation for intent and gross
                negligence, as well as for damages resulting from injury to
                life, body, or health.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) In cases of ordinary negligence, Caelex is liable only for
                breach of material contractual obligations (cardinal
                obligations) and only up to the foreseeable, contract-typical
                damage, but in any event not exceeding the fees paid by the
                Customer in the preceding 12 months.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (3) Liability for indirect damages, particularly lost profits,
                data loss, or business interruption, is excluded to the extent
                permitted by law.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (4) The above limitations do not apply to claims under the
                Product Liability Act or for fraudulent concealment of defects.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (5) The platform does not replace professional legal advice.
                Caelex assumes no liability for decisions made based on the
                information provided by the platform or AI-generated content.
              </p>
            </section>

            {/* Section 10 - Indemnification */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                10. Indemnification
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) The Customer agrees to indemnify, defend, and hold harmless
                Caelex from and against any and all claims, damages, losses,
                costs, and expenses (including reasonable attorneys' fees)
                arising out of or relating to:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 mt-2 space-y-1">
                <li>Violation of these Terms or usage policies</li>
                <li>Infringement of any third-party rights</li>
                <li>Upload of unlawful or infringing content</li>
                <li>Violation of applicable laws or regulations</li>
              </ul>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) The indemnification obligation includes reasonable costs of
                legal defense, including attorney and court fees.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (3) Caelex will promptly notify the Customer of any claims
                asserted and provide the opportunity to defend.
              </p>
            </section>

            {/* Section 11 - Data Protection */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                11. Data Protection
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) The collection and processing of personal data is governed
                by our{" "}
                <Link
                  href="/legal/privacy-en"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  Privacy Policy
                </Link>
                .
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) Where the Customer provides us with personal data for
                processing, we will enter into a Data Processing Agreement
                pursuant to Art. 28 GDPR upon request.
              </p>
            </section>

            {/* Section 12 - Term and Termination */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                12. Term and Termination
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Free accounts may be terminated at any time without cause.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) Paid plans have a minimum term corresponding to the chosen
                billing period (monthly or annual) and are automatically renewed
                for the same period unless canceled at least 30 days before the
                end of the term.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (3) Termination requires text form (email to cs@caelex.eu is
                sufficient) or can be done through account settings.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (4) The right to extraordinary termination for good cause
                remains unaffected. Good cause exists in particular in the case
                of material breach of contract, repeated violation of these
                Terms, or insolvency of a party.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (5) Upon termination, all rights granted under these Terms
                immediately cease. The Customer must destroy or delete all
                copies of platform content in their possession.
              </p>
            </section>

            {/* Section 13 - API Usage */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                13. API Usage
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Use of the Caelex API is subject to these Terms and the
                following additional conditions:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 mt-2 space-y-1">
                <li>
                  API keys are confidential and may not be shared with third
                  parties
                </li>
                <li>
                  Rate limits according to the respective plan must be observed
                </li>
                <li>
                  The API may not be used for automated data extraction or
                  scraping
                </li>
                <li>Applications must be properly authenticated</li>
              </ul>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) Caelex reserves the right to suspend API access immediately
                in case of abuse or violation of these conditions.
              </p>
            </section>

            {/* Section 14 - Beta Features */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                14. Beta Features
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) From time to time, we may offer beta or preview features
                labeled as "Beta", "Preview", "Experimental", or similar.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) Beta features are provided "as is" without any warranty and
                may be changed or discontinued at any time without notice.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (3) Use of beta features is at your own risk. Caelex assumes no
                liability for damages arising from the use of beta features.
              </p>
            </section>

            {/* Section 15 - Amendments */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                15. Amendments to Terms
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Caelex reserves the right to amend these Terms at any time.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) Changes will be communicated to the Customer at least 30
                days before taking effect via email.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (3) If the Customer does not object within 30 days of receiving
                the notification, the amended Terms are deemed accepted. The
                Customer will be informed of this legal consequence in the
                change notification.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (4) In the event of an objection, either party is entitled to
                terminate the contract as of the planned effective date of the
                amendment.
              </p>
            </section>

            {/* Section 16 - Consumer Protection */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                16. Consumer Protection (B2C)
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) The following provisions apply exclusively to customers who
                are consumers within the meaning of § 13 BGB (German Civil Code)
                — natural persons entering into the contract for purposes that
                are predominantly outside their trade, business, or profession.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) To the extent that provisions of these Terms are invalid
                vis-à-vis consumers pursuant to §§ 305-310 BGB, the remaining
                provisions shall remain unaffected. In particular, statutory
                provisions regarding warranty rights (§§ 434 et seq. BGB), right
                of withdrawal (§§ 312g, 355 et seq. BGB, see § 6a), and
                limitations of liability apply without restriction.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (3) The jurisdiction clause in § 17(2) of these Terms does not
                apply to consumers. For consumers, the statutory rules of
                jurisdiction apply.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (4) The limitations of liability in § 9 apply to consumers only
                to the extent they do not conflict with mandatory consumer
                protection law. Claims under product liability law (ProdHaftG)
                and for injury to life, body, or health remain unaffected in all
                cases.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (5) For entrepreneurs within the meaning of § 14 BGB, the
                general provisions of these Terms apply without the restrictions
                of this section.
              </p>
            </section>

            {/* Section 17 - Final Provisions */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                17. Final Provisions
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) These Terms are governed by the laws of the Federal Republic
                of Germany, excluding the UN Convention on Contracts for the
                International Sale of Goods (CISG).
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) If the Customer is a merchant, a legal entity under public
                law, or a special fund under public law, the exclusive place of
                jurisdiction for all disputes arising from these Terms is
                Berlin, Germany.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (3) Should any provision of these Terms be or become invalid,
                the validity of the remaining provisions shall remain
                unaffected. In place of the invalid provision, a provision that
                comes closest to the economic purpose of the invalid provision
                shall apply.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (4) There are no oral collateral agreements. Amendments and
                supplements to this contract require text form.
              </p>
            </section>

            {/* Section 17 - Contact */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                18. Contact
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Caelex
                <br />
                Julian Polleschner
                <br />
                Am Maselakepark 37
                <br />
                13587 Berlin, Germany
                <br />
                <br />
                General inquiries:{" "}
                <a
                  href="mailto:cs@caelex.eu"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  cs@caelex.eu
                </a>
                <br />
                Legal inquiries:{" "}
                <a
                  href="mailto:legal@caelex.eu"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  legal@caelex.eu
                </a>
                <br />
                Security reports:{" "}
                <a
                  href="mailto:security@caelex.eu"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  security@caelex.eu
                </a>
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-white/[0.06]">
            <p className="text-[12px] text-white/30">
              Last updated: February 2026 · Version 2.0
            </p>
            <div className="flex gap-4 mt-4">
              <Link
                href="/legal/terms"
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
                href="/legal/cookies-en"
                className="text-[12px] text-white/40 hover:text-white/60"
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
