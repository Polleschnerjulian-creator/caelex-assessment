import type { LegalDocument, LegalSection } from "@/lib/legal/types";

export const TERMS_EN: LegalDocument = {
  lang: "en",
  title: "General Terms and Conditions",
  subtitle:
    "Binding terms of use for the Caelex platform and all associated products",
  version: "Version 3.0",
  effectiveDate: "18 April 2026",
  legalEntity: "Caelex, Julian Polleschner, Berlin, Germany",
  preamble: [
    "Caelex operates a specialised software platform for regulatory compliance in the space industry. These General Terms and Conditions govern the contractual relationship between the Provider and every user of the platform.",
    "These Terms are designed as a single instrument: Sections 1 through 35 apply to all products; Annexes A through E supplement them for specific product lines (Atlas, Assure, Academy, API / Widget, Astra). In case of conflict the Annexes prevail where they expressly so provide.",
    "Caelex is neither a law firm, nor a tax advisory, nor a regulated financial services provider. The platform does not replace individual advice from qualified professionals (Section 5).",
    "The German-language version of these Terms (/legal/terms) is the legally binding version. This English translation is provided for convenience; in case of discrepancy the German version prevails (Section 33(3)).",
  ],
  sections: [
    {
      id: "s1",
      number: "Section 1",
      title: "Scope",
      blocks: [
        {
          type: "p",
          text: "(1) These Terms apply to all present and future contracts between Caelex, owned by Julian Polleschner, Am Maselakepark 37, 13587 Berlin, Germany (the „Provider“ or „Caelex“) and the customer regarding use of the Caelex platform including all products listed in Section 4.",
        },
        {
          type: "p",
          text: "(2) Deviating, conflicting or supplementary terms proposed by the customer shall not become part of the contract unless the Provider expressly agrees in text form. This also applies where the Provider performs services without reservation despite knowing of the customer's terms.",
        },
        {
          type: "p",
          text: "(3) These Terms apply both to consumers (Section 13 German Civil Code / BGB) and to businesses (Section 14 BGB) and public-law entities. Consumers benefit from the additional protective provisions in Section 15 (right of withdrawal) and Section 32 (consumer protection).",
        },
        {
          type: "p",
          text: "(4) Order of precedence among contract documents: (a) individually negotiated written agreements prevail; (b) Data Processing Agreements under Art. 28 GDPR prevail for the matters governed therein; (c) product-specific Annexes (A through E) prevail over the main sections where they expressly so provide; (d) otherwise these Terms apply.",
        },
      ],
    },
    {
      id: "s2",
      number: "Section 2",
      title: "Definitions",
      blocks: [
        { type: "p", text: "For the purposes of these Terms:" },
        {
          type: "definition",
          term: "Platform",
          text: "the software, infrastructure and user interfaces provided by Caelex at caelex.eu and related domains, including all products under Section 4.",
        },
        {
          type: "definition",
          term: "Products",
          text: "the individual functional modules of the Platform, in particular Atlas (regulatory database), Assure (due diligence suite), Academy (training), API and Widget, Astra (AI assistant), Mission Control, Ephemeris, NCA Portal, Digital Twin, Sentinel, Verity, Generate, and the compliance dashboard.",
        },
        {
          type: "definition",
          term: "Content",
          text: "all textual, graphical, audio-visual, structured or executable elements of the Platform, including regulatory mappings, legal texts, assessment logic, compliance algorithms, database entries, decision trees and dynamically generated outputs.",
        },
        {
          type: "definition",
          term: "Customer Data",
          text: "all data, documents, inputs and other information the customer or its users upload, enter or transmit via the API.",
        },
        {
          type: "definition",
          term: "AI Outputs",
          text: "content generated on the Platform by large language models or other machine-learning systems, in particular via Astra, Generate 2.0 or automated document generation.",
        },
        {
          type: "definition",
          term: "Users",
          text: "any natural person accessing the Platform on behalf of the customer, including employees, contractors and authorised third parties.",
        },
        {
          type: "definition",
          term: "Consumer / Business",
          text: "Consumer under Section 13 BGB is any natural person acting predominantly for private purposes; Business under Section 14 BGB is any natural or legal person acting in the course of commercial or self-employed professional activity.",
        },
      ],
    },
    {
      id: "s3",
      number: "Section 3",
      title: "Formation of the contract",
      blocks: [
        {
          type: "p",
          text: "(1) Display of the Platform and individual Products is not a binding offer but an invitation to the customer to submit an offer.",
        },
        {
          type: "p",
          text: "(2) The contract is formed (a) for free registration upon creating an account and expressly accepting these Terms via checkbox; (b) for paid plans additionally upon successful payment; (c) for Enterprise contracts upon counter-signature of an individually negotiated Master Service Agreement.",
        },
        {
          type: "p",
          text: "(3) The Provider confirms conclusion of the contract by email. The confirmation includes the version of these Terms applicable at conclusion; each version is archived for at least ten years and made available to the customer on request.",
        },
        {
          type: "p",
          text: "(4) The Provider reserves the right to refuse conclusion of the contract in individual cases without stating reasons, in particular where there is a suspicion of breach of Section 11, Section 23 or Section 24.",
        },
      ],
    },
    {
      id: "s4",
      number: "Section 4",
      title: "Services and Products",
      blocks: [
        {
          type: "p",
          text: "(1) The subject matter is the provision of the Platform in the scope agreed at conclusion of the contract. Concrete scope follows from the chosen plan, individual quotation or Master Service Agreement.",
        },
        {
          type: "p",
          text: "(2) The Platform comprises in particular the following product lines, with functionality varying by plan and term:",
        },
        {
          type: "ul",
          items: [
            "Atlas — searchable database of space law, international treaties and national legislation (Annex A)",
            "Assure — due-diligence tools for investor relations and investment-readiness scoring (Annex B)",
            "Academy — training, simulations and classrooms for space compliance (Annex C)",
            "API and Widget — programmatic and embeddable access to compliance data (Annex D)",
            "Astra — AI-assisted compliance copilot (Annex E)",
            "Mission Control, Ephemeris, Digital Twin, Sentinel — satellite telemetry and forecasting tools",
            "NCA Portal, Verity, Generate — tools to prepare regulatory filings and compliance documentation",
            "Assessments — compliance assessments for the EU Space Act, NIS2, national space law and unified assessments",
          ],
        },
        {
          type: "p",
          text: "(3) The Provider may change, further develop or — with reasonable notice of at least 30 days — discontinue features, provided the core scope agreed at conclusion is not materially impaired. Material restrictions entitle the customer to extraordinary termination under Section 14(5).",
        },
        {
          type: "p",
          text: "(4) The Platform is provided as Software-as-a-Service via remote access, paid or free. The customer has no right to on-premises installation, source-code release, or additional bespoke customisation.",
        },
      ],
    },
    {
      id: "s5",
      number: "Section 5",
      title: "No legal, investment or financial advice",
      blocks: [
        {
          type: "callout",
          variant: "warn",
          text: "This clause is a central part of the contract. By accepting these Terms the customer expressly confirms having understood the following clarifications.",
        },
        {
          type: "p",
          text: "(1) Caelex is neither an admitted law firm, nor a chambered attorney, nor any other registered legal-services provider under the German Legal Services Act (RDG). The Platform expressly does not provide legal services. All information, mappings, assessments, decision trees, checklists and AI Outputs provided on the Platform are informational tools and do not replace individual legal advice.",
        },
        {
          type: "p",
          text: "(2) Caelex is neither an investment firm under the German Investment Firm Act (WpIG) nor a credit institution under the German Banking Act (KWG). In particular, the Assure product line (including the Regulatory Readiness Score, Regulatory Credit Rating and Investment Readiness Score) is neither investment advice, investment brokerage, financial analysis nor any other regulated financial service. Assure outputs are qualitative assessments of regulatory readiness and expressly not a recommendation to buy, sell or hold financial instruments.",
        },
        {
          type: "p",
          text: "(3) Caelex is not a tax advisory under the German Tax Consultancy Act, not an audit firm and not an insurance intermediary.",
        },
        {
          type: "p",
          text: "(4) The customer shall obtain qualified, individual advice from admitted professionals (attorney, tax advisor, auditor, licensed financial service provider) before any decision with legal, financial or regulatory significance. This applies in particular prior to any filing with authorities, prior to contracts with regulatory significance, prior to investment decisions and prior to compliance certifications.",
        },
        {
          type: "p",
          text: "(5) The Platform does not constitute a binding determination of regulatory obligations. Assessments and outputs serve internal preparation only and are neither administrative nor third-party-effective determinations.",
        },
        {
          type: "p",
          text: "(6) The Provider does not assume liability for decisions taken by the customer or third parties on the basis of Platform outputs, to the extent permitted by law. Section 26 remains unaffected.",
        },
      ],
    },
    {
      id: "s6",
      number: "Section 6",
      title: "Data quality and currency",
      blocks: [
        {
          type: "p",
          text: "(1) The Provider endeavours to keep regulatory information on the Platform current, complete and accurate. No warranty as to currency, completeness or accuracy is given, to the extent permitted by law.",
        },
        {
          type: "p",
          text: "(2) Regulatory content is subject to continuous changes by legislators, authorities and international organisations. The customer is responsible for verifying currency against the relevant primary source (EUR-Lex, BGBl., Official Journal, UN Treaty Collection etc.) for every concrete decision.",
        },
        {
          type: "p",
          text: "(3) References to third-party sources (EUR-Lex, UNOOSA, CelesTrak, ITU, national gazettes) serve verification. The Provider has no influence on the availability, content or correctness of these third-party sources and is not liable for their failure, change or error.",
        },
        {
          type: "p",
          text: "(4) „Last-verified“ and link-status indicators are best-effort indications and not a guaranteed statement about the currency of the linked content.",
        },
      ],
    },
    {
      id: "s7",
      number: "Section 7",
      title: "Use of AI features",
      blocks: [
        {
          type: "callout",
          variant: "warn",
          text: "AI Outputs may be incomplete, outdated, erroneous or fabricated („hallucinations“). The customer shall have every AI Output reviewed by qualified professionals before use.",
        },
        {
          type: "p",
          text: "(1) The Platform contains AI features based on large language models and other machine-learning systems, in particular in Astra (Annex E), Generate 2.0 and automated document generation.",
        },
        {
          type: "p",
          text: "(2) AI Outputs are statistically generated and can be incomplete, inaccurate, outdated, inconsistent or fabricated. AI Outputs are not a binding legal, regulatory or financial assessment.",
        },
        {
          type: "p",
          text: "(3) The customer is solely responsible for (a) reviewing every AI Output for accuracy and applicability in the concrete case, (b) obtaining qualified advice prior to use, (c) complying with all applicable AI transparency and labelling rules vis-à-vis third parties.",
        },
        {
          type: "p",
          text: "(4) The Provider is not liable for damages arising from the unreviewed adoption or forwarding of AI Outputs, in particular for rejections, delays or sanctions in the context of regulatory filings.",
        },
        {
          type: "p",
          text: "(5) The Provider complies with Regulation (EU) 2024/1689 (AI Act) as in force from time to time. Where the Provider would qualify as a deployer of high-risk AI, corresponding obligations are addressed in product-specific Annexes.",
        },
        {
          type: "p",
          text: "(6) The customer ensures that on forwarding AI-generated content to third parties or authorities, any applicable labelling obligations are complied with.",
        },
      ],
    },
    {
      id: "s8",
      number: "Section 8",
      title: "Rights of use in the Platform",
      blocks: [
        {
          type: "p",
          text: "(1) The Platform and its Content are protected by copyright, database and trade-secret laws. All rights not expressly granted remain with the Provider or its licensors.",
        },
        {
          type: "p",
          text: "(2) The Provider grants the customer, for the duration of the contract, a simple, non-exclusive, non-sub-licensable, non-transferable, revocable right of use in the Platform for its intended purpose. The right of use covers use by authorised Users within the scope of the booked plan.",
        },
        {
          type: "p",
          text: "(3) The right of use does not permit: (a) reproduction, distribution or making-publicly-available of Content beyond intended use; (b) creation of derivative works; (c) access through automated means outside the provided API; (d) sharing of credentials; (e) use for developing, training or improving competing products or AI models.",
        },
        {
          type: "p",
          text: "(4) The regulatory mappings, decision trees, scoring algorithms, compliance checklists and curated database entries are trade secrets of the Provider under the German Trade Secrets Act (GeschGehG) and represent its core economic asset.",
        },
        {
          type: "p",
          text: "(5) The marks „Caelex“, „Atlas“, „Assure“, „Astra“, „Academy“, „Mission Control“, „Ephemeris“, „Verity“ and related logos and word/image marks are owned by the Provider. Use by the customer requires prior written consent; permitted is only neutral reference compliant with trademark-law accuracy.",
        },
      ],
    },
    {
      id: "s9",
      number: "Section 9",
      title: "Customer Data and rights thereto",
      blocks: [
        {
          type: "p",
          text: "(1) The customer retains all rights in Customer Data. The Provider acquires no ownership rights in uploaded content.",
        },
        {
          type: "p",
          text: "(2) The customer grants the Provider a simple, non-transferable right of use in Customer Data, limited in time to the term of the contract and post-contract until expiry of applicable deletion periods, insofar as necessary for service provision, backups, compliance with statutory retention and the establishment, exercise or defence of legal claims.",
        },
        {
          type: "p",
          text: "(3) The customer warrants being entitled to make Customer Data available to the Platform and that Customer Data does not infringe third-party rights. For violations the customer indemnifies the Provider under Section 27.",
        },
        {
          type: "p",
          text: "(4) The Provider does not use Customer Data to train own or third-party AI models unless the customer has expressly and revocably consented. Aggregated, anonymised usage statistics without personal or trade-secret reference remain unaffected.",
        },
        {
          type: "p",
          text: "(5) The customer may export Customer Data during the term and within 30 days after termination in a structured, common and machine-readable format. Thereafter Customer Data is deleted or anonymised subject to statutory retention.",
        },
      ],
    },
    {
      id: "s10",
      number: "Section 10",
      title: "Feedback licence",
      blocks: [
        {
          type: "p",
          text: "(1) If the customer provides suggestions, ideas, bug reports, reviews or other feedback about the Platform („Feedback“), the customer grants the Provider a perpetual, worldwide, royalty-free, sub-licensable and transferable right of use in such Feedback.",
        },
        {
          type: "p",
          text: "(2) The Provider is not obliged to implement Feedback, attribute its origin or pay any compensation.",
        },
        {
          type: "p",
          text: "(3) Customer Data under Section 9(1) is not Feedback. The distinction is drawn by the purpose of transmission: Feedback concerns the Platform itself, not the operational business of the customer.",
        },
      ],
    },
  ],
  annexes: [],
  contactLines: [],
  links: [],
};

TERMS_EN.sections.push(
  {
    id: "s11",
    number: "Section 11",
    title: "Prohibited activities and acceptable use",
    blocks: [
      {
        type: "p",
        text: "The following is prohibited for the customer and its Users; each breach is a material breach and entitles the Provider to immediate suspension and to seek damages and injunctive relief:",
      },
      {
        type: "ul",
        items: [
          "reverse engineering, decompilation, disassembly or other derivation of source code, algorithms or data structures of the Platform, to the extent not mandatorily permitted under Section 69e German Copyright Act (UrhG);",
          "scraping, crawling, spidering, systematic downloading or any automated extraction of Content outside the provided API or beyond its rate limits;",
          "using the Platform, its Content or AI Outputs to train, fine-tune or evaluate own or third-party AI models;",
          "using the Platform to develop, offer or improve competing products or services;",
          "circumvention or testing of security measures, access controls or authentication methods without prior written consent;",
          "sharing or publishing credentials, API keys or session tokens;",
          "use for unlawful purposes, in particular for preparing criminal offences, infringing third-party rights or breaching export-control and sanctions laws (Section 23);",
          "uploading malware, malicious code or infringing content;",
          "wilful false inputs to manipulate assessments, ratings or scores;",
          "republishing, reselling or making available material parts of the regulatory databases to third parties;",
          "framing, mirroring or other direct embedding of the Platform in third-party offerings outside the dedicated Widget and API channels;",
          "use of the Platform by more than the contractually agreed number of Users or beyond agreed rate limits;",
          "use of the Platform against the customer (benchmarking or competitive comparisons) without prior written consent.",
        ],
      },
      {
        type: "p",
        text: "Where breach is suspected the Provider may temporarily restrict or suspend access. Established breaches justify suspension pending clarification and extraordinary termination. Section 26 is unaffected.",
      },
    ],
  },
  {
    id: "s12",
    number: "Section 12",
    title: "Account security",
    blocks: [
      {
        type: "p",
        text: "(1) The customer shall keep credentials, passwords and two-factor tokens confidential and protect them from unauthorised access. Passwords must not be shared with other services.",
      },
      {
        type: "p",
        text: "(2) On suspicion of unauthorised use the customer shall immediately notify the Provider at security@caelex.eu and change affected credentials.",
      },
      {
        type: "p",
        text: "(3) The customer is liable for all activities under its account unless it proves the activities occurred without its fault through third parties.",
      },
      {
        type: "p",
        text: "(4) The Provider recommends enabling two-factor authentication and using hardware-backed FIDO2 / WebAuthn methods for privileged accounts.",
      },
    ],
  },
  {
    id: "s13",
    number: "Section 13",
    title: "Prices, payment, price adjustments",
    blocks: [
      {
        type: "p",
        text: "(1) Current prices follow from the price list on the website, the chosen plan or an individual quotation. All prices are in Euro plus statutory VAT unless expressly stated otherwise.",
      },
      {
        type: "p",
        text: "(2) Payment is effected via SEPA direct debit, credit card or by invoice through the payment service provider Stripe Payments Europe Ltd. The customer authorises collection on the due date.",
      },
      {
        type: "p",
        text: "(3) Invoices are due within 14 days of the invoice date without deduction unless agreed otherwise. For direct debit and credit card the processing date is deemed the due date.",
      },
      {
        type: "p",
        text: "(4) In case of default, after prior reminder and grace period, the Provider may suspend access. Default interest at 9 percentage points above the base rate (B2B; Section 288(2) BGB) or 5 percentage points (B2C) and a lump-sum default fee of EUR 40 for B2B (Section 288(5) BGB) shall apply.",
      },
      {
        type: "p",
        text: "(5) The Provider may adjust prices once per year with 60 days' notice. Price increases exceeding 5 % above the general inflation rate of the preceding year (Federal Statistical Office CPI) entitle the customer to extraordinary termination effective upon the increase.",
      },
      {
        type: "p",
        text: "(6) Special and additional services (overage, add-ons, upgrades) are billed separately on booking. Downgrades take effect at the next billing cycle without refund of prepaid fees.",
      },
      {
        type: "p",
        text: "(7) Set-off and retention rights of the customer are limited to undisputed or legally established counter-claims; this limitation does not apply to consumers.",
      },
    ],
  },
  {
    id: "s14",
    number: "Section 14",
    title: "Term, renewal, termination",
    blocks: [
      {
        type: "p",
        text: "(1) Free accounts may be terminated at any time by the customer or the Provider without stating reasons.",
      },
      {
        type: "p",
        text: "(2) Paid plans have the minimum term set out in the plan or individual contract (typically one or twelve months). Upon expiry of the minimum term they continue on an indefinite basis and can be terminated at any time with one month's notice. This complies with Section 309(9) BGB as amended on 1 March 2022.",
      },
      {
        type: "p",
        text: "(3) Under Section 312k BGB the Provider provides a termination button („Terminate contract here“) accessible without login. Termination is additionally possible at any time in text form by email to cs@caelex.eu or via account settings.",
      },
      {
        type: "p",
        text: "(4) Extraordinary termination for cause remains available to both parties. Cause includes material breach, repeated breach, insolvency petition, material change of scope under Section 4(3) and material price adjustment under Section 13(5).",
      },
      {
        type: "p",
        text: "(5) On termination all granted rights of use expire. Customer Data may be exported under Section 9(5). After the export period the Provider deletes data subject to statutory retention obligations.",
      },
      {
        type: "p",
        text: "(6) On termination by the customer for cause attributable to the Provider the customer receives a pro-rated refund of prepaid amounts.",
      },
    ],
  },
  {
    id: "s15",
    number: "Section 15",
    title: "Consumer right of withdrawal",
    blocks: [
      {
        type: "p",
        text: "(1) Consumers within the meaning of Section 13 BGB have a statutory right of withdrawal for distance contracts under Sections 312g, 355 BGB. The withdrawal period is 14 days from conclusion of the contract.",
      },
      {
        type: "p",
        text: "(2) Withdrawal requires an unambiguous declaration by email to legal@caelex.eu or via the model withdrawal form provided in the withdrawal notice.",
      },
      {
        type: "p",
        text: "(3) The right of withdrawal expires under Section 356(5) BGB for contracts on digital content not supplied on a physical carrier once the consumer (a) has expressly consented that the Provider starts performance before the withdrawal period ends, (b) has acknowledged that consent results in loss of the withdrawal right upon commencement of performance, and (c) the Provider has provided confirmation under Section 312f BGB.",
      },
      {
        type: "p",
        text: "(4) For paid subscriptions and API access the consumer is expressly asked for this consent during the order flow. Consent is logged tamper-evidently.",
      },
      {
        type: "p",
        text: "(5) The full withdrawal notice including model form is available at caelex.eu/legal/widerruf.",
      },
    ],
  },
  {
    id: "s16",
    number: "Section 16",
    title: "Availability and service level",
    blocks: [
      {
        type: "p",
        text: "(1) The Provider endeavours to provide a monthly availability of the production Platform of 99.5 %, measured as the share of time the Platform is reachable over the internet, excluding planned maintenance windows and force-majeure events (Section 28).",
      },
      {
        type: "p",
        text: "(2) Not counted as downtime: (a) scheduled maintenance announced at least 48 hours in advance by email or in-app notification; (b) disruptions caused by force majeure, third-party failures outside the Provider's control (e.g. internet backbone, power, third-party APIs) or customer misconduct; (c) beta features under Section 19.",
      },
      {
        type: "p",
        text: "(3) Enterprise customers may agree elevated availability commitments and service credits in an individual Service Level Agreement. Standard plans have no entitlement to service credits; material breaches of the availability commitment preserve the right to extraordinary termination (Section 14(4)).",
      },
      {
        type: "p",
        text: "(4) Support is provided under Section 18.",
      },
    ],
  },
  {
    id: "s17",
    number: "Section 17",
    title: "Maintenance, updates, change management",
    blocks: [
      {
        type: "p",
        text: "(1) The Provider may evolve the Platform through updates, introduce new features and make technical adjustments. Maintenance windows are scheduled in low-demand periods where possible.",
      },
      {
        type: "p",
        text: "(2) Material changes that may affect usability for the customer are announced at least 30 days in advance unless immediate action is required for security reasons.",
      },
      {
        type: "p",
        text: "(3) The Provider owes updates only for currently supported browser and API versions. Legacy versions may be deprecated after 90 days' notice.",
      },
    ],
  },
  {
    id: "s18",
    number: "Section 18",
    title: "Support",
    blocks: [
      {
        type: "p",
        text: "(1) Standard support is provided by email to cs@caelex.eu on business days within ordinary business hours, with an initial response within two business days.",
      },
      {
        type: "p",
        text: "(2) Enterprise plans may include extended support commitments (response times, priority, named contacts) in individual agreements.",
      },
      {
        type: "p",
        text: "(3) Security-relevant reports should preferably be sent to security@caelex.eu; the Provider operates a coordinated vulnerability disclosure process.",
      },
    ],
  },
  {
    id: "s19",
    number: "Section 19",
    title: "Beta and preview features",
    blocks: [
      {
        type: "p",
        text: "(1) The Provider may label features as „beta“, „preview“, „experimental“ or similar. Such features are provided „as is“ and may be changed, restricted or discontinued at any time without notice.",
      },
      {
        type: "p",
        text: "(2) No SLA under Section 16, no warranty and — to the extent permitted by law — no liability outside Section 26(1) apply to beta features.",
      },
      {
        type: "p",
        text: "(3) The customer is not obliged to use beta features. Use is at own risk and expressly voluntary.",
      },
    ],
  },
  {
    id: "s20",
    number: "Section 20",
    title: "Data protection, processing, sub-processors",
    blocks: [
      {
        type: "p",
        text: "(1) Processing of personal data by the Provider for its own business activities follows the privacy policy at caelex.eu/legal/privacy.",
      },
      {
        type: "p",
        text: "(2) Insofar as the customer processes personal data of third parties via the Platform (e.g. its employees, clients or business partners), the Provider is processor under Art. 28 GDPR. For that processing the Data Processing Agreement integrated as contract part at caelex.eu/legal/dpa („DPA“) applies. The DPA is made known at conclusion and can be provided counter-signed on request.",
      },
      {
        type: "p",
        text: "(3) The customer consents to the Provider's use of the following categories of sub-processors: (a) hosting and edge network (Vercel Inc., USA; Neon Inc., USA, with EU data residency); (b) rate limiting and caching (Upstash Inc., USA); (c) payments (Stripe Payments Europe Ltd., Ireland); (d) email delivery (Resend Inc., USA); (e) error and performance monitoring (Functional Software Inc. dba Sentry, USA); (f) AI inference (Anthropic PBC, USA). The current list is published at caelex.eu/legal/sub-processors.",
      },
      {
        type: "p",
        text: "(4) For transfers to third countries the EU Standard Contractual Clauses (Implementing Decision (EU) 2021/914) and, where applicable, the EU-US Data Privacy Framework serve as transfer mechanism.",
      },
      {
        type: "p",
        text: "(5) The Provider gives at least 30 days' prior notice of changes in sub-processors. The customer may raise a reasoned objection; on irresolvable objection the customer has a right of special termination effective on the change date.",
      },
    ],
  },
);

TERMS_EN.sections.push(
  {
    id: "s21",
    number: "Section 21",
    title: "Information security",
    blocks: [
      {
        type: "p",
        text: "(1) The Provider operates an information-security management aligned with the state of the art. Technical and organisational measures include transport encryption (TLS 1.2+) and at-rest encryption (AES-256-GCM), per-tenant key derivation, two-factor authentication, hash-chained audit logs, anomaly and intrusion detection, daily backups and regular restore tests.",
      },
      {
        type: "p",
        text: "(2) Security incidents affecting the customer's personal data are reported to the customer under Art. 33 GDPR without undue delay and at the latest within 72 hours of becoming aware, insofar as the Provider acts as processor.",
      },
      {
        type: "p",
        text: "(3) The Provider will have regard to recognised security standards (in particular ISO 27001-style controls and NIS2 conformity where threshold applies). A certification claim only exists if individually agreed.",
      },
    ],
  },
  {
    id: "s22",
    number: "Section 22",
    title: "Confidentiality",
    blocks: [
      {
        type: "p",
        text: "(1) Both parties shall keep all information of the other party marked as confidential or evidently confidential by nature („Confidential Information“) secret and use it only for performance of this contract.",
      },
      {
        type: "p",
        text: "(2) Confidential Information includes in particular non-public technical materials, source code, price information, Customer Data, compliance strategies, trade secrets under the German Trade Secrets Act (GeschGehG) and all Content of the Platform.",
      },
      {
        type: "p",
        text: "(3) Confidentiality obligations do not apply to information that (a) is or becomes public without fault of the receiving party, (b) was lawfully known to the receiving party prior to disclosure, (c) was independently developed or (d) must be disclosed by legal or regulatory mandate; in the latter case the disclosing party shall promptly inform the other party.",
      },
      {
        type: "p",
        text: "(4) Confidentiality obligations survive termination for five years; for trade secrets indefinitely.",
      },
    ],
  },
  {
    id: "s23",
    number: "Section 23",
    title: "Export control and sanctions",
    blocks: [
      {
        type: "callout",
        variant: "warn",
        text: "The space industry is subject to especially strict export-control, dual-use and sanctions regimes. The customer bears sole responsibility for compliance in the context of its use of the Platform.",
      },
      {
        type: "p",
        text: "(1) The customer warrants to comply with all applicable export-control and sanctions laws, including (a) Regulation (EU) 2021/821 on dual-use, (b) the German Foreign Trade Act (AWG) and Foreign Trade Regulation (AWV), (c) US EAR and ITAR where applicable, (d) EU and UN sanctions lists.",
      },
      {
        type: "p",
        text: "(2) The customer shall not use the Platform (a) to transfer export-controlled technology to sanctioned persons, entities or jurisdictions, (b) for purposes requiring authorisation without the required authorisations, (c) for or to the benefit of natural or legal persons on sanctions lists.",
      },
      {
        type: "p",
        text: "(3) The Provider may immediately restrict or terminate access where indications of breach exist.",
      },
      {
        type: "p",
        text: "(4) Breaches by the customer trigger the indemnity under Section 27 in full; Section 26 (limitation of liability) does not apply in favour of the customer in that regard.",
      },
    ],
  },
  {
    id: "s24",
    number: "Section 24",
    title: "Anti-corruption and compliance",
    blocks: [
      {
        type: "p",
        text: "(1) Both parties shall comply with all applicable anti-corruption, anti-money-laundering and compliance laws, in particular Sections 331–337 German Criminal Code (StGB), the UK Bribery Act 2010 and the US Foreign Corrupt Practices Act (FCPA).",
      },
      {
        type: "p",
        text: "(2) Neither party shall, directly or indirectly, make any payments, benefits or in-kind contributions to officials, employees or representatives of the other party or of third parties where intended or suitable to unduly influence.",
      },
      {
        type: "p",
        text: "(3) Breach entitles to immediate extraordinary termination; damages claims remain unaffected.",
      },
    ],
  },
  {
    id: "s25",
    number: "Section 25",
    title: "Warranty",
    blocks: [
      {
        type: "p",
        text: "(1) The Provider warrants that on intended use the Platform substantially presents the agreed functions. The Platform is continuously developed; improvements and changes under Section 17 do not constitute defects.",
      },
      {
        type: "p",
        text: "(2) Defects are to be reported to the Provider in text form without undue delay after discovery, with reproducible steps. The Provider is entitled to cure by removing the defect or providing a defect-free version.",
      },
      {
        type: "p",
        text: "(3) Consumers retain the statutory warranty rights for digital products under Sections 327 et seq. BGB in full.",
      },
      {
        type: "p",
        text: "(4) For businesses the warranty period is shortened to one year from provision, to the extent permitted by law.",
      },
      {
        type: "p",
        text: "(5) Insignificant deviations from agreed characteristics do not give rise to warranty claims.",
      },
    ],
  },
  {
    id: "s26",
    number: "Section 26",
    title: "Liability",
    blocks: [
      {
        type: "callout",
        variant: "info",
        text: "This clause governs all liability claims in connection with this contract, regardless of basis or nature. Paragraphs (1)–(3) are mandatory in favour of the customer and are not limited.",
      },
      {
        type: "p",
        text: "(1) The Provider is liable without limitation for (a) intent and gross negligence, (b) injury to life, body or health, (c) claims under the German Product Liability Act, (d) maliciously concealed defects, (e) assumed guarantees.",
      },
      {
        type: "p",
        text: "(2) For slight negligence the Provider is liable only for breach of cardinal obligations (essential contractual duties the performance of which the customer regularly relies on). Liability is then capped at the typical, foreseeable contract damages at conclusion.",
      },
      {
        type: "p",
        text: "(3) Otherwise liability for slight negligence is excluded to the extent permitted by law.",
      },
      {
        type: "p",
        text: "(4) Vis-à-vis businesses liability under (2) is additionally capped by amount per contract year and in the aggregate to the lower of (a) the fees paid by the customer in the twelve months preceding the damaging event or (b) EUR 50,000.",
      },
      {
        type: "p",
        text: "(5) Liability for indirect damages, consequential damages, lost profits, data loss, reputational harm and business interruption is excluded vis-à-vis businesses to the extent permitted by law.",
      },
      {
        type: "p",
        text: "(6) The Provider is not liable for damages caused by AI Outputs (Section 7), data quality (Section 6), unreviewed use of Platform Content or breaches by the customer of Sections 11, 23, 24, to the extent permitted by law.",
      },
      {
        type: "p",
        text: "(7) The limitations in (4)–(6) do not apply to claims under (1) and, to consumers, not insofar as they conflict with mandatory consumer law.",
      },
      {
        type: "p",
        text: "(8) Damages claims of businesses become time-barred after 12 months from knowledge of the damage, at the latest after three years from the damaging event; claims under (1) remain unaffected.",
      },
    ],
  },
  {
    id: "s27",
    number: "Section 27",
    title: "Indemnification",
    blocks: [
      {
        type: "p",
        text: "(1) The customer indemnifies the Provider against all third-party claims arising from (a) a breach of these Terms, (b) unlawful use of the Platform, (c) infringement of third-party rights by Customer Data, (d) breaches of Sections 11, 23, 24, including reasonable defence costs.",
      },
      {
        type: "p",
        text: "(2) The Provider indemnifies the customer against third-party claims alleging that intended use of the Platform infringes intellectual property, provided the customer (a) promptly notifies the Provider, (b) makes no admissions or settlements without the Provider's consent, (c) leaves sole control of defence and settlement to the Provider, (d) provides reasonable cooperation. The indemnity is capped by Section 26(4).",
      },
      {
        type: "p",
        text: "(3) The Provider's indemnity under (2) does not apply where the IP claim is based on (a) modifications by the customer, (b) combination with components not provided by the Provider, or (c) use contrary to the Provider's instructions.",
      },
    ],
  },
  {
    id: "s28",
    number: "Section 28",
    title: "Force majeure",
    blocks: [
      {
        type: "p",
        text: "(1) Neither party is liable for delay or non-performance caused by events beyond its reasonable control, including natural disasters, pandemics, war, terrorism, strikes, government measures, internet-infrastructure or third-party failures, large-scale cyberattacks despite reasonable protective measures.",
      },
      {
        type: "p",
        text: "(2) The affected party promptly informs the other of occurrence and expected duration. If the event lasts more than 90 days, either party may terminate with 30 days' notice.",
      },
    ],
  },
  {
    id: "s29",
    number: "Section 29",
    title: "References and publicity",
    blocks: [
      {
        type: "p",
        text: "(1) The Provider may use the name and logo of business customers in general reference form on its website and in communications, provided no confidential information is disclosed.",
      },
      {
        type: "p",
        text: "(2) Beyond this, reference uses (case studies, quotes, press releases) require prior written consent of the customer.",
      },
      {
        type: "p",
        text: "(3) The customer may object to referencing under (1) at any time with 30 days' notice.",
      },
    ],
  },
  {
    id: "s30",
    number: "Section 30",
    title: "Assignment and change of control",
    blocks: [
      {
        type: "p",
        text: "(1) The customer may transfer rights and obligations under this contract to third parties only with prior written consent of the Provider, which shall not be unreasonably withheld.",
      },
      {
        type: "p",
        text: "(2) The Provider may transfer rights and obligations in the context of a merger, acquisition, reorganisation or asset transfer to a successor, provided the successor remains bound by these Terms and no material service reductions occur.",
      },
      {
        type: "p",
        text: "(3) No consent is required for transfer to an affiliate of the Provider; notice is given at least 30 days in advance.",
      },
    ],
  },
);

TERMS_EN.sections.push(
  {
    id: "s31",
    number: "Section 31",
    title: "Changes to these Terms",
    blocks: [
      {
        type: "p",
        text: "(1) The Provider may amend these Terms for objectively justified reasons, in particular changes of law, changes of supreme-court case law, changes to the scope of services, security-relevant adjustments or compelling economic reasons.",
      },
      {
        type: "p",
        text: "(2) Amendments are notified to the customer in text form (typically by email) at least 30 days before entry into force. The notice contains the amended clauses verbatim or a corresponding link.",
      },
      {
        type: "p",
        text: "(3) If the customer does not object in text form within 30 days after receipt, the amended Terms are deemed accepted. The notice expressly points out this consequence.",
      },
      {
        type: "p",
        text: "(4) On timely objection the contract continues on the prior Terms; either party may then extraordinarily terminate with effect at the planned date of entry into force.",
      },
      {
        type: "p",
        text: "(5) For consumers (3) applies only to clauses not constituting unreasonable disadvantage under Section 307 BGB; essential contract elements require the statutory consent.",
      },
    ],
  },
  {
    id: "s32",
    number: "Section 32",
    title: "Special provisions for consumers",
    blocks: [
      {
        type: "p",
        text: "(1) This section applies in addition and exclusively to consumers (Section 13 BGB). In case of conflict with other clauses these consumer-protection provisions prevail.",
      },
      {
        type: "p",
        text: "(2) The liability caps in Section 26(4)–(6) apply to consumers only to the extent compatible with mandatory consumer law. Claims under the German Product Liability Act and in case of injury to life, body or health remain unaffected.",
      },
      {
        type: "p",
        text: "(3) The shortening of the limitation period under Section 26(8) and the warranty shortening under Section 25(4) do not apply to consumers.",
      },
      {
        type: "p",
        text: "(4) The set-off and retention restriction under Section 13(7) does not apply to consumers.",
      },
      {
        type: "p",
        text: "(5) The place of jurisdiction under Section 33(2) does not apply to consumers; statutory rules of jurisdiction apply.",
      },
      {
        type: "p",
        text: "(6) Information on online dispute resolution: The European Commission provides an ODR platform at ec.europa.eu/consumers/odr. The Provider is neither willing nor obliged to participate in dispute resolution proceedings before a consumer arbitration board.",
      },
    ],
  },
  {
    id: "s33",
    number: "Section 33",
    title: "Dispute resolution, governing law, jurisdiction",
    blocks: [
      {
        type: "p",
        text: "(1) These Terms and all claims arising therefrom are governed by the laws of the Federal Republic of Germany, excluding the UN Convention on the International Sale of Goods (CISG). For consumers habitually residing in the EU, the applicability of mandatory consumer-protection law of their home state remains unaffected.",
      },
      {
        type: "p",
        text: "(2) Exclusive place of jurisdiction for all disputes arising from this contract is Berlin, where the customer is a merchant, public-law legal entity or public-law special fund. The Provider may in addition sue the customer at its general place of jurisdiction.",
      },
      {
        type: "p",
        text: "(3) The German-language version of these Terms is the authoritative version. Translations serve information only; in case of conflict the German version prevails.",
      },
    ],
  },
  {
    id: "s34",
    number: "Section 34",
    title: "Final provisions",
    blocks: [
      {
        type: "p",
        text: "(1) Should individual provisions be invalid or unenforceable, the validity of the remaining provisions is unaffected. The invalid or unenforceable provision is replaced by a valid and enforceable provision that comes closest to the economic purpose of the original.",
      },
      {
        type: "p",
        text: "(2) Oral side-agreements do not exist. Amendments and supplements require text form.",
      },
      {
        type: "p",
        text: "(3) Legally relevant notices from one party to the other are delivered in text form by email to the stored contact addresses and are deemed received three business days after dispatch unless earlier receipt is proven.",
      },
      {
        type: "p",
        text: "(4) Declarations in electronic form, including electronic signatures within the meaning of the eIDAS Regulation, are mutually recognised.",
      },
      {
        type: "p",
        text: "(5) Non-exercise of a right is not a waiver thereof. Waivers require express text form.",
      },
      {
        type: "p",
        text: "(6) These Terms together with individually agreed documents, the privacy policy, the DPA and the applicable Annexes constitute the entire agreement and supersede all prior agreements on the same subject.",
      },
      {
        type: "p",
        text: "(7) Rights and obligations that by their nature are intended to survive termination remain effective thereafter, in particular Sections 5, 8, 9(3), 10, 22, 26, 27, 33.",
      },
      {
        type: "p",
        text: "(8) This contract creates no rights for third parties. Third-party claims arising from this contract are excluded.",
      },
    ],
  },
  {
    id: "s35",
    number: "Section 35",
    title: "Version history and archiving",
    blocks: [
      {
        type: "p",
        text: "(1) These Terms bear version number 3.0 and enter into force on 18 April 2026. They replace version 2.0 of February 2026.",
      },
      {
        type: "p",
        text: "(2) On each conclusion of a contract the applicable version is documented and confirmed to the customer by email. The Provider archives all versions for at least ten years after expiry and makes them available on request.",
      },
      {
        type: "p",
        text: "(3) Prior versions are available at caelex.eu/legal/terms/archive.",
      },
    ],
  },
);

TERMS_EN.annexes.push(
  {
    id: "annex-a",
    number: "Annex A",
    title: "Atlas — Regulatory database",
    blocks: [
      {
        type: "p",
        text: "This Annex supplements the main sections for the use of Atlas. In case of conflict this Annex prevails.",
      },
      {
        type: "p",
        text: "(1) Atlas is a curated database of international, EU and national space-law instruments. Content is assembled, structured and referenced to primary sources by the Provider.",
      },
      {
        type: "p",
        text: "(2) Section 5 (no legal advice), Section 6 (data quality) and Section 7 (AI features, where Astra is embedded in Atlas) expressly apply. In particular, categorisation of instruments, attribution of ratifiers, validity determinations and link status are aids and do not replace examination of the primary source.",
      },
      {
        type: "p",
        text: "(3) The Atlas databases, mappings and structural entries are a database work under Sections 87a et seq. German Copyright Act. The database maker's right remains exclusively with the Provider. Systematic or material extraction is prohibited under Section 11(1).",
      },
      {
        type: "p",
        text: "(4) Atlas may contain publicly accessible areas. Authenticated features (bookmark sync, comparator, PDF memo download) require user status; public areas remain subject to the use restrictions under Section 11.",
      },
    ],
  },
  {
    id: "annex-b",
    number: "Annex B",
    title: "Assure — No investment or financial advice",
    blocks: [
      {
        type: "callout",
        variant: "warn",
        text: "Assure is a qualitative regulatory-readiness tool. It is not investment advice, investment brokerage, financial analysis or any other regulated financial service.",
      },
      {
        type: "p",
        text: "(1) This Annex supplements Section 5(2) and applies to the Assure product line including Regulatory Readiness Score (RRS), Regulatory Credit Rating (RCR), Investment Readiness Score (IRS), risk register, scenario analysis, data-room features and investor-update generation.",
      },
      {
        type: "p",
        text: "(2) All Assure outputs are qualitative, rules-based assessments of regulatory parameters. They expressly are not a recommendation to buy, sell or hold financial instruments and not an assessment within the meaning of investment services.",
      },
      {
        type: "p",
        text: "(3) Assure scores rely on customer inputs and are only as valid as those inputs. The customer is solely responsible for accuracy, completeness and currency of its inputs.",
      },
      {
        type: "p",
        text: "(4) The customer shall not use Assure outputs as a basis for investment decisions without qualified review by licensed financial service providers. When forwarding to investors or third parties, the customer shall clearly identify the informational nature of the outputs and the liability disclaimers under Sections 5 and 26.",
      },
      {
        type: "p",
        text: "(5) Data-room features serve organisation and protected exchange of existing documents only. The Provider is not a fiduciary, escrow agent or auditor.",
      },
      {
        type: "p",
        text: "(6) The Provider is not liable for investment decisions based on Assure outputs, nor toward third parties to whom the customer makes Assure outputs available.",
      },
    ],
  },
  {
    id: "annex-c",
    number: "Annex C",
    title: "Academy — Training and certifications",
    blocks: [
      {
        type: "p",
        text: "(1) Academy comprises training modules, simulations, classrooms and badge issuance.",
      },
      {
        type: "p",
        text: "(2) Badges, simulation completions and participation statements from Academy are internal only and are not state-recognised certifications, professional qualifications or academic credit.",
      },
      {
        type: "p",
        text: "(3) The Provider does not guarantee examination success or achievement of specific learning outcomes by the customer or its users.",
      },
      {
        type: "p",
        text: "(4) Training content is curated to the best current standard. Section 6 applies accordingly.",
      },
    ],
  },
  {
    id: "annex-d",
    number: "Annex D",
    title: "API and Widget",
    blocks: [
      {
        type: "p",
        text: "(1) Use of the Caelex API and Widget is subject to the main sections and this Annex.",
      },
      {
        type: "p",
        text: "(2) API keys are confidential and must not be shared with third parties. Plan-based rate limits must be respected; exceedance may lead to temporary suspensions or additional charges.",
      },
      {
        type: "p",
        text: "(3) The Provider may deprecate API versions with at least 90 days' notice. The customer is responsible for timely adjustment of its integration.",
      },
      {
        type: "p",
        text: "(4) Where the customer operates an integration or product using the Caelex API or Widget, the customer is solely liable vis-à-vis its end customers. The Provider forms no legal relationship with the customer's end customers.",
      },
      {
        type: "p",
        text: "(5) The customer warrants that its integration does not present Caelex Content as its own and, where provided in the Widget, carries the „Powered by Caelex“ attribution.",
      },
      {
        type: "p",
        text: "(6) Public API endpoints are subject to a fair-use policy. Abusive use, in particular systematic extraction, entitles immediate suspension.",
      },
    ],
  },
  {
    id: "annex-e",
    number: "Annex E",
    title: "Astra — AI compliance assistant",
    blocks: [
      {
        type: "callout",
        variant: "warn",
        text: "Astra is an AI-assisted copilot. Outputs are informational and do not replace qualified advice. Do not use outputs unreviewed for regulatory filings or compliance decisions.",
      },
      {
        type: "p",
        text: "(1) Astra answers questions on space law, compliance requirements and Platform Content. Astra uses large language models from external providers (see Section 20(3)).",
      },
      {
        type: "p",
        text: "(2) Section 7 (AI features) applies in full. Astra outputs may be incomplete, outdated, inconsistent or fabricated.",
      },
      {
        type: "p",
        text: "(3) Astra must not be used for purposes equivalent to legal services under the German RDG, in particular not for individual-case assessment with binding effect, not for preparing regulatory filings without review by qualified advisors, and not for representing before authorities.",
      },
      {
        type: "p",
        text: "(4) The Provider uses inputs entered by the customer via Astra to answer the query. Inputs are not used to train own or third-party models under Section 9(4). Aggregated, anonymised usage patterns for Platform improvement remain unaffected.",
      },
      {
        type: "p",
        text: "(5) Astra conversations are stored to operate the feature and for quality assurance. The customer may delete conversations at any time; after deletion, restoration is not possible.",
      },
      {
        type: "p",
        text: "(6) The customer may reuse Astra outputs but shall identify them as AI-generated content when forwarding to third parties or authorities where required by law or contract.",
      },
      {
        type: "p",
        text: "(7) The Provider excludes liability for damages from unreviewed use of Astra outputs to the extent permitted by law. Section 26 applies accordingly.",
      },
    ],
  },
);

TERMS_EN.contactLines.push(
  "Caelex",
  "Owner: Julian Polleschner",
  "Am Maselakepark 37",
  "13587 Berlin, Germany",
  "",
  "General inquiries:",
  "mailto:cs@caelex.eu",
  "Legal & Terms:",
  "mailto:legal@caelex.eu",
  "Privacy:",
  "mailto:privacy@caelex.eu",
  "Security:",
  "mailto:security@caelex.eu",
);

TERMS_EN.links.push(
  { label: "Deutsche Version →", href: "/legal/terms" },
  { label: "Privacy Policy", href: "/legal/privacy-en" },
  { label: "Cookie Policy", href: "/legal/cookies-en" },
  { label: "Impressum", href: "/legal/impressum" },
  { label: "DPA", href: "/legal/dpa" },
  { label: "Sub-processors", href: "/legal/sub-processors" },
);
