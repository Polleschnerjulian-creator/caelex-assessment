# Claude Code Prompt: Caelex Platform-Konsolidierung & Feature-Gaps schließen

## Kontext

Caelex ist eine Next.js 15 SaaS-Plattform (278K LOC, 894 TS-Dateien, 110 Prisma Models) für Space Regulatory Compliance. Eine gründliche Code-Analyse hat folgende Probleme identifiziert:

1. **Cybersecurity ist dreifach vorhanden** (EU Space Act + NIS2 + ENISA = 300 KB redundante Daten)
2. **UK Space Act lebt doppelt** (dedizierter Engine + national-space-laws.ts)
3. **Zwei Services für Incident Handling** (incident-response + breach-notification)
4. **Deorbit-Deadline wird an 4 Stellen berechnet** (debris, us-regulatory, copuos, timeline)
5. **Operator-Typ-Definitionen in 8+ Dateien verstreut**
6. **Orbit-Typ-Definitionen in 5 Dateien inkonsistent**
7. **Kein Unified Operator Profile** (User gibt Basisdaten in jedem Assessment neu ein)
8. **Fehlende Cross-Regulation-Views** (Export Control + Cyber, Spectrum + Debris)
9. **Keine Regulation Dominance Hierarchy** (NIS2 → EU Space Act Transition 2030 nicht sichtbar)

**Wichtig:**

- Bestehende Funktionalität DARF NICHT kaputt gehen
- Alle bestehenden Tests müssen weiterhin bestehen
- Keine Breaking Changes an API Routes
- Kein Refactoring um des Refactorings willen — nur wo echte Redundanz oder fehlende Funktionalität vorliegt
- Nach jeder größeren Änderung `npm run test:run` ausführen um sicherzustellen dass nichts kaputt ist
- TypeScript strict mode muss eingehalten werden (`npm run typecheck`)

---

## Phase 1: Daten-Konsolidierung (Redundanzen eliminieren)

### 1.1 ENISA Controls in Cybersecurity einbetten

**Problem:** `src/data/enisa-space-controls.ts` (64 KB) ist eine eigenständige Datei mit ~50 ENISA Space Threat Landscape Controls. Diese sind aber keine eigenständige Regulation, sondern Implementierungs-Guidance für EU Space Act Art. 74-95 und NIS2 Art. 21.

**Aufgabe:**

1. Lies `src/data/enisa-space-controls.ts` komplett durch — verstehe die Datenstruktur
2. Lies `src/data/cybersecurity-requirements.ts` komplett durch — verstehe die Datenstruktur
3. Erweitere die Requirements in `cybersecurity-requirements.ts` um ein optionales Feld `enisaGuidance`:

```typescript
enisaGuidance?: {
  controlId: string;       // z.B. "ENISA-SP-GOV-01"
  controlName: string;
  segment: 'space' | 'ground' | 'user' | 'link';
  implementationSteps: string[];
  maturityLevels?: { level: number; description: string }[];
}[];
```

4. Mappe jeden ENISA Control zum passenden Cybersecurity Requirement (basierend auf Thema: Governance → Governance, Incident → Incident, etc.)
5. Aktualisiere alle Stellen die `enisa-space-controls.ts` direkt importieren — sie sollen stattdessen über `cybersecurity-requirements.ts` auf ENISA-Daten zugreifen
6. Wenn alle Referenzen migriert sind und Tests bestehen: Lösche `src/data/enisa-space-controls.ts` NICHT sofort, sondern markiere sie mit einem Deprecation-Kommentar. Löschung erfolgt in Phase 5.

**Betroffene Dateien:**

- `src/data/enisa-space-controls.ts` (lesen, dann deprecaten)
- `src/data/cybersecurity-requirements.ts` (erweitern)
- Alle Dateien die `enisa-space-controls` importieren (suche mit grep)
- Zugehörige Typen in `src/lib/types.ts` oder wo Cybersecurity-Types definiert sind

### 1.2 UK aus National Space Laws delegieren

**Problem:** UK Space Industry Act 2018 existiert sowohl als eigener Engine (`src/lib/uk-space-engine.server.ts`, 801 LOC) als auch als einer der 10 Einträge in `src/data/national-space-laws.ts`. Der dedizierte Engine ist deutlich detaillierter.

**Aufgabe:**

1. Lies `src/lib/space-law-engine.server.ts` — finde wo UK-spezifische Daten verwendet werden
2. Lies den UK-Eintrag in `src/data/national-space-laws.ts` — wie detailliert ist er?
3. Lies `src/lib/uk-space-engine.server.ts` — was kann er mehr?
4. Erstelle in `src/lib/space-law-engine.server.ts` eine Delegation:

```typescript
// Wenn jurisdiction === 'UK', delegiere an den spezialisierten UK Engine
import { assessUKCompliance } from "./uk-space-engine.server";

// In der Hauptfunktion:
if (jurisdiction === "UK" || jurisdiction === "GB") {
  return adaptUKResult(assessUKCompliance(profile));
}
```

5. Erstelle eine `adaptUKResult()` Funktion die das UK-Engine-Result in das Format des Space Law Engine konvertiert (damit das UI konsistent bleibt)
6. Markiere den UK-Eintrag in `national-space-laws.ts` mit einem Kommentar: `// Delegated to uk-space-engine.server.ts — this entry is kept for metadata/display only`
7. Stelle sicher dass die Space Law Comparison Matrix weiterhin UK inkludiert (die UK-Daten kommen jetzt nur aus einer Quelle)

**Betroffene Dateien:**

- `src/lib/space-law-engine.server.ts` (Delegation hinzufügen)
- `src/lib/uk-space-engine.server.ts` (ggf. Export anpassen)
- `src/data/national-space-laws.ts` (UK-Eintrag kommentieren)
- Zugehörige Tests in `tests/unit/lib/space-law-engine.test.ts`

### 1.3 Incident Services zusammenführen

**Problem:** `src/lib/services/incident-response-service.ts` (21 KB) und `src/lib/services/breach-notification-service.ts` (15 KB) handhaben beide Security Events und NCA-Benachrichtigungen. Unterschied ist nur NIS2-Timeline (24h/72h/30d) vs. GDPR-Timeline (72h).

**Aufgabe:**

1. Lies beide Services komplett durch
2. Identifiziere gemeinsame Logik (Event-Klassifizierung, NCA-Benachrichtigung, Timeline-Tracking)
3. Merge `breach-notification-service.ts` in `incident-response-service.ts`:
   - Behalte ALLE bestehenden Exports und Funktionen
   - Füge die GDPR-spezifische Breach-Logik als zusätzliche Methoden hinzu
   - Erstelle ein gemeinsames `SecurityEvent` Interface das beide Typen abdeckt:

```typescript
interface SecurityEvent {
  type: "nis2_incident" | "gdpr_breach" | "eu_space_act_incident";
  severity: "critical" | "significant" | "minor";
  timeline: {
    regulation: string;
    deadlines: {
      name: string;
      hoursFromDetection: number;
      description: string;
    }[];
  };
  // ... bestehende Felder
}
```

4. Erstelle in `src/lib/services/breach-notification-service.ts` Re-Exports die auf den merged Service zeigen (Backward Compatibility):

```typescript
// DEPRECATED: Use incident-response-service.ts instead
// Re-exported for backward compatibility
export {
  handleBreach,
  notifyBreach,
  getBreachTimeline,
} from "./incident-response-service";
```

5. Aktualisiere alle Imports die `breach-notification-service` verwenden

**Betroffene Dateien:**

- `src/lib/services/incident-response-service.ts` (erweitern)
- `src/lib/services/breach-notification-service.ts` (zu Re-Export umbauen)
- Alle Dateien die `breach-notification-service` importieren
- Zugehörige Tests

---

## Phase 2: Shared Utilities erstellen (Single Source of Truth)

### 2.1 Zentraler Deorbit-Calculator

**Problem:** Die 5-Jahres-Deorbit-Regel wird in 4 Dateien unabhängig berechnet mit potenziell unterschiedlichen Definitionen.

**Aufgabe:**

1. Erstelle `src/lib/compliance/deorbit-calculator.ts`:

```typescript
import "server-only";

/**
 * Centralized deorbit deadline calculator.
 * Single source of truth for LEO deorbit rules across all regulatory frameworks.
 *
 * Supports: EU Space Act Art. 59, FCC Orbital Debris Rule 2024,
 * COPUOS Guidelines, IADC Guidelines, ISO 24113:2024
 */

export interface DeorbitParams {
  orbitType: CanonicalOrbitType;
  altitudeKm: number;
  launchDate?: Date;
  missionEndDate?: Date;
  satelliteMassKg?: number;
  isConstellation?: boolean;
  constellationSize?: number;
}

export interface DeorbitResult {
  required: boolean;
  maxYears: number;
  deadlineDate?: Date;
  startFrom: "launch" | "mission_end" | "orbit_decay_start";
  regulation: string;
  article: string;
  notes: string[];
}

export interface MultiRegulationDeorbitResult {
  euSpaceAct: DeorbitResult;
  fcc: DeorbitResult;
  copuos: DeorbitResult;
  iadc: DeorbitResult;
  mostRestrictive: DeorbitResult; // Kürzeste Frist
}

// LEO Definition (varies by regulation)
const LEO_THRESHOLDS = {
  euSpaceAct: 2000, // km — EU Space Act Art. 59
  fcc: 2000, // km — FCC 2024 Rule
  copuos: 2000, // km — COPUOS Guidelines
  iadc: 2000, // km — IADC Guidelines
} as const;

export function calculateDeorbitDeadline(
  params: DeorbitParams,
): MultiRegulationDeorbitResult {
  // Implementiere für jede Regulation separat
  // Gib immer das restriktivste Ergebnis als "mostRestrictive" zurück
}

export function isLEO(
  altitudeKm: number,
  regulation?: keyof typeof LEO_THRESHOLDS,
): boolean {
  const threshold = regulation ? LEO_THRESHOLDS[regulation] : 2000;
  return altitudeKm <= threshold;
}
```

2. Suche in diesen Dateien nach Deorbit-Logik und ersetze sie durch Aufrufe des zentralen Calculators:
   - `src/data/debris-requirements.ts`
   - `src/lib/us-regulatory-engine.server.ts`
   - `src/lib/copuos-engine.server.ts`
   - `src/data/timeline-deadlines.ts`
   - Jede andere Datei die "deorbit" oder "5-year" oder "25-year" berechnet

3. Erstelle Tests: `tests/unit/lib/compliance/deorbit-calculator.test.ts`:
   - Teste LEO Threshold für jede Regulation
   - Teste 5-Jahres-Regel ab Launch vs. ab Mission End
   - Teste Constellation-spezifische Regeln
   - Teste mostRestrictive Logik
   - Teste Edge Cases: genau auf LEO Grenze, GEO Orbit (kein Deorbit), HEO

### 2.2 Canonical Operator Type Registry

**Problem:** Operator-Typ-Definitionen existieren in 8+ Dateien mit unterschiedlichen Strings.

**Aufgabe:**

1. Erstelle `src/lib/compliance/operator-types.ts`:

```typescript
/**
 * Canonical Operator Type Registry
 * Single source of truth for operator type definitions across all regulatory frameworks.
 */

// Kanonische Operator-Typen (superset aller Frameworks)
export type CanonicalOperatorType =
  | 'spacecraft_operator'
  | 'launch_operator'
  | 'launch_site_operator'
  | 'in_space_services_provider'
  | 'primary_data_provider'
  | 'third_country_operator'
  | 'capsule_operator'
  | 'return_operator'
  | 'spaceport_operator'
  | 'satellite_operator'        // US/UK terminology
  | 'reentry_operator';         // US terminology

// EU Space Act Abbreviations
export type EUSpaceActOperator = 'SCO' | 'LO' | 'LSO' | 'ISOS' | 'CAP' | 'PDP' | 'TCO' | 'ALL';

// Mapping: EU Space Act → Canonical
export const EU_TO_CANONICAL: Record<EUSpaceActOperator, CanonicalOperatorType> = {
  SCO: 'spacecraft_operator',
  LO: 'launch_operator',
  LSO: 'launch_site_operator',
  ISOS: 'in_space_services_provider',
  CAP: 'capsule_operator',
  PDP: 'primary_data_provider',
  TCO: 'third_country_operator',
  ALL: 'spacecraft_operator', // fallback
};

// Mapping: UK Space Act → Canonical
export const UK_TO_CANONICAL: Record<string, CanonicalOperatorType> = {
  launch_operator: 'launch_operator',
  return_operator: 'return_operator',
  satellite_operator: 'spacecraft_operator',
  spaceport_operator: 'launch_site_operator',
};

// Mapping: US Regulatory → Canonical
export const US_TO_CANONICAL: Record<string, CanonicalOperatorType> = {
  satellite_operator: 'spacecraft_operator',
  launch_operator: 'launch_operator',
  reentry_operator: 'return_operator',
};

// Utility Functions
export function toCanonical(operatorType: string, framework: 'eu' | 'uk' | 'us'): CanonicalOperatorType { ... }
export function fromCanonical(canonical: CanonicalOperatorType, framework: 'eu' | 'uk' | 'us'): string { ... }
export function getOperatorLabel(canonical: CanonicalOperatorType, locale?: 'en' | 'de'): string { ... }
```

2. Erstelle analog `src/lib/compliance/orbit-types.ts`:

```typescript
export type CanonicalOrbitType = 'LEO' | 'MEO' | 'GEO' | 'GTO' | 'HEO' | 'SSO' | 'cislunar' | 'deep_space' | 'NGSO';

// Framework-spezifische Mappings
export const DEBRIS_ORBIT_TYPES = ['LEO', 'MEO', 'GEO', 'HEO', 'cislunar'] as const;
export const COPUOS_ORBIT_TYPES = ['LEO', 'MEO', 'GEO', 'HEO', 'GTO', 'cislunar', 'deep_space'] as const;
export const SPECTRUM_ORBIT_TYPES = ['GEO', 'NGSO', 'LEO', 'MEO', 'HEO'] as const;

export function isValidOrbit(orbit: string, framework: string): boolean { ... }
export function getOrbitAltitudeRange(orbit: CanonicalOrbitType): { min: number; max: number } { ... }
```

3. Erstelle `src/lib/compliance/index.ts` als Barrel Export:

```typescript
export * from "./operator-types";
export * from "./orbit-types";
export * from "./deorbit-calculator";
```

4. Erstelle Tests für alle Conversion Functions und Edge Cases

**WICHTIG:** Die bestehenden Engines NICHT sofort umbauen. Erstelle die Registry und die Conversion Functions. Die Migration der bestehenden Engines auf die Registry erfolgt schrittweise — füge als Kommentar `// TODO: Migrate to CanonicalOperatorType from @/lib/compliance/operator-types` an die Stellen in den Engines wo lokale Operator-Types definiert sind.

---

## Phase 3: Unified Operator Profile (Neue Funktion)

### 3.1 Datenbank-Schema erweitern

**Problem:** Jedes Assessment fragt Basisdaten (Operator-Typ, Entity Size, Orbit, Mission Profile) separat ab. User müssen dieselben Infos 3-6 mal eingeben.

**Aufgabe:**

1. Erweitere `prisma/schema.prisma` um ein `OperatorProfile` Model:

```prisma
model OperatorProfile {
  id                String       @id @default(cuid())
  organizationId    String       @unique
  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Core Classification
  operatorType      String       // CanonicalOperatorType
  euOperatorCode    String?      // EU Space Act Abbreviation (SCO, LO, etc.)
  entitySize        String?      // 'micro' | 'small' | 'medium' | 'large'
  isResearch        Boolean      @default(false)
  isDefenseOnly     Boolean      @default(false)

  // Mission Profile
  primaryOrbit      String?      // CanonicalOrbitType
  orbitAltitudeKm   Float?
  satelliteMassKg   Float?
  isConstellation   Boolean      @default(false)
  constellationSize Int?
  missionDurationMonths Int?
  plannedLaunchDate DateTime?

  // Jurisdiction
  establishment     String?      // Primary jurisdiction (ISO 3166-1 alpha-2)
  operatingJurisdictions String[] // All jurisdictions where operating
  offersEUServices  Boolean      @default(false)

  // Metadata
  completeness      Float        @default(0) // 0-1, how complete the profile is
  lastUpdated       DateTime     @updatedAt
  createdAt         DateTime     @default(now())

  @@index([organizationId])
}
```

2. Erstelle `src/lib/services/operator-profile-service.ts`:

```typescript
import 'server-only';
import { prisma } from '@/lib/prisma';
import { CanonicalOperatorType, toCanonical } from '@/lib/compliance/operator-types';

export async function getOrCreateProfile(organizationId: string) { ... }
export async function updateProfile(organizationId: string, data: Partial<OperatorProfileInput>) { ... }
export async function calculateCompleteness(profile: OperatorProfile): number { ... }

// Convert profile to assessment-specific format
export function toEUSpaceActAnswers(profile: OperatorProfile): AssessmentAnswers { ... }
export function toNIS2Answers(profile: OperatorProfile): NIS2AssessmentAnswers { ... }
export function toCOPUOSProfile(profile: OperatorProfile): COPUOSMissionProfile { ... }
```

3. Erstelle API Route `src/app/api/organization/profile/route.ts`:
   - GET: Profil laden (erstelle leeres wenn nicht vorhanden)
   - PATCH: Profil aktualisieren (partielle Updates erlauben)
   - Auth required, Organization-Scope

4. Erstelle eine Profile-Komponente `src/components/dashboard/OperatorProfileCard.tsx`:
   - Zeigt aktuellen Profil-Status als Card im Dashboard
   - Completeness-Indicator (Progressbar 0-100%)
   - "Profil vervollständigen" Button
   - Kompakte Darstellung: Operator-Typ, Orbit, Entity Size, Jurisdiktion
   - Styling: Navy-Theme, GlassCard, Emerald-Akzente (wie bestehende Dashboard-Cards)

5. Erstelle Profile-Editor `src/components/dashboard/OperatorProfileEditor.tsx`:
   - Formular mit allen Profil-Feldern
   - Gruppiert in Sections: Classification, Mission Profile, Jurisdiction
   - Nutze bestehende UI-Komponenten (Input, Select, Badge etc.)
   - Auto-Save bei Änderungen (mit Debounce)
   - Zeige an welche Assessments durch das Profil automatisch ausgefüllt werden können

6. Integriere das Profil in die Assessment Wizards:
   - Wenn ein User ein Assessment startet UND ein Profil existiert → Pre-Fill die passenden Felder
   - User kann Pre-Filled Werte immer überschreiben
   - Zeige Badge: "Auto-filled from Operator Profile" an pre-filled Feldern
   - Wenn Assessment abgeschlossen wird UND Profil-Felder leer sind → Biete an, das Profil zu aktualisieren

**Betroffene Dateien:**

- `prisma/schema.prisma` (neues Model)
- `src/lib/services/operator-profile-service.ts` (NEU)
- `src/app/api/organization/profile/route.ts` (NEU)
- `src/components/dashboard/OperatorProfileCard.tsx` (NEU)
- `src/components/dashboard/OperatorProfileEditor.tsx` (NEU)
- `src/components/assessment/AssessmentWizard.tsx` (Pre-Fill Logik)
- `src/components/assessment/QuestionStep.tsx` (Pre-Fill Badge)
- Dashboard Seite wo die ProfileCard eingebaut wird

---

## Phase 4: Regulation Dominance & Cross-Regulation Views (Neue Funktionen)

### 4.1 Regulation Transition Timeline

**Problem:** NIS2 (2022/2555) ist jetzt in Kraft. EU Space Act wird ab 2030 für Space Operators als lex specialis NIS2 superseden. Das ist nirgends im UI sichtbar.

**Aufgabe:**

1. Erstelle `src/data/regulation-timeline.ts`:

```typescript
export interface RegulationPhase {
  id: string;
  regulation: string;
  status: 'in_force' | 'transition' | 'superseded' | 'upcoming';
  effectiveDate: string;          // ISO date
  transitionEndDate?: string;     // When fully superseded
  supersededBy?: string;          // Which regulation takes over
  applicableTo: string[];         // Operator types
  notes: string;
}

export const REGULATION_TIMELINE: RegulationPhase[] = [
  {
    id: 'nis2-current',
    regulation: 'NIS2 Directive (EU 2022/2555)',
    status: 'in_force',
    effectiveDate: '2024-10-18',
    transitionEndDate: '2030-12-31',  // When EU Space Act supersedes for space
    supersededBy: 'EU Space Act (COM(2025) 335)',
    applicableTo: ['all_space_operators'],
    notes: 'Currently binding. Will become secondary for space operators once EU Space Act Chapter VI (Art. 74-95) enters into force.'
  },
  {
    id: 'eu-space-act-adoption',
    regulation: 'EU Space Act (COM(2025) 335)',
    status: 'upcoming',
    effectiveDate: '2026-06-30',      // Expected adoption
    applicableTo: ['all_eu_operators'],
    notes: 'Proposed regulation. Expected adoption 2026, full application by 2030 with transition period.'
  },
  // ... weitere Phasen für nationale Gesetze, UK Space Act, etc.
];

export function getCurrentRegime(operatorType: string, date?: Date): RegulationPhase[] { ... }
export function getUpcomingChanges(months: number): RegulationPhase[] { ... }
```

2. Erstelle `src/components/dashboard/RegulationTimeline.tsx`:
   - Horizontale Timeline-Visualisierung
   - Zeigt welche Regulationen wann gelten
   - Farbcodiert: Grün = in Kraft, Gelb = Transition, Blau = Upcoming
   - Hover zeigt Details
   - Aktuelles Datum als Marker
   - Responsive (Mobile: vertikale Liste statt horizontal)

3. Integriere die Timeline als Section im Dashboard und im NIS2-Modul

### 4.2 Cross-Regulation Conflict View

**Problem:** Export Control + Cybersecurity Intersection fehlt. Spectrum + Debris Cross-Reference fehlt.

**Aufgabe:**

1. Erweitere `src/data/cross-references.ts` um neue Mappings:

```typescript
// ITAR/EAR ↔ Cybersecurity (EU Space Act + NIS2)
export const EXPORT_CYBER_CROSS_REFS = [
  {
    id: "ec-01",
    exportControl: {
      regulation: "ITAR",
      section: "22 CFR 120.17",
      topic: "Deemed Export",
    },
    cybersecurity: {
      regulation: "EU Space Act",
      article: "Art. 79",
      topic: "Information Security",
    },
    conflict:
      "Foreign nationals implementing cybersecurity controls may trigger deemed export of technical data.",
    resolution:
      "Obtain TAA (Technical Assistance Agreement) before granting access to USML-listed cybersecurity systems.",
    severity: "high",
  },
  // ... 5-8 weitere Mappings
];

// Spectrum ↔ Debris
export const SPECTRUM_DEBRIS_CROSS_REFS = [
  {
    id: "sd-01",
    spectrum: {
      regulation: "ITU RR",
      article: "Art. 44",
      topic: "Spectrum License Duration",
    },
    debris: {
      regulation: "EU Space Act",
      article: "Art. 59",
      topic: "5-Year Deorbit Rule",
    },
    interaction:
      "Spectrum license expiry date should align with or exceed debris compliance deadlines.",
    recommendation:
      "Ensure ITU filing duration covers planned mission + maximum deorbit window.",
  },
  // ... 3-5 weitere Mappings
];

// Insurance ↔ National Space Laws
export const INSURANCE_NATIONAL_CROSS_REFS = [
  {
    id: "in-01",
    insurance: {
      regulation: "EU Space Act",
      article: "Art. 44-51",
      topic: "Third-Party Liability",
    },
    nationalLaw: {
      jurisdiction: "FR",
      law: "LOS 2008",
      article: "Art. 6",
      topic: "Insurance Minimum €60M",
    },
    interaction:
      "French national law requires €60M minimum TPL. EU Space Act may set different threshold.",
    resolution:
      "Apply the higher of national and EU requirements until harmonization.",
  },
  // ... Einträge für alle 10 Jurisdiktionen
];
```

2. Erstelle `src/lib/services/cross-regulation-alert-service.ts`:

```typescript
/**
 * Analyzes an operator profile and active assessments to identify
 * cross-regulation conflicts and synergies.
 */
export async function detectCrossRegulationIssues(
  organizationId: string,
): Promise<CrossRegulationAlert[]> {
  // 1. Lade Operator Profile
  // 2. Lade alle aktiven Assessments
  // 3. Prüfe EXPORT_CYBER_CROSS_REFS wenn Export Control + Cybersecurity beide aktiv
  // 4. Prüfe SPECTRUM_DEBRIS_CROSS_REFS wenn Spectrum + Debris beide aktiv
  // 5. Prüfe INSURANCE_NATIONAL_CROSS_REFS basierend auf Jurisdiktion
  // 6. Gib priorisierte Alerts zurück
}
```

3. Erstelle `src/components/dashboard/CrossRegulationAlerts.tsx`:
   - Alert-Cards die im Dashboard angezeigt werden
   - Severity-Badges: High (Rot), Medium (Amber), Low (Blau)
   - Expandable Details mit Conflict Description und Resolution
   - Link zu den betroffenen Modulen

---

## Phase 5: Cybersecurity Hierarchy klären

### 5.1 Regulation Dominance im Cybersecurity-Modul

**Aufgabe:**

1. Lies `src/app/dashboard/modules/cybersecurity/page.tsx` und verstehe die aktuelle Darstellung
2. Füge eine "Regulation Source" Indikation hinzu:
   - Jedes Cybersecurity-Requirement bekommt ein Badge: "EU Space Act", "NIS2", oder "Both"
   - Requirements die in beiden Regulationen existieren zeigen: "EU Space Act (primary after 2030) | NIS2 (current)"
3. Füge einen Info-Banner oben im Cybersecurity-Modul hinzu:

```
ℹ️ Cybersecurity requirements come from two sources:
• EU Space Act Art. 74-95 (sector-specific, primary after 2030)
• NIS2 Directive Art. 21 (horizontal, currently in force)

Where requirements overlap, the EU Space Act takes precedence for space operators
after the transition period. Both are shown for completeness.
```

4. Nutze die bestehenden Cross-References in `src/data/cross-references.ts` um Overlaps visuell zu markieren

### 5.2 Compliance Twin + What-If Consolidierung prüfen

**Aufgabe:**

1. Lies `src/lib/services/compliance-twin-service.ts` komplett
2. Lies `src/lib/services/whatif-simulation-service.ts` komplett
3. Prüfe: Gibt es echte funktionale Überlappung oder sind das verschiedene Dinge?
   - Wenn Overlap: Merge den kleineren in den größeren Service
   - Wenn kein Overlap: Dokumentiere den Unterschied als JSDoc Kommentar in beiden Files
4. Berichte was du gefunden hast

---

## Phase 6: Aufräumen & Tests

### 6.1 Deprecated Files aufräumen

Nachdem alle Phasen abgeschlossen sind und alle Tests bestehen:

1. Lösche oder markiere deprecated Files klar
2. Entferne unused Imports
3. Stelle sicher dass `npm run lint` und `npm run typecheck` sauber durchlaufen

### 6.2 Tests für alle neuen Features

Erstelle Tests für:

- `tests/unit/lib/compliance/deorbit-calculator.test.ts`
- `tests/unit/lib/compliance/operator-types.test.ts`
- `tests/unit/lib/compliance/orbit-types.test.ts`
- `tests/unit/services/operator-profile-service.test.ts`
- `tests/unit/services/cross-regulation-alert-service.test.ts`
- `tests/integration/api/organization/profile.test.ts`

Mindestens 5 Tests pro Datei, Edge Cases abdecken.

### 6.3 Abschluss-Validierung

Am Ende MÜSSEN folgende Commands erfolgreich durchlaufen:

```bash
npm run typecheck        # Zero errors
npm run lint             # Zero errors
npm run test:run         # All tests pass
npm run build            # Build erfolgreich
```

---

## Zusammenfassung der zu erstellenden/ändernden Dateien

### NEU:

```
src/lib/compliance/index.ts
src/lib/compliance/operator-types.ts
src/lib/compliance/orbit-types.ts
src/lib/compliance/deorbit-calculator.ts
src/lib/services/operator-profile-service.ts
src/lib/services/cross-regulation-alert-service.ts
src/app/api/organization/profile/route.ts
src/components/dashboard/OperatorProfileCard.tsx
src/components/dashboard/OperatorProfileEditor.tsx
src/components/dashboard/RegulationTimeline.tsx
src/components/dashboard/CrossRegulationAlerts.tsx
src/data/regulation-timeline.ts
tests/unit/lib/compliance/deorbit-calculator.test.ts
tests/unit/lib/compliance/operator-types.test.ts
tests/unit/lib/compliance/orbit-types.test.ts
tests/unit/services/operator-profile-service.test.ts
tests/unit/services/cross-regulation-alert-service.test.ts
tests/integration/api/organization/profile.test.ts
```

### GEÄNDERT:

```
prisma/schema.prisma (OperatorProfile Model)
src/data/cybersecurity-requirements.ts (ENISA Guidance einbetten)
src/data/cross-references.ts (neue Cross-Regulation Mappings)
src/data/enisa-space-controls.ts (Deprecation Marker)
src/data/national-space-laws.ts (UK Delegation Marker)
src/lib/space-law-engine.server.ts (UK Delegation)
src/lib/services/incident-response-service.ts (Breach Merge)
src/lib/services/breach-notification-service.ts (Re-Export Wrapper)
src/components/assessment/AssessmentWizard.tsx (Profile Pre-Fill)
src/app/dashboard/modules/cybersecurity/page.tsx (Dominance Hierarchy)
```

### Reihenfolge:

Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Führe nach jeder Phase `npm run typecheck && npm run test:run` aus.
