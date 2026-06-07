/**
 * Caelex Scholar — Accessibility Statement (EN, convenience translation).
 *
 * Convenience translation of ACCESSIBILITY_DE. The German edition is binding.
 * Consistent with the corrected platform statement: WCAG 2.2 AA; conciliation
 * body MLBF AöR, Magdeburg; voluntary microenterprise / B2B2C framing.
 */
import type { ScholarLegalDoc } from "../_components/types";

export const ACCESSIBILITY_EN: ScholarLegalDoc = {
  lang: "en",
  title: "Accessibility Statement",
  subtitle: "Caelex Scholar",
  version: "1.0",
  lastUpdated: "7 June 2026",
  preamble: [
    "Caelex is committed to making Caelex Scholar accessible to everyone. This statement describes the current state of accessibility, the standard applied, known limitations, and the feedback and enforcement channels. It applies to the application at caelex.eu/scholar.",
  ],
  sections: [
    {
      id: "s1",
      number: "Section 1",
      title: "Scope",
      blocks: [
        {
          type: "p",
          text: "This statement applies to the Caelex Scholar application at caelex.eu/scholar, including its public legal pages.",
        },
        {
          type: "p",
          text: "On current assessment, Caelex is likely not mandatorily subject to the German Accessibility Reinforcement Act (BFSG) — in particular due to the microenterprise exemption (Section 3(3) BFSG: fewer than 10 staff and at most EUR 2M annual turnover/balance-sheet total) and the provider-to-university-to-students (B2B2C) model, under which there is no consumer contract within the meaning of Section 2 No. 26 BFSG. Irrespective of this, we voluntarily aim to meet the requirements set out below.",
        },
      ],
    },
    {
      id: "s2",
      number: "Section 2",
      title: "Compliance status",
      blocks: [
        {
          type: "p",
          text: "Caelex Scholar is continuously measured against Web Content Accessibility Guidelines (WCAG) 2.2 Level AA, exceeding WCAG 2.1 AA — the baseline standard referenced by BFSG / BITV 2.0 / EN 301 549.",
        },
        {
          type: "p",
          text: "We voluntarily aim for full WCAG 2.2 AA conformance. Major parts of the application are accessible; the remaining barriers listed in Section 4 are under active remediation.",
        },
      ],
    },
    {
      id: "s3",
      number: "Section 3",
      title: "Measures implemented",
      blocks: [
        {
          type: "p",
          text: "Caelex Scholar is designed as a calm, high-contrast reading surface. Measures implemented include in particular:",
        },
        {
          type: "ul",
          items: [
            "semantic HTML with a gap-free heading hierarchy, landmark roles and ARIA attributes",
            "keyboard operability of all interactive elements with a visible focus indicator (WCAG 2.4.7)",
            "monochrome, high-contrast reading design; body text meets at least the AA contrast ratio (WCAG 1.4.3)",
            "no status indicators relying on colour alone",
            "responsive layouts with zoom up to 400 % without horizontal scroll (WCAG 1.4.10)",
            "support for 'prefers-reduced-motion'",
            "form labels and error messages programmatically associated",
            "document language marking per edition (lang attribute) so assistive technology announces the correct language (WCAG 3.1.1/3.1.2)",
            "sign-in without a cognitive function test; password-manager support (WCAG 3.3.8 'Accessible Authentication')",
            "minimum target size and adequate spacing for controls (WCAG 2.5.8)",
          ],
        },
      ],
    },
    {
      id: "s4",
      number: "Section 4",
      title: "Content not yet fully accessible",
      blocks: [
        {
          type: "p",
          text: "The following content is currently not, or only partially, accessible; remediation is underway:",
        },
        {
          type: "ul",
          items: [
            "The graphical research-graph view (relationship network between sources) — an information-equivalent tabular or list-based alternative is being provided and expanded.",
            "Generated PDF and print exports — accessible, tagged generation is in progress; as an interim, the content is available as structured HTML.",
            "Some newer interaction patterns (e.g. quick-search/command palette) are continuously checked and improved against WCAG 2.2 criteria 2.4.11 (focus not obscured), 2.5.8 (target size) and 3.3.8 (accessible authentication).",
          ],
        },
      ],
    },
    {
      id: "s5",
      number: "Section 5",
      title: "Feedback and contact",
      blocks: [
        {
          type: "p",
          text: "Have you encountered barriers or do you need content in a more accessible form? We welcome your feedback.",
        },
        {
          type: "p",
          text: "Contact: accessibility@caelex.eu — we respond within five working days and offer, where possible, an accessible alternative. General inquiries: cs@caelex.eu.",
        },
      ],
    },
    {
      id: "s6",
      number: "Section 6",
      title: "Enforcement procedure / conciliation",
      blocks: [
        {
          type: "p",
          text: "If your concerns remain unresolved after contacting us, you may refer the matter to the conciliation body under Section 16 BGG:",
        },
        {
          type: "ul",
          items: [
            "Conciliation body under Section 16 BGG at the Federal States' Market Surveillance Authority for Accessibility (MLBF AöR)",
            "Carl-Miller-Str. 6, 39112 Magdeburg, Germany",
            "www.mlbf-barrierefrei.de",
          ],
        },
        {
          type: "p",
          text: "The conciliation procedure is free of charge for the parties; legal representation is not required.",
        },
      ],
    },
    {
      id: "s7",
      number: "Section 7",
      title: "Status and review",
      blocks: [
        {
          type: "p",
          text: "This statement is based on a self-assessment of Caelex Scholar. It is reviewed and updated annually, on material changes to the application, and on relevant feedback. The version published at caelex.eu/scholar/legal/accessibility, bearing the date shown above, is authoritative.",
        },
      ],
    },
  ],
};
