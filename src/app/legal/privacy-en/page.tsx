import Link from "next/link";

export default function PrivacyEnPage() {
  return (
    <main className="dark-section min-h-screen bg-black text-white">
      {/* Content */}
      <div className="pt-32 pb-20 px-6 md:px-12">
        <div className="max-w-[800px] mx-auto">
          {/* Language Toggle */}
          <div className="flex justify-end mb-6">
            <Link
              href="/legal/privacy"
              className="text-[12px] text-white/40 hover:text-white/60 transition-colors border border-white/10 rounded-full px-3 py-1"
            >
              Deutsche Version
            </Link>
          </div>

          <h1 className="text-[32px] font-light tracking-[-0.02em] mb-4">
            Privacy Policy
          </h1>
          <p className="text-[13px] text-white/40 mb-8">
            Effective: February 2026 · Caelex, Berlin, Germany
          </p>

          <div className="prose prose-invert prose-sm max-w-none space-y-10">
            {/* Section 1 - Overview */}
            <section>
              <h2 className="text-[20px] font-medium text-white mb-6">
                1. Overview
              </h2>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                Data Controller
              </h3>
              <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06] text-[14px] text-white/60">
                <p>
                  <strong className="text-white/80">Caelex</strong>
                  <br />
                  Julian Polleschner
                  <br />
                  Am Maselakepark 37
                  <br />
                  13587 Berlin, Germany
                  <br />
                  <br />
                  Privacy inquiries:{" "}
                  <a
                    href="mailto:privacy@caelex.eu"
                    className="text-emerald-400 hover:text-emerald-300"
                  >
                    privacy@caelex.eu
                  </a>
                  <br />
                  General:{" "}
                  <a
                    href="mailto:cs@caelex.eu"
                    className="text-emerald-400 hover:text-emerald-300"
                  >
                    cs@caelex.eu
                  </a>
                </p>
              </div>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                Summary of Data Processing
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Caelex is a compliance platform for the EU Space Act and related
                space regulation. We process personal data solely to provide our
                services, improve the platform, and fulfill legal obligations.
                This privacy policy provides comprehensive information about the
                nature, scope, and purpose of data processing.
              </p>

              <div className="mt-4 p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <p className="text-[13px] text-emerald-400 font-medium mb-2">
                  Your Rights at a Glance
                </p>
                <ul className="text-[13px] text-white/60 space-y-1">
                  <li>• Access to your stored data (Art. 15 GDPR)</li>
                  <li>• Rectification of inaccurate data (Art. 16 GDPR)</li>
                  <li>• Erasure of your data (Art. 17 GDPR)</li>
                  <li>• Restriction of processing (Art. 18 GDPR)</li>
                  <li>• Data portability (Art. 20 GDPR)</li>
                  <li>• Object to processing (Art. 21 GDPR)</li>
                  <li>• Withdraw consent (Art. 7(3) GDPR)</li>
                  <li>
                    • Lodge a complaint with supervisory authority (Art. 77
                    GDPR)
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 2 - Data Collection */}
            <section>
              <h2 className="text-[20px] font-medium text-white mb-6">
                2. Data Collection on This Website
              </h2>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                2.1 Automatically Collected Data (Server Logs)
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                When you access our website, technical data is automatically
                collected:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 mt-2 space-y-1">
                <li>IP address (anonymized after 24 hours)</li>
                <li>Date and time of access</li>
                <li>Accessed page/resource</li>
                <li>Browser type and version</li>
                <li>Operating system</li>
                <li>Referrer URL</li>
              </ul>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                <strong className="text-white/80">Legal basis:</strong> Art.
                6(1)(f) GDPR (legitimate interest in website security and
                stability).
                <br />
                <strong className="text-white/80">Retention:</strong> 14 days,
                then automatically deleted.
              </p>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                2.2 Registration and User Account
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                When registering, we collect:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 mt-2 space-y-1">
                <li>Email address (required)</li>
                <li>Name (optional)</li>
                <li>Company/Organization (optional)</li>
                <li>Password (bcrypt-hashed with 12 rounds)</li>
              </ul>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                <strong className="text-white/80">Legal basis:</strong> Art.
                6(1)(b) GDPR (contract performance).
                <br />
                <strong className="text-white/80">Retention:</strong> Until
                account deletion plus statutory retention periods.
              </p>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                2.3 Compliance Assessments
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                When using our assessment tools, we process:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 mt-2 space-y-1">
                <li>Responses to assessment questions</li>
                <li>Calculated compliance profiles</li>
                <li>Generated reports and recommendations</li>
                <li>Timestamps and versioning</li>
              </ul>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                <strong className="text-white/80">Legal basis:</strong> Art.
                6(1)(b) GDPR (contract performance).
                <br />
                <strong className="text-white/80">Retention:</strong> Until
                deletion by user or account deletion.
              </p>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                2.4 Contact Form and Email
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                When you contact us, we process the information you provide
                (name, email, message) to handle your inquiry.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                <strong className="text-white/80">Legal basis:</strong> Art.
                6(1)(b) GDPR (pre-contractual measures) or Art. 6(1)(f) GDPR
                (legitimate interest).
                <br />
                <strong className="text-white/80">Retention:</strong> 3 years
                after inquiry completion.
              </p>
            </section>

            {/* Section 3 - Third Party Services */}
            <section>
              <h2 className="text-[20px] font-medium text-white mb-6">
                3. Third-Party Services and Processors
              </h2>

              <p className="text-[14px] text-white/60 leading-relaxed mb-4">
                We use the following service providers who process personal data
                on our behalf. Data Processing Agreements pursuant to Art. 28
                GDPR are in place with all providers.
              </p>

              {/* Hosting */}
              <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06] mb-4">
                <h4 className="text-[14px] font-medium text-white mb-2">
                  Vercel Inc. — Hosting & CDN
                </h4>
                <p className="text-[13px] text-white/60">
                  440 N Barranca Ave #4133, Covina, CA 91723, USA
                  <br />
                  <strong className="text-white/70">Purpose:</strong> Website
                  hosting, content delivery, edge functions
                  <br />
                  <strong className="text-white/70">Data:</strong> IP addresses,
                  request data, logs
                  <br />
                  <strong className="text-white/70">Safeguards:</strong> EU-US
                  Data Privacy Framework, SCCs
                  <br />
                  <a
                    href="https://vercel.com/legal/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 text-[12px]"
                  >
                    Privacy Policy →
                  </a>
                </p>
              </div>

              {/* Database */}
              <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06] mb-4">
                <h4 className="text-[14px] font-medium text-white mb-2">
                  Neon Inc. — Database
                </h4>
                <p className="text-[13px] text-white/60">
                  San Francisco, CA, USA
                  <br />
                  <strong className="text-white/70">Purpose:</strong> PostgreSQL
                  database for all application data
                  <br />
                  <strong className="text-white/70">Data:</strong> All data
                  stored in the platform (encrypted)
                  <br />
                  <strong className="text-white/70">Safeguards:</strong> SOC 2
                  Type II, SCCs, encryption at rest
                  <br />
                  <a
                    href="https://neon.tech/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 text-[12px]"
                  >
                    Privacy Policy →
                  </a>
                </p>
              </div>

              {/* Payments */}
              <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06] mb-4">
                <h4 className="text-[14px] font-medium text-white mb-2">
                  Stripe Inc. — Payment Processing
                </h4>
                <p className="text-[13px] text-white/60">
                  354 Oyster Point Blvd, South San Francisco, CA 94080, USA
                  <br />
                  <strong className="text-white/70">Purpose:</strong> Payment
                  processing, subscription management
                  <br />
                  <strong className="text-white/70">Data:</strong> Email, name,
                  payment information, billing address
                  <br />
                  <strong className="text-white/70">Safeguards:</strong> PCI DSS
                  Level 1, EU-US DPF, SCCs
                  <br />
                  <a
                    href="https://stripe.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 text-[12px]"
                  >
                    Privacy Policy →
                  </a>
                </p>
              </div>

              {/* Email */}
              <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06] mb-4">
                <h4 className="text-[14px] font-medium text-white mb-2">
                  Resend Inc. — Email Delivery
                </h4>
                <p className="text-[13px] text-white/60">
                  San Francisco, CA, USA
                  <br />
                  <strong className="text-white/70">Purpose:</strong>{" "}
                  Transactional emails, notifications
                  <br />
                  <strong className="text-white/70">Data:</strong> Email
                  addresses, email content, open rates
                  <br />
                  <strong className="text-white/70">Safeguards:</strong> SCCs
                  <br />
                  <a
                    href="https://resend.com/legal/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 text-[12px]"
                  >
                    Privacy Policy →
                  </a>
                </p>
              </div>

              {/* File Storage */}
              <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06] mb-4">
                <h4 className="text-[14px] font-medium text-white mb-2">
                  Cloudflare Inc. — File Storage (R2)
                </h4>
                <p className="text-[13px] text-white/60">
                  101 Townsend St, San Francisco, CA 94107, USA
                  <br />
                  <strong className="text-white/70">Purpose:</strong> Storage of
                  uploaded documents
                  <br />
                  <strong className="text-white/70">Data:</strong> Uploaded
                  files, metadata
                  <br />
                  <strong className="text-white/70">Safeguards:</strong> ISO
                  27001, SOC 2, EU-US DPF, SCCs
                  <br />
                  <a
                    href="https://www.cloudflare.com/privacypolicy/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 text-[12px]"
                  >
                    Privacy Policy →
                  </a>
                </p>
              </div>

              {/* Rate Limiting */}
              <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06] mb-4">
                <h4 className="text-[14px] font-medium text-white mb-2">
                  Upstash Inc. — Rate Limiting
                </h4>
                <p className="text-[13px] text-white/60">
                  San Francisco, CA, USA
                  <br />
                  <strong className="text-white/70">Purpose:</strong> API rate
                  limiting, abuse protection
                  <br />
                  <strong className="text-white/70">Data:</strong> Anonymized
                  request identifiers, counters
                  <br />
                  <strong className="text-white/70">Safeguards:</strong> SOC 2,
                  SCCs
                  <br />
                  <a
                    href="https://upstash.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 text-[12px]"
                  >
                    Privacy Policy →
                  </a>
                </p>
              </div>

              {/* Error Tracking */}
              <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06] mb-4">
                <h4 className="text-[14px] font-medium text-white mb-2">
                  Sentry (Functional Software Inc.) — Error Tracking
                </h4>
                <p className="text-[13px] text-white/60">
                  45 Fremont Street, San Francisco, CA 94105, USA
                  <br />
                  <strong className="text-white/70">Purpose:</strong> Error
                  detection, performance monitoring (consent required)
                  <br />
                  <strong className="text-white/70">Data:</strong> Error
                  reports, browser information, anonymized session data
                  <br />
                  <strong className="text-white/70">Safeguards:</strong> SOC 2,
                  SCCs
                  <br />
                  <a
                    href="https://sentry.io/privacy/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 text-[12px]"
                  >
                    Privacy Policy →
                  </a>
                </p>
              </div>

              {/* Analytics */}
              <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                <h4 className="text-[14px] font-medium text-white mb-2">
                  Vercel Analytics — Usage Analytics
                </h4>
                <p className="text-[13px] text-white/60">
                  <strong className="text-white/70">Purpose:</strong> Anonymous
                  usage statistics (consent required)
                  <br />
                  <strong className="text-white/70">Data:</strong> Aggregated,
                  anonymized page views
                  <br />
                  <strong className="text-white/70">Cookies:</strong> None
                  (cookieless)
                  <br />
                  <a
                    href="https://vercel.com/docs/analytics/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 text-[12px]"
                  >
                    Privacy Policy →
                  </a>
                </p>
              </div>

              {/* AI Service */}
              <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06] mt-4">
                <h4 className="text-[14px] font-medium text-white mb-2">
                  Anthropic PBC — AI Assistant (ASTRA)
                </h4>
                <p className="text-[13px] text-white/60">
                  548 Market St, San Francisco, CA 94104, USA
                  <br />
                  <strong className="text-white/70">Purpose:</strong> AI-powered
                  compliance assistant (ASTRA) — answering questions about
                  regulatory requirements
                  <br />
                  <strong className="text-white/70">Data:</strong> User text
                  queries, compliance module context (no personal data unless
                  entered by user)
                  <br />
                  <strong className="text-white/70">Safeguards:</strong> SCCs,
                  Zero Data Retention Policy (API requests are not used for
                  training purposes)
                  <br />
                  <strong className="text-white/70">Note:</strong> Use of ASTRA
                  is voluntary. Data is only transmitted when actively using the
                  AI assistant.
                  <br />
                  <a
                    href="https://www.anthropic.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 text-[12px]"
                  >
                    Privacy Policy →
                  </a>
                </p>
              </div>
            </section>

            {/* Section 4 - International Transfers */}
            <section>
              <h2 className="text-[20px] font-medium text-white mb-6">
                4. International Data Transfers
              </h2>

              <p className="text-[14px] text-white/60 leading-relaxed">
                Some of our service providers are located in the United States.
                The transfer of personal data to the USA is based on the
                following safeguards:
              </p>

              <div className="mt-4 space-y-3">
                <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <h4 className="text-[14px] font-medium text-white mb-2">
                    EU-US Data Privacy Framework
                  </h4>
                  <p className="text-[13px] text-white/60">
                    For providers certified under the EU-US DPF (Vercel, Stripe,
                    Cloudflare), there is an adequacy decision by the EU
                    Commission pursuant to Art. 45 GDPR.
                  </p>
                </div>

                <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <h4 className="text-[14px] font-medium text-white mb-2">
                    Standard Contractual Clauses (SCCs)
                  </h4>
                  <p className="text-[13px] text-white/60">
                    In addition to or as an alternative to the DPF, we have
                    entered into the EU Commission-approved Standard Contractual
                    Clauses with all US providers (Art. 46(2)(c) GDPR). This
                    includes in particular Anthropic PBC, whose services are
                    safeguarded via SCCs and a Zero Data Retention Policy.
                  </p>
                </div>

                <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <h4 className="text-[14px] font-medium text-white mb-2">
                    Additional Technical Measures
                  </h4>
                  <p className="text-[13px] text-white/60">
                    All data is encrypted in transit (TLS 1.3) and at rest
                    (AES-256). Sensitive data (tax numbers, bank details) is
                    additionally encrypted with AES-256-GCM using derived keys.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 5 - AI and Automated Decision Making */}
            <section>
              <h2 className="text-[20px] font-medium text-white mb-6">
                5. AI and Automated Decision-Making
              </h2>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                5.1 ASTRA AI Assistant
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Our platform uses the AI assistant "ASTRA" to support compliance
                inquiries. ASTRA is based on Large Language Models and processes
                your queries as follows:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 mt-2 space-y-1">
                <li>Your text queries are transmitted to the AI service</li>
                <li>
                  Responses are generated based on the input and our regulatory
                  database
                </li>
                <li>Conversation history is temporarily stored</li>
              </ul>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                <strong className="text-white/80">Important:</strong> ASTRA does
                not make legally binding decisions. All outputs are intended as
                support and do not replace legal advice.
              </p>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                5.2 Compliance Assessment Algorithms
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Our assessments use rule-based algorithms to determine
                regulatory applicability. These algorithms:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 mt-2 space-y-1">
                <li>
                  Process your responses deterministically (same input = same
                  result)
                </li>
                <li>Do not make independent decisions</li>
                <li>
                  Provide recommendations, not binding legal determinations
                </li>
              </ul>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                <strong className="text-white/80">Legal basis:</strong> Art.
                6(1)(b) GDPR. No automated decision-making within the meaning of
                Art. 22 GDPR takes place, as no decisions with legal effect are
                made.
              </p>
            </section>

            {/* Section 6 - Data Retention */}
            <section>
              <h2 className="text-[20px] font-medium text-white mb-6">
                6. Data Retention
              </h2>

              <p className="text-[14px] text-white/60 leading-relaxed mb-4">
                We retain personal data only as long as necessary for the
                respective purposes or as required by statutory retention
                obligations.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr className="text-left text-white/40 border-b border-white/[0.06]">
                      <th className="py-3 pr-4">Data Category</th>
                      <th className="py-3 pr-4">Retention Period</th>
                      <th className="py-3">Legal Basis</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/60">
                    <tr className="border-b border-white/[0.06]">
                      <td className="py-3 pr-4">Account data</td>
                      <td className="py-3 pr-4">
                        Until account deletion + 30 days
                      </td>
                      <td className="py-3">Art. 6(1)(b) GDPR</td>
                    </tr>
                    <tr className="border-b border-white/[0.06]">
                      <td className="py-3 pr-4">Assessment data</td>
                      <td className="py-3 pr-4">Until deletion by user</td>
                      <td className="py-3">Art. 6(1)(b) GDPR</td>
                    </tr>
                    <tr className="border-b border-white/[0.06]">
                      <td className="py-3 pr-4">Server logs</td>
                      <td className="py-3 pr-4">14 days</td>
                      <td className="py-3">Art. 6(1)(f) GDPR</td>
                    </tr>
                    <tr className="border-b border-white/[0.06]">
                      <td className="py-3 pr-4">Billing data</td>
                      <td className="py-3 pr-4">10 years (tax law)</td>
                      <td className="py-3">Art. 6(1)(c) GDPR</td>
                    </tr>
                    <tr className="border-b border-white/[0.06]">
                      <td className="py-3 pr-4">Audit logs</td>
                      <td className="py-3 pr-4">7 years</td>
                      <td className="py-3">Art. 6(1)(f) GDPR</td>
                    </tr>
                    <tr className="border-b border-white/[0.06]">
                      <td className="py-3 pr-4">Contact inquiries</td>
                      <td className="py-3 pr-4">3 years after completion</td>
                      <td className="py-3">Art. 6(1)(f) GDPR</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4">Cookie consent</td>
                      <td className="py-3 pr-4">Indefinite (localStorage)</td>
                      <td className="py-3">Art. 6(1)(c) GDPR</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 7 - Security */}
            <section>
              <h2 className="text-[20px] font-medium text-white mb-6">
                7. Data Security
              </h2>

              <p className="text-[14px] text-white/60 leading-relaxed mb-4">
                We implement comprehensive technical and organizational measures
                to protect your data:
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <h4 className="text-[14px] font-medium text-white mb-2">
                    Encryption
                  </h4>
                  <ul className="text-[13px] text-white/60 space-y-1">
                    <li>• TLS 1.3 for all connections</li>
                    <li>• AES-256 for data at rest</li>
                    <li>• AES-256-GCM for sensitive fields</li>
                    <li>• Bcrypt (12 rounds) for passwords</li>
                  </ul>
                </div>

                <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <h4 className="text-[14px] font-medium text-white mb-2">
                    Access Control
                  </h4>
                  <ul className="text-[13px] text-white/60 space-y-1">
                    <li>• Role-based access control (RBAC)</li>
                    <li>• Two-factor authentication (optional)</li>
                    <li>• Session management with timeout</li>
                    <li>• Brute-force protection</li>
                  </ul>
                </div>

                <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <h4 className="text-[14px] font-medium text-white mb-2">
                    Infrastructure
                  </h4>
                  <ul className="text-[13px] text-white/60 space-y-1">
                    <li>• ISO 27001 certified data centers</li>
                    <li>• SOC 2 Type II compliance</li>
                    <li>• Regular security audits</li>
                    <li>• DDoS protection</li>
                  </ul>
                </div>

                <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <h4 className="text-[14px] font-medium text-white mb-2">
                    Monitoring
                  </h4>
                  <ul className="text-[13px] text-white/60 space-y-1">
                    <li>• Complete audit trail</li>
                    <li>• Security event logging</li>
                    <li>• Anomaly detection</li>
                    <li>• Incident response plan</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 8 - Data Breaches */}
            <section>
              <h2 className="text-[20px] font-medium text-white mb-6">
                8. Data Breaches
              </h2>

              <p className="text-[14px] text-white/60 leading-relaxed">
                In the event of a personal data breach, we act in accordance
                with Art. 33 and 34 GDPR:
              </p>

              <ul className="list-disc list-inside text-[14px] text-white/60 mt-3 space-y-2">
                <li>
                  <strong className="text-white/80">
                    Notification to supervisory authority:
                  </strong>{" "}
                  Within 72 hours of becoming aware, if there is a risk to data
                  subjects
                </li>
                <li>
                  <strong className="text-white/80">
                    Notification to affected individuals:
                  </strong>{" "}
                  Without undue delay in case of high risk, with description of
                  measures taken
                </li>
                <li>
                  <strong className="text-white/80">Documentation:</strong> All
                  incidents are documented, including cause, impact, and
                  remedial actions
                </li>
              </ul>

              <p className="text-[14px] text-white/60 leading-relaxed mt-4">
                Report security incidents to:{" "}
                <a
                  href="mailto:security@caelex.eu"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  security@caelex.eu
                </a>
              </p>
            </section>

            {/* Section 9 - Your Rights */}
            <section>
              <h2 className="text-[20px] font-medium text-white mb-6">
                9. Your Rights in Detail
              </h2>

              <div className="space-y-4">
                <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <h4 className="text-[14px] font-medium text-white mb-2">
                    Right of Access (Art. 15 GDPR)
                  </h4>
                  <p className="text-[13px] text-white/60">
                    You have the right to obtain confirmation as to whether we
                    process personal data concerning you, and to access such
                    data and receive a copy.
                  </p>
                </div>

                <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <h4 className="text-[14px] font-medium text-white mb-2">
                    Right to Rectification (Art. 16 GDPR)
                  </h4>
                  <p className="text-[13px] text-white/60">
                    You have the right to obtain the rectification of inaccurate
                    data and completion of incomplete data without undue delay.
                  </p>
                </div>

                <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <h4 className="text-[14px] font-medium text-white mb-2">
                    Right to Erasure (Art. 17 GDPR)
                  </h4>
                  <p className="text-[13px] text-white/60">
                    You have the right to obtain erasure of your data unless
                    statutory retention obligations or legitimate interests
                    prevent this. You can delete your account at any time in
                    settings.
                  </p>
                </div>

                <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <h4 className="text-[14px] font-medium text-white mb-2">
                    Right to Restriction (Art. 18 GDPR)
                  </h4>
                  <p className="text-[13px] text-white/60">
                    You have the right to obtain restriction of processing, for
                    example if you contest the accuracy of data or the
                    processing is unlawful.
                  </p>
                </div>

                <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <h4 className="text-[14px] font-medium text-white mb-2">
                    Right to Data Portability (Art. 20 GDPR)
                  </h4>
                  <p className="text-[13px] text-white/60">
                    You have the right to receive your data in a structured,
                    commonly used, machine-readable format (JSON/CSV export
                    available in account settings).
                  </p>
                </div>

                <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <h4 className="text-[14px] font-medium text-white mb-2">
                    Right to Object (Art. 21 GDPR)
                  </h4>
                  <p className="text-[13px] text-white/60">
                    You have the right to object to processing based on
                    legitimate interest on grounds relating to your particular
                    situation.
                  </p>
                </div>

                <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <h4 className="text-[14px] font-medium text-white mb-2">
                    Right to Withdraw Consent (Art. 7(3) GDPR)
                  </h4>
                  <p className="text-[13px] text-white/60">
                    You may withdraw consent (e.g., for analytics) at any time.
                    Withdrawal does not affect the lawfulness of processing
                    carried out prior to withdrawal.
                  </p>
                </div>

                <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <h4 className="text-[14px] font-medium text-white mb-2">
                    Right to Lodge a Complaint (Art. 77 GDPR)
                  </h4>
                  <p className="text-[13px] text-white/60">
                    You have the right to lodge a complaint with a data
                    protection supervisory authority. The competent authority
                    is:
                    <br />
                    <br />
                    Berlin Commissioner for Data Protection and Freedom of
                    Information
                    <br />
                    Friedrichstr. 219, 10969 Berlin, Germany
                    <br />
                    <a
                      href="mailto:mailbox@datenschutz-berlin.de"
                      className="text-emerald-400 hover:text-emerald-300"
                    >
                      mailbox@datenschutz-berlin.de
                    </a>
                  </p>
                </div>
              </div>

              <p className="text-[14px] text-white/60 leading-relaxed mt-6">
                <strong className="text-white/80">
                  How to exercise your rights:
                </strong>{" "}
                Send an email to{" "}
                <a
                  href="mailto:privacy@caelex.eu"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  privacy@caelex.eu
                </a>{" "}
                stating your request. We will respond within 30 days.
              </p>
            </section>

            {/* Section 10 - Cookies */}
            <section>
              <h2 className="text-[20px] font-medium text-white mb-6">
                10. Cookies and Tracking
              </h2>

              <p className="text-[14px] text-white/60 leading-relaxed">
                For detailed information about the cookies we use, please see
                our{" "}
                <Link
                  href="/legal/cookies-en"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  Cookie Policy
                </Link>
                .
              </p>
            </section>

            {/* Section 11 - B2B */}
            <section>
              <h2 className="text-[20px] font-medium text-white mb-6">
                11. Data Processing for Business Customers
              </h2>

              <p className="text-[14px] text-white/60 leading-relaxed">
                If you use Caelex as a business and we process personal data on
                your behalf (e.g., data of your employees), we will enter into a
                Data Processing Agreement (DPA) pursuant to Art. 28 GDPR upon
                request.
              </p>

              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                For Enterprise customers, we offer:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 mt-2 space-y-1">
                <li>Custom DPA tailored to your requirements</li>
                <li>Technical and organizational measures (TOMs)</li>
                <li>List of all sub-processors</li>
                <li>Support with Data Protection Impact Assessments</li>
              </ul>

              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                Contact:{" "}
                <a
                  href="mailto:legal@caelex.eu"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  legal@caelex.eu
                </a>
              </p>
            </section>

            {/* Section 12 - Changes */}
            <section>
              <h2 className="text-[20px] font-medium text-white mb-6">
                12. Changes to This Privacy Policy
              </h2>

              <p className="text-[14px] text-white/60 leading-relaxed">
                We reserve the right to update this privacy policy to reflect
                changes in law or our services. The current version is always
                available on this page. Registered users will be notified of
                material changes by email.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-white/[0.06]">
            <p className="text-[12px] text-white/30">
              Last updated: February 2026 · Version 2.0
            </p>
            <div className="flex gap-4 mt-4">
              <Link
                href="/legal/privacy"
                className="text-[12px] text-emerald-400 hover:text-emerald-300"
              >
                Deutsche Version →
              </Link>
              <Link
                href="/legal/cookies-en"
                className="text-[12px] text-white/40 hover:text-white/60"
              >
                Cookie Policy
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
