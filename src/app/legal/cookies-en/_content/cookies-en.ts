import type { LegalDocument } from "@/lib/legal/types";

export const COOKIES_EN: LegalDocument = {
  lang: "en",
  title: "Cookie Policy",
  subtitle: "Information on cookies and similar technologies",
  version: "Version 3.0",
  effectiveDate: "18 April 2026",
  legalEntity: "Caelex, Julian Polleschner, Berlin, Germany",
  preamble: [
    "This Policy explains which cookies and similar technologies (LocalStorage, SessionStorage, IndexedDB, pixels) we use, for what purpose, on what legal basis and for how long.",
    "For non-strictly-necessary cookies, Section 25(1) TTDSG applies: we set them only with your express, informed, prior consent.",
    "For data-protection details we additionally refer to the Privacy Policy (/legal/privacy-en).",
    "The German version at /legal/cookies is the legally binding version.",
  ],
  sections: [
    {
      id: "c1",
      number: "Section 1",
      title: "What are cookies?",
      blocks: [
        {
          type: "p",
          text: "Cookies are small text files stored in your browser when visiting a website. They hold information that can be read on later visits or interactions. We also use browser-stored technologies such as LocalStorage (e.g. Atlas guest bookmarks) and SessionStorage (e.g. session data).",
        },
      ],
    },
    {
      id: "c2",
      number: "Section 2",
      title: "Categories and legal basis",
      blocks: [
        {
          type: "p",
          text: "(1) Strictly necessary (Section 25(2) TTDSG, no consent required): cookies and LocalStorage entries without which the platform cannot operate — session token, CSRF protection, language preference, MFA flow state, Atlas guest bookmarks.",
        },
        {
          type: "p",
          text: "(2) Functional (Art. 6(1)(a) GDPR, Section 25(1) TTDSG, consent): optional convenience features (beyond necessary dark-mode memory, table layouts, optional chat widgets).",
        },
        {
          type: "p",
          text: "(3) Analytics and product improvement. We run our own self-hosted first-party product analytics (no third-party analytics services such as Google Analytics or Facebook). It involves two processing operations with two legal bases: (a) setting and reading a session/device identifier in browser storage (sessionStorage), and stitching your usage across products into one identity profile (a new purpose under Art. 5(1)(b) GDPR), both require your consent under Section 25(1) TTDSG; (b) the pseudonymous usage telemetry itself (event counts, per-product feature usage, dwell time, approximate country derived from IP) is processed on the basis of our legitimate interest in product improvement (Art. 6(1)(f) GDPR), to which you may object at any time under Art. 21 GDPR. A typed event schema ensures the telemetry cannot capture free-text input, client or party names. See the privacy policy (Section 3(3)) for details.",
        },
        {
          type: "p",
          text: "(4) Marketing: we set no third-party marketing cookies (Facebook pixel, LinkedIn Insight Tag, Google Ads).",
        },
      ],
    },
    {
      id: "c3",
      number: "Section 3",
      title: "Cookies and storage entries in use",
      blocks: [
        {
          type: "callout",
          variant: "info",
          text: "The following list reflects the state at the version date and is kept current. Changes are recorded with the version number.",
        },
        { type: "p", text: "A. Strictly necessary:" },
        {
          type: "ul",
          items: [
            "authjs.session-token — login session, HTTP-only, Secure, SameSite=Lax · retention: until logout or 30 days",
            "authjs.csrf-token — CSRF protection, HTTP-only · retention: session",
            "authjs.callback-url — OAuth-login callback · retention: session",
            "caelex.locale — language preference (de, en, fr, es) · retention: 1 year",
            "atlas:bookmarks:v1 (LocalStorage) — guest bookmarks in Atlas · retention: until user clears",
            "consent.v1 — cookie consent state · retention: 12 months",
          ],
        },
        { type: "p", text: "B. Functional (consent only):" },
        {
          type: "ul",
          items: [
            "caelex.ui-prefs — UI preferences, e.g. table layouts · retention: 6 months",
          ],
        },
        {
          type: "p",
          text: "C. Analytics (consent only, where enabled):",
        },
        {
          type: "ul",
          items: [
            "caelex_session_id (SessionStorage) — session/device identifier of our own self-hosted first-party product analytics. Set once you consent to analytics; therefore NOT cookieless in the sense of 'no device access' (Section 25(1) TTDSG). Retention: until end of the browser session.",
            "caelex-cookie-consent-session (LocalStorage) — pseudonymous correlation id for the server-side consent proof (stored hashed). Retention: until the user clears it.",
            "Self-hosted telemetry (no browser-storage entry, server-side): for each captured event we store, on our own EU infrastructure (database at Neon, Frankfurt region), the event type, the path visited (without query parameters), referrer, user agent (anonymised after 30 days), the country derived from the IP and — for signed-in users — your user id and organisation id. This analytics is therefore neither anonymous nor solely Vercel-based. Event retention: 90 days. Feature dimensions captured are categorical (e.g. Atlas topics, Comply modules, Trade classify→licence, Scholar simulations) and contain no free-text input or personal content.",
            "Vercel Web Analytics (optional, additional): cookieless page-view statistics for the public site with a per-session rolled hash and IP anonymisation. This is a SEPARATE service and NOT the product telemetry described above.",
          ],
        },
        {
          type: "p",
          text: "D. Third parties: Stripe sets cookies strictly required for checkout flows (e.g. __stripe_mid, __stripe_sid). Set only on the checkout page and subject to the Stripe privacy statement.",
        },
      ],
    },
    {
      id: "c4",
      number: "Section 4",
      title: "Consent and withdrawal",
      blocks: [
        {
          type: "p",
          text: "(1) On first visit we show a cookie banner. You can reject all non-essential cookies, select individually or accept all.",
        },
        {
          type: "p",
          text: "(2) You can withdraw consent at any time via the „Cookie settings“ link in the footer or via browser settings. Withdrawal operates for the future only.",
        },
        {
          type: "p",
          text: "(3) Consent is logged in your browser (time, version, per-category selection), supplemented server-side for logged-in users for evidence.",
        },
      ],
    },
    {
      id: "c5",
      number: "Section 5",
      title: "Browser settings",
      blocks: [
        {
          type: "p",
          text: "You can also manage cookies in your browser (block, delete, notify on set). Note that without strictly necessary cookies parts of the platform will not work.",
        },
        {
          type: "ul",
          items: [
            "Chrome: Settings → Privacy and security → Cookies and other site data",
            "Firefox: Settings → Privacy & Security → Cookies and Site Data",
            "Safari: Settings → Privacy → Cookies and website data",
            "Edge: Settings → Cookies and site permissions",
          ],
        },
      ],
    },
    {
      id: "c6",
      number: "Section 6",
      title: "Changes",
      blocks: [
        {
          type: "p",
          text: "We update this Policy on changes to our cookies or legal requirements. The current version is at caelex.eu/legal/cookies-en.",
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
    "Data-protection inquiries:",
    "mailto:privacy@caelex.eu",
  ],
  links: [
    { label: "Deutsche Version →", href: "/legal/cookies" },
    { label: "Privacy Policy", href: "/legal/privacy-en" },
    { label: "Terms", href: "/legal/terms-en" },
    { label: "Impressum", href: "/legal/impressum" },
  ],
};
