# Caelex Legal Portal — Design Spec

**Date:** 2026-04-04
**Status:** Approved
**Scope:** Two-sided feature — Client invitation flow + dedicated law firm portal

---

## 1. Vision

A law firm logs into `caelex.eu/legal` and sees a unified command center for all their space-law mandates. Each client's compliance posture is summarized in one view — not raw data dumps, but **intelligent briefings** curated by the system based on the engagement purpose. The attorney sees exactly what they need for the task at hand, nothing more, nothing less.

The client never has to manually select which data to share. They choose an **engagement type** ("CRA Notified Body Submission", "NIS2 NCA Registration", "Jurisdiktionswahl") and the system automatically assembles the relevant compliance data into a secure, read-only briefing.

---

## 2. Architecture

```
CLIENT (Caelex Dashboard)              LAW FIRM (Legal Portal)
┌─────────────────────────┐           ┌─────────────────────────┐
│ /dashboard/network      │           │ /legal/dashboard        │
│                         │           │                         │
│ ► Create Engagement     │──invite──►│ ► Accept Invitation     │
│ ► Choose Purpose        │           │ ► MFA Setup (mandatory) │
│ ► System auto-scopes    │           │ ► Client Overview       │
│ ► Monitor access logs   │           │ ► Engagement Briefings  │
│ ► Revoke anytime        │           │ ► Document Review       │
│                         │           │ ► Comments & Notes      │
│ Audit Trail ◄───────────┼───────────┤ Every action logged     │
└─────────────────────────┘           └─────────────────────────┘
```

### Security Model

- **Separate authentication realm** — Legal Portal has its own session scope (`/legal/*`)
- **MFA mandatory** — No exceptions. TOTP or WebAuthn required on every legal account
- **Role: `LEGAL_ADVISOR`** — New role with read-only access to explicitly scoped data only
- **Engagement-scoped access** — Attorney can only see data within active engagements, never browse the full org
- **Time-bounded** — Every engagement has an expiry (default 90 days, configurable)
- **Full audit trail** — Every page view, document access, and data export is logged with IP, timestamp, user-agent
- **Revocable** — Client can revoke access instantly, terminates all active sessions
- **IP whitelisting** (optional) — Law firm can restrict access to their office network
- **No data export by default** — Download/copy requires explicit client permission per engagement
- **Session timeout** — 30 minutes inactivity (vs 24h for normal users)

---

## 3. Client Side — Network Tab

### New Sidebar Entry

```
CYBERSECURITY  Suite
  ...

EU REGULATIONS  10
  ...

NETWORK                      ← NEW
  Legal Engagements

EVIDENCE COLLECTION
  ...
```

### Page: `/dashboard/network/legal/page.tsx`

**Engagement List View:**

- Cards showing each active engagement
- Per engagement: law firm name, attorney name, engagement type, status, expiry date, access log count
- "New Engagement" button

**Create Engagement Flow (3 steps):**

**Step 1: Choose Engagement Type**

The system pre-defines engagement types with automatic data scoping:

```typescript
const ENGAGEMENT_TYPES = [
  {
    id: "cra_notified_body",
    name: "CRA Notified Body Submission",
    description:
      "Review and support for Class I/II conformity assessment with a Notified Body",
    autoScope: {
      modules: ["cra"],
      dataTypes: [
        "assessment",
        "classification_reasoning",
        "requirements",
        "sbom",
        "evidence",
        "nb_workflow",
        "documents",
      ],
      includeNIS2Overlap: true,
    },
  },
  {
    id: "nis2_nca_registration",
    name: "NIS2 NCA Registration",
    description:
      "Legal support for NIS2 entity registration with national competent authority",
    autoScope: {
      modules: ["nis2"],
      dataTypes: [
        "assessment",
        "classification",
        "requirements",
        "incidents",
        "nca_submissions",
      ],
      includeNIS2Overlap: false,
    },
  },
  {
    id: "jurisdiction_selection",
    name: "Jurisdiktionswahl & Licensing",
    description:
      "Legal advisory for optimal jurisdiction selection and authorization",
    autoScope: {
      modules: ["authorization", "space_law"],
      dataTypes: [
        "assessment",
        "jurisdiction_comparison",
        "workflow",
        "documents",
      ],
      includeNIS2Overlap: false,
    },
  },
  {
    id: "incident_response",
    name: "Incident Response & NCA Notification",
    description:
      "Legal support during an active security incident with regulatory notification obligations",
    autoScope: {
      modules: ["nis2", "cra", "cybersecurity"],
      dataTypes: [
        "incidents",
        "nis2_phases",
        "draft_notifications",
        "timeline",
      ],
      includeNIS2Overlap: true,
    },
  },
  {
    id: "export_control",
    name: "Export Control Review (ITAR/EAR)",
    description:
      "Legal review of export control compliance for space technology transfers",
    autoScope: {
      modules: ["export_control"],
      dataTypes: ["assessment", "requirements", "documents", "evidence"],
      includeNIS2Overlap: false,
    },
  },
  {
    id: "full_compliance_review",
    name: "Full Compliance Audit",
    description: "Comprehensive legal review across all regulatory modules",
    autoScope: {
      modules: ["all"],
      dataTypes: ["all"],
      includeNIS2Overlap: true,
    },
  },
  {
    id: "custom",
    name: "Custom Engagement",
    description: "Manually select which data to share",
    autoScope: null, // Manual module + data type selection
  },
];
```

**Step 2: Invite Attorney**

- Attorney email (verified against existing Legal Portal accounts)
- If no account exists: invitation email sent with registration link to `/legal/register`
- Engagement expiry: 30 / 60 / 90 / 180 days (dropdown, default 90)
- Export permission: checkbox (default OFF)
- Optional note to attorney

**Step 3: Review & Confirm**

- Shows exactly what data will be shared (auto-scope preview)
- Client can add/remove individual items
- "Engagement erstellen" button
- Confirmation: "Einladung gesendet an attorney@firm.com. Der Anwalt muss die Einladung akzeptieren und MFA einrichten."

### Access Management

- View access logs per engagement (who accessed what, when)
- Revoke button (immediate, kills active sessions)
- Extend/shorten expiry
- Toggle export permission

---

## 4. Law Firm Side — Legal Portal

### Authentication

- **Login:** `/legal/login` — email + password + MFA (TOTP or WebAuthn)
- **Registration:** `/legal/register` — only via invitation link, not self-service
- **Firm profile:** Name, address, bar registration number, team members
- **Team management:** Senior partner can invite other attorneys at the firm, each with their own MFA

### Portal Layout: `/legal/dashboard`

**Separate layout** — own sidebar, own header, own session management. Never shares UI with the main Caelex dashboard.

**Sidebar:**

```
FIRM NAME
  firm@example.com

MANDANTEN
  ► Client A (2 Engagements)
  ► Client B (1 Engagement)
  ► Client C (3 Engagements)

TOOLS
  Document Review Queue
  Deadline Calendar

SETTINGS
  Firm Profile
  Team Members
  Security (MFA, IP Whitelist)
```

### Client Overview

When attorney clicks a client, they see a **Compliance Briefing** — not raw data, but an intelligent summary:

```
┌─────────────────────────────────────────────────┐
│ CLIENT: Isar Aerospace Technologies GmbH        │
│ Engagement: CRA Notified Body Submission         │
│ Expires: 2026-07-04 (87 days remaining)          │
├─────────────────────────────────────────────────┤
│                                                   │
│ EXECUTIVE BRIEFING                                │
│                                                   │
│ Product: On-board Computer v2.1                   │
│ Classification: Class II (Annex IV Kat. 1+2)     │
│ Conformity Route: Third-party EU type examination │
│ Maturity Score: 34% (Gap: 26 of 40 requirements) │
│                                                   │
│ NIS2 Overlap: 14 requirements partially covered   │
│ Estimated savings: 8-14 weeks                     │
│                                                   │
│ KEY GAPS FOR NB SUBMISSION:                       │
│ ✗ SBOM not uploaded (CRA-038)                    │
│ ✗ Vulnerability Disclosure Policy missing (CRA-014)│
│ ✗ Security Test Reports incomplete (CRA-013)     │
│ ✓ Classification reasoning chain complete         │
│ ✓ Technical documentation started                 │
│                                                   │
│ NB WORKFLOW STATUS: Preparing Documents (3/7)     │
│                                                   │
│ [View Full Assessment] [View Documents]           │
│ [View Evidence] [View NB Workflow]                │
│                                                   │
└─────────────────────────────────────────────────┘
```

This briefing is **auto-generated** from the client's live compliance data, filtered to only the engagement scope.

### Document Review

- Read-only view of all documents in the engagement scope
- Attorney can add **review comments** (visible to both attorney and client)
- Comment types: "Approved", "Needs Revision", "Question", "Legal Note"
- Comments are stored in the existing `DocumentComment` model with a `LEGAL_REVIEW` source tag

### Deadline Calendar

- Unified calendar showing all compliance deadlines within the engagement scope
- CRA key dates (Sep 2026, Dec 2027)
- NIS2 reporting deadlines
- NB submission milestones
- Attorney can add their own deadline reminders (private to the firm)

---

## 5. Intelligent Briefing Engine

### Service: `src/lib/services/legal-briefing-service.server.ts`

Auto-generates a structured briefing from compliance data based on engagement type:

```typescript
interface LegalBriefing {
  client: {
    name: string;
    organizationType: string;
    jurisdiction: string;
  };
  engagement: {
    type: string;
    createdAt: string;
    expiresAt: string;
    scope: string[];
  };
  executiveSummary: string; // 3-5 sentences, auto-generated
  compliancePosture: {
    overallScore: number;
    moduleScores: Record<string, number>;
    grade: string;
  };
  keyGaps: Array<{
    requirementId: string;
    title: string;
    severity: string;
    module: string;
    legalImplication: string; // What this gap means legally
  }>;
  keyStrengths: Array<{
    area: string;
    detail: string;
  }>;
  timeline: Array<{
    date: string;
    event: string;
    criticality: string;
  }>;
  recommendations: string[]; // Auto-generated action items
  documents: Array<{
    name: string;
    category: string;
    status: string;
    reviewStatus: "pending" | "approved" | "needs_revision";
  }>;
}
```

The `legalImplication` field is the magic — for each gap, the system explains the legal consequence:

- CRA-038 missing: "Without SBOM, CE marking cannot be applied (Art. 23 CRA). Notified Body will reject the technical file."
- CRA-014 missing: "Vulnerability disclosure policy is a mandatory element of the technical documentation (Annex VII CRA). Non-compliance may result in fines up to EUR 15M."

These are derived from the existing `spaceSpecificGuidance` on requirements, plus a legal-context layer.

---

## 6. Data Model

### New Prisma Models

```prisma
model LegalFirm {
  id          String   @id @default(cuid())
  name        String
  city        String?
  country     String?
  website     String?
  barNumber   String?  // Bar registration
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  attorneys   LegalAttorney[]
  engagements LegalEngagement[]

  @@index([name])
}

model LegalAttorney {
  id          String    @id @default(cuid())
  userId      String    @unique  // Links to User model (separate account)
  user        User      @relation(fields: [userId], references: [id])
  firmId      String
  firm        LegalFirm @relation(fields: [firmId], references: [id])
  title       String?   // "Partner", "Associate", etc.
  barNumber   String?
  isAdmin     Boolean   @default(false) // Can manage firm settings
  createdAt   DateTime  @default(now())

  engagements LegalEngagementAttorney[]
  comments    LegalReviewComment[]

  @@index([firmId])
}

model LegalEngagement {
  id              String   @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  firmId          String
  firm            LegalFirm    @relation(fields: [firmId], references: [id])

  // Engagement definition
  engagementType  String        // cra_notified_body, nis2_nca_registration, etc.
  title           String
  description     String?
  status          String        // pending, active, completed, revoked

  // Scope (auto-generated from engagement type + manual overrides)
  scopedModules   String[]      // ["cra", "nis2"]
  scopedDataTypes String[]      // ["assessment", "requirements", "evidence"]
  scopedAssessmentIds String[]  // Specific assessment IDs (empty = all in module)
  includeNIS2Overlap  Boolean   @default(false)

  // Access control
  expiresAt       DateTime
  allowExport     Boolean   @default(false)
  ipWhitelist     String[]  // Optional IP restrictions

  // Metadata
  invitedBy       String    // userId who created
  note            String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  revokedAt       DateTime?

  attorneys       LegalEngagementAttorney[]
  accessLogs      LegalAccessLog[]
  comments        LegalReviewComment[]

  @@index([organizationId])
  @@index([firmId])
  @@index([status])
}

model LegalEngagementAttorney {
  id            String   @id @default(cuid())
  engagementId  String
  engagement    LegalEngagement @relation(fields: [engagementId], references: [id], onDelete: Cascade)
  attorneyId    String
  attorney      LegalAttorney   @relation(fields: [attorneyId], references: [id])
  acceptedAt    DateTime?

  @@unique([engagementId, attorneyId])
}

model LegalAccessLog {
  id            String   @id @default(cuid())
  engagementId  String
  engagement    LegalEngagement @relation(fields: [engagementId], references: [id], onDelete: Cascade)
  attorneyId    String
  action        String    // view_briefing, view_assessment, view_document, download_document, add_comment
  resource      String    // What was accessed
  ipAddress     String?
  userAgent     String?
  createdAt     DateTime  @default(now())

  @@index([engagementId, createdAt])
}

model LegalReviewComment {
  id            String   @id @default(cuid())
  engagementId  String
  engagement    LegalEngagement @relation(fields: [engagementId], references: [id], onDelete: Cascade)
  attorneyId    String
  attorney      LegalAttorney @relation(fields: [attorneyId], references: [id])

  targetType    String    // document, requirement, assessment, general
  targetId      String?   // ID of the document/requirement being commented on
  commentType   String    // approved, needs_revision, question, legal_note
  content       String    @db.Text  // Encrypted

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([engagementId])
  @@index([targetType, targetId])
}
```

---

## 7. Files to Create

### Client Side (Caelex Dashboard)

| File                                                      | Purpose                         |
| --------------------------------------------------------- | ------------------------------- |
| `src/app/dashboard/network/legal/page.tsx`                | Engagement list + create flow   |
| `src/app/dashboard/network/legal/[engagementId]/page.tsx` | Engagement detail + access logs |
| `src/app/api/legal-engagements/route.ts`                  | CRUD for engagements            |
| `src/app/api/legal-engagements/[id]/route.ts`             | Get/update/revoke engagement    |
| `src/app/api/legal-engagements/[id]/invite/route.ts`      | Send invitation to attorney     |

### Law Firm Portal

| File                                                    | Purpose                             |
| ------------------------------------------------------- | ----------------------------------- |
| `src/app/legal/layout.tsx`                              | Separate layout with own sidebar    |
| `src/app/legal/login/page.tsx`                          | Login page (email + password + MFA) |
| `src/app/legal/register/page.tsx`                       | Registration (invitation-only)      |
| `src/app/legal/dashboard/page.tsx`                      | Client list + engagement overview   |
| `src/app/legal/clients/[orgId]/page.tsx`                | Client detail with briefing         |
| `src/app/legal/clients/[orgId]/[engagementId]/page.tsx` | Engagement detail view              |
| `src/app/legal/documents/page.tsx`                      | Document review queue               |
| `src/app/legal/calendar/page.tsx`                       | Deadline calendar                   |
| `src/app/legal/settings/page.tsx`                       | Firm profile + team + security      |
| `src/app/api/legal/auth/route.ts`                       | Legal portal auth                   |
| `src/app/api/legal/briefing/[engagementId]/route.ts`    | Auto-generated briefing             |
| `src/app/api/legal/comments/route.ts`                   | Review comments CRUD                |
| `src/app/api/legal/access-log/route.ts`                 | Access log queries                  |

### Shared Services

| File                                                | Purpose                        |
| --------------------------------------------------- | ------------------------------ |
| `src/lib/services/legal-briefing-service.server.ts` | Intelligent briefing generator |
| `src/lib/services/legal-scope-service.server.ts`    | Engagement scope resolver      |
| `src/lib/legal-auth.ts`                             | Legal portal auth middleware   |

---

## 8. What Makes This Bahnbrechend

1. **Purpose-driven scoping** — Attorney never sees irrelevant data. System knows what a "CRA NB Submission" review needs.
2. **Legal implication engine** — Every compliance gap is translated into legal consequences with article references.
3. **Live data, not snapshots** — Briefing reflects the current compliance state, not a static export.
4. **Bi-directional comments** — Attorney's review comments appear in the client's dashboard, creating a feedback loop.
5. **Full audit chain** — Every attorney action is hash-chain logged. Provable in court.
6. **Zero-friction onboarding** — Client chooses engagement type → system handles the rest.
7. **Firm-level intelligence** — Senior partner sees aggregated compliance posture across all mandates.

---

## 9. Brand

All UI in white, black, gray. No colored accents. Monochrome. The Legal Portal should feel like a premium legal tool — clean, authoritative, no decorative elements.
