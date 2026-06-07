/**
 * Caelex Scholar — Cookie & Storage Notice (EN, convenience translation).
 *
 * Convenience translation of COOKIES_DE. The German edition is the binding
 * version. Keep both in sync. The DRAFT banner + Stand/Version chrome is
 * supplied by LegalDoc.tsx; this file carries text only.
 */
import type { ScholarLegalDoc } from "../_components/types";

export const COOKIES_EN: ScholarLegalDoc = {
  lang: "en",
  title: "Cookie & Storage Notice",
  subtitle: "Caelex Scholar",
  version: "1.0",
  lastUpdated: "7 June 2026",
  preamble: [
    "This notice explains which cookies and comparable storage technologies Caelex Scholar uses on your device, for what purpose, on what legal basis, and for how long. It supplements the Caelex Scholar Privacy Policy.",
    "Caelex Scholar is a sign-in-protected (SSO-gated) legal-research database licensed through your university. It is free of charge for you.",
  ],
  sections: [
    {
      id: "s1",
      number: "Section 1",
      title: "Controller and roles",
      blocks: [
        {
          type: "p",
          text: "The controller for the technically necessary storage operations involved in operating Caelex Scholar, within the meaning of Section 25 TDDDG and the GDPR, is:",
        },
        {
          type: "ul",
          items: [
            "Caelex — sole proprietorship, owner: Julian Polleschner",
            "Am Maselakepark 37, 13587 Berlin, Germany",
            "Small business under Section 19 of the German VAT Act (UStG)",
            "Email: cs@caelex.eu · Data protection: privacy@caelex.eu",
          ],
        },
        {
          type: "p",
          text: "Caelex Scholar is provided under a provider-to-university-to-students (B2B2C) model. Where Caelex processes data on behalf of the licensing university, the university is the controller and Caelex is the processor; for the technically necessary storage operations described here — operating and securing the service — Caelex acts as its own controller. The Privacy Policy sets out the role allocation in detail.",
        },
      ],
    },
    {
      id: "s2",
      number: "Section 2",
      title: "What are cookies and comparable technologies?",
      blocks: [
        {
          type: "p",
          text: "Cookies are small text files that a website stores in your browser and reads back on later requests. Comparable technologies include browser storage (LocalStorage, SessionStorage), IndexedDB, and similar techniques that store information on, or retrieve information from, your device.",
        },
        {
          type: "p",
          text: "In legal terms, Section 25 TDDDG (the German Telecommunications Digital Services Data Protection Act, formerly Section 25 TTDSG) covers any access to information already stored on your device, and any storage of information on your device — regardless of whether that information is personal data.",
        },
      ],
    },
    {
      id: "s3",
      number: "Section 3",
      title: "Principle: strictly necessary only, no trackers",
      blocks: [
        {
          type: "p",
          text: "Caelex Scholar uses strictly necessary cookies only. Their legal basis is Section 25(2) no. 2 TDDDG (technically necessary for a digital service you have expressly requested), in conjunction with Article 6(1)(b) and (f) GDPR.",
        },
        {
          type: "callout",
          variant: "info",
          text: "Caelex Scholar uses no marketing, advertising or cross-site tracking cookies, no third-party advertising networks, and no device fingerprinting. No cookie banner is shown in the Scholar area because no consent-requiring storage takes place.",
        },
        {
          type: "p",
          text: "The Scholar interface stores no data in your browser's LocalStorage or SessionStorage. Your language setting and other preferences are stored server-side in your account (not in a cookie). Optional, privacy-friendly features such as bookmarks and reading lists are stored in our database and are described in the Privacy Policy.",
        },
      ],
    },
    {
      id: "s4",
      number: "Section 4",
      title: "List of cookies in use",
      blocks: [
        {
          type: "p",
          text: "The table below lists the cookies Caelex Scholar actually sets. All are strictly necessary, set only on the domain caelex.eu (first party), marked HttpOnly (not readable by scripts in the browser), and — in production — transmitted with the Secure attribute (HTTPS only) and SameSite=Lax. In production, cookie names additionally carry the __Secure- or __Host- prefix.",
        },
        {
          type: "subheading",
          text: "authjs.session-token (production: __Secure-authjs.session-token)",
        },
        {
          type: "ul",
          items: [
            "Purpose: login session — keeps you signed in after SSO/login authentication (NextAuth session token, JWT).",
            "Category: strictly necessary.",
            "Legal basis: Section 25(2) no. 2 TDDDG; Article 6(1)(b) GDPR.",
            "Retention: session cookie with a maximum lifetime of 24 hours; ends at the latest on sign-out.",
            "Attributes: HttpOnly, Secure (production), SameSite=Lax.",
          ],
        },
        {
          type: "subheading",
          text: "authjs.csrf-token (production: __Host-authjs.csrf-token)",
        },
        {
          type: "ul",
          items: [
            "Purpose: protection against cross-site request forgery (CSRF) on state-changing requests.",
            "Category: strictly necessary (security).",
            "Legal basis: Section 25(2) no. 2 TDDDG; Article 6(1)(f) GDPR (security of the service).",
            "Retention: session (deleted when the browser session ends).",
            "Attributes: HttpOnly; in production __Host-bound (origin-bound, with no Domain attribute).",
          ],
        },
        {
          type: "subheading",
          text: "authjs.callback-url (production: __Secure-authjs.callback-url)",
        },
        {
          type: "ul",
          items: [
            "Purpose: stores the return destination during sign-in (e.g. after the redirect through your university's SSO/OAuth flow).",
            "Category: strictly necessary.",
            "Legal basis: Section 25(2) no. 2 TDDDG; Article 6(1)(b) GDPR.",
            "Retention: session.",
            "Attributes: HttpOnly, Secure (production), SameSite=Lax.",
          ],
        },
        {
          type: "callout",
          variant: "info",
          text: "Note on signing in through your university (single sign-on): during the redirect to and from your university's identity provider or the Google OAuth service, those providers may set their own authentication-necessary cookies under their own responsibility. These are governed by the respective provider's privacy and cookie notices; Caelex has no control over them.",
        },
      ],
    },
    {
      id: "s5",
      number: "Section 5",
      title: "No analytics, performance or marketing storage in Scholar",
      blocks: [
        {
          type: "p",
          text: "No analytics, performance or marketing cookies are set in the Scholar area, and no corresponding scripts are loaded. In particular, the Scholar shell loads neither web analytics (e.g. Vercel Web Analytics) nor a performance-measurement service (e.g. Vercel Speed Insights).",
        },
        {
          type: "p",
          text: "To maintain the stability and security of the service we use server-side error monitoring (Sentry). It operates without setting cookies on your device and with personal data removed before transmission. The service providers used are listed in the Sub-processors register.",
        },
      ],
    },
    {
      id: "s6",
      number: "Section 6",
      title: "Managing and deleting cookies",
      blocks: [
        {
          type: "p",
          text: "Because Caelex Scholar uses strictly necessary cookies only, no consent banner and no cookie settings are required. You can manage, block or delete cookies at any time in your browser settings.",
        },
        {
          type: "ul",
          items: [
            "Chrome: Settings → Privacy and security → Cookies and other site data",
            "Firefox: Settings → Privacy & Security → Cookies and Site Data",
            "Safari: Settings → Privacy → Manage Website Data",
            "Edge: Settings → Cookies and site permissions",
          ],
        },
        {
          type: "callout",
          variant: "warn",
          text: "If you block or delete the strictly necessary cookies you cannot sign in or will not stay signed in; the service will then be unavailable or only partially usable.",
        },
      ],
    },
    {
      id: "s7",
      number: "Section 7",
      title: "Your rights and contact",
      blocks: [
        {
          type: "p",
          text: "Where personal data is processed through cookies, you have the data-subject rights described in the Privacy Policy (access, rectification, erasure, restriction, portability, objection, and the right to lodge a complaint with a supervisory authority).",
        },
        {
          type: "p",
          text: "Please direct questions about this notice to privacy@caelex.eu. For further detail on the processing of personal data, see the Caelex Scholar Privacy Policy; the service providers used are listed in the Sub-processors register.",
        },
      ],
    },
    {
      id: "s8",
      number: "Section 8",
      title: "Changes to this notice",
      blocks: [
        {
          type: "p",
          text: "We update this notice when the cookies in use or the legal requirements change. The version published at caelex.eu/scholar/legal/cookies, bearing the date shown above, is authoritative.",
        },
      ],
    },
  ],
};
