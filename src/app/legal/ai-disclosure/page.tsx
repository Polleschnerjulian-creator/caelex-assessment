import Link from "next/link";
import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  ...genMeta({
    title: "AI Transparency Disclosure",
    description:
      "Caelex AI Transparency Disclosure pursuant to the EU Artificial Intelligence Act (EU 2024/1689). Learn how ASTRA, our AI compliance assistant, works, its limitations, and your rights.",
    path: "/legal/ai-disclosure",
    keywords: [
      "AI transparency",
      "EU AI Act",
      "ASTRA AI disclosure",
      "AI compliance",
      "Article 13 AI Act",
    ],
  }),
  alternates: {
    canonical: "https://caelex.eu/legal/ai-disclosure",
  },
};

export default function AIDisclosurePage() {
  return (
    <main className="landing-light min-h-screen bg-[#F7F8FA] text-[#111827]">
      {/* Content */}
      <div className="pt-32 pb-20 px-6 md:px-12">
        <div className="max-w-[800px] mx-auto">
          <h1 className="text-display font-light tracking-[-0.02em] mb-4">
            AI Transparency Disclosure
          </h1>
          <p className="text-body text-[#4B5563] mb-8">
            Effective Date: March 29, 2026 · Last Updated: March 29, 2026
          </p>

          <p className="text-body-lg text-[#4B5563] leading-relaxed mb-10">
            This disclosure is provided pursuant to the EU Artificial
            Intelligence Act (EU 2024/1689), Article 13 (Transparency
            obligations for providers and deployers of high-risk AI systems).
          </p>

          <div className="prose prose-sm max-w-none space-y-10">
            {/* Section 1 */}
            <section>
              <h2 className="text-heading font-medium text-[#111827] mb-4">
                1. AI System Overview
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                Caelex uses an AI-powered compliance assistant called ASTRA
                (Autonomous Space &amp; Telecommunications Regulatory Agent) to
                help space operators navigate regulatory requirements.
              </p>
              <div className="p-4 bg-white rounded-lg border border-[#E5E7EB] text-body-lg text-[#4B5563] mt-4">
                <p>
                  <strong className="text-[#111827]">Provider:</strong>{" "}
                  Anthropic PBC, San Francisco, CA, USA
                </p>
                <p className="mt-1">
                  <strong className="text-[#111827]">Model:</strong> Claude
                  (Large Language Model)
                </p>
                <p className="mt-1">
                  <strong className="text-[#111827]">Integration:</strong> ASTRA
                  is available through the Caelex dashboard as an optional
                  compliance copilot.
                </p>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-heading font-medium text-[#111827] mb-4">
                2. Purpose and Functionality
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                ASTRA is used for:
              </p>
              <ul className="list-disc list-inside text-body-lg text-[#4B5563] mt-2 space-y-1">
                <li>
                  Answering questions about EU Space Act, NIS2, and national
                  space law requirements
                </li>
                <li>
                  Generating draft compliance documents (not final regulatory
                  submissions)
                </li>
                <li>
                  Analyzing uploaded documents against regulatory checklists
                </li>
                <li>
                  Providing compliance status summaries and recommendations
                </li>
              </ul>

              <p className="text-body-lg text-[#4B5563] leading-relaxed mt-6">
                ASTRA does <strong className="text-[#111827]">NOT</strong>:
              </p>
              <ul className="list-disc list-inside text-body-lg text-[#4B5563] mt-2 space-y-1">
                <li>Make binding regulatory decisions</li>
                <li>
                  Submit documents to National Competent Authorities (NCAs)
                </li>
                <li>Replace qualified legal or regulatory counsel</li>
                <li>Process personal data beyond the conversation context</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-heading font-medium text-[#111827] mb-4">
                3. Accuracy and Limitations
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                AI-generated content may be:
              </p>
              <ul className="list-disc list-inside text-body-lg text-[#4B5563] mt-2 space-y-2">
                <li>
                  <strong className="text-[#111827]">
                    Inaccurate or incomplete
                  </strong>{" "}
                  — Large language models can produce factually incorrect
                  statements (&ldquo;hallucinations&rdquo;)
                </li>
                <li>
                  <strong className="text-[#111827]">Outdated</strong> — The
                  model&apos;s knowledge has a training cutoff date and may not
                  reflect the latest regulatory changes
                </li>
                <li>
                  <strong className="text-[#111827]">Biased</strong> — Training
                  data may over-represent certain jurisdictions or regulatory
                  frameworks
                </li>
                <li>
                  <strong className="text-[#111827]">
                    Lacking jurisdiction-specific nuance
                  </strong>{" "}
                  — General guidance may not account for local regulatory
                  interpretations
                </li>
              </ul>
              <p className="text-body-lg text-[#4B5563] leading-relaxed mt-4">
                <strong className="text-[#111827]">Typical accuracy:</strong> AI
                responses are generally reliable for well-documented regulations
                (EU Space Act, NIS2) but should always be verified by qualified
                professionals before use in regulatory submissions.
              </p>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-heading font-medium text-[#111827] mb-4">
                4. Human Oversight
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                Per EU AI Act Article 14:
              </p>
              <ul className="list-disc list-inside text-body-lg text-[#4B5563] mt-2 space-y-1">
                <li>
                  All AI-generated documents include an
                  &ldquo;AI-generated&rdquo; label
                </li>
                <li>
                  Users are required to review all AI output with qualified
                  professionals before regulatory use (see{" "}
                  <Link
                    href="/legal/terms-en"
                    className="text-[#111827] underline hover:text-[#111827]"
                  >
                    Terms of Service &sect; 9
                  </Link>
                  )
                </li>
                <li>
                  ASTRA provides confidence levels (HIGH, MEDIUM, LOW) with
                  regulatory source citations
                </li>
                <li>
                  Final compliance decisions must be made by humans, not AI
                </li>
              </ul>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-heading font-medium text-[#111827] mb-4">
                5. Data Processing
              </h2>
              <ul className="list-disc list-inside text-body-lg text-[#4B5563] mt-2 space-y-2">
                <li>
                  Conversations with ASTRA are processed by Anthropic PBC under
                  a Zero Data Retention policy
                </li>
                <li>
                  Anthropic does not use Caelex user data to train its models
                </li>
                <li>
                  Conversation history is stored in the Caelex database
                  (encrypted, per-organization isolation)
                </li>
                <li>
                  Data processing is governed by our{" "}
                  <Link
                    href="/legal/privacy-en"
                    className="text-[#111827] underline hover:text-[#111827]"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  Legal basis: Article 6(1)(b) GDPR (contract performance) and
                  Article 6(1)(a) (consent for optional AI features)
                </li>
              </ul>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-heading font-medium text-[#111827] mb-4">
                6. Opt-Out
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                Use of ASTRA is entirely optional. You can use Caelex without AI
                features:
              </p>
              <ul className="list-disc list-inside text-body-lg text-[#4B5563] mt-2 space-y-1">
                <li>The compliance assessment wizards operate without AI</li>
                <li>All compliance modules function without ASTRA</li>
                <li>Document templates are available without AI generation</li>
                <li>
                  To request a fully human-guided compliance review, contact{" "}
                  <a
                    href="mailto:cs@caelex.eu"
                    className="text-[#111827] underline hover:text-[#111827]"
                  >
                    cs@caelex.eu
                  </a>
                </li>
              </ul>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-heading font-medium text-[#111827] mb-4">
                7. Contact
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                For questions about our AI systems:
              </p>
              <div className="p-4 bg-white rounded-lg border border-[#E5E7EB] text-body-lg text-[#4B5563] mt-4">
                <p>
                  Email:{" "}
                  <a
                    href="mailto:cs@caelex.eu"
                    className="text-[#111827] underline hover:text-[#111827]"
                  >
                    cs@caelex.eu
                  </a>
                </p>
                <p className="mt-1">
                  Privacy inquiries:{" "}
                  <a
                    href="mailto:privacy@caelex.eu"
                    className="text-[#111827] underline hover:text-[#111827]"
                  >
                    privacy@caelex.eu
                  </a>
                </p>
                <p className="mt-1">
                  Postal: Julian Polleschner, Am Maselakepark 37, 13587 Berlin,
                  Germany
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
