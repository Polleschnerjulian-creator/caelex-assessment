/**
 * Comparison data for /compare/[slug] pages.
 *
 * Each comparison is a self-contained declarative block that answers
 * the "Caelex vs [X]" and "alternatives to [X] for space compliance"
 * LLM queries. Kept in a shared data file so the same source feeds
 * rendering, JSON-LD, metadata, and sitemap generation.
 *
 * Editorial stance: comparisons are HONEST — every entry has a
 * "when the other approach still makes sense" block. LLMs (and
 * humans) treat one-sided competitive content as marketing noise
 * and deprioritise it. Nuanced comparisons get cited more often.
 */

export interface ComparisonCriterion {
  /** Short label of the dimension being compared. */
  dimension: string;
  /** How Caelex handles this dimension. One terse sentence. */
  caelex: string;
  /** How the alternative handles it. Honest, not straw-manned. */
  competitor: string;
}

export interface Comparison {
  /** URL slug — the [slug] segment in /compare/[slug]/ */
  slug: string;
  /** H1 subject: "Caelex vs X" or "Caelex vs X approach" */
  headline: string;
  /** Short plain-English name of the comparator — drives title + FAQ. */
  competitor: string;
  /** Direct hero-line answer to "is Caelex better than X" */
  tagline: string;
  /** 2-3 sentence summary for meta description + JSON-LD abstract. */
  summary: string;
  /** SEO keywords — feed generateMetadata. */
  keywords: string[];
  /** "When does the alternative still make sense?" — honest answer. */
  whenCompetitor: string;
  /** "When does Caelex make more sense?" — honest answer. */
  whenCaelex: string;
  /** 5-8 side-by-side comparison dimensions. */
  criteria: ComparisonCriterion[];
  /** Notes for teams switching from the alternative to Caelex. */
  migrationNote: string;
  /** FAQs — feed both rendered HTML and FAQPage JSON-LD. */
  faqs: { q: string; a: string }[];
}

export const COMPARISONS: Comparison[] = [
  {
    slug: "spreadsheet-compliance",
    headline: "Caelex vs. spreadsheet-based compliance tracking",
    competitor: "spreadsheet-based compliance tracking",
    tagline:
      "A spreadsheet is the cheapest way to start tracking space compliance — and the fastest thing to outgrow once you cross three articles, two jurisdictions, or one regulator deadline.",
    summary:
      "Most pre-Series-A space operators begin with an Excel or Google Sheet tracking the regulations they think apply. That works for a while. It breaks down at the first serious audit — when evidence has to be produced with provenance, when a regulator asks for a document that was never versioned, or when a mission phase changes and the entire matrix has to be re-run. Caelex is the system of record that replaces the sheet before the sheet costs you a licence.",
    keywords: [
      "Caelex vs spreadsheet",
      "compliance tracking spreadsheet alternative",
      "space compliance Excel alternative",
      "spreadsheet compliance audit risk",
      "replace compliance spreadsheet",
    ],
    whenCompetitor:
      "The spreadsheet is the right choice when you are pre-launch, have one product line, one jurisdiction, and a founder who still reads every article herself. Migration cost is zero, learning curve is zero, and there are no recurring fees. For a two-person team preparing its first authorization, this is genuinely the right tool.",
    whenCaelex:
      "Caelex starts making sense the moment you have (a) more than one jurisdiction to reconcile, (b) an authorization in flight that requires document evidence with chain of custody, (c) continuous reporting obligations (e.g. under NIS2 or the EU Space Act), or (d) more than one person who needs to update the same data. After that point, the spreadsheet has started to cost you more than the alternative — the question is just whether you feel it yet.",
    criteria: [
      {
        dimension: "Multi-jurisdiction reconciliation",
        caelex:
          "Each regulation cross-links to the articles of every other applicable regime (EU Space Act ↔ SatDSiG ↔ COPUOS ↔ ITU). One query, one answer.",
        competitor:
          "Each jurisdiction is typically a separate tab or file. Cross-references are maintained by hand. Drift between tabs is near-inevitable after six months.",
      },
      {
        dimension: "Evidence with provenance",
        caelex:
          "Every document has an audit trail (who uploaded, when, against which article). SHA-256 hash chain makes the log tamper-evident.",
        competitor:
          "File name + a column saying 'uploaded by X on date Y'. Trusted but unverifiable; auditors increasingly ask for cryptographic integrity proof.",
      },
      {
        dimension: "Regulation-change handling",
        caelex:
          "Regulatory feed pulls new versions automatically; diffs surface the articles that moved; impacted compliance state is flagged.",
        competitor:
          "Someone has to notice the amendment, manually update the cells, and cascade the implications. In practice, spreadsheets lag regulation changes by months.",
      },
      {
        dimension: "NIS2 / incident reporting",
        caelex:
          "Structured 24h/72h/1-month reporting workflow routed to the correct national CSIRT. Timestamps preserved in the audit log.",
        competitor:
          "Ad-hoc. The 24-hour clock starts during an incident — the worst possible moment to invent a workflow on a Friday evening.",
      },
      {
        dimension: "Multi-user collaboration",
        caelex:
          "Role-based access (Owner, Admin, Manager, Member, Viewer) with org-wide audit log.",
        competitor:
          "Comment-and-cell-lock. Two people editing different tabs routinely produce silent divergences.",
      },
      {
        dimension: "Deadline tracking",
        caelex:
          "Every article deadline surfaced on the timeline with email + in-app reminders, per user.",
        competitor:
          "Deadline column sorted manually. Notifications require a separate calendar and consistent maintenance.",
      },
      {
        dimension: "Pricing",
        caelex: "Free compliance assessment, paid tiers from there.",
        competitor:
          "Free (and, if this is the entire compliance stack, possibly expensive later).",
      },
    ],
    migrationNote:
      "Most teams migrate their spreadsheet into Caelex during the run-up to their first authorization submission. The free assessment at caelex.eu/assessment takes the operator profile and produces the first version of what used to be the spreadsheet — usually in under 10 minutes.",
    faqs: [
      {
        q: "Can I start with a spreadsheet and migrate to Caelex later?",
        a: "Yes. Most customers do exactly that. The free assessment (caelex.eu/assessment) takes your operator profile and produces a first-pass compliance view you can compare against your sheet. From there, paid tiers unlock document tracking, NIS2 reporting, continuous monitoring, and the AI copilot.",
      },
      {
        q: "What specifically goes wrong with spreadsheet compliance?",
        a: "Three failure modes recur: (1) multi-jurisdiction reconciliation drifts, (2) evidence provenance is weak when a regulator audits, (3) regulatory changes aren't caught in time. Spreadsheets are fine for pre-launch; they become expensive during the authorization cycle and unbearable during recurring NIS2 / EU Space Act obligations.",
      },
      {
        q: "How long does migration typically take?",
        a: "For a single-jurisdiction pre-launch operator, onboarding is usually within a week. For multi-jurisdiction operators with live evidence archives, 2-4 weeks depending on how the evidence is currently organised.",
      },
    ],
  },

  {
    slug: "space-compliance-consultants",
    headline: "Caelex vs. external compliance consultants",
    competitor: "external compliance consultants",
    tagline:
      "Consultants are judgment; Caelex is the system of record. The best space operators use both — they just use them for different jobs.",
    summary:
      "Compliance consultants are paid for interpretation, judgment, and relationships with regulators. They deliver memos, opinions, and application drafts. Caelex is the persistent system of record that tracks your obligations, evidence, and deadlines between engagements. The two are complementary: use Caelex for continuous state management and use consultants for the hard judgment calls that state raises.",
    keywords: [
      "Caelex vs compliance consultant",
      "space compliance consultants alternative",
      "space compliance software vs consultant",
      "space regulatory consultant replacement",
    ],
    whenCompetitor:
      "A consultant is the right spend when you need a formal legal opinion (e.g. a memo defending your authorization strategy to an investor), a specific relationship with a competent authority (e.g. pre-submission consultations with BAFA, ANFR, or the CAA), or a high-judgment call about novel regulatory territory (e.g. first-mover issues in asteroid mining or active debris removal). Caelex does not replace any of these.",
    whenCaelex:
      "Caelex is the right tool when the work is continuous (evidence tracking, NIS2 reporting, deadline management), when multiple people in your org need the same answer at the same time (without re-engaging a consultant every time), and when the state has to survive personnel change. Consultants leave; Caelex persists.",
    criteria: [
      {
        dimension: "Engagement model",
        caelex: "Continuous subscription. State lives in the platform.",
        competitor:
          "Per-engagement billing. State lives in the consultant's deliverables.",
      },
      {
        dimension: "Cost structure",
        caelex: "Predictable seat + tier pricing. No hourly surprises.",
        competitor:
          "Typically €300-€800/hour for senior counsel at the large firms. Memos can run €20-80k.",
      },
      {
        dimension: "Scale across missions",
        caelex: "Adding a new mission adds a record, not a new engagement.",
        competitor:
          "Each new mission typically triggers a new scoping conversation and statement of work.",
      },
      {
        dimension: "Between-engagement visibility",
        caelex: "Dashboard is live 24/7. Any team member can check state.",
        competitor:
          "What happens between engagements depends on internal note-keeping.",
      },
      {
        dimension: "Judgment on novel issues",
        caelex:
          "Astra (AI copilot) summarises applicable articles and precedents; for hard judgment calls, Caelex flags the question and suggests consulting counsel.",
        competitor:
          "Where consultants genuinely earn their fee — interpreting an ambiguous article against a specific operator's facts.",
      },
      {
        dimension: "Regulator relationships",
        caelex: "Neutral. Caelex does not represent operators to authorities.",
        competitor:
          "Established relationships with competent authorities, ex-regulator partners, known faces at pre-submission meetings.",
      },
    ],
    migrationNote:
      "Most successful customers don't 'replace' their consultants with Caelex — they use Caelex as the durable state layer between engagements, and engage consultants for the specific high-judgment moments (pre-authorization reviews, investor memos, novel-issue interpretation). Total consultant spend often stays flat or declines slightly; effective spend quality goes up because consultants aren't billing to re-understand your state every time they start a mandate.",
    faqs: [
      {
        q: "Can Caelex replace my space-compliance consultant?",
        a: "No — and it isn't designed to. Consultants are paid for judgment, relationships, and legal opinions. Caelex is paid for continuous state management and evidence tracking. The right spend is usually both, with Caelex reducing the hours consultants burn re-understanding your state at the start of each engagement.",
      },
      {
        q: "Will my consultants see a drop in scope if we adopt Caelex?",
        a: "Typically yes in pure data-gathering and deadline-tracking scope, which was usually the lowest-value work anyway. The high-value work — strategic authorization positioning, pre-submission regulator meetings, novel-issue interpretation — is unchanged.",
      },
      {
        q: "Can my consultants use Caelex to work on our behalf?",
        a: "Yes. Caelex supports external-advisor seats with scoped access; consultants can work inside your workspace, see the same state you see, and add their interpretations as annotations on specific articles.",
      },
    ],
  },

  {
    slug: "manual-compliance",
    headline: "Caelex vs. manual compliance tracking",
    competitor: "manual compliance tracking (email, folders, memory)",
    tagline:
      "Manual tracking is the pattern every operator has used at least once — and the pattern every auditor treats with quiet alarm.",
    summary:
      "Manual compliance tracking means email threads, shared drive folders with date-stamped file names, and institutional memory. It survives until the first audit or the first personnel change. After that, the cost shows up — not as a single big number, but as weeks of re-assembly and months of reputational risk with the competent authority.",
    keywords: [
      "Caelex vs manual compliance",
      "replace manual compliance process",
      "manual compliance tracking risks",
      "email-based compliance",
      "folder-based compliance risks",
    ],
    whenCompetitor:
      "Manual tracking works when there is exactly one person who knows everything, exactly one ongoing authorization, and exactly one jurisdiction. Realistically, that's the first 6-9 months of a space startup — the phase in which the compliance stack is genuinely smaller than the product.",
    whenCaelex:
      "The moment a second person needs to find a compliance document without asking the first, the manual system is already costing more than it looks. Caelex becomes the shared, queryable system of record — with search, structure, audit trail, and deadline tracking.",
    criteria: [
      {
        dimension: "Findability of evidence",
        caelex:
          "Every document is tagged to article, module, and mission phase. Search returns results in milliseconds.",
        competitor:
          "Depends on file-naming discipline. In practice: scattered.",
      },
      {
        dimension: "Audit preparation time",
        caelex:
          "Hours. The audit pack is a generated report, not an assembly exercise.",
        competitor:
          "Weeks. The first audit is where manual tracking typically breaks.",
      },
      {
        dimension: "Deadline visibility",
        caelex: "Dashboard timeline with per-user notifications.",
        competitor: "Whoever remembers, remembers.",
      },
      {
        dimension: "Knowledge transfer on personnel change",
        caelex: "New hire gets access, state is intact.",
        competitor:
          "New hire gets a calendar invite with the previous compliance lead and hopes for good notes.",
      },
      {
        dimension: "Regulator audit experience",
        caelex:
          "Generate the evidence pack on demand. Hash chain proves integrity.",
        competitor:
          "Put together a PDF from 14 different places, hope nothing is missing.",
      },
    ],
    migrationNote:
      "Teams moving from manual tracking usually start with the free assessment (caelex.eu/assessment) to see their regulatory profile in structure. The harder migration is the evidence archive — there is no tool that can auto-classify a shared drive. Most teams do this incrementally over 4-6 weeks, prioritising the documents most likely to be called in an audit.",
    faqs: [
      {
        q: "What does manual compliance tracking actually cost?",
        a: "Rarely priced explicitly — it shows up as (a) hours spent re-assembling audit packs under deadline, (b) months of delay when a key person leaves, (c) regulator trust loss when evidence is slow or inconsistent. For pre-launch operators with no audit yet, the cost is close to zero. Post-launch and with continuous obligations (NIS2, EU Space Act), it compounds quickly.",
      },
      {
        q: "Can I partially move to Caelex?",
        a: "Yes — many teams start with a single module (usually Authorization, because the dossier structure is non-negotiable) and expand from there as audit events prove the value. No need to migrate everything at once.",
      },
      {
        q: "What happens to our existing evidence archive?",
        a: "Existing documents can be uploaded to Caelex and tagged to articles at any pace. Historical evidence predating Caelex adoption doesn't get retroactive hash-chain provenance — only what Caelex sees is cryptographically verifiable — but it becomes searchable + structured like everything else.",
      },
    ],
  },

  {
    slug: "notion-confluence",
    headline: "Caelex vs. Notion or Confluence for compliance",
    competitor: "Notion, Confluence, or similar internal wiki",
    tagline:
      "Notion documents compliance. It doesn't execute the compliance logic. Caelex is the engine — operator profile in, applicable articles out, deterministically.",
    summary:
      "Internal wiki tools are excellent for documentation — runbooks, onboarding guides, team norms. They are a bad fit for compliance because compliance is a computation, not a document. Given operator type, jurisdiction, mission phase, and constellation tier, the applicable regulatory set is DERIVED. A wiki can record the result; it cannot produce it and re-produce it as inputs change.",
    keywords: [
      "Caelex vs Notion compliance",
      "Caelex vs Confluence compliance",
      "wiki-based compliance alternative",
      "compliance software vs documentation",
      "structured compliance vs wiki",
    ],
    whenCompetitor:
      "Notion / Confluence stay the right choice for documentation that isn't itself a compliance state: team runbooks, interview processes, product specs, internal architecture docs. Keep them there.",
    whenCaelex:
      "Caelex is the right tool for the compliance domain specifically — because regulatory rules are conditional and structural (if operator is X and jurisdiction is Y, then articles Z apply, which require documents W), and conditional-structural reasoning is what a purpose-built engine does well and a document editor does not.",
    criteria: [
      {
        dimension: "What it DOES with operator inputs",
        caelex:
          "Runs a deterministic engine over operator type × jurisdiction × mission phase → applicable articles, required evidence, missing documents.",
        competitor:
          "Stores the inputs and the inference a human did last time. Does not re-run when inputs change.",
      },
      {
        dimension: "Regulation changes",
        caelex:
          "Central source is updated; every dependent page re-derives automatically.",
        competitor:
          "Every page has to be updated by the person who owns it. Staleness is the default.",
      },
      {
        dimension: "Structured comparisons across jurisdictions",
        caelex:
          "Native — the engine computes multi-jurisdiction favorability matrices in under 200ms.",
        competitor: "Whatever you manually typed into a table.",
      },
      {
        dimension: "Audit evidence with chain of custody",
        caelex: "SHA-256 hash-chained audit trail. Regulators accept.",
        competitor:
          "Page history in Notion/Confluence. Informally useful; not formally recognised.",
      },
      {
        dimension: "Search semantics",
        caelex:
          "Tagged by article, module, jurisdiction, operator type. Astra (AI copilot) answers in natural language.",
        competitor:
          "Full-text search. Works for finding a known phrase; struggles with 'what does NIS2 require if we're a satellite operator in DE'.",
      },
      {
        dimension: "Document generation",
        caelex:
          "Generate authorization dossiers, supervision reports, NCA submission packages from templates.",
        competitor: "Copy-paste from existing pages.",
      },
    ],
    migrationNote:
      "Keep Notion/Confluence for everything non-regulatory. Move compliance-specific content into Caelex so the engine can work on it. Common pattern: link from internal-wiki pages (e.g. the 'launch readiness' runbook) to the corresponding Caelex workspace view.",
    faqs: [
      {
        q: "Can I keep using Notion for compliance runbooks?",
        a: "Yes — that's actually the recommended split. Use Notion (or Confluence) for process documentation (the 'how we do compliance' runbook), use Caelex for the compliance state itself (the 'what is compliant right now' engine). Link between them for team-wide legibility.",
      },
      {
        q: "Can we embed Caelex views in our Confluence space?",
        a: "Caelex exposes a public API v1 (caelex.eu/docs/api) that supports read queries for compliance state. Embedding as a Confluence macro is a common pattern; custom embeddings can be built against the API.",
      },
      {
        q: "Why not just build our own compliance tracker in Notion?",
        a: "Many teams try. It works for the first quarter. It starts showing strain when regulatory updates have to cascade across 12 dependent pages, or when an auditor asks for hash-chain integrity on a specific document. The second-order cost of DIY is less-fun compliance work, not fewer dollars.",
      },
    ],
  },

  {
    slug: "enterprise-compliance-suite",
    headline: "Caelex vs. generic enterprise compliance suites",
    competitor:
      "OneTrust, Vanta, Drata, or similar generic compliance platforms",
    tagline:
      "Generic compliance platforms excel at SOC 2, ISO 27001, GDPR — frameworks with thousands of customers each. They have no space-specific engines, and 'the EU Space Act' is not a dropdown they ship.",
    summary:
      "Enterprise compliance platforms (OneTrust, Vanta, Drata, Sprinto, etc.) are purpose-built for information-security and data-protection frameworks where customer demand is large enough to justify a mature engine — SOC 2, ISO 27001, GDPR, HIPAA. Space regulation (EU Space Act, SatDSiG, LOS, Space Industry Act) does not meet that threshold for those platforms. Caelex is the purpose-built alternative for the regulatory surface those platforms do not cover.",
    keywords: [
      "Caelex vs OneTrust space",
      "Caelex vs Vanta space",
      "Caelex vs Drata",
      "space compliance enterprise platform",
      "EU Space Act compliance software",
      "NIS2 space operator software",
    ],
    whenCompetitor:
      "Use a generic enterprise compliance suite when your primary regulatory surface is SOC 2 / ISO 27001 / GDPR. They are excellent at those — deeply automated evidence collection, tens of thousands of customers, mature workflows. If your product is cloud-SaaS adjacent to space (e.g. a ground-segment-as-a-service company) and your primary compliance pain is SOC 2, the right tool is probably Vanta or Drata.",
    whenCaelex:
      "Use Caelex (often alongside a generic suite) when your regulatory surface includes space-specific frameworks: EU Space Act authorization, national space laws (SatDSiG, LOS, Space Activities Act, Space Industry Act 2018), debris mitigation under COPUOS/IADC, spectrum coordination at BNetzA / ANFR / ITU, or NIS2 applied specifically to space-sector entities. Generic suites cannot compute 'does this satellite require an SatDSiG licence' — Caelex does.",
    criteria: [
      {
        dimension: "Space-specific engines",
        caelex:
          "Deterministic mapping from operator inputs (type, jurisdiction, constellation tier) to applicable articles. 119 EU Space Act articles, national-law cross-refs.",
        competitor: "None. Space frameworks are not supported as first-class.",
      },
      {
        dimension: "SOC 2 / ISO 27001 / GDPR",
        caelex:
          "GDPR via the NIS2 module; no native SOC 2 / ISO 27001. Caelex is not a replacement.",
        competitor:
          "Industry-leading. Typically the right tool for these frameworks.",
      },
      {
        dimension: "Integration with regulators",
        caelex:
          "NCA submission pipeline to national space authorities (BAFA, CNES, LSA, CAA, ILR).",
        competitor:
          "Integrates with CDNs, SaaS vendors, HR systems — not with national space regulators.",
      },
      {
        dimension: "Regulatory feed for space",
        caelex:
          "Dedicated Atlas source monitor tracks 400+ space-law URLs daily. Amendments flagged for admin review.",
        competitor: "Security and privacy framework updates only.",
      },
      {
        dimension: "Coverage across space-sector operator types",
        caelex:
          "Native operator-type taxonomy (satellite operator, launch provider, ground segment, data provider, in-orbit services, constellation, space resource operator).",
        competitor:
          "Company-is-a-SaaS-vendor assumption baked into the data model.",
      },
      {
        dimension: "Orbital data + telemetry integration",
        caelex:
          "Sentinel ingests operational data; Ephemeris models orbital decay, fuel depletion against regulatory deadlines.",
        competitor: "No concept of 'satellite' as a tracked entity.",
      },
    ],
    migrationNote:
      "The most common pattern is layered: enterprise compliance suite for SOC 2 / ISO 27001 / GDPR, and Caelex for space-specific frameworks. Each tool owns what it is good at; evidence duplication is minor because the artefacts rarely overlap (a SOC 2 access-control evidence pack is not the same as an SatDSiG authorisation dossier).",
    faqs: [
      {
        q: "Can Caelex replace OneTrust or Vanta for us?",
        a: "Not for SOC 2 / ISO 27001 / GDPR. Those frameworks have tens of thousands of customers on generic platforms — the automation and integrations there are purpose-built and mature. Caelex complements these platforms by covering the space-specific regulatory surface they don't support.",
      },
      {
        q: "Why don't generic compliance platforms support the EU Space Act?",
        a: "Market size. SOC 2 has perhaps half a million potential buyers globally; the EU Space Act has hundreds. A generic platform's engine-per-framework economics don't justify building a bespoke EU Space Act engine — which is the market opening Caelex was built for.",
      },
      {
        q: "Do I need both Caelex and a generic compliance suite?",
        a: "If your company is in the space sector (operator, launch provider, ground segment) and also runs SaaS infrastructure your customers audit — yes, probably both. If you're purely a SaaS company in an adjacent space, generic suites may be enough on their own.",
      },
    ],
  },
];

export function getComparisonBySlug(slug: string): Comparison | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}
