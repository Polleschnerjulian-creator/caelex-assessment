# Caelex Compliance Assessment Tool – Build Specification

## Context

You are building the **Caelex Compliance Assessment Tool** – a free, public-facing web app that helps satellite operators determine if and how the **EU Space Act** (COM(2025) 335) affects their operations. This is the MVP and top-of-funnel lead generator for Caelex, a compliance SaaS startup ("OneTrust for space regulation").

The app has **no backend, no database, no authentication**. It's a pure client-side Next.js app that reads from a bundled JSON data file, walks users through 8–12 questions, and generates a personalized compliance profile. Deployed on Vercel.

## Data Source

The file `caelex-eu-space-act-engine.json` is the regulatory intelligence backbone. It contains:

- **75 mapped articles** across 7 Titles of the EU Space Act
- **9-step decision tree** (`decision_tree`) with routing logic
- **7 operator types**: `spacecraft_operator` (SCO), `launch_operator` (LO), `launch_site_operator` (LSO), `isos_provider` (ISOS), `collision_avoidance_provider` (CAP), `primary_data_provider` (PDP), `third_country_operator` (TCO)
- **5 constellation tiers**: single, small (2–9), medium (10–99), large (100–999), mega (1000+)
- **4 size categories**: small_enterprise, research_education, medium_enterprise, large_enterprise
- **3 compliance checklists** by operator type (spacecraft_operator_eu, launch_operator_eu, third_country_operator) with phases: pre_authorization, ongoing, end_of_life/operational
- **10 annexes** mapped to Caelex modules

### JSON Structure (key paths):

```
data.decision_tree.step_1_scope → { question, if_yes, if_no }
data.decision_tree.step_4_operator_type → { question, options: { spacecraft_operator: ..., launch_operator: ... } }
data.decision_tree.step_6_size_assessment → { question, options: { small_enterprise: ..., research_education: ... } }
data.decision_tree.step_7_constellation → { question, if_no, if_yes: { question, options: { "2-9": ..., "10-99": ... } } }

data.titles[].articles_detail[] → { number, title, summary, applies_to: ["SCO","LO",...], compliance_type, operator_action }
data.titles[].chapters[].articles_detail[] → (same structure, nested under chapters)
data.titles[].chapters[].sections[].articles_detail[] → (some have sections too)

data.compliance_checklist_by_operator_type.spacecraft_operator_eu → { pre_authorization: [...], ongoing: [...], end_of_life: [...] }
data.operator_types → { spacecraft_operator: { ... }, launch_operator: { ... }, ... }
data.constellation_tiers → { single_satellite: { ... }, small_constellation: { ... }, ... }
data.size_categories → { small_enterprise: { ... }, research_education: { ... }, ... }
```

To flatten all articles, you need to recursively walk `titles[].articles_detail[]`, `titles[].chapters[].articles_detail[]`, and `titles[].chapters[].sections[].articles_detail[]`.

### Compliance Type Normalization

The JSON has 28 different compliance_type labels. Normalize them to 5 display categories for the results:

| Display Category              | Maps From                                                                                                                                                  | Color  |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **Mandatory (Pre-Activity)**  | mandatory_pre_activity, mandatory, scope_determination                                                                                                     | Red    |
| **Mandatory (Ongoing)**       | mandatory_ongoing, ongoing, mandatory_operational, ongoing_monitoring, ongoing_commercial                                                                  | Orange |
| **Design & Technical**        | design_requirement, design_and_operational, supply_chain, methodology_reference                                                                            | Blue   |
| **Conditional / Simplified**  | conditional_exemption, conditional_simplification, optional_simplification, conditional_mandatory                                                          | Yellow |
| **Informational / Framework** | informational, enforcement, support_available, reference, framework, participation, voluntary, milestone, timeline, optional, automatic_post_authorization | Gray   |

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion (for wizard step transitions)
- **PDF**: @react-pdf/renderer (for compliance report download)
- **Icons**: Lucide React
- **Deployment**: Vercel
- **No backend. No database. No auth.** Everything is client-side.

## File Structure

```
caelex-assessment/
├── public/
│   └── caelex-eu-space-act-engine.json    # The data file
├── src/
│   ├── app/
│   │   ├── layout.tsx                      # Root layout with fonts + metadata
│   │   ├── page.tsx                        # Landing page
│   │   ├── assessment/
│   │   │   └── page.tsx                    # Assessment wizard
│   │   └── globals.css
│   ├── components/
│   │   ├── landing/
│   │   │   ├── Hero.tsx
│   │   │   ├── HowItWorks.tsx
│   │   │   ├── RegulationStats.tsx
│   │   │   └── Footer.tsx
│   │   ├── assessment/
│   │   │   ├── AssessmentWizard.tsx        # Main wizard container + state
│   │   │   ├── QuestionStep.tsx            # Individual question renderer
│   │   │   ├── ProgressBar.tsx
│   │   │   └── OptionCard.tsx              # Clickable answer option
│   │   ├── results/
│   │   │   ├── ResultsDashboard.tsx        # Main results view
│   │   │   ├── ComplianceProfile.tsx       # Summary card (operator type, regime, etc.)
│   │   │   ├── ModuleCards.tsx             # 7 module cards with status
│   │   │   ├── ChecklistPreview.tsx        # Top-5 next steps
│   │   │   ├── ArticleBreakdown.tsx        # Expandable article list
│   │   │   └── EmailGate.tsx              # Email capture for full report
│   │   └── ui/
│   │       ├── Button.tsx
│   │       └── Card.tsx
│   ├── lib/
│   │   ├── engine.ts                       # Core compliance logic
│   │   ├── types.ts                        # TypeScript types
│   │   ├── questions.ts                    # Question definitions
│   │   └── pdf.ts                          # PDF report generation
│   └── data/
│       └── modules.ts                      # 7 Caelex module definitions
├── tailwind.config.ts
├── next.config.js
├── package.json
└── tsconfig.json
```

## Design System

### Visual Direction

Dark, premium, space-tech. Not playful startup – serious B2B compliance tool. Think: linear.app meets Bloomberg Terminal aesthetics.

### Colors

```
--navy-950: #0A0F1E       (page background)
--navy-900: #0F172A       (card backgrounds)
--navy-800: #1E293B       (elevated surfaces)
--navy-700: #334155       (borders, muted elements)
--slate-400: #94A3B8      (secondary text)
--slate-200: #E2E8F0      (primary text)
--white: #F8FAFC          (headings, emphasis)
--blue-500: #3B82F6       (primary accent, CTAs)
--blue-400: #60A5FA       (links, hover states)
--green-500: #22C55E      (compliant, positive)
--amber-500: #F59E0B      (warnings, conditional)
--red-500: #EF4444        (mandatory, critical)
```

### Typography

- Headings: Inter (bold/semibold)
- Body: Inter (regular)
- Monospace accents (article numbers, stats): JetBrains Mono or font-mono

### Component Patterns

- Cards: `bg-navy-800 border border-navy-700 rounded-xl`
- Glass effect for hero: `bg-white/5 backdrop-blur-sm border border-white/10`
- Buttons primary: `bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-6 py-3`
- Status badges: Small rounded pills with color-coded backgrounds
- Transitions: `framer-motion` for wizard steps (slide left/right), `transition-all duration-200` for hovers

## Page 1: Landing Page (`/`)

### Hero Section

- Full viewport height, dark background
- Large headline: **"Is your mission affected by the EU Space Act?"**
- Subheadline: "119 articles. 10 annexes. Up to 2% turnover penalties. Find out what applies to you — in 3 minutes."
- Primary CTA button: **"Start Free Assessment →"** (links to `/assessment`)
- Below CTA, small trust text: "No account required. No data stored. 100% client-side."

### Regulation Stats Bar

- Horizontal row of 4 stat cards:
  - "119 Articles" + "Comprehensive regulation"
  - "2% Turnover" + "Maximum penalty"
  - "1 Jan 2030" + "Application date"
  - "300–630" + "Operators affected"

### How It Works

- 3-step visual: "Answer 8 questions → Get your compliance profile → Download your report"

### Footer

- "Built by Caelex · Space Compliance, Simplified"
- Link to EU Space Act source (EUR-Lex)

**Important:** The landing page should be in **English** (international space industry audience). The assessment itself should also be in English.

## Page 2: Assessment Wizard (`/assessment`)

### State Management

```typescript
interface AssessmentState {
  currentStep: number;
  answers: {
    activityType:
      | "spacecraft"
      | "launch"
      | "launch_site"
      | "isos"
      | "data_provider"
      | null;
    isDefenseOnly: boolean | null;
    allAssetsPreLaunch: boolean | null;
    isEUEstablished: boolean | null;
    entitySize: "small" | "research" | "medium" | "large" | null;
    operatesConstellation: boolean | null;
    constellationSize: number | null;
    primaryOrbit: "LEO" | "MEO" | "GEO" | "beyond" | null;
    offersEUServices: boolean | null;
  };
  isComplete: boolean;
  isOutOfScope: boolean;
  outOfScopeReason: string | null;
}
```

### Questions (in order)

**Q1: Activity Type**
"What is your primary space activity?"
Options (single select, large clickable cards):

- 🛰️ Spacecraft Operation (design, manufacture, launch, operate satellites)
- 🚀 Launch Services (launch vehicles or launch site operation)
- 🔧 In-Space Services (refueling, repair, debris removal, inspection)
- 📡 Space Data Services (primary data provision from space assets)

→ Maps to `activityType`. "Launch Services" should ask a follow-up: "Launch vehicles or launch site?" to distinguish LO vs LSO.

**Q2: Defense Exclusion**
"Are your space assets used _exclusively_ for defense or national security purposes?"

- Yes → **Out of scope.** Show: "Your assets are excluded under Art. 2(3)(a). However, dual-use assets may still be covered. Consider consulting a space law specialist." + Button "Restart" + Button "Learn more about Caelex"
- No → Continue

**Q3: Pre-2030 Assets**
"Will any of your space assets be launched after January 1, 2030?"

- Yes → Continue (in scope)
- No (all assets launched before 2030) → **Out of scope.** Show: "Pre-existing assets are grandfathered under Art. 2(3)(d). Any new launches after 2030 will be in scope." + Restart

**Q4: EU Establishment**
"Where is your organization established?"

- 🇪🇺 EU Member State (or controlled by EU entity)
- 🌍 Outside the EU, but offering services in the EU market
- 🌍 Outside the EU, no EU market activity → **Out of scope.**

→ If "Outside EU but EU market": set as third_country_operator (TCO) and note: "You must designate an EU legal representative (Art. 14)."

**Q5: Entity Size**
"What best describes your organization?"

- Small enterprise (< 50 employees, < €10M turnover)
- Research or educational institution
- Medium enterprise (50–250 employees)
- Large enterprise (> 250 employees or > €50M turnover)

→ Small + Research get the **light regime** flag (Art. 10). Show a brief callout: "✓ You may qualify for the simplified Light Regime — reduced obligations for resilience and a delayed EFD deadline (2032)."

**Q6: Constellation**
"Do you operate or plan to operate a satellite constellation?"

- No (single satellite or non-constellation)
- Yes → Follow-up: "How many satellites?" with options: 2–9 / 10–99 / 100–999 / 1,000+

**Q7: Orbit**
"What is the primary orbit for your mission?"

- LEO (Low Earth Orbit, < 2,000 km)
- MEO (Medium Earth Orbit)
- GEO (Geostationary Orbit)
- Beyond Earth orbit (cislunar, deep space)

**Q8: EU Market Services**
"Do you provide or plan to provide space-based services or data within the EU single market?"

- Yes
- No → If also non-EU established, this confirms out of scope. If EU-established, still in scope for authorization.

### Wizard UX

- One question per screen
- Large clickable cards for options (not radio buttons)
- Animated transitions between steps (Framer Motion, slide horizontal)
- Progress bar at top showing step X of 8
- "Back" button (top left) to revise answers
- If an answer triggers "Out of scope" → show result immediately with clear explanation + restart option
- On final question → auto-navigate to results

## Page 3: Results Dashboard (rendered below wizard, same page)

After answering all questions, scroll smoothly to the results section. The wizard collapses/minimizes and the results expand.

### Section A: Compliance Profile Card

A prominent card at top:

```
┌─────────────────────────────────────────────────┐
│  YOUR EU SPACE ACT COMPLIANCE PROFILE           │
│                                                  │
│  Operator Type    Spacecraft Operator (EU)       │
│  Regime           Standard (Full Requirements)   │
│  Entity Size      Medium Enterprise              │
│  Constellation    Small (8 satellites)            │
│  Primary Orbit    LEO                             │
│  EU Services      Yes                             │
│                                                  │
│  Articles with obligations: 34 of 119            │
│  ████████████░░░░░░░░ 29%                        │
│                                                  │
│  Authorization path: National Authority → EUSPA   │
│  Estimated authorization cost: ~€100K/platform   │
│  Key deadline: 1 January 2030                     │
└─────────────────────────────────────────────────┘
```

### Section B: Module Status Cards

A grid of 7 cards, one per Caelex module. Each card shows:

- Module name + icon
- Status: "Required" (red) / "Simplified" (amber) / "Not applicable" (gray) / "Recommended" (blue)
- Count of relevant articles
- 1-line summary of what's required

**Module definitions:**

```typescript
const MODULES = [
  {
    id: "compliance_assessment",
    name: "Compliance Assessment",
    icon: "ClipboardCheck",
    description: "Scope determination and regulatory mapping",
    articles_prefix: ["1", "2", "3", "4", "5"], // Title I
  },
  {
    id: "authorization_workflow",
    name: "Authorization & Registration",
    icon: "FileCheck",
    description: "Multi-authority authorization process",
    articles_prefix: [
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
      "16",
      "17",
      "18",
      "19",
      "20",
      "21",
      "22",
      "23",
      "24",
      "25",
      "26",
      "27",
    ], // Title II
  },
  {
    id: "efd_calculator",
    name: "Environmental Footprint",
    icon: "Leaf",
    description: "Environmental Footprint Declaration (EFD)",
    articles_prefix: ["96", "97", "98", "99", "100"], // Title IV Ch. 3
  },
  {
    id: "cybersecurity_suite",
    name: "Cybersecurity & Resilience",
    icon: "Shield",
    description: "NIS2-compliant risk analysis and incident reporting",
    articles_prefix: [
      "74",
      "75",
      "76",
      "77",
      "78",
      "79",
      "80",
      "81",
      "82",
      "83",
      "84",
      "85",
      "86",
      "87",
      "88",
      "89",
      "90",
      "91",
      "92",
      "93",
      "94",
      "95",
    ], // Title IV Ch. 2
  },
  {
    id: "debris_planner",
    name: "Debris Mitigation",
    icon: "Orbit",
    description: "End-of-life planning and collision avoidance",
    articles_prefix: [
      "55",
      "56",
      "57",
      "58",
      "59",
      "60",
      "61",
      "62",
      "63",
      "64",
      "65",
      "66",
      "67",
      "68",
      "69",
      "70",
      "71",
      "72",
      "73",
    ], // Title IV Ch. 1
  },
  {
    id: "dashboard_audit",
    name: "Dashboard & Audit Trail",
    icon: "LayoutDashboard",
    description: "Compliance monitoring and audit readiness",
    articles_prefix: [
      "33",
      "34",
      "35",
      "36",
      "37",
      "38",
      "39",
      "40",
      "41",
      "42",
      "43",
      "44",
      "45",
      "46",
      "47",
      "48",
      "49",
      "50",
      "51",
      "52",
      "53",
      "54",
    ], // Title III (supervision)
  },
  {
    id: "regulatory_intelligence",
    name: "Regulatory Intelligence",
    icon: "Bell",
    description: "Delegated acts and regulatory change tracking",
    articles_prefix: [
      "105",
      "106",
      "107",
      "108",
      "109",
      "110",
      "111",
      "112",
      "113",
      "114",
      "115",
      "116",
      "117",
      "118",
      "119",
    ], // Title V-VII
  },
];
```

To determine status per module: filter all flattened articles where `applies_to` includes the user's operator type abbreviation, AND the article number falls within the module's article prefix range. Then:

- If any article in the module is `mandatory_pre_activity` or `mandatory` → "Required"
- If user is light_regime and module has conditional_simplification → "Simplified"
- If no articles match the operator type → "Not applicable"
- Otherwise → "Recommended"

### Section C: Next Steps (Checklist Preview)

Show the first 5 items from the matching `compliance_checklist_by_operator_type` (based on operator type from answers). Display as a numbered checklist with a professional look.

After the 5 items, show:

> "Your full compliance checklist contains **[N] action items** across [M] phases. Get the complete checklist with deadlines and article references."
>
> **[Download PDF Report]** button → triggers email capture modal
> **[Start Over]** link

### Section D: Email Gate Modal

When user clicks "Download PDF Report":

- Modal overlay with:
  - "Get your personalized EU Space Act Compliance Report"
  - Email input field
  - Optional: Company name, Role
  - Checkbox: "I'd like to be notified when Caelex launches" (pre-checked)
  - **[Download Report →]** button
- After submission: Generate PDF client-side and trigger download
- Store nothing (no backend). The email capture is a UI pattern for now — in the future it will connect to a mailing list API. For now, just generate the PDF on click regardless of email.

### PDF Report

Generate a clean, professional PDF using @react-pdf/renderer containing:

1. Caelex branding header
2. Assessment date
3. Compliance Profile summary (all answers + derived profile)
4. Module-by-module status with relevant articles listed
5. Full checklist for the operator type
6. Key dates timeline (from JSON `metadata`)
7. Disclaimer: "This assessment is based on the EU Space Act proposal (COM(2025) 335). The regulation is subject to amendments during the legislative process. This does not constitute legal advice."

## Engine Logic (`src/lib/engine.ts`)

```typescript
interface ComplianceResult {
  operatorType: OperatorTypeKey;
  operatorTypeLabel: string;
  isEU: boolean;
  isThirdCountry: boolean;
  regime: "standard" | "light" | "out_of_scope";
  regimeReason: string;
  entitySize: string;
  constellationTier: string | null;
  orbit: string;
  applicableArticles: Article[];
  totalArticles: number;
  applicableCount: number;
  moduleStatuses: ModuleStatus[];
  checklist: ChecklistItem[];
  keyDates: KeyDate[];
  estimatedAuthorizationCost: string;
  authorizationPath: string;
}

function calculateCompliance(
  answers: AssessmentAnswers,
  data: SpaceActData,
): ComplianceResult {
  // 1. Determine operator type abbreviation
  // spacecraft → SCO, launch (vehicle) → LO, launch (site) → LSO, isos → ISOS, data → PDP
  // If third country: add TCO
  // 2. Flatten all articles from JSON
  // Recursively extract from titles → chapters → sections → articles_detail
  // 3. Filter articles by operator type
  // article.applies_to includes operatorAbbrev OR includes "ALL"
  // 4. Determine regime
  // If entitySize is small_enterprise or research_education → light regime
  // Light regime: Art. 10 simplified resilience, EFD delayed to 2032
  // 5. Calculate module statuses
  // For each module, check which filtered articles fall in its range
  // 6. Get checklist
  // Map operator type to checklist key in data.compliance_checklist_by_operator_type
  // 7. Return result
}
```

## Deployment

- Deploy to Vercel via `vercel` CLI or GitHub integration
- Domain: For now, use the Vercel default URL. Domain (caelex.eu or similar) will be configured later.
- Environment: No env vars needed (no backend, no API keys)

## Important Constraints

1. **English only** for the assessment tool (international audience)
2. **No German** in the UI (the EXIST documents are German, but the product is English)
3. **No backend calls** – everything runs client-side
4. **No localStorage for personal data** – the assessment is stateless and ephemeral
5. **Mobile responsive** – must work on phones (operators will share links)
6. **Fast** – the JSON is ~71KB, load it once and keep in memory
7. **Accessible** – proper ARIA labels on the wizard, keyboard navigation
8. **No hallucinated legal advice** – always include disclaimer that this is based on the proposal and is not legal advice
9. **Do NOT build modules 2–7** – this is ONLY the assessment tool (Module 1 MVP). The other modules are future scope.

## Quality Bar

This will be shown to:

- Satellite operators during customer discovery interviews
- A university professor (potential EXIST mentor)
- Humboldt-Innovation (university startup network)
- ESA BIC evaluators
- PtJ (German federal project agency)

It needs to look like a real product, not a hackathon project. The design quality should match Linear, Vercel Dashboard, or Stripe Docs. Professional, clean, dark, confident.

## Summary of What to Build

1. `npm create next-app` with TypeScript + Tailwind + App Router
2. Install: framer-motion, lucide-react, @react-pdf/renderer
3. Copy the JSON into `public/`
4. Build landing page (`/`)
5. Build assessment wizard (`/assessment`) with 8 questions + out-of-scope handling
6. Build results dashboard with compliance profile, module cards, checklist preview
7. Build PDF report generation
8. Build email gate modal (UI only, no actual sending)
9. Deploy to Vercel
10. Test all paths: EU spacecraft operator, third country operator, defense exclusion, pre-2030 assets, light regime eligibility
