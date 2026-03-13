import Link from "next/link";
import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  ...genMeta({
    title: "Accessibility Statement",
    description:
      "Accessibility statement for Caelex per BFSG. Information on WCAG 2.1 AA conformity status, known limitations, and contact options for reporting barriers.",
    path: "/legal/accessibility",
    keywords: [
      "accessibility",
      "BFSG",
      "WCAG",
      "BITV",
      "Caelex accessibility statement",
      "Barrierefreiheitsstärkungsgesetz",
    ],
  }),
  alternates: {
    canonical: "https://caelex.eu/legal/accessibility",
    languages: {
      de: "/legal/barrierefreiheit",
      en: "/legal/accessibility",
    },
  },
};

export default function AccessibilityPage() {
  return (
    <main className="landing-light min-h-screen bg-[#F7F8FA] text-[#111827]">
      {/* Content */}
      <div className="pt-32 pb-20 px-6 md:px-12">
        <div className="max-w-[800px] mx-auto">
          {/* Language Toggle */}
          <div className="flex justify-end mb-6">
            <Link
              href="/legal/barrierefreiheit"
              className="text-small text-[#4B5563] hover:text-[#4B5563] transition-colors border border-[#E5E7EB] rounded-full px-3 py-1"
            >
              Deutsche Version
            </Link>
          </div>

          <h1 className="text-display font-light tracking-[-0.02em] mb-4">
            Accessibility Statement
          </h1>
          <p className="text-body text-[#4B5563] mb-8">
            As of: March 13, 2026 · Caelex, Berlin, Germany
          </p>

          <div className="prose prose-sm max-w-none space-y-10">
            {/* Section 1 - Scope */}
            <section>
              <h2 className="text-heading font-medium text-[#111827] mb-4">
                1. Scope
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                This accessibility statement applies to the website{" "}
                <a
                  href="https://caelex.eu"
                  className="text-[#4B5563] hover:text-[#111827] underline"
                >
                  caelex.eu
                </a>
                , operated by Julian Polleschner (sole proprietor). It has been
                prepared in accordance with Section 12a of the German
                Accessibility Strengthening Act
                (Barrierefreiheitsstärkungsgesetz — BFSG) in conjunction with
                the Accessible Information Technology Regulation (BITV 2.0).
              </p>
            </section>

            {/* Section 2 - Conformity Status */}
            <section>
              <h2 className="text-heading font-medium text-[#111827] mb-4">
                2. Conformity Status
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                This website is{" "}
                <strong className="text-[#111827]">partially conformant</strong>{" "}
                with the Web Content Accessibility Guidelines (WCAG) 2.1 Level
                AA and the European standard EN 301 549.
              </p>
              <p className="text-body-lg text-[#4B5563] leading-relaxed mt-3">
                We are continuously working to improve the accessibility of our
                platform and to progressively remove existing barriers.
              </p>
            </section>

            {/* Section 3 - Non-accessible Content */}
            <section>
              <h2 className="text-heading font-medium text-[#111827] mb-4">
                3. Non-accessible Content
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed mb-4">
                The following content is not yet fully accessible for the
                reasons stated below:
              </p>
              <ul className="text-body-lg text-[#4B5563] leading-relaxed space-y-3 list-disc pl-6">
                <li>
                  <strong className="text-[#111827]">
                    Charts and visualizations:
                  </strong>{" "}
                  Some charts in the dashboard area are not yet fully described
                  for screen readers. Alternative text and tabular
                  representations are being added progressively.
                </li>
                <li>
                  <strong className="text-[#111827]">
                    Interactive elements:
                  </strong>{" "}
                  Some interactive elements (buttons, links) do not yet meet the
                  optimal minimum target size of 24×24 pixels per WCAG 2.5.8
                  (Target Size).
                </li>
                <li>
                  <strong className="text-[#111827]">Background video:</strong>{" "}
                  The background video on the homepage does not yet have
                  subtitles or an audio description.
                </li>
              </ul>
            </section>

            {/* Section 4 - Preparation of this Statement */}
            <section>
              <h2 className="text-heading font-medium text-[#111827] mb-4">
                4. Preparation of this Statement
              </h2>
              <div className="text-body-lg text-[#4B5563] leading-relaxed space-y-2">
                <p>
                  This statement was prepared on{" "}
                  <strong className="text-[#111827]">March 13, 2026</strong>.
                </p>
                <p>
                  The assessment is based on a{" "}
                  <strong className="text-[#111827]">self-evaluation</strong>{" "}
                  conducted by the website operator.
                </p>
              </div>
            </section>

            {/* Section 5 - Feedback and Contact */}
            <section>
              <h2 className="text-heading font-medium text-[#111827] mb-4">
                5. Feedback and Contact
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                If you encounter barriers on our website or need information
                regarding accessibility, please contact us:
              </p>
              <div className="text-body-lg text-[#4B5563] leading-relaxed mt-4 space-y-1">
                <p>Julian Polleschner</p>
                <p>Am Maselakepark 37</p>
                <p>13587 Berlin, Germany</p>
                <p className="mt-3">
                  Email:{" "}
                  <a
                    href="mailto:accessibility@caelex.eu"
                    className="text-[#4B5563] hover:text-[#111827] underline"
                  >
                    accessibility@caelex.eu
                  </a>
                </p>
                <p>
                  Alternatively:{" "}
                  <a
                    href="mailto:cs@caelex.eu"
                    className="text-[#4B5563] hover:text-[#111827] underline"
                  >
                    cs@caelex.eu
                  </a>
                </p>
                <p>Phone: +49 1636726480</p>
              </div>
              <p className="text-body-lg text-[#4B5563] leading-relaxed mt-4">
                We aim to respond to your inquiry within{" "}
                <strong className="text-[#111827]">4 weeks</strong> and to
                resolve identified barriers as quickly as possible.
              </p>
            </section>

            {/* Section 6 - Enforcement Procedure */}
            <section>
              <h2 className="text-heading font-medium text-[#111827] mb-4">
                6. Enforcement Procedure
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                If you have not received a satisfactory response within{" "}
                <strong className="text-[#111827]">6 weeks</strong> of
                contacting us, you may initiate an enforcement procedure in
                accordance with Section 12b BFSG by contacting the responsible
                enforcement authority.
              </p>
              <div className="text-body-lg text-[#4B5563] leading-relaxed mt-4 space-y-1 bg-[#F0F1F3] rounded-lg p-5">
                <p className="font-medium text-[#111827]">
                  State Commissioner for Digital Accessibility
                </p>
                <p>
                  For Berlin, the responsible authority is the State
                  Commissioner for Digital Accessibility at the State Office for
                  Health and Social Affairs (LAGeSo).
                </p>
                <p className="mt-2">
                  Further information on the enforcement procedure and contact
                  options can be found on the website of the responsible
                  authority.
                </p>
              </div>
              <p className="text-body-lg text-[#4B5563] leading-relaxed mt-4">
                In addition, the market surveillance authority responsible for
                enforcing accessibility requirements under Section 12b BFSG may
                be contacted.
              </p>
            </section>

            {/* Section 7 - Technical Information */}
            <section>
              <h2 className="text-heading font-medium text-[#111827] mb-4">
                7. Technical Information
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed mb-4">
                This website was built with the following technologies and
                tested for accessibility:
              </p>

              <div className="space-y-4">
                <div>
                  <h3 className="text-body-lg font-medium text-[#111827] mb-2">
                    Compatible Browsers
                  </h3>
                  <ul className="text-body-lg text-[#4B5563] leading-relaxed list-disc pl-6 space-y-1">
                    <li>Google Chrome (current version)</li>
                    <li>Mozilla Firefox (current version)</li>
                    <li>Apple Safari (current version)</li>
                    <li>Microsoft Edge (current version)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-body-lg font-medium text-[#111827] mb-2">
                    Screen Readers
                  </h3>
                  <ul className="text-body-lg text-[#4B5563] leading-relaxed list-disc pl-6 space-y-1">
                    <li>VoiceOver (macOS) — tested</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-body-lg font-medium text-[#111827] mb-2">
                    Technologies Used
                  </h3>
                  <ul className="text-body-lg text-[#4B5563] leading-relaxed list-disc pl-6 space-y-1">
                    <li>HTML5</li>
                    <li>CSS3</li>
                    <li>JavaScript (ECMAScript)</li>
                    <li>WAI-ARIA</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>

          <p className="text-small text-[#9CA3AF] mt-12">
            As of: March 13, 2026
          </p>
        </div>
      </div>
    </main>
  );
}
