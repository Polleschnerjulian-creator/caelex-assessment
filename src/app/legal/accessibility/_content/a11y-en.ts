import type { LegalDocument } from "@/lib/legal/types";

export const A11Y_EN: LegalDocument = {
  lang: "en",
  title: "Accessibility Statement",
  subtitle:
    "Accessibility of the Caelex platform under BFSG (German Accessibility Reinforcement Act) and EN 301 549",
  version: "Version 1.0",
  effectiveDate: "18 April 2026",
  legalEntity: "Caelex, Julian Polleschner, Berlin, Germany",
  preamble: [
    "Caelex is committed to making its website and platform accessible to everyone. This statement describes the current state of accessibility and feedback channels under the German Accessibility Reinforcement Act (BFSG) and related standards.",
  ],
  sections: [
    {
      id: "b1",
      number: "Section 1",
      title: "Scope",
      blocks: [
        {
          type: "p",
          text: "This statement applies to the website at caelex.eu and the Caelex platform including all product lines falling within the scope of BFSG Section 1(2), in particular electronic commerce services to consumers.",
        },
      ],
    },
    {
      id: "b2",
      number: "Section 2",
      title: "Compliance status",
      blocks: [
        {
          type: "p",
          text: "The Caelex platform is continuously measured against Web Content Accessibility Guidelines (WCAG) 2.1 Level AA — the standard referenced by BFSG / BITV 2.0 / EN 301 549.",
        },
        {
          type: "p",
          text: "We aim for full WCAG 2.1 AA conformance. Major parts of the platform are accessible; some areas, listed below, are under active remediation.",
        },
      ],
    },
    {
      id: "b3",
      number: "Section 3",
      title: "Measures implemented",
      blocks: [
        {
          type: "ul",
          items: [
            "semantic HTML (heading hierarchy, aria attributes, landmark roles)",
            "keyboard operability of all interactive elements; visible focus indicator",
            "dark mode with sufficient colour contrast (WCAG AA: 4.5:1 for normal text)",
            "alternative text for informational graphics and icons",
            "responsive layouts up to 400 % zoom without horizontal scroll",
            "no status indicators relying on colour alone",
            "prefers-reduced-motion respected",
            "form labels and error messages programmatically associated",
            "skip links for section jumps",
            "machine-readable structure for assistive technologies",
          ],
        },
      ],
    },
    {
      id: "b4",
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
            "complex 3D visualisations (Mission Control globe, landing page three.js scene) — tabular alternatives are offered where information equivalence can be established",
            "some charts — textual summaries in progress",
            "generated PDF documents — accessible PDF generation in progress; HTML equivalents available as interim",
          ],
        },
      ],
    },
    {
      id: "b5",
      number: "Section 5",
      title: "Feedback and contact",
      blocks: [
        {
          type: "p",
          text: "Have you encountered barriers or do you need content in a more accessible form? We welcome your feedback.",
        },
        {
          type: "p",
          text: "Contact: accessibility@caelex.eu — we respond within five working days and offer, where possible, an accessible alternative.",
        },
      ],
    },
    {
      id: "b6",
      number: "Section 6",
      title: "Enforcement procedure",
      blocks: [
        {
          type: "p",
          text: "If your concerns remain unresolved after contacting us, you may refer the matter to the BFSG market surveillance authority. Competent authority is typically the state market surveillance body in the state of the provider (for Caelex: Berlin).",
        },
      ],
    },
    {
      id: "b7",
      number: "Section 7",
      title: "Status and review",
      blocks: [
        {
          type: "p",
          text: "This statement was prepared on 18 April 2026 based on self-assessment. It is updated annually, on material platform changes, or on feedback.",
        },
      ],
    },
  ],
  annexes: [],
  contactLines: [
    "Caelex",
    "Owner: Julian Polleschner",
    "Am Maselakepark 37",
    "13587 Berlin, Germany",
    "",
    "Accessibility feedback:",
    "mailto:accessibility@caelex.eu",
    "General inquiries:",
    "mailto:cs@caelex.eu",
  ],
  links: [
    { label: "Deutsche Erklärung →", href: "/legal/barrierefreiheit" },
    { label: "Privacy Policy", href: "/legal/privacy-en" },
    { label: "Impressum", href: "/legal/impressum" },
  ],
};
