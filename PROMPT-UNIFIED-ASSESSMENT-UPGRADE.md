# PROMPT: Unified Assessment — World-Class Upgrade

## Mission

Make the Caelex Unified Assessment (`/assessment/unified`) the most accurate, comprehensive regulatory compliance assessment in the space industry. After completing this assessment, Caelex must know **with 100% certainty** which regulations, articles, requirements, and deadlines apply to each customer — no guesswork, no estimates, no gaps.

**Core Principle:** Every single question must have a direct, traceable impact on which articles/requirements are shown. If a question doesn't change the compliance output, remove it. If a regulation applies but no question captures it, add the question.

---

## Critical Context

### Files You Will Modify

| File                                                    | Purpose                            | Current LOC |
| ------------------------------------------------------- | ---------------------------------- | ----------- |
| `src/lib/unified-assessment-questions.ts`               | All 44 questions across 8 phases   | 1,720       |
| `src/lib/unified-assessment-types.ts`                   | Type definitions, enums, constants | 663         |
| `src/app/api/unified/calculate/route.ts`                | Server-side calculation engine     | 569         |
| `src/components/assessment/UnifiedAssessmentWizard.tsx` | Wizard UI component                | ~800        |
| `src/components/unified/UnifiedResultsDashboard.tsx`    | Results display                    | ~600        |

### Files You Must Use (Read-Only Reference)

| File                                       | Purpose                                                                           |
| ------------------------------------------ | --------------------------------------------------------------------------------- |
| `src/lib/engine.server.ts`                 | **Real** EU Space Act engine — filters 119 articles by operator type              |
| `src/lib/nis2-engine.server.ts`            | **Real** NIS2 engine — 51 requirements, entity classification                     |
| `src/lib/space-law-engine.server.ts`       | **Real** Space Law engine — 10 jurisdictions, scoring                             |
| `src/data/caelex-eu-space-act-engine.json` | Full regulatory dataset (119 articles with applies_to, excludes, compliance_type) |
| `src/data/articles.ts`                     | EU Space Act article definitions (67 grouped entries)                             |
| `src/data/modules.ts`                      | 9 compliance modules with article ranges                                          |
| `src/data/nis2-requirements.ts`            | 51 NIS2 requirements mapped to Art. 21(2)(a)-(j)                                  |
| `src/data/national-space-laws.ts`          | 10 jurisdictions with detailed data                                               |
| `src/lib/types.ts`                         | Core types (AssessmentAnswers, Article, ComplianceResult, etc.)                   |

---

## Phase 1: Replace Estimated Counts with Real Engine Calls (CRITICAL)

### Problem

The current `calculate/route.ts` uses **hardcoded arithmetic** to estimate article counts:

```typescript
// CURRENT — WRONG
applicableArticleCount = 15  // base
  + 25 if SCO
  + 12 if LO/LSO
  + 8 if constellation
  + 10 if ISOS
  + 6 if CAP/PDP
```

This is fundamentally broken. The real engine in `engine.server.ts` filters 119 articles from `caelex-eu-space-act-engine.json` using `applies_to` and `excludes` arrays per article. The estimates don't match reality.

### Solution

Rewrite `calculateEUSpaceAct()` in `route.ts` to call the **real engines**:

```typescript
import {
  loadSpaceActDataFromDisk,
  calculateCompliance,
  redactArticlesForClient,
} from "@/lib/engine.server";
import { calculateNIS2Compliance } from "@/lib/nis2-engine.server";
import { analyzeJurisdictions } from "@/lib/space-law-engine.server";
```

**Step-by-step:**

1. **Map unified answers → engine input format.** The unified assessment uses `UnifiedAssessmentAnswers` but the engines expect `AssessmentAnswers` (from `src/lib/types.ts`). Create a mapping function:

```typescript
function mapToEngineAnswers(
  unified: UnifiedAssessmentAnswers,
): AssessmentAnswers {
  // Map the PRIMARY activity type (first in the array) for the main engine call
  // Then run additional passes for each secondary activity type
  const activityTypeMap: Record<string, string> = {
    SCO: "spacecraft",
    LO: "launch_vehicle",
    LSO: "launch_site",
    ISOS: "isos",
    CAP: "collision_avoidance", // NOTE: CAP exists in types but engine maps it
    PDP: "data_provider",
  };

  return {
    activityType: activityTypeMap[unified.activityTypes[0]] || "spacecraft",
    isDefenseOnly: unified.isDefenseOnly ?? false,
    hasPostLaunchAssets: unified.hasPostLaunchResponsibility ?? true,
    establishment: mapEstablishment(unified),
    entitySize:
      unified.entitySize ||
      (unified.isResearchInstitution ? "research" : "medium"),
    operatesConstellation: unified.operatesConstellation ?? false,
    constellationSize: mapConstellationSize(unified.constellationSize),
    primaryOrbit: unified.primaryOrbitalRegime || "LEO",
    offersEUServices:
      unified.providesServicesToEU ?? unified.servesEUCustomers ?? false,
  };
}
```

2. **Call the real engine for EACH activity type** the customer selected (multi-select). Merge the results:

```typescript
const data = loadSpaceActDataFromDisk();
const allApplicableArticles = new Map<number, Article>();
const allModuleStatuses: ModuleStatus[] = [];

for (const activityType of unified.activityTypes) {
  const engineAnswers = mapToEngineAnswers({
    ...unified,
    activityTypes: [activityType],
  });
  const result = calculateCompliance(engineAnswers, data);

  // Merge: union of all applicable articles across activity types
  for (const article of result.applicableArticles) {
    allApplicableArticles.set(article.number, article);
  }
  // Merge module statuses: take the MOST restrictive status per module
  mergeModuleStatuses(allModuleStatuses, result.moduleStatuses);
}
```

3. **Use real article counts** — `allApplicableArticles.size` instead of hardcoded math.

4. **Use real module statuses** — from the merged engine results, not `Math.min(7, 2 + ...)`.

5. **Keep the redaction** — continue using `redactArticlesForClient()` so proprietary fields (summary, operator_action, decision_logic) are never sent to the client.

### Verification

After implementation, write a test in `tests/unit/unified-calculate.test.ts`:

```typescript
// Test: SCO + EU + Large entity should return EXACTLY the same articles
// as calling engine.server.ts directly with equivalent answers
it("matches real engine output for SCO operator", async () => {
  const unifiedAnswers = { activityTypes: ["SCO"], establishmentCountry: "DE", entitySize: "large", ... };
  const directAnswers = { activityType: "spacecraft", establishment: "eu", entitySize: "large", ... };

  const unifiedResult = await calculateFromUnified(unifiedAnswers);
  const directResult = calculateCompliance(directAnswers, loadSpaceActDataFromDisk());

  expect(unifiedResult.applicableArticleCount).toBe(directResult.applicableCount);
});
```

---

## Phase 2: Add Missing Critical Questions

### 2A. Temporal Scope (Art. 2(3)(d)) — CRITICAL

The EU Space Act only applies to assets launched **after January 1, 2030**. Pre-existing assets are grandfathered. The current unified assessment has NO question about this.

**Add to Phase 3 (Operations), after `spacecraftCount`:**

```typescript
{
  id: "launchTimeline",
  phase: 3,
  phaseName: "Operations Details",
  title: "When will your space assets be launched?",
  subtitle: "The EU Space Act applies from January 1, 2030. Pre-existing assets may be exempt.",
  helpText: "Art. 2(3)(d): Space objects launched before 1 January 2030 are excluded. Transitional period runs until 31 December 2031 for existing operators.",
  type: "single",
  required: true,
  options: [
    { id: "pre_2030_only", value: "pre_2030_only", label: "All launched before 2030", description: "All assets in orbit before January 1, 2030" },
    { id: "mixed", value: "mixed", label: "Mix of pre- and post-2030", description: "Some assets already in orbit, new launches planned after 2030" },
    { id: "post_2030", value: "post_2030", label: "All launching after 2030", description: "First launch planned for 2030 or later" },
    { id: "post_2032", value: "post_2032", label: "All launching after 2032", description: "First launch planned after the transitional period" },
  ],
}
```

**Add to `UnifiedAssessmentAnswers`:**

```typescript
launchTimeline: "pre_2030_only" | "mixed" | "post_2030" | "post_2032" | null;
```

**Impact on calculation:**

- `pre_2030_only` → EU Space Act does NOT apply (exempt). Show this clearly: "Your pre-2030 assets are grandfathered under Art. 2(3)(d). However, any future post-2030 launches will require full compliance."
- `mixed` → EU Space Act applies to post-2030 assets only. Flag transitional period deadline (31 Dec 2031).
- `post_2030` → Full EU Space Act applies.
- `post_2032` → Full EU Space Act applies, no transitional benefits.

### 2B. Control Criterion for Third-Country Entities (Art. 2(1)) — HIGH

An entity established outside the EU but **controlled by an EU entity** (parent company, majority shareholder) is treated as EU-established for Space Act purposes.

**Add to Phase 1 (Company Profile), show only when `establishmentCountry` is NOT in EU_MEMBER_STATES:**

```typescript
{
  id: "euControlledEntity",
  phase: 1,
  phaseName: "Company Profile",
  title: "Is your organization controlled by an EU-based entity?",
  subtitle: "EU-controlled entities may fall under EU Space Act jurisdiction regardless of establishment location",
  helpText: "This includes subsidiaries of EU companies, entities where EU shareholders hold >50% voting rights, or entities under contractual control of an EU entity.",
  type: "single",
  required: true,
  showIf: (answers) => answers.establishmentCountry && !EU_MEMBER_STATES.includes(answers.establishmentCountry),
  options: [
    { id: "yes_subsidiary", value: "yes_subsidiary", label: "Yes, EU subsidiary", description: "We are a subsidiary of an EU-headquartered company" },
    { id: "yes_controlled", value: "yes_controlled", label: "Yes, EU-controlled", description: "EU entity holds majority voting rights or contractual control" },
    { id: "no", value: "no", label: "No EU control", description: "Independent non-EU entity" },
    { id: "unsure", value: "unsure", label: "Unsure", description: "Need to verify corporate control structure" },
  ],
}
```

**Impact on calculation:** If `euControlledEntity` is `yes_subsidiary` or `yes_controlled`, treat as EU-established for Space Act purposes (same regulatory pathway as EU entities).

### 2C. International Organisation Exemption — HIGH

Art. 2(3) exempts certain international organisations (ESA, EUMETSAT, etc.) or provides special treatment. Currently no way to select this.

**Add to Phase 1 (Company Profile), as a follow-up to entity type:**

```typescript
{
  id: "isInternationalOrg",
  phase: 1,
  phaseName: "Company Profile",
  title: "Is your organization an international intergovernmental organisation?",
  subtitle: "International organisations like ESA or EUMETSAT have special treatment under the EU Space Act",
  type: "boolean",
  required: true,
  options: [
    { id: "yes", value: true, label: "Yes", description: "We are an international intergovernmental organisation (e.g., ESA, EUMETSAT, EUTELSAT IGO)" },
    { id: "no", value: false, label: "No", description: "We are a private company, government agency, or other entity" },
  ],
}
```

**Follow-up if yes:**

```typescript
{
  id: "internationalOrgType",
  phase: 1,
  phaseName: "Company Profile",
  title: "Which international organisation?",
  type: "single",
  required: true,
  showIf: (answers) => answers.isInternationalOrg === true,
  options: [
    { id: "esa", value: "esa", label: "ESA", description: "European Space Agency" },
    { id: "eumetsat", value: "eumetsat", label: "EUMETSAT", description: "European Organisation for the Exploitation of Meteorological Satellites" },
    { id: "eutelsat_igo", value: "eutelsat_igo", label: "EUTELSAT IGO", description: "European Telecommunications Satellite Organization" },
    { id: "other", value: "other", label: "Other", description: "Another international intergovernmental organisation" },
  ],
}
```

**Impact:** International organisations are exempt from most Space Act requirements but may have specific notification obligations. Adjust the engine output accordingly — show only the notification/cooperation articles that apply.

### 2D. Dual-Use Granularity — MEDIUM

Currently `isDefenseOnly` is binary yes/no. Dual-use is common (e.g., a satellite constellation serving both military and commercial customers). Need more granularity.

**Replace the current `isDefenseOnly` boolean question with:**

```typescript
{
  id: "defenseInvolvement",
  phase: 2,
  phaseName: "Activity Types",
  title: "What is your organization's relationship with defense/national security?",
  subtitle: "Dual-use assets (military and commercial) are still covered by the EU Space Act",
  helpText: "Art. 2(3)(a): Only assets used EXCLUSIVELY for defense/national security are exempt. Any commercial component means full coverage.",
  type: "single",
  required: true,
  options: [
    { id: "none", value: "none", label: "No defense involvement", description: "Purely commercial or civilian operations" },
    { id: "dual_use", value: "dual_use", label: "Dual-use (defense + commercial)", description: "Assets serve both military and commercial customers" },
    { id: "defense_primary", value: "defense_primary", label: "Primarily defense, some commercial", description: "Military primary mission with incidental commercial use" },
    { id: "defense_only", value: "defense_only", label: "Exclusively defense", description: "100% military/national security with no commercial component" },
  ],
}
```

**Impact on calculation:**

- `none` or `dual_use` → Full EU Space Act applies
- `defense_primary` → Full EU Space Act applies (but flag: "Note: Your primarily-defense operations are still fully in scope because they include commercial components")
- `defense_only` → Exempt under Art. 2(3)(a). Show clear exemption notice.

**Update `UnifiedAssessmentAnswers`:** Replace `isDefenseOnly: boolean | null` with `defenseInvolvement: "none" | "dual_use" | "defense_primary" | "defense_only" | null`.

### 2E. PDP Data Type Follow-Up — LOW

If the customer selects PDP (Primary Data Provider), we need to know what kind of data to determine which specific articles apply (e.g., EO data has different requirements than positional data).

**Add to Phase 2, show only when `activityTypes` includes "PDP":**

```typescript
{
  id: "dataProviderTypes",
  phase: 2,
  phaseName: "Activity Types",
  title: "What types of space-based data do you provide?",
  subtitle: "Different data types trigger different regulatory requirements",
  type: "multi",
  required: true,
  showIf: (answers) => answers.activityTypes?.includes("PDP"),
  options: [
    { id: "eo", value: "eo", label: "Earth Observation", description: "Optical, radar, or multispectral imaging data" },
    { id: "ssa", value: "ssa", label: "Space Situational Awareness", description: "Orbital tracking, conjunction assessment, debris monitoring" },
    { id: "positioning", value: "positioning", label: "Positioning/Navigation", description: "GNSS augmentation, precision timing" },
    { id: "comms", value: "comms", label: "Communications relay", description: "Data relay or store-and-forward services" },
    { id: "weather", value: "weather", label: "Meteorological", description: "Weather data and climate monitoring" },
    { id: "other", value: "other", label: "Other", description: "Other space-based data services" },
  ],
}
```

### 2F. Insurance Differentiation — LOW

Currently insurance is one question. Different insurance types have different requirements and thresholds.

**Replace the existing 3 insurance questions with 4 more specific ones:**

```typescript
// Question 1: Keep hasInsurance
// Question 2: Replace insuranceCoverage with split questions

{
  id: "hasLaunchInsurance",
  phase: 7,
  phaseName: "Insurance & Liability",
  title: "Do you have launch insurance?",
  subtitle: "Required for launch operators under Art. 44-45",
  type: "boolean",
  required: true,
  showIf: (answers) => answers.hasInsurance === true &&
    (answers.activityTypes?.includes("LO") || answers.activityTypes?.includes("LSO")),
  options: [
    { id: "yes", value: true, label: "Yes", description: "Active launch insurance policy" },
    { id: "no", value: false, label: "No", description: "No launch insurance" },
  ],
},
{
  id: "hasInOrbitInsurance",
  phase: 7,
  phaseName: "Insurance & Liability",
  title: "Do you have in-orbit third-party liability insurance?",
  subtitle: "Required for spacecraft operators under Art. 46-48",
  type: "boolean",
  required: true,
  showIf: (answers) => answers.hasInsurance === true && answers.activityTypes?.includes("SCO"),
  options: [
    { id: "yes", value: true, label: "Yes", description: "Active in-orbit liability coverage" },
    { id: "no", value: false, label: "No", description: "No in-orbit liability insurance" },
  ],
},
{
  id: "insuranceAmount",
  phase: 7,
  phaseName: "Insurance & Liability",
  title: "What is your total third-party liability coverage?",
  subtitle: "Minimum requirements depend on operator type, orbit, and jurisdiction",
  type: "single",
  required: true,
  showIf: (answers) => answers.hasInsurance === true,
  options: [
    { id: "under_10m", value: "under_10m", label: "Under EUR 10M", description: "May be insufficient for most operations" },
    { id: "10m_60m", value: "10m_60m", label: "EUR 10M - 60M", description: "Meets minimum for many jurisdictions" },
    { id: "60m_100m", value: "60m_100m", label: "EUR 60M - 100M", description: "Meets French/UK minimum" },
    { id: "over_100m", value: "over_100m", label: "Over EUR 100M", description: "Exceeds most jurisdictional requirements" },
  ],
},
```

---

## Phase 3: Implement Auto-Save & Resume (HIGH)

The unified assessment has 44+ questions across 8 phases — this takes 15-30 minutes. Users WILL abandon and need to come back.

### 3A. Auto-Save Per Phase

In `UnifiedAssessmentWizard.tsx`, add auto-save logic:

```typescript
// Save to localStorage after each answer
useEffect(() => {
  if (Object.keys(answers).length > 0) {
    localStorage.setItem(
      "caelex_unified_draft",
      JSON.stringify({
        answers,
        currentStep,
        currentPhase,
        savedAt: new Date().toISOString(),
        version: "2.0", // Increment when question structure changes
      }),
    );
  }
}, [answers, currentStep, currentPhase]);
```

### 3B. Resume on Load

```typescript
// On component mount, check for saved draft
useEffect(() => {
  const saved = localStorage.getItem("caelex_unified_draft");
  if (saved) {
    const draft = JSON.parse(saved);
    // Check version compatibility
    if (draft.version === "2.0") {
      setShowResumeModal(true);
      setSavedDraft(draft);
    }
  }
}, []);
```

### 3C. Resume Modal

Show a modal: "You have a saved assessment from [date]. Resume where you left off or start fresh?"

- **Resume** → Restore answers, currentStep, currentPhase
- **Start Fresh** → Clear localStorage, start from step 1
- Show which phase they were on: "You completed 3 of 8 phases"

### 3D. Phase Completion Indicators

In the wizard sidebar/header, show which phases are complete:

```typescript
const phaseCompletion = PHASE_NAMES.map((name, index) => {
  const phaseQuestions = getQuestionsForPhase(index + 1);
  const answered = phaseQuestions.filter((q) => isQuestionAnswered(q, answers));
  return {
    name,
    total: phaseQuestions.length,
    completed: answered.length,
    isComplete: answered.length === phaseQuestions.length,
  };
});
```

---

## Phase 4: Improve NIS2 Screening Accuracy

### Problem

The current 10 yes/no cybersecurity questions (Phase 5) are presented as a compliance readiness check, but they actually map to NIS2 Art. 21(2)(a)-(j) measures. The user doesn't understand this connection, and the scoring is simplistic (count of "yes" answers / 10 = readiness %).

### Solution

#### 4A. Rename Phase 5

Change from "Cybersecurity Readiness" to "Cybersecurity & NIS2 Compliance" to make the regulatory connection explicit.

#### 4B. Add NIS2-Specific Screening Questions BEFORE Cybersecurity

Add 3 screening questions at the start of Phase 5 that determine NIS2 applicability BEFORE asking about measures:

```typescript
{
  id: "providesDigitalInfrastructure",
  phase: 5,
  phaseName: "Cybersecurity & NIS2",
  title: "Does your organization provide or operate digital infrastructure for space operations?",
  subtitle: "NIS2 covers entities providing digital infrastructure in sectors like space",
  helpText: "This includes ground station networks, satellite control systems, data processing centers for space data, or telecommunication services via satellite.",
  type: "boolean",
  required: true,
},
{
  id: "annualRevenueAbove10M",
  phase: 5,
  phaseName: "Cybersecurity & NIS2",
  title: "Is your annual revenue above EUR 10 million or do you have more than 50 employees?",
  subtitle: "NIS2 size thresholds determine if your entity is in scope",
  helpText: "NIS2 Art. 2(1): Applies to medium and large entities. Small/micro entities are generally exempt unless they provide essential services.",
  type: "boolean",
  required: true,
},
{
  id: "designatedByMemberState",
  phase: 5,
  phaseName: "Cybersecurity & NIS2",
  title: "Has your organization been designated as an essential or important entity by any EU Member State?",
  subtitle: "Member States can designate specific entities regardless of size",
  type: "single",
  required: true,
  options: [
    { id: "essential", value: "essential", label: "Designated as essential", description: "Formally designated as an essential entity" },
    { id: "important", value: "important", label: "Designated as important", description: "Formally designated as an important entity" },
    { id: "no", value: "no", label: "Not designated", description: "No formal designation received" },
    { id: "unknown", value: "unknown", label: "Unknown", description: "Not sure about designation status" },
  ],
},
```

#### 4C. Conditional Cybersecurity Questions

Only show the 10 cybersecurity measure questions if NIS2 applies (based on the screening questions + entity size + EU presence). If NIS2 doesn't apply, skip the cybersecurity checklist entirely — it's irrelevant noise.

```typescript
// Each of the 10 cybersecurity questions gets:
showIf: (answers) => {
  // NIS2 applies if: EU entity + (large/medium OR designated OR critical infra)
  const isEU = answers.establishmentCountry && EU_MEMBER_STATES.includes(answers.establishmentCountry);
  const servesEU = answers.providesServicesToEU === true || answers.servesEUCustomers === true;
  const isMediumOrLarger = answers.entitySize === "medium" || answers.entitySize === "large";
  const isDesignated = answers.designatedByMemberState === "essential" || answers.designatedByMemberState === "important";
  const isCritical = answers.servesCriticalInfrastructure === true;

  return (isEU || servesEU) && (isMediumOrLarger || isDesignated || isCritical);
},
```

#### 4D. Map to Real NIS2 Engine

In the calculate route, call the real NIS2 engine:

```typescript
import { calculateNIS2Compliance } from "@/lib/nis2-engine.server";

// Map unified answers to NIS2 engine input
const nis2Input = mapToNIS2Input(unified);
const nis2Result = calculateNIS2Compliance(nis2Input);
```

Use the real 51 requirements and real entity classification logic instead of the simplified 10-check approach.

---

## Phase 5: Improve Results Dashboard Accuracy

### 5A. Show Real Article References

Currently the results show generic summaries. After Phase 1 (real engine integration), show actual article numbers and titles:

```typescript
// In UnifiedResultsDashboard.tsx
// Instead of: "76 applicable articles"
// Show: Module-by-module breakdown with actual article numbers

{moduleStatuses.map(module => (
  <ModuleCard
    key={module.id}
    name={module.name}
    status={module.status}
    articleCount={module.articleCount}
    articles={module.articles}  // NEW: Pass actual article references
    summary={module.summary}
  />
))}
```

### 5B. Cross-Framework Conflict Detection

When both EU Space Act and NIS2 apply, some requirements overlap (especially cybersecurity Art. 74-95 vs NIS2 Art. 21). Detect and show these:

```typescript
// In the calculation route, add:
function detectCrossFrameworkOverlaps(euResult, nis2Result) {
  const overlaps = [];

  // Cybersecurity overlap
  if (
    euResult.moduleStatuses.find(
      (m) => m.id === "cybersecurity" && m.status !== "not_applicable",
    ) &&
    nis2Result.applies
  ) {
    overlaps.push({
      area: "Cybersecurity",
      euArticles: "Art. 74-95 (EU Space Act)",
      nis2Articles: "Art. 21(2)(a)-(j) (NIS2)",
      guidance:
        "EU Space Act cybersecurity requirements are NIS2-aligned. Compliance with one largely satisfies the other. Focus on EU Space Act as the more specific regulation for space.",
    });
  }

  // Incident reporting overlap
  if (
    euResult.moduleStatuses.find(
      (m) => m.id === "supervision" && m.status !== "not_applicable",
    ) &&
    nis2Result.applies
  ) {
    overlaps.push({
      area: "Incident Reporting",
      euArticles: "Art. 52-57 (EU Space Act)",
      nis2Articles: "Art. 23 (NIS2)",
      guidance:
        "NIS2 requires 24h/72h incident reporting to CSIRT. EU Space Act may require parallel notification to NCA. Implement a unified incident response process.",
    });
  }

  return overlaps;
}
```

### 5C. Confidence Indicator

Show a confidence percentage for the assessment result based on how many questions were answered vs. skipped:

```typescript
function calculateConfidence(answers: UnifiedAssessmentAnswers): {
  percentage: number;
  missingCritical: string[];
  missingOptional: string[];
} {
  const criticalFields = [
    "establishmentCountry",
    "entitySize",
    "activityTypes",
    "launchTimeline",
    "defenseInvolvement",
    "primaryOrbitalRegime",
  ];
  const answered = criticalFields.filter(
    (f) => answers[f] != null && answers[f] !== "",
  );
  const missingCritical = criticalFields.filter(
    (f) => answers[f] == null || answers[f] === "",
  );

  // 100% confidence only if ALL critical fields are answered
  const percentage = Math.round(
    (answered.length / criticalFields.length) * 100,
  );

  return { percentage, missingCritical, missingOptional: [] };
}
```

---

## Phase 6: Add Spectrum/Frequency Questions (LOW)

Space operations require frequency coordination (ITU). While not directly EU Space Act, it affects licensing in national jurisdictions.

**Add 2 questions to Phase 3 (Operations):**

```typescript
{
  id: "usesRadioFrequencies",
  phase: 3,
  phaseName: "Operations Details",
  title: "Does your mission require radio frequency spectrum?",
  subtitle: "Frequency coordination affects licensing requirements",
  type: "boolean",
  required: true,
  options: [
    { id: "yes", value: true, label: "Yes", description: "We need assigned radio frequencies for our mission" },
    { id: "no", value: false, label: "No", description: "No RF requirements (e.g., passive sensor only)" },
  ],
},
{
  id: "frequencyBands",
  phase: 3,
  phaseName: "Operations Details",
  title: "Which frequency bands do you use?",
  type: "multi",
  required: true,
  showIf: (answers) => answers.usesRadioFrequencies === true,
  options: [
    { id: "s_band", value: "s_band", label: "S-Band", description: "TT&C (2-4 GHz)" },
    { id: "x_band", value: "x_band", label: "X-Band", description: "Earth observation downlink (8-12 GHz)" },
    { id: "ka_band", value: "ka_band", label: "Ka-Band", description: "High-throughput (26-40 GHz)" },
    { id: "ku_band", value: "ku_band", label: "Ku-Band", description: "Broadband (12-18 GHz)" },
    { id: "uhf_vhf", value: "uhf_vhf", label: "UHF/VHF", description: "IoT, AIS, ADS-B" },
    { id: "optical", value: "optical", label: "Optical/Laser", description: "Laser communication links" },
  ],
}
```

**Impact:** This affects jurisdiction scoring — some jurisdictions (LU, NL) have faster frequency coordination processes.

---

## Phase 7: Type System Updates

Update `unified-assessment-types.ts` with ALL new fields:

### New Answer Fields

```typescript
// Add to UnifiedAssessmentAnswers:

// Phase 1 additions
isInternationalOrg: boolean | null;
internationalOrgType: "esa" | "eumetsat" | "eutelsat_igo" | "other" | null;
euControlledEntity: "yes_subsidiary" | "yes_controlled" | "no" | "unsure" | null;

// Phase 2 changes
defenseInvolvement: "none" | "dual_use" | "defense_primary" | "defense_only" | null;
// REMOVE: isDefenseOnly (replaced by defenseInvolvement)
dataProviderTypes: string[];

// Phase 3 additions
launchTimeline: "pre_2030_only" | "mixed" | "post_2030" | "post_2032" | null;
usesRadioFrequencies: boolean | null;
frequencyBands: string[];

// Phase 5 additions
providesDigitalInfrastructure: boolean | null;
annualRevenueAbove10M: boolean | null;
designatedByMemberState: "essential" | "important" | "no" | "unknown" | null;

// Phase 7 changes
hasLaunchInsurance: boolean | null;
hasInOrbitInsurance: boolean | null;
insuranceAmount: "under_10m" | "10m_60m" | "60m_100m" | "over_100m" | null;
```

### New Result Fields

```typescript
// Add to EUSpaceActResult:
temporalScope: "exempt" | "transitional" | "full" | null;
temporalScopeExplanation: string;

// Add to UnifiedComplianceProfile:
crossFrameworkOverlaps: CrossFrameworkOverlap[];
confidenceScore: number; // 0-100
missingInformation: string[];
```

### Update `getDefaultUnifiedAnswers()`

Add defaults for all new fields (null for optionals, empty arrays for multi-selects).

---

## Phase 8: Fix Known Bugs

### 8A. Typo in types.ts

```typescript
// Line 407: passivatonRequired → passivationRequired
```

### 8B. Insurance Coverage Reset

When `hasInsurance` changes from `true` to `false`, dependent fields (`insuranceCoverage`, `hasLaunchInsurance`, `hasInOrbitInsurance`, `insuranceAmount`) should be reset to null. Add reset logic in the wizard:

```typescript
// In handleAnswer():
if (questionId === "hasInsurance" && value === false) {
  setAnswers((prev) => ({
    ...prev,
    hasInsurance: false,
    insuranceCoverage: null,
    hasLaunchInsurance: null,
    hasInOrbitInsurance: null,
    insuranceAmount: null,
    hasThirdPartyLiability: null,
  }));
  return;
}
```

### 8C. Constellation Without SCO

Add validation: if `operatesConstellation` is true but `activityTypes` doesn't include "SCO", show a warning (constellations require spacecraft operation).

### 8D. Anti-Bot Timer

Current anti-bot timer (10 seconds minimum) is too aggressive for auto-save/resume scenarios where a user might restore a draft and submit quickly. Increase to 5 seconds and skip for authenticated users.

---

## Phase 9: Testing Requirements

### Unit Tests (new file: `tests/unit/unified-assessment.test.ts`)

Write tests for EVERY operator type × establishment combination:

```typescript
describe("Unified Assessment Calculation", () => {
  // Test each operator type
  const operatorTypes = ["SCO", "LO", "LSO", "ISOS", "CAP", "PDP"];
  const establishments = ["DE", "FR", "US", "JP"]; // EU, EU, non-EU with service, non-EU

  for (const op of operatorTypes) {
    for (const est of establishments) {
      it(`correctly calculates for ${op} in ${est}`, () => {
        // Build answers, call engine, verify article counts match real engine
      });
    }
  }

  // Test temporal scope
  it("exempts pre-2030 launches", () => { ... });
  it("applies transitional period for mixed launches", () => { ... });

  // Test defense exemption
  it("exempts defense-only operations", () => { ... });
  it("includes dual-use operations", () => { ... });

  // Test international org exemption
  it("exempts ESA operations", () => { ... });

  // Test control criterion
  it("treats EU-controlled non-EU entity as EU-established", () => { ... });

  // Test NIS2 screening
  it("applies NIS2 for large EU entity with critical infrastructure", () => { ... });
  it("exempts small entity from NIS2", () => { ... });

  // Test multi-activity merging
  it("merges articles correctly for SCO + LO", () => { ... });
  it("takes most restrictive module status across activity types", () => { ... });
});
```

### Integration Tests (new file: `tests/integration/unified-api.test.ts`)

Test the full API endpoint with real HTTP requests and verify response structure.

### Result Consistency Test

```typescript
// CRITICAL: Ensure unified assessment produces IDENTICAL results
// to running the individual engines separately
it("unified results match individual engine results", () => {
  const answers = buildCompleteAnswers("SCO", "DE", "large");

  const unifiedResult = callUnifiedAPI(answers);
  const directEUResult = calculateCompliance(
    mapToEngine(answers),
    loadSpaceActDataFromDisk(),
  );
  const directNIS2Result = calculateNIS2Compliance(mapToNIS2(answers));

  expect(unifiedResult.euSpaceAct.applicableArticleCount).toBe(
    directEUResult.applicableCount,
  );
  expect(unifiedResult.nis2.entityClassification).toBe(
    directNIS2Result.entityClassification,
  );
});
```

---

## Implementation Order

1. **Phase 1** — Real engine integration (CRITICAL, do this first)
2. **Phase 7** — Type system updates (needed for new questions)
3. **Phase 2** — New questions (temporal scope, control criterion, international orgs, dual-use, PDP, insurance, spectrum)
4. **Phase 8** — Bug fixes
5. **Phase 4** — NIS2 screening improvements
6. **Phase 5** — Results dashboard accuracy
7. **Phase 3** — Auto-save & resume
8. **Phase 6** — Spectrum questions
9. **Phase 9** — Full test suite

## Quality Checklist

Before marking complete, verify:

- [ ] Every question has a direct impact on which articles/requirements are shown
- [ ] Unified calculation matches individual engine results for all operator types
- [ ] Pre-2030 launches correctly show exemption
- [ ] EU-controlled third-country entities are treated as EU entities
- [ ] International organisations get correct exemption treatment
- [ ] Dual-use correctly classified (NOT exempt)
- [ ] NIS2 only shows cybersecurity questions when NIS2 actually applies
- [ ] Insurance questions are differentiated by operator type
- [ ] Auto-save works across browser sessions
- [ ] Cross-framework overlaps are detected and explained
- [ ] Confidence score reflects answer completeness
- [ ] All new fields have defaults in `getDefaultUnifiedAnswers()`
- [ ] All `showIf` conditions handle null/undefined gracefully
- [ ] Anti-bot timer works with resume scenario
- [ ] TypeScript compiles with zero errors (`npm run typecheck`)
- [ ] All tests pass (`npm run test:run`)
- [ ] Build succeeds (`npm run build`)
