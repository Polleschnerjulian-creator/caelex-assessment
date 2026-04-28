import type { LegalDocument } from "@/lib/legal/types";

export const AI_DISCLOSURE_EN: LegalDocument = {
  lang: "en",
  title: "AI Transparency Notice",
  subtitle:
    "Information on the use of artificial intelligence on the Caelex platform",
  version: "Version 2.0",
  effectiveDate: "18 April 2026",
  legalEntity: "Caelex, Julian Polleschner, Berlin",
  preamble: [
    "We deploy artificial intelligence on the Caelex platform transparently and responsibly. This notice tells you where AI is used, which models we use, what that means for your data, and what limits apply to AI outputs.",
    "This notice supplements Terms V3.0 § 7 and Annex E (Astra) as well as the Privacy Policy § 7.",
  ],
  sections: [
    {
      id: "a1",
      number: "Section 1",
      title: "Where we use AI",
      blocks: [
        { type: "p", text: "We deploy AI features in particular for:" },
        {
          type: "ul",
          items: [
            "Astra — AI-powered compliance copilot for answering questions about regulatory and platform content",
            "Generate 2.0 — automated generation of regulatory document templates (e.g. NCA submissions, compliance memos)",
            "Content assistance — improvement suggestions, summaries, translations within the platform",
          ],
        },
        {
          type: "p",
          text: "AI is NOT used for: automated legally-binding decisions, automated credit scoring, profiling with legal effect on third parties, or biometric analysis.",
        },
      ],
    },
    {
      id: "a2",
      number: "Section 2",
      title: "Models and providers used",
      blocks: [
        {
          type: "p",
          text: "Our primary inference provider for conversational and generation features is Anthropic PBC, using the Claude Sonnet 4.6 model (or successor versions). For embeddings (Atlas Library search, semantic recall) we use OpenAI text-embedding-3-small @ 512 dimensions via the Vercel AI Gateway as a sub-sub-processor under Vercel. Details:",
        },
        {
          type: "ul",
          items: [
            "Provider (inference): Anthropic PBC — sub-processor (see /legal/sub-processors)",
            "Provider (embeddings): OpenAI L.L.C. — sub-sub-processor under Vercel; no direct contractual relationship between Caelex and OpenAI",
            "Routing for Anthropic Claude: preferred processing in the EU (AWS Bedrock Frankfurt/Ireland via Vercel AI Gateway — no third-country transfer); fallback in the USA (direct Anthropic API) safeguarded by EU-US Data Privacy Framework + EU Standard Contractual Clauses Module 3 + zero-data-retention commitment",
            "Zero-data retention with both providers: inputs are not stored after response or embedding computation and are not used for model training",
            "Category under the AI Act (Regulation (EU) 2024/1689): general-purpose AI model (GPAI) — Caelex is the deployer",
          ],
        },
      ],
    },
    {
      id: "a3",
      number: "Section 3",
      title: "What this means for your data",
      blocks: [
        {
          type: "p",
          text: "(1) Your input, optionally enriched with context you have authorised, is transmitted to the AI provider for response generation. No other data (e.g. other users' data, third-party organisation data) is transmitted.",
        },
        {
          type: "p",
          text: "(2) The AI provider does not retain the request beyond the response and does not use it for model training (zero-data-retention agreement).",
        },
        {
          type: "p",
          text: "(3) Within Caelex, conversations are stored for your own traceability. You may delete conversations at any time.",
        },
        {
          type: "p",
          text: "(4) We may evaluate aggregated, anonymised usage patterns for product improvement without creating any personal reference.",
        },
      ],
    },
    {
      id: "a4",
      number: "Section 4",
      title: "Limits of AI outputs",
      blocks: [
        {
          type: "callout",
          variant: "warn",
          text: 'AI outputs may be incomplete, outdated, contradictory or fabricated ("hallucinations"). They do not replace qualified advice.',
        },
        {
          type: "p",
          text: "(1) AI outputs are statistically generated content and do not constitute binding legal, financial or regulatory determinations.",
        },
        {
          type: "p",
          text: "(2) The user is solely responsible for having any AI output reviewed by qualified professionals (lawyer, tax advisor, licensed financial-services provider) before use.",
        },
        {
          type: "p",
          text: "(3) When AI outputs are passed on to third parties or authorities, their AI-generated character must be disclosed where legally or contractually required.",
        },
      ],
    },
    {
      id: "a5",
      number: "Section 5",
      title: "Labelling and transparency",
      blocks: [
        {
          type: "p",
          text: 'AI-generated content on the platform is recognisably labelled (e.g. Astra chat surface, Generate watermark, Atlas pinboard cards with a "🤖 AI-generated" badge). We comply with the labelling obligations of the AI Act (Art. 50) insofar as they apply to us.',
        },
      ],
    },
    {
      id: "a5a",
      number: "Section 5a",
      title:
        "Atlas × Caelex — bilateral law-firm platform (special provisions)",
      blocks: [
        {
          type: "p",
          text: "Atlas is the law-firm-side surface of the Caelex platform. It allows law firms, within the scope of an engagement authorised by mutual handshake (Legal-Network Bridge), to access compliance-related data of their client and to advise with AI assistance.",
        },
        {
          type: "p",
          text: "(1) AI components used:",
        },
        {
          type: "ul",
          items: [
            "Atlas AI Chat — Claude Sonnet 4.6 for advice within the matter workspace, with tool-use loop (fetch compliance overview, source search, jurisdiction comparison, draft memo)",
            "Atlas Foresight — secondary Claude call after each answer that suggests 2–3 follow-up actions (max. 400 output tokens)",
            "Atlas Personal Library Recall — embeddings (OpenAI text-embedding-3-small @ 512 dimensions via Vercel AI Gateway) for semantic search in the lawyer's personal research library",
          ],
        },
        {
          type: "p",
          text: "(2) Data flow to AI: client data is processed only within the scope-set defined in the handshake (technically enforced need-to-know filter, tamper-evident hash-chain audit log). The AI provider receives inputs under a zero-data-retention commitment; no storage beyond the request, no use for model training.",
        },
        {
          type: "p",
          text: "(3) Lawyer's responsibility: Atlas outputs are lawyer's tools, not legal advice within the meaning of the German RDG/BRAO or equivalent national professional rules. The lawyer reviews every output before passing it to the client. Atlas-generated memos and comparisons carry an \"🤖 AI-generated\" badge and a notice on the review obligation.",
        },
      ],
    },
    {
      id: "a5b",
      number: "Section 5b",
      title: "Risk classification under the EU AI Act",
      blocks: [
        {
          type: "p",
          text: "We have assessed the Atlas and Caelex AI components under Art. 6 in conjunction with Annex III of the AI Act:",
        },
        {
          type: "p",
          text: '(1) NOT a high-risk system under Annex III. Annex III no. 8 covers AI systems that "assist judicial authorities in researching, interpreting and applying legal provisions" — i.e. judicial application. Atlas is aimed at lawyers as an advisory tool, not at judicial authorities. We reject an analogous application in line with the prevailing interpretation.',
        },
        {
          type: "p",
          text: '(2) Article 6(3) exception met. Even if Atlas were partially to fall under Annex III, the exceptions in Art. 6(3) AI Act apply: Atlas only performs "narrow procedural tasks" (tool calls, search aggregation), "improves human activity" (memo drafts as suggestions) and "detects patterns without decisions" (Foresight, Recall). Atlas does not make autonomous decisions with legal effect; the lawyer decides.',
        },
        {
          type: "p",
          text: "(3) NO profiling of natural persons. Atlas does not process personal data to evaluate or predict individual characteristics.",
        },
        {
          type: "p",
          text: '(4) Transparency obligations under Art. 50 AI Act are met: users clearly recognise the interaction with an AI system (Atlas orb UI, "Ask Atlas" input field, AI-generated badges on pinboard cards). AI outputs that may go to clients as memos carry a visible note on the AI origin and the lawyer\'s review obligation.',
        },
        {
          type: "p",
          text: "(5) Human oversight (Art. 14 AI Act as best practice despite not being high-risk): the lawyer can accept, reject or modify any AI suggestion. Memo drafts are not sent automatically; Foresight suggestions are display-only.",
        },
        {
          type: "p",
          text: "(6) We document this assessment internally and provide it to supervisory authorities on request. The assessment is re-run on material functional changes.",
        },
        {
          type: "p",
          text: "(7) Interpretation reservation. The interpretation in (1)-(2) is a defensible position but has not been conclusively confirmed by a court or supervisory authority. Prior to (a) the first paying pilot in a regulated sector (financial services, healthcare, Annex III sectors of the AI Act), (b) the Atlas General-Availability launch, or (c) any product change introducing autonomous legal effect, the assessment is reviewed by external counsel specialised in the AI Act and the outcome attested internally. Caelex makes the current state of this review available to supervisory authorities on request.",
        },
      ],
    },
    {
      id: "a6",
      number: "Section 6",
      title: "Security and abuse prevention",
      blocks: [
        {
          type: "p",
          text: "We deploy prompt-injection protection, content filters and rate limits to prevent abuse of AI features. Usage patterns are monitored; abuse may lead to suspension under Terms § 11.",
        },
      ],
    },
    {
      id: "a7",
      number: "Section 7",
      title: "Contact",
      blocks: [
        {
          type: "p",
          text: "Questions or concerns regarding AI use and transparency: please contact privacy@caelex.eu or legal@caelex.eu.",
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
    "AI and privacy enquiries:",
    "mailto:privacy@caelex.eu",
    "Legal enquiries:",
    "mailto:legal@caelex.eu",
  ],
  links: [
    { label: "Deutsche Version →", href: "/legal/ai-disclosure" },
    { label: "Terms § 7 & Annex E", href: "/legal/terms#s7" },
    { label: "Privacy Policy", href: "/legal/privacy-en" },
    { label: "Sub-processors", href: "/legal/sub-processors" },
    { label: "DPA", href: "/legal/dpa-en" },
  ],
};
